<?php
declare(strict_types=1);

function assert_sku_po_scope(bool $condition, string $message): void
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

assert_sku_po_scope(
    substr_count($markup, 'name="po_number"') === 1,
    'The SKU DB must expose PO only on the inventory form.'
);
assert_sku_po_scope(
    !str_contains($markup, 'PO reference') && !str_contains($markup, 'Opening PO Number') && !str_contains($markup, '<span>PO</span>'),
    'COGS and SKU builder forms must not display PO fields.'
);
assert_sku_po_scope(
    substr_count($script, "formData.get('po_number')") === 1
        && !str_contains($script, "applyData.get('po_number')"),
    'Only inventory changes may submit PO from the SKU DB interface.'
);
assert_sku_po_scope(
    !str_contains($api, 'PO note') && !str_contains($api, 'Opening stock | PO'),
    'COGS and opening SKU history must not record PO notes.'
);

fwrite(STDOUT, "SKU PO scope tests passed.\n");
