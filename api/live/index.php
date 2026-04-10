<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/auth.php';

if (!jg_admin_is_authenticated()) {
    http_response_code(401);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Unauthorized';
    exit;
}

header('Content-Type: text/event-stream; charset=utf-8');
header('Cache-Control: no-cache, no-transform');
header('Connection: keep-alive');
header('X-Accel-Buffering: no');

@ini_set('output_buffering', 'off');
@ini_set('zlib.output_compression', '0');
@ini_set('implicit_flush', '1');
while (ob_get_level() > 0) {
    @ob_end_flush();
}
ob_implicit_flush(true);

$endpoint = 'https://jenanggemi.com/admin-live-state.php';
$token = JG_ADMIN_CODE_HASH;
$headers = [
    'Accept: application/json',
    'X-JG-Admin-Token: ' . $token,
];

$lastSequence = isset($_GET['last_sequence']) ? max(0, (int) $_GET['last_sequence']) : -1;
$startedAt = time();
$maxRuntime = 25;

$fetchState = static function () use ($endpoint, $headers): ?array {
    $responseBody = false;
    $statusCode = 0;

    if (function_exists('curl_init')) {
        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 5,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_FOLLOWLOCATION => true,
        ]);
        $responseBody = curl_exec($ch);
        $statusCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => implode("\r\n", $headers),
                'timeout' => 5,
            ],
        ]);
        $responseBody = @file_get_contents($endpoint, false, $context);
        if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $matches)) {
            $statusCode = (int) $matches[1];
        }
    }

    if ($responseBody === false || $statusCode >= 400 || $statusCode === 0) {
        return null;
    }

    $decoded = json_decode($responseBody, true);
    if (!is_array($decoded) || !is_array($decoded['live_state'] ?? null)) {
        return null;
    }

    return $decoded['live_state'];
};

echo "retry: 1500\n\n";
flush();

while (!connection_aborted() && (time() - $startedAt) < $maxRuntime) {
    $state = $fetchState();

    if ($state !== null) {
        $sequence = max(0, (int) ($state['sequence'] ?? 0));
        if ($sequence !== $lastSequence) {
            $lastSequence = $sequence;
            echo "event: change\n";
            echo 'data: ' . json_encode($state, JSON_UNESCAPED_SLASHES) . "\n\n";
            flush();
        }
    } else {
        echo ": heartbeat\n\n";
        flush();
    }

    sleep(1);
}

echo "event: end\n";
echo "data: {}\n\n";
flush();
