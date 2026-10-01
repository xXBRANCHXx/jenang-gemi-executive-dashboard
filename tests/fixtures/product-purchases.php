<?php
declare(strict_types=1);

function product_purchases_fixture(): PDO
{
    $pdo = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    jg_purchase_orders_ensure_schema($pdo);
    $pdo->exec('CREATE TABLE sku_brands (id INTEGER PRIMARY KEY, name TEXT)');
    $pdo->exec('CREATE TABLE sku_products (id INTEGER PRIMARY KEY, name TEXT)');
    $pdo->exec('CREATE TABLE sku_flavors (id INTEGER PRIMARY KEY, name TEXT)');
    $pdo->exec('CREATE TABLE sku_units (id INTEGER PRIMARY KEY, name TEXT)');
    $pdo->exec('CREATE TABLE sku_skus (sku TEXT PRIMARY KEY, purchase_moq INTEGER, cogs NUMERIC, volume NUMERIC, astra NUMERIC, brand_id INTEGER, product_id INTEGER, flavor_id INTEGER, unit_id INTEGER)');
    $pdo->exec("INSERT INTO sku_brands VALUES (1, 'ZERO'); INSERT INTO sku_products VALUES (1, 'Syrup'); INSERT INTO sku_units VALUES (1, 'ml'); INSERT INTO sku_flavors VALUES (1, 'VANILLA'), (2, 'MINT'), (3, 'UNBOUGHT')");
    $pdo->exec("INSERT INTO sku_skus VALUES ('010125000101', 1, 99999, 250, 250, 1, 1, 1, 1), ('010125000201', 1, 99999, 250, 250, 1, 1, 2, 1), ('UNBOUGHT', 1, 99999, 250, 250, 1, 1, 3, 1)");
    $orders = [
        [1, 'pending', '2026-09-01 16:59:59', null, 'reorder'],
        [2, 'partially_received', '2026-08-01 10:00:00', '2026-09-01 17:00:00', 'reorder'],
        [3, 'received', '2026-09-02 16:59:59', '2026-09-02 16:59:59', 'reorder'],
        [4, 'pending', '2026-09-02 17:00:00', '2026-09-02 17:00:00', 'reorder'],
        [5, 'draft', '2026-09-02 10:00:00', null, 'reorder'],
        [6, 'cancelled', '2026-09-02 10:00:00', '2026-09-02 10:00:00', 'reorder'],
        [7, 'partially_received', '2026-09-01 20:30:00', '2026-09-01 20:30:00', 'overflow'],
    ];
    $orderStmt = $pdo->prepare('INSERT INTO purchase_orders (id, po_number, status, note, placed_at, confirmed_at, updated_at, tag, order_type) VALUES (?, ?, ?, "", ?, ?, ?, ?, ?)');
    foreach ($orders as [$id, $status, $placed, $confirmed, $type]) {
        $orderStmt->execute([$id, 'TEST-PO-' . $id, $status, $placed, $confirmed, $placed, $id === 2 ? 'Seasonal <sample>' : '', $type]);
    }
    $items = [[1, 10, 0, 100], [2, 12, 4, 125], [3, 8, 8, 200], [4, 99, 0, 100], [5, 999, 0, 100], [6, 999, 0, 100], [7, 5, 2, 80]];
    $itemStmt = $pdo->prepare('INSERT INTO purchase_order_items (purchase_order_id, sku, product_name, ordered_qty, received_qty, unit_cost, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, "2026-09-02 10:00:00", "2026-09-02 10:00:00")');
    foreach ($items as [$id, $ordered, $received, $cost]) $itemStmt->execute([$id, '010125000101', '250ml VANILLA Syrup', $ordered, $received, $cost]);
    $itemStmt->execute([2, '010125000201', '250ml MINT Syrup', 3, 0, 50]);
    $itemStmt->execute([3, '010125000201', '250ml MINT Syrup', 7, 7, 60]);
    // A removed product remains in the historical selector.
    $itemStmt->execute([1, 'ARCHIVED', 'Archived product <old>', 2, 0, 5]);
    return $pdo;
}
