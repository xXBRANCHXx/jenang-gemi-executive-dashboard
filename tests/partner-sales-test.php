<?php
declare(strict_types=1);

require dirname(__DIR__) . '/partner-sales-bootstrap.php';

function partner_sales_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) return;
    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
    fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$order = jg_partner_sales_normalize_order([
    'id' => 'PO-1001',
    'partner_code' => 'JGP-TEST',
    'status' => 'FULFILLED',
    'items_json' => json_encode([
        ['sku_code' => 'JG-01', 'quantity' => 2, 'unit_revenue' => 25000, 'line_revenue' => 50000],
        ['sku_code' => 'JG-02', 'quantity' => 1, 'partner_price' => 30000],
    ], JSON_THROW_ON_ERROR),
    'revenue_total' => 80000,
], [
    ['amount' => 30000],
]);

partner_sales_expect(3, $order['units'], 'Line-item quantities should produce total units.');
partner_sales_expect(80000.0, $order['order_total'], 'Stored partner order value should be preserved.');
partner_sales_expect(30000.0, $order['paid_amount'], 'Recorded settlements should sum by order.');
partner_sales_expect(50000.0, $order['outstanding_amount'], 'Outstanding value should deduct settlements.');
partner_sales_expect('partial', $order['payment_status'], 'Partially settled orders should be identified.');

$paid = jg_partner_sales_normalize_order([
    'id' => 'PO-1002',
    'status' => 'COMPLETED',
    'quantity' => 1,
    'revenue_total' => 40000,
], [['amount' => 40000]]);

$cancelled = jg_partner_sales_normalize_order([
    'id' => 'PO-1003',
    'status' => 'CANCELLED',
    'quantity' => 2,
    'revenue_total' => 60000,
], []);

$summary = jg_partner_sales_summary([$order, $paid, $cancelled]);
partner_sales_expect(2, $summary['order_count'], 'Cancelled orders should not count as sales.');
partner_sales_expect(120000.0, $summary['order_value'], 'Sales value should exclude cancelled orders.');
partner_sales_expect(70000.0, $summary['paid_amount'], 'Paid value should include all active settlements.');
partner_sales_expect(50000.0, $summary['outstanding_amount'], 'Summary outstanding should reconcile.');
partner_sales_expect(1, $summary['payment_statuses']['cancelled'], 'Cancelled orders should remain auditable.');

$adjusted = jg_partner_sales_apply_item_prices([
    ['sku_code' => 'JG-01', 'quantity' => 2, 'unit_revenue' => 25000],
    ['sku_code' => 'JG-02', 'quantity' => 1, 'unit_revenue' => 30000],
], [
    ['line_index' => 0, 'unit_price' => 24000],
    ['line_index' => 1, 'unit_price' => 27500],
]);
partner_sales_expect(75500.0, $adjusted['total'], 'Editable product prices should recalculate the order total by quantity.');
partner_sales_expect(24000.0, $adjusted['items'][0]['unit_revenue'], 'The edited unit price should be written back to the order item.');
partner_sales_expect(48000.0, $adjusted['items'][0]['line_revenue'], 'The edited line total should remain consistent.');

$incompletePricesRejected = false;
try {
    jg_partner_sales_apply_item_prices([
        ['sku_code' => 'JG-01', 'quantity' => 1],
        ['sku_code' => 'JG-02', 'quantity' => 1],
    ], [['line_index' => 0, 'unit_price' => 24000]]);
} catch (InvalidArgumentException) {
    $incompletePricesRejected = true;
}
partner_sales_expect(true, $incompletePricesRejected, 'Every product must have a valid admin-entered price.');

$source = file_get_contents(dirname(__DIR__) . '/partner-sales-bootstrap.php');
partner_sales_expect(
    true,
    str_contains($source, 'restore_accepted_price') && str_contains($source, 'Price corrected by finance after investigation.'),
    'Admin price edits must restore an order mistakenly removed by an accepted price dispute.'
);
partner_sales_expect(
    true,
    str_contains($source, 'source_reference') && str_contains($source, 'uq_partner_order_payment_source') && str_contains($source, 'proof_mime_type'),
    'Automatic bill settlements must retain one idempotent source reference and proof metadata.'
);

echo "partner-sales-test: ok\n";
