<?php
declare(strict_types=1);

$contextCachePath = sys_get_temp_dir() . '/jg-executive-context-test-' . bin2hex(random_bytes(6)) . '.json';
putenv('JG_EXECUTIVE_CONTEXT_CACHE_PATH=' . $contextCachePath);

require dirname(__DIR__) . '/sales-summary-stability.php';
require dirname(__DIR__) . '/executive-context.php';

function sales_stability_expect(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$previous = [
    'months' => [
        ['month' => 6, 'revenue' => 112000000, 'orders' => 1300, 'item_count' => 2500],
        ['month' => 7, 'revenue' => 477000000, 'orders' => 5400, 'item_count' => 9600],
    ],
];
$emptyJuly = [
    'months' => [
        ['month' => 6, 'revenue' => 113000000, 'orders' => 1310, 'item_count' => 2520],
        ['month' => 7, 'revenue' => 0, 'orders' => 0, 'item_count' => 0],
    ],
];
sales_stability_expect(
    jg_sales_summary_regressed_months($emptyJuly, $previous) === [7],
    'A transient empty July must not replace a populated cached month.'
);

$legitimateUpdate = $emptyJuly;
$legitimateUpdate['months'][1] = ['month' => 7, 'revenue' => 476500000, 'orders' => 5398, 'item_count' => 9597];
sales_stability_expect(
    jg_sales_summary_regressed_months($legitimateUpdate, $previous) === [],
    'A non-empty correction must remain eligible to replace the cache.'
);

$missingJune = ['months' => [['month' => 7, 'revenue' => 478000000, 'orders' => 5410, 'item_count' => 9620]]];
sales_stability_expect(
    jg_sales_summary_regressed_months($missingJune, $previous) === [6],
    'An omitted historical month must be treated as a regressive snapshot.'
);

$contextRows = [
    ['period_key' => '2025-01', 'revenue' => 100, 'gross_profit' => 40, 'orders_qty' => 2, 'items_qty' => 3],
    ['period_key' => '2026-05-01', 'revenue' => 200, 'gross_profit' => 80, 'orders_qty' => 4, 'items_qty' => 6],
];
jg_executive_context_cache_write($contextRows);
sales_stability_expect(
    jg_executive_context_cache_read() === $contextRows,
    'Historical context must be recoverable from its last-known-good cache.'
);

@unlink($contextCachePath);
putenv('JG_EXECUTIVE_CONTEXT_CACHE_PATH');

echo "Sales summary stability tests passed.\n";
