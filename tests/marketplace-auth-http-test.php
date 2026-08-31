<?php
declare(strict_types=1);

function marketplace_auth_http_expect(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

function marketplace_auth_http_port(): int
{
    $socket = stream_socket_server('tcp://127.0.0.1:0', $errorCode, $errorMessage);
    if (!is_resource($socket)) {
        throw new RuntimeException('Unable to reserve a local HTTP port: ' . $errorMessage);
    }
    $address = (string) stream_socket_get_name($socket, false);
    fclose($socket);
    return (int) substr(strrchr($address, ':'), 1);
}

if (!function_exists('proc_open')) {
    fwrite(STDOUT, "marketplace-auth-http-test: skipped (proc_open unavailable)\n");
    exit(0);
}

$temporaryDirectory = sys_get_temp_dir() . '/jg-marketplace-auth-' . bin2hex(random_bytes(6));
if (!mkdir($temporaryDirectory, 0700, true) && !is_dir($temporaryDirectory)) {
    throw new RuntimeException('Unable to create marketplace authorization test directory.');
}
$eventPath = $temporaryDirectory . '/events.log';
$serverOutput = $temporaryDirectory . '/server.log';
$token = 'fixture-token-' . bin2hex(random_bytes(16));
$port = marketplace_auth_http_port();
$environment = array_merge(is_array(getenv()) ? getenv() : [], [
    'JG_MARKETPLACE_AUTH_FIXTURE_EVENTS' => $eventPath,
    'JG_MARKETPLACE_AUTH_FIXTURE_TOKEN' => $token,
]);
$process = proc_open(
    [PHP_BINARY, '-S', '127.0.0.1:' . $port, __DIR__ . '/fixtures/marketplace-auth-router.php'],
    [0 => ['pipe', 'r'], 1 => ['file', $serverOutput, 'a'], 2 => ['file', $serverOutput, 'a']],
    $pipes,
    dirname(__DIR__),
    $environment
);
if (!is_resource($process)) {
    throw new RuntimeException('Unable to start marketplace authorization fixture.');
}
if (isset($pipes[0]) && is_resource($pipes[0])) {
    fclose($pipes[0]);
}

$previousBaseUrl = getenv('JG_API_INGEST_BASE_URL');
$previousToken = getenv('JG_API_INGEST_SETUP_TOKEN');
try {
    for ($attempt = 0; $attempt < 100; $attempt++) {
        $socket = @fsockopen('127.0.0.1', $port, $errorCode, $errorMessage, 0.05);
        if (is_resource($socket)) {
            fclose($socket);
            break;
        }
        usleep(20000);
    }

    putenv('JG_API_INGEST_BASE_URL=http://127.0.0.1:' . $port);
    putenv('JG_API_INGEST_SETUP_TOKEN=' . $token);
    require dirname(__DIR__) . '/marketplace-auth-bootstrap.php';

    $status = jg_marketplace_auth_upstream('GET', '/shopee/auth/dashboard/status');
    marketplace_auth_http_expect($status['status'] === 200 && !empty($status['payload']['ok']), 'Dashboard must read Shopee authorization status server-to-server.');
    $session = jg_marketplace_auth_upstream('POST', '/shopee/auth/dashboard/session', ['account_key' => 'zero-shopee']);
    marketplace_auth_http_expect($session['status'] === 201 && !empty($session['payload']['ok']), 'Dashboard must create the one-time Shopee authorization session.');

    $events = array_values(array_filter(array_map(
        static fn (string $line): mixed => json_decode($line, true),
        file($eventPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: []
    ), 'is_array'));
    marketplace_auth_http_expect(count($events) === 2, 'The test must record exactly the status and session requests.');
    foreach ($events as $event) {
        marketplace_auth_http_expect(($event['authorization'] ?? '') === 'Bearer ' . $token, 'The setup token must stay in the server-to-server Authorization header.');
        marketplace_auth_http_expect(!str_contains((string) ($event['uri'] ?? ''), $token), 'The setup token must never appear in an authorization URL.');
        marketplace_auth_http_expect(!str_contains((string) ($event['uri'] ?? ''), 'setup_token='), 'Self-service requests must not use setup-token query strings.');
    }
    marketplace_auth_http_expect(($events[1]['body']['account_key'] ?? '') === 'zero-shopee', 'The session request must retain the selected account.');
} finally {
    if ($previousBaseUrl === false) {
        putenv('JG_API_INGEST_BASE_URL');
    } else {
        putenv('JG_API_INGEST_BASE_URL=' . $previousBaseUrl);
    }
    if ($previousToken === false) {
        putenv('JG_API_INGEST_SETUP_TOKEN');
    } else {
        putenv('JG_API_INGEST_SETUP_TOKEN=' . $previousToken);
    }
    proc_terminate($process);
    proc_close($process);
    foreach ([$eventPath, $serverOutput] as $path) {
        if (is_file($path)) {
            unlink($path);
        }
    }
    @rmdir($temporaryDirectory);
}

echo "Marketplace authorization HTTP tests passed.\n";
