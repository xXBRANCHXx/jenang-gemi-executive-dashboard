<?php
declare(strict_types=1);

require_once __DIR__ . '/partner-sales-bootstrap.php';

/**
 * Partner order timestamps are stored in UTC. Sales month buckets follow the
 * dashboard's Asia/Jakarta business timezone, just like marketplace sales.
 */
function jg_partner_sales_summary_month(array $order, int $year): int
{
    $raw = trim((string) ($order['order_timestamp'] ?? $order['created_at'] ?? ''));
    if ($raw === '') {
        return 0;
    }

    try {
        if (preg_match('/(?:Z|[+-]\d{2}:?\d{2})$/', $raw) !== 1) {
            $raw .= ' UTC';
        }
        $date = (new DateTimeImmutable($raw))->setTimezone(new DateTimeZone('Asia/Jakarta'));
    } catch (Throwable) {
        return 0;
    }

    return (int) $date->format('Y') === $year ? (int) $date->format('n') : 0;
}

/**
 * Convert Partner orders into the same month and product facts used by the
 * Executive sales summary. Canceled orders stay auditable in Partner Sales,
 * but are not sold units or revenue.
 *
 * @param array<int, array<string, mixed>> $orders
 * @return array{months: array<int, array{orders:int,item_count:int,revenue:float}>, products: array<int, array<string, mixed>>}
 */
function jg_partner_sales_summary_facts(array $orders, int $year): array
{
    $months = [];
    $products = [];

    foreach ($orders as $order) {
        if (!is_array($order) || jg_partner_sales_is_cancelled($order['status'] ?? '')) {
            continue;
        }
        $month = jg_partner_sales_summary_month($order, $year);
        if ($month < 1 || $month > 12) {
            continue;
        }

        $items = jg_partner_sales_decode_items($order['items_json'] ?? $order['items'] ?? []);
        if ($items === []) {
            $items[] = [
                'sku_code' => (string) ($order['sku_code'] ?? ''),
                'sku_label' => (string) ($order['sku_label'] ?? ''),
                'brand' => (string) ($order['brand_name'] ?? ''),
                'product' => (string) ($order['product_name'] ?? ''),
                'quantity' => max(0, (int) ($order['quantity'] ?? 0)),
            ];
        }

        $orderRevenue = jg_partner_sales_order_total($order + ['items' => $items]);
        $orderQuantity = array_sum(array_map(
            static fn (array $item): int => max(0, (int) ($item['quantity'] ?? 0)),
            $items
        ));
        $months[$month] ??= ['orders' => 0, 'item_count' => 0, 'revenue' => 0.0];
        $months[$month]['orders'] += 1;
        $months[$month]['item_count'] += $orderQuantity;
        $months[$month]['revenue'] += $orderRevenue;

        foreach ($items as $item) {
            $quantity = max(0, (int) ($item['quantity'] ?? 0));
            $lineRevenue = max(0.0, (float) ($item['line_revenue'] ?? 0));
            if ($lineRevenue <= 0) {
                $unitRevenue = max(0.0, (float) ($item['unit_revenue'] ?? $item['partner_price'] ?? $item['partner_unit_price'] ?? 0));
                $lineRevenue = $unitRevenue * $quantity;
            }
            if ($lineRevenue <= 0 && $orderRevenue > 0) {
                $lineRevenue = $orderQuantity > 0
                    ? $orderRevenue * ($quantity / $orderQuantity)
                    : $orderRevenue / max(1, count($items));
            }

            $products[] = [
                'month' => $month,
                'platform' => 'partner',
                'account_key' => 'partner',
                'sku' => (string) ($item['sku_code'] ?? $item['sku'] ?? $order['sku_code'] ?? ''),
                'tag' => (string) ($item['sku_code'] ?? $item['sku'] ?? $order['sku_code'] ?? ''),
                'product_name' => (string) ($item['product'] ?? $item['product_name'] ?? $item['sku_label'] ?? $order['product_name'] ?? ''),
                'base_product_name' => (string) ($item['product'] ?? $item['product_name'] ?? $order['product_name'] ?? ''),
                'brand_name' => (string) ($item['brand'] ?? $item['brand_name'] ?? $order['brand_name'] ?? 'Partner'),
                'flavor_name' => (string) ($item['flavor'] ?? $item['flavor_name'] ?? ''),
                'quantity' => $quantity,
                'item_count' => $quantity,
                'orders' => 1,
                'gross_revenue' => $lineRevenue,
                'net_revenue' => $lineRevenue,
                'revenue' => $lineRevenue,
                'marketplace_fees' => 0.0,
                'source' => 'partner_order',
            ];
        }
    }

    return ['months' => $months, 'products' => $products];
}

/** @return array<int, array<string, mixed>> */
function jg_partner_sales_summary_orders(PDO $pdo, int $year): array
{
    $businessTimezone = new DateTimeZone('Asia/Jakarta');
    $utc = new DateTimeZone('UTC');
    $start = (new DateTimeImmutable(sprintf('%04d-01-01 00:00:00', $year), $businessTimezone))
        ->setTimezone($utc)->format('Y-m-d H:i:s');
    $end = (new DateTimeImmutable(sprintf('%04d-01-01 00:00:00', $year + 1), $businessTimezone))
        ->setTimezone($utc)->format('Y-m-d H:i:s');
    $stmt = $pdo->prepare(
        'SELECT id, partner_code, customer_name, brand_name, product_name, sku_code, sku_label, quantity,
                status, order_timestamp, revenue_total, items_json, created_at
         FROM partner_orders
         WHERE COALESCE(order_timestamp, created_at) >= :start_at
           AND COALESCE(order_timestamp, created_at) < :end_at
         ORDER BY COALESCE(order_timestamp, created_at), id'
    );
    $stmt->execute([':start_at' => $start, ':end_at' => $end]);
    return array_values(array_filter($stmt->fetchAll(), 'is_array'));
}
