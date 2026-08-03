<?php
declare(strict_types=1);

const JG_SALES_SUMMARY_CACHE_FRESH_SECONDS = 60;

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
    $regressed = [];

    foreach ($previousActivity as $month => $activity) {
        if ($activity > 0 && (float) ($candidateActivity[$month] ?? 0) <= 0) {
            $regressed[] = (int) $month;
        }
    }

    sort($regressed);
    return $regressed;
}
