<?php
declare(strict_types=1);

function jg_inventory_recap_int_option(array $input, string $key, int $default, int $min, int $max): int
{
    $value = (int) ($input[$key] ?? $default);
    return max($min, min($max, $value));
}

function jg_inventory_recap_today(array $input = []): DateTimeImmutable
{
    $timezone = jg_inventory_recap_timezone();
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
    $lookbackDays = 90;
    $today = jg_inventory_recap_today($input);
    $start = $today->modify('-' . max(0, $lookbackDays - 1) . ' days');
    $endExclusive = $today->modify('+1 day');

    return [
        'lookback_days' => $lookbackDays,
        'forecast_history_days' => $lookbackDays,
        'bucket_days' => 10,
        'bucket_count' => 9,
        'reorder_fraction' => 0.25,
        'reorder_days_equivalent' => 7.5,
        'purchase_fraction' => 0.35,
        'purchase_days_equivalent' => 10.5,
        'today' => $today->format('Y-m-d'),
        'start_date' => $start->format('Y-m-d'),
        'end_date' => $today->format('Y-m-d'),
        'history_start_date' => $start->format('Y-m-d'),
        'start_at_utc' => $start->setTime(0, 0)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.u'),
        'history_start_at_utc' => $start->setTime(0, 0)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.u'),
        'end_at_utc' => $endExclusive->setTime(0, 0)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.u'),
        'forecast_model' => '90_day_trigger',
    ];
}

function jg_inventory_recap_timezone(): DateTimeZone
{
    static $timezone = null;
    if (!$timezone instanceof DateTimeZone) {
        $timezone = new DateTimeZone('Asia/Jakarta');
    }
    return $timezone;
}

function jg_inventory_recap_number(mixed $value): float
{
    if (is_numeric($value)) {
        return (float) $value;
    }
    $normalized = preg_replace('/[^0-9.\-]+/', '', (string) $value);
    return is_numeric($normalized) ? (float) $normalized : 0.0;
}

function jg_inventory_recap_decimal_key(float $value): string
{
    return rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.') ?: '0';
}

function jg_inventory_recap_normalize_key(string $value): string
{
    $key = strtoupper(preg_replace('/[^A-Z0-9]+/i', '', trim($value)) ?? '');
    return str_replace('SALTEDCARAMEL', 'SALTCARAMEL', $key);
}

function jg_inventory_recap_date_from_string(string $value): ?DateTimeImmutable
{
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, jg_inventory_recap_timezone());
    return $date instanceof DateTimeImmutable ? $date : null;
}

function jg_inventory_recap_order_date(array $orderRow): string
{
    $raw = trim((string) ($orderRow['order_create_time'] ?? $orderRow['timestamp_utc'] ?? ''));
    if ($raw === '') {
        return '';
    }

    $date = null;
    try {
        if (preg_match('/(?:Z|[+-]\d{2}:?\d{2})$/i', $raw) === 1) {
            $date = new DateTimeImmutable($raw);
        } else {
            foreach (['!Y-m-d H:i:s.u', '!Y-m-d H:i:s', '!Y-m-d\TH:i:s.u', '!Y-m-d\TH:i:s'] as $format) {
                $parsed = DateTimeImmutable::createFromFormat($format, $raw, new DateTimeZone('UTC'));
                if ($parsed instanceof DateTimeImmutable) {
                    $date = $parsed;
                    break;
                }
            }
        }
    } catch (Throwable) {
        $date = null;
    }

    return $date instanceof DateTimeImmutable
        ? $date->setTimezone(jg_inventory_recap_timezone())->format('Y-m-d')
        : '';
}

function jg_inventory_recap_date_in_range(string $date, string $startDate, string $endDate): bool
{
    return $date !== '' && strcmp($date, $startDate) >= 0 && strcmp($date, $endDate) <= 0;
}

function jg_inventory_recap_forecast_confidence(int $soldDays, float $total): string
{
    if ($soldDays >= 30 && $total >= 30) return 'high';
    if ($soldDays >= 10 && $total >= 10) return 'medium';
    return 'low';
}

function jg_inventory_recap_standard_deviation(array $values): float
{
    $count = count($values);
    if ($count < 2) return 0.0;
    $mean = array_sum($values) / $count;
    $variance = array_sum(array_map(
        static fn (mixed $value): float => (((float) $value) - $mean) ** 2,
        $values
    )) / $count;
    return sqrt(max(0.0, $variance));
}

function jg_inventory_recap_empty_trigger_model(array $options): array
{
    return [
        'has_demand' => false,
        'sold_days' => 0,
        'total_90_day_demand' => 0.0,
        'average_30_day_demand' => 0.0,
        'ten_day_buckets' => array_fill(0, (int) ($options['bucket_count'] ?? 9), 0.0),
        'average_10_day_change' => 0.0,
        'overall_90_day_change' => 0.0,
        'trend_adjustment' => 0.0,
        'fluctuation_buffer' => 0.0,
        'large_order_buffer' => 0.0,
        'applied_buffer' => 0.0,
        'adjusted_30_day_demand' => 0.0,
        'reorder_fraction' => (float) ($options['reorder_fraction'] ?? 0.25),
        'purchase_fraction' => (float) ($options['purchase_fraction'] ?? 0.35),
        'purchase_target_qty' => 0,
        'automatic_trigger' => 0,
        'forecast_confidence' => 'none',
        'forecast_method' => (string) ($options['forecast_model'] ?? '90_day_trigger'),
    ];
}

/**
 * Turns 90 calendar days into a stock quantity trigger. Nine ten-day blocks
 * preserve increases/decreases while the larger of ordinary fluctuation and
 * the largest order day protects the recommendation from demand spikes.
 */
function jg_inventory_recap_trigger_model(array $dailyHistory, array $options): array
{
    $start = jg_inventory_recap_date_from_string((string) ($options['start_date'] ?? ''));
    $today = jg_inventory_recap_date_from_string((string) ($options['today'] ?? ''));
    if (!$start instanceof DateTimeImmutable || !$today instanceof DateTimeImmutable || $start > $today) {
        return jg_inventory_recap_empty_trigger_model($options);
    }

    $bucketDays = max(1, (int) ($options['bucket_days'] ?? 10));
    $bucketCount = max(1, (int) ($options['bucket_count'] ?? 9));
    $buckets = array_fill(0, $bucketCount, 0.0);
    $dailyQuantities = [];
    $soldDays = 0;
    $cursor = $start;
    for ($dayIndex = 0; $dayIndex < $bucketDays * $bucketCount && $cursor <= $today; $dayIndex++) {
        $dateKey = $cursor->format('Y-m-d');
        $quantity = max(0.0, (float) ($dailyHistory[$dateKey] ?? 0));
        $dailyQuantities[] = $quantity;
        $bucketIndex = min($bucketCount - 1, intdiv($dayIndex, $bucketDays));
        $buckets[$bucketIndex] += $quantity;
        if ($quantity > 0) $soldDays++;
        $cursor = $cursor->modify('+1 day');
    }

    $total = array_sum($dailyQuantities);
    if ($total <= 0) return jg_inventory_recap_empty_trigger_model($options);

    $changes = [];
    for ($index = 1; $index < count($buckets); $index++) {
        $changes[] = $buckets[$index] - $buckets[$index - 1];
    }
    $averageChange = $changes !== [] ? array_sum($changes) / count($changes) : 0.0;
    $overallChange = $buckets[count($buckets) - 1] - $buckets[0];
    $baseline30 = $total / 3;
    $tenDayProjection = $averageChange * 3;
    $overallProjection = count($buckets) > 1 ? $overallChange * (3 / (count($buckets) - 1)) : 0.0;
    $uncappedTrend = ($tenDayProjection + $overallProjection) / 2;
    $trendLimit = $baseline30 * 0.5;
    $trendAdjustment = max(-$trendLimit, min($trendLimit, $uncappedTrend));
    $fluctuationBuffer = jg_inventory_recap_standard_deviation($buckets) * sqrt(3);
    $largeOrderBuffer = max($dailyQuantities ?: [0.0]);
    $appliedBuffer = max($fluctuationBuffer, $largeOrderBuffer);
    $adjusted30 = max(0.0, $baseline30 + $trendAdjustment + $appliedBuffer);
    $reorderFraction = max(0.01, min(1.0, (float) ($options['reorder_fraction'] ?? 0.25)));
    $purchaseFraction = max(0.01, min(1.0, (float) ($options['purchase_fraction'] ?? 0.35)));

    return [
        'has_demand' => true,
        'sold_days' => $soldDays,
        'total_90_day_demand' => round($total, 2),
        'average_30_day_demand' => round($baseline30, 2),
        'ten_day_buckets' => array_map(static fn (float $value): float => round($value, 2), $buckets),
        'average_10_day_change' => round($averageChange, 2),
        'overall_90_day_change' => round($overallChange, 2),
        'trend_adjustment' => round($trendAdjustment, 2),
        'fluctuation_buffer' => round($fluctuationBuffer, 2),
        'large_order_buffer' => round($largeOrderBuffer, 2),
        'applied_buffer' => round($appliedBuffer, 2),
        'adjusted_30_day_demand' => round($adjusted30, 2),
        'reorder_fraction' => $reorderFraction,
        'purchase_fraction' => $purchaseFraction,
        'purchase_target_qty' => (int) ceil($adjusted30 * $purchaseFraction),
        'automatic_trigger' => (int) ceil($adjusted30 * $reorderFraction),
        'forecast_confidence' => jg_inventory_recap_forecast_confidence($soldDays, $total),
        'forecast_method' => (string) ($options['forecast_model'] ?? '90_day_trigger'),
    ];
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
            s.brand_id,
            s.unit_id,
            s.volume,
            s.astra,
            s.flavor_id,
            s.product_id,
            s.starting_stock,
            s.current_stock,
            s.stock_trigger,
            s.inventory_mode,
            s.purchase_moq,
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
            'brand_id' => (string) ($row['brand_id'] ?? ''),
            'unit_id' => (string) ($row['unit_id'] ?? ''),
            'brand_name' => (string) ($row['brand_name'] ?? ''),
            'unit_name' => (string) ($row['unit_name'] ?? ''),
            'product_id' => (string) ($row['product_id'] ?? ''),
            'flavor_id' => (string) ($row['flavor_id'] ?? ''),
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
            'purchase_moq' => max(1, (int) ($row['purchase_moq'] ?? 1)),
            'skip_scan' => (int) ($row['skip_scan'] ?? 0) === 1,
            'cogs' => max(0.0, jg_inventory_recap_number($row['cogs'] ?? 0)),
            'sale_price' => max(0.0, jg_inventory_recap_number($row['sale_price'] ?? 0)),
        ];
    }

    return $rows;
}

function jg_inventory_recap_stock_group_key(array $sku): string
{
    return implode('|', [
        (string) ($sku['brand_id'] ?? ''),
        (string) ($sku['unit_id'] ?? ''),
        (string) ($sku['product_id'] ?? ''),
        (string) ($sku['flavor_id'] ?? ''),
        jg_inventory_recap_decimal_key(max(0.0, jg_inventory_recap_number($sku['astra'] ?? $sku['volume'] ?? 0))),
    ]);
}

function jg_inventory_recap_stock_index_map(array $skus): array
{
    $groups = [];
    foreach ($skus as $index => $sku) {
        $groups[jg_inventory_recap_stock_group_key($sku)][] = (int) $index;
    }

    $map = [];
    foreach ($groups as $indexes) {
        $stockIndex = null;
        foreach ($indexes as $index) {
            $volume = jg_inventory_recap_number($skus[$index]['volume'] ?? 0);
            $astra = jg_inventory_recap_number($skus[$index]['astra'] ?? $volume);
            if ($volume > 0 && $astra > 0 && abs($volume - $astra) < 0.01) {
                $stockIndex = (int) $index;
                break;
            }
        }

        if ($stockIndex === null) {
            foreach ($indexes as $index) {
                $map[(int) $index] = (int) $index;
            }
            continue;
        }

        foreach ($indexes as $index) {
            $map[(int) $index] = $stockIndex;
        }
    }

    return $map;
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
        $startAt = (string) ($options['history_start_at_utc'] ?? $options['start_at_utc']);
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
            ':start_at' => $startAt,
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
        $rows = jg_website_paid_order_rows($pdo, (string) ($options['history_start_date'] ?? $options['start_date']), (string) $options['end_date']);
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

function jg_inventory_recap_status(float $currentStock, int $triggerQty, bool $hasDemand, string $mode): array
{
    if ($triggerQty > 0 && $currentStock < $triggerQty) {
        return ['key' => 'triggered', 'label' => 'Purchase triggered', 'color' => '#dc2626', 'score' => 3];
    }
    if ($triggerQty > 0 && $currentStock <= $triggerQty * 1.2) {
        return ['key' => 'near', 'label' => 'Near trigger', 'color' => '#d97706', 'score' => 2];
    }
    if (!$hasDemand && $mode === 'auto') {
        return ['key' => 'quiet', 'label' => 'Build history', 'color' => '#64748b', 'score' => 0];
    }
    return ['key' => 'healthy', 'label' => 'Above trigger', 'color' => '#16a34a', 'score' => 0];
}

function jg_inventory_recap_round_to_moq(int $quantity, int $moq): int
{
    $quantity = max(0, $quantity);
    $moq = max(1, $moq);
    return $quantity === 0 ? 0 : (int) (ceil($quantity / $moq) * $moq);
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
            '- %s / %s: stock %d, trigger %d, trigger gap %d, 10.5-day order %d, MOQ %d, buy %d, est. %s',
            (string) ($item['sku'] ?? ''),
            (string) ($item['product_name'] ?? ''),
            (int) ($item['current_stock'] ?? 0),
            (int) ($item['trigger_qty'] ?? 0),
            (int) ($item['trigger_shortfall_qty'] ?? 0),
            (int) ($item['raw_purchase_qty'] ?? 0),
            (int) ($item['purchase_moq'] ?? 1),
            (int) ($item['recommended_order_qty'] ?? 0),
            jg_inventory_recap_format_idr((float) ($item['estimated_cost'] ?? 0))
        );
    }
    if ($lines === []) {
        $lines[] = '- No product is below its trigger.';
    }

    $funding = !empty($summary['can_fund_recommended'])
        ? 'Cash Available can cover the recommended draft.'
        : 'Cash Available is short by ' . jg_inventory_recap_format_idr((float) ($summary['funding_gap'] ?? 0)) . '.';
    $text = implode("\n", array_merge([
        'Inventory Recap production draft',
        'Generated: ' . gmdate(DATE_ATOM),
        sprintf('Demand basis: %d days in nine 10-day blocks through %s', (int) $options['lookback_days'], (string) ($options['end_date'] ?? '')),
        'Decision rule: below 7.5-day trigger; order another 10.5 days (or the larger manual-trigger gap), then round up to MOQ.',
        'Estimated production cost: ' . jg_inventory_recap_format_idr((float) ($summary['total_recommended_cost'] ?? 0)),
        'Accounting Cash Available: ' . jg_inventory_recap_format_idr((float) ($summary['cash_available'] ?? 0)),
        'Funding: ' . $funding,
        '',
        'Items:',
    ], $lines));

    return [
        'title' => 'Inventory Recap production draft',
        'generated_at' => gmdate(DATE_ATOM),
        'model' => '90_day_trigger',
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
    $stockIndexBySkuIndex = jg_inventory_recap_stock_index_map($skus);
    $demand = array_fill(0, count($skus), [
        'sold_qty' => 0.0,
        'sold_units' => 0,
        'order_count' => 0,
        'revenue' => 0.0,
        'sources' => [],
        'selling_skus' => [],
        'daily_history' => [],
    ]);
    $matchedOrders = 0;
    $unmatchedOrders = 0;

    foreach (jg_inventory_recap_order_rows($analyticsPdo, $options) as $orderRow) {
        $orderDate = jg_inventory_recap_order_date($orderRow);
        $isRecentOrder = jg_inventory_recap_date_in_range($orderDate, (string) $options['start_date'], (string) $options['end_date']);
        $skuIndex = jg_inventory_recap_match_sku_index($orderRow, $lookup);
        if ($skuIndex === null || !isset($skus[$skuIndex])) {
            if ($isRecentOrder) {
                $unmatchedOrders++;
            }
            continue;
        }
        $quantity = max(0.0, jg_inventory_recap_number($orderRow['quantity'] ?? 0));
        $stockIndex = (int) ($stockIndexBySkuIndex[$skuIndex] ?? $skuIndex);
        $sellingSku = $skus[$skuIndex];
        $astraQty = round($quantity * (float) ($sellingSku['quantity_multiplier'] ?? 1), 2);
        if (jg_inventory_recap_date_in_range($orderDate, (string) $options['history_start_date'], (string) $options['end_date'])) {
            $demand[$stockIndex]['daily_history'][$orderDate] = round((float) ($demand[$stockIndex]['daily_history'][$orderDate] ?? 0) + $astraQty, 2);
        }
        if ($isRecentOrder) {
            $matchedOrders++;
            $demand[$stockIndex]['sold_qty'] += $astraQty;
            $demand[$stockIndex]['sold_units'] += (int) round($quantity);
            $demand[$stockIndex]['order_count'] += 1;
            $demand[$stockIndex]['revenue'] += max(0.0, jg_inventory_recap_number($orderRow['revenue'] ?? $orderRow['net_revenue'] ?? 0));
            $source = (string) ($orderRow['source'] ?? 'orders');
            $demand[$stockIndex]['sources'][$source] = ((int) ($demand[$stockIndex]['sources'][$source] ?? 0)) + 1;
            $soldSku = (string) ($sellingSku['sku'] ?? '');
            if ($soldSku !== '') {
                $demand[$stockIndex]['selling_skus'][$soldSku] = ((int) ($demand[$stockIndex]['selling_skus'][$soldSku] ?? 0)) + 1;
            }
        }
    }

    $items = [];
    foreach ($skus as $index => $sku) {
        if ((int) ($stockIndexBySkuIndex[$index] ?? $index) !== (int) $index) {
            continue;
        }
        $soldQty = round((float) ($demand[$index]['sold_qty'] ?? 0), 2);
        $currentStock = (float) ($sku['current_stock'] ?? 0);
        $model = jg_inventory_recap_trigger_model((array) ($demand[$index]['daily_history'] ?? []), $options);
        $hasDemand = !empty($model['has_demand']);
        $automaticTrigger = max(0, (int) ($model['automatic_trigger'] ?? 0));
        $manualTrigger = max(0, (int) ceil((float) ($sku['stock_trigger'] ?? 0)));
        $triggerMode = strtolower((string) ($sku['inventory_mode'] ?? 'auto')) === 'manual' ? 'manual' : 'auto';
        $triggerQty = $triggerMode === 'manual' ? $manualTrigger : $automaticTrigger;
        $purchaseMoq = max(1, (int) ($sku['purchase_moq'] ?? 1));
        $triggerShortfallQty = max(0, (int) ceil($triggerQty - $currentStock));
        $purchaseTargetQty = max(0, (int) ($model['purchase_target_qty'] ?? 0));
        $rawPurchaseQty = $triggerShortfallQty > 0
            ? max($triggerShortfallQty, $purchaseTargetQty)
            : 0;
        $recommendedOrderQty = jg_inventory_recap_round_to_moq($rawPurchaseQty, $purchaseMoq);
        $moqRoundingQty = max(0, $recommendedOrderQty - $rawPurchaseQty);
        $postOrderStock = $currentStock + $recommendedOrderQty;
        $risk = jg_inventory_recap_status($currentStock, $triggerQty, $hasDemand, $triggerMode);
        $estimatedCost = (int) round($recommendedOrderQty * (float) ($sku['cogs'] ?? 0));
        $rawCost = (int) round($rawPurchaseQty * (float) ($sku['cogs'] ?? 0));
        $sellingSkus = array_keys($demand[$index]['selling_skus'] ?? []);
        sort($sellingSkus);

        $restockNeeded = (string) ($risk['key'] ?? '') === 'triggered' && $recommendedOrderQty > 0;

        $items[] = [
            ...$sku,
            'sold_qty_astra' => $soldQty,
            'sold_units' => (int) ($demand[$index]['sold_units'] ?? 0),
            'order_count' => (int) ($demand[$index]['order_count'] ?? 0),
            'forecast_method' => (string) ($model['forecast_method'] ?? $options['forecast_model']),
            'forecast_confidence' => (string) ($model['forecast_confidence'] ?? 'none'),
            'total_90_day_demand' => (float) ($model['total_90_day_demand'] ?? 0),
            'average_30_day_demand' => (float) ($model['average_30_day_demand'] ?? 0),
            'ten_day_buckets' => $model['ten_day_buckets'] ?? [],
            'average_10_day_change' => (float) ($model['average_10_day_change'] ?? 0),
            'overall_90_day_change' => (float) ($model['overall_90_day_change'] ?? 0),
            'trend_adjustment' => (float) ($model['trend_adjustment'] ?? 0),
            'fluctuation_buffer' => (float) ($model['fluctuation_buffer'] ?? 0),
            'large_order_buffer' => (float) ($model['large_order_buffer'] ?? 0),
            'applied_buffer' => (float) ($model['applied_buffer'] ?? 0),
            'adjusted_30_day_demand' => (float) ($model['adjusted_30_day_demand'] ?? 0),
            'reorder_fraction' => (float) ($model['reorder_fraction'] ?? 0.25),
            'purchase_fraction' => (float) ($model['purchase_fraction'] ?? 0.35),
            'purchase_target_qty' => $purchaseTargetQty,
            'automatic_trigger' => $automaticTrigger,
            'manual_trigger' => $manualTrigger,
            'trigger_mode' => $triggerMode,
            'trigger_qty' => $triggerQty,
            'trigger_gap' => (int) floor($currentStock - $triggerQty),
            'trigger_shortfall_qty' => $triggerShortfallQty,
            'raw_purchase_qty' => $rawPurchaseQty,
            'minimum_order_qty' => $rawPurchaseQty,
            'recommended_order_qty' => $recommendedOrderQty,
            'moq_rounding_qty' => $moqRoundingQty,
            'buffer_order_qty' => $moqRoundingQty,
            'post_order_stock' => $postOrderStock,
            'estimated_cost' => $estimatedCost,
            'minimum_cost' => $rawCost,
            'buffer_cost' => max(0, $estimatedCost - $rawCost),
            'restock_needed' => $restockNeeded,
            'risk' => $risk['key'],
            'risk_label' => $risk['label'],
            'risk_color' => $risk['color'],
            'risk_score' => $risk['score'],
            'demand_sources' => $demand[$index]['sources'] ?? [],
            'selling_skus' => $sellingSkus,
        ];
    }

    usort($items, static function (array $left, array $right): int {
        return ((int) ($right['risk_score'] ?? 0) <=> (int) ($left['risk_score'] ?? 0))
            ?: ((int) ($right['raw_purchase_qty'] ?? 0) <=> (int) ($left['raw_purchase_qty'] ?? 0))
            ?: strcmp((string) ($left['product_name'] ?? ''), (string) ($right['product_name'] ?? ''));
    });

    $suggestions = array_values(array_filter($items, static fn (array $item): bool => !empty($item['restock_needed'])));
    $totalRecommendedCost = array_sum(array_map(static fn (array $item): int => (int) ($item['estimated_cost'] ?? 0), $suggestions));
    $totalMinimumCost = array_sum(array_map(static fn (array $item): int => (int) ($item['minimum_cost'] ?? 0), $suggestions));
    $cashAvailable = max(0, (int) round(jg_inventory_recap_number($cashContext['amount'] ?? $cashContext['cash_available'] ?? 0)));
    $fundingGap = max(0, $totalRecommendedCost - $cashAvailable);
    $criticalCount = count(array_filter($items, static fn (array $item): bool => ($item['risk'] ?? '') === 'triggered'));
    $highCount = count(array_filter($items, static fn (array $item): bool => ($item['risk'] ?? '') === 'near'));
    $manualCount = count(array_filter($items, static fn (array $item): bool => ($item['trigger_mode'] ?? '') === 'manual'));
    $reportCritical = $criticalCount > 0;

    $summary = [
        'total_skus' => count($items),
        'suggested_count' => count($suggestions),
        'critical_count' => $criticalCount,
        'triggered_count' => $criticalCount,
        'watch_count' => $highCount,
        'manual_count' => $manualCount,
        'total_recommended_qty' => array_sum(array_map(static fn (array $item): int => (int) ($item['recommended_order_qty'] ?? 0), $suggestions)),
        'total_minimum_qty' => array_sum(array_map(static fn (array $item): int => (int) ($item['minimum_order_qty'] ?? 0), $suggestions)),
        'total_buffer_qty' => array_sum(array_map(static fn (array $item): int => (int) ($item['buffer_order_qty'] ?? 0), $suggestions)),
        'total_recommended_cost' => $totalRecommendedCost,
        'total_minimum_cost' => $totalMinimumCost,
        'total_buffer_cost' => max(0, $totalRecommendedCost - $totalMinimumCost),
        'cash_available' => $cashAvailable,
        'funding_gap' => $fundingGap,
        'can_fund_recommended' => $fundingGap === 0,
        'report_status' => $reportCritical ? 'triggered' : ($highCount > 0 ? 'near' : 'clear'),
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
