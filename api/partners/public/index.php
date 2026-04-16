<?php
declare(strict_types=1);

require dirname(__DIR__, 3) . '/config.php';

header('Content-Type: application/json; charset=utf-8');

$endpoint = jg_dashboard_partner_portal_url('/api/partners/public/');
$responseBody = false;
$statusCode = 0;

if (function_exists('curl_init')) {
    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Accept: application/json'],
        CURLOPT_TIMEOUT => 20,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_FOLLOWLOCATION => true,
    ]);
    $responseBody = curl_exec($ch);
    $statusCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
} else {
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => "Accept: application/json\r\n",
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
        'error' => 'Unable to reach partner public registry.',
        'upstream_status' => $statusCode,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

http_response_code($statusCode);
echo $responseBody;
