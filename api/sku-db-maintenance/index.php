<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/config.php';
require_once dirname(__DIR__, 2) . '/sku-db-bootstrap.php';
require_once dirname(__DIR__, 2) . '/analytics-bootstrap.php';
require_once dirname(__DIR__, 2) . '/sku-shopee-price-sync.php';

header('Content-Type: application/json; charset=utf-8');

function jg_sku_maintenance_request_body(): array
{
    $raw = file_get_contents('php://input');
    if (!is_string($raw) || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function jg_sku_maintenance_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function jg_sku_maintenance_token(array $payload): string
{
    foreach ([
        $_SERVER['HTTP_X_SETUP_TOKEN'] ?? null,
        $_SERVER['HTTP_X_API_KEY'] ?? null,
        $_GET['setup_token'] ?? null,
        $_GET['token'] ?? null,
        $payload['setup_token'] ?? null,
        $payload['token'] ?? null,
    ] as $value) {
        $token = trim((string) $value);
        if ($token !== '') {
            return $token;
        }
    }
    return '';
}

function jg_sku_maintenance_bump_version(PDO $pdo): string
{
    $current = (string) $pdo->query('SELECT meta_value FROM sku_meta WHERE meta_key = "version" LIMIT 1')->fetchColumn();
    if (!preg_match('/^(\d+)\.(\d{2})\.(\d{2})$/', $current, $matches)) {
        $next = '1.00.00';
    } else {
        $major = (int) $matches[1];
        $middle = (int) $matches[2];
        $patch = (int) $matches[3] + 1;
        if ($patch > 99) {
            $patch = 0;
            $middle += 1;
        }
        $next = sprintf('%d.%02d.%02d', $major, $middle, $patch);
    }

    $stmt = $pdo->prepare('UPDATE sku_meta SET meta_value = :meta_value, updated_at = :updated_at WHERE meta_key = "version"');
    $stmt->execute([
        ':meta_value' => $next,
        ':updated_at' => gmdate('Y-m-d H:i:s'),
    ]);
    return $next;
}

function jg_sku_maintenance_apply(PDO $skuPdo, PDO $analyticsPdo, int $days, bool $dryRun): array
{
    $preview = jg_sku_shopee_preview($skuPdo, $analyticsPdo, ['days' => $days]);
    $suggestions = array_values(array_filter((array) ($preview['suggestions'] ?? []), 'is_array'));
    $updates = [];
    foreach ($suggestions as $row) {
        $sku = trim((string) ($row['sku'] ?? ''));
        $price = number_format((float) ($row['suggested_sale_price'] ?? 0), 2, '.', '');
        if ($sku === '' || (float) $price <= 0) {
            continue;
        }
        $updates[] = [
            'sku' => $sku,
            'tag' => (string) ($row['tag'] ?? ''),
            'previous_sale_price' => number_format((float) ($row['current_sale_price'] ?? 0), 2, '.', ''),
            'sale_price' => $price,
            'changed' => !empty($row['changed']),
            'confidence' => (string) ($row['confidence'] ?? ''),
            'source_path' => (string) ($row['source_path'] ?? ''),
            'latest_order_at' => (string) ($row['latest_order_at'] ?? ''),
            'order_id' => (string) ($row['order_id'] ?? ''),
            'quantity' => (float) ($row['quantity'] ?? 0),
            'gross_revenue' => (float) ($row['gross_revenue'] ?? 0),
            'observation_count' => (int) ($row['observation_count'] ?? 0),
        ];
    }

    $changedUpdates = array_values(array_filter(
        $updates,
        static fn (array $row): bool => !empty($row['changed'])
    ));
    $version = '';
    if (!$dryRun && $changedUpdates !== []) {
        $stmt = $skuPdo->prepare('UPDATE sku_skus SET sale_price = :sale_price, updated_at = :updated_at WHERE sku = :sku');
        $skuPdo->beginTransaction();
        foreach ($changedUpdates as $row) {
            $stmt->execute([
                ':sale_price' => $row['sale_price'],
                ':updated_at' => gmdate('Y-m-d H:i:s'),
                ':sku' => $row['sku'],
            ]);
        }
        $version = jg_sku_maintenance_bump_version($skuPdo);
        $skuPdo->commit();
    }

    return [
        'ok' => true,
        'dry_run' => $dryRun,
        'lookback_days' => $days,
        'matched_count' => count($updates),
        'changed_count' => count($changedUpdates),
        'applied_count' => $dryRun ? 0 : count($changedUpdates),
        'version' => $version,
        'preview_meta' => $preview['meta'] ?? [],
        'updates' => $updates,
        'generated_at' => gmdate(DATE_ATOM),
    ];
}

try {
    $payload = jg_sku_maintenance_request_body();
    $expectedToken = jg_dashboard_marketplace_api_setup_token();
    $providedToken = jg_sku_maintenance_token($payload);
    if ($expectedToken === '' || $providedToken === '' || !hash_equals($expectedToken, $providedToken)) {
        jg_sku_maintenance_response(['error' => 'Forbidden'], 403);
    }

    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ($method !== 'POST') {
        jg_sku_maintenance_response(['error' => 'Method not allowed'], 405);
    }

    $action = strtolower(trim((string) ($payload['action'] ?? $_GET['action'] ?? '')));
    if ($action !== 'apply_shopee_sale_prices_to_sku_db') {
        jg_sku_maintenance_response(['error' => 'Unknown action'], 400);
    }

    $days = max(30, min(730, (int) ($payload['lookback_days'] ?? $_GET['lookback_days'] ?? 365)));
    $dryRun = !empty($payload['dry_run']) || !empty($_GET['dry_run']);
    $skuPdo = jg_sku_db();
    jg_sku_maintenance_response(jg_sku_maintenance_apply($skuPdo, analyticsDb(), $days, $dryRun));
} catch (Throwable $error) {
    if (isset($skuPdo) && $skuPdo instanceof PDO && $skuPdo->inTransaction()) {
        $skuPdo->rollBack();
    }
    jg_sku_maintenance_response([
        'error' => 'Maintenance apply failed',
        'type' => get_class($error),
        'message' => $error->getMessage(),
    ], 500);
}
