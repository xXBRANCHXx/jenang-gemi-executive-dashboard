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
expect_same(300, $enriched['cogs'], 'Read-only enrichment must use static SKU average COGS.');
expect_same(false, $enriched['cogs_estimated'], 'Static average COGS rows must not depend on allocation estimates.');
expect_same('sku_static_average', $enriched['cogs_source'], 'Read-only enrichment must mark static SKU average COGS.');
expect_same('SKU product', $enriched['product_name'], 'SKU product names must override marketplace names.');

$datedSku = array_merge($sku, [
    'cogs_history' => [
        [
            'id' => 1,
            'old_price' => null,
            'new_price' => 100,
            'change_mode' => 'opening',
            'effective_at' => '2026-01-01 00:00:00',
            'recorded_at' => '2026-01-01 00:00:00',
        ],
        [
            'id' => 2,
            'old_price' => 100,
            'new_price' => 120,
            'change_mode' => 'quarterly',
            'effective_at' => '2026-04-01 00:00:00',
            'recorded_at' => '2026-02-15 00:00:00',
        ],
    ],
]);
$q1Order = jg_orders_enriched_row(array_merge($remoteRow, ['timestamp' => '2026-03-31T10:00:00Z']), $datedSku, 3.0, []);
$q2Order = jg_orders_enriched_row(array_merge($remoteRow, ['timestamp' => '2026-04-01T10:00:00Z']), $datedSku, 3.0, []);
expect_same(300, $q1Order['cogs'], 'Orders before quarter cutover must retain the previous COGS.');
expect_same(360, $q2Order['cogs'], 'Orders after quarter cutover must use the scheduled COGS.');
expect_same('sku_quarter_history', $q2Order['cogs_source'], 'Effective-dated order COGS must identify quarter history as its source.');

$fallback = jg_orders_enrich_without_inventory([$remoteRow]);
expect_same(1, count($fallback), 'Inventory fallback must retain order rows.');
expect_same('Marketplace product', $fallback[0]['product_name'], 'Inventory fallback must retain marketplace product names.');
expect_same(900, $fallback[0]['revenue'], 'Inventory fallback must retain revenue.');

$lightweight = jg_orders_lightweight_rows([array_merge($remoteRow, [
    'order_net_revenue' => 900,
    'cogs' => 120,
])]);
expect_same(120, $lightweight[0]['cogs'], 'Lightweight order summaries must retain COGS.');
expect_same(780, $lightweight[0]['gross_profit'], 'Lightweight order summaries must calculate gross profit after COGS.');

$webhookRows = jg_orders_webhook_rows([
    'event' => 'order_updated',
    'platform' => 'shopee',
    'orders' => [[
        'id' => 'ORDER-2',
        'sourceAccountKey' => 'main',
        'createdAt' => '2026-06-29T01:02:03Z',
        'financials' => [
            'netRevenue' => 1200,
            'grossRevenue' => 1500,
        ],
        'funds_released' => true,
        'funds_released_at' => '2026-06-30T01:02:03Z',
        'funds_released_amount' => 1200,
        'funds_release_status' => 'SETTLED',
        'funds_release_source' => 'finance_statement.status=SETTLED',
        'customer' => [
            'name' => 'Buyer One',
            'phone' => '+620000',
        ],
        'items' => [[
            'id' => 'ITEM-1',
            'seller_sku' => 'JG0101',
            'name' => 'Webhook product',
            'quantity' => 2,
        ]],
    ]],
]);
expect_same(1, count($webhookRows), 'Webhook order payloads must flatten item rows.');
expect_same('shopee', $webhookRows[0]['platform'], 'Webhook rows must inherit payload platform.');
expect_same('ORDER-2', $webhookRows[0]['order_id'], 'Webhook rows must map marketplace order IDs.');
expect_same('ITEM-1', $webhookRows[0]['item_key'], 'Webhook rows must map item keys.');
expect_same(2, $webhookRows[0]['quantity'], 'Webhook rows must preserve item quantity.');
expect_same(1200.0, $webhookRows[0]['order_net_revenue'], 'Webhook rows must preserve order-level net revenue.');
expect_same(1, $webhookRows[0]['funds_released'], 'Webhook rows must preserve released wallet flags.');
expect_same(1200.0, $webhookRows[0]['funds_released_amount'], 'Webhook rows must preserve released wallet amounts.');
expect_same('Buyer One', $webhookRows[0]['username'], 'Webhook rows must map customer names.');

$releasedWithoutTimeRows = jg_orders_webhook_rows([
    'event' => 'marketplace_orders_upserted',
    'rows' => [[
        'platform' => 'shopee',
        'account_key' => 'main',
        'order_id' => 'ORDER-RELEASED-NO-TIME',
        'order_create_time' => '2026-07-03T03:00:00Z',
        'source_updated_at' => '2026-07-03T04:53:00Z',
        'status' => 'COMPLETED',
        'sku' => 'JG0101',
        'quantity' => 1,
        'revenue' => 75710,
        'order_net_revenue' => 75710,
        'funds_released' => true,
        'funds_released_amount' => 75710,
        'funds_release_status' => 'COMPLETED',
        'funds_release_source' => 'order_status=COMPLETED',
    ]],
]);
expect_same('2026-07-03 04:53:00.000000', $releasedWithoutTimeRows[0]['funds_released_at'], 'Released rows without a release timestamp must fall back to source update time for wallet anchors.');

$unreleasedShopeeRows = jg_orders_webhook_rows([
    'event' => 'marketplace_orders_upserted',
    'rows' => [[
        'platform' => 'shopee',
        'account_key' => 'main',
        'order_id' => 'ORDER-READY',
        'order_create_time' => '2026-07-03T04:03:40Z',
        'status' => 'READY_TO_SHIP',
        'sku' => 'JG0101',
        'quantity' => 1,
        'revenue' => 95000,
        'order_net_revenue' => 95000,
        'funds_released' => true,
        'funds_released_at' => '2026-07-03T04:03:40Z',
        'funds_released_amount' => 95000,
        'funds_release_status' => 'READY_TO_SHIP',
        'funds_release_source' => 'settlement_payload',
    ]],
]);
expect_same(1, count($unreleasedShopeeRows), 'Unreleased Shopee payload must normalize.');
expect_same(0, $unreleasedShopeeRows[0]['funds_released'], 'Shopee escrow revenue must not count as released while READY_TO_SHIP.');
expect_same(0, (int) $unreleasedShopeeRows[0]['funds_released_amount'], 'Untrusted Shopee release amounts must be cleared.');

$repairRows = jg_orders_webhook_rows([
    'event' => 'mirror_read_repair',
    'rows' => [[
        'platform' => 'tiktok',
        'account_key' => 'main',
        'order_id' => 'ORDER-3',
        'order_create_time' => '2026-06-29T02:03:04Z',
        'status' => 'COMPLETED',
        'sku' => 'JG0201',
        'item_key' => 'ROW-1',
        'product_name' => 'API product',
        'quantity' => 1,
        'revenue' => 4500,
        'order_net_revenue' => 4500,
        'gross_revenue' => 5000,
        'funds_released' => true,
        'funds_released_amount' => 4500,
        'username' => 'API Buyer',
    ]],
]);
expect_same(1, count($repairRows), 'Mirror read repair rows must normalize API Ingest order rows.');
expect_same('tiktok', $repairRows[0]['platform'], 'Mirror read repair must preserve platform.');
expect_same('ORDER-3', $repairRows[0]['order_id'], 'Mirror read repair must preserve order ids.');
expect_same(4500.0, $repairRows[0]['order_net_revenue'], 'Mirror read repair must preserve order revenue.');
expect_same(1, $repairRows[0]['funds_released'], 'Mirror read repair must preserve released wallet flags.');
expect_same('Jawa Barat', jg_orders_location_province_from_text('Kota Bandung, Jawa Barat'), 'Server-side location geocoder must map city and province aliases.');
expect_same('DKI Jakarta', jg_orders_location_province_from_text('Jakarta Selatan'), 'Server-side location geocoder must map locality aliases from admin.js.');

$dailyDays = [
    '2026-07-01' => [
        'date' => '2026-07-01',
        'qty' => 0,
        'revenue' => 0,
        'orders' => 0,
        'accounts' => [],
    ],
];
$dailyAccounts = [];
jg_orders_daily_add_summary_row($dailyDays, $dailyAccounts, '2026-07-01', 'zero_website', 'zero_website', 2, 150000.0, 1);
expect_same(2, $dailyDays['2026-07-01']['qty'], 'Daily summary must add quantity into the selected day.');
expect_same(150000.0, $dailyDays['2026-07-01']['revenue'], 'Daily summary must add revenue into the selected day.');
expect_same(1, $dailyDays['2026-07-01']['orders'], 'Daily summary must add order count into the selected day.');
expect_same(true, isset($dailyAccounts['zero-website:zero-website']), 'Daily summary must create stable platform/account keys.');
expect_same('ZERO Website', $dailyAccounts['zero-website:zero-website']['label'], 'Daily summary must preserve website platform labels.');

$ordersUrl = jg_orders_remote_url('/sales/orders', [
    'start_date' => '2026-06-01',
    'end_date' => '2026-06-03',
    'skip_sync' => '1',
    'sync' => '0',
    'limit' => '240',
    'offset' => '480',
]);
parse_str((string) parse_url($ordersUrl, PHP_URL_QUERY), $ordersQuery);
expect_same('240', $ordersQuery['limit'] ?? '', 'Orders proxy must forward row limit.');
expect_same('480', $ordersQuery['offset'] ?? '', 'Orders proxy must forward row offset.');
expect_same('1', $ordersQuery['skip_sync'] ?? '', 'Orders proxy must skip on-demand sync for paged reads.');
expect_same('0', $ordersQuery['sync'] ?? '', 'Orders mirror repair must request read-only API rows.');

echo "orders-api-test: ok\n";
