<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/auth.php';
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
    $pdo = analyticsDb();
    $skuPdo = jg_sku_db();
    jg_website_ensure_schema($pdo);
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $readiness = jg_hard_set_readiness($pdo, $skuPdo);

    if ($method === 'GET') {
        jg_hard_set_deliver_outbox($pdo);
        jg_hard_set_json([
            'ok' => true,
            'state' => jg_hard_set_state($pdo),
            'readiness' => $readiness,
            'audit' => jg_hard_set_audit($pdo),
        ]);
    }

    if ($method !== 'POST' || strtolower(trim((string) ($_GET['action'] ?? ''))) !== 'activate') {
        jg_hard_set_json(['ok' => false, 'error' => 'Method not allowed.'], 405);
    }

    $body = json_decode((string) file_get_contents('php://input'), true);
    $body = is_array($body) ? $body : [];
    if (!hash_equals('ACTIVATE BIG SET', trim((string) ($body['confirmation'] ?? '')))) {
        jg_hard_set_json(['ok' => false, 'error' => 'Type ACTIVATE BIG SET exactly.'], 422);
    }
    if (empty($readiness['ready'])) {
        jg_hard_set_json(['ok' => false, 'error' => 'All readiness checks must pass before activation.', 'readiness' => $readiness], 409);
    }
    jg_admin_start_session();
    $actor = 'Executive session';
    if (!empty($_SESSION['jg_admin_login_at'])) {
        $actor .= ' authenticated ' . (string) $_SESSION['jg_admin_login_at'];
    }
    $result = jg_hard_set_activate($pdo, $actor);
    jg_hard_set_deliver_outbox($pdo);
    jg_hard_set_json([
        'ok' => true,
        'activated' => $result['activated'],
        'state' => $result['state'],
        'readiness' => $readiness,
        'audit' => jg_hard_set_audit($pdo),
    ]);
} catch (Throwable $error) {
    error_log('Hard Set API failed: ' . $error->getMessage());
    jg_hard_set_json(['ok' => false, 'error' => 'Hard Set service is unavailable.'], 500);
}
