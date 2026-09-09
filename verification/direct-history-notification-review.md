# Direct order history and notification spacing — exec3.98.19

The right-side inbox now gives each notification its full content height and scrolls the list. The browser check covers 30 long notifications at desktop and mobile sizes, retained read state, historical entries, and the existing payment confirmation action.

Direct order history combines Analytics `whatsapp_orders` (WhatsApp and dashboard walk-ins) with shared SKU `store_ops_walkin_invoices` of type `walk_in`. Counter invoice reads perform no migrations or writes. Store Ops WhatsApp invoice copies are excluded. Existing callers of the history API retain their current behavior; the history page opts into counter sales with `include_walk_ins=1`.

The combined history supports channel, search, fulfillment status and archive filters with aggregate totals and pagination across both databases. Counter invoices open read-only receipt details, preserve recorded customer totals including tax, and do not inherit dashboard payment or archive actions. If the counter connection is unavailable, the page explicitly identifies partial results and totals.

Validation:

- `tests/direct-order-history-test.php`: isolated Analytics and SKU SQLite databases; mixed-source pagination, totals, discounted merchandise, tax, SKU/product/phone searches, channel/status/archive filters, receipt details, exclusion of WhatsApp invoice copies, invalid inputs and unchanged database write counts.
- `tests/direct-order-history-browser.cjs`: actual PHP template with fixture API responses; labels, totals, receipt keyboard/click interactions, escaped product text, persisted channel filter, original payment payload and archive action, partial-result warning, desktop/light/dark/mobile layouts.
- `tests/notification-inbox-browser.cjs`: existing inbox behavior plus 30 long entries, measured content containment and oldest-entry reachability.
- Existing WhatsApp and notification PHP suites; navigation coverage (45 destinations, 33 routes, 16 embedded views); all 44 JavaScript suites; PHP syntax checks.

Screenshots in `verification/ui/direct-history-*.png` and `verification/ui/notifications-long-*.png` use illustrative test records. Production authenticated records were not inspected in this session.
