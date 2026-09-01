<?php
declare(strict_types=1);

define('JG_ORDERS_API_NO_DISPATCH', true);
require dirname(__DIR__) . '/api/orders/index.php';

function daily_status_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) return;
    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
    fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

daily_status_expect(true, jg_orders_is_canceled_sale_status('CANCELLED_BY_BUYER'), 'Daily sales must reject marketplace cancellation variants.');
daily_status_expect(true, jg_orders_is_canceled_sale_status('in_cancel'), 'Daily sales must reject in-progress cancellations.');
daily_status_expect(true, jg_orders_is_canceled_sale_status('VOIDED'), 'Daily sales must reject voided orders.');
daily_status_expect(false, jg_orders_is_canceled_sale_status('COMPLETED'), 'Daily sales must retain completed orders.');

$activeSaleSql = jg_orders_active_sale_status_sql('dashboard_order_mirror.status');
daily_status_expect(true, str_contains($activeSaleSql, 'NOT LIKE "%CANCEL%"'), 'Daily mirror SQL must exclude every marketplace cancellation status.');
$ordersApi = file_get_contents(dirname(__DIR__) . '/api/orders/index.php');
daily_status_expect(
    true,
    str_contains((string) $ordersApi, "AND ' . \$activeSaleSql . '"),
    'The Daily mirror query must apply the active-sale status clause.'
);

echo "daily-sales-status-test: ok\n";
