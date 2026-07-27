<?php
declare(strict_types=1);

require_once __DIR__ . '/analytics-bootstrap.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/sku-db-bootstrap.php';
require_once __DIR__ . '/website-commerce-bootstrap.php';

const JG_WHATSAPP_ORDER_OPEN_STATUSES = ['PENDING_PUBLISH', 'PUBLISH_FAILED', 'IS_LISTED', 'IS_BEING_FULFILLED'];

function jg_whatsapp_now(): string
{
    return (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s.u');
}

function jg_whatsapp_ensure_schema(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS whatsapp_orders (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            order_id VARCHAR(40) NOT NULL,
            status VARCHAR(48) NOT NULL DEFAULT "PENDING_PUBLISH",
            customer_name VARCHAR(160) NOT NULL,
            customer_address VARCHAR(1000) NOT NULL DEFAULT "",
            customer_phone VARCHAR(50) NOT NULL DEFAULT "",
            merchandise_total DECIMAL(16,2) NOT NULL DEFAULT 0,
            shipping_cost DECIMAL(16,2) NOT NULL DEFAULT 0,
            deadline_hours TINYINT UNSIGNED NOT NULL DEFAULT 24,
            deadline_at DATETIME(6) NULL DEFAULT NULL,
            label_storage_key VARCHAR(255) NOT NULL,
            label_original_name VARCHAR(255) NOT NULL,
            label_size_bytes INT UNSIGNED NOT NULL DEFAULT 0,
            notes VARCHAR(500) NOT NULL DEFAULT "",
            publication_attempts INT UNSIGNED NOT NULL DEFAULT 0,
            publication_error VARCHAR(500) NOT NULL DEFAULT "",
            listed_at DATETIME(6) NULL DEFAULT NULL,
            fulfilled_at DATETIME(6) NULL DEFAULT NULL,
            created_at DATETIME(6) NOT NULL,
            updated_at DATETIME(6) NOT NULL,
            UNIQUE KEY uniq_whatsapp_order_id (order_id),
            KEY idx_whatsapp_orders_status_created (status, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS whatsapp_order_items (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            whatsapp_order_id BIGINT UNSIGNED NOT NULL,
            sku VARCHAR(24) NOT NULL,
            product_name VARCHAR(255) NOT NULL,
            quantity INT UNSIGNED NOT NULL,
            unit_price DECIMAL(16,2) NOT NULL DEFAULT 0,
            line_total DECIMAL(16,2) NOT NULL DEFAULT 0,
            created_at DATETIME(6) NOT NULL,
            KEY idx_whatsapp_order_items_order (whatsapp_order_id),
            CONSTRAINT fk_whatsapp_order_items_order FOREIGN KEY (whatsapp_order_id)
                REFERENCES whatsapp_orders(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function jg_whatsapp_money(mixed $value, string $label): float
{
    if (!is_numeric($value)) {
        throw new InvalidArgumentException($label . ' must be a valid amount.');
    }
    $amount = round((float) $value, 2);
    if ($amount < 0 || $amount > 99999999999999.99) {
        throw new InvalidArgumentException($label . ' is outside the allowed range.');
    }
    return $amount;
}

function jg_whatsapp_text(mixed $value, string $label, int $maxLength, bool $required = false): string
{
    $text = trim(preg_replace('/\s+/', ' ', (string) $value) ?? '');
    if ($required && $text === '') {
        throw new InvalidArgumentException($label . ' is required.');
    }
    if (mb_strlen($text) > $maxLength) {
        throw new InvalidArgumentException($label . ' is too long.');
    }
    return $text;
}

function jg_whatsapp_catalog(): array
{
    $stmt = jg_sku_db()->query(
        'SELECT s.sku, s.tag, s.current_stock, s.sale_price, s.skip_scan,
                b.name AS brand_name, p.name AS product_name, f.name AS flavor_name,
                u.name AS unit_name, s.volume
         FROM sku_skus s
         INNER JOIN sku_brands b ON b.id = s.brand_id
         INNER JOIN sku_products p ON p.id = s.product_id
         INNER JOIN sku_flavors f ON f.id = s.flavor_id
         INNER JOIN sku_units u ON u.id = s.unit_id
         ORDER BY b.name, p.name, f.name, s.volume, s.sku'
    );
    return array_map(static function (array $row): array {
        $parts = array_values(array_filter([
            trim((string) ($row['brand_name'] ?? '')),
            trim((string) ($row['product_name'] ?? '')),
            trim((string) ($row['flavor_name'] ?? '')),
            trim((string) ($row['volume'] ?? '')) . ' ' . trim((string) ($row['unit_name'] ?? '')),
        ]));
        return [
            'sku' => (string) ($row['sku'] ?? ''),
            'tag' => (string) ($row['tag'] ?? ''),
            'product_name' => implode(' · ', $parts),
            'brand_name' => (string) ($row['brand_name'] ?? ''),
            'flavor_name' => (string) ($row['flavor_name'] ?? ''),
            'current_stock' => (int) ($row['current_stock'] ?? 0),
            'sale_price' => (float) ($row['sale_price'] ?? 0),
            'skip_scan' => (int) ($row['skip_scan'] ?? 0) === 1,
        ];
    }, $stmt->fetchAll());
}

function jg_whatsapp_normalize_items(PDO $skuPdo, mixed $value): array
{
    if (!is_array($value) || $value === []) {
        throw new InvalidArgumentException('Select at least one SKU.');
    }
    $requested = [];
    foreach ($value as $item) {
        if (!is_array($item)) continue;
        $sku = strtoupper(trim((string) ($item['sku'] ?? '')));
        if ($sku === '') continue;
        if (isset($requested[$sku])) {
            throw new InvalidArgumentException('Each SKU may appear only once.');
        }
        $requested[$sku] = $item;
    }
    if ($requested === []) {
        throw new InvalidArgumentException('Select at least one SKU.');
    }

    $placeholders = implode(',', array_fill(0, count($requested), '?'));
    $stmt = $skuPdo->prepare(
        "SELECT s.sku, s.sale_price, s.skip_scan, b.name AS brand_name, p.name AS product_name, f.name AS flavor_name
         FROM sku_skus s
         INNER JOIN sku_brands b ON b.id = s.brand_id
         INNER JOIN sku_products p ON p.id = s.product_id
         INNER JOIN sku_flavors f ON f.id = s.flavor_id
         WHERE s.sku IN ({$placeholders})"
    );
    $stmt->execute(array_keys($requested));
    $catalog = [];
    foreach ($stmt->fetchAll() as $row) {
        $catalog[strtoupper((string) $row['sku'])] = $row;
    }
    if (count($catalog) !== count($requested)) {
        throw new InvalidArgumentException('One or more selected SKUs no longer exist.');
    }

    $items = [];
    foreach ($requested as $sku => $item) {
        $quantity = (int) ($item['quantity'] ?? 0);
        if ($quantity < 1 || $quantity > 9999) {
            throw new InvalidArgumentException('SKU quantity must be between 1 and 9,999.');
        }
        $row = $catalog[$sku];
        $unitPrice = jg_whatsapp_money($item['unit_price'] ?? $row['sale_price'] ?? 0, 'Unit price');
        $name = implode(' · ', array_values(array_filter([
            trim((string) ($row['brand_name'] ?? '')),
            trim((string) ($row['product_name'] ?? '')),
            trim((string) ($row['flavor_name'] ?? '')),
        ])));
        $items[] = [
            'sku' => $sku,
            'product_name' => $name !== '' ? $name : $sku,
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'line_total' => round($quantity * $unitPrice, 2),
            'skip_scan' => (int) ($row['skip_scan'] ?? 0) === 1,
        ];
    }
    return $items;
}

function jg_whatsapp_label_directory(): string
{
    return rtrim(jg_website_config(
        'JG_WHATSAPP_LABEL_STORAGE_PATH',
        'whatsapp_label_storage_path',
        dirname(__DIR__) . '/private/whatsapp-order-labels'
    ), '/');
}

function jg_whatsapp_prepare_label(array $upload, string $orderId): array
{
    if (($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file((string) ($upload['tmp_name'] ?? ''))) {
        throw new InvalidArgumentException('Upload a PDF shipping label.');
    }
    $size = (int) ($upload['size'] ?? 0);
    if ($size <= 4 || $size > 10 * 1024 * 1024) {
        throw new InvalidArgumentException('Shipping labels must be PDFs no larger than 10 MB.');
    }
    $handle = fopen((string) $upload['tmp_name'], 'rb');
    $signature = is_resource($handle) ? fread($handle, 5) : '';
    if (is_resource($handle)) fclose($handle);
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file((string) $upload['tmp_name']);
    if ($signature !== '%PDF-' || !in_array($mime, ['application/pdf', 'application/x-pdf'], true)) {
        throw new InvalidArgumentException('Shipping label must be a valid PDF.');
    }
    $directory = jg_whatsapp_label_directory();
    if (!is_dir($directory) && !mkdir($directory, 0770, true) && !is_dir($directory)) {
        throw new RuntimeException('Private WhatsApp label storage is unavailable.');
    }
    $storageKey = hash('sha256', $orderId . '|' . bin2hex(random_bytes(24))) . '.pdf';
    $destination = $directory . '/' . $storageKey;
    if (!move_uploaded_file((string) $upload['tmp_name'], $destination)) {
        throw new RuntimeException('Unable to store the shipping label.');
    }
    @chmod($destination, 0640);
    return [
        'storage_key' => $storageKey,
        'original_name' => mb_substr(basename((string) ($upload['name'] ?? 'shipping-label.pdf')), 0, 255),
        'size_bytes' => $size,
        'path' => $destination,
    ];
}

function jg_whatsapp_generate_order_id(): string
{
    return 'WAEXEC-' . gmdate('ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(8)), 0, 10));
}

function jg_whatsapp_order_items(PDO $pdo, int $id): array
{
    $stmt = $pdo->prepare(
        'SELECT sku, product_name, quantity, unit_price, line_total
         FROM whatsapp_order_items WHERE whatsapp_order_id = :id ORDER BY id'
    );
    $stmt->execute([':id' => $id]);
    return array_map(static fn (array $row): array => [
        'sku' => (string) $row['sku'],
        'product_name' => (string) $row['product_name'],
        'quantity' => (int) $row['quantity'],
        'unit_price' => (float) $row['unit_price'],
        'line_total' => (float) $row['line_total'],
    ], $stmt->fetchAll());
}

function jg_whatsapp_format_order(PDO $pdo, array $row): array
{
    return [
        'order_id' => (string) $row['order_id'],
        'status' => (string) $row['status'],
        'customer' => [
            'name' => (string) $row['customer_name'],
            'address' => (string) $row['customer_address'],
            'phone' => (string) $row['customer_phone'],
        ],
        'merchandise_total' => (float) $row['merchandise_total'],
        'shipping_cost' => (float) $row['shipping_cost'],
        'deadline_hours' => (int) $row['deadline_hours'],
        'deadline_at' => !empty($row['deadline_at']) ? jg_website_atom((string) $row['deadline_at']) : null,
        'notes' => (string) $row['notes'],
        'has_label' => trim((string) $row['label_storage_key']) !== '',
        'label_original_name' => (string) $row['label_original_name'],
        'publication_attempts' => (int) $row['publication_attempts'],
        'publication_error' => (string) $row['publication_error'],
        'created_at' => jg_website_atom((string) $row['created_at']),
        'listed_at' => !empty($row['listed_at']) ? jg_website_atom((string) $row['listed_at']) : null,
        'items' => jg_whatsapp_order_items($pdo, (int) $row['id']),
    ];
}

function jg_whatsapp_internal_order(PDO $pdo, string $orderId, bool $forUpdate = false): array
{
    $stmt = $pdo->prepare('SELECT * FROM whatsapp_orders WHERE order_id = :order_id' . ($forUpdate ? ' FOR UPDATE' : ''));
    $stmt->execute([':order_id' => trim($orderId)]);
    $row = $stmt->fetch();
    if (!is_array($row)) throw new RuntimeException('WhatsApp order was not found.');
    return $row;
}

function jg_whatsapp_create_order(PDO $pdo, PDO $skuPdo, array $payload, array $upload): array
{
    jg_whatsapp_ensure_schema($pdo);
    $items = jg_whatsapp_normalize_items($skuPdo, $payload['items'] ?? []);
    $customerName = jg_whatsapp_text($payload['customer_name'] ?? '', 'Customer name', 160, true);
    $customerAddress = jg_whatsapp_text($payload['customer_address'] ?? '', 'Customer address', 1000);
    $customerPhone = jg_whatsapp_text($payload['customer_phone'] ?? '', 'Customer phone', 50);
    $notes = jg_whatsapp_text($payload['notes'] ?? '', 'Notes', 500);
    $shippingCost = jg_whatsapp_money($payload['shipping_cost'] ?? null, 'Shipping cost');
    $deadlineHours = (int) ($payload['deadline_hours'] ?? 24);
    if ($deadlineHours < 12 || $deadlineHours > 48) {
        throw new InvalidArgumentException('Deadline must be between 12 and 48 hours.');
    }
    $orderId = jg_whatsapp_generate_order_id();
    $label = jg_whatsapp_prepare_label($upload, $orderId);
    $merchandiseTotal = array_reduce($items, static fn (float $sum, array $item): float => $sum + $item['line_total'], 0.0);
    $now = jg_whatsapp_now();

    try {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare(
            'INSERT INTO whatsapp_orders
                (order_id, status, customer_name, customer_address, customer_phone, merchandise_total, shipping_cost,
                 deadline_hours, label_storage_key, label_original_name, label_size_bytes, notes, created_at, updated_at)
             VALUES
                (:order_id, "PENDING_PUBLISH", :customer_name, :customer_address, :customer_phone, :merchandise_total, :shipping_cost,
                 :deadline_hours, :label_storage_key, :label_original_name, :label_size_bytes, :notes, :created_at, :updated_at)'
        );
        $stmt->execute([
            ':order_id' => $orderId,
            ':customer_name' => $customerName,
            ':customer_address' => $customerAddress,
            ':customer_phone' => $customerPhone,
            ':merchandise_total' => number_format($merchandiseTotal, 2, '.', ''),
            ':shipping_cost' => number_format($shippingCost, 2, '.', ''),
            ':deadline_hours' => $deadlineHours,
            ':label_storage_key' => $label['storage_key'],
            ':label_original_name' => $label['original_name'],
            ':label_size_bytes' => $label['size_bytes'],
            ':notes' => $notes,
            ':created_at' => $now,
            ':updated_at' => $now,
        ]);
        $databaseId = (int) $pdo->lastInsertId();
        $itemStmt = $pdo->prepare(
            'INSERT INTO whatsapp_order_items
                (whatsapp_order_id, sku, product_name, quantity, unit_price, line_total, created_at)
             VALUES (:order_id, :sku, :product_name, :quantity, :unit_price, :line_total, :created_at)'
        );
        foreach ($items as $item) {
            $itemStmt->execute([
                ':order_id' => $databaseId,
                ':sku' => $item['sku'],
                ':product_name' => $item['product_name'],
                ':quantity' => $item['quantity'],
                ':unit_price' => number_format($item['unit_price'], 2, '.', ''),
                ':line_total' => number_format($item['line_total'], 2, '.', ''),
                ':created_at' => $now,
            ]);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        @unlink($label['path']);
        throw $error;
    }
    return jg_whatsapp_format_order($pdo, jg_whatsapp_internal_order($pdo, $orderId));
}

function jg_whatsapp_store_ops_payload(PDO $pdo, array $row): array
{
    $items = jg_whatsapp_order_items($pdo, (int) $row['id']);
    return [
        'platform' => 'whatsapp',
        'platform_label' => 'WhatsApp',
        'sourceAccountKey' => 'whatsapp',
        'order_id' => (string) $row['order_id'],
        'id' => (string) $row['order_id'],
        'status' => 'IS_LISTED',
        'deadline_hours' => (int) $row['deadline_hours'],
        'deadlineAt' => !empty($row['deadline_at'])
            ? (int) ((new DateTimeImmutable((string) $row['deadline_at'], new DateTimeZone('UTC')))->format('Uv'))
            : 0,
        'createdAt' => jg_website_atom((string) $row['created_at']),
        'customer' => [
            'name' => (string) $row['customer_name'],
            'address' => (string) $row['customer_address'],
            'phone' => (string) $row['customer_phone'],
        ],
        'notes' => (string) $row['notes'],
        'label_url' => rtrim(jg_website_config('JG_EXECUTIVE_DASHBOARD_URL', 'executive_dashboard_url', 'https://admin.jenanggemi.com'), '/')
            . '/api/whatsapp-orders/?action=store_ops_label&order=' . rawurlencode((string) $row['order_id']),
        'items' => array_map(static fn (array $item): array => [
            'sku' => $item['sku'],
            'quantity' => $item['quantity'],
            'product_name' => $item['product_name'],
            'skip_scan' => false,
        ], $items),
    ];
}

function jg_whatsapp_publish_order(PDO $pdo, string $orderId): array
{
    jg_whatsapp_ensure_schema($pdo);
    $pdo->beginTransaction();
    try {
        $row = jg_whatsapp_internal_order($pdo, $orderId, true);
        if (($row['status'] ?? '') === 'IS_LISTED') {
            $pdo->commit();
            return jg_whatsapp_format_order($pdo, $row);
        }
        if (!in_array((string) ($row['status'] ?? ''), ['PENDING_PUBLISH', 'PUBLISH_FAILED'], true)) {
            throw new RuntimeException('This WhatsApp order cannot be published again.');
        }
        $pdo->prepare(
            'UPDATE whatsapp_orders
             SET status = "PENDING_PUBLISH", publication_attempts = publication_attempts + 1,
                 deadline_at = COALESCE(deadline_at, DATE_ADD(UTC_TIMESTAMP(6), INTERVAL deadline_hours HOUR)),
                 publication_error = "", updated_at = :updated_at WHERE id = :id'
        )->execute([':updated_at' => jg_whatsapp_now(), ':id' => $row['id']]);
        $row = jg_whatsapp_internal_order($pdo, $orderId, true);
        $outbound = jg_whatsapp_store_ops_payload($pdo, $row);
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }

    try {
        $base = rtrim(jg_website_config('JG_STORE_OPS_BASE_URL', 'store_ops_base_url'), '/');
        $token = jg_website_store_ops_token();
        if ($base === '' || $token === '') {
            throw new RuntimeException('Store Ops order integration is not configured.');
        }
        jg_website_http_json('POST', $base . '/api/website-orders/?action=ingest', $outbound, $token);
    } catch (Throwable $error) {
        $pdo->prepare(
            'UPDATE whatsapp_orders SET status = "PUBLISH_FAILED", publication_error = :error, updated_at = :updated_at
             WHERE order_id = :order_id AND status = "PENDING_PUBLISH"'
        )->execute([
            ':error' => mb_substr($error->getMessage(), 0, 500),
            ':updated_at' => jg_whatsapp_now(),
            ':order_id' => $orderId,
        ]);
        throw $error;
    }

    $now = jg_whatsapp_now();
    $pdo->prepare(
        'UPDATE whatsapp_orders SET status = "IS_LISTED", listed_at = COALESCE(listed_at, :listed_at),
         publication_error = "", updated_at = :updated_at WHERE order_id = :order_id AND status = "PENDING_PUBLISH"'
    )->execute([':listed_at' => $now, ':updated_at' => $now, ':order_id' => $orderId]);
    return jg_whatsapp_format_order($pdo, jg_whatsapp_internal_order($pdo, $orderId));
}

function jg_whatsapp_list_orders(PDO $pdo, int $limit = 100): array
{
    jg_whatsapp_ensure_schema($pdo);
    $limit = max(1, min(250, $limit));
    $stmt = $pdo->query('SELECT * FROM whatsapp_orders ORDER BY created_at DESC, id DESC LIMIT ' . $limit);
    return array_map(static fn (array $row): array => jg_whatsapp_format_order($pdo, $row), $stmt->fetchAll());
}

function jg_whatsapp_feed_orders(PDO $pdo): array
{
    jg_whatsapp_ensure_schema($pdo);
    $quoted = implode(',', array_map(static fn (string $status): string => $pdo->quote($status), JG_WHATSAPP_ORDER_OPEN_STATUSES));
    $stmt = $pdo->query("SELECT * FROM whatsapp_orders WHERE status IN ({$quoted}) ORDER BY created_at, id");
    return array_map(static fn (array $row): array => jg_whatsapp_store_ops_payload($pdo, $row), $stmt->fetchAll());
}

function jg_whatsapp_update_status(PDO $pdo, string $orderId, string $status): array
{
    $status = strtoupper(trim($status));
    if (!in_array($status, ['IS_BEING_FULFILLED', 'FULFILLED'], true)) {
        throw new InvalidArgumentException('Unsupported Store Ops callback status.');
    }
    $pdo->beginTransaction();
    try {
        $row = jg_whatsapp_internal_order($pdo, $orderId, true);
        $allowed = $status === 'IS_BEING_FULFILLED'
            ? in_array((string) $row['status'], ['IS_LISTED', 'IS_BEING_FULFILLED'], true)
            : in_array((string) $row['status'], ['IS_LISTED', 'IS_BEING_FULFILLED', 'FULFILLED'], true);
        if (!$allowed) throw new RuntimeException('Invalid WhatsApp order status transition.');
        $now = jg_whatsapp_now();
        $pdo->prepare(
            'UPDATE whatsapp_orders SET status = :status,
             fulfilled_at = CASE WHEN :status_again = "FULFILLED" THEN COALESCE(fulfilled_at, :fulfilled_at) ELSE fulfilled_at END,
             updated_at = :updated_at WHERE id = :id'
        )->execute([
            ':status' => $status,
            ':status_again' => $status,
            ':fulfilled_at' => $now,
            ':updated_at' => $now,
            ':id' => $row['id'],
        ]);
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
    return jg_whatsapp_format_order($pdo, jg_whatsapp_internal_order($pdo, $orderId));
}
