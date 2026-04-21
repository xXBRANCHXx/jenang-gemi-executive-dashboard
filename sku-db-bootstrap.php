<?php
declare(strict_types=1);

require_once __DIR__ . '/sku-auth.php';

function jg_sku_db_config(): array
{
    return [
        'host' => jg_sku_config_value('JG_SKU_DB_HOST', 'sku_db_host', 'localhost'),
        'port' => jg_sku_config_value('JG_SKU_DB_PORT', 'sku_db_port', '3306'),
        'name' => jg_sku_config_value('JG_SKU_DB_NAME', 'sku_db_name'),
        'user' => jg_sku_config_value('JG_SKU_DB_USER', 'sku_db_user'),
        'pass' => jg_sku_config_value('JG_SKU_DB_PASSWORD', 'sku_db_password'),
        'charset' => jg_sku_config_value('JG_SKU_DB_CHARSET', 'sku_db_charset', 'utf8mb4'),
    ];
}

function jg_sku_db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = jg_sku_db_config();
    if ($config['name'] === '' || $config['user'] === '') {
        throw new RuntimeException('SKU database configuration is incomplete.');
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=%s',
        $config['host'],
        $config['port'],
        $config['name'],
        $config['charset']
    );

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

    jg_sku_ensure_schema($pdo);

    return $pdo;
}

function jg_sku_table_exists(PDO $pdo, string $tableName): bool
{
    $stmt = $pdo->prepare('SHOW TABLES LIKE :table_name');
    $stmt->execute([':table_name' => $tableName]);
    return $stmt->fetchColumn() !== false;
}

function jg_sku_column_exists(PDO $pdo, string $tableName, string $columnName): bool
{
    $stmt = $pdo->prepare('SHOW COLUMNS FROM `' . str_replace('`', '``', $tableName) . '` LIKE :column_name');
    $stmt->execute([':column_name' => $columnName]);
    return $stmt->fetchColumn() !== false;
}

function jg_sku_index_exists(PDO $pdo, string $tableName, string $indexName): bool
{
    $stmt = $pdo->prepare('SHOW INDEX FROM `' . str_replace('`', '``', $tableName) . '` WHERE Key_name = :index_name');
    $stmt->execute([':index_name' => $indexName]);
    return $stmt->fetchColumn() !== false;
}

function jg_sku_ensure_schema(PDO $pdo): void
{
    $statements = [
        'CREATE TABLE IF NOT EXISTS sku_meta (
            meta_key VARCHAR(64) NOT NULL PRIMARY KEY,
            meta_value VARCHAR(255) NOT NULL,
            updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS sku_brands (
            id VARCHAR(140) NOT NULL PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            code CHAR(2) NOT NULL,
            created_at DATETIME NOT NULL,
            UNIQUE KEY uniq_sku_brand_name (name),
            UNIQUE KEY uniq_sku_brand_code (code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS sku_units (
            id VARCHAR(140) NOT NULL PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            code CHAR(2) NOT NULL,
            created_at DATETIME NOT NULL,
            UNIQUE KEY uniq_sku_unit_name (name),
            UNIQUE KEY uniq_sku_unit_code (code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS sku_flavors (
            id VARCHAR(180) NOT NULL PRIMARY KEY,
            brand_id VARCHAR(140) NOT NULL,
            name VARCHAR(120) NOT NULL,
            code CHAR(2) NOT NULL,
            created_at DATETIME NOT NULL,
            UNIQUE KEY uniq_sku_flavor_brand_name (brand_id, name),
            UNIQUE KEY uniq_sku_flavor_brand_code (brand_id, code),
            CONSTRAINT fk_sku_flavors_brand FOREIGN KEY (brand_id) REFERENCES sku_brands(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS sku_products (
            id VARCHAR(180) NOT NULL PRIMARY KEY,
            brand_id VARCHAR(140) NOT NULL,
            name VARCHAR(120) NOT NULL,
            code CHAR(2) NOT NULL,
            created_at DATETIME NOT NULL,
            UNIQUE KEY uniq_sku_product_brand_name (brand_id, name),
            UNIQUE KEY uniq_sku_product_brand_code (brand_id, code),
            CONSTRAINT fk_sku_products_brand FOREIGN KEY (brand_id) REFERENCES sku_brands(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS sku_requests (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            requester_username VARCHAR(160) NOT NULL,
            requester_role VARCHAR(32) NOT NULL,
            brand_id VARCHAR(140) NOT NULL,
            unit_id VARCHAR(140) NOT NULL,
            volume DECIMAL(4,1) NOT NULL,
            flavor_id VARCHAR(180) NOT NULL,
            product_id VARCHAR(180) NOT NULL,
            proposed_sku VARCHAR(12) NOT NULL,
            status VARCHAR(16) NOT NULL DEFAULT "pending",
            decision_notes VARCHAR(500) NOT NULL DEFAULT "",
            approved_sku VARCHAR(12) NOT NULL DEFAULT "",
            decided_by VARCHAR(160) NOT NULL DEFAULT "",
            created_at DATETIME NOT NULL,
            decided_at DATETIME NULL DEFAULT NULL,
            KEY idx_sku_requests_status_created (status, created_at),
            KEY idx_sku_requests_requester (requester_username, created_at),
            CONSTRAINT fk_sku_requests_brand FOREIGN KEY (brand_id) REFERENCES sku_brands(id) ON DELETE RESTRICT,
            CONSTRAINT fk_sku_requests_unit FOREIGN KEY (unit_id) REFERENCES sku_units(id) ON DELETE RESTRICT,
            CONSTRAINT fk_sku_requests_flavor FOREIGN KEY (flavor_id) REFERENCES sku_flavors(id) ON DELETE RESTRICT,
            CONSTRAINT fk_sku_requests_product FOREIGN KEY (product_id) REFERENCES sku_products(id) ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS sku_skus (
            sku VARCHAR(12) NOT NULL PRIMARY KEY,
            tag VARCHAR(50) NOT NULL,
            brand_id VARCHAR(140) NOT NULL,
            unit_id VARCHAR(140) NOT NULL,
            volume DECIMAL(4,1) NOT NULL,
            flavor_id VARCHAR(180) NOT NULL,
            product_id VARCHAR(180) NOT NULL,
            starting_stock INT UNSIGNED NOT NULL,
            current_stock INT UNSIGNED NOT NULL,
            stock_trigger INT UNSIGNED NOT NULL,
            inventory_mode VARCHAR(32) NOT NULL DEFAULT "auto",
            cogs DECIMAL(12,2) NOT NULL,
            approval_request_id BIGINT UNSIGNED NULL DEFAULT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            UNIQUE KEY uniq_sku_tag (tag),
            KEY idx_sku_brand_id (brand_id),
            KEY idx_sku_unit_id (unit_id),
            KEY idx_sku_flavor_id (flavor_id),
            KEY idx_sku_product_id (product_id),
            CONSTRAINT fk_sku_skus_brand FOREIGN KEY (brand_id) REFERENCES sku_brands(id) ON DELETE RESTRICT,
            CONSTRAINT fk_sku_skus_unit FOREIGN KEY (unit_id) REFERENCES sku_units(id) ON DELETE RESTRICT,
            CONSTRAINT fk_sku_skus_flavor FOREIGN KEY (flavor_id) REFERENCES sku_flavors(id) ON DELETE RESTRICT,
            CONSTRAINT fk_sku_skus_product FOREIGN KEY (product_id) REFERENCES sku_products(id) ON DELETE RESTRICT,
            CONSTRAINT fk_sku_skus_request FOREIGN KEY (approval_request_id) REFERENCES sku_requests(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS sku_cogs_history (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            sku VARCHAR(12) NOT NULL,
            old_price DECIMAL(12,2) NULL DEFAULT NULL,
            new_price DECIMAL(12,2) NOT NULL,
            takes_place VARCHAR(120) NOT NULL,
            application_type VARCHAR(32) NOT NULL DEFAULT "next_purchase",
            start_date DATE NULL DEFAULT NULL,
            end_date DATE NULL DEFAULT NULL,
            until_next_change TINYINT(1) NOT NULL DEFAULT 0,
            batch_number VARCHAR(80) NOT NULL DEFAULT "",
            recorded_at DATETIME NOT NULL,
            KEY idx_sku_cogs_history_sku (sku, recorded_at),
            CONSTRAINT fk_sku_cogs_history_sku FOREIGN KEY (sku) REFERENCES sku_skus(sku) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS sku_inventory_batches (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            sku VARCHAR(12) NOT NULL,
            batch_number VARCHAR(80) NOT NULL,
            starting_units INT UNSIGNED NOT NULL,
            current_units INT UNSIGNED NOT NULL,
            batch_cogs DECIMAL(12,2) NOT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            UNIQUE KEY uniq_sku_inventory_batch (sku, batch_number),
            KEY idx_sku_inventory_batches_sku (sku, updated_at),
            CONSTRAINT fk_sku_inventory_batches_sku FOREIGN KEY (sku) REFERENCES sku_skus(sku) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    ];

    foreach ($statements as $sql) {
        $pdo->exec($sql);
    }

    if (jg_sku_table_exists($pdo, 'sku_cogs_history')) {
        if (!jg_sku_column_exists($pdo, 'sku_cogs_history', 'application_type')) {
            $pdo->exec('ALTER TABLE sku_cogs_history ADD COLUMN application_type VARCHAR(32) NOT NULL DEFAULT "next_purchase" AFTER takes_place');
        }

        if (!jg_sku_column_exists($pdo, 'sku_cogs_history', 'start_date')) {
            $pdo->exec('ALTER TABLE sku_cogs_history ADD COLUMN start_date DATE NULL DEFAULT NULL AFTER application_type');
        }

        if (!jg_sku_column_exists($pdo, 'sku_cogs_history', 'end_date')) {
            $pdo->exec('ALTER TABLE sku_cogs_history ADD COLUMN end_date DATE NULL DEFAULT NULL AFTER start_date');
        }

        if (!jg_sku_column_exists($pdo, 'sku_cogs_history', 'until_next_change')) {
            $pdo->exec('ALTER TABLE sku_cogs_history ADD COLUMN until_next_change TINYINT(1) NOT NULL DEFAULT 0 AFTER end_date');
        }

        if (!jg_sku_column_exists($pdo, 'sku_cogs_history', 'batch_number')) {
            $pdo->exec('ALTER TABLE sku_cogs_history ADD COLUMN batch_number VARCHAR(80) NOT NULL DEFAULT "" AFTER until_next_change');
        }
    }

    if (jg_sku_table_exists($pdo, 'sku_inventory_batches') && !jg_sku_index_exists($pdo, 'sku_inventory_batches', 'uniq_sku_inventory_batch')) {
        $pdo->exec('ALTER TABLE sku_inventory_batches ADD UNIQUE KEY uniq_sku_inventory_batch (sku, batch_number)');
    }

    $now = gmdate('Y-m-d H:i:s');
    $stmt = $pdo->prepare(
        'INSERT INTO sku_meta (meta_key, meta_value, updated_at)
         VALUES ("version", "1.00.00", :updated_at)
         ON DUPLICATE KEY UPDATE meta_key = meta_key'
    );
    $stmt->execute([':updated_at' => $now]);
}

function jg_sku_now(): string
{
    return gmdate('Y-m-d H:i:s');
}
