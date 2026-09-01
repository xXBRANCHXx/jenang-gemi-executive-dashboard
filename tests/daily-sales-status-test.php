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

foreach (['UNPAID', 'REFUNDED', 'RETURNED', 'REJECTED', 'FAILED', 'EXPIRED', 'CLOSED'] as $excludedStatus) {
    daily_status_expect(true, jg_orders_is_excluded_sale_status($excludedStatus), 'Daily sales must reject non-sale marketplace status ' . $excludedStatus . '.');
}
daily_status_expect(false, jg_orders_is_excluded_sale_status('COMPLETED'), 'Daily sales must retain completed marketplace orders.');
daily_status_expect(false, jg_orders_is_excluded_sale_status('READY_TO_SHIP'), 'Daily sales must retain active marketplace orders.');

$activeSaleSql = jg_orders_active_sale_status_sql('dashboard_order_mirror.status');
daily_status_expect(true, str_contains($activeSaleSql, 'NOT LIKE "%CANCEL%"'), 'Daily mirror SQL must exclude every marketplace cancellation status.');
$includedSaleSql = jg_orders_included_sale_status_sql('dashboard_order_mirror.status');
daily_status_expect(
    true,
    str_contains($includedSaleSql, 'CANCEL|UNPAID|REFUND|RETURN|REJECT|FAILED|EXPIRED|CLOSED|VOID'),
    'Daily mirror SQL must use the same included-order lifecycle rule as Sales Recap.'
);
$ordersApi = file_get_contents(dirname(__DIR__) . '/api/orders/index.php');
daily_status_expect(
    true,
    str_contains((string) $ordersApi, "jg_orders_included_sale_status_sql('dashboard_order_mirror.status')")
        && str_contains((string) $ordersApi, "jg_orders_active_sale_status_sql('dashboard_order_mirror.funds_release_status')")
        && str_contains((string) $ordersApi, "AND ' . \$activeSaleSql . '"),
    'The Daily mirror query must reject non-sale order lifecycles and canceled funds-release lifecycles.'
);

echo "daily-sales-status-test: ok\n";
