<?php
declare(strict_types=1);

require dirname(__DIR__) . '/website-commerce-bootstrap.php';

function commerce_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) return;
    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
    fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$activation = '2026-06-23 01:02:03.500000';
commerce_expect(JG_WEBSITE_ORDER_MANUAL_ERA, jg_website_classify_order('2026-06-23 01:02:03.499999', true, $activation), 'Pre-cutover orders must remain manual-era.');
commerce_expect(JG_WEBSITE_ORDER_MANUAL_ERA, jg_website_classify_order($activation, true, $activation), 'The exact cutover instant is not post-cutover.');
commerce_expect(JG_WEBSITE_ORDER_STORE_OPS_ELIGIBLE, jg_website_classify_order('2026-06-23 01:02:03.500001', true, $activation), 'Only post-cutover orders are eligible.');
commerce_expect(JG_WEBSITE_ORDER_MANUAL_ERA, jg_website_classify_order('2027-01-01 00:00:00', false, null), 'Hard Set OFF must always create manual-era orders.');
commerce_expect('2026-06-23T01:02:03.500001Z', jg_website_atom('2026-06-23 01:02:03.500001'), 'Cross-service timestamps must preserve microseconds.');

$hardSet = ['enabled' => true, 'activated_at' => $activation];
commerce_expect(false, jg_website_order_is_store_ops_eligible([
    'era' => JG_WEBSITE_ORDER_MANUAL_ERA,
    'created_at' => '2026-06-23 01:02:04',
], $hardSet), 'A stored manual-era flag can never be backfilled after activation.');
commerce_expect(false, jg_website_order_is_store_ops_eligible([
    'era' => JG_WEBSITE_ORDER_STORE_OPS_ELIGIBLE,
    'created_at' => '2026-06-23 01:02:03',
], $hardSet), 'An inconsistent pre-cutover eligible flag must still be rejected server-side.');
commerce_expect(true, jg_website_order_is_store_ops_eligible([
    'era' => JG_WEBSITE_ORDER_STORE_OPS_ELIGIBLE,
    'created_at' => '2026-06-23 01:02:04',
], $hardSet), 'A consistent post-cutover order must be eligible.');

commerce_expect('ZEROWEB', jg_website_order_prefix('zero_website'), 'ZERO order IDs need their independent prefix.');
commerce_expect('JGWEB', jg_website_order_prefix('jenang_gemi_website'), 'Jenang Gemi order IDs need their independent prefix.');
commerce_expect(['zero_website', 'jenang_gemi_website'], array_keys(JG_WEBSITE_PLATFORMS), 'Website platform identifiers must remain separate.');

echo "website-commerce-test: ok\n";
