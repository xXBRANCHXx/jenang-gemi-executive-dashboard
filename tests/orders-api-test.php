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
$grossEnriched = jg_orders_enriched_row(array_merge($remoteRow, [
    'gross_revenue' => 840,
    'order_net_revenue' => 760,
]), $sku, 3.0, $allocations);
expect_same(840, $grossEnriched['gross_revenue'], 'Inventory enrichment must preserve item-level gross revenue context.');
expect_same(760, $grossEnriched['order_net_revenue'], 'Inventory enrichment must preserve order-level net revenue context.');

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

$metricRows = jg_orders_enrich_for_metrics([
    array_merge($remoteRow, [
        'timestamp' => '2026-04-01T10:00:00Z',
        'order_net_revenue' => 900,
    ]),
], [jg_orders_sku_key('JG0101') => $datedSku]);
$lightweightMetrics = jg_orders_lightweight_rows($metricRows);
expect_same(360, $lightweightMetrics[0]['cogs'], 'Lightweight C4 metrics must apply effective-date SKU COGS.');
expect_same(540, $lightweightMetrics[0]['gross_profit'], 'Lightweight C4 gross profit must subtract enriched COGS.');
expect_same(3, $lightweightMetrics[0]['cogs_covered_items'], 'Lightweight C4 metrics must report mapped COGS coverage.');
expect_same(0, $lightweightMetrics[0]['cogs_missing_items'], 'Mapped C4 metrics must not report missing COGS.');

$multiLineMetrics = jg_orders_lightweight_rows(jg_orders_enrich_for_metrics([
    array_merge($remoteRow, [
        'item_key' => 'LINE-1',
        'quantity' => 1,
        'revenue' => 400,
        'order_net_revenue' => 900,
    ]),
    array_merge($remoteRow, [
        'item_key' => 'LINE-2',
        'quantity' => 2,
        'revenue' => 500,
        'order_net_revenue' => 900,
    ]),
], [jg_orders_sku_key('JG0101') => $sku]));
expect_same(900, $multiLineMetrics[0]['revenue'], 'Lightweight C4 metrics must retain order-level net revenue across item rows.');
expect_same(300, $multiLineMetrics[0]['cogs'], 'Lightweight C4 metrics must sum item-level COGS once.');
expect_same(600, $multiLineMetrics[0]['gross_profit'], 'Lightweight C4 metrics must reconcile order revenue minus all item COGS.');

$zeroProfitMetrics = jg_orders_lightweight_rows(jg_orders_enrich_for_metrics([
    array_merge($remoteRow, [
        'quantity' => 1,
        'revenue' => 100,
        'order_net_revenue' => 100,
    ]),
], [jg_orders_sku_key('JG0101') => $sku]));
expect_same(0, $zeroProfitMetrics[0]['gross_profit'], 'A legitimate zero gross profit must remain zero.');

$missingCogsMetrics = jg_orders_lightweight_rows(jg_orders_enrich_for_metrics([
    array_merge($remoteRow, [
        'sku' => 'UNKNOWN-SKU',
        'item_key' => 'UNKNOWN-ITEM',
        'quantity' => 2,
        'revenue' => 500,
        'order_net_revenue' => 500,
        'cogs' => 0,
    ]),
], []));
expect_same(null, $missingCogsMetrics[0]['gross_profit'], 'Missing COGS must not masquerade as revenue-equivalent gross profit.');
expect_same(2, $missingCogsMetrics[0]['cogs_missing_items'], 'Missing SKU mappings must be exposed in COGS coverage.');

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

$freeGiftRows = jg_orders_webhook_rows([
    'event' => 'marketplace_orders_upserted',
    'rows' => [[
        'platform' => 'shopee',
        'account_key' => 'main',
        'order_id' => 'ORDER-FREE-GIFT',
        'item_key' => 'GIFT-ITEM-1',
        'sku' => 'JG0101',
        'product_name' => 'Free Gift Classic Jenang',
        'quantity' => 0,
        'cogs_quantity' => 1,
        'is_free_gift' => true,
        'revenue' => 0,
        'order_net_revenue' => 1200,
        'funds_released' => true,
        'funds_released_amount' => 1200,
        'funds_release_status' => 'SETTLED',
        'funds_release_source' => 'finance_statement.status=SETTLED',
    ]],
]);
expect_same(0, $freeGiftRows[0]['quantity'], 'Free gifts must contribute zero sales quantity.');
expect_same(1, $freeGiftRows[0]['cogs_quantity'], 'Free gifts must retain physical quantity for stock and COGS.');
expect_same(1, $freeGiftRows[0]['is_free_gift'], 'Free-gift classification must survive mirror normalization.');
expect_same(0.0, $freeGiftRows[0]['revenue'], 'Free gifts must contribute zero order-based item revenue.');
expect_same(1200.0, $freeGiftRows[0]['order_net_revenue'], 'Free gifts must not alter confirmed order revenue used by wallet/accounting context.');
expect_same(1200.0, $freeGiftRows[0]['funds_released_amount'], 'Free gifts must not alter released wallet funds.');
expect_same(1, jg_orders_stock_quantity($freeGiftRows[0]), 'Inventory must consume the free gift physical quantity.');

$enrichedGift = jg_orders_enriched_row($freeGiftRows[0], $sku, 1.0, []);
expect_same(0, $enrichedGift['quantity'], 'Inventory enrichment must retain zero sales quantity for gifts.');
expect_same(1, $enrichedGift['cogs_quantity'], 'Inventory enrichment must retain gift stock quantity.');
expect_same(100, $enrichedGift['cogs'], 'Free gifts must still incur SKU COGS.');
expect_same(-100, $enrichedGift['gross_profit'], 'Order-based item profit must include free-gift COGS with no gift revenue.');

$legacyGift = jg_orders_mirror_response_row([
    'order_id' => 'ORDER-HISTORICAL-GIFT',
    'platform' => 'shopee',
    'account_key' => 'main',
    'sku' => 'JG0101',
    'product_name' => 'Free Gift Classic Jenang',
    'quantity' => 1,
    'cogs_quantity' => 0,
    'is_free_gift' => 0,
    'revenue' => 500,
    'gross_revenue' => 600,
    'marketplace_fees' => 100,
    'order_net_revenue' => 1200,
    'funds_released' => 1,
    'funds_released_amount' => 1200,
]);
expect_same(false, $legacyGift['is_free_gift'], 'A gift-like stored name must not replace marketplace evidence.');
expect_same(1, $legacyGift['quantity'], 'Name-only rows must remain sales unless the marketplace marks them complimentary.');
expect_same(1, $legacyGift['cogs_quantity'], 'Name-only rows must retain their physical quantity.');
expect_same(500, $legacyGift['revenue'], 'Name-only rows must retain their item revenue.');
expect_same(600, $legacyGift['gross_revenue'], 'Mirror reads must expose customer-paid gross revenue per item row.');
expect_same(1200, $legacyGift['order_net_revenue'], 'Name interpretation must not alter confirmed order revenue.');
expect_same(1200, $legacyGift['funds_released_amount'], 'Name interpretation must not alter released wallet funds.');
expect_same(false, str_contains(jg_orders_free_gift_sql('dashboard_order_mirror'), 'product_name'), 'Daily summaries must not classify gifts by product name.');

$promotionGift = jg_orders_interpret_sales_row([
    'promotion_type' => 'add_on_free_gift_sub',
    'product_name' => 'Sticker',
    'quantity' => 1,
    'revenue' => 500,
]);
expect_same(true, $promotionGift['is_free_gift'], 'Shopee free-gift sub-lines must be identified from marketplace promotion evidence.');
expect_same(0, $promotionGift['quantity'], 'Marketplace-marked gift lines must contribute zero sales quantity.');
expect_same(1, $promotionGift['cogs_quantity'], 'Marketplace-marked gift lines must retain their physical COGS quantity.');
expect_same(0, $promotionGift['revenue'], 'Marketplace-marked gift lines must contribute zero item revenue.');

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

$breakdownLookup = [
    jg_orders_sku_key('SYRUP-50-ORIGINAL') => [
        'sku' => 'SYRUP-50-ORIGINAL',
        'base_product_name' => 'Syrup',
        'flavor_name' => 'Original',
        'volume' => 50.0,
        'unit_name' => 'ml',
    ],
    jg_orders_sku_key('SYRUP-250-ORIGINAL') => [
        'sku' => 'SYRUP-250-ORIGINAL',
        'base_product_name' => 'Syrup',
        'flavor_name' => 'Original',
        'volume' => 250.0,
        'unit_name' => 'ml',
    ],
    jg_orders_sku_key('DROPS-10-LEMON') => [
        'sku' => 'DROPS-10-LEMON',
        'base_product_name' => 'Drops',
        'flavor_name' => 'Lemon',
        'volume' => 10.0,
        'unit_name' => 'ml',
    ],
];
$breakdown = jg_orders_aggregate_product_flavor_rows([
    [
        'sku' => 'SYRUP-50-ORIGINAL',
        'order_create_time' => '2026-07-01T18:30:00Z',
        'quantity' => 2,
        'revenue' => 40000,
    ],
    [
        'sku' => 'SYRUP-250-ORIGINAL',
        'order_create_time' => '2026-07-08T01:00:00Z',
        'quantity' => 3,
        'revenue' => 150000,
    ],
    [
        'sku' => 'DROPS-10-LEMON',
        'order_create_time' => '2026-07-08T01:00:00Z',
        'quantity' => 9,
        'revenue' => 90000,
    ],
], $breakdownLookup, 'syrup', 'week', '2026-07-01', '2026-07-31');
expect_same(5, $breakdown['totals']['quantity'], 'Flavor breakdown must include only the requested product.');
expect_same(190000, $breakdown['totals']['revenue'], 'Flavor breakdown must total seller-received revenue.');
expect_same(2, count($breakdown['periods']), 'Flavor breakdown must group sales into local calendar weeks.');
expect_same('2026-07-06', $breakdown['periods'][0]['key'], 'Flavor breakdown periods must be newest first.');
expect_same(2, count($breakdown['volumes']), 'Flavor breakdown must expose every catalog volume for the product.');
expect_same('Original', $breakdown['flavors'][0]['label'], 'Flavor breakdown must expose the SKU flavor catalog.');

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
