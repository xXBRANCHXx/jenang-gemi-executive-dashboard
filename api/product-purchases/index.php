<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/auth.php';
jg_admin_require_auth_json();
require_once dirname(__DIR__, 2) . '/sku-db-bootstrap.php';
require_once dirname(__DIR__, 2) . '/product-purchases-bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    echo json_encode(['ok' => false, 'message' => 'This report only supports GET requests.']);
    exit;
}
try {
    echo json_encode(jg_product_purchases_payload(jg_sku_db(), $_GET), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} catch (InvalidArgumentException $error) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => $error->getMessage()]);
} catch (Throwable $error) {
    error_log('Product purchase report: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Purchase history could not be loaded. Please try again.']);
}
