<?php
declare(strict_types=1);

// Reuse a populated Accounting database to verify the complete reporting path.
require __DIR__ . '/accounting-cash-flow-test.php';

$pdo->exec('CREATE TABLE store_ops_walkin_invoices (
    invoice_number TEXT PRIMARY KEY, invoice_type TEXT, customer_name TEXT,
    payment_method TEXT, total REAL, analytics_visible INTEGER, created_by TEXT, created_at TEXT
)');
$pdo->exec("INSERT INTO store_ops_walkin_invoices VALUES
    ('WI-CASH', 'walk_in', 'Counter Buyer', 'Cash', 50000, 1, 'Staff', '2026-08-10 02:00:00'),
    ('WI-BANK', 'walk_in', 'Bank Buyer', 'Transfer', 75000, 1, 'Staff', '2026-08-11 02:00:00'),
    ('WI-HIDDEN', 'walk_in', 'Hidden', 'Cash', 99000, 0, 'Staff', '2026-08-11 02:00:00'),
    ('WI-OTHER', 'whatsapp', 'Other source', 'Cash', 99000, 1, 'Staff', '2026-08-11 02:00:00'),
    ('WI-SEPT', 'walk_in', 'Next month', 'QRIS', 30000, 1, 'Staff', '2026-08-31 18:00:00')");
$bounds = jg_accounting_cash_record_bounds(['month' => '2026-08']);
$records = jg_accounting_store_ops_walkin_cash_records($pdo, $bounds);
cash_flow_expect(2, count($records), 'Only visible walk-in invoices in the Jakarta reporting month enter income.');
cash_flow_expect('cash-office', $records[0]['account_key'], 'Counter cash routes to the cash account.');
cash_flow_expect('bca-main', $records[1]['account_key'], 'Transfer receipts route to the bank account.');
$after = jg_accounting_cash_flow_report($pdo, '2026-08', $poPdo);
cash_flow_expect(455000, $after['totals']['income'], 'Existing Store Ops invoices must increase reported income without a backfill.');
$ledger = jg_accounting_activity_ledger($pdo, ['month' => '2026-08']);
$walkins = array_values(array_filter($ledger, static fn (array $row): bool => str_starts_with($row['id'], 'automatic:store_ops_walkin:')));
cash_flow_expect(2, count($walkins), 'Both Store Ops invoices must appear in the activity ledger.');
foreach ($walkins as $row) {
    cash_flow_expect('cash_in', $row['impact'], 'Walk-in ledger activity is income.');
    cash_flow_expect('', $row['receipt_entity_type'], 'Store Ops invoices must not attach receipts to unrelated executive orders.');
}
$pdo->exec("INSERT INTO accounting_transactions (id, status, direction, type, reference_no, amount)
    VALUES (100, 'posted', 'money_in', 'manual_income', 'WI-CASH', 20000)");
$records = jg_accounting_store_ops_walkin_cash_records($pdo, $bounds);
cash_flow_expect(30000, $records[0]['usable_cash_amount'], 'An existing manual receipt must offset automatic income.');
$pdo->exec("UPDATE accounting_transactions SET amount = 50000 WHERE id = 100");
$records = jg_accounting_store_ops_walkin_cash_records($pdo, $bounds);
cash_flow_expect(0, $records[0]['usable_cash_amount'], 'A fully recorded invoice must not be counted twice.');
$separate = new PDO('sqlite::memory:');
$separate->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$records = jg_accounting_store_ops_walkin_cash_records($separate, $bounds, $pdo);
cash_flow_expect(2, count($records), 'Invoices can be read from a separate SKU database.');
echo "accounting-store-ops-walkins-test: ok\n";
