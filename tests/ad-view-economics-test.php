<?php
declare(strict_types=1);

require dirname(__DIR__) . '/ads-bootstrap.php';

$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$pdo->exec('CREATE TABLE sku_skus (sku TEXT NOT NULL, tag TEXT NOT NULL, cogs REAL NOT NULL)');
$pdo->exec('CREATE TABLE dashboard_order_mirror (
    platform TEXT NOT NULL,
    account_key TEXT NOT NULL,
    sku TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    order_create_date TEXT NOT NULL,
    deleted_at TEXT NULL
)');
$pdo->exec("INSERT INTO sku_skus VALUES ('SKU-A', 'MARKET-A', 10000), ('SKU-B', 'MARKET-B', 30000)");
$pdo->exec("INSERT INTO dashboard_order_mirror VALUES
    ('shopee', 'zero-shopee', 'sku-a', 3, '2026-07-14', NULL),
    ('shopee', 'zero-shopee', 'SKU-B', 1, '2026-07-14', NULL),
    ('shopee', 'zero-shopee', 'SKU-B', 9, '2026-07-13', NULL),
    ('shopee', 'jenang-gemi-shopee', 'SKU-A', 8, '2026-07-14', NULL)");

$costs = jgAdViewSkuCostMap($pdo, ['market a', 'SKU-B']);
if (($costs['MARKET A']['cogs'] ?? null) !== 10000.0 || ($costs['SKU-B']['cogs'] ?? null) !== 30000.0) {
    throw new RuntimeException('Ad View must read current COGS from SKU DB by normalized internal SKU or marketplace tag.');
}
if (($costs['MARKET A']['sku'] ?? null) !== 'SKU-A' || ($costs['MARKET A']['matched_by'] ?? null) !== 'tag') {
    throw new RuntimeException('Marketplace tags must resolve to their canonical internal SKU.');
}

$quantities = jgAdViewPurchasedSkuQuantities(
    $pdo,
    'zero-shopee',
    '2026-07-14',
    '2026-07-14',
    ['MARKET-A', 'SKU-A', 'SKU-B']
);
if (($quantities['SKU-A'] ?? null) !== 3.0 || ($quantities['SKU-B'] ?? null) !== 1.0) {
    throw new RuntimeException('Purchased SKU mix must follow the selected account and timeframe.');
}

$tagMatchedQuantity = $quantities[$costs['MARKET A']['source_key']] ?? $quantities[$costs['MARKET A']['sku']] ?? 0;
$weightedCogs = (($costs['MARKET A']['cogs'] * $tagMatchedQuantity) + ($costs['SKU-B']['cogs'] * $quantities['SKU-B']))
    / array_sum($quantities);
if (abs($weightedCogs - 15000.0) > 0.001) {
    throw new RuntimeException('Purchased product mix must weight SKU DB COGS.');
}

echo "Ad View economics tests passed.\n";
