<?php
declare(strict_types=1);

require dirname(__DIR__) . '/whatsapp-orders-bootstrap.php';

function whatsapp_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) return;
    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
    fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

whatsapp_expect(0.0, jg_whatsapp_money(0, 'Shipping cost'), 'Zero shipping must be retained for metrics.');
whatsapp_expect(25000.0, jg_whatsapp_money('25000', 'Shipping cost'), 'Shipping cost must normalize as money.');
whatsapp_expect('Customer One', jg_whatsapp_text(" Customer\nOne ", 'Customer name', 160, true), 'Customer text must normalize whitespace.');
whatsapp_expect(true, str_starts_with(jg_whatsapp_generate_order_id(), 'WAEXEC-'), 'Executive WhatsApp orders need a distinct Store Ops prefix.');
$percentageDiscount = jg_whatsapp_order_discount(['discount' => ['type' => 'percentage', 'value' => 10]], 100000);
whatsapp_expect(10000.0, $percentageDiscount['total'], 'Percentage discounts must reduce merchandise revenue.');
whatsapp_expect(90000.0, $percentageDiscount['net'], 'Percentage discounts must preserve the net merchandise total.');
$salePriceDiscount = jg_whatsapp_order_discount(['discount' => ['type' => 'sale_price', 'value' => 75000]], 100000);
whatsapp_expect(25000.0, $salePriceDiscount['total'], 'Sale price must represent the final merchandise price.');
$itemDiscount = jg_whatsapp_item_discount(15, 100000);
whatsapp_expect(15000.0, $itemDiscount['total'], 'Item percentage discounts must reduce only their own gross line total.');
whatsapp_expect(85000.0, $itemDiscount['net'], 'Item percentage discounts must preserve the discounted line total.');
$exactItemSale = jg_whatsapp_item_sale_price_discount(10000, 11900, 2);
whatsapp_expect(23800.0, $exactItemSale['net'] + $exactItemSale['total'], 'Edited item sale prices must preserve catalog gross revenue.');
whatsapp_expect(3800.0, $exactItemSale['total'], 'Edited item sale prices must become an exact item discount.');
whatsapp_expect(20000.0, $exactItemSale['net'], 'Edited item sale prices must become exact net line revenue.');
$allocated = jg_whatsapp_allocate_discount([
    ['line_total' => 60000],
    ['line_total' => 40000],
], 25000, 100000);
whatsapp_expect(75000.0, array_sum(array_column($allocated, 'line_total')), 'Allocated item revenue must reconcile to net order revenue.');
whatsapp_expect(25000.0, array_sum(array_column($allocated, 'discount_total')), 'Allocated item discounts must reconcile to the order discount.');
$layered = jg_whatsapp_allocate_discount([[
    'gross_line_total' => 100000,
    'line_total' => 90000,
    'discount_rate' => 10,
    'discount_total' => 10000,
]], 9000, 90000);
whatsapp_expect(81000.0, $layered[0]['line_total'], 'Order discounts must apply after the item-layer discount.');
whatsapp_expect(19000.0, $layered[0]['discount_total'], 'Stored line discounts must include item and order layers.');
whatsapp_expect(19.0, $layered[0]['discount_rate'], 'Stored effective line rate must reconcile both discount layers.');

$negativeRejected = false;
try {
    jg_whatsapp_money(-1, 'Shipping cost');
} catch (InvalidArgumentException) {
    $negativeRejected = true;
}
whatsapp_expect(true, $negativeRejected, 'Negative shipping cost must be rejected.');

$invalidItemDiscountRejected = false;
try {
    jg_whatsapp_item_discount(101, 100000);
} catch (InvalidArgumentException) {
    $invalidItemDiscountRejected = true;
}
whatsapp_expect(true, $invalidItemDiscountRejected, 'Item discounts above 100% must be rejected.');

$itemMarkupRejected = false;
try {
    jg_whatsapp_item_sale_price_discount(12000, 11900, 1);
} catch (InvalidArgumentException) {
    $itemMarkupRejected = true;
}
whatsapp_expect(true, $itemMarkupRejected, 'An edited item sale price cannot exceed its catalog price.');

$metricSummary = jg_whatsapp_apply_sales_aggregates(
    ['ok' => true, 'year' => 2026, 'months' => [], 'totals' => [], 'platforms' => [], 'accounts' => [], 'products' => []],
    [[
        'month' => 7,
        'orders' => 1,
        'item_count' => 2,
        'net_revenue' => 50000,
        'shipping_cost' => 5000,
        'cogs' => 15000,
    ]],
    [[
        'month' => 7,
        'sku' => '010101000001',
        'product_name' => 'Jenang Gemi · Bubur · Original',
        'brand_name' => 'Jenang Gemi',
        'base_product_name' => 'Bubur',
        'flavor_name' => 'Original',
        'quantity' => 2,
        'net_revenue' => 50000,
        'cogs' => 15000,
        'orders' => 1,
    ]],
    2026
);
whatsapp_expect(50000.0, $metricSummary['totals']['revenue'], 'WhatsApp merchandise must contribute to Executive revenue.');
whatsapp_expect(5000.0, $metricSummary['totals']['shipping_cost'], 'WhatsApp shipping must remain a separate Executive metric.');
whatsapp_expect(55000.0, $metricSummary['totals']['customer_total'], 'Customer total must reconcile merchandise and shipping.');
whatsapp_expect(35000.0, $metricSummary['totals']['gross_profit'], 'WhatsApp gross profit must use snapshotted SKU COGS without counting shipping as merchandise.');
whatsapp_expect(2.0, $metricSummary['totals']['item_count'], 'WhatsApp item quantity must contribute to dashboard volume.');
whatsapp_expect('whatsapp_listed_order', $metricSummary['products']['by_month'][0]['source'], 'WhatsApp product rollups must retain their source.');
$metricSummaryAgain = jg_whatsapp_apply_sales_aggregates($metricSummary, [[
    'month' => 7, 'orders' => 1, 'item_count' => 2, 'net_revenue' => 50000, 'shipping_cost' => 5000, 'cogs' => 15000,
]], [], 2026);
whatsapp_expect(50000.0, $metricSummaryAgain['totals']['revenue'], 'WhatsApp metrics merge must be idempotent.');

echo "whatsapp-orders-test: ok\n";
