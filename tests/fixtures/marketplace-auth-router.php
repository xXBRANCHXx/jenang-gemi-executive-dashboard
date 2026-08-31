<?php
declare(strict_types=1);

$eventPath = (string) getenv('JG_MARKETPLACE_AUTH_FIXTURE_EVENTS');
$expectedToken = (string) getenv('JG_MARKETPLACE_AUTH_FIXTURE_TOKEN');
$headers = function_exists('getallheaders') ? getallheaders() : [];
$authorization = '';
foreach (is_array($headers) ? $headers : [] as $name => $value) {
    if (strcasecmp((string) $name, 'Authorization') === 0) {
        $authorization = (string) $value;
    }
}
$body = (string) file_get_contents('php://input');
$event = [
    'method' => (string) ($_SERVER['REQUEST_METHOD'] ?? ''),
    'uri' => (string) ($_SERVER['REQUEST_URI'] ?? ''),
    'authorization' => $authorization,
    'body' => json_decode($body, true),
];
if ($eventPath !== '') {
    file_put_contents($eventPath, json_encode($event, JSON_UNESCAPED_SLASHES) . PHP_EOL, FILE_APPEND | LOCK_EX);
}

header('Content-Type: application/json; charset=utf-8');
if (!hash_equals('Bearer ' . $expectedToken, $authorization)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'unauthorized']);
    exit;
}

$path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);
if ($path === '/shopee/auth/dashboard/status') {
    echo json_encode(['ok' => true, 'accounts' => [['account_key' => 'zero-shopee']]]);
    exit;
}
if ($path === '/shopee/auth/dashboard/session' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    http_response_code(201);
    echo json_encode([
        'ok' => true,
        'company' => 'ZERO',
        'authorization_url' => 'https://partner.shopeemobile.com/api/v2/shop/auth_partner?temporary=1',
        'expires_at' => '2026-08-31T12:10:00Z',
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

http_response_code(404);
echo json_encode(['ok' => false, 'error' => 'not_found']);
