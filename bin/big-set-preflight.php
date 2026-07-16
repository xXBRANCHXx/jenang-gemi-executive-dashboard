<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

if (in_array('--help', $argv, true) || in_array('-h', $argv, true)) {
    fwrite(STDOUT, "Usage: php bin/big-set-preflight.php [--contracts-only]\n");
    fwrite(STDOUT, "Runs read-only local and downstream Big Set readiness checks; never activates or retries delivery.\n");
    fwrite(STDOUT, "Use --contracts-only when running away from the deployed dashboard database host.\n");
    exit(0);
}

require dirname(__DIR__) . '/website-commerce-bootstrap.php';

if (in_array('--contracts-only', $argv, true)) {
    $getJson = static function (string $url, string $token): array {
        $context = stream_context_create(['http' => [
            'method' => 'GET',
            'header' => "Accept: application/json\r\nAuthorization: Bearer {$token}\r\n",
            'timeout' => 12,
            'ignore_errors' => true,
        ]]);
        $raw = @file_get_contents($url, false, $context);
        $decoded = is_string($raw) ? json_decode($raw, true) : null;
        return is_array($decoded) ? $decoded : [];
    };
    $token = jg_website_store_ops_token();
    $apiBase = jg_dashboard_marketplace_api_base_url();
    $storeOpsBase = rtrim(jg_website_config('JG_STORE_OPS_BASE_URL', 'store_ops_base_url'), '/');
    if ($token === '' || $apiBase === '' || $storeOpsBase === '') {
        fwrite(STDOUT, json_encode([
            'ok' => false,
            'status' => 'contract_configuration_missing',
            'detail' => 'The shared activation token or a downstream base URL is not configured.',
            'checked_at' => gmdate(DATE_ATOM),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL);
        exit(1);
    }

    $apiPayload = $getJson($apiBase . '/hard-set/state', $token);
    $storePayload = $getJson($storeOpsBase . '/api/website-orders/?action=state', $token);
    $apiReadiness = jg_hard_set_marketplace_readiness_response($apiPayload);
    $storeReadiness = jg_hard_set_store_ops_readiness_response($storePayload);
    $sourceAlignment = jg_hard_set_marketplace_source_alignment($storeReadiness['sources'], $apiReadiness['sources']);
    $stateAlignment = jg_hard_set_downstream_state_alignment(
        is_array($apiPayload['state'] ?? null) ? $apiPayload['state'] : [],
        is_array($storePayload['state'] ?? null) ? $storePayload['state'] : []
    );
    $remoteDetail = static function (string $detail, array $payload): string {
        $error = strtolower(trim((string) ($payload['error'] ?? '')));
        $knownErrors = ['unauthorized', 'not_found', 'method_not_allowed', 'store_ops_not_ready', 'marketplace_fulfillment_not_ready'];
        return in_array($error, $knownErrors, true) ? $detail . ' (remote error: ' . $error . ')' : $detail;
    };
    $checks = [
        ['key' => 'api_ingest', 'ready' => $apiReadiness['ready'], 'detail' => $remoteDetail($apiReadiness['detail'], $apiPayload)],
        ['key' => 'store_ops', 'ready' => $storeReadiness['ready'], 'detail' => $remoteDetail($storeReadiness['detail'], $storePayload)],
        ['key' => 'source_alignment', 'ready' => $sourceAlignment['ready'], 'detail' => $sourceAlignment['detail']],
        ['key' => 'state_alignment', 'ready' => $stateAlignment['ready'], 'detail' => $stateAlignment['detail']],
    ];
    $ok = !in_array(false, array_column($checks, 'ready'), true);
    fwrite(STDOUT, json_encode([
        'ok' => $ok,
        'status' => $ok ? 'downstream_contracts_ready' : 'downstream_contracts_not_ready',
        'checked_at' => gmdate(DATE_ATOM),
        'checks' => $checks,
        'sources' => [
            'api_ingest' => $apiReadiness['sources'],
            'store_ops' => $storeReadiness['sources'],
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL);
    exit($ok ? 0 : 1);
}

$stage = 'analytics_database_connection';
try {
    $database = analyticsResolveDatabaseConfig();
    if ($database['host'] === '' || $database['user'] === '') {
        throw new RuntimeException('Analytics database configuration is incomplete.');
    }
    $analyticsPdo = new PDO(
        sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            $database['host'],
            $database['port'],
            $database['name'],
            $database['charset']
        ),
        $database['user'],
        $database['pass'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
    $stage = 'sku_database_connection';
    $skuPdo = jg_sku_db();
    $stage = 'hard_set_state';
    $state = jg_hard_set_state($analyticsPdo, false, false);
    $stage = 'cross_service_readiness';
    $readiness = jg_hard_set_readiness($analyticsPdo, $skuPdo, false);
    $stage = 'outbox_state';
    $delivery = jg_hard_set_delivery_state($analyticsPdo);
    $result = jg_hard_set_preflight_result($state, $readiness, $delivery);
    $result['checked_at'] = gmdate(DATE_ATOM);
    $result['state'] = $state;
    $result['readiness'] = $readiness;
    $result['delivery'] = $delivery;
    fwrite(STDOUT, json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL);
    exit(!empty($result['ok']) ? 0 : 1);
} catch (Throwable $error) {
    fwrite(STDOUT, json_encode([
        'ok' => false,
        'status' => 'preflight_error',
        'detail' => 'Preflight could not query the required local or downstream readiness contracts.',
        'stage' => $stage,
        'error_type' => get_class($error),
        'checked_at' => gmdate(DATE_ATOM),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL);
    exit(1);
}
