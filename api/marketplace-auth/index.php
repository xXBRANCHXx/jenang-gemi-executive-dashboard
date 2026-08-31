<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/auth.php';
jg_admin_require_auth_json();

require dirname(__DIR__, 2) . '/marketplace-auth-bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

function jg_marketplace_auth_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ($method === 'GET') {
        $response = jg_marketplace_auth_upstream('GET', '/shopee/auth/dashboard/status');
        $payload = $response['payload'];
        if ($response['status'] >= 400 || empty($payload['ok'])) {
            jg_marketplace_auth_json([
                'ok' => false,
                'error' => (string) ($payload['error'] ?? 'authorization_status_unavailable'),
            ], $response['status'] >= 400 ? $response['status'] : 502);
        }
        jg_marketplace_auth_json($payload);
    }

    if ($method !== 'POST') {
        jg_marketplace_auth_json(['ok' => false, 'error' => 'Method not allowed.'], 405);
    }
    jg_admin_require_csrf_json();

    $body = json_decode((string) file_get_contents('php://input'), true);
    $body = is_array($body) ? $body : [];
    $accountKey = strtolower(trim((string) ($body['account_key'] ?? '')));
    if (!in_array($accountKey, ['jenang-gemi-shopee', 'zero-shopee', 'zfit-shopee'], true)) {
        jg_marketplace_auth_json(['ok' => false, 'error' => 'Unknown Shopee account.'], 422);
    }

    $response = jg_marketplace_auth_upstream('POST', '/shopee/auth/dashboard/session', [
        'account_key' => $accountKey,
    ]);
    $payload = $response['payload'];
    if ($response['status'] >= 400 || empty($payload['ok'])) {
        jg_marketplace_auth_json([
            'ok' => false,
            'error' => (string) ($payload['error'] ?? 'authorization_start_failed'),
        ], $response['status'] >= 400 ? $response['status'] : 502);
    }

    $authorizationUrl = trim((string) ($payload['authorization_url'] ?? ''));
    $parts = parse_url($authorizationUrl);
    if (
        !is_array($parts)
        || strtolower((string) ($parts['scheme'] ?? '')) !== 'https'
        || !str_ends_with(strtolower((string) ($parts['host'] ?? '')), '.shopeemobile.com')
    ) {
        jg_marketplace_auth_json(['ok' => false, 'error' => 'Shopee returned an invalid authorization destination.'], 502);
    }

    jg_marketplace_auth_json([
        'ok' => true,
        'account_key' => $accountKey,
        'company' => (string) ($payload['company'] ?? $accountKey),
        'authorization_url' => $authorizationUrl,
        'expires_at' => (string) ($payload['expires_at'] ?? ''),
    ], 201);
} catch (Throwable $error) {
    error_log('Marketplace authorization dashboard API failed: ' . $error->getMessage());
    jg_marketplace_auth_json([
        'ok' => false,
        'error' => 'Shopee authorization service is temporarily unavailable.',
    ], 502);
}
