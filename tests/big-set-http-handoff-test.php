<?php
declare(strict_types=1);

require dirname(__DIR__) . '/website-commerce-bootstrap.php';

function big_set_http_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) {
        return;
    }
    throw new RuntimeException(
        $message
        . PHP_EOL . 'Expected: ' . var_export($expected, true)
        . PHP_EOL . 'Actual: ' . var_export($actual, true)
    );
}

function big_set_http_port(): int
{
    $socket = stream_socket_server('tcp://127.0.0.1:0', $errorCode, $errorMessage);
    if (!is_resource($socket)) {
        throw new RuntimeException('Unable to reserve a local HTTP test port: ' . $errorMessage);
    }
    $address = (string) stream_socket_get_name($socket, false);
    fclose($socket);
    return (int) substr(strrchr($address, ':'), 1);
}

/** @return resource */
function big_set_http_server(
    string $service,
    int $port,
    string $statePath,
    string $eventsPath,
    string $token,
    array $sources,
    string $outputPath
) {
    $router = __DIR__ . '/fixtures/big-set-downstream-router.php';
    $environment = array_merge(
        is_array(getenv()) ? getenv() : [],
        [
            'BIG_SET_FIXTURE_SERVICE' => $service,
            'BIG_SET_FIXTURE_STATE' => $statePath,
            'BIG_SET_FIXTURE_EVENTS' => $eventsPath,
            'BIG_SET_FIXTURE_TOKEN' => $token,
            'BIG_SET_FIXTURE_SOURCES' => (string) json_encode($sources),
        ]
    );
    $descriptors = [
        0 => ['pipe', 'r'],
        1 => ['file', $outputPath, 'a'],
        2 => ['file', $outputPath, 'a'],
    ];
    $process = proc_open(
        [PHP_BINARY, '-S', '127.0.0.1:' . $port, $router],
        $descriptors,
        $pipes,
        dirname(__DIR__),
        $environment
    );
    if (!is_resource($process)) {
        throw new RuntimeException('Unable to launch the local ' . $service . ' HTTP fixture.');
    }
    if (isset($pipes[0]) && is_resource($pipes[0])) {
        fclose($pipes[0]);
    }
    for ($attempt = 0; $attempt < 100; $attempt++) {
        $socket = @fsockopen('127.0.0.1', $port, $errorCode, $errorMessage, 0.05);
        if (is_resource($socket)) {
            fclose($socket);
            return $process;
        }
        usleep(20000);
    }
    proc_terminate($process);
    proc_close($process);
    throw new RuntimeException('The local ' . $service . ' HTTP fixture did not start.');
}

/** @param resource $process */
function big_set_http_stop($process): void
{
    if (is_resource($process)) {
        proc_terminate($process);
        proc_close($process);
    }
}

function big_set_http_database(array $payload): PDO
{
    $pdo = new PDO('sqlite::memory:');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec(
        'CREATE TABLE hard_set_outbox (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL DEFAULT "ACTIVATED",
            payload_json TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT "pending",
            attempts INTEGER NOT NULL DEFAULT 0,
            last_error TEXT NOT NULL DEFAULT "",
            delivered_at TEXT NULL
        )'
    );
    $statement = $pdo->prepare('INSERT INTO hard_set_outbox (payload_json) VALUES (:payload_json)');
    $statement->execute([
        ':payload_json' => json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
    ]);
    return $pdo;
}

/** @return array<int,string> */
function big_set_http_events(string $path): array
{
    $lines = is_file($path) ? file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) : [];
    return array_values(array_map('trim', is_array($lines) ? $lines : []));
}

if (!function_exists('proc_open')) {
    fwrite(STDOUT, "big-set-http-handoff-test: skipped (proc_open unavailable)\n");
    exit(0);
}

$temporaryDirectory = sys_get_temp_dir() . '/jg-big-set-http-' . bin2hex(random_bytes(6));
if (!mkdir($temporaryDirectory, 0700, true) && !is_dir($temporaryDirectory)) {
    throw new RuntimeException('Unable to create the local HTTP rehearsal directory.');
}
$processes = [];
$previousEnvironment = [];
foreach (['JG_STORE_OPS_BASE_URL', 'JG_MARKETPLACE_API_BASE_URL', 'JG_STORE_OPS_WEBSITE_TOKEN'] as $key) {
    $value = getenv($key);
    $previousEnvironment[$key] = is_string($value) ? $value : null;
}

try {
    $token = 'local-http-rehearsal-token-' . bin2hex(random_bytes(16));
    $sources = ['shopee:jenang-gemi-shopee', 'tiktok:jenang-gemi-tiktok'];
    $payload = [
        'event' => 'hard_set_activated',
        'enabled' => true,
        'activated_at' => '2026-07-16T04:10:11.123456Z',
        'activated_by' => 'Local HTTP rehearsal',
        'automatic_sources' => $sources,
    ];

    // A Store Ops rejection must stop before API Ingest is contacted.
    $scenarioOne = $temporaryDirectory . '/store-rejection';
    mkdir($scenarioOne, 0700, true);
    $eventsOne = $scenarioOne . '/events.log';
    $storeStateOne = $scenarioOne . '/store-state.json';
    $apiStateOne = $scenarioOne . '/api-state.json';
    file_put_contents($storeStateOne, json_encode(['enabled' => false, 'failures_remaining' => 1]), LOCK_EX);
    file_put_contents($apiStateOne, json_encode(['enabled' => false, 'failures_remaining' => 0]), LOCK_EX);
    $storePortOne = big_set_http_port();
    $apiPortOne = big_set_http_port();
    $processes[] = big_set_http_server('store_ops', $storePortOne, $storeStateOne, $eventsOne, $token, $sources, $scenarioOne . '/store-server.log');
    $processes[] = big_set_http_server('api_ingest', $apiPortOne, $apiStateOne, $eventsOne, $token, $sources, $scenarioOne . '/api-server.log');
    putenv('JG_STORE_OPS_BASE_URL=http://127.0.0.1:' . $storePortOne);
    putenv('JG_MARKETPLACE_API_BASE_URL=http://127.0.0.1:' . $apiPortOne);
    putenv('JG_STORE_OPS_WEBSITE_TOKEN=' . $token);
    $storeRejected = jg_hard_set_deliver_outbox(big_set_http_database($payload));
    big_set_http_expect(false, $storeRejected['delivered'], 'A Store Ops HTTP rejection must leave the outbox pending.');
    big_set_http_expect(1, $storeRejected['attempts'], 'A rejected HTTP handoff must record one durable attempt.');
    big_set_http_expect(['store_ops'], big_set_http_events($eventsOne), 'API Ingest must not be called after Store Ops rejects activation.');
    $apiStateAfterStoreRejection = json_decode((string) file_get_contents($apiStateOne), true);
    big_set_http_expect(false, !empty($apiStateAfterStoreRejection['enabled']), 'API Ingest must remain OFF after Store Ops rejects activation.');
    while ($processes !== []) {
        big_set_http_stop(array_pop($processes));
    }

    // If API Ingest fails after Store Ops locks, the next durable retry must
    // idempotently re-acknowledge Store Ops and finish the exact same cutover.
    $scenarioTwo = $temporaryDirectory . '/api-retry';
    mkdir($scenarioTwo, 0700, true);
    $eventsTwo = $scenarioTwo . '/events.log';
    $storeStateTwo = $scenarioTwo . '/store-state.json';
    $apiStateTwo = $scenarioTwo . '/api-state.json';
    file_put_contents($storeStateTwo, json_encode(['enabled' => false, 'failures_remaining' => 0]), LOCK_EX);
    file_put_contents($apiStateTwo, json_encode(['enabled' => false, 'failures_remaining' => 1]), LOCK_EX);
    $storePortTwo = big_set_http_port();
    $apiPortTwo = big_set_http_port();
    $processes[] = big_set_http_server('store_ops', $storePortTwo, $storeStateTwo, $eventsTwo, $token, $sources, $scenarioTwo . '/store-server.log');
    $processes[] = big_set_http_server('api_ingest', $apiPortTwo, $apiStateTwo, $eventsTwo, $token, $sources, $scenarioTwo . '/api-server.log');
    putenv('JG_STORE_OPS_BASE_URL=http://127.0.0.1:' . $storePortTwo);
    putenv('JG_MARKETPLACE_API_BASE_URL=http://127.0.0.1:' . $apiPortTwo);
    $retryDatabase = big_set_http_database($payload);
    $firstAttempt = jg_hard_set_deliver_outbox($retryDatabase);
    big_set_http_expect(false, $firstAttempt['delivered'], 'A transient API Ingest failure must leave the outbox pending.');
    big_set_http_expect(1, $firstAttempt['attempts'], 'The first API Ingest failure must be recorded.');
    big_set_http_expect(
        ['store_ops', 'api_ingest'],
        big_set_http_events($eventsTwo),
        'The first HTTP attempt must contact Store Ops before API Ingest.'
    );
    $storeLocked = json_decode((string) file_get_contents($storeStateTwo), true);
    $apiPending = json_decode((string) file_get_contents($apiStateTwo), true);
    big_set_http_expect(true, !empty($storeLocked['enabled']), 'Store Ops should remain irreversibly locked after acknowledging the cutover.');
    big_set_http_expect(false, !empty($apiPending['enabled']), 'API Ingest must remain OFF when its activation request fails.');

    $secondAttempt = jg_hard_set_deliver_outbox($retryDatabase);
    big_set_http_expect(true, $secondAttempt['delivered'], 'The durable retry must complete the HTTP handoff.');
    big_set_http_expect(2, $secondAttempt['attempts'], 'The successful retry must preserve the attempt count.');
    big_set_http_expect(
        ['store_ops', 'api_ingest', 'store_ops', 'api_ingest'],
        big_set_http_events($eventsTwo),
        'The retry must repeat the safe Store Ops-first ordering.'
    );
    $storeFinal = json_decode((string) file_get_contents($storeStateTwo), true);
    $apiFinal = json_decode((string) file_get_contents($apiStateTwo), true);
    foreach ([$storeFinal, $apiFinal] as $state) {
        big_set_http_expect(true, !empty($state['enabled']), 'Both downstream services must finish ON.');
        big_set_http_expect($payload['activated_at'], $state['activated_at'] ?? null, 'Both services must freeze the exact same timestamp.');
        big_set_http_expect($sources, $state['automatic_sources'] ?? null, 'Both services must freeze the exact same source scope.');
    }
} finally {
    while ($processes !== []) {
        big_set_http_stop(array_pop($processes));
    }
    foreach ($previousEnvironment as $key => $value) {
        putenv($value === null ? $key : $key . '=' . $value);
    }
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($temporaryDirectory, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($iterator as $entry) {
        if ($entry->isDir()) {
            rmdir($entry->getPathname());
        } else {
            unlink($entry->getPathname());
        }
    }
    rmdir($temporaryDirectory);
}

fwrite(STDOUT, "big-set-http-handoff-test: ok\n");
