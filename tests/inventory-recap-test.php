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

$options = jg_inventory_recap_options(['today' => '2026-07-30', 'lookback_days' => 30]);
inventory_recap_expect(90, $options['lookback_days'], 'The trigger model must always use 90 calendar days.');
inventory_recap_expect(9, $options['bucket_count'], 'The model must use nine demand blocks.');
inventory_recap_expect(10, $options['bucket_days'], 'Each demand block must contain ten days.');
inventory_recap_expect(0.25, $options['reorder_fraction'], 'The automatic trigger must use one quarter of flat monthly demand.');
inventory_recap_expect(7.5, $options['reorder_days_equivalent'], 'One quarter of a 30-day demand value is about 7.5 days.');
inventory_recap_expect(0.75, $options['purchase_fraction'], 'A triggered purchase must use the remaining 75% of monthly demand.');
inventory_recap_expect(22.5, $options['purchase_days_equivalent'], 'The purchase quantity must represent the remaining three quarters of a month.');
inventory_recap_expect('90_day_trigger', $options['forecast_model'], 'The quantity trigger model must identify itself.');

inventory_recap_expect(22, jg_inventory_recap_round_to_moq(19, 11), 'A need of 19 with MOQ 11 must round to 22.');
inventory_recap_expect(9, jg_inventory_recap_round_to_moq(1, 9), 'Any positive need must reach one complete MOQ.');
inventory_recap_expect(0, jg_inventory_recap_round_to_moq(0, 11), 'Zero need must remain zero.');

$flatHistory = [];
$start = new DateTimeImmutable('2026-05-02');
for ($day = 0; $day < 90; $day++) {
    $flatHistory[$start->modify("+{$day} days")->format('Y-m-d')] = 1;
}
$flatModel = jg_inventory_recap_trigger_model($flatHistory, $options);
inventory_recap_expect(90.0, $flatModel['total_90_day_demand'], 'All 90 calendar days must contribute to demand.');
inventory_recap_expect(30.0, $flatModel['average_30_day_demand'], 'The 90-day total must average to a 30-day quantity.');
inventory_recap_expect(array_fill(0, 9, 10.0), $flatModel['ten_day_buckets'], 'Flat sales must produce nine equal blocks.');
inventory_recap_expect(30.0, $flatModel['adjusted_30_day_demand'], 'The decision basis must remain the flat monthly average without a buffer.');
inventory_recap_expect(0.0, $flatModel['applied_buffer'], 'No fluctuation or large-order buffer may be applied.');
inventory_recap_expect(8, $flatModel['automatic_trigger'], 'The automatic trigger must be 25% of the adjusted monthly demand.');
inventory_recap_expect(23, $flatModel['purchase_target_qty'], 'A triggered order must use the remaining 75% of monthly demand.');

$risingHistory = [];
for ($block = 0; $block < 9; $block++) {
    for ($day = 0; $day < 10; $day++) {
        $offset = ($block * 10) + $day;
        $risingHistory[$start->modify("+{$offset} days")->format('Y-m-d')] = $block + 1;
    }
}
$risingModel = jg_inventory_recap_trigger_model($risingHistory, $options);
inventory_recap_expect(10.0, $risingModel['average_10_day_change'], 'The average ten-day increase must be retained.');
inventory_recap_expect(80.0, $risingModel['overall_90_day_change'], 'The first-to-last block increase must be retained.');
inventory_recap_expect(30.0, $risingModel['trend_adjustment'], 'Ten-day and overall movement must normalize to one 30-day trend adjustment.');
inventory_recap_expect(38, $risingModel['automatic_trigger'], 'Trend must not change the trigger based on the flat monthly average.');
inventory_recap_expect(113, $risingModel['purchase_target_qty'], 'Trend must not change the remaining 75% purchase quantity.');

$skuPdo = new PDO('sqlite::memory:');
$skuPdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$skuPdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$skuPdo->exec('CREATE TABLE sku_brands (id TEXT PRIMARY KEY, name TEXT)');
$skuPdo->exec('CREATE TABLE sku_units (id TEXT PRIMARY KEY, name TEXT)');
$skuPdo->exec('CREATE TABLE sku_products (id TEXT PRIMARY KEY, name TEXT)');
$skuPdo->exec('CREATE TABLE sku_flavors (id TEXT PRIMARY KEY, name TEXT)');
$skuPdo->exec('CREATE TABLE sku_meta (meta_key TEXT PRIMARY KEY, meta_value TEXT, updated_at TEXT)');
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
    purchase_moq INTEGER,
    skip_scan INTEGER,
    cogs REAL,
    sale_price REAL
)');
$skuPdo->exec("INSERT INTO sku_brands VALUES ('brand-test', 'Test')");
$skuPdo->exec("INSERT INTO sku_units VALUES ('unit-pcs', 'pcs')");
$skuPdo->exec("INSERT INTO sku_products VALUES ('product-test', 'Product')");
$skuPdo->exec("INSERT INTO sku_flavors VALUES ('flat', 'Flat'), ('manual', 'Manual'), ('safe', 'Safe')");
$skuPdo->exec("INSERT INTO sku_meta VALUES ('inventory_purchase_days', '15', '2026-07-30 00:00:00')");
$skuPdo->exec("INSERT INTO sku_skus VALUES
    ('SKU-FLAT', 'FLAT', 'brand-test', 'unit-pcs', 1, 1, 'flat', 'product-test', 4, 4, 0, 'auto', 11, 0, 1000, 5000),
    ('SKU-MANUAL', 'MANUAL', 'brand-test', 'unit-pcs', 1, 1, 'manual', 'product-test', 3, 3, 22, 'manual', 11, 0, 1000, 5000),
    ('SKU-SAFE', 'SAFE', 'brand-test', 'unit-pcs', 1, 1, 'safe', 'product-test', 100, 100, 0, 'auto', 1, 0, 1000, 5000)");

$analyticsPdo = new PDO('sqlite::memory:');
$analyticsPdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$analyticsPdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$analyticsPdo->exec('CREATE TABLE dashboard_order_mirror (
    sku TEXT, item_key TEXT, product_name TEXT, marketplace_product_name TEXT,
    base_product_name TEXT, flavor_name TEXT, quantity REAL, order_create_time TEXT,
    timestamp_utc TEXT, platform TEXT, account_key TEXT, order_id TEXT, status TEXT,
    revenue REAL, net_revenue REAL, deleted_at TEXT NULL
)');
$insert = $analyticsPdo->prepare('INSERT INTO dashboard_order_mirror
    (sku, item_key, product_name, marketplace_product_name, base_product_name, flavor_name,
     quantity, order_create_time, timestamp_utc, platform, account_key, order_id, status,
     revenue, net_revenue, deleted_at)
    VALUES (:sku, :item_key, :product_name, :product_name, :product_name, "Flat", 1,
            :occurred_at, :occurred_at, "shopee", "test", :order_id, "COMPLETED", 5000, 5000, NULL)');
for ($day = 0; $day < 90; $day++) {
    $date = $start->modify("+{$day} days")->format('Y-m-d') . ' 01:00:00.000000';
    $insert->execute([
        ':sku' => 'SKU-FLAT',
        ':item_key' => 'line-' . $day,
        ':product_name' => 'Product Flat',
        ':occurred_at' => $date,
        ':order_id' => 'ORDER-' . $day,
    ]);
}

$payload = jg_inventory_recap_payload($skuPdo, $analyticsPdo, [
    'amount' => 100000,
    'source' => 'test',
], ['today' => '2026-07-30']);

inventory_recap_expect(true, $payload['ok'], 'Inventory payload must succeed.');
inventory_recap_expect(2, $payload['summary']['triggered_count'], 'Automatic and manual shortfalls must both enter the report.');
inventory_recap_expect(2, $payload['summary']['suggested_count'], 'Only below-trigger products belong in the purchase plan.');
inventory_recap_expect(44, $payload['summary']['total_recommended_qty'], 'The summary must total MOQ-rounded quantities.');
inventory_recap_expect(44000, $payload['summary']['total_recommended_cost'], 'The purchase cost must use MOQ-rounded quantities.');
inventory_recap_expect(1, $payload['summary']['manual_count'], 'Manual trigger mode must be counted.');

$bySku = [];
foreach ($payload['items'] as $item) {
    $bySku[(string) $item['sku']] = $item;
}
$flat = $bySku['SKU-FLAT'] ?? [];
$manual = $bySku['SKU-MANUAL'] ?? [];
inventory_recap_expect(8, $flat['automatic_trigger'] ?? 0, 'The payload must expose the one-week automatic trigger.');
inventory_recap_expect(4, $flat['trigger_shortfall_qty'] ?? 0, 'The trigger shortfall must remain visible.');
inventory_recap_expect(15.0, $flat['purchase_days'] ?? 0, 'The global order-days setting must be exposed on every product.');
inventory_recap_expect(15.0, $manual['purchase_days'] ?? 0, 'Every product must use the same global order-days setting.');
inventory_recap_expect(15, $flat['raw_purchase_qty'] ?? 0, 'The raw purchase must use the shared order days.');
inventory_recap_expect(22, $flat['recommended_order_qty'] ?? 0, 'The customized order must round up to MOQ 11.');
inventory_recap_expect(7, $flat['moq_rounding_qty'] ?? 0, 'The MOQ uplift must remain auditable.');

inventory_recap_expect('manual', $manual['trigger_mode'] ?? '', 'Manual mode must override the automatic model.');
inventory_recap_expect(22, $manual['trigger_qty'] ?? 0, 'The stored manual trigger must become effective.');
inventory_recap_expect(19, $manual['raw_purchase_qty'] ?? 0, 'The manual shortfall must be exact.');
inventory_recap_expect(22, $manual['recommended_order_qty'] ?? 0, 'The 19-unit shortfall at MOQ 11 must recommend 22.');

inventory_recap_expect('quiet', $bySku['SKU-SAFE']['risk'] ?? '', 'An automatic product without demand history must stay out of the report.');

inventory_recap_expect(12.5, jg_inventory_recap_set_global_purchase_days($skuPdo, 12.5), 'The shared setting must be editable.');
inventory_recap_expect(12.5, jg_inventory_recap_global_purchase_days($skuPdo), 'The shared setting must persist once for the report.');

echo "inventory-recap-test: ok\n";
