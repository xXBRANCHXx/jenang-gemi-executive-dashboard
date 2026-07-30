<?php
declare(strict_types=1);

require dirname(__DIR__) . '/partner-billing-bootstrap.php';

function admin_partner_billing_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) return;
    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
    fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$period = jg_admin_partner_billing_period(new DateTimeImmutable('2026-07-01 12:00:00', new DateTimeZone('Asia/Jakarta')));
admin_partner_billing_expect('2026-07-01', $period['start'], 'Admin and partner periods must share the July 1 anchor.');
admin_partner_billing_expect('2026-07-07', $period['end'], 'Admin period must contain exactly seven days.');
admin_partner_billing_expect('2026-07-10', $period['due'], 'Admin period due date must match the partner portal.');
admin_partner_billing_expect('July 1–7, 2026', jg_admin_partner_billing_period_label('2026-07-01', '2026-07-07'), 'Notification copy should use the requested human-readable period.');
admin_partner_billing_expect(['local.server', 'localhost'], jg_partner_db_host_candidates('local.server'), 'Hostinger partner DB connections should fall back to localhost.');

$source = file_get_contents(dirname(__DIR__) . '/partner-billing-bootstrap.php');
$statusSource = file_get_contents(dirname(__DIR__) . '/api/partner-db-status/index.php');
admin_partner_billing_expect(true, str_contains($source, 'accounting_partner_bill_receipts'), 'Accounting confirmation must have an idempotency ledger.');
admin_partner_billing_expect(true, str_contains($source, 'billing_status = "dispute_accepted"'), 'Accepted disputes must mark claimed orders paid in storage.');
admin_partner_billing_expect(true, str_contains($source, 'billing_status = "bill_paid"'), 'Confirmed bills must mark included orders paid in storage.');
admin_partner_billing_expect(true, str_contains($statusSource, 'jg_partner_db_status_setup_token_matches') && str_contains($statusSource, 'hash_equals'), 'Deployment checks should support the existing server setup token without weakening comparison.');
admin_partner_billing_expect(true, str_contains($statusSource, 'jg_admin_partner_billing_sync') && str_contains($statusSource, 'billing_ready'), 'Deployment checks should exercise the production billing synchronization path.');

echo "admin-partner-billing-test: ok\n";
