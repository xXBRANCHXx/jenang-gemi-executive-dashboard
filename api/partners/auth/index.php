<?php
declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/partner-db-bootstrap.php';

header('Content-Type: application/json; charset=utf-8');

function jg_partner_auth_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

function jg_partner_auth_request(): array
{
    $raw = file_get_contents('php://input');
    $decoded = json_decode((string) $raw, true);
    return is_array($decoded) ? $decoded : [];
}

function jg_partner_auth_store_path(): string
{
    $runtimePath = dirname(__DIR__, 3) . '/data/partners.runtime.json';
    return is_file($runtimePath) ? $runtimePath : dirname(__DIR__, 3) . '/data/partners.json';
}

function jg_partner_auth_read_database(): array
{
    $pdo = jg_partner_db();
    if ($pdo instanceof PDO) {
        $stmt = $pdo->query(
            'SELECT code, name, partner_slug, notes, selected_skus_json, pricing_json, password_hash, password_updated_at, created_at, updated_at
             FROM partner_profiles
             ORDER BY updated_at DESC, code ASC'
        );

        $partners = [];
        foreach ($stmt->fetchAll() as $row) {
            $selectedSkus = json_decode((string) ($row['selected_skus_json'] ?? ''), true);
            $pricing = json_decode((string) ($row['pricing_json'] ?? ''), true);
            $partners[] = [
                'code' => (string) ($row['code'] ?? ''),
                'name' => (string) ($row['name'] ?? ''),
                'partner_slug' => (string) ($row['partner_slug'] ?? ''),
                'notes' => (string) ($row['notes'] ?? ''),
                'selected_skus' => is_array($selectedSkus) ? array_values(array_filter(array_map('strval', $selectedSkus))) : [],
                'pricing' => is_array($pricing) ? $pricing : [],
                'password_hash' => (string) ($row['password_hash'] ?? ''),
                'password_updated_at' => (string) ($row['password_updated_at'] ?? ''),
                'created_at' => (string) ($row['created_at'] ?? ''),
                'updated_at' => (string) ($row['updated_at'] ?? ''),
            ];
        }

        return ['partners' => $partners];
    }

    $path = jg_partner_auth_store_path();
    if (!is_file($path)) {
        return ['partners' => []];
    }

    $decoded = json_decode((string) @file_get_contents($path), true);
    if (!is_array($decoded)) {
        return ['partners' => []];
    }

    $decoded['partners'] = array_values(array_filter($decoded['partners'] ?? [], 'is_array'));
    return $decoded;
}

function jg_partner_auth_find(array $database, string $code): ?array
{
    foreach ($database['partners'] ?? [] as $partner) {
        if ((string) ($partner['code'] ?? '') === $code) {
            return $partner;
        }
    }

    return null;
}

function jg_partner_auth_verify(array $partner, string $password): bool
{
    $hash = (string) ($partner['password_hash'] ?? '');
    if ($hash !== '') {
        return password_verify($password, $hash);
    }

    return hash_equals((string) ($partner['code'] ?? ''), $password);
}

function jg_partner_auth_public_partner(array $partner): array
{
    $hash = (string) ($partner['password_hash'] ?? '');
    unset($partner['password_hash']);
    $partner['password_configured'] = $hash !== '';
    $partner['password_updated_at'] = (string) ($partner['password_updated_at'] ?? '');
    $partner['store_path'] = '/' . trim((string) ($partner['partner_slug'] ?? ''), '/') . '/';

    return $partner;
}

if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
    jg_partner_auth_response(['error' => 'Method not allowed.'], 405);
}

$request = jg_partner_auth_request();
$code = strtoupper(trim((string) ($request['code'] ?? '')));
$password = (string) ($request['password'] ?? '');

if ($code === '' || $password === '') {
    jg_partner_auth_response(['error' => 'Partner code and password are required.'], 422);
}

$partner = jg_partner_auth_find(jg_partner_auth_read_database(), $code);
if (!is_array($partner) || !jg_partner_auth_verify($partner, $password)) {
    jg_partner_auth_response(['error' => 'Invalid partner credentials.'], 401);
}

jg_partner_auth_response([
    'ok' => true,
    'partner' => jg_partner_auth_public_partner($partner),
]);
