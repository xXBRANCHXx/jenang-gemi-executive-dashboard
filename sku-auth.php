<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/config.php';

function jg_sku_config_value(string $envKey, string $configKey, string $default = ''): string
{
    $envValue = jg_dashboard_env_value($envKey);
    if ($envValue !== '') {
        return $envValue;
    }

    $config = jg_dashboard_load_local_config();
    $configValue = $config[$configKey] ?? null;
    if (is_string($configValue) && trim($configValue) !== '') {
        return trim($configValue);
    }

    return $default;
}

function jg_sku_branch_username(): string
{
    return jg_sku_config_value('JG_SKU_BRANCH_USERNAME', 'sku_branch_username', 'Branch Vincent');
}

function jg_sku_branch_password_hash(): string
{
    return jg_sku_config_value('JG_SKU_BRANCH_PASSWORD_HASH', 'sku_branch_password_hash');
}

function jg_sku_password_matches(string $password, string $storedHash): bool
{
    $candidate = trim($password);
    $stored = trim($storedHash);

    if ($candidate === '' || $stored === '') {
        return false;
    }

    if (preg_match('/^[a-f0-9]{64}$/i', $stored) === 1) {
        return hash_equals(strtolower($stored), hash('sha256', $candidate));
    }

    $info = password_get_info($stored);
    if (($info['algo'] ?? null) !== null) {
        return password_verify($candidate, $stored);
    }

    return hash_equals($stored, $candidate);
}

function jg_sku_is_authenticated(): bool
{
    jg_admin_start_session();
    return !empty($_SESSION['jg_sku_authenticated']) && is_string($_SESSION['jg_sku_username'] ?? null);
}

function jg_sku_session_username(): string
{
    jg_admin_start_session();
    return trim((string) ($_SESSION['jg_sku_username'] ?? ''));
}

function jg_sku_session_role(): string
{
    jg_admin_start_session();
    $role = (string) ($_SESSION['jg_sku_role'] ?? '');
    return in_array($role, ['branch', 'requester'], true) ? $role : '';
}

function jg_sku_is_branch(): bool
{
    return jg_sku_is_authenticated() && jg_sku_session_role() === 'branch';
}

function jg_sku_attempt_login(string $username, string $password): bool
{
    jg_admin_start_session();

    $normalizedUsername = trim(preg_replace('/\s+/', ' ', $username) ?? '');
    $normalizedPassword = trim($password);
    $branchUsername = jg_sku_branch_username();
    $branchHash = jg_sku_branch_password_hash();

    if ($normalizedUsername === '' || $normalizedPassword === '') {
        $_SESSION['jg_sku_authenticated'] = false;
        return false;
    }

    $role = '';
    if (strcasecmp($normalizedUsername, $branchUsername) === 0) {
        if (!jg_sku_password_matches($normalizedPassword, $branchHash)) {
            $_SESSION['jg_sku_authenticated'] = false;
            return false;
        }

        $role = 'branch';
        $normalizedUsername = $branchUsername;
    } elseif (hash_equals(JG_ADMIN_CODE_HASH, hash('sha256', $normalizedPassword))) {
        $role = 'requester';
    }

    if ($role === '') {
        $_SESSION['jg_sku_authenticated'] = false;
        return false;
    }

    session_regenerate_id(true);
    $_SESSION['jg_sku_authenticated'] = true;
    $_SESSION['jg_sku_role'] = $role;
    $_SESSION['jg_sku_username'] = $normalizedUsername;
    $_SESSION['jg_sku_login_at'] = gmdate(DATE_ATOM);

    return true;
}

function jg_sku_logout(): void
{
    jg_admin_start_session();
    unset(
        $_SESSION['jg_sku_authenticated'],
        $_SESSION['jg_sku_role'],
        $_SESSION['jg_sku_username'],
        $_SESSION['jg_sku_login_at']
    );
}

function jg_sku_require_auth_json(): void
{
    if (jg_sku_is_authenticated()) {
        return;
    }

    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Unauthorized'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

function jg_sku_require_branch_json(): void
{
    jg_sku_require_auth_json();
    if (jg_sku_is_branch()) {
        return;
    }

    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Branch approval required.'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}
