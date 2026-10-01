<?php
declare(strict_types=1);
require dirname(__DIR__) . '/product-purchases-bootstrap.php';
require __DIR__ . '/fixtures/product-purchases.php';

function purchases_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) throw new RuntimeException($message . '\nExpected: ' . var_export($expected, true) . '\nActual: ' . var_export($actual, true));
}
$pdo = product_purchases_fixture();
$range = ['start_date' => '2026-09-02', 'end_date' => '2026-09-02'];
$payload = jg_product_purchases_payload($pdo, $range);
purchases_expect('2026-09-01 17:00:00', $payload['period']['start_at'], 'Jakarta midnight must be converted to UTC.');
purchases_expect('2026-09-02 17:00:00', $payload['period']['end_before'], 'The inclusive end date must stop at next Jakarta midnight.');
purchases_expect(35, $payload['totals']['ordered_qty'], 'Exclude drafts, cancelled POs and orders outside the period.');
purchases_expect(21, $payload['totals']['received_qty'], 'Received quantities must reflect the selected POs.');
purchases_expect(14, $payload['totals']['remaining_qty'], 'Remaining units must sum across products.');
purchases_expect(4070.0, $payload['totals']['purchase_value'], 'Use saved line costs, not current COGS or entire PO totals.');
purchases_expect(3, $payload['totals']['order_count'], 'Mixed-product POs must be counted only once.');
purchases_expect(4, count($payload['products']), 'Include unbought current and archived historical SKUs.');

$selected = jg_product_purchases_payload($pdo, $range + ['sku' => '010125000101']);
purchases_expect(25, $selected['totals']['ordered_qty'], 'A product page must show only its own units.');
purchases_expect(3500.0, $selected['totals']['purchase_value'], 'Add differing historical unit prices correctly.');
purchases_expect([3, 7, 2], array_column($selected['orders'], 'id'), 'Sort detail rows by confirmation date; include overflow POs.');
purchases_expect('2026-09-01 17:00:00', $selected['orders'][2]['ordered_at'], 'An old draft belongs to its confirmation period.');
purchases_expect(1500.0, $selected['orders'][2]['purchase_value'], 'Detail values must use this product line alone.');
$empty = jg_product_purchases_payload($pdo, $range + ['sku' => 'UNBOUGHT']);
purchases_expect(0, $empty['totals']['ordered_qty'], 'An unbought catalog product must show zero.');
purchases_expect([], $empty['orders'], 'Empty periods must not return unrelated POs.');
$legacy = jg_product_purchases_payload($pdo, ['start_date' => '2026-09-01', 'end_date' => '2026-09-01', 'sku' => 'ARCHIVED']);
purchases_expect(2, $legacy['totals']['ordered_qty'], 'Older POs without confirmed_at must use placed_at.');

foreach ([['start_date' => '2026-02-30', 'end_date' => '2026-03-01'], ['start_date' => '2026-09-03', 'end_date' => '2026-09-02'], ['start_date' => '2026-09-02'], ['sku' => 'MISSING'], ['sku' => "' OR 1=1 --"]] as $invalid) {
    try { jg_product_purchases_payload($pdo, $invalid); throw new RuntimeException('Invalid filters were accepted.'); }
    catch (InvalidArgumentException $expected) { }
}

// Historical totals must not inherit the recent-order list's 1,000-PO cap.
$pdo->beginTransaction();
$insertOrder = $pdo->prepare('INSERT INTO purchase_orders (id, po_number, status, note, placed_at, updated_at) VALUES (?, ?, "received", "", "2025-01-01 12:00:00", "2025-01-01 12:00:00")');
$insertItem = $pdo->prepare('INSERT INTO purchase_order_items (purchase_order_id, sku, product_name, ordered_qty, received_qty, unit_cost, created_at, updated_at) VALUES (?, "BULK", "Bulk historical product", 1, 1, 2.5, "2025-01-01 12:00:00", "2025-01-01 12:00:00")');
for ($id = 100; $id < 1105; $id++) { $insertOrder->execute([$id, 'BULK-' . $id]); $insertItem->execute([$id]); }
$pdo->commit();
$all = jg_product_purchases_payload($pdo, ['sku' => 'BULK']);
purchases_expect(1005, $all['totals']['order_count'], 'All-time totals must include the full history.');
purchases_expect(1005, count($all['orders']), 'Product detail rows must also include the full history.');
purchases_expect(2512.5, $all['totals']['purchase_value'], 'Preserve fractional unit costs.');
purchases_expect(100, jg_purchase_orders_find($pdo, 100)['id'], 'A PO detail link outside the recent-order window must still resolve.');
purchases_expect([], jg_purchase_orders_fetch($pdo, 1, 999999), 'Missing PO IDs must not return a different order.');
echo "PASS: product purchase totals, date boundaries, confirmation dates, costs, statuses, archived/empty products and full history.\n";
