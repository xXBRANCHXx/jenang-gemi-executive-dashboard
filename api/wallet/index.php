<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/config.php';
require_once dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/analytics-bootstrap.php';

if (!defined('JG_ORDERS_API_NO_DISPATCH')) {
    define('JG_ORDERS_API_NO_DISPATCH', true);
}
require_once dirname(__DIR__) . '/orders/index.php';

const JG_WALLET_BACKTRACK_START_DATE = '2026-05-20';
const JG_WALLET_BACKTRACK_CHUNK_DAYS = 1;
const JG_WALLET_BACKTRACK_IMPORT_ROWS_PER_STEP = 500;
const JG_WALLET_BACKTRACK_REMOTE_TIMEOUT_SECONDS = 75;
const JG_WALLET_RELEASE_SYNC_DAYS = 45;
const JG_WALLET_RELEASE_SYNC_IMPORT_ROWS = 1000;
const JG_WALLET_RELEASE_SYNC_REMOTE_TIMEOUT_SECONDS = 35;
const JG_WALLET_RELEASE_SYNC_IMPORT_TIMEOUT_SECONDS = 18;
const JG_WALLET_PLATFORM_TRANSACTION_TIMEOUT_SECONDS = 45;
const JG_WALLET_RELEASE_BACKFILL_DAYS = 120;
const JG_WALLET_RELEASE_BACKFILL_IMPORT_ROWS = 1500;
const JG_WALLET_RELEASE_BACKFILL_REMOTE_TIMEOUT_SECONDS = 70;
const JG_WALLET_RELEASE_BACKFILL_IMPORT_TIMEOUT_SECONDS = 25;

if (!defined('JG_WALLET_API_NO_DISPATCH')) {
    jg_wallet_handle_request();
}

function jg_wallet_handle_request(): void
{
    jg_admin_require_auth();
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');

    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $action = strtolower(trim((string) ($_GET['action'] ?? 'summary')));

    try {
        $pdo = analyticsDb();
        jg_wallet_ensure_schema($pdo);

        if ($method === 'GET' && in_array($action, ['summary', 'list'], true)) {
            echo json_encode(jg_wallet_summary_with_backtrack($pdo, jg_wallet_backtrack_latest($pdo)), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            return;
        }

        if ($method === 'GET' && $action === 'account') {
            echo json_encode(jg_wallet_account_response($pdo, $_GET), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            return;
        }

        if ($method === 'GET' && in_array($action, ['diagnostics', 'audit'], true)) {
            echo json_encode(jg_wallet_diagnostics($pdo, $_GET), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            return;
        }

        if ($method === 'GET' && in_array($action, ['sync_logs', 'release_sync_logs'], true)) {
            echo json_encode([
                'ok' => true,
                'generated_at' => gmdate(DATE_ATOM),
                'logs' => jg_wallet_release_sync_logs($pdo, jg_wallet_positive_int($_GET['limit'] ?? 25, 1, 100)),
            ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            return;
        }

        if ($method === 'GET' && in_array($action, ['sample', 'api_sample', 'schema'], true)) {
            echo json_encode(jg_wallet_api_sample_response(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            return;
        }

        if ($method === 'GET' && in_array($action, ['terminal', 'query'], true)) {
            echo json_encode(jg_wallet_terminal_response($pdo, $_GET), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            return;
        }

        $payload = json_decode((string) file_get_contents('php://input'), true);
        $payload = is_array($payload) ? $payload : [];

        if ($method === 'POST' && in_array($action, ['terminal', 'query'], true)) {
            echo json_encode(jg_wallet_terminal_response($pdo, $payload + $_GET), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            return;
        }

        if ($method === 'POST' && in_array($action, ['release', 'withdraw'], true)) {
            echo json_encode(jg_wallet_release($pdo, $payload), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            return;
        }

        if ($method === 'POST' && in_array($action, ['set_balance', 'balance_anchor', 'snapshot'], true)) {
            echo json_encode(jg_wallet_set_balance_anchor($pdo, $payload), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            return;
        }

        if ($method === 'POST' && in_array($action, ['backtrack', 'sync_backtrack'], true)) {
            echo json_encode(jg_wallet_start_backtrack($pdo, $payload), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            return;
        }

        if ($method === 'POST' && in_array($action, ['cancel_backtrack', 'backtrack_cancel'], true)) {
            echo json_encode(jg_wallet_cancel_backtrack($pdo, $payload), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            return;
        }

        if ($method === 'POST' && in_array($action, ['backtrack_step', 'sync_backtrack_step'], true)) {
            echo json_encode(jg_wallet_step_backtrack($pdo, $payload), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            return;
        }

        if ($method === 'POST' && in_array($action, ['sync_releases', 'refresh_releases'], true)) {
            echo json_encode(jg_wallet_sync_releases($pdo, $payload), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            return;
        }

        if ($method === 'POST' && in_array($action, ['backfill_releases', 'release_backfill'], true)) {
            echo json_encode(jg_wallet_backfill_releases($pdo, $payload), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            return;
        }

        if ($method === 'POST' && in_array($action, ['undo', 'undo_release'], true)) {
            echo json_encode(jg_wallet_undo_release($pdo, $payload), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            return;
        }

        jg_wallet_json(['ok' => false, 'error' => 'wallet_action_not_found'], 404);
    } catch (InvalidArgumentException $error) {
        jg_wallet_json(['ok' => false, 'error' => $error->getMessage()], 422);
    } catch (Throwable $error) {
        error_log('Wallet API failed: ' . $error->getMessage());
        jg_wallet_json(['ok' => false, 'error' => 'wallet_api_failed', 'message' => $error->getMessage()], 500);
    }
}

function jg_wallet_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function jg_wallet_ensure_schema(PDO $pdo): void
{
    jg_orders_ensure_mirror_schema($pdo);
    analyticsTryExec(
        $pdo,
        'CREATE TABLE IF NOT EXISTS dashboard_wallet_releases (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            platform VARCHAR(40) NOT NULL DEFAULT "",
            account_key VARCHAR(120) NOT NULL DEFAULT "",
            amount DECIMAL(16,2) NOT NULL DEFAULT 0,
            release_note VARCHAR(255) NOT NULL DEFAULT "",
            released_by VARCHAR(160) NOT NULL DEFAULT "",
            withdrawn_at DATETIME(6) NULL DEFAULT NULL,
            created_at DATETIME(6) NOT NULL,
            undone_at DATETIME(6) NULL DEFAULT NULL,
            undone_by VARCHAR(160) NOT NULL DEFAULT "",
            undo_note VARCHAR(255) NOT NULL DEFAULT "",
            KEY idx_dashboard_wallet_releases_account (platform, account_key, undone_at, created_at),
            KEY idx_dashboard_wallet_releases_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    analyticsEnsureTableColumn($pdo, 'dashboard_wallet_releases', 'withdrawn_at', 'DATETIME(6) NULL DEFAULT NULL AFTER released_by');
    analyticsTryExec(
        $pdo,
        'CREATE TABLE IF NOT EXISTS dashboard_wallet_balance_anchors (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            platform VARCHAR(40) NOT NULL DEFAULT "",
            account_key VARCHAR(120) NOT NULL DEFAULT "",
            balance_amount DECIMAL(16,2) NOT NULL DEFAULT 0,
            observed_at DATETIME(6) NOT NULL,
            anchor_note VARCHAR(255) NOT NULL DEFAULT "",
            created_by VARCHAR(160) NOT NULL DEFAULT "",
            created_at DATETIME(6) NOT NULL,
            undone_at DATETIME(6) NULL DEFAULT NULL,
            undone_by VARCHAR(160) NOT NULL DEFAULT "",
            undo_note VARCHAR(255) NOT NULL DEFAULT "",
            KEY idx_dashboard_wallet_balance_anchor_account (platform, account_key, undone_at, observed_at, id),
            KEY idx_dashboard_wallet_balance_anchor_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    analyticsTryExec(
        $pdo,
        'CREATE TABLE IF NOT EXISTS dashboard_wallet_backtrack_runs (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            run_key CHAR(32) NOT NULL,
            status VARCHAR(24) NOT NULL DEFAULT "running",
            phase VARCHAR(24) NOT NULL DEFAULT "sync",
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            cursor_date DATE NOT NULL,
            cursor_account_index INT NOT NULL DEFAULT 0,
            import_offset INT NOT NULL DEFAULT 0,
            chunk_days INT NOT NULL DEFAULT 1,
            import_rows_per_step INT NOT NULL DEFAULT 500,
            sync_calls INT NOT NULL DEFAULT 0,
            import_pages INT NOT NULL DEFAULT 0,
            imported_rows INT NOT NULL DEFAULT 0,
            upserted_rows INT NOT NULL DEFAULT 0,
            started_by VARCHAR(160) NOT NULL DEFAULT "",
            last_message VARCHAR(255) NOT NULL DEFAULT "",
            last_error VARCHAR(255) NOT NULL DEFAULT "",
            last_sync_json LONGTEXT NULL,
            last_import_json LONGTEXT NULL,
            created_at DATETIME(6) NOT NULL,
            updated_at DATETIME(6) NOT NULL,
            completed_at DATETIME(6) NULL DEFAULT NULL,
            UNIQUE KEY uniq_dashboard_wallet_backtrack_run_key (run_key),
            KEY idx_dashboard_wallet_backtrack_status (status, updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    analyticsTryExec(
        $pdo,
        'CREATE TABLE IF NOT EXISTS dashboard_wallet_release_sync_logs (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            run_key CHAR(32) NOT NULL,
            action VARCHAR(32) NOT NULL DEFAULT "sync",
            status VARCHAR(24) NOT NULL DEFAULT "ok",
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            days INT NOT NULL DEFAULT 0,
            import_rows INT NOT NULL DEFAULT 0,
            skip_remote TINYINT(1) NOT NULL DEFAULT 0,
            remote_ok TINYINT(1) NOT NULL DEFAULT 0,
            import_ok TINYINT(1) NOT NULL DEFAULT 0,
            fetched_rows INT NOT NULL DEFAULT 0,
            upserted_rows INT NOT NULL DEFAULT 0,
            before_wallet_balance DECIMAL(16,2) NOT NULL DEFAULT 0,
            after_wallet_balance DECIMAL(16,2) NOT NULL DEFAULT 0,
            before_released_since_anchor DECIMAL(16,2) NOT NULL DEFAULT 0,
            after_released_since_anchor DECIMAL(16,2) NOT NULL DEFAULT 0,
            remote_json LONGTEXT NULL,
            import_json LONGTEXT NULL,
            before_json LONGTEXT NULL,
            after_json LONGTEXT NULL,
            error_message VARCHAR(1000) NOT NULL DEFAULT "",
            created_at DATETIME(6) NOT NULL,
            updated_at DATETIME(6) NOT NULL,
            UNIQUE KEY uniq_dashboard_wallet_release_sync_run_key (run_key),
            KEY idx_dashboard_wallet_release_sync_created (created_at),
            KEY idx_dashboard_wallet_release_sync_action (action, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    analyticsTryExec(
        $pdo,
        'CREATE TABLE IF NOT EXISTS dashboard_wallet_platform_transactions (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            platform VARCHAR(40) NOT NULL DEFAULT "",
            account_key VARCHAR(120) NOT NULL DEFAULT "",
            transaction_id VARCHAR(180) NOT NULL DEFAULT "",
            order_id VARCHAR(160) NOT NULL DEFAULT "",
            transaction_type VARCHAR(120) NOT NULL DEFAULT "",
            money_flow VARCHAR(80) NOT NULL DEFAULT "",
            amount DECIMAL(16,2) NOT NULL DEFAULT 0,
            current_balance DECIMAL(16,2) NULL DEFAULT NULL,
            transaction_at DATETIME(6) NOT NULL,
            raw_json LONGTEXT NULL,
            synced_at DATETIME(6) NOT NULL,
            UNIQUE KEY uniq_dashboard_wallet_platform_transaction (platform, account_key, transaction_id),
            KEY idx_dashboard_wallet_platform_transaction_account (platform, account_key, transaction_at),
            KEY idx_dashboard_wallet_platform_transaction_order (platform, account_key, order_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

/**
 * @return array<int, array{platform:string,account_key:string,company:string,label:string}>
 */
function jg_wallet_known_accounts(): array
{
    return [
        ['platform' => 'shopee', 'account_key' => 'jenang-gemi-shopee', 'company' => 'Jenang Gemi', 'label' => 'Jenang Gemi Shopee'],
        ['platform' => 'shopee', 'account_key' => 'zero-shopee', 'company' => 'ZERO', 'label' => 'ZERO Shopee'],
        ['platform' => 'shopee', 'account_key' => 'zfit-shopee', 'company' => 'ZFIT', 'label' => 'ZFIT Shopee'],
        ['platform' => 'tiktok', 'account_key' => 'jenang-gemi-tiktok', 'company' => 'Jenang Gemi', 'label' => 'Jenang Gemi TikTok'],
        ['platform' => 'tiktok', 'account_key' => 'zero-tiktok', 'company' => 'ZERO', 'label' => 'ZERO TikTok'],
        ['platform' => 'tiktok', 'account_key' => 'zfit-tiktok', 'company' => 'ZFIT', 'label' => 'ZFIT TikTok'],
    ];
}

function jg_wallet_summary(PDO $pdo): array
{
    $accounts = [];
    foreach (jg_wallet_known_accounts() as $account) {
        $accounts[jg_wallet_account_key($account['platform'], $account['account_key'])] = $account + jg_wallet_empty_amounts();
    }

    $activeBalanceAnchors = jg_wallet_active_balance_anchors($pdo);
    $releasedMonthWindow = jg_wallet_current_month_window();
    foreach (jg_wallet_order_totals($pdo, $activeBalanceAnchors, $releasedMonthWindow) as $row) {
        $key = jg_wallet_account_key((string) $row['platform'], (string) $row['account_key']);
        $accounts[$key] = array_merge($accounts[$key] ?? [
            'platform' => (string) $row['platform'],
            'account_key' => (string) $row['account_key'],
            'company' => (string) ($row['company'] ?? ''),
            'label' => jg_wallet_account_label((string) ($row['company'] ?? ''), (string) $row['platform'], (string) $row['account_key']),
        ], jg_wallet_empty_amounts(), $row);
    }

    $activeReleaseTotals = jg_wallet_active_release_totals($pdo, $activeBalanceAnchors);
    foreach ($activeReleaseTotals as $row) {
        $key = jg_wallet_account_key((string) $row['platform'], (string) $row['account_key']);
        if (!isset($accounts[$key])) {
            $accounts[$key] = [
                'platform' => (string) $row['platform'],
                'account_key' => (string) $row['account_key'],
                'company' => '',
                'label' => jg_wallet_account_label('', (string) $row['platform'], (string) $row['account_key']),
            ] + jg_wallet_empty_amounts();
        }
        $accounts[$key]['released_out'] = (int) round((float) ($row['amount'] ?? 0));
        $accounts[$key]['withdrawn_since_anchor_total'] = (int) round((float) ($row['since_anchor_amount'] ?? 0));
        $accounts[$key]['withdrawn_since_anchor_count'] = (int) ($row['since_anchor_count'] ?? 0);
        $accounts[$key]['last_withdrawn_at'] = jg_orders_atom_datetime((string) ($row['last_withdrawn_at'] ?? ''));
    }

    foreach (jg_wallet_platform_transaction_totals($pdo, $activeBalanceAnchors) as $row) {
        $key = jg_wallet_account_key((string) $row['platform'], (string) $row['account_key']);
        if (!isset($accounts[$key])) {
            $accounts[$key] = [
                'platform' => (string) $row['platform'],
                'account_key' => (string) $row['account_key'],
                'company' => '',
                'label' => jg_wallet_account_label('', (string) $row['platform'], (string) $row['account_key']),
            ] + jg_wallet_empty_amounts();
        }
        $accounts[$key]['wallet_transaction_since_anchor_total'] = (int) round((float) ($row['since_anchor_amount'] ?? 0));
        $accounts[$key]['wallet_transaction_since_anchor_count'] = (int) ($row['since_anchor_count'] ?? 0);
        $accounts[$key]['wallet_transaction_total'] = (int) round((float) ($row['amount'] ?? 0));
        $accounts[$key]['wallet_transaction_count'] = (int) ($row['count'] ?? 0);
        $accounts[$key]['wallet_transaction_current_balance'] = $row['current_balance'] !== null
            ? (int) round((float) $row['current_balance'])
            : null;
        $accounts[$key]['last_wallet_transaction_at'] = jg_orders_atom_datetime((string) ($row['last_transaction_at'] ?? ''));
    }

    foreach ($accounts as &$account) {
        $releasedTotal = (int) round((float) ($account['released_total'] ?? 0));
        $releasedOut = (int) round((float) ($account['released_out'] ?? 0));
        $account['released_total'] = $releasedTotal;
        $account['released_month_total'] = (int) round((float) ($account['released_month_total'] ?? 0));
        $account['released_out'] = $releasedOut;
        $account['manual_released_out'] = $releasedOut;
        $account['manual_wallet_balance'] = max(0, $releasedTotal - $releasedOut);
        $account['outstanding_total'] = (int) round((float) ($account['outstanding_total'] ?? 0));
        $account['non_settling_total'] = (int) round((float) ($account['non_settling_total'] ?? 0));
        $account['released_orders'] = (int) ($account['released_orders'] ?? 0);
        $account['released_month_orders'] = (int) ($account['released_month_orders'] ?? 0);
        $account['outstanding_orders'] = (int) ($account['outstanding_orders'] ?? 0);
        $account['non_settling_orders'] = (int) ($account['non_settling_orders'] ?? 0);
        $account['released_since_anchor_total'] = (int) round((float) ($account['released_since_anchor_total'] ?? 0));
        $account['released_since_anchor_orders'] = (int) ($account['released_since_anchor_orders'] ?? 0);
        $account['withdrawn_since_anchor_total'] = (int) round((float) ($account['withdrawn_since_anchor_total'] ?? 0));
        $account['withdrawn_since_anchor_count'] = (int) ($account['withdrawn_since_anchor_count'] ?? 0);
        $account['wallet_transaction_since_anchor_total'] = (int) round((float) ($account['wallet_transaction_since_anchor_total'] ?? 0));
        $account['wallet_transaction_since_anchor_count'] = (int) ($account['wallet_transaction_since_anchor_count'] ?? 0);
        $account['wallet_transaction_total'] = (int) round((float) ($account['wallet_transaction_total'] ?? 0));
        $account['wallet_transaction_count'] = (int) ($account['wallet_transaction_count'] ?? 0);
        $account['last_wallet_transaction_at'] = jg_orders_atom_datetime((string) ($account['last_wallet_transaction_at'] ?? ''));
        $account['orders'] = (int) ($account['orders'] ?? 0);
        $account['last_released_at'] = jg_orders_atom_datetime((string) ($account['last_released_at'] ?? ''));
        $account['last_order_at'] = jg_orders_atom_datetime((string) ($account['last_order_at'] ?? ''));
        $account['last_source_updated_at'] = jg_orders_atom_datetime((string) ($account['last_source_updated_at'] ?? ''));
        $account['last_mirrored_at'] = jg_orders_atom_datetime((string) ($account['last_mirrored_at'] ?? ''));
        $account['last_withdrawn_at'] = jg_orders_atom_datetime((string) ($account['last_withdrawn_at'] ?? ''));
        $key = jg_wallet_account_key((string) ($account['platform'] ?? ''), (string) ($account['account_key'] ?? ''));
        jg_wallet_apply_balance_anchor($account, $activeBalanceAnchors[$key] ?? null);
    }
    unset($account);

    uasort($accounts, static function (array $left, array $right): int {
        return strcmp((string) ($left['platform'] ?? ''), (string) ($right['platform'] ?? ''))
            ?: strcmp((string) ($left['company'] ?? ''), (string) ($right['company'] ?? ''))
            ?: strcmp((string) ($left['account_key'] ?? ''), (string) ($right['account_key'] ?? ''));
    });

    $wallets = array_values($accounts);
    $logs = jg_wallet_release_logs($pdo);

    return [
        'ok' => true,
        'generated_at' => gmdate(DATE_ATOM),
        'current_month' => $releasedMonthWindow,
        'wallets' => $wallets,
        'logs' => $logs,
        'source' => jg_wallet_source_metadata($wallets),
        'totals' => [
            'wallet_balance' => array_sum(array_column($wallets, 'wallet_balance')),
            'source_wallet_balance' => array_sum(array_column($wallets, 'source_wallet_balance')),
            'manual_wallet_balance' => array_sum(array_column($wallets, 'manual_wallet_balance')),
            'manual_anchor_balance_total' => array_sum(array_column($wallets, 'manual_anchor_balance')),
            'released_since_anchor_total' => array_sum(array_column($wallets, 'released_since_anchor_total')),
            'wallet_transaction_since_anchor_total' => array_sum(array_column($wallets, 'wallet_transaction_since_anchor_total')),
            'wallet_activity_since_anchor_total' => array_sum(array_column($wallets, 'wallet_activity_since_anchor_total')),
            'withdrawn_since_anchor_total' => array_sum(array_column($wallets, 'withdrawn_since_anchor_total')),
            'released_total' => array_sum(array_column($wallets, 'released_total')),
            'released_month_total' => array_sum(array_column($wallets, 'released_month_total')),
            'released_out' => array_sum(array_column($wallets, 'released_out')),
            'manual_released_out' => array_sum(array_column($wallets, 'manual_released_out')),
            'outstanding_total' => array_sum(array_column($wallets, 'outstanding_total')),
            'non_settling_total' => array_sum(array_column($wallets, 'non_settling_total')),
            'orders' => array_sum(array_column($wallets, 'orders')),
            'released_orders' => array_sum(array_column($wallets, 'released_orders')),
            'released_month_orders' => array_sum(array_column($wallets, 'released_month_orders')),
            'outstanding_orders' => array_sum(array_column($wallets, 'outstanding_orders')),
            'non_settling_orders' => array_sum(array_column($wallets, 'non_settling_orders')),
            'released_since_anchor_orders' => array_sum(array_column($wallets, 'released_since_anchor_orders')),
            'withdrawn_since_anchor_count' => array_sum(array_column($wallets, 'withdrawn_since_anchor_count')),
            'manual_anchor_count' => count(array_filter($wallets, static fn (array $wallet): bool => !empty($wallet['wallet_balance_known']))),
            'manual_required_count' => count(array_filter($wallets, static fn (array $wallet): bool => empty($wallet['wallet_balance_known']))),
        ],
    ];
}

function jg_wallet_account_response(PDO $pdo, array $params): array
{
    $summary = jg_wallet_summary_with_backtrack($pdo, jg_wallet_backtrack_latest($pdo));
    $wallet = jg_wallet_match_wallet($summary['wallets'], $params);
    if (!is_array($wallet)) {
        throw new InvalidArgumentException('wallet_account_not_found');
    }

    return [
        'ok' => true,
        'generated_at' => (string) ($summary['generated_at'] ?? gmdate(DATE_ATOM)),
        'wallet' => $wallet,
        'totals' => $summary['totals'] ?? [],
        'source' => $summary['source'] ?? [],
        'backtrack' => $summary['backtrack'] ?? [],
        'api_call' => jg_wallet_api_call($wallet),
    ];
}

function jg_wallet_diagnostics(PDO $pdo, array $params): array
{
    $summary = jg_wallet_summary_with_backtrack($pdo, jg_wallet_backtrack_latest($pdo));
    $activeBalanceAnchors = jg_wallet_active_balance_anchors($pdo);
    $requestedPlatform = jg_wallet_normalize_key($params['platform'] ?? '');
    $requestedAccountKey = jg_wallet_normalize_key($params['account_key'] ?? $params['account'] ?? '');
    $limit = jg_wallet_positive_int($params['limit'] ?? 2500, 50, 5000);

    $wallets = [];
    foreach (jg_wallet_known_accounts() as $account) {
        $key = jg_wallet_account_key($account['platform'], $account['account_key']);
        $wallets[$key] = $account + jg_wallet_empty_amounts();
    }
    foreach (($summary['wallets'] ?? []) as $wallet) {
        if (!is_array($wallet)) {
            continue;
        }
        $key = jg_wallet_account_key((string) ($wallet['platform'] ?? ''), (string) ($wallet['account_key'] ?? ''));
        if ($key !== '|') {
            $wallets[$key] = $wallet;
        }
    }

    $diagnostics = [];
    foreach ($wallets as $wallet) {
        $platform = jg_wallet_normalize_key($wallet['platform'] ?? '');
        $accountKey = jg_wallet_normalize_key($wallet['account_key'] ?? '');
        if ($platform === '' || $accountKey === '') {
            continue;
        }
        if ($requestedPlatform !== '' && $requestedPlatform !== $platform) {
            continue;
        }
        if ($requestedAccountKey !== '' && $requestedAccountKey !== $accountKey) {
            continue;
        }
        $key = jg_wallet_account_key($platform, $accountKey);
        $diagnostics[] = jg_wallet_account_diagnostics(
            $pdo,
            $platform,
            $accountKey,
            $activeBalanceAnchors[$key] ?? null,
            $wallet,
            $limit
        );
    }

    return [
        'ok' => true,
        'generated_at' => gmdate(DATE_ATOM),
        'filters' => [
            'platform' => $requestedPlatform,
            'account_key' => $requestedAccountKey,
            'limit' => $limit,
        ],
        'wallets' => $diagnostics,
        'sync_logs' => jg_wallet_release_sync_logs($pdo, 25),
        'notes' => [
            'wallet_formula' => 'manual anchor balance + trusted released orders with funds_released_at after anchor - manual withdrawals after anchor',
            'refresh_scope' => 'release refresh imports marketplace rows by order date range, then applies the stored funds_released_at timestamp to the anchor comparison',
        ],
    ];
}

/**
 * @return array<string, mixed>
 */
function jg_wallet_account_diagnostics(PDO $pdo, string $platform, string $accountKey, ?array $anchor, array $wallet, int $limit): array
{
    $stmt = $pdo->prepare(
        'SELECT platform,
                account_key,
                CASE WHEN order_id = "" THEN order_item_hash ELSE order_id END AS order_key,
                MAX(order_id) AS order_id,
                MAX(company) AS company,
                MAX(order_net_revenue) AS order_amount,
                MAX(funds_released) AS funds_released,
                MAX(funds_released_amount) AS funds_released_amount,
                MAX(funds_released_at) AS funds_released_at,
                MAX(order_create_time) AS order_create_time,
                MAX(status) AS order_status,
                MAX(funds_release_status) AS funds_release_status,
                MAX(funds_release_source) AS funds_release_source,
                MAX(source_updated_at) AS source_updated_at,
                MAX(mirrored_at) AS mirrored_at,
                MAX(COALESCE(funds_released_at, source_updated_at, mirrored_at, order_create_time)) AS latest_activity_at
         FROM dashboard_order_mirror
         WHERE deleted_at IS NULL
           AND platform = :platform
           AND account_key = :account_key
         GROUP BY platform, account_key, CASE WHEN order_id = "" THEN order_item_hash ELSE order_id END
         ORDER BY latest_activity_at DESC
         LIMIT ' . $limit
    );
    $stmt->execute([
        ':platform' => $platform,
        ':account_key' => $accountKey,
    ]);
    $orders = $stmt->fetchAll();

    $categories = [];
    $last = [
        'released_at' => '',
        'source_updated_at' => '',
        'mirrored_at' => '',
        'order_at' => '',
    ];
    foreach ($orders as $order) {
        if (!is_array($order)) {
            continue;
        }
        $class = jg_wallet_release_anchor_class($order, $anchor);
        $bucket = jg_wallet_order_bucket($order);
        $orderAmount = jg_wallet_order_amount($order);
        $releasedAmount = jg_wallet_released_amount($order, $orderAmount);
        $amount = $bucket === 'released' ? $releasedAmount : $orderAmount;
        if (!isset($categories[$class])) {
            $categories[$class] = [
                'orders' => 0,
                'amount' => 0,
                'reason' => jg_wallet_release_anchor_reason($class),
                'examples' => [],
            ];
        }
        $categories[$class]['orders'] = (int) ($categories[$class]['orders'] ?? 0) + 1;
        $categories[$class]['amount'] = (int) ($categories[$class]['amount'] ?? 0) + $amount;
        if (count($categories[$class]['examples']) < 12) {
            $categories[$class]['examples'][] = jg_wallet_diagnostic_order_example($order, $class, $amount);
        }
        $last['released_at'] = jg_wallet_max_datetime($last['released_at'], $order['funds_released_at'] ?? '');
        $last['source_updated_at'] = jg_wallet_max_datetime($last['source_updated_at'], $order['source_updated_at'] ?? '');
        $last['mirrored_at'] = jg_wallet_max_datetime($last['mirrored_at'], $order['mirrored_at'] ?? '');
        $last['order_at'] = jg_wallet_max_datetime($last['order_at'], $order['order_create_time'] ?? '');
    }
    ksort($categories);

    return [
        'platform' => $platform,
        'account_key' => $accountKey,
        'label' => (string) ($wallet['label'] ?? jg_wallet_account_label('', $platform, $accountKey)),
        'anchor' => is_array($anchor) ? [
            'id' => (int) ($anchor['id'] ?? 0),
            'balance' => (int) ($anchor['balance_amount'] ?? 0),
            'observed_at' => jg_orders_atom_datetime((string) ($anchor['observed_at_sql'] ?? $anchor['observed_at'] ?? '')),
            'observed_at_sql' => (string) ($anchor['observed_at_sql'] ?? ''),
        ] : null,
        'wallet' => [
            'wallet_balance' => (int) ($wallet['wallet_balance'] ?? 0),
            'wallet_balance_known' => !empty($wallet['wallet_balance_known']),
            'manual_anchor_balance' => (int) ($wallet['manual_anchor_balance'] ?? 0),
            'released_since_anchor_total' => (int) ($wallet['released_since_anchor_total'] ?? 0),
            'released_since_anchor_orders' => (int) ($wallet['released_since_anchor_orders'] ?? 0),
            'withdrawn_since_anchor_total' => (int) ($wallet['withdrawn_since_anchor_total'] ?? 0),
            'outstanding_total' => (int) ($wallet['outstanding_total'] ?? 0),
            'outstanding_orders' => (int) ($wallet['outstanding_orders'] ?? 0),
        ],
        'scanned_orders' => count($orders),
        'category_totals' => $categories,
        'latest' => [
            'released_at' => jg_orders_atom_datetime($last['released_at']),
            'source_updated_at' => jg_orders_atom_datetime($last['source_updated_at']),
            'mirrored_at' => jg_orders_atom_datetime($last['mirrored_at']),
            'order_at' => jg_orders_atom_datetime($last['order_at']),
        ],
    ];
}

function jg_wallet_terminal_response(PDO $pdo, array $params): array
{
    $query = trim((string) ($params['query'] ?? $params['q'] ?? ''));
    $summary = jg_wallet_summary_with_backtrack($pdo, jg_wallet_backtrack_latest($pdo));
    $wallet = jg_wallet_match_wallet($summary['wallets'], $params + ['query' => $query, 'q' => $query]);
    if (is_array($wallet)) {
        return [
            'ok' => true,
            'query' => $query,
            'command' => 'wallet.info',
            'generated_at' => (string) ($summary['generated_at'] ?? gmdate(DATE_ATOM)),
            'answer' => jg_wallet_terminal_answer($wallet),
            'wallet' => $wallet,
            'totals' => $summary['totals'] ?? [],
            'source' => $summary['source'] ?? [],
            'security' => jg_wallet_api_security_metadata(false),
            'request' => jg_wallet_terminal_request_sample($query),
            'api_call' => jg_wallet_api_call($wallet),
            'terminal_call' => '/api/wallet/?action=terminal',
        ];
    }

    return [
        'ok' => true,
        'query' => $query,
        'command' => 'wallet.summary',
        'generated_at' => (string) ($summary['generated_at'] ?? gmdate(DATE_ATOM)),
        'answer' => jg_wallet_terminal_summary_answer($summary),
        'wallets' => $summary['wallets'] ?? [],
        'totals' => $summary['totals'] ?? [],
        'source' => $summary['source'] ?? [],
        'security' => jg_wallet_api_security_metadata(false),
        'request' => jg_wallet_terminal_request_sample($query),
        'terminal_call' => '/api/wallet/?action=terminal',
    ];
}

function jg_wallet_api_sample_response(): array
{
    return [
        'ok' => true,
        'sample' => true,
        'generated_at' => '2026-07-06T03:31:00+00:00',
        'contains_live_data' => false,
        'security' => jg_wallet_api_security_metadata(true),
        'request' => jg_wallet_terminal_request_sample('Wallet summary'),
        'response' => [
            'ok' => true,
            'sample' => true,
            'command' => 'wallet.summary',
            'generated_at' => '2026-07-06T03:31:00+00:00',
            'answer' => 'Wallet summary: Rp145.000 known wallet balance, Rp3.500.000 outstanding, 1 account needs manual balance, 2 non-settling orders excluded.',
            'totals' => [
                'wallet_balance' => 145000,
                'released_month_total' => 1200000,
                'outstanding_total' => 3500000,
                'outstanding_orders' => 42,
                'manual_required_count' => 1,
                'non_settling_orders' => 2,
            ],
            'wallets' => [
                [
                    'label' => 'Example Shopee',
                    'platform' => 'shopee',
                    'account_key' => 'example-shopee',
                    'wallet_balance' => 145000,
                    'wallet_balance_known' => true,
                    'released_month_total' => 950000,
                    'outstanding_total' => 2750000,
                    'outstanding_orders' => 31,
                    'last_released_at' => '2026-07-06T02:15:00+00:00',
                    'last_mirrored_at' => '2026-07-06T03:30:00+00:00',
                ],
            ],
            'source' => [
                'order_source' => 'dashboard_order_mirror',
                'released_metric_basis' => 'current Asia/Jakarta calendar month by funds_released_at',
                'outstanding_basis' => 'unreleased settling orders only; cancelled and other non-settling orders are excluded',
            ],
        ],
    ];
}

function jg_wallet_api_security_metadata(bool $sample): array
{
    return [
        'public' => false,
        'sample' => $sample,
        'contains_live_data' => !$sample,
        'authentication' => 'active admin session required',
        'session_cookie' => 'HttpOnly; SameSite=Strict',
        'request_scope' => 'same-origin credentials only',
        'cache_control' => 'no-store',
        'share_guidance' => $sample
            ? 'Safe to share as a schema example; values are placeholders.'
            : 'Do not share this response; it contains live wallet data.',
    ];
}

function jg_wallet_terminal_request_sample(string $query): array
{
    return [
        'method' => 'POST',
        'endpoint' => '/api/wallet/?action=terminal',
        'headers' => [
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ],
        'body' => [
            'query' => $query !== '' ? $query : 'Wallet summary',
        ],
    ];
}

function jg_wallet_match_wallet(array $wallets, array $params): ?array
{
    $platform = jg_wallet_normalize_key($params['platform'] ?? '');
    $accountKey = jg_wallet_normalize_key($params['account_key'] ?? $params['account'] ?? '');
    if ($platform !== '' && $accountKey !== '') {
        foreach ($wallets as $wallet) {
            if (
                jg_wallet_normalize_key((string) ($wallet['platform'] ?? '')) === $platform
                && jg_wallet_normalize_key((string) ($wallet['account_key'] ?? '')) === $accountKey
            ) {
                return $wallet;
            }
        }
    }

    if ($accountKey !== '') {
        foreach ($wallets as $wallet) {
            if (jg_wallet_normalize_key((string) ($wallet['account_key'] ?? '')) === $accountKey) {
                return $wallet;
            }
        }
    }

    $query = trim((string) ($params['query'] ?? $params['q'] ?? ''));
    if ($query === '') {
        return null;
    }

    $queryText = jg_wallet_terminal_text($query);
    $tokens = jg_wallet_terminal_tokens($queryText);
    $best = null;
    $bestScore = 0;
    foreach ($wallets as $wallet) {
        $walletText = jg_wallet_terminal_text(implode(' ', [
            (string) ($wallet['label'] ?? ''),
            (string) ($wallet['company'] ?? ''),
            (string) ($wallet['platform'] ?? ''),
            (string) ($wallet['account_key'] ?? ''),
        ]));
        $score = 0;
        foreach ($tokens as $token) {
            if (str_contains($walletText, $token)) {
                $score += 1;
            }
        }
        $labelText = jg_wallet_terminal_text((string) ($wallet['label'] ?? ''));
        if ($labelText !== '' && str_contains($queryText, $labelText)) {
            $score += 6;
        }
        if ($platform !== '' && jg_wallet_normalize_key((string) ($wallet['platform'] ?? '')) === $platform) {
            $score += 3;
        }
        if ($score > $bestScore) {
            $bestScore = $score;
            $best = $wallet;
        }
    }

    return $bestScore >= 2 && is_array($best) ? $best : null;
}

function jg_wallet_terminal_text(string $value): string
{
    return trim(preg_replace('/[^a-z0-9]+/', ' ', strtolower($value)) ?? '');
}

/**
 * @return array<int, string>
 */
function jg_wallet_terminal_tokens(string $queryText): array
{
    $stopwords = array_flip([
        'api',
        'balance',
        'for',
        'fund',
        'funds',
        'get',
        'info',
        'marketplace',
        'please',
        'rp',
        'show',
        'status',
        'the',
        'wallet',
    ]);
    $tokens = array_filter(explode(' ', $queryText), static function (string $token) use ($stopwords): bool {
        return strlen($token) > 1 && !isset($stopwords[$token]);
    });

    return array_values(array_unique($tokens));
}

function jg_wallet_api_call(array $wallet): string
{
    return '/api/wallet/?' . http_build_query([
        'action' => 'account',
        'platform' => (string) ($wallet['platform'] ?? ''),
        'account_key' => (string) ($wallet['account_key'] ?? ''),
    ], '', '&', PHP_QUERY_RFC3986);
}

function jg_wallet_terminal_answer(array $wallet): string
{
    $label = (string) ($wallet['label'] ?? $wallet['account_key'] ?? 'Wallet');
    $walletBalance = (int) ($wallet['wallet_balance'] ?? 0);
    $open = jg_wallet_rupiah((int) ($wallet['outstanding_total'] ?? 0));
    $openOrders = (int) ($wallet['outstanding_orders'] ?? 0);
    $nonSettlingOrders = (int) ($wallet['non_settling_orders'] ?? 0);
    if (empty($wallet['wallet_balance_known'])) {
        return sprintf(
            '%s: wallet balance needs a manual set. Outstanding is %s across %d settling orders; %d non-settling orders excluded.',
            $label,
            $open,
            $openOrders,
            $nonSettlingOrders
        );
    }

    $anchorBalance = (int) ($wallet['manual_anchor_balance'] ?? 0);
    $releasedSince = (int) ($wallet['released_since_anchor_total'] ?? 0);
    $observedAt = (string) ($wallet['manual_anchor_observed_at'] ?? '');
    $suffix = $observedAt !== '' ? ' Manual set time: ' . $observedAt . '.' : '';

    $withdrawnSince = (int) ($wallet['withdrawn_since_anchor_total'] ?? 0);
    return sprintf(
        '%s: wallet is %s from %s manual set plus %s released after it minus %s withdrawn after it; %s outstanding across %d settling orders; %d non-settling orders excluded.%s',
        $label,
        jg_wallet_rupiah($walletBalance),
        jg_wallet_rupiah($anchorBalance),
        jg_wallet_rupiah($releasedSince),
        jg_wallet_rupiah($withdrawnSince),
        $open,
        $openOrders,
        $nonSettlingOrders,
        $suffix
    );
}

function jg_wallet_terminal_summary_answer(array $summary): string
{
    $totals = is_array($summary['totals'] ?? null) ? $summary['totals'] : [];
    return sprintf(
        'Wallet summary: %s known wallet balance, %s outstanding, %d accounts need manual balance, %d non-settling orders excluded.',
        jg_wallet_rupiah((int) ($totals['wallet_balance'] ?? 0)),
        jg_wallet_rupiah((int) ($totals['outstanding_total'] ?? 0)),
        (int) ($totals['manual_required_count'] ?? 0),
        (int) ($totals['non_settling_orders'] ?? 0)
    );
}

function jg_wallet_source_metadata(array $wallets): array
{
    return [
        'order_source' => 'dashboard_order_mirror',
        'settlement_source' => 'marketplace_order_finance',
        'wallet_balance_basis' => 'manual wallet balance anchor plus marketplace releases after the anchor time minus withdrawals after the anchor time',
        'released_metric_basis' => 'current Asia/Jakarta calendar month by funds_released_at',
        'outstanding_basis' => 'unreleased settling orders only; cancelled and other non-settling orders are excluded',
        'cash_out_source' => 'manual_withdrawal_log',
        'live_refresh' => 'no-store API responses, dashboard live events, and a short client cache',
        'last_mirrored_at' => jg_wallet_latest_wallet_datetime($wallets, 'last_mirrored_at'),
        'last_source_updated_at' => jg_wallet_latest_wallet_datetime($wallets, 'last_source_updated_at'),
        'last_released_at' => jg_wallet_latest_wallet_datetime($wallets, 'last_released_at'),
        'last_wallet_transaction_at' => jg_wallet_latest_wallet_datetime($wallets, 'last_wallet_transaction_at'),
        'last_manual_anchor_at' => jg_wallet_latest_wallet_datetime($wallets, 'manual_anchor_observed_at'),
    ];
}

function jg_wallet_latest_wallet_datetime(array $wallets, string $field): string
{
    $latest = '';
    foreach ($wallets as $wallet) {
        $latest = jg_wallet_max_datetime($latest, $wallet[$field] ?? '');
    }

    return $latest;
}

function jg_wallet_rupiah(int $amount): string
{
    return 'Rp' . number_format(max(0, $amount), 0, ',', '.');
}

function jg_wallet_set_balance_anchor(PDO $pdo, array $payload): array
{
    $platform = jg_wallet_normalize_key($payload['platform'] ?? '');
    $accountKey = jg_wallet_normalize_key($payload['account_key'] ?? '');
    if ($platform === '' || $accountKey === '') {
        throw new InvalidArgumentException('missing_wallet_account');
    }

    $amount = jg_wallet_balance_value($payload['balance'] ?? $payload['amount'] ?? '');
    $observedAt = jg_wallet_observed_at($payload['observed_at'] ?? $payload['cleared_at'] ?? '');
    $stmt = $pdo->prepare(
        'INSERT INTO dashboard_wallet_balance_anchors
            (platform, account_key, balance_amount, observed_at, anchor_note, created_by, created_at)
         VALUES
            (:platform, :account_key, :balance_amount, :observed_at, :anchor_note, :created_by, UTC_TIMESTAMP(6))'
    );
    $stmt->execute([
        ':platform' => $platform,
        ':account_key' => $accountKey,
        ':balance_amount' => number_format($amount, 2, '.', ''),
        ':observed_at' => $observedAt,
        ':anchor_note' => substr(trim((string) ($payload['note'] ?? '')), 0, 255),
        ':created_by' => jg_wallet_actor(),
    ]);

    analyticsTouchLiveState('wallet_balance_anchor');

    return jg_wallet_summary($pdo);
}

function jg_wallet_release(PDO $pdo, array $payload): array
{
    $platform = jg_wallet_normalize_key($payload['platform'] ?? '');
    $accountKey = jg_wallet_normalize_key($payload['account_key'] ?? '');
    if ($platform === '' || $accountKey === '') {
        throw new InvalidArgumentException('missing_wallet_account');
    }

    $summary = jg_wallet_summary($pdo);
    $wallet = null;
    foreach ($summary['wallets'] as $candidate) {
        if ((string) ($candidate['platform'] ?? '') === $platform && (string) ($candidate['account_key'] ?? '') === $accountKey) {
            $wallet = $candidate;
            break;
        }
    }
    if (!is_array($wallet)) {
        throw new InvalidArgumentException('wallet_account_not_found');
    }

    $currentWalletBalance = !empty($wallet['wallet_balance_known'])
        ? (int) ($wallet['wallet_balance'] ?? 0)
        : (int) ($wallet['manual_wallet_balance'] ?? 0);
    $amount = jg_wallet_release_amount($payload['amount'] ?? '', max(0, $currentWalletBalance));
    $withdrawnAt = jg_wallet_withdrawn_at($payload['withdrawn_at'] ?? $payload['released_at'] ?? $payload['observed_at'] ?? '');

    $stmt = $pdo->prepare(
        'INSERT INTO dashboard_wallet_releases
            (platform, account_key, amount, release_note, released_by, withdrawn_at, created_at)
         VALUES
            (:platform, :account_key, :amount, :release_note, :released_by, :withdrawn_at, UTC_TIMESTAMP(6))'
    );
    $stmt->execute([
        ':platform' => $platform,
        ':account_key' => $accountKey,
        ':amount' => number_format($amount, 2, '.', ''),
        ':release_note' => substr(trim((string) ($payload['note'] ?? '')), 0, 255),
        ':released_by' => jg_wallet_actor(),
        ':withdrawn_at' => $withdrawnAt,
    ]);

    analyticsTouchLiveState('wallet_release');

    return jg_wallet_summary($pdo);
}

function jg_wallet_sync_releases(PDO $pdo, array $payload): array
{
    return jg_wallet_run_release_refresh($pdo, $payload, [
        'action' => 'sync',
        'response_key' => 'release_sync',
        'mode' => 'wallet_refresh',
        'event' => 'wallet_release_refresh',
        'default_days' => JG_WALLET_RELEASE_SYNC_DAYS,
        'max_days' => 120,
        'default_import_rows' => JG_WALLET_RELEASE_SYNC_IMPORT_ROWS,
        'max_import_rows' => 2000,
        'remote_timeout' => JG_WALLET_RELEASE_SYNC_REMOTE_TIMEOUT_SECONDS,
        'import_timeout' => JG_WALLET_RELEASE_SYNC_IMPORT_TIMEOUT_SECONDS,
        'time_limit' => 90,
    ]);
}

function jg_wallet_backfill_releases(PDO $pdo, array $payload): array
{
    return jg_wallet_run_release_refresh($pdo, $payload, [
        'action' => 'backfill',
        'response_key' => 'release_backfill',
        'mode' => 'wallet_backtrack',
        'event' => 'wallet_release_backfill',
        'default_days' => JG_WALLET_RELEASE_BACKFILL_DAYS,
        'max_days' => 365,
        'default_import_rows' => JG_WALLET_RELEASE_BACKFILL_IMPORT_ROWS,
        'max_import_rows' => 10000,
        'remote_timeout' => JG_WALLET_RELEASE_BACKFILL_REMOTE_TIMEOUT_SECONDS,
        'import_timeout' => JG_WALLET_RELEASE_BACKFILL_IMPORT_TIMEOUT_SECONDS,
        'time_limit' => 180,
    ]);
}

/**
 * @param array<string, mixed> $options
 * @return array<string, mixed>
 */
function jg_wallet_run_release_refresh(PDO $pdo, array $payload, array $options): array
{
    if (function_exists('set_time_limit')) {
        @set_time_limit((int) ($options['time_limit'] ?? 90));
    }

    $action = (string) ($options['action'] ?? 'sync');
    $responseKey = (string) ($options['response_key'] ?? 'release_sync');
    $mode = (string) ($options['mode'] ?? 'wallet_refresh');
    $event = (string) ($options['event'] ?? 'wallet_release_refresh');
    $defaultDays = (int) ($options['default_days'] ?? JG_WALLET_RELEASE_SYNC_DAYS);
    $maxDays = (int) ($options['max_days'] ?? 120);
    $defaultImportRows = (int) ($options['default_import_rows'] ?? JG_WALLET_RELEASE_SYNC_IMPORT_ROWS);
    $maxImportRows = (int) ($options['max_import_rows'] ?? 2000);
    $remoteTimeout = (int) ($options['remote_timeout'] ?? JG_WALLET_RELEASE_SYNC_REMOTE_TIMEOUT_SECONDS);
    $importTimeout = (int) ($options['import_timeout'] ?? JG_WALLET_RELEASE_SYNC_IMPORT_TIMEOUT_SECONDS);

    $days = jg_wallet_positive_int($payload['days'] ?? $defaultDays, 1, $maxDays);
    $endDate = jg_wallet_date((string) ($payload['end_date'] ?? ''), jg_wallet_today());
    $startDate = jg_wallet_date((string) ($payload['start_date'] ?? ''), jg_wallet_add_days($endDate, -($days - 1)));
    if ($startDate > $endDate) {
        throw new InvalidArgumentException('wallet_release_sync_range_invalid');
    }
    $importRows = jg_wallet_positive_int($payload['import_rows'] ?? $payload['max_rows'] ?? $defaultImportRows, 1, $maxImportRows);

    $lock = @fopen(sys_get_temp_dir() . '/jg-wallet-release-sync.lock', 'c+');
    $lockAcquired = !is_resource($lock) || @flock($lock, LOCK_EX | LOCK_NB);
    if (!$lockAcquired) {
        if (is_resource($lock)) {
            fclose($lock);
        }
        $summary = jg_wallet_summary_with_backtrack($pdo, jg_wallet_backtrack_latest($pdo));
        $summary[$responseKey] = [
            'ok' => true,
            'skipped' => true,
            'reason' => 'wallet_release_sync_in_progress',
            'range' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'days' => $days,
                'import_rows' => $importRows,
            ],
        ];
        return $summary;
    }

    $runKey = bin2hex(random_bytes(16));
    $skipRemote = jg_wallet_truthy($payload['skip_remote'] ?? false);
    $before = jg_wallet_release_snapshot($pdo);
    try {
        $sync = [
            'attempted' => !$skipRemote,
            'ok' => $skipRemote,
            'skipped' => $skipRemote,
        ];
        if (!$skipRemote) {
            try {
                $sync = jg_orders_fetch_json_with_timeout(jg_orders_remote_url('/sales/sync', [
                    'mode' => $mode,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'summary' => '0',
                ]), $remoteTimeout);
                $sync['attempted'] = true;
            } catch (Throwable $error) {
                $sync = [
                    'attempted' => true,
                    'ok' => false,
                    'error' => $error->getMessage(),
                ];
                error_log('Wallet release sync failed: ' . $error->getMessage());
            }
        }

        try {
            $import = jg_orders_import_mirror_range_from_api(
                $pdo,
                $startDate,
                $endDate,
                $importRows,
                $event,
                0,
                $importTimeout,
                true
            );
        } catch (Throwable $error) {
            $import = [
                'attempted' => true,
                'ok' => false,
                'error' => $error->getMessage(),
            ];
            error_log('Wallet release mirror import failed: ' . $error->getMessage());
        }

        try {
            $walletTransactions = jg_wallet_import_platform_transactions_from_api(
                $pdo,
                $startDate,
                $endDate,
                max($importTimeout, JG_WALLET_PLATFORM_TRANSACTION_TIMEOUT_SECONDS)
            );
        } catch (Throwable $error) {
            $walletTransactions = [
                'attempted' => true,
                'ok' => false,
                'error' => $error->getMessage(),
            ];
            error_log('Wallet platform transaction import failed: ' . $error->getMessage());
        }

        analyticsTouchLiveState($action === 'backfill' ? 'wallet_release_backfill' : 'wallet_release_sync');

        $summary = jg_wallet_summary_with_backtrack($pdo, jg_wallet_backtrack_latest($pdo));
        $after = jg_wallet_summary_snapshot($summary);
        $ok = !empty($sync['ok']) || !empty($import['upserted']) || !empty($import['fetched']);
        $summary[$responseKey] = [
            'ok' => $ok,
            'run_key' => $runKey,
            'range' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'days' => $days,
                'import_rows' => $importRows,
            ],
            'before' => $before,
            'after' => $after,
            'remote_sync' => $sync,
            'mirror_import' => $import,
            'wallet_transaction_import' => $walletTransactions,
        ];
        jg_wallet_insert_release_sync_log($pdo, [
            'run_key' => $runKey,
            'action' => $action,
            'status' => $ok ? 'ok' : 'error',
            'start_date' => $startDate,
            'end_date' => $endDate,
            'days' => $days,
            'import_rows' => $importRows,
            'skip_remote' => $skipRemote,
            'remote_sync' => $sync,
            'mirror_import' => $import,
            'before' => $before,
            'after' => $after,
        ]);
        return $summary;
    } finally {
        if (is_resource($lock)) {
            @flock($lock, LOCK_UN);
            fclose($lock);
        }
    }
}

/**
 * @return array<string, mixed>
 */
function jg_wallet_import_platform_transactions_from_api(PDO $pdo, string $startDate, string $endDate, int $timeout = 20): array
{
    $activeBalanceAnchors = jg_wallet_active_balance_anchors($pdo);
    $accounts = array_values(array_filter(
        jg_wallet_known_accounts(),
        static function (array $account) use ($activeBalanceAnchors): bool {
            $platform = (string) ($account['platform'] ?? '');
            $accountKey = (string) ($account['account_key'] ?? '');
            if ($platform !== 'shopee') {
                return false;
            }
            if ($activeBalanceAnchors === []) {
                return true;
            }
            return isset($activeBalanceAnchors[jg_wallet_account_key($platform, $accountKey)]);
        }
    ));
    $fetched = 0;
    $upserted = 0;
    $accountResults = [];

    foreach ($accounts as $account) {
        $platform = (string) ($account['platform'] ?? '');
        $accountKey = (string) ($account['account_key'] ?? '');
        try {
            $payload = jg_orders_fetch_json_with_timeout(jg_orders_remote_url('/sales/wallet-transactions', [
                'platform' => $platform,
                'account_key' => $accountKey,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ]), $timeout);
            $remoteAccounts = is_array($payload['wallet_transactions']['accounts'] ?? null)
                ? $payload['wallet_transactions']['accounts']
                : [];
            $transactions = [];
            foreach ($remoteAccounts as $remoteAccount) {
                if (!is_array($remoteAccount)) {
                    continue;
                }
                if ((string) ($remoteAccount['platform'] ?? '') !== $platform || (string) ($remoteAccount['account_key'] ?? '') !== $accountKey) {
                    continue;
                }
                $transactions = is_array($remoteAccount['transactions'] ?? null) ? $remoteAccount['transactions'] : [];
                break;
            }

            $fetched += count($transactions);
            $accountUpserted = jg_wallet_upsert_platform_transactions($pdo, $platform, $accountKey, $transactions);
            $upserted += $accountUpserted;
            $accountResults[] = [
                'platform' => $platform,
                'account_key' => $accountKey,
                'ok' => true,
                'fetched' => count($transactions),
                'upserted' => $accountUpserted,
            ];
        } catch (Throwable $error) {
            $accountResults[] = [
                'platform' => $platform,
                'account_key' => $accountKey,
                'ok' => false,
                'error' => $error->getMessage(),
            ];
        }
    }

    return [
        'attempted' => true,
        'ok' => count(array_filter($accountResults, static fn (array $row): bool => !empty($row['ok']))) > 0,
        'fetched' => $fetched,
        'upserted' => $upserted,
        'accounts' => $accountResults,
    ];
}

/**
 * @param array<int, mixed> $transactions
 */
function jg_wallet_upsert_platform_transactions(PDO $pdo, string $platform, string $accountKey, array $transactions): int
{
    if ($transactions === []) {
        return 0;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO dashboard_wallet_platform_transactions
            (platform, account_key, transaction_id, order_id, transaction_type, money_flow,
             amount, current_balance, transaction_at, raw_json, synced_at)
         VALUES
            (:platform, :account_key, :transaction_id, :order_id, :transaction_type, :money_flow,
             :amount, :current_balance, :transaction_at, :raw_json, UTC_TIMESTAMP(6))
         ON DUPLICATE KEY UPDATE
            order_id = VALUES(order_id),
            transaction_type = VALUES(transaction_type),
            money_flow = VALUES(money_flow),
            amount = VALUES(amount),
            current_balance = VALUES(current_balance),
            transaction_at = VALUES(transaction_at),
            raw_json = VALUES(raw_json),
            synced_at = VALUES(synced_at)'
    );

    $upserted = 0;
    foreach ($transactions as $transaction) {
        if (!is_array($transaction)) {
            continue;
        }
        $createdAt = jg_orders_order_datetime($transaction['created_at'] ?? null);
        if (!$createdAt instanceof DateTimeImmutable && (int) ($transaction['create_time'] ?? 0) > 0) {
            $createdAt = new DateTimeImmutable('@' . (int) $transaction['create_time']);
        }
        if (!$createdAt instanceof DateTimeImmutable) {
            continue;
        }

        $rawJson = json_encode($transaction['raw'] ?? $transaction, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $transactionId = trim((string) ($transaction['transaction_id'] ?? ''));
        if ($transactionId === '') {
            $transactionId = hash('sha256', is_string($rawJson) ? $rawJson : serialize($transaction));
        }

        $currentBalance = $transaction['current_balance'] ?? null;
        $stmt->execute([
            ':platform' => jg_wallet_normalize_key($platform),
            ':account_key' => jg_wallet_normalize_key($accountKey),
            ':transaction_id' => substr($transactionId, 0, 180),
            ':order_id' => substr((string) ($transaction['order_id'] ?? ''), 0, 160),
            ':transaction_type' => substr((string) ($transaction['transaction_type'] ?? ''), 0, 120),
            ':money_flow' => substr((string) ($transaction['money_flow'] ?? ''), 0, 80),
            ':amount' => number_format((float) ($transaction['amount'] ?? 0), 2, '.', ''),
            ':current_balance' => $currentBalance !== null && $currentBalance !== ''
                ? number_format((float) $currentBalance, 2, '.', '')
                : null,
            ':transaction_at' => jg_orders_sql_datetime($createdAt),
            ':raw_json' => is_string($rawJson) ? $rawJson : '{}',
        ]);
        $upserted += 1;
    }

    return $upserted;
}

function jg_wallet_start_backtrack(PDO $pdo, array $payload): array
{
    $startDate = jg_wallet_date((string) ($payload['start_date'] ?? ''), JG_WALLET_BACKTRACK_START_DATE);
    $endDate = jg_wallet_date((string) ($payload['end_date'] ?? ''), jg_wallet_today());
    if ($startDate > $endDate) {
        throw new InvalidArgumentException('wallet_backtrack_range_invalid');
    }

    $active = jg_wallet_backtrack_active($pdo);
    if (is_array($active)
        && (string) ($active['start_date'] ?? '') === $startDate
        && (string) ($active['end_date'] ?? '') === $endDate
    ) {
        return jg_wallet_summary_with_backtrack($pdo, $active);
    }

    $chunkDays = jg_wallet_positive_int($payload['chunk_days'] ?? JG_WALLET_BACKTRACK_CHUNK_DAYS, 1, 7);
    $importRows = jg_wallet_positive_int($payload['import_rows_per_step'] ?? JG_WALLET_BACKTRACK_IMPORT_ROWS_PER_STEP, 50, 500);
    $runKey = bin2hex(random_bytes(16));
    $stmt = $pdo->prepare(
        'INSERT INTO dashboard_wallet_backtrack_runs
            (run_key, status, phase, start_date, end_date, cursor_date, cursor_account_index,
             import_offset, chunk_days, import_rows_per_step, started_by, last_message, created_at, updated_at)
         VALUES
            (:run_key, "running", "sync", :start_date, :end_date, :cursor_date, 0,
             0, :chunk_days, :import_rows_per_step, :started_by, :last_message, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))'
    );
    $stmt->execute([
        ':run_key' => $runKey,
        ':start_date' => $startDate,
        ':end_date' => $endDate,
        ':cursor_date' => $startDate,
        ':chunk_days' => $chunkDays,
        ':import_rows_per_step' => $importRows,
        ':started_by' => jg_wallet_actor(),
        ':last_message' => 'Backtrack queued from May 20, 2026.',
    ]);

    return jg_wallet_summary_with_backtrack($pdo, jg_wallet_backtrack_by_key($pdo, $runKey));
}

function jg_wallet_cancel_backtrack(PDO $pdo, array $payload): array
{
    $runKey = trim((string) ($payload['run_key'] ?? ''));
    $run = $runKey !== '' ? jg_wallet_backtrack_by_key($pdo, $runKey) : jg_wallet_backtrack_active($pdo);
    if (!is_array($run)) {
        throw new InvalidArgumentException('wallet_backtrack_not_found');
    }

    if ((string) ($run['status'] ?? '') !== 'running') {
        return jg_wallet_summary_with_backtrack($pdo, $run);
    }

    $stmt = $pdo->prepare(
        'UPDATE dashboard_wallet_backtrack_runs
         SET status = "cancelled",
             phase = "cancelled",
             last_message = "Backtrack cancelled.",
             last_error = "",
             updated_at = UTC_TIMESTAMP(6),
             completed_at = UTC_TIMESTAMP(6)
         WHERE run_key = :run_key
           AND status = "running"'
    );
    $stmt->execute([
        ':run_key' => (string) $run['run_key'],
    ]);

    analyticsTouchLiveState('wallet_backtrack_cancelled');

    return jg_wallet_summary_with_backtrack($pdo, jg_wallet_backtrack_by_key($pdo, (string) $run['run_key']) ?: $run);
}

function jg_wallet_step_backtrack(PDO $pdo, array $payload): array
{
    if (function_exists('set_time_limit')) {
        @set_time_limit(120);
    }

    $runKey = trim((string) ($payload['run_key'] ?? ''));
    $run = $runKey !== '' ? jg_wallet_backtrack_by_key($pdo, $runKey) : jg_wallet_backtrack_active($pdo);
    if (!is_array($run)) {
        throw new InvalidArgumentException('wallet_backtrack_not_found');
    }
    if (!in_array((string) ($run['status'] ?? ''), ['running'], true)) {
        return jg_wallet_summary_with_backtrack($pdo, $run);
    }

    try {
        $run = jg_wallet_run_backtrack_step($pdo, $run);
        analyticsTouchLiveState('wallet_backtrack');
    } catch (Throwable $error) {
        $run = jg_wallet_fail_backtrack($pdo, $run, $error->getMessage());
    }

    return jg_wallet_summary_with_backtrack($pdo, $run);
}

function jg_wallet_run_backtrack_step(PDO $pdo, array $run): array
{
    $accounts = jg_wallet_backtrack_accounts();
    if ($accounts === []) {
        throw new RuntimeException('wallet_backtrack_accounts_missing');
    }

    $startDate = (string) ($run['start_date'] ?? JG_WALLET_BACKTRACK_START_DATE);
    $endDate = (string) ($run['end_date'] ?? jg_wallet_today());
    $cursorDate = jg_wallet_date((string) ($run['cursor_date'] ?? $startDate), $startDate);
    if ($cursorDate > $endDate) {
        return jg_wallet_complete_backtrack($pdo, $run, 'Backtrack complete.');
    }

    $chunkDays = jg_wallet_positive_int($run['chunk_days'] ?? JG_WALLET_BACKTRACK_CHUNK_DAYS, 1, 7);
    $chunkEnd = jg_wallet_chunk_end($cursorDate, $endDate, $chunkDays);
    $phase = (string) ($run['phase'] ?? 'sync');
    $accountIndex = max(0, (int) ($run['cursor_account_index'] ?? 0));

    if ($phase !== 'import' && $accountIndex < count($accounts)) {
        $account = $accounts[$accountIndex];
        $syncPayload = jg_orders_fetch_json_with_timeout(jg_orders_remote_url('/sales/sync', [
            'mode' => 'wallet_backtrack',
            'platform' => $account['platform'],
            'account_key' => $account['account_key'],
            'start_date' => $cursorDate,
            'end_date' => $chunkEnd,
            'summary' => '0',
        ]), JG_WALLET_BACKTRACK_REMOTE_TIMEOUT_SECONDS);
        $nextAccountIndex = $accountIndex + 1;
        $nextPhase = $nextAccountIndex >= count($accounts) ? 'import' : 'sync';
        $message = sprintf(
            'Synced %s for %s to %s.',
            (string) ($account['label'] ?? $account['account_key']),
            $cursorDate,
            $chunkEnd
        );

        $stmt = $pdo->prepare(
            'UPDATE dashboard_wallet_backtrack_runs
             SET phase = :phase,
                 cursor_account_index = :cursor_account_index,
                 sync_calls = sync_calls + 1,
                 last_message = :last_message,
                 last_error = "",
                 last_sync_json = :last_sync_json,
                 updated_at = UTC_TIMESTAMP(6)
             WHERE run_key = :run_key
               AND status = "running"'
        );
        $stmt->execute([
            ':phase' => $nextPhase,
            ':cursor_account_index' => $nextAccountIndex,
            ':last_message' => $message,
            ':last_sync_json' => jg_wallet_json_blob($syncPayload),
            ':run_key' => (string) $run['run_key'],
        ]);

        return jg_wallet_backtrack_by_key($pdo, (string) $run['run_key']) ?: $run;
    }

    $importRows = jg_wallet_positive_int($run['import_rows_per_step'] ?? JG_WALLET_BACKTRACK_IMPORT_ROWS_PER_STEP, 50, 500);
    $importOffset = max(0, (int) ($run['import_offset'] ?? 0));
    $import = jg_orders_import_mirror_range_from_api(
        $pdo,
        $cursorDate,
        $chunkEnd,
        $importRows,
        'wallet_backtrack',
        $importOffset,
        30,
        true
    );
    try {
        $walletTransactions = jg_wallet_import_platform_transactions_from_api(
            $pdo,
            $cursorDate,
            $chunkEnd,
            JG_WALLET_PLATFORM_TRANSACTION_TIMEOUT_SECONDS
        );
    } catch (Throwable $error) {
        $walletTransactions = [
            'attempted' => true,
            'ok' => false,
            'error' => $error->getMessage(),
        ];
    }
    $hasMore = !empty($import['has_more']);
    $nextOffset = $hasMore ? max(0, (int) ($import['next_offset'] ?? 0)) : 0;
    $nextCursorDate = $hasMore ? $cursorDate : jg_wallet_add_days($chunkEnd, 1);
    $isComplete = !$hasMore && $nextCursorDate > $endDate;
    $message = sprintf(
        'Imported %s rows for %s to %s.',
        number_format((int) ($import['fetched'] ?? 0)),
        $cursorDate,
        $chunkEnd
    );

    $stmt = $pdo->prepare(
        'UPDATE dashboard_wallet_backtrack_runs
         SET status = :status,
             phase = :phase,
             cursor_date = :cursor_date,
             cursor_account_index = :cursor_account_index,
             import_offset = :import_offset,
             import_pages = import_pages + :import_pages,
             imported_rows = imported_rows + :imported_rows,
             upserted_rows = upserted_rows + :upserted_rows,
             last_message = :last_message,
             last_error = "",
             last_import_json = :last_import_json,
             updated_at = UTC_TIMESTAMP(6),
             completed_at = CASE WHEN :complete_flag = 1 THEN UTC_TIMESTAMP(6) ELSE completed_at END
         WHERE run_key = :run_key
           AND status = "running"'
    );
    $stmt->execute([
        ':status' => $isComplete ? 'complete' : 'running',
        ':phase' => $hasMore ? 'import' : 'sync',
        ':cursor_date' => $isComplete ? $endDate : $nextCursorDate,
        ':cursor_account_index' => $hasMore ? count($accounts) : 0,
        ':import_offset' => $nextOffset,
        ':import_pages' => (int) ($import['pages'] ?? 0),
        ':imported_rows' => (int) ($import['fetched'] ?? 0),
        ':upserted_rows' => (int) ($import['upserted'] ?? 0),
        ':last_message' => $isComplete ? 'Backtrack complete.' : $message,
        ':last_import_json' => jg_wallet_json_blob($import + ['wallet_transaction_import' => $walletTransactions]),
        ':complete_flag' => $isComplete ? 1 : 0,
        ':run_key' => (string) $run['run_key'],
    ]);

    return jg_wallet_backtrack_by_key($pdo, (string) $run['run_key']) ?: $run;
}

function jg_wallet_undo_release(PDO $pdo, array $payload): array
{
    $id = max(0, (int) ($payload['id'] ?? $payload['release_id'] ?? 0));
    if ($id <= 0) {
        throw new InvalidArgumentException('missing_release_id');
    }

    $stmt = $pdo->prepare(
        'UPDATE dashboard_wallet_releases
         SET undone_at = UTC_TIMESTAMP(6),
             undone_by = :undone_by,
             undo_note = :undo_note
         WHERE id = :id
           AND undone_at IS NULL'
    );
    $stmt->execute([
        ':id' => $id,
        ':undone_by' => jg_wallet_actor(),
        ':undo_note' => substr(trim((string) ($payload['note'] ?? '')), 0, 255),
    ]);

    if ($stmt->rowCount() <= 0) {
        throw new InvalidArgumentException('release_not_active');
    }

    analyticsTouchLiveState('wallet_release_undo');

    return jg_wallet_summary($pdo);
}

/**
 * @return array<int, array<string, mixed>>
 */
function jg_wallet_order_totals(PDO $pdo, array $activeBalanceAnchors = [], array $releasedMonthWindow = []): array
{
    $stmt = $pdo->query(
        'SELECT platform,
                account_key,
                CASE WHEN order_id = "" THEN order_item_hash ELSE order_id END AS order_key,
                MAX(company) AS company,
                MAX(order_net_revenue) AS order_amount,
                MAX(funds_released) AS funds_released,
                MAX(funds_released_amount) AS funds_released_amount,
                MAX(funds_released_at) AS funds_released_at,
                MAX(order_create_time) AS order_create_time,
                MAX(status) AS order_status,
                MAX(funds_release_status) AS funds_release_status,
                MAX(funds_release_source) AS funds_release_source,
                MAX(source_updated_at) AS source_updated_at,
                MAX(mirrored_at) AS mirrored_at
         FROM dashboard_order_mirror
         WHERE deleted_at IS NULL
           AND platform IN ("shopee", "tiktok")
         GROUP BY platform, account_key, order_key
         ORDER BY platform ASC, account_key ASC'
    );

    $orders = $stmt ? $stmt->fetchAll() : [];
    $accounts = [];
    foreach ($orders as $order) {
        $platform = (string) ($order['platform'] ?? '');
        $accountKey = (string) ($order['account_key'] ?? '');
        $key = jg_wallet_account_key($platform, $accountKey);
        if (!isset($accounts[$key])) {
            $accounts[$key] = [
                'platform' => $platform,
                'account_key' => $accountKey,
                'company' => (string) ($order['company'] ?? ''),
                'label' => jg_wallet_account_label((string) ($order['company'] ?? ''), $platform, $accountKey),
            ] + jg_wallet_empty_amounts();
        }

        if ((string) ($accounts[$key]['company'] ?? '') === '' && trim((string) ($order['company'] ?? '')) !== '') {
            $accounts[$key]['company'] = (string) $order['company'];
            $accounts[$key]['label'] = jg_wallet_account_label((string) $order['company'], $platform, $accountKey);
        }

        $bucket = jg_wallet_order_bucket($order);
        $orderAmount = jg_wallet_order_amount($order);
        $releasedAmount = jg_wallet_released_amount($order, $orderAmount);
        $accounts[$key]['orders'] = (int) ($accounts[$key]['orders'] ?? 0) + 1;
        $accounts[$key]['last_order_at'] = jg_wallet_max_datetime((string) ($accounts[$key]['last_order_at'] ?? ''), $order['order_create_time'] ?? '');
        $accounts[$key]['last_source_updated_at'] = jg_wallet_max_datetime((string) ($accounts[$key]['last_source_updated_at'] ?? ''), $order['source_updated_at'] ?? '');
        $accounts[$key]['last_mirrored_at'] = jg_wallet_max_datetime((string) ($accounts[$key]['last_mirrored_at'] ?? ''), $order['mirrored_at'] ?? '');
        jg_wallet_increment_breakdown($accounts[$key]['release_status_breakdown'], $order['funds_release_status'] ?? '');
        jg_wallet_increment_breakdown($accounts[$key]['order_status_breakdown'], $order['order_status'] ?? '');
        jg_wallet_increment_breakdown($accounts[$key]['release_source_breakdown'], $order['funds_release_source'] ?? '');

        if ($bucket === 'released') {
            $accounts[$key]['released_orders'] = (int) ($accounts[$key]['released_orders'] ?? 0) + 1;
            $accounts[$key]['released_total'] = (int) ($accounts[$key]['released_total'] ?? 0) + $releasedAmount;
            $accounts[$key]['last_released_at'] = jg_wallet_max_datetime((string) ($accounts[$key]['last_released_at'] ?? ''), $order['funds_released_at'] ?? '');
            if (jg_wallet_released_in_window($order, $releasedMonthWindow)) {
                $accounts[$key]['released_month_orders'] = (int) ($accounts[$key]['released_month_orders'] ?? 0) + 1;
                $accounts[$key]['released_month_total'] = (int) ($accounts[$key]['released_month_total'] ?? 0) + $releasedAmount;
            }
            $anchor = $activeBalanceAnchors[$key] ?? null;
            if (is_array($anchor) && jg_wallet_release_is_after_anchor($order, $anchor)) {
                $accounts[$key]['released_since_anchor_orders'] = (int) ($accounts[$key]['released_since_anchor_orders'] ?? 0) + 1;
                $accounts[$key]['released_since_anchor_total'] = (int) ($accounts[$key]['released_since_anchor_total'] ?? 0) + $releasedAmount;
            }
            continue;
        }

        if ($bucket === 'non_settling') {
            $accounts[$key]['non_settling_orders'] = (int) ($accounts[$key]['non_settling_orders'] ?? 0) + 1;
            continue;
        }

        $accounts[$key]['outstanding_orders'] = (int) ($accounts[$key]['outstanding_orders'] ?? 0) + 1;
        $accounts[$key]['outstanding_total'] = (int) ($accounts[$key]['outstanding_total'] ?? 0) + $orderAmount;
    }

    return array_values($accounts);
}

function jg_wallet_current_month_window(?DateTimeImmutable $now = null): array
{
    $timezone = new DateTimeZone('Asia/Jakarta');
    $localNow = $now instanceof DateTimeImmutable
        ? $now->setTimezone($timezone)
        : new DateTimeImmutable('now', $timezone);
    $startLocal = $localNow->modify('first day of this month')->setTime(0, 0, 0, 0);
    $endLocal = $startLocal->modify('first day of next month');

    return [
        'timezone' => 'Asia/Jakarta',
        'label' => $startLocal->format('F Y'),
        'start_date' => $startLocal->format('Y-m-d'),
        'end_date' => $endLocal->modify('-1 day')->format('Y-m-d'),
        'start_at' => jg_orders_sql_datetime($startLocal) ?? '',
        'end_at' => jg_orders_sql_datetime($endLocal) ?? '',
    ];
}

function jg_wallet_released_in_window(array $order, array $window): bool
{
    $startAt = trim((string) ($window['start_at'] ?? ''));
    $endAt = trim((string) ($window['end_at'] ?? ''));
    if ($startAt === '' || $endAt === '') {
        return false;
    }

    $releasedAt = jg_orders_sql_datetime(jg_orders_order_datetime($order['funds_released_at'] ?? null));
    return is_string($releasedAt) && $releasedAt >= $startAt && $releasedAt < $endAt;
}

function jg_wallet_order_bucket(array $order): string
{
    if (
        (int) ($order['funds_released'] ?? 0) > 0
        && jg_orders_release_marker_trusted(
            (string) ($order['platform'] ?? ''),
            $order['order_status'] ?? $order['status'] ?? '',
            $order['funds_release_status'] ?? '',
            $order['funds_release_source'] ?? ''
        )
    ) {
        return 'released';
    }

    if (
        jg_wallet_is_non_settling_status($order['funds_release_status'] ?? '')
        || jg_wallet_is_non_settling_status($order['order_status'] ?? $order['status'] ?? '')
    ) {
        return 'non_settling';
    }

    return 'outstanding';
}

function jg_wallet_release_anchor_class(array $order, ?array $anchor): string
{
    $bucket = jg_wallet_order_bucket($order);
    if ((int) ($order['funds_released'] ?? 0) > 0 && $bucket !== 'released') {
        return 'untrusted_release_marker';
    }
    if ($bucket === 'non_settling') {
        return 'non_settling';
    }
    if ($bucket !== 'released') {
        return 'outstanding';
    }
    if (!is_array($anchor)) {
        return 'released_without_anchor';
    }

    $releasedAt = trim((string) ($order['funds_released_at'] ?? ''));
    $observedAt = trim((string) ($anchor['observed_at_sql'] ?? $anchor['observed_at'] ?? ''));
    if ($releasedAt === '') {
        return 'released_missing_release_time';
    }
    if ($observedAt === '') {
        return 'released_without_anchor_time';
    }

    return strcmp($releasedAt, $observedAt) > 0 ? 'released_after_anchor' : 'released_at_or_before_anchor';
}

function jg_wallet_release_anchor_reason(string $class): string
{
    return match ($class) {
        'released_after_anchor' => 'Trusted release timestamp is after the manual wallet anchor, so the amount is added.',
        'released_at_or_before_anchor' => 'Trusted release timestamp is at or before the manual wallet anchor, so the amount is already included in the manual anchor.',
        'released_missing_release_time' => 'Release marker is trusted, but no release timestamp exists, so it cannot be compared to the anchor.',
        'released_without_anchor' => 'Release is trusted, but this wallet has no manual anchor.',
        'released_without_anchor_time' => 'Release is trusted, but the active anchor has no comparable timestamp.',
        'untrusted_release_marker' => 'The row says funds were released, but order status/source does not meet the dashboard trusted-release rule.',
        'non_settling' => 'Order is cancelled, returned, failed, unpaid, or otherwise excluded from settlement.',
        'outstanding' => 'Order has no trusted released-funds marker.',
        default => 'Unclassified wallet order state.',
    };
}

/**
 * @return array<string, mixed>
 */
function jg_wallet_diagnostic_order_example(array $order, string $class, int $amount): array
{
    return [
        'order_key' => (string) ($order['order_key'] ?? $order['order_id'] ?? ''),
        'order_id' => (string) ($order['order_id'] ?? ''),
        'amount' => $amount,
        'classification' => $class,
        'counted_after_anchor' => $class === 'released_after_anchor',
        'funds_released' => (int) ($order['funds_released'] ?? 0) > 0,
        'funds_released_at' => jg_orders_atom_datetime((string) ($order['funds_released_at'] ?? '')),
        'funds_released_amount' => (int) round((float) ($order['funds_released_amount'] ?? 0)),
        'funds_release_status' => (string) ($order['funds_release_status'] ?? ''),
        'funds_release_source' => (string) ($order['funds_release_source'] ?? ''),
        'order_status' => (string) ($order['order_status'] ?? $order['status'] ?? ''),
        'order_create_time' => jg_orders_atom_datetime((string) ($order['order_create_time'] ?? '')),
        'source_updated_at' => jg_orders_atom_datetime((string) ($order['source_updated_at'] ?? '')),
        'mirrored_at' => jg_orders_atom_datetime((string) ($order['mirrored_at'] ?? '')),
    ];
}

function jg_wallet_release_is_after_anchor(array $order, array $anchor): bool
{
    $releasedAt = trim((string) ($order['funds_released_at'] ?? ''));
    $observedAt = trim((string) ($anchor['observed_at_sql'] ?? $anchor['observed_at'] ?? ''));
    return $releasedAt !== '' && $observedAt !== '' && strcmp($releasedAt, $observedAt) > 0;
}

function jg_wallet_apply_balance_anchor(array &$account, ?array $anchor): void
{
    $releasedSinceAnchor = (int) round((float) ($account['released_since_anchor_total'] ?? 0));
    $withdrawnSinceAnchor = (int) round((float) ($account['withdrawn_since_anchor_total'] ?? 0));
    $walletTransactionSinceAnchor = (int) round((float) ($account['wallet_transaction_since_anchor_total'] ?? 0));
    $walletTransactionSinceAnchorCount = (int) ($account['wallet_transaction_since_anchor_count'] ?? 0);
    $account['source_wallet_balance'] = (int) round((float) ($account['released_total'] ?? 0));
    $account['wallet_balance_basis'] = 'manual_required';
    $account['wallet_balance_known'] = false;
    $account['wallet_balance'] = 0;
    $account['manual_anchor_balance'] = 0;
    $account['manual_anchor_observed_at'] = '';
    $account['manual_anchor_created_at'] = '';
    $account['manual_anchor_created_by'] = '';
    $account['last_wallet_cleared_at'] = '';
    $account['clearance_source'] = 'manual_required';
    $account['cash_out_source'] = 'manual';

    if (!is_array($anchor)) {
        return;
    }

    $anchorBalance = max(0, (int) round((float) ($anchor['balance_amount'] ?? 0)));
    $account['wallet_balance_known'] = true;
    $account['wallet_balance_basis'] = 'manual_anchor_plus_releases_after_anchor_minus_withdrawals_after_anchor';
    $account['manual_anchor_id'] = (int) ($anchor['id'] ?? 0);
    $account['manual_anchor_balance'] = $anchorBalance;
    $account['manual_anchor_observed_at'] = jg_orders_atom_datetime((string) ($anchor['observed_at_sql'] ?? $anchor['observed_at'] ?? ''));
    $account['manual_anchor_created_at'] = jg_orders_atom_datetime((string) ($anchor['created_at'] ?? ''));
    $account['manual_anchor_created_by'] = (string) ($anchor['created_by'] ?? '');
    $account['last_wallet_cleared_at'] = $account['manual_anchor_observed_at'];
    $account['clearance_source'] = 'manual_balance_anchor';
    if ($walletTransactionSinceAnchorCount > 0) {
        $account['wallet_balance_basis'] = 'manual_anchor_plus_platform_wallet_transactions_after_anchor';
        $account['wallet_balance'] = max(0, $anchorBalance + $walletTransactionSinceAnchor);
        $account['wallet_activity_since_anchor_total'] = $walletTransactionSinceAnchor;
        $account['wallet_activity_since_anchor_count'] = $walletTransactionSinceAnchorCount;
        $account['wallet_activity_source'] = 'platform_wallet_transactions';
        $account['cash_out_source'] = 'platform_wallet_transactions';
        return;
    }

    $account['wallet_balance'] = max(0, $anchorBalance + $releasedSinceAnchor - $withdrawnSinceAnchor);
    $account['wallet_activity_since_anchor_total'] = $releasedSinceAnchor - $withdrawnSinceAnchor;
    $account['wallet_activity_since_anchor_count'] = (int) ($account['released_since_anchor_orders'] ?? 0) + (int) ($account['withdrawn_since_anchor_count'] ?? 0);
    $account['wallet_activity_source'] = 'marketplace_order_releases';
}

function jg_wallet_is_non_settling_status(mixed $status): bool
{
    $normalized = jg_wallet_normalize_status($status);
    if ($normalized === '') {
        return false;
    }

    return in_array($normalized, [
        'CANCEL',
        'CANCELED',
        'CANCELLED',
        'CANCELLED_BY_BUYER',
        'CANCELLED_BY_SELLER',
        'CANCELLED_BY_SYSTEM',
        'REFUND',
        'REFUNDED',
        'RETURN',
        'RETURNED',
        'REJECTED',
        'FAILED',
        'EXPIRED',
        'UNPAID',
        'VOID',
        'VOIDED',
    ], true);
}

function jg_wallet_normalize_status(mixed $status): string
{
    return trim(preg_replace('/[^A-Z0-9]+/', '_', strtoupper((string) $status)) ?? '', '_');
}

function jg_wallet_order_amount(array $order): int
{
    return max(0, (int) round((float) ($order['order_amount'] ?? 0)));
}

function jg_wallet_released_amount(array $order, int $orderAmount): int
{
    $releasedAmount = max(0, (int) round((float) ($order['funds_released_amount'] ?? 0)));
    return $releasedAmount > 0 ? $releasedAmount : max(0, $orderAmount);
}

function jg_wallet_max_datetime(string $left, mixed $right): string
{
    $candidate = trim((string) $right);
    if ($candidate === '') {
        return $left;
    }
    if ($left === '') {
        return $candidate;
    }

    return strcmp($candidate, $left) > 0 ? $candidate : $left;
}

function jg_wallet_increment_breakdown(mixed &$breakdown, mixed $value): void
{
    if (!is_array($breakdown)) {
        $breakdown = [];
    }
    $label = trim((string) $value);
    if ($label === '') {
        $label = 'UNKNOWN';
    }
    $breakdown[$label] = (int) ($breakdown[$label] ?? 0) + 1;
    arsort($breakdown);
}

/**
 * @return array<string, array<string, mixed>>
 */
function jg_wallet_active_balance_anchors(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT id, platform, account_key, balance_amount, observed_at, observed_at AS observed_at_sql,
                anchor_note, created_by, created_at
         FROM dashboard_wallet_balance_anchors
         WHERE undone_at IS NULL
         ORDER BY platform ASC, account_key ASC, observed_at DESC, id DESC'
    );
    $rows = $stmt ? $stmt->fetchAll() : [];
    $anchors = [];
    foreach ($rows as $row) {
        $key = jg_wallet_account_key((string) ($row['platform'] ?? ''), (string) ($row['account_key'] ?? ''));
        if ($key === '|' || isset($anchors[$key])) {
            continue;
        }
        $anchors[$key] = [
            'id' => (int) ($row['id'] ?? 0),
            'platform' => (string) ($row['platform'] ?? ''),
            'account_key' => (string) ($row['account_key'] ?? ''),
            'balance_amount' => (int) round((float) ($row['balance_amount'] ?? 0)),
            'observed_at' => jg_orders_atom_datetime((string) ($row['observed_at'] ?? '')),
            'observed_at_sql' => (string) ($row['observed_at_sql'] ?? ''),
            'note' => (string) ($row['anchor_note'] ?? ''),
            'created_by' => (string) ($row['created_by'] ?? ''),
            'created_at' => jg_orders_atom_datetime((string) ($row['created_at'] ?? '')),
        ];
    }

    return $anchors;
}

/**
 * @return array<int, array<string, mixed>>
 */
function jg_wallet_active_release_totals(PDO $pdo, array $activeBalanceAnchors = []): array
{
    $stmt = $pdo->query(
        'SELECT platform, account_key, amount, withdrawn_at, created_at
         FROM dashboard_wallet_releases
         WHERE undone_at IS NULL'
    );

    $rows = $stmt ? $stmt->fetchAll() : [];
    $totals = [];
    foreach ($rows as $row) {
        $key = jg_wallet_account_key((string) ($row['platform'] ?? ''), (string) ($row['account_key'] ?? ''));
        if ($key === '|') {
            continue;
        }

        if (!isset($totals[$key])) {
            $totals[$key] = [
                'platform' => (string) ($row['platform'] ?? ''),
                'account_key' => (string) ($row['account_key'] ?? ''),
                'amount' => 0,
                'count' => 0,
                'since_anchor_amount' => 0,
                'since_anchor_count' => 0,
                'last_withdrawn_at' => '',
            ];
        }

        $amount = max(0, (int) round((float) ($row['amount'] ?? 0)));
        $withdrawnAt = trim((string) ($row['withdrawn_at'] ?? ''));
        if ($withdrawnAt === '') {
            $withdrawnAt = trim((string) ($row['created_at'] ?? ''));
        }
        $totals[$key]['amount'] += $amount;
        $totals[$key]['count'] = (int) ($totals[$key]['count'] ?? 0) + 1;
        $totals[$key]['last_withdrawn_at'] = jg_wallet_max_datetime((string) ($totals[$key]['last_withdrawn_at'] ?? ''), $withdrawnAt);

        $anchor = $activeBalanceAnchors[$key] ?? null;
        $anchorAt = is_array($anchor) ? trim((string) ($anchor['observed_at_sql'] ?? $anchor['observed_at'] ?? '')) : '';
        if ($anchorAt !== '' && $withdrawnAt !== '' && strcmp($withdrawnAt, $anchorAt) > 0) {
            $totals[$key]['since_anchor_amount'] += $amount;
            $totals[$key]['since_anchor_count'] = (int) ($totals[$key]['since_anchor_count'] ?? 0) + 1;
        }
    }

    return array_values($totals);
}

/**
 * @return array<int, array<string, mixed>>
 */
function jg_wallet_platform_transaction_totals(PDO $pdo, array $activeBalanceAnchors = []): array
{
    try {
        $stmt = $pdo->query(
            'SELECT platform, account_key, transaction_id, amount, current_balance, transaction_at
             FROM dashboard_wallet_platform_transactions
             ORDER BY platform ASC, account_key ASC, transaction_at ASC, id ASC'
        );
        $rows = $stmt ? $stmt->fetchAll() : [];
    } catch (Throwable) {
        return [];
    }

    $totals = [];
    foreach ($rows as $row) {
        $key = jg_wallet_account_key((string) ($row['platform'] ?? ''), (string) ($row['account_key'] ?? ''));
        if ($key === '|') {
            continue;
        }
        if (!isset($totals[$key])) {
            $totals[$key] = [
                'platform' => (string) ($row['platform'] ?? ''),
                'account_key' => (string) ($row['account_key'] ?? ''),
                'amount' => 0,
                'count' => 0,
                'since_anchor_amount' => 0,
                'since_anchor_count' => 0,
                'current_balance' => null,
                'last_transaction_at' => '',
            ];
        }

        $amount = (int) round((float) ($row['amount'] ?? 0));
        $transactionAt = trim((string) ($row['transaction_at'] ?? ''));
        $totals[$key]['amount'] += $amount;
        $totals[$key]['count'] = (int) ($totals[$key]['count'] ?? 0) + 1;
        $totals[$key]['last_transaction_at'] = jg_wallet_max_datetime((string) ($totals[$key]['last_transaction_at'] ?? ''), $transactionAt);
        if ($row['current_balance'] !== null && $transactionAt === (string) ($totals[$key]['last_transaction_at'] ?? '')) {
            $totals[$key]['current_balance'] = (int) round((float) $row['current_balance']);
        }

        $anchor = $activeBalanceAnchors[$key] ?? null;
        $anchorAt = is_array($anchor) ? trim((string) ($anchor['observed_at_sql'] ?? $anchor['observed_at'] ?? '')) : '';
        if ($anchorAt !== '' && $transactionAt !== '' && strcmp($transactionAt, $anchorAt) > 0) {
            $totals[$key]['since_anchor_amount'] += $amount;
            $totals[$key]['since_anchor_count'] = (int) ($totals[$key]['since_anchor_count'] ?? 0) + 1;
        }
    }

    return array_values($totals);
}

/**
 * @return array<int, array<string, mixed>>
 */
function jg_wallet_release_logs(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT id, platform, account_key, amount, release_note, released_by, withdrawn_at, created_at, undone_at, undone_by, undo_note
         FROM dashboard_wallet_releases
         ORDER BY COALESCE(withdrawn_at, created_at) DESC, id DESC
         LIMIT 120'
    );
    $rows = $stmt ? $stmt->fetchAll() : [];

    return array_map(static function (array $row): array {
        return [
            'id' => (int) ($row['id'] ?? 0),
            'platform' => (string) ($row['platform'] ?? ''),
            'account_key' => (string) ($row['account_key'] ?? ''),
            'label' => jg_wallet_account_label('', (string) ($row['platform'] ?? ''), (string) ($row['account_key'] ?? '')),
            'amount' => (int) round((float) ($row['amount'] ?? 0)),
            'note' => (string) ($row['release_note'] ?? ''),
            'released_by' => (string) ($row['released_by'] ?? ''),
            'withdrawn_at' => jg_orders_atom_datetime((string) (($row['withdrawn_at'] ?? '') ?: ($row['created_at'] ?? ''))),
            'created_at' => jg_orders_atom_datetime((string) ($row['created_at'] ?? '')),
            'undone_at' => jg_orders_atom_datetime((string) ($row['undone_at'] ?? '')),
            'undone_by' => (string) ($row['undone_by'] ?? ''),
            'undo_note' => (string) ($row['undo_note'] ?? ''),
            'active' => trim((string) ($row['undone_at'] ?? '')) === '',
        ];
    }, $rows);
}

/**
 * @return array<string, mixed>
 */
function jg_wallet_release_snapshot(PDO $pdo): array
{
    try {
        return jg_wallet_summary_snapshot(jg_wallet_summary($pdo));
    } catch (Throwable $error) {
        return [
            'error' => $error->getMessage(),
            'totals' => [],
            'wallets' => [],
        ];
    }
}

/**
 * @param array<string, mixed> $summary
 * @return array<string, mixed>
 */
function jg_wallet_summary_snapshot(array $summary): array
{
    $wallets = [];
    foreach (($summary['wallets'] ?? []) as $wallet) {
        if (!is_array($wallet)) {
            continue;
        }
        $wallets[] = [
            'platform' => (string) ($wallet['platform'] ?? ''),
            'account_key' => (string) ($wallet['account_key'] ?? ''),
            'wallet_balance' => (int) ($wallet['wallet_balance'] ?? 0),
            'wallet_balance_known' => !empty($wallet['wallet_balance_known']),
            'manual_anchor_balance' => (int) ($wallet['manual_anchor_balance'] ?? 0),
            'released_since_anchor_total' => (int) ($wallet['released_since_anchor_total'] ?? 0),
            'released_since_anchor_orders' => (int) ($wallet['released_since_anchor_orders'] ?? 0),
            'released_month_total' => (int) ($wallet['released_month_total'] ?? 0),
            'released_month_orders' => (int) ($wallet['released_month_orders'] ?? 0),
            'withdrawn_since_anchor_total' => (int) ($wallet['withdrawn_since_anchor_total'] ?? 0),
            'outstanding_total' => (int) ($wallet['outstanding_total'] ?? 0),
            'outstanding_orders' => (int) ($wallet['outstanding_orders'] ?? 0),
            'last_released_at' => (string) ($wallet['last_released_at'] ?? ''),
            'last_mirrored_at' => (string) ($wallet['last_mirrored_at'] ?? ''),
        ];
    }

    return [
        'generated_at' => (string) ($summary['generated_at'] ?? gmdate(DATE_ATOM)),
        'current_month' => is_array($summary['current_month'] ?? null) ? $summary['current_month'] : [],
        'totals' => [
            'wallet_balance' => (int) (($summary['totals']['wallet_balance'] ?? 0)),
            'released_since_anchor_total' => (int) (($summary['totals']['released_since_anchor_total'] ?? 0)),
            'released_month_total' => (int) (($summary['totals']['released_month_total'] ?? 0)),
            'withdrawn_since_anchor_total' => (int) (($summary['totals']['withdrawn_since_anchor_total'] ?? 0)),
            'outstanding_total' => (int) (($summary['totals']['outstanding_total'] ?? 0)),
            'released_total' => (int) (($summary['totals']['released_total'] ?? 0)),
        ],
        'wallets' => $wallets,
    ];
}

function jg_wallet_snapshot_total(array $snapshot, string $key): int
{
    return (int) (($snapshot['totals'][$key] ?? 0));
}

/**
 * @param array<string, mixed> $row
 */
function jg_wallet_insert_release_sync_log(PDO $pdo, array $row): void
{
    $remote = is_array($row['remote_sync'] ?? null) ? $row['remote_sync'] : [];
    $import = is_array($row['mirror_import'] ?? null) ? $row['mirror_import'] : [];
    $before = is_array($row['before'] ?? null) ? $row['before'] : [];
    $after = is_array($row['after'] ?? null) ? $row['after'] : [];
    $errorMessage = trim(implode(' | ', array_filter([
        (string) ($remote['error'] ?? ''),
        (string) ($import['error'] ?? ''),
    ])));

    try {
        $stmt = $pdo->prepare(
            'INSERT INTO dashboard_wallet_release_sync_logs
                (run_key, action, status, start_date, end_date, days, import_rows, skip_remote,
                 remote_ok, import_ok, fetched_rows, upserted_rows,
                 before_wallet_balance, after_wallet_balance,
                 before_released_since_anchor, after_released_since_anchor,
                 remote_json, import_json, before_json, after_json, error_message, created_at, updated_at)
             VALUES
                (:run_key, :action, :status, :start_date, :end_date, :days, :import_rows, :skip_remote,
                 :remote_ok, :import_ok, :fetched_rows, :upserted_rows,
                 :before_wallet_balance, :after_wallet_balance,
                 :before_released_since_anchor, :after_released_since_anchor,
                 :remote_json, :import_json, :before_json, :after_json, :error_message, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))'
        );
        $stmt->execute([
            ':run_key' => (string) ($row['run_key'] ?? bin2hex(random_bytes(16))),
            ':action' => substr((string) ($row['action'] ?? 'sync'), 0, 32),
            ':status' => substr((string) ($row['status'] ?? 'ok'), 0, 24),
            ':start_date' => (string) ($row['start_date'] ?? jg_wallet_today()),
            ':end_date' => (string) ($row['end_date'] ?? jg_wallet_today()),
            ':days' => (int) ($row['days'] ?? 0),
            ':import_rows' => (int) ($row['import_rows'] ?? 0),
            ':skip_remote' => !empty($row['skip_remote']) ? 1 : 0,
            ':remote_ok' => !empty($remote['ok']) ? 1 : 0,
            ':import_ok' => !empty($import['ok']) || !empty($import['fetched']) || !empty($import['upserted']) ? 1 : 0,
            ':fetched_rows' => (int) ($import['fetched'] ?? 0),
            ':upserted_rows' => (int) ($import['upserted'] ?? 0),
            ':before_wallet_balance' => jg_wallet_snapshot_total($before, 'wallet_balance'),
            ':after_wallet_balance' => jg_wallet_snapshot_total($after, 'wallet_balance'),
            ':before_released_since_anchor' => jg_wallet_snapshot_total($before, 'released_since_anchor_total'),
            ':after_released_since_anchor' => jg_wallet_snapshot_total($after, 'released_since_anchor_total'),
            ':remote_json' => jg_wallet_json_blob($remote),
            ':import_json' => jg_wallet_json_blob($import),
            ':before_json' => jg_wallet_json_blob($before),
            ':after_json' => jg_wallet_json_blob($after),
            ':error_message' => substr($errorMessage, 0, 1000),
        ]);
    } catch (Throwable $error) {
        error_log('Wallet release sync log insert failed: ' . $error->getMessage());
    }
}

/**
 * @return array<int, array<string, mixed>>
 */
function jg_wallet_release_sync_logs(PDO $pdo, int $limit = 25): array
{
    $limit = jg_wallet_positive_int($limit, 1, 100);
    try {
        $stmt = $pdo->query(
            'SELECT id, run_key, action, status, start_date, end_date, days, import_rows,
                    skip_remote, remote_ok, import_ok, fetched_rows, upserted_rows,
                    before_wallet_balance, after_wallet_balance,
                    before_released_since_anchor, after_released_since_anchor,
                    error_message, created_at, updated_at, before_json, after_json
             FROM dashboard_wallet_release_sync_logs
             ORDER BY created_at DESC, id DESC
             LIMIT ' . $limit
        );
        $rows = $stmt ? $stmt->fetchAll() : [];
    } catch (Throwable) {
        return [];
    }

    return array_map(static function (array $row): array {
        $before = json_decode((string) ($row['before_json'] ?? ''), true);
        $after = json_decode((string) ($row['after_json'] ?? ''), true);
        return [
            'id' => (int) ($row['id'] ?? 0),
            'run_key' => (string) ($row['run_key'] ?? ''),
            'action' => (string) ($row['action'] ?? ''),
            'status' => (string) ($row['status'] ?? ''),
            'range' => [
                'start_date' => (string) ($row['start_date'] ?? ''),
                'end_date' => (string) ($row['end_date'] ?? ''),
                'days' => (int) ($row['days'] ?? 0),
                'import_rows' => (int) ($row['import_rows'] ?? 0),
            ],
            'skip_remote' => (int) ($row['skip_remote'] ?? 0) === 1,
            'remote_ok' => (int) ($row['remote_ok'] ?? 0) === 1,
            'import_ok' => (int) ($row['import_ok'] ?? 0) === 1,
            'fetched_rows' => (int) ($row['fetched_rows'] ?? 0),
            'upserted_rows' => (int) ($row['upserted_rows'] ?? 0),
            'wallet_balance_delta' => (int) round((float) ($row['after_wallet_balance'] ?? 0)) - (int) round((float) ($row['before_wallet_balance'] ?? 0)),
            'released_since_anchor_delta' => (int) round((float) ($row['after_released_since_anchor'] ?? 0)) - (int) round((float) ($row['before_released_since_anchor'] ?? 0)),
            'before' => is_array($before) ? $before : [],
            'after' => is_array($after) ? $after : [],
            'error_message' => (string) ($row['error_message'] ?? ''),
            'created_at' => jg_orders_atom_datetime((string) ($row['created_at'] ?? '')),
            'updated_at' => jg_orders_atom_datetime((string) ($row['updated_at'] ?? '')),
        ];
    }, $rows);
}

function jg_wallet_summary_with_backtrack(PDO $pdo, ?array $run): array
{
    $summary = jg_wallet_summary($pdo);
    $summary['backtrack'] = jg_wallet_backtrack_public_state($run);
    return $summary;
}

function jg_wallet_backtrack_active(PDO $pdo): ?array
{
    $stmt = $pdo->query(
        'SELECT *
         FROM dashboard_wallet_backtrack_runs
         WHERE status = "running"
         ORDER BY updated_at DESC, id DESC
         LIMIT 1'
    );
    $row = $stmt ? $stmt->fetch() : false;
    return is_array($row) ? $row : null;
}

function jg_wallet_backtrack_latest(PDO $pdo): ?array
{
    $stmt = $pdo->query(
        'SELECT *
         FROM dashboard_wallet_backtrack_runs
         ORDER BY updated_at DESC, id DESC
         LIMIT 1'
    );
    $row = $stmt ? $stmt->fetch() : false;
    return is_array($row) ? $row : null;
}

function jg_wallet_backtrack_by_key(PDO $pdo, string $runKey): ?array
{
    $stmt = $pdo->prepare(
        'SELECT *
         FROM dashboard_wallet_backtrack_runs
         WHERE run_key = :run_key
         LIMIT 1'
    );
    $stmt->execute([':run_key' => $runKey]);
    $row = $stmt->fetch();
    return is_array($row) ? $row : null;
}

function jg_wallet_fail_backtrack(PDO $pdo, array $run, string $message): array
{
    $stmt = $pdo->prepare(
        'UPDATE dashboard_wallet_backtrack_runs
         SET status = "failed",
             last_error = :last_error,
             last_message = "Backtrack failed.",
             updated_at = UTC_TIMESTAMP(6)
         WHERE run_key = :run_key
           AND status = "running"'
    );
    $stmt->execute([
        ':last_error' => substr($message, 0, 255),
        ':run_key' => (string) $run['run_key'],
    ]);

    return jg_wallet_backtrack_by_key($pdo, (string) $run['run_key']) ?: $run;
}

function jg_wallet_complete_backtrack(PDO $pdo, array $run, string $message): array
{
    $stmt = $pdo->prepare(
        'UPDATE dashboard_wallet_backtrack_runs
         SET status = "complete",
             phase = "complete",
             last_message = :last_message,
             last_error = "",
             updated_at = UTC_TIMESTAMP(6),
             completed_at = UTC_TIMESTAMP(6)
         WHERE run_key = :run_key
           AND status = "running"'
    );
    $stmt->execute([
        ':last_message' => substr($message, 0, 255),
        ':run_key' => (string) $run['run_key'],
    ]);

    return jg_wallet_backtrack_by_key($pdo, (string) $run['run_key']) ?: $run;
}

/**
 * @return array<int, array{platform:string,account_key:string,label:string}>
 */
function jg_wallet_backtrack_accounts(): array
{
    return array_values(array_map(static fn (array $account): array => [
        'platform' => (string) $account['platform'],
        'account_key' => (string) $account['account_key'],
        'label' => (string) $account['label'],
    ], jg_wallet_known_accounts()));
}

function jg_wallet_backtrack_public_state(?array $run): array
{
    if (!is_array($run)) {
        return [
            'active' => false,
            'status' => 'idle',
            'progress' => 0,
        ];
    }

    $accounts = jg_wallet_backtrack_accounts();
    $accountTotal = max(1, count($accounts));
    $chunkDays = jg_wallet_positive_int($run['chunk_days'] ?? JG_WALLET_BACKTRACK_CHUNK_DAYS, 1, 7);
    $startDate = (string) ($run['start_date'] ?? JG_WALLET_BACKTRACK_START_DATE);
    $endDate = (string) ($run['end_date'] ?? $startDate);
    $cursorDate = jg_wallet_date((string) ($run['cursor_date'] ?? $startDate), $startDate);
    $chunkEnd = $cursorDate <= $endDate ? jg_wallet_chunk_end($cursorDate, $endDate, $chunkDays) : $endDate;
    $chunkTotal = max(1, jg_wallet_total_chunks($startDate, $endDate, $chunkDays));
    $chunkIndex = min($chunkTotal, max(1, jg_wallet_total_chunks($startDate, $cursorDate, $chunkDays)));
    $status = (string) ($run['status'] ?? 'running');
    $phase = (string) ($run['phase'] ?? 'sync');
    $accountIndex = min($accountTotal, max(0, (int) ($run['cursor_account_index'] ?? 0)));
    $unitsPerChunk = $accountTotal + 1;
    $completedUnits = ($chunkIndex - 1) * $unitsPerChunk;
    $completedUnits += $phase === 'import' ? $accountTotal : $accountIndex;
    if ($status === 'complete') {
        $progress = 100;
    } else {
        $progress = min(99, max(1, (int) floor(($completedUnits / max(1, $chunkTotal * $unitsPerChunk)) * 100)));
    }

    $currentAccount = $phase === 'sync' && isset($accounts[$accountIndex]) ? $accounts[$accountIndex] : null;

    return [
        'active' => $status === 'running',
        'run_key' => (string) ($run['run_key'] ?? ''),
        'status' => $status,
        'phase' => $phase,
        'progress' => $progress,
        'start_date' => $startDate,
        'end_date' => $endDate,
        'cursor_date' => $cursorDate,
        'chunk_end' => $chunkEnd,
        'chunk_index' => $chunkIndex,
        'chunk_total' => $chunkTotal,
        'account_index' => $accountIndex,
        'account_total' => $accountTotal,
        'current_account' => $currentAccount,
        'import_offset' => max(0, (int) ($run['import_offset'] ?? 0)),
        'sync_calls' => max(0, (int) ($run['sync_calls'] ?? 0)),
        'import_pages' => max(0, (int) ($run['import_pages'] ?? 0)),
        'imported_rows' => max(0, (int) ($run['imported_rows'] ?? 0)),
        'upserted_rows' => max(0, (int) ($run['upserted_rows'] ?? 0)),
        'last_message' => (string) ($run['last_message'] ?? ''),
        'last_error' => (string) ($run['last_error'] ?? ''),
        'completed_at' => jg_orders_atom_datetime((string) ($run['completed_at'] ?? '')),
        'updated_at' => jg_orders_atom_datetime((string) ($run['updated_at'] ?? '')),
    ];
}

function jg_wallet_empty_amounts(): array
{
    return [
        'orders' => 0,
        'released_orders' => 0,
        'released_month_orders' => 0,
        'outstanding_orders' => 0,
        'non_settling_orders' => 0,
        'released_total' => 0,
        'released_month_total' => 0,
        'released_out' => 0,
        'wallet_balance' => 0,
        'source_wallet_balance' => 0,
        'manual_wallet_balance' => 0,
        'manual_released_out' => 0,
        'withdrawn_since_anchor_total' => 0,
        'withdrawn_since_anchor_count' => 0,
        'wallet_transaction_since_anchor_total' => 0,
        'wallet_transaction_since_anchor_count' => 0,
        'wallet_transaction_total' => 0,
        'wallet_transaction_count' => 0,
        'wallet_transaction_current_balance' => null,
        'wallet_activity_since_anchor_total' => 0,
        'wallet_activity_since_anchor_count' => 0,
        'wallet_activity_source' => '',
        'wallet_balance_known' => false,
        'wallet_balance_basis' => 'manual_required',
        'manual_anchor_id' => 0,
        'manual_anchor_balance' => 0,
        'manual_anchor_observed_at' => '',
        'manual_anchor_created_at' => '',
        'manual_anchor_created_by' => '',
        'released_since_anchor_total' => 0,
        'released_since_anchor_orders' => 0,
        'outstanding_total' => 0,
        'non_settling_total' => 0,
        'last_released_at' => '',
        'last_withdrawn_at' => '',
        'last_wallet_transaction_at' => '',
        'last_source_updated_at' => '',
        'last_mirrored_at' => '',
        'last_wallet_cleared_at' => '',
        'last_order_at' => '',
        'clearance_source' => '',
        'cash_out_source' => 'not_integrated',
        'release_status_breakdown' => [],
        'order_status_breakdown' => [],
        'release_source_breakdown' => [],
    ];
}

function jg_wallet_release_amount(mixed $requestedAmount, int $walletBalance): int
{
    $walletBalance = max(0, $walletBalance);
    if ($walletBalance <= 0) {
        throw new InvalidArgumentException('wallet_balance_empty');
    }

    $rawAmount = is_string($requestedAmount) ? trim($requestedAmount) : $requestedAmount;
    if ($rawAmount === '' || $rawAmount === null) {
        return $walletBalance;
    }

    $amount = (int) round(jg_wallet_amount_value($rawAmount));
    if ($amount <= 0) {
        throw new InvalidArgumentException('wallet_release_amount_invalid');
    }
    if ($amount > $walletBalance) {
        throw new InvalidArgumentException('wallet_release_amount_exceeds_balance');
    }

    return $amount;
}

function jg_wallet_withdrawn_at(mixed $value): string
{
    try {
        return jg_wallet_observed_at($value);
    } catch (InvalidArgumentException) {
        throw new InvalidArgumentException('wallet_withdrawn_at_invalid');
    }
}

function jg_wallet_balance_value(mixed $requestedAmount): int
{
    $rawAmount = is_string($requestedAmount) ? trim($requestedAmount) : $requestedAmount;
    if ($rawAmount === '' || $rawAmount === null) {
        throw new InvalidArgumentException('wallet_balance_amount_required');
    }

    $amount = (int) round(jg_wallet_amount_value($rawAmount));
    if ($amount < 0) {
        throw new InvalidArgumentException('wallet_balance_amount_invalid');
    }

    return $amount;
}

function jg_wallet_observed_at(mixed $value): string
{
    $raw = trim((string) $value);
    if ($raw === '') {
        return gmdate('Y-m-d H:i:s.u');
    }

    try {
        if (preg_match('/(?:Z|[+-]\d{2}:?\d{2})$/', $raw)) {
            $date = new DateTimeImmutable($raw);
        } else {
            $date = new DateTimeImmutable($raw, new DateTimeZone('Asia/Jakarta'));
        }
    } catch (Throwable) {
        throw new InvalidArgumentException('wallet_balance_observed_at_invalid');
    }

    return $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.u');
}

function jg_wallet_amount_value(mixed $value): float
{
    if (is_int($value) || is_float($value)) {
        return (float) $value;
    }
    $raw = trim((string) $value);
    if (is_numeric($raw)) {
        return (float) $raw;
    }
    $negative = str_starts_with($raw, '-');
    $digits = preg_replace('/[^0-9]+/', '', $raw) ?? '';
    if ($digits === '') {
        return 0.0;
    }

    return (float) ($negative ? '-' . $digits : $digits);
}

function jg_wallet_positive_int(mixed $value, int $min, int $max): int
{
    return max($min, min($max, (int) $value));
}

function jg_wallet_truthy(mixed $value): bool
{
    return in_array(strtolower(trim((string) $value)), ['1', 'true', 'yes', 'on'], true);
}

function jg_wallet_json_blob(array $payload): string
{
    $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    return is_string($json) ? $json : '{}';
}

function jg_wallet_date(string $value, string $fallback): string
{
    $raw = trim($value) !== '' ? trim($value) : $fallback;
    try {
        return (new DateTimeImmutable($raw, new DateTimeZone('Asia/Jakarta')))->format('Y-m-d');
    } catch (Throwable) {
        throw new InvalidArgumentException('wallet_backtrack_date_invalid');
    }
}

function jg_wallet_today(): string
{
    return (new DateTimeImmutable('today', new DateTimeZone('Asia/Jakarta')))->format('Y-m-d');
}

function jg_wallet_add_days(string $date, int $days): string
{
    return (new DateTimeImmutable($date . ' 00:00:00', new DateTimeZone('Asia/Jakarta')))
        ->modify(sprintf('%+d days', $days))
        ->format('Y-m-d');
}

function jg_wallet_days_between(string $startDate, string $endDate): int
{
    $start = new DateTimeImmutable($startDate . ' 00:00:00', new DateTimeZone('Asia/Jakarta'));
    $end = new DateTimeImmutable($endDate . ' 00:00:00', new DateTimeZone('Asia/Jakarta'));
    return max(0, (int) $start->diff($end)->format('%a'));
}

function jg_wallet_chunk_end(string $startDate, string $endDate, int $chunkDays): string
{
    return min($endDate, jg_wallet_add_days($startDate, max(1, $chunkDays) - 1));
}

function jg_wallet_total_chunks(string $startDate, string $endDate, int $chunkDays): int
{
    if ($startDate > $endDate) {
        return 0;
    }
    return (int) ceil((jg_wallet_days_between($startDate, $endDate) + 1) / max(1, $chunkDays));
}

function jg_wallet_account_key(string $platform, string $accountKey): string
{
    return jg_wallet_normalize_key($platform) . '|' . jg_wallet_normalize_key($accountKey);
}

function jg_wallet_normalize_key(mixed $value): string
{
    return trim(preg_replace('/[^a-z0-9._-]+/', '-', strtolower((string) $value)) ?? '', '.-_');
}

function jg_wallet_account_label(string $company, string $platform, string $accountKey): string
{
    $company = trim($company);
    $platformKey = jg_wallet_normalize_key($platform);
    $platformLabel = match ($platformKey) {
        'shopee' => 'Shopee',
        'tiktok' => 'TikTok',
        default => ucfirst($platformKey),
    };
    if ($company === '') {
        $baseAccountKey = jg_wallet_normalize_key($accountKey);
        $platformSuffix = $platformKey !== '' ? '-' . $platformKey : '';
        if ($platformSuffix !== '' && str_ends_with($baseAccountKey, $platformSuffix)) {
            $baseAccountKey = substr($baseAccountKey, 0, -strlen($platformSuffix));
        }
        $company = ucwords(str_replace(['-', '_'], ' ', $baseAccountKey !== '' ? $baseAccountKey : $accountKey));
    }

    return trim($company . ' ' . $platformLabel);
}

function jg_wallet_actor(): string
{
    jg_admin_start_session();
    $skuUsername = trim((string) ($_SESSION['jg_sku_username'] ?? ''));
    if ($skuUsername !== '') {
        return substr($skuUsername, 0, 160);
    }

    return 'Admin';
}
