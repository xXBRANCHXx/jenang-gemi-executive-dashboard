<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/sku-auth.php';

jg_admin_require_auth_json();

header('Content-Type: application/json; charset=utf-8');

function jg_branch_tier_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

function jg_branch_tier_request(): array
{
    $raw = file_get_contents('php://input');
    $decoded = json_decode((string) $raw, true);
    return is_array($decoded) ? $decoded : [];
}

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

if ($method === 'GET') {
    jg_branch_tier_response([
        'ok' => true,
        'branch_unlocked' => false,
    ]);
}

if ($method !== 'POST') {
    jg_branch_tier_response(['error' => 'Method not allowed.'], 405);
}

$request = jg_branch_tier_request();
$password = (string) ($request['password'] ?? '');
if (!jg_sku_password_matches($password, jg_sku_branch_password_hash())) {
    jg_branch_tier_response(['error' => 'Branch Tier Access password is invalid.'], 403);
}

$unlockToken = bin2hex(random_bytes(32));
jg_admin_start_session();
$_SESSION['jg_partner_password_unlock_hash'] = hash('sha256', $unlockToken);
$_SESSION['jg_partner_password_unlock_expires_at'] = time() + 600;

jg_branch_tier_response([
    'ok' => true,
    'branch_unlocked' => true,
    'unlock_token' => $unlockToken,
    'expires_in_seconds' => 600,
]);
