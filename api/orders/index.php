<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/config.php';
require_once dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/analytics-bootstrap.php';
require_once dirname(__DIR__, 2) . '/sku-db-bootstrap.php';
require_once dirname(__DIR__, 2) . '/astra-stock-bootstrap.php';
require_once dirname(__DIR__, 2) . '/website-commerce-bootstrap.php';

if (!defined('JG_ORDERS_API_NO_DISPATCH')) {
    jg_orders_handle_request();
}

function jg_orders_handle_request(): void
{
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $action = strtolower(trim((string) ($_GET['action'] ?? 'list')));
    if ($method === 'POST' && in_array($action, ['webhook', 'mirror'], true)) {
        jg_orders_handle_webhook();
        return;
    }

    jg_admin_require_auth();
    header('Content-Type: application/json; charset=utf-8');

    try {
        $startDate = jg_orders_date($_GET['start_date'] ?? null, '-1 day');
        $endDate = jg_orders_date($_GET['end_date'] ?? null, 'today');
        $limit = jg_orders_limit($_GET['limit'] ?? null);
        $offset = max(0, (int) ($_GET['offset'] ?? 0));
        $mirroredAfter = jg_orders_optional_utc_datetime($_GET['mirrored_after'] ?? $_GET['mirrored_after_at'] ?? null);
        $forceRepair = jg_orders_bool($_GET['repair'] ?? $_GET['force_repair'] ?? null);
        if ($method === 'GET' && $action === 'status') {
            $pdo = analyticsDb();
            jg_orders_ensure_mirror_schema($pdo);
            echo json_encode([
                'ok' => true,
                'mirror' => jg_orders_mirror_status($pdo),
            ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            return;
        }
        if ($method === 'GET' && in_array($action, ['daily_summary', 'daily'], true)) {
            $pdo = analyticsDb();
            jg_orders_ensure_mirror_schema($pdo);
            $response = jg_orders_daily_summary_payload($pdo, $startDate, $endDate, $forceRepair);
            echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            return;
        }
        if ($method === 'GET' && in_array($action, ['location_summary', 'location_aggregate'], true)) {
            $pdo = analyticsDb();
            jg_orders_ensure_mirror_schema($pdo);
            jg_orders_ensure_location_cache_schema($pdo);
            $forceRefresh = jg_orders_bool($_GET['refresh'] ?? $_GET['force'] ?? null);
            $response = jg_orders_location_summary_payload($pdo, $startDate, $endDate, $forceRefresh);
            echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            return;
        }

        $payload = [];
        if ($method === 'POST') {
            $payload = json_decode((string) file_get_contents('php://input'), true);
            $payload = is_array($payload) ? $payload : [];
            $startDate = jg_orders_date($payload['start_date'] ?? $startDate, '-1 day');
            $endDate = jg_orders_date($payload['end_date'] ?? $endDate, 'today');
        }

        $remoteWarning = '';
        try {
            $mirrorPdo = analyticsDb();
            jg_orders_ensure_mirror_schema($mirrorPdo);
            $remotePayload = jg_orders_mirror_payload($mirrorPdo, $startDate, $endDate, $limit, $offset, $forceRepair, $mirroredAfter);
        } catch (Throwable $mirrorOrdersError) {
            $remotePayload = ['orders' => [], 'has_more' => false, 'next_offset' => null];
            $remoteWarning = 'order_mirror_unavailable';
            error_log('Dashboard order mirror unavailable; serving independent website sales: ' . $mirrorOrdersError->getMessage());
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
            $rows = jg_orders_lightweight_rows($remoteRows);
            $response = [
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
            ];
            if (isset($remotePayload['mirror_repair'])) {
                $response['mirror_repair'] = $remotePayload['mirror_repair'];
            }
            echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            return;
        }

        $inventoryWarning = $remoteWarning;
        $writeAllocations = $method === 'POST' && jg_orders_bool($payload['allocate'] ?? $_GET['allocate'] ?? null);
        if ($writeAllocations) {
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
        if (isset($remotePayload['mirror_repair'])) {
            $response['mirror_repair'] = $remotePayload['mirror_repair'];
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

function jg_orders_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}

function jg_orders_handle_webhook(): void
{
    try {
        jg_orders_require_webhook_token();
        $payload = jg_orders_request_body();
        $rows = jg_orders_webhook_rows($payload);
        if ($rows === []) {
            throw new InvalidArgumentException('Webhook payload did not contain any order rows.');
        }

        $pdo = analyticsDb();
        jg_orders_ensure_mirror_schema($pdo);
        $result = jg_orders_upsert_mirror_rows($pdo, $rows, $payload);
        $liveState = analyticsTouchLiveState('orders_webhook');
        jg_orders_json([
            'ok' => true,
            'mirror' => $result,
            'live_state' => $liveState,
        ]);
    } catch (InvalidArgumentException $error) {
        jg_orders_json(['ok' => false, 'error' => $error->getMessage()], 422);
    } catch (DomainException $error) {
        jg_orders_json(['ok' => false, 'error' => $error->getMessage()], 401);
    } catch (Throwable $error) {
        error_log('Orders webhook failed: ' . $error->getMessage());
        jg_orders_json(['ok' => false, 'error' => 'orders_webhook_failed'], 500);
    }
}

function jg_orders_request_body(): array
{
    $raw = file_get_contents('php://input');
    $decoded = is_string($raw) ? json_decode($raw, true) : null;
    return is_array($decoded) ? $decoded : [];
}

function jg_orders_webhook_token(): string
{
    $config = jg_dashboard_load_local_config();
    return jg_dashboard_env_value('JG_ORDER_WEBHOOK_TOKEN')
        ?: trim((string) ($config['order_webhook_token'] ?? ''))
        ?: jg_dashboard_env_value('JG_MARKETPLACE_WEBHOOK_TOKEN')
        ?: trim((string) ($config['marketplace_webhook_token'] ?? ''))
        ?: jg_dashboard_marketplace_api_setup_token();
}

function jg_orders_supplied_webhook_token(): string
{
    $authorization = trim((string) ($_SERVER['HTTP_AUTHORIZATION'] ?? ''));
    if (preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches)) {
        return trim((string) ($matches[1] ?? ''));
    }

    foreach ([
        'HTTP_X_JG_ORDERS_WEBHOOK_TOKEN',
        'HTTP_X_ORDER_WEBHOOK_TOKEN',
        'HTTP_X_WEBHOOK_TOKEN',
        'HTTP_X_API_KEY',
    ] as $header) {
        $value = trim((string) ($_SERVER[$header] ?? ''));
        if ($value !== '') {
            return $value;
        }
    }

    return trim((string) ($_GET['token'] ?? $_GET['setup_token'] ?? ''));
}

function jg_orders_require_webhook_token(): void
{
    $expected = jg_orders_webhook_token();
    if ($expected === '') {
        throw new DomainException('Orders webhook token is not configured.');
    }

    if (!hash_equals($expected, jg_orders_supplied_webhook_token())) {
        throw new DomainException('Unauthorized');
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

function jg_orders_normalized_status(mixed $value): string
{
    return trim(preg_replace('/[^A-Z0-9]+/', '_', strtoupper((string) $value)) ?? '', '_');
}

function jg_orders_release_marker_trusted(string $platform, mixed $orderStatus, mixed $releaseStatus, mixed $releaseSource): bool
{
    $platform = strtolower(trim($platform));
    if ($platform !== 'shopee') {
        return true;
    }

    $source = strtolower(trim((string) $releaseSource));
    $normalizedOrderStatus = jg_orders_normalized_status($orderStatus);
    $normalizedReleaseStatus = jg_orders_normalized_status($releaseStatus);
    $effectiveStatus = $normalizedReleaseStatus !== '' ? $normalizedReleaseStatus : $normalizedOrderStatus;

    if (preg_match('/^order_status=([^;]+)/i', trim((string) $releaseSource), $matches)) {
        return in_array(jg_orders_normalized_status($matches[1]), ['COMPLETED', 'COMPLETE'], true);
    }

    if ($source === 'settlement_payload') {
        return !in_array($effectiveStatus, [
            'READY_TO_SHIP',
            'PROCESSED',
            'SHIPPED',
            'TO_CONFIRM_RECEIVE',
            'IN_CANCEL',
            'RETRY_SHIP',
            'PAID',
            'UNPAID',
        ], true);
    }

    return true;
}

function jg_orders_optional_utc_datetime(mixed $value): ?string
{
    $date = jg_orders_order_datetime($value);
    return $date instanceof DateTimeImmutable ? jg_orders_sql_datetime($date) : null;
}

function jg_orders_limit(mixed $value): ?int
{
    $limit = (int) $value;
    if ($limit <= 0) {
        return null;
    }
    return max(1, min(2000, $limit));
}

function jg_orders_ensure_mirror_schema(PDO $pdo): void
{
    analyticsTryExec(
        $pdo,
        'CREATE TABLE IF NOT EXISTS dashboard_order_mirror (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            order_item_hash CHAR(64) NOT NULL,
            platform VARCHAR(40) NOT NULL DEFAULT "",
            account_key VARCHAR(120) NOT NULL DEFAULT "",
            order_id VARCHAR(160) NOT NULL DEFAULT "",
            item_key VARCHAR(220) NOT NULL DEFAULT "",
            sku VARCHAR(80) NOT NULL DEFAULT "",
            status VARCHAR(80) NOT NULL DEFAULT "",
            order_create_time DATETIME(6) NULL DEFAULT NULL,
            order_create_date DATE NULL DEFAULT NULL,
            timestamp_utc DATETIME(6) NULL DEFAULT NULL,
            company VARCHAR(160) NOT NULL DEFAULT "",
            brand_name VARCHAR(160) NOT NULL DEFAULT "",
            product_name VARCHAR(255) NOT NULL DEFAULT "",
            marketplace_product_name VARCHAR(255) NOT NULL DEFAULT "",
            base_product_name VARCHAR(255) NOT NULL DEFAULT "",
            flavor_name VARCHAR(160) NOT NULL DEFAULT "",
            product_type VARCHAR(160) NOT NULL DEFAULT "",
            flavor VARCHAR(160) NOT NULL DEFAULT "",
            quantity INT NOT NULL DEFAULT 0,
            cogs_quantity INT NOT NULL DEFAULT 0,
            is_free_gift TINYINT(1) NOT NULL DEFAULT 0,
            revenue DECIMAL(16,2) NOT NULL DEFAULT 0,
            order_net_revenue DECIMAL(16,2) NOT NULL DEFAULT 0,
            gross_revenue DECIMAL(16,2) NOT NULL DEFAULT 0,
            marketplace_fees DECIMAL(16,2) NOT NULL DEFAULT 0,
            funds_released TINYINT(1) NOT NULL DEFAULT 0,
            funds_released_at DATETIME(6) NULL DEFAULT NULL,
            funds_released_amount DECIMAL(16,2) NOT NULL DEFAULT 0,
            funds_release_status VARCHAR(80) NOT NULL DEFAULT "",
            funds_release_source VARCHAR(220) NOT NULL DEFAULT "",
            cogs DECIMAL(16,2) NOT NULL DEFAULT 0,
            gross_profit DECIMAL(16,2) NOT NULL DEFAULT 0,
            username VARCHAR(255) NOT NULL DEFAULT "",
            address TEXT NULL,
            phone VARCHAR(80) NOT NULL DEFAULT "",
            source_event VARCHAR(80) NOT NULL DEFAULT "",
            source_updated_at DATETIME(6) NULL DEFAULT NULL,
            raw_json LONGTEXT NOT NULL,
            mirrored_at DATETIME(6) NOT NULL,
            deleted_at DATETIME(6) NULL DEFAULT NULL,
            UNIQUE KEY uniq_dashboard_order_item_hash (order_item_hash),
            KEY idx_dashboard_order_mirror_created (order_create_time),
            KEY idx_dashboard_order_mirror_date (order_create_date),
            KEY idx_dashboard_order_mirror_order (platform, account_key, order_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    analyticsEnsureTableColumn($pdo, 'dashboard_order_mirror', 'gross_revenue', 'DECIMAL(16,2) NOT NULL DEFAULT 0 AFTER `order_net_revenue`');
    analyticsEnsureTableColumn($pdo, 'dashboard_order_mirror', 'cogs_quantity', 'INT NOT NULL DEFAULT 0 AFTER `quantity`');
    analyticsEnsureTableColumn($pdo, 'dashboard_order_mirror', 'is_free_gift', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `cogs_quantity`');
    analyticsEnsureTableColumn($pdo, 'dashboard_order_mirror', 'funds_released', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `marketplace_fees`');
    analyticsEnsureTableColumn($pdo, 'dashboard_order_mirror', 'funds_released_at', 'DATETIME(6) NULL DEFAULT NULL AFTER `funds_released`');
    analyticsEnsureTableColumn($pdo, 'dashboard_order_mirror', 'funds_released_amount', 'DECIMAL(16,2) NOT NULL DEFAULT 0 AFTER `funds_released_at`');
    analyticsEnsureTableColumn($pdo, 'dashboard_order_mirror', 'funds_release_status', 'VARCHAR(80) NOT NULL DEFAULT "" AFTER `funds_released_amount`');
    analyticsEnsureTableColumn($pdo, 'dashboard_order_mirror', 'funds_release_source', 'VARCHAR(220) NOT NULL DEFAULT "" AFTER `funds_release_status`');
    analyticsEnsureTableColumn($pdo, 'dashboard_order_mirror', 'deleted_at', 'DATETIME(6) NULL DEFAULT NULL AFTER `mirrored_at`');
}

function jg_orders_ensure_location_cache_schema(PDO $pdo): void
{
    analyticsTryExec(
        $pdo,
        'CREATE TABLE IF NOT EXISTS dashboard_order_location_cache (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            range_key VARCHAR(64) NOT NULL,
            geocoder_version INT NOT NULL DEFAULT 1,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            mirror_rows INT NOT NULL DEFAULT 0,
            mirror_distinct_orders INT NOT NULL DEFAULT 0,
            mirror_last_mirrored_at DATETIME(6) NULL DEFAULT NULL,
            aggregate_json LONGTEXT NOT NULL,
            generated_at DATETIME(6) NOT NULL,
            UNIQUE KEY uniq_dashboard_order_location_cache (range_key, geocoder_version)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function jg_orders_is_list_array(array $value): bool
{
    return $value === [] || array_keys($value) === range(0, count($value) - 1);
}

function jg_orders_pick(array $row, array $keys, mixed $fallback = ''): mixed
{
    foreach ($keys as $key) {
        if (array_key_exists($key, $row) && $row[$key] !== null && $row[$key] !== '') {
            return $row[$key];
        }
    }
    return $fallback;
}

function jg_orders_float(mixed $value): float
{
    if (is_numeric($value)) {
        return (float) $value;
    }
    $normalized = preg_replace('/[^0-9.\-]+/', '', (string) $value);
    return is_numeric($normalized) ? (float) $normalized : 0.0;
}

function jg_orders_int(mixed $value): int
{
    return max(0, (int) round(jg_orders_float($value)));
}

function jg_orders_is_free_gift(array $row): bool
{
    if (jg_orders_bool(jg_orders_pick($row, ['is_free_gift', 'free_gift', 'is_gift', 'is_complimentary'], false))) {
        return true;
    }

    $type = strtoupper(trim((string) jg_orders_pick($row, ['item_type', 'line_item_type', 'sku_type', 'promotion_type'], '')));
    $type = trim((string) preg_replace('/[^A-Z0-9]+/', '_', $type), '_');
    if (in_array($type, ['GIFT', 'FREE_GIFT', 'FREEBIE', 'COMPLIMENTARY_GIFT', 'GIFT_WITH_PURCHASE'], true)) {
        return true;
    }

    $label = implode(' ', [
        (string) jg_orders_pick($row, ['sku', 'seller_sku', 'item_sku'], ''),
        (string) jg_orders_pick($row, ['product_name', 'item_name', 'name', 'title'], ''),
        (string) jg_orders_pick($row, ['marketplace_product_name'], ''),
    ]);
    return preg_match('/(?:^|[^a-z0-9])(?:free[ _-]*gift|freebie|hadiah[ _-]*gratis|gratis[ _-]*gift)(?:$|[^a-z0-9])/i', $label) === 1;
}

function jg_orders_stock_quantity(array $row): int
{
    $physical = jg_orders_int(jg_orders_pick($row, ['cogs_quantity', 'stock_quantity', 'physical_quantity'], 0));
    return $physical > 0 ? $physical : jg_orders_int(jg_orders_pick($row, ['quantity'], 0));
}

function jg_orders_interpret_sales_row(array $row): array
{
    $physicalQuantity = jg_orders_stock_quantity($row);
    $isFreeGift = jg_orders_is_free_gift($row);
    $row['cogs_quantity'] = $physicalQuantity;
    $row['is_free_gift'] = $isFreeGift;
    if (!$isFreeGift) {
        return $row;
    }

    $cogs = jg_orders_float(jg_orders_pick($row, ['cogs', 'total_cogs'], 0));
    $row['quantity'] = 0;
    $row['item_count'] = 0;
    $row['revenue'] = 0;
    $row['net_revenue'] = 0;
    $row['gross_revenue'] = 0;
    $row['marketplace_fees'] = 0;
    $row['gross_profit'] = -$cogs;
    return $row;
}

function jg_orders_free_gift_sql(string $alias): string
{
    return '(' . $alias . '.is_free_gift = 1'
        . ' OR LOWER(CONCAT_WS(\' \', COALESCE(' . $alias . '.sku, \'\'), COALESCE(' . $alias . '.product_name, \'\'), COALESCE(' . $alias . '.marketplace_product_name, \'\')))'
        . ' REGEXP \'(^|[^a-z0-9])(free[ _-]*gift|freebie|hadiah[ _-]*gratis|gratis[ _-]*gift)($|[^a-z0-9])\')';
}

function jg_orders_order_datetime(mixed $value): ?DateTimeImmutable
{
    if ($value instanceof DateTimeImmutable) {
        return $value->setTimezone(new DateTimeZone('UTC'));
    }
    if ($value instanceof DateTimeInterface) {
        return (new DateTimeImmutable($value->format(DATE_ATOM)))->setTimezone(new DateTimeZone('UTC'));
    }
    if (is_int($value) || (is_string($value) && preg_match('/^\d{10,13}$/', trim($value)))) {
        $timestamp = (int) $value;
        if ($timestamp > 9999999999) {
            $timestamp = (int) floor($timestamp / 1000);
        }
        return (new DateTimeImmutable('@' . $timestamp))->setTimezone(new DateTimeZone('UTC'));
    }
    $raw = trim((string) $value);
    if ($raw === '') {
        return null;
    }
    if (!preg_match('/(?:Z|[+-]\d{2}:?\d{2})$/', $raw)) {
        $raw .= ' UTC';
    }
    try {
        return (new DateTimeImmutable($raw))->setTimezone(new DateTimeZone('UTC'));
    } catch (Throwable) {
        return null;
    }
}

function jg_orders_sql_datetime(?DateTimeImmutable $date): ?string
{
    return $date instanceof DateTimeImmutable ? $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.u') : null;
}

function jg_orders_atom_datetime(?string $value): string
{
    if ($value === null || trim($value) === '') {
        return '';
    }
    try {
        return (new DateTimeImmutable($value, new DateTimeZone('UTC')))->format(DATE_ATOM);
    } catch (Throwable) {
        return '';
    }
}

function jg_orders_local_date_from_utc(?DateTimeImmutable $date): ?string
{
    return $date instanceof DateTimeImmutable
        ? $date->setTimezone(new DateTimeZone('Asia/Jakarta'))->format('Y-m-d')
        : null;
}

function jg_orders_webhook_rows(array $payload): array
{
    $candidates = [];
    foreach (['orders', 'rows', 'order_rows', 'items'] as $key) {
        $value = $payload[$key] ?? null;
        if (is_array($value) && jg_orders_is_list_array($value)) {
            foreach ($value as $item) {
                if (is_array($item)) {
                    $candidates[] = $item;
                }
            }
        }
    }

    if (isset($payload['data']) && is_array($payload['data'])) {
        $data = $payload['data'];
        if (jg_orders_is_list_array($data)) {
            foreach ($data as $item) {
                if (is_array($item)) {
                    $candidates[] = $item;
                }
            }
        } else {
            foreach (['orders', 'rows', 'order_rows'] as $key) {
                if (isset($data[$key]) && is_array($data[$key]) && jg_orders_is_list_array($data[$key])) {
                    foreach ($data[$key] as $item) {
                        if (is_array($item)) {
                            $candidates[] = $item;
                        }
                    }
                }
            }
            if ($candidates === []) {
                $candidates[] = $data;
            }
        }
    }

    if ($candidates === [] && (isset($payload['order_id']) || isset($payload['id']) || isset($payload['order_sn']))) {
        $candidates[] = $payload;
    }

    $rows = [];
    foreach ($candidates as $candidate) {
        foreach (jg_orders_flatten_webhook_order($candidate, $payload) as $row) {
            $normalized = jg_orders_normalize_mirror_row($row, $payload);
            if ($normalized !== null) {
                $rows[] = $normalized;
            }
        }
    }

    return $rows;
}

function jg_orders_flatten_webhook_order(array $order, array $payload): array
{
    $items = isset($order['items']) && is_array($order['items']) && jg_orders_is_list_array($order['items'])
        ? $order['items']
        : [];
    if ($items === []) {
        return [$order];
    }

    $rows = [];
    $totalQuantity = 0;
    foreach ($items as $item) {
        if (is_array($item)) {
            $physicalQuantity = max(0, jg_orders_int(jg_orders_pick($item, ['cogs_quantity', 'stock_quantity', 'physical_quantity', 'quantity', 'qty', 'model_quantity', 'amount'], 0)));
            $totalQuantity += jg_orders_is_free_gift($item) ? 0 : $physicalQuantity;
        }
    }
    $orderNetRevenue = jg_orders_float(jg_orders_pick(
        $order,
        ['order_net_revenue', 'net_revenue', 'revenue', 'seller_revenue', 'settlement_amount'],
        0
    ));

    foreach ($items as $index => $item) {
        if (!is_array($item)) {
            continue;
        }
        $physicalQuantity = max(0, jg_orders_int(jg_orders_pick($item, ['cogs_quantity', 'stock_quantity', 'physical_quantity', 'quantity', 'qty', 'model_quantity', 'amount'], 0)));
        $isFreeGift = jg_orders_is_free_gift($item);
        $quantity = $isFreeGift ? 0 : max(0, jg_orders_int(jg_orders_pick($item, ['quantity', 'qty', 'model_quantity', 'amount'], 0)));
        $itemRevenue = jg_orders_pick($item, ['revenue', 'net_revenue', 'seller_revenue', 'settlement_amount'], null);
        if ($isFreeGift) {
            $itemRevenue = 0;
        }
        if (($itemRevenue === null || $itemRevenue === '') && $orderNetRevenue > 0 && $totalQuantity > 0) {
            $itemRevenue = $orderNetRevenue * ($quantity / $totalQuantity);
        }
        $rows[] = array_merge($order, [
            'item_key' => jg_orders_pick($item, ['item_key', 'order_item_key', 'line_item_id', 'model_id', 'id', 'sku_id'], $index),
            'sku' => jg_orders_pick($item, ['sku', 'seller_sku', 'model_sku', 'item_sku', 'sku_code'], jg_orders_pick($order, ['sku'], '')),
            'quantity' => $quantity,
            'cogs_quantity' => $physicalQuantity,
            'is_free_gift' => $isFreeGift,
            'revenue' => $itemRevenue,
            'product_name' => jg_orders_pick($item, ['product_name', 'item_name', 'name', 'title'], jg_orders_pick($order, ['product_name', 'item_name', 'name'], '')),
            'flavor' => jg_orders_pick($item, ['flavor', 'flavor_name', 'variant_name', 'option_name'], jg_orders_pick($order, ['flavor'], '')),
            '_webhook_item_raw' => $item,
        ]);
    }

    return $rows;
}

function jg_orders_normalize_mirror_row(array $row, array $payload): ?array
{
    $financials = isset($row['financials']) && is_array($row['financials']) ? $row['financials'] : [];
    $customer = isset($row['customer']) && is_array($row['customer']) ? $row['customer'] : [];
    $platform = strtolower(trim((string) jg_orders_pick($row, ['platform', 'source_platform', 'marketplace'], $payload['platform'] ?? '')));
    $accountKey = trim((string) jg_orders_pick($row, ['account_key', 'sourceAccountKey', 'source_account', 'account', 'shop_id'], ''));
    $orderId = trim((string) jg_orders_pick($row, ['order_id', 'id', 'order_sn', 'orderId'], ''));
    $itemKey = trim((string) jg_orders_pick($row, ['item_key', 'order_item_key', 'item_row_id', 'line_item_id'], ''));
    $sku = trim((string) jg_orders_pick($row, ['sku', 'marketplace_sku', 'seller_sku', 'item_sku'], ''));
    $productName = trim((string) jg_orders_pick($row, ['product_name', 'item_name', 'name', 'title'], ''));

    if ($platform === '' && $orderId === '' && $itemKey === '' && $sku === '' && $productName === '') {
        return null;
    }

    if ($itemKey === '') {
        $itemKey = $sku !== '' ? $sku : substr(hash('sha256', json_encode($row, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: serialize($row)), 0, 40);
    }

    $timestamp = jg_orders_order_datetime(jg_orders_pick($row, [
        'order_create_time',
        'timestamp',
        'createdAt',
        'created_at',
        'create_time',
        'paid_at',
    ], null));
    $sourceUpdatedAt = jg_orders_order_datetime(jg_orders_pick($row, [
        'updated_at',
        'source_updated_at',
        'update_time',
        'modified_at',
    ], null));
    if (!$timestamp instanceof DateTimeImmutable) {
        $timestamp = $sourceUpdatedAt instanceof DateTimeImmutable
            ? $sourceUpdatedAt
            : new DateTimeImmutable('now', new DateTimeZone('UTC'));
    }

    $isFreeGift = jg_orders_is_free_gift($row);
    $physicalQuantity = jg_orders_stock_quantity($row);
    $saleQuantity = $isFreeGift ? 0 : jg_orders_int(jg_orders_pick($row, ['quantity', 'item_count', 'qty'], 0));
    $netRevenue = $isFreeGift ? 0.0 : jg_orders_float(jg_orders_pick($row, ['revenue', 'net_revenue', 'sales', 'seller_revenue', 'settlement_amount'], jg_orders_pick($financials, ['netRevenue', 'net_revenue'], 0)));
    $orderNetRevenue = jg_orders_float(jg_orders_pick($row, ['order_net_revenue', 'net_revenue', 'revenue'], jg_orders_pick($financials, ['netRevenue', 'net_revenue'], $netRevenue)));
    $grossRevenue = jg_orders_float(jg_orders_pick($row, ['gross_revenue', 'order_gross_revenue', 'customer_paid'], jg_orders_pick($financials, ['grossRevenue', 'totalAmount'], $orderNetRevenue)));
    $marketplaceFees = jg_orders_float(jg_orders_pick($row, ['order_marketplace_fees', 'marketplace_fees', 'fees'], jg_orders_pick($financials, ['marketplaceFees', 'fees'], max(0, $grossRevenue - $orderNetRevenue))));
    $status = strtoupper(trim((string) jg_orders_pick($row, ['status', 'order_status'], '')));
    $fundsReleased = jg_orders_bool(jg_orders_pick($row, ['funds_released', 'fundsReleased'], false));
    $fundsReleasedAt = jg_orders_order_datetime(jg_orders_pick($row, ['funds_released_at', 'fundsReleasedAt'], null));
    $fundsReleasedAmount = jg_orders_float(jg_orders_pick($row, ['funds_released_amount', 'fundsReleasedAmount'], $fundsReleased ? $orderNetRevenue : 0));
    $fundsReleaseStatus = substr(trim((string) jg_orders_pick($row, ['funds_release_status', 'fundsReleaseStatus'], '')), 0, 80);
    $fundsReleaseSource = substr(trim((string) jg_orders_pick($row, ['funds_release_source', 'fundsReleaseSource'], '')), 0, 220);
    if ($fundsReleased && !jg_orders_release_marker_trusted($platform, $status, $fundsReleaseStatus, $fundsReleaseSource)) {
        $fundsReleased = false;
        $fundsReleasedAt = null;
        $fundsReleasedAmount = 0;
    }
    if ($fundsReleased && !$fundsReleasedAt instanceof DateTimeImmutable) {
        $fundsReleasedAt = $sourceUpdatedAt instanceof DateTimeImmutable ? $sourceUpdatedAt : $timestamp;
    }
    $cogs = jg_orders_float(jg_orders_pick($row, ['cogs', 'total_cogs'], 0));
    $grossProfit = $isFreeGift
        ? -$cogs
        : jg_orders_float(jg_orders_pick($row, ['gross_profit'], $netRevenue - $cogs));
    $sourceEvent = substr(trim((string) ($payload['event'] ?? $payload['event_type'] ?? $payload['type'] ?? 'webhook')), 0, 80);
    $deleted = jg_orders_bool($row['deleted'] ?? $row['_deleted'] ?? false)
        || in_array($status, ['DELETED', 'REMOVED'], true)
        || in_array(strtolower($sourceEvent), ['order_deleted', 'orders_deleted', 'delete'], true);
    $rawJson = json_encode($row, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    return [
        'order_item_hash' => hash('sha256', implode("\x1f", [$platform, $accountKey, $orderId, $itemKey, $sku, $productName])),
        'platform' => substr($platform, 0, 40),
        'account_key' => substr($accountKey, 0, 120),
        'order_id' => substr($orderId, 0, 160),
        'item_key' => substr($itemKey, 0, 220),
        'sku' => substr($sku, 0, 80),
        'status' => substr($status, 0, 80),
        'order_create_time' => jg_orders_sql_datetime($timestamp),
        'order_create_date' => jg_orders_local_date_from_utc($timestamp),
        'timestamp_utc' => jg_orders_sql_datetime($timestamp),
        'company' => substr((string) jg_orders_pick($row, ['company', 'brand', 'brand_name'], ''), 0, 160),
        'brand_name' => substr((string) jg_orders_pick($row, ['brand_name', 'brand'], ''), 0, 160),
        'product_name' => substr($productName, 0, 255),
        'marketplace_product_name' => substr((string) jg_orders_pick($row, ['marketplace_product_name', 'product_name', 'item_name', 'name'], $productName), 0, 255),
        'base_product_name' => substr((string) jg_orders_pick($row, ['base_product_name'], ''), 0, 255),
        'flavor_name' => substr((string) jg_orders_pick($row, ['flavor_name'], ''), 0, 160),
        'product_type' => substr((string) jg_orders_pick($row, ['product_type', 'category'], ''), 0, 160),
        'flavor' => substr((string) jg_orders_pick($row, ['flavor', 'variant_name', 'option_name'], ''), 0, 160),
        'quantity' => $saleQuantity,
        'cogs_quantity' => $physicalQuantity,
        'is_free_gift' => $isFreeGift ? 1 : 0,
        'revenue' => $netRevenue,
        'order_net_revenue' => $orderNetRevenue,
        'gross_revenue' => $isFreeGift ? 0 : $grossRevenue,
        'marketplace_fees' => $isFreeGift ? 0 : $marketplaceFees,
        'funds_released' => $fundsReleased ? 1 : 0,
        'funds_released_at' => jg_orders_sql_datetime($fundsReleasedAt),
        'funds_released_amount' => $fundsReleased ? $fundsReleasedAmount : 0,
        'funds_release_status' => $fundsReleaseStatus,
        'funds_release_source' => $fundsReleaseSource,
        'cogs' => $cogs,
        'gross_profit' => $grossProfit,
        'username' => substr((string) jg_orders_pick($row, ['username', 'buyer_username', 'customer_name'], $customer['name'] ?? ''), 0, 255),
        'address' => (string) jg_orders_pick($row, ['address', 'customer_address', 'shipping_address'], $customer['address'] ?? ''),
        'phone' => substr((string) jg_orders_pick($row, ['phone', 'customer_phone', 'buyer_phone'], $customer['phone'] ?? ''), 0, 80),
        'source_event' => $sourceEvent,
        'source_updated_at' => jg_orders_sql_datetime($sourceUpdatedAt),
        'raw_json' => is_string($rawJson) ? $rawJson : '{}',
        'deleted_at' => $deleted ? gmdate('Y-m-d H:i:s.u') : null,
    ];
}

function jg_orders_upsert_mirror_rows(PDO $pdo, array $rows, array $payload): array
{
    $now = gmdate('Y-m-d H:i:s.u');
    $stmt = $pdo->prepare(
        'INSERT INTO dashboard_order_mirror
            (order_item_hash, platform, account_key, order_id, item_key, sku, status,
             order_create_time, order_create_date, timestamp_utc, company, brand_name,
             product_name, marketplace_product_name, base_product_name, flavor_name,
             product_type, flavor, quantity, cogs_quantity, is_free_gift, revenue, order_net_revenue, gross_revenue,
             marketplace_fees, funds_released, funds_released_at, funds_released_amount,
             funds_release_status, funds_release_source, cogs, gross_profit, username, address, phone,
             source_event, source_updated_at, raw_json, mirrored_at, deleted_at)
         VALUES
            (:order_item_hash, :platform, :account_key, :order_id, :item_key, :sku, :status,
             :order_create_time, :order_create_date, :timestamp_utc, :company, :brand_name,
             :product_name, :marketplace_product_name, :base_product_name, :flavor_name,
             :product_type, :flavor, :quantity, :cogs_quantity, :is_free_gift, :revenue, :order_net_revenue, :gross_revenue,
             :marketplace_fees, :funds_released, :funds_released_at, :funds_released_amount,
             :funds_release_status, :funds_release_source, :cogs, :gross_profit, :username, :address, :phone,
             :source_event, :source_updated_at, :raw_json, :mirrored_at, :deleted_at)
         ON DUPLICATE KEY UPDATE
             platform = VALUES(platform),
             account_key = VALUES(account_key),
             order_id = VALUES(order_id),
             item_key = VALUES(item_key),
             sku = VALUES(sku),
             status = VALUES(status),
             order_create_time = VALUES(order_create_time),
             order_create_date = VALUES(order_create_date),
             timestamp_utc = VALUES(timestamp_utc),
             company = VALUES(company),
             brand_name = VALUES(brand_name),
             product_name = VALUES(product_name),
             marketplace_product_name = VALUES(marketplace_product_name),
             base_product_name = VALUES(base_product_name),
             flavor_name = VALUES(flavor_name),
             product_type = VALUES(product_type),
             flavor = VALUES(flavor),
             quantity = VALUES(quantity),
             cogs_quantity = VALUES(cogs_quantity),
             is_free_gift = VALUES(is_free_gift),
             revenue = VALUES(revenue),
             order_net_revenue = VALUES(order_net_revenue),
             gross_revenue = VALUES(gross_revenue),
             marketplace_fees = VALUES(marketplace_fees),
             funds_released = IF(funds_released = 1 AND VALUES(funds_released) = 0, funds_released, VALUES(funds_released)),
             funds_released_at = CASE
                 WHEN funds_released = 0 AND VALUES(funds_released) = 1
                     THEN COALESCE(VALUES(funds_released_at), VALUES(source_updated_at), VALUES(mirrored_at), UTC_TIMESTAMP(6))
                 ELSE COALESCE(VALUES(funds_released_at), funds_released_at)
             END,
             funds_released_amount = IF(VALUES(funds_released_amount) > 0 OR funds_released_amount <= 0, VALUES(funds_released_amount), funds_released_amount),
             funds_release_status = IF(VALUES(funds_release_status) <> "", VALUES(funds_release_status), funds_release_status),
             funds_release_source = IF(VALUES(funds_release_source) <> "", VALUES(funds_release_source), funds_release_source),
             cogs = VALUES(cogs),
             gross_profit = VALUES(gross_profit),
             username = VALUES(username),
             address = VALUES(address),
             phone = VALUES(phone),
             source_event = VALUES(source_event),
             source_updated_at = VALUES(source_updated_at),
             raw_json = VALUES(raw_json),
             mirrored_at = VALUES(mirrored_at),
             deleted_at = VALUES(deleted_at)'
    );

    $upserted = 0;
    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }
        $params = $row;
        $params['mirrored_at'] = $now;
        foreach (['revenue', 'order_net_revenue', 'gross_revenue', 'marketplace_fees', 'funds_released_amount', 'cogs', 'gross_profit'] as $key) {
            $params[$key] = number_format((float) ($params[$key] ?? 0), 2, '.', '');
        }
        $stmt->execute($params);
        $upserted += 1;
    }

    return [
        'upserted' => $upserted,
        'source_event' => (string) ($payload['event'] ?? $payload['event_type'] ?? $payload['type'] ?? 'webhook'),
        'status' => jg_orders_mirror_status($pdo),
    ];
}

function jg_orders_range_bounds(string $startDate, string $endDate): array
{
    $timezone = new DateTimeZone('Asia/Jakarta');
    $from = (new DateTimeImmutable($startDate . ' 00:00:00', $timezone))->setTimezone(new DateTimeZone('UTC'));
    $to = (new DateTimeImmutable($endDate . ' 00:00:00', $timezone))->modify('+1 day')->setTimezone(new DateTimeZone('UTC'));
    return [$from->format('Y-m-d H:i:s.u'), $to->format('Y-m-d H:i:s.u')];
}

function jg_orders_mirror_payload(PDO $pdo, string $startDate, string $endDate, ?int $limit = null, int $offset = 0, bool $forceRepair = false, ?string $mirroredAfter = null): array
{
    [$from, $to] = jg_orders_range_bounds($startDate, $endDate);
    $pageLimit = $limit !== null ? $limit + 1 : null;
    $sql = 'SELECT *
            FROM dashboard_order_mirror
            WHERE deleted_at IS NULL
              AND order_create_time >= :from_date
              AND order_create_time < :to_date';
    $params = [
        ':from_date' => $from,
        ':to_date' => $to,
    ];
    if ($mirroredAfter !== null) {
        $sql .= ' AND mirrored_at >= :mirrored_after';
        $params[':mirrored_after'] = $mirroredAfter;
    }
    $sql .= ' ORDER BY order_create_time DESC, id DESC';
    if ($pageLimit !== null) {
        $sql .= ' LIMIT ' . (int) $pageLimit . ' OFFSET ' . max(0, $offset);
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    $hasMore = false;
    if ($limit !== null && count($rows) > $limit) {
        $hasMore = true;
        $rows = array_slice($rows, 0, $limit);
    }
    $repair = ['attempted' => false, 'fetched' => 0, 'upserted' => 0];
    if ($mirroredAfter === null && $offset === 0 && ($forceRepair || $rows === [])) {
        $repair = jg_orders_repair_mirror_range_from_api($pdo, $startDate, $endDate, $limit);
        if ((int) ($repair['upserted'] ?? 0) > 0) {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();
            $hasMore = false;
            if ($limit !== null && count($rows) > $limit) {
                $hasMore = true;
                $rows = array_slice($rows, 0, $limit);
            }
        }
    }

    $payload = [
        'orders' => array_map('jg_orders_mirror_response_row', $rows),
        'has_more' => $hasMore,
        'next_offset' => $hasMore ? $offset + $limit : null,
        'source' => 'dashboard_order_mirror',
    ];
    if (!empty($repair['attempted'])) {
        $payload['mirror_repair'] = $repair;
    }

    return $payload;
}

function jg_orders_daily_normalize_key(string $value): string
{
    $normalized = strtolower(trim($value));
    $normalized = preg_replace('/[^a-z0-9]+/', '-', $normalized) ?? '';
    return trim($normalized, '-') ?: 'unknown';
}

function jg_orders_daily_title(string $value): string
{
    $label = trim(str_replace(['_', '-'], ' ', $value));
    return $label === '' ? 'Unknown' : ucwords(strtolower($label));
}

function jg_orders_daily_account_key(string $platform, string $accountKey): string
{
    $platformKey = jg_orders_daily_normalize_key($platform);
    $account = trim($accountKey);
    $accountKeyNormalized = $account !== '' ? jg_orders_daily_normalize_key($account) : $platformKey;
    return $platformKey . ':' . $accountKeyNormalized;
}

function jg_orders_daily_account_payload(string $platform, string $accountKey): array
{
    $platform = trim($platform) !== '' ? trim($platform) : 'unknown';
    $accountKey = trim($accountKey);
    $key = jg_orders_daily_account_key($platform, $accountKey);
    $platformLabel = defined('JG_WEBSITE_PLATFORMS') && isset(JG_WEBSITE_PLATFORMS[$platform])
        ? (string) JG_WEBSITE_PLATFORMS[$platform]
        : jg_orders_daily_title($platform);
    $accountLabel = $accountKey !== '' && jg_orders_daily_normalize_key($accountKey) !== jg_orders_daily_normalize_key($platform)
        ? $accountKey
        : '';

    return [
        'key' => $key,
        'platform' => $platform,
        'platform_label' => $platformLabel,
        'account_key' => $accountKey,
        'account' => $accountLabel,
        'label' => $accountLabel !== '' ? $platformLabel . ' / ' . $accountLabel : $platformLabel,
        'qty' => 0,
        'revenue' => 0,
        'orders' => 0,
        'days_active' => 0,
    ];
}

function jg_orders_daily_add_summary_row(
    array &$days,
    array &$accounts,
    string $date,
    string $platform,
    string $accountKey,
    int $qty,
    float $revenue,
    int $orders
): void {
    if (!isset($days[$date])) {
        return;
    }

    $account = jg_orders_daily_account_payload($platform, $accountKey);
    $key = (string) $account['key'];
    if (!isset($accounts[$key])) {
        $accounts[$key] = $account;
    }
    if (!isset($days[$date]['accounts'][$key])) {
        $days[$date]['accounts'][$key] = $account;
    }

    $qty = max(0, $qty);
    $revenue = max(0, $revenue);
    $orders = max(0, $orders);

    $days[$date]['qty'] += $qty;
    $days[$date]['revenue'] += $revenue;
    $days[$date]['orders'] += $orders;
    $days[$date]['accounts'][$key]['qty'] += $qty;
    $days[$date]['accounts'][$key]['revenue'] += $revenue;
    $days[$date]['accounts'][$key]['orders'] += $orders;
    $accounts[$key]['qty'] += $qty;
    $accounts[$key]['revenue'] += $revenue;
    $accounts[$key]['orders'] += $orders;
    if ($qty > 0 || $revenue > 0 || $orders > 0) {
        $accounts[$key]['days_active'] += 1;
    }
}

function jg_orders_daily_summary_payload(PDO $pdo, string $startDate, string $endDate, bool $forceRepair = false): array
{
    $repair = ['attempted' => false, 'fetched' => 0, 'upserted' => 0];
    if ($forceRepair) {
        $repair = jg_orders_repair_mirror_range_from_api($pdo, $startDate, $endDate, null);
    }

    $timezone = new DateTimeZone('Asia/Jakarta');
    $start = new DateTimeImmutable($startDate . ' 00:00:00', $timezone);
    $end = new DateTimeImmutable($endDate . ' 00:00:00', $timezone);
    if ($end < $start) {
        $end = $start;
    }

    $days = [];
    for ($day = $start; $day <= $end; $day = $day->modify('+1 day')) {
        $dateKey = $day->format('Y-m-d');
        $days[$dateKey] = [
            'date' => $dateKey,
            'qty' => 0,
            'revenue' => 0,
            'orders' => 0,
            'accounts' => [],
        ];
    }

    $accounts = [];
    [$from, $to] = jg_orders_range_bounds($startDate, $endDate);
    $freeGiftSql = jg_orders_free_gift_sql('dashboard_order_mirror');
    $stmt = $pdo->prepare(
        'SELECT daily_date, platform, account_key,
                COUNT(*) AS orders,
                COALESCE(SUM(order_qty), 0) AS qty,
                COALESCE(SUM(order_revenue), 0) AS revenue
         FROM (
             SELECT COALESCE(NULLIF(CAST(order_create_date AS CHAR), ""), DATE(DATE_ADD(order_create_time, INTERVAL 7 HOUR))) AS daily_date,
                    platform,
                    account_key,
                    CASE WHEN order_id <> "" THEN order_id ELSE order_item_hash END AS daily_order_key,
                    SUM(CASE WHEN ' . $freeGiftSql . ' THEN 0 ELSE quantity END) AS order_qty,
                    CASE
                        WHEN MAX(order_net_revenue) <> 0 THEN MAX(order_net_revenue)
                        ELSE SUM(revenue)
                    END AS order_revenue
             FROM dashboard_order_mirror
             WHERE deleted_at IS NULL
               AND order_create_time >= :from_date
               AND order_create_time < :to_date
             GROUP BY daily_date, platform, account_key, daily_order_key
         ) order_rollup
         GROUP BY daily_date, platform, account_key
         ORDER BY daily_date, platform, account_key'
    );
    $stmt->execute([
        ':from_date' => $from,
        ':to_date' => $to,
    ]);
    foreach ($stmt->fetchAll() as $row) {
        jg_orders_daily_add_summary_row(
            $days,
            $accounts,
            (string) ($row['daily_date'] ?? ''),
            (string) ($row['platform'] ?? ''),
            (string) ($row['account_key'] ?? ''),
            (int) ($row['qty'] ?? 0),
            (float) ($row['revenue'] ?? 0),
            (int) ($row['orders'] ?? 0)
        );
    }

    $websiteRows = [];
    try {
        $websiteRows = jg_orders_lightweight_rows(jg_website_paid_order_rows($pdo, $startDate, $endDate));
    } catch (Throwable $websiteOrdersError) {
        error_log('Website paid orders unavailable in daily summary: ' . $websiteOrdersError->getMessage());
    }
    foreach ($websiteRows as $row) {
        if (!is_array($row)) {
            continue;
        }
        $date = jg_orders_local_date_from_utc(jg_orders_order_datetime($row['order_create_time'] ?? $row['timestamp'] ?? null));
        if ($date === null) {
            continue;
        }
        jg_orders_daily_add_summary_row(
            $days,
            $accounts,
            $date,
            (string) ($row['platform'] ?? ''),
            (string) ($row['account_key'] ?? ''),
            (int) ($row['quantity'] ?? $row['item_count'] ?? 0),
            (float) ($row['revenue'] ?? $row['net_revenue'] ?? 0),
            1
        );
    }

    uasort($accounts, static function (array $left, array $right): int {
        return strcmp((string) ($left['platform_label'] ?? $left['platform'] ?? ''), (string) ($right['platform_label'] ?? $right['platform'] ?? ''))
            ?: strcmp((string) ($left['label'] ?? ''), (string) ($right['label'] ?? ''));
    });

    $dayCount = max(1, count($days));
    $accountCount = max(1, count($accounts));
    $totalQty = 0;
    $totalRevenue = 0.0;
    $totalOrders = 0;
    $activeDayCount = 0;
    $topDay = null;
    foreach ($days as &$day) {
        $day['qty'] = (int) $day['qty'];
        $day['revenue'] = (int) round((float) $day['revenue']);
        $day['orders'] = (int) $day['orders'];
        $day['avg_qty'] = $day['qty'] / $accountCount;
        $day['avg_revenue'] = $day['revenue'] / $accountCount;
        $day['accounts'] = array_values(array_map(static function (array $account): array {
            $account['qty'] = (int) $account['qty'];
            $account['revenue'] = (int) round((float) $account['revenue']);
            $account['orders'] = (int) $account['orders'];
            return $account;
        }, $day['accounts']));
        $totalQty += $day['qty'];
        $totalRevenue += $day['revenue'];
        $totalOrders += $day['orders'];
        if ($day['qty'] > 0 || $day['revenue'] > 0 || $day['orders'] > 0) {
            $activeDayCount += 1;
        }
        if ($topDay === null || $day['revenue'] > $topDay['revenue'] || ($day['revenue'] === $topDay['revenue'] && $day['qty'] > $topDay['qty'])) {
            $topDay = [
                'date' => (string) $day['date'],
                'qty' => (int) $day['qty'],
                'revenue' => (int) $day['revenue'],
                'orders' => (int) $day['orders'],
            ];
        }
    }
    unset($day);

    $accountRows = array_values(array_map(static function (array $account) use ($dayCount): array {
        $account['qty'] = (int) $account['qty'];
        $account['revenue'] = (int) round((float) $account['revenue']);
        $account['orders'] = (int) $account['orders'];
        $account['avg_qty'] = $account['qty'] / $dayCount;
        $account['avg_revenue'] = $account['revenue'] / $dayCount;
        return $account;
    }, $accounts));

    $mirrorSummary = jg_orders_mirror_range_summary_raw($pdo, $startDate, $endDate);

    $response = [
        'ok' => true,
        'source' => 'dashboard_order_mirror_daily_summary',
        'start_date' => $startDate,
        'end_date' => $endDate,
        'month' => substr($startDate, 0, 7),
        'day_count' => $dayCount,
        'rows_count' => (int) ($mirrorSummary['rows'] ?? 0) + count($websiteRows),
        'distinct_orders' => (int) ($mirrorSummary['distinct_orders'] ?? 0) + count($websiteRows),
        'accounts' => $accountRows,
        'days' => array_values($days),
        'totals' => [
            'qty' => $totalQty,
            'revenue' => (int) round($totalRevenue),
            'orders' => $totalOrders,
            'avg_qty' => $totalQty / $dayCount,
            'avg_revenue' => $totalRevenue / $dayCount,
            'account_count' => count($accountRows),
            'active_day_count' => $activeDayCount,
            'top_day' => $topDay,
        ],
        'mirror' => jg_orders_public_mirror_range_summary($mirrorSummary),
        'generated_at' => gmdate(DATE_ATOM),
    ];
    if (!empty($repair['attempted'])) {
        $response['mirror_repair'] = $repair;
    }

    return $response;
}

function jg_orders_location_geocoder_version(): int
{
    return 3;
}

function jg_orders_location_summary_payload(PDO $pdo, string $startDate, string $endDate, bool $forceRefresh = false): array
{
    $summary = jg_orders_mirror_range_summary_raw($pdo, $startDate, $endDate);
    $rangeKey = $startDate . ':' . $endDate;
    $version = jg_orders_location_geocoder_version();

    if (!$forceRefresh) {
        $cached = jg_orders_read_location_cache($pdo, $rangeKey, $version, $summary);
        if ($cached !== null) {
            $cached['cached'] = true;
            return [
                'ok' => true,
                'source' => 'dashboard_order_mirror_location_cache',
                'start_date' => $startDate,
                'end_date' => $endDate,
                'geocoder_version' => $version,
                'mirror' => jg_orders_public_mirror_range_summary($summary),
                'aggregate' => $cached,
            ];
        }
    }

    [$from, $to] = jg_orders_range_bounds($startDate, $endDate);
    $stmt = $pdo->prepare(
        'SELECT platform, account_key, order_id, order_item_hash, address, raw_json, mirrored_at
         FROM dashboard_order_mirror
         WHERE deleted_at IS NULL
           AND order_create_time >= :from_date
           AND order_create_time < :to_date
         ORDER BY order_create_time DESC, id DESC'
    );
    $stmt->execute([
        ':from_date' => $from,
        ':to_date' => $to,
    ]);

    $seen = [];
    $provinceCounts = [];
    $totalOrders = 0;
    $unmatchedOrders = 0;
    foreach ($stmt->fetchAll() as $row) {
        $key = jg_orders_location_order_key($row);
        if ($key === '' || isset($seen[$key])) {
            continue;
        }
        $seen[$key] = true;
        $totalOrders += 1;
        $province = jg_orders_location_province_from_row($row);
        if ($province === '') {
            $unmatchedOrders += 1;
            continue;
        }
        $provinceCounts[$province] = ($provinceCounts[$province] ?? 0) + 1;
    }

    $aggregate = jg_orders_location_aggregate_payload($provinceCounts, $totalOrders, $unmatchedOrders, $summary);
    jg_orders_write_location_cache($pdo, $rangeKey, $version, $startDate, $endDate, $summary, $aggregate);
    $aggregate['cached'] = false;

    return [
        'ok' => true,
        'source' => 'dashboard_order_mirror_location_aggregate',
        'start_date' => $startDate,
        'end_date' => $endDate,
        'geocoder_version' => $version,
        'mirror' => jg_orders_public_mirror_range_summary($summary),
        'aggregate' => $aggregate,
    ];
}

function jg_orders_location_aggregate_payload(array $provinceCounts, int $totalOrders, int $unmatchedOrders, array $summary): array
{
    ksort($provinceCounts);
    $rows = [];
    foreach ($provinceCounts as $province => $orders) {
        $count = max(0, (int) $orders);
        if ($province !== '' && $count > 0) {
            $rows[] = ['province' => $province, 'orders' => $count];
        }
    }
    usort($rows, static fn (array $left, array $right): int => ((int) $right['orders'] <=> (int) $left['orders']) ?: strcmp((string) $left['province'], (string) $right['province']));
    $maxOrders = 0;
    foreach ($rows as $row) {
        $maxOrders = max($maxOrders, (int) ($row['orders'] ?? 0));
    }
    $matchedOrders = max(0, $totalOrders - $unmatchedOrders);
    $aggregate = [
        'totalOrders' => max(0, $totalOrders),
        'matchedOrders' => $matchedOrders,
        'unmatchedOrders' => max(0, $unmatchedOrders),
        'maxOrders' => $maxOrders,
        'provinceCounts' => $provinceCounts,
        'rows' => $rows,
        'mirroredAfter' => jg_orders_atom_datetime((string) ($summary['last_mirrored_at_sql'] ?? '')),
        'generatedAt' => gmdate(DATE_ATOM),
    ];
    $aggregate['signature'] = sha1(json_encode([
        $aggregate['totalOrders'],
        $aggregate['unmatchedOrders'],
        $aggregate['maxOrders'],
        $aggregate['rows'],
        $aggregate['mirroredAfter'],
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '');

    return $aggregate;
}

function jg_orders_read_location_cache(PDO $pdo, string $rangeKey, int $version, array $summary): ?array
{
    $stmt = $pdo->prepare(
        'SELECT mirror_rows, mirror_distinct_orders, mirror_last_mirrored_at, aggregate_json
         FROM dashboard_order_location_cache
         WHERE range_key = :range_key
           AND geocoder_version = :geocoder_version
         LIMIT 1'
    );
    $stmt->execute([
        ':range_key' => $rangeKey,
        ':geocoder_version' => $version,
    ]);
    $row = $stmt->fetch();
    if (!is_array($row)) {
        return null;
    }
    $cachedLast = (string) ($row['mirror_last_mirrored_at'] ?? '');
    $summaryLast = (string) ($summary['last_mirrored_at_sql'] ?? '');
    if (
        (int) ($row['mirror_rows'] ?? -1) !== (int) ($summary['rows'] ?? 0) ||
        (int) ($row['mirror_distinct_orders'] ?? -1) !== (int) ($summary['distinct_orders'] ?? 0) ||
        $cachedLast !== $summaryLast
    ) {
        return null;
    }
    $decoded = json_decode((string) ($row['aggregate_json'] ?? ''), true);
    return is_array($decoded) ? $decoded : null;
}

function jg_orders_write_location_cache(PDO $pdo, string $rangeKey, int $version, string $startDate, string $endDate, array $summary, array $aggregate): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO dashboard_order_location_cache
            (range_key, geocoder_version, start_date, end_date, mirror_rows, mirror_distinct_orders,
             mirror_last_mirrored_at, aggregate_json, generated_at)
         VALUES
            (:range_key, :geocoder_version, :start_date, :end_date, :mirror_rows, :mirror_distinct_orders,
             :mirror_last_mirrored_at, :aggregate_json, :generated_at)
         ON DUPLICATE KEY UPDATE
             start_date = VALUES(start_date),
             end_date = VALUES(end_date),
             mirror_rows = VALUES(mirror_rows),
             mirror_distinct_orders = VALUES(mirror_distinct_orders),
             mirror_last_mirrored_at = VALUES(mirror_last_mirrored_at),
             aggregate_json = VALUES(aggregate_json),
             generated_at = VALUES(generated_at)'
    );
    $stmt->execute([
        ':range_key' => $rangeKey,
        ':geocoder_version' => $version,
        ':start_date' => $startDate,
        ':end_date' => $endDate,
        ':mirror_rows' => (int) ($summary['rows'] ?? 0),
        ':mirror_distinct_orders' => (int) ($summary['distinct_orders'] ?? 0),
        ':mirror_last_mirrored_at' => ($summary['last_mirrored_at_sql'] ?? '') !== '' ? (string) $summary['last_mirrored_at_sql'] : null,
        ':aggregate_json' => json_encode($aggregate, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}',
        ':generated_at' => gmdate('Y-m-d H:i:s.u'),
    ]);
}

function jg_orders_location_order_key(array $row): string
{
    $orderId = trim((string) ($row['order_id'] ?? ''));
    if ($orderId !== '') {
        return strtolower(trim((string) ($row['platform'] ?? 'unknown'))) . '|'
            . strtolower(trim((string) ($row['account_key'] ?? ''))) . '|'
            . $orderId;
    }

    return trim((string) ($row['order_item_hash'] ?? ''));
}

function jg_orders_location_province_from_row(array $row): string
{
    $fragments = [];
    $address = trim((string) ($row['address'] ?? ''));
    if ($address !== '') {
        $fragments[] = $address;
    }
    $raw = json_decode((string) ($row['raw_json'] ?? ''), true);
    if (is_array($raw)) {
        jg_orders_location_collect_fragments($raw, '', $fragments);
    }

    return jg_orders_location_province_from_text(implode(' ', array_slice(array_unique($fragments), 0, 80)));
}

function jg_orders_location_collect_fragments(mixed $value, string $key, array &$fragments, int $depth = 0): void
{
    if ($depth > 5 || count($fragments) >= 80) {
        return;
    }
    if (is_scalar($value)) {
        if (jg_orders_location_key_matches($key)) {
            $text = trim((string) $value);
            if ($text !== '') {
                $fragments[] = $text;
            }
        }
        return;
    }
    if (!is_array($value)) {
        return;
    }
    foreach ($value as $childKey => $childValue) {
        if (count($fragments) >= 80) {
            return;
        }
        jg_orders_location_collect_fragments($childValue, (string) $childKey, $fragments, $depth + 1);
    }
}

function jg_orders_location_key_matches(string $key): bool
{
    return $key !== '' && (bool) preg_match('/province|provinsi|state|region|city|district|kecamatan|kelurahan|kabupaten|regency|address|alamat|shipping/i', $key);
}

function jg_orders_location_province_from_text(string $text): string
{
    $searchable = jg_orders_location_normalize_text($text);
    if ($searchable === '') {
        return '';
    }
    foreach (jg_orders_location_alias_entries('province') as $entry) {
        if (jg_orders_location_alias_matches($searchable, (string) $entry['alias'])) {
            return (string) $entry['province'];
        }
    }
    foreach (jg_orders_location_alias_entries('locality') as $entry) {
        if (jg_orders_location_alias_matches($searchable, (string) $entry['alias'])) {
            return (string) $entry['province'];
        }
    }

    return '';
}

function jg_orders_location_alias_matches(string $text, string $alias): bool
{
    if ($text === '' || $alias === '') {
        return false;
    }
    return (bool) preg_match('/(^|\s)' . preg_quote($alias, '/') . '(?=\s|$)/', $text);
}

function jg_orders_location_normalize_text(string $value): string
{
    $text = strtolower(trim($value));
    $converted = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);
    if (is_string($converted) && $converted !== '') {
        $text = strtolower($converted);
    }
    $text = preg_replace('/[^a-z0-9]+/', ' ', $text) ?? '';
    return trim(preg_replace('/\s+/', ' ', $text) ?? '');
}

function jg_orders_location_alias_entries(string $kind): array
{
    static $cache = [];
    if (isset($cache[$kind])) {
        return $cache[$kind];
    }
    $aliases = jg_orders_location_aliases();
    $source = $kind === 'province' ? ($aliases['province'] ?? []) : ($aliases['locality'] ?? []);
    $entries = [];
    foreach ($source as $province => $provinceAliases) {
        if (!is_array($provinceAliases)) {
            continue;
        }
        foreach ($provinceAliases as $alias) {
            $normalized = jg_orders_location_normalize_text((string) $alias);
            if ($normalized === '') {
                continue;
            }
            if ($kind === 'locality') {
                $expanded = array_unique(array_filter([
                    $normalized,
                    'kota ' . $normalized,
                    'kabupaten ' . $normalized,
                    'kab ' . $normalized,
                    'kab ' . preg_replace('/^kota\s+/', '', $normalized),
                ]));
                foreach ($expanded as $entryAlias) {
                    $entries[] = ['province' => (string) $province, 'alias' => jg_orders_location_normalize_text((string) $entryAlias)];
                }
                continue;
            }
            $entries[] = ['province' => (string) $province, 'alias' => $normalized];
        }
    }
    usort($entries, static fn (array $left, array $right): int => strlen((string) $right['alias']) <=> strlen((string) $left['alias']));
    $cache[$kind] = $entries;
    return $entries;
}

function jg_orders_location_aliases(): array
{
    static $aliases = null;
    if (is_array($aliases)) {
        return $aliases;
    }

    $source = @file_get_contents(dirname(__DIR__, 2) . '/admin.js');
    $province = [];
    $locality = [];
    if (is_string($source) && $source !== '') {
        $province = jg_orders_extract_js_object_literal($source, 'INDONESIA_PROVINCE_ALIASES');
        $locality = jg_orders_extract_js_object_literal($source, 'INDONESIA_LOCALITY_ALIASES');
    }
    if ($province === []) {
        $province = [
            'DKI Jakarta' => ['jakarta', 'dki jakarta'],
            'Jawa Barat' => ['jawa barat', 'jabar'],
            'Jawa Tengah' => ['jawa tengah', 'jateng'],
            'Jawa Timur' => ['jawa timur', 'jatim'],
            'Banten' => ['banten'],
            'Bali' => ['bali'],
            'Sumatera Utara' => ['sumatera utara', 'sumut'],
            'Sumatera Barat' => ['sumatera barat', 'sumbar'],
            'Sumatera Selatan' => ['sumatera selatan', 'sumsel'],
        ];
    }
    $aliases = [
        'province' => $province,
        'locality' => is_array($locality) ? $locality : [],
    ];
    return $aliases;
}

function jg_orders_extract_js_object_literal(string $source, string $name): array
{
    $needle = 'const ' . $name . ' = ';
    $start = strpos($source, $needle);
    if ($start === false) {
        return [];
    }
    $braceStart = strpos($source, '{', $start);
    if ($braceStart === false) {
        return [];
    }
    $length = strlen($source);
    $depth = 0;
    $inString = false;
    $escaped = false;
    for ($index = $braceStart; $index < $length; $index += 1) {
        $char = $source[$index];
        if ($inString) {
            if ($escaped) {
                $escaped = false;
            } elseif ($char === '\\') {
                $escaped = true;
            } elseif ($char === "'") {
                $inString = false;
            }
            continue;
        }
        if ($char === "'") {
            $inString = true;
            continue;
        }
        if ($char === '{') {
            $depth += 1;
        } elseif ($char === '}') {
            $depth -= 1;
            if ($depth === 0) {
                $literal = substr($source, $braceStart, $index - $braceStart + 1);
                $json = preg_replace_callback(
                    "/'((?:\\\\.|[^'\\\\])*)'/",
                    static fn (array $matches): string => json_encode(stripcslashes((string) $matches[1]), JSON_UNESCAPED_UNICODE) ?: '""',
                    $literal
                );
                $decoded = is_string($json) ? json_decode($json, true) : null;
                return is_array($decoded) ? $decoded : [];
            }
        }
    }

    return [];
}

function jg_orders_import_mirror_range_from_api(
    PDO $pdo,
    string $startDate,
    string $endDate,
    int $maxRows,
    string $event,
    int $startOffset = 0,
    int $timeout = 12,
    bool $lightweight = false
): array
{
    $fetched = 0;
    $upserted = 0;
    $pages = 0;
    $offset = max(0, $startOffset);
    $hasMore = false;
    $nextOffset = null;
    $maxRows = max(1, $maxRows);

    while ($fetched < $maxRows) {
        $pageLimit = min(500, $maxRows - $fetched);
        $payload = jg_orders_fetch_json(jg_orders_remote_url('/sales/orders', [
            'start_date' => $startDate,
            'end_date' => $endDate,
            'skip_sync' => '1',
            'sync' => '0',
            'lightweight' => $lightweight ? '1' : '0',
            'limit' => (string) $pageLimit,
            'offset' => (string) $offset,
        ]), $timeout);
        $rows = is_array($payload['orders'] ?? null) ? $payload['orders'] : [];
        $pageRows = [];
        foreach ($rows as $row) {
            if (is_array($row)) {
                $pageRows[] = $row;
            }
        }

        $rowCount = count($pageRows);
        $fetched += $rowCount;
        $pages += 1;

        if ($pageRows !== []) {
            $mirrorRows = jg_orders_webhook_rows([
                'event' => $event,
                'source' => 'api_ingest',
                'rows' => $pageRows,
            ]);
            if ($mirrorRows !== []) {
                $result = jg_orders_upsert_mirror_rows($pdo, $mirrorRows, ['event' => $event]);
                $upserted += (int) ($result['upserted'] ?? 0);
            }
        }

        $nextOffset = (int) ($payload['next_offset'] ?? 0);
        $hasMore = !empty($payload['has_more']) && $nextOffset > $offset && $rowCount > 0;
        if (!$hasMore) {
            break;
        }
        $offset = $nextOffset;
    }

    return [
        'attempted' => true,
        'fetched' => $fetched,
        'upserted' => $upserted,
        'pages' => $pages,
        'offset' => $startOffset,
        'has_more' => $hasMore,
        'next_offset' => $hasMore ? $nextOffset : null,
        'truncated' => $hasMore && $fetched >= $maxRows,
    ];
}

function jg_orders_repair_mirror_range_from_api(PDO $pdo, string $startDate, string $endDate, ?int $limit): array
{
    $targetRows = $limit !== null ? min(2001, max(1, $limit + 1)) : 500;
    try {
        return jg_orders_import_mirror_range_from_api($pdo, $startDate, $endDate, $targetRows, 'mirror_read_repair');
    } catch (Throwable $error) {
        error_log('Dashboard order mirror read repair failed: ' . $error->getMessage());
        return [
            'attempted' => true,
            'fetched' => 0,
            'upserted' => 0,
            'error' => 'mirror_read_repair_failed',
        ];
    }
}

function jg_orders_mirror_response_row(array $row): array
{
    $row = jg_orders_interpret_sales_row($row);
    $timestamp = jg_orders_atom_datetime((string) ($row['timestamp_utc'] ?? $row['order_create_time'] ?? ''));
    return [
        'timestamp' => $timestamp,
        'order_create_time' => jg_orders_atom_datetime((string) ($row['order_create_time'] ?? '')) ?: $timestamp,
        'order_id' => (string) ($row['order_id'] ?? ''),
        'platform' => (string) ($row['platform'] ?? ''),
        'account_key' => (string) ($row['account_key'] ?? ''),
        'company' => (string) ($row['company'] ?? ''),
        'brand_name' => (string) ($row['brand_name'] ?? ''),
        'product_name' => (string) ($row['product_name'] ?? ''),
        'marketplace_product_name' => (string) ($row['marketplace_product_name'] ?? ''),
        'base_product_name' => (string) ($row['base_product_name'] ?? ''),
        'flavor_name' => (string) ($row['flavor_name'] ?? ''),
        'product_type' => (string) ($row['product_type'] ?? ''),
        'flavor' => (string) ($row['flavor'] ?? ''),
        'marketplace_sku' => (string) ($row['sku'] ?? ''),
        'item_key' => (string) ($row['item_key'] ?? ''),
        'sku' => (string) ($row['sku'] ?? ''),
        'status' => (string) ($row['status'] ?? ''),
        'quantity' => (int) ($row['quantity'] ?? 0),
        'item_count' => (int) ($row['quantity'] ?? 0),
        'cogs_quantity' => (int) ($row['cogs_quantity'] ?? 0) > 0
            ? (int) $row['cogs_quantity']
            : (int) ($row['quantity'] ?? 0),
        'is_free_gift' => (int) ($row['is_free_gift'] ?? 0) === 1,
        'revenue' => (int) round((float) ($row['revenue'] ?? 0)),
        'net_revenue' => (int) round((float) ($row['revenue'] ?? 0)),
        'order_net_revenue' => (int) round((float) ($row['order_net_revenue'] ?? 0)),
        'gross_revenue' => (int) round((float) ($row['gross_revenue'] ?? 0)),
        'marketplace_fees' => (int) round((float) ($row['marketplace_fees'] ?? 0)),
        'funds_released' => (int) ($row['funds_released'] ?? 0) === 1,
        'funds_released_at' => jg_orders_atom_datetime((string) ($row['funds_released_at'] ?? '')),
        'funds_released_amount' => (int) round((float) ($row['funds_released_amount'] ?? 0)),
        'funds_release_status' => (string) ($row['funds_release_status'] ?? ''),
        'funds_release_source' => (string) ($row['funds_release_source'] ?? ''),
        'cogs' => (int) round((float) ($row['cogs'] ?? 0)),
        'gross_profit' => (int) round((float) ($row['gross_profit'] ?? 0)),
        'username' => (string) ($row['username'] ?? ''),
        'address' => (string) ($row['address'] ?? ''),
        'phone' => (string) ($row['phone'] ?? ''),
        'source' => 'dashboard_order_mirror',
        'mirrored_at' => jg_orders_atom_datetime((string) ($row['mirrored_at'] ?? '')),
    ];
}

function jg_orders_mirror_range_summary_raw(PDO $pdo, string $startDate, string $endDate): array
{
    [$from, $to] = jg_orders_range_bounds($startDate, $endDate);
    try {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) AS rows_count,
                    COUNT(DISTINCT CONCAT_WS("|", platform, account_key, CASE WHEN order_id = "" THEN order_item_hash ELSE order_id END)) AS distinct_orders,
                    MAX(mirrored_at) AS last_mirrored_at
             FROM dashboard_order_mirror
             WHERE deleted_at IS NULL
               AND order_create_time >= :from_date
               AND order_create_time < :to_date'
        );
        $stmt->execute([
            ':from_date' => $from,
            ':to_date' => $to,
        ]);
        $summary = $stmt->fetch();
    } catch (Throwable) {
        $summary = false;
    }

    return [
        'rows' => (int) ($summary['rows_count'] ?? 0),
        'distinct_orders' => (int) ($summary['distinct_orders'] ?? 0),
        'last_mirrored_at_sql' => (string) ($summary['last_mirrored_at'] ?? ''),
    ];
}

function jg_orders_public_mirror_range_summary(array $summary): array
{
    return [
        'rows' => (int) ($summary['rows'] ?? 0),
        'distinct_orders' => (int) ($summary['distinct_orders'] ?? 0),
        'last_mirrored_at' => jg_orders_atom_datetime((string) ($summary['last_mirrored_at_sql'] ?? $summary['last_mirrored_at'] ?? '')),
    ];
}

function jg_orders_mirror_range_summary(PDO $pdo, string $startDate, string $endDate): array
{
    return jg_orders_public_mirror_range_summary(jg_orders_mirror_range_summary_raw($pdo, $startDate, $endDate));
}

function jg_orders_mirror_status(PDO $pdo): array
{
    try {
        $summary = $pdo->query(
            'SELECT COUNT(*) AS rows_count,
                    MIN(order_create_time) AS oldest_order_at,
                    MAX(order_create_time) AS newest_order_at,
                    MAX(mirrored_at) AS last_mirrored_at
             FROM dashboard_order_mirror
             WHERE deleted_at IS NULL'
        )->fetch();
    } catch (Throwable) {
        $summary = false;
    }

    return [
        'rows' => (int) ($summary['rows_count'] ?? 0),
        'oldest_order_at' => jg_orders_atom_datetime((string) ($summary['oldest_order_at'] ?? '')),
        'newest_order_at' => jg_orders_atom_datetime((string) ($summary['newest_order_at'] ?? '')),
        'last_mirrored_at' => jg_orders_atom_datetime((string) ($summary['last_mirrored_at'] ?? '')),
    ];
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
        $cogs = (int) round((float) ($remoteRow['cogs'] ?? 0));
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
                'funds_released' => false,
                'funds_released_at' => '',
                'funds_released_amount' => 0,
                'funds_release_status' => '',
                'funds_release_source' => '',
                'cogs' => 0,
                'gross_profit' => $orderNetRevenue,
            ];
        }
        $rows[$key]['quantity'] += $quantity;
        $rows[$key]['item_count'] += $quantity;
        $rows[$key]['revenue'] = max((int) ($rows[$key]['revenue'] ?? 0), $orderNetRevenue);
        $rows[$key]['net_revenue'] = max((int) ($rows[$key]['net_revenue'] ?? 0), $orderNetRevenue);
        $rows[$key]['marketplace_fees'] = max((int) ($rows[$key]['marketplace_fees'] ?? 0), $marketplaceFees);
        $released = !empty($remoteRow['funds_released']);
        $rows[$key]['funds_released'] = !empty($rows[$key]['funds_released']) || $released;
        $rows[$key]['funds_released_amount'] = max((int) ($rows[$key]['funds_released_amount'] ?? 0), (int) round((float) ($remoteRow['funds_released_amount'] ?? 0)));
        if (($rows[$key]['funds_released_at'] ?? '') === '' && !empty($remoteRow['funds_released_at'])) {
            $rows[$key]['funds_released_at'] = (string) $remoteRow['funds_released_at'];
        }
        if (($rows[$key]['funds_release_status'] ?? '') === '' && !empty($remoteRow['funds_release_status'])) {
            $rows[$key]['funds_release_status'] = (string) $remoteRow['funds_release_status'];
        }
        if (($rows[$key]['funds_release_source'] ?? '') === '' && !empty($remoteRow['funds_release_source'])) {
            $rows[$key]['funds_release_source'] = (string) $remoteRow['funds_release_source'];
        }
        $rows[$key]['cogs'] += $cogs;
        $rows[$key]['gross_profit'] = (int) ($rows[$key]['net_revenue'] ?? $orderNetRevenue) - (int) ($rows[$key]['cogs'] ?? 0);
    }

    return array_values($rows);
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

function jg_orders_fetch_json(string $url): array
{
    return jg_orders_fetch_json_with_timeout($url, 12);
}

function jg_orders_fetch_json_with_timeout(string $url, int $timeout): array
{
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => max(1, $timeout),
            'header' => "Accept: application/json\r\nUser-Agent: Jenang-Gemi-Executive-Dashboard/1.0\r\n",
            'ignore_errors' => true,
        ],
    ]);
    $raw = @file_get_contents($url, false, $context);
    if (!is_string($raw) || $raw === '') {
        throw new RuntimeException('Unable to read API Ingest order response.');
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded) || empty($decoded['ok'])) {
        throw new RuntimeException('API Ingest order response was not successful.');
    }
    return $decoded;
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
        'SELECT sku, brand_id, unit_id, product_id, flavor_id, volume, astra, current_stock, cogs, created_at
         FROM sku_skus
         WHERE current_stock > 0
           AND sku NOT IN (SELECT sku FROM sku_stock_lots)'
    );
    $insert = $pdo->prepare(
        'INSERT INTO sku_stock_lots
            (sku, po_number, received_qty_astra, remaining_qty_astra, cogs_per_astra, received_at, created_at, updated_at)
        VALUES (:sku, "OPENING", :received_qty, :remaining_qty, :cogs, :received_at, :created_at, :updated_at)'
    );
    $rows = array_values(array_filter($stmt->fetchAll(), 'is_array'));
    $stockMap = jg_astra_stock_map($rows);
    foreach ($rows as $row) {
        $sku = (string) ($row['sku'] ?? '');
        if (($stockMap[$sku]['stock_sku'] ?? $sku) !== $sku) {
            continue;
        }
        $qty = number_format((float) ($row['current_stock'] ?? 0), 2, '.', '');
        $insert->execute([
            ':sku' => $sku,
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
        'SELECT s.sku, s.tag, s.brand_id, s.unit_id, s.product_id, s.flavor_id, s.volume, s.astra, s.current_stock, s.cogs,
                b.name AS brand_name, u.name AS unit_name, p.name AS product_name, f.name AS flavor_name
         FROM sku_skus s
         INNER JOIN sku_brands b ON b.id = s.brand_id
         INNER JOIN sku_units u ON u.id = s.unit_id
         INNER JOIN sku_products p ON p.id = s.product_id
         INNER JOIN sku_flavors f ON f.id = s.flavor_id'
    );
    $lookup = [];
    $skuRows = array_values(array_filter($stmt->fetchAll(), 'is_array'));
    $historyBySku = [];
    $historyStmt = $pdo->query(
        'SELECT id, sku, old_price, new_price, change_mode, effective_at, recorded_at
         FROM sku_cogs_history ORDER BY sku, recorded_at, id'
    );
    foreach (($historyStmt !== false ? $historyStmt->fetchAll() : []) as $historyRow) {
        $historySku = (string) ($historyRow['sku'] ?? '');
        $historyBySku[$historySku][] = [
            'id' => (int) ($historyRow['id'] ?? 0),
            'old_price' => $historyRow['old_price'] === null ? null : (float) $historyRow['old_price'],
            'new_price' => (float) ($historyRow['new_price'] ?? 0),
            'change_mode' => (string) ($historyRow['change_mode'] ?? 'legacy'),
            'effective_at' => $historyRow['effective_at'] === null ? null : (string) $historyRow['effective_at'],
            'recorded_at' => (string) ($historyRow['recorded_at'] ?? ''),
        ];
    }
    $stockMap = jg_astra_stock_map($skuRows);
    foreach ($skuRows as $row) {
        $sku = (string) $row['sku'];
        $stockTarget = $stockMap[$sku] ?? [
            'stock_sku' => $sku,
            'stock_ratio' => 1.0,
            'stock_row' => $row,
        ];
        $stockRow = is_array($stockTarget['stock_row'] ?? null) ? $stockTarget['stock_row'] : $row;
        $baseSku = (string) ($stockTarget['stock_sku'] ?? $sku);
        $cogsMultiplier = (float) ($stockTarget['stock_ratio'] ?? 1.0);
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
            'base_cogs' => (float) ($stockRow['cogs'] ?? $row['cogs'] ?? 0),
            'cogs_history' => jg_astra_cogs_scale_history($historyBySku[$baseSku] ?? [], $cogsMultiplier),
            'stock_sku' => $baseSku,
            'stock_ratio' => $cogsMultiplier,
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
            $quantity = jg_orders_stock_quantity($remoteRow);
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
        $quantity = jg_orders_stock_quantity($remoteRow);
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
    $remoteRow = jg_orders_interpret_sales_row($remoteRow);
    $saleQuantity = max(0, (int) ($remoteRow['quantity'] ?? 0));
    $physicalQuantity = jg_orders_stock_quantity($remoteRow);
    $isFreeGift = jg_orders_is_free_gift($remoteRow);
    $unitCogs = 0.0;
    $hasCogsHistory = $sku !== null && is_array($sku['cogs_history'] ?? null) && $sku['cogs_history'] !== [];
    if ($sku !== null) {
        $unitCogs = (float) ($sku['cogs'] ?? 0);
        if ($hasCogsHistory) {
            $orderDate = jg_orders_order_datetime(
                $remoteRow['order_create_time'] ?? $remoteRow['timestamp'] ?? $remoteRow['created_at'] ?? null
            );
            $targetAt = $orderDate instanceof DateTimeImmutable
                ? $orderDate->setTimezone(jg_sku_business_timezone())->format('Y-m-d H:i:s')
                : (new DateTimeImmutable('now', jg_sku_business_timezone()))->format('Y-m-d H:i:s');
            $unitCogs = jg_sku_cogs_at($sku['cogs_history'], $targetAt, $unitCogs);
        }
    }
    $totalCogs = $physicalQuantity * $unitCogs;
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
        'quantity' => $saleQuantity,
        'cogs_quantity' => $physicalQuantity,
        'is_free_gift' => $isFreeGift,
        'astra_quantity' => $astraQty,
        'revenue' => $revenue,
        'net_revenue' => $revenue,
        'marketplace_fees' => (int) round((float) ($remoteRow['order_marketplace_fees'] ?? $remoteRow['marketplace_fees'] ?? 0)),
        'funds_released' => !empty($remoteRow['funds_released']),
        'funds_released_at' => (string) ($remoteRow['funds_released_at'] ?? ''),
        'funds_released_amount' => (int) round((float) ($remoteRow['funds_released_amount'] ?? 0)),
        'funds_release_status' => (string) ($remoteRow['funds_release_status'] ?? ''),
        'funds_release_source' => (string) ($remoteRow['funds_release_source'] ?? ''),
        'cogs' => (int) round($totalCogs),
        'cogs_estimated' => false,
        'cogs_source' => $sku !== null ? ($hasCogsHistory ? 'sku_quarter_history' : 'sku_static_average') : 'none',
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
    $stockSkuCode = (string) ($sku['stock_sku'] ?? $skuCode);
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
        $lotStmt->execute([':sku' => $stockSkuCode]);
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
            $cogs = (float) ($sku['base_cogs'] ?? $sku['cogs'] ?? 0);
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

        jg_orders_refresh_stock($pdo, $stockSkuCode);
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
    $legacyOrderItemKey = implode('|', [
        (string) ($remoteRow['platform'] ?? ''),
        (string) ($remoteRow['account_key'] ?? ''),
        (string) ($remoteRow['order_id'] ?? ''),
        trim((string) ($remoteRow['sku'] ?? $sku)),
    ]);
    if ($legacyOrderItemKey === $currentOrderItemKey) {
        return;
    }

    $stmt = $pdo->prepare(
        'SELECT id, stock_lot_id, qty_astra_consumed
         FROM marketplace_order_inventory_allocations
         WHERE order_id = :order_id
           AND platform = :platform
           AND account_key = :account_key
           AND sku = :sku
           AND order_item_key = :legacy_order_item_key'
    );
    $stmt->execute([
        ':order_id' => (string) ($remoteRow['order_id'] ?? ''),
        ':platform' => (string) ($remoteRow['platform'] ?? ''),
        ':account_key' => (string) ($remoteRow['account_key'] ?? ''),
        ':sku' => $sku,
        ':legacy_order_item_key' => $legacyOrderItemKey,
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
    jg_astra_stock_sync($pdo);
}
