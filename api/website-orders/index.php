<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/website-commerce-bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$origin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
$allowedOrigins = [
    'https://zerofoods.id',
    'https://www.zerofoods.id',
    'https://jenanggemi.com',
    'https://www.jenanggemi.com',
];
if (defined('JG_WEBSITE_ORDER_PLATFORM')) {
    $allowedOrigins = JG_WEBSITE_ORDER_PLATFORM === 'zero_website'
        ? ['https://zerofoods.id', 'https://www.zerofoods.id']
        : ['https://jenanggemi.com', 'https://www.jenanggemi.com'];
}
if (in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Idempotency-Key');
if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function jg_website_orders_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function jg_website_orders_body(): array
{
    $raw = file_get_contents('php://input');
    $decoded = is_string($raw) ? json_decode($raw, true) : null;
    return is_array($decoded) ? $decoded : [];
}

function jg_website_orders_require_token(): void
{
    $token = jg_website_store_ops_token();
    if (jg_website_token_matches($token)) {
        return;
    }
    jg_website_orders_json(['ok' => false, 'error' => 'Unauthorized'], 401);
}

function jg_website_orders_emit_label(PDO $pdo, string $orderId, bool $storeOps = false): never
{
    if ($storeOps) {
        jg_website_orders_require_token();
    } else {
        jg_admin_require_auth_json();
    }
    $row = jg_website_order_internal_row($pdo, $orderId);
    $storageKey = basename((string) ($row['label_storage_key'] ?? ''));
    if ($storageKey === '') {
        jg_website_orders_json(['ok' => false, 'error' => 'Shipping label not found.'], 404);
    }
    $path = jg_website_label_directory() . '/' . $storageKey;
    if (!is_file($path)) {
        jg_website_orders_json(['ok' => false, 'error' => 'Shipping label not found.'], 404);
    }
    header_remove('Content-Type');
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . addcslashes((string) ($row['label_original_name'] ?: 'shipping-label.pdf'), "\\\"") . '"');
    header('Content-Length: ' . (string) filesize($path));
    header('Cache-Control: private, no-store');
    readfile($path);
    exit;
}

try {
    $pdo = analyticsDb();
    jg_website_ensure_schema($pdo);
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $action = strtolower(trim((string) ($_GET['action'] ?? 'notifications')));

    if ($method === 'GET' && $action === 'feed') {
        jg_website_orders_require_token();
        $hardSet = jg_hard_set_state($pdo);
        jg_website_orders_json([
            'ok' => true,
            'hard_set' => $hardSet,
            'orders' => jg_website_feed_orders($pdo),
        ]);
    }

    if ($method === 'GET' && in_array($action, ['label', 'store_ops_label'], true)) {
        jg_website_orders_emit_label(
            $pdo,
            trim((string) ($_GET['order'] ?? '')),
            $action === 'store_ops_label'
        );
    }

    if ($method === 'POST' && $action === 'checkout') {
        if ($origin !== '' && !in_array($origin, $allowedOrigins, true)) {
            jg_website_orders_json(['ok' => false, 'error' => 'Origin is not allowed.'], 403);
        }
        $body = jg_website_orders_body();
        if (defined('JG_WEBSITE_ORDER_PLATFORM')) {
            $body['platform'] = JG_WEBSITE_ORDER_PLATFORM;
        }
        $headerIdempotency = trim((string) ($_SERVER['HTTP_X_IDEMPOTENCY_KEY'] ?? ''));
        if ($headerIdempotency !== '') {
            $body['idempotency_key'] = $headerIdempotency;
        }
        $order = jg_website_create_order($pdo, jg_sku_db(), $body);
        jg_website_orders_json(['ok' => true, 'order' => $order], 201);
    }

    if ($method === 'POST' && $action === 'status_callback') {
        jg_website_orders_require_token();
        $body = jg_website_orders_body();
        $order = jg_website_update_status(
            $pdo,
            trim((string) ($body['order_id'] ?? $body['order'] ?? '')),
            (string) ($body['status'] ?? '')
        );
        jg_website_orders_json(['ok' => true, 'order' => $order]);
    }

    jg_admin_require_auth_json();

    if ($method === 'GET' && $action === 'notifications') {
        jg_website_orders_json([
            'ok' => true,
            'hard_set' => jg_hard_set_state($pdo),
            'orders' => jg_website_notifications($pdo),
            'metrics' => jg_website_metrics($pdo),
        ]);
    }
    if ($method === 'GET' && $action === 'metrics') {
        $platform = trim((string) ($_GET['platform'] ?? ''));
        $year = (int) ($_GET['year'] ?? 0);
        jg_website_orders_json([
            'ok' => true,
            'metrics' => jg_website_metrics($pdo, $platform !== '' ? $platform : null, $year > 0 ? $year : null),
        ]);
    }
    if ($method !== 'POST') {
        jg_website_orders_json(['ok' => false, 'error' => 'Unknown action.'], 404);
    }

    $body = str_starts_with(strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? '')), 'multipart/form-data')
        ? $_POST
        : jg_website_orders_body();
    $orderId = trim((string) ($body['order_id'] ?? $body['order'] ?? ''));

    if ($action === 'paid') {
        jg_website_orders_json(['ok' => true, 'order' => jg_website_order_mark_paid($pdo, $orderId)]);
    }
    if ($action === 'remove') {
        jg_website_order_remove($pdo, $orderId);
        jg_website_orders_json(['ok' => true]);
    }
    if ($action === 'upload_label') {
        $upload = $_FILES['label'] ?? null;
        if (!is_array($upload)) {
            throw new InvalidArgumentException('A PDF shipping label is required.');
        }
        jg_website_orders_json(['ok' => true, 'order' => jg_website_store_label($pdo, $orderId, $upload)]);
    }
    if ($action === 'deadline') {
        jg_website_orders_json([
            'ok' => true,
            'order' => jg_website_set_deadline($pdo, $orderId, (int) ($body['deadline_hours'] ?? 0)),
        ]);
    }
    if (in_array($action, ['publish', 'retry_publish'], true)) {
        jg_website_orders_json(['ok' => true, 'order' => jg_website_publish_order($pdo, $orderId)]);
    }

    jg_website_orders_json(['ok' => false, 'error' => 'Unknown action.'], 404);
} catch (InvalidArgumentException $error) {
    jg_website_orders_json(['ok' => false, 'error' => $error->getMessage()], 422);
} catch (RuntimeException $error) {
    jg_website_orders_json(['ok' => false, 'error' => $error->getMessage()], 409);
} catch (Throwable $error) {
    error_log('Website order API failed: ' . $error->getMessage());
    jg_website_orders_json(['ok' => false, 'error' => 'Website order service is unavailable.'], 500);
}
