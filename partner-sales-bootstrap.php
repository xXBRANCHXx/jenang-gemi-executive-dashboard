<?php
declare(strict_types=1);

require_once __DIR__ . '/partner-db-bootstrap.php';

function jg_partner_sales_table_exists(PDO $pdo, string $tableName): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table_name'
    );
    $stmt->execute([':table_name' => $tableName]);
    return (int) $stmt->fetchColumn() > 0;
}
function jg_partner_sales_ensure_schema(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS partner_order_payments (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            partner_code VARCHAR(64) NOT NULL,
            order_id VARCHAR(64) NOT NULL,
            amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
            payment_date DATE NOT NULL,
            payment_method VARCHAR(80) NOT NULL DEFAULT "",
            reference_no VARCHAR(120) NOT NULL DEFAULT "",
            notes VARCHAR(300) NOT NULL DEFAULT "",
            created_at DATETIME NOT NULL,
            voided_at DATETIME NULL DEFAULT NULL,
            void_reason VARCHAR(300) NOT NULL DEFAULT "",
            KEY idx_partner_order_payments_partner_date (partner_code, payment_date),
            KEY idx_partner_order_payments_order (partner_code, order_id),
            KEY idx_partner_order_payments_voided (voided_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function jg_partner_sales_is_cancelled(mixed $status): bool
{
    return in_array(strtoupper(trim((string) $status)), ['CANCELLED', 'CANCELED', 'VOID', 'VOIDED'], true);
}

function jg_partner_sales_decode_items(mixed $value): array
{
    $items = is_array($value) ? $value : json_decode((string) $value, true);
    return is_array($items) ? array_values(array_filter($items, 'is_array')) : [];
}

/** @return array{items:list<array<string,mixed>>,total:float} */
function jg_partner_sales_apply_item_prices(array $items, array $adjustments): array
{
    $adjustmentByIndex = [];
    foreach ($adjustments as $adjustment) {
        if (!is_array($adjustment)) continue;
        $index = filter_var($adjustment['line_index'] ?? null, FILTER_VALIDATE_INT);
        if ($index === false || $index < 0 || $index > 999) continue;
        $adjustmentByIndex[$index] = $adjustment;
    }
    if ($items === []) throw new InvalidArgumentException('This order has no editable products.');

    $updated = [];
    $total = 0.0;
    foreach (array_values($items) as $index => $item) {
        $adjustment = $adjustmentByIndex[$index] ?? null;
        if (!is_array($adjustment) || !is_numeric($adjustment['unit_price'] ?? null)) {
            throw new InvalidArgumentException('Enter a valid price for every product.');
        }
        $unitPrice = round((float) $adjustment['unit_price'], 2);
        if ($unitPrice < 0 || $unitPrice > 1000000000000) {
            throw new InvalidArgumentException('Each product price must be between Rp 0 and Rp 1,000,000,000,000.');
        }
        $quantity = max(1, (int) ($item['quantity'] ?? 1));
        $lineTotal = round($unitPrice * $quantity, 2);
        $item['unit_revenue'] = $unitPrice;
        $item['partner_unit_price'] = $unitPrice;
        $item['partner_price'] = $unitPrice;
        $item['line_revenue'] = $lineTotal;
        $updated[] = $item;
        $total += $lineTotal;
    }
    return ['items' => $updated, 'total' => round($total, 2)];
}

function jg_partner_sales_update_order_prices(PDO $pdo, string $partnerCode, string $orderId, array $adjustments): array
{
    if ($adjustments === []) throw new InvalidArgumentException('Submit at least one product price.');
    $hasBillItems = jg_partner_sales_table_exists($pdo, 'partner_weekly_bill_items')
        && jg_partner_sales_table_exists($pdo, 'partner_weekly_bills');
    $billId = '';

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            'SELECT id, partner_code, product_name, sku_code, sku_label, quantity, status,
                    revenue_total, items_json FROM partner_orders
             WHERE id = :order_id AND partner_code = :partner_code LIMIT 1 FOR UPDATE'
        );
        $stmt->execute([':order_id' => $orderId, ':partner_code' => $partnerCode]);
        $order = $stmt->fetch();
        if (!is_array($order)) throw new InvalidArgumentException('Order not found for this partner.');
        if (jg_partner_sales_is_cancelled($order['status'] ?? '')) throw new InvalidArgumentException('Cancelled order prices cannot be changed.');

        $items = jg_partner_sales_decode_items($order['items_json'] ?? '');
        if ($items === []) {
            $quantity = max(1, (int) ($order['quantity'] ?? 1));
            $items = [[
                'sku_code' => (string) ($order['sku_code'] ?? ''),
                'sku_label' => (string) ($order['sku_label'] ?? ''),
                'product' => (string) ($order['product_name'] ?? ''),
                'quantity' => $quantity,
                'unit_revenue' => ((float) ($order['revenue_total'] ?? 0)) / $quantity,
            ]];
        }
        $updated = jg_partner_sales_apply_item_prices($items, $adjustments);

        $billItem = null;
        if ($hasBillItems) {
            $billStmt = $pdo->prepare(
                'SELECT i.id, i.bill_id, i.status AS item_status, i.snapshot_json, b.status AS bill_status
                 FROM partner_weekly_bill_items i
                 JOIN partner_weekly_bills b ON b.bill_id = i.bill_id
                 WHERE i.order_id = :order_id AND i.partner_code = :partner_code LIMIT 1 FOR UPDATE'
            );
            $billStmt->execute([':order_id' => $orderId, ':partner_code' => $partnerCode]);
            $billItem = $billStmt->fetch();
            if (is_array($billItem)) {
                $billId = (string) $billItem['bill_id'];
                if (in_array((string) $billItem['item_status'], ['paid', 'removed', 'disputed'], true)
                    || in_array((string) $billItem['bill_status'], ['paid', 'payment_submitted', 'disputed'], true)) {
                    throw new InvalidArgumentException('Resolve the current payment or dispute before changing this order price.');
                }
            }
        }

        $updateOrder = $pdo->prepare(
            'UPDATE partner_orders SET revenue_total = :revenue_total, items_json = :items_json,
                    updated_at = UTC_TIMESTAMP() WHERE id = :order_id AND partner_code = :partner_code'
        );
        $encodedItems = json_encode($updated['items'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        $updateOrder->execute([
            ':revenue_total' => number_format($updated['total'], 2, '.', ''),
            ':items_json' => $encodedItems,
            ':order_id' => $orderId,
            ':partner_code' => $partnerCode,
        ]);

        if (is_array($billItem)) {
            $snapshot = json_decode((string) ($billItem['snapshot_json'] ?? ''), true);
            $snapshot = is_array($snapshot) ? $snapshot : [];
            $snapshot['items'] = $updated['items'];
            $snapshot['price_adjusted_at'] = gmdate(DATE_ATOM);
            $updateBillItem = $pdo->prepare(
                'UPDATE partner_weekly_bill_items SET amount = :amount, snapshot_json = :snapshot_json,
                        updated_at = UTC_TIMESTAMP() WHERE id = :id'
            );
            $updateBillItem->execute([
                ':amount' => (int) round($updated['total']),
                ':snapshot_json' => json_encode($snapshot, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                ':id' => (int) $billItem['id'],
            ]);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }

    if ($billId !== '' && function_exists('jg_admin_partner_billing_recalculate')) {
        jg_admin_partner_billing_recalculate($pdo, $billId);
    }
    return ['ok' => true, 'order_id' => $orderId, 'order_total' => $updated['total'], 'bill_id' => $billId];
}

function jg_partner_sales_order_total(array $order): float
{
    $stored = max(0.0, (float) ($order['revenue_total'] ?? 0));
    if ($stored > 0) {
        return $stored;
    }

    return array_reduce(jg_partner_sales_decode_items($order['items'] ?? $order['items_json'] ?? []), static function (float $sum, array $item): float {
        $quantity = max(0, (int) ($item['quantity'] ?? 0));
        $lineTotal = (float) ($item['line_revenue'] ?? 0);
        if ($lineTotal <= 0) {
            $lineTotal = (float) ($item['unit_revenue'] ?? $item['partner_price'] ?? $item['partner_unit_price'] ?? 0) * $quantity;
        }
        return $sum + max(0.0, $lineTotal);
    }, 0.0);
}

function jg_partner_sales_order_units(array $order): int
{
    $items = jg_partner_sales_decode_items($order['items'] ?? $order['items_json'] ?? []);
    if ($items === []) {
        return max(0, (int) ($order['quantity'] ?? 0));
    }
    return array_sum(array_map(static fn (array $item): int => max(0, (int) ($item['quantity'] ?? 0)), $items));
}

function jg_partner_sales_payment_status(float $total, float $paid, bool $cancelled): string
{
    if ($cancelled) {
        return 'cancelled';
    }
    if ($total <= 0 || $paid >= $total - 0.005) {
        return 'paid';
    }
    if ($paid > 0) {
        return 'partial';
    }
    return 'unpaid';
}

function jg_partner_sales_normalize_order(array $row, array $payments): array
{
    $items = jg_partner_sales_decode_items($row['items_json'] ?? $row['items'] ?? []);
    if ($items === []) {
        $items[] = [
            'sku_code' => (string) ($row['sku_code'] ?? ''),
            'sku_label' => (string) ($row['sku_label'] ?? ''),
            'brand' => (string) ($row['brand_name'] ?? $row['brand'] ?? ''),
            'product' => (string) ($row['product_name'] ?? $row['product'] ?? ''),
            'quantity' => max(0, (int) ($row['quantity'] ?? 0)),
        ];
    }

    $total = jg_partner_sales_order_total($row + ['items' => $items]);
    $paid = array_reduce($payments, static fn (float $sum, array $payment): float => $sum + max(0.0, (float) ($payment['amount'] ?? 0)), 0.0);
    $cancelled = jg_partner_sales_is_cancelled($row['status'] ?? '');
    $effectiveTotal = $cancelled ? 0.0 : $total;

    return [
        'id' => (string) ($row['id'] ?? ''),
        'partner_code' => (string) ($row['partner_code'] ?? ''),
        'customer_name' => (string) ($row['customer_name'] ?? ''),
        'status' => (string) ($row['status'] ?? ''),
        'order_timestamp' => (string) ($row['order_timestamp'] ?? $row['created_at'] ?? ''),
        'created_at' => (string) ($row['created_at'] ?? ''),
        'updated_at' => (string) ($row['updated_at'] ?? ''),
        'marketplace_platform' => (string) ($row['marketplace_platform'] ?? ''),
        'notes' => (string) ($row['notes'] ?? ''),
        'items' => $items,
        'units' => jg_partner_sales_order_units(['items' => $items]),
        'order_total' => round($effectiveTotal, 2),
        'original_total' => round($total, 2),
        'paid_amount' => round($paid, 2),
        'outstanding_amount' => round(max(0.0, $effectiveTotal - $paid), 2),
        'payment_status' => jg_partner_sales_payment_status($effectiveTotal, $paid, $cancelled),
        'payments' => array_values($payments),
    ];
}

function jg_partner_sales_summary(array $orders): array
{
    $active = array_values(array_filter($orders, static fn (array $order): bool => ($order['payment_status'] ?? '') !== 'cancelled'));
    $total = array_sum(array_column($active, 'order_total'));
    $paid = array_sum(array_column($active, 'paid_amount'));
    $outstanding = array_sum(array_column($active, 'outstanding_amount'));
    $units = array_sum(array_column($active, 'units'));
    $statuses = ['paid' => 0, 'partial' => 0, 'unpaid' => 0, 'cancelled' => 0];
    foreach ($orders as $order) {
        $status = (string) ($order['payment_status'] ?? 'unpaid');
        if (array_key_exists($status, $statuses)) {
            $statuses[$status]++;
        }
    }

    return [
        'order_count' => count($active),
        'cancelled_count' => $statuses['cancelled'],
        'units' => $units,
        'order_value' => round($total, 2),
        'paid_amount' => round($paid, 2),
        'outstanding_amount' => round($outstanding, 2),
        'collection_rate' => $total > 0 ? round(min(100, ($paid / $total) * 100), 1) : 0,
        'average_order_value' => count($active) > 0 ? round($total / count($active), 2) : 0,
        'payment_statuses' => $statuses,
    ];
}

function jg_partner_sales_text(mixed $value, int $length): string
{
    $text = trim(preg_replace('/\s+/', ' ', (string) $value) ?? '');
    return mb_substr($text, 0, $length);
}
