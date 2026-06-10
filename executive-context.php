<?php
declare(strict_types=1);

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
        if (array_key_exists('revenue', $values)) {
            $month['revenue'] = $values['revenue'];
            $month['net_revenue'] = $values['revenue'];
            $month['sales'] = $values['revenue'];
        }
        if (array_key_exists('gross_profit', $values)) {
            $month['gross_profit'] = $values['gross_profit'];
        }
        if (array_key_exists('orders_qty', $values)) {
            $month['orders'] = $values['orders_qty'];
        }
        if (array_key_exists('items_qty', $values)) {
            $month['item_count'] = $values['items_qty'];
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
