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

$markup = (string) file_get_contents(dirname(__DIR__) . '/sku-db/index.php');
$script = (string) file_get_contents(dirname(__DIR__) . '/sku-db.js');
$api = (string) file_get_contents(dirname(__DIR__) . '/api/sku-db/index.php');
sku_shipping_expect(
    true,
    str_contains($markup, '<span>Base volume (ASTRA)</span>')
        && str_contains($markup, 'name="astra" min="0.01" step="0.01" required'),
    'Shipping Profile must let the operator enter the ASTRA base volume.'
);
sku_shipping_expect(
    true,
    str_contains($script, "astra: formData.get('astra')")
        && str_contains($api, 'SET astra = :astra,'),
    'The entered base volume must be submitted and persisted across the SKU family.'
);
sku_shipping_expect(
    true,
    str_contains($script, 'aria-label="Open shipment settings for SKU')
        && str_contains($script, '<span>Settings</span>')
        && !str_contains($script, "role === 'branch'\n            ? `<button type=\"button\" class=\"admin-sku-tag-copy\" data-change-shipping"),
    'The Shipping table cell must open the editable shipping profile directly.'
);
sku_shipping_expect(
    true,
    !str_contains($api, "if (\$action === 'change_shipping_profile') {\n        jg_sku_require_branch_json();"),
    'Every authenticated SKU Database user must be able to save shipping data.'
);

echo "SKU shipping tests passed\n";
