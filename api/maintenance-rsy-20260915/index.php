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
if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', ['GET', 'POST'], true)) {
    http_response_code(405);
    exit('{"error":"Method not allowed."}');
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
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
        jg_admin_require_csrf_json();
        require_once __DIR__ . '/correction.php';
        $body = json_decode((string) file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
        echo json_encode(rsy_correct(is_array($body) ? $body : []), JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
        exit;
    }
    $inspectionOrder = (string) ($_GET['order_id'] ?? 'PO26091504BF18F3');
    if (!in_array($inspectionOrder, ['PO26091504BF18F3', 'PO26091560AC7D27'], true)) throw new RuntimeException('Unsupported order.');
    $result = ['ok' => true, 'order_id' => $inspectionOrder, 'databases' => []];
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
                if (!in_array($column, ['id', 'order_id', 'source_order_id', 'external_order_id', 'original_order_id', 'order_no', 'reference_no', 'invoice_no', 'reference_id', 'source_reference', 'request_key'], true)
                    || !in_array($type, ['varchar', 'char', 'text'], true)) continue;
                $filters[] = '`' . $column . '` IN (?, ?)';
                $args[] = $inspectionOrder;
                $args[] = 'PARTNER-' . $inspectionOrder;
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
            $db['stock_group'] = $pdo->query('SELECT sku, volume, astra, current_stock FROM sku_skus WHERE brand_id = "brand-zero-9ea80a" AND unit_id = "unit-ml-b4f65a" AND product_id = "brand-zero-9ea80a-product-maple-topping-7d2f06" AND flavor_id = "brand-zero-9ea80a-flavor-unflavored" AND astra = 550')->fetchAll();
        }
        if ($label === 'partner') {
            foreach (['partner_weekly_bills', 'partner_weekly_bill_items', 'partner_weekly_bill_payments', 'partner_weekly_bill_disputes', 'partner_weekly_bill_files', 'partner_return_adjustments'] as $table) {
                $fields = array_keys($grouped[$table]);
                $select = implode(', ', array_map(static fn(string $f): string => $f === 'file_data' ? 'LENGTH(file_data) AS file_data_bytes' : '`' . $f . '`', $fields));
                $stmt = $pdo->prepare('SELECT ' . $select . ' FROM `' . $table . '` WHERE bill_id = ?');
                $stmt->execute(['PB-CW-20260914-10EDA9208578']);
                $db['billing'][$table] = $stmt->fetchAll();
            }
        }
        $cfg = jg_dashboard_load_local_config();
        foreach (['partner_' => 'partner_orders', 'sku_' => 'sku_skus', '' => 'partner_order_payments'] as $other => $testTable) {
            try {
                $schema = str_replace('`', '``', $cfg[$other . 'db_name']);
                $pdo->query('SELECT 1 FROM `' . $schema . '`.`' . $testTable . '` LIMIT 0');
                $db['cross_database_access'][$other ?: 'analytics'] = true;
            } catch (Throwable) {
                $db['cross_database_access'][$other ?: 'analytics'] = false;
            }
        }
        $result['databases'][$label] = $db;
    }
    echo json_encode($result, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
