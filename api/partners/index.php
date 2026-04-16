<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/auth.php';
require dirname(__DIR__, 2) . '/config.php';

jg_admin_require_auth_json();

header('Content-Type: application/json; charset=utf-8');

$endpoint = jg_dashboard_partner_portal_url('/api/admin-partners/');
$token = JG_ADMIN_CODE_HASH;
$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$headers = [
    'Accept: application/json',
    'Content-Type: application/json',
    'X-JG-Admin-Token: ' . $token,
];

if ($method === 'GET' && isset($_SERVER['QUERY_STRING']) && trim((string) $_SERVER['QUERY_STRING']) !== '') {
    $endpoint .= '?' . (string) $_SERVER['QUERY_STRING'];
}

$requestBody = file_get_contents('php://input') ?: '';
$responseBody = false;
$statusCode = 0;

if (function_exists('curl_init')) {
    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CUSTOMREQUEST => $method,
    ]);
    if ($method !== 'GET' && $requestBody !== '') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $requestBody);
    }
    $responseBody = curl_exec($ch);
    $statusCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
} else {
    $context = stream_context_create([
        'http' => [
            'method' => $method,
            'header' => implode("\r\n", $headers),
            'content' => $requestBody,
            'timeout' => 20,
        ],
    ]);
    $responseBody = @file_get_contents($endpoint, false, $context);
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $matches)) {
        $statusCode = (int) $matches[1];
    }
}

if ($responseBody === false || $statusCode === 0) {
    http_response_code(502);
    echo json_encode([
        'error' => 'Unable to reach partner service.',
        'upstream_status' => $statusCode,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

http_response_code($statusCode);
echo $responseBody;
