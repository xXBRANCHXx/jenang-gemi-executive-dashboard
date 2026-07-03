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

$accounts = jg_wallet_known_accounts();
wallet_expect(6, count($accounts), 'Wallet page must seed Shopee and TikTok wallets for each account.');
wallet_expect('shopee|jenang-gemi-shopee', jg_wallet_account_key('Shopee', 'Jenang Gemi Shopee'), 'Wallet account keys must normalize labels safely.');
wallet_expect('ZERO TikTok', jg_wallet_account_label('ZERO', 'tiktok', 'zero-tiktok'), 'Wallet account labels must use platform names.');
wallet_expect('Jenang Gemi Shopee', jg_wallet_account_label('', 'shopee', 'jenang-gemi-shopee'), 'Wallet labels must avoid duplicate platform suffixes.');

$empty = jg_wallet_empty_amounts();
wallet_expect(0, $empty['wallet_balance'], 'Wallet empty state must start at Rp0.');
wallet_expect('', $empty['last_order_at'], 'Wallet empty state must avoid fake timestamps.');

echo "wallet-api-test: ok\n";
