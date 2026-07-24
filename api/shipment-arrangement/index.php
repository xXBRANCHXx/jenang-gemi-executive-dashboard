<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/sku-auth.php';
require_once dirname(__DIR__, 2) . '/website-commerce-bootstrap.php';

jg_admin_require_auth_json();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function jg_shipment_arrangement_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function jg_shipment_arrangement_request(string $method, string $path, ?array $payload = null): array
{
    $token = jg_website_store_ops_token();
    if ($token === '') {
        throw new RuntimeException('Shipment arrangement API token is not configured.');
    }
    $headers = "Accept: application/json\r\nAuthorization: Bearer {$token}\r\n";
    $options = [
        'method' => $method,
        'header' => $headers,
        'timeout' => 20,
        'ignore_errors' => true,
    ];
    if ($payload !== null) {
        $body = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if (!is_string($body)) {
            throw new RuntimeException('Unable to encode shipment arrangement request.');
        }
        $options['header'] .= "Content-Type: application/json\r\n";
        $options['content'] = $body;
    }
    $raw = @file_get_contents(
        jg_dashboard_marketplace_api_base_url() . $path,
        false,
        stream_context_create(['http' => $options])
    );
    $response = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($response) || empty($response['ok'])) {
        throw new RuntimeException((string) ($response['error'] ?? 'Shipment arrangement service is unavailable.'));
    }
    return $response;
}

function jg_shipment_arrangement_status_key(array $order, bool $includePackage = true): string
{
    return implode('|', [
        strtolower(trim((string) ($order['platform'] ?? ''))),
        strtolower(trim((string) ($order['account_key'] ?? ''))),
        trim((string) ($order['order_id'] ?? '')),
        $includePackage ? trim((string) ($order['package_id'] ?? '')) : '',
    ]);
}

function jg_shipment_arrangement_merge_marketplace_statuses(array $result, array $statusResult): array
{
    $statusRows = is_array($statusResult['orders'] ?? null) ? $statusResult['orders'] : [];
    $byPackage = [];
    $byOrder = [];
    foreach ($statusRows as $statusRow) {
        if (!is_array($statusRow)) {
            continue;
        }
        $byPackage[jg_shipment_arrangement_status_key($statusRow)] = $statusRow;
        $byOrder[jg_shipment_arrangement_status_key($statusRow, false)] = $statusRow;
    }

    $orders = is_array($result['orders'] ?? null) ? $result['orders'] : [];
    foreach ($orders as &$order) {
        if (!is_array($order)) {
            continue;
        }
        $statusRow = $byPackage[jg_shipment_arrangement_status_key($order)]
            ?? $byOrder[jg_shipment_arrangement_status_key($order, false)]
            ?? null;
        if (!is_array($statusRow)) {
            continue;
        }
        foreach (['marketplace_order_status', 'marketplace_package_status'] as $field) {
            if (array_key_exists($field, $statusRow)) {
                $order[$field] = $statusRow[$field];
            }
        }
    }
    unset($order);
    $result['orders'] = $orders;
    return $result;
}

try {
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $access = [
        'branch' => jg_sku_is_branch(),
        'username' => jg_sku_is_branch() ? jg_sku_session_username() : '',
    ];

    if ($method === 'GET') {
        $limit = max(25, min(500, (int) ($_GET['limit'] ?? 300)));
        $result = jg_shipment_arrangement_request('GET', '/fulfillment/arrangement-map?limit=' . $limit);
        try {
            $statusResult = jg_shipment_arrangement_request('GET', '/fulfillment/orders?limit=' . $limit);
            $result = jg_shipment_arrangement_merge_marketplace_statuses($result, $statusResult);
        } catch (Throwable) {
            // The arrangement map remains usable while the status audit endpoint recovers.
        }
        $result['access'] = $access;
        jg_shipment_arrangement_json($result);
    }

    if ($method === 'POST') {
        if (!jg_sku_is_branch()) {
            jg_shipment_arrangement_json([
                'ok' => false,
                'error' => 'Branch-tier credentials are required to change arrangement rules.',
                'access' => $access,
            ], 403);
        }
        $body = json_decode((string) file_get_contents('php://input'), true);
        $body = is_array($body) ? $body : [];
        $result = jg_shipment_arrangement_request('POST', '/fulfillment/arrangement-policy', [
            'policy' => is_array($body['policy'] ?? null) ? $body['policy'] : [],
            'expected_revision' => (int) ($body['expected_revision'] ?? 0),
            'updated_by' => 'Branch tier: ' . jg_sku_session_username(),
        ]);
        $result['access'] = $access;
        jg_shipment_arrangement_json($result);
    }

    jg_shipment_arrangement_json(['ok' => false, 'error' => 'Method not allowed.'], 405);
} catch (Throwable $error) {
    jg_shipment_arrangement_json(['ok' => false, 'error' => $error->getMessage()], 502);
}
