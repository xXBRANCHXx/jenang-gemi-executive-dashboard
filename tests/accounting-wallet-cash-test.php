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
accounting_expect('TikTok / Tokopedia · Jenang Gemi', jg_accounting_wallet_label('tiktok', 'jenang-gemi-tiktok'), 'Accounting must name the unified TikTok / Tokopedia channel.');

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
$pdo->exec('CREATE TABLE dashboard_wallet_platform_transactions (
    id INTEGER PRIMARY KEY,
    platform TEXT,
    account_key TEXT,
    transaction_id TEXT,
    order_id TEXT,
    transaction_type TEXT,
    money_flow TEXT,
    amount REAL,
    current_balance REAL NULL,
    transaction_at TEXT,
    raw_json TEXT NULL
)');
$pdo->exec('CREATE TABLE accounting_accounts (
    id INTEGER PRIMARY KEY,
    account_key TEXT,
    type TEXT,
    platform TEXT,
    brand TEXT,
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
    amount REAL,
    transfer_fee_amount REAL DEFAULT 0
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

$pdo->exec("INSERT INTO accounting_accounts (id, account_key, type, platform, brand, is_spendable) VALUES
    (1, 'shopee-jg-wallet', 'marketplace_wallet', 'shopee', 'Jenang Gemi', 0),
    (2, 'bca-main', 'bank', '', '', 1),
    (3, 'cash-office', 'cash', '', '', 1)");
$pdo->exec("INSERT INTO dashboard_wallet_releases (platform, account_key, amount, release_note, released_by, withdrawn_at, created_at, undone_at) VALUES
    ('shopee', 'jenang-gemi-shopee', 100000, 'bank cash-out', 'test', '2026-07-03 05:00:00', '2026-07-03 05:00:00', NULL),
    ('shopee', 'jenang-gemi-shopee', 30000, 'june cash-out', 'test', '2026-06-20 05:00:00', '2026-06-20 05:00:00', NULL),
    ('tiktok', 'zero-tiktok', 50000, 'undone cash-out', 'test', '2026-07-05 05:00:00', '2026-07-05 05:00:00', '2026-07-05 06:00:00')");
$pdo->exec("INSERT INTO dashboard_wallet_platform_transactions
    (platform, account_key, transaction_id, order_id, transaction_type, money_flow, amount, current_balance, transaction_at, raw_json) VALUES
    ('shopee', 'jenang-gemi-shopee', 'wallet-duplicate-manual', '', 'Withdrawal', 'OUT', -100000, 0, '2026-07-03 05:00:00', '{}'),
    ('shopee', 'zero-shopee', 'wallet-platform-cashout', '', 'Bank transfer', 'OUT', -60000, 40000, '2026-07-06 05:00:00', '{}'),
    ('shopee', 'zero-shopee', 'wallet-refund', 'ORDER-REFUND', 'Refund', 'OUT', -15000, 25000, '2026-07-07 05:00:00', '{}'),
    ('tiktok', 'jenang-gemi-tiktok', 'tiktok-settlement', '', 'TIKTOK_WITHDRAWAL_SUCCESS', 'WITHDRAWAL_OUT', -90000, NULL, '2026-07-08 05:00:00', '{\"type\":\"SETTLE\",\"status\":\"SUCCESS\"}'),
    ('tiktok', 'jenang-gemi-tiktok', 'tiktok-withdrawal', '', 'TIKTOK_WITHDRAWAL_SUCCESS', 'WITHDRAWAL_OUT', -70000, NULL, '2026-07-09 05:00:00', '{\"type\":\"WITHDRAW\",\"status\":\"SUCCESS\"}'),
    ('tiktok', 'jenang-gemi-tiktok', 'tiktok-pending', '', 'TIKTOK_WITHDRAWAL_PROCESSING', 'WITHDRAWAL_PENDING', -80000, NULL, '2026-07-10 05:00:00', '{\"type\":\"WITHDRAW\",\"status\":\"PROCESSING\"}')");
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
accounting_expect(230000, $july['wallet_withdrawn_total'], 'Monthly wallet cash must count active manual and confirmed platform Wallet withdrawals.');
accounting_expect(25000, $july['manual_marketplace_transfer_total'], 'Monthly wallet cash must subtract manual marketplace transfers into spendable accounts.');
accounting_expect(205000, $july['amount'], 'Monthly wallet cash must expose manual plus confirmed platform cash-out remainders.');

$allTime = jg_accounting_wallet_usable_cash_context($pdo);
accounting_expect(260000, $allTime['wallet_withdrawn_total'], 'All-time wallet cash must count every active confirmed Wallet withdrawal.');
accounting_expect(235000, $allTime['amount'], 'All-time wallet cash must avoid false TikTok settlements and double-counted platform rows.');

$websiteRecords = jg_accounting_website_cash_records($pdo, jg_accounting_cash_record_bounds(['month' => '2026-07']));
accounting_expect(2, count($websiteRecords), 'Monthly website cash records must include only paid July website orders.');
$websiteContext = jg_accounting_automatic_usable_cash_context($pdo, ['month' => '2026-07']);
accounting_expect(205000, $websiteContext['wallet_withdrawals_to_bank'], 'Automatic cash must keep confirmed wallet withdrawals separated.');
accounting_expect(230000, $websiteContext['website_payments_to_bank'], 'Automatic cash must count confirmed website payments without subtracting COGS.');
accounting_expect(435000, $websiteContext['amount'], 'Automatic cash must combine wallet withdrawals and website paid orders.');

$allCash = jg_accounting_automatic_usable_cash_context($pdo);
accounting_expect(505000, $allCash['amount'], 'All-time automatic cash must combine all active wallet withdrawals and website paid orders.');

$walletBreakdown = jg_accounting_wallet_breakdown($pdo, ['wallets' => [
    ['platform' => 'shopee', 'account_key' => 'zero-shopee', 'label' => 'Shopee · ZERO', 'outstanding_amount' => 0, 'order_count' => 0],
    ['platform' => 'tiktok', 'account_key' => 'jenang-gemi-tiktok', 'label' => 'TikTok / Tokopedia · Jenang Gemi', 'outstanding_amount' => 0, 'order_count' => 0],
]]);
$walletBreakdownByKey = [];
foreach ($walletBreakdown as $walletRow) {
    $walletBreakdownByKey[(string) ($walletRow['account_key'] ?? '')] = $walletRow;
}
accounting_expect(25000, $walletBreakdownByKey['zero-shopee']['current_balance'] ?? null, 'Accounting must show Shopee marketplace-reported ready-to-withdraw cash.');
accounting_expect(20000, $walletBreakdownByKey['jenang-gemi-tiktok']['current_balance'] ?? null, 'Accounting must show TikTok / Tokopedia settlements minus withdrawals as ready to withdraw.');
accounting_expect('tiktok_tokopedia_settlements_minus_withdrawals', $walletBreakdownByKey['jenang-gemi-tiktok']['balance_source'] ?? '', 'Accounting must disclose the TikTok / Tokopedia balance source.');

$pdo->exec("INSERT INTO dashboard_wallet_platform_transactions
    (platform, account_key, transaction_id, order_id, transaction_type, money_flow, amount, current_balance, transaction_at, raw_json) VALUES
    ('shopee', 'jenang-gemi-shopee', 'later-independent-withdrawal', '', 'WITHDRAWAL_CREATED', 'MONEY_OUT', -60000, 0, '2026-07-20 05:00:00', '{}')");
$laterWithdrawal = jg_accounting_wallet_usable_cash_context($pdo, '2026-07');
accounting_expect(265000, $laterWithdrawal['amount'], 'A later withdrawal must not be hidden by an unrelated historical release from the same wallet.');

accounting_expect(true, jg_accounting_is_wallet_platform_cash_out([
    'amount' => -60000,
    'transaction_type' => 'WITHDRAWAL_CREATED',
    'money_flow' => 'MONEY_OUT',
    'order_id' => '',
]), 'Underscore-delimited platform withdrawal enums must count as cash-outs.');
accounting_expect(false, jg_accounting_is_wallet_platform_cash_out([
    'amount' => -60000,
    'transaction_type' => 'PLATFORM_FEE_ADJUSTMENT',
    'money_flow' => 'MONEY_FLOW_OUT',
    'order_id' => '',
]), 'Platform fees and adjustments must not become available bank cash.');
accounting_expect(false, jg_accounting_is_wallet_platform_cash_out([
    'platform' => 'tiktok',
    'amount' => -90000,
    'transaction_type' => 'TIKTOK_WITHDRAWAL_SUCCESS',
    'money_flow' => 'WITHDRAWAL_OUT',
    'raw_json' => '{"type":"SETTLE","status":"SUCCESS"}',
]), 'TikTok settlement rows must not become available bank cash.');
accounting_expect(true, jg_accounting_is_wallet_platform_cash_out([
    'platform' => 'tiktok',
    'amount' => -70000,
    'transaction_type' => 'TIKTOK_WITHDRAWAL_SUCCESS',
    'money_flow' => 'WITHDRAWAL_OUT',
    'raw_json' => '{"type":"WITHDRAW","status":"SUCCESS"}',
]), 'Completed explicit TikTok withdrawals must become available bank cash.');
accounting_expect(false, jg_accounting_is_wallet_platform_cash_out([
    'platform' => 'tiktok',
    'amount' => -80000,
    'transaction_type' => 'TIKTOK_WITHDRAWAL_PROCESSING',
    'money_flow' => 'WITHDRAWAL_PENDING',
    'raw_json' => '{"type":"WITHDRAW","status":"PROCESSING"}',
]), 'Pending TikTok withdrawals must not become available bank cash.');

$outstandingPdo = new PDO('sqlite::memory:');
$outstandingPdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$outstandingPdo->exec('CREATE TABLE dashboard_order_mirror (
    order_item_hash TEXT, platform TEXT, account_key TEXT, order_id TEXT,
    order_net_revenue REAL, funds_released INTEGER, funds_released_amount REAL,
    status TEXT, funds_release_status TEXT, funds_release_source TEXT, deleted_at TEXT NULL
)');
$outstandingPdo->exec("INSERT INTO dashboard_order_mirror VALUES
    ('open', 'shopee', 'jenang-gemi-shopee', 'OPEN-1', 70000, 0, 0, 'COMPLETED', '', '', NULL),
    ('cancelled', 'shopee', 'jenang-gemi-shopee', 'CANCEL-1', 30000, 0, 0, 'CANCELLED', '', '', NULL),
    ('released', 'shopee', 'jenang-gemi-shopee', 'PAID-1', 40000, 1, 40000, 'COMPLETED', 'COMPLETED', 'settlement_payload', NULL)");
$outstanding = jg_accounting_marketplace_outstanding_context($outstandingPdo);
accounting_expect(true, $outstanding['available'], 'Marketplace outstanding must report when its order mirror is available.');
accounting_expect(70000, $outstanding['amount'], 'Marketplace outstanding must include only unreleased settling orders.');
accounting_expect(1, $outstanding['order_count'], 'Marketplace outstanding order count must exclude released and cancelled orders.');

$missingOutstanding = jg_accounting_marketplace_outstanding_context(new PDO('sqlite::memory:'));
accounting_expect(false, $missingOutstanding['available'], 'A missing Wallet source must be reported as unavailable.');
accounting_expect(null, $missingOutstanding['amount'], 'Unavailable outstanding cash must not masquerade as a legitimate zero.');

echo "accounting-wallet-cash-test: ok\n";
