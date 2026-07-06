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
$missingContext = jg_accounting_wallet_usable_cash_context($missing, '2026-07');
accounting_expect(0, $missingContext['amount'], 'Missing Wallet tables must not inflate Accounting cash.');
accounting_expect('wallet_releases_unavailable', $missingContext['source'], 'Missing Wallet tables must be reported as unavailable.');

$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('CREATE TABLE dashboard_wallet_releases (
    id INTEGER PRIMARY KEY,
    platform TEXT,
    account_key TEXT,
    amount REAL,
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
    amount REAL
)');

$pdo->exec("INSERT INTO accounting_accounts (id, type, is_spendable) VALUES
    (1, 'marketplace_wallet', 0),
    (2, 'bank', 1),
    (3, 'cash', 1)");
$pdo->exec("INSERT INTO dashboard_wallet_releases (platform, account_key, amount, withdrawn_at, created_at, undone_at) VALUES
    ('shopee', 'jenang-gemi-shopee', 100000, '2026-07-03 05:00:00', '2026-07-03 05:00:00', NULL),
    ('shopee', 'jenang-gemi-shopee', 30000, '2026-06-20 05:00:00', '2026-06-20 05:00:00', NULL),
    ('tiktok', 'zero-tiktok', 50000, '2026-07-05 05:00:00', '2026-07-05 05:00:00', '2026-07-05 06:00:00')");
$pdo->exec("INSERT INTO accounting_transactions (status, type, direction, account_id, to_account_id, business_month, amount) VALUES
    ('posted', 'transfer', 'internal_transfer', 1, 2, '2026-07', 25000),
    ('posted', 'transfer', 'internal_transfer', 2, 3, '2026-07', 9000),
    ('void', 'transfer', 'internal_transfer', 1, 2, '2026-07', 7000)");

$july = jg_accounting_wallet_usable_cash_context($pdo, '2026-07');
accounting_expect(100000, $july['wallet_withdrawn_total'], 'Monthly wallet cash must count active Wallet withdrawals.');
accounting_expect(25000, $july['manual_marketplace_transfer_total'], 'Monthly wallet cash must subtract manual marketplace transfers into spendable accounts.');
accounting_expect(75000, $july['amount'], 'Monthly wallet cash must expose only the automatic usable cash remainder.');

$allTime = jg_accounting_wallet_usable_cash_context($pdo);
accounting_expect(130000, $allTime['wallet_withdrawn_total'], 'All-time wallet cash must count every active Wallet withdrawal.');
accounting_expect(105000, $allTime['amount'], 'All-time wallet cash must avoid double-counting manual marketplace transfers.');

echo "accounting-wallet-cash-test: ok\n";
