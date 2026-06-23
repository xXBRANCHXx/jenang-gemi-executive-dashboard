# Jenang Gemi Executive Dashboard

Private admin dashboard for `admin.jenanggemi.com`.

## Routes

- `/dashboard/`
- `/api-health/`
- `/profit-loss/`
- `/sku-db/`
- `/sku-db/new/`
- `/logout/`
- `/api/analytics/`
- `/api/sales/` (authenticated summary; `POST ?action=refresh` runs a rolling marketplace sync)
- `/api/api-health/`
- `/api/profit-loss/`
- `/api/sku-db/`
- `/api/partner-db-status/`
- `/api/zero-store/`
- `/api/jenang-gemi-store/`
- `/api/website-orders/`
- `/api/zero-website-orders/`
- `/api/jenang-gemi-website-orders/`
- `/api/hard-set/`

## Notes

- Login code is validated server-side.
- Dashboard analytics, website settings, and live-state now run locally in this
  repo against MySQL using `JG_DB_*` env vars or `config.local.php`.
- Profit and Loss combines API Ingest monthly SKU sales with SKU DB COGS. Manual
  direct-cost overrides, operating entries, and allocation settings are stored
  in the analytics MySQL database.
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
- Website checkout notifications and paid metrics are independent of the Hard Set switch. Configure the same high-entropy `store_ops_website_token` on this dashboard and Store Ops, plus `store_ops_base_url` and `executive_dashboard_url`, before activation readiness can pass.
- Hard Set is initialized server-side as OFF and exposes no disable operation. Its activation, UTC cutover boundary, audit record, and Store Ops outbox are persisted in MySQL.
- Private PDF labels use `JG_WEBSITE_LABEL_STORAGE_PATH` / `website_label_storage_path`; the default is outside this dashboard's document root.
