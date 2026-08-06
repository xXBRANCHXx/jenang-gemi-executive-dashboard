<?php
declare(strict_types=1);

function inventory_subtract_expect(bool $condition, string $message): void
{
    if ($condition) {
        return;
    }

    fwrite(STDERR, $message . PHP_EOL);
    exit(1);
}

$root = dirname(__DIR__);
$markup = (string) file_get_contents($root . '/sku-db/index.php');
$script = (string) file_get_contents($root . '/sku-db.js');
$api = (string) file_get_contents($root . '/api/sku-db/index.php');

inventory_subtract_expect(
    str_contains($markup, '<option value="subtract_stock">Subtract base stock</option>')
        && str_contains($markup, 'name="quantity_to_subtract"'),
    'The inventory form must expose a subtract-stock quantity.'
);
inventory_subtract_expect(
    str_contains($script, "mode === 'subtract_stock'")
        && str_contains($script, "quantity_to_subtract: formData.get('quantity_to_subtract')"),
    'The inventory UI must display and submit subtract-stock changes.'
);
inventory_subtract_expect(
    str_contains($api, "['set_total', 'add_stock', 'subtract_stock']")
        && str_contains($api, 'current_stock = current_stock - :quantity_to_subtract')
        && str_contains($api, 'current_stock >= :available_quantity'),
    'The API must subtract atomically without allowing negative stock.'
);
inventory_subtract_expect(
    str_contains($api, "jg_sku_inventory_adjust_lots_to_total(\$pdo, \$stockSku, \$baseNewStock")
        && str_contains($api, 'Inventory subtract | Base Qty %d%s'),
    'Subtracting inventory must reconcile FIFO lots and create an audit record.'
);

fwrite(STDOUT, "SKU inventory subtract tests passed.\n");
