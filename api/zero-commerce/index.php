<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/zero-commerce-bootstrap.php';

$origin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
$allowedOrigins = ['https://zerofoods.id', 'https://www.zerofoods.id'];
if (jg_zero_commerce_mode() === 'sandbox') {
    $allowedOrigins[] = 'http://localhost:5173';
    $allowedOrigins[] = 'http://127.0.0.1:5173';
}
if (in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Idempotency-Key');
header('Cache-Control: no-store');
if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function jg_zero_commerce_json(array $payload, int $status = 200): never
{
    header('Content-Type: application/json; charset=utf-8');
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function jg_zero_commerce_raw_body(): string
{
    static $raw = null;
    if (is_string($raw)) {
        return $raw;
    }
    $value = file_get_contents('php://input');
    $raw = is_string($value) ? $value : '';
    return $raw;
}

function jg_zero_commerce_body(): array
{
    $raw = jg_zero_commerce_raw_body();
    $decoded = is_string($raw) ? json_decode($raw, true) : null;
    return is_array($decoded) ? $decoded : [];
}

function jg_zero_commerce_check_origin(string $origin, array $allowedOrigins): void
{
    if ($origin !== '' && !in_array($origin, $allowedOrigins, true)) {
        jg_zero_commerce_json(['ok' => false, 'error' => 'Origin is not allowed.'], 403);
    }
}

try {
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $action = strtolower(trim((string) ($_GET['action'] ?? 'status')));

    if (
        $method === 'POST'
        && $action === 'biteship_webhook'
        && jg_zero_biteship_installation_probe(jg_zero_commerce_raw_body())
    ) {
        jg_zero_commerce_json(['ok' => true, 'validation' => true]);
    }

    jg_zero_commerce_require_enabled();
    $pdo = analyticsDb();
    jg_zero_commerce_ensure_schema($pdo);

    if ($method === 'POST' && $action === 'duitku_callback') {
        if (!jg_zero_duitku_callback_ip_allowed((string) ($_SERVER['REMOTE_ADDR'] ?? ''))) {
            jg_zero_commerce_json(['ok' => false, 'error' => 'Duitku callback source is not allowed.'], 403);
        }
        $result = jg_zero_duitku_callback($pdo, $_POST);
        jg_zero_commerce_json(['ok' => true] + $result);
    }

    if ($method === 'POST' && $action === 'biteship_webhook') {
        if (!jg_zero_biteship_webhook_authorized($_SERVER)) {
            jg_zero_commerce_json(['ok' => false, 'error' => 'Biteship webhook authentication failed.'], 403);
        }
        jg_zero_commerce_json(['ok' => true] + jg_zero_biteship_webhook($pdo, jg_zero_commerce_body()));
    }

    if ($method === 'GET' && $action === 'label') {
        jg_admin_require_auth_json();
        header('Content-Type: text/html; charset=utf-8');
        echo jg_zero_shipping_label_html($pdo, (string) ($_GET['order'] ?? ''));
        exit;
    }

    if ($method === 'POST' && $action === 'retry_shipment') {
        jg_admin_require_auth_json();
        jg_zero_commerce_json([
            'ok' => true,
            'shipment' => jg_zero_create_biteship_shipment($pdo, (string) (jg_zero_commerce_body()['order_id'] ?? '')),
        ]);
    }

    jg_zero_commerce_check_origin($origin, $allowedOrigins);
    if ($method === 'GET' && $action === 'areas') {
        jg_zero_commerce_json(['ok' => true, 'areas' => jg_zero_biteship_search_areas((string) ($_GET['q'] ?? ''))]);
    }
    if ($method === 'GET' && $action === 'status') {
        jg_zero_commerce_json([
            'ok' => true,
            'order' => jg_zero_commerce_status(
                $pdo,
                (string) ($_GET['order'] ?? ''),
                (string) ($_GET['token'] ?? '')
            ),
        ]);
    }
    if ($method === 'POST' && $action === 'rates') {
        jg_zero_commerce_json(['ok' => true] + jg_zero_shipping_rates(jg_sku_db(), jg_zero_commerce_body()));
    }
    if ($method === 'POST' && $action === 'checkout') {
        $body = jg_zero_commerce_body();
        $headerKey = trim((string) ($_SERVER['HTTP_X_IDEMPOTENCY_KEY'] ?? ''));
        if ($headerKey !== '') {
            $body['idempotency_key'] = $headerKey;
        }
        jg_zero_commerce_json(['ok' => true, 'checkout' => jg_zero_commerce_checkout($pdo, jg_sku_db(), $body)], 201);
    }
    jg_zero_commerce_json(['ok' => false, 'error' => 'Unknown ZERO commerce action.'], 404);
} catch (InvalidArgumentException $error) {
    jg_zero_commerce_json(['ok' => false, 'error' => $error->getMessage()], 422);
} catch (RuntimeException $error) {
    jg_zero_commerce_json(['ok' => false, 'error' => $error->getMessage()], 409);
} catch (Throwable $error) {
    error_log('ZERO commerce API failed: ' . $error->getMessage());
    jg_zero_commerce_json(['ok' => false, 'error' => 'ZERO commerce service is unavailable.'], 500);
}
