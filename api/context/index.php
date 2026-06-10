<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/auth.php';
jg_admin_require_auth_json();

require_once dirname(__DIR__, 2) . '/analytics-bootstrap.php';
require_once dirname(__DIR__, 2) . '/executive-context.php';

header('Content-Type: application/json; charset=utf-8');

function jg_context_ensure_schema(PDO $pdo): void
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
}

function jg_context_nullable_int(mixed $value, bool $allowNegative = false): ?int
{
    if ($value === null || $value === '') {
        return null;
    }
    if (!is_numeric($value)) {
        throw new InvalidArgumentException('Context values must be numeric.');
    }
    $number = (int) round((float) $value);
    if (!$allowNegative && $number < 0) {
        throw new InvalidArgumentException('Revenue and quantity values cannot be negative.');
    }
    return $number;
}

function jg_context_rows(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT period_key, granularity, revenue, gross_profit, orders_qty, items_qty, updated_at
         FROM executive_chart_context
         ORDER BY period_key'
    );
    return $stmt ? $stmt->fetchAll() : [];
}

$pdo = analyticsDb();
jg_context_ensure_schema($pdo);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    analyticsJsonResponse([
        'ok' => true,
        'records' => jg_context_rows($pdo),
        'updated_at' => gmdate(DATE_ATOM),
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    analyticsJsonResponse(['error' => 'Method not allowed.'], 405);
}

$payload = json_decode(file_get_contents('php://input') ?: '', true);
$records = is_array($payload) ? ($payload['records'] ?? null) : null;
if (!is_array($records)) {
    analyticsJsonResponse(['error' => 'A records array is required.'], 400);
}
if (count($records) > 35) {
    analyticsJsonResponse(['error' => 'Too many context records.'], 422);
}

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
$delete = $pdo->prepare('DELETE FROM executive_chart_context WHERE period_key = :period_key');

$pdo->beginTransaction();
try {
    foreach ($records as $record) {
        if (!is_array($record)) {
            throw new InvalidArgumentException('Each context record must be an object.');
        }
        $periodKey = trim((string) ($record['period_key'] ?? ''));
        if (!jg_executive_context_allowed_period($periodKey)) {
            throw new InvalidArgumentException('Unsupported context period: ' . $periodKey);
        }

        $values = [
            'revenue' => jg_context_nullable_int($record['revenue'] ?? null),
            'gross_profit' => jg_context_nullable_int($record['gross_profit'] ?? null, true),
            'orders_qty' => jg_context_nullable_int($record['orders_qty'] ?? null),
            'items_qty' => jg_context_nullable_int($record['items_qty'] ?? null),
        ];
        if (count(array_filter($values, static fn (?int $value): bool => $value !== null)) === 0) {
            $delete->execute([':period_key' => $periodKey]);
            continue;
        }

        $upsert->execute([
            ':period_key' => $periodKey,
            ':granularity' => jg_executive_context_granularity($periodKey),
            ':revenue' => $values['revenue'],
            ':gross_profit' => $values['gross_profit'],
            ':orders_qty' => $values['orders_qty'],
            ':items_qty' => $values['items_qty'],
        ]);
    }
    $pdo->commit();
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    analyticsJsonResponse(['error' => $error->getMessage()], 422);
}

analyticsJsonResponse([
    'ok' => true,
    'records' => jg_context_rows($pdo),
    'updated_at' => gmdate(DATE_ATOM),
]);
