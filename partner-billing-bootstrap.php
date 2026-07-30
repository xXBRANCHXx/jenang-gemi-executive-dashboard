<?php
declare(strict_types=1);

require_once __DIR__ . '/partner-db-bootstrap.php';

const JG_ADMIN_PARTNER_BILLING_ANCHOR = '2026-07-01';
const JG_ADMIN_PARTNER_BILLING_MAX_FILE_BYTES = 10 * 1024 * 1024;

function jg_admin_partner_billing_db(): PDO
{
    $pdo = jg_partner_db();
    if (!$pdo instanceof PDO) {
        throw new RuntimeException('Partner billing database is unavailable.');
    }
    jg_admin_partner_billing_ensure_schema($pdo);
    return $pdo;
}

function jg_admin_partner_billing_ensure_column(PDO $pdo, string $table, string $column, string $definition): void
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table_name AND COLUMN_NAME = :column_name'
    );
    $stmt->execute([':table_name' => $table, ':column_name' => $column]);
    if ((int) $stmt->fetchColumn() > 0) {
        return;
    }
    $safeTable = preg_replace('/[^a-zA-Z0-9_]/', '', $table) ?: $table;
    $safeColumn = preg_replace('/[^a-zA-Z0-9_]/', '', $column) ?: $column;
    $pdo->exec(sprintf('ALTER TABLE `%s` ADD COLUMN `%s` %s', $safeTable, $safeColumn, $definition));
}

function jg_admin_partner_billing_ensure_index(PDO $pdo, string $table, string $index, string $columns): void
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table_name AND INDEX_NAME = :index_name'
    );
    $stmt->execute([':table_name' => $table, ':index_name' => $index]);
    if ((int) $stmt->fetchColumn() > 0) {
        return;
    }
    $safeTable = preg_replace('/[^a-zA-Z0-9_]/', '', $table) ?: $table;
    $safeIndex = preg_replace('/[^a-zA-Z0-9_]/', '', $index) ?: $index;
    $pdo->exec(sprintf('ALTER TABLE `%s` ADD INDEX `%s` %s', $safeTable, $safeIndex, $columns));
}

function jg_admin_partner_billing_ensure_schema(PDO $pdo): void
{
    static $prepared = [];
    $key = spl_object_id($pdo);
    if (isset($prepared[$key])) {
        return;
    }
    $statements = [
        'CREATE TABLE IF NOT EXISTS partner_orders (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            partner_code VARCHAR(64) NOT NULL,
            customer_name VARCHAR(160) NOT NULL,
            brand_name VARCHAR(160) NOT NULL,
            product_name VARCHAR(160) NOT NULL,
            sku_code VARCHAR(32) NOT NULL,
            sku_label VARCHAR(255) NOT NULL,
            quantity INT UNSIGNED NOT NULL DEFAULT 1,
            notes VARCHAR(300) NOT NULL DEFAULT "",
            status VARCHAR(32) NOT NULL DEFAULT "IS_LISTED",
            order_timestamp DATETIME NULL DEFAULT NULL,
            marketplace_platform VARCHAR(32) NOT NULL DEFAULT "",
            deadline_hours TINYINT UNSIGNED NOT NULL DEFAULT 24,
            deadline_at DATETIME NULL DEFAULT NULL,
            revenue_total DECIMAL(14,2) NOT NULL DEFAULT 0.00,
            inference_json LONGTEXT NULL DEFAULT NULL,
            items_json LONGTEXT NULL DEFAULT NULL,
            archived_at DATETIME NULL DEFAULT NULL,
            billing_status VARCHAR(32) NOT NULL DEFAULT "unbilled",
            billing_reference VARCHAR(120) NOT NULL DEFAULT "",
            billing_paid_at DATETIME NULL DEFAULT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            KEY idx_partner_orders_partner_created (partner_code, created_at),
            KEY idx_partner_orders_partner_status (partner_code, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS partner_favicons (
            partner_code VARCHAR(64) NOT NULL,
            theme VARCHAR(8) NOT NULL,
            original_name VARCHAR(255) NOT NULL,
            stored_name VARCHAR(255) NOT NULL,
            mime_type VARCHAR(64) NOT NULL,
            size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
            file_data LONGBLOB NULL DEFAULT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY (partner_code, theme)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS partner_weekly_bills (
            bill_id VARCHAR(120) NOT NULL PRIMARY KEY,
            partner_code VARCHAR(64) NOT NULL,
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            due_date DATE NOT NULL,
            status VARCHAR(32) NOT NULL DEFAULT "accruing",
            subtotal_amount BIGINT NOT NULL DEFAULT 0,
            adjustment_amount BIGINT NOT NULL DEFAULT 0,
            total_amount BIGINT NOT NULL DEFAULT 0,
            payment_submitted_at DATETIME NULL DEFAULT NULL,
            paid_at DATETIME NULL DEFAULT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            UNIQUE KEY uniq_partner_bill_period (partner_code, period_start),
            KEY idx_partner_bills_status (status, due_date),
            KEY idx_partner_bills_partner (partner_code, period_start)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS partner_weekly_bill_items (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            bill_id VARCHAR(120) NOT NULL,
            partner_code VARCHAR(64) NOT NULL,
            order_id VARCHAR(64) NOT NULL,
            order_date DATETIME NOT NULL,
            platform VARCHAR(64) NOT NULL DEFAULT "",
            customer_name VARCHAR(160) NOT NULL DEFAULT "",
            description VARCHAR(500) NOT NULL DEFAULT "",
            units INT UNSIGNED NOT NULL DEFAULT 0,
            amount BIGINT NOT NULL DEFAULT 0,
            status VARCHAR(32) NOT NULL DEFAULT "included",
            dispute_id BIGINT UNSIGNED NULL DEFAULT NULL,
            removed_reason VARCHAR(500) NOT NULL DEFAULT "",
            paid_at DATETIME NULL DEFAULT NULL,
            snapshot_json LONGTEXT NULL DEFAULT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            UNIQUE KEY uniq_partner_bill_order (order_id),
            KEY idx_partner_bill_items_bill (bill_id, status),
            KEY idx_partner_bill_items_partner (partner_code, order_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS partner_weekly_bill_disputes (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            dispute_key VARCHAR(120) NOT NULL,
            bill_id VARCHAR(120) NOT NULL,
            partner_code VARCHAR(64) NOT NULL,
            reason TEXT NOT NULL,
            status VARCHAR(32) NOT NULL DEFAULT "pending",
            resolution_reason TEXT NULL DEFAULT NULL,
            evidence_file_id BIGINT UNSIGNED NULL DEFAULT NULL,
            created_at DATETIME NOT NULL,
            resolved_at DATETIME NULL DEFAULT NULL,
            updated_at DATETIME NOT NULL,
            UNIQUE KEY uniq_partner_dispute_key (dispute_key),
            KEY idx_partner_disputes_status (status, created_at),
            KEY idx_partner_disputes_bill (bill_id, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS partner_weekly_bill_dispute_items (
            dispute_id BIGINT UNSIGNED NOT NULL,
            bill_item_id BIGINT UNSIGNED NOT NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY (dispute_id, bill_item_id),
            KEY idx_partner_dispute_items_item (bill_item_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS partner_weekly_bill_files (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            partner_code VARCHAR(64) NOT NULL,
            bill_id VARCHAR(120) NOT NULL,
            file_kind VARCHAR(32) NOT NULL,
            original_name VARCHAR(255) NOT NULL,
            mime_type VARCHAR(120) NOT NULL,
            size_bytes BIGINT UNSIGNED NOT NULL,
            file_data LONGBLOB NOT NULL,
            created_at DATETIME NOT NULL,
            KEY idx_partner_bill_files_bill (bill_id, file_kind, created_at),
            KEY idx_partner_bill_files_partner (partner_code, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS partner_weekly_bill_payments (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            payment_key VARCHAR(120) NOT NULL,
            bill_id VARCHAR(120) NOT NULL,
            partner_code VARCHAR(64) NOT NULL,
            amount BIGINT NOT NULL,
            proof_file_id BIGINT UNSIGNED NOT NULL,
            status VARCHAR(32) NOT NULL DEFAULT "pending",
            submitted_at DATETIME NOT NULL,
            confirmed_at DATETIME NULL DEFAULT NULL,
            accounting_transaction_id BIGINT UNSIGNED NULL DEFAULT NULL,
            updated_at DATETIME NOT NULL,
            UNIQUE KEY uniq_partner_bill_payment_key (payment_key),
            UNIQUE KEY uniq_partner_bill_payment_bill (bill_id),
            KEY idx_partner_bill_payments_status (status, submitted_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS partner_billing_onboarding (
            partner_code VARCHAR(64) NOT NULL PRIMARY KEY,
            billing_seen_at DATETIME NULL DEFAULT NULL,
            tutorial_completed_at DATETIME NULL DEFAULT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    ];
    foreach ($statements as $statement) {
        $pdo->exec($statement);
    }
    jg_admin_partner_billing_ensure_column($pdo, 'partner_orders', 'billing_status', 'VARCHAR(32) NOT NULL DEFAULT "unbilled"');
    jg_admin_partner_billing_ensure_column($pdo, 'partner_orders', 'billing_reference', 'VARCHAR(120) NOT NULL DEFAULT ""');
    jg_admin_partner_billing_ensure_column($pdo, 'partner_orders', 'billing_paid_at', 'DATETIME NULL DEFAULT NULL');
    jg_admin_partner_billing_ensure_column($pdo, 'partner_favicons', 'file_data', 'LONGBLOB NULL DEFAULT NULL');
    jg_admin_partner_billing_ensure_index($pdo, 'partner_orders', 'idx_partner_orders_billing', '(partner_code, billing_status, billing_paid_at)');
    $prepared[$key] = true;
}

function jg_admin_partner_billing_today(): string
{
    return (new DateTimeImmutable('now', new DateTimeZone('Asia/Jakarta')))->format('Y-m-d');
}

function jg_admin_partner_billing_period(DateTimeImmutable $date): array
{
    $timezone = new DateTimeZone('Asia/Jakarta');
    $localDate = $date->setTimezone($timezone)->setTime(0, 0);
    $anchor = new DateTimeImmutable(JG_ADMIN_PARTNER_BILLING_ANCHOR, $timezone);
    $block = (int) floor(($localDate->getTimestamp() - $anchor->getTimestamp()) / 604800);
    $start = $anchor->modify(($block >= 0 ? '+' : '') . ($block * 7) . ' days');
    $end = $start->modify('+6 days');
    return ['start' => $start->format('Y-m-d'), 'end' => $end->format('Y-m-d'), 'due' => $end->modify('+3 days')->format('Y-m-d')];
}

function jg_admin_partner_billing_bill_id(string $partnerCode, string $periodStart): string
{
    return 'PB-' . str_replace('-', '', $periodStart) . '-' . strtoupper(substr(hash('sha256', strtoupper(trim($partnerCode))), 0, 12));
}

function jg_admin_partner_billing_order_summary(array $order): array
{
    $items = json_decode((string) ($order['items_json'] ?? ''), true);
    $items = is_array($items) ? array_values(array_filter($items, 'is_array')) : [];
    $units = 0;
    $labels = [];
    foreach ($items as $item) {
        $quantity = max(0, (int) ($item['quantity'] ?? 0));
        $units += $quantity;
        $label = trim((string) ($item['sku_label'] ?? $item['product'] ?? $item['sku_code'] ?? ''));
        if ($label !== '') $labels[] = $label . ($quantity > 0 ? ' ×' . $quantity : '');
    }
    if ($items === []) {
        $units = max(0, (int) ($order['quantity'] ?? 0));
        $label = trim((string) ($order['sku_label'] ?? $order['product_name'] ?? $order['sku_code'] ?? ''));
        if ($label !== '') $labels[] = $label . ($units > 0 ? ' ×' . $units : '');
    }
    return ['items' => $items, 'units' => $units, 'description' => mb_substr(implode(', ', $labels), 0, 500)];
}

function jg_admin_partner_billing_recalculate(PDO $pdo, string $billId): void
{
    $totalsStmt = $pdo->prepare(
        'SELECT COALESCE(SUM(amount), 0) AS subtotal,
                COALESCE(SUM(CASE WHEN status <> "removed" THEN amount ELSE 0 END), 0) AS total
         FROM partner_weekly_bill_items WHERE bill_id = :bill_id'
    );
    $totalsStmt->execute([':bill_id' => $billId]);
    $totals = $totalsStmt->fetch() ?: [];
    $subtotal = (int) round((float) ($totals['subtotal'] ?? 0));
    $total = (int) round((float) ($totals['total'] ?? 0));
    $billStmt = $pdo->prepare('SELECT status, period_end FROM partner_weekly_bills WHERE bill_id = :bill_id LIMIT 1');
    $billStmt->execute([':bill_id' => $billId]);
    $bill = $billStmt->fetch();
    if (!is_array($bill)) return;
    $status = (string) $bill['status'];
    if (!in_array($status, ['paid', 'payment_submitted', 'disputed'], true)) {
        $status = (string) $bill['period_end'] < jg_admin_partner_billing_today() ? 'unpaid' : 'accruing';
    }
    if ($total <= 0 && (string) $bill['period_end'] < jg_admin_partner_billing_today()) $status = 'paid';
    $update = $pdo->prepare(
        'UPDATE partner_weekly_bills SET subtotal_amount = :subtotal, adjustment_amount = :adjustment,
                total_amount = :total, status = :status,
                paid_at = CASE WHEN :mark_paid = 1 AND paid_at IS NULL THEN UTC_TIMESTAMP() ELSE paid_at END,
                updated_at = UTC_TIMESTAMP() WHERE bill_id = :bill_id'
    );
    $update->execute([
        ':subtotal' => $subtotal,
        ':adjustment' => max(0, $subtotal - $total),
        ':total' => $total,
        ':status' => $status,
        ':mark_paid' => $status === 'paid' ? 1 : 0,
        ':bill_id' => $billId,
    ]);
}

function jg_admin_partner_billing_sync(PDO $pdo): void
{
    jg_admin_partner_billing_ensure_schema($pdo);
    $orders = $pdo->query(
        'SELECT id, partner_code, customer_name, product_name, sku_code, sku_label, quantity, status,
                marketplace_platform, revenue_total, items_json, order_timestamp, created_at, billing_paid_at
         FROM partner_orders WHERE revenue_total > 0
         ORDER BY COALESCE(order_timestamp, created_at) ASC, id ASC'
    )->fetchAll();
    $billIds = [];
    $pdo->beginTransaction();
    try {
        foreach ($orders as $order) {
            $partnerCode = strtoupper(trim((string) ($order['partner_code'] ?? '')));
            $orderId = trim((string) ($order['id'] ?? ''));
            if ($partnerCode === '' || $orderId === '') continue;
            $status = strtoupper(trim((string) ($order['status'] ?? '')));
            if (in_array($status, ['CANCELLED', 'CANCELED'], true)) {
                $billLookup = $pdo->prepare('SELECT bill_id FROM partner_weekly_bill_items WHERE order_id = :order_id LIMIT 1');
                $billLookup->execute([':order_id' => $orderId]);
                $billId = (string) ($billLookup->fetchColumn() ?: '');
                if ($billId !== '') {
                    $remove = $pdo->prepare('UPDATE partner_weekly_bill_items SET status = "removed", removed_reason = "Order cancelled", updated_at = UTC_TIMESTAMP() WHERE order_id = :order_id AND status IN ("included", "disputed")');
                    $remove->execute([':order_id' => $orderId]);
                    $billIds[$billId] = true;
                }
                continue;
            }
            if (trim((string) ($order['billing_paid_at'] ?? '')) !== '') continue;
            try {
                $date = new DateTimeImmutable((string) ($order['order_timestamp'] ?? $order['created_at'] ?? 'now'), new DateTimeZone('UTC'));
            } catch (Throwable) {
                $date = new DateTimeImmutable('now', new DateTimeZone('UTC'));
            }
            $period = jg_admin_partner_billing_period($date);
            $billId = jg_admin_partner_billing_bill_id($partnerCode, $period['start']);
            $billIds[$billId] = true;
            $billInsert = $pdo->prepare(
                'INSERT IGNORE INTO partner_weekly_bills
                    (bill_id, partner_code, period_start, period_end, due_date, status, created_at, updated_at)
                 VALUES (:bill_id, :partner_code, :period_start, :period_end, :due_date, :status, UTC_TIMESTAMP(), UTC_TIMESTAMP())'
            );
            $billInsert->execute([
                ':bill_id' => $billId,
                ':partner_code' => $partnerCode,
                ':period_start' => $period['start'],
                ':period_end' => $period['end'],
                ':due_date' => $period['due'],
                ':status' => $period['end'] < jg_admin_partner_billing_today() ? 'unpaid' : 'accruing',
            ]);
            $summary = jg_admin_partner_billing_order_summary($order);
            $itemInsert = $pdo->prepare(
                'INSERT IGNORE INTO partner_weekly_bill_items
                    (bill_id, partner_code, order_id, order_date, platform, customer_name, description, units,
                     amount, status, snapshot_json, created_at, updated_at)
                 VALUES
                    (:bill_id, :partner_code, :order_id, :order_date, :platform, :customer_name, :description, :units,
                     :amount, "included", :snapshot_json, UTC_TIMESTAMP(), UTC_TIMESTAMP())'
            );
            $itemInsert->execute([
                ':bill_id' => $billId,
                ':partner_code' => $partnerCode,
                ':order_id' => $orderId,
                ':order_date' => $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s'),
                ':platform' => mb_substr(trim((string) ($order['marketplace_platform'] ?? '')), 0, 64),
                ':customer_name' => mb_substr(trim((string) ($order['customer_name'] ?? '')), 0, 160),
                ':description' => $summary['description'],
                ':units' => $summary['units'],
                ':amount' => (int) round((float) ($order['revenue_total'] ?? 0)),
                ':snapshot_json' => json_encode(['order_id' => $orderId, 'items' => $summary['items']], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            ]);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
    foreach ($pdo->query('SELECT bill_id FROM partner_weekly_bills')->fetchAll(PDO::FETCH_COLUMN) as $billId) {
        $billIds[(string) $billId] = true;
    }
    foreach (array_keys($billIds) as $billId) jg_admin_partner_billing_recalculate($pdo, $billId);
}

function jg_admin_partner_billing_period_label(string $start, string $end): string
{
    $timezone = new DateTimeZone('Asia/Jakarta');
    $startDate = new DateTimeImmutable($start, $timezone);
    $endDate = new DateTimeImmutable($end, $timezone);
    if ($startDate->format('Y-m') === $endDate->format('Y-m')) {
        return $startDate->format('F j') . '–' . $endDate->format('j, Y');
    }
    return $startDate->format('F j') . '–' . $endDate->format('F j, Y');
}

function jg_admin_partner_billing_items(PDO $pdo, string $billId, ?int $disputeId = null): array
{
    if ($disputeId !== null) {
        $stmt = $pdo->prepare(
            'SELECT i.id, i.order_id, i.order_date, i.platform, i.customer_name, i.description, i.units,
                    i.amount, i.status, i.snapshot_json
             FROM partner_weekly_bill_dispute_items di
             JOIN partner_weekly_bill_items i ON i.id = di.bill_item_id
             WHERE di.dispute_id = :dispute_id ORDER BY i.order_date ASC, i.id ASC'
        );
        $stmt->execute([':dispute_id' => $disputeId]);
    } else {
        $stmt = $pdo->prepare(
            'SELECT id, order_id, order_date, platform, customer_name, description, units, amount, status, snapshot_json
             FROM partner_weekly_bill_items WHERE bill_id = :bill_id ORDER BY order_date ASC, id ASC'
        );
        $stmt->execute([':bill_id' => $billId]);
    }
    return array_map(static function (array $item): array {
        $snapshot = json_decode((string) ($item['snapshot_json'] ?? ''), true);
        return [
            'id' => (int) $item['id'], 'order_id' => (string) $item['order_id'],
            'order_date' => (string) $item['order_date'], 'platform' => (string) $item['platform'],
            'customer_name' => (string) $item['customer_name'], 'description' => (string) $item['description'],
            'units' => (int) $item['units'], 'amount' => (int) $item['amount'], 'status' => (string) $item['status'],
            'snapshot' => is_array($snapshot) ? $snapshot : [],
        ];
    }, $stmt->fetchAll());
}

function jg_admin_partner_billing_notifications(string $endpoint): array
{
    $pdo = jg_admin_partner_billing_db();
    jg_admin_partner_billing_sync($pdo);
    $events = [];
    $paymentStmt = $pdo->query(
        'SELECT p.id, p.bill_id, p.partner_code, p.amount, p.proof_file_id, p.submitted_at,
                f.original_name, f.mime_type, f.size_bytes,
                b.period_start, b.period_end, b.due_date, b.total_amount,
                COALESCE(NULLIF(pr.name, ""), p.partner_code) AS partner_name
         FROM partner_weekly_bill_payments p
         JOIN partner_weekly_bills b ON b.bill_id = p.bill_id
         JOIN partner_weekly_bill_files f ON f.id = p.proof_file_id
         LEFT JOIN partner_profiles pr ON pr.code = p.partner_code
         WHERE p.status = "pending"
         ORDER BY p.submitted_at DESC'
    );
    foreach ($paymentStmt->fetchAll() as $row) {
        $events[] = [
            'id' => 'payment:' . (int) $row['id'],
            'record_id' => (int) $row['id'],
            'type' => 'payment',
            'partner_code' => (string) $row['partner_code'],
            'partner_name' => (string) $row['partner_name'],
            'bill_id' => (string) $row['bill_id'],
            'period_start' => (string) $row['period_start'],
            'period_end' => (string) $row['period_end'],
            'period_label' => jg_admin_partner_billing_period_label((string) $row['period_start'], (string) $row['period_end']),
            'amount' => (int) $row['amount'],
            'created_at' => (string) $row['submitted_at'],
            'proof' => [
                'url' => $endpoint . '?' . http_build_query(['action' => 'file', 'id' => (int) $row['proof_file_id']]),
                'name' => (string) $row['original_name'],
                'mime_type' => (string) $row['mime_type'],
                'size_bytes' => (int) $row['size_bytes'],
            ],
            'favicon_url' => $endpoint . '?' . http_build_query(['action' => 'favicon', 'partner_code' => (string) $row['partner_code']]),
        ];
    }
    $disputeStmt = $pdo->query(
        'SELECT d.id, d.dispute_key, d.bill_id, d.partner_code, d.reason, d.created_at,
                b.period_start, b.period_end, b.total_amount,
                COALESCE(NULLIF(pr.name, ""), d.partner_code) AS partner_name
         FROM partner_weekly_bill_disputes d
         JOIN partner_weekly_bills b ON b.bill_id = d.bill_id
         LEFT JOIN partner_profiles pr ON pr.code = d.partner_code
         WHERE d.status = "pending"
         ORDER BY d.created_at DESC'
    );
    foreach ($disputeStmt->fetchAll() as $row) {
        $items = jg_admin_partner_billing_items($pdo, (string) $row['bill_id'], (int) $row['id']);
        $events[] = [
            'id' => 'dispute:' . (int) $row['id'],
            'record_id' => (int) $row['id'],
            'type' => 'dispute',
            'partner_code' => (string) $row['partner_code'],
            'partner_name' => (string) $row['partner_name'],
            'bill_id' => (string) $row['bill_id'],
            'period_start' => (string) $row['period_start'],
            'period_end' => (string) $row['period_end'],
            'period_label' => jg_admin_partner_billing_period_label((string) $row['period_start'], (string) $row['period_end']),
            'amount' => array_sum(array_map(static fn (array $item): int => (int) $item['amount'], $items)),
            'bill_total' => (int) $row['total_amount'],
            'reason' => (string) $row['reason'],
            'items' => $items,
            'created_at' => (string) $row['created_at'],
            'favicon_url' => $endpoint . '?' . http_build_query(['action' => 'favicon', 'partner_code' => (string) $row['partner_code']]),
        ];
    }
    usort($events, static fn (array $a, array $b): int => strcmp((string) $b['created_at'], (string) $a['created_at']));
    return $events;
}

function jg_admin_partner_billing_stream_file(PDO $pdo, int $fileId): never
{
    $stmt = $pdo->prepare('SELECT original_name, mime_type, size_bytes, file_data FROM partner_weekly_bill_files WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $fileId]);
    $file = $stmt->fetch();
    if (!is_array($file)) throw new RuntimeException('File not found.');
    $data = (string) ($file['file_data'] ?? '');
    header('Content-Type: ' . (string) ($file['mime_type'] ?? 'application/octet-stream'));
    header('Content-Length: ' . strlen($data));
    header('Content-Disposition: inline; filename="' . addcslashes((string) ($file['original_name'] ?? 'proof'), "\"\\") . '"');
    header('Cache-Control: private, no-store');
    header('X-Content-Type-Options: nosniff');
    echo $data;
    exit;
}

function jg_admin_partner_billing_stream_favicon(PDO $pdo, string $partnerCode): never
{
    $stmt = $pdo->prepare(
        'SELECT mime_type, file_data FROM partner_favicons
         WHERE partner_code = :partner_code AND file_data IS NOT NULL
         ORDER BY FIELD(theme, "dark", "light") LIMIT 1'
    );
    $stmt->execute([':partner_code' => strtoupper(trim($partnerCode))]);
    $favicon = $stmt->fetch();
    if (!is_array($favicon) || (string) ($favicon['file_data'] ?? '') === '') throw new RuntimeException('Favicon not found.');
    $data = (string) $favicon['file_data'];
    $etag = '"partner-billing-favicon-' . hash('sha256', $data) . '"';
    if (trim((string) ($_SERVER['HTTP_IF_NONE_MATCH'] ?? '')) === $etag) {
        http_response_code(304);
        exit;
    }
    header('Content-Type: ' . (string) ($favicon['mime_type'] ?? 'image/png'));
    header('Content-Length: ' . strlen($data));
    header('Cache-Control: private, max-age=86400');
    header('ETag: ' . $etag);
    header('X-Content-Type-Options: nosniff');
    echo $data;
    exit;
}

function jg_admin_partner_billing_accept_dispute(PDO $pdo, int $disputeId): array
{
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('SELECT * FROM partner_weekly_bill_disputes WHERE id = :id FOR UPDATE');
        $stmt->execute([':id' => $disputeId]);
        $dispute = $stmt->fetch();
        if (!is_array($dispute)) throw new InvalidArgumentException('Dispute not found.');
        if ((string) $dispute['status'] !== 'pending') throw new InvalidArgumentException('This dispute has already been resolved.');
        $items = jg_admin_partner_billing_items($pdo, (string) $dispute['bill_id'], $disputeId);
        $remove = $pdo->prepare(
            'UPDATE partner_weekly_bill_items SET status = "removed", removed_reason = "Accepted already-paid dispute",
                    paid_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = :id'
        );
        $markOrder = $pdo->prepare(
            'UPDATE partner_orders SET billing_status = "dispute_accepted", billing_reference = :bill_id,
                    billing_paid_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = :order_id'
        );
        foreach ($items as $item) {
            $remove->execute([':id' => (int) $item['id']]);
            $markOrder->execute([':bill_id' => (string) $dispute['bill_id'], ':order_id' => (string) $item['order_id']]);
        }
        $resolve = $pdo->prepare(
            'UPDATE partner_weekly_bill_disputes SET status = "accepted", resolution_reason = "Accepted by finance.",
                    resolved_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = :id'
        );
        $resolve->execute([':id' => $disputeId]);
        $bill = $pdo->prepare('UPDATE partner_weekly_bills SET status = "unpaid", updated_at = UTC_TIMESTAMP() WHERE bill_id = :bill_id');
        $bill->execute([':bill_id' => (string) $dispute['bill_id']]);
        $pdo->commit();
        jg_admin_partner_billing_recalculate($pdo, (string) $dispute['bill_id']);
        return ['ok' => true, 'dispute_id' => $disputeId, 'status' => 'accepted'];
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
}

/** @return array{mime_type:string,size_bytes:int,data:string,original_name:string} */
function jg_admin_partner_billing_validate_evidence(array $file): array
{
    if ((int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) throw new InvalidArgumentException('Choose a screenshot image.');
    $tmp = (string) ($file['tmp_name'] ?? '');
    if ($tmp === '' || !is_file($tmp)) throw new InvalidArgumentException('The screenshot could not be read.');
    $size = (int) ($file['size'] ?? filesize($tmp) ?: 0);
    if ($size <= 0 || $size > JG_ADMIN_PARTNER_BILLING_MAX_FILE_BYTES) throw new InvalidArgumentException('The screenshot must be 10 MB or smaller.');
    $data = (string) file_get_contents($tmp);
    $header = substr($data, 0, 16);
    $mime = str_starts_with($header, "\x89PNG\r\n\x1a\n") ? 'image/png'
        : (str_starts_with($header, "\xff\xd8\xff") ? 'image/jpeg'
        : ((substr($header, 0, 4) === 'RIFF' && substr($header, 8, 4) === 'WEBP') ? 'image/webp' : ''));
    if ($mime === '' || @getimagesize($tmp) === false) throw new InvalidArgumentException('Screenshot must be a valid PNG, JPG, or WebP image.');
    return ['mime_type' => $mime, 'size_bytes' => $size, 'data' => $data, 'original_name' => mb_substr(trim((string) ($file['name'] ?? 'evidence')), 0, 255)];
}

function jg_admin_partner_billing_store_evidence(PDO $pdo, array $dispute, array $file): int
{
    $validated = jg_admin_partner_billing_validate_evidence($file);
    $stmt = $pdo->prepare(
        'INSERT INTO partner_weekly_bill_files
            (partner_code, bill_id, file_kind, original_name, mime_type, size_bytes, file_data, created_at)
         VALUES (:partner_code, :bill_id, "rejection_evidence", :name, :mime, :size, :data, UTC_TIMESTAMP())'
    );
    $stmt->bindValue(':partner_code', (string) $dispute['partner_code']);
    $stmt->bindValue(':bill_id', (string) $dispute['bill_id']);
    $stmt->bindValue(':name', $validated['original_name']);
    $stmt->bindValue(':mime', $validated['mime_type']);
    $stmt->bindValue(':size', $validated['size_bytes'], PDO::PARAM_INT);
    $stmt->bindValue(':data', $validated['data'], PDO::PARAM_LOB);
    $stmt->execute();
    return (int) $pdo->lastInsertId();
}

function jg_admin_partner_billing_reject_dispute(PDO $pdo, int $disputeId, string $reason, ?array $file): array
{
    $reason = trim($reason);
    if (mb_strlen($reason) < 8) throw new InvalidArgumentException('Give the partner a clear rejection reason.');
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('SELECT * FROM partner_weekly_bill_disputes WHERE id = :id FOR UPDATE');
        $stmt->execute([':id' => $disputeId]);
        $dispute = $stmt->fetch();
        if (!is_array($dispute)) throw new InvalidArgumentException('Dispute not found.');
        if ((string) $dispute['status'] !== 'pending') throw new InvalidArgumentException('This dispute has already been resolved.');
        $evidenceId = null;
        if (is_array($file) && (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
            $evidenceId = jg_admin_partner_billing_store_evidence($pdo, $dispute, $file);
        }
        $restore = $pdo->prepare(
            'UPDATE partner_weekly_bill_items i
             JOIN partner_weekly_bill_dispute_items di ON di.bill_item_id = i.id
             SET i.status = "included", i.updated_at = UTC_TIMESTAMP()
             WHERE di.dispute_id = :dispute_id'
        );
        $restore->execute([':dispute_id' => $disputeId]);
        $resolve = $pdo->prepare(
            'UPDATE partner_weekly_bill_disputes SET status = "rejected", resolution_reason = :reason,
                    evidence_file_id = :evidence_file_id, resolved_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = :id'
        );
        $resolve->execute([':reason' => mb_substr($reason, 0, 4000), ':evidence_file_id' => $evidenceId, ':id' => $disputeId]);
        $bill = $pdo->prepare('UPDATE partner_weekly_bills SET status = "unpaid", updated_at = UTC_TIMESTAMP() WHERE bill_id = :bill_id');
        $bill->execute([':bill_id' => (string) $dispute['bill_id']]);
        $pdo->commit();
        jg_admin_partner_billing_recalculate($pdo, (string) $dispute['bill_id']);
        return ['ok' => true, 'dispute_id' => $disputeId, 'status' => 'rejected'];
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
}

function jg_admin_partner_billing_accounting_receipt(PDO $accountingPdo, array $payment): int
{
    if (!function_exists('jg_accounting_ensure_schema') || !function_exists('jg_accounting_create_transaction')) {
        throw new RuntimeException('Accounting integration is unavailable.');
    }
    jg_accounting_ensure_schema($accountingPdo);
    $existing = $accountingPdo->prepare('SELECT transaction_id FROM accounting_partner_bill_receipts WHERE partner_bill_id = :bill_id LIMIT 1');
    $existing->execute([':bill_id' => (string) $payment['bill_id']]);
    $transactionId = (int) ($existing->fetchColumn() ?: 0);
    if ($transactionId > 0) return $transactionId;

    $accountStmt = $accountingPdo->query(
        'SELECT id FROM accounting_accounts
         WHERE is_active = 1 AND is_spendable = 1 AND type IN ("bank", "cash", "ewallet")
         ORDER BY (account_key = "bca-main") DESC, sort_order ASC LIMIT 1'
    );
    $accountId = (int) ($accountStmt->fetchColumn() ?: 0);
    if ($accountId <= 0) throw new RuntimeException('No spendable Accounting account is available.');
    $category = $accountingPdo->prepare(
        'INSERT INTO accounting_categories
            (category_key, parent_id, name, type, requires_receipt, is_billable, is_active, sort_order)
         VALUES ("partner-bill-collections", NULL, "Partner bill collections", "income", 0, 0, 1, 12)
         ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type), is_active = 1'
    );
    $category->execute();
    $categoryStmt = $accountingPdo->prepare('SELECT id FROM accounting_categories WHERE category_key = "partner-bill-collections" LIMIT 1');
    $categoryStmt->execute();
    $categoryId = (int) ($categoryStmt->fetchColumn() ?: 0);
    if ($categoryId <= 0) throw new RuntimeException('Partner payment Accounting category is unavailable.');

    $accountingPdo->beginTransaction();
    try {
        $transaction = jg_accounting_create_transaction($accountingPdo, [
            'transaction_date' => (new DateTimeImmutable('now', new DateTimeZone('Asia/Jakarta')))->format('Y-m-d'),
            'type' => 'manual_income',
            'direction' => 'money_in',
            'status' => 'posted',
            'account_id' => $accountId,
            'category_id' => $categoryId,
            'counterparty_name' => (string) $payment['partner_name'],
            'brand' => 'Jenang Gemi',
            'channel' => 'Partner Portal',
            'amount' => (int) $payment['amount'],
            'payment_method' => 'Bank Transfer',
            'reference_no' => (string) $payment['bill_id'],
            'receipt_url' => '../api/partner-billing/?action=file&id=' . (int) $payment['proof_file_id'],
            'receipt_status' => 'attached',
            'description' => 'Confirmed partner weekly bill ' . (string) $payment['period_label'],
            'notes' => 'Posted automatically after proof-of-payment confirmation.',
        ]);
        $transactionId = (int) $transaction['id'];
        $map = $accountingPdo->prepare(
            'INSERT INTO accounting_partner_bill_receipts
                (partner_bill_id, partner_code, partner_name, amount, transaction_id, confirmed_at)
             VALUES (:bill_id, :partner_code, :partner_name, :amount, :transaction_id, UTC_TIMESTAMP())'
        );
        $map->execute([
            ':bill_id' => (string) $payment['bill_id'], ':partner_code' => (string) $payment['partner_code'],
            ':partner_name' => (string) $payment['partner_name'], ':amount' => (int) $payment['amount'],
            ':transaction_id' => $transactionId,
        ]);
        $accountingPdo->commit();
        return $transactionId;
    } catch (Throwable $error) {
        if ($accountingPdo->inTransaction()) $accountingPdo->rollBack();
        $retry = $accountingPdo->prepare('SELECT transaction_id FROM accounting_partner_bill_receipts WHERE partner_bill_id = :bill_id LIMIT 1');
        $retry->execute([':bill_id' => (string) $payment['bill_id']]);
        $existingId = (int) ($retry->fetchColumn() ?: 0);
        if ($existingId > 0) return $existingId;
        throw $error;
    }
}

function jg_admin_partner_billing_confirm_payment(PDO $partnerPdo, PDO $accountingPdo, int $paymentId): array
{
    $stmt = $partnerPdo->prepare(
        'SELECT p.*, b.period_start, b.period_end, b.total_amount,
                COALESCE(NULLIF(pr.name, ""), p.partner_code) AS partner_name
         FROM partner_weekly_bill_payments p
         JOIN partner_weekly_bills b ON b.bill_id = p.bill_id
         LEFT JOIN partner_profiles pr ON pr.code = p.partner_code
         WHERE p.id = :id LIMIT 1'
    );
    $stmt->execute([':id' => $paymentId]);
    $payment = $stmt->fetch();
    if (!is_array($payment)) throw new InvalidArgumentException('Payment submission not found.');
    if ((string) $payment['status'] === 'confirmed') {
        return ['ok' => true, 'payment_id' => $paymentId, 'transaction_id' => (int) ($payment['accounting_transaction_id'] ?? 0), 'status' => 'confirmed'];
    }
    if ((string) $payment['status'] !== 'pending') throw new InvalidArgumentException('This payment is not awaiting confirmation.');
    if ((int) $payment['amount'] !== (int) $payment['total_amount']) throw new RuntimeException('The submitted amount no longer matches the bill total.');
    $payment['period_label'] = jg_admin_partner_billing_period_label((string) $payment['period_start'], (string) $payment['period_end']);
    $transactionId = jg_admin_partner_billing_accounting_receipt($accountingPdo, $payment);

    $partnerPdo->beginTransaction();
    try {
        $lock = $partnerPdo->prepare('SELECT status FROM partner_weekly_bill_payments WHERE id = :id FOR UPDATE');
        $lock->execute([':id' => $paymentId]);
        $status = (string) ($lock->fetchColumn() ?: '');
        if ($status !== 'confirmed') {
            if ($status !== 'pending') throw new RuntimeException('Payment state changed before confirmation.');
            $update = $partnerPdo->prepare(
                'UPDATE partner_weekly_bill_payments SET status = "confirmed", confirmed_at = UTC_TIMESTAMP(),
                        accounting_transaction_id = :transaction_id, updated_at = UTC_TIMESTAMP() WHERE id = :id'
            );
            $update->execute([':transaction_id' => $transactionId, ':id' => $paymentId]);
            $bill = $partnerPdo->prepare('UPDATE partner_weekly_bills SET status = "paid", paid_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE bill_id = :bill_id');
            $bill->execute([':bill_id' => (string) $payment['bill_id']]);
            $items = $partnerPdo->prepare(
                'UPDATE partner_weekly_bill_items SET status = "paid", paid_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP()
                 WHERE bill_id = :bill_id AND status <> "removed"'
            );
            $items->execute([':bill_id' => (string) $payment['bill_id']]);
            $orders = $partnerPdo->prepare(
                'UPDATE partner_orders o
                 JOIN partner_weekly_bill_items i ON i.order_id = o.id
                 SET o.billing_status = "bill_paid", o.billing_reference = :bill_reference,
                     o.billing_paid_at = UTC_TIMESTAMP(), o.updated_at = UTC_TIMESTAMP()
                 WHERE i.bill_id = :bill_id AND i.status = "paid"'
            );
            $orders->execute([':bill_reference' => (string) $payment['bill_id'], ':bill_id' => (string) $payment['bill_id']]);
        }
        $partnerPdo->commit();
    } catch (Throwable $error) {
        if ($partnerPdo->inTransaction()) $partnerPdo->rollBack();
        throw $error;
    }
    return ['ok' => true, 'payment_id' => $paymentId, 'transaction_id' => $transactionId, 'status' => 'confirmed'];
}

function jg_admin_partner_billing_due_total(): int
{
    try {
        $pdo = jg_admin_partner_billing_db();
        jg_admin_partner_billing_sync($pdo);
        $stmt = $pdo->query(
            'SELECT COALESCE(SUM(total_amount), 0) FROM partner_weekly_bills
             WHERE status IN ("unpaid", "payment_submitted", "disputed") AND total_amount > 0'
        );
        return (int) round((float) ($stmt->fetchColumn() ?: 0));
    } catch (Throwable $error) {
        error_log('Partner bills due unavailable: ' . $error->getMessage());
        return 0;
    }
}
