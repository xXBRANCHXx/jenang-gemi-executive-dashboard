<?php
declare(strict_types=1);

define('JG_WALLET_API_NO_DISPATCH', true);
require dirname(__DIR__) . '/api/wallet/index.php';

function wallet_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) {
        return;
    }

    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
    fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

function wallet_expect_exception(string $expectedMessage, callable $callback, string $message): void
{
    try {
        $callback();
    } catch (InvalidArgumentException $error) {
        wallet_expect($expectedMessage, $error->getMessage(), $message);
        return;
    }

    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected exception: ' . $expectedMessage . PHP_EOL);
    exit(1);
}

$accounts = jg_wallet_known_accounts();
wallet_expect(6, count($accounts), 'Wallet page must seed Shopee and TikTok wallets for each account.');
wallet_expect(2, JG_WALLET_RELEASE_SYNC_DAYS, 'Routine order-release repair must use the rolling two-day window.');
wallet_expect(true, JG_WALLET_RELEASE_SYNC_IMPORT_ROWS <= 5000, 'Routine order-release repair must keep mirror imports bounded.');
wallet_expect(3, count(jg_wallet_transaction_accounts()), 'Wallet-ledger refresh must identify all Shopee accounts for concurrent work.');
wallet_expect('zero-shopee', jg_wallet_known_account('Shopee', 'ZERO Shopee')['account_key'] ?? '', 'Account-bounded wallet refresh must normalize and validate known accounts.');
wallet_expect(null, jg_wallet_known_account('tiktok', 'not-a-wallet'), 'Account-bounded wallet refresh must reject unknown accounts.');
wallet_expect('shopee|jenang-gemi-shopee', jg_wallet_account_key('Shopee', 'Jenang Gemi Shopee'), 'Wallet account keys must normalize labels safely.');
wallet_expect('ZERO TikTok', jg_wallet_account_label('ZERO', 'tiktok', 'zero-tiktok'), 'Wallet account labels must use platform names.');
wallet_expect('Jenang Gemi Shopee', jg_wallet_account_label('', 'shopee', 'jenang-gemi-shopee'), 'Wallet labels must avoid duplicate platform suffixes.');
wallet_expect(100000, jg_wallet_release_amount('', 100000), 'Blank release amount must default to the current wallet balance.');
wallet_expect(25000, jg_wallet_release_amount('25000', 100000), 'Release amount must allow partial wallet releases.');
wallet_expect(45000, jg_wallet_release_amount('Rp45.000', 100000), 'Release amount must accept formatted Rupiah input.');
wallet_expect_exception('wallet_release_amount_exceeds_balance', static fn () => jg_wallet_release_amount('125000', 100000), 'Release amount must not exceed wallet balance.');
wallet_expect('2026-05-20', jg_wallet_date('', JG_WALLET_BACKTRACK_START_DATE), 'Wallet backtrack must default to May 20, 2026.');
wallet_expect(6, count(jg_wallet_backtrack_accounts()), 'Wallet backtrack must step every known marketplace wallet account.');
wallet_expect('2026-05-21', jg_wallet_chunk_end('2026-05-20', '2026-05-25', 2), 'Wallet backtrack chunks must stay bounded.');
wallet_expect(3, jg_wallet_total_chunks('2026-05-20', '2026-05-25', 2), 'Wallet backtrack must calculate resumable chunk counts.');
wallet_expect(100, jg_wallet_backtrack_public_state([
    'run_key' => 'abc',
    'status' => 'complete',
    'phase' => 'complete',
    'start_date' => '2026-05-20',
    'end_date' => '2026-05-25',
    'cursor_date' => '2026-05-25',
    'chunk_days' => 2,
])['progress'], 'Completed wallet backtracks must report 100 percent progress.');
$cancelledBacktrack = jg_wallet_backtrack_public_state([
    'run_key' => 'cancelled',
    'status' => 'cancelled',
    'phase' => 'cancelled',
    'start_date' => '2026-05-20',
    'end_date' => '2026-05-25',
    'cursor_date' => '2026-05-21',
    'chunk_days' => 2,
]);
wallet_expect(false, $cancelledBacktrack['active'], 'Cancelled wallet backtracks must not remain active.');
wallet_expect('cancelled', $cancelledBacktrack['status'], 'Cancelled wallet backtracks must expose cancelled status.');
$walletApiSample = jg_wallet_api_sample_response();
wallet_expect(true, $walletApiSample['sample'], 'Wallet API sample must be marked as a sample.');
wallet_expect(false, $walletApiSample['contains_live_data'], 'Wallet API sample must not be marked as live data.');
wallet_expect(false, $walletApiSample['security']['public'], 'Wallet API sample must document that live wallet API access is not public.');
wallet_expect('POST', $walletApiSample['request']['method'], 'Wallet API terminal sample must use POST.');
wallet_expect(true, jg_wallet_is_non_settling_status('CANCELLED'), 'Cancelled marketplace orders must be separated from outstanding funds.');
wallet_expect('non_settling', jg_wallet_order_bucket([
    'funds_released' => 0,
    'funds_release_status' => 'CANCELLED',
    'order_status' => '',
]), 'Cancelled unreleased orders must not count as outstanding.');
wallet_expect('outstanding', jg_wallet_order_bucket([
    'funds_released' => 0,
    'funds_release_status' => '',
    'order_status' => 'READY_TO_SHIP',
]), 'Unreleased settling orders must remain outstanding.');
wallet_expect('outstanding', jg_wallet_order_bucket([
    'funds_released' => 0,
    'funds_release_status' => '',
    'order_status' => 'CLOSED',
]), 'Closed Shopee orders without released funds must remain outstanding.');
wallet_expect('outstanding', jg_wallet_order_bucket([
    'platform' => 'shopee',
    'funds_released' => 1,
    'funds_release_status' => 'READY_TO_SHIP',
    'funds_release_source' => 'settlement_payload',
    'order_status' => 'READY_TO_SHIP',
]), 'Shopee escrow revenue must stay outstanding until wallet release evidence exists.');
wallet_expect('released', jg_wallet_order_bucket([
    'platform' => 'shopee',
    'funds_released' => 1,
    'funds_release_status' => 'COMPLETED',
    'funds_release_source' => 'settlement_payload',
    'order_status' => 'COMPLETED',
]), 'Completed Shopee settlement payloads may count as released.');
wallet_expect(45000, jg_wallet_released_amount([
    'funds_released_amount' => 0,
], 45000), 'Released orders must fall back to order amount when the release amount is missing.');
$julyWindow = jg_wallet_current_month_window(new DateTimeImmutable('2026-07-06 12:00:00', new DateTimeZone('Asia/Jakarta')));
wallet_expect('2026-06-30 17:00:00.000000', $julyWindow['start_at'], 'Wallet released month must start at midnight WIB.');
wallet_expect('2026-07-31 17:00:00.000000', $julyWindow['end_at'], 'Wallet released month must end at the next midnight WIB.');
wallet_expect(true, jg_wallet_released_in_window([
    'funds_released_at' => '2026-06-30 17:00:00.000000',
], $julyWindow), 'First UTC instant of the WIB month must count as released this month.');
wallet_expect(false, jg_wallet_released_in_window([
    'funds_released_at' => '2026-07-31 17:00:00.000000',
], $julyWindow), 'First UTC instant of next WIB month must not count as released this month.');
wallet_expect(true, jg_wallet_is_shopee_release_credit([
    'platform' => 'Shopee',
    'transaction_type' => 'ESCROW_VERIFIED_ADD',
    'money_flow' => 'MONEY_IN',
    'amount' => 45000,
]), 'Shopee escrow wallet credits must count as released money received.');
wallet_expect(false, jg_wallet_is_shopee_release_credit([
    'platform' => 'shopee',
    'transaction_type' => 'WITHDRAWAL_CREATED',
    'money_flow' => 'MONEY_OUT',
    'amount' => -45000,
]), 'Shopee withdrawals must not count as released money received.');
$walletTransactionPdo = new PDO('sqlite::memory:');
$walletTransactionPdo->exec('CREATE TABLE dashboard_wallet_platform_transactions (
    id INTEGER PRIMARY KEY,
    platform TEXT,
    account_key TEXT,
    transaction_type TEXT,
    money_flow TEXT,
    amount REAL,
    transaction_at TEXT
)');
$walletTransactionPdo->exec("INSERT INTO dashboard_wallet_platform_transactions VALUES
    (1, 'shopee', 'jenang-gemi-shopee', 'ESCROW_VERIFIED_ADD', 'MONEY_IN', 45000, '2026-06-30 17:00:00.000000'),
    (2, 'shopee', 'jenang-gemi-shopee', 'ESCROW_VERIFIED_ADD', 'MONEY_IN', 55000, '2026-07-15 03:00:00.000000'),
    (3, 'shopee', 'jenang-gemi-shopee', 'WITHDRAWAL_CREATED', 'MONEY_OUT', -25000, '2026-07-16 03:00:00.000000'),
    (4, 'shopee', 'jenang-gemi-shopee', 'ESCROW_VERIFIED_ADD', 'MONEY_IN', 65000, '2026-07-31 17:00:00.000000')");
$walletMonthlyCredits = jg_wallet_platform_released_month_totals($walletTransactionPdo, $julyWindow);
wallet_expect(100000, $walletMonthlyCredits[0]['amount'] ?? 0, 'Released this month must sum Shopee wallet credits inside the WIB month.');
wallet_expect(2, $walletMonthlyCredits[0]['count'] ?? 0, 'Released this month must count only qualifying Shopee wallet credits.');
wallet_expect(0, jg_wallet_balance_value('0'), 'Wallet balance anchors must allow a zero balance after withdrawal.');
wallet_expect(45000, jg_wallet_balance_value('Rp45.000'), 'Wallet balance anchors must accept formatted Rupiah input.');
wallet_expect('2026-07-03 03:30:00.000000', jg_wallet_observed_at('2026-07-03T10:30'), 'Manual wallet observed times must be stored as UTC.');
wallet_expect('2026-07-03 05:00:00.000000', jg_wallet_withdrawn_at('2026-07-03T12:00'), 'Withdrawal times must be stored as UTC.');
wallet_expect(true, jg_wallet_release_is_after_anchor([
    'funds_released_at' => '2026-07-03 03:31:00.000000',
], [
    'observed_at_sql' => '2026-07-03 03:30:00.000000',
]), 'Only releases after a manual wallet anchor should increase current wallet.');
wallet_expect(false, jg_wallet_release_is_after_anchor([
    'funds_released_at' => '2026-07-03 03:29:00.000000',
    'source_updated_at' => '2026-07-03 03:45:00.000000',
    'mirrored_at' => '2026-07-03 03:46:00.000000',
], [
    'observed_at_sql' => '2026-07-03 03:30:00.000000',
]), 'Mirror updates after the anchor must not count unless funds_released_at itself is after the anchor.');
wallet_expect('released_after_anchor', jg_wallet_release_anchor_class([
    'platform' => 'shopee',
    'funds_released' => 1,
    'funds_released_at' => '2026-07-03 03:31:00.000000',
    'funds_release_status' => 'COMPLETED',
    'funds_release_source' => 'settlement_payload',
    'order_status' => 'COMPLETED',
], [
    'observed_at_sql' => '2026-07-03 03:30:00.000000',
]), 'Trusted release timestamps after the anchor must be classified as wallet additions.');
wallet_expect('released_at_or_before_anchor', jg_wallet_release_anchor_class([
    'platform' => 'tiktok',
    'funds_released' => 1,
    'funds_released_at' => '2026-07-03 03:29:00.000000',
    'source_updated_at' => '2026-07-03 03:45:00.000000',
    'funds_release_status' => 'SETTLED',
    'funds_release_source' => 'finance_statement.status=SETTLED',
    'order_status' => 'AWAITING_SHIPMENT',
], [
    'observed_at_sql' => '2026-07-03 03:30:00.000000',
]), 'A row refreshed after the anchor must still be excluded when its stored release timestamp is before the anchor.');
wallet_expect('released_missing_release_time', jg_wallet_release_anchor_class([
    'platform' => 'tiktok',
    'funds_released' => 1,
    'funds_released_at' => '',
    'funds_release_status' => 'SETTLED',
    'funds_release_source' => 'finance_statement.status=SETTLED',
    'order_status' => 'COMPLETED',
], [
    'observed_at_sql' => '2026-07-03 03:30:00.000000',
]), 'Trusted releases without a release timestamp must be diagnosable.');
wallet_expect('untrusted_release_marker', jg_wallet_release_anchor_class([
    'platform' => 'shopee',
    'funds_released' => 1,
    'funds_released_at' => '2026-07-03 03:31:00.000000',
    'funds_release_status' => 'READY_TO_SHIP',
    'funds_release_source' => 'settlement_payload',
    'order_status' => 'READY_TO_SHIP',
], [
    'observed_at_sql' => '2026-07-03 03:30:00.000000',
]), 'Untrusted marketplace release markers must be separated from counted wallet additions.');

$anchoredWallet = jg_wallet_empty_amounts();
$anchoredWallet['released_total'] = 1000000;
$anchoredWallet['released_since_anchor_total'] = 25000;
$anchoredWallet['withdrawn_since_anchor_total'] = 40000;
jg_wallet_apply_balance_anchor($anchoredWallet, [
    'id' => 7,
    'balance_amount' => 125000,
    'observed_at_sql' => '2026-07-03 03:30:00.000000',
    'created_at' => '2026-07-03 03:31:00.000000',
    'created_by' => 'Tester',
]);
wallet_expect(110000, $anchoredWallet['wallet_balance'], 'Wallet balance must subtract withdrawals after the manual anchor.');
wallet_expect(true, $anchoredWallet['wallet_balance_known'], 'Anchored wallets must report known balances.');

$unanchoredWallet = jg_wallet_empty_amounts();
$unanchoredWallet['released_total'] = 1000000;
jg_wallet_apply_balance_anchor($unanchoredWallet, null);
wallet_expect(0, $unanchoredWallet['wallet_balance'], 'Unanchored wallets must not pretend lifetime released funds are current wallet cash.');
wallet_expect(false, $unanchoredWallet['wallet_balance_known'], 'Unanchored wallets must require a manual balance.');

$matchedWallet = jg_wallet_match_wallet(array_map(static fn (array $account): array => $account + jg_wallet_empty_amounts(), jg_wallet_known_accounts()), [
    'query' => 'Jenang Gemi Shopee Wallet Info',
]);
$matchedWallet = is_array($matchedWallet) ? $matchedWallet : [];
wallet_expect('jenang-gemi-shopee', $matchedWallet['account_key'] ?? '', 'Wallet API terminal must resolve natural account queries.');
wallet_expect('/api/wallet/?action=account&platform=shopee&account_key=jenang-gemi-shopee', jg_wallet_api_call($matchedWallet), 'Wallet account API calls must be deterministic.');

$empty = jg_wallet_empty_amounts();
wallet_expect(0, $empty['wallet_balance'], 'Wallet empty state must start at Rp0.');
wallet_expect(0, $empty['non_settling_orders'], 'Wallet empty state must track excluded orders.');
wallet_expect('', $empty['last_order_at'], 'Wallet empty state must avoid fake timestamps.');

echo "wallet-api-test: ok\n";
