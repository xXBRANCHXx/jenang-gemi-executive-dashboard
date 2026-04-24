<?php
declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/sku-db-bootstrap.php';
require_once dirname(__DIR__, 3) . '/partner-db-bootstrap.php';

header('Content-Type: application/json; charset=utf-8');

function jg_public_partner_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

function jg_public_partner_store_path(): string
{
    $runtimePath = dirname(__DIR__, 3) . '/data/partners.runtime.json';
    if (is_file($runtimePath)) {
        return $runtimePath;
    }

    return dirname(__DIR__, 3) . '/data/partners.json';
}

function jg_public_partner_product_name_map(): array
{
    $path = dirname(__DIR__, 3) . '/sku-product-names.json';
    if (!is_file($path)) {
        return [];
    }

    $raw = @file_get_contents($path);
    $decoded = json_decode((string) $raw, true);
    return is_array($decoded) ? $decoded : [];
}

function jg_public_partner_read_database(): array
{
    $pdo = jg_partner_db();
    if ($pdo instanceof PDO) {
        $stmt = $pdo->query(
            'SELECT code, name, partner_slug, notes, selected_skus_json, pricing_json, created_at, updated_at
             FROM partner_profiles
             ORDER BY updated_at DESC, code ASC'
        );

        $partners = [];
        $updatedAt = '';
        foreach ($stmt->fetchAll() as $row) {
            $selectedSkus = json_decode((string) ($row['selected_skus_json'] ?? ''), true);
            $pricing = json_decode((string) ($row['pricing_json'] ?? ''), true);
            $updatedAt = max($updatedAt, (string) ($row['updated_at'] ?? ''));
            $partners[] = [
                'code' => (string) ($row['code'] ?? ''),
                'name' => (string) ($row['name'] ?? ''),
                'partner_slug' => (string) ($row['partner_slug'] ?? ''),
                'notes' => (string) ($row['notes'] ?? ''),
                'selected_skus' => is_array($selectedSkus) ? array_values(array_filter(array_map('strval', $selectedSkus))) : [],
                'pricing' => is_array($pricing) ? $pricing : [],
                'created_at' => (string) ($row['created_at'] ?? ''),
                'updated_at' => (string) ($row['updated_at'] ?? ''),
            ];
        }

        return [
            'meta' => [
                'version' => 'mysql',
                'updated_at' => $updatedAt,
            ],
            'partners' => $partners,
        ];
    }

    $path = jg_public_partner_store_path();
    if (!is_file($path)) {
        return [
            'meta' => [
                'version' => '1.00.00',
                'updated_at' => '',
            ],
            'partners' => [],
        ];
    }

    $raw = @file_get_contents($path);
    if (!is_string($raw) || trim($raw) === '') {
        jg_public_partner_response(['error' => 'Partner registry is unreadable.'], 500);
    }

    $database = json_decode($raw, true);
    if (!is_array($database)) {
        jg_public_partner_response(['error' => 'Partner registry is invalid.'], 500);
    }

    $database['meta'] = is_array($database['meta'] ?? null) ? $database['meta'] : ['version' => '1.00.00', 'updated_at' => ''];
    $database['partners'] = array_values(array_filter($database['partners'] ?? [], 'is_array'));

    return $database;
}

function jg_public_partner_sku_catalog(PDO $pdo): array
{
    $productNameMap = jg_public_partner_product_name_map();
    $stmt = $pdo->query(
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
            s.current_stock
         FROM sku_skus s
         INNER JOIN sku_brands b ON b.id = s.brand_id
         INNER JOIN sku_products p ON p.id = s.product_id
         INNER JOIN sku_flavors f ON f.id = s.flavor_id
         INNER JOIN sku_units u ON u.id = s.unit_id
         ORDER BY b.name, p.name, s.sku'
    );

    $skus = [];
    foreach ($stmt->fetchAll() as $row) {
        $sku = (string) ($row['sku'] ?? '');
        $baseProductName = (string) ($row['product_name'] ?? '');
        $displayProductName = trim((string) ($productNameMap[$sku] ?? '')) ?: $baseProductName;
        $flavorName = (string) ($row['flavor_name'] ?? '');
        $sizeLabel = number_format((float) ($row['volume'] ?? 0), 1, '.', '') . ' ' . (string) ($row['unit_name'] ?? '');
        $isUnflavored = strtoupper($flavorName) === 'UNFLAVORED';

        $labelParts = [$displayProductName];
        if (!$isUnflavored && $flavorName !== '') {
            $labelParts[] = $flavorName;
        }
        $labelParts[] = $sizeLabel;

        $skus[] = [
            'sku' => $sku,
            'tag' => (string) ($row['tag'] ?? ''),
            'brand_id' => (string) ($row['brand_id'] ?? ''),
            'brand_name' => (string) ($row['brand_name'] ?? ''),
            'brand_code' => (string) ($row['brand_code'] ?? ''),
            'product_id' => (string) ($row['product_id'] ?? ''),
            'product_key' => (string) ($row['brand_id'] ?? '') . '::' . $displayProductName,
            'product_name' => $displayProductName,
            'base_product_name' => $baseProductName,
            'product_code' => (string) ($row['product_code'] ?? ''),
            'flavor_name' => $flavorName,
            'unit_name' => (string) ($row['unit_name'] ?? ''),
            'volume' => number_format((float) ($row['volume'] ?? 0), 1, '.', ''),
            'size_label' => $sizeLabel,
            'label' => implode(' · ', array_filter($labelParts, static fn ($value) => trim((string) $value) !== '')),
            'current_stock' => (int) ($row['current_stock'] ?? 0),
        ];
    }

    return [
        'skus' => $skus,
    ];
}

function jg_public_partner_enrich(array $partner, array $catalog): array
{
    $skuIndex = [];
    foreach ((array) ($catalog['skus'] ?? []) as $sku) {
        $skuIndex[(string) ($sku['sku'] ?? '')] = $sku;
    }

    $selectedSkuCodes = array_values(array_unique(array_filter(array_map(
        static fn ($value): string => trim((string) $value),
        (array) ($partner['selected_skus'] ?? [])
    ))));

    $selectedSkus = [];
    $companies = [];
    $companyNames = [];
    $productAccess = [];
    $brandIds = [];
    $productIds = [];

    foreach ($selectedSkuCodes as $skuCode) {
        if (!isset($skuIndex[$skuCode])) {
            continue;
        }

        $sku = $skuIndex[$skuCode];
        $selectedSkus[] = $sku;

        $brandId = (string) ($sku['brand_id'] ?? '');
        $brandName = (string) ($sku['brand_name'] ?? '');
        $productId = (string) ($sku['product_id'] ?? '');
        $productKey = (string) ($sku['product_key'] ?? '');
        $productName = (string) ($sku['product_name'] ?? $sku['base_product_name'] ?? '');

        $brandIds[$brandId] = $brandId;
        $productIds[$productId] = $productId;
        if ($productKey !== '') {
            $productIds[$productKey] = $productKey;
        }
        $companyNames[$brandName] = $brandName;

        if (!isset($companies[$brandId])) {
            $companies[$brandId] = [
                'id' => $brandId,
                'name' => $brandName,
            ];
        }

        if (!isset($productAccess[$brandName])) {
            $productAccess[$brandName] = [];
        }

        if (!isset($productAccess[$brandName][$productName])) {
            $productAccess[$brandName][$productName] = [
                'enabled' => true,
                'sizes' => [],
                'sku_codes' => [],
            ];
        }

        $productAccess[$brandName][$productName]['sizes'][(string) ($sku['size_label'] ?? '')] = (string) ($sku['size_label'] ?? '');
        $productAccess[$brandName][$productName]['sku_codes'][$skuCode] = $skuCode;
    }

    foreach ($productAccess as $brandName => $products) {
        foreach ($products as $productName => $access) {
            $productAccess[$brandName][$productName]['sizes'] = array_values(array_filter($access['sizes']));
            sort($productAccess[$brandName][$productName]['sizes']);
            $productAccess[$brandName][$productName]['sku_codes'] = array_values($access['sku_codes']);
            sort($productAccess[$brandName][$productName]['sku_codes']);
        }
    }

    $partner['selected_skus'] = $selectedSkuCodes;
    $partner['selected_brand_ids'] = array_values($brandIds);
    $partner['selected_product_ids'] = array_values($productIds);
    $partner['selected_product_keys'] = array_values(array_unique(array_filter(array_map(
        static fn (array $sku): string => trim((string) ($sku['product_key'] ?? '')),
        $selectedSkus
    ))));
    $partner['companies'] = array_values($companyNames);
    $partner['company_records'] = array_values($companies);
    $partner['product_access'] = $productAccess;
    $partner['selected_sku_records'] = $selectedSkus;
    $partner['store_path'] = '/' . trim((string) ($partner['partner_slug'] ?? ''), '/') . '/';

    return $partner;
}

$database = jg_public_partner_read_database();
$catalog = ['skus' => []];

try {
    $catalog = jg_public_partner_sku_catalog(jg_sku_db());
} catch (Throwable) {
    $catalog = ['skus' => []];
}

$partners = array_map(
    static fn (array $partner): array => jg_public_partner_enrich($partner, $catalog),
    $database['partners']
);

jg_public_partner_response([
    'meta' => [
        'version' => (string) ($database['meta']['version'] ?? '1.00.00'),
        'updated_at' => (string) ($database['meta']['updated_at'] ?? ''),
    ],
    'partners' => $partners,
]);
