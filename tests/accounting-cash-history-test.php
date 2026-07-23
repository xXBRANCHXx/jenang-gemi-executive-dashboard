<?php
declare(strict_types=1);

require dirname(__DIR__) . '/accounting-bootstrap.php';

function cash_history_expect(mixed $expected, mixed $actual, string $message): void
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
    reference_no TEXT, order_no TEXT, invoice_no TEXT, notes TEXT, channel TEXT, brand TEXT
)');
$pdo->exec('CREATE TABLE accounting_counterparties (id INTEGER PRIMARY KEY, name TEXT)');
$pdo->exec('CREATE TABLE accounting_categories (id INTEGER PRIMARY KEY, name TEXT)');
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

$pdo->exec("INSERT INTO accounting_accounts VALUES
    (1, 'bca-main', 'BCA Main', 'bank', '', '', 100000, NULL, 1, 1, 10, '2026-06-01 00:00:00'),
    (2, 'cash-office', 'Cash Office', 'cash', '', '', 0, 50000, 1, 1, 20, '2026-06-01 00:00:00'),
    (3, 'shopee-jg-wallet', 'Shopee Wallet', 'marketplace_wallet', 'shopee', 'Jenang Gemi', 0, NULL, 0, 1, 30, '2026-06-01 00:00:00'),
    (4, 'payable', 'Accounts Payable', 'payable', '', '', 0, NULL, 0, 1, 40, '2026-06-01 00:00:00')");
$pdo->exec("INSERT INTO accounting_counterparties VALUES (1, 'Walk-in customer'), (2, 'Office supplier')");
$pdo->exec("INSERT INTO accounting_categories VALUES (1, 'Offline sales'), (2, 'Office supplies')");
$pdo->exec("INSERT INTO accounting_transactions VALUES
    (1, 'TX-IN', 'posted', 'manual_income', 'money_in', 1, NULL, 1, 1, '2026-07', '2026-07-01', 40000, 0, 'SALE-1', '', '', 'Cash sale', 'Shopee', 'Jenang Gemi'),
    (2, 'TX-OUT', 'posted', 'expense', 'money_out', 1, NULL, 2, 2, '2026-07', '2026-07-02', 10000, 0, '', '', '', 'Paper and ink', 'Offline', 'General / Shared'),
    (3, 'TX-MOVE', 'posted', 'transfer', 'internal_transfer', 1, 2, NULL, NULL, '2026-07', '2026-07-03', 20000, 1000, '', '', '', '', 'Internal', 'General / Shared'),
    (4, 'TX-WALLET', 'posted', 'transfer', 'internal_transfer', 3, 1, NULL, NULL, '2026-07', '2026-07-04', 30000, 0, '', '', '', '', 'Shopee', 'Jenang Gemi'),
    (5, 'TX-PAYABLE', 'posted', 'transfer', 'internal_transfer', 2, 4, NULL, NULL, '2026-07', '2026-07-05', 5000, 0, '', '', '', 'Cash moved out', 'Internal', 'General / Shared'),
    (6, 'TX-VOID', 'void', 'expense', 'money_out', 1, NULL, NULL, NULL, '2026-07', '2026-07-06', 999999, 0, '', '', '', 'Must not appear', 'Offline', 'General / Shared')");
$pdo->exec("INSERT INTO dashboard_wallet_releases VALUES
    (1, 'shopee', 'jenang-gemi-shopee', 50000, 'Weekly payout', 'test', '2026-07-04 05:00:00', '2026-07-04 05:00:00', NULL)");
$pdo->exec("INSERT INTO website_orders VALUES
    (1, 'jenang_gemi_website', 'WEB-1', 'PAID', 'Website customer', 25000, 25000, '2026-07-06 03:00:00', '2026-07-06 02:00:00')");

$history = jg_accounting_cash_history($pdo);
cash_history_expect(249000, $history['summary']['current_cash'], 'Cash history must reconcile every cash addition and subtraction.');
cash_history_expect(265000, $history['summary']['total_added'], 'Cash history must total additions.');
cash_history_expect(16000, $history['summary']['total_subtracted'], 'Cash history must total subtractions, including transfer fees.');
cash_history_expect(9, $history['summary']['entry_count'], 'Cash history must include balances, manual movements, and usable automatic cash.');
cash_history_expect(249000, $history['rows'][0]['running_balance'], 'Newest history row must show the current running balance.');

$feeRows = array_values(array_filter($history['rows'], static fn (array $row): bool => ($row['reason'] ?? '') === 'Transfer fee'));
cash_history_expect(1, count($feeRows), 'A spendable-to-spendable transfer must show only its cash-changing fee.');
cash_history_expect(1000, $feeRows[0]['amount_subtracted'], 'Transfer fee must be shown as a subtraction.');

$walletRows = array_values(array_filter($history['rows'], static fn (array $row): bool => str_starts_with((string) ($row['id'] ?? ''), 'wallet_release:')));
cash_history_expect(20000, $walletRows[0]['amount_added'] ?? 0, 'Automatic Wallet history must subtract the matching manual transfer offset.');
cash_history_expect('shopee', $walletRows[0]['platform'] ?? '', 'Wallet cash history must expose a stable platform filter key.');
cash_history_expect('Shopee', $walletRows[0]['platform_label'] ?? '', 'Wallet cash history must expose a readable platform label.');
cash_history_expect('jenang-gemi', $walletRows[0]['cash_account'] ?? '', 'Wallet cash history must expose a stable account filter key.');
cash_history_expect('Jenang Gemi', $walletRows[0]['cash_account_label'] ?? '', 'Wallet cash history must expose a readable account label.');

$websiteRows = array_values(array_filter($history['rows'], static fn (array $row): bool => str_starts_with((string) ($row['id'] ?? ''), 'website_order:')));
cash_history_expect('jenang-gemi-website', $websiteRows[0]['platform'] ?? '', 'Website cash history must expose a source-specific platform key.');
cash_history_expect('Jenang Gemi Website', $websiteRows[0]['platform_label'] ?? '', 'Website cash history must expose a readable platform label.');
cash_history_expect('jenang-gemi', $websiteRows[0]['cash_account'] ?? '', 'Website cash history must map to the correct company account.');
cash_history_expect('zero', jg_accounting_cash_account('zero-tiktok')['key'] ?? '', 'ZERO marketplace accounts must share one filter key.');
cash_history_expect('zfit', jg_accounting_cash_account('ZFIT Shopee')['key'] ?? '', 'ZFIT marketplace accounts must share one filter key.');

echo "accounting-cash-history-test: ok\n";
