# Jenang Gemi Executive Dashboard

Private admin dashboard for `admin.jenanggemi.com`.

## Routes

- `/dashboard/`
- `/logout/`
- `/api/analytics/`

## Notes

- Login code is validated server-side.
- Analytics are fetched server-side from the upstream base URL configured by
  `JG_ANALYTICS_BASE_URL`, `JG_PRIMARY_SITE_URL`, or `config.local.php`.
- If no override is set, the dashboard defaults to `https://jenanggemi.com`.
- This repo is intended to be deployed as the root of the `admin.jenanggemi.com` site in Hostinger Git deployment.
