<?php
declare(strict_types=1);

require dirname(__DIR__) . '/partner-sales-summary.php';

function partner_summary_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) return;
    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
    fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$facts = jg_partner_sales_summary_facts([
    [
        'id' => 'PARTNER-1',
        'status' => 'FULFILLED',
        'order_timestamp' => '2026-08-31 18:30:00',
        'revenue_total' => 80000,
        'items_json' => json_encode([
            ['sku_code' => 'JG-01', 'product' => 'Syrup', 'quantity' => 2, 'line_revenue' => 50000],
            ['sku_code' => 'JG-02', 'product' => 'Drops', 'quantity' => 1, 'line_revenue' => 30000],
        ], JSON_THROW_ON_ERROR),
    ],
    [
        'id' => 'PARTNER-2',
        'status' => 'CANCELLED',
        'order_timestamp' => '2026-09-01 02:00:00',
        'quantity' => 9,
        'revenue_total' => 900000,
    ],
    [
        'id' => 'PARTNER-3',
        'status' => 'COMPLETED',
        'order_timestamp' => '2026-09-05 02:00:00',
        'sku_code' => 'JG-03',
        'product_name' => 'Bubur',
        'quantity' => 4,
        'revenue_total' => 100000,
    ],
], 2026);

partner_summary_expect(2, $facts['months'][9]['orders'] ?? null, 'Partner summary must include active September orders only.');
partner_summary_expect(7, $facts['months'][9]['item_count'] ?? null, 'Partner quantity must use line items and fallback order quantity.');
partner_summary_expect(180000.0, $facts['months'][9]['revenue'] ?? null, 'Partner revenue must exclude canceled orders.');
partner_summary_expect(3, count($facts['products']), 'Partner product facts must exclude canceled order products.');
partner_summary_expect(9, jg_partner_sales_summary_month(['order_timestamp' => '2026-08-31 18:30:00'], 2026), 'UTC timestamps must use the Jakarta sales month.');
$salesApi = file_get_contents(dirname(__DIR__) . '/api/sales/index.php');
partner_summary_expect(
    2,
    substr_count((string) $salesApi, 'jg_sales_merge_partner_summary($'),
    'Both cached and context-only Sales Recap responses must merge Partner sales.'
);
partner_summary_expect(
    true,
    str_contains((string) $salesApi, '$monthsByNumber[$month][\'revenue_breakdown\'][\'partner_orders\']')
        && str_contains((string) $salesApi, '$summary[\'totals\'][\'revenue_breakdown\'][\'partner_orders\']'),
    'Sales must expose the Partner-order portion without removing it from all-channel chart totals.'
);
partner_summary_expect(
    true,
    str_contains((string) $salesApi, '$monthsByNumber[$month][$key] = (float) ($monthsByNumber[$month][$key] ?? 0) + $value')
        && str_contains((string) $salesApi, '$summary[\'totals\'][$key] = (float) ($summary[\'totals\'][$key] ?? 0) + $value'),
    'Existing all-channel month and total metrics must continue adding Partner orders for Sales Recap charts.'
);

echo "partner-sales-summary-test: ok\n";
