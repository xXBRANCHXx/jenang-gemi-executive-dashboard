<?php
declare(strict_types=1);

require dirname(__DIR__) . '/partner-pricing.php';

function partner_pricing_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) return;
    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
    fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$sku = ['sku' => 'JG-001', 'sale_price' => 20000];
$pricing = ['JG-001' => 15000];

partner_pricing_expect(
    15000.0,
    jg_partner_effective_sku_price(['discount_enabled' => false, 'discount_percent' => 25], $sku, $pricing),
    'A disabled discount must preserve the custom SKU price.'
);
partner_pricing_expect(
    15000.0,
    jg_partner_effective_sku_price(['discount_enabled' => true, 'discount_percent' => 25], $sku, $pricing),
    'An enabled discount must derive the partner price from the SKU sale price.'
);
partner_pricing_expect(
    0.0,
    jg_partner_effective_sku_price(['discount_enabled' => true, 'discount_percent' => 100], $sku, $pricing),
    'A 100 percent partner discount must resolve to zero.'
);
partner_pricing_expect(100.0, jg_partner_discount_percent(['discount_percent' => 140]), 'Discount normalization must cap at 100 percent.');
partner_pricing_expect(0.0, jg_partner_discount_percent(['discount_percent' => -5]), 'Discount normalization must floor at zero percent.');

echo "partner-pricing-test: ok\n";
