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
    $limit = max(1, min(100, $limit));
    $orders = $pdo->query(
        'SELECT id, po_number, status, note, line_count, ordered_qty, received_qty,
                estimated_total, placed_by, placed_at, updated_at, completed_at
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

    return array_map(static function (array $order) use ($itemsStmt): array {
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
        return [
            'id' => (int) ($order['id'] ?? 0),
            'po_number' => (string) ($order['po_number'] ?? ''),
            'status' => (string) ($order['status'] ?? 'pending'),
            'note' => (string) ($order['note'] ?? ''),
            'line_count' => (int) ($order['line_count'] ?? count($items)),
            'ordered_qty' => $ordered,
            'received_qty' => $received,
            'remaining_qty' => max(0, $ordered - $received),
            'progress_percent' => $ordered > 0 ? (int) round(($received / $ordered) * 100) : 0,
            'estimated_total' => (float) ($order['estimated_total'] ?? 0),
            'placed_by' => (string) ($order['placed_by'] ?? ''),
            'placed_at' => (string) ($order['placed_at'] ?? ''),
            'updated_at' => (string) ($order['updated_at'] ?? ''),
            'completed_at' => (string) ($order['completed_at'] ?? ''),
            'items' => $items,
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
    string $placedBy = 'Executive'
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
        foreach (jg_purchase_orders_fetch($pdo, 100) as $order) {
            if ((int) $order['id'] === $existingId) return $order;
        }
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
                received_qty, estimated_total, placed_by, placed_at, updated_at
             ) VALUES (
                :po_number, :request_key, "pending", :note, :line_count, :ordered_qty,
                0, :estimated_total, :placed_by, :placed_at, :updated_at
             )'
        );
        $poNumber = '';
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $poNumber = jg_purchase_orders_number();
            try {
                $insertOrder->execute([
                    ':po_number' => $poNumber,
                    ':request_key' => $requestKey,
                    ':note' => mb_substr(trim($note), 0, 5000),
                    ':line_count' => count($lines),
                    ':ordered_qty' => $orderedQty,
                    ':estimated_total' => number_format($estimatedTotal, 2, '.', ''),
                    ':placed_by' => mb_substr(trim($placedBy) ?: 'Executive', 0, 80),
                    ':placed_at' => $now,
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

    foreach (jg_purchase_orders_fetch($pdo, 100) as $order) {
        if ((int) $order['id'] === $orderId) return $order;
    }
    throw new RuntimeException('The purchase order was saved but could not be reloaded.');
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
