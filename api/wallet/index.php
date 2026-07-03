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

        $payload = json_decode((string) file_get_contents('php://input'), true);
        $payload = is_array($payload) ? $payload : [];

        if ($method === 'POST' && $action === 'release') {
            echo json_encode(jg_wallet_release($pdo, $payload), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            return;
        }

        if ($method === 'POST' && in_array($action, ['backtrack', 'sync_backtrack'], true)) {
            echo json_encode(jg_wallet_start_backtrack($pdo, $payload), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            return;
        }

        if ($method === 'POST' && in_array($action, ['backtrack_step', 'sync_backtrack_step'], true)) {
            echo json_encode(jg_wallet_step_backtrack($pdo, $payload), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
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
            created_at DATETIME(6) NOT NULL,
            undone_at DATETIME(6) NULL DEFAULT NULL,
            undone_by VARCHAR(160) NOT NULL DEFAULT "",
            undo_note VARCHAR(255) NOT NULL DEFAULT "",
            KEY idx_dashboard_wallet_releases_account (platform, account_key, undone_at, created_at),
            KEY idx_dashboard_wallet_releases_created (created_at)
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

    foreach (jg_wallet_order_totals($pdo) as $row) {
        $key = jg_wallet_account_key((string) $row['platform'], (string) $row['account_key']);
        $accounts[$key] = array_merge($accounts[$key] ?? [
            'platform' => (string) $row['platform'],
            'account_key' => (string) $row['account_key'],
            'company' => (string) ($row['company'] ?? ''),
            'label' => jg_wallet_account_label((string) ($row['company'] ?? ''), (string) $row['platform'], (string) $row['account_key']),
        ], jg_wallet_empty_amounts(), $row);
    }

    $activeReleaseTotals = jg_wallet_active_release_totals($pdo);
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
    }

    foreach ($accounts as &$account) {
        $releasedTotal = (int) round((float) ($account['released_total'] ?? 0));
        $releasedOut = (int) round((float) ($account['released_out'] ?? 0));
        $account['released_total'] = $releasedTotal;
        $account['released_out'] = $releasedOut;
        $account['wallet_balance'] = max(0, $releasedTotal - $releasedOut);
        $account['outstanding_total'] = (int) round((float) ($account['outstanding_total'] ?? 0));
        $account['released_orders'] = (int) ($account['released_orders'] ?? 0);
        $account['outstanding_orders'] = (int) ($account['outstanding_orders'] ?? 0);
        $account['orders'] = (int) ($account['orders'] ?? 0);
        $account['last_released_at'] = jg_orders_atom_datetime((string) ($account['last_released_at'] ?? ''));
        $account['last_order_at'] = jg_orders_atom_datetime((string) ($account['last_order_at'] ?? ''));
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
        'wallets' => $wallets,
        'logs' => $logs,
        'totals' => [
            'wallet_balance' => array_sum(array_column($wallets, 'wallet_balance')),
            'released_total' => array_sum(array_column($wallets, 'released_total')),
            'released_out' => array_sum(array_column($wallets, 'released_out')),
            'outstanding_total' => array_sum(array_column($wallets, 'outstanding_total')),
            'released_orders' => array_sum(array_column($wallets, 'released_orders')),
            'outstanding_orders' => array_sum(array_column($wallets, 'outstanding_orders')),
        ],
    ];
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

    $amount = jg_wallet_release_amount($payload['amount'] ?? '', max(0, (int) ($wallet['wallet_balance'] ?? 0)));

    $stmt = $pdo->prepare(
        'INSERT INTO dashboard_wallet_releases
            (platform, account_key, amount, release_note, released_by, created_at)
         VALUES
            (:platform, :account_key, :amount, :release_note, :released_by, UTC_TIMESTAMP(6))'
    );
    $stmt->execute([
        ':platform' => $platform,
        ':account_key' => $accountKey,
        ':amount' => number_format($amount, 2, '.', ''),
        ':release_note' => substr(trim((string) ($payload['note'] ?? '')), 0, 255),
        ':released_by' => jg_wallet_actor(),
    ]);

    analyticsTouchLiveState('wallet_release');

    return jg_wallet_summary($pdo);
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
             WHERE run_key = :run_key'
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
         WHERE run_key = :run_key'
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
        ':last_import_json' => jg_wallet_json_blob($import),
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
function jg_wallet_order_totals(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT platform,
                account_key,
                MAX(company) AS company,
                COUNT(*) AS orders,
                SUM(CASE WHEN funds_released > 0 THEN 1 ELSE 0 END) AS released_orders,
                SUM(CASE WHEN funds_released > 0 THEN 0 ELSE 1 END) AS outstanding_orders,
                SUM(CASE WHEN funds_released > 0 THEN
                    CASE WHEN funds_released_amount > 0 THEN funds_released_amount ELSE order_amount END
                    ELSE 0 END) AS released_total,
                SUM(CASE WHEN funds_released > 0 THEN 0 ELSE order_amount END) AS outstanding_total,
                MAX(CASE WHEN funds_released > 0 THEN funds_released_at ELSE NULL END) AS last_released_at,
                MAX(order_create_time) AS last_order_at
         FROM (
            SELECT platform,
                   account_key,
                   CASE WHEN order_id = "" THEN order_item_hash ELSE order_id END AS order_key,
                   MAX(company) AS company,
                   MAX(order_net_revenue) AS order_amount,
                   MAX(funds_released) AS funds_released,
                   MAX(funds_released_amount) AS funds_released_amount,
                   MAX(funds_released_at) AS funds_released_at,
                   MAX(order_create_time) AS order_create_time
            FROM dashboard_order_mirror
            WHERE deleted_at IS NULL
              AND platform IN ("shopee", "tiktok")
            GROUP BY platform, account_key, order_key
         ) wallet_orders
         GROUP BY platform, account_key
         ORDER BY platform ASC, account_key ASC'
    );

    return $stmt ? $stmt->fetchAll() : [];
}

/**
 * @return array<int, array<string, mixed>>
 */
function jg_wallet_active_release_totals(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT platform, account_key, SUM(amount) AS amount
         FROM dashboard_wallet_releases
         WHERE undone_at IS NULL
         GROUP BY platform, account_key'
    );

    return $stmt ? $stmt->fetchAll() : [];
}

/**
 * @return array<int, array<string, mixed>>
 */
function jg_wallet_release_logs(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT id, platform, account_key, amount, release_note, released_by, created_at, undone_at, undone_by, undo_note
         FROM dashboard_wallet_releases
         ORDER BY created_at DESC, id DESC
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
            'created_at' => jg_orders_atom_datetime((string) ($row['created_at'] ?? '')),
            'undone_at' => jg_orders_atom_datetime((string) ($row['undone_at'] ?? '')),
            'undone_by' => (string) ($row['undone_by'] ?? ''),
            'undo_note' => (string) ($row['undo_note'] ?? ''),
            'active' => trim((string) ($row['undone_at'] ?? '')) === '',
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
         WHERE run_key = :run_key'
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
         WHERE run_key = :run_key'
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
        'outstanding_orders' => 0,
        'released_total' => 0,
        'released_out' => 0,
        'wallet_balance' => 0,
        'outstanding_total' => 0,
        'last_released_at' => '',
        'last_order_at' => '',
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
