<?php
declare(strict_types=1);

require dirname(__DIR__) . '/sales-summary-stability.php';
$api = file_get_contents(dirname(__DIR__) . '/api/sales/index.php');
function load_sales_function(string $name, string $end): void {
    global $api;
    $start = strpos($api, 'function ' . $name . '(');
    $stop = strpos($api, $end, $start + 1);
    eval(substr($api, $start, $stop - $start));
}
load_sales_function('jg_sales_prepare_cached_response', "\n/**");
load_sales_function('jg_sales_context_only_summary', "\nfunction jg_sales_cache_dir");
load_sales_function('jg_sales_cache_write', "\n/**");
$cacheDir = sys_get_temp_dir() . '/jg-complete-test-' . bin2hex(random_bytes(6));
mkdir($cacheDir);
$failSource = '';
$correction = 0;
function check(bool $condition, string $message): void { if (!$condition) throw new RuntimeException($message); }
function jg_sales_cache_path(string $key): string { global $cacheDir; return $cacheDir . '/' . $key . '.json'; }
function jg_sales_cache_read(string $key, int $ttl): ?string { $value = @file_get_contents(jg_sales_cache_path($key)); return is_string($value) ? $value : null; }
function analyticsDb(): object { return (object) []; }
function merge_source(array $summary, string $source, int $revenue): array {
    global $failSource, $correction;
    if ($source === $failSource) throw new RuntimeException($source . ' unavailable');
    $summary['months'][0]['revenue'] += $revenue + ($source === 'partner' ? $correction : 0);
    $summary['months'][0]['orders']++;
    return $summary;
}
function jg_website_merge_sales_summary(object $pdo, array $data, int $year): array { return merge_source($data, 'website', 20); }
function jg_sales_apply_executive_context(array $data, int $year): array { return merge_source($data, 'context', 30); }
function jg_whatsapp_merge_sales_summary(object $pdo, array $data, int $year): array { return merge_source($data, 'direct', 40); }
function jg_sales_merge_partner_summary(array $data, int $year): array { return merge_source($data, 'partner', 50); }
function jg_sales_apply_all_channel_packing(array $data, int $year): array { return $data; }
function jg_sales_attach_calculation_audit(array &$data, int $year): void {}
function jg_sales_remove_customer_paid_fields(array &$data): void {}
$base = json_encode(['ok' => true, 'year' => 2026, 'months' => [['month' => 7, 'revenue' => 100, 'orders' => 5, 'cogs' => 60, 'packing_cost' => 10]], 'totals' => [], 'generated_at' => '2026-09-17T00:00:00Z', 'sync_status' => ['fresh' => true, 'status' => 'ok']]);
try {
    // Never show a successful partial result on a first load with no complete cache.
    $failSource = 'partner';
    $first = json_decode(jg_sales_prepare_cached_response($base, 2026, false), true);
    check($first['ok'] === false && http_response_code() === 503, 'Missing initial source must fail, not reduce totals.');
    check(jg_sales_context_only_summary(2026) === null, 'Context-only fallback cannot invent all-channel totals.');
    $failSource = ''; http_response_code(200);
    $complete = json_decode(jg_sales_prepare_cached_response($base, 2026, false), true);
    check($complete['totals']['revenue'] === 240 && $complete['totals']['gross_profit'] === 170, 'All sources must contribute before publication.');
    $saved = jg_sales_cache_read('sales-summary-complete-v1-2026-core', 0);
    foreach (['website', 'context', 'direct', 'partner'] as $source) {
        $failSource = $source;
        $fallback = json_decode(jg_sales_prepare_cached_response($base, 2026, false), true);
        check($fallback['totals'] === $complete['totals'] && $fallback['months'] === $complete['months'], "$source failure must retain the entire prior snapshot.");
        check($fallback['sync_status']['fresh'] === false && isset($fallback['meta']['refresh_error']), 'Fallback must not claim live data.');
        check(jg_sales_cache_read('sales-summary-complete-v1-2026-core', 0) === $saved, 'Failure must not poison the complete cache.');
    }
    check(jg_sales_context_only_summary(2026)['totals'] === $complete['totals'], 'Upstream outage must preserve complete all-channel totals.');
    $failSource = ''; $correction = -10;
    $corrected = json_decode(jg_sales_prepare_cached_response($base, 2026, false), true);
    check($corrected['totals']['revenue'] === 230, 'Legitimate corrections may lower a complete total.');
    check(!isset($corrected['meta']['refresh_error']), 'Successful recovery must clear the error.');
    $older = $complete; $older['meta']['snapshot_at'] = '2020-01-01T00:00:00.000000Z';
    jg_sales_cache_write('sales-summary-complete-v1-2026-core', json_encode($older));
    check(json_decode(jg_sales_cache_read('sales-summary-complete-v1-2026-core', 0), true)['totals']['revenue'] === 230, 'A late older request cannot roll back the shared complete cache.');
    $older['generated_at'] = '2026-09-16T00:00:00Z';
    $older['meta']['snapshot_at'] = '2099-01-01T00:00:00.000000Z';
    jg_sales_cache_write('sales-summary-complete-v1-2026-core', json_encode($older));
    check(json_decode(jg_sales_cache_read('sales-summary-complete-v1-2026-core', 0), true)['totals']['revenue'] === 230, 'Fresh enrichment cannot make an older marketplace snapshot authoritative.');
    $bad = json_decode(jg_sales_prepare_cached_response('{invalid json', 2026, false), true);
    check($bad['totals']['revenue'] === 230, 'Malformed summaries must preserve the complete cache.');
    echo "Complete sales snapshots: source outages, first load, recovery, corrections, and cache races passed.\n";
} finally {
    foreach (glob($cacheDir . '/*') as $path) unlink($path);
    rmdir($cacheDir);
}
