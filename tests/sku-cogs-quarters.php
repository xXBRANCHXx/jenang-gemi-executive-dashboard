<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/sku-db-bootstrap.php';

function assert_sku_cogs_test(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, $message . PHP_EOL);
        exit(1);
    }
}

$jakarta = jg_sku_business_timezone();
assert_sku_cogs_test(
    jg_sku_next_quarter_start(new DateTimeImmutable('2026-01-01 00:00:00', $jakarta)) === '2026-04-01 00:00:00',
    'A Q1 change must wait until Q2.'
);
assert_sku_cogs_test(
    jg_sku_next_quarter_start(new DateTimeImmutable('2026-06-30 23:59:59', $jakarta)) === '2026-07-01 00:00:00',
    'A late Q2 change must start at Q3.'
);
assert_sku_cogs_test(
    jg_sku_next_quarter_start(new DateTimeImmutable('2026-10-15 12:00:00', $jakarta)) === '2027-01-01 00:00:00',
    'A Q4 change must start at Q1 of the next year.'
);
assert_sku_cogs_test(jg_sku_quarter_label('2027-01-01 00:00:00') === 'Q1 2027', 'Quarter labels must include year rollover.');

assert_sku_cogs_test(jg_sku_cogs_change_mode_allowed('quarterly', 'requester'), 'Admin-tier SKU users must be allowed to queue quarterly COGS.');
assert_sku_cogs_test(!jg_sku_cogs_change_mode_allowed('retroactive', 'requester'), 'Admin-tier SKU users must not be allowed to hard set COGS.');
assert_sku_cogs_test(jg_sku_cogs_change_mode_allowed('retroactive', 'branch'), 'Branch-tier SKU users must be allowed to hard set COGS.');

$history = [
    [
        'id' => 1,
        'old_price' => null,
        'new_price' => 100,
        'change_mode' => 'opening',
        'effective_at' => '2025-01-01 00:00:00',
        'recorded_at' => '2025-01-01 00:00:00',
    ],
    [
        'id' => 2,
        'old_price' => 100,
        'new_price' => 120,
        'change_mode' => 'quarterly',
        'effective_at' => '2026-04-01 00:00:00',
        'recorded_at' => '2026-02-15 00:00:00',
    ],
    [
        'id' => 3,
        'old_price' => 100,
        'new_price' => 140,
        'change_mode' => 'quarterly',
        'effective_at' => '2026-07-01 00:00:00',
        'recorded_at' => '2026-05-15 00:00:00',
    ],
];

assert_sku_cogs_test(jg_sku_cogs_at($history, '2026-03-31 23:59:59') === 100.0, 'Q1 must keep opening COGS.');
assert_sku_cogs_test(jg_sku_cogs_at($history, '2026-04-01 00:00:00') === 120.0, 'Q2 must activate its scheduled COGS exactly at quarter start.');
assert_sku_cogs_test(jg_sku_cogs_at($history, '2026-07-01 00:00:00') === 140.0, 'Q3 must replace Q2 COGS.');

$history[] = [
    'id' => 4,
    'old_price' => 140,
    'new_price' => 90,
    'change_mode' => 'retroactive',
    'effective_at' => null,
    'recorded_at' => '2026-08-01 00:00:00',
];
assert_sku_cogs_test(jg_sku_cogs_at($history, '2025-02-01 00:00:00') === 90.0, 'A Branch hard set must recalculate from the beginning.');
assert_sku_cogs_test(jg_sku_cogs_at($history, '2027-01-01 00:00:00') === 90.0, 'A Branch hard set must supersede earlier quarterly schedules.');

$history[] = [
    'id' => 5,
    'old_price' => 90,
    'new_price' => 110,
    'change_mode' => 'quarterly',
    'effective_at' => '2026-10-01 00:00:00',
    'recorded_at' => '2026-08-10 00:00:00',
];
assert_sku_cogs_test(jg_sku_cogs_at($history, '2026-09-30 23:59:59') === 90.0, 'Post-hard-set COGS must remain until the next scheduled quarter.');
assert_sku_cogs_test(jg_sku_cogs_at($history, '2026-10-01 00:00:00') === 110.0, 'Quarterly changes created after a hard set must still activate.');

fwrite(STDOUT, "SKU COGS quarter tests passed.\n");
