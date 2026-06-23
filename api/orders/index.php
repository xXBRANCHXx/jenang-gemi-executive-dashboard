<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/config.php';
require_once dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/sku-db-bootstrap.php';
require_once dirname(__DIR__, 2) . '/website-commerce-bootstrap.php';

if (!defined('JG_ORDERS_API_NO_DISPATCH')) {
    jg_orders_handle_request();
}

function jg_orders_handle_request(): void
{
    jg_admin_require_auth();

    header('Content-Type: application/json; charset=utf-8');

    try {
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $startDate = jg_orders_date($_GET['start_date'] ?? null, '-1 day');
        $endDate = jg_orders_date($_GET['end_date'] ?? null, 'today');
        $limit = jg_orders_limit($_GET['limit'] ?? null);
        $offset = max(0, (int) ($_GET['offset'] ?? 0));
        if ($method === 'POST') {
            $payload = json_decode((string) file_get_contents('php://input'), true);
            $payload = is_array($payload) ? $payload : [];
            $startDate = jg_orders_date($payload['start_date'] ?? $startDate, '-1 day');
            $endDate = jg_orders_date($payload['end_date'] ?? $endDate, 'today');
            jg_orders_remote_sync($startDate, $endDate);
        }

        $remoteWarning = '';
        try {
            $remotePayload = jg_orders_remote_payload($startDate, $endDate, $limit, $offset);
        } catch (Throwable $remoteOrdersError) {
            $remotePayload = ['orders' => [], 'has_more' => false, 'next_offset' => null];
            $remoteWarning = 'marketplace_orders_unavailable';
            error_log('Marketplace orders unavailable; serving independent website sales: ' . $remoteOrdersError->getMessage());
        }
        $remoteRows = is_array($remotePayload['orders'] ?? null) ? $remotePayload['orders'] : [];
        if ($offset === 0) {
            try {
                $remoteRows = array_merge($remoteRows, jg_website_paid_order_rows(analyticsDb(), $startDate, $endDate));
            } catch (Throwable $websiteOrdersError) {
                error_log('Website paid orders unavailable in central order view: ' . $websiteOrdersError->getMessage());
            }
        }
        $lightweight = jg_orders_bool($_GET['lightweight'] ?? $_GET['summary'] ?? null);
        if ($lightweight) {
            $includeLive = !jg_orders_bool($_GET['stored_only'] ?? null);
            $rows = jg_orders_lightweight_rows($remoteRows);
            if ($includeLive) {
                $rows = jg_orders_merge_lightweight_rows($rows, jg_orders_live_listed_rows($startDate, $endDate));
            }
            echo json_encode([
                'ok' => true,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'limit' => $limit,
                'offset' => $offset,
                'count' => count($rows),
                'has_more' => !empty($remotePayload['has_more']),
                'next_offset' => $remotePayload['next_offset'] ?? null,
                'orders' => $rows,
                'warning' => $remoteWarning,
            ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            return;
        }

        $inventoryWarning = $remoteWarning;
        if ($method === 'POST') {
            $pdo = jg_sku_db();
            jg_orders_ensure_schema($pdo);
            jg_orders_ensure_opening_lots($pdo);
            $skuLookup = jg_orders_sku_lookup($pdo);
            $rows = jg_orders_enrich_and_allocate($pdo, $remoteRows, $skuLookup);
            $allocationMode = 'write';
        } else {
            try {
                $pdo = jg_sku_db();
                jg_orders_ensure_schema($pdo);
                $skuLookup = jg_orders_sku_lookup($pdo);
                $rows = jg_orders_enrich_for_read($pdo, $remoteRows, $skuLookup);
                $allocationMode = 'read_only';
            } catch (Throwable $inventoryError) {
                error_log('Orders inventory enrichment unavailable: ' . $inventoryError->getMessage());
                $rows = jg_orders_enrich_without_inventory($remoteRows);
                $allocationMode = 'unavailable';
                $inventoryWarning = 'inventory_enrichment_unavailable';
            }
        }

        $response = [
            'ok' => true,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'limit' => $limit,
            'offset' => $offset,
            'count' => count($rows),
            'has_more' => !empty($remotePayload['has_more']),
            'next_offset' => $remotePayload['next_offset'] ?? null,
            'allocation_mode' => $allocationMode,
            'orders' => $rows,
        ];
        if ($inventoryWarning !== '') {
            $response['warning'] = $inventoryWarning;
        }
        echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    } catch (Throwable $error) {
        http_response_code(500);
        echo json_encode([
            'ok' => false,
            'error' => 'orders_api_failed',
            'message' => $error->getMessage(),
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
}

function jg_orders_date(mixed $value, string $fallback): string
{
    $timezone = new DateTimeZone('Asia/Jakarta');
    $raw = trim((string) $value);
    $date = $raw !== '' ? DateTimeImmutable::createFromFormat('Y-m-d', $raw, $timezone) : false;
    if (!$date instanceof DateTimeImmutable) {
        $date = new DateTimeImmutable($fallback, $timezone);
    }
    return $date->format('Y-m-d');
}

function jg_orders_bool(mixed $value): bool
{
    return in_array(strtolower(trim((string) $value)), ['1', 'true', 'yes', 'on'], true);
}

function jg_orders_limit(mixed $value): ?int
{
    $limit = (int) $value;
    if ($limit <= 0) {
        return null;
    }
    return max(1, min(500, $limit));
}

function jg_orders_lightweight_rows(array $remoteRows): array
{
    $rows = [];
    foreach ($remoteRows as $remoteRow) {
        if (!is_array($remoteRow)) {
            continue;
        }
        $quantity = (int) ($remoteRow['quantity'] ?? $remoteRow['item_count'] ?? 0);
        $netRevenue = (int) round((float) ($remoteRow['revenue'] ?? $remoteRow['net_revenue'] ?? $remoteRow['sales'] ?? 0));
        $orderNetRevenue = (int) round((float) ($remoteRow['order_net_revenue'] ?? $netRevenue));
        $marketplaceFees = (int) round((float) ($remoteRow['order_marketplace_fees'] ?? $remoteRow['marketplace_fees'] ?? 0));
        $key = implode('|', [
            (string) ($remoteRow['platform'] ?? ''),
            (string) ($remoteRow['account_key'] ?? ''),
            (string) ($remoteRow['order_id'] ?? ''),
        ]);
        if (trim($key, '|') === '') {
            $key = hash('sha256', json_encode($remoteRow, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: serialize($remoteRow));
        }
        if (!isset($rows[$key])) {
            $rows[$key] = [
                'timestamp' => (string) ($remoteRow['timestamp'] ?? ''),
                'order_create_time' => (string) ($remoteRow['order_create_time'] ?? ($remoteRow['timestamp'] ?? '')),
                'order_id' => (string) ($remoteRow['order_id'] ?? ''),
                'platform' => (string) ($remoteRow['platform'] ?? ''),
                'account_key' => (string) ($remoteRow['account_key'] ?? ''),
                'quantity' => 0,
                'item_count' => 0,
                'revenue' => $orderNetRevenue,
                'net_revenue' => $orderNetRevenue,
                'marketplace_fees' => $marketplaceFees,
                'gross_profit' => $orderNetRevenue,
            ];
        }
        $rows[$key]['quantity'] += $quantity;
        $rows[$key]['item_count'] += $quantity;
        $rows[$key]['revenue'] = max((int) ($rows[$key]['revenue'] ?? 0), $orderNetRevenue);
        $rows[$key]['net_revenue'] = max((int) ($rows[$key]['net_revenue'] ?? 0), $orderNetRevenue);
        $rows[$key]['marketplace_fees'] = max((int) ($rows[$key]['marketplace_fees'] ?? 0), $marketplaceFees);
        $rows[$key]['gross_profit'] = max((int) ($rows[$key]['gross_profit'] ?? 0), $orderNetRevenue);
    }

    return array_values($rows);
}

function jg_orders_merge_lightweight_rows(array $storedRows, array $liveRows): array
{
    $merged = [];
    foreach (array_merge($storedRows, $liveRows) as $row) {
        if (!is_array($row)) {
            continue;
        }
        $key = implode('|', [
            (string) ($row['platform'] ?? ''),
            (string) ($row['account_key'] ?? ''),
            (string) ($row['order_id'] ?? ''),
        ]);
        if (trim($key, '|') === '') {
            $key = hash('sha256', json_encode($row, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: serialize($row));
        }
        if (!isset($merged[$key])) {
            $merged[$key] = $row;
            continue;
        }
        $merged[$key]['quantity'] = max((int) ($merged[$key]['quantity'] ?? 0), (int) ($row['quantity'] ?? 0));
        $merged[$key]['item_count'] = max((int) ($merged[$key]['item_count'] ?? 0), (int) ($row['item_count'] ?? 0));
        $merged[$key]['revenue'] = max((int) ($merged[$key]['revenue'] ?? 0), (int) ($row['revenue'] ?? 0));
        $merged[$key]['net_revenue'] = max((int) ($merged[$key]['net_revenue'] ?? 0), (int) ($row['net_revenue'] ?? 0));
        $merged[$key]['marketplace_fees'] = max((int) ($merged[$key]['marketplace_fees'] ?? 0), (int) ($row['marketplace_fees'] ?? 0));
        $merged[$key]['gross_profit'] = max((int) ($merged[$key]['gross_profit'] ?? 0), (int) ($row['gross_profit'] ?? 0));
    }

    return array_values($merged);
}

function jg_orders_live_listed_rows(string $startDate, string $endDate): array
{
    $rows = [];
    foreach (['shopee', 'tiktok'] as $platform) {
        try {
            $payload = jg_orders_live_listed_payload($platform, $startDate, $endDate);
        } catch (Throwable $error) {
            error_log('Unable to load live listed orders for hourly chart from ' . $platform . ': ' . $error->getMessage());
            continue;
        }

        foreach (is_array($payload['orders'] ?? null) ? $payload['orders'] : [] as $order) {
            if (!is_array($order)) {
                continue;
            }
            $row = jg_orders_lightweight_live_row($order, $platform);
            if ($row === null) {
                continue;
            }
            $localDate = jg_orders_local_date($row['order_create_time']);
            if ($localDate < $startDate || $localDate > $endDate) {
                continue;
            }
            $rows[] = $row;
        }
    }

    return $rows;
}

function jg_orders_live_listed_payload(string $platform, string $startDate, string $endDate): array
{
    $cacheKey = 'live-listed-' . preg_replace('/[^a-z0-9_-]+/i', '-', $platform) . '-' . $startDate . '-' . $endDate;
    $cached = jg_orders_cache_read($cacheKey, 120);
    if (is_array($cached)) {
        return $cached;
    }

    $payload = jg_orders_fetch_json(jg_orders_remote_url('/' . $platform . '/orders/listed', [
        'account' => 'all',
        'fast' => '1',
        'persist' => '1',
        'escrow' => '1',
        'start_date' => $startDate,
        'end_date' => $endDate,
    ]), 45);
    jg_orders_cache_write($cacheKey, $payload);

    return $payload;
}

function jg_orders_cache_dir(): string
{
    $dir = sys_get_temp_dir() . '/jg-dashboard-orders-cache';
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    return $dir;
}

function jg_orders_cache_path(string $key): string
{
    return jg_orders_cache_dir() . '/' . hash('sha256', $key) . '.json';
}

function jg_orders_cache_read(string $key, int $ttlSeconds): ?array
{
    $path = jg_orders_cache_path($key);
    if (!is_file($path) || filemtime($path) < time() - $ttlSeconds) {
        return null;
    }
    $raw = @file_get_contents($path);
    $decoded = is_string($raw) ? json_decode($raw, true) : null;
    return is_array($decoded) ? $decoded : null;
}

function jg_orders_cache_write(string $key, array $payload): void
{
    @file_put_contents(jg_orders_cache_path($key), json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}', LOCK_EX);
}

function jg_orders_lightweight_live_row(array $order, string $fallbackPlatform): ?array
{
    $orderId = trim((string) ($order['id'] ?? $order['order_id'] ?? ''));
    if ($orderId === '') {
        return null;
    }
    $items = is_array($order['items'] ?? null) ? $order['items'] : [];
    $quantity = 0;
    foreach ($items as $item) {
        if (is_array($item)) {
            $quantity += max(0, (int) ($item['quantity'] ?? 0));
        }
    }
    if ($quantity <= 0) {
        $quantity = max(1, (int) ($order['quantity'] ?? $order['item_count'] ?? 1));
    }
    $financials = is_array($order['financials'] ?? null) ? $order['financials'] : [];
    $netRevenue = (int) round((float) ($financials['netRevenue'] ?? $order['net_revenue'] ?? $order['revenue'] ?? 0));
    $grossRevenue = (int) round((float) ($financials['grossRevenue'] ?? $financials['totalAmount'] ?? $order['gross_revenue'] ?? $order['customer_paid'] ?? $netRevenue));
    $marketplaceFees = max(0, $grossRevenue - $netRevenue);
    $platform = strtolower(trim((string) ($order['platform'] ?? $fallbackPlatform)));

    return [
        'timestamp' => (string) ($order['createdAt'] ?? $order['order_create_time'] ?? $order['timestamp'] ?? ''),
        'order_create_time' => (string) ($order['createdAt'] ?? $order['order_create_time'] ?? $order['timestamp'] ?? ''),
        'order_id' => $orderId,
        'platform' => $platform,
        'account_key' => (string) ($order['sourceAccountKey'] ?? $order['account_key'] ?? $order['account'] ?? ''),
        'quantity' => $quantity,
        'item_count' => $quantity,
        'revenue' => $netRevenue,
        'net_revenue' => $netRevenue,
        'marketplace_fees' => $marketplaceFees,
        'gross_profit' => $netRevenue,
    ];
}

function jg_orders_local_date(string $timestamp): string
{
    $timezone = new DateTimeZone('Asia/Jakarta');
    try {
        $date = new DateTimeImmutable($timestamp !== '' ? $timestamp : 'now');
    } catch (Throwable) {
        $date = new DateTimeImmutable('now', $timezone);
    }
    return $date->setTimezone($timezone)->format('Y-m-d');
}

function jg_orders_remote_url(string $path, array $params): string
{
    $token = jg_dashboard_marketplace_api_setup_token();
    if ($token === '') {
        throw new RuntimeException('Marketplace API setup token is missing.');
    }
    $params['setup_token'] = $token;
    return jg_dashboard_marketplace_api_base_url() . $path . '?' . http_build_query($params);
}

function jg_orders_fetch_json(string $url, int $timeout = 180): array
{
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => $timeout,
            'header' => "Accept: application/json\r\n",
            'ignore_errors' => true,
        ],
    ]);
    $raw = @file_get_contents($url, false, $context);
    $decoded = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($decoded)) {
        throw new RuntimeException('Marketplace API returned invalid JSON.');
    }
    if (($decoded['ok'] ?? true) === false) {
        throw new RuntimeException((string) ($decoded['message'] ?? $decoded['error'] ?? 'Marketplace API failed.'));
    }
    return $decoded;
}

function jg_orders_remote_sync(string $startDate, string $endDate): void
{
    jg_orders_fetch_json(jg_orders_remote_url('/sales/sync', [
        'start_date' => $startDate,
        'end_date' => $endDate,
    ]), 240);
}

function jg_orders_remote_rows(string $startDate, string $endDate): array
{
    $payload = jg_orders_remote_payload($startDate, $endDate);
    return is_array($payload['orders'] ?? null) ? $payload['orders'] : [];
}

function jg_orders_remote_payload(string $startDate, string $endDate, ?int $limit = null, int $offset = 0): array
{
    $params = [
        'start_date' => $startDate,
        'end_date' => $endDate,
        'skip_sync' => '1',
    ];
    if ($limit !== null) {
        $params['limit'] = (string) $limit;
    }
    if ($offset > 0) {
        $params['offset'] = (string) $offset;
    }

    return jg_orders_fetch_json(jg_orders_remote_url('/sales/orders', $params), 30);
}

function jg_orders_ensure_schema(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS sku_stock_lots (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            sku VARCHAR(12) NOT NULL,
            po_number VARCHAR(80) NOT NULL,
            received_qty_astra DECIMAL(14,2) NOT NULL DEFAULT 0,
            remaining_qty_astra DECIMAL(14,2) NOT NULL DEFAULT 0,
            cogs_per_astra DECIMAL(12,2) NOT NULL DEFAULT 0,
            received_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            KEY idx_sku_stock_lots_fifo (sku, received_at, id),
            KEY idx_sku_stock_lots_po (po_number, sku)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS marketplace_order_inventory_allocations (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            order_item_key VARCHAR(220) NOT NULL,
            order_id VARCHAR(160) NOT NULL,
            platform VARCHAR(32) NOT NULL,
            account_key VARCHAR(80) NOT NULL,
            sku VARCHAR(12) NOT NULL,
            stock_lot_id BIGINT UNSIGNED NULL,
            po_number VARCHAR(80) NOT NULL,
            qty_astra_consumed DECIMAL(14,2) NOT NULL,
            cogs_per_astra DECIMAL(12,2) NOT NULL,
            total_cogs DECIMAL(14,2) NOT NULL,
            consumed_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL,
            UNIQUE KEY uq_order_lot (order_item_key, stock_lot_id, po_number),
            KEY idx_alloc_order_item (order_item_key),
            KEY idx_alloc_sku_po (sku, po_number)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    jg_orders_ensure_column($pdo, 'sku_stock_lots', 'created_at', 'DATETIME NULL AFTER received_at');
    jg_orders_ensure_column($pdo, 'sku_stock_lots', 'updated_at', 'DATETIME NULL AFTER created_at');
    jg_orders_ensure_column($pdo, 'marketplace_order_inventory_allocations', 'created_at', 'DATETIME NULL AFTER consumed_at');
}

function jg_orders_ensure_column(PDO $pdo, string $tableName, string $columnName, string $definition): void
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*)
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :table_name
           AND COLUMN_NAME = :column_name'
    );
    $stmt->execute([
        ':table_name' => $tableName,
        ':column_name' => $columnName,
    ]);
    if ((int) $stmt->fetchColumn() > 0) {
        return;
    }

    $pdo->exec(sprintf('ALTER TABLE `%s` ADD COLUMN `%s` %s', $tableName, $columnName, $definition));
}

function jg_orders_ensure_opening_lots(PDO $pdo): void
{
    $now = gmdate('Y-m-d H:i:s');
    $stmt = $pdo->query(
        'SELECT sku, current_stock, cogs, created_at
         FROM sku_skus
         WHERE current_stock > 0
           AND sku NOT IN (SELECT sku FROM sku_stock_lots)'
    );
    $insert = $pdo->prepare(
        'INSERT INTO sku_stock_lots
            (sku, po_number, received_qty_astra, remaining_qty_astra, cogs_per_astra, received_at, created_at, updated_at)
         VALUES (:sku, "OPENING", :received_qty, :remaining_qty, :cogs, :received_at, :created_at, :updated_at)'
    );
    foreach ($stmt->fetchAll() as $row) {
        $qty = number_format((float) ($row['current_stock'] ?? 0), 2, '.', '');
        $insert->execute([
            ':sku' => (string) $row['sku'],
            ':received_qty' => $qty,
            ':remaining_qty' => $qty,
            ':cogs' => number_format((float) ($row['cogs'] ?? 0), 2, '.', ''),
            ':received_at' => (string) ($row['created_at'] ?? $now),
            ':created_at' => $now,
            ':updated_at' => $now,
        ]);
    }
}

function jg_orders_sku_lookup(PDO $pdo): array
{
    $productNameMap = jg_orders_product_name_map();
    $stmt = $pdo->query(
        'SELECT s.sku, s.tag, s.volume, s.astra, s.cogs,
                b.name AS brand_name, u.name AS unit_name, p.name AS product_name, f.name AS flavor_name
         FROM sku_skus s
         INNER JOIN sku_brands b ON b.id = s.brand_id
         INNER JOIN sku_units u ON u.id = s.unit_id
         INNER JOIN sku_products p ON p.id = s.product_id
         INNER JOIN sku_flavors f ON f.id = s.flavor_id'
    );
    $lookup = [];
    foreach ($stmt->fetchAll() as $row) {
        $sku = (string) $row['sku'];
        $baseProductName = (string) ($row['product_name'] ?? $sku);
        $displayFallback = jg_orders_compose_sku_product_name(
            (float) ($row['volume'] ?? 0),
            (string) ($row['unit_name'] ?? ''),
            (string) ($row['flavor_name'] ?? ''),
            $baseProductName
        );
        $record = [
            'sku' => $sku,
            'tag' => (string) $row['tag'],
            'volume' => (float) ($row['volume'] ?? 0),
            'astra' => (float) ($row['astra'] ?? $row['volume'] ?? 0),
            'cogs' => (float) ($row['cogs'] ?? 0),
            'product_name' => jg_orders_sku_product_display_name($sku, $displayFallback, $productNameMap),
            'brand_name' => (string) ($row['brand_name'] ?? ''),
            'unit_name' => (string) ($row['unit_name'] ?? ''),
            'base_product_name' => $baseProductName,
            'flavor_name' => (string) ($row['flavor_name'] ?? ''),
        ];
        foreach (jg_orders_sku_lookup_aliases($record) as $key) {
            if ($key !== '') {
                $lookup[$key] = $record;
            }
        }
    }
    return $lookup;
}

/**
 * @param array<string, mixed> $record
 * @return array<int, string>
 */
function jg_orders_sku_lookup_aliases(array $record): array
{
    $brand = jg_orders_sku_key((string) ($record['brand_name'] ?? ''));
    $brandInitial = $brand !== '' ? substr($brand, 0, 1) : '';
    $product = jg_orders_sku_key((string) ($record['base_product_name'] ?? ''));
    $flavor = jg_orders_sku_key((string) ($record['flavor_name'] ?? ''));
    $unit = jg_orders_sku_key((string) ($record['unit_name'] ?? ''));
    $volume = (float) ($record['volume'] ?? 0);
    $volumeText = $volume > 0 ? rtrim(rtrim(number_format($volume, 1, '.', ''), '0'), '.') : '';
    $size = jg_orders_sku_key($volumeText . $unit);
    $aliases = [
        jg_orders_sku_key((string) ($record['sku'] ?? '')),
        jg_orders_sku_key((string) ($record['tag'] ?? '')),
    ];

    foreach (array_filter([$brand, $brandInitial]) as $brandKey) {
        $aliases[] = $brandKey . $product . $flavor . $size;
        $aliases[] = $brandKey . $product . $size . $flavor;
        if (str_contains($product, 'STICKER')) {
            $aliases[] = $brandKey . 'MERCHSTICKER';
        }
    }

    return array_values(array_unique(array_filter($aliases)));
}

function jg_orders_sku_key(string $value): string
{
    $key = strtoupper(preg_replace('/[^A-Z0-9]+/i', '', trim($value)) ?? '');
    return str_replace('SALTEDCARAMEL', 'SALTCARAMEL', $key);
}

function jg_orders_product_name_map(): array
{
    $path = dirname(__DIR__, 2) . '/sku-product-names.json';
    if (!is_file($path)) {
        return [];
    }

    $raw = file_get_contents($path);
    $decoded = is_string($raw) ? json_decode($raw, true) : null;
    return is_array($decoded) ? $decoded : [];
}

function jg_orders_sku_product_display_name(string $sku, string $fallback, array $productNameMap): string
{
    $mapped = trim((string) ($productNameMap[$sku] ?? ''));
    return $mapped !== '' ? $mapped : $fallback;
}

function jg_orders_compose_sku_product_name(float $volume, string $unitName, string $flavorName, string $productName): string
{
    $volumeText = $volume > 0 ? rtrim(rtrim(number_format($volume, 1, '.', ''), '0'), '.') : '';
    $unitText = trim($unitName);
    $flavorText = trim($flavorName);
    $baseText = trim($productName);
    $prefix = trim($volumeText . $unitText);

    return trim(implode(' ', array_filter([$prefix, $flavorText, $baseText], static fn (string $part): bool => $part !== '')));
}

function jg_orders_enrich_and_allocate(PDO $pdo, array $remoteRows, array $skuLookup): array
{
    $rows = [];
    foreach ($remoteRows as $remoteRow) {
        if (!is_array($remoteRow)) {
            continue;
        }
        $sku = jg_orders_match_sku($remoteRow, $skuLookup);
        $astraQty = 0.0;
        $allocations = [];
        $allocationError = '';
        if ($sku) {
            $quantity = max(0, (int) ($remoteRow['quantity'] ?? 0));
            $volume = (float) ($sku['volume'] ?? 0);
            $astra = (float) ($sku['astra'] ?? $volume);
            $multiplier = $volume > 0 && $astra > 0 ? max(1.0, $volume / $astra) : 1.0;
            $astraQty = round($quantity * $multiplier, 2);
            try {
                $allocations = jg_orders_allocate_fifo($pdo, $remoteRow, $sku, $astraQty);
            } catch (Throwable $error) {
                error_log('Orders FIFO allocation failed for ' . (string) ($remoteRow['order_id'] ?? '') . ': ' . $error->getMessage());
                $allocationError = $error->getMessage();
            }
        }
        $rows[] = jg_orders_enriched_row($remoteRow, $sku, $astraQty, $allocations, $allocationError);
    }
    return $rows;
}

function jg_orders_enrich_for_read(PDO $pdo, array $remoteRows, array $skuLookup): array
{
    $preparedRows = [];
    $orderItemKeys = [];
    foreach ($remoteRows as $remoteRow) {
        if (!is_array($remoteRow)) {
            continue;
        }
        $sku = jg_orders_match_sku($remoteRow, $skuLookup);
        $orderItemKey = $sku ? jg_orders_order_item_key($remoteRow) : '';
        if ($orderItemKey !== '') {
            $orderItemKeys[$orderItemKey] = true;
        }
        $preparedRows[] = [
            'remote' => $remoteRow,
            'sku' => $sku,
            'order_item_key' => $orderItemKey,
        ];
    }

    $allocationMap = jg_orders_existing_allocations($pdo, array_keys($orderItemKeys));
    $rows = [];
    foreach ($preparedRows as $preparedRow) {
        $remoteRow = $preparedRow['remote'];
        $sku = $preparedRow['sku'];
        $quantity = max(0, (int) ($remoteRow['quantity'] ?? 0));
        $volume = (float) ($sku['volume'] ?? 0);
        $astra = (float) ($sku['astra'] ?? $volume);
        $multiplier = $volume > 0 && $astra > 0 ? max(1.0, $volume / $astra) : 1.0;
        $astraQty = $sku ? round($quantity * $multiplier, 2) : 0.0;
        $allocationKey = jg_orders_allocation_map_key(
            (string) $preparedRow['order_item_key'],
            (string) ($sku['sku'] ?? '')
        );
        $allocations = $allocationMap[$allocationKey] ?? [];
        $rows[] = jg_orders_enriched_row($remoteRow, $sku, $astraQty, $allocations);
    }

    return $rows;
}

function jg_orders_enrich_without_inventory(array $remoteRows): array
{
    $rows = [];
    foreach ($remoteRows as $remoteRow) {
        if (is_array($remoteRow)) {
            $rows[] = jg_orders_enriched_row($remoteRow, null, 0.0, []);
        }
    }
    return $rows;
}

function jg_orders_existing_allocations(PDO $pdo, array $orderItemKeys): array
{
    $allocationMap = [];
    $orderItemKeys = array_values(array_unique(array_filter(array_map('strval', $orderItemKeys))));
    foreach (array_chunk($orderItemKeys, 400) as $chunk) {
        $placeholders = implode(',', array_fill(0, count($chunk), '?'));
        $stmt = $pdo->prepare(
            'SELECT order_item_key, sku, po_number, qty_astra_consumed, cogs_per_astra, total_cogs
             FROM marketplace_order_inventory_allocations
             WHERE order_item_key IN (' . $placeholders . ')
             ORDER BY order_item_key, id'
        );
        $stmt->execute($chunk);
        foreach ($stmt->fetchAll() as $allocation) {
            $mapKey = jg_orders_allocation_map_key(
                (string) ($allocation['order_item_key'] ?? ''),
                (string) ($allocation['sku'] ?? '')
            );
            $allocationMap[$mapKey][] = [
                'po_number' => (string) ($allocation['po_number'] ?? ''),
                'qty_astra_consumed' => (float) ($allocation['qty_astra_consumed'] ?? 0),
                'cogs_per_astra' => (float) ($allocation['cogs_per_astra'] ?? 0),
                'total_cogs' => (float) ($allocation['total_cogs'] ?? 0),
            ];
        }
    }

    return $allocationMap;
}

function jg_orders_allocation_map_key(string $orderItemKey, string $sku): string
{
    return $orderItemKey . "\x1f" . $sku;
}

function jg_orders_enriched_row(
    array $remoteRow,
    ?array $sku,
    float $astraQty,
    array $allocations,
    string $allocationError = ''
): array {
    $allocatedQty = array_sum(array_map(
        static fn (array $allocation): float => (float) ($allocation['qty_astra_consumed'] ?? 0),
        $allocations
    ));
    $totalCogs = array_sum(array_map(
        static fn (array $allocation): float => (float) ($allocation['total_cogs'] ?? 0),
        $allocations
    ));
    $unallocatedQty = max(0.0, round($astraQty - $allocatedQty, 2));
    $estimatedCogs = $unallocatedQty * (float) ($sku['cogs'] ?? 0);
    $totalCogs += $estimatedCogs;
    $revenue = (int) round((float) ($remoteRow['revenue'] ?? $remoteRow['net_revenue'] ?? $remoteRow['sales'] ?? 0));

    return [
        'timestamp' => (string) ($remoteRow['timestamp'] ?? ''),
        'order_create_time' => (string) ($remoteRow['order_create_time'] ?? ($remoteRow['timestamp'] ?? '')),
        'order_id' => (string) ($remoteRow['order_id'] ?? ''),
        'platform' => (string) ($remoteRow['platform'] ?? ''),
        'account_key' => (string) ($remoteRow['account_key'] ?? ''),
        'company' => (string) ($remoteRow['company'] ?? ''),
        'brand_name' => (string) ($sku['brand_name'] ?? ''),
        'product_name' => (string) ($sku['product_name'] ?? ($remoteRow['product_name'] ?? '')),
        'marketplace_product_name' => (string) ($remoteRow['product_name'] ?? ''),
        'base_product_name' => (string) ($sku['base_product_name'] ?? ''),
        'flavor_name' => (string) ($sku['flavor_name'] ?? ($remoteRow['flavor'] ?? '')),
        'product_type' => (string) ($remoteRow['product_type'] ?? ''),
        'flavor' => (string) ($remoteRow['flavor'] ?? ''),
        'marketplace_sku' => (string) ($remoteRow['sku'] ?? ''),
        'item_key' => (string) ($remoteRow['item_key'] ?? ''),
        'sku' => (string) ($sku['sku'] ?? ''),
        'sku_linked' => $sku !== null,
        'quantity' => (int) ($remoteRow['quantity'] ?? 0),
        'astra_quantity' => $astraQty,
        'revenue' => $revenue,
        'net_revenue' => $revenue,
        'marketplace_fees' => (int) round((float) ($remoteRow['order_marketplace_fees'] ?? $remoteRow['marketplace_fees'] ?? 0)),
        'cogs' => (int) round($totalCogs),
        'cogs_estimated' => $unallocatedQty > 0,
        'gross_profit' => (int) round($revenue - $totalCogs),
        'username' => (string) ($remoteRow['username'] ?? ''),
        'address' => (string) ($remoteRow['address'] ?? ''),
        'phone' => (string) ($remoteRow['phone'] ?? ''),
        'allocations' => $allocations,
        'allocation_error' => $allocationError,
    ];
}

/**
 * @param array<string, mixed> $remoteRow
 * @param array<string, array<string, mixed>> $skuLookup
 * @return array<string, mixed>|null
 */
function jg_orders_match_sku(array $remoteRow, array $skuLookup): ?array
{
    $candidates = [
        (string) ($remoteRow['sku'] ?? ''),
        (string) ($remoteRow['item_key'] ?? ''),
    ];
    foreach ($candidates as $candidate) {
        $key = jg_orders_sku_key($candidate);
        if ($key !== '' && isset($skuLookup[$key])) {
            return $skuLookup[$key];
        }
    }

    $haystack = jg_orders_sku_key(implode(' ', $candidates));
    foreach ($skuLookup as $key => $record) {
        if (strlen($key) >= 3 && $haystack !== '' && str_contains($haystack, $key)) {
            return $record;
        }
    }

    return null;
}

function jg_orders_allocate_fifo(PDO $pdo, array $remoteRow, array $sku, float $astraQty): array
{
    $orderItemKey = jg_orders_order_item_key($remoteRow);
    $skuCode = (string) $sku['sku'];
    $now = gmdate('Y-m-d H:i:s');
    $consumedAt = (string) ($remoteRow['timestamp'] ?? $now);

    $pdo->beginTransaction();
    try {
        jg_orders_restore_replaced_allocations($pdo, $remoteRow, $orderItemKey, $skuCode);
        jg_orders_restore_allocations($pdo, $orderItemKey, $skuCode);
        $remaining = $astraQty;
        $allocations = [];
        $lotStmt = $pdo->prepare(
            'SELECT id, po_number, remaining_qty_astra, cogs_per_astra
             FROM sku_stock_lots
             WHERE sku = :sku AND remaining_qty_astra > 0
             ORDER BY received_at ASC, id ASC
             FOR UPDATE'
        );
        $lotStmt->execute([':sku' => $skuCode]);
        $insert = $pdo->prepare(
            'INSERT INTO marketplace_order_inventory_allocations
                (order_item_key, order_id, platform, account_key, sku, stock_lot_id, po_number, qty_astra_consumed, cogs_per_astra, total_cogs, consumed_at, created_at)
             VALUES
                (:order_item_key, :order_id, :platform, :account_key, :sku, :stock_lot_id, :po_number, :qty, :cogs, :total_cogs, :consumed_at, :created_at)'
        );
        $updateLot = $pdo->prepare('UPDATE sku_stock_lots SET remaining_qty_astra = remaining_qty_astra - :qty, updated_at = :updated_at WHERE id = :id');

        foreach ($lotStmt->fetchAll() as $lot) {
            if ($remaining <= 0) {
                break;
            }
            $take = min($remaining, (float) ($lot['remaining_qty_astra'] ?? 0));
            if ($take <= 0) {
                continue;
            }
            $cogs = (float) ($lot['cogs_per_astra'] ?? 0);
            $totalCogs = round($take * $cogs, 2);
            $insert->execute([
                ':order_item_key' => $orderItemKey,
                ':order_id' => (string) ($remoteRow['order_id'] ?? ''),
                ':platform' => (string) ($remoteRow['platform'] ?? ''),
                ':account_key' => (string) ($remoteRow['account_key'] ?? ''),
                ':sku' => $skuCode,
                ':stock_lot_id' => (int) $lot['id'],
                ':po_number' => (string) $lot['po_number'],
                ':qty' => number_format($take, 2, '.', ''),
                ':cogs' => number_format($cogs, 2, '.', ''),
                ':total_cogs' => number_format($totalCogs, 2, '.', ''),
                ':consumed_at' => $consumedAt,
                ':created_at' => $now,
            ]);
            $updateLot->execute([
                ':qty' => number_format($take, 2, '.', ''),
                ':updated_at' => $now,
                ':id' => (int) $lot['id'],
            ]);
            $allocations[] = [
                'po_number' => (string) $lot['po_number'],
                'qty_astra_consumed' => $take,
                'cogs_per_astra' => $cogs,
                'total_cogs' => $totalCogs,
            ];
            $remaining = round($remaining - $take, 2);
        }

        if ($remaining > 0) {
            $cogs = (float) ($sku['cogs'] ?? 0);
            $totalCogs = round($remaining * $cogs, 2);
            $insert->execute([
                ':order_item_key' => $orderItemKey,
                ':order_id' => (string) ($remoteRow['order_id'] ?? ''),
                ':platform' => (string) ($remoteRow['platform'] ?? ''),
                ':account_key' => (string) ($remoteRow['account_key'] ?? ''),
                ':sku' => $skuCode,
                ':stock_lot_id' => null,
                ':po_number' => 'OVERDRAW',
                ':qty' => number_format($remaining, 2, '.', ''),
                ':cogs' => number_format($cogs, 2, '.', ''),
                ':total_cogs' => number_format($totalCogs, 2, '.', ''),
                ':consumed_at' => $consumedAt,
                ':created_at' => $now,
            ]);
            $allocations[] = [
                'po_number' => 'OVERDRAW',
                'qty_astra_consumed' => $remaining,
                'cogs_per_astra' => $cogs,
                'total_cogs' => $totalCogs,
            ];
        }

        jg_orders_refresh_stock($pdo, $skuCode);
        $pdo->commit();
        return $allocations;
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
}

function jg_orders_order_item_key(array $remoteRow): string
{
    $itemKey = trim((string) ($remoteRow['item_key'] ?? ''));
    if ($itemKey === '') {
        $itemKey = trim((string) ($remoteRow['sku'] ?? ''));
    }
    if ($itemKey === '') {
        $itemKey = trim((string) ($remoteRow['item_row_id'] ?? ''));
    }

    return implode('|', [
        (string) ($remoteRow['platform'] ?? ''),
        (string) ($remoteRow['account_key'] ?? ''),
        (string) ($remoteRow['order_id'] ?? ''),
        $itemKey,
    ]);
}

function jg_orders_restore_replaced_allocations(PDO $pdo, array $remoteRow, string $currentOrderItemKey, string $sku): void
{
    $stmt = $pdo->prepare(
        'SELECT id, stock_lot_id, qty_astra_consumed
         FROM marketplace_order_inventory_allocations
         WHERE order_id = :order_id
           AND platform = :platform
           AND account_key = :account_key
           AND sku = :sku
           AND order_item_key <> :order_item_key'
    );
    $stmt->execute([
        ':order_id' => (string) ($remoteRow['order_id'] ?? ''),
        ':platform' => (string) ($remoteRow['platform'] ?? ''),
        ':account_key' => (string) ($remoteRow['account_key'] ?? ''),
        ':sku' => $sku,
        ':order_item_key' => $currentOrderItemKey,
    ]);
    $restore = $pdo->prepare('UPDATE sku_stock_lots SET remaining_qty_astra = remaining_qty_astra + :qty, updated_at = :updated_at WHERE id = :id');
    $delete = $pdo->prepare('DELETE FROM marketplace_order_inventory_allocations WHERE id = :id');
    foreach ($stmt->fetchAll() as $row) {
        if (!empty($row['stock_lot_id'])) {
            $restore->execute([
                ':qty' => number_format((float) $row['qty_astra_consumed'], 2, '.', ''),
                ':updated_at' => gmdate('Y-m-d H:i:s'),
                ':id' => (int) $row['stock_lot_id'],
            ]);
        }
        $delete->execute([':id' => (int) $row['id']]);
    }
}

function jg_orders_restore_allocations(PDO $pdo, string $orderItemKey, string $sku): void
{
    $stmt = $pdo->prepare('SELECT stock_lot_id, qty_astra_consumed FROM marketplace_order_inventory_allocations WHERE order_item_key = :order_item_key AND sku = :sku');
    $stmt->execute([':order_item_key' => $orderItemKey, ':sku' => $sku]);
    $restore = $pdo->prepare('UPDATE sku_stock_lots SET remaining_qty_astra = remaining_qty_astra + :qty, updated_at = :updated_at WHERE id = :id');
    foreach ($stmt->fetchAll() as $row) {
        if (!empty($row['stock_lot_id'])) {
            $restore->execute([
                ':qty' => number_format((float) $row['qty_astra_consumed'], 2, '.', ''),
                ':updated_at' => gmdate('Y-m-d H:i:s'),
                ':id' => (int) $row['stock_lot_id'],
            ]);
        }
    }
    $delete = $pdo->prepare('DELETE FROM marketplace_order_inventory_allocations WHERE order_item_key = :order_item_key AND sku = :sku');
    $delete->execute([':order_item_key' => $orderItemKey, ':sku' => $sku]);
}

function jg_orders_refresh_stock(PDO $pdo, string $sku): void
{
    $stmt = $pdo->prepare('SELECT COALESCE(SUM(remaining_qty_astra), 0) FROM sku_stock_lots WHERE sku = :sku');
    $stmt->execute([':sku' => $sku]);
    $stock = (int) round((float) $stmt->fetchColumn());
    $update = $pdo->prepare('UPDATE sku_skus SET current_stock = :stock, updated_at = :updated_at WHERE sku = :sku');
    $update->execute([
        ':stock' => $stock,
        ':updated_at' => gmdate('Y-m-d H:i:s'),
        ':sku' => $sku,
    ]);
}
