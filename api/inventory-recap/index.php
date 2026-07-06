<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/auth.php';
jg_admin_require_auth_json();

require_once dirname(__DIR__, 2) . '/config.php';
require_once dirname(__DIR__, 2) . '/sku-db-bootstrap.php';
require_once dirname(__DIR__, 2) . '/accounting-bootstrap.php';
require_once dirname(__DIR__, 2) . '/website-commerce-bootstrap.php';
require_once dirname(__DIR__, 2) . '/inventory-recap-bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

try {
    $analyticsPdo = analyticsDb();
    $month = function_exists('jg_accounting_month') ? jg_accounting_month($_GET['month'] ?? null) : gmdate('Y-m');
    $cashContext = jg_inventory_recap_accounting_cash_context($analyticsPdo, $month);
    $payload = jg_inventory_recap_payload(jg_sku_db(), $analyticsPdo, $cashContext, $_GET);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'inventory_recap_failed',
        'message' => $error->getMessage(),
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}
