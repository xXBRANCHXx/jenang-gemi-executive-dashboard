<?php
declare(strict_types=1);

const JG_SALES_SUMMARY_CACHE_FRESH_SECONDS = 60;

/** @param array<string, mixed> $row */
function jg_sales_summary_revenue_value(array $row): float
{
    foreach (['revenue', 'net_revenue', 'sales'] as $field) {
        if (array_key_exists($field, $row) && is_numeric($row[$field])) {
            return (float) $row[$field];
        }
    }
    return 0.0;
}

/**
 * Gross profit is a derived value. Recalculate it after every sales source has
 * been merged so a stale or manually supplied GP value can never diverge from
 * final net revenue and COGS.
 *
 * @param array<string, mixed> $summary
 * @return array<string, mixed>
 */
function jg_sales_summary_enforce_profit_formula(array $summary): array
{
    $months = is_array($summary['months'] ?? null) ? array_values($summary['months']) : [];
    $totalRevenue = 0.0;
    $totalCogs = 0.0;
    foreach ($months as &$month) {
        if (!is_array($month)) {
            continue;
        }
        $revenue = jg_sales_summary_revenue_value($month);
        $cogs = is_numeric($month['cogs'] ?? null) ? (float) $month['cogs'] : 0.0;
        $month['revenue'] = $revenue;
        $month['net_revenue'] = $revenue;
        $month['sales'] = $revenue;
        $month['cogs'] = $cogs;
        $month['gross_profit'] = $revenue - $cogs;
        $totalRevenue += $revenue;
        $totalCogs += $cogs;
    }
    unset($month);

    $totals = is_array($summary['totals'] ?? null) ? $summary['totals'] : [];
    $totals['revenue'] = $totalRevenue;
    $totals['net_revenue'] = $totalRevenue;
    $totals['sales'] = $totalRevenue;
    $totals['cogs'] = $totalCogs;
    $totals['gross_profit'] = $totalRevenue - $totalCogs;
    $summary['months'] = $months;
    $summary['totals'] = $totals;
    return $summary;
}

function jg_sales_sku_lookup_cache_path(): string
{
    $override = getenv('JG_SALES_SKU_LOOKUP_CACHE_PATH');
    if (is_string($override) && trim($override) !== '') {
        return trim($override);
    }
    return sys_get_temp_dir() . '/jg-dashboard-sales-sku-lookup.json';
}

/** @param array<string, array<string, mixed>> $lookup */
function jg_sales_sku_lookup_cache_write(array $lookup): void
{
    if ($lookup === []) {
        return;
    }
    $path = jg_sales_sku_lookup_cache_path();
    $encoded = json_encode([
        'saved_at' => gmdate(DATE_ATOM),
        'lookup' => $lookup,
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (!is_string($encoded)) {
        return;
    }
    $directory = dirname($path);
    if (!is_dir($directory)) {
        @mkdir($directory, 0775, true);
    }
    $temporary = @tempnam($directory, '.sku-lookup-');
    if (!is_string($temporary)) {
        return;
    }
    if (@file_put_contents($temporary, $encoded, LOCK_EX) === false || !@rename($temporary, $path)) {
        @unlink($temporary);
    }
}

/** @return array<string, array<string, mixed>> */
function jg_sales_sku_lookup_cache_read(): array
{
    $raw = @file_get_contents(jg_sales_sku_lookup_cache_path());
    $decoded = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($decoded) || !is_array($decoded['lookup'] ?? null)) {
        return [];
    }
    return array_filter(
        $decoded['lookup'],
        static fn (mixed $row): bool => is_array($row)
    );
}

/**
 * @param array<string, mixed> $month
 */
function jg_sales_summary_month_number(array $month, int $fallbackIndex): int
{
    $number = (int) ($month['month'] ?? $month['month_index'] ?? 0);
    if ($number >= 1 && $number <= 12) {
        return $number;
    }

    return $fallbackIndex >= 0 && $fallbackIndex < 12 ? $fallbackIndex + 1 : 0;
}

/**
 * Return a non-zero signal when a month contains any persisted sales facts.
 * Revenue aliases are counted once so response-shape differences do not make
 * one snapshot appear healthier than another.
 *
 * @param array<string, mixed> $month
 */
function jg_sales_summary_month_activity(array $month): float
{
    $revenue = 0.0;
    foreach (['revenue', 'net_revenue', 'sales'] as $field) {
        if (array_key_exists($field, $month) && is_numeric($month[$field])) {
            $revenue = abs((float) $month[$field]);
            break;
        }
    }

    $orders = is_numeric($month['orders'] ?? null) ? abs((float) $month['orders']) : 0.0;
    $items = is_numeric($month['item_count'] ?? null) ? abs((float) $month['item_count']) : 0.0;
    $gross = is_numeric($month['gross_revenue'] ?? null) ? abs((float) $month['gross_revenue']) : 0.0;

    return $revenue + $orders + $items + $gross;
}

/**
 * @param array<string, mixed> $summary
 * @return array<int, float>
 */
function jg_sales_summary_activity_by_month(array $summary): array
{
    $activity = [];
    $months = is_array($summary['months'] ?? null) ? array_values($summary['months']) : [];
    foreach ($months as $index => $month) {
        if (!is_array($month)) {
            continue;
        }
        $monthNumber = jg_sales_summary_month_number($month, $index);
        if ($monthNumber < 1 || $monthNumber > 12) {
            continue;
        }
        $activity[$monthNumber] = jg_sales_summary_month_activity($month);
    }
    return $activity;
}

/**
 * A previously populated month cannot legitimately become completely absent
 * during an ordinary rolling refresh. Treat that shape as a transient rollup
 * read and keep the last-known-good base snapshot.
 *
 * @param array<string, mixed> $candidate
 * @param array<string, mixed> $previous
 * @return array<int, int>
 */
function jg_sales_summary_regressed_months(array $candidate, array $previous): array
{
    $candidateActivity = jg_sales_summary_activity_by_month($candidate);
    $previousActivity = jg_sales_summary_activity_by_month($previous);
    $candidateMonths = is_array($candidate['months'] ?? null) ? array_values($candidate['months']) : [];
    $previousMonths = is_array($previous['months'] ?? null) ? array_values($previous['months']) : [];
    $candidateCogs = [];
    $previousCogs = [];
    foreach ($candidateMonths as $index => $month) {
        if (is_array($month)) {
            $candidateCogs[jg_sales_summary_month_number($month, $index)] = (float) ($month['cogs'] ?? 0);
        }
    }
    foreach ($previousMonths as $index => $month) {
        if (is_array($month)) {
            $previousCogs[jg_sales_summary_month_number($month, $index)] = (float) ($month['cogs'] ?? 0);
        }
    }
    $regressed = [];

    foreach ($previousActivity as $month => $activity) {
        if ($activity > 0 && (float) ($candidateActivity[$month] ?? 0) <= 0) {
            $regressed[] = (int) $month;
            continue;
        }
        if (
            (float) ($candidateActivity[$month] ?? 0) > 0
            && (float) ($previousCogs[$month] ?? 0) > 0
            && (float) ($candidateCogs[$month] ?? 0) <= 0
        ) {
            $regressed[] = (int) $month;
        }
    }

    $regressed = array_values(array_unique($regressed));
    sort($regressed);
    return $regressed;
}
