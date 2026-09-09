<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/sku-db-bootstrap.php';
require_once dirname(__DIR__, 2) . '/store-ops-report.php';

jg_admin_require_auth_json();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function jg_exec_store_ops_respond(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    header('Allow: GET');
    jg_exec_store_ops_respond(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

try {
    $bounds = jg_exec_store_ops_date_bounds();
    // Use the existing shared connection configuration without running SKU writes
    // or migrations as a side effect of opening a report.
    $config = jg_sku_db_config();
    $pdo = new PDO(
        sprintf('mysql:host=%s;port=%s;dbname=%s;charset=%s', $config['host'], $config['port'], $config['name'], $config['charset']),
        $config['user'], $config['pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false]
    );
    $orders = jg_exec_store_ops_orders($pdo, $bounds);
    jg_exec_store_ops_respond([
        'ok' => true,
        'filters' => ['date_from' => $bounds['from_date'], 'date_to' => $bounds['to_date']],
        'metrics' => jg_exec_store_ops_metrics($pdo, $bounds),
        'employees' => jg_exec_store_ops_employees($pdo),
        'orders' => array_slice($orders, 0, 300),
        'orders_truncated' => count($orders) > 300,
        'events' => jg_exec_store_ops_events($pdo),
        'updated_at' => gmdate('Y-m-d H:i:s'),
    ]);
} catch (InvalidArgumentException $error) {
    jg_exec_store_ops_respond(['ok' => false, 'error' => $error->getMessage()], 422);
} catch (Throwable $error) {
    error_log('Store Ops report unavailable [' . $error->getCode() . ']');
    jg_exec_store_ops_respond(['ok' => false, 'error' => 'Store operations could not be loaded. Please retry.'], 503);
}
