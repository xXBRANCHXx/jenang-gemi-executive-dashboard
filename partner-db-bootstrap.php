<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

function jg_partner_db_config(): array
{
    return [
        'host' => jg_dashboard_env_value('JG_PARTNER_DB_HOST') ?: trim((string) (jg_dashboard_load_local_config()['partner_db_host'] ?? 'localhost')),
        'port' => jg_dashboard_env_value('JG_PARTNER_DB_PORT') ?: trim((string) (jg_dashboard_load_local_config()['partner_db_port'] ?? '3306')),
        'name' => jg_dashboard_env_value('JG_PARTNER_DB_NAME') ?: trim((string) (jg_dashboard_load_local_config()['partner_db_name'] ?? '')),
        'user' => jg_dashboard_env_value('JG_PARTNER_DB_USER') ?: trim((string) (jg_dashboard_load_local_config()['partner_db_user'] ?? '')),
        'pass' => jg_dashboard_env_value('JG_PARTNER_DB_PASSWORD') ?: trim((string) (jg_dashboard_load_local_config()['partner_db_password'] ?? '')),
        'charset' => jg_dashboard_env_value('JG_PARTNER_DB_CHARSET') ?: trim((string) (jg_dashboard_load_local_config()['partner_db_charset'] ?? 'utf8mb4')),
    ];
}

function jg_partner_db(): ?PDO
{
    static $pdo = false;

    if ($pdo instanceof PDO) {
        return $pdo;
    }
    if ($pdo === null) {
        return null;
    }

    $config = jg_partner_db_config();
    if ($config['name'] === '' || $config['user'] === '' || $config['pass'] === '') {
        $pdo = null;
        return null;
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['name'],
        $config['charset']
    );

    try {
        $pdo = new PDO(
            $dsn,
            $config['user'],
            $config['pass'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
        jg_partner_db_ensure_schema($pdo);
    } catch (Throwable) {
        $pdo = null;
    }

    return $pdo instanceof PDO ? $pdo : null;
}

function jg_partner_db_ensure_schema(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS partner_profiles (
            code VARCHAR(64) NOT NULL PRIMARY KEY,
            name VARCHAR(160) NOT NULL,
            partner_slug VARCHAR(160) NOT NULL,
            notes VARCHAR(300) NOT NULL DEFAULT "",
            selected_skus_json LONGTEXT NULL DEFAULT NULL,
            pricing_json LONGTEXT NULL DEFAULT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            UNIQUE KEY uniq_partner_profiles_slug (partner_slug),
            KEY idx_partner_profiles_updated (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}
