<?php
declare(strict_types=1);

function jg_partner_discount_enabled(array $partner): bool
{
    return filter_var($partner['discount_enabled'] ?? false, FILTER_VALIDATE_BOOLEAN);
}

function jg_partner_discount_percent(array $partner): float
{
    $value = $partner['discount_percent'] ?? 0;
    if (is_string($value)) {
        $value = preg_replace('/[^0-9.\-]/', '', $value) ?? '0';
    }

    return is_numeric($value) ? min(100.0, max(0.0, round((float) $value, 2))) : 0.0;
}

function jg_partner_effective_sku_price(array $partner, array $sku, array $pricing = []): float
{
    $skuCode = trim((string) ($sku['sku'] ?? ''));
    $customPrice = max(0.0, (float) ($pricing[$skuCode] ?? 0));
    if (!jg_partner_discount_enabled($partner)) {
        return round($customPrice, 2);
    }

    $listPrice = max(0.0, (float) ($sku['sale_price'] ?? 0));
    $multiplier = 1 - (jg_partner_discount_percent($partner) / 100);
    return max(0.0, round($listPrice * $multiplier, 2));
}
