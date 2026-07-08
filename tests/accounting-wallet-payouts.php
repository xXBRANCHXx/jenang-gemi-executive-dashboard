<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/accounting-bootstrap.php';

function assert_accounting_wallet_test(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, $message . PHP_EOL);
        exit(1);
    }
}

assert_accounting_wallet_test(
    jg_accounting_is_wallet_payout_row([
        'amount' => -125000,
        'transaction_type' => 'Withdrawal',
        'money_flow' => 'OUT',
        'order_id' => '',
    ]),
    'Shopee withdrawal rows should import as wallet payouts.'
);

assert_accounting_wallet_test(
    jg_accounting_is_wallet_payout_row([
        'amount' => -250000,
        'money_flow' => 'OUT',
        'order_id' => '',
        'raw' => [
            'transaction_description' => 'Bank transfer to settlement account',
        ],
    ]),
    'Bank transfer rows should import as wallet payouts.'
);

assert_accounting_wallet_test(
    !jg_accounting_is_wallet_payout_row([
        'amount' => -30000,
        'transaction_type' => 'Refund',
        'money_flow' => 'OUT',
        'order_id' => '250707ABC',
    ]),
    'Order refunds should not import as cash payouts.'
);

assert_accounting_wallet_test(
    !jg_accounting_is_wallet_payout_row([
        'amount' => -12000,
        'transaction_type' => 'Shipping fee adjustment',
        'money_flow' => 'OUT',
        'order_id' => '',
    ]),
    'Fees and adjustments should not import as cash payouts.'
);

assert_accounting_wallet_test(
    !jg_accounting_is_wallet_payout_row([
        'amount' => 45000,
        'transaction_type' => 'Escrow release',
        'money_flow' => 'IN',
    ]),
    'Positive wallet credits should remain marketplace outstanding, not cash payouts.'
);

$timestamp = strtotime('2026-07-07 18:00:00 UTC');
assert_accounting_wallet_test(
    $timestamp !== false && jg_accounting_wallet_row_date(['create_time' => $timestamp]) === '2026-07-08',
    'Wallet transaction dates should be converted to Asia/Jakarta business dates.'
);

$payload = [
    'wallet_transactions' => [
        'accounts' => [[
            'transactions' => [
                ['create_time' => 10, 'current_balance' => 100000],
                ['create_time' => 20, 'current_balance' => 75000],
            ],
        ]],
    ],
];

assert_accounting_wallet_test(
    count(jg_accounting_wallet_payload_transactions($payload)) === 2,
    'Wallet payload transaction extraction should preserve transaction rows.'
);

assert_accounting_wallet_test(
    jg_accounting_wallet_payload_latest_balance($payload) === 75000,
    'Wallet payload context should use the latest current balance.'
);

echo 'Accounting wallet payout tests passed.' . PHP_EOL;
