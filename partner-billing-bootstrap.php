<?php
declare(strict_types=1);

require_once __DIR__ . '/partner-db-bootstrap.php';
require_once __DIR__ . '/partner-sales-bootstrap.php';

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
            period_type VARCHAR(32) NOT NULL DEFAULT "calendar_week",
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
            UNIQUE KEY uniq_partner_bill_type_period (partner_code, period_type, period_start),
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
            dispute_type VARCHAR(32) NOT NULL DEFAULT "paid",
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
            original_amount BIGINT NULL DEFAULT NULL,
            proposed_amount BIGINT NULL DEFAULT NULL,
            proposal_json LONGTEXT NULL DEFAULT NULL,
            resolved_amount BIGINT NULL DEFAULT NULL,
            resolution_json LONGTEXT NULL DEFAULT NULL,
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
        'CREATE TABLE IF NOT EXISTS partner_return_adjustments (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            adjustment_key VARCHAR(120) NOT NULL,
            return_number VARCHAR(64) NOT NULL,
            partner_code VARCHAR(64) NOT NULL,
            original_order_id VARCHAR(64) NOT NULL,
            bill_id VARCHAR(120) NOT NULL,
            bill_item_id BIGINT UNSIGNED NOT NULL,
            fault_party VARCHAR(16) NOT NULL,
            condition_code VARCHAR(24) NOT NULL,
            rate_basis_points INT UNSIGNED NOT NULL,
            selected_value BIGINT NOT NULL,
            adjustment_amount BIGINT NOT NULL,
            item_snapshot_json LONGTEXT NOT NULL,
            created_at DATETIME NOT NULL,
            UNIQUE KEY uniq_partner_return_adjustment_key (adjustment_key),
            KEY idx_partner_return_adjustments_order (partner_code, original_order_id, created_at),
            KEY idx_partner_return_adjustments_bill (bill_id, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    ];
    foreach ($statements as $statement) {
        $pdo->exec($statement);
    }
    jg_admin_partner_billing_ensure_column($pdo, 'partner_orders', 'billing_status', 'VARCHAR(32) NOT NULL DEFAULT "unbilled"');
    jg_admin_partner_billing_ensure_column($pdo, 'partner_orders', 'billing_reference', 'VARCHAR(120) NOT NULL DEFAULT ""');
    jg_admin_partner_billing_ensure_column($pdo, 'partner_orders', 'billing_paid_at', 'DATETIME NULL DEFAULT NULL');
    jg_admin_partner_billing_ensure_column($pdo, 'partner_weekly_bills', 'period_type', 'VARCHAR(32) NOT NULL DEFAULT "calendar_week" AFTER partner_code');
    jg_admin_partner_billing_ensure_column($pdo, 'partner_favicons', 'file_data', 'LONGBLOB NULL DEFAULT NULL');
    jg_admin_partner_billing_ensure_column($pdo, 'partner_weekly_bill_disputes', 'dispute_type', 'VARCHAR(32) NOT NULL DEFAULT "paid"');
    jg_admin_partner_billing_ensure_column($pdo, 'partner_weekly_bill_dispute_items', 'original_amount', 'BIGINT NULL DEFAULT NULL');
    jg_admin_partner_billing_ensure_column($pdo, 'partner_weekly_bill_dispute_items', 'proposed_amount', 'BIGINT NULL DEFAULT NULL');
    jg_admin_partner_billing_ensure_column($pdo, 'partner_weekly_bill_dispute_items', 'proposal_json', 'LONGTEXT NULL DEFAULT NULL');
    jg_admin_partner_billing_ensure_column($pdo, 'partner_weekly_bill_dispute_items', 'resolved_amount', 'BIGINT NULL DEFAULT NULL');
    jg_admin_partner_billing_ensure_column($pdo, 'partner_weekly_bill_dispute_items', 'resolution_json', 'LONGTEXT NULL DEFAULT NULL');
    jg_admin_partner_billing_ensure_index($pdo, 'partner_orders', 'idx_partner_orders_billing', '(partner_code, billing_status, billing_paid_at)');
    $legacyPeriodIndex = $pdo->prepare(
        'SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = "partner_weekly_bills" AND INDEX_NAME = "uniq_partner_bill_period"'
    );
    $legacyPeriodIndex->execute();
    if ((int) $legacyPeriodIndex->fetchColumn() > 0) {
        $pdo->exec('ALTER TABLE partner_weekly_bills DROP INDEX uniq_partner_bill_period');
    }
    $typedPeriodIndex = $pdo->prepare(
        'SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = "partner_weekly_bills" AND INDEX_NAME = "uniq_partner_bill_type_period"'
    );
    $typedPeriodIndex->execute();
    if ((int) $typedPeriodIndex->fetchColumn() === 0) {
        $pdo->exec('ALTER TABLE partner_weekly_bills ADD UNIQUE INDEX uniq_partner_bill_type_period (partner_code, period_type, period_start)');
    }
    $prepared[$key] = true;
}

function jg_admin_partner_billing_today(): string
{
    return (new DateTimeImmutable('now', new DateTimeZone('Asia/Jakarta')))->format('Y-m-d');
}

function jg_admin_partner_billing_period_type(mixed $value): string
{
    return (string) $value === 'calendar_month' ? 'calendar_month' : 'calendar_week';
}

function jg_admin_partner_billing_period(DateTimeImmutable $date, string $periodType = 'calendar_week'): array
{
    $periodType = jg_admin_partner_billing_period_type($periodType);
    $timezone = new DateTimeZone('Asia/Jakarta');
    $localDate = $date->setTimezone($timezone)->setTime(0, 0);
    if ($periodType === 'calendar_month') {
        $start = $localDate->modify('first day of this month');
        $end = $localDate->modify('last day of this month');
    } else {
        $daysSinceMonday = (int) $localDate->format('N') - 1;
        $start = $daysSinceMonday > 0 ? $localDate->modify('-' . $daysSinceMonday . ' days') : $localDate;
        $end = $start->modify('+6 days');
    }
    return [
        'type' => $periodType,
        'start' => $start->format('Y-m-d'),
        'end' => $end->format('Y-m-d'),
        'due' => $end->modify('+3 days')->format('Y-m-d'),
    ];
}

function jg_admin_partner_billing_bill_id(string $partnerCode, string $periodStart, string $periodType = 'calendar_week'): string
{
    $typeCode = jg_admin_partner_billing_period_type($periodType) === 'calendar_month' ? 'CM' : 'CW';
    return 'PB-' . $typeCode . '-' . str_replace('-', '', $periodStart) . '-' . strtoupper(substr(hash('sha256', strtoupper(trim($partnerCode))), 0, 12));
}

/** @param array<string,mixed> $bill */
function jg_admin_partner_billing_bill_is_mutable(array $bill): bool
{
    $status = (string) ($bill['status'] ?? $bill['bill_status'] ?? '');
    return in_array($status, ['accruing', 'unpaid', 'paid'], true)
        && (int) ($bill['has_active_payment'] ?? 0) === 0
        && (int) ($bill['has_active_dispute'] ?? 0) === 0;
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

/**
 * Atomically move a partner's unpaid order items into the configured PO periods.
 * Paid items and bills with an active payment or dispute remain untouched.
 *
 * @return list<string> Bill IDs recalculated after the move.
 */
function jg_admin_partner_billing_rebucket_partner(PDO $pdo, string $partnerCode, string $periodType): array
{
    jg_admin_partner_billing_ensure_schema($pdo);
    $partnerCode = strtoupper(trim($partnerCode));
    $periodType = jg_admin_partner_billing_period_type($periodType);
    if ($partnerCode === '') return [];

    $stmt = $pdo->prepare(
        'SELECT i.id, i.bill_id, i.order_date, b.status AS bill_status,
                EXISTS(
                    SELECT 1 FROM partner_weekly_bill_payments p
                    WHERE p.bill_id = b.bill_id AND p.status IN ("pending", "confirmed")
                ) AS has_active_payment,
                EXISTS(
                    SELECT 1 FROM partner_weekly_bill_disputes d
                    WHERE d.bill_id = b.bill_id AND d.status = "pending"
                ) AS has_active_dispute
         FROM partner_weekly_bill_items i
         JOIN partner_weekly_bills b ON b.bill_id = i.bill_id
         WHERE i.partner_code = :partner_code
           AND i.paid_at IS NULL
           AND i.status <> "removed"
         ORDER BY i.id ASC'
    );
    $stmt->execute([':partner_code' => $partnerCode]);

    $insertBill = $pdo->prepare(
        'INSERT IGNORE INTO partner_weekly_bills
            (bill_id, partner_code, period_type, period_start, period_end, due_date, status,
             subtotal_amount, adjustment_amount, total_amount, created_at, updated_at)
         VALUES
            (:bill_id, :partner_code, :period_type, :period_start, :period_end, :due_date, :status,
             0, 0, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP())'
    );
    $targetLookup = $pdo->prepare(
        'SELECT b.status,
                EXISTS(
                    SELECT 1 FROM partner_weekly_bill_payments p
                    WHERE p.bill_id = b.bill_id AND p.status IN ("pending", "confirmed")
                ) AS has_active_payment,
                EXISTS(
                    SELECT 1 FROM partner_weekly_bill_disputes d
                    WHERE d.bill_id = b.bill_id AND d.status = "pending"
                ) AS has_active_dispute
         FROM partner_weekly_bills b WHERE b.bill_id = :bill_id LIMIT 1'
    );
    $moveItem = $pdo->prepare(
        'UPDATE partner_weekly_bill_items SET bill_id = :bill_id, updated_at = UTC_TIMESTAMP() WHERE id = :id'
    );

    $utc = new DateTimeZone('UTC');
    $affected = [];
    $targetState = [];
    $pdo->beginTransaction();
    try {
        foreach ($stmt->fetchAll() as $item) {
            if (!jg_admin_partner_billing_bill_is_mutable($item)) continue;
            try {
                $orderDate = new DateTimeImmutable((string) $item['order_date'], $utc);
            } catch (Throwable) {
                continue;
            }
            $period = jg_admin_partner_billing_period($orderDate, $periodType);
            $targetBillId = jg_admin_partner_billing_bill_id($partnerCode, $period['start'], $periodType);
            $sourceBillId = (string) $item['bill_id'];
            if ($targetBillId === $sourceBillId) continue;

            $insertBill->execute([
                ':bill_id' => $targetBillId,
                ':partner_code' => $partnerCode,
                ':period_type' => $periodType,
                ':period_start' => $period['start'],
                ':period_end' => $period['end'],
                ':due_date' => $period['due'],
                ':status' => $period['end'] < jg_admin_partner_billing_today() ? 'unpaid' : 'accruing',
            ]);
            if (!array_key_exists($targetBillId, $targetState)) {
                $targetLookup->execute([':bill_id' => $targetBillId]);
                $targetState[$targetBillId] = $targetLookup->fetch() ?: null;
            }
            if (!is_array($targetState[$targetBillId]) || !jg_admin_partner_billing_bill_is_mutable($targetState[$targetBillId])) {
                continue;
            }

            $moveItem->execute([':bill_id' => $targetBillId, ':id' => (int) $item['id']]);
            $affected[$sourceBillId] = true;
            $affected[$targetBillId] = true;
        }

        foreach (array_keys($affected) as $billId) {
            jg_admin_partner_billing_recalculate($pdo, $billId);
        }
        $deleteEmpty = $pdo->prepare(
            'DELETE FROM partner_weekly_bills
             WHERE partner_code = :partner_code
               AND status IN ("accruing", "unpaid", "paid")
               AND NOT EXISTS(SELECT 1 FROM partner_weekly_bill_items i WHERE i.bill_id = partner_weekly_bills.bill_id)
               AND NOT EXISTS(SELECT 1 FROM partner_weekly_bill_payments p WHERE p.bill_id = partner_weekly_bills.bill_id)
               AND NOT EXISTS(SELECT 1 FROM partner_weekly_bill_disputes d WHERE d.bill_id = partner_weekly_bills.bill_id)
               AND NOT EXISTS(SELECT 1 FROM partner_weekly_bill_files f WHERE f.bill_id = partner_weekly_bills.bill_id)'
        );
        $deleteEmpty->execute([':partner_code' => $partnerCode]);
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }

    return array_keys($affected);
}

/**
 * Merge an audit-only legacy PO into the canonical PO when both describe the
 * same exact configured period. Active payments and disputes still freeze both
 * records; accepted/rejected history is moved with its items and attachments.
 *
 * @return list<string> Canonical bill IDs recalculated after the merge.
 */
function jg_admin_partner_billing_merge_duplicate_periods(PDO $pdo, string $partnerCode, string $periodType): array
{
    jg_admin_partner_billing_ensure_schema($pdo);
    $partnerCode = strtoupper(trim($partnerCode));
    $periodType = jg_admin_partner_billing_period_type($periodType);
    if ($partnerCode === '') return [];

    $sourceStmt = $pdo->prepare(
        'SELECT b.*,
                EXISTS(
                    SELECT 1 FROM partner_weekly_bill_payments p
                    WHERE p.bill_id = b.bill_id AND p.status IN ("pending", "confirmed")
                ) AS has_active_payment,
                EXISTS(
                    SELECT 1 FROM partner_weekly_bill_disputes d
                    WHERE d.bill_id = b.bill_id AND d.status = "pending"
                ) AS has_active_dispute,
                EXISTS(SELECT 1 FROM partner_weekly_bill_payments p WHERE p.bill_id = b.bill_id) AS has_any_payment
         FROM partner_weekly_bills b
         WHERE b.partner_code = :partner_code
         ORDER BY b.created_at ASC, b.bill_id ASC'
    );
    $sourceStmt->execute([':partner_code' => $partnerCode]);
    $sources = $sourceStmt->fetchAll();
    $targetStmt = $pdo->prepare(
        'SELECT b.*,
                EXISTS(
                    SELECT 1 FROM partner_weekly_bill_payments p
                    WHERE p.bill_id = b.bill_id AND p.status IN ("pending", "confirmed")
                ) AS has_active_payment,
                EXISTS(
                    SELECT 1 FROM partner_weekly_bill_disputes d
                    WHERE d.bill_id = b.bill_id AND d.status = "pending"
                ) AS has_active_dispute,
                EXISTS(SELECT 1 FROM partner_weekly_bill_payments p WHERE p.bill_id = b.bill_id) AS has_any_payment
         FROM partner_weekly_bills b
         WHERE b.bill_id = :bill_id
         LIMIT 1 FOR UPDATE'
    );
    $moveItems = $pdo->prepare('UPDATE partner_weekly_bill_items SET bill_id = :target_id, updated_at = UTC_TIMESTAMP() WHERE bill_id = :source_id');
    $moveDisputes = $pdo->prepare('UPDATE partner_weekly_bill_disputes SET bill_id = :target_id, updated_at = UTC_TIMESTAMP() WHERE bill_id = :source_id');
    $moveFiles = $pdo->prepare('UPDATE partner_weekly_bill_files SET bill_id = :target_id WHERE bill_id = :source_id');
    $movePayments = $pdo->prepare('UPDATE partner_weekly_bill_payments SET bill_id = :target_id, updated_at = UTC_TIMESTAMP() WHERE bill_id = :source_id');
    $moveOrderReferences = $pdo->prepare(
        'UPDATE partner_orders SET billing_reference = :target_id, updated_at = UTC_TIMESTAMP()
         WHERE partner_code = :partner_code AND billing_reference = :source_id'
    );
    $deleteSource = $pdo->prepare('DELETE FROM partner_weekly_bills WHERE bill_id = :source_id');
    $timezone = new DateTimeZone('Asia/Jakarta');
    $merged = [];

    $pdo->beginTransaction();
    try {
        foreach ($sources as $source) {
            if (jg_admin_partner_billing_period_type($source['period_type'] ?? null) !== $periodType
                || !jg_admin_partner_billing_bill_is_mutable($source)) {
                continue;
            }
            try {
                $sourceStart = new DateTimeImmutable((string) $source['period_start'], $timezone);
            } catch (Throwable) {
                continue;
            }
            $period = jg_admin_partner_billing_period($sourceStart, $periodType);
            if ((string) ($source['period_start'] ?? '') !== $period['start']
                || (string) ($source['period_end'] ?? '') !== $period['end']) {
                continue;
            }

            $sourceId = (string) ($source['bill_id'] ?? '');
            $targetId = jg_admin_partner_billing_bill_id($partnerCode, $period['start'], $periodType);
            if ($sourceId === '' || $sourceId === $targetId) continue;

            $targetStmt->execute([':bill_id' => $targetId]);
            $target = $targetStmt->fetch();
            if (!is_array($target)
                || (string) ($target['period_start'] ?? '') !== $period['start']
                || (string) ($target['period_end'] ?? '') !== $period['end']
                || !jg_admin_partner_billing_bill_is_mutable($target)
                || ((int) ($source['has_any_payment'] ?? 0) !== 0 && (int) ($target['has_any_payment'] ?? 0) !== 0)) {
                continue;
            }

            $params = [':target_id' => $targetId, ':source_id' => $sourceId];
            $moveItems->execute($params);
            $moveDisputes->execute($params);
            $moveFiles->execute($params);
            $movePayments->execute($params);
            $moveOrderReferences->execute($params + [':partner_code' => $partnerCode]);
            $deleteSource->execute([':source_id' => $sourceId]);
            jg_admin_partner_billing_recalculate($pdo, $targetId);
            $merged[$targetId] = true;
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }

    return array_keys($merged);
}

function jg_admin_partner_billing_recalculate(PDO $pdo, string $billId): void
{
    $totalsStmt = $pdo->prepare(
        'SELECT COALESCE(SUM(COALESCE((
                    SELECT di.original_amount
                    FROM partner_weekly_bill_dispute_items di
                    JOIN partner_weekly_bill_disputes d ON d.id = di.dispute_id
                    WHERE di.bill_item_id = i.id AND d.status = "accepted" AND d.dispute_type = "price"
                    ORDER BY COALESCE(d.resolved_at, d.updated_at) DESC, d.id DESC LIMIT 1
                ), i.amount)), 0) AS subtotal,
                COALESCE(SUM(CASE WHEN i.status <> "removed" THEN i.amount ELSE 0 END), 0) AS total
         FROM partner_weekly_bill_items i WHERE i.bill_id = :bill_id'
    );
    $totalsStmt->execute([':bill_id' => $billId]);
    $totals = $totalsStmt->fetch() ?: [];
    $subtotal = (int) round((float) ($totals['subtotal'] ?? 0));
    $total = (int) round((float) ($totals['total'] ?? 0));
    $billStmt = $pdo->prepare(
        'SELECT b.status, b.period_end,
                EXISTS(
                    SELECT 1 FROM partner_weekly_bill_payments p
                    WHERE p.bill_id = b.bill_id AND p.status = "confirmed"
                ) AS has_confirmed_payment
         FROM partner_weekly_bills b WHERE b.bill_id = :bill_id LIMIT 1'
    );
    $billStmt->execute([':bill_id' => $billId]);
    $bill = $billStmt->fetch();
    if (!is_array($bill)) return;
    $status = (string) $bill['status'];
    if (!in_array($status, ['payment_submitted', 'disputed'], true)
        && !($status === 'paid' && (int) ($bill['has_confirmed_payment'] ?? 0) === 1)) {
        $status = (string) $bill['period_end'] < jg_admin_partner_billing_today() ? 'unpaid' : 'accruing';
    }
    if ($total <= 0 && (string) $bill['period_end'] < jg_admin_partner_billing_today()) $status = 'paid';
    $update = $pdo->prepare(
        'UPDATE partner_weekly_bills SET subtotal_amount = :subtotal, adjustment_amount = :adjustment,
                total_amount = :total, status = :status,
                paid_at = CASE WHEN :clear_paid = 1 THEN NULL WHEN :mark_paid = 1 AND paid_at IS NULL THEN UTC_TIMESTAMP() ELSE paid_at END,
                updated_at = UTC_TIMESTAMP() WHERE bill_id = :bill_id'
    );
    $update->execute([
        ':subtotal' => $subtotal,
        ':adjustment' => max(0, $subtotal - $total),
        ':total' => $total,
        ':status' => $status,
        ':mark_paid' => $status === 'paid' ? 1 : 0,
        ':clear_paid' => $status === 'paid' ? 0 : 1,
        ':bill_id' => $billId,
    ]);
}

function jg_admin_partner_billing_sync(PDO $pdo): void
{
    jg_admin_partner_billing_ensure_schema($pdo);
    $periodTypes = [];
    $profileStmt = $pdo->query('SELECT code, billing_period_type FROM partner_profiles');
    foreach ($profileStmt->fetchAll() as $profile) {
        $code = strtoupper(trim((string) ($profile['code'] ?? '')));
        if ($code === '') continue;
        $periodTypes[$code] = jg_admin_partner_billing_period_type($profile['billing_period_type'] ?? null);
    }
    foreach ($periodTypes as $code => $periodType) {
        jg_admin_partner_billing_rebucket_partner($pdo, $code, $periodType);
    }
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
            $periodType = $periodTypes[$partnerCode] ?? 'calendar_week';
            $period = jg_admin_partner_billing_period($date, $periodType);
            $billId = jg_admin_partner_billing_bill_id($partnerCode, $period['start'], $periodType);
            $billIds[$billId] = true;
            $billInsert = $pdo->prepare(
                'INSERT IGNORE INTO partner_weekly_bills
                    (bill_id, partner_code, period_type, period_start, period_end, due_date, status, created_at, updated_at)
                 VALUES (:bill_id, :partner_code, :period_type, :period_start, :period_end, :due_date, :status, UTC_TIMESTAMP(), UTC_TIMESTAMP())'
            );
            $billInsert->execute([
                ':bill_id' => $billId,
                ':partner_code' => $partnerCode,
                ':period_type' => $periodType,
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
        foreach (array_keys($billIds) as $billId) {
            jg_admin_partner_billing_recalculate($pdo, $billId);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
    foreach ($periodTypes as $code => $periodType) {
        foreach (jg_admin_partner_billing_merge_duplicate_periods($pdo, $code, $periodType) as $billId) {
            $billIds[$billId] = true;
        }
    }
    foreach ($pdo->query('SELECT bill_id FROM partner_weekly_bills')->fetchAll(PDO::FETCH_COLUMN) as $billId) {
        $billIds[(string) $billId] = true;
    }
    foreach (array_keys($billIds) as $billId) jg_admin_partner_billing_recalculate($pdo, $billId);
    jg_admin_partner_billing_repair_misclassified_price_disputes($pdo);
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
                    i.amount, i.status, i.removed_reason, i.snapshot_json, di.original_amount, di.proposed_amount,
                    di.proposal_json, di.resolved_amount, di.resolution_json
             FROM partner_weekly_bill_dispute_items di
             JOIN partner_weekly_bill_items i ON i.id = di.bill_item_id
             WHERE di.dispute_id = :dispute_id ORDER BY i.order_date ASC, i.id ASC'
        );
        $stmt->execute([':dispute_id' => $disputeId]);
    } else {
        $stmt = $pdo->prepare(
            'SELECT id, order_id, order_date, platform, customer_name, description, units, amount, status, removed_reason, snapshot_json
             FROM partner_weekly_bill_items WHERE bill_id = :bill_id ORDER BY order_date ASC, id ASC'
        );
        $stmt->execute([':bill_id' => $billId]);
    }
    return array_map(static function (array $item): array {
        $snapshot = json_decode((string) ($item['snapshot_json'] ?? ''), true);
        $proposal = json_decode((string) ($item['proposal_json'] ?? ''), true);
        $resolution = json_decode((string) ($item['resolution_json'] ?? ''), true);
        $priceLines = [];
        if (is_array($proposal) && is_array($proposal['lines'] ?? null)) {
            $priceLines = array_values(array_filter($proposal['lines'], 'is_array'));
        } else {
            $sourceLines = is_array($snapshot) ? array_values(array_filter((array) ($snapshot['items'] ?? []), 'is_array')) : [];
            if ($sourceLines === []) {
                $quantity = max(1, (int) ($item['units'] ?? 1));
                $sourceLines = [[
                    'sku_code' => '', 'sku_label' => (string) ($item['description'] ?? 'Order total'),
                    'quantity' => $quantity, 'unit_revenue' => ((float) ($item['amount'] ?? 0)) / $quantity,
                ]];
            }
            foreach ($sourceLines as $index => $line) {
                $unitPrice = (int) round((float) ($line['unit_revenue'] ?? $line['partner_price'] ?? $line['partner_unit_price'] ?? 0));
                $priceLines[] = [
                    'line_index' => $index,
                    'sku_code' => (string) ($line['sku_code'] ?? ''),
                    'label' => trim((string) ($line['sku_label'] ?? $line['product'] ?? $line['sku_code'] ?? '')) ?: 'Product ' . ($index + 1),
                    'quantity' => max(1, (int) ($line['quantity'] ?? 1)),
                    'original_unit_price' => $unitPrice,
                    'proposed_unit_price' => $unitPrice,
                ];
            }
        }
        return [
            'id' => (int) $item['id'], 'order_id' => (string) $item['order_id'],
            'order_date' => (string) $item['order_date'], 'platform' => (string) $item['platform'],
            'customer_name' => (string) $item['customer_name'], 'description' => (string) $item['description'],
            'units' => (int) $item['units'], 'amount' => (int) $item['amount'], 'status' => (string) $item['status'],
            'removed_reason' => (string) ($item['removed_reason'] ?? ''),
            'snapshot' => is_array($snapshot) ? $snapshot : [],
            'original_amount' => isset($item['original_amount']) ? (int) $item['original_amount'] : (int) $item['amount'],
            'proposed_amount' => isset($item['proposed_amount']) ? (int) $item['proposed_amount'] : (int) $item['amount'],
            'resolved_amount' => isset($item['resolved_amount']) ? (int) $item['resolved_amount'] : null,
            'proposal' => is_array($proposal) ? $proposal : null,
            'resolution' => is_array($resolution) ? $resolution : null,
            'price_lines' => $priceLines,
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
                b.period_type, b.period_start, b.period_end, b.due_date, b.total_amount,
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
            'period_type' => jg_admin_partner_billing_period_type($row['period_type'] ?? null),
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
        'SELECT d.id, d.dispute_key, d.bill_id, d.partner_code, d.dispute_type, d.reason, d.created_at,
                b.period_type, b.period_start, b.period_end, b.total_amount,
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
            'dispute_type' => (string) ($row['dispute_type'] ?? 'paid'),
            'partner_code' => (string) $row['partner_code'],
            'partner_name' => (string) $row['partner_name'],
            'bill_id' => (string) $row['bill_id'],
            'period_type' => jg_admin_partner_billing_period_type($row['period_type'] ?? null),
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

function jg_admin_partner_billing_dispute_history(PDO $pdo, string $partnerCode, string $endpoint, ?string $periodStart = null): array
{
    $partnerCode = strtoupper(trim($partnerCode));
    if ($partnerCode === '') throw new InvalidArgumentException('Partner code is required.');

    jg_admin_partner_billing_sync($pdo);
    $windowStmt = $pdo->prepare(
        'SELECT b.period_start, b.period_end, b.status AS bill_status,
                COUNT(d.id) AS dispute_count,
                COALESCE(SUM(CASE WHEN d.status = "pending" THEN 1 ELSE 0 END), 0) AS pending_count
         FROM partner_weekly_bills b
         LEFT JOIN partner_weekly_bill_disputes d ON d.bill_id = b.bill_id
         WHERE b.partner_code = :partner_code
         GROUP BY b.bill_id, b.period_start, b.period_end, b.status
         ORDER BY b.period_start DESC
         LIMIT 104'
    );
    $windowStmt->execute([':partner_code' => $partnerCode]);
    $windows = array_map(static fn (array $row): array => [
        'period_start' => (string) $row['period_start'],
        'period_end' => (string) $row['period_end'],
        'period_label' => jg_admin_partner_billing_period_label((string) $row['period_start'], (string) $row['period_end']),
        'bill_status' => (string) $row['bill_status'],
        'dispute_count' => (int) $row['dispute_count'],
        'pending_count' => (int) $row['pending_count'],
    ], $windowStmt->fetchAll());

    if ($periodStart !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $periodStart)) {
        throw new InvalidArgumentException('Billing window is invalid.');
    }
    if ($periodStart === null && $windows !== []) {
        $disputedWindow = current(array_values(array_filter($windows, static fn (array $window): bool => $window['dispute_count'] > 0)));
        $periodStart = is_array($disputedWindow) ? (string) $disputedWindow['period_start'] : (string) $windows[0]['period_start'];
    }

    $selectedWindow = null;
    foreach ($windows as $window) {
        if ($window['period_start'] === $periodStart) {
            $selectedWindow = $window;
            break;
        }
    }
    if ($periodStart !== null && $selectedWindow === null) {
        throw new InvalidArgumentException('Billing window was not found for this partner.');
    }

    $disputes = [];
    if ($selectedWindow !== null) {
        $fileStmt = $pdo->prepare(
            'SELECT f.id, f.bill_id, f.file_kind, f.original_name, f.mime_type, f.size_bytes, f.created_at
             FROM partner_weekly_bill_files f
             JOIN partner_weekly_bills b ON b.bill_id = f.bill_id
             WHERE f.partner_code = :partner_code AND b.period_start = :period_start
             ORDER BY f.created_at ASC, f.id ASC'
        );
        $fileStmt->execute([':partner_code' => $partnerCode, ':period_start' => $selectedWindow['period_start']]);
        $attachmentsByBill = [];
        foreach ($fileStmt->fetchAll() as $file) {
            $fileId = (int) $file['id'];
            $kind = (string) $file['file_kind'];
            $attachmentsByBill[(string) $file['bill_id']][] = [
                'id' => $fileId,
                'kind' => $kind,
                'label' => $kind === 'payment_proof' ? 'Partner payment proof' : ($kind === 'rejection_evidence' ? 'Finance evidence' : 'Billing attachment'),
                'url' => $endpoint . '?' . http_build_query(['action' => 'file', 'id' => $fileId]),
                'name' => (string) $file['original_name'],
                'mime_type' => (string) $file['mime_type'],
                'size_bytes' => (int) $file['size_bytes'],
                'created_at' => (string) $file['created_at'],
            ];
        }
        $stmt = $pdo->prepare(
            'SELECT d.id, d.dispute_key, d.bill_id, d.partner_code, d.dispute_type, d.reason, d.status,
                    d.resolution_reason, d.evidence_file_id, d.created_at, d.resolved_at, d.updated_at,
                    f.original_name AS evidence_name, f.mime_type AS evidence_mime, f.size_bytes AS evidence_size,
                    COALESCE(NULLIF(pr.name, ""), d.partner_code) AS partner_name
             FROM partner_weekly_bill_disputes d
             JOIN partner_weekly_bills b ON b.bill_id = d.bill_id
             LEFT JOIN partner_weekly_bill_files f ON f.id = d.evidence_file_id
             LEFT JOIN partner_profiles pr ON pr.code = d.partner_code
             WHERE d.partner_code = :partner_code AND b.period_start = :period_start
             ORDER BY d.created_at DESC, d.id DESC'
        );
        $stmt->execute([':partner_code' => $partnerCode, ':period_start' => $selectedWindow['period_start']]);
        foreach ($stmt->fetchAll() as $row) {
            $items = jg_admin_partner_billing_items($pdo, (string) $row['bill_id'], (int) $row['id']);
            $messages = [[
                'side' => 'partner',
                'author' => (string) $row['partner_name'],
                'label' => 'Partner message',
                'body' => (string) $row['reason'],
                'created_at' => (string) $row['created_at'],
            ]];
            if ((string) ($row['resolved_at'] ?? '') !== '') {
                $messages[] = [
                    'side' => 'finance',
                    'author' => 'Jenang Gemi Finance',
                    'label' => (string) $row['status'] === 'accepted' ? 'Dispute accepted' : 'Finance response',
                    'body' => trim((string) ($row['resolution_reason'] ?? '')) ?: 'The dispute was resolved by finance.',
                    'created_at' => (string) $row['resolved_at'],
                ];
            }
            $evidenceId = (int) ($row['evidence_file_id'] ?? 0);
            $disputes[] = [
                'id' => (int) $row['id'],
                'dispute_key' => (string) $row['dispute_key'],
                'bill_id' => (string) $row['bill_id'],
                'type' => (string) ($row['dispute_type'] ?? 'paid'),
                'status' => (string) $row['status'],
                'amount' => array_sum(array_map(static fn (array $item): int => (int) $item['amount'], $items)),
                'items' => $items,
                'messages' => $messages,
                'attachments' => $attachmentsByBill[(string) $row['bill_id']] ?? [],
                'created_at' => (string) $row['created_at'],
                'resolved_at' => (string) ($row['resolved_at'] ?? ''),
                'evidence' => $evidenceId > 0 ? [
                    'url' => $endpoint . '?' . http_build_query(['action' => 'file', 'id' => $evidenceId]),
                    'name' => (string) ($row['evidence_name'] ?? 'Finance evidence'),
                    'mime_type' => (string) ($row['evidence_mime'] ?? ''),
                    'size_bytes' => (int) ($row['evidence_size'] ?? 0),
                ] : null,
            ];
        }
    }

    $statuses = ['pending' => 0, 'accepted' => 0, 'rejected' => 0];
    foreach ($disputes as $dispute) {
        if (array_key_exists($dispute['status'], $statuses)) $statuses[$dispute['status']]++;
    }
    return [
        'partner_code' => $partnerCode,
        'windows' => $windows,
        'window' => $selectedWindow,
        'disputes' => $disputes,
        'summary' => [
            'count' => count($disputes),
            'amount' => array_sum(array_column($disputes, 'amount')),
            'statuses' => $statuses,
        ],
    ];
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

/**
 * Build a validated order-price resolution while retaining the product snapshot.
 *
 * @return array{amount:int,snapshot:array<string,mixed>,items:list<array<string,mixed>>,resolution:array<string,mixed>}
 */
function jg_admin_partner_billing_price_resolution(array $item, mixed $adjustment = null): array
{
    $adjustment = is_array($adjustment) ? $adjustment : [];
    $requested = [];
    foreach ((array) ($adjustment['lines'] ?? []) as $line) {
        if (!is_array($line)) continue;
        $index = filter_var($line['line_index'] ?? null, FILTER_VALIDATE_INT);
        if ($index === false || $index < 0 || $index > 999) continue;
        $requested[$index] = $line;
    }

    $snapshot = is_array($item['snapshot'] ?? null) ? $item['snapshot'] : [];
    $sourceItems = array_values(array_filter((array) ($snapshot['items'] ?? []), 'is_array'));
    $hasStoredItems = $sourceItems !== [];
    if (!$hasStoredItems) {
        $quantity = max(1, (int) ($item['units'] ?? 1));
        $sourceItems = [[
            'sku_code' => '', 'sku_label' => (string) ($item['description'] ?? 'Order total'),
            'quantity' => $quantity, 'unit_revenue' => ((float) ($item['amount'] ?? 0)) / $quantity,
        ]];
    }

    $resolvedItems = [];
    $resolutionLines = [];
    $amount = 0;
    foreach ($sourceItems as $index => $source) {
        $line = $requested[$index] ?? null;
        $rawPrice = is_array($line) ? ($line['unit_price'] ?? $line['proposed_unit_price'] ?? null) : null;
        if (!is_numeric($rawPrice)) throw new InvalidArgumentException('Enter a valid price for every product.');
        $unitPrice = (int) round((float) $rawPrice);
        if ($unitPrice < 0 || $unitPrice > 1000000000000) {
            throw new InvalidArgumentException('Each product price must be between Rp 0 and Rp 1,000,000,000,000.');
        }
        $quantity = max(1, (int) ($source['quantity'] ?? 1));
        $lineAmount = $unitPrice * $quantity;
        $amount += $lineAmount;
        $source['unit_revenue'] = $unitPrice;
        $source['partner_unit_price'] = $unitPrice;
        $source['partner_price'] = $unitPrice;
        $source['line_revenue'] = $lineAmount;
        $resolvedItems[] = $source;
        $resolutionLines[] = [
            'line_index' => $index,
            'sku_code' => (string) ($source['sku_code'] ?? ''),
            'label' => trim((string) ($source['sku_label'] ?? $source['product'] ?? $source['sku_code'] ?? '')) ?: 'Product ' . ($index + 1),
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'line_amount' => $lineAmount,
        ];
    }
    if ($hasStoredItems) $snapshot['items'] = $resolvedItems;
    $snapshot['price_adjusted_at'] = gmdate(DATE_ATOM);
    $resolution = ['order_id' => (string) ($item['order_id'] ?? ''), 'amount' => $amount, 'lines' => $resolutionLines];
    return ['amount' => $amount, 'snapshot' => $snapshot, 'items' => $hasStoredItems ? $resolvedItems : [], 'resolution' => $resolution];
}

/**
 * Detect price intent from the preserved per-product proposal. Comparing the
 * lines is essential because two edits can offset one another in the total.
 */
function jg_admin_partner_billing_price_proposal_changed(array $item): bool
{
    foreach ((array) ($item['price_lines'] ?? []) as $line) {
        if (!is_array($line)) continue;
        if ((int) ($line['proposed_unit_price'] ?? 0) !== (int) ($line['original_unit_price'] ?? 0)) {
            return true;
        }
    }
    return (int) ($item['proposed_amount'] ?? 0) !== (int) ($item['original_amount'] ?? 0);
}

function jg_admin_partner_billing_dispute_has_price_proposal(PDO $pdo, int $disputeId): bool
{
    $stmt = $pdo->prepare('SELECT bill_id, dispute_type FROM partner_weekly_bill_disputes WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $disputeId]);
    $dispute = $stmt->fetch();
    if (!is_array($dispute)) return false;
    if ((string) ($dispute['dispute_type'] ?? '') === 'price') return true;
    foreach (jg_admin_partner_billing_items($pdo, (string) $dispute['bill_id'], $disputeId) as $item) {
        if (jg_admin_partner_billing_price_proposal_changed($item)) return true;
    }
    return false;
}

function jg_admin_partner_billing_resolve_price(PDO $pdo, int $disputeId, ?array $adjustments = null, bool $repairAccepted = false): array
{
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('SELECT * FROM partner_weekly_bill_disputes WHERE id = :id FOR UPDATE');
        $stmt->execute([':id' => $disputeId]);
        $dispute = $stmt->fetch();
        if (!is_array($dispute)) throw new InvalidArgumentException('Dispute not found.');
        $isRepair = $repairAccepted
            && (string) $dispute['status'] === 'accepted'
            && in_array((string) ($dispute['dispute_type'] ?? 'paid'), ['paid', 'price'], true);
        if ((string) $dispute['status'] !== 'pending' && !$isRepair) {
            throw new InvalidArgumentException('This dispute has already been resolved.');
        }

        $items = jg_admin_partner_billing_items($pdo, (string) $dispute['bill_id'], $disputeId);
        if ($items === []) throw new RuntimeException('This dispute no longer has editable orders.');
        if ($isRepair) {
            $hasChangedPrice = false;
            foreach ($items as $item) {
                $hasChangedPrice = $hasChangedPrice || jg_admin_partner_billing_price_proposal_changed($item);
                if ((string) $item['status'] !== 'removed' || (string) $item['removed_reason'] !== 'Accepted already-paid dispute') {
                    throw new RuntimeException('The affected order is no longer in the removable dispute state.');
                }
            }
            if (!$hasChangedPrice) throw new RuntimeException('The accepted dispute has no changed product price to restore.');
        }
        $adjustmentByOrder = [];
        foreach ((array) $adjustments as $adjustment) {
            if (!is_array($adjustment)) continue;
            $orderId = trim((string) ($adjustment['order_id'] ?? ''));
            if ($orderId !== '') $adjustmentByOrder[$orderId] = $adjustment;
        }

        $updateItem = $pdo->prepare(
            'UPDATE partner_weekly_bill_items SET amount = :amount, status = "included",
                    removed_reason = "Price adjusted by finance", snapshot_json = :snapshot_json,
                    paid_at = NULL, updated_at = UTC_TIMESTAMP() WHERE id = :id'
        );
        $updateLink = $pdo->prepare(
            'UPDATE partner_weekly_bill_dispute_items SET resolved_amount = :resolved_amount,
                    resolution_json = :resolution_json WHERE dispute_id = :dispute_id AND bill_item_id = :bill_item_id'
        );
        $updateOrder = $pdo->prepare(
            'UPDATE partner_orders SET revenue_total = :amount,
                    items_json = CASE WHEN :replace_items = 1 THEN :items_json ELSE items_json END,
                    billing_status = "unbilled", billing_reference = :bill_id, billing_paid_at = NULL,
                    updated_at = UTC_TIMESTAMP() WHERE id = :order_id AND partner_code = :partner_code'
        );
        $resolvedTotal = 0;
        foreach ($items as $item) {
            $orderId = (string) $item['order_id'];
            $adjustment = $adjustments === null
                ? ['order_id' => $orderId, 'lines' => array_map(static fn (array $line): array => [
                    'line_index' => (int) ($line['line_index'] ?? 0),
                    'unit_price' => $line['proposed_unit_price'] ?? $line['original_unit_price'] ?? 0,
                ], (array) ($item['price_lines'] ?? []))]
                : ($adjustmentByOrder[$orderId] ?? null);
            if (!is_array($adjustment)) throw new InvalidArgumentException('Submit prices for every disputed order.');
            $resolved = jg_admin_partner_billing_price_resolution($item, $adjustment);
            $resolvedTotal += $resolved['amount'];
            $updateItem->execute([
                ':amount' => $resolved['amount'], ':snapshot_json' => json_encode($resolved['snapshot'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                ':id' => (int) $item['id'],
            ]);
            $updateLink->execute([
                ':resolved_amount' => $resolved['amount'],
                ':resolution_json' => json_encode($resolved['resolution'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                ':dispute_id' => $disputeId, ':bill_item_id' => (int) $item['id'],
            ]);
            $updateOrder->execute([
                ':amount' => $resolved['amount'], ':replace_items' => $resolved['items'] !== [] ? 1 : 0,
                ':items_json' => json_encode($resolved['items'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                ':bill_id' => (string) $dispute['bill_id'],
                ':order_id' => $orderId, ':partner_code' => (string) $dispute['partner_code'],
            ]);
        }

        $resolutionReason = $isRepair
            ? 'Partner proposed prices restored after correcting dispute classification.'
            : ($adjustments === null ? 'Partner proposed prices accepted by finance.' : 'Prices adjusted by finance after investigation.');
        $resolve = $pdo->prepare(
            'UPDATE partner_weekly_bill_disputes SET status = "accepted", dispute_type = "price",
                    resolution_reason = :reason, resolved_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = :id'
        );
        $resolve->execute([':reason' => $resolutionReason, ':id' => $disputeId]);
        $bill = $pdo->prepare('UPDATE partner_weekly_bills SET status = "unpaid", paid_at = NULL, updated_at = UTC_TIMESTAMP() WHERE bill_id = :bill_id');
        $bill->execute([':bill_id' => (string) $dispute['bill_id']]);
        $pdo->commit();
        jg_admin_partner_billing_recalculate($pdo, (string) $dispute['bill_id']);
        return ['ok' => true, 'dispute_id' => $disputeId, 'status' => 'accepted', 'resolution' => 'price', 'resolved_total' => $resolvedTotal];
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
}

/**
 * Repair only the legacy acceptance signature that removed an item despite a
 * preserved changed-price proposal. The operation is idempotent: repaired
 * disputes are reclassified as price disputes and no longer match this query.
 */
function jg_admin_partner_billing_repair_misclassified_price_disputes(PDO $pdo): int
{
    $ids = $pdo->query(
        'SELECT DISTINCT d.id
         FROM partner_weekly_bill_disputes d
         JOIN partner_weekly_bill_dispute_items di ON di.dispute_id = d.id
         JOIN partner_weekly_bill_items i ON i.id = di.bill_item_id
         WHERE d.status = "accepted" AND d.dispute_type IN ("paid", "price")
           AND i.status = "removed" AND i.removed_reason = "Accepted already-paid dispute"
           AND di.proposal_json IS NOT NULL
         ORDER BY d.id ASC LIMIT 50'
    )->fetchAll(PDO::FETCH_COLUMN);
    $repaired = 0;
    foreach ($ids as $id) {
        $disputeId = (int) $id;
        try {
            if (!jg_admin_partner_billing_dispute_has_price_proposal($pdo, $disputeId)) continue;
            jg_admin_partner_billing_resolve_price($pdo, $disputeId, null, true);
            $repaired++;
        } catch (Throwable $error) {
            error_log('Misclassified partner price dispute ' . $disputeId . ' could not be repaired: ' . $error->getMessage());
        }
    }
    return $repaired;
}

function jg_admin_partner_billing_adjust_dispute(PDO $pdo, int $disputeId, array $adjustments): array
{
    if ($adjustments === []) throw new InvalidArgumentException('Submit at least one adjusted order price.');
    return jg_admin_partner_billing_resolve_price($pdo, $disputeId, $adjustments);
}

function jg_admin_partner_billing_accept_dispute(PDO $pdo, int $disputeId): array
{
    if (jg_admin_partner_billing_dispute_has_price_proposal($pdo, $disputeId)) {
        return jg_admin_partner_billing_resolve_price($pdo, $disputeId);
    }

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

function jg_admin_partner_billing_sync_confirmed_order_payments(
    PDO $partnerPdo,
    PDO $accountingPdo,
    ?string $billId = null,
    ?string $partnerCode = null
): int {
    jg_admin_partner_billing_ensure_schema($partnerPdo);
    jg_partner_sales_ensure_schema($accountingPdo);

    $where = ['p.status = "confirmed"', 'i.status = "paid"'];
    $params = [];
    if ($billId !== null && trim($billId) !== '') {
        $where[] = 'p.bill_id = :bill_id';
        $params[':bill_id'] = trim($billId);
    }
    if ($partnerCode !== null && trim($partnerCode) !== '') {
        $where[] = 'p.partner_code = :partner_code';
        $params[':partner_code'] = strtoupper(trim($partnerCode));
    }
    $stmt = $partnerPdo->prepare(
        'SELECT p.bill_id, p.partner_code, p.proof_file_id, p.accounting_transaction_id, p.submitted_at,
                COALESCE(p.confirmed_at, p.updated_at) AS confirmed_at,
                i.order_id, i.amount, f.original_name AS proof_name,
                f.mime_type AS proof_mime_type, f.size_bytes AS proof_size_bytes
         FROM partner_weekly_bill_payments p
         JOIN partner_weekly_bill_items i ON i.bill_id = p.bill_id
         JOIN partner_weekly_bill_files f ON f.id = p.proof_file_id
         WHERE ' . implode(' AND ', $where) . '
         ORDER BY p.confirmed_at ASC, i.id ASC'
    );
    $stmt->execute($params);
    $rows = array_values(array_filter($stmt->fetchAll(), 'is_array'));
    if ($rows === []) return 0;

    $insert = $accountingPdo->prepare(
        'INSERT INTO partner_order_payments
            (partner_code, order_id, amount, payment_date, payment_method, reference_no, notes,
             source_type, source_reference, source_submitted_at, source_confirmed_at, proof_file_id,
             proof_name, proof_mime_type, proof_size_bytes, source_accounting_transaction_id,
             created_at, voided_at, void_reason)
         VALUES
            (:partner_code, :order_id, :amount, :payment_date, "Partner bill", :reference_no,
             "Confirmed from partner proof of payment.", "partner_weekly_bill", :source_reference,
             :source_submitted_at, :source_confirmed_at, :proof_file_id,
             :proof_name, :proof_mime_type, :proof_size_bytes,
             :source_accounting_transaction_id, UTC_TIMESTAMP(), NULL, "")
         ON DUPLICATE KEY UPDATE
            amount = VALUES(amount), payment_date = VALUES(payment_date),
            source_submitted_at = VALUES(source_submitted_at), source_confirmed_at = VALUES(source_confirmed_at),
            proof_file_id = VALUES(proof_file_id), proof_name = VALUES(proof_name),
            proof_mime_type = VALUES(proof_mime_type), proof_size_bytes = VALUES(proof_size_bytes),
            source_accounting_transaction_id = VALUES(source_accounting_transaction_id),
            voided_at = NULL, void_reason = ""'
    );
    $synced = 0;
    $jakarta = new DateTimeZone('Asia/Jakarta');
    $utc = new DateTimeZone('UTC');
    foreach ($rows as $row) {
        $confirmedAt = trim((string) ($row['confirmed_at'] ?? '')) ?: gmdate('Y-m-d H:i:s');
        try {
            $paymentDate = (new DateTimeImmutable($confirmedAt, $utc))->setTimezone($jakarta)->format('Y-m-d');
        } catch (Throwable) {
            $paymentDate = (new DateTimeImmutable('now', $jakarta))->format('Y-m-d');
        }
        $insert->execute([
            ':partner_code' => (string) $row['partner_code'],
            ':order_id' => (string) $row['order_id'],
            ':amount' => number_format(max(0, (float) ($row['amount'] ?? 0)), 2, '.', ''),
            ':payment_date' => $paymentDate,
            ':reference_no' => (string) $row['bill_id'],
            ':source_reference' => (string) $row['bill_id'],
            ':source_submitted_at' => (string) ($row['submitted_at'] ?? ''),
            ':source_confirmed_at' => $confirmedAt,
            ':proof_file_id' => (int) ($row['proof_file_id'] ?? 0),
            ':proof_name' => (string) ($row['proof_name'] ?? 'Payment proof'),
            ':proof_mime_type' => (string) ($row['proof_mime_type'] ?? ''),
            ':proof_size_bytes' => (int) ($row['proof_size_bytes'] ?? 0),
            ':source_accounting_transaction_id' => (int) ($row['accounting_transaction_id'] ?? 0),
        ]);
        $synced++;
    }
    return $synced;
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
            'description' => 'Confirmed partner ' . (jg_admin_partner_billing_period_type($payment['period_type'] ?? null) === 'calendar_month' ? 'calendar-month' : 'calendar-week') . ' bill ' . (string) $payment['period_label'],
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
        'SELECT p.*, b.period_type, b.period_start, b.period_end, b.total_amount,
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
        try {
            $syncedOrders = jg_admin_partner_billing_sync_confirmed_order_payments($partnerPdo, $accountingPdo, (string) $payment['bill_id']);
        } catch (Throwable $error) {
            error_log('Confirmed partner order settlement sync failed: ' . $error->getMessage());
            $syncedOrders = 0;
        }
        return ['ok' => true, 'payment_id' => $paymentId, 'transaction_id' => (int) ($payment['accounting_transaction_id'] ?? 0), 'status' => 'confirmed', 'orders_synced' => $syncedOrders];
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
    try {
        $syncedOrders = jg_admin_partner_billing_sync_confirmed_order_payments($partnerPdo, $accountingPdo, (string) $payment['bill_id']);
    } catch (Throwable $error) {
        error_log('Confirmed partner order settlement sync failed: ' . $error->getMessage());
        $syncedOrders = 0;
    }
    return ['ok' => true, 'payment_id' => $paymentId, 'transaction_id' => $transactionId, 'status' => 'confirmed', 'orders_synced' => $syncedOrders];
}

/** @param list<array<string,mixed>> $bills */
function jg_admin_partner_billing_outstanding_totals(array $bills): array
{
    $due = 0;
    $inProgress = 0;
    foreach ($bills as $bill) {
        $amount = max(0, (int) round((float) ($bill['total_amount'] ?? 0)));
        $status = (string) ($bill['status'] ?? '');
        if (in_array($status, ['unpaid', 'payment_submitted', 'disputed'], true)) {
            $due += $amount;
        } elseif ($status === 'accruing') {
            $inProgress += $amount;
        }
    }
    return ['due_amount' => $due, 'in_progress_amount' => $inProgress];
}

function jg_admin_partner_billing_totals(): array
{
    try {
        $pdo = jg_admin_partner_billing_db();
        jg_admin_partner_billing_sync($pdo);
        $stmt = $pdo->query('SELECT status, total_amount FROM partner_weekly_bills WHERE total_amount > 0');
        return jg_admin_partner_billing_outstanding_totals($stmt->fetchAll());
    } catch (Throwable $error) {
        error_log('Partner bill totals unavailable: ' . $error->getMessage());
        return ['due_amount' => 0, 'in_progress_amount' => 0];
    }
}

function jg_admin_partner_billing_due_total(): int
{
    return (int) jg_admin_partner_billing_totals()['due_amount'];
}

function jg_admin_partner_billing_breakdown(): array
{
    try {
        $pdo = jg_admin_partner_billing_db();
        jg_admin_partner_billing_sync($pdo);
        $stmt = $pdo->query(
            'SELECT b.bill_id, b.partner_code, b.period_type, b.period_start, b.period_end, b.due_date, b.status,
                    b.subtotal_amount, b.adjustment_amount, b.total_amount, b.payment_submitted_at, b.paid_at,
                    COALESCE(NULLIF(pr.name, ""), b.partner_code) AS partner_name
             FROM partner_weekly_bills b
             LEFT JOIN partner_profiles pr ON pr.code = b.partner_code
             ORDER BY b.period_start DESC, partner_name ASC
             LIMIT 104'
        );
        $bills = [];
        $outstanding = 0;
        foreach ($stmt->fetchAll() as $row) {
            $status = (string) ($row['status'] ?? '');
            $amount = (int) round((float) ($row['total_amount'] ?? 0));
            if (in_array($status, ['unpaid', 'payment_submitted', 'disputed'], true)) {
                $outstanding += $amount;
            }
            $items = jg_admin_partner_billing_items($pdo, (string) $row['bill_id']);
            $bills[] = [
                'id' => (string) $row['bill_id'],
                'partner_code' => (string) $row['partner_code'],
                'partner_name' => (string) $row['partner_name'],
                'period_type' => jg_admin_partner_billing_period_type($row['period_type'] ?? null),
                'period_start' => (string) $row['period_start'],
                'period_end' => (string) $row['period_end'],
                'period_label' => jg_admin_partner_billing_period_label((string) $row['period_start'], (string) $row['period_end']),
                'due_date' => (string) $row['due_date'],
                'status' => $status,
                'subtotal_amount' => (int) round((float) ($row['subtotal_amount'] ?? 0)),
                'adjustment_amount' => (int) round((float) ($row['adjustment_amount'] ?? 0)),
                'total_amount' => $amount,
                'payment_submitted_at' => (string) ($row['payment_submitted_at'] ?? ''),
                'paid_at' => (string) ($row['paid_at'] ?? ''),
                'order_count' => count(array_filter($items, static fn (array $item): bool => (string) ($item['status'] ?? '') !== 'removed')),
                'unit_count' => array_sum(array_map(
                    static fn (array $item): int => (string) ($item['status'] ?? '') === 'removed' ? 0 : (int) ($item['units'] ?? 0),
                    $items
                )),
                'items' => $items,
            ];
        }
        return [
            'available' => true,
            'outstanding_amount' => $outstanding,
            'bill_count' => count($bills),
            'bills' => $bills,
        ];
    } catch (Throwable $error) {
        error_log('Partner bill breakdown unavailable: ' . $error->getMessage());
        return [
            'available' => false,
            'outstanding_amount' => 0,
            'bill_count' => 0,
            'bills' => [],
        ];
    }
}
