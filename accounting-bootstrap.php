<?php
declare(strict_types=1);

require_once __DIR__ . '/analytics-bootstrap.php';

function jg_accounting_now(): DateTimeImmutable
{
    return new DateTimeImmutable('now', new DateTimeZone('Asia/Jakarta'));
}

function jg_accounting_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function jg_accounting_error(string $message, int $status = 422, ?string $field = null): void
{
    $error = ['message' => $message];
    if ($field !== null && $field !== '') {
        $error['field'] = $field;
    }
    jg_accounting_json([
        'ok' => false,
        'error' => $message,
        'errors' => [$error],
    ], $status);
}

function jg_accounting_body(): array
{
    $raw = file_get_contents('php://input');
    $decoded = json_decode(is_string($raw) ? $raw : '', true);
    if (is_array($decoded)) {
        return $decoded;
    }
    return $_POST;
}

function jg_accounting_text(mixed $value, int $max = 160): string
{
    $text = trim(preg_replace('/\s+/', ' ', (string) $value) ?? '');
    return mb_substr($text, 0, $max);
}

function jg_accounting_long_text(mixed $value, int $max = 2000): string
{
    return mb_substr(trim((string) $value), 0, $max);
}

function jg_accounting_bool(mixed $value): bool
{
    return in_array(strtolower(trim((string) $value)), ['1', 'true', 'yes', 'on'], true);
}

function jg_accounting_amount(mixed $value, string $field = 'amount'): int
{
    if (is_int($value)) {
        $amount = $value;
    } elseif (is_float($value)) {
        $amount = (int) round($value);
    } else {
        $raw = trim((string) $value);
        if ($raw === '') {
            jg_accounting_error('Amount is required.', 422, $field);
        }
        $negative = str_starts_with($raw, '-');
        $digits = preg_replace('/[^0-9]/', '', $raw) ?? '';
        if ($digits === '') {
            jg_accounting_error('Amount is required.', 422, $field);
        }
        $amount = (int) $digits;
        if ($negative) {
            $amount *= -1;
        }
    }
    if ($amount <= 0) {
        jg_accounting_error('Amount must be positive.', 422, $field);
    }
    return $amount;
}

function jg_accounting_optional_amount(mixed $value): int
{
    $raw = trim((string) $value);
    if ($value === null || $raw === '' || (int) preg_replace('/[^0-9]/', '', $raw) === 0) {
        return 0;
    }
    return jg_accounting_amount($value);
}

function jg_accounting_date(mixed $value, string $field, ?string $default = null): string
{
    $date = trim((string) ($value ?? ''));
    if ($date === '' && $default !== null) {
        $date = $default;
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        jg_accounting_error('Invalid date.', 422, $field);
    }
    $dt = DateTimeImmutable::createFromFormat('!Y-m-d', $date, new DateTimeZone('Asia/Jakarta'));
    if (!$dt || $dt->format('Y-m-d') !== $date) {
        jg_accounting_error('Invalid date.', 422, $field);
    }
    return $date;
}

function jg_accounting_month(mixed $value = null): string
{
    $month = trim((string) ($value ?? ''));
    if ($month === '') {
        return jg_accounting_now()->format('Y-m');
    }
    if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
        jg_accounting_error('Invalid month.', 422, 'month');
    }
    $year = (int) substr($month, 0, 4);
    $monthNumber = (int) substr($month, 5, 2);
    if ($year < 2024 || $year > 2100 || $monthNumber < 1 || $monthNumber > 12) {
        jg_accounting_error('Invalid month.', 422, 'month');
    }
    return $month;
}

function jg_accounting_business_month(string $date): string
{
    return substr($date, 0, 7);
}

function jg_accounting_key(string $prefix): string
{
    return $prefix . '-' . jg_accounting_now()->format('YmdHis') . '-' . bin2hex(random_bytes(4));
}

function jg_accounting_status_from_bill(string $dueDate, int $outstanding, bool $isDraft = false): string
{
    if ($outstanding <= 0) {
        return 'paid';
    }
    if ($isDraft) {
        return 'draft';
    }
    if ($dueDate !== '' && $dueDate < jg_accounting_now()->format('Y-m-d')) {
        return 'overdue';
    }
    return 'unpaid';
}

function jg_accounting_ensure_schema(PDO $pdo): void
{
    $statements = [
        'CREATE TABLE IF NOT EXISTS accounting_migrations (
            version VARCHAR(80) NOT NULL PRIMARY KEY,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS accounting_accounts (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            account_key VARCHAR(80) UNIQUE NOT NULL,
            name VARCHAR(160) NOT NULL,
            type ENUM("bank","cash","ewallet","marketplace_wallet","receivable","payable","owner_equity","other") NOT NULL,
            platform VARCHAR(40) NULL,
            brand VARCHAR(80) NULL,
            currency CHAR(3) NOT NULL DEFAULT "IDR",
            opening_balance BIGINT NOT NULL DEFAULT 0,
            current_balance_manual BIGINT NULL,
            is_spendable TINYINT(1) NOT NULL DEFAULT 1,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            sort_order INT NOT NULL DEFAULT 100,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_accounting_accounts_active (is_active, sort_order),
            KEY idx_accounting_accounts_type (type, is_spendable)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS accounting_categories (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            category_key VARCHAR(80) UNIQUE NOT NULL,
            parent_id BIGINT UNSIGNED NULL,
            name VARCHAR(160) NOT NULL,
            type ENUM("income","expense","cogs_support","marketing","operations","payroll","asset","transfer","owner","tax","adjustment","other") NOT NULL,
            requires_receipt TINYINT(1) NOT NULL DEFAULT 0,
            is_billable TINYINT(1) NOT NULL DEFAULT 1,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            sort_order INT NOT NULL DEFAULT 100,
            KEY idx_accounting_categories_parent (parent_id),
            KEY idx_accounting_categories_active (is_active, sort_order),
            KEY idx_accounting_categories_type (type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS accounting_counterparties (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            counterparty_key VARCHAR(100) UNIQUE NULL,
            name VARCHAR(200) NOT NULL,
            type ENUM("supplier","customer","marketplace","employee","owner","partner","ads_platform","utility","bank","other") NOT NULL,
            phone VARCHAR(60) NULL,
            email VARCHAR(160) NULL,
            address TEXT NULL,
            tax_id VARCHAR(80) NULL,
            notes TEXT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_accounting_counterparties_active (is_active, name),
            KEY idx_accounting_counterparties_type (type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS accounting_bills (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            bill_key VARCHAR(100) UNIQUE NOT NULL,
            bill_no VARCHAR(120) NULL,
            vendor_id BIGINT UNSIGNED NOT NULL,
            issue_date DATE NOT NULL,
            due_date DATE NULL,
            business_month CHAR(7) NOT NULL,
            category_id BIGINT UNSIGNED NULL,
            brand VARCHAR(80) NULL,
            channel VARCHAR(80) NULL,
            total_amount BIGINT NOT NULL,
            paid_amount BIGINT NOT NULL DEFAULT 0,
            outstanding_amount BIGINT NOT NULL,
            status ENUM("draft","unpaid","partially_paid","paid","overdue","void") NOT NULL DEFAULT "unpaid",
            expected_account_id BIGINT UNSIGNED NULL,
            attachment_url TEXT NULL,
            receipt_status ENUM("missing","attached","not_required") NOT NULL DEFAULT "missing",
            notes TEXT NULL,
            created_by BIGINT UNSIGNED NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
            voided_at DATETIME NULL,
            void_reason TEXT NULL,
            KEY idx_accounting_bills_month (business_month),
            KEY idx_accounting_bills_due (due_date),
            KEY idx_accounting_bills_status (status),
            KEY idx_accounting_bills_vendor (vendor_id),
            KEY idx_accounting_bills_category (category_id),
            KEY idx_accounting_bills_brand (brand),
            KEY idx_accounting_bills_channel (channel)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS accounting_transactions (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            transaction_key VARCHAR(100) UNIQUE NOT NULL,
            transaction_date DATE NOT NULL,
            business_month CHAR(7) NOT NULL,
            type ENUM("expense","bill_payment","transfer","manual_income","loan_received","owner_draw","owner_injection","refund","adjustment","opening_balance","void") NOT NULL,
            direction ENUM("money_out","money_in","internal_transfer") NOT NULL,
            status ENUM("draft","posted","pending_review","void") NOT NULL DEFAULT "posted",
            account_id BIGINT UNSIGNED NULL,
            to_account_id BIGINT UNSIGNED NULL,
            counterparty_id BIGINT UNSIGNED NULL,
            category_id BIGINT UNSIGNED NULL,
            bill_id BIGINT UNSIGNED NULL,
            brand VARCHAR(80) NULL,
            channel VARCHAR(80) NULL,
            amount BIGINT NOT NULL,
            transfer_fee_amount BIGINT NOT NULL DEFAULT 0,
            currency CHAR(3) NOT NULL DEFAULT "IDR",
            payment_method VARCHAR(80) NULL,
            reference_no VARCHAR(160) NULL,
            invoice_no VARCHAR(160) NULL,
            order_no VARCHAR(160) NULL,
            receipt_url TEXT NULL,
            receipt_status ENUM("missing","attached","not_required") NOT NULL DEFAULT "missing",
            description TEXT NULL,
            notes TEXT NULL,
            review_status ENUM("clean","needs_review","reviewed") NOT NULL DEFAULT "clean",
            review_reason TEXT NULL,
            created_by BIGINT UNSIGNED NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
            voided_at DATETIME NULL,
            void_reason TEXT NULL,
            KEY idx_accounting_transactions_month (business_month),
            KEY idx_accounting_transactions_date (transaction_date),
            KEY idx_accounting_transactions_type (type),
            KEY idx_accounting_transactions_status (status),
            KEY idx_accounting_transactions_account (account_id),
            KEY idx_accounting_transactions_to_account (to_account_id),
            KEY idx_accounting_transactions_category (category_id),
            KEY idx_accounting_transactions_counterparty (counterparty_id),
            KEY idx_accounting_transactions_bill (bill_id),
            KEY idx_accounting_transactions_brand (brand),
            KEY idx_accounting_transactions_channel (channel),
            KEY idx_accounting_transactions_review (review_status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS accounting_bill_payments (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            bill_id BIGINT UNSIGNED NOT NULL,
            transaction_id BIGINT UNSIGNED NOT NULL,
            payment_date DATE NOT NULL,
            amount BIGINT NOT NULL,
            account_id BIGINT UNSIGNED NOT NULL,
            payment_method VARCHAR(80) NULL,
            reference_no VARCHAR(160) NULL,
            notes TEXT NULL,
            created_by BIGINT UNSIGNED NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_accounting_bill_payments_bill (bill_id),
            KEY idx_accounting_bill_payments_transaction (transaction_id),
            KEY idx_accounting_bill_payments_date (payment_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS accounting_attachments (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            entity_type ENUM("transaction","bill","counterparty") NOT NULL,
            entity_id BIGINT UNSIGNED NOT NULL,
            file_url TEXT NOT NULL,
            file_name VARCHAR(255) NULL,
            mime_type VARCHAR(120) NULL,
            uploaded_by BIGINT UNSIGNED NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_accounting_attachments_entity (entity_type, entity_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS accounting_review_queue (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            entity_type ENUM("transaction","bill") NOT NULL,
            entity_id BIGINT UNSIGNED NOT NULL,
            severity ENUM("info","warning","critical") NOT NULL DEFAULT "warning",
            issue_key VARCHAR(120) NOT NULL,
            issue_message TEXT NOT NULL,
            suggested_action TEXT NULL,
            status ENUM("open","resolved","ignored") NOT NULL DEFAULT "open",
            resolved_by BIGINT UNSIGNED NULL,
            resolved_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_accounting_review_open (entity_type, entity_id, issue_key, status),
            KEY idx_accounting_review_status (status, severity, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        'CREATE TABLE IF NOT EXISTS accounting_audit_log (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            entity_type VARCHAR(80) NOT NULL,
            entity_id BIGINT UNSIGNED NOT NULL,
            action VARCHAR(80) NOT NULL,
            old_value_json JSON NULL,
            new_value_json JSON NULL,
            created_by BIGINT UNSIGNED NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_accounting_audit_entity (entity_type, entity_id, created_at),
            KEY idx_accounting_audit_action (action, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    ];

    foreach ($statements as $sql) {
        if (!analyticsTryExec($pdo, $sql)) {
            throw new RuntimeException('Unable to prepare Accounting storage.');
        }
    }

    $typeMigration = '2026_07_13_accounting_loan_received_v1';
    $typeMigrationStmt = $pdo->prepare('SELECT COUNT(*) FROM accounting_migrations WHERE version = :version');
    $typeMigrationStmt->execute([':version' => $typeMigration]);
    if ((int) $typeMigrationStmt->fetchColumn() === 0) {
        if (!analyticsTryExec($pdo, 'ALTER TABLE accounting_transactions MODIFY COLUMN type ENUM("expense","bill_payment","transfer","manual_income","loan_received","owner_draw","owner_injection","refund","adjustment","opening_balance","void") NOT NULL')) {
            throw new RuntimeException('Unable to update Accounting transaction types.');
        }
        $recordTypeMigration = $pdo->prepare('INSERT IGNORE INTO accounting_migrations (version, applied_at) VALUES (:version, UTC_TIMESTAMP())');
        $recordTypeMigration->execute([':version' => $typeMigration]);
    }

    $stmt = $pdo->prepare('INSERT IGNORE INTO accounting_migrations (version, applied_at) VALUES (:version, UTC_TIMESTAMP())');
    $stmt->execute([':version' => '2026_07_06_accounting_workspace_v1']);

    jg_accounting_seed_accounts($pdo);
    jg_accounting_seed_categories($pdo);
    jg_accounting_seed_counterparties($pdo);
}

function jg_accounting_seed_accounts(PDO $pdo): void
{
    $rows = [
        ['bca-main', 'BCA Main', 'bank', null, null, 1, 10],
        ['cash-office', 'Cash Office', 'cash', null, null, 1, 20],
        ['shopee-jg-wallet', 'Shopee Wallet - Jenang Gemi', 'marketplace_wallet', 'shopee', 'Jenang Gemi', 0, 30],
        ['shopee-zero-wallet', 'Shopee Wallet - ZERO', 'marketplace_wallet', 'shopee', 'ZERO', 0, 40],
        ['tiktok-jg-wallet', 'TikTok Wallet - Jenang Gemi', 'marketplace_wallet', 'tiktok', 'Jenang Gemi', 0, 50],
        ['tiktok-zero-wallet', 'TikTok Wallet - ZERO', 'marketplace_wallet', 'tiktok', 'ZERO', 0, 60],
        ['tokopedia-wallet', 'Tokopedia Wallet', 'marketplace_wallet', 'tokopedia', null, 0, 70],
        ['accounts-payable', 'Accounts Payable', 'payable', null, null, 0, 90],
        ['owner-equity', 'Owner Equity', 'owner_equity', null, null, 0, 100],
    ];

    $stmt = $pdo->prepare(
        'INSERT INTO accounting_accounts
            (account_key, name, type, platform, brand, is_spendable, is_active, sort_order, created_at)
         VALUES
            (:account_key, :name, :type, :platform, :brand, :is_spendable, 1, :sort_order, UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            type = VALUES(type),
            platform = VALUES(platform),
            brand = VALUES(brand),
            is_spendable = VALUES(is_spendable),
            sort_order = VALUES(sort_order)'
    );
    foreach ($rows as [$key, $name, $type, $platform, $brand, $spendable, $sort]) {
        $stmt->execute([
            ':account_key' => $key,
            ':name' => $name,
            ':type' => $type,
            ':platform' => $platform,
            ':brand' => $brand,
            ':is_spendable' => $spendable,
            ':sort_order' => $sort,
        ]);
    }
}

function jg_accounting_seed_categories(PDO $pdo): void
{
    $groups = [
        ['product-cogs-support', 'Product / COGS support', 'cogs_support'],
        ['marketing', 'Marketing', 'marketing'],
        ['operations', 'Operations', 'operations'],
        ['fulfillment', 'Shipping/Fulfillment', 'operations'],
        ['software-admin', 'Software/Admin', 'operations'],
        ['people', 'Payroll/Labor', 'payroll'],
        ['owner-capital', 'Owner/Capital', 'owner'],
        ['tax-legal', 'Tax/Legal', 'tax'],
        ['other', 'Other', 'other'],
    ];

    $insert = $pdo->prepare(
        'INSERT INTO accounting_categories
            (category_key, parent_id, name, type, requires_receipt, is_billable, is_active, sort_order)
         VALUES
            (:category_key, :parent_id, :name, :type, :requires_receipt, :is_billable, 1, :sort_order)
         ON DUPLICATE KEY UPDATE
            parent_id = VALUES(parent_id),
            name = VALUES(name),
            type = VALUES(type),
            requires_receipt = VALUES(requires_receipt),
            is_billable = VALUES(is_billable),
            sort_order = VALUES(sort_order)'
    );

    $groupIds = [];
    foreach ($groups as $index => [$key, $name, $type]) {
        $insert->execute([
            ':category_key' => $key,
            ':parent_id' => null,
            ':name' => $name,
            ':type' => $type,
            ':requires_receipt' => 0,
            ':is_billable' => 1,
            ':sort_order' => ($index + 1) * 100,
        ]);
        $stmt = $pdo->prepare('SELECT id FROM accounting_categories WHERE category_key = :category_key LIMIT 1');
        $stmt->execute([':category_key' => $key]);
        $groupIds[$key] = (int) $stmt->fetchColumn();
    }

    $children = [
        ['marketing', 'meta-ads', 'Meta Ads', 'marketing', 1],
        ['marketing', 'google-ads', 'Google Ads', 'marketing', 1],
        ['marketing', 'shopee-ads', 'Shopee Ads', 'marketing', 1],
        ['marketing', 'tiktok-ads', 'TikTok Ads', 'marketing', 1],
        ['marketing', 'affiliate-influencer', 'Affiliate / Influencer', 'marketing', 1],
        ['marketing', 'giveaway-samples', 'Giveaway / Samples', 'marketing', 1],
        ['marketing', 'content-production', 'Content Production', 'marketing', 1],
        ['product-cogs-support', 'raw-materials', 'Raw Materials', 'cogs_support', 1],
        ['product-cogs-support', 'packaging', 'Packaging', 'cogs_support', 1],
        ['product-cogs-support', 'finished-goods-purchase', 'Finished Goods Purchase', 'cogs_support', 1],
        ['product-cogs-support', 'labels-stickers', 'Labels / Stickers', 'cogs_support', 1],
        ['product-cogs-support', 'production-labor', 'Production Labor', 'payroll', 1],
        ['product-cogs-support', 'product-testing', 'Product Testing', 'cogs_support', 1],
        ['operations', 'rent', 'Rent', 'operations', 1],
        ['operations', 'utilities', 'Utilities', 'operations', 1],
        ['operations', 'internet', 'Internet', 'operations', 1],
        ['operations', 'office-supplies', 'Office Supplies', 'operations', 1],
        ['operations', 'equipment', 'Equipment', 'asset', 1],
        ['operations', 'repairs', 'Repairs', 'operations', 1],
        ['operations', 'fuel-transport', 'Fuel / Transport', 'operations', 1],
        ['fulfillment', 'shipping-supplies', 'Shipping Supplies', 'operations', 1],
        ['fulfillment', 'courier-adjustment', 'Courier Adjustment', 'operations', 1],
        ['fulfillment', 'packing-labor', 'Packing Labor', 'payroll', 1],
        ['fulfillment', 'return-handling', 'Return Handling', 'operations', 1],
        ['software-admin', 'hosting', 'Hosting', 'operations', 1],
        ['software-admin', 'domain', 'Domain', 'operations', 1],
        ['software-admin', 'software-subscription', 'Software Subscription', 'operations', 1],
        ['software-admin', 'bank-fees', 'Bank Fees', 'operations', 0],
        ['software-admin', 'marketplace-admin-fees', 'Marketplace Admin Fees', 'operations', 1],
        ['tax-legal', 'legal-permit-tax-admin', 'Legal / Permit / Tax Admin', 'tax', 1],
        ['people', 'salary', 'Salary', 'payroll', 0],
        ['people', 'bonus', 'Bonus', 'payroll', 0],
        ['people', 'contractor', 'Contractor', 'payroll', 1],
        ['people', 'commission', 'Commission', 'payroll', 1],
        ['owner-capital', 'owner-injection', 'Owner Injection', 'owner', 0],
        ['owner-capital', 'owner-draw', 'Owner Draw', 'owner', 0],
        ['owner-capital', 'loan-received', 'Loan Received', 'owner', 0],
        ['owner-capital', 'loan-payment', 'Loan Payment', 'owner', 1],
        ['other', 'refund-paid', 'Refund Paid', 'expense', 1],
        ['other', 'reimbursement', 'Reimbursement', 'income', 0],
        ['other', 'miscellaneous', 'Miscellaneous', 'other', 1],
        ['other', 'correction-adjustment', 'Correction / Adjustment', 'adjustment', 0],
    ];

    foreach ($children as $index => [$parentKey, $key, $name, $type, $requiresReceipt]) {
        $insert->execute([
            ':category_key' => $key,
            ':parent_id' => $groupIds[$parentKey] ?? null,
            ':name' => $name,
            ':type' => $type,
            ':requires_receipt' => $requiresReceipt,
            ':is_billable' => 1,
            ':sort_order' => ($index + 1) * 10,
        ]);
    }
}

function jg_accounting_seed_counterparties(PDO $pdo): void
{
    $rows = [
        ['packaging-supplier', 'Packaging supplier', 'supplier'],
        ['ingredient-supplier', 'Ingredient supplier', 'supplier'],
        ['meta-ads', 'Meta Ads', 'ads_platform'],
        ['google-ads', 'Google Ads', 'ads_platform'],
        ['shopee-ads', 'Shopee Ads', 'marketplace'],
        ['tiktok-ads', 'TikTok Ads', 'marketplace'],
        ['hostinger', 'Hostinger', 'utility'],
        ['staff', 'Staff', 'employee'],
        ['owner', 'Owner', 'owner'],
        ['production', 'Production', 'supplier'],
        ['expedition-courier', 'Expedition/courier', 'supplier'],
        ['rent', 'Rent', 'utility'],
        ['utilities', 'Utilities', 'utility'],
    ];
    $stmt = $pdo->prepare(
        'INSERT INTO accounting_counterparties (counterparty_key, name, type, is_active, created_at)
         VALUES (:counterparty_key, :name, :type, 1, UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type), is_active = 1'
    );
    foreach ($rows as [$key, $name, $type]) {
        $stmt->execute([
            ':counterparty_key' => $key,
            ':name' => $name,
            ':type' => $type,
        ]);
    }
}

function jg_accounting_update_overdue_bills(PDO $pdo): void
{
    $today = jg_accounting_now()->format('Y-m-d');
    $stmt = $pdo->prepare(
        'UPDATE accounting_bills
         SET status = "overdue"
         WHERE status IN ("unpaid", "partially_paid")
           AND outstanding_amount > 0
           AND due_date IS NOT NULL
           AND due_date < :today'
    );
    $stmt->execute([':today' => $today]);
}

function jg_accounting_get_counterparty(PDO $pdo, mixed $counterpartyId, string $name, string $type = 'supplier'): ?int
{
    $id = (int) $counterpartyId;
    if ($id > 0) {
        $stmt = $pdo->prepare('SELECT id FROM accounting_counterparties WHERE id = :id AND is_active = 1 LIMIT 1');
        $stmt->execute([':id' => $id]);
        $found = $stmt->fetchColumn();
        if ($found !== false) {
            return (int) $found;
        }
    }

    $name = jg_accounting_text($name, 200);
    if ($name === '') {
        return null;
    }

    $stmt = $pdo->prepare('SELECT id FROM accounting_counterparties WHERE LOWER(name) = LOWER(:name) LIMIT 1');
    $stmt->execute([':name' => $name]);
    $existing = $stmt->fetchColumn();
    if ($existing !== false) {
        return (int) $existing;
    }

    $key = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $name) ?? '');
    $key = trim($key, '-') ?: 'counterparty';
    $key .= '-' . bin2hex(random_bytes(3));
    $stmt = $pdo->prepare(
        'INSERT INTO accounting_counterparties (counterparty_key, name, type, is_active, created_at)
         VALUES (:counterparty_key, :name, :type, 1, UTC_TIMESTAMP())'
    );
    $stmt->execute([
        ':counterparty_key' => mb_substr($key, 0, 100),
        ':name' => $name,
        ':type' => in_array($type, ['supplier','customer','marketplace','employee','owner','partner','ads_platform','utility','bank','other'], true) ? $type : 'other',
    ]);
    return (int) $pdo->lastInsertId();
}

function jg_accounting_insert_audit(PDO $pdo, string $entityType, int $entityId, string $action, mixed $oldValue, mixed $newValue): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO accounting_audit_log
            (entity_type, entity_id, action, old_value_json, new_value_json, created_by, created_at)
         VALUES
            (:entity_type, :entity_id, :action, :old_value_json, :new_value_json, NULL, UTC_TIMESTAMP())'
    );
    $stmt->execute([
        ':entity_type' => $entityType,
        ':entity_id' => $entityId,
        ':action' => $action,
        ':old_value_json' => $oldValue === null ? null : json_encode($oldValue, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        ':new_value_json' => $newValue === null ? null : json_encode($newValue, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
    ]);
}

function jg_accounting_add_review(PDO $pdo, string $entityType, int $entityId, string $severity, string $issueKey, string $message, string $suggestedAction = ''): void
{
    $stmt = $pdo->prepare(
        'INSERT IGNORE INTO accounting_review_queue
            (entity_type, entity_id, severity, issue_key, issue_message, suggested_action, status, created_at)
         VALUES
            (:entity_type, :entity_id, :severity, :issue_key, :issue_message, :suggested_action, "open", UTC_TIMESTAMP())'
    );
    $stmt->execute([
        ':entity_type' => $entityType,
        ':entity_id' => $entityId,
        ':severity' => in_array($severity, ['info', 'warning', 'critical'], true) ? $severity : 'warning',
        ':issue_key' => $issueKey,
        ':issue_message' => $message,
        ':suggested_action' => $suggestedAction,
    ]);
}

function jg_accounting_category_requires_receipt(PDO $pdo, ?int $categoryId): bool
{
    if (!$categoryId) {
        return false;
    }
    $stmt = $pdo->prepare('SELECT requires_receipt FROM accounting_categories WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $categoryId]);
    return (int) ($stmt->fetchColumn() ?: 0) === 1;
}

function jg_accounting_mark_transaction_review(PDO $pdo, int $id, string $reason): void
{
    $stmt = $pdo->prepare(
        'UPDATE accounting_transactions
         SET review_status = "needs_review",
             review_reason = CONCAT(COALESCE(NULLIF(review_reason, ""), ""), IF(COALESCE(NULLIF(review_reason, ""), "") = "", "", "; "), :reason)
         WHERE id = :id'
    );
    $stmt->execute([':id' => $id, ':reason' => $reason]);
}

function jg_accounting_review_transaction(PDO $pdo, int $id): void
{
    $stmt = $pdo->prepare(
        'SELECT t.*, c.requires_receipt, cp.name AS counterparty_name
         FROM accounting_transactions t
         LEFT JOIN accounting_categories c ON c.id = t.category_id
         LEFT JOIN accounting_counterparties cp ON cp.id = t.counterparty_id
         WHERE t.id = :id LIMIT 1'
    );
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();
    if (!is_array($row)) {
        return;
    }

    if (empty($row['category_id'])) {
        jg_accounting_mark_transaction_review($pdo, $id, 'Missing category');
        jg_accounting_add_review($pdo, 'transaction', $id, 'warning', 'missing_category', 'Missing category.', 'Choose a category so reports stay clean.');
    }
    if (empty($row['account_id'])) {
        jg_accounting_mark_transaction_review($pdo, $id, 'Missing account');
        jg_accounting_add_review($pdo, 'transaction', $id, 'critical', 'missing_account', 'Missing account.', 'Choose which account paid or received this.');
    }
    if (empty($row['counterparty_id']) && $row['type'] !== 'transfer') {
        jg_accounting_mark_transaction_review($pdo, $id, 'Missing vendor/source');
        jg_accounting_add_review($pdo, 'transaction', $id, 'warning', 'missing_vendor', 'Missing vendor or source.', 'Add a vendor/payee/source.');
    }
    if ((int) ($row['requires_receipt'] ?? 0) === 1 && (string) ($row['receipt_status'] ?? '') === 'missing' && trim((string) ($row['receipt_url'] ?? '')) === '') {
        jg_accounting_mark_transaction_review($pdo, $id, 'Receipt missing');
        jg_accounting_add_review($pdo, 'transaction', $id, 'warning', 'missing_receipt', 'Receipt missing.', 'Attach receipt or mark not required.');
    }
    if ((int) ($row['amount'] ?? 0) >= 10000000) {
        jg_accounting_mark_transaction_review($pdo, $id, 'High amount');
        jg_accounting_add_review($pdo, 'transaction', $id, 'warning', 'high_amount', 'High amount needs review.', 'Confirm category, receipt, and approver.');
    }
    if ($row['type'] === 'manual_income') {
        $channel = strtolower((string) ($row['channel'] ?? ''));
        $counterparty = strtolower((string) ($row['counterparty_name'] ?? ''));
        if (preg_match('/shopee|tiktok|tokopedia/', $channel . ' ' . $counterparty)) {
            jg_accounting_mark_transaction_review($pdo, $id, 'Marketplace manual income');
            jg_accounting_add_review($pdo, 'transaction', $id, 'critical', 'marketplace_manual_income', 'Marketplace income was entered manually.', 'Use Transfer Money for marketplace payouts.');
        }
    }
    if ($row['type'] === 'transfer' && (int) ($row['account_id'] ?? 0) === (int) ($row['to_account_id'] ?? -1)) {
        jg_accounting_mark_transaction_review($pdo, $id, 'Transfer same account');
        jg_accounting_add_review($pdo, 'transaction', $id, 'critical', 'same_transfer_account', 'Transfer uses the same source and destination account.', 'Choose different accounts.');
    }

    $dupStmt = $pdo->prepare(
        'SELECT id
         FROM accounting_transactions
         WHERE id <> :id
           AND status <> "void"
           AND amount = :amount
           AND transaction_date BETWEEN DATE_SUB(:transaction_date, INTERVAL 3 DAY) AND DATE_ADD(:transaction_date, INTERVAL 3 DAY)
           AND COALESCE(counterparty_id, 0) = COALESCE(:counterparty_id, 0)
           AND COALESCE(category_id, 0) = COALESCE(:category_id, 0)
         LIMIT 1'
    );
    $dupStmt->execute([
        ':id' => $id,
        ':amount' => (int) ($row['amount'] ?? 0),
        ':transaction_date' => (string) ($row['transaction_date'] ?? ''),
        ':counterparty_id' => $row['counterparty_id'] ?? null,
        ':category_id' => $row['category_id'] ?? null,
    ]);
    if ($dupStmt->fetchColumn() !== false) {
        jg_accounting_mark_transaction_review($pdo, $id, 'Possible duplicate');
        jg_accounting_add_review($pdo, 'transaction', $id, 'warning', 'possible_duplicate', 'Possible duplicate transaction.', 'Compare amount, date, vendor, and category.');
    }
}

function jg_accounting_review_bill(PDO $pdo, int $id): void
{
    $stmt = $pdo->prepare('SELECT * FROM accounting_bills WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();
    if (!is_array($row)) {
        return;
    }
    if (empty($row['category_id'])) {
        jg_accounting_add_review($pdo, 'bill', $id, 'warning', 'missing_category', 'Bill missing category.', 'Choose a category.');
    }
    if ((string) ($row['receipt_status'] ?? '') === 'missing' && trim((string) ($row['attachment_url'] ?? '')) === '') {
        jg_accounting_add_review($pdo, 'bill', $id, 'warning', 'missing_attachment', 'Bill attachment missing.', 'Attach invoice or receipt URL.');
    }
    if ((int) ($row['outstanding_amount'] ?? 0) > 0 && (string) ($row['due_date'] ?? '') !== '' && (string) $row['due_date'] < jg_accounting_now()->format('Y-m-d')) {
        jg_accounting_add_review($pdo, 'bill', $id, 'critical', 'overdue_bill', 'Bill is overdue.', 'Pay, partial pay, or update the bill.');
    }
}

function jg_accounting_accounts(PDO $pdo): array
{
    $rows = $pdo->query(
        'SELECT *
         FROM accounting_accounts
         WHERE is_active = 1
         ORDER BY sort_order ASC, name ASC'
    )->fetchAll();
    return array_map(static fn (array $row): array => [
        'id' => (int) $row['id'],
        'account_key' => (string) $row['account_key'],
        'name' => (string) $row['name'],
        'type' => (string) $row['type'],
        'platform' => $row['platform'],
        'brand' => $row['brand'],
        'is_spendable' => (int) $row['is_spendable'],
    ], $rows);
}

function jg_accounting_categories(PDO $pdo): array
{
    $rows = $pdo->query(
        'SELECT c.*, p.name AS parent_name
         FROM accounting_categories c
         LEFT JOIN accounting_categories p ON p.id = c.parent_id
         WHERE c.is_active = 1
         ORDER BY COALESCE(p.sort_order, c.sort_order), c.parent_id IS NOT NULL, c.sort_order, c.name'
    )->fetchAll();
    return array_map(static fn (array $row): array => [
        'id' => (int) $row['id'],
        'category_key' => (string) $row['category_key'],
        'parent_id' => $row['parent_id'] === null ? null : (int) $row['parent_id'],
        'parent_name' => $row['parent_name'],
        'name' => (string) $row['name'],
        'type' => (string) $row['type'],
        'requires_receipt' => (int) $row['requires_receipt'],
        'is_billable' => (int) $row['is_billable'],
    ], $rows);
}

function jg_accounting_counterparties(PDO $pdo, string $search = ''): array
{
    $search = jg_accounting_text($search, 120);
    if ($search !== '') {
        $stmt = $pdo->prepare(
            'SELECT *
             FROM accounting_counterparties
             WHERE is_active = 1 AND name LIKE :search
             ORDER BY name ASC
             LIMIT 40'
        );
        $stmt->execute([':search' => '%' . $search . '%']);
    } else {
        $stmt = $pdo->query(
            'SELECT *
             FROM accounting_counterparties
             WHERE is_active = 1
             ORDER BY name ASC
             LIMIT 80'
        );
    }
    return array_map(static fn (array $row): array => [
        'id' => (int) $row['id'],
        'name' => (string) $row['name'],
        'type' => (string) $row['type'],
    ], $stmt->fetchAll());
}

function jg_accounting_account_balances(PDO $pdo): array
{
    $balances = [];
    $stmt = $pdo->query('SELECT id, opening_balance, current_balance_manual FROM accounting_accounts WHERE is_active = 1');
    foreach ($stmt->fetchAll() as $row) {
        $base = $row['current_balance_manual'] !== null ? (int) $row['current_balance_manual'] : (int) ($row['opening_balance'] ?? 0);
        $balances[(int) $row['id']] = $base;
    }

    $outStmt = $pdo->query(
        'SELECT account_id, direction, SUM(amount) AS total_amount, SUM(transfer_fee_amount) AS total_transfer_fee
         FROM accounting_transactions
         WHERE status = "posted" AND account_id IS NOT NULL
         GROUP BY account_id, direction'
    );
    foreach ($outStmt->fetchAll() as $row) {
        $id = (int) $row['account_id'];
        $amount = (int) round((float) ($row['total_amount'] ?? 0));
        $transferFee = (int) round((float) ($row['total_transfer_fee'] ?? 0));
        if (!isset($balances[$id])) {
            $balances[$id] = 0;
        }
        if ($row['direction'] === 'money_in') {
            $balances[$id] += $amount;
        } elseif ($row['direction'] === 'money_out' || $row['direction'] === 'internal_transfer') {
            $balances[$id] -= $amount;
        }
        $balances[$id] -= max(0, $transferFee);
    }

    $inStmt = $pdo->query(
        'SELECT to_account_id, SUM(amount) AS total_amount
         FROM accounting_transactions
         WHERE status = "posted" AND direction = "internal_transfer" AND to_account_id IS NOT NULL
         GROUP BY to_account_id'
    );
    foreach ($inStmt->fetchAll() as $row) {
        $id = (int) $row['to_account_id'];
        if (!isset($balances[$id])) {
            $balances[$id] = 0;
        }
        $balances[$id] += (int) round((float) ($row['total_amount'] ?? 0));
    }
    return $balances;
}

function jg_accounting_cash_history(PDO $pdo): array
{
    $rows = [];
    $spendableTypes = ['bank', 'cash', 'ewallet'];

    $accountStmt = $pdo->query(
        'SELECT id, name, type, platform, brand, opening_balance, current_balance_manual, created_at
         FROM accounting_accounts
         WHERE is_active = 1 AND is_spendable = 1
         ORDER BY sort_order ASC, id ASC'
    );
    foreach ($accountStmt->fetchAll() as $account) {
        if (!in_array((string) ($account['type'] ?? ''), $spendableTypes, true)) {
            continue;
        }
        $amount = $account['current_balance_manual'] !== null
            ? (int) ($account['current_balance_manual'] ?? 0)
            : (int) ($account['opening_balance'] ?? 0);
        if ($amount === 0) {
            continue;
        }
        $createdAt = trim((string) ($account['created_at'] ?? ''));
        $platform = jg_accounting_cash_platform((string) ($account['platform'] ?? ''));
        $cashAccount = jg_accounting_cash_account((string) ($account['brand'] ?? ''));
        $rows[] = [
            'id' => 'account:' . (int) $account['id'],
            'date' => $createdAt !== '' ? jg_accounting_source_local_date($createdAt) : '',
            'sort_at' => $createdAt !== '' ? $createdAt : '0000-00-00 00:00:00',
            'reason' => $account['current_balance_manual'] !== null ? 'Recorded account balance' : 'Opening balance',
            'source' => (string) ($account['name'] ?? 'Cash account'),
            'reference' => '',
            'kind' => 'account_balance',
            'platform' => $platform['key'],
            'platform_label' => $platform['label'],
            'cash_account' => $cashAccount['key'],
            'cash_account_label' => $cashAccount['label'],
            'signed_amount' => $amount,
        ];
    }

    $transactionStmt = $pdo->query(
        'SELECT t.id, t.transaction_key, t.transaction_date, t.type, t.direction, t.amount,
                t.transfer_fee_amount, t.reference_no, t.order_no, t.notes, t.channel, t.brand,
                src.name AS account_name, src.type AS account_type, src.is_spendable AS account_is_spendable, src.is_active AS account_is_active,
                dst.name AS to_account_name, dst.type AS to_account_type, dst.is_spendable AS to_account_is_spendable, dst.is_active AS to_account_is_active,
                cp.name AS counterparty_name, c.name AS category_name
         FROM accounting_transactions t
         LEFT JOIN accounting_accounts src ON src.id = t.account_id
         LEFT JOIN accounting_accounts dst ON dst.id = t.to_account_id
         LEFT JOIN accounting_counterparties cp ON cp.id = t.counterparty_id
         LEFT JOIN accounting_categories c ON c.id = t.category_id
         WHERE t.status = "posted"
         ORDER BY t.transaction_date ASC, t.id ASC'
    );
    $typeLabels = [
        'expense' => 'Expense paid',
        'bill_payment' => 'Bill paid',
        'transfer' => 'Account transfer',
        'manual_income' => 'Money received',
        'loan_received' => 'Loan received',
        'owner_draw' => 'Owner draw',
        'owner_injection' => 'Owner injection',
        'refund' => 'Customer refund',
        'adjustment' => 'Cash adjustment',
        'opening_balance' => 'Opening balance',
    ];
    foreach ($transactionStmt->fetchAll() as $transaction) {
        $amount = (int) round((float) ($transaction['amount'] ?? 0));
        $fee = max(0, (int) round((float) ($transaction['transfer_fee_amount'] ?? 0)));
        $sourceSpendable = (int) ($transaction['account_is_active'] ?? 0) === 1
            && (int) ($transaction['account_is_spendable'] ?? 0) === 1
            && in_array((string) ($transaction['account_type'] ?? ''), $spendableTypes, true);
        $destinationSpendable = (int) ($transaction['to_account_is_active'] ?? 0) === 1
            && (int) ($transaction['to_account_is_spendable'] ?? 0) === 1
            && in_array((string) ($transaction['to_account_type'] ?? ''), $spendableTypes, true);
        $direction = (string) ($transaction['direction'] ?? '');
        $signedAmount = 0;
        if ($sourceSpendable && $direction === 'money_in') {
            $signedAmount += $amount;
        } elseif ($sourceSpendable && in_array($direction, ['money_out', 'internal_transfer'], true)) {
            $signedAmount -= $amount;
        }
        if ($destinationSpendable && $direction === 'internal_transfer') {
            $signedAmount += $amount;
        }
        if ($sourceSpendable) {
            $signedAmount -= $fee;
        }
        if ($signedAmount === 0) {
            continue;
        }

        $type = (string) ($transaction['type'] ?? '');
        $notes = trim((string) ($transaction['notes'] ?? ''));
        $counterparty = trim((string) ($transaction['counterparty_name'] ?? ''));
        $category = trim((string) ($transaction['category_name'] ?? ''));
        $reason = $notes !== '' ? $notes : ($counterparty !== '' ? $counterparty : ($category !== '' ? $category : ($typeLabels[$type] ?? 'Cash entry')));
        if ($fee > 0 && abs($signedAmount) === $fee && $direction === 'internal_transfer') {
            $reason = 'Transfer fee';
        }
        $accountRoute = trim((string) ($transaction['account_name'] ?? ''));
        if (trim((string) ($transaction['to_account_name'] ?? '')) !== '') {
            $accountRoute .= ($accountRoute !== '' ? ' → ' : '') . trim((string) $transaction['to_account_name']);
        }
        $reference = trim((string) ($transaction['reference_no'] ?? ''));
        if ($reference === '') {
            $reference = trim((string) ($transaction['order_no'] ?? ''));
        }
        if ($reference === '') {
            $reference = (string) ($transaction['transaction_key'] ?? '');
        }
        $date = (string) ($transaction['transaction_date'] ?? '');
        $platform = jg_accounting_cash_platform((string) ($transaction['channel'] ?? ''));
        $cashAccount = jg_accounting_cash_account((string) ($transaction['brand'] ?? ''));
        $rows[] = [
            'id' => 'transaction:' . (int) $transaction['id'],
            'date' => $date,
            'sort_at' => $date . ' 12:00:00',
            'reason' => $reason,
            'source' => ($typeLabels[$type] ?? ucwords(str_replace('_', ' ', $type))) . ($accountRoute !== '' ? ' • ' . $accountRoute : ''),
            'reference' => $reference,
            'kind' => 'manual_transaction',
            'platform' => $platform['key'],
            'platform_label' => $platform['label'],
            'cash_account' => $cashAccount['key'],
            'cash_account_label' => $cashAccount['label'],
            'signed_amount' => $signedAmount,
        ];
    }

    foreach (jg_accounting_automatic_cash_records($pdo) as $record) {
        $amount = (int) ($record['usable_cash_amount'] ?? 0);
        if ($amount <= 0) {
            continue;
        }
        $sourceType = (string) ($record['source_type'] ?? '');
        $counterparty = trim((string) ($record['counterparty'] ?? ''));
        $notes = trim((string) ($record['notes'] ?? ''));
        $orderId = trim((string) ($record['order_id'] ?? ''));
        $reason = $sourceType === 'website_payment' ? 'Confirmed website payment' : 'Wallet withdrawal to bank';
        if ($counterparty !== '') {
            $reason .= ' • ' . $counterparty;
        }
        if ($notes !== '' && $sourceType !== 'website_payment') {
            $reason .= ' • ' . $notes;
        }
        $source = trim(implode(' • ', array_filter([
            $sourceType === 'website_payment' ? 'Website' : 'Marketplace Wallet',
            trim((string) ($record['platform'] ?? '')),
            trim((string) ($record['account_key'] ?? '')),
        ])));
        $platform = jg_accounting_cash_platform((string) ($record['platform'] ?? ''));
        $cashAccount = jg_accounting_cash_account(implode(' ', [
            (string) ($record['account_key'] ?? ''),
            (string) ($record['platform'] ?? ''),
        ]));
        $rows[] = [
            'id' => (string) ($record['source_key'] ?? ''),
            'date' => (string) ($record['record_date'] ?? ''),
            'sort_at' => (string) ($record['occurred_at'] ?? (($record['record_date'] ?? '') . ' 12:00:00')),
            'reason' => $reason,
            'source' => $source,
            'reference' => $orderId !== '' ? $orderId : (string) ($record['source_key'] ?? ''),
            'kind' => 'automatic_cash',
            'platform' => $platform['key'],
            'platform_label' => $platform['label'],
            'cash_account' => $cashAccount['key'],
            'cash_account_label' => $cashAccount['label'],
            'signed_amount' => $amount,
        ];
    }

    usort($rows, static function (array $left, array $right): int {
        $time = strcmp((string) ($left['sort_at'] ?? ''), (string) ($right['sort_at'] ?? ''));
        return $time !== 0 ? $time : strcmp((string) ($left['id'] ?? ''), (string) ($right['id'] ?? ''));
    });

    $runningBalance = 0;
    $totalAdded = 0;
    $totalSubtracted = 0;
    foreach ($rows as &$row) {
        $signedAmount = (int) ($row['signed_amount'] ?? 0);
        $runningBalance += $signedAmount;
        if ($signedAmount > 0) {
            $totalAdded += $signedAmount;
        } else {
            $totalSubtracted += abs($signedAmount);
        }
        $row['amount_added'] = max(0, $signedAmount);
        $row['amount_subtracted'] = max(0, -$signedAmount);
        $row['running_balance'] = $runningBalance;
        unset($row['sort_at'], $row['signed_amount']);
    }
    unset($row);
    $rows = array_reverse($rows);

    return [
        'rows' => $rows,
        'summary' => [
            'current_cash' => $runningBalance,
            'total_added' => $totalAdded,
            'total_subtracted' => $totalSubtracted,
            'entry_count' => count($rows),
        ],
    ];
}

/** @return array{key:string,label:string} */
function jg_accounting_cash_platform(string $value): array
{
    $normalized = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($value)) ?? '', '-');
    if ($normalized === '') {
        return ['key' => '', 'label' => ''];
    }

    if (str_contains($normalized, 'shopee')) {
        return ['key' => 'shopee', 'label' => 'Shopee'];
    }
    if (str_contains($normalized, 'tiktok') || str_contains($normalized, 'tik-tok')) {
        return ['key' => 'tiktok', 'label' => 'TikTok'];
    }
    if (str_contains($normalized, 'tokopedia')) {
        return ['key' => 'tokopedia', 'label' => 'Tokopedia'];
    }
    if (str_contains($normalized, 'jenang') && str_contains($normalized, 'website')) {
        return ['key' => 'jenang-gemi-website', 'label' => 'Jenang Gemi Website'];
    }
    if (str_contains($normalized, 'zero') && str_contains($normalized, 'website')) {
        return ['key' => 'zero-website', 'label' => 'ZERO Website'];
    }
    if (str_contains($normalized, 'zfit') && str_contains($normalized, 'website')) {
        return ['key' => 'zfit-website', 'label' => 'ZFIT Website'];
    }
    if ($normalized === 'website' || str_contains($normalized, 'web-store')) {
        return ['key' => 'website', 'label' => 'Website'];
    }
    if (str_contains($normalized, 'whatsapp')) {
        return ['key' => 'whatsapp', 'label' => 'WhatsApp'];
    }

    return ['key' => '', 'label' => ''];
}

/** @return array{key:string,label:string} */
function jg_accounting_cash_account(string $value): array
{
    $normalized = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($value)) ?? '', '-');
    if ($normalized === '') {
        return ['key' => '', 'label' => ''];
    }
    if (preg_match('/(^|-)zero($|-)/', $normalized) === 1) {
        return ['key' => 'zero', 'label' => 'ZERO'];
    }
    if (preg_match('/(^|-)(zfit|z-fit)($|-)/', $normalized) === 1) {
        return ['key' => 'zfit', 'label' => 'ZFIT'];
    }
    if (str_contains($normalized, 'jenang') || preg_match('/(^|-)jg($|-)/', $normalized) === 1) {
        return ['key' => 'jenang-gemi', 'label' => 'Jenang Gemi'];
    }

    return ['key' => '', 'label' => ''];
}

function jg_accounting_marketplace_normalize_status(mixed $status): string
{
    return trim(preg_replace('/[^A-Z0-9]+/', '_', strtoupper((string) $status)) ?? '', '_');
}

function jg_accounting_marketplace_is_non_settling(mixed $status): bool
{
    return in_array(jg_accounting_marketplace_normalize_status($status), [
        'CANCEL', 'CANCELED', 'CANCELLED', 'CANCELLED_BY_BUYER',
        'CANCELLED_BY_SELLER', 'CANCELLED_BY_SYSTEM', 'REFUND', 'REFUNDED',
        'RETURN', 'RETURNED', 'REJECTED', 'FAILED', 'EXPIRED', 'UNPAID',
        'VOID', 'VOIDED',
    ], true);
}

function jg_accounting_marketplace_release_is_trusted(array $row): bool
{
    if ((int) ($row['funds_released'] ?? 0) <= 0) {
        return false;
    }

    $platform = strtolower(trim((string) ($row['platform'] ?? '')));
    if ($platform !== 'shopee') {
        return true;
    }

    $sourceRaw = trim((string) ($row['funds_release_source'] ?? ''));
    $source = strtolower($sourceRaw);
    $effectiveStatus = jg_accounting_marketplace_normalize_status($row['funds_release_status'] ?? '')
        ?: jg_accounting_marketplace_normalize_status($row['order_status'] ?? '');
    if (preg_match('/^order_status=([^;]+)/i', $sourceRaw, $matches)) {
        return in_array(jg_accounting_marketplace_normalize_status($matches[1]), ['COMPLETED', 'COMPLETE'], true);
    }
    if ($source === 'settlement_payload') {
        return !in_array($effectiveStatus, [
            'READY_TO_SHIP', 'PROCESSED', 'SHIPPED', 'TO_CONFIRM_RECEIVE',
            'IN_CANCEL', 'RETRY_SHIP', 'PAID', 'UNPAID',
        ], true);
    }
    return true;
}

function jg_accounting_marketplace_outstanding_context(PDO $pdo): array
{
    try {
        $stmt = $pdo->query(
            'SELECT platform,
                    account_key,
                    CASE WHEN order_id = "" THEN order_item_hash ELSE order_id END AS order_key,
                    MAX(order_net_revenue) AS order_amount,
                    MAX(funds_released) AS funds_released,
                    MAX(funds_released_amount) AS funds_released_amount,
                    MAX(status) AS order_status,
                    MAX(funds_release_status) AS funds_release_status,
                    MAX(funds_release_source) AS funds_release_source
             FROM dashboard_order_mirror
             WHERE deleted_at IS NULL
               AND platform IN ("shopee", "tiktok")
             GROUP BY platform, account_key, order_key'
        );
        $rows = $stmt ? $stmt->fetchAll() : [];
    } catch (Throwable) {
        return [
            'amount' => null,
            'available' => false,
            'source' => 'wallet_context_unavailable',
            'label' => 'Wallet source unavailable',
            'order_count' => null,
            'non_settling_order_count' => null,
        ];
    }

    $amount = 0;
    $orderCount = 0;
    $nonSettlingCount = 0;
    foreach ($rows as $row) {
        if (jg_accounting_marketplace_release_is_trusted($row)) {
            continue;
        }
        if (
            jg_accounting_marketplace_is_non_settling($row['funds_release_status'] ?? '')
            || jg_accounting_marketplace_is_non_settling($row['order_status'] ?? '')
        ) {
            $nonSettlingCount++;
            continue;
        }
        $amount += max(0, (int) round((float) ($row['order_amount'] ?? 0)));
        $orderCount++;
    }

    return [
        'amount' => $amount,
        'available' => true,
        'source' => 'dashboard_order_mirror',
        'label' => 'Unreleased settling marketplace orders',
        'order_count' => $orderCount,
        'non_settling_order_count' => $nonSettlingCount,
    ];
}

function jg_accounting_month_utc_bounds(string $month): array
{
    $timezone = new DateTimeZone('Asia/Jakarta');
    $start = DateTimeImmutable::createFromFormat('!Y-m-d H:i:s', $month . '-01 00:00:00', $timezone);
    if (!$start) {
        $start = jg_accounting_now()->modify('first day of this month')->setTime(0, 0);
    }
    $end = $start->modify('first day of next month');

    return [
        'start_at' => $start->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s'),
        'end_at' => $end->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s'),
    ];
}

function jg_accounting_date_utc_bound(string $date, bool $exclusiveEnd = false): string
{
    $timezone = new DateTimeZone('Asia/Jakarta');
    $start = DateTimeImmutable::createFromFormat('!Y-m-d H:i:s', $date . ' 00:00:00', $timezone);
    if (!$start) {
        $start = jg_accounting_now()->setTime(0, 0);
    }
    $target = $exclusiveEnd ? $start->modify('+1 day') : $start;
    return $target->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
}

function jg_accounting_cash_record_bounds(array $filters = []): array
{
    $month = trim((string) ($filters['month'] ?? ''));
    $dateFrom = trim((string) ($filters['date_from'] ?? ''));
    $dateTo = trim((string) ($filters['date_to'] ?? ''));
    $bounds = [
        'month' => $month,
        'date_from' => $dateFrom,
        'date_to' => $dateTo,
        'start_at' => '',
        'end_at' => '',
    ];

    if ($dateFrom !== '' || $dateTo !== '') {
        if ($dateFrom !== '') {
            $bounds['start_at'] = jg_accounting_date_utc_bound(jg_accounting_date($dateFrom, 'date_from'));
        }
        if ($dateTo !== '') {
            $bounds['end_at'] = jg_accounting_date_utc_bound(jg_accounting_date($dateTo, 'date_to'), true);
        }
        return $bounds;
    }

    if ($month !== '') {
        $monthBounds = jg_accounting_month_utc_bounds($month);
        $bounds['start_at'] = $monthBounds['start_at'];
        $bounds['end_at'] = $monthBounds['end_at'];
    }

    return $bounds;
}

function jg_accounting_source_business_month(string $utcAt): string
{
    try {
        $date = new DateTimeImmutable($utcAt, new DateTimeZone('UTC'));
    } catch (Throwable) {
        return '';
    }
    return $date->setTimezone(new DateTimeZone('Asia/Jakarta'))->format('Y-m');
}

function jg_accounting_source_local_date(string $utcAt): string
{
    try {
        $date = new DateTimeImmutable($utcAt, new DateTimeZone('UTC'));
    } catch (Throwable) {
        return '';
    }
    return $date->setTimezone(new DateTimeZone('Asia/Jakarta'))->format('Y-m-d');
}

function jg_accounting_apply_source_time_filter(array &$where, array &$params, array $bounds, string $expression, string $prefix): void
{
    if (trim((string) ($bounds['start_at'] ?? '')) !== '') {
        $where[] = $expression . ' >= :' . $prefix . '_start_at';
        $params[':' . $prefix . '_start_at'] = (string) $bounds['start_at'];
    }
    if (trim((string) ($bounds['end_at'] ?? '')) !== '') {
        $where[] = $expression . ' < :' . $prefix . '_end_at';
        $params[':' . $prefix . '_end_at'] = (string) $bounds['end_at'];
    }
}

function jg_accounting_apply_transaction_filter(array &$where, array &$params, array $bounds): void
{
    $dateFrom = trim((string) ($bounds['date_from'] ?? ''));
    $dateTo = trim((string) ($bounds['date_to'] ?? ''));
    $month = trim((string) ($bounds['month'] ?? ''));
    if ($dateFrom !== '' || $dateTo !== '') {
        if ($dateFrom !== '') {
            $where[] = 't.transaction_date >= :transaction_date_from';
            $params[':transaction_date_from'] = jg_accounting_date($dateFrom, 'date_from');
        }
        if ($dateTo !== '') {
            $where[] = 't.transaction_date <= :transaction_date_to';
            $params[':transaction_date_to'] = jg_accounting_date($dateTo, 'date_to');
        }
        return;
    }
    if ($month !== '') {
        $where[] = 't.business_month = :transaction_month';
        $params[':transaction_month'] = $month;
    }
}

function jg_accounting_manual_marketplace_transfer_records(PDO $pdo, array $bounds = []): array
{
    $manualWhere = [
        't.status = "posted"',
        't.type = "transfer"',
        't.direction = "internal_transfer"',
        'src.type = "marketplace_wallet"',
        'dst.is_spendable = 1',
        'dst.type IN ("bank", "cash", "ewallet")',
    ];
    $manualParams = [];
    jg_accounting_apply_transaction_filter($manualWhere, $manualParams, $bounds);

    try {
        $manualStmt = $pdo->prepare(
            'SELECT t.id, t.transaction_date, t.amount,
                    src.account_key AS source_account_key,
                    src.platform,
                    src.brand
             FROM accounting_transactions t
             INNER JOIN accounting_accounts src ON src.id = t.account_id
             INNER JOIN accounting_accounts dst ON dst.id = t.to_account_id
             WHERE ' . implode(' AND ', $manualWhere)
        );
        $manualStmt->execute($manualParams);
        $rows = $manualStmt->fetchAll();
    } catch (Throwable) {
        return [];
    }

    return array_map(static function (array $row): array {
        $platform = trim(strtolower((string) ($row['platform'] ?? '')));
        $brand = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower((string) ($row['brand'] ?? ''))) ?? '', '-');
        return [
            'id' => (int) ($row['id'] ?? 0),
            'amount' => max(0, (int) round((float) ($row['amount'] ?? 0))),
            'transaction_date' => (string) ($row['transaction_date'] ?? ''),
            'platform' => $platform,
            'account_key' => $brand !== '' && $platform !== '' ? $brand . '-' . $platform : '',
            'source_account_key' => (string) ($row['source_account_key'] ?? ''),
        ];
    }, $rows);
}

function jg_accounting_manual_marketplace_transfer_context(PDO $pdo, array $bounds = []): array
{
    $records = jg_accounting_manual_marketplace_transfer_records($pdo, $bounds);
    return [
        'amount' => array_sum(array_column($records, 'amount')),
        'count' => count($records),
    ];
}

function jg_accounting_wallet_key(string $platform, string $accountKey): string
{
    $normalize = static fn (string $value): string => trim(strtolower(preg_replace('/[^a-z0-9._-]+/', '-', $value) ?? ''), '.-_');
    return $normalize($platform) . '|' . $normalize($accountKey);
}

function jg_accounting_wallet_platform_transaction_text(array $row): string
{
    $raw = json_decode((string) ($row['raw_json'] ?? ''), true);
    $raw = is_array($raw) ? $raw : [];
    $parts = [
        $row['transaction_type'] ?? '',
        $row['money_flow'] ?? '',
        $row['order_id'] ?? '',
        $raw['transaction_type'] ?? '',
        $raw['transaction_description'] ?? '',
        $raw['description'] ?? '',
        $raw['reason'] ?? '',
        $raw['title'] ?? '',
        $raw['type'] ?? '',
        $raw['money_flow'] ?? '',
    ];
    $text = strtolower(implode(' ', array_map(static fn (mixed $value): string => (string) $value, $parts)));
    return trim(preg_replace('/[^a-z0-9]+/', ' ', $text) ?? '');
}

function jg_accounting_is_wallet_platform_cash_out(array $row): bool
{
    $amount = (int) round((float) ($row['amount'] ?? 0));
    if ($amount >= 0) {
        return false;
    }

    $text = jg_accounting_wallet_platform_transaction_text($row);
    if (preg_match('/\b(refund|fee|commission|penalt|ads?|advert|voucher|shipping|adjust|correction|reversal|chargeback|claim|compensation)\b/i', $text)) {
        return false;
    }
    if (preg_match('/\b(withdraw|withdrawal|payout|pay[ -]?out|bank|transfer|disburse|disbursement|settlement|settle|cash[ -]?out)\b/i', $text)) {
        return true;
    }

    $orderId = trim((string) ($row['order_id'] ?? ''));
    return $orderId === '' && preg_match('/\b(out|debit|withdraw)\b/i', $text) === 1;
}

function jg_accounting_wallet_platform_cash_records(PDO $pdo, array $bounds = []): array
{
    $where = ['amount < 0'];
    $params = [];
    jg_accounting_apply_source_time_filter($where, $params, $bounds, 'transaction_at', 'wallet_tx');

    try {
        $stmt = $pdo->prepare(
            'SELECT id, platform, account_key, transaction_id, order_id, transaction_type, money_flow,
                    amount, current_balance, transaction_at, raw_json
             FROM dashboard_wallet_platform_transactions
             WHERE ' . implode(' AND ', $where) . '
             ORDER BY transaction_at ASC, id ASC'
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
    } catch (Throwable) {
        return [];
    }

    $records = [];
    foreach ($rows as $row) {
        if (!jg_accounting_is_wallet_platform_cash_out($row)) {
            continue;
        }
        $gross = abs((int) round((float) ($row['amount'] ?? 0)));
        if ($gross <= 0) {
            continue;
        }

        $platform = (string) ($row['platform'] ?? '');
        $accountKey = (string) ($row['account_key'] ?? '');
        $occurredAt = trim((string) ($row['transaction_at'] ?? ''));

        $records[] = [
            'source_key' => 'wallet_platform_transaction:' . (int) ($row['id'] ?? 0),
            'source_type' => 'wallet_withdrawal',
            'source_table' => 'dashboard_wallet_platform_transactions',
            'source_id' => (int) ($row['id'] ?? 0),
            'source_label' => trim($platform . ' ' . $accountKey),
            'occurred_at' => $occurredAt,
            'record_date' => jg_accounting_source_local_date($occurredAt),
            'business_month' => jg_accounting_source_business_month($occurredAt),
            'platform' => $platform,
            'account_key' => $accountKey,
            'order_id' => (string) ($row['order_id'] ?? ''),
            'counterparty' => $accountKey,
            'gross_amount' => $gross,
            'manual_offset_amount' => 0,
            'source_offset_amount' => 0,
            'usable_cash_amount' => $gross,
            'amount' => $gross,
            'currency' => 'IDR',
            'record_status' => 'usable',
            'cash_basis' => 'platform_wallet_transaction_cash_out',
            'notes' => trim((string) ($row['transaction_type'] ?? '')),
        ];
    }

    return $records;
}

function jg_accounting_cash_record_timestamp(array $record): ?int
{
    $occurredAt = trim((string) ($record['occurred_at'] ?? ''));
    if ($occurredAt === '') {
        return null;
    }
    try {
        return (new DateTimeImmutable($occurredAt, new DateTimeZone('UTC')))->getTimestamp();
    } catch (Throwable) {
        return null;
    }
}

function jg_accounting_wallet_record_matches(array $left, array $right, int $windowSeconds): bool
{
    if (
        (int) ($left['gross_amount'] ?? 0) !== (int) ($right['gross_amount'] ?? 0)
        || jg_accounting_wallet_key((string) ($left['platform'] ?? ''), (string) ($left['account_key'] ?? ''))
            !== jg_accounting_wallet_key((string) ($right['platform'] ?? ''), (string) ($right['account_key'] ?? ''))
    ) {
        return false;
    }
    $leftTime = jg_accounting_cash_record_timestamp($left);
    $rightTime = jg_accounting_cash_record_timestamp($right);
    return $leftTime !== null && $rightTime !== null && abs($leftTime - $rightTime) <= $windowSeconds;
}

function jg_accounting_reconcile_wallet_source_duplicates(array $records, int $windowSeconds = 259200): array
{
    $matchedReleases = [];
    foreach ($records as $platformIndex => &$platformRecord) {
        if ((string) ($platformRecord['source_table'] ?? '') !== 'dashboard_wallet_platform_transactions') {
            continue;
        }
        $bestReleaseIndex = null;
        $bestDistance = PHP_INT_MAX;
        foreach ($records as $releaseIndex => $releaseRecord) {
            if (
                isset($matchedReleases[$releaseIndex])
                || (string) ($releaseRecord['source_table'] ?? '') !== 'dashboard_wallet_releases'
                || !jg_accounting_wallet_record_matches($platformRecord, $releaseRecord, $windowSeconds)
            ) {
                continue;
            }
            $distance = abs((int) jg_accounting_cash_record_timestamp($platformRecord) - (int) jg_accounting_cash_record_timestamp($releaseRecord));
            if ($distance < $bestDistance) {
                $bestDistance = $distance;
                $bestReleaseIndex = $releaseIndex;
            }
        }
        if ($bestReleaseIndex !== null) {
            $matchedReleases[$bestReleaseIndex] = true;
            $gross = (int) ($platformRecord['gross_amount'] ?? 0);
            $platformRecord['source_offset_amount'] = $gross;
            $platformRecord['usable_cash_amount'] = 0;
            $platformRecord['amount'] = 0;
            $platformRecord['record_status'] = 'fully_offset';
            $platformRecord['notes'] = trim((string) ($platformRecord['notes'] ?? '') . ' Duplicate of wallet release ' . ($records[$bestReleaseIndex]['source_key'] ?? '') . '.');
        }
    }
    unset($platformRecord);
    return $records;
}

function jg_accounting_apply_manual_wallet_transfer_offsets(array $records, array $manualTransfers, int $windowSeconds = 259200): array
{
    foreach ($manualTransfers as $transfer) {
        $transferDate = trim((string) ($transfer['transaction_date'] ?? ''));
        $transferTime = $transferDate !== '' ? strtotime($transferDate . ' 00:00:00 UTC') : false;
        $candidates = [];
        foreach ($records as $index => $record) {
            $available = max(0,
                (int) ($record['gross_amount'] ?? 0)
                - (int) ($record['source_offset_amount'] ?? 0)
                - (int) ($record['manual_offset_amount'] ?? 0)
            );
            if (
                $available <= 0
                || ((string) ($transfer['platform'] ?? '') !== '' && strtolower((string) ($record['platform'] ?? '')) !== (string) $transfer['platform'])
                || ((string) ($transfer['account_key'] ?? '') !== '' && jg_accounting_wallet_key((string) ($record['platform'] ?? ''), (string) ($record['account_key'] ?? '')) !== jg_accounting_wallet_key((string) $transfer['platform'], (string) $transfer['account_key']))
            ) {
                continue;
            }
            $recordTime = jg_accounting_cash_record_timestamp($record);
            if ($transferTime === false || $recordTime === null) {
                continue;
            }
            $distance = abs($recordTime - $transferTime);
            if ($distance <= $windowSeconds) {
                $candidates[] = ['index' => $index, 'distance' => $distance];
            }
        }
        usort($candidates, static fn (array $left, array $right): int => $left['distance'] <=> $right['distance'] ?: $left['index'] <=> $right['index']);
        $remaining = max(0, (int) ($transfer['amount'] ?? 0));
        foreach ($candidates as $candidate) {
            if ($remaining <= 0) {
                break;
            }
            $index = (int) $candidate['index'];
            $gross = (int) ($records[$index]['gross_amount'] ?? 0);
            $sourceOffset = (int) ($records[$index]['source_offset_amount'] ?? 0);
            $existingManualOffset = (int) ($records[$index]['manual_offset_amount'] ?? 0);
            $available = max(0, $gross - $sourceOffset - $existingManualOffset);
            $offset = min($available, $remaining);
            if ($offset <= 0) {
                continue;
            }
            $remaining -= $offset;
            $manualOffset = $existingManualOffset + $offset;
            $usable = max(0, $gross - $sourceOffset - $manualOffset);
            $records[$index]['manual_offset_amount'] = $manualOffset;
            $records[$index]['usable_cash_amount'] = $usable;
            $records[$index]['amount'] = $usable;
            $records[$index]['record_status'] = $usable > 0 ? 'partially_offset' : 'fully_offset';
            $records[$index]['notes'] = trim((string) ($records[$index]['notes'] ?? '') . ' Rp' . $offset . ' already represented by Accounting transfer #' . (int) ($transfer['id'] ?? 0) . '.');
        }
    }
    return $records;
}

function jg_accounting_wallet_cash_records(PDO $pdo, array $bounds = []): array
{
    $releaseWhere = ['undone_at IS NULL'];
    $releaseParams = [];
    $occurredExpression = 'COALESCE(withdrawn_at, created_at)';
    jg_accounting_apply_source_time_filter($releaseWhere, $releaseParams, $bounds, $occurredExpression, 'release');

    try {
        $releaseStmt = $pdo->prepare(
            'SELECT id, platform, account_key, amount, release_note, released_by, withdrawn_at, created_at,
                    ' . $occurredExpression . ' AS occurred_at
             FROM dashboard_wallet_releases
             WHERE ' . implode(' AND ', $releaseWhere) . '
             ORDER BY ' . $occurredExpression . ' ASC, id ASC'
        );
        $releaseStmt->execute($releaseParams);
        $rows = $releaseStmt->fetchAll();
    } catch (Throwable) {
        $rows = [];
    }

    $records = [];
    foreach ($rows as $row) {
        $gross = max(0, (int) round((float) ($row['amount'] ?? 0)));
        if ($gross <= 0) {
            continue;
        }
        $occurredAt = trim((string) ($row['occurred_at'] ?? $row['withdrawn_at'] ?? $row['created_at'] ?? ''));
        $platform = (string) ($row['platform'] ?? '');
        $accountKey = (string) ($row['account_key'] ?? '');
        $records[] = [
            'source_key' => 'wallet_release:' . (int) ($row['id'] ?? 0),
            'source_type' => 'wallet_withdrawal',
            'source_table' => 'dashboard_wallet_releases',
            'source_id' => (int) ($row['id'] ?? 0),
            'source_label' => trim($platform . ' ' . $accountKey),
            'occurred_at' => $occurredAt,
            'record_date' => jg_accounting_source_local_date($occurredAt),
            'business_month' => jg_accounting_source_business_month($occurredAt),
            'platform' => $platform,
            'account_key' => $accountKey,
            'order_id' => '',
            'counterparty' => $accountKey,
            'gross_amount' => $gross,
            'manual_offset_amount' => 0,
            'source_offset_amount' => 0,
            'usable_cash_amount' => $gross,
            'amount' => $gross,
            'currency' => 'IDR',
            'record_status' => 'usable',
            'cash_basis' => 'wallet_withdrawal_to_bank',
            'notes' => (string) ($row['release_note'] ?? ''),
        ];
    }

    $records = array_merge(
        $records,
        jg_accounting_wallet_platform_cash_records($pdo, $bounds)
    );
    $records = jg_accounting_reconcile_wallet_source_duplicates($records);
    $records = jg_accounting_apply_manual_wallet_transfer_offsets(
        $records,
        jg_accounting_manual_marketplace_transfer_records($pdo, $bounds)
    );
    usort($records, static function (array $left, array $right): int {
        $time = strcmp((string) ($left['occurred_at'] ?? ''), (string) ($right['occurred_at'] ?? ''));
        return $time !== 0 ? $time : strcmp((string) ($left['source_key'] ?? ''), (string) ($right['source_key'] ?? ''));
    });

    return $records;
}

function jg_accounting_manual_website_money_in_offsets(PDO $pdo, array $orderIds): array
{
    $orderIds = array_values(array_unique(array_filter(array_map(static fn (mixed $value): string => trim((string) $value), $orderIds))));
    if ($orderIds === []) {
        return [];
    }

    $lookup = array_fill_keys($orderIds, true);
    $offsets = array_fill_keys($orderIds, 0);
    foreach (array_chunk($orderIds, 150) as $chunkIndex => $chunk) {
        $whereParts = [];
        $params = [];
        foreach (['order_no', 'reference_no', 'invoice_no'] as $field) {
            $placeholders = [];
            foreach ($chunk as $index => $orderId) {
                $placeholder = ':' . $field . '_' . $chunkIndex . '_' . $index;
                $placeholders[] = $placeholder;
                $params[$placeholder] = $orderId;
            }
            $whereParts[] = $field . ' IN (' . implode(', ', $placeholders) . ')';
        }

        try {
            $stmt = $pdo->prepare(
                'SELECT order_no, reference_no, invoice_no, amount
                 FROM accounting_transactions
                 WHERE status = "posted"
                   AND direction = "money_in"
                   AND type = "manual_income"
                   AND (' . implode(' OR ', $whereParts) . ')'
            );
            $stmt->execute($params);
            foreach ($stmt->fetchAll() as $row) {
                foreach (['order_no', 'reference_no', 'invoice_no'] as $field) {
                    $orderId = trim((string) ($row[$field] ?? ''));
                    if ($orderId !== '' && isset($lookup[$orderId])) {
                        $offsets[$orderId] += max(0, (int) round((float) ($row['amount'] ?? 0)));
                        break;
                    }
                }
            }
        } catch (Throwable) {
            return $offsets;
        }
    }

    return $offsets;
}

function jg_accounting_website_cash_records(PDO $pdo, array $bounds = []): array
{
    $where = ['paid_at IS NOT NULL'];
    $params = [];
    jg_accounting_apply_source_time_filter($where, $params, $bounds, 'paid_at', 'website_paid');

    try {
        $stmt = $pdo->prepare(
            'SELECT id, platform, order_id, status, customer_name, gross_revenue, net_revenue, paid_at, created_at
             FROM website_orders
             WHERE ' . implode(' AND ', $where) . '
             ORDER BY paid_at ASC, id ASC'
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
    } catch (Throwable) {
        return [];
    }

    $offsets = jg_accounting_manual_website_money_in_offsets(
        $pdo,
        array_map(static fn (array $row): string => (string) ($row['order_id'] ?? ''), $rows)
    );
    $records = [];
    foreach ($rows as $row) {
        $orderId = (string) ($row['order_id'] ?? '');
        $gross = max(0, (int) round((float) ($row['net_revenue'] ?? 0)));
        $manualOffset = min($gross, max(0, (int) ($offsets[$orderId] ?? 0)));
        $usable = max(0, $gross - $manualOffset);
        $occurredAt = trim((string) ($row['paid_at'] ?? $row['created_at'] ?? ''));
        $platform = (string) ($row['platform'] ?? '');
        $records[] = [
            'source_key' => 'website_order:' . $platform . ':' . $orderId,
            'source_type' => 'website_payment',
            'source_table' => 'website_orders',
            'source_id' => (int) ($row['id'] ?? 0),
            'source_label' => trim($platform . ' ' . $orderId),
            'occurred_at' => $occurredAt,
            'record_date' => jg_accounting_source_local_date($occurredAt),
            'business_month' => jg_accounting_source_business_month($occurredAt),
            'platform' => $platform,
            'account_key' => $platform,
            'order_id' => $orderId,
            'counterparty' => (string) ($row['customer_name'] ?? ''),
            'gross_amount' => $gross,
            'manual_offset_amount' => $manualOffset,
            'usable_cash_amount' => $usable,
            'amount' => $usable,
            'currency' => 'IDR',
            'record_status' => $usable > 0 ? ($manualOffset > 0 ? 'partially_offset' : 'usable') : 'fully_offset',
            'cash_basis' => 'confirmed_website_payment_net_revenue',
            'notes' => (string) ($row['status'] ?? ''),
        ];
    }

    return $records;
}

function jg_accounting_automatic_cash_records(PDO $pdo, array $filters = []): array
{
    $bounds = jg_accounting_cash_record_bounds($filters);
    $records = array_merge(
        jg_accounting_wallet_cash_records($pdo, $bounds),
        jg_accounting_website_cash_records($pdo, $bounds)
    );
    usort($records, static function (array $left, array $right): int {
        $time = strcmp((string) ($right['occurred_at'] ?? ''), (string) ($left['occurred_at'] ?? ''));
        return $time !== 0 ? $time : strcmp((string) ($right['source_key'] ?? ''), (string) ($left['source_key'] ?? ''));
    });
    return $records;
}

function jg_accounting_automatic_usable_cash_context(PDO $pdo, array $filters = []): array
{
    $records = jg_accounting_automatic_cash_records($pdo, $filters);
    $totals = [
        'wallet_withdrawal' => 0,
        'website_payment' => 0,
    ];
    $gross = 0;
    $manualOffset = 0;
    $sourceOffset = 0;
    $usableCount = 0;
    foreach ($records as $record) {
        $sourceType = (string) ($record['source_type'] ?? '');
        $amount = (int) ($record['usable_cash_amount'] ?? 0);
        if (isset($totals[$sourceType])) {
            $totals[$sourceType] += $amount;
        }
        $recordSourceOffset = (int) ($record['source_offset_amount'] ?? 0);
        $gross += max(0, (int) ($record['gross_amount'] ?? 0) - $recordSourceOffset);
        $manualOffset += (int) ($record['manual_offset_amount'] ?? 0);
        $sourceOffset += $recordSourceOffset;
        if ($amount > 0) {
            $usableCount++;
        }
    }

    return [
        'amount' => (int) array_sum($totals),
        'wallet_withdrawals_to_bank' => $totals['wallet_withdrawal'],
        'website_payments_to_bank' => $totals['website_payment'],
        'gross_source_total' => $gross,
        'manual_offset_total' => $manualOffset,
        'source_offset_total' => $sourceOffset,
        'record_count' => count($records),
        'usable_record_count' => $usableCount,
        'source' => 'automatic_cash_source_records',
        'label' => 'Automatic usable cash',
        'sources' => [
            'wallet_withdrawal' => 'Wallet withdrawals to bank',
            'website_payment' => 'Confirmed website payments',
        ],
    ];
}

function jg_accounting_wallet_usable_cash_context(PDO $pdo, ?string $month = null): array
{
    $records = jg_accounting_wallet_cash_records($pdo, jg_accounting_cash_record_bounds($month !== null ? ['month' => $month] : []));
    $walletWithdrawn = array_sum(array_map(static fn (array $record): int => max(0, (int) ($record['gross_amount'] ?? 0) - (int) ($record['source_offset_amount'] ?? 0)), $records));
    $manualTransfers = array_sum(array_map(static fn (array $record): int => (int) ($record['manual_offset_amount'] ?? 0), $records));
    $lastRecord = $records !== [] ? $records[count($records) - 1] : [];

    return [
        'amount' => array_sum(array_map(static fn (array $record): int => (int) ($record['usable_cash_amount'] ?? 0), $records)),
        'wallet_withdrawn_total' => $walletWithdrawn,
        'manual_marketplace_transfer_total' => $manualTransfers,
        'withdrawal_count' => count($records),
        'manual_transfer_count' => jg_accounting_manual_marketplace_transfer_context($pdo, jg_accounting_cash_record_bounds($month !== null ? ['month' => $month] : []))['count'],
        'last_withdrawn_at' => (string) ($lastRecord['occurred_at'] ?? ''),
        'source' => 'dashboard_wallet_releases',
        'label' => 'Wallet withdrawals to bank',
    ];
}

function jg_accounting_summary(PDO $pdo, string $month): array
{
    jg_accounting_update_overdue_bills($pdo);
    $today = jg_accounting_now()->format('Y-m-d');
    $soon = jg_accounting_now()->modify('+7 days')->format('Y-m-d');
    $balances = jg_accounting_account_balances($pdo);

    $accounts = $pdo->query('SELECT id, type, is_spendable FROM accounting_accounts WHERE is_active = 1')->fetchAll();
    $realCash = 0;
    foreach ($accounts as $account) {
        if ((int) $account['is_spendable'] === 1 && in_array((string) $account['type'], ['bank', 'cash', 'ewallet'], true)) {
            $realCash += (int) ($balances[(int) $account['id']] ?? 0);
        }
    }
    $automaticUsableCash = jg_accounting_automatic_usable_cash_context($pdo);
    $realCash += (int) $automaticUsableCash['amount'];

    $sumBill = static function (PDO $pdo, string $sql, array $params): int {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return (int) round((float) ($stmt->fetchColumn() ?: 0));
    };

    $billsDueSoon = $sumBill(
        $pdo,
        'SELECT COALESCE(SUM(outstanding_amount), 0)
         FROM accounting_bills
         WHERE status IN ("unpaid", "partially_paid", "overdue")
           AND outstanding_amount > 0
           AND due_date BETWEEN :today AND :soon',
        [':today' => $today, ':soon' => $soon]
    );
    $overdueBills = $sumBill(
        $pdo,
        'SELECT COALESCE(SUM(outstanding_amount), 0)
         FROM accounting_bills
         WHERE status IN ("unpaid", "partially_paid", "overdue")
           AND outstanding_amount > 0
           AND due_date < :today',
        [':today' => $today]
    );
    $expenses = $sumBill(
        $pdo,
        'SELECT COALESCE(SUM(amount), 0)
         FROM accounting_transactions
         WHERE status = "posted"
           AND business_month = :month
           AND direction = "money_out"
           AND type IN ("expense", "bill_payment", "refund", "adjustment")',
        [':month' => $month]
    );
    $pendingReview = (int) $pdo->query(
        'SELECT COUNT(*)
         FROM accounting_review_queue
         WHERE status = "open"'
    )->fetchColumn();
    $marketplaceOutstanding = jg_accounting_marketplace_outstanding_context($pdo);
    $safeCash = $realCash - $billsDueSoon - $overdueBills;

    $monthly = jg_accounting_monthly_summary($pdo, $month);

    return [
        'kpis' => [
            'real_cash_available' => $realCash,
            'marketplace_outstanding' => $marketplaceOutstanding['amount'],
            'bills_due_soon' => $billsDueSoon,
            'overdue_bills' => $overdueBills,
            'expenses_this_month' => $expenses,
            'net_safe_cash' => $safeCash,
            'pending_manual_review' => $pendingReview,
        ],
        'marketplace_outstanding_context' => $marketplaceOutstanding,
        'automatic_usable_cash_context' => $automaticUsableCash,
        'wallet_usable_cash_context' => [
            'amount' => (int) $automaticUsableCash['wallet_withdrawals_to_bank'],
            'source' => 'dashboard_wallet_releases',
            'label' => 'Wallet withdrawals to bank',
        ],
        'monthly_summary' => $monthly,
        'category_summary' => jg_accounting_group_summary($pdo, $month, 'category'),
        'vendor_summary' => jg_accounting_group_summary($pdo, $month, 'vendor'),
        'brand_summary' => jg_accounting_group_summary($pdo, $month, 'brand'),
        'channel_summary' => jg_accounting_group_summary($pdo, $month, 'channel'),
        'alerts' => jg_accounting_alerts($pdo, $billsDueSoon, $overdueBills),
    ];
}

function jg_accounting_monthly_summary(PDO $pdo, string $month): array
{
    $stmt = $pdo->prepare(
        'SELECT
            SUM(CASE WHEN status = "posted" AND direction = "money_out" AND type IN ("expense","bill_payment","refund","adjustment") THEN amount ELSE 0 END) AS paid_expenses,
            SUM(CASE WHEN status = "posted" AND type = "manual_income" THEN amount ELSE 0 END) AS manual_income,
            SUM(CASE WHEN status = "posted" AND type = "owner_injection" THEN amount ELSE 0 END) AS owner_injection,
            SUM(CASE WHEN status = "posted" AND type = "owner_draw" THEN amount ELSE 0 END) AS owner_draw,
            SUM(CASE WHEN status = "posted" AND type = "transfer" AND direction = "internal_transfer" THEN amount ELSE 0 END) AS transfers,
            SUM(CASE WHEN status = "posted" THEN transfer_fee_amount ELSE 0 END) AS transfer_fees
         FROM accounting_transactions
         WHERE business_month = :month'
    );
    $stmt->execute([':month' => $month]);
    $tx = $stmt->fetch() ?: [];

    $billStmt = $pdo->prepare(
        'SELECT
            SUM(CASE WHEN status <> "void" THEN total_amount ELSE 0 END) AS bills_created,
            SUM(CASE WHEN status <> "void" THEN paid_amount ELSE 0 END) AS bills_paid,
            SUM(CASE WHEN status IN ("unpaid","partially_paid","overdue") THEN outstanding_amount ELSE 0 END) AS bills_unpaid
         FROM accounting_bills
         WHERE business_month = :month'
    );
    $billStmt->execute([':month' => $month]);
    $bill = $billStmt->fetch() ?: [];

    $paidExpenses = (int) round((float) ($tx['paid_expenses'] ?? 0));
    $manualIncome = (int) round((float) ($tx['manual_income'] ?? 0));
    $ownerInjection = (int) round((float) ($tx['owner_injection'] ?? 0));
    $ownerDraw = (int) round((float) ($tx['owner_draw'] ?? 0));
    $transferFees = (int) round((float) ($tx['transfer_fees'] ?? 0));
    $automaticUsableCash = jg_accounting_automatic_usable_cash_context($pdo, ['month' => $month]);
    $walletWithdrawalsToBank = (int) $automaticUsableCash['wallet_withdrawals_to_bank'];
    $websitePaymentsToBank = (int) $automaticUsableCash['website_payments_to_bank'];
    $automaticCash = (int) $automaticUsableCash['amount'];

    return [
        'sales_revenue_context' => 0,
        'gross_profit_context' => 0,
        'paid_operating_expenses' => $paidExpenses,
        'marketing_expenses' => jg_accounting_category_type_total($pdo, $month, 'marketing'),
        'production_cogs_support_expenses' => jg_accounting_category_type_total($pdo, $month, 'cogs_support'),
        'payroll_labor' => jg_accounting_category_type_total($pdo, $month, 'payroll'),
        'software_admin' => jg_accounting_category_parent_total($pdo, $month, 'software-admin'),
        'owner_draw' => $ownerDraw,
        'owner_injection' => $ownerInjection,
        'manual_income' => $manualIncome,
        'wallet_withdrawals_to_bank' => $walletWithdrawalsToBank,
        'website_payments_to_bank' => $websitePaymentsToBank,
        'automatic_usable_cash' => $automaticCash,
        'automatic_usable_cash_context' => $automaticUsableCash,
        'transfers_in' => (int) round((float) ($tx['transfers'] ?? 0)),
        'transfers_out' => (int) round((float) ($tx['transfers'] ?? 0)),
        'bills_created' => (int) round((float) ($bill['bills_created'] ?? 0)),
        'bills_paid' => (int) round((float) ($bill['bills_paid'] ?? 0)),
        'bills_still_unpaid' => (int) round((float) ($bill['bills_unpaid'] ?? 0)),
        'estimated_net_cash_movement' => $manualIncome + $ownerInjection + $automaticCash - $paidExpenses - $ownerDraw - $transferFees,
    ];
}

/**
 * Cash-basis operating inputs for the executive P&L. Product-purchase categories
 * are reported for reconciliation but deliberately excluded from operating expense;
 * sale-level SKU COGS is supplied by the sales service instead.
 */
function jg_accounting_pnl_summary(PDO $pdo, int $year): array
{
    $year = max(2025, min(2100, $year));
    $stmt = $pdo->prepare(
        'SELECT t.business_month,
            SUM(CASE WHEN t.direction = "money_out" AND t.type <> "refund" AND c.category_key IN ("meta-ads","google-ads","shopee-ads","tiktok-ads") THEN t.amount ELSE 0 END) AS ad_cost,
            SUM(CASE WHEN t.direction = "money_out" AND t.type <> "refund" AND c.type = "marketing" AND c.category_key NOT IN ("meta-ads","google-ads","shopee-ads","tiktok-ads") THEN t.amount ELSE 0 END) AS marketing_other,
            SUM(CASE WHEN t.direction = "money_out" AND t.type <> "refund" AND c.type = "payroll" THEN t.amount ELSE 0 END) AS payroll,
            SUM(CASE WHEN t.direction = "money_out" AND t.type <> "refund" AND c.type IN ("operations","tax","other") THEN t.amount ELSE 0 END) AS operations,
            SUM(CASE WHEN t.direction = "money_out" AND c.type = "cogs_support" THEN t.amount ELSE 0 END) AS product_purchases,
            SUM(CASE WHEN t.direction = "money_out" AND t.type = "refund" THEN t.amount ELSE 0 END) AS manual_refunds,
            SUM(CASE WHEN t.direction = "money_in" AND t.type = "manual_income" THEN t.amount ELSE 0 END) AS other_income,
            SUM(CASE WHEN t.direction = "money_out" AND c.type = "asset" THEN t.amount ELSE 0 END) AS asset_purchases,
            SUM(t.transfer_fee_amount) AS transfer_fees
         FROM accounting_transactions t
         LEFT JOIN accounting_categories c ON c.id = t.category_id
         WHERE t.status = "posted"
           AND t.business_month LIKE :year_prefix
         GROUP BY t.business_month
         ORDER BY t.business_month'
    );
    $stmt->execute([':year_prefix' => $year . '-%']);
    $indexed = [];
    foreach ($stmt->fetchAll() as $row) {
        $indexed[(string) $row['business_month']] = $row;
    }

    $months = [];
    for ($month = 1; $month <= 12; $month++) {
        $key = sprintf('%04d-%02d', $year, $month);
        $row = $indexed[$key] ?? [];
        $adCost = (int) round((float) ($row['ad_cost'] ?? 0));
        $marketingOther = (int) round((float) ($row['marketing_other'] ?? 0));
        $payroll = (int) round((float) ($row['payroll'] ?? 0));
        $operations = (int) round((float) ($row['operations'] ?? 0));
        $transferFees = (int) round((float) ($row['transfer_fees'] ?? 0));
        $months[] = [
            'month' => $month,
            'period_key' => $key,
            'ad_cost' => $adCost,
            'marketing_other' => $marketingOther,
            'marketing' => $adCost + $marketingOther,
            'payroll' => $payroll,
            'operations' => $operations,
            'transfer_fees' => $transferFees,
            'operating_expenses' => $adCost + $marketingOther + $payroll + $operations + $transferFees,
            'manual_refunds' => (int) round((float) ($row['manual_refunds'] ?? 0)),
            'other_income' => (int) round((float) ($row['other_income'] ?? 0)),
            'product_purchases' => (int) round((float) ($row['product_purchases'] ?? 0)),
            'asset_purchases' => (int) round((float) ($row['asset_purchases'] ?? 0)),
        ];
    }

    return [
        'year' => $year,
        'basis' => 'cash_basis_posted_accounting_entries',
        'months' => $months,
        'open_review_items' => (int) $pdo->query('SELECT COUNT(*) FROM accounting_review_queue WHERE status = "open"')->fetchColumn(),
        'notes' => [
            'Product purchases are excluded from operating expenses because the P&L uses sale-level SKU COGS.',
            'Owner movements, loans, transfers, and asset purchases are excluded from net profit.',
        ],
    ];
}

function jg_accounting_category_type_total(PDO $pdo, string $month, string $type): int
{
    $stmt = $pdo->prepare(
        'SELECT COALESCE(SUM(t.amount), 0)
         FROM accounting_transactions t
         INNER JOIN accounting_categories c ON c.id = t.category_id
         WHERE t.status = "posted"
           AND t.direction = "money_out"
           AND t.business_month = :month
           AND c.type = :type'
    );
    $stmt->execute([':month' => $month, ':type' => $type]);
    return (int) round((float) ($stmt->fetchColumn() ?: 0));
}

function jg_accounting_category_parent_total(PDO $pdo, string $month, string $parentKey): int
{
    $stmt = $pdo->prepare(
        'SELECT COALESCE(SUM(t.amount), 0)
         FROM accounting_transactions t
         INNER JOIN accounting_categories c ON c.id = t.category_id
         INNER JOIN accounting_categories p ON p.id = c.parent_id
         WHERE t.status = "posted"
           AND t.direction = "money_out"
           AND t.business_month = :month
           AND p.category_key = :parent_key'
    );
    $stmt->execute([':month' => $month, ':parent_key' => $parentKey]);
    return (int) round((float) ($stmt->fetchColumn() ?: 0));
}

function jg_accounting_group_summary(PDO $pdo, string $month, string $group): array
{
    $select = 'COALESCE(c.name, "Uncategorized") AS label';
    $join = 'LEFT JOIN accounting_categories c ON c.id = t.category_id';
    $groupBy = 'label';
    if ($group === 'vendor') {
        $select = 'COALESCE(cp.name, "No vendor") AS label, MAX(t.transaction_date) AS last_transaction';
        $join = 'LEFT JOIN accounting_counterparties cp ON cp.id = t.counterparty_id';
        $groupBy = 'label';
    } elseif ($group === 'brand') {
        $select = 'COALESCE(NULLIF(t.brand, ""), "General / Shared") AS label';
        $join = '';
    } elseif ($group === 'channel') {
        $select = 'COALESCE(NULLIF(t.channel, ""), "Internal") AS label';
        $join = '';
    }

    $sql = 'SELECT ' . $select . ',
            SUM(CASE WHEN t.status = "posted" AND t.direction = "money_out" THEN t.amount ELSE 0 END) AS this_month
        FROM accounting_transactions t
        ' . $join . '
        WHERE t.business_month = :month
          AND t.status <> "void"
        GROUP BY ' . $groupBy . '
        ORDER BY this_month DESC, label ASC
        LIMIT 12';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':month' => $month]);
    return array_map(static fn (array $row): array => [
        'label' => (string) ($row['label'] ?? '-'),
        'this_month' => (int) round((float) ($row['this_month'] ?? 0)),
        'last_transaction' => $row['last_transaction'] ?? null,
    ], $stmt->fetchAll());
}

function jg_accounting_alerts(PDO $pdo, int $billsDueSoon, int $overdueBills): array
{
    $alerts = [];
    $overdueCount = (int) $pdo->query('SELECT COUNT(*) FROM accounting_bills WHERE status = "overdue" AND outstanding_amount > 0')->fetchColumn();
    if ($overdueCount > 0) {
        $alerts[] = [
            'type' => 'critical',
            'title' => $overdueCount . ' bills overdue',
            'amount' => $overdueBills,
            'action' => 'View overdue',
        ];
    }
    $missingReceipts = (int) $pdo->query('SELECT COUNT(*) FROM accounting_transactions WHERE status <> "void" AND receipt_status = "missing"')->fetchColumn();
    if ($missingReceipts > 0) {
        $alerts[] = [
            'type' => 'warning',
            'title' => $missingReceipts . ' expenses missing receipt',
            'amount' => 0,
            'action' => 'Review',
        ];
    }
    $pending = (int) $pdo->query('SELECT COUNT(*) FROM accounting_review_queue WHERE status = "open"')->fetchColumn();
    if ($pending > 0) {
        $alerts[] = [
            'type' => 'warning',
            'title' => $pending . ' review items open',
            'amount' => 0,
            'action' => 'Open review',
        ];
    }
    if ($billsDueSoon > 0) {
        $alerts[] = [
            'type' => 'info',
            'title' => 'Bills due in 7 days',
            'amount' => $billsDueSoon,
            'action' => 'Plan cash',
        ];
    }
    return $alerts;
}

function jg_accounting_transactions(PDO $pdo, array $filters): array
{
    $where = ['1=1'];
    $params = [];
    $month = jg_accounting_month($filters['month'] ?? null);
    $transactionId = (int) ($filters['transaction_id'] ?? $filters['id'] ?? 0);
    if ($transactionId > 0) {
        $where[] = 't.id = :transaction_id';
        $params[':transaction_id'] = $transactionId;
    } elseif (empty($filters['date_from']) && empty($filters['date_to'])) {
        $where[] = 't.business_month = :month';
        $params[':month'] = $month;
    }
    foreach (['type', 'status', 'brand', 'channel', 'review_status'] as $key) {
        $value = jg_accounting_text($filters[$key] ?? '', 80);
        if ($value !== '') {
            $where[] = 't.' . $key . ' = :' . $key;
            $params[':' . $key] = $value;
        }
    }
    foreach (['account_id', 'category_id', 'counterparty_id'] as $key) {
        $value = (int) ($filters[$key] ?? 0);
        if ($value > 0) {
            $where[] = 't.' . $key . ' = :' . $key;
            $params[':' . $key] = $value;
        }
    }
    $dateFrom = trim((string) ($filters['date_from'] ?? ''));
    if ($dateFrom !== '') {
        $where[] = 't.transaction_date >= :date_from';
        $params[':date_from'] = jg_accounting_date($dateFrom, 'date_from');
    }
    $dateTo = trim((string) ($filters['date_to'] ?? ''));
    if ($dateTo !== '') {
        $where[] = 't.transaction_date <= :date_to';
        $params[':date_to'] = jg_accounting_date($dateTo, 'date_to');
    }
    if (!jg_accounting_bool($filters['include_voided'] ?? false)) {
        $where[] = 't.status <> "void"';
    }
    $search = jg_accounting_text($filters['search'] ?? '', 120);
    if ($search !== '') {
        $where[] = '(t.transaction_key LIKE :search OR t.reference_no LIKE :search OR t.invoice_no LIKE :search OR t.order_no LIKE :search OR t.notes LIKE :search OR cp.name LIKE :search)';
        $params[':search'] = '%' . $search . '%';
    }
    if (jg_accounting_bool($filters['missing_receipt'] ?? false)) {
        $where[] = 't.receipt_status = "missing"';
    }

    $page = max(1, (int) ($filters['page'] ?? 1));
    $maxLimit = !empty($filters['_export']) ? 5000 : 200;
    $limit = max(10, min($maxLimit, (int) ($filters['limit'] ?? 80)));
    $offset = ($page - 1) * $limit;

    $sql = 'SELECT t.*, a.name AS account_name, ta.name AS to_account_name, c.name AS category_name,
                cp.name AS counterparty_name, b.bill_no
            FROM accounting_transactions t
            LEFT JOIN accounting_accounts a ON a.id = t.account_id
            LEFT JOIN accounting_accounts ta ON ta.id = t.to_account_id
            LEFT JOIN accounting_categories c ON c.id = t.category_id
            LEFT JOIN accounting_counterparties cp ON cp.id = t.counterparty_id
            LEFT JOIN accounting_bills b ON b.id = t.bill_id
            WHERE ' . implode(' AND ', $where) . '
            ORDER BY t.transaction_date DESC, t.id DESC
            LIMIT ' . $limit . ' OFFSET ' . $offset;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    return array_map(static fn (array $row): array => [
        'id' => (int) $row['id'],
        'transaction_key' => (string) $row['transaction_key'],
        'transaction_date' => (string) $row['transaction_date'],
        'business_month' => (string) $row['business_month'],
        'type' => (string) $row['type'],
        'direction' => (string) $row['direction'],
        'status' => (string) $row['status'],
        'account_id' => $row['account_id'] === null ? null : (int) $row['account_id'],
        'to_account_id' => $row['to_account_id'] === null ? null : (int) $row['to_account_id'],
        'counterparty_id' => $row['counterparty_id'] === null ? null : (int) $row['counterparty_id'],
        'category_id' => $row['category_id'] === null ? null : (int) $row['category_id'],
        'account_name' => $row['account_name'],
        'to_account_name' => $row['to_account_name'],
        'counterparty_name' => $row['counterparty_name'],
        'category_name' => $row['category_name'],
        'brand' => $row['brand'],
        'channel' => $row['channel'],
        'amount' => (int) $row['amount'],
        'transfer_fee_amount' => (int) $row['transfer_fee_amount'],
        'payment_method' => $row['payment_method'],
        'reference_no' => $row['reference_no'],
        'invoice_no' => $row['invoice_no'],
        'order_no' => $row['order_no'],
        'receipt_status' => (string) $row['receipt_status'],
        'receipt_url' => $row['receipt_url'],
        'review_status' => (string) $row['review_status'],
        'review_reason' => $row['review_reason'],
        'bill_id' => $row['bill_id'] === null ? null : (int) $row['bill_id'],
        'bill_no' => $row['bill_no'],
        'notes' => $row['notes'],
        'created_at' => (string) $row['created_at'],
    ], $stmt->fetchAll());
}

function jg_accounting_bills(PDO $pdo, array $filters): array
{
    jg_accounting_update_overdue_bills($pdo);
    $where = ['1=1'];
    $params = [];
    $month = jg_accounting_month($filters['month'] ?? null);
    $requestedStatus = jg_accounting_text($filters['status'] ?? '', 40);
    $billId = (int) ($filters['bill_id'] ?? $filters['id'] ?? 0);
    if ($billId > 0) {
        $where[] = 'b.id = :bill_id';
        $params[':bill_id'] = $billId;
    } elseif (empty($filters['due_from']) && empty($filters['due_to']) && $requestedStatus !== 'open') {
        $where[] = 'b.business_month = :month';
        $params[':month'] = $month;
    }
    $status = $requestedStatus;
    if ($status !== '') {
        if ($status === 'open') {
            $where[] = 'b.status IN ("unpaid","partially_paid","overdue")';
        } else {
            $where[] = 'b.status = :status';
            $params[':status'] = $status;
        }
    }
    foreach (['brand', 'channel'] as $key) {
        $value = jg_accounting_text($filters[$key] ?? '', 80);
        if ($value !== '') {
            $where[] = 'b.' . $key . ' = :' . $key;
            $params[':' . $key] = $value;
        }
    }
    foreach (['vendor_id', 'category_id'] as $key) {
        $value = (int) ($filters[$key] ?? 0);
        if ($value > 0) {
            $column = $key === 'vendor_id' ? 'vendor_id' : 'category_id';
            $where[] = 'b.' . $column . ' = :' . $key;
            $params[':' . $key] = $value;
        }
    }
    $dueFrom = trim((string) ($filters['due_from'] ?? ''));
    if ($dueFrom !== '') {
        $where[] = 'b.due_date >= :due_from';
        $params[':due_from'] = jg_accounting_date($dueFrom, 'due_from');
    }
    $dueTo = trim((string) ($filters['due_to'] ?? ''));
    if ($dueTo !== '') {
        $where[] = 'b.due_date <= :due_to';
        $params[':due_to'] = jg_accounting_date($dueTo, 'due_to');
    }
    $search = jg_accounting_text($filters['search'] ?? '', 120);
    if ($search !== '') {
        $where[] = '(b.bill_key LIKE :search OR b.bill_no LIKE :search OR b.notes LIKE :search OR cp.name LIKE :search)';
        $params[':search'] = '%' . $search . '%';
    }

    $page = max(1, (int) ($filters['page'] ?? 1));
    $limit = max(10, min(200, (int) ($filters['limit'] ?? 80)));
    $offset = ($page - 1) * $limit;

    $stmt = $pdo->prepare(
        'SELECT b.*, cp.name AS vendor_name, c.name AS category_name, a.name AS expected_account_name
         FROM accounting_bills b
         LEFT JOIN accounting_counterparties cp ON cp.id = b.vendor_id
         LEFT JOIN accounting_categories c ON c.id = b.category_id
         LEFT JOIN accounting_accounts a ON a.id = b.expected_account_id
         WHERE ' . implode(' AND ', $where) . '
         ORDER BY
            CASE WHEN b.status = "overdue" THEN 0 WHEN b.status IN ("unpaid", "partially_paid") THEN 1 ELSE 2 END,
            b.due_date IS NULL,
            b.due_date ASC,
            b.id DESC
         LIMIT ' . $limit . ' OFFSET ' . $offset
    );
    $stmt->execute($params);
    $today = jg_accounting_now()->format('Y-m-d');

    return array_map(static fn (array $row): array => [
        'id' => (int) $row['id'],
        'bill_key' => (string) $row['bill_key'],
        'bill_no' => $row['bill_no'],
        'vendor_id' => $row['vendor_id'] === null ? null : (int) $row['vendor_id'],
        'vendor_name' => (string) ($row['vendor_name'] ?? ''),
        'issue_date' => (string) $row['issue_date'],
        'due_date' => $row['due_date'],
        'business_month' => (string) $row['business_month'],
        'category_name' => $row['category_name'],
        'category_id' => $row['category_id'] === null ? null : (int) $row['category_id'],
        'expected_account_id' => $row['expected_account_id'] === null ? null : (int) $row['expected_account_id'],
        'brand' => $row['brand'],
        'channel' => $row['channel'],
        'total_amount' => (int) $row['total_amount'],
        'paid_amount' => (int) $row['paid_amount'],
        'outstanding_amount' => (int) $row['outstanding_amount'],
        'status' => (string) $row['status'],
        'age_days' => $row['due_date'] ? max(0, (int) floor((strtotime($today) - strtotime((string) $row['due_date'])) / 86400)) : 0,
        'attachment_url' => $row['attachment_url'],
        'receipt_status' => (string) $row['receipt_status'],
        'notes' => $row['notes'],
        'created_at' => (string) $row['created_at'],
    ], $stmt->fetchAll());
}

function jg_accounting_review_queue(PDO $pdo): array
{
    $rows = $pdo->query(
        'SELECT rq.*
         FROM accounting_review_queue rq
         WHERE rq.status = "open"
         ORDER BY FIELD(rq.severity, "critical", "warning", "info"), rq.created_at DESC
         LIMIT 80'
    )->fetchAll();
    return array_map(static fn (array $row): array => [
        'id' => (int) $row['id'],
        'entity_type' => (string) $row['entity_type'],
        'entity_id' => (int) $row['entity_id'],
        'severity' => (string) $row['severity'],
        'issue_key' => (string) $row['issue_key'],
        'issue_message' => (string) $row['issue_message'],
        'suggested_action' => $row['suggested_action'],
        'created_at' => (string) $row['created_at'],
    ], $rows);
}

function jg_accounting_create_transaction(PDO $pdo, array $body): array
{
    $date = jg_accounting_date($body['transaction_date'] ?? $body['date'] ?? null, 'transaction_date', jg_accounting_now()->format('Y-m-d'));
    $type = jg_accounting_text($body['type'] ?? 'expense', 40);
    $allowedTypes = ['expense','bill_payment','transfer','manual_income','loan_received','owner_draw','owner_injection','refund','adjustment','opening_balance'];
    if (!in_array($type, $allowedTypes, true)) {
        jg_accounting_error('Invalid transaction type.', 422, 'type');
    }
    $direction = jg_accounting_text($body['direction'] ?? '', 40);
    if ($direction === '') {
        $direction = match ($type) {
            'manual_income', 'loan_received', 'owner_injection', 'opening_balance' => 'money_in',
            'transfer' => 'internal_transfer',
            default => 'money_out',
        };
    }
    if (!in_array($direction, ['money_out','money_in','internal_transfer'], true)) {
        jg_accounting_error('Invalid direction.', 422, 'direction');
    }

    $amount = jg_accounting_amount($body['amount'] ?? null);
    $accountId = (int) ($body['account_id'] ?? $body['paid_from_account_id'] ?? 0);
    $toAccountId = (int) ($body['to_account_id'] ?? 0);
    if ($accountId <= 0) {
        jg_accounting_error('Choose which account paid this.', 422, 'account_id');
    }
    if ($type === 'transfer') {
        if ($toAccountId <= 0) {
            jg_accounting_error('Choose the destination account.', 422, 'to_account_id');
        }
        if ($toAccountId === $accountId) {
            jg_accounting_error('From account and To account cannot be same.', 422, 'to_account_id');
        }
    }

    $categoryId = (int) ($body['category_id'] ?? 0);
    if ($type !== 'transfer' && $categoryId <= 0) {
        jg_accounting_error('Choose a category so reports stay clean.', 422, 'category_id');
    }

    $counterpartyType = $direction === 'money_in' ? 'customer' : 'supplier';
    if ($type === 'owner_injection' || $type === 'owner_draw') {
        $counterpartyType = 'owner';
    } elseif ($type === 'transfer') {
        $counterpartyType = 'bank';
    }
    $counterpartyId = jg_accounting_get_counterparty(
        $pdo,
        $body['counterparty_id'] ?? null,
        (string) ($body['counterparty_name'] ?? $body['vendor_name'] ?? $body['source_name'] ?? ''),
        $counterpartyType
    );

    $receiptUrl = jg_accounting_long_text($body['receipt_url'] ?? $body['attachment_url'] ?? '', 1000);
    $receiptStatus = jg_accounting_text($body['receipt_status'] ?? ($receiptUrl !== '' ? 'attached' : 'missing'), 24);
    if (!in_array($receiptStatus, ['missing', 'attached', 'not_required'], true)) {
        $receiptStatus = $receiptUrl !== '' ? 'attached' : 'missing';
    }
    if ($receiptUrl !== '') {
        $receiptStatus = 'attached';
    }

    $status = jg_accounting_text($body['status'] ?? 'posted', 24);
    if (!in_array($status, ['draft', 'posted', 'pending_review'], true)) {
        $status = 'posted';
    }

    $payload = [
        ':transaction_key' => jg_accounting_key('txn'),
        ':transaction_date' => $date,
        ':business_month' => jg_accounting_business_month($date),
        ':type' => $type,
        ':direction' => $direction,
        ':status' => $status,
        ':account_id' => $accountId,
        ':to_account_id' => $toAccountId > 0 ? $toAccountId : null,
        ':counterparty_id' => $counterpartyId,
        ':category_id' => $categoryId > 0 ? $categoryId : null,
        ':bill_id' => (int) ($body['bill_id'] ?? 0) > 0 ? (int) $body['bill_id'] : null,
        ':brand' => jg_accounting_text($body['brand'] ?? '', 80),
        ':channel' => jg_accounting_text($body['channel'] ?? '', 80),
        ':amount' => $amount,
        ':transfer_fee_amount' => jg_accounting_optional_amount($body['transfer_fee_amount'] ?? 0),
        ':payment_method' => jg_accounting_text($body['payment_method'] ?? '', 80),
        ':reference_no' => jg_accounting_text($body['reference_no'] ?? '', 160),
        ':invoice_no' => jg_accounting_text($body['invoice_no'] ?? '', 160),
        ':order_no' => jg_accounting_text($body['order_no'] ?? '', 160),
        ':receipt_url' => $receiptUrl,
        ':receipt_status' => $receiptStatus,
        ':description' => jg_accounting_long_text($body['description'] ?? '', 1000),
        ':notes' => jg_accounting_long_text($body['notes'] ?? '', 2000),
    ];

    $stmt = $pdo->prepare(
        'INSERT INTO accounting_transactions
            (transaction_key, transaction_date, business_month, type, direction, status, account_id, to_account_id,
             counterparty_id, category_id, bill_id, brand, channel, amount, transfer_fee_amount, currency, payment_method,
             reference_no, invoice_no, order_no, receipt_url, receipt_status, description, notes, review_status, created_by, created_at)
         VALUES
            (:transaction_key, :transaction_date, :business_month, :type, :direction, :status, :account_id, :to_account_id,
             :counterparty_id, :category_id, :bill_id, :brand, :channel, :amount, :transfer_fee_amount, "IDR", :payment_method,
             :reference_no, :invoice_no, :order_no, :receipt_url, :receipt_status, :description, :notes, "clean", NULL, UTC_TIMESTAMP())'
    );
    $stmt->execute($payload);
    $id = (int) $pdo->lastInsertId();
    jg_accounting_insert_audit($pdo, 'transaction', $id, 'create', null, $payload);
    jg_accounting_review_transaction($pdo, $id);

    return ['id' => $id, 'transaction_key' => $payload[':transaction_key']];
}

function jg_accounting_create_bill(PDO $pdo, array $body): array
{
    $issueDate = jg_accounting_date($body['issue_date'] ?? $body['bill_date'] ?? null, 'issue_date', jg_accounting_now()->format('Y-m-d'));
    $dueDateRaw = trim((string) ($body['due_date'] ?? ''));
    $dueDate = $dueDateRaw === '' ? null : jg_accounting_date($dueDateRaw, 'due_date');
    $amount = jg_accounting_amount($body['total_amount'] ?? $body['amount'] ?? null, 'total_amount');
    $vendorId = jg_accounting_get_counterparty(
        $pdo,
        $body['vendor_id'] ?? null,
        (string) ($body['vendor_name'] ?? $body['counterparty_name'] ?? ''),
        'supplier'
    );
    if (!$vendorId) {
        jg_accounting_error('Vendor is required.', 422, 'vendor_id');
    }
    $categoryId = (int) ($body['category_id'] ?? 0);
    if ($categoryId <= 0) {
        jg_accounting_error('Choose a category so reports stay clean.', 422, 'category_id');
    }

    $attachmentUrl = jg_accounting_long_text($body['attachment_url'] ?? $body['receipt_url'] ?? '', 1000);
    $receiptStatus = $attachmentUrl !== '' ? 'attached' : jg_accounting_text($body['receipt_status'] ?? 'missing', 24);
    if (!in_array($receiptStatus, ['missing', 'attached', 'not_required'], true)) {
        $receiptStatus = 'missing';
    }
    $status = jg_accounting_status_from_bill((string) $dueDate, $amount);
    $payload = [
        ':bill_key' => jg_accounting_key('bill'),
        ':bill_no' => jg_accounting_text($body['bill_no'] ?? $body['invoice_no'] ?? '', 120),
        ':vendor_id' => $vendorId,
        ':issue_date' => $issueDate,
        ':due_date' => $dueDate,
        ':business_month' => jg_accounting_business_month($issueDate),
        ':category_id' => $categoryId,
        ':brand' => jg_accounting_text($body['brand'] ?? '', 80),
        ':channel' => jg_accounting_text($body['channel'] ?? '', 80),
        ':total_amount' => $amount,
        ':paid_amount' => 0,
        ':outstanding_amount' => $amount,
        ':status' => $status,
        ':expected_account_id' => (int) ($body['expected_account_id'] ?? 0) > 0 ? (int) $body['expected_account_id'] : null,
        ':attachment_url' => $attachmentUrl,
        ':receipt_status' => $receiptStatus,
        ':notes' => jg_accounting_long_text($body['notes'] ?? '', 2000),
    ];

    $stmt = $pdo->prepare(
        'INSERT INTO accounting_bills
            (bill_key, bill_no, vendor_id, issue_date, due_date, business_month, category_id, brand, channel,
             total_amount, paid_amount, outstanding_amount, status, expected_account_id, attachment_url, receipt_status,
             notes, created_by, created_at)
         VALUES
            (:bill_key, :bill_no, :vendor_id, :issue_date, :due_date, :business_month, :category_id, :brand, :channel,
             :total_amount, :paid_amount, :outstanding_amount, :status, :expected_account_id, :attachment_url, :receipt_status,
             :notes, NULL, UTC_TIMESTAMP())'
    );
    $stmt->execute($payload);
    $id = (int) $pdo->lastInsertId();
    jg_accounting_insert_audit($pdo, 'bill', $id, 'create', null, $payload);
    jg_accounting_review_bill($pdo, $id);

    return ['id' => $id, 'bill_key' => $payload[':bill_key']];
}

function jg_accounting_mark_bill_paid(PDO $pdo, array $body): array
{
    $billId = (int) ($body['bill_id'] ?? 0);
    if ($billId <= 0) {
        jg_accounting_error('Choose a bill.', 422, 'bill_id');
    }
    $paymentDate = jg_accounting_date($body['payment_date'] ?? null, 'payment_date', jg_accounting_now()->format('Y-m-d'));
    $amount = jg_accounting_amount($body['amount'] ?? null);
    $accountId = (int) ($body['account_id'] ?? 0);
    if ($accountId <= 0) {
        jg_accounting_error('Choose which account paid this.', 422, 'account_id');
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('SELECT * FROM accounting_bills WHERE id = :id FOR UPDATE');
        $stmt->execute([':id' => $billId]);
        $bill = $stmt->fetch();
        if (!is_array($bill) || (string) $bill['status'] === 'void') {
            throw new RuntimeException('Bill not found.');
        }
        $outstanding = (int) $bill['outstanding_amount'];
        if ($amount > $outstanding) {
            throw new InvalidArgumentException('Payment amount is larger than outstanding bill.');
        }

        $transaction = jg_accounting_create_transaction($pdo, [
            'transaction_date' => $paymentDate,
            'type' => 'bill_payment',
            'direction' => 'money_out',
            'account_id' => $accountId,
            'counterparty_id' => (int) $bill['vendor_id'],
            'category_id' => (int) $bill['category_id'],
            'bill_id' => $billId,
            'brand' => (string) ($bill['brand'] ?? ''),
            'channel' => (string) ($bill['channel'] ?? ''),
            'amount' => $amount,
            'payment_method' => $body['payment_method'] ?? '',
            'reference_no' => $body['reference_no'] ?? '',
            'receipt_url' => $body['receipt_url'] ?? '',
            'receipt_status' => ($body['receipt_url'] ?? '') !== '' ? 'attached' : 'missing',
            'notes' => $body['notes'] ?? '',
        ]);
        $transactionId = (int) $transaction['id'];

        $paymentStmt = $pdo->prepare(
            'INSERT INTO accounting_bill_payments
                (bill_id, transaction_id, payment_date, amount, account_id, payment_method, reference_no, notes, created_by, created_at)
             VALUES
                (:bill_id, :transaction_id, :payment_date, :amount, :account_id, :payment_method, :reference_no, :notes, NULL, UTC_TIMESTAMP())'
        );
        $paymentStmt->execute([
            ':bill_id' => $billId,
            ':transaction_id' => $transactionId,
            ':payment_date' => $paymentDate,
            ':amount' => $amount,
            ':account_id' => $accountId,
            ':payment_method' => jg_accounting_text($body['payment_method'] ?? '', 80),
            ':reference_no' => jg_accounting_text($body['reference_no'] ?? '', 160),
            ':notes' => jg_accounting_long_text($body['notes'] ?? '', 2000),
        ]);

        $newPaid = (int) $bill['paid_amount'] + $amount;
        $newOutstanding = max(0, (int) $bill['total_amount'] - $newPaid);
        $newStatus = $newOutstanding <= 0 ? 'paid' : 'partially_paid';
        if ($newStatus !== 'paid' && (string) ($bill['due_date'] ?? '') !== '' && (string) $bill['due_date'] < jg_accounting_now()->format('Y-m-d')) {
            $newStatus = 'overdue';
        }
        $update = $pdo->prepare(
            'UPDATE accounting_bills
             SET paid_amount = :paid_amount,
                 outstanding_amount = :outstanding_amount,
                 status = :status
             WHERE id = :id'
        );
        $update->execute([
            ':paid_amount' => $newPaid,
            ':outstanding_amount' => $newOutstanding,
            ':status' => $newStatus,
            ':id' => $billId,
        ]);
        jg_accounting_insert_audit($pdo, 'bill', $billId, 'pay', $bill, [
            'paid_amount' => $newPaid,
            'outstanding_amount' => $newOutstanding,
            'status' => $newStatus,
            'transaction_id' => $transactionId,
        ]);
        $pdo->commit();
        return ['bill_id' => $billId, 'transaction_id' => $transactionId, 'status' => $newStatus];
    } catch (InvalidArgumentException $error) {
        $pdo->rollBack();
        jg_accounting_error($error->getMessage(), 422, 'amount');
    } catch (Throwable $error) {
        $pdo->rollBack();
        jg_accounting_error($error->getMessage(), 500);
    }
}

function jg_accounting_void_transaction(PDO $pdo, array $body): array
{
    $id = (int) ($body['transaction_id'] ?? $body['id'] ?? 0);
    $reason = jg_accounting_long_text($body['void_reason'] ?? '', 1000);
    if ($id <= 0) {
        jg_accounting_error('Transaction is required.', 422, 'transaction_id');
    }
    if ($reason === '') {
        jg_accounting_error('Void reason is required.', 422, 'void_reason');
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('SELECT * FROM accounting_transactions WHERE id = :id FOR UPDATE');
        $stmt->execute([':id' => $id]);
        $tx = $stmt->fetch();
        if (!is_array($tx)) {
            throw new RuntimeException('Transaction not found.');
        }
        if ((string) $tx['status'] === 'void') {
            throw new RuntimeException('Transaction is already void.');
        }
        $update = $pdo->prepare('UPDATE accounting_transactions SET status = "void", voided_at = UTC_TIMESTAMP(), void_reason = :reason WHERE id = :id');
        $update->execute([':reason' => $reason, ':id' => $id]);

        if ((string) $tx['type'] === 'bill_payment' && (int) ($tx['bill_id'] ?? 0) > 0) {
            $payment = $pdo->prepare('SELECT * FROM accounting_bill_payments WHERE transaction_id = :transaction_id LIMIT 1');
            $payment->execute([':transaction_id' => $id]);
            $paymentRow = $payment->fetch();
            $amount = is_array($paymentRow) ? (int) $paymentRow['amount'] : (int) $tx['amount'];
            $billStmt = $pdo->prepare('SELECT * FROM accounting_bills WHERE id = :id FOR UPDATE');
            $billStmt->execute([':id' => (int) $tx['bill_id']]);
            $bill = $billStmt->fetch();
            if (is_array($bill)) {
                $paid = max(0, (int) $bill['paid_amount'] - $amount);
                $outstanding = max(0, (int) $bill['total_amount'] - $paid);
                $status = $outstanding <= 0 ? 'paid' : ($paid > 0 ? 'partially_paid' : 'unpaid');
                if ($status !== 'paid' && (string) ($bill['due_date'] ?? '') !== '' && (string) $bill['due_date'] < jg_accounting_now()->format('Y-m-d')) {
                    $status = 'overdue';
                }
                $billUpdate = $pdo->prepare('UPDATE accounting_bills SET paid_amount = :paid, outstanding_amount = :outstanding, status = :status WHERE id = :id');
                $billUpdate->execute([
                    ':paid' => $paid,
                    ':outstanding' => $outstanding,
                    ':status' => $status,
                    ':id' => (int) $bill['id'],
                ]);
                jg_accounting_insert_audit($pdo, 'bill', (int) $bill['id'], 'reverse_payment', $bill, [
                    'voided_transaction_id' => $id,
                    'paid_amount' => $paid,
                    'outstanding_amount' => $outstanding,
                    'status' => $status,
                ]);
            }
        }

        jg_accounting_insert_audit($pdo, 'transaction', $id, 'void', $tx, ['void_reason' => $reason]);
        $pdo->commit();
        return ['transaction_id' => $id, 'status' => 'void'];
    } catch (Throwable $error) {
        $pdo->rollBack();
        jg_accounting_error($error->getMessage(), 500);
    }
}

function jg_accounting_void_bill(PDO $pdo, array $body): array
{
    $id = (int) ($body['bill_id'] ?? $body['id'] ?? 0);
    $reason = jg_accounting_long_text($body['void_reason'] ?? '', 1000);
    if ($id <= 0) {
        jg_accounting_error('Bill is required.', 422, 'bill_id');
    }
    if ($reason === '') {
        jg_accounting_error('Void reason is required.', 422, 'void_reason');
    }
    $stmt = $pdo->prepare('SELECT * FROM accounting_bills WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $id]);
    $bill = $stmt->fetch();
    if (!is_array($bill)) {
        jg_accounting_error('Bill not found.', 404);
    }
    if ((int) ($bill['paid_amount'] ?? 0) > 0) {
        jg_accounting_error('Cannot void a bill with payments. Void the payment first.', 422);
    }
    $update = $pdo->prepare('UPDATE accounting_bills SET status = "void", voided_at = UTC_TIMESTAMP(), void_reason = :reason WHERE id = :id');
    $update->execute([':reason' => $reason, ':id' => $id]);
    jg_accounting_insert_audit($pdo, 'bill', $id, 'void', $bill, ['void_reason' => $reason]);
    return ['bill_id' => $id, 'status' => 'void'];
}

function jg_accounting_update_transaction(PDO $pdo, array $body): array
{
    $id = (int) ($body['transaction_id'] ?? $body['id'] ?? 0);
    if ($id <= 0) {
        jg_accounting_error('Transaction is required.', 422, 'transaction_id');
    }
    $stmt = $pdo->prepare('SELECT * FROM accounting_transactions WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $id]);
    $old = $stmt->fetch();
    if (!is_array($old)) {
        jg_accounting_error('Transaction not found.', 404);
    }
    if ((string) $old['status'] === 'void') {
        jg_accounting_error('Cannot edit a voided transaction.', 422);
    }

    $date = array_key_exists('transaction_date', $body)
        ? jg_accounting_date($body['transaction_date'], 'transaction_date')
        : (string) $old['transaction_date'];
    $amount = array_key_exists('amount', $body)
        ? jg_accounting_amount($body['amount'])
        : (int) $old['amount'];
    $type = jg_accounting_text($body['type'] ?? $old['type'], 40);
    if (!in_array($type, ['expense','bill_payment','transfer','manual_income','loan_received','owner_draw','owner_injection','refund','adjustment','opening_balance','void'], true)) {
        jg_accounting_error('Invalid transaction type.', 422, 'type');
    }
    $direction = jg_accounting_text($body['direction'] ?? $old['direction'], 40);
    if (!in_array($direction, ['money_out','money_in','internal_transfer'], true)) {
        jg_accounting_error('Invalid direction.', 422, 'direction');
    }
    $counterpartyId = jg_accounting_get_counterparty(
        $pdo,
        $body['counterparty_id'] ?? $old['counterparty_id'],
        (string) ($body['counterparty_name'] ?? ''),
        $direction === 'money_in' ? 'customer' : 'supplier'
    );
    $new = [
        ':id' => $id,
        ':transaction_date' => $date,
        ':business_month' => jg_accounting_business_month($date),
        ':type' => $type,
        ':direction' => $direction,
        ':account_id' => (int) ($body['account_id'] ?? $old['account_id']) ?: null,
        ':to_account_id' => (int) ($body['to_account_id'] ?? $old['to_account_id']) ?: null,
        ':counterparty_id' => $counterpartyId,
        ':category_id' => (int) ($body['category_id'] ?? $old['category_id']) ?: null,
        ':brand' => jg_accounting_text($body['brand'] ?? $old['brand'], 80),
        ':channel' => jg_accounting_text($body['channel'] ?? $old['channel'], 80),
        ':amount' => $amount,
        ':transfer_fee_amount' => array_key_exists('transfer_fee_amount', $body)
            ? jg_accounting_optional_amount($body['transfer_fee_amount'])
            : (int) $old['transfer_fee_amount'],
        ':payment_method' => jg_accounting_text($body['payment_method'] ?? $old['payment_method'], 80),
        ':reference_no' => jg_accounting_text($body['reference_no'] ?? $old['reference_no'], 160),
        ':invoice_no' => jg_accounting_text($body['invoice_no'] ?? $old['invoice_no'], 160),
        ':order_no' => jg_accounting_text($body['order_no'] ?? $old['order_no'], 160),
        ':receipt_url' => jg_accounting_long_text($body['receipt_url'] ?? $old['receipt_url'], 1000),
        ':receipt_status' => jg_accounting_text($body['receipt_status'] ?? $old['receipt_status'], 24),
        ':description' => jg_accounting_long_text($body['description'] ?? $old['description'], 1000),
        ':notes' => jg_accounting_long_text($body['notes'] ?? $old['notes'], 2000),
    ];
    if (!in_array($new[':receipt_status'], ['missing', 'attached', 'not_required'], true)) {
        $new[':receipt_status'] = $new[':receipt_url'] !== '' ? 'attached' : 'missing';
    }

    $update = $pdo->prepare(
        'UPDATE accounting_transactions
         SET transaction_date = :transaction_date,
             business_month = :business_month,
             type = :type,
             direction = :direction,
             account_id = :account_id,
             to_account_id = :to_account_id,
             counterparty_id = :counterparty_id,
             category_id = :category_id,
             brand = :brand,
             channel = :channel,
             amount = :amount,
             transfer_fee_amount = :transfer_fee_amount,
             payment_method = :payment_method,
             reference_no = :reference_no,
             invoice_no = :invoice_no,
             order_no = :order_no,
             receipt_url = :receipt_url,
             receipt_status = :receipt_status,
             description = :description,
             notes = :notes,
             review_status = "clean",
             review_reason = NULL
         WHERE id = :id'
    );
    $update->execute($new);
    jg_accounting_insert_audit($pdo, 'transaction', $id, 'update', $old, $new);
    jg_accounting_review_transaction($pdo, $id);
    return ['transaction_id' => $id, 'status' => 'updated'];
}

function jg_accounting_update_bill(PDO $pdo, array $body): array
{
    $id = (int) ($body['bill_id'] ?? $body['id'] ?? 0);
    if ($id <= 0) {
        jg_accounting_error('Bill is required.', 422, 'bill_id');
    }
    $stmt = $pdo->prepare('SELECT * FROM accounting_bills WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $id]);
    $old = $stmt->fetch();
    if (!is_array($old)) {
        jg_accounting_error('Bill not found.', 404);
    }
    if ((string) $old['status'] === 'void') {
        jg_accounting_error('Cannot edit a voided bill.', 422);
    }
    $total = array_key_exists('total_amount', $body)
        ? jg_accounting_amount($body['total_amount'], 'total_amount')
        : (int) $old['total_amount'];
    if ((int) $old['paid_amount'] > 0 && $total !== (int) $old['total_amount']) {
        jg_accounting_error('Cannot change amount on a paid bill without admin override.', 422, 'total_amount');
    }
    $issueDate = array_key_exists('issue_date', $body)
        ? jg_accounting_date($body['issue_date'], 'issue_date')
        : (string) $old['issue_date'];
    $dueDate = array_key_exists('due_date', $body)
        ? (trim((string) $body['due_date']) === '' ? null : jg_accounting_date($body['due_date'], 'due_date'))
        : $old['due_date'];
    $vendorId = jg_accounting_get_counterparty(
        $pdo,
        $body['vendor_id'] ?? $old['vendor_id'],
        (string) ($body['vendor_name'] ?? ''),
        'supplier'
    );
    $paid = (int) $old['paid_amount'];
    $outstanding = max(0, $total - $paid);
    $status = $outstanding <= 0 ? 'paid' : ($paid > 0 ? 'partially_paid' : 'unpaid');
    if ($status !== 'paid' && $dueDate !== null && (string) $dueDate < jg_accounting_now()->format('Y-m-d')) {
        $status = 'overdue';
    }
    $new = [
        ':id' => $id,
        ':bill_no' => jg_accounting_text($body['bill_no'] ?? $old['bill_no'], 120),
        ':vendor_id' => $vendorId ?: (int) $old['vendor_id'],
        ':issue_date' => $issueDate,
        ':due_date' => $dueDate,
        ':business_month' => jg_accounting_business_month($issueDate),
        ':category_id' => (int) ($body['category_id'] ?? $old['category_id']) ?: null,
        ':brand' => jg_accounting_text($body['brand'] ?? $old['brand'], 80),
        ':channel' => jg_accounting_text($body['channel'] ?? $old['channel'], 80),
        ':total_amount' => $total,
        ':outstanding_amount' => $outstanding,
        ':status' => $status,
        ':expected_account_id' => (int) ($body['expected_account_id'] ?? $old['expected_account_id']) ?: null,
        ':attachment_url' => jg_accounting_long_text($body['attachment_url'] ?? $old['attachment_url'], 1000),
        ':receipt_status' => jg_accounting_text($body['receipt_status'] ?? $old['receipt_status'], 24),
        ':notes' => jg_accounting_long_text($body['notes'] ?? $old['notes'], 2000),
    ];
    if (!in_array($new[':receipt_status'], ['missing', 'attached', 'not_required'], true)) {
        $new[':receipt_status'] = $new[':attachment_url'] !== '' ? 'attached' : 'missing';
    }
    $update = $pdo->prepare(
        'UPDATE accounting_bills
         SET bill_no = :bill_no,
             vendor_id = :vendor_id,
             issue_date = :issue_date,
             due_date = :due_date,
             business_month = :business_month,
             category_id = :category_id,
             brand = :brand,
             channel = :channel,
             total_amount = :total_amount,
             outstanding_amount = :outstanding_amount,
             status = :status,
             expected_account_id = :expected_account_id,
             attachment_url = :attachment_url,
             receipt_status = :receipt_status,
             notes = :notes
         WHERE id = :id'
    );
    $update->execute($new);
    jg_accounting_insert_audit($pdo, 'bill', $id, 'update', $old, $new);
    jg_accounting_review_bill($pdo, $id);
    return ['bill_id' => $id, 'status' => $status];
}

function jg_accounting_create_category(PDO $pdo, array $body): array
{
    $name = jg_accounting_text($body['name'] ?? '', 160);
    if ($name === '') {
        jg_accounting_error('Category name is required.', 422, 'name');
    }
    $key = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $name) ?? '', '-'));
    $type = jg_accounting_text($body['type'] ?? 'expense', 40);
    if (!in_array($type, ['income','expense','cogs_support','marketing','operations','payroll','asset','transfer','owner','tax','adjustment','other'], true)) {
        $type = 'expense';
    }
    $stmt = $pdo->prepare(
        'INSERT INTO accounting_categories (category_key, parent_id, name, type, requires_receipt, is_billable, is_active, sort_order)
         VALUES (:category_key, :parent_id, :name, :type, :requires_receipt, 1, 1, 500)
         ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type), requires_receipt = VALUES(requires_receipt)'
    );
    $stmt->execute([
        ':category_key' => mb_substr($key ?: jg_accounting_key('category'), 0, 80),
        ':parent_id' => (int) ($body['parent_id'] ?? 0) > 0 ? (int) $body['parent_id'] : null,
        ':name' => $name,
        ':type' => $type,
        ':requires_receipt' => jg_accounting_bool($body['requires_receipt'] ?? false) ? 1 : 0,
    ]);
    return ['id' => (int) $pdo->lastInsertId()];
}

function jg_accounting_mark_review_resolved(PDO $pdo, array $body): array
{
    $id = (int) ($body['review_id'] ?? $body['id'] ?? 0);
    if ($id <= 0) {
        jg_accounting_error('Review item is required.', 422, 'review_id');
    }
    $stmt = $pdo->prepare('UPDATE accounting_review_queue SET status = "resolved", resolved_at = UTC_TIMESTAMP() WHERE id = :id');
    $stmt->execute([':id' => $id]);
    return ['review_id' => $id, 'status' => 'resolved'];
}
