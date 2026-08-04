<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/auth.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

function jg_daily_columns_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
    header('Allow: POST');
    jg_daily_columns_json(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

jg_admin_require_auth_json();

$rawBody = file_get_contents('php://input');
$request = json_decode(is_string($rawBody) ? $rawBody : '', true);
if (!is_array($request) || (string) ($request['action'] ?? '') !== 'verify_remove') {
    jg_daily_columns_json(['ok' => false, 'error' => 'Invalid removal verification request.'], 422);
}

$pin = is_string($request['pin'] ?? null) ? (string) $request['pin'] : '';
if (!jg_admin_code_matches($pin)) {
    jg_daily_columns_json(['ok' => false, 'error' => 'Dashboard PIN is incorrect.'], 403);
}

jg_daily_columns_json(['ok' => true, 'verified' => true]);
