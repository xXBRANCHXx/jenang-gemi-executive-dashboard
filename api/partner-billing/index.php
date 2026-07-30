<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/auth.php';
jg_admin_require_auth_json();

require_once dirname(__DIR__, 2) . '/partner-billing-bootstrap.php';
require_once dirname(__DIR__, 2) . '/accounting-bootstrap.php';

function jg_admin_partner_billing_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function jg_admin_partner_billing_request(): array
{
    if (str_contains(strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? '')), 'multipart/form-data')) {
        return $_POST;
    }
    $decoded = json_decode((string) file_get_contents('php://input'), true);
    return is_array($decoded) ? $decoded : [];
}

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$action = strtolower(trim((string) ($_GET['action'] ?? 'notifications')));
$endpoint = '/api/partner-billing/';

try {
    $partnerPdo = jg_admin_partner_billing_db();
    if ($method === 'GET' && $action === 'file') {
        $fileId = (int) ($_GET['id'] ?? 0);
        if ($fileId <= 0) throw new InvalidArgumentException('File not found.');
        jg_admin_partner_billing_stream_file($partnerPdo, $fileId);
    }
    if ($method === 'GET' && $action === 'favicon') {
        jg_admin_partner_billing_stream_favicon($partnerPdo, (string) ($_GET['partner_code'] ?? ''));
    }
    if ($method === 'GET' && $action === 'notifications') {
        jg_admin_partner_billing_json([
            'ok' => true,
            'notifications' => jg_admin_partner_billing_notifications($endpoint),
            'generated_at' => gmdate(DATE_ATOM),
        ]);
    }
    if ($method !== 'POST') {
        jg_admin_partner_billing_json(['ok' => false, 'error' => 'Method not allowed.'], 405);
    }

    $request = jg_admin_partner_billing_request();
    $action = strtolower(trim((string) ($request['action'] ?? $action)));
    if ($action === 'confirm_payment') {
        $accountingPdo = analyticsDb();
        $result = jg_admin_partner_billing_confirm_payment($partnerPdo, $accountingPdo, (int) ($request['payment_id'] ?? 0));
        jg_admin_partner_billing_json([
            'ok' => true,
            'result' => $result,
            'notifications' => jg_admin_partner_billing_notifications($endpoint),
        ]);
    }
    if ($action === 'accept_dispute') {
        $result = jg_admin_partner_billing_accept_dispute($partnerPdo, (int) ($request['dispute_id'] ?? 0));
        jg_admin_partner_billing_json([
            'ok' => true,
            'result' => $result,
            'notifications' => jg_admin_partner_billing_notifications($endpoint),
        ]);
    }
    if ($action === 'reject_dispute') {
        $file = isset($_FILES['evidence']) && is_array($_FILES['evidence']) ? $_FILES['evidence'] : null;
        $result = jg_admin_partner_billing_reject_dispute(
            $partnerPdo,
            (int) ($request['dispute_id'] ?? 0),
            (string) ($request['reason'] ?? ''),
            $file
        );
        jg_admin_partner_billing_json([
            'ok' => true,
            'result' => $result,
            'notifications' => jg_admin_partner_billing_notifications($endpoint),
        ]);
    }

    jg_admin_partner_billing_json(['ok' => false, 'error' => 'Unknown partner billing action.'], 400);
} catch (InvalidArgumentException $error) {
    jg_admin_partner_billing_json(['ok' => false, 'error' => $error->getMessage()], 422);
} catch (RuntimeException $error) {
    jg_admin_partner_billing_json(['ok' => false, 'error' => $error->getMessage()], 409);
} catch (Throwable $error) {
    error_log('Admin partner billing failed: ' . $error->getMessage());
    jg_admin_partner_billing_json(['ok' => false, 'error' => 'Partner billing is temporarily unavailable.'], 500);
}
