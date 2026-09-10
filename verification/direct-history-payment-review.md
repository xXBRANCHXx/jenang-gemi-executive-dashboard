# Direct history payment filters and colors — exec3.98.20

The Status dropdown now offers All statuses, Paid, Unpaid, and Canceled. Payment filtering runs before totals and pagination across dashboard orders and counter invoices. Canceled lifecycle records take precedence over stored payment values; legacy empty payment values count as unpaid. Existing fulfillment-status API callers remain supported, and the ledger's fulfillment column is labeled explicitly.

Paid badges use a green outline with no fill. Unpaid badges and Mark paid buttons use solid blue with white text. Canceled rows have a red background across their full width, retain red on hover and keyboard focus, and use contrasting text in both themes. Confirming a payment refreshes an active payment filter so paid orders leave the Unpaid view.

Validation passed:

- PHP history integration checks with isolated SQLite databases: payment/channel/archive/search combinations, canceled records, normalized legacy values, aggregate units, mixed-source pagination, and unchanged database write counts.
- Existing direct-order payment, archive, and WhatsApp order PHP suites.
- Existing WhatsApp history and order JavaScript checks, plus syntax checks for changed PHP and JavaScript.
- Browser checks using the native PHP template and fixture API responses: persisted payment filters, payment confirmation and removal from Unpaid, counter receipt and archive interactions, actual badge and row colors, hover/focus colors, text contrast, and desktop/light/dark/mobile layouts.

Updated screenshots in `verification/ui/direct-history-*.png` use illustrative test records. Production order records were not changed during verification.
