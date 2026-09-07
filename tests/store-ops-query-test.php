<?php
declare(strict_types=1);
$source = file_get_contents(dirname(__DIR__) . '/api/store-ops/index.php');
foreach ([['jg_exec_store_ops_csv_filter', 'jg_exec_store_ops_format_duration'], ['jg_exec_store_ops_orders', 'jg_exec_store_ops_events']] as [$start, $end]) {
    eval(substr($source, strpos($source, 'function ' . $start . '('), strpos($source, 'function ' . $end . '(') - strpos($source, 'function ' . $start . '(')));
}
class StoreOpsStatement extends PDOStatement {
    public function __construct(private string $sql) {}
    public function execute(?array $params = null): bool {
        preg_match_all('/:[a-z_][a-z0-9_]*/i', $this->sql, $matches);
        if (count($matches[0]) !== count(array_unique($matches[0]))) throw new RuntimeException('Native prepares reject reused placeholders.');
        $expected = $matches[0]; $actual = array_keys($params ?? []); sort($expected); sort($actual);
        if ($expected !== $actual) throw new RuntimeException('SQL placeholders and bound values must match.');
        if ($params[':start_at'] !== $params[':activity_start_at'] || $params[':end_at'] !== $params[':activity_end_at']) throw new RuntimeException('Activity and fulfillment date windows must match.');
        if (isset($params[':source_platform_filter']) && $params[':source_platform_filter'] !== $params[':source_account_filter']) throw new RuntimeException('Both source fields must use the selected filter.');
        return true;
    }
    public function fetchAll(int $mode = PDO::FETCH_DEFAULT, mixed ...$args): array { return []; }
}
class StoreOpsConnection extends PDO {
    public function __construct() {}
    public function prepare(string $query, array $options = []): PDOStatement|false { return new StoreOpsStatement($query); }
}
$bounds = ['start_utc' => '2026-09-06 17:00:00', 'end_utc' => '2026-09-07 17:00:00'];
foreach ([[], ['source' => 'shopee'], ['source' => 'shopee', 'employees' => 'one,two', 'status' => 'CLAIMED,FULFILLED', 'q' => 'order']] as $filters) {
    $_GET = $filters;
    jg_exec_store_ops_orders(new StoreOpsConnection(), $bounds);
}
echo "Store Ops query parameters: passed.\n";
