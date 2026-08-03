<?php
declare(strict_types=1);

$contextCachePath = sys_get_temp_dir() . '/jg-executive-context-test-' . bin2hex(random_bytes(6)) . '.json';
$skuLookupCachePath = sys_get_temp_dir() . '/jg-sales-sku-lookup-test-' . bin2hex(random_bytes(6)) . '.json';
putenv('JG_EXECUTIVE_CONTEXT_CACHE_PATH=' . $contextCachePath);
putenv('JG_SALES_SKU_LOOKUP_CACHE_PATH=' . $skuLookupCachePath);

require dirname(__DIR__) . '/sales-summary-stability.php';
require dirname(__DIR__) . '/executive-context.php';

function sales_stability_expect(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

sales_stability_expect(
    JG_SALES_SUMMARY_CACHE_FRESH_SECONDS === 60,
    'The normal sales summary cache must expire after one minute.'
);
$salesApiSource = file_get_contents(dirname(__DIR__) . '/api/sales/index.php');
sales_stability_expect(
    is_string($salesApiSource)
        && str_contains($salesApiSource, 'jg_sales_cache_read($cacheKey, JG_SALES_SUMMARY_CACHE_FRESH_SECONDS)'),
    'Normal sales summary requests must enforce the bounded cache lifetime.'
);

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

$previousProfit = [
    'months' => [['month' => 7, 'revenue' => 1000, 'cogs' => 300, 'gross_profit' => 700, 'orders' => 10]],
];
$missingCogs = [
    'months' => [['month' => 7, 'revenue' => 1100, 'cogs' => 0, 'gross_profit' => 0, 'orders' => 11]],
];
sales_stability_expect(
    jg_sales_summary_regressed_months($missingCogs, $previousProfit) === [7],
    'A refreshed populated month must not erase its previously calculated COGS.'
);

$inconsistentProfit = jg_sales_summary_enforce_profit_formula([
    'months' => [
        ['month' => 6, 'revenue' => 1000, 'cogs' => 400, 'gross_profit' => 0],
        ['month' => 7, 'net_revenue' => 800, 'cogs' => 250, 'gross_profit' => 999],
    ],
    'totals' => ['revenue' => 9999, 'cogs' => 1, 'gross_profit' => 9998],
]);
sales_stability_expect(
    (float) $inconsistentProfit['months'][0]['gross_profit'] === 600.0
        && (float) $inconsistentProfit['months'][1]['gross_profit'] === 550.0
        && (float) $inconsistentProfit['totals']['revenue'] === 1800.0
        && (float) $inconsistentProfit['totals']['cogs'] === 650.0
        && (float) $inconsistentProfit['totals']['gross_profit'] === 1150.0,
    'Gross profit must always equal final net revenue minus final COGS.'
);

$monthlyContextSummary = jg_executive_context_apply_summary([
    'year' => 2026,
    'months' => [['month' => 1, 'revenue' => 1000, 'cogs' => 400, 'gross_profit' => 600]],
    'totals' => [],
], [
    1 => ['source' => 'monthly_context', 'revenue' => 800, 'gross_profit' => 500],
]);
sales_stability_expect(
    (int) $monthlyContextSummary['months'][0]['cogs'] === 300
        && (int) $monthlyContextSummary['months'][0]['gross_profit'] === 500
        && (int) $monthlyContextSummary['totals']['cogs'] === 300,
    'Monthly context must derive COGS from its source revenue and gross profit.'
);

$dailyContextSummary = jg_executive_context_apply_summary([
    'year' => 2026,
    'months' => array_replace(array_fill(0, 12, []), [
        4 => ['month' => 5, 'revenue' => 1000, 'cogs' => 400, 'gross_profit' => 600],
    ]),
    'totals' => [],
], [
    5 => ['source' => 'daily_context', 'revenue' => 600, 'gross_profit' => 420],
]);
$mayOverlap = jg_executive_context_live_overlap(2026, 5);
$expectedMayRevenue = max(0, 1000 - (int) ($mayOverlap['revenue'] ?? 0)) + 600;
$expectedMayCogs = max(
    0,
    400 - max(0, (int) ($mayOverlap['revenue'] ?? 0) - (int) ($mayOverlap['gross_profit'] ?? 0))
) + 180;
sales_stability_expect(
    (int) $dailyContextSummary['months'][4]['revenue'] === $expectedMayRevenue
        && (int) $dailyContextSummary['months'][4]['cogs'] === $expectedMayCogs
        && (int) $dailyContextSummary['months'][4]['gross_profit'] === $expectedMayRevenue - $expectedMayCogs,
    'Additive daily context must replace overlap revenue and overlap COGS together.'
);

$skuLookup = ['SELLER-SKU' => ['sku' => '01-01-01', 'cogs' => 1234.5]];
jg_sales_sku_lookup_cache_write($skuLookup);
sales_stability_expect(
    jg_sales_sku_lookup_cache_read() === $skuLookup,
    'The last-known-good SKU COGS lookup must survive a transient SKU database failure.'
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
@unlink($skuLookupCachePath);
putenv('JG_EXECUTIVE_CONTEXT_CACHE_PATH');
putenv('JG_SALES_SKU_LOOKUP_CACHE_PATH');

echo "Sales summary stability tests passed.\n";
