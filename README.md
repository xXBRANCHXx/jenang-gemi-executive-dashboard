# Jenang Gemi Executive Dashboard

Private admin dashboard for `admin.jenanggemi.com` behind a public Launch Pad.

## Routes

- `/` public Launch Pad
- `/dashboard/`
- `/dashboard/?view=ad-view`
- `/api-health/`
- `/profit-loss/` (Accounting workspace)
- `/profit-and-loss/` (executive P&L report)
- `/sku-db/`
- `/sku-db/new/`
- `/logout/`
- `/api/analytics/`
- `/api/sales/` (authenticated summary; refreshes dashboard cache only)
- `/api/orders/` (authenticated local order mirror reads; `POST ?action=webhook` updates the mirror)
- `/api/wallet/` (authenticated marketplace settlement wallet summary, account lookup, and terminal query)
- `/api/api-health/`
- `/api/accounting/`
- `/api/ads/`
- `/api/profit-loss/`
- `/api/sku-db/`
- `/api/partner-db-status/`
- `/api/zero-store/`
- `/api/jenang-gemi-store/`
- `/api/website-orders/`
- `/api/zero-website-orders/`
- `/api/jenang-gemi-website-orders/`
- `/api/hard-set/`

Ad View shows ongoing Shopee campaigns only. It opens on today's hourly
performance, keeps every summary metric inside the selected timeframe, and
lets up to four KPI cards drive the selected campaign's trend chart beside the
live-ad list. Ad credit stays in one compact card split by Shopee account.
Ad View syncs Shopee automatically when opened and every five minutes while
visible. Select a live ad to inspect its delivery metrics and settings,
unit-based CAC, SKU DB COGS weighted by the purchased product mix, estimated
gross profit, contribution after ads, action history, and optional comparisons.
COGS links automatically through exact SKU/tag matches, normalized marketplace
variant names, or an unambiguous SKU DB product family for newly created ads.
Dashboard names, tags, and manual COGS overrides are stored locally and do not
change the campaign name or settings inside Shopee Seller Centre. Its rail/menu
icon and matching favicons use the official [Lucide Rocket](https://lucide.dev/icons/rocket)
geometry under Lucide's ISC license.

## Notes

- Launch Pad is public. Executive Dashboard and Store Ops remain protected by
  their own authentication screens.
- Login code is validated server-side.
- Dashboard analytics, website settings, and live-state now run locally in this
  repo against MySQL using `JG_DB_*` env vars or `config.local.php`.
- Accounting remains at `/profit-loss/`; the rebuilt management P&L is at
  `/profit-and-loss/`. Accounting controls cash, bills, expenses, transfers,
  refunds, corrections, manual money-in entries, and
  review queues through `/api/accounting/` without counting marketplace payout
  transfers as new revenue. Cash Available combines spendable account balances,
  confirmed website payments, and Wallet cash-outs; duplicate Wallet/manual
  transfer evidence is reconciled by account, amount, and date. Marketplace
  Receivable comes from unreleased settling orders and excludes released or
  non-settling orders.
- The P&L combines seller-received sales and sale-level SKU COGS with posted
  cash-basis Accounting expenses. Product-purchase cash entries are disclosed
  for reconciliation but excluded from profit expense to prevent counting COGS
  twice.
- The repo also checks `/public_html/config.local.php` and
  `/public_html/whatsapp-config.local.php` to match common Hostinger setups.
- Deployment-only secrets can override tracked settings through the ignored
  `config.runtime.php` or `/public_html/config.runtime.php`.
- `analytics_base_url` remains available in `config.local.php` only for the
  affiliate proxy endpoint.
- This repo tracks `config.local.php` directly so Git deployment keeps the
  dashboard database configuration in sync with the repository.
- This repo is intended to be deployed as the root of the `admin.jenanggemi.com` site in Hostinger Git deployment.
- SKU login is separate from the main executive dashboard login. `sku_branch_password_hash`
  should be configured through `config.local.php` or `JG_SKU_BRANCH_PASSWORD_HASH`.
- Partner profiles now use the partner MySQL database when `partner_db_*` is configured.
- API Health runs authenticated server-side checks for Shopee ingest, Store Ops deployment, and dashboard databases, then stores recent failures in `data/api-health-log.json`.
- Marketplace order detail is mirrored into this dashboard's MySQL database through
  `POST /api/orders/?action=webhook` with `JG_ORDER_WEBHOOK_TOKEN` /
  `order_webhook_token` or the existing marketplace setup token. Normal dashboard
  view reloads read cached/local data. Visible dashboard sessions automatically
  run a throttled rolling marketplace sync/repair for yesterday and today; the
  Overview `Refresh view` button runs the same path immediately.
- Wallet reads the local marketplace order mirror and uses a manual balance
  anchor as the source-of-truth for current wallet cash. The displayed Wallet
  balance is the latest manually entered wallet balance plus marketplace releases
  after that anchor time minus withdrawals recorded after that anchor time.
  Cancelled and other non-settling orders are excluded from outstanding balances.
  Supported calls include `GET /api/wallet/?action=summary`,
  `GET /api/wallet/?action=account&platform=shopee&account_key=jenang-gemi-shopee`,
  `GET /api/wallet/?action=terminal&query=Jenang%20Gemi%20Shopee%20Wallet%20Info`,
  `GET /api/wallet/?action=diagnostics&platform=shopee&account_key=jenang-gemi-shopee`,
  `GET /api/wallet/?action=release_sync_logs`,
  and `POST /api/wallet/?action=set_balance` with `platform`, `account_key`,
  `balance`, and optional `observed_at`. Use `POST /api/wallet/?action=withdraw`
  with `platform`, `account_key`, `amount`, and optional `withdrawn_at` to record
  marketplace cash-out or bank withdrawals without manually overwriting the
  current wallet value. The isolated
  `POST /api/wallet/?action=sync_tiktok_withdrawals` action also accepts the
  configured marketplace API setup token as a Bearer credential for scheduled
  or one-time account-bounded finance syncs; all other wallet actions remain
  admin-session protected. The Wallet refresh button runs the quick release sync.
  The Backtrack button starts the chunked backtrack repair so releases after a
  balance anchor can be recovered without one long request. Use
  `POST /api/wallet/?action=backfill_releases` to run a larger marketplace
  release backfill and log before/after wallet totals.
- Website checkout notifications and paid metrics are independent of the Hard Set switch. An explicit high-entropy `store_ops_website_token` can be configured on both applications; otherwise both deployments derive the bearer token from their existing shared marketplace setup credential. Configure `store_ops_base_url` and `executive_dashboard_url` before activation readiness can pass.
- Hard Set is initialized server-side as OFF. First activation remains irreversible: the UTC cutover timestamp and exact automatic account scope cannot be changed. The switch remains locked until the current session authenticates with Branch-tier SKU Database credentials and all local/remote readiness checks pass. After activation, the same control can pause or resume only future automatic marketplace shipment arrangements; pausing never reverses an arranged shipment, stops label recovery, disables the manual Instant action, or affects Partner orders. Pause is projected to API Ingest before Store Ops exposes unarranged rows; resume is projected to Store Ops before API Ingest restarts mutations. Every activation/pause/resume is audited and delivered through the durable outbox with exact timestamp, scope, and pause-state acknowledgements.
- Orders → Ops → Shipment Arrangement provides a minimal Jakarta-local planner for the live “arranged on → pickup on” rules plus the actual weekly marketplace schedule. The view is read-only for ordinary Executive sessions; Branch-tier credentials unlock a weekday mapping for Shopee and TikTok that API Ingest reads on its two-minute Hostinger worker. The marketplace supplies the available slots, but the worker accepts only the configured pickup weekday and chooses the earliest time on that day; it never silently substitutes another day. Advanced controls retain automatic hours and handover exceptions. Instant stays manual-only and uses the selected weekday mapping when explicitly arranged.
- On the deployed dashboard host, run `php bin/big-set-preflight.php` immediately before activation and again after synchronization. It performs the same local/database and downstream readiness checks, reports `ready_for_activation`, `synchronization_pending`, `active_healthy`, or a failing state as JSON, exits nonzero for every no-go state, and never activates or retries the outbox. From a machine that cannot reach the dashboard databases, `php bin/big-set-preflight.php --contracts-only` still verifies both authenticated downstream readiness contracts, automatic-source coverage, and cutover-state agreement.
- Private PDF labels use `JG_WEBSITE_LABEL_STORAGE_PATH` / `website_label_storage_path`; the default is outside this dashboard's document root.
