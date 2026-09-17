# Shipment visibility — exec3.98.22

The previous chart filtered uncollected orders by a rolling ship-by range. Pickups with a later final deadline, older overdue orders, and orders with missing deadlines could disappear. The upstream map also stopped at 500 oldest records and used Store Ops processing to select its history, which could hide handovers still waiting for a courier.

The schedule now groups booked windows by marketplace, shop and courier. Each lane shows collected/total progress, how many waiting shipments are confirmed prepared, the first outstanding ship-by time, and a status with color and text. The four counters filter attention, approaching/open windows or deadlines, all outstanding shipments, and confirmations on the selected WIB day. Search and shop selection scope the counts. Shared windows retain their complete group so progress remains truthful.

Outstanding orders never age out of the UI. Orders outside the selected day, drop-offs and records without times remain in an urgency-sorted list. Eight rows are shown initially with a Show more control. Confirmed pickup history covers the last 14 days. Unknown end times are never inferred. The pickup-approaching threshold is 2 hours; ship-by-soon is 4 hours. Pending cancellations remain review items; terminal cancellations, returns/refunds and unpaid orders are excluded.

Every lane and individual order opens the existing inspector. Preparation and pickup remain separate. The inspector retains retry, keyboard focus, order switching and Branch-gated pickup changes. Background reads preserve unsaved policy edits. A failed read retains the last complete snapshot and shows its age; an initial failure shows unknown counts. The browser retrieves all keyset pages before publishing a new snapshot. Older non-paginated 500-row responses show a completeness warning.

The supporting change is in `jenang-gemi-api-ingest`: `arrangementMapPage()` scans outstanding handovers plus recent confirmations with an ID cursor and fixed upper ID, supplies pagination metadata, and exposes preparation timestamps. No schema migration or fulfillment-worker/policy change is required. The dashboard proxy forwards cursors. Deploy the API change before or alongside the dashboard.

Validation:

- `node tests/shipment-schedule-test.js`: status boundaries, UTC/WIB conversion, overnight windows, partial collection, preparation vs pickup, missing data, shop/carrier isolation, old misses, filters, deduplication and terminal statuses.
- `node tests/shipment-arrangement-ui-test.js`: routing, controller/assets, status/search/date controls, inspector, permissions and preserved rule editor.
- `node tests/shipment-arrangement-browser.cjs` with Playwright and PHP: the actual PHP template/CSS in desktop dark/light and mobile; complete pagination; filters and dates; details/retry; focus restoration after refresh; refreshed collection progress; elapsed-time urgency during failure; initial and partial-read failures; legacy limit warning; Show more/search; escaped API strings; unsaved policy edits; cross-midnight labels. The test intercepts all network requests and makes no live shipment writes.
- API `ShipmentArrangementMapTest.php`: 650 historical completed records, 1,100 outstanding records, recent confirmations, prepared-but-uncollected orders, terminal exclusion and stable three-page retrieval including an insert during pagination.
- API `MarketplaceFulfillmentTest.php`, `ShipmentArrangementPolicyTest.php`, `ShipmentArrangementPolicyMigrationTest.php`: existing fulfillment/policy regressions passed.
- PHP syntax and `git diff --check` passed in both repositories.

For browser tests, set `PLAYWRIGHT_MODULE` and `PHP_BIN` when those dependencies are outside the normal PATH. `SHIPMENT_SCREENSHOTS` optionally selects the screenshot output directory. Browser screenshots use synthetic shipments; authenticated production data could not be verified because the locally configured API credential received HTTP 401.
