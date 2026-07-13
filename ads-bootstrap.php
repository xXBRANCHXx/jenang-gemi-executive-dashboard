<?php
declare(strict_types=1);

require_once __DIR__ . '/analytics-bootstrap.php';
require_once __DIR__ . '/config.php';

const JG_AD_VIEW_ACCOUNTS = [
    'jenang-gemi-shopee' => 'Jenang Gemi',
    'zero-shopee' => 'ZERO',
    'zfit-shopee' => 'ZFIT',
];

function jgAdViewEnsureSchema(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS ad_view_campaigns (
            account_key VARCHAR(80) NOT NULL,
            campaign_id BIGINT UNSIGNED NOT NULL,
            alias_name VARCHAR(180) NOT NULL DEFAULT "",
            tags_json JSON NULL,
            is_tracked TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (account_key, campaign_id),
            KEY idx_ad_view_tracked (account_key, is_tracked)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS ad_view_events (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            account_key VARCHAR(80) NOT NULL,
            campaign_id BIGINT UNSIGNED NOT NULL,
            event_at DATETIME NOT NULL,
            event_type VARCHAR(60) NOT NULL DEFAULT "note",
            title VARCHAR(180) NOT NULL,
            note TEXT NULL,
            before_value VARCHAR(120) NOT NULL DEFAULT "",
            after_value VARCHAR(120) NOT NULL DEFAULT "",
            tags_json JSON NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_ad_view_event_campaign (account_key, campaign_id, event_at),
            KEY idx_ad_view_event_at (event_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS ad_view_budgets (
            account_key VARCHAR(80) NOT NULL,
            budget_month CHAR(7) NOT NULL,
            monthly_budget DECIMAL(18,2) NOT NULL DEFAULT 0,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (account_key, budget_month)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function jgAdViewJsonBody(): array
{
    $decoded = json_decode((string) file_get_contents('php://input'), true);
    return is_array($decoded) ? $decoded : [];
}

function jgAdViewAccount(mixed $value, bool $allowAll = true): string
{
    $account = strtolower(trim((string) $value));
    if ($allowAll && ($account === '' || $account === 'all')) {
        return 'all';
    }
    if (!isset(JG_AD_VIEW_ACCOUNTS[$account])) {
        analyticsJsonResponse(['ok' => false, 'error' => 'unknown_shopee_account'], 422);
    }
    return $account;
}

function jgAdViewDate(mixed $value, string $fallback): string
{
    $date = trim((string) $value) ?: $fallback;
    $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date, new DateTimeZone('Asia/Jakarta'));
    if (!$parsed || $parsed->format('Y-m-d') !== $date) {
        analyticsJsonResponse(['ok' => false, 'error' => 'invalid_ad_view_date'], 422);
    }
    return $date;
}

/** @return array<string, mixed> */
function jgAdViewUpstream(string $path, array $query): array
{
    $token = jg_dashboard_marketplace_api_setup_token();
    if ($token === '') {
        analyticsJsonResponse(['ok' => false, 'error' => 'missing_marketplace_api_setup_token'], 503);
    }
    $query['setup_token'] = $token;
    $url = jg_dashboard_marketplace_api_base_url() . $path . '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986);
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => $path === '/ads/sync' ? 90 : 20,
            'header' => "Accept: application/json\r\n",
            'ignore_errors' => true,
        ],
    ]);
    $response = @file_get_contents($url, false, $context);
    if (!is_string($response) || $response === '') {
        analyticsJsonResponse(['ok' => false, 'error' => 'shopee_ads_upstream_unreachable'], 502);
    }
    $status = 200;
    foreach (($http_response_header ?? []) as $line) {
        if (preg_match('#^HTTP/\S+\s+(\d{3})#', (string) $line, $match)) {
            $status = (int) $match[1];
            break;
        }
    }
    $payload = json_decode($response, true);
    if (!is_array($payload)) {
        analyticsJsonResponse(['ok' => false, 'error' => 'invalid_shopee_ads_response'], 502);
    }
    if ($status >= 400 || empty($payload['ok'])) {
        analyticsJsonResponse([
            'ok' => false,
            'error' => (string) ($payload['error'] ?? 'shopee_ads_request_failed'),
            'message' => (string) ($payload['message'] ?? ''),
            'sync_results' => $payload['sync_results'] ?? [],
        ], $status >= 400 ? $status : 502);
    }
    return $payload;
}

/** @param array<string, mixed> $payload @return array<string, mixed> */
function jgAdViewEnrich(PDO $pdo, array $payload, string $startDate, string $endDate): array
{
    $campaignRows = $pdo->query('SELECT account_key, campaign_id, alias_name, tags_json, is_tracked FROM ad_view_campaigns')->fetchAll();
    $campaignLocal = [];
    foreach ($campaignRows as $row) {
        $key = (string) $row['account_key'] . ':' . (string) $row['campaign_id'];
        $campaignLocal[$key] = [
            'alias_name' => (string) $row['alias_name'],
            'tags' => json_decode((string) ($row['tags_json'] ?? '[]'), true) ?: [],
            'is_tracked' => (bool) $row['is_tracked'],
        ];
    }

    $eventStatement = $pdo->prepare(
        'SELECT id, account_key, campaign_id, event_at, event_type, title, note, before_value, after_value, tags_json
         FROM ad_view_events
         WHERE DATE(event_at) BETWEEN :start_date AND :end_date
         ORDER BY event_at DESC, id DESC'
    );
    $eventStatement->execute([':start_date' => $startDate, ':end_date' => $endDate]);
    $events = $eventStatement->fetchAll();
    foreach ($events as &$event) {
        $event['id'] = (int) $event['id'];
        $event['campaign_id'] = (string) $event['campaign_id'];
        $event['tags'] = json_decode((string) ($event['tags_json'] ?? '[]'), true) ?: [];
        unset($event['tags_json']);
    }
    unset($event);

    $accounts = is_array($payload['accounts'] ?? null) ? $payload['accounts'] : [];
    foreach ($accounts as &$account) {
        $accountKey = (string) ($account['account_key'] ?? '');
        foreach (($account['campaigns'] ?? []) as &$campaign) {
            $local = $campaignLocal[$accountKey . ':' . (string) ($campaign['campaign_id'] ?? '')] ?? [];
            $campaign['alias_name'] = (string) ($local['alias_name'] ?? '');
            $campaign['tags'] = $local['tags'] ?? [];
            $campaign['is_tracked'] = (bool) ($local['is_tracked'] ?? false);
            $campaign['display_name'] = $campaign['alias_name'] ?: ((string) ($campaign['source_ad_name'] ?? '') ?: 'Campaign ' . (string) ($campaign['campaign_id'] ?? ''));
        }
        unset($campaign);
        $account['company'] = JG_AD_VIEW_ACCOUNTS[$accountKey] ?? $accountKey;
        $budgetMonth = substr($endDate, 0, 7);
        $budgetStatement = $pdo->prepare('SELECT monthly_budget FROM ad_view_budgets WHERE account_key = :account_key AND budget_month = :budget_month');
        $budgetStatement->execute([':account_key' => $accountKey, ':budget_month' => $budgetMonth]);
        $account['internal_monthly_budget'] = (float) ($budgetStatement->fetchColumn() ?: 0);
    }
    unset($account);

    $payload['accounts'] = $accounts;
    $payload['events'] = $events;
    $payload['account_options'] = array_map(
        static fn (string $label, string $key): array => ['key' => $key, 'label' => $label],
        JG_AD_VIEW_ACCOUNTS,
        array_keys(JG_AD_VIEW_ACCOUNTS)
    );
    return $payload;
}

function jgAdViewHandle(): void
{
    $pdo = analyticsDb();
    jgAdViewEnsureSchema($pdo);
    $timezone = new DateTimeZone('Asia/Jakarta');
    $today = new DateTimeImmutable('today', $timezone);
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

    if ($method === 'POST') {
        $body = jgAdViewJsonBody();
        $action = strtolower(trim((string) ($body['action'] ?? '')));
        if ($action === 'track_campaign') {
            $account = jgAdViewAccount($body['account_key'] ?? '', false);
            $campaignId = (int) ($body['campaign_id'] ?? 0);
            $alias = trim((string) ($body['alias_name'] ?? ''));
            if ($campaignId <= 0) {
                analyticsJsonResponse(['ok' => false, 'error' => 'invalid_campaign_id'], 422);
            }
            $statement = $pdo->prepare(
                'INSERT INTO ad_view_campaigns (account_key, campaign_id, alias_name, is_tracked)
                 VALUES (:account_key, :campaign_id, :alias_name, 1)
                 ON DUPLICATE KEY UPDATE alias_name = VALUES(alias_name), is_tracked = 1, updated_at = UTC_TIMESTAMP()'
            );
            $statement->execute([':account_key' => $account, ':campaign_id' => $campaignId, ':alias_name' => substr($alias, 0, 180)]);
            $startDate = jgAdViewDate($body['start_date'] ?? '', $today->modify('-29 days')->format('Y-m-d'));
            $endDate = jgAdViewDate($body['end_date'] ?? '', $today->format('Y-m-d'));
            $payload = jgAdViewUpstream('/ads/sync', [
                'account' => $account,
                'campaign_ids' => (string) $campaignId,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ]);
            analyticsJsonResponse(jgAdViewEnrich($pdo, $payload, $startDate, $endDate));
        }
        if ($action === 'save_campaign') {
            $account = jgAdViewAccount($body['account_key'] ?? '', false);
            $campaignId = (int) ($body['campaign_id'] ?? 0);
            if ($campaignId <= 0) {
                analyticsJsonResponse(['ok' => false, 'error' => 'invalid_campaign_id'], 422);
            }
            $tags = array_values(array_unique(array_filter(array_map('strval', is_array($body['tags'] ?? null) ? $body['tags'] : []))));
            $statement = $pdo->prepare(
                'INSERT INTO ad_view_campaigns (account_key, campaign_id, alias_name, tags_json, is_tracked)
                 VALUES (:account_key, :campaign_id, :alias_name, :tags_json, 1)
                 ON DUPLICATE KEY UPDATE alias_name = VALUES(alias_name), tags_json = VALUES(tags_json), is_tracked = 1, updated_at = UTC_TIMESTAMP()'
            );
            $statement->execute([
                ':account_key' => $account,
                ':campaign_id' => $campaignId,
                ':alias_name' => substr(trim((string) ($body['alias_name'] ?? '')), 0, 180),
                ':tags_json' => json_encode(array_slice($tags, 0, 20), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            ]);
            analyticsJsonResponse(['ok' => true]);
        }
        if ($action === 'add_event') {
            $account = jgAdViewAccount($body['account_key'] ?? '', false);
            $campaignId = (int) ($body['campaign_id'] ?? 0);
            $title = trim((string) ($body['title'] ?? ''));
            $eventAt = trim((string) ($body['event_at'] ?? ''));
            $eventDate = DateTimeImmutable::createFromFormat('Y-m-d\TH:i', $eventAt, $timezone);
            if ($campaignId <= 0 || $title === '' || !$eventDate) {
                analyticsJsonResponse(['ok' => false, 'error' => 'invalid_ad_event'], 422);
            }
            $tags = array_values(array_unique(array_filter(array_map('strval', is_array($body['tags'] ?? null) ? $body['tags'] : []))));
            $statement = $pdo->prepare(
                'INSERT INTO ad_view_events (account_key, campaign_id, event_at, event_type, title, note, before_value, after_value, tags_json)
                 VALUES (:account_key, :campaign_id, :event_at, :event_type, :title, :note, :before_value, :after_value, :tags_json)'
            );
            $statement->execute([
                ':account_key' => $account,
                ':campaign_id' => $campaignId,
                ':event_at' => $eventDate->format('Y-m-d H:i:s'),
                ':event_type' => substr(trim((string) ($body['event_type'] ?? 'note')), 0, 60),
                ':title' => substr($title, 0, 180),
                ':note' => trim((string) ($body['note'] ?? '')),
                ':before_value' => substr(trim((string) ($body['before_value'] ?? '')), 0, 120),
                ':after_value' => substr(trim((string) ($body['after_value'] ?? '')), 0, 120),
                ':tags_json' => json_encode(array_slice($tags, 0, 20), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            ]);
            analyticsJsonResponse(['ok' => true, 'event_id' => (int) $pdo->lastInsertId()]);
        }
        if ($action === 'delete_event') {
            $statement = $pdo->prepare('DELETE FROM ad_view_events WHERE id = :id');
            $statement->execute([':id' => max(0, (int) ($body['event_id'] ?? 0))]);
            analyticsJsonResponse(['ok' => true]);
        }
        if ($action === 'set_budget') {
            $account = jgAdViewAccount($body['account_key'] ?? '', false);
            $month = trim((string) ($body['budget_month'] ?? ''));
            if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
                analyticsJsonResponse(['ok' => false, 'error' => 'invalid_budget_month'], 422);
            }
            $statement = $pdo->prepare(
                'INSERT INTO ad_view_budgets (account_key, budget_month, monthly_budget)
                 VALUES (:account_key, :budget_month, :monthly_budget)
                 ON DUPLICATE KEY UPDATE monthly_budget = VALUES(monthly_budget), updated_at = UTC_TIMESTAMP()'
            );
            $statement->execute([
                ':account_key' => $account,
                ':budget_month' => $month,
                ':monthly_budget' => max(0, (float) ($body['monthly_budget'] ?? 0)),
            ]);
            analyticsJsonResponse(['ok' => true]);
        }
        if ($action !== 'sync') {
            analyticsJsonResponse(['ok' => false, 'error' => 'unknown_ad_view_action'], 422);
        }
        $account = jgAdViewAccount($body['account_key'] ?? 'all');
        $startDate = jgAdViewDate($body['start_date'] ?? '', $today->modify('-29 days')->format('Y-m-d'));
        $endDate = jgAdViewDate($body['end_date'] ?? '', $today->format('Y-m-d'));
        $payload = jgAdViewUpstream('/ads/sync', ['account' => $account, 'start_date' => $startDate, 'end_date' => $endDate]);
        analyticsJsonResponse(jgAdViewEnrich($pdo, $payload, $startDate, $endDate));
    }

    $account = jgAdViewAccount($_GET['account'] ?? 'all');
    $startDate = jgAdViewDate($_GET['start_date'] ?? '', $today->modify('-29 days')->format('Y-m-d'));
    $endDate = jgAdViewDate($_GET['end_date'] ?? '', $today->format('Y-m-d'));
    $payload = jgAdViewUpstream('/ads/summary', ['account' => $account, 'start_date' => $startDate, 'end_date' => $endDate]);
    analyticsJsonResponse(jgAdViewEnrich($pdo, $payload, $startDate, $endDate));
}
