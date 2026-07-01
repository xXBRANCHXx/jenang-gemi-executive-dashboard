<?php
declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/partner-db-bootstrap.php';

header('Content-Type: application/json; charset=utf-8');

const JG_PARTNER_RESET_KEY_TTL_SECONDS = 86400;
const JG_PARTNER_RESET_TOKEN_TTL_SECONDS = 3600;

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
            'SELECT code, name, partner_slug, notes, selected_skus_json, pricing_json, password_hash, password_updated_at,
                    password_reset_key_hash, password_reset_key_created_at, password_reset_token_hash, password_reset_token_expires_at,
                    created_at, updated_at
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
                'password_reset_key_hash' => (string) ($row['password_reset_key_hash'] ?? ''),
                'password_reset_key_created_at' => (string) ($row['password_reset_key_created_at'] ?? ''),
                'password_reset_token_hash' => (string) ($row['password_reset_token_hash'] ?? ''),
                'password_reset_token_expires_at' => (string) ($row['password_reset_token_expires_at'] ?? ''),
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

function jg_partner_auth_reset_key_valid(array $partner, string $password): bool
{
    $hash = (string) ($partner['password_reset_key_hash'] ?? '');
    if ($hash === '') {
        return false;
    }

    $createdAt = strtotime((string) ($partner['password_reset_key_created_at'] ?? ''));
    if ($createdAt > 0 && time() - $createdAt > JG_PARTNER_RESET_KEY_TTL_SECONDS) {
        return false;
    }

    return password_verify(strtoupper(trim($password)), $hash);
}

function jg_partner_auth_generate_reset_token(): string
{
    return bin2hex(random_bytes(32));
}

function jg_partner_auth_store_reset_token_mysql(string $code, string $token): void
{
    $pdo = jg_partner_db();
    if (!$pdo instanceof PDO) {
        throw new RuntimeException('MySQL is unavailable.');
    }

    $now = gmdate('Y-m-d H:i:s');
    $expiresAt = gmdate('Y-m-d H:i:s', time() + JG_PARTNER_RESET_TOKEN_TTL_SECONDS);
    $stmt = $pdo->prepare(
        'UPDATE partner_profiles
         SET password_reset_key_hash = "",
             password_reset_key_created_at = NULL,
             password_reset_token_hash = :token_hash,
             password_reset_token_expires_at = :token_expires_at,
             updated_at = :updated_at
         WHERE code = :code'
    );
    $stmt->execute([
        ':token_hash' => hash('sha256', $token),
        ':token_expires_at' => $expiresAt,
        ':updated_at' => $now,
        ':code' => $code,
    ]);
}

function jg_partner_auth_store_reset_token_file(string $code, string $token): void
{
    $path = jg_partner_auth_store_path();
    $database = is_file($path) ? json_decode((string) @file_get_contents($path), true) : ['partners' => []];
    if (!is_array($database)) {
        throw new RuntimeException('Partner registry is unreadable.');
    }

    $database['partners'] = array_values(array_filter($database['partners'] ?? [], 'is_array'));
    $now = gmdate('Y-m-d H:i:s');
    $expiresAt = gmdate('Y-m-d H:i:s', time() + JG_PARTNER_RESET_TOKEN_TTL_SECONDS);
    $matched = false;

    foreach ($database['partners'] as &$partner) {
        if ((string) ($partner['code'] ?? '') !== $code) {
            continue;
        }

        $partner['password_reset_key_hash'] = '';
        $partner['password_reset_key_created_at'] = '';
        $partner['password_reset_token_hash'] = hash('sha256', $token);
        $partner['password_reset_token_expires_at'] = $expiresAt;
        $partner['updated_at'] = $now;
        $matched = true;
        break;
    }
    unset($partner);

    if (!$matched) {
        throw new RuntimeException('Partner not found.');
    }

    $database['meta'] = is_array($database['meta'] ?? null) ? $database['meta'] : [];
    $database['meta']['updated_at'] = $now;
    $encoded = json_encode($database, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if (!is_string($encoded) || @file_put_contents($path, $encoded . PHP_EOL, LOCK_EX) === false) {
        throw new RuntimeException('Unable to save reset token.');
    }
}

function jg_partner_auth_issue_reset_token(string $code): string
{
    $token = jg_partner_auth_generate_reset_token();
    if (jg_partner_db() instanceof PDO) {
        jg_partner_auth_store_reset_token_mysql($code, $token);
    } else {
        jg_partner_auth_store_reset_token_file($code, $token);
    }

    return $token;
}

function jg_partner_auth_public_partner(array $partner): array
{
    $hash = (string) ($partner['password_hash'] ?? '');
    unset($partner['password_hash']);
    unset($partner['password_reset_key_hash'], $partner['password_reset_key_created_at'], $partner['password_reset_token_hash'], $partner['password_reset_token_expires_at']);
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
if (!is_array($partner)) {
    jg_partner_auth_response(['error' => 'Invalid partner credentials.'], 401);
}

$resetKeyLogin = false;
$resetToken = '';
if (jg_partner_auth_verify($partner, $password)) {
    $resetKeyLogin = false;
} elseif (jg_partner_auth_reset_key_valid($partner, $password)) {
    try {
        $resetToken = jg_partner_auth_issue_reset_token($code);
        $resetKeyLogin = true;
    } catch (Throwable) {
        jg_partner_auth_response(['error' => 'Unable to start password reset.'], 500);
    }
} else {
    jg_partner_auth_response(['error' => 'Invalid partner credentials.'], 401);
}

$response = [
    'ok' => true,
    'partner' => jg_partner_auth_public_partner($partner),
    'password_reset_required' => $resetKeyLogin,
];

if ($resetKeyLogin) {
    $response['password_reset_token'] = $resetToken;
}

jg_partner_auth_response($response);
