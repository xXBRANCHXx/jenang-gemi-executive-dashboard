<?php
declare(strict_types=1);

require dirname(__DIR__) . '/whatsapp-orders-bootstrap.php';

function direct_archive_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) return;
    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
    fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$pdo->exec('CREATE TABLE whatsapp_orders (
    id INTEGER PRIMARY KEY, order_id TEXT, status TEXT, sales_channel TEXT,
    customer_name TEXT, customer_address TEXT, customer_phone TEXT, pay_later INTEGER,
    payment_status TEXT, payment_method TEXT, payment_account_key TEXT, paid_at TEXT,
    archived_at TEXT, archive_hide_charts INTEGER, archive_hide_financials INTEGER,
    archive_restore_stock INTEGER, merchandise_subtotal REAL, merchandise_total REAL,
    discount_type TEXT, discount_value REAL, discount_total REAL, shipping_cost REAL,
    deadline_hours INTEGER, deadline_at TEXT, label_storage_key TEXT, label_original_name TEXT,
    label_size_bytes INTEGER, notes TEXT, publication_attempts INTEGER, publication_error TEXT,
    listed_at TEXT, fulfilled_at TEXT, created_at TEXT, updated_at TEXT
)');
$pdo->exec('CREATE TABLE whatsapp_order_items (
    id INTEGER PRIMARY KEY, whatsapp_order_id INTEGER, sku TEXT, product_name TEXT,
    brand_name TEXT, base_product_name TEXT, flavor_name TEXT, quantity INTEGER,
    unit_price REAL, unit_cogs REAL, discount_rate REAL, discount_total REAL,
    line_total REAL, created_at TEXT
)');
$pdo->exec("INSERT INTO whatsapp_orders VALUES (
    1, 'WA-ARCHIVE-1', 'FULFILLED', 'whatsapp', 'Archive Customer', 'Bandung', '0800', 0,
    'paid', 'bank', 'bca-main', '2026-08-10 03:00:00', NULL, 0, 0, 0,
    100000, 90000, 'percentage', 10, 10000, 5000, 24, NULL, 'label.pdf', 'label.pdf',
    100, '', 1, '', '2026-08-10 02:00:00', '2026-08-10 04:00:00',
    '2026-08-10 01:00:00', '2026-08-10 04:00:00'
)");
$pdo->exec("INSERT INTO whatsapp_order_items VALUES (
    1, 1, 'SKU-1', 'Product One', 'Brand', 'Product', 'Original', 2,
    50000, 20000, 10, 10000, 90000, '2026-08-10 01:00:00'
)");

direct_archive_expect(1, count(jg_whatsapp_list_orders($pdo)), 'Active direct-order lists must initially include the order.');
direct_archive_expect(1, count(jg_whatsapp_metric_order_rows($pdo, '2026-08-10', '2026-08-10')), 'The order must initially contribute to chart rows.');

$archived = jg_whatsapp_archive_order($pdo, null, 'WA-ARCHIVE-1', [
    'hide_charts' => true,
    'hide_financials' => true,
    'restore_stock' => false,
]);
direct_archive_expect(true, $archived['archived'], 'Archiving must retain an explicit archived state.');
direct_archive_expect(true, $archived['archive_impact']['hide_charts'], 'The selected chart correction must persist.');
direct_archive_expect(true, $archived['archive_impact']['hide_financials'], 'The selected financial correction must persist.');
direct_archive_expect(false, $archived['archive_impact']['restore_stock'], 'Unselected stock restoration must stay off.');
direct_archive_expect(0, count(jg_whatsapp_list_orders($pdo)), 'Archived orders must leave the recent active list.');
direct_archive_expect(0, count(jg_whatsapp_metric_order_rows($pdo, '2026-08-10', '2026-08-10')), 'Chart-hidden archives must leave sales metrics.');
direct_archive_expect(0, jg_whatsapp_unpaid_summary($pdo)['count'], 'Archived financial corrections must not create an unpaid indicator.');

$activeHistory = jg_whatsapp_order_history($pdo, 1, 50, '', '', false, 'active');
$archivedHistory = jg_whatsapp_order_history($pdo, 1, 50, '', '', false, 'archived');
direct_archive_expect(0, count($activeHistory['orders']), 'The active ledger must exclude archived records.');
direct_archive_expect(1, count($archivedHistory['orders']), 'The archived ledger filter must retain the record.');

echo "direct-order-archive-test: ok\n";
