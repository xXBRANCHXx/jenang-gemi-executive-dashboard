<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/config.php';
require_once dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/sku-db-bootstrap.php';

jg_admin_require_auth();

header('Content-Type: application/json; charset=utf-8');

try {
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $startDate = jg_orders_date($_GET['start_date'] ?? null, '-1 day');
    $endDate = jg_orders_date($_GET['end_date'] ?? null, 'today');
    if ($method === 'POST') {
        $payload = json_decode((string) file_get_contents('php://input'), true);
        $payload = is_array($payload) ? $payload : [];
        $startDate = jg_orders_date($payload['start_date'] ?? $startDate, '-1 day');
        $endDate = jg_orders_date($payload['end_date'] ?? $endDate, 'today');
        jg_orders_remote_sync($startDate, $endDate);
    }

    $remoteRows = jg_orders_remote_rows($startDate, $endDate);
    $pdo = jg_sku_db();
    jg_orders_ensure_schema($pdo);
    jg_orders_ensure_opening_lots($pdo);
    $skuLookup = jg_orders_sku_lookup($pdo);
    $rows = jg_orders_enrich_and_allocate($pdo, $remoteRows, $skuLookup);

    echo json_encode([
        'ok' => true,
        'start_date' => $startDate,
        'end_date' => $endDate,
        'orders' => $rows,
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'orders_api_failed',
        'message' => $error->getMessage(),
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
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
    $payload = jg_orders_fetch_json(jg_orders_remote_url('/sales/orders', [
        'start_date' => $startDate,
        'end_date' => $endDate,
    ]), 60);
    return is_array($payload['orders'] ?? null) ? $payload['orders'] : [];
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
         VALUES (:sku, "OPENING", :qty, :qty, :cogs, :received_at, :created_at, :updated_at)'
    );
    foreach ($stmt->fetchAll() as $row) {
        $insert->execute([
            ':sku' => (string) $row['sku'],
            ':qty' => number_format((float) ($row['current_stock'] ?? 0), 2, '.', ''),
            ':cogs' => number_format((float) ($row['cogs'] ?? 0), 2, '.', ''),
            ':received_at' => (string) ($row['created_at'] ?? $now),
            ':created_at' => $now,
            ':updated_at' => $now,
        ]);
    }
}

function jg_orders_sku_lookup(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT s.sku, s.tag, s.volume, s.astra, s.cogs, p.name AS product_name, f.name AS flavor_name
         FROM sku_skus s
         INNER JOIN sku_products p ON p.id = s.product_id
         INNER JOIN sku_flavors f ON f.id = s.flavor_id'
    );
    $lookup = [];
    foreach ($stmt->fetchAll() as $row) {
        $record = [
            'sku' => (string) $row['sku'],
            'tag' => (string) $row['tag'],
            'volume' => (float) ($row['volume'] ?? 0),
            'astra' => (float) ($row['astra'] ?? $row['volume'] ?? 0),
            'cogs' => (float) ($row['cogs'] ?? 0),
            'product_name' => (string) ($row['product_name'] ?? $row['sku']),
            'flavor_name' => (string) ($row['flavor_name'] ?? ''),
        ];
        foreach ([$record['sku'], $record['tag']] as $key) {
            $key = strtoupper(trim((string) $key));
            if ($key !== '') {
                $lookup[$key] = $record;
            }
        }
    }
    return $lookup;
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
        if ($sku) {
            $quantity = max(0, (int) ($remoteRow['quantity'] ?? 0));
            $volume = (float) ($sku['volume'] ?? 0);
            $astra = (float) ($sku['astra'] ?? $volume);
            $multiplier = $volume > 0 && $astra > 0 ? max(1.0, $volume / $astra) : 1.0;
            $astraQty = round($quantity * $multiplier, 2);
            $allocations = jg_orders_allocate_fifo($pdo, $remoteRow, $sku, $astraQty);
        }
        $totalCogs = array_sum(array_map(static fn (array $allocation): float => (float) $allocation['total_cogs'], $allocations));
        $rows[] = [
            'timestamp' => (string) ($remoteRow['timestamp'] ?? ''),
            'order_id' => (string) ($remoteRow['order_id'] ?? ''),
            'platform' => (string) ($remoteRow['platform'] ?? ''),
            'account_key' => (string) ($remoteRow['account_key'] ?? ''),
            'product_name' => $sku['product_name'] ?? (string) ($remoteRow['product_name'] ?? ''),
            'marketplace_sku' => (string) ($remoteRow['sku'] ?? ''),
            'sku' => $sku['sku'] ?? '',
            'quantity' => (int) ($remoteRow['quantity'] ?? 0),
            'astra_quantity' => $astraQty,
            'revenue' => (int) round((float) ($remoteRow['revenue'] ?? 0)),
            'marketplace_fees' => (int) round((float) ($remoteRow['marketplace_fees'] ?? 0)),
            'cogs' => (int) round($totalCogs),
            'gross_profit' => (int) round((float) ($remoteRow['revenue'] ?? 0) - $totalCogs),
            'username' => (string) ($remoteRow['username'] ?? ''),
            'address' => (string) ($remoteRow['address'] ?? ''),
            'phone' => (string) ($remoteRow['phone'] ?? ''),
            'allocations' => $allocations,
        ];
    }
    return $rows;
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
        (string) ($remoteRow['product_name'] ?? ''),
    ];
    foreach ($candidates as $candidate) {
        $key = strtoupper(trim($candidate));
        if ($key !== '' && isset($skuLookup[$key])) {
            return $skuLookup[$key];
        }
    }

    $haystack = strtoupper(implode(' ', $candidates));
    foreach ($skuLookup as $key => $record) {
        if (strlen($key) >= 3 && $haystack !== '' && str_contains($haystack, $key)) {
            return $record;
        }
    }

    return null;
}

function jg_orders_allocate_fifo(PDO $pdo, array $remoteRow, array $sku, float $astraQty): array
{
    $orderItemKey = implode('|', [
        (string) ($remoteRow['platform'] ?? ''),
        (string) ($remoteRow['account_key'] ?? ''),
        (string) ($remoteRow['order_id'] ?? ''),
        (string) ($remoteRow['item_row_id'] ?? $remoteRow['item_key'] ?? $remoteRow['sku'] ?? ''),
    ]);
    $skuCode = (string) $sku['sku'];
    $now = gmdate('Y-m-d H:i:s');
    $consumedAt = (string) ($remoteRow['timestamp'] ?? $now);

    $pdo->beginTransaction();
    try {
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
