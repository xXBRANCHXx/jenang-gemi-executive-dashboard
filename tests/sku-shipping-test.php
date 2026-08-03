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
$css = (string) file_get_contents(dirname(__DIR__) . '/admin.css');
$api = (string) file_get_contents(dirname(__DIR__) . '/api/sku-db/index.php');
sku_shipping_expect(
    true,
    str_contains($markup, '<input type="text" name="astra_display" readonly>')
        && str_contains($markup, 'Shipping settings never change ASTRA.')
        && str_contains($script, 'shippingForm.elements.astra_display.value = String(row.astra')
        && !str_contains($script, "shippingForm?.elements.astra?.addEventListener"),
    'Shipping Profile must display the existing ASTRA value without editing it.'
);
$shippingActionStart = strpos($api, "if (\$action === 'change_shipping_profile') {");
$nextActionStart = strpos($api, "if (\$action === 'change_skip_scan') {");
$shippingAction = $shippingActionStart !== false && $nextActionStart !== false
    ? substr($api, $shippingActionStart, $nextActionStart - $shippingActionStart)
    : '';
sku_shipping_expect(
    true,
    $shippingAction !== ''
        && !str_contains($shippingAction, 'SET astra = :astra')
        && str_contains($shippingAction, 'AND astra = :astra AND product_id = :product_id'),
    'Saving shipping data must never write ASTRA and may only share weight within an existing ASTRA group.'
);
sku_shipping_expect(
    true,
    !str_contains($api, 'repair_astra_shipping_regression_20260803')
        && !str_contains($api, 'audit_astra_shipping_regression_20260803'),
    'Temporary production repair actions must be removed after the data repair runs.'
);
sku_shipping_expect(
    true,
    str_contains($script, ": '–';")
        && !str_contains($script, 'Dimensions pending'),
    'Missing dimensions must display as a dash.'
);
sku_shipping_expect(
    true,
    str_contains($script, '<button type="button" class="admin-menu-item" data-change-astra=')
        && !str_contains($api, "if (\$action === 'change_astra') {\n        jg_sku_require_branch_json();"),
    'Every authenticated SKU Database user must be able to open and save the dedicated ASTRA editor.'
);
sku_shipping_expect(
    true,
    str_contains($script, 'aria-label="Open shipment settings for SKU')
        && str_contains($script, '<span>Settings</span>')
        && str_contains($script, 'admin-ghost-btn admin-sku-shipping-settings-btn')
        && str_contains($script, "row.shipping_profile_complete ? ' is-complete' : ''")
        && str_contains($css, '.admin-app[data-sku-db] .admin-ghost-btn.admin-sku-shipping-settings-btn')
        && str_contains($css, '.admin-ghost-btn.admin-sku-shipping-settings-btn.is-complete')
        && str_contains($css, 'min-height: 30px;')
        && !str_contains($script, "role === 'branch'\n            ? `<button type=\"button\" class=\"admin-sku-tag-copy\" data-change-shipping"),
    'The Shipping table cell must use a compact button to open the editable shipping profile directly.'
);
sku_shipping_expect(
    true,
    !str_contains($api, "if (\$action === 'change_shipping_profile') {\n        jg_sku_require_branch_json();"),
    'Every authenticated SKU Database user must be able to save shipping data.'
);

echo "SKU shipping tests passed\n";
