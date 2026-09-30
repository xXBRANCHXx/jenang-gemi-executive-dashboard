<?php
declare(strict_types=1);
// CLI only. Runs SELECTs only after an approved private configuration exists.
if (PHP_SAPI!=='cli') { http_response_code(404);exit; }
require_once __DIR__.'/lib/reports.php';
try {
    $c=JenangMcp\config();$read=new JenangMcp\Reader($c);
    JenangMcp\catalog($read,$c);
    $today=(new DateTimeImmutable('now',new DateTimeZone('Asia/Jakarta')))->format('Y-m-d');
    $p=JenangMcp\period(['start_date'=>$today,'end_date'=>$today]);
    $sources=['marketplace','website','direct'];if($c['partners']!==[])$sources[]='partner';
    foreach($sources as $s)JenangMcp\sourceRows($read,$s,$p,['MCP_PREFLIGHT_NO_MATCH']);
    echo json_encode(['ok'=>true,'read_sources'=>$sources,'catalog_schema'=>'readable','note'=>'SELECT-only query/schema check. Does not certify DB grants, per-account sync, or business parity.'],JSON_PRETTY_PRINT).PHP_EOL;
} catch(Throwable) { fwrite(STDERR,"MCP preflight failed: disabled config, missing SELECT grants/columns, or unavailable database. No migration attempted.\n");exit(1); }
