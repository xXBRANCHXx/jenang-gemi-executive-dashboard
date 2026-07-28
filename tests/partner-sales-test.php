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

echo "partner-sales-test: ok\n";
