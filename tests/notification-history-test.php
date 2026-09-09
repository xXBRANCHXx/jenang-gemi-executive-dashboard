<?php
declare(strict_types=1);
// Run the production feed queries against isolated SQLite tables; no remote DB,
// ingestion, confirmation or schema migration runs in this test.
$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$pdo->exec('CREATE TABLE partner_weekly_bill_payments (id INTEGER,bill_id TEXT,partner_code TEXT,amount INTEGER,proof_file_id INTEGER,submitted_at TEXT,status TEXT,confirmed_at TEXT);
CREATE TABLE partner_weekly_bills (bill_id TEXT,period_type TEXT,period_start TEXT,period_end TEXT,due_date TEXT,total_amount INTEGER);
CREATE TABLE partner_weekly_bill_files (id INTEGER,original_name TEXT,mime_type TEXT,size_bytes INTEGER);
CREATE TABLE partner_profiles (code TEXT,name TEXT);
CREATE TABLE partner_weekly_bill_disputes (id INTEGER,dispute_key TEXT,bill_id TEXT,partner_code TEXT,dispute_type TEXT,reason TEXT,created_at TEXT,status TEXT,resolved_at TEXT);
CREATE TABLE partner_deposit_requests (id INTEGER,status TEXT,submitted_at TEXT);
CREATE TABLE partner_orders (id TEXT,order_type TEXT,executive_status TEXT,submitted_at TEXT);');
$pdo->exec("INSERT INTO partner_profiles VALUES ('P1','Partner One');
INSERT INTO partner_weekly_bills VALUES ('B1','calendar_month','2026-08-01','2026-08-31','2026-09-03',1000);
INSERT INTO partner_weekly_bill_files VALUES (1,'proof.png','image/png',100);
INSERT INTO partner_weekly_bill_payments VALUES (1,'B1','P1',500,1,'2026-09-01','pending',NULL),(2,'B1','P1',500,1,'2026-08-31','confirmed','2026-09-01');
INSERT INTO partner_weekly_bill_disputes VALUES (1,'D1','B1','P1','paid','Review','2026-09-01','pending',NULL),(2,'D2','B1','P1','paid','Review','2026-08-31','rejected','2026-09-01');
INSERT INTO partner_deposit_requests VALUES (1,'pending','2026-09-01'),(2,'approved','2026-08-31');
INSERT INTO partner_orders VALUES ('O1','class_b_stock','awaiting_shipment','2026-09-01'),('O2','class_b_stock','arranged','2026-08-31'),('O3','other','arranged','2026-08-31');");
function jg_admin_partner_billing_db(): PDO { return $GLOBALS['pdo']; }
function jg_admin_partner_billing_sync(PDO $pdo): void {}
function jg_admin_partner_billing_period_type($v) { return $v; }
function jg_admin_partner_billing_period_label($a, $b) { return $a . "–" . $b; }
function jg_admin_partner_billing_items(PDO $pdo, string $bill, int $dispute): array { return [['amount'=>250]]; }
function jg_partner_stock_deposit(PDO $pdo, int $id): array {
    return ['id'=>$id,'partner_code'=>'P1','partner_name'=>'Partner One','requested_amount'=>100,'submitted_at'=>'2026-09-01','updated_at'=>'2026-09-01','status'=>$id===1?'pending':'approved','proof_url'=>'/proof','proof_name'=>'proof.png','proof_mime'=>'image/png','proof_size'=>100];
}
function jg_partner_stock_order(PDO $pdo, string $id): array {
    return ['id'=>$id,'partner_code'=>'P1','partner_name'=>'Partner One','total'=>100,'submitted_at'=>'2026-09-01','updated_at'=>'2026-09-01','executive_status'=>$id==='O1'?'awaiting_shipment':'arranged','items'=>[],'recipient_name'=>'Partner One'];
}
foreach (['partner-billing-bootstrap.php'=>'jg_admin_partner_billing_notifications', 'partner-stock-bootstrap.php'=>'jg_partner_stock_notifications'] as $file=>$function) {
    $source = file_get_contents(dirname(__DIR__).'/'.$file);
    $start = strpos($source, 'function '.$function.'(');
    $end = strpos($source, "\nfunction ", $start+1);
    eval(substr($source, $start, $end===false?null:$end-$start));
}
function expect(bool $ok, string $message): void { if (!$ok) throw new RuntimeException($message); }
$pending = jg_admin_partner_billing_notifications('/api/partner-billing/');
$history = jg_admin_partner_billing_notifications('/api/partner-billing/', true);
expect(count($pending)===2, 'Default billing feed must remain pending-only');
expect(count($history)===4, 'History must include completed payment and dispute');
foreach ($history as $event) {
    expect($event['action_required']===($event['status']==='pending'), 'Resolved events cannot expose review actions');
    expect($event['detail_url']==='/partner-sales/?code=P1', 'Historical record must link to correct partner parameter');
}
$stock = jg_partner_stock_notifications($pdo);
$stockHistory = jg_partner_stock_notifications($pdo, true);
expect(count($stock)===2, 'Default stock feed must remain pending-only');
expect(count($stockHistory)===4, 'History must include reviewed deposits and arranged stock orders only');
expect(count(array_filter($stockHistory, fn($e)=>$e['action_required']))===2, 'Only pending stock records allow actions');
echo "PASS: pending feed compatibility, complete retained billing/stock history, resolved action guards and record links.\n";
