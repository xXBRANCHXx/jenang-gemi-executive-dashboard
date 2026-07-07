<?php
declare(strict_types=1);

require dirname(__DIR__) . '/astra-stock-bootstrap.php';

function astra_stock_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) {
        return;
    }
    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
    fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$pdo->exec('CREATE TABLE sku_skus (
    sku TEXT PRIMARY KEY,
    brand_id TEXT,
    unit_id TEXT,
    product_id TEXT,
    flavor_id TEXT,
    volume REAL,
    astra REAL,
    current_stock INTEGER,
    cogs REAL,
    updated_at TEXT
)');
$pdo->exec("INSERT INTO sku_skus VALUES
    ('JGPC0150CHBU', 'brand-jg', 'unit-pcs', 'prod-bubur', 'flavor-chocolate', 15, 15, 30, 1000, '2026-07-07 00:00:00'),
    ('JGPC0300CHBU', 'brand-jg', 'unit-pcs', 'prod-bubur', 'flavor-chocolate', 30, 15, 99, 2000, '2026-07-07 00:00:00'),
    ('JGPC0450CHBU', 'brand-jg', 'unit-pcs', 'prod-bubur', 'flavor-chocolate', 45, 15, 99, 3000, '2026-07-07 00:00:00')");

$target = jg_astra_stock_resolve($pdo, 'JGPC0300CHBU');
astra_stock_expect('JGPC0150CHBU', $target['stock_sku'] ?? '', '30-sachet SKU must resolve to the 15-sachet base stock SKU.');
astra_stock_expect(2.0, $target['stock_ratio'] ?? 0.0, '30/15 stock ratio must be 2.');
astra_stock_expect(30, jg_astra_stock_to_base_units(15, (float) ($target['stock_ratio'] ?? 1.0)), 'Fifteen 30-sachet sellable units require thirty 15-sachet stock units.');

jg_astra_stock_sync($pdo);
$stocks = $pdo->query('SELECT sku, current_stock FROM sku_skus ORDER BY sku')->fetchAll(PDO::FETCH_KEY_PAIR);
astra_stock_expect(30, (int) $stocks['JGPC0150CHBU'], 'Base 15-sachet stock must stay authoritative.');
astra_stock_expect(15, (int) $stocks['JGPC0300CHBU'], '30-sachet stock must be derived from base stock divided by 2.');
astra_stock_expect(10, (int) $stocks['JGPC0450CHBU'], '45-sachet stock must be derived from base stock divided by 3.');

$pdo->exec("DELETE FROM sku_skus");
$pdo->exec("INSERT INTO sku_skus VALUES
    ('JGPC0010CHBU', 'brand-jg', 'unit-pcs', 'prod-bubur', 'flavor-chocolate', 1, 1, 1000, 1000, '2026-07-07 00:00:00'),
    ('JGPC0030CHBU', 'brand-jg', 'unit-pcs', 'prod-bubur', 'flavor-chocolate', 3, 1, 0, 2000, '2026-07-07 00:00:00')");
$threeSachet = jg_astra_stock_resolve($pdo, 'JGPC0030CHBU');
astra_stock_expect('JGPC0010CHBU', $threeSachet['stock_sku'] ?? '', '3-sachet SKU must resolve to the 1-sachet base stock SKU.');
astra_stock_expect(3.0, $threeSachet['stock_ratio'] ?? 0.0, '3/1 stock ratio must be 3.');
jg_astra_stock_sync($pdo);
$oneSachetStocks = $pdo->query('SELECT sku, current_stock FROM sku_skus ORDER BY sku')->fetchAll(PDO::FETCH_KEY_PAIR);
astra_stock_expect(1000, (int) $oneSachetStocks['JGPC0010CHBU'], 'Base 1-sachet stock must remain 1000.');
astra_stock_expect(333, (int) $oneSachetStocks['JGPC0030CHBU'], '1000 one-sachet stock units must derive to 333 three-sachet units.');

echo "astra-stock-test: ok\n";
