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
    ];

    foreach ($statements as $sql) {
        if (!analyticsTryExec($pdo, $sql)) {
            throw new RuntimeException('Unable to prepare Profit and Loss storage.');
        }
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

function jg_profit_loss_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
