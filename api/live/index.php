<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/auth.php';
require dirname(__DIR__, 2) . '/analytics-bootstrap.php';

if (!jg_admin_is_authenticated()) {
    http_response_code(401);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Unauthorized';
    exit;
}

if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
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

$lastSequence = isset($_GET['last_sequence']) ? max(0, (int) $_GET['last_sequence']) : -1;
$startedAt = time();
$maxRuntime = 25;

echo "retry: 1500\n\n";
flush();

while (!connection_aborted() && (time() - $startedAt) < $maxRuntime) {
    $state = analyticsReadLiveState();
    $sequence = max(0, (int) ($state['sequence'] ?? 0));

    if ($sequence !== $lastSequence) {
        $lastSequence = $sequence;
        echo "event: change\n";
        echo 'data: ' . json_encode($state, JSON_UNESCAPED_SLASHES) . "\n\n";
        flush();
    } else {
        echo ": heartbeat\n\n";
        flush();
    }

    sleep(1);
}

echo "event: end\n";
echo "data: {}\n\n";
flush();
