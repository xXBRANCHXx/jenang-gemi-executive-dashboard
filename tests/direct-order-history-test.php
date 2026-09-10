<?php
declare(strict_types=1);
require dirname(__DIR__) . '/whatsapp-orders-bootstrap.php';
function history_expect(mixed $expected, mixed $actual, string $message): void {
    if ($expected !== $actual) throw new RuntimeException($message . ': ' . var_export($actual, true));
}
$pdo = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$sku = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$pdo->exec("CREATE TABLE whatsapp_orders (id INTEGER PRIMARY KEY, order_id TEXT, sales_channel TEXT DEFAULT 'whatsapp',
    status TEXT DEFAULT 'FULFILLED', customer_name TEXT DEFAULT 'Customer', customer_phone TEXT DEFAULT '', customer_address TEXT DEFAULT '',
    archived_at TEXT, merchandise_total REAL DEFAULT 90, merchandise_subtotal REAL DEFAULT 100, discount_total REAL DEFAULT 10, shipping_cost REAL DEFAULT 5,
    created_at TEXT, updated_at TEXT, payment_status TEXT DEFAULT 'paid', payment_method TEXT DEFAULT 'bank', pay_later INTEGER DEFAULT 0,
    deadline_hours INTEGER DEFAULT 24, notes TEXT DEFAULT '', label_storage_key TEXT DEFAULT '', label_original_name TEXT DEFAULT '',
    publication_attempts INTEGER DEFAULT 1, publication_error TEXT DEFAULT '')");
$pdo->exec('CREATE TABLE whatsapp_order_items (id INTEGER PRIMARY KEY, whatsapp_order_id INTEGER, sku TEXT, product_name TEXT, quantity INTEGER)');
$sku->exec("CREATE TABLE store_ops_walkin_invoices (invoice_number TEXT PRIMARY KEY, invoice_type TEXT DEFAULT 'walk_in', customer_name TEXT DEFAULT 'Counter buyer',
    customer_phone TEXT DEFAULT '08123', customer_address TEXT DEFAULT '', payment_method TEXT DEFAULT 'QRIS', subtotal REAL DEFAULT 200,
    discount_total REAL DEFAULT 20, shipping_cost REAL DEFAULT 0, tax REAL DEFAULT 18, total REAL DEFAULT 198, item_count INTEGER DEFAULT 2,
    analytics_visible INTEGER DEFAULT 1, created_at TEXT)");
$sku->exec('CREATE TABLE store_ops_walkin_invoice_items (id INTEGER PRIMARY KEY, invoice_number TEXT, sku TEXT, product_name TEXT, quantity INTEGER, unit_price REAL DEFAULT 100, discount_total REAL DEFAULT 20, line_total REAL DEFAULT 180)');
for ($i=1; $i<=15; $i++) {
    $date = sprintf('2026-09-%02d 01:00:00', $i);
    $pdo->prepare('INSERT INTO whatsapp_orders (id, order_id, created_at) VALUES (?, ?, ?)')->execute([$i, 'D'.$i, $date . '.000000']);
    $pdo->prepare('INSERT INTO whatsapp_order_items (whatsapp_order_id, sku, product_name, quantity) VALUES (?, ?, ?, 1)')->execute([$i, 'TEA', 'Tea']);
    $sku->prepare('INSERT INTO store_ops_walkin_invoices (invoice_number, created_at) VALUES (?, ?)')->execute(['C'.$i, $date]);
    $sku->prepare('INSERT INTO store_ops_walkin_invoice_items (invoice_number, sku, product_name, quantity) VALUES (?, ?, ?, 2)')->execute(['C'.$i, 'COFFEE', 'Coffee']);
}
$pdo->exec("UPDATE whatsapp_orders SET sales_channel = 'walk_in' WHERE id = 1");
$pdo->exec("UPDATE whatsapp_orders SET archived_at = '2026-09-09' WHERE id = 2");
$pdo->exec("UPDATE whatsapp_orders SET status = 'IS_LISTED', payment_status = 'unpaid', pay_later = 1 WHERE id = 3");
$sku->exec("UPDATE store_ops_walkin_invoices SET analytics_visible = 0 WHERE invoice_number = 'C1'");
$sku->exec("INSERT INTO store_ops_walkin_invoices (invoice_number, invoice_type, created_at) VALUES ('COPY', 'whatsapp', '2026-09-16')");
$pdo->exec("UPDATE whatsapp_orders SET status = 'CANCELLED' WHERE id = 4");
$pdo->exec("UPDATE whatsapp_orders SET payment_status = 'canceled' WHERE id = 5");
$pdo->exec("UPDATE whatsapp_orders SET payment_status = '' WHERE id = 6");
$pdo->exec("UPDATE whatsapp_orders SET payment_status = ' PAID ' WHERE id = 7");
$before = [$pdo->query('SELECT total_changes()')->fetchColumn(), $sku->query('SELECT total_changes()')->fetchColumn()];
$history = fn($page=1, $query='', $status='', $archive='active', $channel='all') => jg_direct_order_history($pdo, $sku, $page, 10, $query, $status, $archive, $channel);
$all = $history();
history_expect(29, $all['summary']['orders'], 'Dashboard and counter records combine without printed WhatsApp copies');
history_expect(44, $all['summary']['item_count'], 'Units aggregate across both sources');
history_expect(4300.0, $all['summary']['customer_total'], 'Recorded invoice totals retain discounts and tax');
history_expect(3960.0, $all['summary']['merchandise_total'], 'Merchandise uses net counter subtotal');
$keys=[];
for($page=1;$page<=3;$page++) foreach($history($page)['orders'] as $order) $keys[]=$order['source'].':'.$order['order_id'];
history_expect(29,count(array_unique($keys)),'No records duplicated or skipped across mixed-source pages');
history_expect(['counter:C15','dashboard:D15','counter:C14','dashboard:D14'], array_slice($keys,0,4),'Stable ordering with whole and fractional UTC timestamps');
history_expect(13, $history(channel:'whatsapp')['summary']['orders'], 'WhatsApp channel excludes both types of walk-in');
history_expect(16, $history(channel:'walk_in')['summary']['orders'], 'Walk-ins include dashboard and counter sales, including hidden analytics records');
history_expect(1, $history(archive:'archived')['summary']['orders'], 'Counter receipts are not falsely archived');
history_expect(30, $history(archive:'all')['summary']['orders'], 'All records includes archived dashboard records');
history_expect(1, $history(status:'IS_LISTED')['summary']['orders'], 'Unfulfilled filter excludes completed counter receipts');
history_expect(27, $history(status:'FULFILLED')['summary']['orders'], 'Fulfilled includes counter sales');
history_expect(25, $history(status:'paid')['summary']['orders'], 'Paid combines counter and dashboard sales but excludes cancellations');
history_expect(2, $history(status:'unpaid')['summary']['orders'], 'Unpaid includes pay-later and empty legacy payment states');
history_expect(2, $history(status:'canceled')['summary']['orders'], 'Canceled includes lifecycle cancellations even when the stored payment is paid');
history_expect(40, $history(status:'paid')['summary']['item_count'], 'Paid units count dashboard and counter items');
history_expect(1, $history(status:'paid', archive:'archived')['summary']['orders'], 'Payment and archive filters combine');
history_expect(16, $history(status:'paid', channel:'walk_in')['summary']['orders'], 'Paid walk-ins include dashboard and counter sales');
history_expect(0, $history(status:'unpaid', channel:'walk_in')['summary']['orders'], 'Paid counter invoices never appear in Unpaid');
history_expect(15, $history(status:'paid', query:'COFFEE')['summary']['orders'], 'Payment and item search combine');
$paidKeys = [];
for ($page = 1; $page <= 3; $page++) foreach ($history($page, status:'paid')['orders'] as $order) {
    history_expect('paid', $order['payment_status'], 'Paid filter matches the displayed payment state');
    $paidKeys[] = $order['source'] . ':' . $order['order_id'];
}
history_expect(25, count(array_unique($paidKeys)), 'Payment filtering paginates all matching records without duplication');
history_expect(15, $history(query:'COFFEE')['summary']['orders'], 'SKU search includes invoice items');
history_expect(14, $history(query:'Tea')['summary']['orders'], 'Product search includes dashboard items');
history_expect(1, $history(query:'C15')['summary']['orders'], 'Invoice number search');
history_expect(15, $history(query:'08123')['summary']['orders'], 'Counter phone search');
history_expect(0, $history(query:"' OR 1=1 --")['summary']['orders'], 'Search values stay bound parameters');
history_expect(3, $history(999)['pagination']['page'], 'Out of range pages clamp after merging');
$receipt = jg_direct_order_invoice_detail($sku, 'C15');
history_expect(198.0, $receipt['customer_total'], 'Receipt retains paid total');
history_expect(180.0, $receipt['merchandise_total'], 'Receipt retains discounted merchandise');
history_expect('COFFEE', $receipt['items'][0]['sku'], 'Receipt includes original items');
history_expect(false, $receipt['can_confirm_payment'], 'Counter receipts cannot approve unrelated dashboard payments');
history_expect(false, $receipt['can_archive'], 'Counter receipts cannot archive dashboard orders');
try { jg_direct_order_invoice_detail($sku, 'COPY'); throw new RuntimeException('Copy accepted'); } catch (InvalidArgumentException $e) {}
try { $history(channel:'invalid'); throw new RuntimeException('Invalid filter accepted'); } catch (InvalidArgumentException $e) {}
history_expect($before, [$pdo->query('SELECT total_changes()')->fetchColumn(), $sku->query('SELECT total_changes()')->fetchColumn()], 'History and receipt reads never write to either database');
echo "direct-order-history-test: ok\n";
