<?php
declare(strict_types=1);

function inventory_transaction_expect(bool $condition, string $message): void
{
    if ($condition) {
        return;
    }

    fwrite(STDERR, $message . PHP_EOL);
    exit(1);
}

$api = (string) file_get_contents(dirname(__DIR__) . '/api/sku-db/index.php');
$actionStart = strpos($api, "if (\$action === 'change_inventory')");
$actionEnd = strpos($api, "if (\$action === 'delete_sku')", $actionStart ?: 0);
inventory_transaction_expect($actionStart !== false && $actionEnd !== false, 'The inventory action must be present.');

$inventoryAction = substr($api, (int) $actionStart, (int) $actionEnd - (int) $actionStart);
$schemaPosition = strpos($inventoryAction, 'jg_sku_inventory_ensure_lot_schema($pdo);');
$transactionPosition = strpos($inventoryAction, '$pdo->beginTransaction();');
$commitPosition = strpos($inventoryAction, '$pdo->commit();');

inventory_transaction_expect($schemaPosition !== false, 'The inventory action must ensure its FIFO schema.');
inventory_transaction_expect($transactionPosition !== false && $commitPosition !== false, 'The inventory action must remain transactional.');
inventory_transaction_expect(
    $schemaPosition < $transactionPosition,
    'FIFO schema DDL must run before the MySQL inventory transaction begins.'
);
inventory_transaction_expect(
    substr_count(substr($inventoryAction, $transactionPosition, $commitPosition - $transactionPosition), 'jg_sku_inventory_ensure_lot_schema') === 0,
    'The inventory transaction must not execute schema DDL that implicitly commits MySQL.'
);

$helperStart = strpos($api, 'function jg_sku_inventory_adjust_lots_to_total');
$helperEnd = strpos($api, 'function jg_sku_next_code', $helperStart ?: 0);
inventory_transaction_expect($helperStart !== false && $helperEnd !== false, 'The FIFO adjustment helper must be present.');
$helper = substr($api, (int) $helperStart, (int) $helperEnd - (int) $helperStart);
inventory_transaction_expect(
    !str_contains($helper, 'jg_sku_inventory_ensure_lot_schema'),
    'The FIFO adjustment helper must not run DDL inside its caller transaction.'
);

fwrite(STDOUT, "sku-inventory-transaction-test: ok\n");
