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

try {
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $access = [
        'branch' => jg_sku_is_branch(),
        'username' => jg_sku_is_branch() ? jg_sku_session_username() : '',
    ];

    if ($method === 'GET') {
        $limit = max(25, min(500, (int) ($_GET['limit'] ?? 300)));
        $result = jg_shipment_arrangement_request('GET', '/fulfillment/arrangement-map?limit=' . $limit);
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
