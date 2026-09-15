<?php
declare(strict_types=1);

// Temporary, authenticated inspection for the explicitly requested RSY correction.
require_once dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/config.php';
jg_admin_require_auth_json();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');
if (time() >= strtotime('2026-09-16 00:00:00 UTC')) {
    http_response_code(410);
    exit('{"error":"Maintenance window closed."}');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    exit('{"error":"Read only."}');
}

function rsy_db(string $prefix): PDO
{
    $config = jg_dashboard_load_local_config();
    $host = (string) ($config[$prefix . 'db_host'] ?? 'localhost');
    if ($host === 'local.server') $host = 'localhost';
    return new PDO(sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $host, $config[$prefix . 'db_port'] ?? '3306', $config[$prefix . 'db_name']),
        $config[$prefix . 'db_user'], $config[$prefix . 'db_password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
}

try {
    $result = ['ok' => true, 'order_id' => 'PO26091504BF18F3', 'databases' => []];
    foreach (['partner' => 'partner_', 'inventory' => 'sku_', 'analytics' => ''] as $label => $prefix) {
        $pdo = rsy_db($prefix);
        $tables = $pdo->query('SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, ORDINAL_POSITION')->fetchAll();
        $grouped = [];
        foreach ($tables as $column) $grouped[$column['TABLE_NAME']][$column['COLUMN_NAME']] = $column['DATA_TYPE'];
        $db = ['tables' => $grouped, 'matches' => [], 'definitions' => []];
        foreach ($grouped as $table => $columns) {
            $filters = [];
            $args = [];
            foreach ($columns as $column => $type) {
                if (!in_array($column, ['id', 'order_id', 'source_order_id', 'external_order_id', 'reference_id', 'source_reference'], true)
                    || !in_array($type, ['varchar', 'char', 'text'], true)) continue;
                $filters[] = '`' . $column . '` IN (?, ?)';
                $args[] = 'PO26091504BF18F3';
                $args[] = 'PARTNER-PO26091504BF18F3';
            }
            if ($filters === []) continue;
            $stmt = $pdo->prepare('SELECT * FROM `' . str_replace('`', '``', $table) . '` WHERE ' . implode(' OR ', $filters) . ' LIMIT 501');
            $stmt->execute($args);
            $rows = $stmt->fetchAll();
            if ($rows !== []) {
                $db['matches'][$table] = $rows;
                $db['definitions'][$table] = $pdo->query('SHOW CREATE TABLE `' . str_replace('`', '``', $table) . '`')->fetch();
            }
        }
        if ($label === 'inventory') {
            $db['sku'] = $pdo->query('SELECT * FROM sku_skus WHERE sku = "010155000006"')->fetch();
        }
        $result['databases'][$label] = $db;
    }
    echo json_encode($result, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
