<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/auth.php';
jg_admin_require_auth_json();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

$action = strtolower(trim((string) ($_GET['action'] ?? 'website_settings')));
$allowedActions = ['website_settings', 'website_exclusion_add', 'website_exclusion_delete'];
if (!in_array($action, $allowedActions, true)) {
    http_response_code(404);
    echo json_encode(['error' => 'Unknown settings action.'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

$endpoint = 'https://jenanggemi.com/admin-analytics-api.php?action=' . rawurlencode($action);
$cacheBust = (string) ($_GET['_ts'] ?? '');
if ($cacheBust !== '') {
    $endpoint .= '&_ts=' . rawurlencode($cacheBust);
}
$token = JG_ADMIN_CODE_HASH;

$headers = [
    'Accept: application/json',
    'X-JG-Admin-Token: ' . $token,
];

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$body = null;
if ($method === 'POST') {
    $body = file_get_contents('php://input') ?: '';
    $headers[] = 'Content-Type: application/json';
}

$responseBody = false;
$statusCode = 0;

if (function_exists('curl_init')) {
    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CUSTOMREQUEST => $method,
    ]);
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    $responseBody = curl_exec($ch);
    $statusCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
} else {
    $context = stream_context_create([
        'http' => [
            'method' => $method,
            'header' => implode("\r\n", $headers),
            'content' => $method === 'POST' ? (string) $body : '',
            'timeout' => 15,
        ],
    ]);
    $responseBody = @file_get_contents($endpoint, false, $context);
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $matches)) {
        $statusCode = (int) $matches[1];
    }
}

if ($responseBody === false || $statusCode >= 400 || $statusCode === 0) {
    http_response_code($statusCode >= 400 ? $statusCode : 502);
    echo json_encode([
        'error' => 'Unable to fetch settings from primary site.',
        'upstream_status' => $statusCode,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

echo $responseBody;
