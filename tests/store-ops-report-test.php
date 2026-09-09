<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/store-ops-report.php';
function check(bool $condition, string $message): void { if (!$condition) throw new RuntimeException($message); }
// Execute the actual report SQL against isolated tables matching Store Ops v2.
// Only adapt MySQL's TIMESTAMPDIFF unit syntax for SQLite, never the report logic.
class ReportDatabase extends PDO {
    public function __construct() {
        parent::__construct('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);

    }
    public function prepare(string $query, array $options = []): PDOStatement|false {
        preg_match_all('/:[a-z_][a-z0-9_]*/i', $query, $matches);
        check(count($matches[0])===count(array_unique($matches[0])), 'Native MySQL prepares need unique named parameters');
        foreach (['f.fulfilled_at', 'COALESCE(f.fulfilled_at, f.label_printed_at, f.last_activity_at)'] as $end) {
            $query = str_replace('TIMESTAMPDIFF(SECOND, f.claimed_at, ' . $end . ')', "(strftime('%s', " . $end . ") - strftime('%s', f.claimed_at))", $query);
        }
        return parent::prepare($query, $options);
    }
}
$db = new ReportDatabase();
$db->exec('CREATE TABLE store_ops_employees_v2 (id TEXT, display_name TEXT, active INTEGER, pin_hash TEXT)');
$db->exec("INSERT INTO store_ops_employees_v2 VALUES ('a','Ayu',1,'private'),('b','Budi',1,'private'),('c','Inactive',0,'private')");
$db->exec('CREATE TABLE store_ops_order_fulfillment_v2 (source_platform TEXT, source_account TEXT, order_id TEXT, status TEXT, claimed_by TEXT, claimed_at TEXT, last_activity_at TEXT, scan_completed_at TEXT, label_printed_at TEXT, fulfilled_at TEXT, scan_required INTEGER, scan_completed INTEGER, created_at TEXT)');
$insert=$db->prepare('INSERT INTO store_ops_order_fulfillment_v2 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
foreach ([
 ['shopee','shop-a','SPX-1','FULFILLED','a','2026-09-08 16:59:00','2026-09-08 17:04:00',null,null,'2026-09-08 17:04:00',2,2,'2026-09-08 16:59:00'],
 ['tiktok','shop-b','TIK-2','FULFILLED','b','2026-09-09 05:00:00','2026-09-09 05:10:00',null,null,'2026-09-09 05:10:00',1,1,'2026-09-09 05:00:00'],
 ['shopee','shop-a','SPX-OLD','FULFILLED','a','2026-09-07 05:00:00','2026-09-07 05:10:00',null,null,'2026-09-07 05:10:00',1,1,'2026-09-07 05:00:00'],
 ['shopee','shop-a','SPX-ACTIVE','CLAIMED','a','2026-09-07 05:00:00','2026-09-07 05:01:00',null,null,null,2,0,'2026-09-07 05:00:00'],
 ['partner','','SAME-ID','FULFILLED','b','2026-09-09 16:59:00','2026-09-09 17:00:00',null,null,'2026-09-09 17:00:00',1,1,'2026-09-09 16:59:00'],
] as $row) $insert->execute($row);
$db->exec('CREATE TABLE store_ops_order_events_v2 (source_platform TEXT, source_account TEXT, order_id TEXT, event_type TEXT, employee_id TEXT, employee_name TEXT, sku TEXT, quantity REAL, progress_scanned INTEGER, progress_required INTEGER, message TEXT, payload_json TEXT, created_at TEXT)');
$insert=$db->prepare('INSERT INTO store_ops_order_events_v2 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
foreach ([['shopee','shop-a','SPX-1','scan_error','a','Ayu','','0',0,2,'Wrong item','{}','2026-09-08 17:00:00'],['tiktok','shop-b','TIK-2','error','b','Budi','','0',0,1,'Rejected','{}','2026-09-09 05:01:00'],['partner','','SAME-ID','fulfill','b','Budi','',1,1,1,'','{}','2026-09-09 17:00:00'],['partner','different','SAME-ID','fulfill','b','Budi','',1,1,1,'','{}','2026-09-09 17:01:00']] as $row) $insert->execute($row);
$_GET=['date_from'=>'2026-09-09','date_to'=>'2026-09-09'];
$bounds=jg_exec_store_ops_date_bounds();
check($bounds['start_utc']==='2026-09-08 17:00:00' && $bounds['end_utc']==='2026-09-09 17:00:00','Jakarta day must use exclusive UTC bounds');
$metrics=jg_exec_store_ops_metrics($db,$bounds);
check($metrics['fulfilled_today']===2 && $metrics['active_claims']===1,'Current fulfills and older active claims read from v2');
check($metrics['average_fulfillment_seconds']===450 && $metrics['scan_errors']===2,'Duration and real scan errors');
check(array_sum(array_column($metrics['employee_throughput'],'fulfilled_count'))===2,'Throughput includes all employees');
check(count(jg_exec_store_ops_orders($db,$bounds))===3,'Log includes period activity and all still-open claims');
$employees=jg_exec_store_ops_employees($db);
check(count($employees)===3 && !array_key_exists('pin_hash',$employees[0]),'Employee labels never expose credentials');
$_GET+=['employees'=>'a','source'=>'shopee'];
$metrics=jg_exec_store_ops_metrics($db,$bounds);
check($metrics['fulfilled_today']===1 && $metrics['scan_errors']===1 && count(jg_exec_store_ops_orders($db,$bounds))===2,'Filters apply to totals and rows');
$_GET['status']='FULFILLED';
check(jg_exec_store_ops_metrics($db,$bounds)['active_claims']===0,'Status filters apply consistently');
$_GET=['source'=>'shopee,tiktok'];
check(jg_exec_store_ops_metrics($db,$bounds)['fulfilled_today']===2,'Comma-separated source selection');
$_GET=['q'=>"' OR 1=1 --"];
check(jg_exec_store_ops_orders($db,$bounds)===[],'Search stays a bound value');
$_GET=['detail_order_id'=>'SAME-ID','detail_source_platform'=>'partner','detail_source_account'=>''];
check(count(jg_exec_store_ops_events($db))===1,'Blank source account remains part of the exact order identity');
foreach ([['date_from'=>'2026-02-30'],['date_from'=>'2026-09-10','date_to'=>'2026-09-09']] as $bad) {
 $_GET=$bad;$rejected=false;try{jg_exec_store_ops_date_bounds();}catch(InvalidArgumentException){$rejected=true;}check($rejected,'Invalid/reversed dates rejected');
}
$_GET=['employees'=>'nobody'];
$metrics=jg_exec_store_ops_metrics($db,$bounds);
check($metrics['fulfilled_today']===0 && $metrics['average_fulfillment_seconds']===null && $metrics['average_fulfillment_label']==='—','Empty period is not fabricated duration');
check(!str_contains(file_get_contents(dirname(__DIR__).'/api/store-ops/index.php'),'CREATE TABLE'),'Read endpoint never creates unused tables');
echo "PASS: v2 fulfillment/employee/event data, Jakarta boundaries, filtering, durations, open claims, exact timelines, empty states, read-only report and bound SQL.\n";
