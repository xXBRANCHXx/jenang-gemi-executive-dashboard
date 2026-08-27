<?php
declare(strict_types=1);

define('JG_ORDERS_API_NO_DISPATCH', true);
require dirname(__DIR__) . '/api/orders/index.php';

final class ProductBreakdownCatalogStatement extends PDOStatement
{
    public function fetchAll(int $mode = PDO::FETCH_DEFAULT, mixed ...$args): array
    {
        return [
            ['sku' => 'SYR-VAN-550', 'tag' => 'ZERO SYRUP VANILLA', 'volume' => 550, 'brand_name' => 'ZERO', 'unit_name' => 'ml', 'product_name' => 'Syrup', 'flavor_name' => 'Vanilla'],
            ['sku' => 'SYR-MIN-550', 'tag' => 'ZERO SYRUP MINT', 'volume' => 550, 'brand_name' => 'ZERO', 'unit_name' => 'ml', 'product_name' => 'Syrup', 'flavor_name' => 'Mint'],
            ['sku' => 'SYR-VAN-250', 'tag' => 'ZERO SYRUP VANILLA SMALL', 'volume' => 250, 'brand_name' => 'ZERO', 'unit_name' => 'ml', 'product_name' => 'Syrup', 'flavor_name' => 'Vanilla'],
            ['sku' => 'DROP-VAN-10', 'tag' => 'ZERO DROPS VANILLA', 'volume' => 10, 'brand_name' => 'ZERO', 'unit_name' => 'ml', 'product_name' => 'Drops', 'flavor_name' => 'Vanilla'],
        ];
    }
}

final class ProductBreakdownCatalogPdo extends PDO
{
    public function __construct()
    {
    }

    public function query(string $query, ?int $fetchMode = null, mixed ...$fetchModeArgs): PDOStatement|false
    {
        return new ProductBreakdownCatalogStatement();
    }
}

function catalog_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        fwrite(STDERR, $message . PHP_EOL);
        fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
        fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
        exit(1);
    }
}

$payload = jg_orders_product_breakdown_catalog_payload(new ProductBreakdownCatalogPdo());
catalog_expect(true, $payload['ok'], 'The product breakdown catalog must report a successful response.');
catalog_expect(2, $payload['totals']['products'], 'Products must be grouped by their canonical product name.');
catalog_expect(3, $payload['totals']['flavors'], 'Flavor counts must remain scoped to their product family.');
catalog_expect(3, $payload['totals']['sizes'], 'Size counts must remain scoped to their product family.');
catalog_expect(4, $payload['totals']['variants'], 'Every SKU variant must remain searchable.');

$drops = $payload['products'][0];
$syrup = $payload['products'][1];
catalog_expect('drops', $drops['key'], 'Product names must use the same slug as analytics.');
catalog_expect('syrup', $syrup['key'], 'Product names must use the same slug as analytics.');
catalog_expect('250-ml', $syrup['volumes'][0]['key'], 'Sizes must use the analytics volume key.');
catalog_expect('250 ML', $syrup['volumes'][0]['label'], 'Sizes must expose a readable label.');
catalog_expect('vanilla', $syrup['flavors'][1]['key'], 'Flavors must use the analytics flavor key.');

echo "product-breakdown-catalog-api-test: ok\n";
