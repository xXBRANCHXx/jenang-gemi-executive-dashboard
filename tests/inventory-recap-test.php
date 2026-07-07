<?php
declare(strict_types=1);

require dirname(__DIR__) . '/inventory-recap-bootstrap.php';

function inventory_recap_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        fwrite(STDERR, $message . "\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true) . "\n");
        exit(1);
    }
}

function inventory_recap_expect_true(bool $actual, string $message): void
{
    if (!$actual) {
        fwrite(STDERR, $message . "\n");
        exit(1);
    }
}

$skuPdo = new PDO('sqlite::memory:');
$skuPdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$skuPdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$skuPdo->exec('CREATE TABLE sku_brands (id TEXT PRIMARY KEY, name TEXT)');
$skuPdo->exec('CREATE TABLE sku_units (id TEXT PRIMARY KEY, name TEXT)');
$skuPdo->exec('CREATE TABLE sku_products (id TEXT PRIMARY KEY, name TEXT)');
$skuPdo->exec('CREATE TABLE sku_flavors (id TEXT PRIMARY KEY, name TEXT)');
$skuPdo->exec('CREATE TABLE sku_skus (
    sku TEXT PRIMARY KEY,
    tag TEXT,
    brand_id TEXT,
    unit_id TEXT,
    volume REAL,
    astra REAL,
    flavor_id TEXT,
    product_id TEXT,
    starting_stock REAL,
    current_stock REAL,
    stock_trigger REAL,
    inventory_mode TEXT,
    skip_scan INTEGER,
    cogs REAL,
    sale_price REAL
)');
$skuPdo->exec("INSERT INTO sku_brands VALUES ('brand-jg', 'Jenang Gemi')");
$skuPdo->exec("INSERT INTO sku_units VALUES ('unit-pcs', 'pcs')");
$skuPdo->exec("INSERT INTO sku_products VALUES ('prod-bubur', 'Bubur')");
$skuPdo->exec("INSERT INTO sku_flavors VALUES ('flavor-original', 'Original')");
$skuPdo->exec("INSERT INTO sku_skus VALUES
    ('JG-BUBUR-ORIG', 'BUBUR_ORIG', 'brand-jg', 'unit-pcs', 1, 1, 'flavor-original', 'prod-bubur', 5, 5, 10, 'auto', 0, 1000, 5000),
    ('JG-BUBUR-SAFE', 'BUBUR_SAFE', 'brand-jg', 'unit-pcs', 1, 1, 'flavor-original', 'prod-bubur', 100, 100, 10, 'auto', 0, 2000, 7000)");

$analyticsPdo = new PDO('sqlite::memory:');
$analyticsPdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$analyticsPdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$analyticsPdo->exec('CREATE TABLE dashboard_order_mirror (
    sku TEXT,
    item_key TEXT,
    product_name TEXT,
    marketplace_product_name TEXT,
    base_product_name TEXT,
    flavor_name TEXT,
    quantity REAL,
    order_create_time TEXT,
    timestamp_utc TEXT,
    platform TEXT,
    account_key TEXT,
    order_id TEXT,
    status TEXT,
    revenue REAL,
    net_revenue REAL,
    deleted_at TEXT NULL
)');
$insert = $analyticsPdo->prepare('INSERT INTO dashboard_order_mirror
    (sku, item_key, product_name, marketplace_product_name, base_product_name, flavor_name, quantity, order_create_time, timestamp_utc, platform, account_key, order_id, status, revenue, net_revenue, deleted_at)
    VALUES (:sku, :item_key, :product_name, :marketplace_product_name, :base_product_name, :flavor_name, :quantity, :order_create_time, :timestamp_utc, :platform, :account_key, :order_id, :status, :revenue, :net_revenue, NULL)');
for ($day = 0; $day < 30; $day++) {
    $insert->execute([
        ':sku' => 'JG-BUBUR-ORIG',
        ':item_key' => 'line-' . $day,
        ':product_name' => 'Bubur Original',
        ':marketplace_product_name' => 'Bubur Original',
        ':base_product_name' => 'Bubur',
        ':flavor_name' => 'Original',
        ':quantity' => 1,
        ':order_create_time' => '2026-07-' . str_pad((string) max(1, min(30, $day + 1)), 2, '0', STR_PAD_LEFT) . ' 01:00:00.000000',
        ':timestamp_utc' => '2026-07-' . str_pad((string) max(1, min(30, $day + 1)), 2, '0', STR_PAD_LEFT) . ' 01:00:00.000000',
        ':platform' => 'shopee',
        ':account_key' => 'test',
        ':order_id' => 'ORDER-' . $day,
        ':status' => 'COMPLETED',
        ':revenue' => 5000,
        ':net_revenue' => 5000,
    ]);
}

$payload = jg_inventory_recap_payload($skuPdo, $analyticsPdo, [
    'amount' => 50000,
    'source' => 'test_accounting',
    'label' => 'Accounting Cash Available',
], [
    'today' => '2026-07-30',
    'lookback_days' => 30,
    'order_days' => 30,
    'buffer_days' => 10,
]);

inventory_recap_expect(true, $payload['ok'], 'Inventory Recap payload must be successful.');
inventory_recap_expect(1, $payload['summary']['suggested_count'], 'Only the short SKU should be suggested.');
inventory_recap_expect(1, $payload['summary']['critical_count'], 'The short SKU should be critical.');
inventory_recap_expect(true, $payload['summary']['can_fund_recommended'], 'Cash Available should cover the draft.');
inventory_recap_expect(35000, $payload['summary']['total_recommended_cost'], 'Recommended cost should order 35 units at Rp1.000.');

$suggestion = $payload['suggestions'][0] ?? [];
inventory_recap_expect('JG-BUBUR-ORIG', $suggestion['sku'] ?? '', 'Suggestion must keep exact SKU.');
inventory_recap_expect(35, $suggestion['recommended_order_qty'] ?? 0, 'Recommended order should cover 40 days less 5 stock.');
inventory_recap_expect(25, $suggestion['minimum_order_qty'] ?? 0, 'Minimum order should cover the base month less 5 stock.');
inventory_recap_expect(10, $suggestion['buffer_order_qty'] ?? 0, 'Buffer order should expose the margin of play.');
inventory_recap_expect('critical', $suggestion['risk'] ?? '', 'Five days remaining should be critical.');

$skuPdo->exec("INSERT INTO sku_flavors VALUES ('flavor-chocolate', 'Chocolate')");
$skuPdo->exec("INSERT INTO sku_skus VALUES
    ('JGPC0150CHBU', 'BUBUR_CHOC_15', 'brand-jg', 'unit-pcs', 15, 15, 'flavor-chocolate', 'prod-bubur', 10, 10, 5, 'auto', 0, 1000, 5000),
    ('JGPC0300CHBU', 'BUBUR_CHOC_30', 'brand-jg', 'unit-pcs', 30, 15, 'flavor-chocolate', 'prod-bubur', 0, 0, 0, 'auto', 0, 0, 9000)");
for ($day = 0; $day < 30; $day++) {
    $insert->execute([
        ':sku' => 'JGPC0300CHBU',
        ':item_key' => 'bundle-line-' . $day,
        ':product_name' => 'Bubur Chocolate 30',
        ':marketplace_product_name' => 'Bubur Chocolate 30',
        ':base_product_name' => 'Bubur',
        ':flavor_name' => 'Chocolate',
        ':quantity' => 1,
        ':order_create_time' => '2026-07-' . str_pad((string) max(1, min(30, $day + 1)), 2, '0', STR_PAD_LEFT) . ' 02:00:00.000000',
        ':timestamp_utc' => '2026-07-' . str_pad((string) max(1, min(30, $day + 1)), 2, '0', STR_PAD_LEFT) . ' 02:00:00.000000',
        ':platform' => 'shopee',
        ':account_key' => 'test',
        ':order_id' => 'BUNDLE-' . $day,
        ':status' => 'COMPLETED',
        ':revenue' => 9000,
        ':net_revenue' => 9000,
    ]);
}

$rollupPayload = jg_inventory_recap_payload($skuPdo, $analyticsPdo, [
    'amount' => 150000,
    'source' => 'test_accounting',
    'label' => 'Accounting Cash Available',
], [
    'today' => '2026-07-30',
    'lookback_days' => 30,
    'order_days' => 30,
    'buffer_days' => 10,
]);
$rollupSuggestions = $rollupPayload['suggestions'] ?? [];
$stockSuggestions = array_values(array_filter($rollupSuggestions, static fn (array $item): bool => ($item['sku'] ?? '') === 'JGPC0150CHBU'));
$bundleSuggestions = array_values(array_filter($rollupSuggestions, static fn (array $item): bool => ($item['sku'] ?? '') === 'JGPC0300CHBU'));
$stockSuggestion = $stockSuggestions[0] ?? [];

inventory_recap_expect(2, $rollupPayload['summary']['suggested_count'], 'The original SKU and the chocolate stock SKU should be suggested.');
inventory_recap_expect(1, count($stockSuggestions), 'The 15-sachet stock SKU should receive the 30-sachet demand.');
inventory_recap_expect(0, count($bundleSuggestions), 'The 30-sachet selling SKU must not become a purchase suggestion.');
inventory_recap_expect(60.0, $stockSuggestion['sold_qty_astra'] ?? 0, 'Thirty 30-sachet sales should consume sixty 15-sachet stock units.');
inventory_recap_expect(2.0, $stockSuggestion['daily_velocity'] ?? 0, 'The chocolate stock SKU should consume two 15-sachet boxes per day.');
inventory_recap_expect(5.0, $stockSuggestion['current_days_remaining'] ?? 0, 'Ten 15-sachet boxes at two per day should last five days.');
inventory_recap_expect(70, $stockSuggestion['recommended_order_qty'] ?? 0, 'Recommended order should buy 15-sachet stock units to reach 40 days.');
inventory_recap_expect(50, $stockSuggestion['minimum_order_qty'] ?? 0, 'Minimum order should buy 15-sachet stock units to reach 30 days.');
inventory_recap_expect(20, $stockSuggestion['buffer_order_qty'] ?? 0, 'Buffer should be ten extra days of 15-sachet stock units.');
inventory_recap_expect(['JGPC0300CHBU'], $stockSuggestion['selling_skus'] ?? [], 'The 15-sachet stock SKU should report the 30-sachet selling SKU as its demand source.');

$skuPdo->exec("INSERT INTO sku_flavors VALUES ('flavor-seasonal', 'Seasonal')");
$skuPdo->exec("INSERT INTO sku_skus VALUES
    ('JG-SEASONAL', 'BUBUR_SEASONAL', 'brand-jg', 'unit-pcs', 1, 1, 'flavor-seasonal', 'prod-bubur', 10, 10, 5, 'auto', 0, 1000, 5000)");
foreach (['2026-06', '2026-07'] as $month) {
    for ($day = 1; $day <= 7; $day++) {
        $insert->execute([
            ':sku' => 'JG-SEASONAL',
            ':item_key' => 'seasonal-line-' . $month . '-' . $day,
            ':product_name' => 'Bubur Seasonal',
            ':marketplace_product_name' => 'Bubur Seasonal',
            ':base_product_name' => 'Bubur',
            ':flavor_name' => 'Seasonal',
            ':quantity' => 8,
            ':order_create_time' => $month . '-' . str_pad((string) $day, 2, '0', STR_PAD_LEFT) . ' 03:00:00.000000',
            ':timestamp_utc' => $month . '-' . str_pad((string) $day, 2, '0', STR_PAD_LEFT) . ' 03:00:00.000000',
            ':platform' => 'shopee',
            ':account_key' => 'test',
            ':order_id' => 'SEASONAL-' . $month . '-' . $day,
            ':status' => 'COMPLETED',
            ':revenue' => 40000,
            ':net_revenue' => 40000,
        ]);
    }
}

$seasonalPayload = jg_inventory_recap_payload($skuPdo, $analyticsPdo, [
    'amount' => 150000,
    'source' => 'test_accounting',
    'label' => 'Accounting Cash Available',
], [
    'today' => '2026-07-30',
    'lookback_days' => 60,
    'forecast_history_days' => 60,
    'order_days' => 30,
    'buffer_days' => 10,
]);
$seasonalItems = array_values(array_filter($seasonalPayload['items'] ?? [], static fn (array $item): bool => ($item['sku'] ?? '') === 'JG-SEASONAL'));
$seasonalItem = $seasonalItems[0] ?? [];
$plainAverageDays = round(10 / (112 / 60), 1);

inventory_recap_expect('calendar_weighted', $seasonalItem['forecast_method'] ?? '', 'Seasonal SKU should use the calendar forecast model.');
inventory_recap_expect('2026-07-31', $seasonalItem['forecast_next_days'][0]['date'] ?? '', 'Forecast should map demand from the next calendar day.');
inventory_recap_expect_true(isset($seasonalItem['forecast_months']['2026-08'], $seasonalItem['forecast_months']['2026-09']), 'Forecast should bucket demand across future months.');
inventory_recap_expect_true((float) ($seasonalItem['current_days_remaining'] ?? 99) < $plainAverageDays, 'First-week demand should shorten days left versus a flat average.');

echo "inventory-recap-test: ok\n";
