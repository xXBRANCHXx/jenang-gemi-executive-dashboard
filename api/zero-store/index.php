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

function zero_store_sku(mixed $value): string
{
    $sku = strtoupper(zero_store_text($value, 'SKU', 20));
    if (!preg_match('/^[A-Z0-9]{12}$/', $sku)) {
        zero_store_json(['error' => 'SKU must be a 12 character SKU DB code.'], 422);
    }
    return $sku;
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

function zero_store_option_id(string $productSlug, string $flavorName): string
{
    if ($productSlug === 'maple-topping') {
        return 'classic-maple';
    }

    $normalized = trim(zero_store_normalize_name($flavorName));
    if ($normalized === '' || $normalized === 'unflavored' || $normalized === 'plain') {
        return 'plain';
    }

    return zero_store_slug($flavorName);
}

function zero_store_product_slug(string $productName): string
{
    $name = zero_store_normalize_name($productName);
    if (str_contains($name, 'drop')) {
        return 'drops';
    }
    if (str_contains($name, 'maple') && str_contains($name, 'topping')) {
        return 'maple-topping';
    }
    return 'syrup';
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

function zero_store_size_label(mixed $volume, string $unitName): string
{
    $id = zero_store_size_id($volume, $unitName);
    return preg_replace('/([a-z]+)$/', '$1', $id) ?? $id;
}

function zero_store_ensure_schema(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS zero_store_sku_settings (
            sku VARCHAR(12) NOT NULL PRIMARY KEY,
            site_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            CONSTRAINT fk_zero_store_sku_settings_sku FOREIGN KEY (sku) REFERENCES sku_skus(sku) ON DELETE CASCADE
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
        'CREATE TABLE IF NOT EXISTS zero_store_discount_skus (
            discount_id BIGINT UNSIGNED NOT NULL,
            sku VARCHAR(12) NOT NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY (discount_id, sku),
            UNIQUE KEY uniq_zero_store_discount_sku (sku),
            CONSTRAINT fk_zero_store_discount_skus_discount FOREIGN KEY (discount_id) REFERENCES zero_store_discounts(id) ON DELETE CASCADE,
            CONSTRAINT fk_zero_store_discount_skus_sku FOREIGN KEY (sku) REFERENCES sku_skus(sku) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function zero_store_default_price(string $productSlug, string $sizeId): string
{
    $prices = [
        'syrup' => ['50ml' => 10000, '250ml' => 39000, '550ml' => 69000],
        'drops' => ['5ml' => 20000, '10ml' => 30000, '30ml' => 49000],
        'maple-topping' => ['550ml' => 149000],
    ];

    return number_format((float) ($prices[$productSlug][$sizeId] ?? 0), 2, '.', '');
}

function zero_store_is_zero_row(array $row): bool
{
    $brandName = zero_store_normalize_name((string) ($row['brand_name'] ?? ''));
    $productName = zero_store_normalize_name((string) ($row['product_name'] ?? ''));
    $isZeroBrand = str_contains($brandName, 'zero') || str_contains($productName, 'zero');
    $isWebsiteProduct = str_contains($productName, 'syrup')
        || str_contains($productName, 'drop')
        || str_contains($productName, 'maple')
        || str_contains($productName, 'topping');
    return $isZeroBrand && $isWebsiteProduct;
}

function zero_store_sku_rows(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT
            s.sku,
            s.tag,
            s.brand_id,
            b.name AS brand_name,
            s.product_id,
            p.name AS product_name,
            s.flavor_id,
            f.name AS flavor_name,
            s.unit_id,
            u.name AS unit_name,
            s.volume,
            s.astra,
            s.current_stock,
            s.stock_trigger,
            s.inventory_mode,
            s.skip_scan,
            s.cogs,
            s.updated_at,
            st.site_price,
            st.is_active AS site_is_active,
            st.updated_at AS site_updated_at
         FROM sku_skus s
         INNER JOIN sku_brands b ON b.id = s.brand_id
         INNER JOIN sku_products p ON p.id = s.product_id
         INNER JOIN sku_flavors f ON f.id = s.flavor_id
         INNER JOIN sku_units u ON u.id = s.unit_id
         LEFT JOIN zero_store_sku_settings st ON st.sku = s.sku
         ORDER BY p.name, f.name, s.volume, s.sku'
    );

    $items = [];
    foreach ($stmt->fetchAll() as $row) {
        if (!zero_store_is_zero_row($row)) {
            continue;
        }

        $productSlug = zero_store_product_slug((string) ($row['product_name'] ?? ''));
        $sizeId = zero_store_size_id($row['volume'] ?? 0, (string) ($row['unit_name'] ?? ''));
        $sitePrice = $row['site_price'] === null
            ? zero_store_default_price($productSlug, $sizeId)
            : number_format((float) $row['site_price'], 2, '.', '');
        $optionId = zero_store_option_id($productSlug, (string) ($row['flavor_name'] ?? ''));

        $items[] = [
            'sku' => (string) ($row['sku'] ?? ''),
            'tag' => (string) ($row['tag'] ?? ''),
            'brand_name' => (string) ($row['brand_name'] ?? ''),
            'product_slug' => $productSlug,
            'product_name' => (string) ($row['product_name'] ?? ''),
            'option_id' => $optionId,
            'option_name' => $productSlug === 'maple-topping' ? 'Classic Maple' : (string) ($row['flavor_name'] ?? ''),
            'flavor_name' => (string) ($row['flavor_name'] ?? ''),
            'size_id' => $sizeId,
            'size_label' => zero_store_size_label($row['volume'] ?? 0, (string) ($row['unit_name'] ?? '')),
            'volume' => number_format((float) ($row['volume'] ?? 0), 1, '.', ''),
            'astra' => number_format((float) ($row['astra'] ?? $row['volume'] ?? 0), 2, '.', ''),
            'stock' => (int) ($row['current_stock'] ?? 0),
            'stock_trigger' => (int) ($row['stock_trigger'] ?? 0),
            'inventory_mode' => (string) ($row['inventory_mode'] ?? ''),
            'skip_scan' => (int) ($row['skip_scan'] ?? 0) === 1,
            'cogs' => number_format((float) ($row['cogs'] ?? 0), 2, '.', ''),
            'price' => $sitePrice,
            'site_price' => $sitePrice,
            'is_active' => $row['site_is_active'] === null ? 1 : (int) $row['site_is_active'],
            'updated_at' => (string) ($row['site_updated_at'] ?? $row['updated_at'] ?? ''),
        ];
    }

    return $items;
}

function zero_store_discounts(PDO $pdo): array
{
    $discounts = $pdo->query(
        'SELECT d.id, d.name, d.discount_type, d.amount, d.starts_on, d.ends_on, d.is_active, d.updated_at,
                GROUP_CONCAT(ds.sku ORDER BY ds.sku SEPARATOR ",") AS sku_list
         FROM zero_store_discounts d
         LEFT JOIN zero_store_discount_skus ds ON ds.discount_id = d.id
         GROUP BY d.id
         ORDER BY d.starts_on DESC, d.id DESC'
    )->fetchAll();

    foreach ($discounts as &$discount) {
        $discount['amount'] = number_format((float) ($discount['amount'] ?? 0), 2, '.', '');
        $discount['skus'] = trim((string) ($discount['sku_list'] ?? '')) !== ''
            ? explode(',', (string) $discount['sku_list'])
            : [];
        unset($discount['sku_list']);
    }
    unset($discount);

    return $discounts;
}

function zero_store_load(PDO $pdo): array
{
    zero_store_ensure_schema($pdo);
    return [
        'ok' => true,
        'items' => zero_store_sku_rows($pdo),
        'discounts' => zero_store_discounts($pdo),
        'meta' => ['generated_at' => gmdate(DATE_ATOM)],
    ];
}

function zero_store_catalog(PDO $pdo): array
{
    $data = zero_store_load($pdo);
    $discountBySku = [];
    $today = gmdate('Y-m-d');
    foreach ($data['discounts'] as $discount) {
        if ((int) ($discount['is_active'] ?? 0) !== 1) {
            continue;
        }
        if ((string) ($discount['starts_on'] ?? '') > $today || (string) ($discount['ends_on'] ?? '') < $today) {
            continue;
        }
        foreach ((array) ($discount['skus'] ?? []) as $sku) {
            $discountBySku[(string) $sku] = $discount;
        }
    }

    $rows = [];
    foreach ($data['items'] as $item) {
        $sku = (string) ($item['sku'] ?? '');
        $price = (float) ($item['price'] ?? 0);
        $discount = $discountBySku[$sku] ?? null;
        $salePrice = $price;
        if (is_array($discount)) {
            $amount = (float) ($discount['amount'] ?? 0);
            $salePrice = ($discount['discount_type'] ?? '') === 'percent'
                ? $price - ($price * ($amount / 100))
                : $price - $amount;
        }

        $rows[] = [
            'sku_code' => $sku,
            'sku' => $sku,
            'tag' => (string) ($item['tag'] ?? ''),
            'product_slug' => (string) ($item['product_slug'] ?? ''),
            'product_name' => (string) ($item['product_name'] ?? ''),
            'option_id' => (string) ($item['option_id'] ?? ''),
            'option_name' => (string) ($item['option_name'] ?? ''),
            'size_id' => (string) ($item['size_id'] ?? ''),
            'size_label' => (string) ($item['size_label'] ?? ''),
            'stock' => (int) ($item['stock'] ?? 0),
            'cogs' => (float) ($item['cogs'] ?? 0),
            'price' => (int) round($price),
            'sale_price' => max(0, (int) round($salePrice)),
            'status' => (int) ($item['is_active'] ?? 0) === 1 ? 'active' : 'inactive',
            'available' => (int) ($item['is_active'] ?? 0) === 1 && (int) ($item['stock'] ?? 0) > 0,
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

    if ($action === 'list') {
        zero_store_json(zero_store_load($pdo));
    }

    if ($action === 'save_item') {
        $sku = zero_store_sku($body['sku'] ?? '');
        $skuExists = $pdo->prepare('SELECT COUNT(*) FROM sku_skus WHERE sku = :sku');
        $skuExists->execute([':sku' => $sku]);
        if ((int) $skuExists->fetchColumn() !== 1) {
            zero_store_json(['error' => 'That SKU does not exist in the SKU DB.'], 422);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO zero_store_sku_settings (sku, site_price, is_active, created_at, updated_at)
             VALUES (:sku, :site_price, :is_active, :created_at, :updated_at)
             ON DUPLICATE KEY UPDATE
                site_price = VALUES(site_price),
                is_active = VALUES(is_active),
                updated_at = VALUES(updated_at)'
        );
        $stmt->execute([
            ':sku' => $sku,
            ':site_price' => zero_store_money($body['price'] ?? 0, 'Website price'),
            ':is_active' => !empty($body['is_active']) ? 1 : 0,
            ':created_at' => $now,
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
        $skus = array_values(array_unique(array_map('zero_store_sku', (array) ($body['skus'] ?? []))));
        if ($skus === []) {
            zero_store_json(['error' => 'Choose at least one SKU for the discount.'], 422);
        }

        $placeholders = implode(',', array_fill(0, count($skus), '?'));
        $itemCountStmt = $pdo->prepare('SELECT COUNT(*) FROM sku_skus WHERE sku IN (' . $placeholders . ')');
        $itemCountStmt->execute($skus);
        if ((int) $itemCountStmt->fetchColumn() !== count($skus)) {
            zero_store_json(['error' => 'Every discount SKU must exist in the SKU DB.'], 422);
        }

        $zeroSkuIndex = [];
        foreach (zero_store_sku_rows($pdo) as $item) {
            $zeroSkuIndex[(string) ($item['sku'] ?? '')] = true;
        }
        foreach ($skus as $sku) {
            if (!isset($zeroSkuIndex[$sku])) {
                zero_store_json(['error' => 'Discount SKUs must be ZERO website SKUs.'], 422);
            }
        }

        $conflictSql = 'SELECT sku FROM zero_store_discount_skus WHERE sku IN (' . $placeholders . ')';
        $params = $skus;
        if ($id > 0) {
            $conflictSql .= ' AND discount_id <> ?';
            $params[] = $id;
        }
        $conflictStmt = $pdo->prepare($conflictSql);
        $conflictStmt->execute($params);
        $conflicts = $conflictStmt->fetchAll(PDO::FETCH_COLUMN);
        if ($conflicts !== []) {
            zero_store_json(['error' => 'A SKU can only belong to one discount. Conflicts: ' . implode(', ', $conflicts)], 409);
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
            $pdo->prepare('DELETE FROM zero_store_discount_skus WHERE discount_id = ?')->execute([$id]);
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
        $memberStmt = $pdo->prepare('INSERT INTO zero_store_discount_skus (discount_id, sku, created_at) VALUES (:discount_id, :sku, :created_at)');
        foreach ($skus as $sku) {
            $memberStmt->execute([':discount_id' => $id, ':sku' => $sku, ':created_at' => $now]);
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
