<?php
declare(strict_types=1);

require dirname(__DIR__) . '/sku-db-bootstrap.php';

function astra_cogs_sync_expect(float $expected, float $actual, string $message): void
{
    if (abs($expected - $actual) < 0.005) {
        return;
    }
    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected: ' . $expected . PHP_EOL);
    fwrite(STDERR, 'Actual: ' . $actual . PHP_EOL);
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
$pdo->exec('CREATE TABLE sku_cogs_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT,
    old_price REAL,
    new_price REAL,
    change_mode TEXT,
    effective_at TEXT,
    recorded_at TEXT
)');
$pdo->exec("INSERT INTO sku_skus VALUES
    ('JGPC0150CHBU', 'brand-jg', 'unit-pcs', 'prod-bubur', 'flavor-chocolate', 15, 15, 30, 1000, '2026-01-01 00:00:00'),
    ('JGPC0300CHBU', 'brand-jg', 'unit-pcs', 'prod-bubur', 'flavor-chocolate', 30, 15, 15, 1000, '2026-01-01 00:00:00'),
    ('JGPC0450CHBU', 'brand-jg', 'unit-pcs', 'prod-bubur', 'flavor-chocolate', 45, 15, 10, 1000, '2026-01-01 00:00:00')");
$pdo->exec("INSERT INTO sku_cogs_history
    (sku, old_price, new_price, change_mode, effective_at, recorded_at)
    VALUES
    ('JGPC0150CHBU', NULL, 1000, 'opening', '2025-01-01 00:00:00', '2025-01-01 00:00:00'),
    ('JGPC0150CHBU', 1000, 1200, 'quarterly', '2026-04-01 00:00:00', '2026-02-01 00:00:00'),
    ('JGPC0300CHBU', 1000, 1300, 'quarterly', '2026-04-01 00:00:00', '2026-02-01 00:00:00')");

jg_sku_sync_current_cogs($pdo);
$cogs = $pdo->query('SELECT sku, cogs FROM sku_skus ORDER BY sku')->fetchAll(PDO::FETCH_KEY_PAIR);
astra_cogs_sync_expect(1200.0, (float) $cogs['JGPC0150CHBU'], 'Base SKU must resolve its effective quarterly COGS.');
astra_cogs_sync_expect(2400.0, (float) $cogs['JGPC0300CHBU'], '30-sachet current COGS must be 30/15 = 2 times the base SKU, even if its old history disagrees.');
astra_cogs_sync_expect(3600.0, (float) $cogs['JGPC0450CHBU'], '45-sachet current COGS must be 45/15 = 3 times the base SKU.');

fwrite(STDOUT, "astra-cogs-sync-test: ok\n");
