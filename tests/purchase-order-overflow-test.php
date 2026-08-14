<?php
declare(strict_types=1);

require dirname(__DIR__) . '/purchase-orders-bootstrap.php';

function overflow_po_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) return;
    fwrite(STDERR, $message . PHP_EOL . 'Expected: ' . var_export($expected, true) . PHP_EOL . 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$pdo->exec('CREATE TABLE sku_brands (id INTEGER PRIMARY KEY, name TEXT NOT NULL)');
$pdo->exec('CREATE TABLE sku_products (id INTEGER PRIMARY KEY, name TEXT NOT NULL)');
$pdo->exec('CREATE TABLE sku_flavors (id INTEGER PRIMARY KEY, name TEXT NOT NULL)');
$pdo->exec('CREATE TABLE sku_units (id INTEGER PRIMARY KEY, name TEXT NOT NULL)');
$pdo->exec('CREATE TABLE sku_skus (
    sku TEXT PRIMARY KEY,
    purchase_moq INTEGER NOT NULL,
    cogs NUMERIC NOT NULL,
    volume NUMERIC NOT NULL,
    astra NUMERIC NOT NULL,
    brand_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    flavor_id INTEGER NOT NULL,
    unit_id INTEGER NOT NULL
)');
$pdo->exec("INSERT INTO sku_brands VALUES (1, 'Jenang Gemi')");
$pdo->exec("INSERT INTO sku_products VALUES (1, 'Bubur')");
$pdo->exec("INSERT INTO sku_flavors VALUES (1, 'Original')");
$pdo->exec("INSERT INTO sku_units VALUES (1, 'g')");
$pdo->exec("INSERT INTO sku_skus VALUES ('JG-OVERFLOW', 10, 12500, 250, 250, 1, 1, 1, 1)");

$reorder = jg_purchase_orders_place(
    $pdo,
    [['sku' => 'JG-OVERFLOW', 'quantity' => 7]],
    '',
    'reorder-request',
    'Executive',
    'pending',
    'reorder'
);
overflow_po_expect('reorder', $reorder['order_type'], 'Normal POs must retain the reorder type.');
overflow_po_expect(10, $reorder['items'][0]['ordered_qty'], 'Normal POs must still round quantities to MOQ.');

$overflow = jg_purchase_orders_place(
    $pdo,
    [['sku' => 'JG-OVERFLOW', 'quantity' => 7]],
    'Production made seven extra units.',
    'overflow-request',
    'Executive',
    'pending',
    'overflow'
);
overflow_po_expect('overflow', $overflow['order_type'], 'Overflow POs must be identifiable throughout the lifecycle.');
overflow_po_expect(7, $overflow['items'][0]['ordered_qty'], 'Overflow POs must preserve the exact quantity instead of rounding to MOQ.');
overflow_po_expect(87500.0, $overflow['estimated_total'], 'Overflow PO totals must use the exact quantity.');

$draft = jg_purchase_orders_create_draft(
    $pdo,
    [['sku' => 'JG-OVERFLOW', 'quantity' => 3]],
    '',
    'overflow-draft-request',
    'overflow'
);
overflow_po_expect('draft', $draft['status'], 'Overflow orders must support the existing draft lifecycle.');
overflow_po_expect('overflow', $draft['order_type'], 'Overflow drafts must retain their type for resume.');
overflow_po_expect(3, $draft['items'][0]['ordered_qty'], 'Overflow drafts must preserve exact quantities.');

echo "purchase-order-overflow-test: ok\n";
