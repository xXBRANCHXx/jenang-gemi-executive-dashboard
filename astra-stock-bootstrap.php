<?php
declare(strict_types=1);

function jg_astra_stock_number(mixed $value): float
{
    if (is_numeric($value)) {
        return (float) $value;
    }
    $normalized = preg_replace('/[^0-9.\-]+/', '', (string) $value);
    return is_numeric($normalized) ? (float) $normalized : 0.0;
}

function jg_astra_stock_decimal_key(float $value): string
{
    return rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.') ?: '0';
}

function jg_astra_stock_group_key(array $row): string
{
    return implode('|', [
        (string) ($row['brand_id'] ?? ''),
        (string) ($row['unit_id'] ?? ''),
        (string) ($row['product_id'] ?? ''),
        (string) ($row['flavor_id'] ?? ''),
        jg_astra_stock_decimal_key(max(0.0, jg_astra_stock_number($row['astra'] ?? $row['volume'] ?? 0))),
    ]);
}

function jg_astra_stock_ratio(array $sellingRow, ?array $stockRow = null): float
{
    $volume = jg_astra_stock_number($sellingRow['volume'] ?? 0);
    $astra = jg_astra_stock_number(($stockRow['astra'] ?? null) ?? ($sellingRow['astra'] ?? $volume));
    if ($volume <= 0 || $astra <= 0) {
        return 1.0;
    }
    return max(1.0, $volume / $astra);
}

function jg_astra_cogs_multiplier(array $row): float
{
    return jg_astra_stock_ratio($row);
}

/**
 * Expand a selling-unit COGS change across every SKU linked to the selected
 * rows by their ASTRA base unit.
 *
 * @param array<int, array<string, mixed>> $rows
 * @param array<int, string> $selectedSkus
 * @return array<string, array{sku: string, new_price: float, multiplier: float, selected_sku: string}>
 */
function jg_astra_cogs_plan(array $rows, array $selectedSkus, float $sellingUnitCogs): array
{
    $bySku = [];
    $groups = [];
    foreach ($rows as $row) {
        $sku = (string) ($row['sku'] ?? '');
        if ($sku === '') {
            continue;
        }
        $bySku[$sku] = $row;
        $groups[jg_astra_stock_group_key($row)][] = $row;
    }

    $plan = [];
    foreach (array_values(array_unique($selectedSkus)) as $selectedSku) {
        $selectedRow = $bySku[$selectedSku] ?? null;
        if (!is_array($selectedRow)) {
            continue;
        }
        $selectedMultiplier = jg_astra_cogs_multiplier($selectedRow);
        $baseUnitCogs = max(0.0, $sellingUnitCogs) / $selectedMultiplier;
        foreach ($groups[jg_astra_stock_group_key($selectedRow)] ?? [$selectedRow] as $linkedRow) {
            $linkedSku = (string) ($linkedRow['sku'] ?? '');
            if ($linkedSku === '') {
                continue;
            }
            $multiplier = jg_astra_cogs_multiplier($linkedRow);
            $plan[$linkedSku] = [
                'sku' => $linkedSku,
                'new_price' => round($baseUnitCogs * $multiplier, 2),
                'multiplier' => $multiplier,
                'selected_sku' => $selectedSku,
            ];
        }
    }

    ksort($plan);
    return $plan;
}

/**
 * @param array<int, array<string, mixed>> $history
 * @return array<int, array<string, mixed>>
 */
function jg_astra_cogs_scale_history(array $history, float $multiplier): array
{
    $factor = max(1.0, $multiplier);
    return array_map(static function (array $change) use ($factor): array {
        if (array_key_exists('old_price', $change) && $change['old_price'] !== null) {
            $change['old_price'] = round((float) $change['old_price'] * $factor, 2);
        }
        if (array_key_exists('new_price', $change)) {
            $change['new_price'] = round((float) $change['new_price'] * $factor, 2);
        }
        return $change;
    }, $history);
}

function jg_astra_stock_to_base_units(int|float $quantity, float $ratio): int
{
    $value = max(0.0, (float) $quantity) * max(1.0, $ratio);
    return (int) ceil($value - 0.000001);
}

function jg_astra_stock_from_base_units(int|float $baseStock, float $ratio): int
{
    return (int) floor(max(0.0, (float) $baseStock) / max(1.0, $ratio) + 0.000001);
}

function jg_astra_stock_rows(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT sku, brand_id, unit_id, product_id, flavor_id, volume, astra, current_stock, cogs
         FROM sku_skus
         ORDER BY sku'
    );
    return array_values(array_filter($stmt->fetchAll(), 'is_array'));
}

function jg_astra_stock_map(array $rows): array
{
    $bySku = [];
    $groups = [];
    foreach ($rows as $row) {
        $sku = (string) ($row['sku'] ?? '');
        if ($sku === '') {
            continue;
        }
        $bySku[$sku] = $row;
        $groups[jg_astra_stock_group_key($row)][] = $sku;
    }

    $map = [];
    foreach ($groups as $skus) {
        $stockSku = '';
        foreach ($skus as $sku) {
            $row = $bySku[$sku] ?? [];
            $volume = jg_astra_stock_number($row['volume'] ?? 0);
            $astra = jg_astra_stock_number($row['astra'] ?? $volume);
            if ($volume > 0 && $astra > 0 && abs($volume - $astra) < 0.01) {
                $stockSku = $sku;
                break;
            }
        }

        foreach ($skus as $sku) {
            $stockRow = $stockSku !== '' ? ($bySku[$stockSku] ?? null) : null;
            $targetSku = $stockRow !== null ? $stockSku : $sku;
            $targetRow = $stockRow ?? ($bySku[$sku] ?? []);
            $map[$sku] = [
                'sku' => $sku,
                'stock_sku' => $targetSku,
                'stock_ratio' => $stockRow !== null ? jg_astra_stock_ratio($bySku[$sku] ?? [], $targetRow) : 1.0,
                'stock_row' => $targetRow,
                'has_base_stock_sku' => $stockRow !== null,
            ];
        }
    }

    return $map;
}

function jg_astra_stock_resolve(PDO $pdo, string $sku): ?array
{
    $rows = jg_astra_stock_rows($pdo);
    $bySku = [];
    foreach ($rows as $row) {
        $rowSku = (string) ($row['sku'] ?? '');
        if ($rowSku !== '') {
            $bySku[$rowSku] = $row;
        }
    }
    if (!isset($bySku[$sku])) {
        return null;
    }

    $map = jg_astra_stock_map($rows);
    $target = $map[$sku] ?? [
        'sku' => $sku,
        'stock_sku' => $sku,
        'stock_ratio' => 1.0,
        'stock_row' => $bySku[$sku],
        'has_base_stock_sku' => false,
    ];
    $target['row'] = $bySku[$sku];
    return $target;
}

function jg_astra_stock_sync(PDO $pdo): void
{
    $rows = jg_astra_stock_rows($pdo);
    $bySku = [];
    foreach ($rows as $row) {
        $sku = (string) ($row['sku'] ?? '');
        if ($sku !== '') {
            $bySku[$sku] = $row;
        }
    }

    $map = jg_astra_stock_map($rows);
    $update = $pdo->prepare('UPDATE sku_skus SET current_stock = :stock, updated_at = :updated_at WHERE sku = :sku');
    $now = gmdate('Y-m-d H:i:s');
    foreach ($rows as $row) {
        $sku = (string) ($row['sku'] ?? '');
        $target = $map[$sku] ?? null;
        if (!$target || empty($target['has_base_stock_sku']) || ($target['stock_sku'] ?? '') === $sku) {
            continue;
        }

        $stockSku = (string) ($target['stock_sku'] ?? '');
        $stockRow = $bySku[$stockSku] ?? null;
        if (!is_array($stockRow)) {
            continue;
        }

        $derivedStock = jg_astra_stock_from_base_units($stockRow['current_stock'] ?? 0, (float) ($target['stock_ratio'] ?? 1.0));
        if ((int) ($row['current_stock'] ?? 0) === $derivedStock) {
            continue;
        }
        $update->execute([
            ':stock' => $derivedStock,
            ':updated_at' => $now,
            ':sku' => $sku,
        ]);
    }
}
