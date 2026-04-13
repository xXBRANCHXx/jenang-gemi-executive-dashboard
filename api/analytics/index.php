<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/auth.php';
jg_admin_require_auth_json();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

$timeframe = (string) ($_GET['timeframe'] ?? '7d');
$timezone = (string) ($_GET['timezone'] ?? '');
$recentLimit = max(15, min(300, (int) ($_GET['recent_limit'] ?? 180)));
$dataset = (string) ($_GET['dataset'] ?? 'landing');
$affiliateCode = (string) ($_GET['affiliate_code'] ?? '');
$cacheBust = (string) ($_GET['_ts'] ?? '');
$endpoint = 'https://jenanggemi.com/admin-analytics-api.php?timeframe=' . rawurlencode($timeframe);
if ($timezone !== '') {
    $endpoint .= '&timezone=' . rawurlencode($timezone);
}
$endpoint .= '&recent_limit=' . rawurlencode((string) $recentLimit);
$endpoint .= '&dataset=' . rawurlencode($dataset);
if ($affiliateCode !== '') {
    $endpoint .= '&affiliate_code=' . rawurlencode($affiliateCode);
}
if ($cacheBust !== '') {
    $endpoint .= '&_ts=' . rawurlencode($cacheBust);
}
$token = JG_ADMIN_CODE_HASH;

$headers = [
    'Accept: application/json',
    'X-JG-Admin-Token: ' . $token,
];

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
    ]);
    $responseBody = curl_exec($ch);
    $statusCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
} else {
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => implode("\r\n", $headers),
            'timeout' => 15,
        ],
    ]);
    $responseBody = @file_get_contents($endpoint, false, $context);
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $matches)) {
        $statusCode = (int) $matches[1];
    }
}

if ($responseBody === false || $statusCode >= 400 || $statusCode === 0) {
    http_response_code(502);
    echo json_encode([
        'error' => 'Unable to fetch analytics from primary site.',
        'upstream_status' => $statusCode,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

echo $responseBody;
