<?php
declare(strict_types=1);

require dirname(__DIR__) . '/sku-shopee-price-sync.php';

function shopee_price_expect(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        fwrite(STDERR, $message . "\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true) . "\n");
        exit(1);
    }
}

$skuRows = [
    [
        'sku' => 'JG0001',
        'tag' => 'BUBUR_ORIG',
        'sale_price' => '0.00',
        'product_name' => 'Bubur Original',
        'brand_name' => 'Jenang Gemi',
        'flavor_name' => 'Original',
    ],
    [
        'sku' => 'ZG0001',
        'tag' => 'ZSYRUP_PLAIN_50ML',
        'sale_price' => '0.00',
        'product_name' => 'ZERO Syrup Plain',
        'brand_name' => 'ZERO',
        'flavor_name' => 'Plain',
    ],
    [
        'sku' => 'NO0001',
        'tag' => 'NO_MATCH',
        'sale_price' => '0.00',
        'product_name' => 'No Match',
        'brand_name' => 'Test',
        'flavor_name' => 'Test',
    ],
    [
        'sku' => 'TRAP0001',
        'tag' => 'ROOT_TRAP',
        'sale_price' => '0.00',
        'product_name' => 'Root Trap',
        'brand_name' => 'Test',
        'flavor_name' => 'Test',
    ],
];

$orderRows = [
    [
        'order_id' => 'ORDER-1',
        'order_create_time' => '2026-07-07 01:02:03',
        'raw_json' => json_encode([
            'item_list' => [
                [
                    'model_sku' => 'OTHER_TAG',
                    'model_discounted_price' => 9999,
                ],
                [
                    'model_sku' => 'BUBUR_ORIG',
                    'model_discounted_price' => 12000,
                    'model_original_price' => 15000,
                ],
            ],
        ], JSON_UNESCAPED_SLASHES),
    ],
    [
        'order_id' => 'ORDER-2',
        'order_create_time' => '2026-07-07 02:02:03',
        'sku' => 'ZSYRUP PLAIN 50ML',
        'quantity' => 2,
        'gross_revenue' => 22000,
        'raw_json' => '{}',
    ],
    [
        'order_id' => 'ORDER-3',
        'order_create_time' => '2026-07-07 03:02:03',
        'raw_json' => json_encode([
            'order_income' => [
                'order_discounted_price' => 999999,
                'items' => [
                    [
                        'model_sku' => 'ROOT_TRAP',
                        'discounted_price' => 13000,
                    ],
                ],
            ],
        ], JSON_UNESCAPED_SLASHES),
    ],
];

$suggestions = jg_sku_shopee_price_suggestions_from_rows($skuRows, $orderRows);
$bySku = [];
foreach ($suggestions as $row) {
    $bySku[$row['sku']] = $row;
}

shopee_price_expect('12000.00', $bySku['JG0001']['suggested_sale_price'] ?? '', 'Explicit Shopee model discounted price should be selected.');
shopee_price_expect('item_list.1.model_discounted_price', $bySku['JG0001']['source_path'] ?? '', 'Explicit Shopee price path should be reported.');
shopee_price_expect('high', $bySku['JG0001']['confidence'] ?? '', 'Explicit model price should be high confidence.');
shopee_price_expect(1, $bySku['JG0001']['observation_count'] ?? 0, 'Only the matched Shopee item should count as evidence.');
shopee_price_expect('11000.00', $bySku['ZG0001']['suggested_sale_price'] ?? '', 'Gross revenue fallback must be divided by quantity.');
shopee_price_expect('gross_revenue / quantity', $bySku['ZG0001']['source_path'] ?? '', 'Gross fallback source should be explicit.');
shopee_price_expect('13000.00', $bySku['TRAP0001']['suggested_sale_price'] ?? '', 'Item-level price should beat order-level Shopee income fields.');
shopee_price_expect('order_income.items.0.discounted_price', $bySku['TRAP0001']['source_path'] ?? '', 'Order-level Shopee price fields must not attach to nested item TAGs.');
shopee_price_expect(false, isset($bySku['NO0001']), 'Unmatched SKU TAG should not produce a suggestion.');

echo "sku-shopee-price-sync-test: ok\n";
