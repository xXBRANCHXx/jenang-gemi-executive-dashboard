<?php
declare(strict_types=1);

function jg_inventory_recap_int_option(array $input, string $key, int $default, int $min, int $max): int
{
    $value = (int) ($input[$key] ?? $default);
    return max($min, min($max, $value));
}

function jg_inventory_recap_today(array $input = []): DateTimeImmutable
{
    $timezone = new DateTimeZone('Asia/Jakarta');
    $raw = trim((string) ($input['today'] ?? ''));
    if ($raw !== '') {
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $raw, $timezone);
        if ($date instanceof DateTimeImmutable) {
            return $date;
        }
    }

    return new DateTimeImmutable('today', $timezone);
}

function jg_inventory_recap_options(array $input = []): array
{
    $lookbackDays = jg_inventory_recap_int_option($input, 'lookback_days', 45, 14, 120);
    $orderDays = jg_inventory_recap_int_option($input, 'order_days', 30, 7, 90);
    $bufferDays = jg_inventory_recap_int_option($input, 'buffer_days', 10, 0, 45);
    $today = jg_inventory_recap_today($input);
    $start = $today->modify('-' . max(0, $lookbackDays - 1) . ' days');
    $endExclusive = $today->modify('+1 day');

    return [
        'lookback_days' => $lookbackDays,
        'order_days' => $orderDays,
        'buffer_days' => $bufferDays,
        'target_days' => $orderDays + $bufferDays,
        'today' => $today->format('Y-m-d'),
        'start_date' => $start->format('Y-m-d'),
        'end_date' => $today->format('Y-m-d'),
        'start_at_utc' => $start->setTime(0, 0)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.u'),
        'end_at_utc' => $endExclusive->setTime(0, 0)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.u'),
    ];
}

function jg_inventory_recap_number(mixed $value): float
{
    if (is_numeric($value)) {
        return (float) $value;
    }
    $normalized = preg_replace('/[^0-9.\-]+/', '', (string) $value);
    return is_numeric($normalized) ? (float) $normalized : 0.0;
}

function jg_inventory_recap_normalize_key(string $value): string
{
    $key = strtoupper(preg_replace('/[^A-Z0-9]+/i', '', trim($value)) ?? '');
    return str_replace('SALTEDCARAMEL', 'SALTCARAMEL', $key);
}

function jg_inventory_recap_product_name_map(): array
{
    static $map = null;
    if (is_array($map)) {
        return $map;
    }

    $path = __DIR__ . '/sku-product-names.json';
    $raw = is_file($path) ? @file_get_contents($path) : '';
    $decoded = is_string($raw) ? json_decode($raw, true) : null;
    $map = is_array($decoded) ? $decoded : [];
    return $map;
}

function jg_inventory_recap_display_product_name(array $row): string
{
    $sku = trim((string) ($row['sku'] ?? ''));
    $mapped = trim((string) (jg_inventory_recap_product_name_map()[$sku] ?? ''));
    if ($mapped !== '') {
        return $mapped;
    }

    $volume = jg_inventory_recap_number($row['volume'] ?? 0);
    $volumeText = $volume > 0 ? rtrim(rtrim(number_format($volume, 1, '.', ''), '0'), '.') : '';
    return trim(implode(' ', array_filter([
        trim($volumeText . (string) ($row['unit_name'] ?? '')),
        trim((string) ($row['flavor_name'] ?? '')),
        trim((string) ($row['product_name'] ?? $sku)),
    ], static fn (string $part): bool => $part !== '')));
}

function jg_inventory_recap_sku_rows(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT
            s.sku,
            s.tag,
            s.volume,
            s.astra,
            s.starting_stock,
            s.current_stock,
            s.stock_trigger,
            s.inventory_mode,
            s.skip_scan,
            s.cogs,
            s.sale_price,
            b.name AS brand_name,
            u.name AS unit_name,
            p.name AS product_name,
            f.name AS flavor_name
         FROM sku_skus s
         INNER JOIN sku_brands b ON b.id = s.brand_id
         INNER JOIN sku_units u ON u.id = s.unit_id
         INNER JOIN sku_products p ON p.id = s.product_id
         INNER JOIN sku_flavors f ON f.id = s.flavor_id
         ORDER BY b.name, p.name, f.name, s.sku'
    );

    $rows = [];
    foreach ($stmt->fetchAll() as $row) {
        $inventoryMode = strtolower(trim((string) ($row['inventory_mode'] ?? 'auto')));
        if (in_array($inventoryMode, ['off', 'disabled', 'ignore', 'no_inventory'], true)) {
            continue;
        }
        $volume = max(0.0, jg_inventory_recap_number($row['volume'] ?? 0));
        $astra = max(0.0, jg_inventory_recap_number($row['astra'] ?? $volume));
        $rows[] = [
            'sku' => (string) ($row['sku'] ?? ''),
            'tag' => (string) ($row['tag'] ?? ''),
            'brand_name' => (string) ($row['brand_name'] ?? ''),
            'unit_name' => (string) ($row['unit_name'] ?? ''),
            'base_product_name' => (string) ($row['product_name'] ?? ''),
            'product_name' => jg_inventory_recap_display_product_name($row),
            'flavor_name' => (string) ($row['flavor_name'] ?? ''),
            'volume' => $volume,
            'astra' => $astra,
            'quantity_multiplier' => $volume > 0 && $astra > 0 ? max(1.0, $volume / $astra) : 1.0,
            'starting_stock' => max(0.0, jg_inventory_recap_number($row['starting_stock'] ?? 0)),
            'current_stock' => max(0.0, jg_inventory_recap_number($row['current_stock'] ?? 0)),
            'stock_trigger' => max(0.0, jg_inventory_recap_number($row['stock_trigger'] ?? 0)),
            'inventory_mode' => $inventoryMode !== '' ? $inventoryMode : 'auto',
            'skip_scan' => (int) ($row['skip_scan'] ?? 0) === 1,
            'cogs' => max(0.0, jg_inventory_recap_number($row['cogs'] ?? 0)),
            'sale_price' => max(0.0, jg_inventory_recap_number($row['sale_price'] ?? 0)),
        ];
    }

    return $rows;
}

function jg_inventory_recap_sku_aliases(array $sku): array
{
    $volume = jg_inventory_recap_number($sku['volume'] ?? 0);
    $volumeText = $volume > 0 ? rtrim(rtrim(number_format($volume, 1, '.', ''), '0'), '.') : '';
    $brand = (string) ($sku['brand_name'] ?? '');
    $brandInitial = $brand !== '' ? substr($brand, 0, 1) : '';
    $aliases = [
        (string) ($sku['sku'] ?? ''),
        (string) ($sku['tag'] ?? ''),
        (string) ($sku['product_name'] ?? ''),
        trim((string) ($sku['brand_name'] ?? '') . ' ' . (string) ($sku['base_product_name'] ?? '') . ' ' . (string) ($sku['flavor_name'] ?? '')),
        trim($brandInitial . ' ' . (string) ($sku['base_product_name'] ?? '') . ' ' . (string) ($sku['flavor_name'] ?? '') . ' ' . $volumeText . (string) ($sku['unit_name'] ?? '')),
    ];

    return array_values(array_unique(array_filter(array_map('jg_inventory_recap_normalize_key', $aliases))));
}

function jg_inventory_recap_sku_lookup(array $skus): array
{
    $lookup = [];
    foreach ($skus as $index => $sku) {
        foreach (jg_inventory_recap_sku_aliases($sku) as $alias) {
            if ($alias !== '') {
                $lookup[$alias] = $index;
            }
        }
    }
    uksort($lookup, static fn (string $left, string $right): int => strlen($right) <=> strlen($left));
    return $lookup;
}

function jg_inventory_recap_mirror_order_rows(PDO $pdo, array $options): array
{
    try {
        $stmt = $pdo->prepare(
            'SELECT sku, item_key, product_name, marketplace_product_name, base_product_name,
                    flavor_name, quantity, order_create_time, timestamp_utc, platform, account_key,
                    order_id, status
             FROM dashboard_order_mirror
             WHERE (deleted_at IS NULL OR deleted_at = "")
               AND COALESCE(order_create_time, timestamp_utc) >= :start_at
               AND COALESCE(order_create_time, timestamp_utc) < :end_at
               AND quantity > 0
               AND UPPER(COALESCE(status, "")) NOT IN ("CANCELLED", "CANCELED", "DELETED", "REMOVED")
             ORDER BY COALESCE(order_create_time, timestamp_utc) DESC'
        );
        $stmt->execute([
            ':start_at' => (string) $options['start_at_utc'],
            ':end_at' => (string) $options['end_at_utc'],
        ]);
        $rows = $stmt->fetchAll();
    } catch (Throwable) {
        return [];
    }

    return array_map(static fn (array $row): array => $row + ['source' => 'dashboard_order_mirror'], $rows);
}

function jg_inventory_recap_website_order_rows(PDO $pdo, array $options): array
{
    if (!function_exists('jg_website_paid_order_rows')) {
        return [];
    }

    try {
        $rows = jg_website_paid_order_rows($pdo, (string) $options['start_date'], (string) $options['end_date']);
    } catch (Throwable) {
        return [];
    }

    return array_map(static fn (array $row): array => $row + ['source' => 'website_paid_order'], $rows);
}

function jg_inventory_recap_order_rows(PDO $analyticsPdo, array $options): array
{
    return array_merge(
        jg_inventory_recap_mirror_order_rows($analyticsPdo, $options),
        jg_inventory_recap_website_order_rows($analyticsPdo, $options)
    );
}

function jg_inventory_recap_match_sku_index(array $orderRow, array $lookup): ?int
{
    $candidates = [
        (string) ($orderRow['sku'] ?? ''),
        (string) ($orderRow['item_key'] ?? ''),
        (string) ($orderRow['product_name'] ?? ''),
        (string) ($orderRow['marketplace_product_name'] ?? ''),
        (string) ($orderRow['base_product_name'] ?? ''),
    ];
    foreach ($candidates as $candidate) {
        $key = jg_inventory_recap_normalize_key($candidate);
        if ($key !== '' && isset($lookup[$key])) {
            return (int) $lookup[$key];
        }
    }

    $haystack = jg_inventory_recap_normalize_key(implode(' ', $candidates));
    if ($haystack === '') {
        return null;
    }
    foreach ($lookup as $alias => $index) {
        if (strlen((string) $alias) >= 5 && str_contains($haystack, (string) $alias)) {
            return (int) $index;
        }
    }

    return null;
}

function jg_inventory_recap_risk(float $daysRemaining, float $currentStock, float $stockTrigger, int $targetDays, bool $hasDemand): array
{
    if (!$hasDemand) {
        if ($stockTrigger > 0 && $currentStock <= $stockTrigger) {
            return ['key' => 'watch', 'label' => 'Watch', 'color' => '#d97706', 'score' => 2];
        }
        return ['key' => 'quiet', 'label' => 'No recent demand', 'color' => '#64748b', 'score' => 0];
    }
    if ($daysRemaining <= 10 || ($stockTrigger > 0 && $currentStock <= $stockTrigger && $daysRemaining <= $targetDays)) {
        return ['key' => 'critical', 'label' => 'Critical', 'color' => '#dc2626', 'score' => 5];
    }
    if ($daysRemaining <= 20) {
        return ['key' => 'high', 'label' => 'High risk', 'color' => '#ea580c', 'score' => 4];
    }
    if ($daysRemaining <= 30) {
        return ['key' => 'medium', 'label' => 'Month tight', 'color' => '#d97706', 'score' => 3];
    }
    if ($daysRemaining <= $targetDays) {
        return ['key' => 'low', 'label' => 'Buffer tight', 'color' => '#65a30d', 'score' => 1];
    }
    return ['key' => 'covered', 'label' => 'Covered', 'color' => '#16a34a', 'score' => 0];
}

function jg_inventory_recap_format_idr(float|int $amount): string
{
    return 'Rp' . number_format((float) $amount, 0, ',', '.');
}

function jg_inventory_recap_order_draft(array $suggestions, array $summary, array $options): array
{
    $lines = [];
    foreach ($suggestions as $item) {
        $lines[] = sprintf(
            '- %s / %s: order %s ASTRA, minimum %s, buffer %s, est. %s',
            (string) ($item['sku'] ?? ''),
            (string) ($item['product_name'] ?? ''),
            number_format((float) ($item['recommended_order_qty'] ?? 0), 0, '.', ''),
            number_format((float) ($item['minimum_order_qty'] ?? 0), 0, '.', ''),
            number_format((float) ($item['buffer_order_qty'] ?? 0), 0, '.', ''),
            jg_inventory_recap_format_idr((float) ($item['estimated_cost'] ?? 0))
        );
    }
    if ($lines === []) {
        $lines[] = '- No production order needed from current velocity.';
    }

    $funding = !empty($summary['can_fund_recommended'])
        ? 'Cash Available can cover the recommended draft.'
        : 'Cash Available is short by ' . jg_inventory_recap_format_idr((float) ($summary['funding_gap'] ?? 0)) . '.';
    $text = implode("\n", array_merge([
        'Inventory Recap production draft',
        'Generated: ' . gmdate(DATE_ATOM),
        sprintf('Coverage target: %d days + %d day buffer (%d days total)', (int) $options['order_days'], (int) $options['buffer_days'], (int) $options['target_days']),
        'Estimated production cost: ' . jg_inventory_recap_format_idr((float) ($summary['total_recommended_cost'] ?? 0)),
        'Accounting Cash Available: ' . jg_inventory_recap_format_idr((float) ($summary['cash_available'] ?? 0)),
        'Funding: ' . $funding,
        '',
        'Items:',
    ], $lines));

    return [
        'title' => 'Inventory Recap production draft',
        'generated_at' => gmdate(DATE_ATOM),
        'coverage_days' => (int) $options['order_days'],
        'buffer_days' => (int) $options['buffer_days'],
        'total_cost' => (int) ($summary['total_recommended_cost'] ?? 0),
        'cash_available' => (int) ($summary['cash_available'] ?? 0),
        'funding_gap' => (int) ($summary['funding_gap'] ?? 0),
        'lines' => $lines,
        'text' => $text,
    ];
}

function jg_inventory_recap_payload(PDO $skuPdo, PDO $analyticsPdo, array $cashContext = [], array $input = []): array
{
    $options = jg_inventory_recap_options($input);
    $skus = jg_inventory_recap_sku_rows($skuPdo);
    $lookup = jg_inventory_recap_sku_lookup($skus);
    $demand = array_fill(0, count($skus), [
        'sold_qty' => 0.0,
        'sold_units' => 0,
        'order_count' => 0,
        'revenue' => 0.0,
        'sources' => [],
    ]);
    $matchedOrders = 0;
    $unmatchedOrders = 0;

    foreach (jg_inventory_recap_order_rows($analyticsPdo, $options) as $orderRow) {
        $skuIndex = jg_inventory_recap_match_sku_index($orderRow, $lookup);
        if ($skuIndex === null || !isset($skus[$skuIndex])) {
            $unmatchedOrders++;
            continue;
        }
        $matchedOrders++;
        $quantity = max(0.0, jg_inventory_recap_number($orderRow['quantity'] ?? 0));
        $astraQty = round($quantity * (float) ($skus[$skuIndex]['quantity_multiplier'] ?? 1), 2);
        $demand[$skuIndex]['sold_qty'] += $astraQty;
        $demand[$skuIndex]['sold_units'] += (int) round($quantity);
        $demand[$skuIndex]['order_count'] += 1;
        $demand[$skuIndex]['revenue'] += max(0.0, jg_inventory_recap_number($orderRow['revenue'] ?? $orderRow['net_revenue'] ?? 0));
        $source = (string) ($orderRow['source'] ?? 'orders');
        $demand[$skuIndex]['sources'][$source] = ((int) ($demand[$skuIndex]['sources'][$source] ?? 0)) + 1;
    }

    $items = [];
    foreach ($skus as $index => $sku) {
        $soldQty = round((float) ($demand[$index]['sold_qty'] ?? 0), 2);
        $dailyVelocity = $soldQty > 0 ? $soldQty / (int) $options['lookback_days'] : 0.0;
        $currentStock = (float) ($sku['current_stock'] ?? 0);
        $stockTrigger = (float) ($sku['stock_trigger'] ?? 0);
        $hasDemand = $dailyVelocity > 0;
        $daysRemaining = $hasDemand ? round($currentStock / $dailyVelocity, 1) : null;
        $monthTargetQty = $hasDemand ? (int) ceil($dailyVelocity * (int) $options['order_days']) : 0;
        $targetQty = $hasDemand ? (int) ceil($dailyVelocity * (int) $options['target_days']) : 0;
        $minimumOrderQty = max(0, (int) ceil($monthTargetQty - $currentStock));
        $recommendedOrderQty = max(0, (int) ceil($targetQty - $currentStock));
        $bufferOrderQty = max(0, $recommendedOrderQty - $minimumOrderQty);
        $postOrderStock = $currentStock + $recommendedOrderQty;
        $postOrderDays = $hasDemand ? round($postOrderStock / $dailyVelocity, 1) : null;
        $risk = jg_inventory_recap_risk($daysRemaining ?? 9999.0, $currentStock, $stockTrigger, (int) $options['target_days'], $hasDemand);
        $estimatedCost = (int) round($recommendedOrderQty * (float) ($sku['cogs'] ?? 0));
        $minimumCost = (int) round($minimumOrderQty * (float) ($sku['cogs'] ?? 0));
        $playPercent = $recommendedOrderQty > 0 ? round(($bufferOrderQty / $recommendedOrderQty) * 100, 1) : 0.0;

        $items[] = [
            ...$sku,
            'sold_qty_astra' => $soldQty,
            'sold_units' => (int) ($demand[$index]['sold_units'] ?? 0),
            'order_count' => (int) ($demand[$index]['order_count'] ?? 0),
            'daily_velocity' => round($dailyVelocity, 3),
            'current_days_remaining' => $daysRemaining,
            'month_target_qty' => $monthTargetQty,
            'target_qty' => $targetQty,
            'minimum_order_qty' => $minimumOrderQty,
            'recommended_order_qty' => $recommendedOrderQty,
            'buffer_order_qty' => $bufferOrderQty,
            'post_order_stock' => $postOrderStock,
            'post_order_days' => $postOrderDays,
            'estimated_cost' => $estimatedCost,
            'minimum_cost' => $minimumCost,
            'buffer_cost' => max(0, $estimatedCost - $minimumCost),
            'margin_play_percent' => $playPercent,
            'restock_needed' => $recommendedOrderQty > 0,
            'risk' => $risk['key'],
            'risk_label' => $risk['label'],
            'risk_color' => $risk['color'],
            'risk_score' => $risk['score'],
            'demand_sources' => $demand[$index]['sources'] ?? [],
        ];
    }

    usort($items, static function (array $left, array $right): int {
        return ((int) ($right['risk_score'] ?? 0) <=> (int) ($left['risk_score'] ?? 0))
            ?: ((float) ($left['current_days_remaining'] ?? 9999) <=> (float) ($right['current_days_remaining'] ?? 9999))
            ?: strcmp((string) ($left['product_name'] ?? ''), (string) ($right['product_name'] ?? ''));
    });

    $suggestions = array_values(array_filter($items, static fn (array $item): bool => (int) ($item['recommended_order_qty'] ?? 0) > 0));
    $totalRecommendedCost = array_sum(array_map(static fn (array $item): int => (int) ($item['estimated_cost'] ?? 0), $suggestions));
    $totalMinimumCost = array_sum(array_map(static fn (array $item): int => (int) ($item['minimum_cost'] ?? 0), $suggestions));
    $cashAvailable = max(0, (int) round(jg_inventory_recap_number($cashContext['amount'] ?? $cashContext['cash_available'] ?? 0)));
    $fundingGap = max(0, $totalRecommendedCost - $cashAvailable);
    $criticalCount = count(array_filter($items, static fn (array $item): bool => ($item['risk'] ?? '') === 'critical'));
    $highCount = count(array_filter($items, static fn (array $item): bool => in_array((string) ($item['risk'] ?? ''), ['high', 'medium'], true)));
    $reportCritical = $criticalCount > 0 || $fundingGap > 0;

    $summary = [
        'total_skus' => count($items),
        'suggested_count' => count($suggestions),
        'critical_count' => $criticalCount,
        'watch_count' => $highCount,
        'total_recommended_qty' => array_sum(array_map(static fn (array $item): int => (int) ($item['recommended_order_qty'] ?? 0), $suggestions)),
        'total_minimum_qty' => array_sum(array_map(static fn (array $item): int => (int) ($item['minimum_order_qty'] ?? 0), $suggestions)),
        'total_buffer_qty' => array_sum(array_map(static fn (array $item): int => (int) ($item['buffer_order_qty'] ?? 0), $suggestions)),
        'total_recommended_cost' => $totalRecommendedCost,
        'total_minimum_cost' => $totalMinimumCost,
        'total_buffer_cost' => max(0, $totalRecommendedCost - $totalMinimumCost),
        'cash_available' => $cashAvailable,
        'funding_gap' => $fundingGap,
        'can_fund_recommended' => $fundingGap === 0,
        'report_status' => $reportCritical ? 'critical' : (count($suggestions) > 0 ? 'watch' : 'clear'),
        'is_critical' => $reportCritical,
        'matched_order_rows' => $matchedOrders,
        'unmatched_order_rows' => $unmatchedOrders,
    ];

    return [
        'ok' => true,
        'meta' => [
            'generated_at' => gmdate(DATE_ATOM),
            'source' => 'inventory_recap',
            'cash_source' => (string) ($cashContext['source'] ?? 'accounting_summary'),
            ...$options,
        ],
        'summary' => $summary,
        'cash' => [
            'available' => $cashAvailable,
            'source' => (string) ($cashContext['source'] ?? 'accounting_summary'),
            'label' => (string) ($cashContext['label'] ?? 'Accounting Cash Available'),
            'warning' => (string) ($cashContext['warning'] ?? ''),
        ],
        'suggestions' => $suggestions,
        'items' => $items,
        'production_order_draft' => jg_inventory_recap_order_draft($suggestions, $summary, $options),
    ];
}

function jg_inventory_recap_accounting_cash_context(PDO $pdo, string $month = ''): array
{
    try {
        if (function_exists('jg_accounting_ensure_schema')) {
            jg_accounting_ensure_schema($pdo);
        }
        $month = $month !== '' ? $month : (function_exists('jg_accounting_month') ? jg_accounting_month(null) : gmdate('Y-m'));
        if (function_exists('jg_accounting_summary')) {
            $summary = jg_accounting_summary($pdo, $month);
            return [
                'amount' => (int) ($summary['kpis']['real_cash_available'] ?? 0),
                'source' => 'accounting_summary.real_cash_available',
                'label' => 'Accounting Cash Available',
                'month' => $month,
                'kpis' => $summary['kpis'] ?? [],
            ];
        }
    } catch (Throwable $error) {
        return [
            'amount' => 0,
            'source' => 'accounting_unavailable',
            'label' => 'Accounting Cash Available',
            'month' => $month,
            'warning' => $error->getMessage(),
        ];
    }

    return [
        'amount' => 0,
        'source' => 'accounting_unavailable',
        'label' => 'Accounting Cash Available',
        'month' => $month,
        'warning' => 'Accounting summary is unavailable.',
    ];
}
