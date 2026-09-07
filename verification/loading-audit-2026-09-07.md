# Executive Dashboard loading audit — 7 September 2026

Production inspected: `https://admin.jenanggemi.com`, build `exec3.98.8`.
Deployed build: `exec3.98.9`. Fix commit `6f57724` was pushed to `main` and verified on production on 7 September 2026. The findings below describe the initial audit; the deployment results follow.

## Findings

| Area | Live finding | Prepared change / remaining work |
| --- | --- | --- |
| Dashboard data loading | Repeated HTTP 503 responses containing `SQLSTATE[HY000] [2002] Operation not permitted` during initial and background requests. Inventory sometimes reports the same connection error as HTTP 500. | Bound the main dashboard request queue to two concurrent requests, load background pages sequentially, and retry a failed GET once after one second on HTTP 503. Server-side connection failures still require hosting/database log investigation; client changes do not remove the underlying hosting restriction. |
| Browser reload | Overview and Campaign explicitly skipped their initial network request when navigation type was `reload`, leaving recovery to cache and later events. | Always fetch their active data, including a fresh Overview summary on reload. Verified with empty browser caches. |
| Store Ops activity | `/api/store-ops/` consistently returned HTTP 500. Its order query reused named placeholders despite native PDO prepares being enabled. Every dashboard view also loaded this hidden panel. | Give each SQL placeholder a unique binding; request Store Ops only when its panel is active. SQL regression test passes. The repaired endpoint must still be verified on the production database after deployment. |
| Partner database health | Health reported DNS failure for `local.server`, but `/api/partner-db-status/` confirmed connection, table presence, and billing readiness; partner profiles loaded successfully. | Health now uses the same `local.server` → `localhost` candidates as the partner connection. Both fallback success and genuine failure are tested. |
| Ads response format | Ads returned JSON bodies labeled `text/html`. | Set the JSON response content type explicitly. |
| Invalid response handling | Failed JSON parsing was converted into a successful empty object. | Surface an error rather than rendering missing data as a successful response. |
| Marketplace ingest | Initially partial; a later existing rolling sync reported all four configured accounts healthy and fresh. | Jenang Gemi and ZERO Shopee/TikTok are connected. ZFIT Shopee/TikTok are unconfigured and skipped; no credentials were changed. |

## Verification

- Live main scripts/styles checked against `origin/main` matched before editing.
- All 42 JavaScript test files and two new PHP regression tests pass; edited PHP and JavaScript pass syntax checks and `git diff --check`.
- The new queue/reload, Store Ops binding, and database-health fallback regression tests fail against the original source.
- Existing production Accounting, Profit & Loss, Cash Flow, and Partner Profiles loaded without API failures or JavaScript exceptions in the observed runs.
- With local JavaScript substituted only in an isolated test browser, Overview, Daily Sales, Wallet, Campaign, Orders, Inventory, and Website completed the observed runs without HTTP API failures or JavaScript exceptions. Overview and Campaign also fetched their data after empty-cache reloads.
- Ad View still encountered intermittent database failures in background reads and one sync request, even with the client changes. Subsequent responses recovered, and the page left its loading state. This remains a production infrastructure issue, not an all-clear.
- SKU Database has separate authentication. Its login and its database/catalog integration were checked, but its separately authenticated editing UI was not exercised.
- Production PHP fixes and hosting behavior after deployment remain unverified. No production source/configuration, marketplace credentials, or business records were manually edited. Normal page opening may run the application's existing automatic synchronization.

## Production deployment verification

- Deployment to `main` was explicitly authorized by the user.
- Remote `main` accepted fix commit `6f57724`; the live authenticated dashboard reported `exec3.98.9`.
- The live Overview left its loading state with no JavaScript exceptions or failed API responses in the observed run.
- `/api/store-ops/?view=store-ops` returned HTTP 200 and `ok: true`.
- All ten fresh `/api/api-health/?run=1` checks passed, including marketplace synchronization and the analytics, SKU, and partner databases.
- The Ads credit-alert endpoint returned HTTP 200, `ok: true`, and the corrected JSON content type.
- This successful check does not prove that the earlier intermittent hosting/database failures cannot recur. Investigate hosting logs if they recur, especially during Ad View synchronization.

## Homepage refresh correction — exec3.98.10

A follow-up check found that cached background responses could overwrite the refresh timestamp while a manual sync was still running. Automatic syncs also left the button looking idle, and the Live badge was unconditional HTML.

The correction invalidates pre-sync reads, blocks cached updates during sync, rejects snapshots older than the currently displayed data, and gives automatic and manual syncs the same visible busy state. Live now requires a recently verified, recent snapshot with a healthy marketplace sync; cached data, offline state, and refresh failures no longer stay green. The displayed timestamp continues to come from the returned data, not the browser clock.

All 43 JavaScript tests pass, including executable regressions for an in-flight poll racing an automatic refresh, stale data/timestamp rejection, and cached/offline/error indicators. The browser-only pre-deployment test advanced the displayed time from 11:50:51 to 11:52:38 WIB with no timestamp regressions or JavaScript exceptions.
