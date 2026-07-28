<?php
declare(strict_types=1);

function assert_sku_admin_permission(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, $message . PHP_EOL);
        exit(1);
    }
}

$root = dirname(__DIR__);
$markup = (string) file_get_contents($root . '/sku-db/index.php');
$script = (string) file_get_contents($root . '/sku-db.js');
$api = (string) file_get_contents($root . '/api/sku-db/index.php');
$bootstrap = (string) file_get_contents($root . '/sku-db-bootstrap.php');

assert_sku_admin_permission(
    str_contains($markup, 'data-setup-form') && !str_contains($markup, 'data-request-form'),
    'Every authenticated SKU Admin must receive the direct SKU builder.'
);
assert_sku_admin_permission(
    str_contains($api, "if (\$action === 'create_sku') {")
        && !preg_match("/if \(\$action === 'create_sku'\) \{\s*jg_sku_require_branch_json\(\);/", $api),
    'Direct SKU creation must require authentication without requiring Branch.'
);
assert_sku_admin_permission(
    str_contains($script, "role === 'branch' ? `add_\${type}` : 'submit_mapping_request'")
        && str_contains($api, "if (\$action === 'submit_mapping_request') {")
        && str_contains($bootstrap, 'CREATE TABLE IF NOT EXISTS sku_mapping_requests'),
    'Admin mapping changes must enter the dedicated mapping approval queue.'
);
$mappingActionOffset = strpos($api, "if (in_array(\$action, ['add_brand', 'add_unit', 'add_flavor', 'add_product'], true)) {");
assert_sku_admin_permission(
    $mappingActionOffset !== false
        && str_contains(substr($api, $mappingActionOffset, 240), 'jg_sku_require_branch_json();'),
    'Only Branch may directly create mappings.'
);
assert_sku_admin_permission(
    str_contains($api, 'SKU approval requests are no longer required. Build and push the SKU directly.'),
    'The legacy whole-SKU request submission path must be retired.'
);

fwrite(STDOUT, "SKU Admin permission tests passed.\n");
