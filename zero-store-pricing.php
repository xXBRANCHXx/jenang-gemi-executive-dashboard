<?php
declare(strict_types=1);

// The catalog, voucher preview and order writer must charge the same prices.
function zero_store_price_source(array $item): string
{
    $source = (string) ($item['price_source'] ?? 'legacy');
    if (in_array($source, ['sku', 'website'], true)) return $source;

    // Preserve old custom website prices; seeded prices follow the SKU DB.
    $defaults = [
        'syrup' => ['50ml' => 10000, '250ml' => 39000, '550ml' => 69000],
        'drops' => ['5ml' => 20000, '10ml' => 30000, '30ml' => 49000],
        'maple-topping' => ['550ml' => 149000],
        'fiber-syrup' => ['250ml' => 129000],
        'acvs' => ['100ml' => 29500, '250ml' => 49500],
    ];
    $original = $defaults[$item['product_slug'] ?? ''][$item['size_id'] ?? ''] ?? null;
    $stored = (float) ($item['site_price'] ?? 0);
    return $stored > 0 && ($original === null || abs($stored - $original) > 0.01) ? 'website' : 'sku';
}

function zero_store_base_price(array $item): float
{
    $skuPrice = (float) ($item['sku_price'] ?? 0);
    return round(max(0, zero_store_price_source($item) === 'sku' && $skuPrice > 0
        ? $skuPrice : (float) ($item['site_price'] ?? 0)), 2);
}

function zero_store_discount_price(float $price, ?array $discount): float
{
    if (!$discount) return $price;
    $amount = max(0, (float) ($discount['amount'] ?? 0));
    return round(max(0, ($discount['discount_type'] ?? '') === 'percent'
        ? $price * (1 - min(100, $amount) / 100) : $price - $amount), 2);
}

function zero_store_catalog_columns(PDO $pdo): void
{
    jg_sku_ensure_column($pdo, 'zero_store_items', 'price_source', 'VARCHAR(16) NOT NULL DEFAULT "legacy"');
    jg_sku_ensure_column($pdo, 'zero_store_items', 'image_url', 'VARCHAR(1000) NOT NULL DEFAULT ""');
    jg_sku_ensure_column($pdo, 'zero_store_items', 'option_group', 'VARCHAR(100) NOT NULL DEFAULT ""');
}
