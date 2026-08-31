<?php
declare(strict_types=1);

function jg_sales_catalog_name(mixed $value): string
{
    $normalized = preg_replace('/\s+/', ' ', trim((string) $value)) ?? '';
    return strtolower($normalized);
}

function jg_sales_flavor_group_for_catalog(mixed $brandName, mixed $productName): ?string
{
    $brand = jg_sales_catalog_name($brandName);
    $product = jg_sales_catalog_name($productName);

    if ($brand === 'zero' && $product === 'syrup') {
        return 'syrup';
    }
    if ($brand === 'zero' && $product === 'drops') {
        return 'drops';
    }
    if ($brand === 'jenang gemi' && $product === 'bubur') {
        return 'bubur';
    }

    return null;
}

/**
 * @param array<string, array<string, mixed>> $rows
 * @return array<int, array<string, mixed>>
 */
function jg_sales_sorted_sold_flavor_rows(array $rows, ?int $limit = null): array
{
    $values = array_values(array_filter(
        $rows,
        static fn (mixed $row): bool => is_array($row) && (int) ($row['quantity'] ?? 0) > 0
    ));
    usort($values, static function (array $left, array $right): int {
        $quantityOrder = (int) ($right['quantity'] ?? 0) <=> (int) ($left['quantity'] ?? 0);
        return $quantityOrder !== 0
            ? $quantityOrder
            : strcasecmp((string) ($left['label'] ?? ''), (string) ($right['label'] ?? ''));
    });

    return $limit === null ? $values : array_slice($values, 0, max(0, $limit));
}
