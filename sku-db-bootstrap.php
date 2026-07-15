<?php
declare(strict_types=1);

require_once __DIR__ . '/sku-auth.php';
require_once __DIR__ . '/astra-stock-bootstrap.php';

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
    jg_sku_sync_current_cogs($pdo);

    return $pdo;
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
            astra DECIMAL(6,2) NOT NULL,
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
            astra DECIMAL(6,2) NOT NULL,
            flavor_id VARCHAR(180) NOT NULL,
            product_id VARCHAR(180) NOT NULL,
            starting_stock INT UNSIGNED NOT NULL,
            current_stock INT UNSIGNED NOT NULL,
            stock_trigger INT UNSIGNED NOT NULL,
            inventory_mode VARCHAR(32) NOT NULL DEFAULT "auto",
            skip_scan TINYINT(1) NOT NULL DEFAULT 0,
            cogs DECIMAL(12,2) NOT NULL,
            sale_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
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
            change_mode VARCHAR(24) NOT NULL DEFAULT "legacy",
            effective_at DATETIME NULL DEFAULT NULL,
            recorded_at DATETIME NOT NULL,
            KEY idx_sku_cogs_history_sku (sku, recorded_at),
            CONSTRAINT fk_sku_cogs_history_sku FOREIGN KEY (sku) REFERENCES sku_skus(sku) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    ];

    foreach ($statements as $sql) {
        $pdo->exec($sql);
    }

    jg_sku_ensure_column($pdo, 'sku_requests', 'astra', 'DECIMAL(6,2) NOT NULL DEFAULT 0.00 AFTER volume');
    jg_sku_ensure_column($pdo, 'sku_skus', 'astra', 'DECIMAL(6,2) NOT NULL DEFAULT 0.00 AFTER volume');
    jg_sku_ensure_column($pdo, 'sku_skus', 'skip_scan', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER inventory_mode');
    jg_sku_ensure_column($pdo, 'sku_skus', 'sale_price', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER cogs');
    jg_sku_ensure_column($pdo, 'sku_cogs_history', 'change_mode', 'VARCHAR(24) NOT NULL DEFAULT "legacy" AFTER takes_place');
    jg_sku_ensure_column($pdo, 'sku_cogs_history', 'effective_at', 'DATETIME NULL DEFAULT NULL AFTER change_mode');
    $pdo->exec('UPDATE sku_requests SET astra = volume WHERE astra <= 0');
    $pdo->exec('UPDATE sku_skus SET astra = volume WHERE astra <= 0');
    $pdo->exec('UPDATE sku_cogs_history SET effective_at = recorded_at WHERE effective_at IS NULL AND change_mode = "legacy"');

    $now = gmdate('Y-m-d H:i:s');
    $stmt = $pdo->prepare(
        'INSERT INTO sku_meta (meta_key, meta_value, updated_at)
         VALUES ("version", "1.00.00", :updated_at)
         ON DUPLICATE KEY UPDATE meta_key = meta_key'
    );
    $stmt->execute([':updated_at' => $now]);
}

function jg_sku_ensure_column(PDO $pdo, string $tableName, string $columnName, string $definition): void
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*)
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :table_name
           AND COLUMN_NAME = :column_name'
    );
    $stmt->execute([
        ':table_name' => $tableName,
        ':column_name' => $columnName,
    ]);

    if ((int) $stmt->fetchColumn() === 0) {
        $pdo->exec(sprintf('ALTER TABLE `%s` ADD COLUMN `%s` %s', $tableName, $columnName, $definition));
    }
}

function jg_sku_now(): string
{
    return gmdate('Y-m-d H:i:s');
}

function jg_sku_business_timezone(): DateTimeZone
{
    static $timezone = null;
    if (!$timezone instanceof DateTimeZone) {
        $timezone = new DateTimeZone('Asia/Jakarta');
    }
    return $timezone;
}

function jg_sku_next_quarter_start(?DateTimeImmutable $now = null): string
{
    $localNow = ($now ?? new DateTimeImmutable('now', jg_sku_business_timezone()))
        ->setTimezone(jg_sku_business_timezone());
    $month = (int) $localNow->format('n');
    $nextMonth = ((int) floor(($month - 1) / 3) + 1) * 3 + 1;
    $year = (int) $localNow->format('Y');
    if ($nextMonth > 12) {
        $nextMonth = 1;
        $year++;
    }
    return sprintf('%04d-%02d-01 00:00:00', $year, $nextMonth);
}

function jg_sku_quarter_label(string $dateTime): string
{
    $timestamp = DateTimeImmutable::createFromFormat('!Y-m-d H:i:s', $dateTime, jg_sku_business_timezone());
    if (!$timestamp) {
        return '';
    }
    $quarter = (int) floor(((int) $timestamp->format('n') - 1) / 3) + 1;
    return sprintf('Q%d %s', $quarter, $timestamp->format('Y'));
}

function jg_sku_cogs_change_mode_allowed(string $changeMode, string $role): bool
{
    $mode = strtolower(trim($changeMode));
    if ($mode === 'quarterly') {
        return in_array($role, ['requester', 'branch'], true);
    }
    return $mode === 'retroactive' && $role === 'branch';
}

/** @param array<int, array<string, mixed>> $history */
function jg_sku_cogs_at(array $history, string $targetAt, float $fallback = 0.0): float
{
    usort($history, static function (array $left, array $right): int {
        $recordedCompare = strcmp((string) ($left['recorded_at'] ?? ''), (string) ($right['recorded_at'] ?? ''));
        return $recordedCompare !== 0 ? $recordedCompare : (int) ($left['id'] ?? 0) <=> (int) ($right['id'] ?? 0);
    });
    $baseline = null;
    $datedChanges = [];
    foreach ($history as $change) {
        $mode = strtolower(trim((string) ($change['change_mode'] ?? 'legacy')));
        $newPrice = max(0.0, (float) ($change['new_price'] ?? 0));
        if ($mode === 'audit') {
            continue;
        }
        if ($mode === 'retroactive') {
            $baseline = $newPrice;
            $datedChanges = [];
            continue;
        }
        if ($mode === 'opening') {
            if ($baseline === null) {
                $baseline = $newPrice;
            }
            continue;
        }
        if ($baseline === null && array_key_exists('old_price', $change) && $change['old_price'] !== null) {
            $baseline = max(0.0, (float) $change['old_price']);
        }
        $effectiveAt = trim((string) ($change['effective_at'] ?? '')) ?: trim((string) ($change['recorded_at'] ?? ''));
        if ($effectiveAt !== '') {
            $datedChanges[] = ['effective_at' => $effectiveAt, 'new_price' => $newPrice, 'id' => (int) ($change['id'] ?? 0)];
        }
    }
    $resolved = $baseline ?? max(0.0, $fallback);
    usort($datedChanges, static function (array $left, array $right): int {
        $effectiveCompare = strcmp((string) $left['effective_at'], (string) $right['effective_at']);
        return $effectiveCompare !== 0 ? $effectiveCompare : (int) $left['id'] <=> (int) $right['id'];
    });
    foreach ($datedChanges as $change) {
        if (strcmp((string) $change['effective_at'], $targetAt) <= 0) {
            $resolved = (float) $change['new_price'];
        }
    }
    return round($resolved, 2);
}

function jg_sku_sync_current_cogs(PDO $pdo): void
{
    $skuRows = $pdo->query(
        'SELECT sku, brand_id, unit_id, product_id, flavor_id, volume, astra, current_stock, cogs
         FROM sku_skus'
    )->fetchAll();
    if ($skuRows === []) {
        return;
    }
    $historyBySku = [];
    $historyRows = $pdo->query(
        'SELECT id, sku, old_price, new_price, change_mode, effective_at, recorded_at
         FROM sku_cogs_history ORDER BY recorded_at, id'
    )->fetchAll();
    foreach ($historyRows as $row) {
        $historyBySku[(string) ($row['sku'] ?? '')][] = $row;
    }
    $rowsBySku = [];
    foreach ($skuRows as $row) {
        $rowSku = (string) ($row['sku'] ?? '');
        if ($rowSku !== '') {
            $rowsBySku[$rowSku] = $row;
        }
    }
    $stockMap = jg_astra_stock_map(array_values(array_filter($skuRows, 'is_array')));
    $targetAt = (new DateTimeImmutable('now', jg_sku_business_timezone()))->format('Y-m-d H:i:s');
    $update = $pdo->prepare('UPDATE sku_skus SET cogs = :cogs, updated_at = :updated_at WHERE sku = :sku');
    foreach ($skuRows as $row) {
        $sku = (string) ($row['sku'] ?? '');
        $stored = (float) ($row['cogs'] ?? 0);
        $stockTarget = $stockMap[$sku] ?? [
            'stock_sku' => $sku,
            'stock_ratio' => 1.0,
            'stock_row' => $row,
        ];
        $baseSku = (string) ($stockTarget['stock_sku'] ?? $sku);
        $baseRow = $rowsBySku[$baseSku] ?? $row;
        $baseStored = (float) ($baseRow['cogs'] ?? $stored);
        $baseResolved = jg_sku_cogs_at($historyBySku[$baseSku] ?? [], $targetAt, $baseStored);
        $resolved = round($baseResolved * (float) ($stockTarget['stock_ratio'] ?? 1.0), 2);
        if (abs($resolved - $stored) < 0.005) {
            continue;
        }
        $update->execute([':cogs' => number_format($resolved, 2, '.', ''), ':updated_at' => jg_sku_now(), ':sku' => $sku]);
    }
}
