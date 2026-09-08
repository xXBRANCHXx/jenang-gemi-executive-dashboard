# Executive Dashboard navigation

This change reorganizes the shared navigation and applies a consistent visual
system to the existing page content.
It does not replace charts, accounting controls, order actions, notification
handlers, authentication, API endpoints, ingestion or processing pipelines.
The original Accounting liquidity composition bar, reserved-outflow overlay,
hover/focus breakdowns and click actions are unchanged.

`navigation-map.json` is the complete page inventory. It has 45 destinations,
covering all 33 existing application entry routes and 16 embedded dashboard views.
Several destinations share `/dashboard/` with different `view` parameters.
Utilities (Launch Pad and the two logout routes) are tracked separately.
`/sku-db/new/` retains its existing redirect. Token-based article previews retain
their editor/share workflow and their existing CSP; they do not gain admin chrome.
Product Image Studio is not on the main branch: its uncommitted work in another
checkout is untouched, and no dead production link is added for it.

| Area | Pages and preserved paths |
| --- | --- |
| Overview | Business overview, daily sales, activity/context |
| Sales | All orders, direct-order history, Store Ops, shipment arrangements, customers |
| Products & stock | SKU database, product costs, stock coverage, purchase planning/history, product performance |
| Finance | Accounting, wallets, cash flow, P&L, expense settings, accounting guide |
| Growth | Ads, campaigns, websites, blog studio, affiliate performance/directory |
| Partners | Program overview, directory; existing sales, balance and profile pages under the selected partner |
| Settings | Existing preferences and authorization, integration workspace, API health, website activation |

Existing labels remain searchable through aliases. Global page search uses
Cmd/Ctrl+/ so it does not replace existing record/content search. Record-dependent
results lead to the owning list; actual record links retain their parameters and
existing flows. Breadcrumbs place record pages in their owning area and link back
to the list. Standalone order, product analytics, flavor and accounting guide
screens now have the same navigation. Browser-native links preserve bookmarks,
open-in-new-tab and existing unsaved-form guards.

Dashboard view links retain the existing fast `switchView` path. Sidebar state
observes the existing active-view attribute rather than changing data loading.
All pages appear in a stable area submenu. Unpaid direct-order and low-ad-credit
hooks are preserved; the corresponding area icon also shows an attention dot.
Notification drawers and every current review/payment/shipping action are intact.

The UI uses neutral light/dark surfaces and restrained teal accents.
`executive-ui.css` styles the actual cards, tables, forms, buttons, headings and
page surfaces through the shared navigation include. Existing page tokens map
to one palette, while chart series and semantic status colors stay intact.
The stylesheet is screen-only so print/export layouts keep their existing rules.
Icons are official Lucide 0.468.0 SVGs; the ISC license is included in
`assets/navigation/LUCIDE-LICENSE`. Existing chart colors and semantics remain.
New navigation assets use file-mtime cache busting. The dashboard build is
`exec3.98.13`. No migrations or new environment settings are required.

## Verification

- `tests/executive-navigation-test.php`: automatically walks every application
  `index.php`, verifies the page inventory, all dashboard view panels, parent
  mappings, current-page detection, absolute nested links, and alert hooks.
- `tests/executive-navigation-browser.cjs`: real PHP-rendered navigation in a
  loopback-only browser harness; all 45 destinations, keyboard search, existing
  SPA state synchronization, mobile opening/closing, inactive-menu focus and alerts.
- `tests/executive-ui-browser.cjs`: nine native page families in dark and light
  mode, Accounting metric contrast, original bar tooltip/detail interaction,
  accounting entry-mode controls and mobile navigation. Screenshots are under
  `verification/ui/`. Run against the native loopback harness.
- Existing navigation tests now check the approved area model, replacing older
  assertions that intentionally hid customer profiles or individual destinations.
- Native PHP page layout checks use `NAV_NATIVE=1` and sample API responses in the
  local test process. Production auth files and page controllers are not modified.

The local harness is a test tool, not an application route. It binds only to
127.0.0.1, seeds isolated CLI test sessions, and serves sample API responses. Never
run it as a production server. No test-auth PHP endpoint is added to the app.

Verification on 2026-09-08:
- All 44 existing JavaScript checks passed (including the revised navigation
  expectations), plus the new browser and PHP navigation checks.
- 59 PHP tests passed. `tests/orders-api-test.php` fails its free-gift packing
  assertion (expected 10, actual 0); the identical failure reproduces on a clean
  worktree of the unchanged baseline `a2a1507`. No order/API code was changed.
- All 7 changed application PHP files passed syntax checks.
- Native Accounting's original bar segments, hover tooltip and click handler were
  verified with sample data in both themes. Its original PHP content and JS/CSS
  chart implementations are byte-for-byte unchanged.
