<?php
declare(strict_types=1);

define('JG_ORDERS_API_NO_DISPATCH', true);
require dirname(__DIR__) . '/api/orders/index.php';

function expect_same(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) {
        return;
    }

    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
    fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$remoteRow = [
    'platform' => 'shopee',
    'account_key' => 'main',
    'order_id' => 'ORDER-1',
    'item_key' => '',
    'sku' => 'JG0101',
    'quantity' => 3,
    'revenue' => 900,
    'product_name' => 'Marketplace product',
];
$sku = [
    'sku' => 'JG0101',
    'product_name' => 'SKU product',
    'volume' => 1.0,
    'astra' => 1.0,
    'cogs' => 100.0,
];
$allocations = [[
    'po_number' => 'PO-1',
    'qty_astra_consumed' => 2.0,
    'cogs_per_astra' => 10.0,
    'total_cogs' => 20.0,
]];

expect_same('shopee|main|ORDER-1|JG0101', jg_orders_order_item_key($remoteRow), 'Order item keys must fall back to SKU.');

$enriched = jg_orders_enriched_row($remoteRow, $sku, 3.0, $allocations);
expect_same(120, $enriched['cogs'], 'Read-only enrichment must combine allocated and estimated COGS.');
expect_same(true, $enriched['cogs_estimated'], 'Partially allocated rows must be marked as estimated.');
expect_same('SKU product', $enriched['product_name'], 'SKU product names must override marketplace names.');

$fallback = jg_orders_enrich_without_inventory([$remoteRow]);
expect_same(1, count($fallback), 'Inventory fallback must retain order rows.');
expect_same('Marketplace product', $fallback[0]['product_name'], 'Inventory fallback must retain marketplace product names.');
expect_same(900, $fallback[0]['revenue'], 'Inventory fallback must retain revenue.');

echo "orders-api-test: ok\n";
