<?php
declare(strict_types=1);
require dirname(__DIR__) . '/zero-store-pricing.php';
require dirname(__DIR__) . '/zero-voucher-bootstrap.php';
function expect_price(mixed $expected, mixed $actual, string $reason): void {
    if ($expected !== $actual) throw new RuntimeException($reason . ': expected ' . var_export($expected,true) . ', got ' . var_export($actual,true));
}
$legacy = ['product_slug'=>'syrup','size_id'=>'250ml','site_price'=>39000,'sku_price'=>45000];
expect_price('sku', zero_store_price_source($legacy), 'Old seeded prices should follow SKU sale price');
expect_price(45000.0, zero_store_base_price($legacy), 'SKU sale price must reach storefront and order pricing');
expect_price(42000.0, zero_store_base_price(array_replace($legacy,['site_price'=>42000])), 'Preserve an existing custom website price');
expect_price(39000.0, zero_store_base_price(array_replace($legacy,['price_source'=>'website'])), 'Explicit override wins even when it equals the old default');
expect_price(51000.0, zero_store_base_price(array_replace($legacy,['price_source'=>'sku','sku_price'=>51000])), 'Future SKU edits propagate without a website save');
expect_price(39000.0, zero_store_base_price(array_replace($legacy,['sku_price'=>0])), 'Keep saved website price until SKU has a price');
expect_price(0.0, zero_store_base_price(['price_source'=>'sku','sku_price'=>0,'site_price'=>0]), 'Unpriced new SKU stays unavailable');
expect_price(40500.0, zero_store_discount_price(45000,['discount_type'=>'percent','amount'=>10]), 'Apply schedule after current base price');
expect_price(40000.0, zero_store_discount_price(45000,['discount_type'=>'fixed','amount'=>5000]), 'Fixed discount');
expect_price(0.0, zero_store_discount_price(45000,['discount_type'=>'percent','amount'=>100]), '100 percent discount remains zero');
expect_price(0.0, zero_store_discount_price(45000,['discount_type'=>'fixed','amount'=>50000]), 'Discount cannot make price negative');
expect_price(13500.45, zero_store_discount_price(15000.50,['discount_type'=>'percent','amount'=>10]), 'Catalog and orders keep the same decimal rounding');
$net=zero_store_discount_price(zero_store_base_price($legacy),['discount_type'=>'percent','amount'=>10]);
expect_price(34425.0,zero_voucher_unit_price(45000,$net,['discount_percent'=>15,'stacking_mode'=>'compound']),'Compound voucher remains after sale');
expect_price(38250.0,zero_voucher_unit_price(45000,$net,['discount_percent'=>15,'stacking_mode'=>'override']),'Override voucher still replaces sale');
echo "ZERO catalog pricing: 14 checks passed\n";
