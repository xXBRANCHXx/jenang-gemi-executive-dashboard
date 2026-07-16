<?php
declare(strict_types=1);

require dirname(__DIR__) . '/partner-auth-catalog.php';

function partner_auth_catalog_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected === $actual) return;
    fwrite(STDERR, $message . PHP_EOL);
    fwrite(STDERR, 'Expected: ' . var_export($expected, true) . PHP_EOL);
    fwrite(STDERR, 'Actual: ' . var_export($actual, true) . PHP_EOL);
    exit(1);
}

$record = jg_partner_auth_catalog_record([
    'sku' => 'JG-001',
    'tag' => 'JENANG_ORIGINAL',
    'brand_id' => 'brand-1',
    'brand_name' => 'Jenang Gemi',
    'brand_code' => 'JG',
    'product_id' => 'product-1',
    'product_name' => 'Jenang',
    'product_code' => 'JN',
    'flavor_name' => 'Original',
    'unit_name' => 'g',
    'volume' => 200,
    'astra_value' => 100,
    'current_stock' => 12,
], [
    'JG-001' => 15000,
]);

partner_auth_catalog_expect('JG-001', $record['sku'], 'Approved SKU code should be preserved.');
partner_auth_catalog_expect(2.0, $record['unit_count'], 'Approved SKU ASTRA unit count should be calculated.');
partner_auth_catalog_expect(15000.0, $record['partner_price'], 'Approved SKU partner price should remain the configured SKU-level price.');
partner_auth_catalog_expect(15000.0, $record['partner_unit_price'], 'Approved SKU unit price should remain the configured SKU-level price.');
partner_auth_catalog_expect('Jenang · Original · 200.0 g', $record['label'], 'Approved SKU label should contain product details.');
partner_auth_catalog_expect(12, $record['current_stock'], 'Approved SKU stock should be preserved.');

echo "partner-auth-catalog-test: ok\n";
