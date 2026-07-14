<?php
declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/partner-db-bootstrap.php';

header('Content-Type: application/json; charset=utf-8');

function jg_partner_password_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

function jg_partner_password_request(): array
{
    $raw = file_get_contents('php://input');
    $decoded = json_decode((string) $raw, true);
    return is_array($decoded) ? $decoded : [];
}

function jg_partner_password_rate_limit_path(string $code): string
{
    $ip = trim((string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
    return rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR
        . 'jg-partner-password-' . hash('sha256', $ip . "\n" . strtoupper(trim($code))) . '.json';
}

function jg_partner_password_recent_failures(string $code): array
{
    $path = jg_partner_password_rate_limit_path($code);
    $decoded = is_file($path) ? json_decode((string) @file_get_contents($path), true) : [];
    $cutoff = time() - 900;
    return array_values(array_filter(
        is_array($decoded) ? $decoded : [],
        static fn (mixed $timestamp): bool => is_int($timestamp) && $timestamp >= $cutoff
    ));
}

function jg_partner_password_record_failure(string $code): void
{
    $failures = jg_partner_password_recent_failures($code);
    $failures[] = time();
    @file_put_contents(jg_partner_password_rate_limit_path($code), json_encode($failures), LOCK_EX);
}

function jg_partner_password_clear_failures(string $code): void
{
    $path = jg_partner_password_rate_limit_path($code);
    if (is_file($path)) {
        @unlink($path);
    }
}

function jg_partner_password_store_path(): string
{
    $runtimePath = dirname(__DIR__, 3) . '/data/partners.runtime.json';
    return is_file($runtimePath) ? $runtimePath : dirname(__DIR__, 3) . '/data/partners.json';
}

function jg_partner_password_validate(string $password): string
{
    $password = trim($password);
    if (strlen($password) < 8) {
        jg_partner_password_response(['error' => 'New password must be at least 8 characters.'], 422);
    }
    if (strlen($password) > 160) {
        jg_partner_password_response(['error' => 'New password is too long.'], 422);
    }

    return $password;
}

function jg_partner_password_verify(array $partner, string $password): bool
{
    $hash = (string) ($partner['password_hash'] ?? '');
    return $hash !== '' && password_verify($password, $hash);
}

function jg_partner_password_verify_reset_token(array $partner, string $resetToken): bool
{
    $tokenHash = (string) ($partner['password_reset_token_hash'] ?? '');
    if ($tokenHash === '' || $resetToken === '') {
        return false;
    }

    $expiresAt = strtotime((string) ($partner['password_reset_token_expires_at'] ?? ''));
    if ($expiresAt > 0 && time() > $expiresAt) {
        return false;
    }

    return hash_equals($tokenHash, hash('sha256', $resetToken));
}

function jg_partner_password_authorized(array $partner, string $currentPassword, string $resetToken): bool
{
    if (jg_partner_password_verify_reset_token($partner, $resetToken)) {
        return true;
    }

    return $currentPassword !== '' && jg_partner_password_verify($partner, $currentPassword);
}

function jg_partner_password_change_mysql(string $code, string $currentPassword, string $newPassword, string $resetToken): void
{
    $pdo = jg_partner_db();
    if (!$pdo instanceof PDO) {
        throw new RuntimeException('MySQL is unavailable.');
    }

    $stmt = $pdo->prepare(
        'SELECT code, password_hash, password_reset_token_hash, password_reset_token_expires_at
         FROM partner_profiles
         WHERE code = :code
         LIMIT 1'
    );
    $stmt->execute([':code' => $code]);
    $partner = $stmt->fetch();
    if (!is_array($partner) || !jg_partner_password_authorized($partner, $currentPassword, $resetToken)) {
        jg_partner_password_record_failure($code);
        jg_partner_password_response(['error' => 'Current password is incorrect.'], 401);
    }

    $now = gmdate('Y-m-d H:i:s');
    $update = $pdo->prepare(
        'UPDATE partner_profiles
         SET password_hash = :password_hash,
             password_updated_at = :password_updated_at,
             password_reset_key_hash = "",
             password_reset_key_created_at = NULL,
             password_reset_token_hash = "",
             password_reset_token_expires_at = NULL,
             updated_at = :updated_at
         WHERE code = :code'
    );
    $update->execute([
        ':password_hash' => password_hash($newPassword, PASSWORD_DEFAULT),
        ':password_updated_at' => $now,
        ':updated_at' => $now,
        ':code' => $code,
    ]);
}

function jg_partner_password_change_file(string $code, string $currentPassword, string $newPassword, string $resetToken): void
{
    $path = jg_partner_password_store_path();
    $database = is_file($path) ? json_decode((string) @file_get_contents($path), true) : ['partners' => []];
    if (!is_array($database)) {
        jg_partner_password_response(['error' => 'Partner registry is unreadable.'], 500);
    }
    $database['partners'] = array_values(array_filter($database['partners'] ?? [], 'is_array'));

    $matched = false;
    $now = gmdate('Y-m-d H:i:s');
    foreach ($database['partners'] as &$partner) {
        if ((string) ($partner['code'] ?? '') !== $code) {
            continue;
        }
        if (!jg_partner_password_authorized($partner, $currentPassword, $resetToken)) {
            jg_partner_password_record_failure($code);
            jg_partner_password_response(['error' => 'Current password is incorrect.'], 401);
        }

        $partner['password_hash'] = password_hash($newPassword, PASSWORD_DEFAULT);
        $partner['password_updated_at'] = $now;
        $partner['password_reset_key_hash'] = '';
        $partner['password_reset_key_created_at'] = '';
        $partner['password_reset_token_hash'] = '';
        $partner['password_reset_token_expires_at'] = '';
        $partner['updated_at'] = $now;
        $matched = true;
        break;
    }
    unset($partner);

    if (!$matched) {
        jg_partner_password_record_failure('__unknown__');
        jg_partner_password_response(['error' => 'Partner not found.'], 404);
    }

    $database['meta'] = is_array($database['meta'] ?? null) ? $database['meta'] : [];
    $database['meta']['updated_at'] = $now;
    $encoded = json_encode($database, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if (!is_string($encoded) || @file_put_contents($path, $encoded . PHP_EOL, LOCK_EX) === false) {
        jg_partner_password_response(['error' => 'Unable to update password.'], 500);
    }
}

if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
    jg_partner_password_response(['error' => 'Method not allowed.'], 405);
}

$request = jg_partner_password_request();
$code = strtoupper(trim((string) ($request['code'] ?? '')));
$currentPassword = (string) ($request['current_password'] ?? '');
$resetToken = (string) ($request['reset_token'] ?? '');
$newPassword = jg_partner_password_validate((string) ($request['new_password'] ?? ''));

if ($code === '' || ($currentPassword === '' && $resetToken === '')) {
    jg_partner_password_response(['error' => 'Partner code and current password are required.'], 422);
}

if (count(jg_partner_password_recent_failures($code)) >= 8) {
    header('Retry-After: 900');
    jg_partner_password_response(['error' => 'Too many password attempts. Try again later.'], 429);
}

try {
    if (jg_partner_db() instanceof PDO) {
        jg_partner_password_change_mysql($code, $currentPassword, $newPassword, $resetToken);
    } else {
        jg_partner_password_change_file($code, $currentPassword, $newPassword, $resetToken);
    }
} catch (Throwable) {
    jg_partner_password_response(['error' => 'Unable to update password.'], 500);
}

jg_partner_password_clear_failures($code);
jg_partner_password_response(['ok' => true]);
