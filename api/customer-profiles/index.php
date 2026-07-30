<?php
declare(strict_types=1);

define('JG_ORDERS_API_NO_DISPATCH', true);
require_once dirname(__DIR__, 2) . '/api/orders/index.php';
require_once dirname(__DIR__, 2) . '/customer-profiles-bootstrap.php';

jg_admin_require_auth_json();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');

try {
    $payload = jg_customer_profiles_build(jg_customer_profiles_source_rows(analyticsDb()));
    echo json_encode([
        'ok' => true,
        'generated_at' => gmdate(DATE_ATOM),
        'source' => 'dashboard_order_mirror + website_orders + whatsapp_orders',
    ] + $payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    error_log('Customer profiles API failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'customer_profiles_unavailable',
        'message' => 'Customer profiles could not be loaded.',
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}
