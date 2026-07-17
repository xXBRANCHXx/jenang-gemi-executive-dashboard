<?php
declare(strict_types=1);

require dirname(__DIR__) . '/zero-voucher-bootstrap.php';

function voucher_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        throw new RuntimeException($message . ' Expected ' . var_export($expected, true) . ', got ' . var_export($actual, true));
    }
}

voucher_expect('EVENT15', zero_voucher_normalize_code(' event 15 '), 'Codes should compare without whitespace or case differences.');
voucher_expect(true, zero_voucher_code_hash('event15') === zero_voucher_code_hash(' EVENT15 '), 'Equivalent voucher codes should hash identically.');
voucher_expect('EV•••15', zero_voucher_code_hint('EVENT15'), 'Saved codes should only expose a masked hint.');
voucher_expect('2026-07-17 11:00:00', zero_voucher_utc_sql(zero_voucher_parse_local_datetime('2026-07-17T18:00', 'Start time')), 'WIB schedules should be persisted as UTC.');
voucher_expect(76500.0, zero_voucher_unit_price(100000, 90000, ['discount_percent' => 15, 'stacking_mode' => 'compound']), 'Compound vouchers should apply after active discounts.');
voucher_expect(85000.0, zero_voucher_unit_price(100000, 90000, ['discount_percent' => 15, 'stacking_mode' => 'override']), 'Override vouchers should replace active discounts.');

echo "zero-voucher-test: ok\n";
