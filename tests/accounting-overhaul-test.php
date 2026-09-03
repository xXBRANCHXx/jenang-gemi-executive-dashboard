<?php
declare(strict_types=1);

require dirname(__DIR__) . '/accounting-bootstrap.php';

function overhaul_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) {
        return;
    }
    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
    fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('CREATE TABLE accounting_accounts (
    id INTEGER PRIMARY KEY, account_key TEXT, name TEXT, type TEXT, platform TEXT, brand TEXT,
    opening_balance REAL, current_balance_manual REAL NULL, is_spendable INTEGER, is_active INTEGER,
    balance_class TEXT, can_pay INTEGER, can_receive INTEGER, receives_automatic INTEGER,
    sort_order INTEGER, created_at TEXT
)');
$pdo->exec('CREATE TABLE accounting_transactions (
    id INTEGER PRIMARY KEY, transaction_key TEXT, status TEXT, type TEXT, direction TEXT,
    account_id INTEGER, to_account_id INTEGER NULL, counterparty_id INTEGER NULL, category_id INTEGER NULL,
    business_month TEXT, transaction_date TEXT, amount REAL, transfer_fee_amount REAL,
    reference_no TEXT, order_no TEXT, invoice_no TEXT, notes TEXT, channel TEXT, brand TEXT,
    payment_method TEXT, receipt_status TEXT, receipt_url TEXT, review_status TEXT, review_reason TEXT,
    bill_id INTEGER NULL, created_at TEXT
)');
$pdo->exec('CREATE TABLE accounting_counterparties (id INTEGER PRIMARY KEY, name TEXT)');
$pdo->exec('CREATE TABLE accounting_categories (id INTEGER PRIMARY KEY, name TEXT)');
$pdo->exec('CREATE TABLE accounting_bills (
    id INTEGER PRIMARY KEY, bill_key TEXT, bill_no TEXT, vendor_id INTEGER, issue_date TEXT, due_date TEXT,
    business_month TEXT, category_id INTEGER NULL, brand TEXT, channel TEXT, total_amount REAL,
    paid_amount REAL, outstanding_amount REAL, status TEXT, expected_account_id INTEGER NULL,
    attachment_url TEXT, receipt_status TEXT, notes TEXT, created_at TEXT
)');
$pdo->exec('CREATE TABLE accounting_cash_reconciliations (
    id INTEGER PRIMARY KEY, reconciliation_key TEXT, account_id INTEGER NULL, available_cash_amount REAL,
    cutoff_transaction_id INTEGER, note TEXT, reconciled_at TEXT, created_at TEXT
)');
$pdo->exec('CREATE TABLE dashboard_wallet_releases (
    id INTEGER PRIMARY KEY, platform TEXT, account_key TEXT, amount REAL, release_note TEXT,
    released_by TEXT, withdrawn_at TEXT NULL, created_at TEXT, undone_at TEXT NULL
)');
$pdo->exec('CREATE TABLE dashboard_wallet_platform_transactions (
    id INTEGER PRIMARY KEY, platform TEXT, account_key TEXT, transaction_id TEXT, order_id TEXT,
    transaction_type TEXT, money_flow TEXT, amount REAL, current_balance REAL NULL,
    transaction_at TEXT, raw_json TEXT NULL
)');
$pdo->exec('CREATE TABLE website_orders (
    id INTEGER PRIMARY KEY, platform TEXT, order_id TEXT, status TEXT, customer_name TEXT,
    gross_revenue REAL, net_revenue REAL, paid_at TEXT NULL, created_at TEXT
)');
$pdo->exec('CREATE TABLE whatsapp_orders (
    id INTEGER PRIMARY KEY, order_id TEXT, sales_channel TEXT, customer_name TEXT,
    merchandise_total REAL, shipping_cost REAL, status TEXT, fulfilled_at TEXT NULL, created_at TEXT
)');
$pdo->exec('CREATE TABLE accounting_receipt_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT, entity_type TEXT, entity_id INTEGER,
    original_name TEXT, mime_type TEXT, size_bytes INTEGER, file_data BLOB,
    uploaded_by INTEGER NULL, created_at TEXT
)');

$pdo->exec("INSERT INTO accounting_accounts VALUES
    (1, 'bca-main', 'BCA Main', 'bank', '', 'Jenang Gemi', 500000, NULL, 1, 1, 'bank', 1, 1, 1, 10, '2026-01-01 00:00:00')");
$pdo->exec("INSERT INTO accounting_categories VALUES (1, 'Supplies')");
$pdo->exec("INSERT INTO accounting_transactions
    (id, transaction_key, status, type, direction, account_id, to_account_id, counterparty_id, category_id,
     business_month, transaction_date, amount, transfer_fee_amount, reference_no, order_no, invoice_no, notes, channel, brand,
     payment_method, receipt_status, receipt_url, review_status, review_reason, bill_id, created_at)
    VALUES
    (1, 'PRE-RECON', 'posted', 'manual_income', 'money_in', 1, NULL, NULL, NULL, '2026-07', '2026-07-01', 20000, 0, '', '', '', '', 'Offline', 'Jenang Gemi', 'Cash', 'not_required', '', 'clean', '', NULL, '2026-07-01 00:00:00'),
    (2, 'POST-RECON', 'posted', 'expense', 'money_out', 1, NULL, NULL, 1, '2026-07', '2026-07-11', 10000, 0, '', '', '', 'Restocked office supplies', 'Offline', 'Jenang Gemi', 'Cash', 'not_required', '', 'clean', '', NULL, '2026-07-11 00:00:00')");
$pdo->exec("INSERT INTO accounting_cash_reconciliations VALUES
    (1, 'recon-test', 1, 100000, 1, 'Verified bank close', '2026-07-10 00:00:00', '2026-07-10 00:00:00')");
$pdo->exec("INSERT INTO website_orders VALUES
    (1, 'jenang_gemi_website', 'WEB-BEFORE', 'PAID', 'Earlier customer', 80000, 80000, '2026-07-09 02:00:00', '2026-07-09 01:00:00')");
$pdo->exec("INSERT INTO whatsapp_orders VALUES
    (1, 'WA-AFTER', 'walk_in', 'Walk-in customer', 45000, 5000, 'FULFILLED', '2026-07-12 02:00:00', '2026-07-11 01:00:00'),
    (2, 'WA-BEFORE', 'whatsapp', 'Earlier direct customer', 25000, 0, 'FULFILLED', '2026-07-09 02:00:00', '2026-07-09 01:00:00')");
$pdo->exec("INSERT INTO accounting_receipt_files
    (entity_type, entity_id, original_name, mime_type, size_bytes, file_data, created_at)
    VALUES ('direct_order', 1, 'walk-in-proof.png', 'image/png', 68, X'00', '2026-07-12 02:05:00')");

$direct = jg_accounting_direct_order_cash_records($pdo);
overhaul_expect(2, count($direct), 'Completed WhatsApp orders must remain available for automatic cash reconciliation.');
$afterDirect = current(array_values(array_filter($direct, static fn (array $row): bool => ($row['order_id'] ?? '') === 'WA-AFTER')));
overhaul_expect(50000, $afterDirect['usable_cash_amount'] ?? 0, 'Direct-order cash must include merchandise and shipping paid by the customer.');
overhaul_expect('walk_in', $afterDirect['platform'] ?? '', 'Walk-in sales must share the direct-order Accounting path without losing their channel.');

$history = jg_accounting_cash_history($pdo);
overhaul_expect(140000, $history['summary']['current_cash'], 'Reconciled cash must use the baseline plus only later manual and automatic movements.');
overhaul_expect(140000, $history['summary']['bank_balance'], 'A bank reconciliation must establish only the bank baseline.');
overhaul_expect(0, $history['summary']['cash_available'], 'A bank reconciliation must not create physical cash.');
$reconciliationRows = array_values(array_filter($history['rows'], static fn (array $row): bool => ($row['kind'] ?? '') === 'cash_reconciliation'));
overhaul_expect(1, count($reconciliationRows), 'The reconciliation baseline must remain visible in balance history.');
$ids = array_column($history['rows'], 'id');
overhaul_expect(false, in_array('transaction:1:source', $ids, true), 'Entries included in the reconciliation cutoff must not be counted again.');
overhaul_expect(false, in_array('website_order:jenang_gemi_website:WEB-BEFORE', $ids, true), 'Automatic cash received before reconciliation must not be counted again.');
overhaul_expect(false, in_array('direct_order:WA-BEFORE', $ids, true), 'Backfilled direct-order payments before reconciliation must not alter the reconciled bank balance.');

$bulkTransaction = $pdo->prepare('INSERT INTO accounting_transactions
    (id, transaction_key, status, type, direction, account_id, to_account_id, counterparty_id, category_id,
     business_month, transaction_date, amount, transfer_fee_amount, reference_no, order_no, invoice_no, notes, channel, brand,
     payment_method, receipt_status, receipt_url, review_status, review_reason, bill_id, created_at)
    VALUES
    (:id, :transaction_key, "posted", "expense", "money_out", 1, NULL, NULL, 1,
     "2026-07", "2026-07-31", 1000, 0, "", "", "", "Bulk ledger coverage", "Offline", "Jenang Gemi",
     "Cash", "not_required", "", "clean", "", NULL, :created_at)');
for ($id = 100; $id < 305; $id++) {
    $bulkTransaction->execute([
        ':id' => $id,
        ':transaction_key' => 'BULK-' . $id,
        ':created_at' => sprintf('2026-07-31 12:%02d:%02d', intdiv($id - 100, 60), ($id - 100) % 60),
    ]);
}

$ledger = jg_accounting_activity_ledger($pdo, ['month' => '2026-07']);
$ledgerKinds = array_values(array_unique(array_column($ledger, 'kind')));
overhaul_expect(true, count($ledger) > 200, 'The Activity ledger must not truncate a busy month at 200 rows.');
overhaul_expect(true, in_array('transaction', $ledgerKinds, true), 'Manual entries must appear in the unified activity ledger.');
overhaul_expect(true, in_array('automatic', $ledgerKinds, true), 'Automatic cash must appear in the unified activity ledger.');
overhaul_expect(true, in_array('reconciliation', $ledgerKinds, true), 'Reconciliations must appear in the unified activity ledger.');
$expenseLedger = current(array_filter($ledger, static fn (array $row): bool => ($row['id'] ?? '') === 'transaction:2'));
overhaul_expect('Supplies', $expenseLedger['category'] ?? '', 'Ledger transactions must expose their category.');
overhaul_expect('Restocked office supplies', $expenseLedger['note'] ?? '', 'Ledger transactions must expose their note.');
$walkInLedger = current(array_filter($ledger, static fn (array $row): bool => ($row['reference'] ?? '') === 'WA-AFTER'));
overhaul_expect('Walk-in order payment', $walkInLedger['title'] ?? '', 'The Activity ledger must identify walk-in payments clearly.');
overhaul_expect('direct_order', $walkInLedger['receipt_entity_type'] ?? '', 'Walk-in and direct-order ledger rows must expose their receipt target.');
overhaul_expect('walk-in-proof.png', $walkInLedger['receipts'][0]['name'] ?? '', 'The Activity ledger must return receipts stored against a walk-in order.');
$newerIndex = array_search('transaction:2', array_column($ledger, 'id'), true);
$olderIndex = array_search('transaction:1', array_column($ledger, 'id'), true);
overhaul_expect(true, is_int($newerIndex) && is_int($olderIndex) && $newerIndex < $olderIndex, 'The activity ledger must rank newer entries above older entries.');
overhaul_expect(true, in_array('transaction:1', array_column($ledger, 'id'), true), 'Older manual entries must remain visible after more than 200 newer rows.');

echo "accounting-overhaul-test: ok\n";
