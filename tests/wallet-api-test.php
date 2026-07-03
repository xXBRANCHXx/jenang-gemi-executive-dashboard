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
wallet_expect(45000, jg_wallet_released_amount([
    'funds_released_amount' => 0,
], 45000), 'Released orders must fall back to order amount when the release amount is missing.');
wallet_expect(0, jg_wallet_balance_value('0'), 'Wallet balance anchors must allow a zero balance after withdrawal.');
wallet_expect(45000, jg_wallet_balance_value('Rp45.000'), 'Wallet balance anchors must accept formatted Rupiah input.');
wallet_expect('2026-07-03 03:30:00.000000', jg_wallet_observed_at('2026-07-03T10:30'), 'Manual wallet observed times must be stored as UTC.');
wallet_expect(true, jg_wallet_release_is_after_anchor([
    'funds_released_at' => '2026-07-03 03:31:00.000000',
], [
    'observed_at_sql' => '2026-07-03 03:30:00.000000',
]), 'Only releases after a manual wallet anchor should increase current wallet.');

$anchoredWallet = jg_wallet_empty_amounts();
$anchoredWallet['released_total'] = 1000000;
$anchoredWallet['released_since_anchor_total'] = 25000;
jg_wallet_apply_balance_anchor($anchoredWallet, [
    'id' => 7,
    'balance_amount' => 125000,
    'observed_at_sql' => '2026-07-03 03:30:00.000000',
    'created_at' => '2026-07-03 03:31:00.000000',
    'created_by' => 'Tester',
]);
wallet_expect(150000, $anchoredWallet['wallet_balance'], 'Wallet balance must be manual anchor plus releases after anchor, not lifetime released funds.');
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
