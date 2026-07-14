<?php
declare(strict_types=1);

require dirname(__DIR__) . '/ads-bootstrap.php';

$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$pdo->exec('CREATE TABLE sku_brands (id TEXT PRIMARY KEY, name TEXT NOT NULL)');
$pdo->exec('CREATE TABLE sku_units (id TEXT PRIMARY KEY, name TEXT NOT NULL)');
$pdo->exec('CREATE TABLE sku_products (id TEXT PRIMARY KEY, name TEXT NOT NULL)');
$pdo->exec('CREATE TABLE sku_flavors (id TEXT PRIMARY KEY, name TEXT NOT NULL)');
$pdo->exec('CREATE TABLE sku_skus (
    sku TEXT NOT NULL,
    tag TEXT NOT NULL,
    brand_id TEXT NOT NULL,
    unit_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    flavor_id TEXT NOT NULL,
    volume REAL NOT NULL,
    cogs REAL NOT NULL
)');
$pdo->exec('CREATE TABLE dashboard_order_mirror (
    platform TEXT NOT NULL,
    account_key TEXT NOT NULL,
    sku TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    order_create_date TEXT NOT NULL,
    deleted_at TEXT NULL
)');
$pdo->exec("INSERT INTO sku_brands VALUES ('jg', 'Jenang Gemi'), ('zero', 'ZERO'), ('zfit', 'ZFit')");
$pdo->exec("INSERT INTO sku_units VALUES ('sachet', 'Sachet'), ('ml', 'ml')");
$pdo->exec("INSERT INTO sku_products VALUES ('bubur', 'Bubur'), ('syrup', 'Syrup'), ('fiber-syrup', 'Fiber Syrup'), ('zero-drops', 'Zero Drops')");
$pdo->exec("INSERT INTO sku_flavors VALUES ('original', 'Original'), ('melon', 'Melon'), ('unflavored', 'Unflavored'), ('vanilla', 'Vanilla')");
$pdo->exec("INSERT INTO sku_skus VALUES
    ('SKU-A', 'BAGGOSMEDIA_BUBUR_ORIGINAL', 'jg', 'sachet', 'bubur', 'original', 30, 10000),
    ('SKU-B', 'MARKET-B', 'zero', 'ml', 'syrup', 'melon', 250, 30000),
    ('SKU-C', 'FIBER_SYRUP_UNFLAVORED', 'zfit', 'ml', 'fiber-syrup', 'unflavored', 250, 40000),
    ('SKU-D', 'BAGGOSMEDIA_ZERO_DROPS_VANILLA', 'zero', 'ml', 'zero-drops', 'vanilla', 30, 12000)");
$pdo->exec("INSERT INTO dashboard_order_mirror VALUES
    ('shopee', 'zero-shopee', 'sku-a', 3, '2026-07-14', NULL),
    ('shopee', 'zero-shopee', 'SKU-B', 1, '2026-07-14', NULL),
    ('shopee', 'zero-shopee', 'SKU-B', 9, '2026-07-13', NULL),
    ('shopee', 'jenang-gemi-shopee', 'SKU-A', 8, '2026-07-14', NULL)");

$costs = jgAdViewSkuCostMap($pdo, ['JGBUBUR_ORIGINAL_30SACHET', 'JGBUBUR_ORIGINAL_60SACHET', 'BAGGOSMEDIA_BUBUR_ORIGINAL', 'SKU-B', 'FSUN-250', 'ZDROPS_VANILLA_30ML']);
if (($costs['JGBUBUR_ORIGINAL_30SACHET']['cogs'] ?? null) !== 10000.0
    || ($costs['JGBUBUR_ORIGINAL_60SACHET']['cogs'] ?? null) !== 10000.0
    || ($costs['BAGGOSMEDIA_BUBUR_ORIGINAL']['cogs'] ?? null) !== 10000.0
    || ($costs['SKU-B']['cogs'] ?? null) !== 30000.0
    || ($costs['FSUN-250']['cogs'] ?? null) !== 40000.0
    || ($costs['ZDROPS_VANILLA_30ML']['cogs'] ?? null) !== 12000.0) {
    throw new RuntimeException('Ad View must read current COGS from SKU DB by normalized internal SKU or marketplace tag.');
}
if (($costs['JGBUBUR_ORIGINAL_30SACHET']['sku'] ?? null) !== 'SKU-A' || ($costs['JGBUBUR_ORIGINAL_30SACHET']['matched_by'] ?? null) !== 'attributes') {
    throw new RuntimeException('Shopee variant SKUs must resolve from SKU DB brand, product, flavor, volume, and unit attributes.');
}
if (($costs['BAGGOSMEDIA_BUBUR_ORIGINAL']['matched_by'] ?? null) !== 'tag'
    || ($costs['FSUN-250']['matched_by'] ?? null) !== 'attributes') {
    throw new RuntimeException('Direct marketplace tags and abbreviated semantic SKUs must use the correct match source.');
}

$familyCosts = jgAdViewProductFamilyCosts($pdo, [
    'product_name' => 'ZFit Fiber Syrup Sugar Free untuk Diet',
    'source_ad_name' => '',
    'settings' => [],
]);
if (count($familyCosts) !== 1
    || ($familyCosts[0]['sku'] ?? null) !== 'SKU-C'
    || ($familyCosts[0]['matched_by'] ?? null) !== 'product_family') {
    throw new RuntimeException('Unambiguous listing product families must supply COGS when a seller SKU alias is new.');
}

$quantities = jgAdViewPurchasedSkuQuantities(
    $pdo,
    'zero-shopee',
    '2026-07-14',
    '2026-07-14',
    ['JGBUBUR_ORIGINAL_30SACHET', 'SKU-A', 'SKU-B']
);
if (($quantities['SKU-A'] ?? null) !== 3.0 || ($quantities['SKU-B'] ?? null) !== 1.0) {
    throw new RuntimeException('Purchased SKU mix must follow the selected account and timeframe.');
}

$tagMatchedQuantity = $quantities[$costs['JGBUBUR_ORIGINAL_30SACHET']['source_key']] ?? $quantities[$costs['JGBUBUR_ORIGINAL_30SACHET']['sku']] ?? 0;
$weightedCogs = (($costs['JGBUBUR_ORIGINAL_30SACHET']['cogs'] * $tagMatchedQuantity) + ($costs['SKU-B']['cogs'] * $quantities['SKU-B']))
    / array_sum($quantities);
if (abs($weightedCogs - 15000.0) > 0.001) {
    throw new RuntimeException('Purchased product mix must weight SKU DB COGS.');
}

$bootstrapSource = file_get_contents(dirname(__DIR__) . '/ads-bootstrap.php');
if (!is_string($bootstrapSource)
    || !str_contains($bootstrapSource, '$skuPdo = jg_sku_db()')
    || !str_contains($bootstrapSource, 'jgAdViewSkuCostMap($skuPdo, $allSellerSkus)')) {
    throw new RuntimeException('Ad View COGS must query the dedicated SKU database, not the analytics database.');
}

echo "Ad View economics tests passed.\n";
