<?php
declare(strict_types=1);

require dirname(__DIR__) . '/accounting-bootstrap.php';

function wallet_ads_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) return;
    fwrite(STDERR, $message . PHP_EOL . 'Expected: ' . var_export($expected, true) . PHP_EOL . 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$historicalAdsPayment = [
    'platform' => 'shopee',
    'account_key' => 'jenang-gemi-shopee',
    'amount' => -2775000,
    'transaction_at' => '2026-08-02 05:00:00',
    'transaction_type' => 'SPM_DEDUCT',
    'money_flow' => 'MONEY_OUT',
    'raw_json' => '{"description":"bank withdrawal"}',
];
wallet_ads_expect(true, jg_accounting_is_august_2026_wallet_ads_payment($historicalAdsPayment), 'The exact 2 August Shopee SPM deduction must be recognized as the historical ads payment.');
wallet_ads_expect(false, jg_accounting_is_wallet_platform_cash_out($historicalAdsPayment), 'The historical ads payment must never add money to BCA.');
$historicalRelease = [
    'platform' => 'shopee',
    'account_key' => 'jenang-gemi-shopee',
    'amount' => 2775000,
    'occurred_at' => '2026-08-02 05:00:00',
    'release_note' => 'SPM_DEDUCT',
];
wallet_ads_expect(true, jg_accounting_is_august_2026_wallet_ads_payment($historicalRelease), 'The same correction must recognize a matching wallet-release source without treating it as bank cash.');

$futurePayout = [...$historicalAdsPayment, 'transaction_at' => '2026-08-03 05:00:00'];
wallet_ads_expect(false, jg_accounting_is_august_2026_wallet_ads_payment($futurePayout), 'The correction must not alter future wallet events.');
wallet_ads_expect(true, jg_accounting_is_wallet_platform_cash_out($futurePayout), 'A later event with explicit bank-withdrawal evidence must keep the normal payout behavior.');

$source = file_get_contents(dirname(__DIR__) . '/accounting-bootstrap.php');
wallet_ads_expect(true, is_string($source) && str_contains($source, 'correction-shopee-wallet-ads-20260802-2775000'), 'The correction transaction must have a stable idempotency key.');
wallet_ads_expect(true, str_contains($source, '"shopee-jg-wallet"') && str_contains($source, '"shopee-ads"'), 'The correction must use the Jenang Gemi Shopee wallet and Shopee Ads category.');
wallet_ads_expect(true, str_contains($source, 'bank_cash_impact') && str_contains($source, "'expense_amount' => 2775000"), 'The audit record must explicitly state zero bank impact and the exact ads expense.');

echo "accounting-wallet-ads-correction-test: ok\n";
