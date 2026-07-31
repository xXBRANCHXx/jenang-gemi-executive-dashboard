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
    id INTEGER PRIMARY KEY, reconciliation_key TEXT, available_cash_amount REAL,
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

$pdo->exec("INSERT INTO accounting_accounts VALUES
    (1, 'bca-main', 'BCA Main', 'bank', '', 'Jenang Gemi', 500000, NULL, 1, 1, 10, '2026-01-01 00:00:00')");
$pdo->exec("INSERT INTO accounting_transactions
    (id, transaction_key, status, type, direction, account_id, to_account_id, counterparty_id, category_id,
     business_month, transaction_date, amount, transfer_fee_amount, reference_no, order_no, invoice_no, notes, channel, brand,
     payment_method, receipt_status, receipt_url, review_status, review_reason, bill_id, created_at)
    VALUES
    (1, 'PRE-RECON', 'posted', 'manual_income', 'money_in', 1, NULL, NULL, NULL, '2026-07', '2026-07-01', 20000, 0, '', '', '', '', 'Offline', 'Jenang Gemi', 'Cash', 'not_required', '', 'clean', '', NULL, '2026-07-01 00:00:00'),
    (2, 'POST-RECON', 'posted', 'expense', 'money_out', 1, NULL, NULL, NULL, '2026-07', '2026-07-11', 10000, 0, '', '', '', 'Supplies', 'Offline', 'Jenang Gemi', 'Cash', 'not_required', '', 'clean', '', NULL, '2026-07-11 00:00:00')");
$pdo->exec("INSERT INTO accounting_cash_reconciliations VALUES
    (1, 'recon-test', 100000, 1, 'Verified close count', '2026-07-10 00:00:00', '2026-07-10 00:00:00')");
$pdo->exec("INSERT INTO website_orders VALUES
    (1, 'jenang_gemi_website', 'WEB-BEFORE', 'PAID', 'Earlier customer', 80000, 80000, '2026-07-09 02:00:00', '2026-07-09 01:00:00')");
$pdo->exec("INSERT INTO whatsapp_orders VALUES
    (1, 'WA-AFTER', 'whatsapp', 'Direct customer', 45000, 5000, 'FULFILLED', '2026-07-12 02:00:00', '2026-07-11 01:00:00')");

$direct = jg_accounting_direct_order_cash_records($pdo);
overhaul_expect(1, count($direct), 'A completed WhatsApp order must create one automatic cash record.');
overhaul_expect(50000, $direct[0]['usable_cash_amount'], 'Direct-order cash must include merchandise and shipping paid by the customer.');

$history = jg_accounting_cash_history($pdo);
overhaul_expect(140000, $history['summary']['current_cash'], 'Reconciled cash must use the baseline plus only later manual and automatic movements.');
overhaul_expect('cash_reconciliation', $history['rows'][2]['kind'] ?? '', 'The reconciliation baseline must remain visible in cash history.');
$ids = array_column($history['rows'], 'id');
overhaul_expect(false, in_array('transaction:1', $ids, true), 'Entries included in the reconciliation cutoff must not be counted again.');
overhaul_expect(false, in_array('website_order:jenang_gemi_website:WEB-BEFORE', $ids, true), 'Automatic cash received before reconciliation must not be counted again.');

$ledger = jg_accounting_activity_ledger($pdo, ['month' => '2026-07']);
$ledgerKinds = array_values(array_unique(array_column($ledger, 'kind')));
overhaul_expect(true, in_array('transaction', $ledgerKinds, true), 'Manual entries must appear in the unified activity ledger.');
overhaul_expect(true, in_array('automatic', $ledgerKinds, true), 'Automatic cash must appear in the unified activity ledger.');
overhaul_expect(true, in_array('reconciliation', $ledgerKinds, true), 'Reconciliations must appear in the unified activity ledger.');

echo "accounting-overhaul-test: ok\n";
