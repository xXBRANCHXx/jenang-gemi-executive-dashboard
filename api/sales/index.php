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

function jg_dashboard_sales_number(mixed $value): float
{
    return is_numeric($value) ? (float) $value : 0.0;
}

function jg_dashboard_sales_optional_number(mixed $value): ?float
{
    if ($value === null || $value === '') {
        return null;
    }

    return is_numeric($value) ? (float) $value : null;
}

function jg_dashboard_sales_table_exists(PDO $pdo, string $tableName): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*)
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :table_name'
    );
    $stmt->execute([':table_name' => $tableName]);
    return (int) $stmt->fetchColumn() > 0;
}

function jg_dashboard_sales_sku_costs(PDO $pdo): array
{
    $costs = [];
    $skuStmt = $pdo->query('SELECT sku, cogs FROM sku_skus');
    foreach ($skuStmt->fetchAll() as $row) {
        $sku = strtoupper(trim((string) ($row['sku'] ?? '')));
        if ($sku === '') {
            continue;
        }

        $costs[$sku] = [
            'cogs' => jg_dashboard_sales_number($row['cogs'] ?? 0),
            'history' => [],
        ];
    }

    if (jg_dashboard_sales_table_exists($pdo, 'sku_cogs_history')) {
        $historyStmt = $pdo->query(
            'SELECT sku, old_price, new_price, recorded_at
             FROM sku_cogs_history
             ORDER BY sku ASC, recorded_at ASC, id ASC'
        );
        foreach ($historyStmt->fetchAll() as $row) {
            $sku = strtoupper(trim((string) ($row['sku'] ?? '')));
            if ($sku === '' || !isset($costs[$sku])) {
                continue;
            }

            $costs[$sku]['history'][] = [
                'old_price' => jg_dashboard_sales_optional_number($row['old_price'] ?? null),
                'new_price' => jg_dashboard_sales_number($row['new_price'] ?? 0),
                'recorded_at' => (string) ($row['recorded_at'] ?? ''),
            ];
        }
    }

    return $costs;
}

function jg_dashboard_sales_sku_inputs(PDO $pdo, int $year): array
{
    if (!jg_dashboard_sales_table_exists($pdo, 'profit_loss_sku_inputs')) {
        return [];
    }

    $stmt = $pdo->prepare(
        'SELECT year, month, sku, cogs_override, packaging_per_unit, labor_per_unit, other_per_unit
         FROM profit_loss_sku_inputs
         WHERE year = :year'
    );
    $stmt->execute([':year' => $year]);

    $inputs = [];
    foreach ($stmt->fetchAll() as $row) {
        $sku = strtoupper(trim((string) ($row['sku'] ?? '')));
        $month = (int) ($row['month'] ?? 0);
        if ($sku === '' || $month < 1 || $month > 12) {
            continue;
        }

        $inputs[$sku . '|' . $month] = [
            'cogs_override' => jg_dashboard_sales_optional_number($row['cogs_override'] ?? null),
            'packaging_per_unit' => jg_dashboard_sales_number($row['packaging_per_unit'] ?? 0),
            'labor_per_unit' => jg_dashboard_sales_number($row['labor_per_unit'] ?? 0),
            'other_per_unit' => jg_dashboard_sales_number($row['other_per_unit'] ?? 0),
        ];
    }

    return $inputs;
}

function jg_dashboard_sales_cogs_for_month(array $skuCost, int $year, int $month): float
{
    $history = is_array($skuCost['history'] ?? null) ? $skuCost['history'] : [];
    if ($history === [] || $month < 1 || $month > 12) {
        return jg_dashboard_sales_number($skuCost['cogs'] ?? 0);
    }

    $monthEnd = strtotime(sprintf('%04d-%02d-01 00:00:00 UTC', $year, $month + 1));
    if ($month === 12) {
        $monthEnd = strtotime(sprintf('%04d-01-01 00:00:00 UTC', $year + 1));
    }

    $effective = null;
    foreach ($history as $change) {
        $recordedAt = strtotime((string) ($change['recorded_at'] ?? '') . ' UTC');
        if ($recordedAt !== false && $recordedAt < $monthEnd) {
            $effective = jg_dashboard_sales_number($change['new_price'] ?? 0);
        }
    }

    if ($effective !== null) {
        return $effective;
    }

    $firstOldPrice = $history[0]['old_price'] ?? null;
    if ($firstOldPrice !== null) {
        return jg_dashboard_sales_number($firstOldPrice);
    }

    return jg_dashboard_sales_number($history[0]['new_price'] ?? $skuCost['cogs'] ?? 0);
}

function jg_dashboard_sales_enrich_recap(array $payload, int $year): array
{
    $products = $payload['products']['by_month'] ?? [];
    if (!is_array($products)) {
        return $payload;
    }

    try {
        require_once dirname(__DIR__, 2) . '/sku-db-bootstrap.php';

        $pdo = jg_sku_db();
        $skuCosts = jg_dashboard_sales_sku_costs($pdo);
        $skuInputs = jg_dashboard_sales_sku_inputs($pdo, $year);
        $monthlyCosts = [];
        for ($month = 1; $month <= 12; $month += 1) {
            $monthlyCosts[$month] = [
                'cogs' => 0.0,
                'covered_units' => 0,
                'missing_units' => 0,
            ];
        }

        foreach ($products as $row) {
            if (!is_array($row)) {
                continue;
            }

            $month = (int) ($row['month'] ?? 0);
            if ($month < 1 || $month > 12) {
                continue;
            }

            $quantity = max(0, (int) round(jg_dashboard_sales_number($row['quantity'] ?? 0)));
            if ($quantity <= 0) {
                continue;
            }

            $sku = strtoupper(trim((string) ($row['sku'] ?? '')));
            $skuCost = $sku !== '' ? ($skuCosts[$sku] ?? null) : null;
            $input = $sku !== '' ? ($skuInputs[$sku . '|' . $month] ?? []) : [];

            if (is_array($skuCost)) {
                $baseCost = array_key_exists('cogs_override', $input) && $input['cogs_override'] !== null
                    ? jg_dashboard_sales_number($input['cogs_override'])
                    : jg_dashboard_sales_cogs_for_month($skuCost, $year, $month);
                $unitCost = $baseCost
                    + jg_dashboard_sales_number($input['packaging_per_unit'] ?? 0)
                    + jg_dashboard_sales_number($input['labor_per_unit'] ?? 0)
                    + jg_dashboard_sales_number($input['other_per_unit'] ?? 0);
                $monthlyCosts[$month]['cogs'] += $quantity * $unitCost;
                if ($unitCost > 0) {
                    $monthlyCosts[$month]['covered_units'] += $quantity;
                } else {
                    $monthlyCosts[$month]['missing_units'] += $quantity;
                }
            } else {
                $monthlyCosts[$month]['missing_units'] += $quantity;
            }
        }

        $totalCogs = 0.0;
        $totalCoveredUnits = 0;
        $totalMissingUnits = 0;
        if (is_array($payload['months'] ?? null)) {
            foreach ($payload['months'] as &$monthRow) {
                if (!is_array($monthRow)) {
                    continue;
                }

                $month = (int) ($monthRow['month'] ?? 0);
                if ($month < 1 || $month > 12) {
                    continue;
                }

                $cogs = round($monthlyCosts[$month]['cogs']);
                $revenue = jg_dashboard_sales_number($monthRow['net_revenue'] ?? $monthRow['sales'] ?? 0);
                $units = jg_dashboard_sales_number($monthRow['item_count'] ?? 0);
                $grossProfit = $revenue - $cogs;

                $monthRow['cogs'] = $cogs;
                $monthRow['gross_profit'] = round($grossProfit);
                $monthRow['average_cogs'] = $units > 0 ? round($cogs / $units) : 0;
                $monthRow['average_gross_profit'] = $units > 0 ? round($grossProfit / $units) : 0;
                $monthRow['gross_margin'] = $revenue > 0 ? $grossProfit / $revenue : 0;
                $monthRow['cogs_covered_units'] = $monthlyCosts[$month]['covered_units'];
                $monthRow['cogs_missing_units'] = $monthlyCosts[$month]['missing_units'];

                $totalCogs += $cogs;
                $totalCoveredUnits += $monthlyCosts[$month]['covered_units'];
                $totalMissingUnits += $monthlyCosts[$month]['missing_units'];
            }
            unset($monthRow);
        }

        $totalRevenue = jg_dashboard_sales_number($payload['totals']['net_revenue'] ?? $payload['totals']['sales'] ?? 0);
        $totalUnits = jg_dashboard_sales_number($payload['totals']['item_count'] ?? 0);
        if ($totalUnits <= 0 && is_array($payload['months'] ?? null)) {
            foreach ($payload['months'] as $monthRow) {
                if (is_array($monthRow)) {
                    $totalUnits += jg_dashboard_sales_number($monthRow['item_count'] ?? 0);
                }
            }
        }
        $totalGrossProfit = $totalRevenue - $totalCogs;

        if (!is_array($payload['totals'] ?? null)) {
            $payload['totals'] = [];
        }
        $payload['totals']['item_count'] = round($totalUnits);
        $payload['totals']['cogs'] = round($totalCogs);
        $payload['totals']['gross_profit'] = round($totalGrossProfit);
        $payload['totals']['average_cogs'] = $totalUnits > 0 ? round($totalCogs / $totalUnits) : 0;
        $payload['totals']['average_gross_profit'] = $totalUnits > 0 ? round($totalGrossProfit / $totalUnits) : 0;
        $payload['totals']['gross_margin'] = $totalRevenue > 0 ? $totalGrossProfit / $totalRevenue : 0;
        $payload['totals']['cogs_covered_units'] = $totalCoveredUnits;
        $payload['totals']['cogs_missing_units'] = $totalMissingUnits;
        $payload['sales_recap'] = [
            'cogs_status' => 'ready',
            'cogs_source' => 'sku_db',
        ];
    } catch (Throwable $error) {
        $payload['sales_recap'] = [
            'cogs_status' => 'unavailable',
            'cogs_source' => 'sku_db',
        ];
    }

    return $payload;
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

if ($action !== 'orders' && $status >= 200 && $status < 300) {
    $payload = json_decode($response, true);
    if (is_array($payload)) {
        $payload = jg_dashboard_sales_enrich_recap($payload, $year);
        echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }
}

echo $response;
