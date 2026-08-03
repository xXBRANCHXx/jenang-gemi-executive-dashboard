<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/sku-db-bootstrap.php';

function sku_shipping_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) {
        return;
    }
    throw new RuntimeException($message . ' Expected ' . var_export($expected, true) . ', got ' . var_export($actual, true));
}

sku_shipping_expect(
    210,
    jg_sku_product_weight_grams(15.0, 15.0, 210),
    'A 15-sachet SKU must use one ASTRA packed weight.'
);
sku_shipping_expect(
    420,
    jg_sku_product_weight_grams(30.0, 15.0, 210),
    'A related 30-sachet SKU must weigh twice the one stored 15-sachet ASTRA base weight.'
);
sku_shipping_expect(
    352,
    jg_sku_product_weight_grams(25.0, 15.0, 211),
    'Fractional calculated grams must round up so carrier weight is never understated.'
);
sku_shipping_expect(
    0,
    jg_sku_product_weight_grams(30.0, 15.0, 0),
    'A missing ASTRA weight must remain incomplete instead of using a guess.'
);

$complete = jg_sku_shipping_profile([
    'volume' => 30,
    'astra' => 15,
    'astra_weight_grams' => 210,
    'package_length_cm' => 24,
    'package_width_cm' => 16,
    'package_height_cm' => 8,
]);
sku_shipping_expect(420, $complete['unit_weight_grams'], 'Shipping profile must expose the derived unit weight.');
sku_shipping_expect(true, $complete['has_dimensions'], 'Three dimensions form a complete package size.');
sku_shipping_expect(false, $complete['dimensions_incomplete'], 'A complete package size must not be flagged incomplete.');

$partial = jg_sku_shipping_profile([
    'volume' => 15,
    'astra' => 15,
    'astra_weight_grams' => 210,
    'package_length_cm' => 24,
]);
sku_shipping_expect(true, $partial['dimensions_incomplete'], 'Partial package dimensions must be rejected by checkout readiness.');

echo "SKU shipping tests passed\n";
