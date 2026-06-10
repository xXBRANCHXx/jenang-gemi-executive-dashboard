<?php
declare(strict_types=1);

function jg_executive_context_ensure_schema(PDO $pdo): void
{
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
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS executive_chart_context_migrations (
            migration_key VARCHAR(120) NOT NULL PRIMARY KEY,
            applied_at DATETIME(6) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

/**
 * Apply bundled historical corrections once, while keeping later Context edits writable.
 */
function jg_executive_context_apply_migrations(PDO $pdo): void
{
    $path = __DIR__ . '/data/executive-context-may-2026.json';
    $raw = @file_get_contents($path);
    $migration = is_string($raw) ? json_decode($raw, true) : null;
    $migrationKey = trim((string) ($migration['migration_key'] ?? ''));
    $records = is_array($migration['records'] ?? null) ? $migration['records'] : [];
    if ($migrationKey === '' || $records === []) {
        throw new RuntimeException('Executive context migration data is invalid.');
    }

    $marker = $pdo->prepare(
        'INSERT IGNORE INTO executive_chart_context_migrations (migration_key, applied_at)
         VALUES (:migration_key, UTC_TIMESTAMP(6))'
    );
    $upsert = $pdo->prepare(
        'INSERT INTO executive_chart_context
            (period_key, granularity, revenue, gross_profit, orders_qty, items_qty, updated_at)
         VALUES
            (:period_key, :granularity, :revenue, :gross_profit, :orders_qty, :items_qty, UTC_TIMESTAMP(6))
         ON DUPLICATE KEY UPDATE
            granularity = VALUES(granularity),
            revenue = VALUES(revenue),
            gross_profit = VALUES(gross_profit),
            orders_qty = VALUES(orders_qty),
            items_qty = VALUES(items_qty),
            updated_at = UTC_TIMESTAMP(6)'
    );

    $pdo->beginTransaction();
    try {
        $marker->execute([':migration_key' => $migrationKey]);
        if ($marker->rowCount() === 0) {
            $pdo->commit();
            return;
        }

        foreach ($records as $record) {
            if (!is_array($record)) {
                throw new RuntimeException('Executive context migration record is invalid.');
            }
            $periodKey = trim((string) ($record['period_key'] ?? ''));
            if (!jg_executive_context_allowed_period($periodKey)) {
                throw new RuntimeException('Unsupported executive context migration period: ' . $periodKey);
            }
            $upsert->execute([
                ':period_key' => $periodKey,
                ':granularity' => jg_executive_context_granularity($periodKey),
                ':revenue' => (int) ($record['revenue'] ?? 0),
                ':gross_profit' => (int) ($record['gross_profit'] ?? 0),
                ':orders_qty' => (int) ($record['orders_qty'] ?? 0),
                ':items_qty' => (int) ($record['items_qty'] ?? 0),
            ]);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
}

function jg_executive_context_allowed_period(string $periodKey): bool
{
    if (preg_match('/^2025-(0[1-9]|1[0-2])$/', $periodKey) === 1) {
        return true;
    }
    if (preg_match('/^2026-0[1-4]$/', $periodKey) === 1) {
        return true;
    }
    return preg_match('/^2026-05-(0[1-9]|1[0-9])$/', $periodKey) === 1;
}

function jg_executive_context_granularity(string $periodKey): string
{
    return strlen($periodKey) === 10 ? 'day' : 'month';
}

/**
 * @param array<int, array<string, mixed>> $rows
 * @return array<int, array<string, int|string>>
 */
function jg_executive_context_group_by_month(array $rows): array
{
    $monthly = [];
    foreach ($rows as $row) {
        $periodKey = (string) ($row['period_key'] ?? '');
        $month = (int) substr($periodKey, 5, 2);
        if ($month < 1 || $month > 12) {
            continue;
        }
        $isDaily = strlen($periodKey) === 10;
        foreach (['revenue', 'gross_profit', 'orders_qty', 'items_qty'] as $field) {
            if (!array_key_exists($field, $row) || $row[$field] === null) {
                continue;
            }
            $value = (int) $row[$field];
            $monthly[$month][$field] = $isDaily
                ? (int) ($monthly[$month][$field] ?? 0) + $value
                : $value;
        }
        $monthly[$month]['source'] = $isDaily ? 'daily_context' : 'monthly_context';
    }
    return $monthly;
}

/**
 * @param array<string, mixed> $summary
 * @param array<int, array<string, int|string>> $context
 * @return array<string, mixed>
 */
function jg_executive_context_apply_summary(array $summary, array $context): array
{
    if ($context === []) {
        return $summary;
    }

    $months = is_array($summary['months'] ?? null) ? array_values($summary['months']) : [];
    $monthLabels = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    while (count($months) < 12) {
        $index = count($months);
        $months[] = ['month' => $index + 1, 'label' => $monthLabels[$index]];
    }

    foreach ($context as $monthNumber => $values) {
        $index = $monthNumber - 1;
        $month = is_array($months[$index] ?? null) ? $months[$index] : [];
        $isAdditive = ($values['source'] ?? '') === 'daily_context';
        if (array_key_exists('revenue', $values)) {
            $baseRevenue = $isAdditive
                ? (int) ($month['revenue'] ?? $month['net_revenue'] ?? $month['sales'] ?? 0)
                : 0;
            $revenue = $baseRevenue + (int) $values['revenue'];
            $month['revenue'] = $revenue;
            $month['net_revenue'] = $revenue;
            $month['sales'] = $revenue;
        }
        if (array_key_exists('gross_profit', $values)) {
            $month['gross_profit'] = ($isAdditive ? (int) ($month['gross_profit'] ?? 0) : 0)
                + (int) $values['gross_profit'];
        }
        if (array_key_exists('orders_qty', $values)) {
            $month['orders'] = ($isAdditive ? (int) ($month['orders'] ?? 0) : 0)
                + (int) $values['orders_qty'];
        }
        if (array_key_exists('items_qty', $values)) {
            $month['item_count'] = ($isAdditive ? (int) ($month['item_count'] ?? 0) : 0)
                + (int) $values['items_qty'];
        }
        $month['month'] = $monthNumber;
        $month['label'] = $month['label'] ?? $monthLabels[$index];
        $month['context_source'] = $values['source'] ?? 'context';
        $months[$index] = $month;
    }

    $totals = is_array($summary['totals'] ?? null) ? $summary['totals'] : [];
    foreach ([
        'revenue' => 'revenue',
        'net_revenue' => 'revenue',
        'sales' => 'revenue',
        'gross_profit' => 'gross_profit',
        'orders' => 'orders',
        'item_count' => 'item_count',
    ] as $totalField => $monthField) {
        $totals[$totalField] = array_sum(array_map(
            static fn (array $month): int => (int) ($month[$monthField] ?? 0),
            $months
        ));
    }
    $totals['average_order_value'] = (int) ($totals['orders'] ?? 0) > 0
        ? (int) round((int) ($totals['revenue'] ?? 0) / (int) $totals['orders'])
        : 0;

    $years = is_array($summary['years'] ?? null) ? $summary['years'] : [];
    $years[] = 2025;
    $years[] = 2026;
    $years = array_values(array_unique(array_map('intval', $years)));
    sort($years);

    $summary['months'] = $months;
    $summary['totals'] = $totals;
    $summary['years'] = $years;
    $summary['context_applied'] = true;
    return $summary;
}

function jg_executive_context_bootstrap(): void
{
    if (!function_exists('analyticsDb')) {
        return;
    }
    try {
        $pdo = analyticsDb();
        jg_executive_context_ensure_schema($pdo);
        jg_executive_context_apply_migrations($pdo);
    } catch (Throwable $error) {
        error_log('Unable to apply executive context migrations: ' . $error->getMessage());
    }
}

jg_executive_context_bootstrap();
