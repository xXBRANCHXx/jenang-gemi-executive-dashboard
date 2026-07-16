<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

/** @param array<string,mixed> $payload */
function big_set_fixture_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function big_set_fixture_env(string $key): string
{
    $value = getenv($key);
    return is_string($value) ? trim($value) : '';
}

/** @return array<string,mixed> */
function big_set_fixture_state(string $path): array
{
    $raw = $path !== '' && is_file($path) ? file_get_contents($path) : false;
    $decoded = is_string($raw) ? json_decode($raw, true) : null;
    return is_array($decoded) ? $decoded : ['enabled' => false, 'failures_remaining' => 0];
}

/** @param array<string,mixed> $state */
function big_set_fixture_save_state(string $path, array $state): void
{
    $encoded = json_encode($state, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($path === '' || !is_string($encoded) || file_put_contents($path, $encoded, LOCK_EX) === false) {
        big_set_fixture_json(['ok' => false, 'error' => 'fixture_state_write_failed'], 500);
    }
}

$service = big_set_fixture_env('BIG_SET_FIXTURE_SERVICE');
$statePath = big_set_fixture_env('BIG_SET_FIXTURE_STATE');
$eventPath = big_set_fixture_env('BIG_SET_FIXTURE_EVENTS');
$expectedToken = big_set_fixture_env('BIG_SET_FIXTURE_TOKEN');
$expectedSources = json_decode(big_set_fixture_env('BIG_SET_FIXTURE_SOURCES'), true);
$expectedSources = is_array($expectedSources) ? array_values($expectedSources) : [];
sort($expectedSources);

$authorization = trim((string) ($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? ''));
$providedToken = str_starts_with($authorization, 'Bearer ') ? trim(substr($authorization, 7)) : '';
if ($expectedToken === '' || $providedToken === '' || !hash_equals($expectedToken, $providedToken)) {
    big_set_fixture_json(['ok' => false, 'error' => 'unauthorized'], 401);
}

$path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?: '/';
$expectedPath = $service === 'store_ops' ? '/api/website-orders/' : '/hard-set/activate';
if ($path !== $expectedPath || strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
    big_set_fixture_json(['ok' => false, 'error' => 'not_found'], 404);
}

$payload = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($payload) || empty($payload['enabled'])) {
    big_set_fixture_json(['ok' => false, 'error' => 'invalid_activation_payload'], 422);
}
$activatedAt = trim((string) ($payload['activated_at'] ?? ''));
if (preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/', $activatedAt) !== 1) {
    big_set_fixture_json(['ok' => false, 'error' => 'invalid_activation_timestamp'], 422);
}
$sources = is_array($payload['automatic_sources'] ?? null)
    ? array_values($payload['automatic_sources'])
    : [];
sort($sources);
if ($sources === [] || $sources !== $expectedSources) {
    big_set_fixture_json(['ok' => false, 'error' => 'invalid_automatic_sources'], 422);
}

if ($eventPath !== '') {
    file_put_contents($eventPath, $service . "\n", FILE_APPEND | LOCK_EX);
}
$state = big_set_fixture_state($statePath);
$failuresRemaining = max(0, (int) ($state['failures_remaining'] ?? 0));
if ($failuresRemaining > 0) {
    $state['failures_remaining'] = $failuresRemaining - 1;
    big_set_fixture_save_state($statePath, $state);
    big_set_fixture_json(['ok' => false, 'error' => 'simulated_' . $service . '_failure'], 503);
}

if (!empty($state['enabled'])) {
    $storedSources = is_array($state['automatic_sources'] ?? null)
        ? array_values($state['automatic_sources'])
        : [];
    sort($storedSources);
    if (($state['activated_at'] ?? null) !== $activatedAt || $storedSources !== $sources) {
        big_set_fixture_json(['ok' => false, 'error' => 'permanent_cutover_conflict'], 409);
    }
} else {
    $state = [
        'enabled' => true,
        'activated_at' => $activatedAt,
        'activated_by' => (string) ($payload['activated_by'] ?? ''),
        'automatic_sources' => $sources,
        'failures_remaining' => 0,
    ];
    big_set_fixture_save_state($statePath, $state);
}

$acknowledgement = [
    'enabled' => true,
    'activated_at' => $activatedAt,
    'activated_by' => (string) ($state['activated_by'] ?? ''),
];
$acknowledgement[$service === 'store_ops' ? 'automatic_sources' : 'sources'] = $sources;
big_set_fixture_json(['ok' => true, 'state' => $acknowledgement]);
