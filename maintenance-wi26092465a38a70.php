<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';
jg_admin_require_auth_json();
header('Content-Type: application/json');
header('Cache-Control: no-store');
if (time() > 1790324618 || !hash_equals('b0716eb11e5ec4605c91dbd4d02e1b0955375fc7b0294d9a3d2fea1ff68983eb', hash('sha256', (string) ($_SERVER['HTTP_X_MAINTENANCE_KEY'] ?? '')))) { http_response_code(404); exit; }
session_write_close();
require_once __DIR__ . '/config.php';
const TARGET_INVOICE = 'WI26092465A38A70';
function maintenance_connection(string $prefix): PDO {
 $config = jg_dashboard_load_local_config();
 if ($prefix === 'ingest') {
  return new PDO('mysql:host=localhost;port=3306;dbname=u558678012_jg_api_ingest;charset=utf8mb4', 'u558678012_vincentbranch', (string) ($_SERVER['HTTP_X_INGEST_DB_PASSWORD'] ?? ''), [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES=>false]);
 }
 $p = $prefix === '' ? 'db_' : $prefix . '_db_';
 return new PDO('mysql:host=' . (in_array($config[$p.'host'], ['local.server', 'local.server:3306'], true) ? 'localhost' : $config[$p.'host']) . ';port=' . ($config[$p.'port'] ?? '3306') . ';dbname=' . $config[$p.'name'] . ';charset=utf8mb4', $config[$p.'user'], $config[$p.'password'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES=>false]);
}
function maintenance_scan(PDO $pdo): array {
 $tables=$pdo->query("SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE'")->fetchAll();
 $columns=$pdo->query("SELECT TABLE_NAME,COLUMN_NAME,DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND DATA_TYPE IN ('char','varchar','tinytext','text','mediumtext','longtext','json')")->fetchAll();
 $grouped=[];foreach($columns as $c){$grouped[$c['TABLE_NAME']][]=$c;}
 $matches=[];
 foreach($grouped as $table=>$cols){
  $conditions=[];$params=[];
  foreach($cols as $c){$column=str_replace('`','``',$c['COLUMN_NAME']);$conditions[]='`'.$column.'` LIKE ?';$params[]='%'.TARGET_INVOICE.'%';}
  $s=$pdo->prepare('SELECT COUNT(*) FROM `'.str_replace('`','``',$table).'` WHERE '.implode(' OR ',$conditions));$s->execute($params);$count=(int)$s->fetchColumn();
  if($count){$matches[]=['table'=>$table,'count'=>$count];}
 }
 return ['database'=>$pdo->query('SELECT DATABASE()')->fetchColumn(),'tables_checked'=>count($tables),'matches'=>$matches,'tables'=>$tables];
}
try {
 if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  $input=json_decode(file_get_contents('php://input'),true);
  if (($input['action'] ?? '') !== 'delete_and_restore' || ($input['invoice'] ?? '') !== TARGET_INVOICE) {throw new RuntimeException('Invalid fixed-invoice removal request.');}
  require __DIR__ . '/maintenance-wi-stock.php';
  $pdo=maintenance_connection('sku');
  $pdo->beginTransaction();
  try {
   $s=$pdo->prepare('SELECT * FROM store_ops_walkin_invoices WHERE invoice_number=? FOR UPDATE');$s->execute([TARGET_INVOICE]);$invoice=$s->fetch();
   if (!$invoice) {$pdo->rollBack();echo json_encode(['ok'=>true,'already_absent'=>true,'stock_restored'=>false]);exit;}
   if ($invoice['customer_name']!=='albert' || $invoice['payment_method']!=='Cash' || $invoice['invoice_type']!=='walk_in' || (string)$invoice['total']!=='138700.00' || (int)$invoice['item_count']!==3 || $invoice['created_at']!=='2026-09-24 07:18:06') {throw new RuntimeException('Invoice changed; no modification made.');}
   $s=$pdo->prepare('SELECT * FROM store_ops_walkin_invoice_items WHERE invoice_number=? ORDER BY id FOR UPDATE');$s->execute([TARGET_INVOICE]);$items=$s->fetchAll();
   $expected=[41=>'010103000502',42=>'010103001502',43=>'010103001602'];
   if (count($items)!==3) {throw new RuntimeException('Unexpected item count.');}
   foreach($items as $item){if (($expected[(int)$item['id']]??null)!==$item['sku'] || (int)$item['quantity']!==1) {throw new RuntimeException('Invoice products changed.');}}
   $stockItems=array_map(static fn(array $r):array=>['sku'=>$r['sku'],'quantity'=>(int)$r['quantity']],$items);
   $restored=jg_store_ops_astra_apply_addition($pdo,$stockItems,gmdate('Y-m-d H:i:s'));
   if (count($restored)!==3 || array_sum(array_column($restored,'base_quantity'))!==3) {throw new RuntimeException('Unexpected stock mapping.');}
   foreach($restored as $line){if($line['stock_sku']!==$line['selling_sku'] || $line['stock_after']-$line['stock_before']!==1){throw new RuntimeException('Unexpected stock restoration.');}}
   $s=$pdo->prepare('DELETE FROM store_ops_walkin_invoice_items WHERE invoice_number=? AND id IN (41,42,43)');$s->execute([TARGET_INVOICE]);$deletedItems=$s->rowCount();
   $s=$pdo->prepare('DELETE FROM store_ops_walkin_invoices WHERE invoice_number=?');$s->execute([TARGET_INVOICE]);$deletedInvoices=$s->rowCount();
   if($deletedItems!==3 || $deletedInvoices!==1){throw new RuntimeException('Unexpected deletion count.');}
   $pdo->commit();
   echo json_encode(['ok'=>true,'deleted_invoices'=>$deletedInvoices,'deleted_items'=>$deletedItems,'restored'=>$restored]);exit;
  }catch(Throwable $e){if($pdo->inTransaction()){$pdo->rollBack();}throw $e;}
 }

 $out=['ok'=>true,'invoice'=>TARGET_INVOICE,'databases'=>[]];
 foreach(isset($_GET['scope']) ? [(['sku'=>'sku','executive'=>'','partner'=>'partner','ingest'=>'ingest'][$_GET['scope']] ?? 'sku')] : ['sku','', 'partner'] as $prefix){$pdo=maintenance_connection($prefix);$out['databases'][$prefix?:'executive']=maintenance_scan($pdo);if($prefix==='sku'){
  $s=$pdo->prepare('SELECT * FROM store_ops_walkin_invoices WHERE invoice_number=?');$s->execute([TARGET_INVOICE]);$out['invoice_record']=$s->fetch();
  $s=$pdo->prepare('SELECT * FROM store_ops_walkin_invoice_items WHERE invoice_number=?');$s->execute([TARGET_INVOICE]);$out['items']=$s->fetchAll();
  $out['inventory']=$pdo->query("SELECT sku,tag,brand_id,unit_id,product_id,flavor_id,volume,astra,current_stock,updated_at FROM sku_skus WHERE sku IN ('010103000502','010103001502','010103001602') OR (brand_id=1 AND product_id=3 AND flavor_id IN (5,15,16))")->fetchAll();
  $out['foreign_keys']=$pdo->query("SELECT TABLE_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IN ('store_ops_walkin_invoices','store_ops_walkin_invoice_items')")->fetchAll();
  $out['invoice_schema']=$pdo->query('SHOW CREATE TABLE store_ops_walkin_invoices')->fetch();
  $out['items_schema']=$pdo->query('SHOW CREATE TABLE store_ops_walkin_invoice_items')->fetch();
 }}
 echo json_encode($out,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
} catch(Throwable $e){http_response_code(500);echo json_encode(['ok'=>false,'error'=>$e->getMessage(),'partial'=>$out??null]);}
