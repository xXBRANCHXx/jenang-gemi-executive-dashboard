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
    $lookbackDays = jg_inventory_recap_int_option($input, 'lookback_days', 45, 14, 120);
    $orderDays = jg_inventory_recap_int_option($input, 'order_days', 30, 7, 90);
    $bufferDays = jg_inventory_recap_int_option($input, 'buffer_days', 10, 0, 45);
    $historyDays = jg_inventory_recap_int_option($input, 'forecast_history_days', 365, max(45, $lookbackDays), 730);
    $today = jg_inventory_recap_today($input);
    $start = $today->modify('-' . max(0, $lookbackDays - 1) . ' days');
    $historyStart = $today->modify('-' . max(0, $historyDays - 1) . ' days');
    $endExclusive = $today->modify('+1 day');

    return [
        'lookback_days' => $lookbackDays,
        'forecast_history_days' => $historyDays,
        'order_days' => $orderDays,
        'buffer_days' => $bufferDays,
        'target_days' => $orderDays + $bufferDays,
        'today' => $today->format('Y-m-d'),
        'start_date' => $start->format('Y-m-d'),
        'end_date' => $today->format('Y-m-d'),
        'history_start_date' => $historyStart->format('Y-m-d'),
        'start_at_utc' => $start->setTime(0, 0)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.u'),
        'history_start_at_utc' => $historyStart->setTime(0, 0)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.u'),
        'end_at_utc' => $endExclusive->setTime(0, 0)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.u'),
        'forecast_model' => 'calendar_weighted',
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

function jg_inventory_recap_week_of_month(DateTimeImmutable $date): int
{
    return min(5, max(1, intdiv(((int) $date->format('j')) - 1, 7) + 1));
}

function jg_inventory_recap_add_forecast_stat(array &$stats, int $key, float $quantity): void
{
    if (!isset($stats[$key])) {
        $stats[$key] = ['total' => 0.0, 'days' => 0];
    }
    $stats[$key]['total'] += $quantity;
    $stats[$key]['days'] += 1;
}

function jg_inventory_recap_smoothed_average(array $stats, int $key, float $baseline, float $smoothDays): float
{
    $stat = $stats[$key] ?? null;
    if (!is_array($stat)) {
        return $baseline;
    }

    $days = max(0, (int) ($stat['days'] ?? 0));
    if ($days <= 0) {
        return $baseline;
    }

    return max(0.0, ((float) ($stat['total'] ?? 0) + ($baseline * $smoothDays)) / ($days + $smoothDays));
}

function jg_inventory_recap_forecast_quantity_for_date(DateTimeImmutable $date, array $model): float
{
    $baseline = max(0.0, (float) ($model['baseline_daily'] ?? 0));
    if ($baseline <= 0) {
        return 0.0;
    }

    $trendAvg = max(0.0, (float) ($model['trend_daily'] ?? $baseline));
    $weekdayAvg = jg_inventory_recap_smoothed_average((array) ($model['weekday_stats'] ?? []), (int) $date->format('N'), $baseline, 2.0);
    $weekAvg = jg_inventory_recap_smoothed_average((array) ($model['week_stats'] ?? []), jg_inventory_recap_week_of_month($date), $baseline, 7.0);
    $monthAvg = jg_inventory_recap_smoothed_average((array) ($model['month_stats'] ?? []), (int) $date->format('n'), $baseline, 30.0);

    $quantity = ($trendAvg * 0.4) + ($weekdayAvg * 0.3) + ($weekAvg * 0.2) + ($monthAvg * 0.1);
    $cap = max($baseline, $trendAvg) * 4.0;
    return round(max(0.0, min($cap, $quantity)), 4);
}

function jg_inventory_recap_days_until_stockout(float $stock, array $forecastDays, float $fallbackDaily): ?float
{
    $fallbackDaily = max(0.0, $fallbackDaily);
    if ($fallbackDaily <= 0) {
        return null;
    }

    $remaining = max(0.0, $stock);
    $elapsed = 0.0;
    foreach ($forecastDays as $day) {
        $quantity = max(0.0, (float) ($day['qty'] ?? 0));
        if ($quantity <= 0) {
            $elapsed += 1.0;
            continue;
        }
        if ($remaining <= $quantity) {
            return round($elapsed + ($remaining / $quantity), 1);
        }
        $remaining -= $quantity;
        $elapsed += 1.0;
    }

    return round($elapsed + ($remaining / $fallbackDaily), 1);
}

function jg_inventory_recap_forecast_confidence(int $historyDays, int $soldDays): string
{
    if ($historyDays >= 180 && $soldDays >= 20) {
        return 'high';
    }
    if ($historyDays >= 45 && $soldDays >= 8) {
        return 'medium';
    }
    return 'low';
}

function jg_inventory_recap_bucket_forecast_days(array $forecastDays): array
{
    $months = [];
    $weeks = [];
    foreach ($forecastDays as $day) {
        $date = jg_inventory_recap_date_from_string((string) ($day['date'] ?? ''));
        $quantity = max(0.0, (float) ($day['qty'] ?? 0));
        if (!$date instanceof DateTimeImmutable) {
            continue;
        }

        $monthKey = $date->format('Y-m');
        $months[$monthKey] = round((float) ($months[$monthKey] ?? 0) + $quantity, 2);
        $weekStart = $date->modify('monday this week')->format('Y-m-d');
        $weeks[$weekStart] = round((float) ($weeks[$weekStart] ?? 0) + $quantity, 2);
    }

    return [
        'months' => $months,
        'weeks' => $weeks,
    ];
}

function jg_inventory_recap_empty_forecast(array $options): array
{
    return [
        'has_demand' => false,
        'daily_velocity' => 0.0,
        'recent_daily_velocity' => 0.0,
        'current_days_remaining' => null,
        'month_target_qty' => 0,
        'target_qty' => 0,
        'post_order_days' => null,
        'forecast_next_days' => [],
        'forecast_months' => [],
        'forecast_weeks' => [],
        'forecast_confidence' => 'none',
        'forecast_method' => (string) ($options['forecast_model'] ?? 'calendar_weighted'),
        'forecast_history_days_used' => 0,
        'forecast_sold_days' => 0,
    ];
}

function jg_inventory_recap_forecast(array $dailyHistory, array $options, float $currentStock): array
{
    $positiveDates = array_keys(array_filter($dailyHistory, static fn (mixed $quantity): bool => (float) $quantity > 0));
    sort($positiveDates);
    if ($positiveDates === []) {
        return jg_inventory_recap_empty_forecast($options);
    }

    $today = jg_inventory_recap_date_from_string((string) $options['today']);
    $historyStart = jg_inventory_recap_date_from_string(max((string) ($options['history_start_date'] ?? ''), (string) $positiveDates[0]));
    if (!$today instanceof DateTimeImmutable || !$historyStart instanceof DateTimeImmutable || $historyStart > $today) {
        return jg_inventory_recap_empty_forecast($options);
    }

    $weekdayStats = [];
    $weekStats = [];
    $monthStats = [];
    $historyDays = 0;
    $soldDays = 0;
    $historyTotal = 0.0;
    $cursor = $historyStart;
    while ($cursor <= $today) {
        $dateKey = $cursor->format('Y-m-d');
        $quantity = max(0.0, (float) ($dailyHistory[$dateKey] ?? 0));
        $historyDays++;
        $historyTotal += $quantity;
        if ($quantity > 0) {
            $soldDays++;
        }
        jg_inventory_recap_add_forecast_stat($weekdayStats, (int) $cursor->format('N'), $quantity);
        jg_inventory_recap_add_forecast_stat($weekStats, jg_inventory_recap_week_of_month($cursor), $quantity);
        jg_inventory_recap_add_forecast_stat($monthStats, (int) $cursor->format('n'), $quantity);
        $cursor = $cursor->modify('+1 day');
    }

    if ($historyDays <= 0 || $historyTotal <= 0) {
        return jg_inventory_recap_empty_forecast($options);
    }

    $baselineDaily = $historyTotal / $historyDays;
    $lookbackDays = max(1, (int) ($options['lookback_days'] ?? 45));
    $recentStart = $today->modify('-' . max(0, $lookbackDays - 1) . ' days');
    if ($recentStart < $historyStart) {
        $recentStart = $historyStart;
    }

    $recentDays = 0;
    $recentTotal = 0.0;
    $cursor = $recentStart;
    while ($cursor <= $today) {
        $recentDays++;
        $recentTotal += max(0.0, (float) ($dailyHistory[$cursor->format('Y-m-d')] ?? 0));
        $cursor = $cursor->modify('+1 day');
    }

    $recentDaily = $recentDays > 0 ? $recentTotal / $recentDays : $baselineDaily;
    $trendDaily = ($recentTotal + ($baselineDaily * 14.0)) / max(1.0, $recentDays + 14.0);
    $model = [
        'baseline_daily' => $baselineDaily,
        'trend_daily' => $trendDaily,
        'weekday_stats' => $weekdayStats,
        'week_stats' => $weekStats,
        'month_stats' => $monthStats,
    ];

    $orderDays = max(1, (int) ($options['order_days'] ?? 30));
    $targetDays = max(1, (int) ($options['target_days'] ?? ($orderDays + (int) ($options['buffer_days'] ?? 10))));
    $horizonDays = max(365, $targetDays * 4);
    $forecastDays = [];
    for ($offset = 1; $offset <= $horizonDays; $offset++) {
        $date = $today->modify('+' . $offset . ' day');
        $forecastDays[] = [
            'date' => $date->format('Y-m-d'),
            'qty' => jg_inventory_recap_forecast_quantity_for_date($date, $model),
        ];
    }

    $targetForecastDays = array_slice($forecastDays, 0, $targetDays);
    $orderForecastDays = array_slice($forecastDays, 0, $orderDays);
    $targetNeed = array_sum(array_map(static fn (array $day): float => (float) ($day['qty'] ?? 0), $targetForecastDays));
    $orderNeed = array_sum(array_map(static fn (array $day): float => (float) ($day['qty'] ?? 0), $orderForecastDays));
    $targetQty = (int) ceil($targetNeed);
    $monthTargetQty = (int) ceil($orderNeed);
    $forecastDaily = $targetDays > 0 ? $targetNeed / $targetDays : 0.0;
    $fallbackDaily = $forecastDaily > 0 ? $forecastDaily : $baselineDaily;
    $buckets = jg_inventory_recap_bucket_forecast_days($targetForecastDays);

    return [
        'has_demand' => true,
        'daily_velocity' => round($forecastDaily, 3),
        'recent_daily_velocity' => round($recentDaily, 3),
        'current_days_remaining' => jg_inventory_recap_days_until_stockout($currentStock, $forecastDays, $fallbackDaily),
        'month_target_qty' => $monthTargetQty,
        'target_qty' => $targetQty,
        'post_order_days' => null,
        'forecast_next_days' => array_slice($targetForecastDays, 0, min(45, $targetDays)),
        'forecast_months' => $buckets['months'],
        'forecast_weeks' => $buckets['weeks'],
        'forecast_confidence' => jg_inventory_recap_forecast_confidence($historyDays, $soldDays),
        'forecast_method' => (string) ($options['forecast_model'] ?? 'calendar_weighted'),
        'forecast_history_days_used' => $historyDays,
        'forecast_sold_days' => $soldDays,
        'baseline_daily_velocity' => round($baselineDaily, 3),
        '_forecast_days' => $forecastDays,
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

function jg_inventory_recap_risk(float $daysRemaining, float $currentStock, float $stockTrigger, int $targetDays, bool $hasDemand): array
{
    if (!$hasDemand) {
        if ($stockTrigger > 0 && $currentStock <= $stockTrigger) {
            return ['key' => 'watch', 'label' => 'Orange - below trigger', 'color' => '#d97706', 'score' => 2];
        }
        return ['key' => 'quiet', 'label' => 'No recent sales', 'color' => '#64748b', 'score' => 0];
    }
    if ($daysRemaining <= 10 || ($stockTrigger > 0 && $currentStock <= $stockTrigger && $daysRemaining <= $targetDays)) {
        return ['key' => 'critical', 'label' => 'Red - urgent', 'color' => '#dc2626', 'score' => 5];
    }
    if ($daysRemaining <= 20) {
        return ['key' => 'high', 'label' => 'Orange - restock soon', 'color' => '#ea580c', 'score' => 4];
    }
    if ($daysRemaining <= 30) {
        return ['key' => 'medium', 'label' => 'Orange - under 30 days', 'color' => '#d97706', 'score' => 3];
    }
    if ($daysRemaining <= $targetDays) {
        return ['key' => 'low', 'label' => 'Green - buffer tight', 'color' => '#65a30d', 'score' => 1];
    }
    return ['key' => 'covered', 'label' => 'Green - covered', 'color' => '#16a34a', 'score' => 0];
}

function jg_inventory_recap_format_idr(float|int $amount): string
{
    return 'Rp' . number_format((float) $amount, 0, ',', '.');
}

function jg_inventory_recap_order_draft(array $suggestions, array $summary, array $options): array
{
    $lines = [];
    foreach ($suggestions as $item) {
        $daysRemaining = $item['current_days_remaining'] ?? null;
        $daysLabel = is_numeric($daysRemaining)
            ? rtrim(rtrim(number_format((float) $daysRemaining, 1, '.', ''), '0'), '.') . ' days left'
            : 'no recent sales';
        $forecastLabel = trim((string) ($item['forecast_confidence'] ?? ''));
        $forecastLabel = $forecastLabel !== '' && $forecastLabel !== 'none'
            ? 'calendar forecast, ' . $forecastLabel . ' confidence'
            : 'calendar forecast';
        $stockUnitVolume = jg_inventory_recap_number($item['volume'] ?? $item['astra'] ?? 0);
        $stockUnitName = trim((string) ($item['unit_name'] ?? ''));
        $stockUnitSize = $stockUnitVolume > 0
            ? rtrim(rtrim(number_format($stockUnitVolume, 1, '.', ''), '0'), '.') . ($stockUnitName !== '' ? ' ' . $stockUnitName : '')
            : 'ASTRA';
        $stockUnitLabel = trim($stockUnitSize . ' stock units');
        $sellingSkus = array_values(array_filter(
            (array) ($item['selling_skus'] ?? []),
            static fn (mixed $sku): bool => trim((string) $sku) !== '' && trim((string) $sku) !== (string) ($item['sku'] ?? '')
        ));
        $sellingSkuLabel = $sellingSkus === [] ? '' : '; covers sales from ' . implode(', ', $sellingSkus);
        $lines[] = sprintf(
            '- %s / %s: stock %s %s now, lasts %s by %s; order %s %s to reach %d forecast days (%d-day need %s, buffer %s), est. %s%s',
            (string) ($item['sku'] ?? ''),
            (string) ($item['product_name'] ?? ''),
            number_format((float) ($item['current_stock'] ?? 0), 0, '.', ''),
            $stockUnitLabel,
            $daysLabel,
            $forecastLabel,
            number_format((float) ($item['recommended_order_qty'] ?? 0), 0, '.', ''),
            $stockUnitLabel,
            (int) $options['target_days'],
            (int) $options['order_days'],
            number_format((float) ($item['minimum_order_qty'] ?? 0), 0, '.', ''),
            number_format((float) ($item['buffer_order_qty'] ?? 0), 0, '.', ''),
            jg_inventory_recap_format_idr((float) ($item['estimated_cost'] ?? 0)),
            $sellingSkuLabel
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
        sprintf('Forecast basis: calendar-weighted ASTRA demand from %s to %s', (string) ($options['history_start_date'] ?? $options['start_date']), (string) ($options['end_date'] ?? '')),
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
        $stockTrigger = (float) ($sku['stock_trigger'] ?? 0);
        $forecast = jg_inventory_recap_forecast((array) ($demand[$index]['daily_history'] ?? []), $options, $currentStock);
        $forecastDays = (array) ($forecast['_forecast_days'] ?? $forecast['forecast_next_days'] ?? []);
        unset($forecast['_forecast_days']);
        $dailyVelocity = (float) ($forecast['daily_velocity'] ?? 0);
        $hasDemand = !empty($forecast['has_demand']) && $dailyVelocity > 0;
        $daysRemaining = $forecast['current_days_remaining'] ?? null;
        $monthTargetQty = (int) ($forecast['month_target_qty'] ?? 0);
        $targetQty = (int) ($forecast['target_qty'] ?? 0);
        $minimumOrderQty = max(0, (int) ceil($monthTargetQty - $currentStock));
        $recommendedOrderQty = max(0, (int) ceil($targetQty - $currentStock));
        $bufferOrderQty = max(0, $recommendedOrderQty - $minimumOrderQty);
        $postOrderStock = $currentStock + $recommendedOrderQty;
        $postOrderDays = $hasDemand ? jg_inventory_recap_days_until_stockout($postOrderStock, $forecastDays, $dailyVelocity) : null;
        $risk = jg_inventory_recap_risk($daysRemaining ?? 9999.0, $currentStock, $stockTrigger, (int) $options['target_days'], $hasDemand);
        $estimatedCost = (int) round($recommendedOrderQty * (float) ($sku['cogs'] ?? 0));
        $minimumCost = (int) round($minimumOrderQty * (float) ($sku['cogs'] ?? 0));
        $playPercent = $recommendedOrderQty > 0 ? round(($bufferOrderQty / $recommendedOrderQty) * 100, 1) : 0.0;
        $sellingSkus = array_keys($demand[$index]['selling_skus'] ?? []);
        sort($sellingSkus);

        $items[] = [
            ...$sku,
            'sold_qty_astra' => $soldQty,
            'sold_units' => (int) ($demand[$index]['sold_units'] ?? 0),
            'order_count' => (int) ($demand[$index]['order_count'] ?? 0),
            'daily_velocity' => round($dailyVelocity, 3),
            'recent_daily_velocity' => (float) ($forecast['recent_daily_velocity'] ?? 0),
            'baseline_daily_velocity' => (float) ($forecast['baseline_daily_velocity'] ?? 0),
            'forecast_daily_velocity' => round($dailyVelocity, 3),
            'forecast_method' => (string) ($forecast['forecast_method'] ?? $options['forecast_model']),
            'forecast_confidence' => (string) ($forecast['forecast_confidence'] ?? 'none'),
            'forecast_history_days_used' => (int) ($forecast['forecast_history_days_used'] ?? 0),
            'forecast_sold_days' => (int) ($forecast['forecast_sold_days'] ?? 0),
            'forecast_next_days' => $forecast['forecast_next_days'] ?? [],
            'forecast_months' => $forecast['forecast_months'] ?? [],
            'forecast_weeks' => $forecast['forecast_weeks'] ?? [],
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
            'selling_skus' => $sellingSkus,
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
