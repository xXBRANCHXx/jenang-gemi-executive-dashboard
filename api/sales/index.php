<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/config.php';
require_once dirname(__DIR__, 2) . '/auth.php';

jg_admin_require_auth();

header('Content-Type: application/json; charset=utf-8');

$action = strtolower(trim((string) ($_GET['action'] ?? 'summary')));

function jg_dashboard_sales_bool(mixed $value): bool
{
    return in_array(strtolower(trim((string) $value)), ['1', 'true', 'yes', 'on'], true);
}

if ($action === 'sku_catalog') {
    require_once dirname(__DIR__, 2) . '/sku-db-bootstrap.php';

    try {
        $pdo = jg_sku_db();
        $brands = [];

        $brandStmt = $pdo->query('SELECT id, name, code FROM sku_brands ORDER BY CAST(code AS UNSIGNED), name');
        foreach ($brandStmt->fetchAll() as $row) {
            $brands[(string) $row['id']] = [
                'id' => (string) $row['id'],
                'name' => (string) $row['name'],
                'code' => (string) $row['code'],
                'products' => [],
            ];
        }

        $productStmt = $pdo->query('SELECT id, brand_id, name, code FROM sku_products ORDER BY brand_id, CAST(code AS UNSIGNED), name');
        foreach ($productStmt->fetchAll() as $row) {
            $brandId = (string) $row['brand_id'];
            if (!isset($brands[$brandId])) {
                continue;
            }
            $brands[$brandId]['products'][(string) $row['id']] = [
                'id' => (string) $row['id'],
                'brand_id' => $brandId,
                'name' => (string) $row['name'],
                'code' => (string) $row['code'],
                'flavors' => [],
            ];
        }

        $flavorStmt = $pdo->query('SELECT id, brand_id, name, code FROM sku_flavors ORDER BY brand_id, CAST(code AS UNSIGNED), name');
        foreach ($flavorStmt->fetchAll() as $row) {
            $brandId = (string) $row['brand_id'];
            if (!isset($brands[$brandId])) {
                continue;
            }

            $flavor = [
                'id' => (string) $row['id'],
                'brand_id' => $brandId,
                'name' => (string) $row['name'],
                'code' => (string) $row['code'],
            ];

            foreach ($brands[$brandId]['products'] as &$product) {
                $product['flavors'][] = $flavor;
            }
            unset($product);
        }

        $catalog = array_map(static function (array $brand): array {
            $brand['products'] = array_values($brand['products']);
            return $brand;
        }, array_values($brands));

        echo json_encode([
            'ok' => true,
            'catalog' => $catalog,
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    } catch (Throwable $error) {
        http_response_code(500);
        echo json_encode([
            'ok' => false,
            'error' => 'sku_catalog_unavailable',
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
    exit;
}

$year = max(2026, (int) ($_GET['year'] ?? gmdate('Y')));
$setupToken = jg_dashboard_marketplace_api_setup_token();
if ($setupToken === '') {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'missing_marketplace_api_setup_token',
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

$query = [
    'setup_token' => $setupToken,
];
$path = '/sales/summary';

if ($action === 'orders') {
    $path = '/sales/orders';
    $startDate = trim((string) ($_GET['start_date'] ?? ''));
    $endDate = trim((string) ($_GET['end_date'] ?? $startDate));
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
        http_response_code(422);
        echo json_encode([
            'ok' => false,
            'error' => 'invalid_sales_order_date_range',
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }
    $query['start_date'] = $startDate;
    $query['end_date'] = $endDate;
    if (jg_dashboard_sales_bool($_GET['lightweight'] ?? null)) {
        $query['lightweight'] = '1';
    }
    if (jg_dashboard_sales_bool($_GET['skip_sync'] ?? $_GET['skip_on_demand'] ?? null) || trim((string) ($_GET['sync'] ?? '')) === '0') {
        $query['skip_sync'] = '1';
    }
    $limit = (int) ($_GET['limit'] ?? 0);
    if ($limit > 0) {
        $query['limit'] = (string) min(500, $limit);
    }
    $offset = (int) ($_GET['offset'] ?? 0);
    if ($offset > 0) {
        $query['offset'] = (string) $offset;
    }
} else {
    $query['year'] = (string) $year;
}

$url = jg_dashboard_marketplace_api_base_url()
    . $path
    . '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986);

$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'timeout' => $action === 'orders' ? 15 : 45,
        'header' => "Accept: application/json\r\n",
        'ignore_errors' => true,
    ],
]);

$response = @file_get_contents($url, false, $context);
if (!is_string($response) || $response === '') {
    http_response_code(502);
    echo json_encode([
        'ok' => false,
        'error' => 'marketplace_sales_upstream_unreachable',
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

$status = 200;
foreach (($http_response_header ?? []) as $headerLine) {
    if (preg_match('#^HTTP/\S+\s+(\d{3})#', (string) $headerLine, $matches)) {
        $status = (int) ($matches[1] ?? 200);
        break;
    }
}

http_response_code($status >= 100 ? $status : 200);
echo $response;
