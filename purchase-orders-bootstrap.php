<?php
declare(strict_types=1);

function jg_purchase_orders_driver(PDO $pdo): string
{
    return strtolower((string) $pdo->getAttribute(PDO::ATTR_DRIVER_NAME));
}

function jg_purchase_orders_now(): string
{
    return gmdate('Y-m-d H:i:s');
}

function jg_purchase_orders_ensure_schema(PDO $pdo): void
{
    if (jg_purchase_orders_driver($pdo) === 'sqlite') {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS purchase_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                po_number TEXT NOT NULL UNIQUE,
                request_key TEXT NULL UNIQUE,
                status TEXT NOT NULL DEFAULT "pending",
                note TEXT NOT NULL DEFAULT "",
                line_count INTEGER NOT NULL DEFAULT 0,
                ordered_qty INTEGER NOT NULL DEFAULT 0,
                received_qty INTEGER NOT NULL DEFAULT 0,
                estimated_total NUMERIC NOT NULL DEFAULT 0,
                placed_by TEXT NOT NULL DEFAULT "Executive",
                placed_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                completed_at TEXT NULL
            )'
        );
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS purchase_order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                purchase_order_id INTEGER NOT NULL,
                sku TEXT NOT NULL,
                product_name TEXT NOT NULL,
                moq INTEGER NOT NULL DEFAULT 1,
                ordered_qty INTEGER NOT NULL,
                received_qty INTEGER NOT NULL DEFAULT 0,
                unit_cost NUMERIC NOT NULL DEFAULT 0,
                line_note TEXT NOT NULL DEFAULT "",
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE (purchase_order_id, sku),
                FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
            )'
        );
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS purchase_order_receipts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                purchase_order_id INTEGER NOT NULL,
                purchase_order_item_id INTEGER NOT NULL,
                sku TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                received_by TEXT NOT NULL,
                received_at TEXT NOT NULL,
                FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
                FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(id)
            )'
        );
        $columns = array_map(static fn (array $row): string => (string) ($row['name'] ?? ''), $pdo->query('PRAGMA table_info(purchase_orders)')->fetchAll());
        if (!in_array('tag', $columns, true)) $pdo->exec('ALTER TABLE purchase_orders ADD COLUMN tag TEXT NOT NULL DEFAULT ""');
        if (!in_array('confirmed_at', $columns, true)) $pdo->exec('ALTER TABLE purchase_orders ADD COLUMN confirmed_at TEXT NULL');
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS purchase_order_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                purchase_order_id INTEGER NOT NULL,
                request_key TEXT NOT NULL UNIQUE,
                accounting_transaction_id INTEGER NOT NULL,
                account_id INTEGER NOT NULL,
                account_name TEXT NOT NULL,
                amount NUMERIC NOT NULL,
                payment_mode TEXT NOT NULL DEFAULT "amount",
                item_ids_json TEXT NOT NULL DEFAULT "[]",
                paid_by TEXT NOT NULL DEFAULT "Executive",
                paid_at TEXT NOT NULL,
                FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
            )'
        );
        return;
    }

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS purchase_orders (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            po_number VARCHAR(64) NOT NULL,
            request_key VARCHAR(80) NULL,
            status VARCHAR(24) NOT NULL DEFAULT "pending",
            note TEXT NOT NULL,
            line_count INT UNSIGNED NOT NULL DEFAULT 0,
            ordered_qty INT UNSIGNED NOT NULL DEFAULT 0,
            received_qty INT UNSIGNED NOT NULL DEFAULT 0,
            estimated_total DECIMAL(14,2) NOT NULL DEFAULT 0.00,
            placed_by VARCHAR(80) NOT NULL DEFAULT "Executive",
            placed_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            completed_at DATETIME NULL,
            UNIQUE KEY uq_purchase_orders_number (po_number),
            UNIQUE KEY uq_purchase_orders_request (request_key),
            KEY idx_purchase_orders_status_placed (status, placed_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS purchase_order_items (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            purchase_order_id BIGINT UNSIGNED NOT NULL,
            sku VARCHAR(32) NOT NULL,
            product_name VARCHAR(255) NOT NULL,
            moq INT UNSIGNED NOT NULL DEFAULT 1,
            ordered_qty INT UNSIGNED NOT NULL,
            received_qty INT UNSIGNED NOT NULL DEFAULT 0,
            unit_cost DECIMAL(14,2) NOT NULL DEFAULT 0.00,
            line_note VARCHAR(500) NOT NULL DEFAULT "",
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            UNIQUE KEY uq_purchase_order_item_sku (purchase_order_id, sku),
            KEY idx_purchase_order_items_sku (sku),
            CONSTRAINT fk_purchase_order_items_order
                FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS purchase_order_receipts (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            purchase_order_id BIGINT UNSIGNED NOT NULL,
            purchase_order_item_id BIGINT UNSIGNED NOT NULL,
            sku VARCHAR(32) NOT NULL,
            quantity INT UNSIGNED NOT NULL,
            received_by VARCHAR(80) NOT NULL,
            received_at DATETIME NOT NULL,
            KEY idx_purchase_order_receipts_order (purchase_order_id, received_at),
            CONSTRAINT fk_purchase_order_receipts_order
                FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
            CONSTRAINT fk_purchase_order_receipts_item
                FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $columnStmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = "purchase_orders" AND COLUMN_NAME = :column_name'
    );
    foreach ([
        'tag' => 'ALTER TABLE purchase_orders ADD COLUMN tag VARCHAR(120) NOT NULL DEFAULT "" AFTER status',
        'confirmed_at' => 'ALTER TABLE purchase_orders ADD COLUMN confirmed_at DATETIME NULL AFTER placed_at',
    ] as $column => $sql) {
        $columnStmt->execute([':column_name' => $column]);
        if ((int) $columnStmt->fetchColumn() === 0) $pdo->exec($sql);
    }
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS purchase_order_payments (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            purchase_order_id BIGINT UNSIGNED NOT NULL,
            request_key VARCHAR(100) NOT NULL,
            accounting_transaction_id BIGINT UNSIGNED NOT NULL,
            account_id BIGINT UNSIGNED NOT NULL,
            account_name VARCHAR(160) NOT NULL,
            amount DECIMAL(14,2) NOT NULL,
            payment_mode VARCHAR(24) NOT NULL DEFAULT "amount",
            item_ids_json TEXT NOT NULL,
            paid_by VARCHAR(80) NOT NULL DEFAULT "Executive",
            paid_at DATETIME NOT NULL,
            UNIQUE KEY uq_purchase_order_payment_request (request_key),
            KEY idx_purchase_order_payments_order (purchase_order_id, paid_at),
            CONSTRAINT fk_purchase_order_payments_order
                FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function jg_purchase_orders_lock_suffix(PDO $pdo): string
{
    return jg_purchase_orders_driver($pdo) === 'mysql' ? ' FOR UPDATE' : '';
}

function jg_purchase_orders_number(): string
{
    return sprintf('JG-PO-%s-%04d', gmdate('Ymd'), random_int(0, 9999));
}

function jg_purchase_orders_fetch(PDO $pdo, int $limit = 20): array
{
    jg_purchase_orders_ensure_schema($pdo);
    $limit = max(1, min(1000, $limit));
    $orders = $pdo->query(
        'SELECT id, po_number, status, tag, note, line_count, ordered_qty, received_qty,
                estimated_total, placed_by, placed_at, confirmed_at, updated_at, completed_at
         FROM purchase_orders
         ORDER BY placed_at DESC, id DESC
         LIMIT ' . $limit
    )->fetchAll();
    if (!is_array($orders) || $orders === []) {
        return [];
    }

    $itemsStmt = $pdo->prepare(
        'SELECT id, purchase_order_id, sku, product_name, moq, ordered_qty,
                received_qty, unit_cost, line_note, created_at, updated_at
         FROM purchase_order_items
         WHERE purchase_order_id = :purchase_order_id
         ORDER BY id'
    );
    $paymentsStmt = $pdo->prepare(
        'SELECT id, accounting_transaction_id, account_id, account_name, amount,
                payment_mode, item_ids_json, paid_by, paid_at
         FROM purchase_order_payments
         WHERE purchase_order_id = :purchase_order_id
         ORDER BY paid_at ASC, id ASC'
    );

    return array_map(static function (array $order) use ($itemsStmt, $paymentsStmt): array {
        $itemsStmt->execute([':purchase_order_id' => (int) $order['id']]);
        $items = array_map(static function (array $item): array {
            $ordered = max(0, (int) ($item['ordered_qty'] ?? 0));
            $received = max(0, min($ordered, (int) ($item['received_qty'] ?? 0)));
            return [
                'id' => (int) ($item['id'] ?? 0),
                'sku' => (string) ($item['sku'] ?? ''),
                'product_name' => (string) ($item['product_name'] ?? ''),
                'moq' => max(1, (int) ($item['moq'] ?? 1)),
                'ordered_qty' => $ordered,
                'received_qty' => $received,
                'remaining_qty' => max(0, $ordered - $received),
                'unit_cost' => (float) ($item['unit_cost'] ?? 0),
                'line_note' => (string) ($item['line_note'] ?? ''),
                'updated_at' => (string) ($item['updated_at'] ?? ''),
            ];
        }, $itemsStmt->fetchAll());
        $ordered = max(0, (int) ($order['ordered_qty'] ?? 0));
        $received = max(0, min($ordered, (int) ($order['received_qty'] ?? 0)));
        $paymentsStmt->execute([':purchase_order_id' => (int) $order['id']]);
        $payments = array_map(static function (array $payment): array {
            $itemIds = json_decode((string) ($payment['item_ids_json'] ?? '[]'), true);
            return [
                'id' => (int) ($payment['id'] ?? 0),
                'accounting_transaction_id' => (int) ($payment['accounting_transaction_id'] ?? 0),
                'account_id' => (int) ($payment['account_id'] ?? 0),
                'account_name' => (string) ($payment['account_name'] ?? ''),
                'amount' => (float) ($payment['amount'] ?? 0),
                'payment_mode' => (string) ($payment['payment_mode'] ?? 'amount'),
                'item_ids' => is_array($itemIds) ? array_values(array_map('intval', $itemIds)) : [],
                'paid_by' => (string) ($payment['paid_by'] ?? ''),
                'paid_at' => (string) ($payment['paid_at'] ?? ''),
            ];
        }, $paymentsStmt->fetchAll());
        $paidTotal = array_sum(array_map(static fn (array $payment): float => (float) $payment['amount'], $payments));
        $estimatedTotal = max(0.0, (float) ($order['estimated_total'] ?? 0));
        return [
            'id' => (int) ($order['id'] ?? 0),
            'po_number' => (string) ($order['po_number'] ?? ''),
            'status' => (string) ($order['status'] ?? 'pending'),
            'tag' => (string) ($order['tag'] ?? ''),
            'note' => (string) ($order['note'] ?? ''),
            'line_count' => (int) ($order['line_count'] ?? count($items)),
            'ordered_qty' => $ordered,
            'received_qty' => $received,
            'remaining_qty' => max(0, $ordered - $received),
            'progress_percent' => $ordered > 0 ? (int) round(($received / $ordered) * 100) : 0,
            'estimated_total' => $estimatedTotal,
            'paid_total' => min($estimatedTotal, $paidTotal),
            'amount_due' => max(0, $estimatedTotal - $paidTotal),
            'payment_percent' => $estimatedTotal > 0 ? min(100, (int) round(($paidTotal / $estimatedTotal) * 100)) : 100,
            'placed_by' => (string) ($order['placed_by'] ?? ''),
            'placed_at' => (string) ($order['placed_at'] ?? ''),
            'confirmed_at' => (string) ($order['confirmed_at'] ?? ''),
            'updated_at' => (string) ($order['updated_at'] ?? ''),
            'completed_at' => (string) ($order['completed_at'] ?? ''),
            'items' => $items,
            'payments' => $payments,
        ];
    }, $orders);
}

function jg_purchase_orders_incoming_by_sku(PDO $pdo): array
{
    jg_purchase_orders_ensure_schema($pdo);
    $stmt = $pdo->query(
        'SELECT i.sku, SUM(i.ordered_qty - i.received_qty) AS incoming_qty
         FROM purchase_order_items i
         INNER JOIN purchase_orders o ON o.id = i.purchase_order_id
         WHERE o.status IN ("pending", "partially_received")
           AND i.received_qty < i.ordered_qty
         GROUP BY i.sku'
    );
    $incoming = [];
    foreach ($stmt->fetchAll() as $row) {
        $sku = strtoupper(trim((string) ($row['sku'] ?? '')));
        if ($sku !== '') {
            $incoming[$sku] = max(0, (int) ($row['incoming_qty'] ?? 0));
        }
    }
    return $incoming;
}

function jg_purchase_orders_catalog(PDO $pdo, array $skus): array
{
    $normalized = array_values(array_unique(array_filter(array_map(
        static fn (mixed $sku): string => strtoupper(trim((string) $sku)),
        $skus
    ))));
    if ($normalized === []) {
        return [];
    }
    $placeholders = implode(', ', array_fill(0, count($normalized), '?'));
    $stmt = $pdo->prepare(
        'SELECT s.sku, s.purchase_moq, s.cogs, s.volume, s.astra,
                b.name AS brand_name, p.name AS product_name, f.name AS flavor_name, u.name AS unit_name
         FROM sku_skus s
         INNER JOIN sku_brands b ON b.id = s.brand_id
         INNER JOIN sku_products p ON p.id = s.product_id
         INNER JOIN sku_flavors f ON f.id = s.flavor_id
         INNER JOIN sku_units u ON u.id = s.unit_id
         WHERE s.sku IN (' . $placeholders . ')'
    );
    $stmt->execute($normalized);
    $catalog = [];
    foreach ($stmt->fetchAll() as $row) {
        $sku = strtoupper(trim((string) ($row['sku'] ?? '')));
        if ($sku !== '') {
            $catalog[$sku] = $row;
        }
    }
    return $catalog;
}

function jg_purchase_orders_product_name(array $row): string
{
    $volume = (float) ($row['volume'] ?? 0);
    $volumeText = $volume > 0 ? rtrim(rtrim(number_format($volume, 1, '.', ''), '0'), '.') : '';
    return trim(implode(' ', array_filter([
        trim($volumeText . (string) ($row['unit_name'] ?? '')),
        trim((string) ($row['flavor_name'] ?? '')),
        trim((string) ($row['product_name'] ?? $row['sku'] ?? '')),
    ], static fn (string $part): bool => $part !== '')));
}

function jg_purchase_orders_place(
    PDO $pdo,
    array $inputItems,
    string $note,
    string $requestKey,
    string $placedBy = 'Executive',
    string $initialStatus = 'pending'
): array {
    jg_purchase_orders_ensure_schema($pdo);
    $requestKey = trim($requestKey);
    if ($requestKey === '' || strlen($requestKey) > 80) {
        throw new InvalidArgumentException('A valid order request key is required.');
    }

    $existing = $pdo->prepare('SELECT id FROM purchase_orders WHERE request_key = :request_key LIMIT 1');
    $existing->execute([':request_key' => $requestKey]);
    $existingId = (int) ($existing->fetchColumn() ?: 0);
    if ($existingId > 0) {
        foreach (jg_purchase_orders_fetch($pdo, 1000) as $order) {
            if ((int) $order['id'] === $existingId) return $order;
        }
    }

    if (!in_array($initialStatus, ['draft', 'pending'], true)) {
        throw new InvalidArgumentException('Invalid purchase order status.');
    }
    $requested = [];
    foreach ($inputItems as $item) {
        if (!is_array($item)) continue;
        $sku = strtoupper(trim((string) ($item['sku'] ?? '')));
        $quantity = max(0, (int) ceil((float) ($item['quantity'] ?? 0)));
        if ($sku === '' || $quantity < 1) continue;
        $requested[$sku] = [
            'quantity' => $quantity,
            'line_note' => mb_substr(trim((string) ($item['line_note'] ?? '')), 0, 500),
        ];
    }
    if ($requested === []) {
        throw new InvalidArgumentException('Add at least one product before placing the order.');
    }

    $catalog = jg_purchase_orders_catalog($pdo, array_keys($requested));
    if (count($catalog) !== count($requested)) {
        throw new InvalidArgumentException('One or more purchase lines no longer match a live SKU.');
    }

    $lines = [];
    $orderedQty = 0;
    $estimatedTotal = 0.0;
    foreach ($requested as $sku => $request) {
        $row = $catalog[$sku];
        $moq = max(1, (int) ($row['purchase_moq'] ?? 1));
        $quantity = (int) (ceil($request['quantity'] / $moq) * $moq);
        $unitCost = max(0.0, (float) ($row['cogs'] ?? 0));
        $lines[] = [
            'sku' => $sku,
            'product_name' => jg_purchase_orders_product_name($row),
            'moq' => $moq,
            'ordered_qty' => $quantity,
            'unit_cost' => $unitCost,
            'line_note' => $request['line_note'],
        ];
        $orderedQty += $quantity;
        $estimatedTotal += $quantity * $unitCost;
    }

    $now = jg_purchase_orders_now();
    $pdo->beginTransaction();
    try {
        $insertOrder = $pdo->prepare(
            'INSERT INTO purchase_orders (
                po_number, request_key, status, note, line_count, ordered_qty,
                received_qty, estimated_total, placed_by, placed_at, confirmed_at, updated_at
             ) VALUES (
                :po_number, :request_key, :status, :note, :line_count, :ordered_qty,
                0, :estimated_total, :placed_by, :placed_at, :confirmed_at, :updated_at
             )'
        );
        $poNumber = '';
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $poNumber = jg_purchase_orders_number();
            try {
                $insertOrder->execute([
                    ':po_number' => $poNumber,
                    ':request_key' => $requestKey,
                    ':status' => $initialStatus,
                    ':note' => mb_substr(trim($note), 0, 5000),
                    ':line_count' => count($lines),
                    ':ordered_qty' => $orderedQty,
                    ':estimated_total' => number_format($estimatedTotal, 2, '.', ''),
                    ':placed_by' => mb_substr(trim($placedBy) ?: 'Executive', 0, 80),
                    ':placed_at' => $now,
                    ':confirmed_at' => $initialStatus === 'pending' ? $now : null,
                    ':updated_at' => $now,
                ]);
                break;
            } catch (PDOException $error) {
                if ($attempt === 4) throw $error;
            }
        }
        $orderId = (int) $pdo->lastInsertId();
        if ($orderId < 1) {
            throw new RuntimeException('The purchase order could not be created.');
        }

        $insertItem = $pdo->prepare(
            'INSERT INTO purchase_order_items (
                purchase_order_id, sku, product_name, moq, ordered_qty,
                received_qty, unit_cost, line_note, created_at, updated_at
             ) VALUES (
                :purchase_order_id, :sku, :product_name, :moq, :ordered_qty,
                0, :unit_cost, :line_note, :created_at, :updated_at
             )'
        );
        foreach ($lines as $line) {
            $insertItem->execute([
                ':purchase_order_id' => $orderId,
                ':sku' => $line['sku'],
                ':product_name' => $line['product_name'],
                ':moq' => $line['moq'],
                ':ordered_qty' => $line['ordered_qty'],
                ':unit_cost' => number_format((float) $line['unit_cost'], 2, '.', ''),
                ':line_note' => $line['line_note'],
                ':created_at' => $now,
                ':updated_at' => $now,
            ]);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }

    foreach (jg_purchase_orders_fetch($pdo, 1000) as $order) {
        if ((int) $order['id'] === $orderId) return $order;
    }
    throw new RuntimeException('The purchase order was saved but could not be reloaded.');
}

function jg_purchase_orders_create_draft(PDO $pdo, array $items, string $note, string $requestKey): array
{
    return jg_purchase_orders_place($pdo, $items, $note, $requestKey, 'Executive', 'draft');
}

function jg_purchase_orders_find(PDO $pdo, int $orderId): array
{
    foreach (jg_purchase_orders_fetch($pdo, 1000) as $order) {
        if ((int) ($order['id'] ?? 0) === $orderId) return $order;
    }
    throw new RuntimeException('Purchase order not found.');
}

function jg_purchase_orders_confirm(PDO $pdo, int $orderId): array
{
    jg_purchase_orders_ensure_schema($pdo);
    $now = jg_purchase_orders_now();
    $stmt = $pdo->prepare(
        'UPDATE purchase_orders SET status = "pending", confirmed_at = :now, updated_at = :now
         WHERE id = :id AND status = "draft"'
    );
    $stmt->execute([':now' => $now, ':id' => $orderId]);
    if ($stmt->rowCount() !== 1) {
        $order = jg_purchase_orders_find($pdo, $orderId);
        if ((string) ($order['status'] ?? '') !== 'pending') {
            throw new RuntimeException('Only a draft purchase order can be confirmed.');
        }
    }
    return jg_purchase_orders_find($pdo, $orderId);
}

function jg_purchase_orders_remove_draft(PDO $pdo, int $orderId): void
{
    jg_purchase_orders_ensure_schema($pdo);
    $stmt = $pdo->prepare('DELETE FROM purchase_orders WHERE id = :id AND status = "draft"');
    $stmt->execute([':id' => $orderId]);
    if ($stmt->rowCount() !== 1) throw new RuntimeException('Only a draft purchase order can be removed.');
}

function jg_purchase_orders_update_tag(PDO $pdo, int $orderId, string $tag): array
{
    jg_purchase_orders_ensure_schema($pdo);
    $tag = mb_substr(trim($tag), 0, 120);
    $stmt = $pdo->prepare('UPDATE purchase_orders SET tag = :tag, updated_at = :now WHERE id = :id');
    $stmt->execute([':tag' => $tag, ':now' => jg_purchase_orders_now(), ':id' => $orderId]);
    if ($stmt->rowCount() === 0) jg_purchase_orders_find($pdo, $orderId);
    return jg_purchase_orders_find($pdo, $orderId);
}

function jg_purchase_orders_record_payment(
    PDO $pdo,
    int $orderId,
    string $requestKey,
    int $accountingTransactionId,
    int $accountId,
    string $accountName,
    float $amount,
    string $mode,
    array $itemIds
): array {
    jg_purchase_orders_ensure_schema($pdo);
    $existing = $pdo->prepare('SELECT purchase_order_id FROM purchase_order_payments WHERE request_key = :request_key LIMIT 1');
    $existing->execute([':request_key' => $requestKey]);
    if ((int) ($existing->fetchColumn() ?: 0) > 0) return jg_purchase_orders_find($pdo, $orderId);
    $stmt = $pdo->prepare(
        'INSERT INTO purchase_order_payments
            (purchase_order_id, request_key, accounting_transaction_id, account_id, account_name,
             amount, payment_mode, item_ids_json, paid_by, paid_at)
         VALUES (:purchase_order_id, :request_key, :transaction_id, :account_id, :account_name,
             :amount, :payment_mode, :item_ids_json, "Executive", :paid_at)'
    );
    $stmt->execute([
        ':purchase_order_id' => $orderId,
        ':request_key' => mb_substr(trim($requestKey), 0, 100),
        ':transaction_id' => $accountingTransactionId,
        ':account_id' => $accountId,
        ':account_name' => mb_substr(trim($accountName), 0, 160),
        ':amount' => number_format($amount, 2, '.', ''),
        ':payment_mode' => mb_substr(trim($mode), 0, 24),
        ':item_ids_json' => json_encode(array_values(array_unique(array_map('intval', $itemIds)))),
        ':paid_at' => jg_purchase_orders_now(),
    ]);
    return jg_purchase_orders_find($pdo, $orderId);
}

function jg_purchase_orders_cancel(PDO $pdo, int $orderId): array
{
    jg_purchase_orders_ensure_schema($pdo);
    if ($orderId < 1) {
        throw new InvalidArgumentException('Choose a purchase order to cancel.');
    }

    $now = jg_purchase_orders_now();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            'SELECT id, po_number, status, received_qty
             FROM purchase_orders
             WHERE id = :id
             LIMIT 1' . jg_purchase_orders_lock_suffix($pdo)
        );
        $stmt->execute([':id' => $orderId]);
        $order = $stmt->fetch();
        if (!is_array($order)) {
            throw new RuntimeException('Purchase order not found.');
        }

        $status = (string) ($order['status'] ?? '');
        if ($status === 'cancelled') {
            $pdo->commit();
            return [
                'id' => (int) ($order['id'] ?? 0),
                'po_number' => (string) ($order['po_number'] ?? ''),
                'status' => 'cancelled',
                'received_qty' => max(0, (int) ($order['received_qty'] ?? 0)),
            ];
        }
        if (!in_array($status, ['pending', 'partially_received'], true)) {
            throw new RuntimeException('Only an open purchase order can be cancelled.');
        }

        $update = $pdo->prepare(
            'UPDATE purchase_orders
             SET status = "cancelled", updated_at = :updated_at
             WHERE id = :id AND status IN ("pending", "partially_received")'
        );
        $update->execute([':updated_at' => $now, ':id' => $orderId]);
        if ($update->rowCount() !== 1) {
            throw new RuntimeException('The purchase order changed before it could be cancelled.');
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }

    return [
        'id' => $orderId,
        'po_number' => (string) ($order['po_number'] ?? ''),
        'status' => 'cancelled',
        'received_qty' => max(0, (int) ($order['received_qty'] ?? 0)),
    ];
}
