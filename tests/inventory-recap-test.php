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

echo "inventory-recap-test: ok\n";
