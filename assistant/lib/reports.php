<?php
declare(strict_types=1);
namespace JenangMcp;
require_once __DIR__.'/config.php';
function normalize(string $s): string { return strtolower(preg_replace('/[^a-zA-Z0-9]/','',$s) ?? ''); }
function period(array $a, ?\DateTimeImmutable $now=null): array {
    foreach (['start_date','end_date'] as $k) {
        if (!isset($a[$k]) || !is_string($a[$k])) throw new \InvalidArgumentException('Explicit dates are required.');
        $d=\DateTimeImmutable::createFromFormat('!Y-m-d',$a[$k],new \DateTimeZone('Asia/Jakarta'));
        if (!$d || $d->format('Y-m-d')!==$a[$k]) throw new \InvalidArgumentException('Invalid calendar date.'); $dates[$k]=$d;
    }
    $days=(int)$dates['start_date']->diff($dates['end_date'])->format('%r%a');
    if ($days<0 || $days>365) throw new \InvalidArgumentException('Date range must be 1–366 days.');
    $now=($now ?? new \DateTimeImmutable('now'))->setTimezone(new \DateTimeZone('Asia/Jakarta'));
    if ($dates['end_date']->format('Y-m-d')>$now->format('Y-m-d')) throw new \InvalidArgumentException('Future dates are not supported.');
    return ['start_date'=>$a['start_date'],'end_date'=>$a['end_date'],'partial_current_day'=>$a['end_date']===$now->format('Y-m-d'),'from_utc'=>$dates['start_date']->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i:s'),'to_utc'=>$dates['end_date']->modify('+1 day')->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i:s')];
}
require_once __DIR__.'/app-reader.php';
const CATALOG_SQL = 'SELECT s.sku,s.tag,s.volume,u.name AS unit,s.product_id,b.name AS brand,p.name AS product,f.name AS flavor FROM sku_skus s JOIN sku_units u ON u.id=s.unit_id JOIN sku_brands b ON b.id=s.brand_id JOIN sku_products p ON p.id=s.product_id JOIN sku_flavors f ON f.id=s.flavor_id ORDER BY s.sku LIMIT 2001';
function catalog(callable $read,array $c): array {
    $rows=($c['catalog_source'] ?? 'database')==='passive_lookup_cache' ? passiveCatalog($c) : $read('sku',CATALOG_SQL,[]); if (count($rows)>2000) throw new \RuntimeException('Catalog exceeds safe bound.');
    return array_values(array_filter($rows,fn($r)=>in_array($r['brand'],$c['brands'],true)));
}
function resolve(array $rows,string $q): array {
    if ($q==='' || strlen($q)>180) throw new \InvalidArgumentException('Product name or catalog ID is required.');
    $key=normalize($q); $groups=[];
    foreach ($rows as $r) if (in_array($key,[normalize($r['product']),normalize($r['product_id']),normalize($r['sku']),normalize($r['tag'])],true)) {
        $groups[$r['product_id']]=['product_id'=>$r['product_id'],'product'=>$r['product'],'brand'=>$r['brand']];
    }
    if (count($groups)!==1) throw new \InvalidArgumentException(count($groups)>1 ? 'Product is ambiguous; specify exact catalog product ID.' : 'Product is absent from the authorized catalog; use exact product name or SKU.');
    $g=array_values($groups)[0]; $g['variants']=array_values(array_filter($rows,fn($r)=>$r['product_id']===$g['product_id'])); return $g;
}
function sourceSelect(string $source,int $aliasCount=0): string {
    if ($aliasCount<0 || $aliasCount>4000) throw new \InvalidArgumentException('Alias bound exceeded.');
    $where=implode(',',array_fill(0,$aliasCount,'?'));
    return match($source) {
        'marketplace'=>"SELECT platform,account_key,order_id,order_item_hash AS line_id,sku,item_key,status,funds_release_status,quantity,is_free_gift,order_create_time AS sale_at,mirrored_at AS source_updated_at FROM dashboard_order_mirror WHERE deleted_at IS NULL AND platform IN ('shopee','tiktok','tokopedia') AND order_create_time>=? AND order_create_time<? AND (sku IN ($where) OR item_key IN ($where)) ORDER BY order_create_time,id LIMIT 50001",
        'website'=>"SELECT o.platform,o.platform AS account_key,o.order_id,i.id AS line_id,i.sku,o.status,i.quantity,0 AS is_free_gift,o.paid_at AS sale_at,o.updated_at AS source_updated_at FROM website_orders o JOIN website_order_items i ON i.website_order_id=o.id WHERE o.paid_at IS NOT NULL AND o.paid_at>=? AND o.paid_at<? AND i.sku IN ($where) ORDER BY o.paid_at,o.id,i.id LIMIT 50001",
        'direct'=>"SELECT o.sales_channel AS platform,CASE WHEN o.sales_channel='walk_in' THEN 'counter' ELSE 'direct' END AS account_key,o.order_id,i.id AS line_id,i.sku,o.status,o.payment_status,i.quantity,0 AS is_free_gift,COALESCE(o.listed_at,o.created_at) AS sale_at,o.updated_at AS source_updated_at FROM whatsapp_orders o JOIN whatsapp_order_items i ON i.whatsapp_order_id=o.id WHERE o.status IN ('IS_LISTED','IS_BEING_FULFILLED','FULFILLED') AND o.archive_hide_charts=0 AND COALESCE(o.listed_at,o.created_at)>=? AND COALESCE(o.listed_at,o.created_at)<? AND i.sku IN ($where) ORDER BY o.created_at,o.id,i.id LIMIT 50001",
        'partner'=>'SELECT id,partner_code,sku_code,quantity,status,items_json,COALESCE(order_timestamp,created_at) AS sale_at,created_at AS source_updated_at FROM partner_orders WHERE COALESCE(order_timestamp,created_at)>=? AND COALESCE(order_timestamp,created_at)<? ORDER BY id LIMIT 10001',
        default=>throw new \LogicException('Unknown reporting source.')
    };
}
function sourceRows(callable $read,string $source,array $p,array $aliases): array {
    $args=[$p['from_utc'],$p['to_utc'],...$aliases];
    if (in_array($source,['marketplace','website','direct'],true)) {
        return $read('analytics',sourceSelect($source,count($aliases)),$source==='marketplace'?[...$args,...$aliases]:$args);
    }
    $orders=$read('partner',sourceSelect('partner'),[$p['from_utc'],$p['to_utc']]);
    if (count($orders)>10000) throw new \RuntimeException('Partner report bound exceeded.');
    $rows=[];
    foreach ($orders as $o) {
        $items=json_decode($o['items_json'] ?: '[]',true,64,JSON_THROW_ON_ERROR);
        if (!is_array($items)) throw new \RuntimeException('Partner item data invalid.');
        if ($items===[]) $items=[['sku_code'=>$o['sku_code'],'quantity'=>$o['quantity']]];
        foreach ($items as $i=>$item) { $sku=(string)($item['sku_code'] ?? $item['sku'] ?? $o['sku_code']);
            if (!in_array($sku,$aliases,true)) continue;
            $rows[]=['platform'=>'partner','account_key'=>'partner','partner_code'=>$o['partner_code'],'order_id'=>$o['id'],'line_id'=>$i,'sku'=>$sku,'quantity'=>$item['quantity'] ?? 0,'status'=>$o['status'],'is_free_gift'=>false,'sale_at'=>$o['sale_at'],'source_updated_at'=>$o['source_updated_at']];
        }
    } return $rows;
}
function summarySnapshot(array $c,int $year): array {
    $dir=$c['sales_cache_dir'] ?? '';
    if ($dir==='') return [];
    $path=$dir.'/'.hash('sha256','sales-summary-complete-v1-'.$year.'-core').'.json';
    if (!is_file($path) || filesize($path)>20*1024*1024) return [];
    $s=json_decode((string)file_get_contents($path),true);
    if (!is_array($s) || empty($s['meta']['summary_complete'])) return [];
    // Read existing passive cache only; do not call schema, repair, sync or cache writers.
    return ['snapshot_at'=>$s['meta']['snapshot_at'] ?? null,'note'=>'Historical dashboard cache metadata; not freshness of this direct query.','sync'=>array_intersect_key($s['sync_status'] ?? [],array_flip(['last_sync_finished_at','last_sync_started_at','stale_after_seconds','accounts_ok','accounts_checked']))];
}
function productReport(callable $read,array $c,array $a,?\DateTimeImmutable $now=null): array {
    $allowed=['product','start_date','end_date','accounts'];
    if (array_diff(array_keys($a),$allowed)) throw new \InvalidArgumentException('Unknown report arguments.');
    if (!is_string($a['product'] ?? null)) throw new \InvalidArgumentException('Product must be a string.');
    $p=period($a,$now);
    if (($c['catalog_source'] ?? '')==='passive_lookup_cache') $c['_catalog_snapshot']=passiveCatalogPayload($c);
    $product=resolve(catalog($read,$c),$a['product']);
    $accounts=$a['accounts'] ?? $c['accounts'];
    if (!is_array($accounts) || $accounts===[] || count($accounts)!==count(array_unique($accounts,SORT_REGULAR)) || count($accounts)>30 || array_filter($accounts,fn($v)=>!is_string($v)) || array_diff($accounts,$c['accounts'])) throw new \InvalidArgumentException('Account selection is unauthorized or invalid.');
    $map=[];
    foreach ($product['variants'] as $v) foreach ([$v['sku'],$v['tag']] as $alias) $map[$alias]=$v;
    $units=0;$orders=[];$variants=[];$accountUnits=[];$sources=[];$warnings=[];$excluded=0;$directUnpaid=0;
    foreach (['marketplace','website','direct','partner'] as $source) {
        if ($source==='partner' && empty($c['partners'])) {
            $sources[$source]=['status'=>'excluded_by_grant','freshness'=>'unknown'];
            $warnings[]='Partner sales are excluded by this connection grant, not zero sales.';
            continue;
        }
        try {
            $rows=sourceRows($read,$source,$p,array_keys($map));
            if (count($rows)>50000) throw new \RuntimeException('Report exceeds source bound.');
            $local=['units'=>0,'orders'=>[],'variants'=>[],'accounts'=>[],'excluded'=>0,'unpaid'=>0,'seen'=>[],'max_updated'=>null];
            foreach ($rows as $r) {
                $account=(string)$r['account_key']; if (!in_array($account,$accounts,true)) continue;
                if ($source==='partner' && !in_array($r['partner_code'],$c['partners'],true)) continue;
                $v=$map[(string)($r['sku'] ?? '')] ?? $map[(string)($r['item_key'] ?? '')] ?? null; if (!$v) continue;
                $status=strtoupper((string)($r['status'] ?? '')).' '.strtoupper((string)($r['funds_release_status'] ?? ''));
                // Partner summary includes open receivables; direct includes Pay Later. Do not impose paid-only semantics.
                $excludedStatus=$source==='marketplace' ? preg_match('/CANCEL|UNPAID|REFUND|RETURN|REJECT|FAILED|EXPIRED|CLOSED|VOID/',$status) : preg_match('/CANCEL|VOID/',$status);
                $qty=max(0,(int)$r['quantity']);
                if ($excludedStatus || !empty($r['is_free_gift'])) { $local['excluded']+=$qty;continue; }
                $key=json_encode([$source,$r['platform'],$account,(string)$r['order_id'],(string)$r['line_id']]);
                if (isset($local['seen'][$key])) throw new \RuntimeException('Duplicate source line detected.'); $local['seen'][$key]=true;
                if ($qty===0) continue;
                $orderKey=json_encode([$source,$r['platform'],$account,(string)($r['order_id'] ?: $r['line_id'])]);
                $local['orders'][$orderKey]=true; $local['units']+=$qty;
                $local['variants'][$v['sku']]=($local['variants'][$v['sku']] ?? 0)+$qty;
                $local['accounts'][$account]=($local['accounts'][$account] ?? 0)+$qty;
                if ($source==='direct' && ($r['payment_status'] ?? '')==='unpaid') $local['unpaid']+=$qty;
                $updated=$r['source_updated_at'] ?? null;
                if ($updated && (!$local['max_updated'] || $updated>$local['max_updated'])) $local['max_updated']=$updated;
            }
            $units+=$local['units'];$orders+=$local['orders'];$excluded+=$local['excluded'];$directUnpaid+=$local['unpaid'];
            foreach ($local['variants'] as $k=>$n) $variants[$k]=($variants[$k] ?? 0)+$n;
            foreach ($local['accounts'] as $k=>$n) $accountUnits[$k]=($accountUnits[$k] ?? 0)+$n;
            $sources[$source]=['status'=>'queried','units'=>$local['units'],'latest_matching_row_updated_at'=>$local['max_updated'],'freshness'=>'unknown'];
        } catch (\Throwable) { $sources[$source]=['status'=>'unavailable','freshness'=>'unknown']; $warnings[]=$source.' source unavailable or exceeds safe bounds; partial totals only.'; }
    }
    $queried=count(array_filter($sources,fn($s)=>$s['status']==='queried'));
    $applicable=count(array_filter($sources,fn($s)=>$s['status']!=='excluded_by_grant'));
    if ($queried===0) throw new \RuntimeException('All authorized sales sources are unavailable; no total can be reported.');
    $complete=$queried===$applicable;
    $snapshot=summarySnapshot($c,(int)substr($p['end_date'],0,4));
    if (($c['catalog_source'] ?? '')==='passive_lookup_cache') $warnings[]='Catalog identities and aliases come from the dashboard saved SKU lookup, not a live catalog query. Product IDs beginning cache: are derived reporting identities, not official catalog IDs.';
    $warnings[]='This report contains unit/order counts only. Zero product units is not zero revenue, annualized revenue or an all-business total.';
    $warnings[]='Marketplace data comes from the dashboard mirror; row update time does not establish per-account sync completeness.';
    $warnings[]='Catalog SKU and tag aliases count one sale unit per recorded quantity. Unmapped bundle aliases are not expanded.';
    if ($directUnpaid) $warnings[]='Includes '.$directUnpaid.' direct Pay Later units under dashboard sales rules.';
    $variantRows=[]; foreach ($product['variants'] as $v) $variantRows[]=$v+['units'=>$variants[$v['sku']] ?? 0];
    return ['request_id'=>bin2hex(random_bytes(12)),'generated_at'=>gmdate(DATE_ATOM),'business_timezone'=>'Asia/Jakarta','period'=>$p,'data'=>['measurement'=>'product_units_and_distinct_orders','monetary_totals_supported'=>false,'total_status'=>$complete?'complete_for_grant':'observed_partial_subtotal','product'=>$product['product'],'product_id'=>$product['product_id'],'brand'=>$product['brand'],'units'=>$units,'orders'=>count($orders),'variants'=>$variantRows,'units_by_account'=>$accountUnits,'excluded_units'=>$excluded,'direct_unpaid_units'=>$directUnpaid,'accounts_selected'=>array_values($accounts)],'provenance'=>['adapter_version'=>VERSION,'dashboard_url'=>$c['base_url'].'/dashboard/?view=overview','sources'=>$sources,'database_access_mode'=>$c['database_access_mode'] ?? 'dedicated_select_only','catalog_source'=>$c['catalog_source'] ?? 'database','catalog_snapshot_at'=>($c['catalog_source'] ?? '')==='passive_lookup_cache'?passiveCatalogTime($c):null,'last_complete_dashboard_snapshot'=>$snapshot,'date_basis'=>['marketplace'=>'order_create_time','website'=>'paid_at','direct'=>'listed_at or created_at','partner'=>'order_timestamp or created_at']],'completeness'=>['sources_queried'=>$complete,'business_total_verified'=>false,'per_account_sync_verified'=>false,'scoped_to_grant'=>true],'warnings'=>$warnings];
}
