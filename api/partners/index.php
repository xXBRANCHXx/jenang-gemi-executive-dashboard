<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/auth.php';

jg_admin_require_auth_json();

header('Content-Type: application/json; charset=utf-8');

const JG_PARTNER_FILE = __DIR__ . '/../../data/partners.json';

function jg_partner_default(): array
{
    return [
        'meta' => [
            'version' => '1.00.00',
            'updated_at' => gmdate(DATE_ATOM),
        ],
        'partners' => [],
    ];
}

function jg_partner_read(): array
{
    if (!file_exists(JG_PARTNER_FILE)) {
        return jg_partner_default();
    }

    $raw = file_get_contents(JG_PARTNER_FILE);
    $data = json_decode((string) $raw, true);
    if (!is_array($data)) {
        return jg_partner_default();
    }

    $data['meta'] = is_array($data['meta'] ?? null) ? $data['meta'] : [];
    $data['meta']['version'] = (string) ($data['meta']['version'] ?? '1.00.00');
    $data['meta']['updated_at'] = (string) ($data['meta']['updated_at'] ?? gmdate(DATE_ATOM));
    $data['partners'] = array_values(array_filter($data['partners'] ?? [], 'is_array'));
    return $data;
}

function jg_partner_write(array $data): void
{
    $data['meta']['updated_at'] = gmdate(DATE_ATOM);
    $encoded = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if (!is_string($encoded)) {
        throw new RuntimeException('Unable to encode partner data.');
    }

    $dir = dirname(JG_PARTNER_FILE);
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }

    file_put_contents(JG_PARTNER_FILE, $encoded . PHP_EOL, LOCK_EX);
}

function jg_partner_fail(string $message, int $status = 422): void
{
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

function jg_partner_request(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function jg_partner_bump_patch(string $version): string
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

function jg_partner_text(string $value, int $max = 160): string
{
    $normalized = trim(preg_replace('/\s+/', ' ', $value) ?? '');
    if ($normalized === '') {
        jg_partner_fail('This field is required.');
    }
    if (mb_strlen($normalized) > $max) {
        jg_partner_fail('Text is too long.');
    }
    return $normalized;
}

function jg_partner_slug(string $value): string
{
    $value = strtolower(trim($value));
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
    $value = trim($value, '-');
    return $value !== '' ? $value : 'partner';
}

function jg_partner_list(mixed $value): array
{
    if (!is_array($value)) {
        return [];
    }

    $normalized = [];
    foreach ($value as $item) {
        $text = trim((string) $item);
        if ($text === '') {
            continue;
        }
        $normalized[] = $text;
    }

    return array_values(array_unique($normalized));
}

function jg_partner_amount(mixed $value): float
{
    if ($value === '' || $value === null) {
        return 0;
    }
    if (!is_numeric($value)) {
        jg_partner_fail('Pricing values must be numeric.');
    }
    return round((float) $value, 2);
}

function jg_partner_default_product_access(): array
{
    return [
        'Jenang Gemi' => [
            'Bubur' => [
                'enabled' => true,
                'sizes' => ['15 Sachet', '30 Sachet', '60 Sachet'],
            ],
            'Jamu' => [
                'enabled' => true,
                'sizes' => ['15 Sachet', '30 Sachet', '60 Sachet'],
            ],
        ],
        'ZERO' => [],
        'ZFIT' => [],
    ];
}

function jg_partner_default_pricing(): array
{
    return [
        'Jenang Gemi' => [
            'Bubur' => [
                '15 Sachet' => 0,
                '30 Sachet' => 0,
                '60 Sachet' => 0,
            ],
            'Jamu' => [
                '15 Sachet' => 0,
                '30 Sachet' => 0,
                '60 Sachet' => 0,
            ],
        ],
        'ZERO' => [],
        'ZFIT' => [],
    ];
}

function jg_partner_normalize_sizes(mixed $value): array
{
    $allowed = ['15 Sachet', '30 Sachet', '60 Sachet'];
    $values = jg_partner_list($value);
    return array_values(array_filter($allowed, static fn(string $size): bool => in_array($size, $values, true)));
}

function jg_partner_product_access(mixed $value, array $companies): array
{
    $default = jg_partner_default_product_access();
    $incoming = is_array($value) ? $value : [];

    foreach ($default as $company => $products) {
        if (!in_array($company, $companies, true)) {
            $default[$company] = [];
            continue;
        }

        foreach ($products as $productName => $config) {
            $incomingConfig = is_array($incoming[$company][$productName] ?? null) ? $incoming[$company][$productName] : [];
            $enabled = !empty($incomingConfig['enabled']);
            $sizes = jg_partner_normalize_sizes($incomingConfig['sizes'] ?? []);
            $default[$company][$productName] = [
                'enabled' => $enabled,
                'sizes' => $enabled ? $sizes : [],
            ];
        }
    }

    return $default;
}

function jg_partner_pricing_matrix(mixed $value, array $companies): array
{
    $default = jg_partner_default_pricing();
    $incoming = is_array($value) ? $value : [];

    foreach ($default as $company => $products) {
        if (!in_array($company, $companies, true)) {
            $default[$company] = [];
            continue;
        }

        foreach ($products as $productName => $sizes) {
            foreach ($sizes as $size => $amount) {
                $default[$company][$productName][$size] = jg_partner_amount($incoming[$company][$productName][$size] ?? $amount);
            }
        }
    }

    return $default;
}

function jg_partner_response(array $data, ?array $partner = null): void
{
    $payload = ['database' => $data];
    if ($partner !== null) {
        $payload['partner'] = $partner;
    }
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$database = jg_partner_read();

if ($method === 'GET') {
    $code = trim((string) ($_GET['code'] ?? ''));
    if ($code === '') {
        jg_partner_response($database);
    }

    foreach ($database['partners'] as $partner) {
        if ((string) ($partner['code'] ?? '') === $code) {
            jg_partner_response($database, $partner);
        }
    }

    jg_partner_fail('Partner not found.', 404);
}

if ($method !== 'POST') {
    jg_partner_fail('Method not allowed.', 405);
}

$request = jg_partner_request();
$action = (string) ($request['action'] ?? '');

if ($action === 'create') {
    $name = jg_partner_text((string) ($request['name'] ?? ''));
    $companies = jg_partner_list($request['companies'] ?? []);
    if (!$companies) {
        jg_partner_fail('Select at least one company.');
    }

    $sequence = count($database['partners']) + 1;
    $slug = jg_partner_slug((string) ($request['partner_slug'] ?? $name));
    $code = sprintf('partner-%03d-%s', $sequence, $slug);

    $database['partners'][] = [
        'code' => $code,
        'name' => $name,
        'companies' => $companies,
        'product_access' => jg_partner_product_access($request['product_access'] ?? [], $companies),
        'pricing' => jg_partner_pricing_matrix($request['pricing'] ?? [], $companies),
        'notes' => trim((string) ($request['notes'] ?? '')),
        'partner_slug' => $slug,
        'store_path' => '/partner/' . $slug . '/',
        'created_at' => gmdate(DATE_ATOM),
        'updated_at' => gmdate(DATE_ATOM),
    ];

    $database['meta']['version'] = jg_partner_bump_patch((string) $database['meta']['version']);
    jg_partner_write($database);
    jg_partner_response($database);
}

if ($action === 'update') {
    $code = trim((string) ($request['code'] ?? ''));
    if ($code === '') {
        jg_partner_fail('Partner code is required.');
    }

    $updated = false;
    foreach ($database['partners'] as &$partner) {
        if ((string) ($partner['code'] ?? '') !== $code) {
            continue;
        }

        $name = jg_partner_text((string) ($request['name'] ?? ($partner['name'] ?? '')));
        $companies = jg_partner_list($request['companies'] ?? ($partner['companies'] ?? []));
        if (!$companies) {
            jg_partner_fail('Select at least one company.');
        }

        $slug = jg_partner_slug((string) ($request['partner_slug'] ?? ($partner['partner_slug'] ?? $name)));

        $partner['name'] = $name;
        $partner['companies'] = $companies;
        $partner['product_access'] = jg_partner_product_access($request['product_access'] ?? ($partner['product_access'] ?? []), $companies);
        $partner['pricing'] = jg_partner_pricing_matrix($request['pricing'] ?? ($partner['pricing'] ?? []), $companies);
        $partner['notes'] = trim((string) ($request['notes'] ?? ($partner['notes'] ?? '')));
        $partner['partner_slug'] = $slug;
        $partner['store_path'] = '/partner/' . $slug . '/';
        $partner['updated_at'] = gmdate(DATE_ATOM);
        $updated = true;
        break;
    }
    unset($partner);

    if (!$updated) {
        jg_partner_fail('Partner not found.', 404);
    }

    $database['meta']['version'] = jg_partner_bump_patch((string) $database['meta']['version']);
    jg_partner_write($database);
    jg_partner_response($database);
}

jg_partner_fail('Unknown action.', 400);
