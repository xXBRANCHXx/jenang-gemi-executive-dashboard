<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/sku-db-bootstrap.php';

jg_admin_require_auth_json();

header('Content-Type: application/json; charset=utf-8');

function jg_partner_fail(string $message, int $status = 422): void
{
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

function jg_partner_store_path(): string
{
    return dirname(__DIR__, 2) . '/data/partners.json';
}

function jg_partner_now(): string
{
    return gmdate('Y-m-d H:i:s');
}

function jg_partner_request_body(): array
{
    $raw = file_get_contents('php://input');
    if (!is_string($raw) || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function jg_partner_read_database(): array
{
    $path = jg_partner_store_path();
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
        return [
            'meta' => [
                'version' => '1.00.00',
                'updated_at' => '',
            ],
            'partners' => [],
        ];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        jg_partner_fail('Partner registry is unreadable.', 500);
    }

    $decoded['meta'] = is_array($decoded['meta'] ?? null) ? $decoded['meta'] : ['version' => '1.00.00', 'updated_at' => ''];
    $decoded['partners'] = array_values(array_filter($decoded['partners'] ?? [], 'is_array'));

    return $decoded;
}

function jg_partner_write_database(array $database): void
{
    $path = jg_partner_store_path();
    $encoded = json_encode($database, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if (!is_string($encoded)) {
        jg_partner_fail('Unable to save partner registry.', 500);
    }

    if (@file_put_contents($path, $encoded . PHP_EOL, LOCK_EX) === false) {
        jg_partner_fail('Unable to save partner registry.', 500);
    }
}

function jg_partner_bump_version(string $version): string
{
    if (!preg_match('/^(\d+)\.(\d{2})\.(\d{2})$/', $version, $matches)) {
        return '1.00.00';
    }

    $major = (int) $matches[1];
    $middle = (int) $matches[2];
    $patch = (int) $matches[3] + 1;
    if ($patch > 99) {
        $patch = 0;
        $middle += 1;
    }

    return sprintf('%d.%02d.%02d', $major, $middle, $patch);
}

function jg_partner_touch_meta(array &$database): void
{
    $currentVersion = trim((string) ($database['meta']['version'] ?? '1.00.00'));
    $database['meta']['version'] = jg_partner_bump_version($currentVersion);
    $database['meta']['updated_at'] = jg_partner_now();
}

function jg_partner_normalize_text(mixed $value, string $label, int $maxLength = 160, bool $required = true): string
{
    $normalized = trim(preg_replace('/\s+/', ' ', (string) $value) ?? '');
    if ($normalized === '') {
        if ($required) {
            jg_partner_fail($label . ' is required.');
        }

        return '';
    }

    if (mb_strlen($normalized) > $maxLength) {
        jg_partner_fail($label . ' is too long.');
    }

    return $normalized;
}

function jg_partner_slugify(string $value): string
{
    $slug = strtolower(trim($value));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';
    $slug = trim($slug, '-');

    return $slug !== '' ? $slug : 'partner';
}

function jg_partner_code_exists(array $database, string $candidate, ?string $currentCode = null): bool
{
    foreach ($database['partners'] ?? [] as $partner) {
        $existingCode = (string) ($partner['code'] ?? '');
        if ($existingCode === '') {
            continue;
        }
        if ($currentCode !== null && $currentCode !== '' && $existingCode === $currentCode) {
            continue;
        }
        if ($existingCode === $candidate) {
            return true;
        }
    }

    return false;
}

function jg_partner_code_normalize(mixed $value, array $database, ?string $currentCode = null): string
{
    $normalized = strtoupper(trim((string) $value));
    $normalized = preg_replace('/[^A-Z0-9-]+/', '-', $normalized) ?? '';
    $normalized = trim((string) $normalized, '-');

    if ($normalized === '') {
        jg_partner_fail('Partner code is required.');
    }
    if (strlen($normalized) < 10) {
        jg_partner_fail('Partner code must be at least 10 characters.');
    }
    if (strlen($normalized) > 64) {
        jg_partner_fail('Partner code is too long.');
    }
    if (jg_partner_code_exists($database, $normalized, $currentCode)) {
        jg_partner_fail('That partner code is already in use.');
    }

    return $normalized;
}

function jg_partner_generate_code(array $database, ?string $currentCode = null): string
{
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    do {
        $segments = ['JGP'];
        for ($segmentIndex = 0; $segmentIndex < 3; $segmentIndex += 1) {
            $segment = '';
            for ($charIndex = 0; $charIndex < 4; $charIndex += 1) {
                $segment .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
            $segments[] = $segment;
        }
        $candidate = implode('-', $segments);
    } while (jg_partner_code_exists($database, $candidate, $currentCode));

    return $candidate;
}

function jg_partner_product_name_map(): array
{
    $path = dirname(__DIR__, 2) . '/sku-product-names.json';
    if (!is_file($path)) {
        return [];
    }

    $raw = @file_get_contents($path);
    if (!is_string($raw) || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function jg_partner_sku_catalog(PDO $pdo): array
{
    $productNameMap = jg_partner_product_name_map();
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

    $brands = [];
    $skus = [];

    foreach ($stmt->fetchAll() as $row) {
        $sku = (string) ($row['sku'] ?? '');
        $baseProductName = (string) ($row['product_name'] ?? '');
        $displayProductName = trim((string) ($productNameMap[$sku] ?? '')) ?: $baseProductName;
        $flavorName = (string) ($row['flavor_name'] ?? '');
        $isUnflavored = strtoupper($flavorName) === 'UNFLAVORED';
        $sizeLabel = number_format((float) ($row['volume'] ?? 0), 1, '.', '') . ' ' . (string) ($row['unit_name'] ?? '');
        $labelParts = [$displayProductName];
        if (!$isUnflavored && $flavorName !== '') {
            $labelParts[] = $flavorName;
        }
        $labelParts[] = $sizeLabel;

        $skuRow = [
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

        $brandId = $skuRow['brand_id'];
        $productKey = $skuRow['product_key'];

        if (!isset($brands[$brandId])) {
            $brands[$brandId] = [
                'id' => $brandId,
                'name' => $skuRow['brand_name'],
                'code' => $skuRow['brand_code'],
                'products' => [],
            ];
        }

        if (!isset($brands[$brandId]['products'][$productKey])) {
            $brands[$brandId]['products'][$productKey] = [
                'id' => $productKey,
                'product_id' => $skuRow['product_id'],
                'name' => $displayProductName,
                'display_name' => $displayProductName,
                'code' => $skuRow['product_code'],
                'sku_count' => 0,
            ];
        }

        $brands[$brandId]['products'][$productKey]['sku_count'] += 1;
        $skus[] = $skuRow;
    }

    $catalogBrands = [];
    foreach ($brands as $brand) {
        $brand['products'] = array_values($brand['products']);
        usort($brand['products'], static fn (array $left, array $right): int => strcmp((string) $left['name'], (string) $right['name']));
        $catalogBrands[] = $brand;
    }

    usort($catalogBrands, static fn (array $left, array $right): int => strcmp((string) $left['name'], (string) $right['name']));

    return [
        'brands' => $catalogBrands,
        'skus' => $skus,
    ];
}

function jg_partner_find_partner(array $database, string $code): ?array
{
    foreach ($database['partners'] ?? [] as $partner) {
        if ((string) ($partner['code'] ?? '') === $code) {
            return $partner;
        }
    }

    return null;
}

function jg_partner_enrich_record(array $partner, array $catalog): array
{
    $skuIndex = [];
    foreach ($catalog['skus'] ?? [] as $sku) {
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
        $productName = (string) ($sku['base_product_name'] ?? $sku['product_name'] ?? '');
        $sizeLabel = (string) ($sku['size_label'] ?? '');

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

        $productAccess[$brandName][$productName]['sizes'][$sizeLabel] = $sizeLabel;
        $productAccess[$brandName][$productName]['sku_codes'][$skuCode] = $skuCode;
    }

    foreach ($productAccess as $brandName => $products) {
        foreach ($products as $productName => $access) {
            $productAccess[$brandName][$productName]['sizes'] = array_values($access['sizes']);
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
    $partner['pricing'] = is_array($partner['pricing'] ?? null) ? $partner['pricing'] : [];
    $partner['selected_sku_records'] = $selectedSkus;
    $partner['store_path'] = '/' . trim((string) ($partner['partner_slug'] ?? ''), '/') . '/';

    return $partner;
}

function jg_partner_validate_selected_skus(array $selectedSkus, array $catalog): array
{
    $normalized = array_values(array_unique(array_filter(array_map(
        static fn ($value): string => trim((string) $value),
        $selectedSkus
    ))));

    if ($normalized === []) {
        jg_partner_fail('Select at least one SKU for the partner.');
    }

    $catalogIndex = [];
    foreach ($catalog['skus'] ?? [] as $sku) {
        $catalogIndex[(string) ($sku['sku'] ?? '')] = $sku;
    }

    $records = [];
    foreach ($normalized as $skuCode) {
        if (!isset($catalogIndex[$skuCode])) {
            jg_partner_fail('One or more selected SKUs are no longer available in the SKU database.');
        }

        $records[] = $catalogIndex[$skuCode];
    }

    return $records;
}

function jg_partner_build_record(array $payload, array $database, array $catalog, ?array $existing = null): array
{
    $name = jg_partner_normalize_text($payload['name'] ?? null, 'Partner name');
    $slugSource = jg_partner_normalize_text($payload['partner_slug'] ?? $name, 'Partner page slug', 160, false);
    $partnerSlug = jg_partner_slugify($slugSource !== '' ? $slugSource : $name);
    $notes = jg_partner_normalize_text($payload['notes'] ?? null, 'Notes', 300, false);
    $selectedSkuRecords = jg_partner_validate_selected_skus((array) ($payload['selected_skus'] ?? []), $catalog);

    foreach ($database['partners'] ?? [] as $partner) {
        if (!is_array($partner)) {
            continue;
        }

        if ((string) ($partner['partner_slug'] ?? '') !== $partnerSlug) {
            continue;
        }

        if ((string) ($partner['code'] ?? '') === (string) ($existing['code'] ?? '')) {
            continue;
        }

        jg_partner_fail('That partner page slug is already in use.');
    }

    $currentCode = (string) ($existing['code'] ?? '');
    $requestedCode = trim((string) ($payload['code'] ?? ''));
    $code = $requestedCode !== ''
        ? jg_partner_code_normalize($requestedCode, $database, $currentCode)
        : ($currentCode !== '' ? $currentCode : jg_partner_generate_code($database));
    $createdAt = (string) ($existing['created_at'] ?? jg_partner_now());
    $updatedAt = jg_partner_now();

    $selectedSkuCodes = array_map(static fn (array $row): string => (string) ($row['sku'] ?? ''), $selectedSkuRecords);

    return [
        'code' => $code,
        'name' => $name,
        'partner_slug' => $partnerSlug,
        'store_path' => '/' . $partnerSlug . '/',
        'notes' => $notes,
        'selected_skus' => $selectedSkuCodes,
        'pricing' => is_array($existing['pricing'] ?? null) ? $existing['pricing'] : [],
        'created_at' => $createdAt,
        'updated_at' => $updatedAt,
    ];
}

function jg_partner_response(array $database, array $catalog, ?array $partner = null): void
{
    $enrichedPartners = array_map(
        static fn (array $row): array => jg_partner_enrich_record($row, $catalog),
        array_values($database['partners'] ?? [])
    );

    $response = [
        'database' => [
            'meta' => $database['meta'] ?? ['version' => '1.00.00', 'updated_at' => ''],
            'partners' => $enrichedPartners,
        ],
        'sku_catalog' => $catalog,
    ];

    if ($partner !== null) {
        $response['partner'] = jg_partner_enrich_record($partner, $catalog);
    }

    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

try {
    $skuPdo = jg_sku_db();
    $skuCatalog = jg_partner_sku_catalog($skuPdo);
} catch (Throwable $throwable) {
    jg_partner_fail('Unable to read the SKU database for partner setup.', 500);
}

$database = jg_partner_read_database();
$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

if ($method === 'GET') {
    $code = trim((string) ($_GET['code'] ?? ''));
    if ($code !== '') {
        $partner = jg_partner_find_partner($database, $code);
        if ($partner === null) {
            jg_partner_fail('Partner not found.', 404);
        }

        jg_partner_response($database, $skuCatalog, $partner);
    }

    jg_partner_response($database, $skuCatalog);
}

if ($method !== 'POST') {
    jg_partner_fail('Method not allowed.', 405);
}

$request = jg_partner_request_body();
$action = trim((string) ($request['action'] ?? ''));

if ($action === 'create') {
    $record = jg_partner_build_record($request, $database, $skuCatalog);
    $database['partners'][] = $record;
    jg_partner_touch_meta($database);
    jg_partner_write_database($database);
    jg_partner_response($database, $skuCatalog, $record);
}

if ($action === 'update') {
    $currentCode = trim((string) ($request['current_code'] ?? $request['code'] ?? ''));
    if ($currentCode === '') {
        jg_partner_fail('Partner code is required.');
    }

    $matchIndex = null;
    $existing = null;
    foreach ($database['partners'] ?? [] as $index => $partner) {
        if ((string) ($partner['code'] ?? '') === $currentCode) {
            $matchIndex = $index;
            $existing = $partner;
            break;
        }
    }

    if ($matchIndex === null || !is_array($existing)) {
        jg_partner_fail('Partner not found.', 404);
    }

    $database['partners'][$matchIndex] = jg_partner_build_record($request, $database, $skuCatalog, $existing);
    jg_partner_touch_meta($database);
    jg_partner_write_database($database);
    jg_partner_response($database, $skuCatalog, $database['partners'][$matchIndex]);
}

if ($action === 'delete') {
    $code = trim((string) ($request['code'] ?? ''));
    if ($code === '') {
        jg_partner_fail('Partner code is required.');
    }

    $database['partners'] = array_values(array_filter(
        $database['partners'] ?? [],
        static fn (array $partner): bool => (string) ($partner['code'] ?? '') !== $code
    ));

    jg_partner_touch_meta($database);
    jg_partner_write_database($database);
    jg_partner_response($database, $skuCatalog);
}

jg_partner_fail('Unknown action.', 400);
