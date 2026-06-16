<?php
declare(strict_types=1);

require_once __DIR__ . '/analytics-bootstrap.php';

function jg_profit_loss_ensure_schema(PDO $pdo): void
{
    $statements = [
        'CREATE TABLE IF NOT EXISTS profit_loss_sku_inputs (
            year SMALLINT UNSIGNED NOT NULL,
            month TINYINT UNSIGNED NOT NULL,
            sku VARCHAR(160) NOT NULL,
            cogs_override DECIMAL(16,2) NULL DEFAULT NULL,
            packaging_per_unit DECIMAL(16,2) NOT NULL DEFAULT 0,
            labor_per_unit DECIMAL(16,2) NOT NULL DEFAULT 0,
            other_per_unit DECIMAL(16,2) NOT NULL DEFAULT 0,
            notes VARCHAR(500) NOT NULL DEFAULT "",
            updated_at DATETIME(6) NOT NULL,
            PRIMARY KEY (year, month, sku),
            KEY idx_profit_loss_sku_year (year, sku)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS profit_loss_entries (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            year SMALLINT UNSIGNED NOT NULL,
            month TINYINT UNSIGNED NOT NULL,
            section VARCHAR(24) NOT NULL,
            label VARCHAR(120) NOT NULL,
            amount DECIMAL(18,2) NOT NULL DEFAULT 0,
            notes VARCHAR(500) NOT NULL DEFAULT "",
            created_at DATETIME(6) NOT NULL,
            updated_at DATETIME(6) NOT NULL,
            KEY idx_profit_loss_entries_period (year, month, section)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS profit_loss_settings (
            year SMALLINT UNSIGNED NOT NULL PRIMARY KEY,
            reinvest_pct DECIMAL(7,4) NOT NULL DEFAULT 25,
            offering_pct DECIMAL(7,4) NOT NULL DEFAULT 10,
            ownership_pct DECIMAL(7,4) NOT NULL DEFAULT 65,
            director_pct DECIMAL(7,4) NOT NULL DEFAULT 30,
            bng_loan_pct DECIMAL(7,4) NOT NULL DEFAULT 50,
            commissioner_pct DECIMAL(7,4) NOT NULL DEFAULT 25,
            advisor_pct DECIMAL(7,4) NOT NULL DEFAULT 25,
            updated_at DATETIME(6) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS profit_loss_syrup_groups (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            label VARCHAR(80) NOT NULL,
            volume_ml DECIMAL(8,1) NULL DEFAULT NULL,
            assignment_mode VARCHAR(16) NOT NULL DEFAULT "auto",
            sku_codes_json LONGTEXT NOT NULL,
            is_visible TINYINT(1) NOT NULL DEFAULT 1,
            sort_order INT NOT NULL DEFAULT 0,
            created_at DATETIME(6) NOT NULL,
            updated_at DATETIME(6) NOT NULL,
            KEY idx_profit_loss_syrup_groups_visible (is_visible, sort_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS profit_loss_product_cards (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            card_key VARCHAR(120) NOT NULL,
            label VARCHAR(120) NOT NULL,
            match_mode VARCHAR(24) NOT NULL DEFAULT "auto_product",
            match_value VARCHAR(180) NOT NULL DEFAULT "",
            variant_mode VARCHAR(24) NOT NULL DEFAULT "auto",
            sku_codes_json LONGTEXT NOT NULL,
            is_visible TINYINT(1) NOT NULL DEFAULT 1,
            sort_order INT NOT NULL DEFAULT 0,
            created_at DATETIME(6) NOT NULL,
            updated_at DATETIME(6) NOT NULL,
            UNIQUE KEY uniq_profit_loss_product_card_key (card_key),
            KEY idx_profit_loss_product_cards_visible (is_visible, sort_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS profit_loss_statement_metrics (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            metric_key VARCHAR(64) NOT NULL,
            label VARCHAR(120) NOT NULL,
            value_key VARCHAR(64) NOT NULL,
            display_format VARCHAR(16) NOT NULL DEFAULT "money",
            is_visible TINYINT(1) NOT NULL DEFAULT 1,
            sort_order INT NOT NULL DEFAULT 0,
            created_at DATETIME(6) NOT NULL,
            updated_at DATETIME(6) NOT NULL,
            UNIQUE KEY uniq_profit_loss_metric_key (metric_key),
            KEY idx_profit_loss_statement_metrics_visible (is_visible, sort_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    ];

    foreach ($statements as $sql) {
        if (!analyticsTryExec($pdo, $sql)) {
            throw new RuntimeException('Unable to prepare Profit and Loss storage.');
        }
    }

    jg_profit_loss_seed_syrup_groups($pdo);
    jg_profit_loss_seed_statement_metrics($pdo);
}

function jg_profit_loss_seed_syrup_groups(PDO $pdo): void
{
    $count = (int) $pdo->query('SELECT COUNT(*) FROM profit_loss_syrup_groups')->fetchColumn();
    if ($count > 0) {
        return;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO profit_loss_syrup_groups
            (label, volume_ml, assignment_mode, sku_codes_json, is_visible, sort_order, created_at, updated_at)
         VALUES
            (:label, :volume_ml, "auto", "[]", 1, :sort_order, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))'
    );
    foreach ([
        ['50 ML - SAMPLE', 50.0],
        ['250 ML', 250.0],
        ['550 ML', 550.0],
    ] as $index => [$label, $volume]) {
        $stmt->execute([
            ':label' => $label,
            ':volume_ml' => $volume,
            ':sort_order' => ($index + 1) * 10,
        ]);
    }
}

function jg_profit_loss_default_statement_metric_rows(): array
{
    return [
        ['units', 'Units sold', 'units', 'integer'],
        ['gross_revenue', 'Gross revenue', 'grossRevenue', 'money'],
        ['marketplace_fees', 'Marketplace fees', 'marketplaceFees', 'money'],
        ['other_income', 'Other income', 'income', 'money'],
        ['revenue', 'Net revenue + other income', 'revenue', 'money'],
        ['average_price', 'Average selling price', 'averagePrice', 'money'],
        ['cogs', 'COGS', 'cogs', 'money'],
        ['average_cogs', 'Average COGS / unit', 'averageCogs', 'money'],
        ['gross_profit', 'Gross profit', 'grossProfit', 'money'],
        ['gross_profit_per_unit', 'Gross profit / unit', 'grossProfitPerUnit', 'money'],
        ['gross_margin', 'Gross margin', 'grossMargin', 'percent'],
        ['administration', 'Administration', 'administration', 'money'],
        ['administration_per_unit', 'Administration / unit', 'administrationPerUnit', 'money'],
        ['administration_rate', 'Administration %', 'administrationRate', 'percent'],
        ['marketing', 'Marketing', 'marketing', 'money'],
        ['marketing_per_unit', 'Marketing / unit', 'marketingPerUnit', 'money'],
        ['marketing_rate', 'Marketing %', 'marketingRate', 'percent'],
        ['other_expenses', 'Other expenses', 'other', 'money'],
        ['net_profit', 'Net profit (loss)', 'netProfit', 'money'],
        ['net_profit_per_unit', 'Net profit / unit', 'netProfitPerUnit', 'money'],
        ['net_margin', 'Net margin', 'netMargin', 'percent'],
    ];
}

function jg_profit_loss_seed_statement_metrics(PDO $pdo): void
{
    $count = (int) $pdo->query('SELECT COUNT(*) FROM profit_loss_statement_metrics')->fetchColumn();
    if ($count > 0) {
        return;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO profit_loss_statement_metrics
            (metric_key, label, value_key, display_format, is_visible, sort_order, created_at, updated_at)
         VALUES
            (:metric_key, :label, :value_key, :display_format, 1, :sort_order, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))'
    );
    foreach (jg_profit_loss_default_statement_metric_rows() as $index => [$key, $label, $valueKey, $format]) {
        $stmt->execute([
            ':metric_key' => $key,
            ':label' => $label,
            ':value_key' => $valueKey,
            ':display_format' => $format,
            ':sort_order' => ($index + 1) * 10,
        ]);
    }
}

function jg_profit_loss_default_entries(): array
{
    return [
        'administration' => [
            'Employee Salary', 'Employee Bonus', 'Rent', 'Insurance', 'Loan Expenses',
            'Internet', 'Office Supplies', 'Cleaning', 'Repairs', 'Legal/Tax',
            'Transport/Fuel', 'Shipping In', 'Electricity', 'Other Expenses',
            'Water Bills', 'Packing Materials',
        ],
        'marketing' => [
            'Base Salary Marketing', 'Referral Commission', 'Advertising', 'Ads Tax',
            'Live', 'Free Product Affiliate', 'Free Product General', 'Shipping Out',
            'Marketing Bonus', 'Merchandise',
        ],
        'income' => [
            'Endorsement', 'Facebook Monetization', 'Instagram Monetization',
            'YouTube Monetization', 'TikTok Monetization',
        ],
    ];
}

function jg_profit_loss_settings(PDO $pdo, int $year): array
{
    $stmt = $pdo->prepare(
        'SELECT reinvest_pct, offering_pct, ownership_pct, director_pct,
                bng_loan_pct, commissioner_pct, advisor_pct, updated_at
         FROM profit_loss_settings WHERE year = :year LIMIT 1'
    );
    $stmt->execute([':year' => $year]);
    $row = $stmt->fetch();

    return [
        'reinvest_pct' => (float) ($row['reinvest_pct'] ?? 25),
        'offering_pct' => (float) ($row['offering_pct'] ?? 10),
        'ownership_pct' => (float) ($row['ownership_pct'] ?? 65),
        'director_pct' => (float) ($row['director_pct'] ?? 30),
        'bng_loan_pct' => (float) ($row['bng_loan_pct'] ?? 50),
        'commissioner_pct' => (float) ($row['commissioner_pct'] ?? 25),
        'advisor_pct' => (float) ($row['advisor_pct'] ?? 25),
        'updated_at' => (string) ($row['updated_at'] ?? ''),
    ];
}

function jg_profit_loss_decode_json_list(mixed $value): array
{
    $decoded = json_decode((string) $value, true);
    if (!is_array($decoded)) {
        return [];
    }

    return array_values(array_filter(array_map(
        static fn (mixed $item): string => strtoupper(trim((string) $item)),
        $decoded
    ), static fn (string $item): bool => $item !== ''));
}

function jg_profit_loss_syrup_groups(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT id, label, volume_ml, assignment_mode, sku_codes_json, is_visible, sort_order, updated_at
         FROM profit_loss_syrup_groups
         ORDER BY sort_order, id'
    );
    $rows = [];
    foreach ($stmt->fetchAll() as $row) {
        $rows[] = [
            'id' => (int) ($row['id'] ?? 0),
            'label' => (string) ($row['label'] ?? ''),
            'volume_ml' => $row['volume_ml'] === null ? null : (float) $row['volume_ml'],
            'assignment_mode' => (string) ($row['assignment_mode'] ?? 'auto') === 'manual' ? 'manual' : 'auto',
            'sku_codes' => jg_profit_loss_decode_json_list($row['sku_codes_json'] ?? '[]'),
            'is_visible' => (bool) (int) ($row['is_visible'] ?? 1),
            'sort_order' => (int) ($row['sort_order'] ?? 0),
            'updated_at' => (string) ($row['updated_at'] ?? ''),
        ];
    }
    return $rows;
}

function jg_profit_loss_product_cards(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT id, card_key, label, match_mode, match_value, variant_mode,
                sku_codes_json, is_visible, sort_order, updated_at
         FROM profit_loss_product_cards
         ORDER BY sort_order, id'
    );
    $rows = [];
    foreach ($stmt->fetchAll() as $row) {
        $matchMode = (string) ($row['match_mode'] ?? 'auto_product');
        if (!in_array($matchMode, ['auto_syrup', 'auto_product', 'auto_product_flavor', 'manual', 'legacy'], true)) {
            $matchMode = 'auto_product';
        }
        $variantMode = (string) ($row['variant_mode'] ?? 'auto');
        if (!in_array($variantMode, ['auto', 'volume', 'flavor', 'sku'], true)) {
            $variantMode = 'auto';
        }
        $rows[] = [
            'id' => (int) ($row['id'] ?? 0),
            'card_key' => (string) ($row['card_key'] ?? ''),
            'label' => (string) ($row['label'] ?? ''),
            'match_mode' => $matchMode,
            'match_value' => (string) ($row['match_value'] ?? ''),
            'variant_mode' => $variantMode,
            'sku_codes' => jg_profit_loss_decode_json_list($row['sku_codes_json'] ?? '[]'),
            'is_visible' => (bool) (int) ($row['is_visible'] ?? 1),
            'sort_order' => (int) ($row['sort_order'] ?? 0),
            'updated_at' => (string) ($row['updated_at'] ?? ''),
        ];
    }
    return $rows;
}

function jg_profit_loss_statement_metrics(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT id, metric_key, label, value_key, display_format, is_visible, sort_order, updated_at
         FROM profit_loss_statement_metrics
         ORDER BY sort_order, id'
    );
    $rows = [];
    foreach ($stmt->fetchAll() as $row) {
        $rows[] = [
            'id' => (int) ($row['id'] ?? 0),
            'metric_key' => (string) ($row['metric_key'] ?? ''),
            'label' => (string) ($row['label'] ?? ''),
            'value_key' => (string) ($row['value_key'] ?? ''),
            'display_format' => (string) ($row['display_format'] ?? 'money'),
            'is_visible' => (bool) (int) ($row['is_visible'] ?? 1),
            'sort_order' => (int) ($row['sort_order'] ?? 0),
            'updated_at' => (string) ($row['updated_at'] ?? ''),
        ];
    }
    return $rows;
}

function jg_profit_loss_legacy_year(int $year): array
{
    static $legacy = null;

    if ($legacy === null) {
        $path = __DIR__ . '/data/profit-loss-legacy.json';
        if (!is_file($path)) {
            $legacy = [];
        } else {
            $decoded = json_decode((string) file_get_contents($path), true);
            $legacy = is_array($decoded) ? $decoded : [];
        }
    }

    $years = is_array($legacy['years'] ?? null) ? $legacy['years'] : [];
    $data = $years[(string) $year] ?? [];
    return is_array($data) ? $data : [];
}

function jg_profit_loss_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
