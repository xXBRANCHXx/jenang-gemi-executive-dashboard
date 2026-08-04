<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';

function daily_columns_expect(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$endpoint = file_get_contents(dirname(__DIR__) . '/api/daily-columns/index.php');
daily_columns_expect(is_string($endpoint), 'Daily column verification endpoint must exist.');
daily_columns_expect(
    str_contains($endpoint, 'jg_admin_require_auth_json();')
        && str_contains($endpoint, 'jg_admin_code_matches($pin)'),
    'Column removal PIN verification must require an authenticated dashboard session and validate the PIN server-side.'
);
daily_columns_expect(
    jg_admin_code_matches('definitely-not-the-dashboard-pin') === false,
    'Invalid Dashboard PINs must be rejected without mutating the authenticated session.'
);

echo "daily-columns-api-test: ok\n";
