<?php
declare(strict_types=1);

require dirname(__DIR__) . '/accounting-bootstrap.php';

function accounting_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) {
        return;
    }

    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
    fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$bounds = jg_accounting_month_utc_bounds('2026-07');
accounting_expect('2026-06-30 17:00:00', $bounds['start_at'], 'Accounting wallet cash month must start at midnight WIB.');
accounting_expect('2026-07-31 17:00:00', $bounds['end_at'], 'Accounting wallet cash month must end at the next midnight WIB.');

$missing = new PDO('sqlite::memory:');
$missingContext = jg_accounting_automatic_usable_cash_context($missing, ['month' => '2026-07']);
accounting_expect(0, $missingContext['amount'], 'Missing source tables must not inflate Accounting cash.');
accounting_expect(0, $missingContext['record_count'], 'Missing source tables must not create automatic cash records.');

$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('CREATE TABLE dashboard_wallet_releases (
    id INTEGER PRIMARY KEY,
    platform TEXT,
    account_key TEXT,
    amount REAL,
    release_note TEXT,
    released_by TEXT,
    withdrawn_at TEXT NULL,
    created_at TEXT,
    undone_at TEXT NULL
)');
$pdo->exec('CREATE TABLE accounting_accounts (
    id INTEGER PRIMARY KEY,
    type TEXT,
    is_spendable INTEGER
)');
$pdo->exec('CREATE TABLE accounting_transactions (
    id INTEGER PRIMARY KEY,
    status TEXT,
    type TEXT,
    direction TEXT,
    account_id INTEGER,
    to_account_id INTEGER,
    business_month TEXT,
    transaction_date TEXT,
    order_no TEXT,
    reference_no TEXT,
    invoice_no TEXT,
    amount REAL
)');
$pdo->exec('CREATE TABLE website_orders (
    id INTEGER PRIMARY KEY,
    platform TEXT,
    order_id TEXT,
    status TEXT,
    customer_name TEXT,
    gross_revenue REAL,
    net_revenue REAL,
    cogs REAL,
    paid_at TEXT NULL,
    created_at TEXT
)');

$pdo->exec("INSERT INTO accounting_accounts (id, type, is_spendable) VALUES
    (1, 'marketplace_wallet', 0),
    (2, 'bank', 1),
    (3, 'cash', 1)");
$pdo->exec("INSERT INTO dashboard_wallet_releases (platform, account_key, amount, release_note, released_by, withdrawn_at, created_at, undone_at) VALUES
    ('shopee', 'jenang-gemi-shopee', 100000, 'bank cash-out', 'test', '2026-07-03 05:00:00', '2026-07-03 05:00:00', NULL),
    ('shopee', 'jenang-gemi-shopee', 30000, 'june cash-out', 'test', '2026-06-20 05:00:00', '2026-06-20 05:00:00', NULL),
    ('tiktok', 'zero-tiktok', 50000, 'undone cash-out', 'test', '2026-07-05 05:00:00', '2026-07-05 05:00:00', '2026-07-05 06:00:00')");
$pdo->exec("INSERT INTO website_orders (platform, order_id, status, customer_name, gross_revenue, net_revenue, cogs, paid_at, created_at) VALUES
    ('jenang_gemi_website', 'JGWEB-1', 'AWAITING_FULFILLMENT_SETUP', 'Customer One', 220000, 200000, 150000, '2026-07-04 02:00:00', '2026-07-04 01:00:00'),
    ('zero_website', 'ZEROWEB-2', 'PAID_MANUAL_ERA', 'Customer Two', 80000, 80000, 999999, '2026-07-05 02:00:00', '2026-07-05 01:00:00'),
    ('zero_website', 'ZEROWEB-UNPAID', 'PENDING_PAYMENT', 'Customer Three', 70000, 70000, 0, NULL, '2026-07-06 01:00:00'),
    ('jenang_gemi_website', 'JGWEB-JUNE', 'PAID_MANUAL_ERA', 'Customer Four', 40000, 40000, 0, '2026-06-20 02:00:00', '2026-06-20 01:00:00')");
$pdo->exec("INSERT INTO accounting_transactions (status, type, direction, account_id, to_account_id, business_month, transaction_date, order_no, reference_no, invoice_no, amount) VALUES
    ('posted', 'transfer', 'internal_transfer', 1, 2, '2026-07', '2026-07-03', '', '', '', 25000),
    ('posted', 'transfer', 'internal_transfer', 2, 3, '2026-07', '2026-07-03', '', '', '', 9000),
    ('void', 'transfer', 'internal_transfer', 1, 2, '2026-07', '2026-07-03', '', '', '', 7000),
    ('posted', 'manual_income', 'money_in', 2, NULL, '2026-07', '2026-07-05', 'ZEROWEB-2', '', '', 50000)");

$july = jg_accounting_wallet_usable_cash_context($pdo, '2026-07');
accounting_expect(100000, $july['wallet_withdrawn_total'], 'Monthly wallet cash must count active Wallet withdrawals.');
accounting_expect(25000, $july['manual_marketplace_transfer_total'], 'Monthly wallet cash must subtract manual marketplace transfers into spendable accounts.');
accounting_expect(75000, $july['amount'], 'Monthly wallet cash must expose only the automatic usable cash remainder.');

$allTime = jg_accounting_wallet_usable_cash_context($pdo);
accounting_expect(130000, $allTime['wallet_withdrawn_total'], 'All-time wallet cash must count every active Wallet withdrawal.');
accounting_expect(105000, $allTime['amount'], 'All-time wallet cash must avoid double-counting manual marketplace transfers.');

$websiteRecords = jg_accounting_website_cash_records($pdo, jg_accounting_cash_record_bounds(['month' => '2026-07']));
accounting_expect(2, count($websiteRecords), 'Monthly website cash records must include only paid July website orders.');
$websiteContext = jg_accounting_automatic_usable_cash_context($pdo, ['month' => '2026-07']);
accounting_expect(75000, $websiteContext['wallet_withdrawals_to_bank'], 'Automatic cash must keep wallet withdrawals separated.');
accounting_expect(230000, $websiteContext['website_payments_to_bank'], 'Automatic cash must count confirmed website payments without subtracting COGS.');
accounting_expect(305000, $websiteContext['amount'], 'Automatic cash must combine wallet withdrawals and website paid orders.');

$allCash = jg_accounting_automatic_usable_cash_context($pdo);
accounting_expect(375000, $allCash['amount'], 'All-time automatic cash must combine all active wallet withdrawals and website paid orders.');

echo "accounting-wallet-cash-test: ok\n";
