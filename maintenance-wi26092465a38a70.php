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
 $out=['ok'=>true,'invoice'=>TARGET_INVOICE,'databases'=>[]];
 foreach(isset($_GET['scope']) ? [(['sku'=>'sku','executive'=>'','partner'=>'partner'][$_GET['scope']] ?? 'sku')] : ['sku','', 'partner'] as $prefix){$pdo=maintenance_connection($prefix);$out['databases'][$prefix?:'executive']=maintenance_scan($pdo);if($prefix==='sku'){
  $s=$pdo->prepare('SELECT * FROM store_ops_walkin_invoices WHERE invoice_number=?');$s->execute([TARGET_INVOICE]);$out['invoice_record']=$s->fetch();
  $s=$pdo->prepare('SELECT * FROM store_ops_walkin_invoice_items WHERE invoice_number=?');$s->execute([TARGET_INVOICE]);$out['items']=$s->fetchAll();
  $out['inventory']=$pdo->query("SELECT sku,tag,brand_id,unit_id,product_id,flavor_id,volume,astra,current_stock,updated_at FROM sku_skus WHERE sku IN ('010103000502','010103001502','010103001602') OR (brand_id=1 AND product_id=3 AND flavor_id IN (5,15,16))")->fetchAll();
  $out['invoice_schema']=$pdo->query('SHOW CREATE TABLE store_ops_walkin_invoices')->fetch();
  $out['items_schema']=$pdo->query('SHOW CREATE TABLE store_ops_walkin_invoice_items')->fetch();
 }}
 echo json_encode($out,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
} catch(Throwable $e){http_response_code(500);echo json_encode(['ok'=>false,'error'=>$e->getMessage(),'partial'=>$out??null]);}
