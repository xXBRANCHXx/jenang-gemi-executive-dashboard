<?php
declare(strict_types=1);

require dirname(__DIR__) . '/accounting-bootstrap.php';

function direct_payment_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) return;
    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
    fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$pdo->exec('CREATE TABLE whatsapp_orders (
    id INTEGER PRIMARY KEY, order_id TEXT, sales_channel TEXT, customer_name TEXT,
    merchandise_total REAL, shipping_cost REAL, status TEXT, payment_status TEXT,
    payment_method TEXT, payment_account_key TEXT, paid_at TEXT NULL, fulfilled_at TEXT NULL,
    created_at TEXT
)');
$pdo->exec('CREATE TABLE accounting_transactions (
    status TEXT, direction TEXT, type TEXT, order_no TEXT, reference_no TEXT, invoice_no TEXT, amount REAL
)');
$pdo->exec('CREATE TABLE accounting_accounts (
    id INTEGER PRIMARY KEY, account_key TEXT, is_active INTEGER, can_receive INTEGER,
    receives_automatic INTEGER, balance_class TEXT, type TEXT, sort_order INTEGER
)');
$pdo->exec("INSERT INTO accounting_accounts VALUES
    (1, 'bca-main', 1, 1, 1, 'bank', 'bank', 10),
    (2, 'cash-office', 1, 1, 0, 'cash', 'cash', 20)");
$pdo->exec("INSERT INTO whatsapp_orders VALUES
    (1, 'WA-UNPAID', 'whatsapp', 'Waiting Buyer', 90000, 10000, 'IS_LISTED', 'unpaid', '', '', NULL, NULL, '2026-08-01 01:00:00'),
    (2, 'WALKIN-CASH', 'walk_in', 'Cash Buyer', 50000, 0, 'FULFILLED', 'paid', 'cash', 'cash-office', '2026-08-02 02:00:00', '2026-08-02 02:00:00', '2026-08-02 01:00:00'),
    (3, 'WA-CANCELED', 'whatsapp', 'Canceled Buyer', 70000, 5000, 'CANCELLED', 'canceled', 'bank', 'bca-main', '2026-08-03 02:00:00', NULL, '2026-08-03 01:00:00')");

$records = jg_accounting_direct_order_cash_records($pdo);
direct_payment_expect(1, count($records), 'Only paid, non-canceled direct orders may become spendable cash.');
direct_payment_expect('cash-office', $records[0]['account_key'], 'Cash direct orders must route to Cash Office.');
direct_payment_expect(50000, $records[0]['usable_cash_amount'], 'Confirmed customer cash must equal the full amount collected.');

$outstanding = jg_accounting_direct_order_outstanding_context($pdo);
direct_payment_expect(1, $outstanding['order_count'], 'Unpaid direct orders must remain outstanding receivables.');
direct_payment_expect(100000, $outstanding['amount'], 'Outstanding direct-order money must include the customer shipping amount.');
direct_payment_expect(2, jg_accounting_cash_record_account_id($pdo, $records[0]), 'Cash receipts must resolve to the Cash Office accounting account.');

direct_payment_expect('cash', jg_whatsapp_payment_method('cash'), 'Cash must be an accepted payment method.');
direct_payment_expect('bca-main', jg_whatsapp_payment_account_key('bank'), 'Bank payments must route to Bank Balance.');

echo "direct-order-payments-test: ok\n";
