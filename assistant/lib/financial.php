<?php
declare(strict_types=1);
namespace JenangMcp;
function financialSelect(string $source,string $partnerBasis='order_time'): string {
    $partnerDate=partnerDateColumn($partnerBasis);
    return match($source){
        'marketplace'=>"SELECT platform AS channel,account_key AS account,order_id,order_item_hash AS line_id,sku,item_key,status,funds_release_status,quantity,is_free_gift,revenue AS line_revenue,order_net_revenue AS order_revenue,brand_name AS brand,base_product_name AS product,flavor_name AS flavor,order_create_time AS sale_at,mirrored_at AS updated_at FROM dashboard_order_mirror WHERE deleted_at IS NULL AND platform IN ('shopee','tiktok','tokopedia') AND order_create_time>=? AND order_create_time<? ORDER BY order_create_time,id LIMIT 50001",
        'website'=>"SELECT o.platform AS channel,o.platform AS account,o.order_id,i.id AS line_id,i.sku,o.status,i.quantity,0 AS is_free_gift,i.unit_net_price*i.quantity AS line_revenue,o.net_revenue AS order_revenue,i.product_name AS product,i.option_name AS flavor,o.paid_at AS sale_at,o.updated_at FROM website_orders o JOIN website_order_items i ON i.website_order_id=o.id WHERE o.paid_at IS NOT NULL AND o.paid_at>=? AND o.paid_at<? ORDER BY o.paid_at,o.id,i.id LIMIT 50001",
        'direct'=>"SELECT o.sales_channel AS channel,CASE WHEN o.sales_channel='walk_in' THEN 'counter' ELSE 'direct' END AS account,o.order_id,i.id AS line_id,i.sku,o.status,o.payment_status,i.quantity,0 AS is_free_gift,CASE WHEN i.line_total>0 THEN i.line_total ELSE GREATEST(0,i.quantity*i.unit_price-i.discount_total) END AS line_revenue,o.merchandise_total AS order_revenue,i.brand_name AS brand,i.base_product_name AS product,i.flavor_name AS flavor,COALESCE(o.listed_at,o.created_at) AS sale_at,o.updated_at FROM whatsapp_orders o JOIN whatsapp_order_items i ON i.whatsapp_order_id=o.id WHERE o.status IN ('IS_LISTED','IS_BEING_FULFILLED','FULFILLED') AND o.archive_hide_charts=0 AND COALESCE(o.listed_at,o.created_at)>=? AND COALESCE(o.listed_at,o.created_at)<? ORDER BY COALESCE(o.listed_at,o.created_at),o.id,i.id LIMIT 50001",
        'partner'=>"SELECT id AS order_id,partner_code AS account,marketplace_platform AS channel,sku_code AS sku,quantity,status,revenue_total AS order_revenue,items_json,brand_name AS brand,product_name AS product,$partnerDate AS sale_at,updated_at FROM partner_orders WHERE $partnerDate>=? AND $partnerDate<? ORDER BY id LIMIT 50001",
        default=>throw new \LogicException('Unknown financial source.')
    };
}
function scaledDecimal(mixed $value,int $scale=2): int {
    if(!preg_match('/^(-?)([0-9]{1,13})(?:\.([0-9]{1,6}))?$/D',(string)$value,$m))throw new \RuntimeException('Invalid or excessive decimal amount.');
    $fraction=$m[3] ?? '';$abs=(int)$m[2]*(10**$scale)+(int)str_pad(substr($fraction,0,$scale),$scale,'0');
    if(strlen($fraction)>$scale&&(int)$fraction[$scale]>=5)$abs++;
    if(!is_int($abs)||$abs>8000000000000000)throw new \RuntimeException('Decimal amount exceeds safe bound.');
    return $m[1]==='-'?-$abs:$abs;
}
function decimalString(int $v,int $scale=2): string {return ($v<0?'-':'').intdiv(abs($v),10**$scale).'.'.str_pad((string)(abs($v)%(10**$scale)),$scale,'0',STR_PAD_LEFT);}
function safeAdd(int $a,int $b): int {if(abs($a)>8000000000000000-abs($b))throw new \RuntimeException('Aggregate amount exceeds safe bound.');return $a+$b;}
function financialRows(array $c,callable $fetch,array $p): array {
    $lookup=[];$catalogAsOf=null;
    try{$b=$c;$b['brands']=array_values(array_unique(array_column(passiveCatalogPayload($c)['lookup'],'brand_name')));foreach(passiveCatalog($b) as $r)foreach([$r['sku'],$r['tag']] as $alias)if($alias!=='')$lookup[$alias]=$r;$catalogAsOf=passiveCatalogTime($c);}catch(\Throwable){}
    $lines=[];$orders=[];$sources=[];$seen=[];$unmapped=0;
    foreach(['marketplace','website','direct','partner'] as $source){
        try{$rows=$fetch($source,$p);if(count($rows)>50000)throw new ReportingSourceUnavailable($source,['reason'=>'scan_limit']);}
        catch(\Throwable $e){$failure=new ReportingSourceUnavailable($source,sourceFailure($e));$sources[$source]=['status'=>'unavailable','diagnostics'=>$failure->diagnostics,'upstream_sync_completeness'=>'unknown'];continue;}
        $latest=null;
        foreach($rows as $r){
            $status=strtoupper((string)($r['status'] ?? ''));
            if($source==='marketplace'?(preg_match('/CANCEL|UNPAID|REFUND|RETURN|REJECT|FAILED|EXPIRED|CLOSED|VOID/',$status)||preg_match('/CANCEL|^VOID(?:ED)?$/',strtoupper((string)($r['funds_release_status'] ?? '')))):preg_match('/CANCEL|VOID/',$status))continue;
            $orderKey=hash('sha256',json_encode([$source,$r['channel'],$r['account'],(string)($r['order_id'] ?: ($r['line_id'] ?? ''))]));
            $date=(new \DateTimeImmutable($r['sale_at'],new \DateTimeZone('UTC')))->setTimezone(new \DateTimeZone('Asia/Jakarta'))->format('Y-m-d');
            $base=['sale_date'=>$date,'source'=>$source,'channel'=>(string)$r['channel'],'account'=>(string)$r['account'],'order_key'=>$orderKey];
            if(!isset($orders[$orderKey]))$orders[$orderKey]=$base+['units'=>0,'seller_revenue'=>'0.00','_order_amount'=>null,'_line_sum'=>0];
            $ord=&$orders[$orderKey];$amount=scaledDecimal($r['order_revenue']);$ord['_order_amount']=$ord['_order_amount']===null?$amount:max($ord['_order_amount'],$amount);
            $items=[$r];
            if($source==='partner'){
                $items=json_decode($r['items_json'] ?: '[]',true,64,JSON_THROW_ON_ERROR);
                if(!is_array($items)||!array_is_list($items)||count($items)>2000)throw new \RuntimeException('Partner item structure unavailable.');
                if($items===[])$items=[['sku_code'=>$r['sku'],'quantity'=>$r['quantity'],'line_revenue'=>$r['order_revenue']]];
            }
            foreach($items as $i=>$item){
                if(!is_array($item))throw new \RuntimeException('Invalid sale item.');
                $id=$source==='partner'?(string)$i:(string)$item['line_id'];$key=$orderKey.':'.$id;
                if(isset($seen[$key]))throw new \RuntimeException('Duplicate sale line.');$seen[$key]=true;
                $sku=(string)($item['sku_code'] ?? $item['sku'] ?? '');$identity=$lookup[$sku] ?? $lookup[(string)($item['item_key'] ?? '')] ?? null;
                $qty=max(0,(int)($item['quantity'] ?? 0));if(!empty($item['is_free_gift']))$qty=0;
                if($source==='partner'){
                    $lineAmount=scaledDecimal($item['line_revenue'] ?? '0');
                    if($lineAmount<=0)$lineAmount=scaledDecimal($item['unit_revenue'] ?? $item['partner_price'] ?? $item['partner_unit_price'] ?? '0')*$qty;
                    if(!is_int($lineAmount))throw new \RuntimeException('Partner amount overflow.');$lineAmount=max(0,$lineAmount);
                }else $lineAmount=scaledDecimal($item['line_revenue']);
                $ord['units']=safeAdd($ord['units'],$qty);$ord['_line_sum']=safeAdd($ord['_line_sum'],$lineAmount);
                if(!$identity)$unmapped++;
                $lines[]=$base+['sku'=>$identity['sku'] ?? $sku,'brand'=>$identity['brand'] ?? (string)($item['brand'] ?? $r['brand'] ?? ''),'product'=>$identity['product'] ?? (string)($item['product'] ?? $r['product'] ?? ''),'flavor'=>$identity['flavor'] ?? (string)($item['flavor'] ?? $r['flavor'] ?? ''),'volume'=>$identity['volume'] ?? null,'unit'=>$identity['unit'] ?? null,'units'=>$qty,'line_revenue'=>decimalString($lineAmount)];
                if(count($lines)>100000)throw new \RuntimeException('Sales scan bound exceeded. Narrow dates.');
            }
            if(($r['updated_at'] ?? null)&&(!$latest||$r['updated_at']>$latest))$latest=$r['updated_at'];unset($ord);
        }
        $sources[$source]=['status'=>'queried','stored_rows'=>count($rows),'latest_matching_row_updated_at'=>$latest,'upstream_sync_completeness'=>'unknown'];
    }
    $complete=count(array_filter($sources,fn($v)=>$v['status']==='queried'))===4;
    if(!array_filter($sources,fn($v)=>$v['status']==='queried'))throw new ReportingSourceUnavailable('all_sales');
    foreach($orders as &$o){$source=$o['source'];$v=$o['_order_amount'];if(($source==='marketplace'&&$v===0)||($source==='partner'&&$v<=0))$v=$o['_line_sum'];$o['seller_revenue']=decimalString($v);unset($o['_order_amount'],$o['_line_sum']);}unset($o);
    return ['lines'=>$lines,'orders'=>array_values($orders),'provenance'=>['sources'=>$sources,'sources_complete'=>$complete,'total_status'=>$complete?'complete_for_stored_sources':'observed_partial_subtotal','date_basis'=>salesDateBasis($p),'catalog_snapshot_at'=>$catalogAsOf,'unmapped_sale_lines'=>$unmapped,'upstream_sync_verified'=>false,'cross_database_snapshot_atomic'=>false,'business_consolidation_verified'=>false,'recognition'=>'Active recorded seller/merchandise sales under source rules; direct and partner unpaid receivables included; excludes direct shipping. Partner records are a separate source; cross-channel duplicates are not reconciled.'],'warnings'=>[partnerDateWarning($p),'These are stored sales observations, not cash receipts or profit. No upstream refresh was performed.','Line revenue and whole-order seller revenue are different metrics; never sum repeated physical order totals.','Size/flavor filters depend on saved catalog mapping; unmapped lines have null size/unit and remain in unfiltered order totals.','Consolidated channel-record totals are not audited business revenue: upstream completeness and cross-channel duplication remain unverified.', $complete?'All four stored sources queried.':'A required source is unavailable; amounts/units are observed partial subtotals only. Missing sources are not zero.']];
}
