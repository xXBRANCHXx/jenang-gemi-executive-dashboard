<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/../lib/rpc.php';
use function JenangMcp\{period,queryTable,annualizeSales,financialSelect,sourceSelect,productReport,tableQuerySpec,tools};
$n=0;
function expect(bool $yes,string $why):void{global $n;if(!$yes)throw new RuntimeException($why);$n++;}
$c=['enabled'=>true,'table_access_approved'=>true,'table_families'=>JenangMcp\TABLE_FAMILIES,'_actor_scope'=>JenangMcp\TABLE_SCOPE,'brands'=>['ZERO'],'accounts'=>['partner'],'partners'=>['P'],'catalog_source'=>'passive_lookup_cache','base_url'=>'https://admin.jenanggemi.com'];
$c['_catalog_snapshot']=['saved_at'=>'2026-10-01T00:00:00Z','lookup'=>[['sku'=>'A','tag'=>'A','brand_name'=>'ZERO','base_product_name'=>'Drops 4X','product_key'=>'drops4x','flavor_name'=>'Plain','volume'=>5,'unit_name'=>'ml']]];
$raw=[];
// Local-form WIB/WITA/WIT values are deliberately left untouched. created_at is UTC.
foreach([['wib','2026-10-01 09:37:00','2026-10-01 02:38:12'],['wita','2026-10-01 10:41:00','2026-10-01 02:42:08'],['wit','2026-10-01 11:43:00','2026-10-01 02:43:28'],['utc','2026-10-01 02:00:00','2026-10-01 02:01:00'],['early','2026-10-01 01:00:00','2026-09-30 18:00:00'],['previous','2026-09-30 23:59:00','2026-09-30 16:59:59']] as [$id,$event,$recorded])$raw[]=['order_id'=>$id,'channel'=>'partner','account'=>'P','status'=>'FULFILLED','sku'=>'A','quantity'=>1,'order_revenue'=>'57500.00','items_json'=>'[]','event'=>$event,'recorded'=>$recorded,'updated_at'=>$recorded];
$fetch=function($source,$p)use($raw){if($source!=='partner')return [];$rows=[];foreach($raw as $r){$at=$p['partner_date_basis']==='recorded_at'?$r['recorded']:$r['event'];if($at>=$p['from_utc']&&$at<$p['to_utc']){$r['sale_at']=$at;$rows[]=$r;}}return $rows;};
$dates=['start_date'=>'2026-10-01','end_date'=>'2026-10-01'];
$q=['table'=>'sales_orders',...$dates,'partner_date_basis'=>'recorded_at','group_by'=>['sale_date'],'metrics'=>[['function'=>'sum','column'=>'seller_revenue','as'=>'money'],['function'=>'count','as'=>'orders']]];
$r=queryTable($c,$q,null,$fetch);expect($r['data']['rows']===[['sale_date'=>'2026-10-01','money'=>'287500.00','orders'=>5]],'recording time covers all local producers plus valid UTC and before07WIB, excludes previousday');
expect($r['provenance']['date_basis']['partner_date_basis']==='recorded_at'&&str_contains($r['provenance']['date_basis']['partner'],'created_at UTC'),'query exposes chosen recording basis');
$q['table']='sales_lines';$q['metrics']=[['function'=>'sum','column'=>'units','as'=>'sold_units']];expect(queryTable($c,$q,null,$fetch)['data']['rows'][0]['sold_units']===5,'units share order money recording-date window');
$now=new DateTimeImmutable('2026-10-01T11:25:00+07:00');
$a=annualizeSales($c,['month'=>'2026-10','basis'=>'elapsed_time','partner_date_basis'=>'recorded_at'],null,$fetch,$now);
expect($a['data']['actual_observed_sales_revenue']==='287500.00'&&$a['data']['partner_date_basis']==='recorded_at','elapsed recordingtime includes true recordedrows before cutoff');
expect($a['data']['elapsed_seconds']===41100&&$a['data']['cutoff_at']==='2026-10-01T11:25:00+07:00','exact elapsed UTCcutoff');
$event=annualizeSales($c,['month'=>'2026-10','basis'=>'elapsed_time'],null,$fetch,$now);
expect($event['data']['actual_observed_sales_revenue']==='172500.00'&&$event['data']['partner_date_basis']==='order_time','default event basis preserved, genuine UTC producer unchanged');
expect(!$event['provenance']['date_basis']['partner_order_time_timezone_verified']&&str_contains(implode(' ',$event['warnings']),'incorrect offset'),'default historical uncertainty explicit');
$completed=annualizeSales($c,['month'=>'2026-10','partner_date_basis'=>'recorded_at'],null,$fetch,$now);expect($completed['data']['status']==='insufficient_completed_history'&&$completed['data']['partner_date_basis']==='recorded_at','firstday completed history not fabricated');
$atNextDay=new DateTimeImmutable('2026-10-02T01:00:00+07:00');$completed=annualizeSales($c,['month'=>'2026-10','partner_date_basis'=>'recorded_at'],null,$fetch,$atNextDay);expect($completed['data']['actual_observed_sales_revenue']==='287500.00'&&$completed['data']['cutoff_at']==='2026-10-02T00:00:00+07:00','completedday uses nextJakarta midnight, not07WIB');
foreach(['recorded_at','order_time'] as $basis){$sql=financialSelect('partner',$basis);$unit=sourceSelect('partner',0,$basis);$column=$basis==='recorded_at'?'created_at':'COALESCE(order_timestamp,created_at)';expect(str_contains($sql,$column.' AS sale_at')&&str_contains($unit,$column.' AS sale_at'),'money and product fixed SQL same basis '.$basis);expect(!str_contains($sql,'INTERVAL')&&!str_contains($unit,'INTERVAL'),'never global timestamp shift '.$basis);}
// Product tool retains its narrower partner/account grant, but uses the same selected UTC dates.
$read=function($db,$sql,$args)use($raw){if($db==='analytics')return [];$recording=str_contains($sql,'items_json,created_at AS sale_at');$rows=[];foreach($raw as $r){$at=$recording?$r['recorded']:$r['event'];if($at>=$args[0]&&$at<$args[1])$rows[]=['id'=>$r['order_id'],'partner_code'=>'P','sku_code'=>'A','quantity'=>1,'status'=>'FULFILLED','items_json'=>'[]','sale_at'=>$at,'source_updated_at'=>$r['updated_at']];}return $rows;};
$p=productReport($read,$c,['product'=>'Drops 4X',...$dates,'partner_date_basis'=>'recorded_at'],$now);expect($p['data']['units']===5&&$p['provenance']['date_basis']['partner_date_basis']==='recorded_at','product units same recording basis');
foreach(['foo',7,null] as $invalid){try{period([...$dates,'partner_date_basis'=>$invalid],$now);$thrown=false;}catch(InvalidArgumentException){$thrown=true;}expect($thrown,'invalid basis rejected');}
try{tableQuerySpec(['table'=>'partner_orders','partner_date_basis'=>'recorded_at']);$thrown=false;}catch(InvalidArgumentException){$thrown=true;}expect($thrown,'physical fields never silently rebased');
foreach(tools($c) as $tool)if(in_array($tool['name'],['jg_query_table','jg_annualize_sales','jg_product_report'],true))expect($tool['inputSchema']['properties']['partner_date_basis']['enum']===['order_time','recorded_at'],'discoverable choice '.$tool['name']);
echo json_encode(['checks'=>$n,'recording_time_sales'=>'287500.00','mixed_producers_preserved'=>true,'fixtures_only'=>true]).PHP_EOL;
