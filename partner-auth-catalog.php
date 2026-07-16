<?php
declare(strict_types=1);

require_once __DIR__ . '/sku-db-bootstrap.php';

function jg_partner_auth_product_name_map(): array
{
    $path = __DIR__ . '/sku-product-names.json';
    if (!is_file($path)) {
        return [];
    }

    $decoded = json_decode((string) @file_get_contents($path), true);
    return is_array($decoded) ? $decoded : [];
}

function jg_partner_auth_decimal_string(mixed $value): string
{
    if (!is_numeric($value) || (float) $value <= 0) {
        return '';
    }

    return rtrim(rtrim(number_format((float) $value, 4, '.', ''), '0'), '.');
}

function jg_partner_auth_catalog_record(array $row, array $pricing, array $productNameMap = []): array
{
    $sku = trim((string) ($row['sku'] ?? ''));
    $baseProductName = trim((string) ($row['product_name'] ?? ''));
    $displayProductName = trim((string) ($productNameMap[$sku] ?? '')) ?: $baseProductName;
    $flavorName = trim((string) ($row['flavor_name'] ?? ''));
    $volume = is_numeric($row['volume'] ?? null) ? (float) $row['volume'] : 0.0;
    $astraValue = is_numeric($row['astra_value'] ?? null) ? (float) $row['astra_value'] : 0.0;
    $unitCount = $volume > 0 && $astraValue > 0
        ? max(1.0, round($volume / $astraValue, 4))
        : 1.0;
    $partnerSkuPrice = max(0.0, (float) ($pricing[$sku] ?? 0));
    $sizeLabel = $volume > 0
        ? number_format($volume, 1, '.', '') . ' ' . trim((string) ($row['unit_name'] ?? ''))
        : trim((string) ($row['unit_name'] ?? ''));
    $labelParts = [$displayProductName];
    if ($flavorName !== '' && strtoupper($flavorName) !== 'UNFLAVORED') {
        $labelParts[] = $flavorName;
    }
    if ($sizeLabel !== '') {
        $labelParts[] = $sizeLabel;
    }

    return [
        'sku' => $sku,
        'tag' => trim((string) ($row['tag'] ?? '')),
        'brand_id' => (string) ($row['brand_id'] ?? ''),
        'brand_name' => trim((string) ($row['brand_name'] ?? '')),
        'brand_code' => (string) ($row['brand_code'] ?? ''),
        'product_id' => (string) ($row['product_id'] ?? ''),
        'product_key' => (string) ($row['brand_id'] ?? '') . '::' . (string) ($row['product_id'] ?? ''),
        'product_name' => $displayProductName,
        'base_product_name' => $baseProductName,
        'product_code' => (string) ($row['product_code'] ?? ''),
        'flavor_name' => $flavorName,
        'unit_name' => trim((string) ($row['unit_name'] ?? '')),
        'volume' => jg_partner_auth_decimal_string($volume),
        'astra_value' => jg_partner_auth_decimal_string($astraValue),
        'unit_count' => $unitCount,
        'size_label' => $sizeLabel,
        'label' => implode(' · ', array_filter($labelParts, static fn (string $value): bool => $value !== '')),
        'current_stock' => (int) ($row['current_stock'] ?? 0),
        'partner_unit_price' => $partnerSkuPrice,
        'partner_price' => $partnerSkuPrice,
    ];
}

function jg_partner_auth_selected_sku_records(array $partner, ?PDO $pdo = null): array
{
    $selectedSkuCodes = array_values(array_unique(array_filter(array_map(
        static fn (mixed $value): string => trim((string) $value),
        (array) ($partner['selected_skus'] ?? [])
    ))));
    if ($selectedSkuCodes === []) {
        return [];
    }

    $pdo ??= jg_sku_db();
    jg_astra_stock_sync($pdo);
    $placeholders = implode(', ', array_fill(0, count($selectedSkuCodes), '?'));
    $stmt = $pdo->prepare(
        'SELECT
            s.sku,
            s.tag,
            s.brand_id,
            b.name AS brand_name,
            b.code AS brand_code,
            s.product_id,
            p.name AS product_name,
            p.code AS product_code,
            f.name AS flavor_name,
            u.name AS unit_name,
            s.volume,
            s.astra AS astra_value,
            s.current_stock
         FROM sku_skus s
         INNER JOIN sku_brands b ON b.id = s.brand_id
         INNER JOIN sku_products p ON p.id = s.product_id
         INNER JOIN sku_flavors f ON f.id = s.flavor_id
         INNER JOIN sku_units u ON u.id = s.unit_id
         WHERE s.sku IN (' . $placeholders . ')'
    );
    $stmt->execute($selectedSkuCodes);

    $pricing = is_array($partner['pricing'] ?? null) ? $partner['pricing'] : [];
    $productNameMap = jg_partner_auth_product_name_map();
    $recordIndex = [];
    foreach ($stmt->fetchAll() as $row) {
        if (!is_array($row)) {
            continue;
        }
        $record = jg_partner_auth_catalog_record($row, $pricing, $productNameMap);
        if ($record['sku'] !== '') {
            $recordIndex[$record['sku']] = $record;
        }
    }

    $records = [];
    foreach ($selectedSkuCodes as $skuCode) {
        if (isset($recordIndex[$skuCode])) {
            $records[] = $recordIndex[$skuCode];
        }
    }

    return $records;
}
