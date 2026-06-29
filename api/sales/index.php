<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/config.php';
require_once dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/sku-db-bootstrap.php';
require_once dirname(__DIR__, 2) . '/analytics-bootstrap.php';
require_once dirname(__DIR__, 2) . '/executive-context.php';
require_once dirname(__DIR__, 2) . '/website-commerce-bootstrap.php';

jg_admin_require_auth();

header('Content-Type: application/json; charset=utf-8');

$action = strtolower(trim((string) ($_GET['action'] ?? 'summary')));
if ($action === 'sku_catalog') {
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

        $skus = [];
        $skuStmt = $pdo->query(
            'SELECT
                s.sku,
                s.tag,
                b.name AS brand_name,
                p.name AS product_name,
                f.name AS flavor_name
             FROM sku_skus s
             INNER JOIN sku_brands b ON b.id = s.brand_id
             INNER JOIN sku_products p ON p.id = s.product_id
             INNER JOIN sku_flavors f ON f.id = s.flavor_id
             ORDER BY b.name, p.name, f.name, s.sku'
        );
        foreach ($skuStmt->fetchAll() as $row) {
            $skus[] = [
                'sku' => (string) ($row['sku'] ?? ''),
                'tag' => (string) ($row['tag'] ?? ''),
                'brand_name' => (string) ($row['brand_name'] ?? ''),
                'product_name' => (string) ($row['product_name'] ?? ''),
                'flavor_name' => (string) ($row['flavor_name'] ?? ''),
            ];
        }

        $catalog = array_map(static function (array $brand): array {
            $brand['products'] = array_values($brand['products']);
            return $brand;
        }, array_values($brands));

        echo json_encode([
            'ok' => true,
            'catalog' => $catalog,
            'skus' => $skus,
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

$year = max(2025, (int) ($_GET['year'] ?? gmdate('Y')));
$setupToken = jg_dashboard_marketplace_api_setup_token();
if ($setupToken === '') {
    $contextOnly = jg_sales_context_only_summary($year);
    if ($contextOnly !== null) {
        echo json_encode($contextOnly, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'missing_marketplace_api_setup_token',
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

$includeAudit = in_array(strtolower(trim((string) ($_GET['audit'] ?? $_GET['include_audit'] ?? ''))), ['1', 'true', 'yes', 'on'], true);
$cacheKey = 'sales-summary-base-v3-' . $year . ($includeAudit ? '-audit' : '-core');

if ($action === 'refresh') {
    if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
        header('Allow: POST');
        http_response_code(405);
        echo json_encode([
            'ok' => false,
            'error' => 'method_not_allowed',
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    $refresh = jg_sales_run_manual_refresh($setupToken, $year, $includeAudit);
    if (empty($refresh['ok']) || !is_array($refresh['payload'] ?? null)) {
        http_response_code((int) ($refresh['status'] ?? 502));
        echo json_encode([
            'ok' => false,
            'error' => (string) ($refresh['error'] ?? 'marketplace_refresh_failed'),
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    $decoded = $refresh['payload'];
    $syncDetails = is_array($decoded['sync'] ?? null) ? $decoded['sync'] : [];
    unset($decoded['sync']);
    $decoded = jg_sales_enrich_with_sku_db($decoded, $year);
    jg_sales_remove_customer_paid_fields($decoded);
    $baseEncoded = json_encode($decoded, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (!is_string($baseEncoded)) {
        http_response_code(500);
        echo json_encode([
            'ok' => false,
            'error' => 'marketplace_refresh_encoding_failed',
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    jg_sales_cache_write($cacheKey, $baseEncoded);
    $prepared = json_decode(jg_sales_prepare_cached_response($baseEncoded, $year, $includeAudit), true);
    if (!is_array($prepared)) {
        $prepared = $decoded;
    }
    $prepared['manual_refresh'] = [
        'ok' => true,
        'completed_at' => gmdate(DATE_ATOM),
        'mode' => 'marketplace_rolling_sync',
        'stored' => (int) ($syncDetails['stored'] ?? 0),
        'accounts_checked' => (int) ($syncDetails['status']['accounts_checked'] ?? count($syncDetails['accounts'] ?? [])),
        'accounts_ok' => (int) ($syncDetails['status']['accounts_ok'] ?? 0),
    ];
    header('X-JG-Cache: CLIENT-REFRESH');
    echo json_encode($prepared, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

$urlParams = [
    'setup_token' => $setupToken,
    'year' => (string) $year,
];
if ($includeAudit) {
    $urlParams['audit'] = '1';
}
$url = jg_dashboard_marketplace_api_base_url() . '/sales/summary?' . http_build_query($urlParams);

$forceRefresh = (string) ($_GET['refresh'] ?? '') === '1';
$cachedResponse = $forceRefresh ? null : jg_sales_cache_read($cacheKey, 0);
if (is_string($cachedResponse)) {
    header('X-JG-Cache: STALE-FAST');
    echo jg_sales_prepare_cached_response($cachedResponse, $year, $includeAudit);
    exit;
}

$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'timeout' => 12,
        'header' => "Accept: application/json\r\n",
        'ignore_errors' => true,
    ],
]);

$response = @file_get_contents($url, false, $context);
if (!is_string($response) || $response === '') {
    $staleResponse = jg_sales_cache_read($cacheKey, 0);
    if (is_string($staleResponse)) {
        header('X-JG-Cache: STALE');
        echo jg_sales_prepare_cached_response($staleResponse, $year, $includeAudit);
        exit;
    }
    $contextOnly = jg_sales_context_only_summary($year);
    if ($contextOnly !== null) {
        echo json_encode($contextOnly, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

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

$decoded = json_decode($response, true);
if (is_array($decoded) && ($status < 400 || $status === 200)) {
    http_response_code($status >= 100 ? $status : 200);
    $decoded = jg_sales_enrich_with_sku_db($decoded, $year);
    jg_sales_remove_customer_paid_fields($decoded);
    $baseEncoded = json_encode($decoded, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (is_string($baseEncoded)) {
        jg_sales_cache_write($cacheKey, $baseEncoded);
        header('X-JG-Cache: MISS');
        echo jg_sales_prepare_cached_response($baseEncoded, $year, $includeAudit);
    } else {
        echo '{}';
    }
    exit;
}

$staleResponse = jg_sales_cache_read($cacheKey, 0);
if (is_string($staleResponse)) {
    header('X-JG-Cache: STALE');
    echo jg_sales_prepare_cached_response($staleResponse, $year, $includeAudit);
    exit;
}

$contextOnly = jg_sales_context_only_summary($year);
if ($contextOnly !== null) {
    echo json_encode($contextOnly, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code($status >= 100 ? $status : 200);
echo $response;

function jg_sales_normalize_sku_key(mixed $value): string
{
    return strtoupper(trim((string) $value));
}

function jg_sales_prepare_cached_response(string $baseResponse, int $year, bool $includeAudit): string
{
    $decoded = json_decode($baseResponse, true);
    if (!is_array($decoded)) {
        return $baseResponse;
    }

    try {
        $decoded = jg_website_merge_sales_summary(analyticsDb(), $decoded, $year);
    } catch (Throwable $websiteSalesError) {
        error_log('Unable to merge website paid sales: ' . $websiteSalesError->getMessage());
    }
    $decoded = jg_sales_apply_executive_context($decoded, $year);
    if ($includeAudit) {
        jg_sales_attach_calculation_audit($decoded, $year);
    }
    jg_sales_remove_customer_paid_fields($decoded);

    $encoded = json_encode($decoded, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    return is_string($encoded) ? $encoded : '{}';
}

/**
 * @return array<int, array<string, int>>
 */
function jg_sales_context_by_month(int $year): array
{
    if ($year < 2025 || $year > 2026) {
        return [];
    }

    try {
        $pdo = analyticsDb();
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS executive_chart_context (
                period_key VARCHAR(10) NOT NULL PRIMARY KEY,
                granularity VARCHAR(10) NOT NULL,
                revenue BIGINT NULL,
                gross_profit BIGINT NULL,
                orders_qty INT NULL,
                items_qty INT NULL,
                updated_at DATETIME(6) NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
        $stmt = $pdo->prepare(
            'SELECT period_key, revenue, gross_profit, orders_qty, items_qty
             FROM executive_chart_context
             WHERE period_key LIKE :year_prefix
             ORDER BY period_key'
        );
        $stmt->execute([':year_prefix' => $year . '-%']);
    } catch (Throwable $error) {
        error_log('Unable to load executive chart context: ' . $error->getMessage());
        return [];
    }

    return jg_executive_context_group_by_month($stmt->fetchAll());
}

/**
 * @param array<string, mixed> $summary
 * @return array<string, mixed>
 */
function jg_sales_apply_executive_context(array $summary, int $year): array
{
    return jg_executive_context_apply_summary($summary, jg_sales_context_by_month($year));
}

/**
 * @return array<string, mixed>|null
 */
function jg_sales_context_only_summary(int $year): ?array
{
    $context = jg_sales_context_by_month($year);
    $summary = [
        'ok' => true,
        'year' => $year,
        'years' => [2025, 2026],
        'months' => [],
        'totals' => [],
        'platforms' => [],
        'accounts' => [],
        'products' => [],
        'generated_at' => gmdate(DATE_ATOM),
        'context_only' => true,
    ];
    try {
        $summary = jg_website_merge_sales_summary(analyticsDb(), $summary, $year);
    } catch (Throwable $websiteSalesError) {
        error_log('Unable to merge website paid sales into context summary: ' . $websiteSalesError->getMessage());
    }
    if ($context === [] && (int) ($summary['totals']['orders'] ?? 0) === 0) {
        return null;
    }
    return jg_executive_context_apply_summary($summary, $context);
}

function jg_sales_cache_dir(): string
{
    $dir = sys_get_temp_dir() . '/jg-dashboard-sales-cache';
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    return $dir;
}

function jg_sales_cache_path(string $key): string
{
    return jg_sales_cache_dir() . '/' . hash('sha256', $key) . '.json';
}

function jg_sales_cache_read(string $key, int $ttlSeconds): ?string
{
    $path = jg_sales_cache_path($key);
    if (!is_file($path)) {
        return null;
    }
    if ($ttlSeconds > 0 && filemtime($path) < time() - $ttlSeconds) {
        return null;
    }
    $raw = @file_get_contents($path);
    return is_string($raw) && $raw !== '' ? $raw : null;
}

function jg_sales_cache_write(string $key, string $payload): void
{
    @file_put_contents(jg_sales_cache_path($key), $payload, LOCK_EX);
}

/**
 * @return array{ok:bool,status:int,error?:string,payload?:array<string,mixed>}
 */
function jg_sales_run_manual_refresh(string $setupToken, int $year, bool $includeAudit): array
{
    $lock = @fopen(sys_get_temp_dir() . '/jg-dashboard-marketplace-refresh.lock', 'c+');
    if (!is_resource($lock)) {
        return [
            'ok' => false,
            'status' => 500,
            'error' => 'marketplace_refresh_lock_unavailable',
        ];
    }
    if (!@flock($lock, LOCK_EX | LOCK_NB)) {
        fclose($lock);
        return [
            'ok' => false,
            'status' => 409,
            'error' => 'marketplace_refresh_in_progress',
        ];
    }

    try {
        @set_time_limit(110);
        $params = [
            'setup_token' => $setupToken,
            'year' => (string) $year,
            'mode' => 'rolling',
        ];
        if ($includeAudit) {
            $params['audit'] = '1';
        }
        $url = jg_dashboard_marketplace_api_base_url() . '/sales/sync?' . http_build_query($params);
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 80,
                'header' => "Accept: application/json\r\nUser-Agent: Jenang-Gemi-Executive-Dashboard/1.0\r\n",
                'ignore_errors' => true,
            ],
        ]);
        $response = @file_get_contents($url, false, $context);
        if (!is_string($response) || $response === '') {
            return [
                'ok' => false,
                'status' => 502,
                'error' => 'marketplace_sync_unreachable',
            ];
        }

        $status = 200;
        foreach (($http_response_header ?? []) as $headerLine) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', (string) $headerLine, $matches)) {
                $status = (int) ($matches[1] ?? 200);
                break;
            }
        }
        $decoded = json_decode($response, true);
        if ($status >= 400 || !is_array($decoded) || empty($decoded['ok'])) {
            error_log('Manual marketplace refresh rejected with HTTP ' . $status);
            return [
                'ok' => false,
                'status' => $status >= 400 ? $status : 502,
                'error' => 'marketplace_sync_rejected',
            ];
        }

        return [
            'ok' => true,
            'status' => 200,
            'payload' => $decoded,
        ];
    } finally {
        @flock($lock, LOCK_UN);
        fclose($lock);
    }
}

/**
 * @return array<string, array{sku:string, tag:string, product_name:string, base_product_name:string, flavor_name:string, cogs:float, is_syrup:bool}>
 */
function jg_sales_sku_lookup(): array
{
    try {
        $pdo = jg_sku_db();
        $productNameMap = jg_sales_product_name_map();
        $stmt = $pdo->query(
            'SELECT s.sku, s.tag, s.cogs, p.name AS product_name, f.name AS flavor_name
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
        $sku = (string) ($row['sku'] ?? '');
        $productName = (string) ($row['product_name'] ?? '');
        $displayProductName = jg_sales_sku_product_display_name($sku, $productName, $productNameMap);
        $record = [
            'sku' => $sku,
            'tag' => (string) ($row['tag'] ?? ''),
            'product_name' => $displayProductName,
            'base_product_name' => $productName,
            'flavor_name' => (string) ($row['flavor_name'] ?? 'Unspecified'),
            'cogs' => (float) ($row['cogs'] ?? 0),
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

function jg_sales_product_name_map(): array
{
    $path = dirname(__DIR__, 2) . '/sku-product-names.json';
    if (!is_file($path)) {
        return [];
    }

    $raw = @file_get_contents($path);
    if (!is_string($raw) || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function jg_sales_sku_product_display_name(string $sku, string $fallback, array $productNameMap): string
{
    $mapped = trim((string) ($productNameMap[$sku] ?? ''));
    return $mapped !== '' ? $mapped : trim($fallback);
}

/**
 * @param array<string, mixed> $current
 * @return array<string, mixed>
 */
function jg_sales_add_product_total(array $current, int $quantity, int $netRevenue, int $orders = 0, int $cogs = 0): array
{
    $current['quantity'] = (int) ($current['quantity'] ?? 0) + $quantity;
    $current['item_count'] = (int) ($current['item_count'] ?? 0) + $quantity;
    $current['net_revenue'] = (int) ($current['net_revenue'] ?? 0) + $netRevenue;
    $current['revenue'] = (int) ($current['revenue'] ?? 0) + $netRevenue;
    $current['orders'] = (int) ($current['orders'] ?? 0) + $orders;
    $current['cogs'] = (int) ($current['cogs'] ?? 0) + $cogs;
    $current['gross_profit'] = (int) ($current['revenue'] ?? 0) - (int) ($current['cogs'] ?? 0);
    return $current;
}

/**
 * @return array{monthly: array<string, int>, sku: array<string, int>}
 */
function jg_sales_fifo_cogs_index(int $year): array
{
    try {
        $pdo = jg_sku_db();
        $tableStmt = $pdo->prepare(
            'SELECT COUNT(*)
             FROM INFORMATION_SCHEMA.TABLES
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = "marketplace_order_inventory_allocations"'
        );
        $tableStmt->execute();
        if ((int) $tableStmt->fetchColumn() === 0) {
            return ['monthly' => [], 'sku' => []];
        }

        $timezone = new DateTimeZone('Asia/Jakarta');
        $from = (new DateTimeImmutable($year . '-01-01 00:00:00', $timezone))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        $to = (new DateTimeImmutable(($year + 1) . '-01-01 00:00:00', $timezone))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        $stmt = $pdo->prepare(
            'SELECT
                MONTH(DATE_ADD(consumed_at, INTERVAL 7 HOUR)) AS month,
                platform,
                account_key,
                sku,
                SUM(total_cogs) AS cogs
             FROM marketplace_order_inventory_allocations
             WHERE consumed_at >= :from_date
               AND consumed_at < :to_date
             GROUP BY MONTH(DATE_ADD(consumed_at, INTERVAL 7 HOUR)), platform, account_key, sku'
        );
        $stmt->execute([
            ':from_date' => $from,
            ':to_date' => $to,
        ]);
    } catch (Throwable $error) {
        error_log('Unable to load FIFO COGS allocation index: ' . $error->getMessage());
        return ['monthly' => [], 'sku' => []];
    }

    $monthly = [];
    $skuTotals = [];
    foreach ($stmt->fetchAll() as $row) {
        $sku = jg_sales_normalize_sku_key($row['sku'] ?? '');
        if ($sku === '') {
            continue;
        }
        $cogs = (int) round((float) ($row['cogs'] ?? 0));
        $key = implode('|', [
            (int) ($row['month'] ?? 0),
            (string) ($row['platform'] ?? ''),
            (string) ($row['account_key'] ?? ''),
            $sku,
        ]);
        $monthly[$key] = $cogs;
        $skuTotals[$sku] = (int) ($skuTotals[$sku] ?? 0) + $cogs;
    }

    return ['monthly' => $monthly, 'sku' => $skuTotals];
}

/**
 * @param array<string, mixed> $row
 */
function jg_sales_seller_received(array $row, int $fallback = 0): int
{
    $zeroCandidate = null;
    foreach (['seller_received', 'seller_receivable', 'settlement_amount', 'payout_amount', 'net_revenue', 'net_sales', 'sales', 'revenue'] as $field) {
        if (array_key_exists($field, $row) && is_numeric($row[$field])) {
            $value = (int) round((float) $row[$field]);
            if ($value !== 0) {
                return $value;
            }
            $zeroCandidate ??= 0;
        }
    }

    return $fallback !== 0 ? $fallback : ($zeroCandidate ?? 0);
}

function jg_sales_remove_customer_paid_fields(mixed &$value): void
{
    if (!is_array($value)) {
        return;
    }

    unset($value['gross_revenue'], $value['gross_sales'], $value['customer_paid'], $value['buyer_paid']);

    foreach ($value as &$child) {
        jg_sales_remove_customer_paid_fields($child);
    }
    unset($child);
}

function jg_sales_ratio(int $part, int $total): float
{
    return $total > 0 ? $part / $total : 0.0;
}

/**
 * @param array<int, int> $monthlyCogs
 * @param array<int, int> $monthlyFees
 */
function jg_sales_enrich_totals_with_profit(array &$summary, int $totalCogs, int $totalRevenue, int $totalItems, array $monthlyCogs = [], array $monthlyFees = []): void
{
    $totals = is_array($summary['totals'] ?? null) ? $summary['totals'] : [];
    if ($monthlyCogs !== []) {
        $totalCogs = array_sum($monthlyCogs);
    }
    $revenue = jg_sales_seller_received($totals, $totalRevenue);
    $fees = $monthlyFees !== []
        ? array_sum($monthlyFees)
        : (int) round((float) ($totals['marketplace_fees'] ?? 0));
    $cogs = $totalCogs;
    $totals['revenue'] = $revenue;
    $totals['marketplace_fees'] = $fees;
    $totals['cogs'] = $cogs;
    $totals['gross_profit'] = $revenue - $cogs;
    $summary['totals'] = $totals;

    $months = is_array($summary['months'] ?? null) ? $summary['months'] : [];
    $allocatedCogs = 0;
    $remainingMonthIndexes = [];
    foreach ($months as $index => &$month) {
        if (!is_array($month)) {
            continue;
        }
        $monthRevenue = jg_sales_seller_received($month);
        $monthItems = (int) ($month['item_count'] ?? 0);
        $monthNumber = (int) ($month['month'] ?? $index + 1);
        $monthCogs = $monthlyCogs !== []
            ? (int) ($monthlyCogs[$monthNumber] ?? 0)
            : (int) round($totalCogs * jg_sales_ratio($monthItems, $totalItems));
        $monthFees = $monthlyFees !== []
            ? (int) ($monthlyFees[$monthNumber] ?? 0)
            : (int) round((float) ($month['marketplace_fees'] ?? 0));
        $allocatedCogs += $monthCogs;
        if ($monthItems > 0) {
            $remainingMonthIndexes[] = $index;
        }
        $month['revenue'] = $monthRevenue;
        $month['marketplace_fees'] = $monthFees;
        $month['cogs'] = $monthCogs;
        $month['gross_profit'] = $monthRevenue - $monthCogs;
        $month['cogs_source'] = $monthlyCogs !== [] ? 'product_monthly_rollups' : 'product_total_allocation';
    }
    unset($month);

    if ($totalCogs !== $allocatedCogs && $remainingMonthIndexes !== []) {
        $lastIndex = $remainingMonthIndexes[count($remainingMonthIndexes) - 1];
        $delta = $totalCogs - $allocatedCogs;
        $months[$lastIndex]['cogs'] = (int) ($months[$lastIndex]['cogs'] ?? 0) + $delta;
        $months[$lastIndex]['gross_profit'] = (int) ($months[$lastIndex]['revenue'] ?? 0) - (int) ($months[$lastIndex]['cogs'] ?? 0);
    }
    $summary['months'] = $months;
}

/**
 * @param array<string, mixed> $products
 * @param array<string, array{sku:string, tag:string, product_name:string, base_product_name:string, flavor_name:string, cogs:float, is_syrup:bool}> $lookup
 * @return array{cogs: array<int, int>, fees: array<int, int>}
 */
function jg_sales_enrich_monthly_product_cogs(array &$products, array $lookup, array $fifoCogs): array
{
    $rows = is_array($products['by_month'] ?? null) ? $products['by_month'] : [];
    if ($rows === []) {
        return ['cogs' => [], 'fees' => []];
    }

    $monthlyCogs = [];
    $monthlyFees = [];
    $enrichedRows = [];
    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }
        $month = (int) ($row['month'] ?? 0);
        if ($month < 1 || $month > 12) {
            continue;
        }
        $sku = jg_sales_normalize_sku_key($row['sku'] ?? '');
        $skuRecord = $lookup[$sku] ?? null;
        $quantity = (int) ($row['quantity'] ?? 0);
        $revenue = jg_sales_seller_received($row);
        $grossRevenue = (int) round((float) ($row['gross_revenue'] ?? $revenue));
        $fees = max(0, $grossRevenue - $revenue);
        $unitCogs = (float) ($skuRecord['cogs'] ?? 0);
        $displayProductName = trim((string) ($skuRecord['product_name'] ?? ''));
        $fifoKey = implode('|', [
            $month,
            (string) ($row['platform'] ?? ''),
            (string) ($row['account_key'] ?? ''),
            $sku,
        ]);
        $rowCogs = array_key_exists($fifoKey, $fifoCogs)
            ? (int) $fifoCogs[$fifoKey]
            : (int) round($unitCogs * $quantity);
        $row['unit_cogs'] = $unitCogs;
        $row['cogs'] = $rowCogs;
        $row['cogs_source'] = array_key_exists($fifoKey, $fifoCogs) ? 'fifo_po_allocations' : 'sku_current_cogs';
        $row['revenue'] = $revenue;
        $row['marketplace_fees'] = $fees;
        $row['gross_profit'] = $revenue - $rowCogs;
        if ($displayProductName !== '') {
            $row['product_name'] = $displayProductName;
            $row['label'] = $displayProductName;
            $row['sku_db_product_name'] = $displayProductName;
            $row['product_name_source'] = 'sku_db_product_name';
        }
        $monthlyCogs[$month] = (int) ($monthlyCogs[$month] ?? 0) + $rowCogs;
        $monthlyFees[$month] = (int) ($monthlyFees[$month] ?? 0) + $fees;
        $enrichedRows[] = $row;
    }

    $products['by_month'] = $enrichedRows;
    return ['cogs' => $monthlyCogs, 'fees' => $monthlyFees];
}

/**
 * @param array<string, mixed> $summary
 * @return array<string, mixed>
 */
function jg_sales_enrich_with_sku_db(array $summary, int $year): array
{
    $lookup = jg_sales_sku_lookup();
    if ($lookup === []) {
        return $summary;
    }

    $products = is_array($summary['products'] ?? null) ? $summary['products'] : [];
    $rows = is_array($products['by_product'] ?? null) ? $products['by_product'] : [];
    $fifoCogsIndex = jg_sales_fifo_cogs_index($year);
    $monthlyProductMetrics = jg_sales_enrich_monthly_product_cogs($products, $lookup, $fifoCogsIndex['monthly']);
    $flavors = [];
    $enrichedRows = [];
    $totalCogs = 0;
    $totalRevenue = 0;
    $totalItems = 0;

    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }
        $sku = jg_sales_normalize_sku_key($row['sku'] ?? '');
        $skuRecord = $lookup[$sku] ?? null;
        $quantity = (int) ($row['quantity'] ?? 0);
        $net = jg_sales_seller_received($row);
        $unitCogs = (float) ($skuRecord['cogs'] ?? 0);
        $displayProductName = trim((string) ($skuRecord['product_name'] ?? ''));
        $rowCogs = array_key_exists($sku, $fifoCogsIndex['sku'])
            ? (int) $fifoCogsIndex['sku'][$sku]
            : (int) round($unitCogs * $quantity);
        $row['unit_cogs'] = $unitCogs;
        $row['cogs'] = $rowCogs;
        $row['cogs_source'] = array_key_exists($sku, $fifoCogsIndex['sku']) ? 'fifo_po_allocations' : 'sku_current_cogs';
        $row['revenue'] = $net;
        $row['gross_profit'] = $net - $rowCogs;
        if ($displayProductName !== '') {
            $row['product_name'] = $displayProductName;
            $row['label'] = $displayProductName;
            $row['sku_db_product_name'] = $displayProductName;
            $row['product_name_source'] = 'sku_db_product_name';
        }
        $totalCogs += $rowCogs;
        $totalRevenue += $net;
        $totalItems += $quantity;

        $platforms = is_array($row['platforms'] ?? null) ? $row['platforms'] : [];
        foreach ($platforms as $platformKey => &$platformRow) {
            if (!is_array($platformRow)) {
                continue;
            }
            $platformQuantity = (int) ($platformRow['quantity'] ?? 0);
            $platformRevenue = jg_sales_seller_received($platformRow);
            $platformCogs = (int) round($unitCogs * $platformQuantity);
            $platformRow['unit_cogs'] = $unitCogs;
            $platformRow['cogs'] = $platformCogs;
            $platformRow['revenue'] = $platformRevenue;
            $platformRow['gross_profit'] = $platformRevenue - $platformCogs;
        }
        unset($platformRow);
        $row['platforms'] = $platforms;
        $enrichedRows[] = $row;

        if (!$skuRecord || empty($skuRecord['is_syrup'])) {
            continue;
        }

        $flavorName = trim($skuRecord['flavor_name']) !== '' ? $skuRecord['flavor_name'] : 'Unspecified';
        $flavorKey = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $flavorName) ?? $flavorName);
        $flavorKey = trim($flavorKey, '-');

        $flavors[$flavorKey] = jg_sales_add_product_total($flavors[$flavorKey] ?? [
            'key' => $flavorKey,
            'label' => $flavorName,
            'platforms' => [],
        ], $quantity, $net, (int) ($row['orders'] ?? 0), $rowCogs);

        foreach ($platforms as $platformKey => $platformRow) {
            if (!is_array($platformRow)) {
                continue;
            }
            $platform = (string) $platformKey;
            $platformQuantity = (int) ($platformRow['quantity'] ?? 0);
            $platformNet = jg_sales_seller_received($platformRow);
            $platformCogs = (int) round((float) ($platformRow['cogs'] ?? 0));
            $flavors[$flavorKey]['platforms'][$platform] = jg_sales_add_product_total($flavors[$flavorKey]['platforms'][$platform] ?? [
                'key' => $platform,
                'label' => (string) ($platformRow['label'] ?? ucfirst($platform)),
            ], $platformQuantity, $platformNet, (int) ($platformRow['orders'] ?? 0), $platformCogs);
        }
    }

    foreach ($lookup as $skuRecord) {
        if (empty($skuRecord['is_syrup'])) {
            continue;
        }
        $flavorName = trim($skuRecord['flavor_name']) !== '' ? $skuRecord['flavor_name'] : 'Unspecified';
        $flavorKey = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $flavorName) ?? $flavorName);
        $flavorKey = trim($flavorKey, '-');
        if ($flavorKey === '' || isset($flavors[$flavorKey])) {
            continue;
        }
        $flavors[$flavorKey] = [
            'key' => $flavorKey,
            'label' => $flavorName,
            'quantity' => 0,
            'item_count' => 0,
            'net_revenue' => 0,
            'revenue' => 0,
            'orders' => 0,
            'cogs' => 0,
            'gross_profit' => 0,
            'platforms' => [],
        ];
    }

    $flavorRows = array_values($flavors);
    usort($flavorRows, static fn (array $left, array $right): int => (int) ($right['quantity'] ?? 0) <=> (int) ($left['quantity'] ?? 0));
    $products['by_product'] = $enrichedRows;
    $products['syrup_flavors'] = array_slice($flavorRows, 0, 16);
    $products['syrup_flavor_source'] = 'sku_db';
    $summary['products'] = $products;
    jg_sales_enrich_totals_with_profit(
        $summary,
        $totalCogs,
        $totalRevenue,
        $totalItems,
        $monthlyProductMetrics['cogs'],
        $monthlyProductMetrics['fees']
    );

    return $summary;
}

/**
 * @param array<string, mixed> $summary
 */
function jg_sales_attach_calculation_audit(array &$summary, int $year): void
{
    $totals = is_array($summary['totals'] ?? null) ? $summary['totals'] : [];
    $revenue = jg_sales_seller_received($totals);
    $marketplaceFees = (int) round((float) ($totals['marketplace_fees'] ?? 0));
    $cogs = (int) round((float) ($totals['cogs'] ?? 0));
    $grossProfit = (int) round((float) ($totals['gross_profit'] ?? ($revenue - $cogs)));
    $orders = (int) round((float) ($totals['orders'] ?? 0));
    $itemCount = (int) round((float) ($totals['item_count'] ?? 0));
    $averageOrderValue = $orders > 0 ? (int) round($revenue / $orders) : 0;
    $financialSources = is_array($summary['financial_sources'] ?? null) ? array_values($summary['financial_sources']) : [];
    $rawSourceTotals = jg_sales_financial_source_totals($financialSources);
    $summary['calculations'] = [
        'year' => $year,
        'timezone' => 'Asia/Jakarta for dashboard date controls; ingest stores order timestamps in UTC',
        'upstream_api_calls' => [
            [
                'name' => 'Marketplace yearly sales summary',
                'method' => 'GET',
                'endpoint' => '/sales/summary',
                'used_for' => 'Executive homepage revenue, marketplace fees, orders, item quantity, account/platform splits, and product rollups',
                'json_paths' => [
                    'months[].net_revenue',
                    'months[].accounts[*].net_revenue',
                    'months[].platforms[*].net_revenue',
                    'products.by_month[].net_revenue',
                    'products.by_product[].net_revenue',
                    'totals.net_revenue',
                ],
            ],
            [
                'name' => 'Marketplace order facts',
                'method' => 'GET',
                'endpoint' => '/sales/orders',
                'used_for' => 'Orders page, custom date-range charting, and per-order audit rows',
                'json_paths' => [
                    'orders[].net_revenue',
                    'orders[].order_net_revenue',
                    'orders[].quantity',
                    'orders[].raw',
                ],
            ],
            [
                'name' => 'Marketplace sync/backfill',
                'method' => 'GET',
                'endpoint' => '/sales/sync',
                'used_for' => 'Scheduled and manual pulls from Shopee, TikTok Shop, and Tokopedia APIs into raw order storage',
                'json_paths' => [
                    'Shopee /api/v2/order/get_order_list',
                    'Shopee /api/v2/order/get_order_detail',
                    'Shopee /api/v2/payment/get_escrow_detail',
                    'TikTok /order/202309/orders/search',
                    'TikTok /order/202309/orders',
                    'TikTok /finance/202501/orders/{order_id}/statement_transactions',
                    'raw_json.finance_statement.sku_transactions[].settlement_amount',
                    'Tokopedia configured order list endpoint',
                    'sync.accounts[].platform',
                    'sync.accounts[].account_key',
                    'sync.accounts[].fetched',
                    'sync.accounts[].stored',
                ],
            ],
            [
                'name' => 'Dashboard SKU DB enrichment',
                'method' => 'local SQL',
                'endpoint' => 'sku_skus + marketplace_order_inventory_allocations',
                'used_for' => 'COGS and gross profit',
                'json_paths' => [
                    'sku_skus.sku',
                    'sku_skus.tag',
                    'sku_skus.cogs',
                    'marketplace_order_inventory_allocations.total_cogs',
                ],
            ],
        ],
        'metrics' => [
            'revenue' => [
                'definition' => 'Seller-received company revenue after marketplace deductions; never customer-paid gross merchandise value.',
                'formula' => 'SUM(months[].net_revenue) from stored seller/settlement fields; when a raw order lacks a seller-received field, Back Dash marks any customer-paid fallback as gross_revenue_fallback instead of hiding it.',
                'field_precedence' => ['seller_received', 'seller_receivable', 'settlement_amount', 'payout_amount', 'net_revenue', 'net_sales', 'sales', 'revenue'],
                'dashboard_json_paths' => ['months[].revenue', 'months[].net_revenue', 'totals.revenue', 'totals.net_revenue'],
                'raw_storage' => 'API Ingest stores the original marketplace JSON in marketplace_orders.raw_json; changing this formula recalculates from stored facts/rollups without a full marketplace backfill.',
            ],
            'marketplace_fees' => [
                'definition' => 'Marketplace deductions when both gross and seller-received values are known.',
                'formula' => 'SUM(gross_revenue - net_revenue), clamped at zero per source row where calculated',
                'dashboard_json_paths' => ['months[].marketplace_fees', 'totals.marketplace_fees'],
            ],
            'cogs' => [
                'definition' => 'Cost of goods sold from FIFO PO allocations when available, otherwise current SKU DB COGS times item quantity.',
                'formula' => 'SUM(marketplace_order_inventory_allocations.total_cogs) OR SUM(sku_skus.cogs * products.by_month[].quantity); product gross profit uses item-level net revenue, including raw_json.finance_statement.sku_transactions[].settlement_amount when available.',
                'dashboard_json_paths' => ['months[].cogs', 'products.by_month[].cogs', 'products.by_product[].cogs'],
            ],
            'gross_profit' => [
                'definition' => 'Company revenue after product cost.',
                'formula' => 'revenue - cogs',
                'dashboard_json_paths' => ['months[].gross_profit', 'totals.gross_profit', 'products.by_month[].gross_profit'],
            ],
            'orders' => [
                'definition' => 'Completed marketplace orders included in revenue.',
                'formula' => 'SUM(months[].orders), excluding cancelled, unpaid, refunded, returned, rejected, failed, expired, or closed statuses.',
                'dashboard_json_paths' => ['months[].orders', 'totals.orders'],
            ],
            'item_count' => [
                'definition' => 'Units sold across included marketplace order items.',
                'formula' => 'SUM(months[].item_count)',
                'dashboard_json_paths' => ['months[].item_count', 'totals.item_count', 'products.by_month[].quantity'],
            ],
            'average_order_value' => [
                'definition' => 'Average seller-received revenue per included marketplace order.',
                'formula' => 'revenue / orders',
                'dashboard_json_paths' => ['totals.average_order_value', 'totals.revenue', 'totals.orders'],
            ],
        ],
        'current_values' => [
            'revenue' => [
                'value' => $revenue,
                'formula' => 'SUM(months[].revenue)',
                'components' => [
                    ['path' => 'totals.revenue', 'value' => (int) round((float) ($totals['revenue'] ?? 0))],
                    ['path' => 'totals.net_revenue', 'value' => (int) round((float) ($totals['net_revenue'] ?? 0))],
                    ['path' => 'totals.sales', 'value' => (int) round((float) ($totals['sales'] ?? 0))],
                ],
            ],
            'marketplace_fees' => [
                'value' => $marketplaceFees,
                'formula' => 'SUM(months[].marketplace_fees)',
                'components' => [
                    ['path' => 'totals.marketplace_fees', 'value' => $marketplaceFees],
                ],
            ],
            'cogs' => [
                'value' => $cogs,
                'formula' => 'SUM(products.by_month[].cogs) or FIFO allocation total',
                'components' => [
                    ['path' => 'totals.cogs', 'value' => $cogs],
                ],
            ],
            'gross_profit' => [
                'value' => $grossProfit,
                'formula' => 'revenue - cogs',
                'components' => [
                    ['path' => 'calculations.current_values.revenue.value', 'value' => $revenue],
                    ['path' => 'calculations.current_values.cogs.value', 'value' => $cogs],
                ],
            ],
            'orders' => [
                'value' => $orders,
                'formula' => 'SUM(months[].orders)',
                'components' => [
                    ['path' => 'totals.orders', 'value' => $orders],
                ],
            ],
            'item_count' => [
                'value' => $itemCount,
                'formula' => 'SUM(months[].item_count)',
                'components' => [
                    ['path' => 'totals.item_count', 'value' => $itemCount],
                ],
            ],
            'average_order_value' => [
                'value' => $averageOrderValue,
                'formula' => 'revenue / orders',
                'components' => [
                    ['path' => 'calculations.current_values.revenue.value', 'value' => $revenue],
                    ['path' => 'calculations.current_values.orders.value', 'value' => $orders],
                ],
            ],
        ],
        'financial_source_summary' => $financialSources,
        'raw_integrity' => [
            'net_revenue' => [
                'rollup_value' => $revenue,
                'raw_recomputed_value' => (int) ($rawSourceTotals['net_revenue'] ?? 0),
                'delta' => $revenue - (int) ($rawSourceTotals['net_revenue'] ?? 0),
            ],
            'gross_revenue' => [
                'rollup_value' => (int) round((float) ($totals['gross_revenue'] ?? 0)),
                'raw_recomputed_value' => (int) ($rawSourceTotals['gross_revenue'] ?? 0),
                'delta' => (int) round((float) ($totals['gross_revenue'] ?? 0)) - (int) ($rawSourceTotals['gross_revenue'] ?? 0),
            ],
            'marketplace_fees' => [
                'rollup_value' => $marketplaceFees,
                'raw_recomputed_value' => (int) ($rawSourceTotals['marketplace_fees'] ?? 0),
                'delta' => $marketplaceFees - (int) ($rawSourceTotals['marketplace_fees'] ?? 0),
            ],
        ],
        'cache' => [
            'default_behavior' => 'Dashboard serves the last calculated JSON immediately and refreshes with refresh=1 in the background.',
            'fresh_refresh_query' => '../api/sales/?year=' . $year . '&refresh=1&audit=1',
        ],
        'generated_at' => gmdate(DATE_ATOM),
    ];
}

/**
 * @param array<int, mixed> $financialSources
 * @return array<string, int>
 */
function jg_sales_financial_source_totals(array $financialSources): array
{
    $totals = [];
    foreach ($financialSources as $source) {
        if (!is_array($source)) {
            continue;
        }
        $metric = (string) ($source['metric'] ?? '');
        if ($metric === '') {
            continue;
        }
        $totals[$metric] = (int) ($totals[$metric] ?? 0) + (int) round((float) ($source['value'] ?? 0));
    }

    return $totals;
}
