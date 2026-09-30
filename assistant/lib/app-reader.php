<?php
declare(strict_types=1);
namespace JenangMcp;

// Explicit application mode only; no credential values are returned or logged.
// Use the existing settings resolver, never analyticsDb()/schema bootstrap calls.
function appAnalyticsSettings(): array {
    $bootstrap=dirname(__DIR__,2).'/analytics-bootstrap.php';
    if (!is_file($bootstrap)) throw new \RuntimeException('Application settings unavailable.');
    require_once $bootstrap;
    $d=\analyticsResolveDatabaseConfig();
    foreach (['host','port','name','user','pass','charset'] as $key) if (!is_string($d[$key] ?? null)) throw new \RuntimeException('Application settings incomplete.');
    if (!preg_match('/^[A-Za-z0-9_.:-]+$/D',$d['host']) || !preg_match('/^[0-9]{1,5}$/D',$d['port']) || !preg_match('/^[A-Za-z0-9_]+$/D',$d['name']) || $d['charset']!=='utf8mb4' || $d['user']==='') throw new \RuntimeException('Application database target invalid.');
    return ['host'=>$d['host'],'name'=>$d['name'],'dsn'=>'mysql:host='.$d['host'].';port='.$d['port'].';dbname='.$d['name'].';charset=utf8mb4','user'=>$d['user'],'password'=>$d['pass']];
}
function assertReportQuery(string $db,string $sql,array $args): void {
    $valid=$db==='sku' && $sql===CATALOG_SQL && $args===[];
    if ($db==='analytics') {
        $n=count($args)-2;
        if ($n>0 && $n<=4000) foreach (['website','direct'] as $source) $valid=$valid || $sql===sourceSelect($source,$n);
        if ($n>0 && $n%2===0 && $n<=8000) $valid=$valid || $sql===sourceSelect('marketplace',intdiv($n,2));
    }
    if ($db==='partner' && count($args)===2) $valid=$sql===sourceSelect('partner');
    if (!$valid || substr_count($sql,'?')!==count($args)) throw new \LogicException('Query is outside the fixed reporting allowlist.');
}
final class Reader {
    private array $connections=[];
    // Optional factories are for isolated fixture tests; RPC never accepts them.
    public function __construct(private array $config,private ?\Closure $factory=null,private ?\Closure $settingsResolver=null) {}
    public function __invoke(string $db,string $sql,array $args=[]): array {
        assertReportQuery($db,$sql,$args);
        if (!isset($this->connections[$db])) {
            $mode=$this->config['database_access_mode'] ?? 'dedicated_select_only';
            if ($mode==='app_internal_readonly') {
                if (empty($this->config['app_internal_readonly_approved']) || !empty($this->config['partners']) || $db!=='analytics') throw new \RuntimeException('Application reporting mode is not approved for this source.');
                $d=$this->settingsResolver ? ($this->settingsResolver)() : appAnalyticsSettings();
                if (!is_string($this->config['app_expected_host'] ?? null) || !is_string($this->config['app_expected_database'] ?? null) || ($d['host'] ?? '')!==$this->config['app_expected_host'] || ($d['name'] ?? '')!==$this->config['app_expected_database']) throw new \RuntimeException('Application database target differs from approved scope.');
            } elseif ($mode==='dedicated_select_only') {
                $d=$this->config['databases'][$db] ?? null;
                if (!$d || empty($d['select_only_verified'])) throw new \RuntimeException('SELECT-only database configuration unavailable.');
            } else throw new \RuntimeException('Unknown database mode.');
            if (!is_array($d) || !str_starts_with($d['dsn'] ?? '', 'mysql:') || !isset($d['user'],$d['password']) || (!defined('Pdo\\Mysql::ATTR_MULTI_STATEMENTS') && !defined('PDO::MYSQL_ATTR_MULTI_STATEMENTS'))) throw new \RuntimeException('MySQL reporting configuration unavailable.');
            $multi=defined('Pdo\\Mysql::ATTR_MULTI_STATEMENTS') ? constant('Pdo\\Mysql::ATTR_MULTI_STATEMENTS') : constant('PDO::MYSQL_ATTR_MULTI_STATEMENTS');
            $options=[\PDO::ATTR_ERRMODE=>\PDO::ERRMODE_EXCEPTION,\PDO::ATTR_DEFAULT_FETCH_MODE=>\PDO::FETCH_ASSOC,\PDO::ATTR_EMULATE_PREPARES=>false,\PDO::ATTR_TIMEOUT=>5,$multi=>false];
            $pdo=$this->factory ? ($this->factory)($d,$options) : new \PDO($d['dsn'],$d['user'],$d['password'],$options);
            if (!$pdo instanceof \PDO) throw new \RuntimeException('Reporting connection unavailable.');
            // Any unsupported setting/transaction error fails closed, never retries unrestricted.
            if ($pdo->exec('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ')===false || $pdo->exec('SET SESSION TRANSACTION READ ONLY')===false || !$pdo->beginTransaction() || !$pdo->inTransaction()) throw new \RuntimeException('Read-only transaction unavailable.');
            $this->connections[$db]=$pdo;
        }
        $pdo=$this->connections[$db];
        if (!$pdo->inTransaction()) throw new \RuntimeException('Reporting transaction ended unexpectedly.');
        $sql=substr_replace($sql,'SELECT /*+ MAX_EXECUTION_TIME(5000) */',0,6);
        $statement=$pdo->prepare($sql);$statement->execute($args);return $statement->fetchAll();
    }
    public function __destruct() {
        foreach($this->connections as $pdo) { try {if($pdo->inTransaction())$pdo->rollBack();}catch(\Throwable){} }
    }
}
function passiveCatalogPayload(array $c): array {
    if (isset($c['_catalog_snapshot'])) return $c['_catalog_snapshot'];
    $file=$c['catalog_cache_file'] ?? '';
    if (!is_string($file) || $file==='' || !is_file($file) || filesize($file)>10*1024*1024) throw new \RuntimeException('Passive catalog snapshot unavailable.');
    $p=json_decode((string)file_get_contents($file),true,64,JSON_THROW_ON_ERROR);
    if (!is_array($p) || !is_array($p['lookup'] ?? null) || count($p['lookup'])>4000 || !is_string($p['saved_at'] ?? null) || strtotime($p['saved_at'])===false) throw new \RuntimeException('Passive catalog snapshot invalid.');
    return $p;
}
function passiveCatalogTime(array $c): string { return passiveCatalogPayload($c)['saved_at']; }
function passiveCatalog(array $c): array {
    $p=passiveCatalogPayload($c);$rows=[];
    foreach($p['lookup'] as $r) {
        if (!is_array($r) || !in_array($r['brand_name'] ?? null,$c['brands'],true)) continue;
        foreach(['sku','tag','brand_name','base_product_name','product_key','flavor_name','unit_name'] as $key) if (!is_string($r[$key] ?? null)) throw new \RuntimeException('Passive catalog identity incomplete.');
        if ($r['sku']==='' || $r['base_product_name']==='' || $r['product_key']==='' || !is_numeric($r['volume'] ?? null) || $r['volume']<0) throw new \RuntimeException('Passive catalog identity invalid.');
        $row=['sku'=>$r['sku'],'tag'=>$r['tag'],'brand'=>$r['brand_name'],'product'=>$r['base_product_name'],'product_id'=>'cache:'.hash('sha256',json_encode([$r['brand_name'],$r['product_key'],$r['base_product_name']])),'flavor'=>$r['flavor_name'],'volume'=>$r['volume'],'unit'=>$r['unit_name']];
        if(isset($rows[$r['sku']]) && $rows[$r['sku']]!==$row) throw new \RuntimeException('Conflicting cached SKU identities.');
        $rows[$r['sku']]=$row;
    }
    if ($rows===[] || count($rows)>2000) throw new \RuntimeException('No bounded authorized passive catalog.');
    return array_values($rows);
}
