<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/config.php';
require_once dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/sku-db-bootstrap.php';

jg_admin_require_auth();

header('Content-Type: application/json; charset=utf-8');

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

$url = jg_dashboard_marketplace_api_base_url()
    . '/sales/summary?setup_token=' . rawurlencode($setupToken)
    . '&year=' . rawurlencode((string) $year);

$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'timeout' => 45,
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

$decoded = json_decode($response, true);
if (is_array($decoded) && ($status < 400 || $status === 200)) {
    $decoded = jg_sales_enrich_with_sku_db($decoded);
    echo json_encode($decoded, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

echo $response;

function jg_sales_normalize_sku_key(mixed $value): string
{
    return strtoupper(trim((string) $value));
}

/**
 * @return array<string, array{sku:string, tag:string, product_name:string, flavor_name:string, is_syrup:bool}>
 */
function jg_sales_sku_lookup(): array
{
    try {
        $pdo = jg_sku_db();
        $stmt = $pdo->query(
            'SELECT s.sku, s.tag, p.name AS product_name, f.name AS flavor_name
             FROM sku_skus s
             INNER JOIN sku_products p ON p.id = s.product_id
             INNER JOIN sku_flavors f ON f.id = s.flavor_id'
        );
        if ($stmt === false) {
            return [];
        }
    } catch (Throwable $error) {
        error_log('Unable to load SKU DB for sales enrichment: ' . $error->getMessage());
        return [];
    }

    $lookup = [];
    foreach ($stmt->fetchAll() as $row) {
        $productName = (string) ($row['product_name'] ?? '');
        $record = [
            'sku' => (string) ($row['sku'] ?? ''),
            'tag' => (string) ($row['tag'] ?? ''),
            'product_name' => $productName,
            'flavor_name' => (string) ($row['flavor_name'] ?? 'Unspecified'),
            'is_syrup' => str_contains(strtolower($productName), 'syrup') || str_contains(strtolower($productName), 'sirup'),
        ];

        foreach ([$record['sku'], $record['tag']] as $keyValue) {
            $key = jg_sales_normalize_sku_key($keyValue);
            if ($key !== '') {
                $lookup[$key] = $record;
            }
        }
    }

    return $lookup;
}

/**
 * @param array<string, mixed> $current
 * @return array<string, mixed>
 */
function jg_sales_add_product_total(array $current, int $quantity, int $netRevenue, int $grossRevenue, int $orders = 0): array
{
    $current['quantity'] = (int) ($current['quantity'] ?? 0) + $quantity;
    $current['net_revenue'] = (int) ($current['net_revenue'] ?? 0) + $netRevenue;
    $current['gross_revenue'] = (int) ($current['gross_revenue'] ?? 0) + $grossRevenue;
    $current['orders'] = (int) ($current['orders'] ?? 0) + $orders;
    return $current;
}

/**
 * @param array<string, mixed> $summary
 * @return array<string, mixed>
 */
function jg_sales_enrich_with_sku_db(array $summary): array
{
    $lookup = jg_sales_sku_lookup();
    if ($lookup === []) {
        return $summary;
    }

    $products = is_array($summary['products'] ?? null) ? $summary['products'] : [];
    $rows = is_array($products['by_product'] ?? null) ? $products['by_product'] : [];
    $flavors = [];

    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }
        $sku = jg_sales_normalize_sku_key($row['sku'] ?? '');
        $skuRecord = $lookup[$sku] ?? null;
        if (!$skuRecord || empty($skuRecord['is_syrup'])) {
            continue;
        }

        $flavorName = trim($skuRecord['flavor_name']) !== '' ? $skuRecord['flavor_name'] : 'Unspecified';
        $flavorKey = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $flavorName) ?? $flavorName);
        $flavorKey = trim($flavorKey, '-');
        $quantity = (int) ($row['quantity'] ?? 0);
        $net = (int) round((float) ($row['net_revenue'] ?? 0));
        $gross = (int) round((float) ($row['gross_revenue'] ?? 0));

        $flavors[$flavorKey] = jg_sales_add_product_total($flavors[$flavorKey] ?? [
            'key' => $flavorKey,
            'label' => $flavorName,
            'platforms' => [],
        ], $quantity, $net, $gross, (int) ($row['orders'] ?? 0));

        $platforms = is_array($row['platforms'] ?? null) ? $row['platforms'] : [];
        foreach ($platforms as $platformKey => $platformRow) {
            if (!is_array($platformRow)) {
                continue;
            }
            $platform = (string) $platformKey;
            $flavors[$flavorKey]['platforms'][$platform] = jg_sales_add_product_total($flavors[$flavorKey]['platforms'][$platform] ?? [
                'key' => $platform,
                'label' => (string) ($platformRow['label'] ?? ucfirst($platform)),
            ], (int) ($platformRow['quantity'] ?? 0), (int) round((float) ($platformRow['net_revenue'] ?? 0)), (int) round((float) ($platformRow['gross_revenue'] ?? 0)), (int) ($platformRow['orders'] ?? 0));
        }
    }

    $flavorRows = array_values($flavors);
    usort($flavorRows, static fn (array $left, array $right): int => (int) ($right['quantity'] ?? 0) <=> (int) ($left['quantity'] ?? 0));
    $products['syrup_flavors'] = array_slice($flavorRows, 0, 16);
    $products['syrup_flavor_source'] = 'sku_db';
    $summary['products'] = $products;

    return $summary;
}
