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

$empty = jg_wallet_empty_amounts();
wallet_expect(0, $empty['wallet_balance'], 'Wallet empty state must start at Rp0.');
wallet_expect('', $empty['last_order_at'], 'Wallet empty state must avoid fake timestamps.');

echo "wallet-api-test: ok\n";
