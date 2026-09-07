<?php
declare(strict_types=1);
namespace DashboardHealthTest;
use Throwable;
use RuntimeException;
class PDO {
    public const ATTR_ERRMODE = 3, ERRMODE_EXCEPTION = 2, ATTR_DEFAULT_FETCH_MODE = 19, FETCH_ASSOC = 2, ATTR_TIMEOUT = 2;
    public static array $hosts = [];
    public static array $available = ['localhost'];
    public function __construct(string $dsn, string $user, string $password, array $options) {
        preg_match('/host=([^;]+)/', $dsn, $matches); $host = $matches[1]; self::$hosts[] = $host;
        if (!in_array($host, self::$available, true)) throw new RuntimeException('Host unavailable');
    }
    public function prepare(string $query): object { return new class { public function execute(array $params): void {} public function fetchColumn(): int { return 1; } }; }
}
$source = file_get_contents(dirname(__DIR__) . '/api/api-health/index.php');
$start = strpos($source, 'function jg_api_health_db_check(');
$end = strpos($source, 'function jg_api_health_run_checks(');
eval('namespace DashboardHealthTest; use Throwable; use RuntimeException; ' . substr($source, $start, $end - $start));
$config = ['host' => 'local.server', 'name' => 'partners', 'user' => 'user', 'pass' => 'unused', 'host_candidates' => ['local.server', 'localhost']];
$result = jg_api_health_db_check('partner-db', 'Partners', 'Database', $config, 'partner_profiles');
if (!$result['ok'] || PDO::$hosts !== ['local.server', 'localhost'] || $result['error'] !== '') throw new RuntimeException('Health must try the same fallback host as the partner app.');
PDO::$available = []; PDO::$hosts = [];
$result = jg_api_health_db_check('partner-db', 'Partners', 'Database', $config, 'partner_profiles');
if ($result['ok'] || $result['error'] === '') throw new RuntimeException('Health must retain genuine connection failures.');
PDO::$hosts = []; unset($config['host_candidates']);
jg_api_health_db_check('db', 'DB', 'Database', $config, 'table');
if (PDO::$hosts !== ['local.server']) throw new RuntimeException('Other databases must use their configured host.');
echo "Health database fallback: passed.\n";
