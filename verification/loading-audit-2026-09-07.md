# Executive Dashboard loading audit — 7 September 2026

Production inspected: `https://admin.jenanggemi.com`, build `exec3.98.8`.
Prepared build: `exec3.98.9`. Changes are local and have not been deployed.

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

## Follow-up

Deploy the prepared build only with production deployment authorization/access, then check Store Ops and API Health against the live database. Inspect the hosting PHP/database logs for the intermittent connection-denied errors, especially while Ad View synchronizes. Repeat the live page checks after that issue is resolved.
