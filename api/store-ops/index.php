<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/sku-db-bootstrap.php';

jg_admin_require_auth_json();
header('Content-Type: application/json; charset=utf-8');

function jg_exec_store_ops_fail(string $message, int $status = 422): void
{
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

function jg_exec_store_ops_ensure_schema(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS store_ops_employees (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            display_name VARCHAR(120) NOT NULL,
            pin_hash VARCHAR(255) NOT NULL,
            active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            KEY idx_store_ops_employees_active (active, display_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS store_ops_order_fulfillment (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            source_platform VARCHAR(32) NOT NULL,
            source_account VARCHAR(96) NOT NULL DEFAULT "",
            order_id VARCHAR(96) NOT NULL,
            status VARCHAR(32) NOT NULL DEFAULT "UNCLAIMED",
            claimed_by VARCHAR(64) NULL DEFAULT NULL,
            claimed_at DATETIME NULL DEFAULT NULL,
            last_activity_at DATETIME NULL DEFAULT NULL,
            scan_completed_at DATETIME NULL DEFAULT NULL,
            label_printed_at DATETIME NULL DEFAULT NULL,
            fulfilled_at DATETIME NULL DEFAULT NULL,
            scan_required INT UNSIGNED NOT NULL DEFAULT 0,
            scan_completed INT UNSIGNED NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            UNIQUE KEY uniq_store_ops_order (source_platform, source_account, order_id),
            KEY idx_store_ops_fulfillment_status_activity (status, last_activity_at),
            KEY idx_store_ops_fulfillment_claimed_by (claimed_by, last_activity_at),
            KEY idx_store_ops_fulfillment_fulfilled_at (fulfilled_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS store_ops_order_events (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            source_platform VARCHAR(32) NOT NULL,
            source_account VARCHAR(96) NOT NULL DEFAULT "",
            order_id VARCHAR(96) NOT NULL,
            event_type VARCHAR(32) NOT NULL,
            employee_id VARCHAR(64) NULL DEFAULT NULL,
            employee_name VARCHAR(120) NOT NULL DEFAULT "",
            sku VARCHAR(64) NOT NULL DEFAULT "",
            quantity DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            progress_scanned INT UNSIGNED NOT NULL DEFAULT 0,
            progress_required INT UNSIGNED NOT NULL DEFAULT 0,
            message VARCHAR(255) NOT NULL DEFAULT "",
            payload_json LONGTEXT NULL DEFAULT NULL,
            created_at DATETIME NOT NULL,
            KEY idx_store_ops_events_created (created_at),
            KEY idx_store_ops_events_employee_created (employee_id, created_at),
            KEY idx_store_ops_events_order (source_platform, source_account, order_id, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function jg_exec_store_ops_date_bounds(): array
{
    $timezone = new DateTimeZone('Asia/Jakarta');
    $today = new DateTimeImmutable('now', $timezone);
    $dateFrom = trim((string) ($_GET['date_from'] ?? $today->format('Y-m-d')));
    $dateTo = trim((string) ($_GET['date_to'] ?? $dateFrom));

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFrom)) {
        $dateFrom = $today->format('Y-m-d');
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateTo)) {
        $dateTo = $dateFrom;
    }

    $start = new DateTimeImmutable($dateFrom . ' 00:00:00', $timezone);
    $end = (new DateTimeImmutable($dateTo . ' 00:00:00', $timezone))->modify('+1 day');
    return [
        'from_date' => $dateFrom,
        'to_date' => $dateTo,
        'start_utc' => $start->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s'),
        'end_utc' => $end->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s'),
    ];
}

function jg_exec_store_ops_csv_filter(string $key): array
{
    $raw = trim((string) ($_GET[$key] ?? ''));
    if ($raw === '') {
        return [];
    }
    return array_values(array_filter(array_map(static fn (string $item): string => trim($item), explode(',', $raw))));
}

function jg_exec_store_ops_format_duration(?int $seconds): string
{
    if ($seconds === null || $seconds <= 0) {
        return '';
    }
    if ($seconds < 60) {
        return $seconds . 's';
    }
    $minutes = intdiv($seconds, 60);
    $remaining = $seconds % 60;
    if ($minutes < 60) {
        return $minutes . 'm' . ($remaining > 0 ? ' ' . $remaining . 's' : '');
    }
    $hours = intdiv($minutes, 60);
    return $hours . 'h ' . ($minutes % 60) . 'm';
}

function jg_exec_store_ops_employees(PDO $pdo): array
{
    $rows = $pdo->query(
        'SELECT id, display_name, active
         FROM store_ops_employees
         ORDER BY active DESC, display_name ASC'
    )->fetchAll();
    return array_values(array_map(static fn (array $row): array => [
        'id' => (string) ($row['id'] ?? ''),
        'display_name' => (string) ($row['display_name'] ?? ''),
        'active' => (int) ($row['active'] ?? 0),
    ], $rows));
}

function jg_exec_store_ops_metrics(PDO $pdo, array $bounds): array
{
    $todayStart = $bounds['start_utc'];
    $todayEnd = $bounds['end_utc'];

    $stmt = $pdo->prepare('SELECT COUNT(*) FROM store_ops_order_fulfillment WHERE fulfilled_at >= :start_at AND fulfilled_at < :end_at');
    $stmt->execute([':start_at' => $todayStart, ':end_at' => $todayEnd]);
    $fulfilledToday = (int) $stmt->fetchColumn();

    $activeClaims = (int) $pdo->query(
        'SELECT COUNT(*)
         FROM store_ops_order_fulfillment
         WHERE claimed_by IS NOT NULL
           AND status <> "FULFILLED"'
    )->fetchColumn();

    $stmt = $pdo->prepare(
        'SELECT AVG(TIMESTAMPDIFF(SECOND, claimed_at, fulfilled_at))
         FROM store_ops_order_fulfillment
         WHERE claimed_at IS NOT NULL
           AND fulfilled_at IS NOT NULL
           AND fulfilled_at >= :start_at
           AND fulfilled_at < :end_at'
    );
    $stmt->execute([':start_at' => $todayStart, ':end_at' => $todayEnd]);
    $averageSeconds = $stmt->fetchColumn();
    $averageSeconds = $averageSeconds !== false && $averageSeconds !== null ? (int) round((float) $averageSeconds) : 0;

    $stmt = $pdo->prepare(
        'SELECT COUNT(*)
         FROM store_ops_order_events
         WHERE event_type IN ("scan_error", "error")
           AND created_at >= :start_at
           AND created_at < :end_at'
    );
    $stmt->execute([':start_at' => $todayStart, ':end_at' => $todayEnd]);
    $scanErrors = (int) $stmt->fetchColumn();

    $stmt = $pdo->prepare(
        'SELECT COALESCE(e.display_name, f.claimed_by, "Unassigned") AS employee_name, COUNT(*) AS fulfilled_count
         FROM store_ops_order_fulfillment f
         LEFT JOIN store_ops_employees e ON e.id = f.claimed_by
         WHERE f.fulfilled_at >= :start_at
           AND f.fulfilled_at < :end_at
         GROUP BY employee_name
         ORDER BY fulfilled_count DESC, employee_name ASC
         LIMIT 8'
    );
    $stmt->execute([':start_at' => $todayStart, ':end_at' => $todayEnd]);
    $throughput = array_map(static fn (array $row): array => [
        'employee_name' => (string) ($row['employee_name'] ?? 'Unassigned'),
        'fulfilled_count' => (int) ($row['fulfilled_count'] ?? 0),
    ], $stmt->fetchAll());

    return [
        'fulfilled_today' => $fulfilledToday,
        'active_claims' => $activeClaims,
        'average_fulfillment_seconds' => $averageSeconds,
        'average_fulfillment_label' => jg_exec_store_ops_format_duration($averageSeconds),
        'scan_errors' => $scanErrors,
        'employee_throughput' => $throughput,
    ];
}

function jg_exec_store_ops_orders(PDO $pdo, array $bounds): array
{
    $where = [];
    $params = [
        ':start_at' => $bounds['start_utc'],
        ':end_at' => $bounds['end_utc'],
    ];

    $where[] = '(
        f.status <> "FULFILLED"
        OR (f.fulfilled_at >= :start_at AND f.fulfilled_at < :end_at)
        OR (COALESCE(f.last_activity_at, f.claimed_at, f.created_at) >= :start_at AND COALESCE(f.last_activity_at, f.claimed_at, f.created_at) < :end_at)
    )';

    $employees = jg_exec_store_ops_csv_filter('employees');
    if ($employees !== []) {
        $placeholders = [];
        foreach ($employees as $index => $employeeId) {
            $placeholder = ':employee_' . $index;
            $placeholders[] = $placeholder;
            $params[$placeholder] = $employeeId;
        }
        $where[] = 'f.claimed_by IN (' . implode(',', $placeholders) . ')';
    }

    $statuses = array_map('strtoupper', jg_exec_store_ops_csv_filter('status'));
    if ($statuses !== []) {
        $placeholders = [];
        foreach ($statuses as $index => $status) {
            $placeholder = ':status_' . $index;
            $placeholders[] = $placeholder;
            $params[$placeholder] = $status;
        }
        $where[] = 'f.status IN (' . implode(',', $placeholders) . ')';
    }

    $source = trim((string) ($_GET['source'] ?? ''));
    if ($source !== '') {
        $where[] = '(f.source_platform LIKE :source OR f.source_account LIKE :source)';
        $params[':source'] = '%' . $source . '%';
    }

    $query = trim((string) ($_GET['q'] ?? $_GET['order_id'] ?? ''));
    if ($query !== '') {
        $where[] = 'f.order_id LIKE :query';
        $params[':query'] = '%' . $query . '%';
    }

    $sql = 'SELECT
            f.*,
            COALESCE(e.display_name, f.claimed_by, "") AS employee_name,
            TIMESTAMPDIFF(SECOND, f.claimed_at, COALESCE(f.fulfilled_at, f.label_printed_at, f.last_activity_at)) AS duration_seconds
        FROM store_ops_order_fulfillment f
        LEFT JOIN store_ops_employees e ON e.id = f.claimed_by
        WHERE ' . implode(' AND ', $where) . '
        ORDER BY COALESCE(f.last_activity_at, f.claimed_at, f.created_at) DESC
        LIMIT 300';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    return array_map(static fn (array $row): array => [
        'source_platform' => (string) ($row['source_platform'] ?? ''),
        'source_account' => (string) ($row['source_account'] ?? ''),
        'order_id' => (string) ($row['order_id'] ?? ''),
        'status' => (string) ($row['status'] ?? ''),
        'claimed_by' => (string) ($row['claimed_by'] ?? ''),
        'employee_name' => (string) ($row['employee_name'] ?? ''),
        'claimed_at' => $row['claimed_at'] ?? null,
        'scan_completed_at' => $row['scan_completed_at'] ?? null,
        'label_printed_at' => $row['label_printed_at'] ?? null,
        'fulfilled_at' => $row['fulfilled_at'] ?? null,
        'last_activity_at' => $row['last_activity_at'] ?? null,
        'duration_seconds' => $row['duration_seconds'] !== null ? (int) $row['duration_seconds'] : null,
        'duration_label' => jg_exec_store_ops_format_duration($row['duration_seconds'] !== null ? (int) $row['duration_seconds'] : null),
        'scan_progress' => [
            'completed' => (int) ($row['scan_completed'] ?? 0),
            'required' => (int) ($row['scan_required'] ?? 0),
        ],
    ], $stmt->fetchAll());
}

function jg_exec_store_ops_events(PDO $pdo): array
{
    $orderId = trim((string) ($_GET['detail_order_id'] ?? ''));
    if ($orderId === '') {
        return [];
    }

    $where = ['order_id = :order_id'];
    $params = [':order_id' => $orderId];
    $platform = trim((string) ($_GET['detail_source_platform'] ?? ''));
    $account = trim((string) ($_GET['detail_source_account'] ?? ''));
    if ($platform !== '') {
        $where[] = 'source_platform = :source_platform';
        $params[':source_platform'] = $platform;
    }
    if ($account !== '') {
        $where[] = 'source_account = :source_account';
        $params[':source_account'] = $account;
    }

    $stmt = $pdo->prepare(
        'SELECT *
         FROM store_ops_order_events
         WHERE ' . implode(' AND ', $where) . '
         ORDER BY created_at ASC
         LIMIT 500'
    );
    $stmt->execute($params);

    $events = [];
    foreach ($stmt->fetchAll() as $row) {
        if (!is_array($row)) {
            continue;
        }
        $payload = json_decode((string) ($row['payload_json'] ?? ''), true);
        $events[] = [
            'event_type' => (string) ($row['event_type'] ?? ''),
            'employee_id' => (string) ($row['employee_id'] ?? ''),
            'employee_name' => (string) ($row['employee_name'] ?? ''),
            'sku' => (string) ($row['sku'] ?? ''),
            'quantity' => (float) ($row['quantity'] ?? 0),
            'progress_scanned' => (int) ($row['progress_scanned'] ?? 0),
            'progress_required' => (int) ($row['progress_required'] ?? 0),
            'message' => (string) ($row['message'] ?? ''),
            'created_at' => $row['created_at'] ?? null,
            'payload' => is_array($payload) ? $payload : null,
        ];
    }

    return $events;
}

try {
    $pdo = jg_sku_db();
    jg_exec_store_ops_ensure_schema($pdo);
    $bounds = jg_exec_store_ops_date_bounds();
    echo json_encode([
        'ok' => true,
        'filters' => [
            'date_from' => $bounds['from_date'],
            'date_to' => $bounds['to_date'],
        ],
        'metrics' => jg_exec_store_ops_metrics($pdo, $bounds),
        'employees' => jg_exec_store_ops_employees($pdo),
        'orders' => jg_exec_store_ops_orders($pdo, $bounds),
        'events' => jg_exec_store_ops_events($pdo),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
} catch (Throwable $throwable) {
    jg_exec_store_ops_fail('Unable to load Store Ops activity.', 500);
}
