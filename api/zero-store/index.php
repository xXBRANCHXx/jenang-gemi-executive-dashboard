<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/sku-db-bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
if (in_array($origin, ['https://zerofoods.id', 'https://www.zerofoods.id'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function zero_store_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

function zero_store_body(): array
{
    $raw = file_get_contents('php://input');
    $decoded = json_decode(is_string($raw) ? $raw : '', true);
    return is_array($decoded) ? $decoded : [];
}

function zero_store_text(mixed $value, string $label, int $max = 160, bool $required = true): string
{
    $text = trim(preg_replace('/\s+/', ' ', (string) $value) ?? '');
    if ($required && $text === '') {
        zero_store_json(['error' => $label . ' is required.'], 422);
    }
    if (mb_strlen($text) > $max) {
        zero_store_json(['error' => $label . ' is too long.'], 422);
    }
    return $text;
}

function zero_store_sku(mixed $value, bool $required = true): string
{
    $sku = strtoupper(zero_store_text($value, 'SKU', 20, $required));
    if ($sku === '' && !$required) {
        return '';
    }
    if (!preg_match('/^[A-Z0-9]{12}$/', $sku)) {
        zero_store_json(['error' => 'SKU must be a 12 character SKU DB code.'], 422);
    }
    return $sku;
}

function zero_store_item_key(mixed $value): string
{
    $key = strtolower(zero_store_text($value, 'Item key', 160));
    if (!preg_match('/^[a-z0-9\-]+:[a-z0-9\-]+:[a-z0-9\-]+$/', $key)) {
        zero_store_json(['error' => 'Item key is invalid.'], 422);
    }
    return $key;
}

function zero_store_money(mixed $value, string $label): string
{
    if ($value === '' || $value === null || !is_numeric($value)) {
        zero_store_json(['error' => $label . ' must be numeric.'], 422);
    }
    $amount = round((float) $value, 2);
    if ($amount < 0) {
        zero_store_json(['error' => $label . ' cannot be negative.'], 422);
    }
    return number_format($amount, 2, '.', '');
}

function zero_store_date(mixed $value, string $label): string
{
    $date = trim((string) $value);
    $parsed = DateTimeImmutable::createFromFormat('Y-m-d', $date);
    if (!$parsed || $parsed->format('Y-m-d') !== $date) {
        zero_store_json(['error' => $label . ' must use YYYY-MM-DD.'], 422);
    }
    return $date;
}

function zero_store_today_wib(): string
{
    return (new DateTimeImmutable('now', new DateTimeZone('Asia/Jakarta')))->format('Y-m-d');
}

function zero_store_slug(string $value): string
{
    $slug = strtolower(trim($value));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';
    return trim($slug, '-');
}

function zero_store_normalize_name(string $value): string
{
    return strtolower(preg_replace('/[^a-z0-9]+/', ' ', $value) ?? '');
}

function zero_store_fallback_sku(string $productSlug, string $optionId, string $sizeId): string
{
    return 'ZERO-' . strtoupper(str_replace('-', '_', $productSlug . '-' . $optionId . '-' . $sizeId));
}

function zero_store_website_items(): array
{
    $products = [
        'syrup' => [
            'name' => 'ZERO Syrup',
            'sizes' => [
                ['id' => '50ml', 'label' => '50ml', 'price' => 10000],
                ['id' => '250ml', 'label' => '250ml', 'price' => 39000],
                ['id' => '550ml', 'label' => '550ml', 'price' => 69000],
            ],
            'options' => [
                ['id' => 'plain', 'name' => 'Plain'],
                ['id' => 'hazelnut', 'name' => 'Hazelnut'],
                ['id' => 'maple', 'name' => 'Maple'],
                ['id' => 'pumpkin-spice', 'name' => 'Pumpkin Spice'],
                ['id' => 'caramel', 'name' => 'Caramel'],
                ['id' => 'salted-caramel', 'name' => 'Salted Caramel'],
                ['id' => 'butterscotch', 'name' => 'Butterscotch'],
                ['id' => 'vanilla', 'name' => 'Vanilla'],
                ['id' => 'pistachio', 'name' => 'Pistachio'],
                ['id' => 'pandan', 'name' => 'Pandan'],
                ['id' => 'strawberry', 'name' => 'Strawberry'],
                ['id' => 'lychee', 'name' => 'Lychee'],
                ['id' => 'mango', 'name' => 'Mango'],
                ['id' => 'lemonade', 'name' => 'Lemonade'],
                ['id' => 'melon', 'name' => 'Melon'],
                ['id' => 'mint', 'name' => 'Mint'],
            ],
        ],
        'drops' => [
            'name' => 'ZERO Drops',
            'sizes' => [
                ['id' => '5ml', 'label' => '5ml', 'price' => 20000],
                ['id' => '10ml', 'label' => '10ml', 'price' => 30000],
                ['id' => '30ml', 'label' => '30ml', 'price' => 49000],
            ],
            'options' => [
                ['id' => 'plain', 'name' => 'Plain', 'sizes' => ['5ml', '10ml', '30ml']],
                ['id' => 'hazelnut', 'name' => 'Hazelnut', 'sizes' => ['5ml', '30ml']],
                ['id' => 'pumpkin-spice', 'name' => 'Pumpkin Spice', 'sizes' => ['5ml', '30ml']],
                ['id' => 'caramel', 'name' => 'Caramel', 'sizes' => ['5ml', '30ml']],
                ['id' => 'butterscotch', 'name' => 'Butterscotch', 'sizes' => ['5ml', '30ml']],
                ['id' => 'pandan', 'name' => 'Pandan', 'sizes' => ['5ml', '30ml']],
                ['id' => 'pistachio', 'name' => 'Pistachio', 'sizes' => ['5ml', '30ml']],
                ['id' => 'vanilla', 'name' => 'Vanilla', 'sizes' => ['5ml', '30ml']],
                ['id' => 'strawberry-kiwi', 'name' => 'Strawberry Kiwi', 'sizes' => ['30ml']],
                ['id' => 'lychee-bloom', 'name' => 'Lychee Bloom', 'sizes' => ['30ml']],
                ['id' => 'grapefruit', 'name' => 'Grapefruit', 'sizes' => ['30ml']],
                ['id' => 'peach-mango', 'name' => 'Peach Mango', 'sizes' => ['30ml']],
                ['id' => 'lemonade', 'name' => 'Lemonade', 'sizes' => ['30ml']],
                ['id' => 'cucumber-mint', 'name' => 'Cucumber Mint', 'sizes' => ['30ml']],
                ['id' => 'blue-raspberry', 'name' => 'Blue Raspberry', 'sizes' => ['30ml']],
            ],
        ],
        'maple-topping' => [
            'name' => 'ZERO Maple Topping',
            'sizes' => [
                ['id' => '550ml', 'label' => '550ml', 'price' => 149000],
            ],
            'options' => [
                ['id' => 'classic-maple', 'name' => 'Classic Maple'],
            ],
        ],
        'fiber-syrup' => [
            'name' => 'ZFIT Fiber Syrup',
            'sizes' => [
                ['id' => '250ml', 'label' => '250ml', 'price' => 129000],
            ],
            'options' => [
                ['id' => 'unflavored', 'name' => 'Unflavored'],
                ['id' => 'lemonade-pomegranate', 'name' => 'Lemonade Pomegranate'],
            ],
        ],
        'acvs' => [
            'name' => 'ZFIT ACVS',
            'sizes' => [
                ['id' => '100ml', 'label' => '100ml', 'price' => 29500],
                ['id' => '250ml', 'label' => '250ml', 'price' => 49500],
            ],
            'options' => [
                ['id' => 'apple-cider-vinegar-syrup', 'name' => 'Apple Cider Vinegar Syrup'],
            ],
        ],
    ];

    $rows = [];
    foreach ($products as $productSlug => $product) {
        foreach ($product['options'] as $option) {
            $allowedSizes = (array) ($option['sizes'] ?? array_column($product['sizes'], 'id'));
            foreach ($product['sizes'] as $size) {
                if (!in_array($size['id'], $allowedSizes, true)) {
                    continue;
                }
                $itemKey = $productSlug . ':' . $option['id'] . ':' . $size['id'];
                $rows[] = [
                    'item_key' => $itemKey,
                    'product_slug' => $productSlug,
                    'product_name' => $product['name'],
                    'option_id' => $option['id'],
                    'option_name' => $option['name'],
                    'size_id' => $size['id'],
                    'size_label' => $size['label'],
                    'fallback_sku' => zero_store_fallback_sku($productSlug, $option['id'], $size['id']),
                    'default_price' => number_format((float) $size['price'], 2, '.', ''),
                ];
            }
        }
    }

    return $rows;
}

function zero_store_ensure_schema(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS zero_store_items (
            item_key VARCHAR(160) NOT NULL PRIMARY KEY,
            product_slug VARCHAR(80) NOT NULL,
            product_name VARCHAR(160) NOT NULL,
            option_id VARCHAR(100) NOT NULL,
            option_name VARCHAR(160) NOT NULL,
            size_id VARCHAR(40) NOT NULL,
            size_label VARCHAR(80) NOT NULL,
            fallback_sku VARCHAR(120) NOT NULL,
            sku VARCHAR(12) NULL DEFAULT NULL,
            site_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            KEY idx_zero_store_items_sku (sku),
            KEY idx_zero_store_items_selector (product_slug, option_id, size_id),
            CONSTRAINT fk_zero_store_items_sku FOREIGN KEY (sku) REFERENCES sku_skus(sku) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS zero_store_discounts (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(160) NOT NULL,
            discount_type VARCHAR(20) NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            starts_on DATE NOT NULL,
            ends_on DATE NOT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS zero_store_discount_items (
            discount_id BIGINT UNSIGNED NOT NULL,
            item_key VARCHAR(160) NOT NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY (discount_id, item_key),
            KEY idx_zero_store_discount_item (item_key),
            CONSTRAINT fk_zero_store_discount_items_discount FOREIGN KEY (discount_id) REFERENCES zero_store_discounts(id) ON DELETE CASCADE,
            CONSTRAINT fk_zero_store_discount_items_item FOREIGN KEY (item_key) REFERENCES zero_store_items(item_key) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $indexStmt = $pdo->query(
        'SELECT INDEX_NAME, NON_UNIQUE
         FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = "zero_store_discount_items"
           AND INDEX_NAME IN ("uniq_zero_store_discount_item", "idx_zero_store_discount_item")'
    );
    $indexes = $indexStmt ? $indexStmt->fetchAll() : [];
    $hasLegacyUnique = false;
    $hasItemIndex = false;
    foreach ($indexes as $index) {
        if ((string) ($index['INDEX_NAME'] ?? '') === 'uniq_zero_store_discount_item') {
            $hasLegacyUnique = true;
        }
        if ((string) ($index['INDEX_NAME'] ?? '') === 'idx_zero_store_discount_item') {
            $hasItemIndex = true;
        }
    }
    if (!$hasItemIndex) {
        $pdo->exec('ALTER TABLE zero_store_discount_items ADD INDEX idx_zero_store_discount_item (item_key)');
    }
    if ($hasLegacyUnique) {
        $pdo->exec('ALTER TABLE zero_store_discount_items DROP INDEX uniq_zero_store_discount_item');
    }
}

function zero_store_size_id(mixed $volume, string $unitName): string
{
    $number = (float) $volume;
    $volumeLabel = abs($number - round($number)) < 0.01
        ? (string) (int) round($number)
        : rtrim(rtrim(number_format($number, 1, '.', ''), '0'), '.');
    $unit = strtolower(preg_replace('/\s+/', '', $unitName) ?? '');
    if (str_contains($unit, 'ml') || str_contains($unit, 'milli')) {
        $unit = 'ml';
    }
    return $volumeLabel . $unit;
}

function zero_store_product_slug(string $productName, string $brandName = ''): string
{
    $name = zero_store_normalize_name($brandName . ' ' . $productName);
    if (str_contains($name, 'fiber')) {
        return 'fiber-syrup';
    }
    if (str_contains($name, 'acvs') || str_contains($name, 'apple cider')) {
        return 'acvs';
    }
    if (str_contains($name, 'drop')) {
        return 'drops';
    }
    if (str_contains($name, 'maple') && str_contains($name, 'topping')) {
        return 'maple-topping';
    }
    return 'syrup';
}

function zero_store_option_id(string $productSlug, string $flavorName): string
{
    if ($productSlug === 'maple-topping') {
        return 'classic-maple';
    }
    if ($productSlug === 'acvs') {
        return 'apple-cider-vinegar-syrup';
    }
    $normalized = trim(zero_store_normalize_name($flavorName));
    if ($normalized === '' || $normalized === 'unflavored' || $normalized === 'plain') {
        return $productSlug === 'fiber-syrup' ? 'unflavored' : 'plain';
    }
    return zero_store_slug($flavorName);
}

function zero_store_sku_index(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT
            s.sku,
            s.tag,
            b.name AS brand_name,
            p.name AS product_name,
            f.name AS flavor_name,
            u.name AS unit_name,
            s.volume,
            s.astra,
            s.current_stock,
            s.stock_trigger,
            s.inventory_mode,
            s.skip_scan,
            s.cogs,
            s.updated_at
         FROM sku_skus s
         INNER JOIN sku_brands b ON b.id = s.brand_id
         INNER JOIN sku_products p ON p.id = s.product_id
         INNER JOIN sku_flavors f ON f.id = s.flavor_id
         INNER JOIN sku_units u ON u.id = s.unit_id'
    );

    $bySelector = [];
    $bySku = [];
    foreach ($stmt->fetchAll() as $row) {
        $brandName = zero_store_normalize_name((string) ($row['brand_name'] ?? ''));
        $productName = zero_store_normalize_name((string) ($row['product_name'] ?? ''));
        if (!str_contains($brandName, 'zero')
            && !str_contains($productName, 'zero')
            && !str_contains($brandName, 'zfit')
            && !str_contains($productName, 'zfit')
            && !str_contains($productName, 'fiber')
            && !str_contains($productName, 'acvs')
            && !str_contains($productName, 'apple cider')
        ) {
            continue;
        }

        $productSlug = zero_store_product_slug((string) ($row['product_name'] ?? ''), (string) ($row['brand_name'] ?? ''));
        $optionId = zero_store_option_id($productSlug, (string) ($row['flavor_name'] ?? ''));
        $sizeId = zero_store_size_id($row['volume'] ?? 0, (string) ($row['unit_name'] ?? ''));
        $record = [
            'sku' => (string) ($row['sku'] ?? ''),
            'tag' => (string) ($row['tag'] ?? ''),
            'product_slug' => $productSlug,
            'option_id' => $optionId,
            'size_id' => $sizeId,
            'stock' => (int) ($row['current_stock'] ?? 0),
            'stock_trigger' => (int) ($row['stock_trigger'] ?? 0),
            'inventory_mode' => (string) ($row['inventory_mode'] ?? ''),
            'skip_scan' => (int) ($row['skip_scan'] ?? 0) === 1,
            'cogs' => number_format((float) ($row['cogs'] ?? 0), 2, '.', ''),
            'updated_at' => (string) ($row['updated_at'] ?? ''),
        ];
        $sku = $record['sku'];
        if ($sku === '') {
            continue;
        }
        $bySku[$sku] = $record;
        $selectorKey = $productSlug . ':' . $optionId . ':' . $sizeId;
        if (!isset($bySelector[$selectorKey])) {
            $bySelector[$selectorKey] = $record;
        }
    }

    return ['by_selector' => $bySelector, 'by_sku' => $bySku];
}

function zero_store_seed_items(PDO $pdo): void
{
    $now = gmdate('Y-m-d H:i:s');
    $skuIndex = zero_store_sku_index($pdo);
    $stmt = $pdo->prepare(
        'INSERT INTO zero_store_items (
            item_key, product_slug, product_name, option_id, option_name, size_id, size_label,
            fallback_sku, sku, site_price, is_active, created_at, updated_at
        ) VALUES (
            :item_key, :product_slug, :product_name, :option_id, :option_name, :size_id, :size_label,
            :fallback_sku, :sku, :site_price, 1, :created_at, :updated_at
        )
        ON DUPLICATE KEY UPDATE
            product_slug = VALUES(product_slug),
            product_name = VALUES(product_name),
            option_id = VALUES(option_id),
            option_name = VALUES(option_name),
            size_id = VALUES(size_id),
            size_label = VALUES(size_label),
            fallback_sku = VALUES(fallback_sku),
            sku = COALESCE(zero_store_items.sku, VALUES(sku)),
            site_price = IF(zero_store_items.site_price <= 0, VALUES(site_price), zero_store_items.site_price),
            updated_at = VALUES(updated_at)'
    );

    foreach (zero_store_website_items() as $item) {
        $matchedSku = (string) ($skuIndex['by_selector'][$item['item_key']]['sku'] ?? '');
        $stmt->execute([
            ':item_key' => $item['item_key'],
            ':product_slug' => $item['product_slug'],
            ':product_name' => $item['product_name'],
            ':option_id' => $item['option_id'],
            ':option_name' => $item['option_name'],
            ':size_id' => $item['size_id'],
            ':size_label' => $item['size_label'],
            ':fallback_sku' => $item['fallback_sku'],
            ':sku' => $matchedSku !== '' ? $matchedSku : null,
            ':site_price' => $item['default_price'],
            ':created_at' => $now,
            ':updated_at' => $now,
        ]);
    }
}

function zero_store_discounts(PDO $pdo): array
{
    $discounts = $pdo->query(
        'SELECT d.id, d.name, d.discount_type, d.amount, d.starts_on, d.ends_on, d.is_active, d.updated_at,
                GROUP_CONCAT(di.item_key ORDER BY di.item_key SEPARATOR ",") AS item_list
         FROM zero_store_discounts d
         LEFT JOIN zero_store_discount_items di ON di.discount_id = d.id
         GROUP BY d.id
         ORDER BY d.starts_on DESC, d.id DESC'
    )->fetchAll();

    foreach ($discounts as &$discount) {
        $discount['amount'] = number_format((float) ($discount['amount'] ?? 0), 2, '.', '');
        $discount['item_keys'] = trim((string) ($discount['item_list'] ?? '')) !== ''
            ? explode(',', (string) $discount['item_list'])
            : [];
        $discount['skus'] = $discount['item_keys'];
        unset($discount['item_list']);
    }
    unset($discount);

    return $discounts;
}

function zero_store_load(PDO $pdo): array
{
    zero_store_ensure_schema($pdo);
    zero_store_seed_items($pdo);

    $skuIndex = zero_store_sku_index($pdo);
    $items = [];
    $stmt = $pdo->query('SELECT item_key, product_slug, product_name, option_id, option_name, size_id, size_label, fallback_sku, sku, site_price, is_active, updated_at FROM zero_store_items ORDER BY product_slug, option_name, size_id');
    foreach ($stmt->fetchAll() as $row) {
        $sku = (string) ($row['sku'] ?? '');
        $skuRow = $sku !== '' ? ($skuIndex['by_sku'][$sku] ?? null) : null;
        $items[] = [
            'item_key' => (string) ($row['item_key'] ?? ''),
            'sku' => $sku,
            'sku_code' => $sku !== '' ? $sku : (string) ($row['fallback_sku'] ?? ''),
            'fallback_sku' => (string) ($row['fallback_sku'] ?? ''),
            'sku_linked' => is_array($skuRow),
            'tag' => is_array($skuRow) ? (string) ($skuRow['tag'] ?? '') : '',
            'product_slug' => (string) ($row['product_slug'] ?? ''),
            'product_name' => (string) ($row['product_name'] ?? ''),
            'option_id' => (string) ($row['option_id'] ?? ''),
            'option_name' => (string) ($row['option_name'] ?? ''),
            'size_id' => (string) ($row['size_id'] ?? ''),
            'size_label' => (string) ($row['size_label'] ?? ''),
            'stock' => is_array($skuRow) ? (int) ($skuRow['stock'] ?? 0) : null,
            'stock_trigger' => is_array($skuRow) ? (int) ($skuRow['stock_trigger'] ?? 0) : null,
            'inventory_mode' => is_array($skuRow) ? (string) ($skuRow['inventory_mode'] ?? '') : '',
            'skip_scan' => is_array($skuRow) && (bool) ($skuRow['skip_scan'] ?? false),
            'cogs' => is_array($skuRow) ? number_format((float) ($skuRow['cogs'] ?? 0), 2, '.', '') : null,
            'price' => number_format((float) ($row['site_price'] ?? 0), 2, '.', ''),
            'site_price' => number_format((float) ($row['site_price'] ?? 0), 2, '.', ''),
            'is_active' => (int) ($row['is_active'] ?? 0),
            'updated_at' => (string) ($row['updated_at'] ?? ''),
        ];
    }

    return [
        'ok' => true,
        'items' => $items,
        'discounts' => zero_store_discounts($pdo),
        'meta' => ['generated_at' => gmdate(DATE_ATOM)],
    ];
}

function zero_store_catalog(PDO $pdo): array
{
    $data = zero_store_load($pdo);
    $discountByItem = [];
    $today = zero_store_today_wib();
    foreach ($data['discounts'] as $discount) {
        if ((int) ($discount['is_active'] ?? 0) !== 1) {
            continue;
        }
        if ((string) ($discount['starts_on'] ?? '') > $today || (string) ($discount['ends_on'] ?? '') < $today) {
            continue;
        }
        foreach ((array) ($discount['item_keys'] ?? []) as $itemKey) {
            $discountByItem[(string) $itemKey] = $discount;
        }
    }

    $rows = [];
    foreach ($data['items'] as $item) {
        $itemKey = (string) ($item['item_key'] ?? '');
        $price = (float) ($item['price'] ?? 0);
        $discount = $discountByItem[$itemKey] ?? null;
        $salePrice = $price;
        if (is_array($discount)) {
            $amount = (float) ($discount['amount'] ?? 0);
            $salePrice = ($discount['discount_type'] ?? '') === 'percent'
                ? $price - ($price * ($amount / 100))
                : $price - $amount;
        }
        $stock = $item['stock'];
        $linked = !empty($item['sku_linked']);

        $rows[] = [
            'item_key' => $itemKey,
            'sku_code' => (string) ($item['sku_code'] ?? ''),
            'sku' => (string) ($item['sku_code'] ?? ''),
            'sku_linked' => $linked,
            'tag' => (string) ($item['tag'] ?? ''),
            'product_slug' => (string) ($item['product_slug'] ?? ''),
            'product_name' => (string) ($item['product_name'] ?? ''),
            'option_id' => (string) ($item['option_id'] ?? ''),
            'option_name' => (string) ($item['option_name'] ?? ''),
            'size_id' => (string) ($item['size_id'] ?? ''),
            'size_label' => (string) ($item['size_label'] ?? ''),
            'stock' => $linked ? (int) $stock : null,
            'cogs' => $linked ? (float) ($item['cogs'] ?? 0) : null,
            'price' => (int) round($price),
            'sale_price' => max(0, (int) round($salePrice)),
            'status' => (int) ($item['is_active'] ?? 0) === 1 ? 'active' : 'inactive',
            'available' => (int) ($item['is_active'] ?? 0) === 1 && (!$linked || (int) $stock > 0),
            'discount' => is_array($discount) ? [
                'id' => (int) ($discount['id'] ?? 0),
                'type' => (string) ($discount['discount_type'] ?? ''),
                'amount' => (float) ($discount['amount'] ?? 0),
                'starts_at' => (string) ($discount['starts_on'] ?? ''),
                'ends_at' => (string) ($discount['ends_on'] ?? ''),
                'label' => (string) ($discount['name'] ?? ''),
            ] : null,
            'updated_at' => (string) ($item['updated_at'] ?? ''),
        ];
    }

    return ['data' => $rows, 'meta' => ['generated_at' => gmdate(DATE_ATOM)]];
}

try {
    $pdo = jg_sku_db();
    zero_store_ensure_schema($pdo);
    $action = strtolower(trim((string) ($_GET['action'] ?? 'list')));
    if ($action === 'catalog') {
        zero_store_json(zero_store_catalog($pdo));
    }

    jg_admin_require_auth_json();

    $body = zero_store_body();
    $now = gmdate('Y-m-d H:i:s');
    zero_store_seed_items($pdo);

    if ($action === 'list') {
        zero_store_json(zero_store_load($pdo));
    }

    if ($action === 'save_item') {
        $itemKey = zero_store_item_key($body['item_key'] ?? '');
        $sku = zero_store_sku($body['sku'] ?? '', false);
        if ($sku !== '') {
            $skuExists = $pdo->prepare('SELECT COUNT(*) FROM sku_skus WHERE sku = :sku');
            $skuExists->execute([':sku' => $sku]);
            if ((int) $skuExists->fetchColumn() !== 1) {
                zero_store_json(['error' => 'That SKU does not exist in the SKU DB.'], 422);
            }
        }

        $stmt = $pdo->prepare(
            'UPDATE zero_store_items
             SET sku = :sku,
                 site_price = :site_price,
                 is_active = :is_active,
                 updated_at = :updated_at
             WHERE item_key = :item_key'
        );
        $stmt->execute([
            ':item_key' => $itemKey,
            ':sku' => $sku !== '' ? $sku : null,
            ':site_price' => zero_store_money($body['price'] ?? 0, 'Website price'),
            ':is_active' => !empty($body['is_active']) ? 1 : 0,
            ':updated_at' => $now,
        ]);
        zero_store_json(zero_store_load($pdo));
    }

    if ($action === 'save_discount') {
        $id = max(0, (int) ($body['id'] ?? 0));
        $type = strtolower(zero_store_text($body['discount_type'] ?? 'fixed', 'Discount type', 20));
        if (!in_array($type, ['fixed', 'percent'], true)) {
            zero_store_json(['error' => 'Discount type must be fixed or percent.'], 422);
        }
        $amount = zero_store_money($body['amount'] ?? 0, 'Discount amount');
        if ($type === 'percent' && (float) $amount > 100) {
            zero_store_json(['error' => 'Percent discounts cannot exceed 100.'], 422);
        }
        $startsOn = zero_store_date($body['starts_on'] ?? '', 'Start date');
        $endsOn = zero_store_date($body['ends_on'] ?? '', 'End date');
        if ($startsOn > $endsOn) {
            zero_store_json(['error' => 'End date must be on or after start date.'], 422);
        }
        $itemKeys = array_values(array_unique(array_map('zero_store_item_key', (array) ($body['item_keys'] ?? $body['skus'] ?? []))));
        if ($itemKeys === []) {
            zero_store_json(['error' => 'Choose at least one item for the discount.'], 422);
        }

        $placeholders = implode(',', array_fill(0, count($itemKeys), '?'));
        $itemCountStmt = $pdo->prepare('SELECT COUNT(*) FROM zero_store_items WHERE item_key IN (' . $placeholders . ')');
        $itemCountStmt->execute($itemKeys);
        if ((int) $itemCountStmt->fetchColumn() !== count($itemKeys)) {
            zero_store_json(['error' => 'Every discount item must exist in Items For Sale.'], 422);
        }

        $conflictSql = 'SELECT DISTINCT di.item_key
                        FROM zero_store_discount_items di
                        INNER JOIN zero_store_discounts d ON d.id = di.discount_id
                        WHERE di.item_key IN (' . $placeholders . ')
                          AND d.is_active = 1
                          AND d.starts_on <= ?
                          AND d.ends_on >= ?';
        $params = $itemKeys;
        $params[] = $endsOn;
        $params[] = $startsOn;
        if ($id > 0) {
            $conflictSql .= ' AND di.discount_id <> ?';
            $params[] = $id;
        }
        $conflictStmt = $pdo->prepare($conflictSql);
        $conflictStmt->execute($params);
        $conflicts = $conflictStmt->fetchAll(PDO::FETCH_COLUMN);
        if ($conflicts !== []) {
            zero_store_json(['error' => 'An item can only belong to one active discount during overlapping dates. Conflicts: ' . implode(', ', $conflicts)], 409);
        }

        $pdo->beginTransaction();
        if ($id > 0) {
            $stmt = $pdo->prepare('UPDATE zero_store_discounts SET name = :name, discount_type = :discount_type, amount = :amount, starts_on = :starts_on, ends_on = :ends_on, is_active = :is_active, updated_at = :updated_at WHERE id = :id');
            $stmt->execute([
                ':id' => $id,
                ':name' => zero_store_text($body['name'] ?? '', 'Discount name'),
                ':discount_type' => $type,
                ':amount' => $amount,
                ':starts_on' => $startsOn,
                ':ends_on' => $endsOn,
                ':is_active' => !empty($body['is_active']) ? 1 : 0,
                ':updated_at' => $now,
            ]);
            $pdo->prepare('DELETE FROM zero_store_discount_items WHERE discount_id = ?')->execute([$id]);
        } else {
            $stmt = $pdo->prepare('INSERT INTO zero_store_discounts (name, discount_type, amount, starts_on, ends_on, is_active, created_at, updated_at) VALUES (:name, :discount_type, :amount, :starts_on, :ends_on, :is_active, :created_at, :updated_at)');
            $stmt->execute([
                ':name' => zero_store_text($body['name'] ?? '', 'Discount name'),
                ':discount_type' => $type,
                ':amount' => $amount,
                ':starts_on' => $startsOn,
                ':ends_on' => $endsOn,
                ':is_active' => !empty($body['is_active']) ? 1 : 0,
                ':created_at' => $now,
                ':updated_at' => $now,
            ]);
            $id = (int) $pdo->lastInsertId();
        }
        $memberStmt = $pdo->prepare('INSERT INTO zero_store_discount_items (discount_id, item_key, created_at) VALUES (:discount_id, :item_key, :created_at)');
        foreach ($itemKeys as $itemKey) {
            $memberStmt->execute([':discount_id' => $id, ':item_key' => $itemKey, ':created_at' => $now]);
        }
        $pdo->commit();
        zero_store_json(zero_store_load($pdo));
    }

    if ($action === 'delete_discount') {
        $id = max(0, (int) ($body['id'] ?? 0));
        $pdo->prepare('DELETE FROM zero_store_discounts WHERE id = ?')->execute([$id]);
        zero_store_json(zero_store_load($pdo));
    }

    zero_store_json(['error' => 'Unknown action.'], 404);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    zero_store_json(['error' => $error->getMessage()], 500);
}
