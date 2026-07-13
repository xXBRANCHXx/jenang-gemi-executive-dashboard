<?php
declare(strict_types=1);

require dirname(__DIR__) . '/accounting-bootstrap.php';

function summary_expect(mixed $expected, mixed $actual, string $message): void
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
    id INTEGER PRIMARY KEY, account_key TEXT, type TEXT, platform TEXT, brand TEXT,
    opening_balance REAL, current_balance_manual REAL NULL, is_spendable INTEGER, is_active INTEGER
)');
$pdo->exec('CREATE TABLE accounting_transactions (
    id INTEGER PRIMARY KEY, status TEXT, type TEXT, direction TEXT, account_id INTEGER,
    to_account_id INTEGER, business_month TEXT, transaction_date TEXT, amount REAL,
    transfer_fee_amount REAL, category_id INTEGER NULL, counterparty_id INTEGER NULL,
    brand TEXT, channel TEXT, receipt_status TEXT, order_no TEXT, reference_no TEXT, invoice_no TEXT
)');
$pdo->exec('CREATE TABLE accounting_bills (
    id INTEGER PRIMARY KEY, status TEXT, outstanding_amount REAL, due_date TEXT,
    business_month TEXT, total_amount REAL, paid_amount REAL
)');
$pdo->exec('CREATE TABLE accounting_review_queue (id INTEGER PRIMARY KEY, status TEXT)');
$pdo->exec('CREATE TABLE accounting_categories (
    id INTEGER PRIMARY KEY, name TEXT, type TEXT, parent_id INTEGER NULL, category_key TEXT
)');
$pdo->exec('CREATE TABLE accounting_counterparties (id INTEGER PRIMARY KEY, name TEXT)');
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
$pdo->exec('CREATE TABLE dashboard_order_mirror (
    order_item_hash TEXT, platform TEXT, account_key TEXT, order_id TEXT,
    order_net_revenue REAL, funds_released INTEGER, funds_released_amount REAL,
    status TEXT, funds_release_status TEXT, funds_release_source TEXT, deleted_at TEXT NULL
)');

$pdo->exec("INSERT INTO accounting_accounts VALUES
    (1, 'bca-main', 'bank', '', '', 0, NULL, 1, 1),
    (2, 'shopee-jg-wallet', 'marketplace_wallet', 'shopee', 'Jenang Gemi', 0, NULL, 0, 1)");
$pdo->exec("INSERT INTO accounting_transactions VALUES
    (1, 'posted', 'manual_income', 'money_in', 1, NULL, '2026-07', '2026-07-02', 50000, 0, NULL, NULL, 'Jenang Gemi', 'Offline', 'not_required', '', '', '')");
$pdo->exec("INSERT INTO dashboard_wallet_releases VALUES
    (1, 'shopee', 'jenang-gemi-shopee', 60000, 'bank withdrawal', 'test', '2026-07-03 05:00:00', '2026-07-03 05:00:00', NULL)");
$pdo->exec("INSERT INTO website_orders VALUES
    (1, 'jenang_gemi_website', 'JGWEB-PAID', 'AWAITING_FULFILLMENT_SETUP', 'Customer', 80000, 80000, '2026-07-04 02:00:00', '2026-07-04 01:00:00')");
$pdo->exec("INSERT INTO dashboard_order_mirror VALUES
    ('open', 'shopee', 'jenang-gemi-shopee', 'OPEN-1', 70000, 0, 0, 'COMPLETED', '', '', NULL),
    ('cancelled', 'shopee', 'jenang-gemi-shopee', 'CANCEL-1', 30000, 0, 0, 'CANCELLED', '', '', NULL)");

$today = jg_accounting_now();
$dueSoon = $today->modify('+2 days')->format('Y-m-d');
$overdue = $today->modify('-2 days')->format('Y-m-d');
$pdo->prepare('INSERT INTO accounting_bills VALUES (1, "unpaid", 20000, :due, "2026-07", 20000, 0)')
    ->execute([':due' => $dueSoon]);
$pdo->prepare('INSERT INTO accounting_bills VALUES (2, "unpaid", 10000, :due, "2026-07", 10000, 0)')
    ->execute([':due' => $overdue]);

$summary = jg_accounting_summary($pdo, '2026-07');
summary_expect(190000, $summary['kpis']['real_cash_available'], 'Available cash must add manual money-in, confirmed website payments, and Wallet withdrawals exactly once.');
summary_expect(70000, $summary['kpis']['marketplace_outstanding'], 'Outstanding cash must equal unreleased settling marketplace orders.');
summary_expect(20000, $summary['kpis']['bills_due_soon'], 'Bills due soon must include only open bills due in the next seven days.');
summary_expect(10000, $summary['kpis']['overdue_bills'], 'Overdue bills must remain separate from due-soon bills.');
summary_expect(160000, $summary['kpis']['net_safe_cash'], 'Safe cash must subtract obligations from available cash without treating receivables as cash.');
summary_expect(60000, $summary['monthly_summary']['wallet_withdrawals_to_bank'], 'Monthly Wallet withdrawals must be reported independently.');
summary_expect(80000, $summary['monthly_summary']['website_payments_to_bank'], 'Monthly confirmed website payments must be reported independently.');
summary_expect(190000, $summary['monthly_summary']['estimated_net_cash_movement'], 'Monthly movement must combine manual and automatic money-in.');

$feePdo = new PDO('sqlite::memory:');
$feePdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$feePdo->exec('CREATE TABLE accounting_accounts (
    id INTEGER PRIMARY KEY, opening_balance REAL, current_balance_manual REAL NULL, is_active INTEGER
)');
$feePdo->exec('CREATE TABLE accounting_transactions (
    id INTEGER PRIMARY KEY, status TEXT, account_id INTEGER, to_account_id INTEGER,
    direction TEXT, amount REAL, transfer_fee_amount REAL
)');
$feePdo->exec("INSERT INTO accounting_accounts VALUES (1, 1000, NULL, 1), (2, 0, NULL, 1)");
$feePdo->exec("INSERT INTO accounting_transactions VALUES (1, 'posted', 1, 2, 'internal_transfer', 100, 10)");
$feeBalances = jg_accounting_account_balances($feePdo);
summary_expect(890, $feeBalances[1], 'Transfer fees must reduce the source account in addition to the transfer amount.');
summary_expect(100, $feeBalances[2], 'Transfer fees must not reduce or inflate the destination account.');

echo "accounting-summary-test: ok\n";
