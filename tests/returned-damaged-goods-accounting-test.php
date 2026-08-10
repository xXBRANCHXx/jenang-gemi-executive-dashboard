<?php
declare(strict_types=1);

require dirname(__DIR__) . '/purchase-orders-bootstrap.php';

function returned_goods_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) return;
    fwrite(STDERR, $message . PHP_EOL . 'Expected: ' . var_export($expected, true) . PHP_EOL . 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$normal = jg_purchase_orders_accounting_category([
    'tag' => 'Supplier A',
    'placed_by' => 'Executive',
]);
returned_goods_expect('finished-goods-purchase', $normal['key'], 'Normal purchase orders must keep their existing accounting category.');
returned_goods_expect('Finished Goods Purchase', $normal['name'], 'Normal PO ledger labels must not change.');

$returned = jg_purchase_orders_accounting_category([
    'tag' => 'Returned damaged goods',
    'placed_by' => 'Store Ops Returns',
]);
returned_goods_expect('returned-damaged-goods', $returned['key'], 'Return POs must use the returned damaged goods category.');
returned_goods_expect('Returned damaged goods', $returned['name'], 'Return PO ledger rows must use the requested accounting label.');

$sourceFallback = jg_purchase_orders_accounting_category([
    'tag' => '',
    'placed_by' => 'Store Ops Returns',
]);
returned_goods_expect('returned-damaged-goods', $sourceFallback['key'], 'The immutable PO source must preserve classification if its editable tag changes.');

echo "returned-damaged-goods-accounting-test: ok\n";
