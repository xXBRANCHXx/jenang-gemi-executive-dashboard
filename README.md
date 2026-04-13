# Jenang Gemi Executive Dashboard

Private admin dashboard for `admin.jenanggemi.com`.

## Routes

- `/dashboard/`
- `/logout/`
- `/api/analytics/`

## Notes

- Login code is validated server-side.
- Dashboard analytics, website settings, and live-state now run locally in this
  repo against MySQL using `JG_DB_*` env vars or `config.local.php`.
- The repo also checks `/public_html/config.local.php` and
  `/public_html/whatsapp-config.local.php` to match common Hostinger setups.
- `analytics_base_url` remains available in `config.local.php` only for the
  affiliate proxy endpoint.
- This repo is intended to be deployed as the root of the `admin.jenanggemi.com` site in Hostinger Git deployment.
