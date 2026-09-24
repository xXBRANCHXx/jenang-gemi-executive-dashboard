<?php
declare(strict_types=1);

define('JG_ORDERS_API_NO_DISPATCH', true);
require dirname(__DIR__) . '/api/orders/index.php';

function analytics_period_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        throw new RuntimeException($message . ': ' . var_export($actual, true));
    }
}

analytics_period_expect(
    ['2026-09-23 17:00:00.000000', '2026-09-24 17:00:00.000000'],
    jg_orders_range_bounds('2026-09-24', '2026-09-24'),
    'Today must use Jakarta midnight and exclude the next day'
);
analytics_period_expect(
    ['2026-08-31 17:00:00.000000', '2026-09-24 17:00:00.000000'],
    jg_orders_range_bounds('2026-09-01', '2026-09-24'),
    'This month must include the first local day through the selected local day'
);

$lookup = [
    jg_orders_sku_key('DROPS-VAN') => ['sku' => 'DROPS-VAN', 'base_product_name' => 'Drops 4x', 'flavor_name' => 'Vanilla', 'volume' => 10, 'unit_name' => 'ml'],
    jg_orders_sku_key('SYRUP-MINT') => ['sku' => 'SYRUP-MINT', 'base_product_name' => 'Syrup', 'flavor_name' => 'Mint', 'volume' => 250, 'unit_name' => 'ml'],
];
$rows = [
    ['sku' => 'DROPS-VAN', 'order_create_time' => '2026-09-23T17:00:00Z', 'platform' => 'shopee', 'quantity' => 3, 'revenue' => 180000],
    ['sku' => 'SYRUP-MINT', 'order_create_time' => '2026-09-24T16:59:59Z', 'platform' => 'shopee', 'quantity' => 9, 'revenue' => 450000],
];
$selection = ['dimension' => 'product', 'flavor' => '', 'volume' => ''];
$first = jg_orders_aggregate_product_analytics_rows($rows, $lookup, 'drops-4x', 'day', '2026-09-24', '2026-09-24', $selection);
$second = jg_orders_aggregate_product_analytics_rows($rows, $lookup, 'syrup', 'day', '2026-09-24', '2026-09-24', $selection);
analytics_period_expect(3, $first['totals']['quantity'], 'First product totals must exclude the second product');
analytics_period_expect(9, $second['totals']['quantity'], 'Second product totals must exclude the first product');
analytics_period_expect('2026-09-24', $first['history'][0]['key'], 'UTC evening sales belong to the next Jakarta day');
analytics_period_expect(1, count($first['history']), 'Today has exactly one period');
analytics_period_expect([], $first['forecast'], 'Today must not show a month-end forecast');
analytics_period_expect(array_column($first['history'], 'key'), array_column($second['history'], 'key'), 'Comparison periods must align');

$month = jg_orders_aggregate_product_analytics_rows($rows, $lookup, 'drops-4x', 'day', '2026-09-01', '2026-09-24', $selection);
analytics_period_expect(24, count($month['history']), 'Month-to-date includes every local day');
analytics_period_expect(0, $month['history'][0]['quantity'], 'Days without sales must be zero-filled');
analytics_period_expect(3, $month['history'][23]['quantity'], 'Month-to-date includes today');
analytics_period_expect([], $month['forecast'], 'Daily history must contain only recorded sales');
$empty = jg_orders_aggregate_product_analytics_rows([], $lookup, 'syrup', 'day', '2026-09-24', '2026-09-24', $selection);
analytics_period_expect(0, $empty['totals']['quantity'], 'No sales is a valid zero total');
analytics_period_expect(1, count($empty['history']), 'Empty products must still align with the comparison period');

echo "product-analytics-periods-test: ok\n";
