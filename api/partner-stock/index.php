<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/partner-stock-bootstrap.php';
jg_admin_require_auth_json();

function jg_partner_stock_json(array $payload, int $status=200): never {http_response_code($status);header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');echo json_encode($payload,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);exit;}

$method=strtoupper((string)($_SERVER['REQUEST_METHOD']??'GET'));$action=strtolower(trim((string)($_GET['action']??'overview')));
try{$pdo=jg_partner_stock_db();
    if($method==='GET'&&$action==='proof')jg_partner_stock_stream($pdo,'deposit',(int)($_GET['id']??0));
    if($method==='GET'&&$action==='label')jg_partner_stock_stream($pdo,'label',(int)($_GET['id']??0));
    if($method==='GET'){$partner=strtoupper(trim((string)($_GET['partner']??'')));jg_partner_stock_json(['ok'=>true,'data'=>jg_partner_stock_overview($pdo,$partner)]);}
    if($method!=='POST')jg_partner_stock_json(['ok'=>false,'error'=>'Method not allowed.'],405);
    $multipart=str_contains(strtolower((string)($_SERVER['CONTENT_TYPE']??'')),'multipart/form-data');$r=$multipart?$_POST:json_decode((string)file_get_contents('php://input'),true);$r=is_array($r)?$r:[];$action=strtolower(trim((string)($r['action']??$action)));
    if(in_array($action,['investigate_deposit','approve_deposit','reject_deposit'],true)){$verb=str_replace('_deposit','',$action);$deposit=jg_partner_stock_review_deposit($pdo,(int)($r['deposit_id']??0),$verb,$r['amount']??null,(string)($r['note']??''));jg_partner_stock_json(['ok'=>true,'deposit'=>$deposit,'data'=>jg_partner_stock_overview($pdo,strtoupper((string)($r['partner_code']??'')))]);}
    if($action==='arrange_shipment'){$file=isset($_FILES['label'])&&is_array($_FILES['label'])?$_FILES['label']:[];$order=jg_partner_stock_arrange_shipment($pdo,trim((string)($r['order_id']??'')),$file);jg_partner_stock_json(['ok'=>true,'order'=>$order,'data'=>jg_partner_stock_overview($pdo,strtoupper((string)($r['partner_code']??'')))]);}
    jg_partner_stock_json(['ok'=>false,'error'=>'Unknown partner activity action.'],400);
}catch(InvalidArgumentException $e){jg_partner_stock_json(['ok'=>false,'error'=>$e->getMessage()],422);}catch(RuntimeException $e){jg_partner_stock_json(['ok'=>false,'error'=>$e->getMessage()],409);}catch(Throwable $e){error_log('Partner stock API failed: '.$e->getMessage());jg_partner_stock_json(['ok'=>false,'error'=>'Partner activity is temporarily unavailable.'],500);}
