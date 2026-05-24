<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/config.php';
require_once dirname(__DIR__, 2) . '/analytics-bootstrap.php';

header('Content-Type: application/json; charset=utf-8');

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$payload = [];
if ($method === 'POST') {
    $decoded = json_decode((string) file_get_contents('php://input'), true);
    $payload = is_array($decoded) ? $decoded : [];
}

$providedToken = trim((string) ($_GET['setup_token'] ?? $_GET['token'] ?? $payload['setup_token'] ?? $payload['token'] ?? ''));
$expectedToken = jg_dashboard_marketplace_api_setup_token();
if ($expectedToken === '' || !hash_equals($expectedToken, $providedToken)) {
    http_response_code(401);
    echo json_encode([
        'ok' => false,
        'error' => 'unauthorized',
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

$reason = trim((string) ($_GET['reason'] ?? $payload['reason'] ?? 'marketplace_library'));
$state = analyticsTouchLiveState($reason !== '' ? $reason : 'marketplace_library');

echo json_encode([
    'ok' => true,
    'state' => $state,
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
