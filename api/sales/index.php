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

$includeAudit = in_array(strtolower(trim((string) ($_GET['audit'] ?? $_GET['include_audit'] ?? ''))), ['1', 'true', 'yes', 'on'], true);
$urlParams = [
    'setup_token' => $setupToken,
    'year' => (string) $year,
];
if ($includeAudit) {
    $urlParams['audit'] = '1';
}
$url = jg_dashboard_marketplace_api_base_url() . '/sales/summary?' . http_build_query($urlParams);

$cacheKey = 'sales-summary-' . $year . ($includeAudit ? '-audit' : '-core');
$forceRefresh = (string) ($_GET['refresh'] ?? '') === '1';
$cachedResponse = $forceRefresh ? null : jg_sales_cache_read($cacheKey, 0);
if (is_string($cachedResponse)) {
    header('X-JG-Cache: STALE-FAST');
    echo $cachedResponse;
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
        echo $staleResponse;
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
    if ($includeAudit) {
        jg_sales_attach_calculation_audit($decoded, $year);
    }
    jg_sales_remove_customer_paid_fields($decoded);
    $encoded = json_encode($decoded, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (is_string($encoded)) {
        jg_sales_cache_write($cacheKey, $encoded);
        header('X-JG-Cache: MISS');
        echo $encoded;
    } else {
        echo '{}';
    }
    exit;
}

$staleResponse = jg_sales_cache_read($cacheKey, 0);
if (is_string($staleResponse)) {
    header('X-JG-Cache: STALE');
    echo $staleResponse;
    exit;
}

http_response_code($status >= 100 ? $status : 200);
echo $response;

function jg_sales_normalize_sku_key(mixed $value): string
{
    return strtoupper(trim((string) $value));
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
 * @return array<string, array{sku:string, tag:string, product_name:string, flavor_name:string, cogs:float, is_syrup:bool}>
 */
function jg_sales_sku_lookup(): array
{
    try {
        $pdo = jg_sku_db();
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
        $productName = (string) ($row['product_name'] ?? '');
        $record = [
            'sku' => (string) ($row['sku'] ?? ''),
            'tag' => (string) ($row['tag'] ?? ''),
            'product_name' => $productName,
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
 * @param array<string, array{sku:string, tag:string, product_name:string, flavor_name:string, cogs:float, is_syrup:bool}> $lookup
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
        $rowCogs = array_key_exists($sku, $fifoCogsIndex['sku'])
            ? (int) $fifoCogsIndex['sku'][$sku]
            : (int) round($unitCogs * $quantity);
        $row['unit_cogs'] = $unitCogs;
        $row['cogs'] = $rowCogs;
        $row['cogs_source'] = array_key_exists($sku, $fifoCogsIndex['sku']) ? 'fifo_po_allocations' : 'sku_current_cogs';
        $row['revenue'] = $net;
        $row['gross_profit'] = $net - $rowCogs;
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
