<?php
declare(strict_types=1);

function jg_sku_shopee_key(string $value): string
{
    $key = strtoupper(preg_replace('/[^A-Z0-9]+/i', '', trim($value)) ?? '');
    return str_replace('SALTEDCARAMEL', 'SALTCARAMEL', $key);
}

function jg_sku_shopee_money(mixed $value): ?float
{
    if ($value === null || $value === '') {
        return null;
    }
    if (is_string($value)) {
        $value = preg_replace('/[^0-9.\-]+/', '', $value) ?? '';
    }
    if (!is_numeric($value)) {
        return null;
    }

    $amount = round((float) $value, 2);
    return $amount > 0 ? $amount : null;
}

function jg_sku_shopee_path_priority(string $path): int
{
    $path = strtolower($path);
    if (preg_match('/model_(discounted_)?price|discounted_price|current_price|sale_price|selling_price/', $path)) {
        return 100;
    }
    if (preg_match('/model_original_price|original_price|item_price|list_price|price_before_discount/', $path)) {
        return 85;
    }
    if (preg_match('/(^|\\.)price$/', $path)) {
        return 75;
    }
    if (preg_match('/unit_gross_price|unit_price|item_gross_price/', $path)) {
        return 45;
    }
    return 0;
}

function jg_sku_shopee_price_paths(array $node, string $prefix = '', bool $recursive = true): array
{
    $matches = [];
    foreach ($node as $key => $value) {
        $path = $prefix === '' ? (string) $key : $prefix . '.' . (string) $key;
        if (is_array($value)) {
            if ($recursive) {
                $matches = array_merge($matches, jg_sku_shopee_price_paths($value, $path, true));
            }
            continue;
        }

        $priority = jg_sku_shopee_path_priority($path);
        $amount = $priority > 0 ? jg_sku_shopee_money($value) : null;
        if ($amount !== null) {
            $matches[] = [
                'path' => $path,
                'price' => $amount,
                'priority' => $priority,
            ];
        }
    }
    return $matches;
}

function jg_sku_shopee_tag_present(array $node, string $tagKey): bool
{
    if ($tagKey === '') {
        return false;
    }
    foreach ($node as $key => $value) {
        if (is_array($value)) {
            if (jg_sku_shopee_tag_present($value, $tagKey)) {
                return true;
            }
            continue;
        }

        if (!preg_match('/sku|tag|model|item|variation|option/i', (string) $key)) {
            continue;
        }
        if (jg_sku_shopee_key((string) $value) === $tagKey) {
            return true;
        }
    }
    return false;
}

function jg_sku_shopee_child_contexts(array $node): array
{
    $contexts = [];
    $stack = [['node' => $node, 'path' => '']];
    while ($stack !== []) {
        $frame = array_pop($stack);
        $current = $frame['node'] ?? null;
        $path = (string) ($frame['path'] ?? '');
        if (!is_array($current)) {
            continue;
        }
        if (jg_sku_shopee_price_paths($current, '', false) !== []) {
            $contexts[] = ['node' => $current, 'path' => $path];
        }
        foreach ($current as $key => $value) {
            if (is_array($value)) {
                $childPath = $path === '' ? (string) $key : $path . '.' . (string) $key;
                $stack[] = ['node' => $value, 'path' => $childPath];
            }
        }
    }
    return $contexts;
}

function jg_sku_shopee_best_price(array $node, bool $recursive = true): ?array
{
    $candidates = jg_sku_shopee_price_paths($node, '', $recursive);
    if ($candidates === []) {
        return null;
    }
    usort($candidates, static function (array $left, array $right): int {
        return ((int) ($right['priority'] ?? 0) <=> (int) ($left['priority'] ?? 0))
            ?: strcmp((string) ($left['path'] ?? ''), (string) ($right['path'] ?? ''));
    });
    return $candidates[0];
}

function jg_sku_shopee_order_timestamp(array $row): string
{
    foreach (['order_create_time', 'timestamp_utc', 'timestamp', 'created_at', 'update_time'] as $key) {
        $value = trim((string) ($row[$key] ?? ''));
        if ($value !== '') {
            return $value;
        }
    }
    return '';
}

function jg_sku_shopee_observations_for_tag(array $orderRow, string $tagKey): array
{
    $decoded = [];
    if (isset($orderRow['raw_json']) && is_string($orderRow['raw_json']) && trim($orderRow['raw_json']) !== '') {
        $json = json_decode($orderRow['raw_json'], true);
        if (is_array($json)) {
            $decoded = $json;
        }
    }
    $root = array_replace_recursive($decoded, $orderRow);
    $contexts = jg_sku_shopee_child_contexts($root);
    $timestamp = jg_sku_shopee_order_timestamp($root);
    $observations = [];

    foreach ($contexts as $context) {
        $contextNode = $context['node'] ?? null;
        if (!is_array($contextNode)) {
            continue;
        }
        if (!jg_sku_shopee_tag_present($contextNode, $tagKey)) {
            continue;
        }
        $best = jg_sku_shopee_best_price($contextNode, false);
        if (!is_array($best)) {
            continue;
        }
        $contextPath = (string) ($context['path'] ?? '');
        $sourcePath = (string) $best['path'];
        if ($contextPath !== '' && $sourcePath !== '') {
            $sourcePath = $contextPath . '.' . $sourcePath;
        }
        $observations[] = [
            'price' => (float) $best['price'],
            'source_path' => $sourcePath,
            'priority' => (int) $best['priority'],
            'order_id' => (string) ($root['order_id'] ?? ''),
            'order_create_time' => $timestamp,
        ];
    }

    if ($observations === []
        && jg_sku_shopee_tag_present($root, $tagKey)
        && isset($root['gross_revenue'], $root['quantity'])
        && (float) $root['quantity'] > 0
    ) {
        $amount = jg_sku_shopee_money((float) $root['gross_revenue'] / (float) $root['quantity']);
        if ($amount !== null) {
            $observations[] = [
                'price' => $amount,
                'source_path' => 'gross_revenue / quantity',
                'priority' => 45,
                'order_id' => (string) ($root['order_id'] ?? ''),
                'order_create_time' => $timestamp,
            ];
        }
    }

    return $observations;
}

function jg_sku_shopee_confidence(array $observation): string
{
    $priority = (int) ($observation['priority'] ?? 0);
    if ($priority >= 85) {
        return 'high';
    }
    if ($priority >= 45) {
        return 'review';
    }
    return 'low';
}

function jg_sku_shopee_pick_observation(array $observations): ?array
{
    if ($observations === []) {
        return null;
    }
    usort($observations, static function (array $left, array $right): int {
        return ((int) ($right['priority'] ?? 0) <=> (int) ($left['priority'] ?? 0))
            ?: strcmp((string) ($right['order_create_time'] ?? ''), (string) ($left['order_create_time'] ?? ''));
    });
    return $observations[0];
}

function jg_sku_shopee_price_suggestions_from_rows(array $skuRows, array $orderRows): array
{
    $suggestions = [];
    foreach ($skuRows as $skuRow) {
        if (!is_array($skuRow)) {
            continue;
        }
        $tag = (string) ($skuRow['tag'] ?? '');
        $tagKey = jg_sku_shopee_key($tag);
        if ($tagKey === '') {
            continue;
        }

        $observations = [];
        foreach ($orderRows as $orderRow) {
            if (!is_array($orderRow)) {
                continue;
            }
            $observations = array_merge($observations, jg_sku_shopee_observations_for_tag($orderRow, $tagKey));
        }
        $best = jg_sku_shopee_pick_observation($observations);
        if (!is_array($best)) {
            continue;
        }

        $priceCounts = [];
        foreach ($observations as $observation) {
            $priceKey = number_format((float) ($observation['price'] ?? 0), 2, '.', '');
            $priceCounts[$priceKey] = ($priceCounts[$priceKey] ?? 0) + 1;
        }
        arsort($priceCounts);

        $suggestedPrice = number_format((float) $best['price'], 2, '.', '');
        $currentPrice = number_format((float) ($skuRow['sale_price'] ?? 0), 2, '.', '');
        $suggestions[] = [
            'sku' => (string) ($skuRow['sku'] ?? ''),
            'tag' => $tag,
            'product_name' => (string) ($skuRow['product_name'] ?? ''),
            'brand_name' => (string) ($skuRow['brand_name'] ?? ''),
            'flavor_name' => (string) ($skuRow['flavor_name'] ?? ''),
            'current_sale_price' => $currentPrice,
            'suggested_sale_price' => $suggestedPrice,
            'changed' => $currentPrice !== $suggestedPrice,
            'confidence' => jg_sku_shopee_confidence($best),
            'source_path' => (string) ($best['source_path'] ?? ''),
            'latest_order_at' => (string) ($best['order_create_time'] ?? ''),
            'order_id' => (string) ($best['order_id'] ?? ''),
            'observation_count' => count($observations),
            'price_counts' => $priceCounts,
        ];
    }

    usort($suggestions, static function (array $left, array $right): int {
        return strcmp((string) ($left['sku'] ?? ''), (string) ($right['sku'] ?? ''));
    });
    return $suggestions;
}

function jg_sku_shopee_fetch_sku_rows(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT s.sku, s.tag, s.sale_price, b.name AS brand_name, p.name AS product_name, f.name AS flavor_name
         FROM sku_skus s
         INNER JOIN sku_brands b ON b.id = s.brand_id
         INNER JOIN sku_products p ON p.id = s.product_id
         INNER JOIN sku_flavors f ON f.id = s.flavor_id
         WHERE s.tag <> ""
         ORDER BY s.sku'
    );
    return array_values(array_filter($stmt->fetchAll(), 'is_array'));
}

function jg_sku_shopee_fetch_order_rows(PDO $analyticsPdo, int $days = 365, int $limit = 20000): array
{
    $start = (new DateTimeImmutable('now', new DateTimeZone('UTC')))
        ->modify('-' . max(1, $days) . ' days')
        ->format('Y-m-d H:i:s');
    $stmt = $analyticsPdo->prepare(
        'SELECT sku, item_key, product_name, marketplace_product_name, quantity, gross_revenue,
                net_revenue, revenue, order_id, order_create_time, timestamp_utc, raw_json
         FROM dashboard_order_mirror
         WHERE platform = "shopee"
           AND (deleted_at IS NULL OR deleted_at = "")
           AND COALESCE(NULLIF(order_create_time, ""), NULLIF(timestamp_utc, "")) >= :start_at
           AND raw_json IS NOT NULL
           AND raw_json <> ""
         ORDER BY COALESCE(NULLIF(order_create_time, ""), NULLIF(timestamp_utc, "")) DESC
         LIMIT ' . max(1, min(50000, $limit))
    );
    $stmt->execute([':start_at' => $start]);
    return array_values(array_filter($stmt->fetchAll(), 'is_array'));
}

function jg_sku_shopee_preview(PDO $skuPdo, PDO $analyticsPdo, array $options = []): array
{
    $days = max(30, min(730, (int) ($options['days'] ?? 365)));
    $skuRows = jg_sku_shopee_fetch_sku_rows($skuPdo);
    $orderRows = jg_sku_shopee_fetch_order_rows($analyticsPdo, $days);
    $suggestions = jg_sku_shopee_price_suggestions_from_rows($skuRows, $orderRows);

    return [
        'ok' => true,
        'meta' => [
            'source' => 'dashboard_order_mirror.raw_json',
            'platform' => 'shopee',
            'lookback_days' => $days,
            'sku_count' => count($skuRows),
            'order_rows_scanned' => count($orderRows),
            'matched_count' => count($suggestions),
            'changed_count' => count(array_filter($suggestions, static fn (array $row): bool => !empty($row['changed']))),
            'generated_at' => gmdate(DATE_ATOM),
        ],
        'suggestions' => $suggestions,
    ];
}

function jg_sku_table_exists(PDO $pdo, string $tableName): bool
{
    try {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*)
             FROM INFORMATION_SCHEMA.TABLES
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = :table_name'
        );
        $stmt->execute([':table_name' => $tableName]);
        return (int) $stmt->fetchColumn() > 0;
    } catch (Throwable) {
        return false;
    }
}

function jg_sku_sync_sale_prices_to_site(PDO $pdo): array
{
    $now = gmdate('Y-m-d H:i:s');
    $results = [];
    foreach ([
        'jenang_gemi_store_items' => 'Jenang Gemi Store',
        'zero_store_items' => 'ZERO Store',
    ] as $tableName => $label) {
        if (!jg_sku_table_exists($pdo, $tableName)) {
            $results[] = ['table' => $tableName, 'label' => $label, 'updated' => 0, 'skipped' => true];
            continue;
        }
        $stmt = $pdo->prepare(
            'UPDATE `' . $tableName . '` i
             INNER JOIN sku_skus s ON s.sku = i.sku
             SET i.site_price = s.sale_price,
                 i.updated_at = :updated_at
             WHERE s.sale_price > 0
               AND i.sku <> ""
               AND ROUND(i.site_price, 2) <> ROUND(s.sale_price, 2)'
        );
        $stmt->execute([':updated_at' => $now]);
        $results[] = ['table' => $tableName, 'label' => $label, 'updated' => $stmt->rowCount(), 'skipped' => false];
    }
    return [
        'ok' => true,
        'synced_at' => gmdate(DATE_ATOM),
        'results' => $results,
        'updated' => array_sum(array_map(static fn (array $row): int => (int) ($row['updated'] ?? 0), $results)),
    ];
}
