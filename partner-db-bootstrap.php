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

function jg_partner_db_host_candidates(string $host): array
{
    $hosts = [$host];
    if ($host === 'local.server') {
        $hosts[] = 'localhost';
    }
    return array_values(array_unique(array_filter($hosts)));
}

function jg_partner_db_legacy_registry(): array
{
    foreach ([__DIR__ . '/data/partners.runtime.json', __DIR__ . '/data/partners.json'] as $path) {
        if (!is_file($path)) {
            continue;
        }

        $decoded = json_decode((string) @file_get_contents($path), true);
        $partners = array_values(array_filter((array) ($decoded['partners'] ?? []), 'is_array'));
        if ($partners !== []) {
            return $partners;
        }
    }

    return [];
}

function jg_partner_db_legacy_datetime(mixed $value, bool $required = false): ?string
{
    $timestamp = strtotime(trim((string) $value));
    if ($timestamp === false) {
        return $required ? gmdate('Y-m-d H:i:s') : null;
    }

    return gmdate('Y-m-d H:i:s', $timestamp);
}

function jg_partner_db_migrate_legacy_registry(PDO $pdo): int
{
    $migrationKey = 'legacy-partners-runtime-json-v1';
    $legacyPartners = jg_partner_db_legacy_registry();
    $existingCount = (int) $pdo->query('SELECT COUNT(*) FROM partner_profiles')->fetchColumn();
    if ($existingCount === 0 && $legacyPartners === []) {
        return 0;
    }

    $pdo->beginTransaction();
    try {
        $claim = $pdo->prepare(
            'INSERT IGNORE INTO partner_registry_migrations (migration_key, imported_count, applied_at)
             VALUES (:migration_key, 0, :applied_at)'
        );
        $claim->execute([
            ':migration_key' => $migrationKey,
            ':applied_at' => gmdate('Y-m-d H:i:s'),
        ]);

        if ($claim->rowCount() === 0) {
            $stmt = $pdo->prepare('SELECT imported_count FROM partner_registry_migrations WHERE migration_key = :migration_key');
            $stmt->execute([':migration_key' => $migrationKey]);
            $importedCount = (int) $stmt->fetchColumn();
            $pdo->commit();
            return $importedCount;
        }

        $importedCount = 0;
        $existingCount = (int) $pdo->query('SELECT COUNT(*) FROM partner_profiles')->fetchColumn();
        if ($existingCount === 0) {
            $insert = $pdo->prepare(
                'INSERT IGNORE INTO partner_profiles
                    (code, name, partner_slug, notes, selected_skus_json, pricing_json, billing_period_type, discount_enabled, discount_percent,
                     password_hash, password_updated_at, password_reset_key_hash, password_reset_key_created_at,
                     password_reset_token_hash, password_reset_token_expires_at, created_at, updated_at)
                 VALUES
                    (:code, :name, :partner_slug, :notes, :selected_skus_json, :pricing_json, :billing_period_type, :discount_enabled, :discount_percent,
                     :password_hash, :password_updated_at, :password_reset_key_hash, :password_reset_key_created_at,
                     :password_reset_token_hash, :password_reset_token_expires_at, :created_at, :updated_at)'
            );

            foreach ($legacyPartners as $partner) {
                $code = trim((string) ($partner['code'] ?? ''));
                $name = trim((string) ($partner['name'] ?? ''));
                $slug = trim((string) ($partner['partner_slug'] ?? ''), '/');
                if ($code === '' || $name === '' || $slug === '') {
                    continue;
                }

                $discount = is_numeric($partner['discount_percent'] ?? null)
                    ? max(0.0, min(100.0, (float) $partner['discount_percent']))
                    : 0.0;
                $insert->execute([
                    ':code' => substr($code, 0, 64),
                    ':name' => substr($name, 0, 160),
                    ':partner_slug' => substr($slug, 0, 160),
                    ':notes' => substr((string) ($partner['notes'] ?? ''), 0, 300),
                    ':selected_skus_json' => json_encode(array_values(array_filter((array) ($partner['selected_skus'] ?? []), 'is_string')), JSON_UNESCAPED_SLASHES),
                    ':pricing_json' => json_encode((array) ($partner['pricing'] ?? []), JSON_UNESCAPED_SLASHES),
                    ':billing_period_type' => in_array(($partner['billing_period_type'] ?? ''), ['calendar_week', 'calendar_month'], true)
                        ? (string) $partner['billing_period_type']
                        : 'calendar_week',
                    ':discount_enabled' => filter_var($partner['discount_enabled'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
                    ':discount_percent' => $discount,
                    ':password_hash' => (string) ($partner['password_hash'] ?? ''),
                    ':password_updated_at' => jg_partner_db_legacy_datetime($partner['password_updated_at'] ?? null),
                    ':password_reset_key_hash' => (string) ($partner['password_reset_key_hash'] ?? ''),
                    ':password_reset_key_created_at' => jg_partner_db_legacy_datetime($partner['password_reset_key_created_at'] ?? null),
                    ':password_reset_token_hash' => (string) ($partner['password_reset_token_hash'] ?? ''),
                    ':password_reset_token_expires_at' => jg_partner_db_legacy_datetime($partner['password_reset_token_expires_at'] ?? null),
                    ':created_at' => jg_partner_db_legacy_datetime($partner['created_at'] ?? null, true),
                    ':updated_at' => jg_partner_db_legacy_datetime($partner['updated_at'] ?? null, true),
                ]);
                $importedCount += $insert->rowCount();
            }
        }

        $update = $pdo->prepare(
            'UPDATE partner_registry_migrations SET imported_count = :imported_count WHERE migration_key = :migration_key'
        );
        $update->execute([
            ':imported_count' => $importedCount,
            ':migration_key' => $migrationKey,
        ]);
        $pdo->commit();
        return $importedCount;
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $exception;
    }
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

    foreach (jg_partner_db_host_candidates($config['host']) as $host) {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            $host,
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
            jg_partner_db_migrate_legacy_registry($pdo);
            $pdo->exec('UPDATE partner_profiles SET partner_class = "A" WHERE LOWER(TRIM(name)) IN ("baggos", "baggos media", "orezz") OR LOWER(TRIM(partner_slug)) IN ("baggos", "baggosmedia", "orezz")');
            break;
        } catch (Throwable) {
            $pdo = null;
        }
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
            partner_class CHAR(1) NOT NULL DEFAULT "B",
            contact_email VARCHAR(190) NOT NULL DEFAULT "",
            contact_phone VARCHAR(64) NOT NULL DEFAULT "",
            contact_address TEXT NULL DEFAULT NULL,
            billing_period_type VARCHAR(32) NOT NULL DEFAULT "calendar_week",
            discount_enabled TINYINT(1) NOT NULL DEFAULT 0,
            discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
            password_hash VARCHAR(255) NOT NULL DEFAULT "",
            password_updated_at DATETIME NULL DEFAULT NULL,
            password_reset_key_hash VARCHAR(255) NOT NULL DEFAULT "",
            password_reset_key_created_at DATETIME NULL DEFAULT NULL,
            password_reset_token_hash VARCHAR(255) NOT NULL DEFAULT "",
            password_reset_token_expires_at DATETIME NULL DEFAULT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            UNIQUE KEY uniq_partner_profiles_slug (partner_slug),
            KEY idx_partner_profiles_updated (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS partner_registry_migrations (
            migration_key VARCHAR(100) NOT NULL PRIMARY KEY,
            imported_count INT UNSIGNED NOT NULL DEFAULT 0,
            applied_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $columns = [];
    $stmt = $pdo->query('SHOW COLUMNS FROM partner_profiles');
    foreach ($stmt->fetchAll() as $column) {
        $columns[(string) ($column['Field'] ?? '')] = true;
    }

    if (!isset($columns['password_hash'])) {
        $pdo->exec('ALTER TABLE partner_profiles ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT "" AFTER pricing_json');
    }
    if (!isset($columns['partner_class'])) {
        $pdo->exec('ALTER TABLE partner_profiles ADD COLUMN partner_class CHAR(1) NOT NULL DEFAULT "B" AFTER pricing_json');
        $pdo->exec('UPDATE partner_profiles SET partner_class = "A" WHERE LOWER(TRIM(name)) IN ("baggos", "baggos media", "orezz") OR LOWER(TRIM(partner_slug)) IN ("baggos", "baggosmedia", "orezz")');
    }
    if (!isset($columns['contact_email'])) {
        $pdo->exec('ALTER TABLE partner_profiles ADD COLUMN contact_email VARCHAR(190) NOT NULL DEFAULT "" AFTER partner_class');
    }
    if (!isset($columns['contact_phone'])) {
        $pdo->exec('ALTER TABLE partner_profiles ADD COLUMN contact_phone VARCHAR(64) NOT NULL DEFAULT "" AFTER contact_email');
    }
    if (!isset($columns['contact_address'])) {
        $pdo->exec('ALTER TABLE partner_profiles ADD COLUMN contact_address TEXT NULL DEFAULT NULL AFTER contact_phone');
    }
    if (!isset($columns['billing_period_type'])) {
        $pdo->exec('ALTER TABLE partner_profiles ADD COLUMN billing_period_type VARCHAR(32) NOT NULL DEFAULT "calendar_week" AFTER pricing_json');
    }
    if (!isset($columns['discount_enabled'])) {
        $pdo->exec('ALTER TABLE partner_profiles ADD COLUMN discount_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER pricing_json');
    }
    if (!isset($columns['discount_percent'])) {
        $pdo->exec('ALTER TABLE partner_profiles ADD COLUMN discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER discount_enabled');
    }
    if (!isset($columns['password_updated_at'])) {
        $pdo->exec('ALTER TABLE partner_profiles ADD COLUMN password_updated_at DATETIME NULL DEFAULT NULL AFTER password_hash');
    }
    if (!isset($columns['password_reset_key_hash'])) {
        $pdo->exec('ALTER TABLE partner_profiles ADD COLUMN password_reset_key_hash VARCHAR(255) NOT NULL DEFAULT "" AFTER password_updated_at');
    }
    if (!isset($columns['password_reset_key_created_at'])) {
        $pdo->exec('ALTER TABLE partner_profiles ADD COLUMN password_reset_key_created_at DATETIME NULL DEFAULT NULL AFTER password_reset_key_hash');
    }
    if (!isset($columns['password_reset_token_hash'])) {
        $pdo->exec('ALTER TABLE partner_profiles ADD COLUMN password_reset_token_hash VARCHAR(255) NOT NULL DEFAULT "" AFTER password_reset_key_created_at');
    }
    if (!isset($columns['password_reset_token_expires_at'])) {
        $pdo->exec('ALTER TABLE partner_profiles ADD COLUMN password_reset_token_expires_at DATETIME NULL DEFAULT NULL AFTER password_reset_token_hash');
    }
    // These two existing partners are the fixed Class A cohort; every other
    // existing row receives the Class B default during the column migration.
    $pdo->exec('UPDATE partner_profiles SET partner_class = "A" WHERE LOWER(TRIM(name)) IN ("baggos", "baggos media", "orezz") OR LOWER(TRIM(partner_slug)) IN ("baggos", "baggosmedia", "orezz")');
}
