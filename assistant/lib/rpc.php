<?php
declare(strict_types=1);
namespace JenangMcp;
require_once __DIR__.'/reports.php';
function tools(): array {
    $empty=['type'=>'object','additionalProperties'=>false,'properties'=>(object)[]];
    $out=['type'=>'object','properties'=>['data'=>['type'=>'object']],'required'=>['data']];
    $base=['annotations'=>['readOnlyHint'=>true,'destructiveHint'=>false,'idempotentHint'=>true,'openWorldHint'=>false],'_meta'=>['securitySchemes'=>[['type'=>'oauth2','scopes'=>[SCOPE]]]],'outputSchema'=>$out];
    return [
        $base+['name'=>'jg_get_context','title'=>'Jenang Gemi reporting access','description'=>'Show active identity, granted account/brand/partner scope and implemented capabilities. No business writes or refresh.','inputSchema'=>$empty],
        $base+['name'=>'jg_resolve_product','title'=>'Resolve Jenang Gemi product','description'=>'Resolve exact product name, reporting identity or SKU/tag using the configured catalog source. Cached identities are marked cache: and carry their catalog as-of time. Never guesses ambiguous names.','inputSchema'=>['type'=>'object','properties'=>['product'=>['type'=>'string','minLength'=>1,'maxLength'=>180]],'required'=>['product'],'additionalProperties'=>false]],
        $base+['name'=>'jg_product_report','title'=>'Jenang Gemi product sales','description'=>'UNIT/ORDER COUNTS ONLY; never money, revenue, annualized revenue or all-business sales. Do not use this tool as a proxy for monetary questions. Count units/orders for any exact authorized product and explicit inclusive Asia/Jakarta dates (max366days). Includes active marketplace orders, website paid receipts, direct Pay Later, partner receivables under dashboard rules. Excludes cancelled marketplace orders and gifts. Reports partial sources/freshness; does not refresh or repair.','inputSchema'=>['type'=>'object','properties'=>['product'=>['type'=>'string','minLength'=>1,'maxLength'=>180],'start_date'=>['type'=>'string','pattern'=>'^\\d{4}-\\d{2}-\\d{2}$'],'end_date'=>['type'=>'string','pattern'=>'^\\d{4}-\\d{2}-\\d{2}$'],'accounts'=>['type'=>'array','items'=>['type'=>'string'],'minItems'=>1,'maxItems'=>30,'uniqueItems'=>true]],'required'=>['product','start_date','end_date'],'additionalProperties'=>false]]
    ];
}
function rpc(array $request,array $c,callable $read): ?array {
    $id=$request['id'] ?? null;
    $error=fn(int $code,string $message)=>['jsonrpc'=>'2.0','id'=>$id,'error'=>['code'=>$code,'message'=>$message]];
    if (($request['jsonrpc'] ?? '')!=='2.0' || !is_string($request['method'] ?? null) || (array_key_exists('id',$request) && !is_string($id) && !is_int($id))) return $error(-32600,'Invalid request.');
    $method=$request['method'];
    if (!array_key_exists('id',$request)) return str_starts_with($method,'notifications/') ? null : $error(-32600,'Request ID required.');
    $params=$request['params'] ?? [];
    if (!is_array($params)) return $error(-32602,'Invalid parameters.');
    if ($method==='initialize') {
        $v=$params['protocolVersion'] ?? '';
        return ['jsonrpc'=>'2.0','id'=>$id,'result'=>['protocolVersion'=>in_array($v,PROTOCOLS,true)?$v:PROTOCOLS[count(PROTOCOLS)-1],'capabilities'=>['tools'=>['listChanged'=>false]],'serverInfo'=>['name'=>'jenang-gemi-reporting','version'=>VERSION],'instructions'=>'Report Jakarta dates, units versus orders, and source freshness. Only three tools are implemented. Product reports are units/orders, never revenue. If asked for revenue, annualization, all-products tables, size/flavor groupings or finance, say the requested metric/view is unavailable; never substitute a product count or a zero. No refresh, writes or money movement.']];
    }
    if ($method==='ping') return ['jsonrpc'=>'2.0','id'=>$id,'result'=>(object)[]];
    if ($method==='tools/list') return ['jsonrpc'=>'2.0','id'=>$id,'result'=>['tools'=>tools()]];
    if ($method!=='tools/call') return $error(-32601,'Method not found.');
    $name=$params['name'] ?? ''; $a=$params['arguments'] ?? [];
    if (!is_string($name) || !is_array($a)) return $error(-32602,'Invalid tool parameters.');
    if (!in_array($name,array_column(tools(),'name'),true)) return $error(-32602,'Tool unavailable; business writes are not enabled.');
    try {
        if ($name==='jg_get_context') {
            if ($a!==[]) throw new \InvalidArgumentException('Context takes no arguments.');
            $data=['subject'=>$c['subject'],'scopes'=>[SCOPE],'brands'=>$c['brands'],'accounts'=>$c['accounts'],'partners'=>$c['partners'],'version'=>VERSION,'capabilities'=>array_column(tools(),'name'),'database_access_mode'=>$c['database_access_mode'] ?? 'dedicated_select_only','catalog_source'=>$c['catalog_source'] ?? 'database','writes_enabled'=>false,'supported_metrics'=>['product_units','distinct_product_orders'],'unsupported_metrics'=>['revenue','annualized_revenue','business_total','profit','cash'],'table_query_available'=>false]; $output=['data'=>$data];
        } elseif ($name==='jg_resolve_product') {
            if (array_keys($a)!==['product'] || !is_string($a['product'])) throw new \InvalidArgumentException('Provide product only.');
            $output=['data'=>resolve(catalog($read,$c),$a['product'])];
            if (($c['catalog_source'] ?? '')==='passive_lookup_cache') $output['provenance']=['catalog_source'=>'passive_lookup_cache','catalog_snapshot_at'=>passiveCatalogTime($c),'identity_note'=>'cache: identifiers are derived reporting identities, not official catalog IDs.'];
        } else $output=productReport($read,$c,$a);
        $result=['content'=>[['type'=>'text','text'=>json_encode($output,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)]],'structuredContent'=>$output,'isError'=>false];
    } catch (\InvalidArgumentException $e) { $result=['content'=>[['type'=>'text','text'=>$e->getMessage()]],'isError'=>true];
    } catch (\Throwable) { $result=['content'=>[['type'=>'text','text'=>'Reporting source unavailable. No refresh or business mutation was attempted.']],'isError'=>true]; }
    return ['jsonrpc'=>'2.0','id'=>$id,'result'=>$result];
}
