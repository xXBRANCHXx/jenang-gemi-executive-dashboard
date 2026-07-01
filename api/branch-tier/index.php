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
        'branch_unlocked' => jg_sku_is_branch(),
    ]);
}

if ($method !== 'POST') {
    jg_branch_tier_response(['error' => 'Method not allowed.'], 405);
}

$request = jg_branch_tier_request();
$password = (string) ($request['password'] ?? '');
if (!jg_sku_unlock_branch_tier_for_admin($password)) {
    jg_branch_tier_response(['error' => 'Branch Tier Access password is invalid.'], 403);
}

jg_branch_tier_response([
    'ok' => true,
    'branch_unlocked' => true,
]);
