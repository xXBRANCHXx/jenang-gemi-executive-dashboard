<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/sku-auth.php';
require_once dirname(__DIR__, 2) . '/website-commerce-bootstrap.php';

jg_admin_require_auth_json();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function jg_hard_set_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $action = strtolower(trim((string) ($_GET['action'] ?? '')));
    $body = json_decode((string) file_get_contents('php://input'), true);
    $body = is_array($body) ? $body : [];

    if ($method === 'POST' && $action === 'unlock') {
        $authenticated = jg_sku_attempt_login(
            (string) ($body['username'] ?? ''),
            (string) ($body['password'] ?? '')
        );
        if (!$authenticated || !jg_sku_is_branch()) {
            jg_sku_logout();
            jg_hard_set_json(['ok' => false, 'error' => 'Valid Branch-tier credentials are required.'], 403);
        }
        jg_hard_set_json([
            'ok' => true,
            'access' => [
                'branch' => true,
                'username' => jg_sku_session_username(),
            ],
        ]);
    }

    $pdo = analyticsDb();
    $skuPdo = jg_sku_db();
    jg_website_ensure_schema($pdo);
    $readiness = jg_hard_set_readiness($pdo, $skuPdo);
    $access = [
        'branch' => jg_sku_is_branch(),
        'username' => jg_sku_is_branch() ? jg_sku_session_username() : '',
    ];

    if ($method === 'GET') {
        jg_hard_set_deliver_outbox($pdo);
        jg_hard_set_json([
            'ok' => true,
            'state' => jg_hard_set_state($pdo),
            'readiness' => $readiness,
            'audit' => jg_hard_set_audit($pdo),
            'access' => $access,
        ]);
    }

    if ($method !== 'POST' || $action !== 'activate') {
        jg_hard_set_json(['ok' => false, 'error' => 'Method not allowed.'], 405);
    }

    if (!jg_sku_is_branch()) {
        jg_hard_set_json(['ok' => false, 'error' => 'Unlock Hard Set with Branch-tier credentials first.'], 403);
    }
    if (!hash_equals('ACTIVATE BIG SET', trim((string) ($body['confirmation'] ?? '')))) {
        jg_hard_set_json(['ok' => false, 'error' => 'Type ACTIVATE BIG SET exactly.'], 422);
    }
    if (empty($readiness['ready'])) {
        jg_hard_set_json(['ok' => false, 'error' => 'All readiness checks must pass before activation.', 'readiness' => $readiness], 409);
    }
    $actor = 'Branch tier: ' . jg_sku_session_username();
    $result = jg_hard_set_activate($pdo, $actor);
    jg_hard_set_deliver_outbox($pdo);
    jg_hard_set_json([
        'ok' => true,
        'activated' => $result['activated'],
        'state' => $result['state'],
        'readiness' => $readiness,
        'audit' => jg_hard_set_audit($pdo),
        'access' => $access,
    ]);
} catch (Throwable $error) {
    error_log('Hard Set API failed: ' . $error->getMessage());
    jg_hard_set_json(['ok' => false, 'error' => 'Hard Set service is unavailable.'], 500);
}
