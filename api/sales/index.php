<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/config.php';
require_once dirname(__DIR__, 2) . '/auth.php';

jg_admin_require_auth();

header('Content-Type: application/json; charset=utf-8');

$year = max(2026, (int) ($_GET['year'] ?? gmdate('Y')));
$setupToken = jg_dashboard_marketplace_api_setup_token();
if ($setupToken === '') {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'missing_marketplace_api_setup_token',
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

$url = jg_dashboard_marketplace_api_base_url()
    . '/sales/summary?setup_token=' . rawurlencode($setupToken)
    . '&year=' . rawurlencode((string) $year);

$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'timeout' => 45,
        'header' => "Accept: application/json\r\n",
        'ignore_errors' => true,
    ],
]);

$response = @file_get_contents($url, false, $context);
if (!is_string($response) || $response === '') {
    http_response_code(502);
    echo json_encode([
        'ok' => false,
        'error' => 'marketplace_sales_upstream_unreachable',
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

$status = 200;
foreach (($http_response_header ?? []) as $headerLine) {
    if (preg_match('#^HTTP/\S+\s+(\d{3})#', (string) $headerLine, $matches)) {
        $status = (int) ($matches[1] ?? 200);
        break;
    }
}

http_response_code($status >= 100 ? $status : 200);
echo $response;
