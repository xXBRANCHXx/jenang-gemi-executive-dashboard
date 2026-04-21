<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/sku-db-bootstrap.php';

header('Content-Type: application/json; charset=utf-8');

function jg_sku_fail(string $message, int $status = 422): void
{
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

function jg_sku_request_body(): array
{
    $raw = file_get_contents('php://input');
    if (!is_string($raw) || trim($raw) === '') {
        return [];
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function jg_sku_normalize_name(string $value, int $maxLength = 120): string
{
    $normalized = trim(preg_replace('/\s+/', ' ', $value) ?? '');
    if ($normalized === '') {
        jg_sku_fail('Name is required.');
    }

    if (mb_strlen($normalized) > $maxLength) {
        jg_sku_fail('Name is too long.');
    }

    return $normalized;
}

function jg_sku_slug(string $value): string
{
    $value = strtolower(trim($value));
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
    $value = trim($value, '-');
    return $value !== '' ? $value : 'item';
}

function jg_sku_volume_digits(string $value): string
{
    $volume = trim($value);
    if (!preg_match('/^\d{1,3}(\.\d)?$/', $volume)) {
        jg_sku_fail('Volume must use up to three whole digits and up to one decimal place.');
    }

    $scaled = (int) round(((float) $volume) * 10);
    if ($scaled < 1 || $scaled > 9999) {
        jg_sku_fail('Volume must be between 0.1 and 999.9.');
    }

    return str_pad((string) $scaled, 4, '0', STR_PAD_LEFT);
}

function jg_sku_volume_decimal(string $value): string
{
    jg_sku_volume_digits($value);
    return number_format((float) $value, 1, '.', '');
}

function jg_sku_tag(string $value): string
{
    $tag = strtoupper(trim($value));
    if ($tag === '' || strlen($tag) > 50) {
        jg_sku_fail('TAG must be 1 to 50 characters.');
    }

    if (!preg_match('/^[A-Z0-9_]+$/', $tag)) {
        jg_sku_fail('TAG may only use A-Z, 0-9, and underscore characters.');
    }

    if (str_ends_with($tag, '_')) {
        jg_sku_fail('TAG may not end in an underscore.');
    }

    if (preg_match('/\d$/', $tag)) {
        jg_sku_fail('TAG may not end in a number.');
    }

    return $tag;
}

function jg_sku_integer(mixed $value, string $label): int
{
    if ($value === '' || $value === null || !is_numeric($value)) {
        jg_sku_fail($label . ' must be numeric.');
    }

    $number = (int) round((float) $value);
    if ($number < 0) {
        jg_sku_fail($label . ' cannot be negative.');
    }

    return $number;
}

function jg_sku_money(mixed $value, string $label = 'COGS'): string
{
    if ($value === '' || $value === null || !is_numeric($value)) {
        jg_sku_fail($label . ' must be numeric.');
    }

    $amount = round((float) $value, 2);
    if ($amount < 0) {
        jg_sku_fail($label . ' cannot be negative.');
    }

    return number_format($amount, 2, '.', '');
}

function jg_sku_bump_patch(string $version): string
{
    if (!preg_match('/^(\d+)\.(\d{2})\.(\d{2})$/', $version, $matches)) {
        return '1.00.00';
    }

    $major = (int) $matches[1];
    $middle = (int) $matches[2];
    $patch = (int) $matches[3] + 1;
    if ($patch > 99) {
        $patch = 0;
        $middle += 1;
    }

    return sprintf('%d.%02d.%02d', $major, $middle, $patch);
}

function jg_sku_next_code(PDO $pdo, string $tableName, ?string $scopeColumn = null, ?string $scopeValue = null, int $start = 1): string
{
    $sql = 'SELECT MAX(CAST(code AS UNSIGNED)) FROM ' . $tableName;
    $params = [];
    if ($scopeColumn !== null && $scopeValue !== null) {
        $sql .= ' WHERE ' . $scopeColumn . ' = :scope_value';
        $params[':scope_value'] = $scopeValue;
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $maxCode = (int) $stmt->fetchColumn();
    $next = max($start, $maxCode + 1);

    if ($next > 99) {
        jg_sku_fail('The list is full. Maximum is 99 items.');
    }

    return str_pad((string) $next, 2, '0', STR_PAD_LEFT);
}

function jg_sku_meta_version(PDO $pdo): string
{
    $stmt = $pdo->query('SELECT meta_value FROM sku_meta WHERE meta_key = "version" LIMIT 1');
    $version = $stmt->fetchColumn();
    return is_string($version) && $version !== '' ? $version : '1.00.00';
}

function jg_sku_touch_version(PDO $pdo): string
{
    $current = jg_sku_meta_version($pdo);
    $next = jg_sku_bump_patch($current);
    $stmt = $pdo->prepare('UPDATE sku_meta SET meta_value = :meta_value, updated_at = :updated_at WHERE meta_key = "version"');
    $stmt->execute([
        ':meta_value' => $next,
        ':updated_at' => jg_sku_now(),
    ]);
    return $next;
}

function jg_sku_get_brand(PDO $pdo, string $brandId): array
{
    $stmt = $pdo->prepare('SELECT id, name, code, created_at FROM sku_brands WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $brandId]);
    $brand = $stmt->fetch();
    if (!is_array($brand)) {
        jg_sku_fail('Brand not found.', 404);
    }

    return $brand;
}

function jg_sku_get_unit(PDO $pdo, string $unitId): array
{
    $stmt = $pdo->prepare('SELECT id, name, code, created_at FROM sku_units WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $unitId]);
    $unit = $stmt->fetch();
    if (!is_array($unit)) {
        jg_sku_fail('Unit not found.', 404);
    }

    return $unit;
}

function jg_sku_get_flavor(PDO $pdo, string $brandId, string $flavorId): array
{
    $stmt = $pdo->prepare('SELECT id, brand_id, name, code, created_at FROM sku_flavors WHERE id = :id AND brand_id = :brand_id LIMIT 1');
    $stmt->execute([
        ':id' => $flavorId,
        ':brand_id' => $brandId,
    ]);
    $flavor = $stmt->fetch();
    if (!is_array($flavor)) {
        jg_sku_fail('Flavor not found.', 404);
    }

    return $flavor;
}

function jg_sku_get_product(PDO $pdo, string $brandId, string $productId): array
{
    $stmt = $pdo->prepare('SELECT id, brand_id, name, code, created_at FROM sku_products WHERE id = :id AND brand_id = :brand_id LIMIT 1');
    $stmt->execute([
        ':id' => $productId,
        ':brand_id' => $brandId,
    ]);
    $product = $stmt->fetch();
    if (!is_array($product)) {
        jg_sku_fail('Product not found.', 404);
    }

    return $product;
}

function jg_sku_compose_code(PDO $pdo, string $brandId, string $unitId, string $volumeInput, string $flavorId, string $productId): array
{
    $brand = jg_sku_get_brand($pdo, $brandId);
    $unit = jg_sku_get_unit($pdo, $unitId);
    $flavor = jg_sku_get_flavor($pdo, $brandId, $flavorId);
    $product = jg_sku_get_product($pdo, $brandId, $productId);
    $volume = jg_sku_volume_decimal($volumeInput);

    return [
        'brand' => $brand,
        'unit' => $unit,
        'flavor' => $flavor,
        'product' => $product,
        'volume' => $volume,
        'sku' => (string) $brand['code'] . (string) $unit['code'] . jg_sku_volume_digits($volume) . (string) $flavor['code'] . (string) $product['code'],
    ];
}

function jg_sku_assert_unique_brand(PDO $pdo, string $name): void
{
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM sku_brands WHERE name = :name');
    $stmt->execute([':name' => $name]);
    if ((int) $stmt->fetchColumn() > 0) {
        jg_sku_fail('Brand already exists.');
    }
}

function jg_sku_assert_unique_unit(PDO $pdo, string $name): void
{
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM sku_units WHERE name = :name');
    $stmt->execute([':name' => $name]);
    if ((int) $stmt->fetchColumn() > 0) {
        jg_sku_fail('Unit already exists.');
    }
}

function jg_sku_assert_unique_brand_child(PDO $pdo, string $tableName, string $brandId, string $name, string $message): void
{
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . $tableName . ' WHERE brand_id = :brand_id AND name = :name');
    $stmt->execute([
        ':brand_id' => $brandId,
        ':name' => $name,
    ]);
    if ((int) $stmt->fetchColumn() > 0) {
        jg_sku_fail($message);
    }
}

function jg_sku_assert_unique_sku_and_tag(PDO $pdo, string $sku, string $tag): void
{
    $stmt = $pdo->prepare('SELECT sku, tag FROM sku_skus WHERE sku = :sku OR tag = :tag LIMIT 1');
    $stmt->execute([
        ':sku' => $sku,
        ':tag' => $tag,
    ]);
    $row = $stmt->fetch();
    if (!is_array($row)) {
        return;
    }

    if ((string) ($row['sku'] ?? '') === $sku) {
        jg_sku_fail('That SKU already exists.');
    }

    jg_sku_fail('That TAG is already in use.');
}

function jg_sku_assert_request_is_unique(PDO $pdo, string $sku): void
{
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM sku_requests WHERE proposed_sku = :sku AND status = "pending"');
    $stmt->execute([':sku' => $sku]);
    if ((int) $stmt->fetchColumn() > 0) {
        jg_sku_fail('That SKU combination is already waiting for approval.');
    }
}

function jg_sku_fetch_requests(PDO $pdo, string $forRole, string $username): array
{
    $sql = '
        SELECT
            r.id,
            r.requester_username,
            r.requester_role,
            r.brand_id,
            r.unit_id,
            r.volume,
            r.flavor_id,
            r.product_id,
            r.proposed_sku,
            r.status,
            r.decision_notes,
            r.approved_sku,
            r.decided_by,
            r.created_at,
            r.decided_at,
            b.name AS brand_name,
            u.name AS unit_name,
            f.name AS flavor_name,
            p.name AS product_name
        FROM sku_requests r
        INNER JOIN sku_brands b ON b.id = r.brand_id
        INNER JOIN sku_units u ON u.id = r.unit_id
        INNER JOIN sku_flavors f ON f.id = r.flavor_id
        INNER JOIN sku_products p ON p.id = r.product_id
    ';

    $params = [];
    if ($forRole !== 'branch') {
        $sql .= ' WHERE r.requester_username = :requester_username';
        $params[':requester_username'] = $username;
    }

    $sql .= ' ORDER BY CASE WHEN r.status = "pending" THEN 0 ELSE 1 END, r.created_at DESC LIMIT 50';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $requests = [];
    foreach ($stmt->fetchAll() as $row) {
        $requests[] = [
            'id' => (int) ($row['id'] ?? 0),
            'requester_username' => (string) ($row['requester_username'] ?? ''),
            'requester_role' => (string) ($row['requester_role'] ?? ''),
            'brand_id' => (string) ($row['brand_id'] ?? ''),
            'brand_name' => (string) ($row['brand_name'] ?? ''),
            'unit_id' => (string) ($row['unit_id'] ?? ''),
            'unit_name' => (string) ($row['unit_name'] ?? ''),
            'volume' => number_format((float) ($row['volume'] ?? 0), 1, '.', ''),
            'flavor_id' => (string) ($row['flavor_id'] ?? ''),
            'flavor_name' => (string) ($row['flavor_name'] ?? ''),
            'product_id' => (string) ($row['product_id'] ?? ''),
            'product_name' => (string) ($row['product_name'] ?? ''),
            'proposed_sku' => (string) ($row['proposed_sku'] ?? ''),
            'status' => (string) ($row['status'] ?? 'pending'),
            'decision_notes' => (string) ($row['decision_notes'] ?? ''),
            'approved_sku' => (string) ($row['approved_sku'] ?? ''),
            'decided_by' => (string) ($row['decided_by'] ?? ''),
            'created_at' => (string) ($row['created_at'] ?? ''),
            'decided_at' => (string) ($row['decided_at'] ?? ''),
        ];
    }

    return $requests;
}

function jg_sku_fetch_database(PDO $pdo): array
{
    $version = jg_sku_meta_version($pdo);
    $metaUpdated = '';
    $metaStmt = $pdo->query('SELECT updated_at FROM sku_meta WHERE meta_key = "version" LIMIT 1');
    $metaValue = $metaStmt->fetchColumn();
    if (is_string($metaValue)) {
        $metaUpdated = $metaValue;
    }

    $brands = [];
    $brandStmt = $pdo->query('SELECT id, name, code, created_at FROM sku_brands ORDER BY CAST(code AS UNSIGNED), name');
    foreach ($brandStmt->fetchAll() as $row) {
        $brands[(string) $row['id']] = [
            'id' => (string) $row['id'],
            'name' => (string) $row['name'],
            'code' => (string) $row['code'],
            'created_at' => (string) $row['created_at'],
            'flavors' => [],
            'products' => [],
        ];
    }

    $flavorStmt = $pdo->query('SELECT id, brand_id, name, code, created_at FROM sku_flavors ORDER BY brand_id, CAST(code AS UNSIGNED), name');
    foreach ($flavorStmt->fetchAll() as $row) {
        $brandId = (string) $row['brand_id'];
        if (!isset($brands[$brandId])) {
            continue;
        }

        $brands[$brandId]['flavors'][] = [
            'id' => (string) $row['id'],
            'name' => (string) $row['name'],
            'code' => (string) $row['code'],
            'created_at' => (string) $row['created_at'],
        ];
    }

    $productStmt = $pdo->query('SELECT id, brand_id, name, code, created_at FROM sku_products ORDER BY brand_id, CAST(code AS UNSIGNED), name');
    foreach ($productStmt->fetchAll() as $row) {
        $brandId = (string) $row['brand_id'];
        if (!isset($brands[$brandId])) {
            continue;
        }

        $brands[$brandId]['products'][] = [
            'id' => (string) $row['id'],
            'name' => (string) $row['name'],
            'code' => (string) $row['code'],
            'created_at' => (string) $row['created_at'],
        ];
    }

    $units = [];
    $unitStmt = $pdo->query('SELECT id, name, code, created_at FROM sku_units ORDER BY CAST(code AS UNSIGNED), name');
    foreach ($unitStmt->fetchAll() as $row) {
        $units[] = [
            'id' => (string) $row['id'],
            'name' => (string) $row['name'],
            'code' => (string) $row['code'],
            'created_at' => (string) $row['created_at'],
        ];
    }

    $skus = [];
    $skuStmt = $pdo->query(
        'SELECT
            s.sku,
            s.tag,
            s.brand_id,
            b.name AS brand_name,
            s.unit_id,
            u.name AS unit_name,
            s.volume,
            s.flavor_id,
            f.name AS flavor_name,
            s.product_id,
            p.name AS product_name,
            s.starting_stock,
            s.current_stock,
            s.stock_trigger,
            s.inventory_mode,
            s.cogs,
            s.created_at,
            s.updated_at
        FROM sku_skus s
        INNER JOIN sku_brands b ON b.id = s.brand_id
        INNER JOIN sku_units u ON u.id = s.unit_id
        INNER JOIN sku_flavors f ON f.id = s.flavor_id
        INNER JOIN sku_products p ON p.id = s.product_id
        ORDER BY s.created_at DESC, s.sku DESC'
    );
    foreach ($skuStmt->fetchAll() as $row) {
        $historyStmt = $pdo->prepare(
            'SELECT old_price, new_price, takes_place, recorded_at
             FROM sku_cogs_history
             WHERE sku = :sku
             ORDER BY recorded_at DESC, id DESC'
        );
        $historyStmt->execute([':sku' => (string) $row['sku']]);
        $history = [];
        foreach ($historyStmt->fetchAll() as $historyRow) {
            $history[] = [
                'old_price' => $historyRow['old_price'] === null ? null : number_format((float) $historyRow['old_price'], 2, '.', ''),
                'new_price' => number_format((float) $historyRow['new_price'], 2, '.', ''),
                'takes_place' => (string) ($historyRow['takes_place'] ?? ''),
                'recorded_at' => (string) ($historyRow['recorded_at'] ?? ''),
            ];
        }

        $skus[] = [
            'sku' => (string) $row['sku'],
            'tag' => (string) $row['tag'],
            'brand_id' => (string) $row['brand_id'],
            'brand_name' => (string) $row['brand_name'],
            'unit_id' => (string) $row['unit_id'],
            'unit_name' => (string) $row['unit_name'],
            'volume' => number_format((float) $row['volume'], 1, '.', ''),
            'flavor_id' => (string) $row['flavor_id'],
            'flavor_name' => (string) $row['flavor_name'],
            'product_id' => (string) $row['product_id'],
            'product_name' => (string) $row['product_name'],
            'starting_stock' => (int) ($row['starting_stock'] ?? 0),
            'current_stock' => (int) ($row['current_stock'] ?? 0),
            'stock_trigger' => (int) ($row['stock_trigger'] ?? 0),
            'inventory_mode' => (string) ($row['inventory_mode'] ?? 'auto'),
            'cogs' => number_format((float) $row['cogs'], 2, '.', ''),
            'cogs_history' => $history,
            'created_at' => (string) ($row['created_at'] ?? ''),
            'updated_at' => (string) ($row['updated_at'] ?? ''),
        ];
    }

    return [
        'meta' => [
            'version' => $version,
            'updated_at' => $metaUpdated,
        ],
        'brands' => array_values($brands),
        'units' => $units,
        'skus' => $skus,
    ];
}

function jg_sku_response(PDO $pdo): void
{
    $role = jg_sku_session_role();
    $username = jg_sku_session_username();
    echo json_encode([
        'database' => jg_sku_fetch_database($pdo),
        'session' => [
            'username' => $username,
            'role' => $role,
            'is_branch' => $role === 'branch',
        ],
        'requests' => jg_sku_fetch_requests($pdo, $role, $username),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

function jg_sku_create_sku(PDO $pdo, array $payload, ?int $approvalRequestId = null): void
{
    $brandId = (string) ($payload['brand_id'] ?? '');
    $unitId = (string) ($payload['unit_id'] ?? '');
    $volumeInput = (string) ($payload['volume'] ?? '');
    $flavorId = (string) ($payload['flavor_id'] ?? '');
    $productId = (string) ($payload['product_id'] ?? '');
    $tag = jg_sku_tag((string) ($payload['tag'] ?? ''));
    $startingStock = jg_sku_integer($payload['starting_stock'] ?? null, 'Starting stock');
    $stockTrigger = jg_sku_integer($payload['stock_trigger'] ?? null, 'Stock trigger');
    $cogs = jg_sku_money($payload['cogs'] ?? null);

    $parts = jg_sku_compose_code($pdo, $brandId, $unitId, $volumeInput, $flavorId, $productId);
    jg_sku_assert_unique_sku_and_tag($pdo, $parts['sku'], $tag);

    $now = jg_sku_now();
    $stmt = $pdo->prepare(
        'INSERT INTO sku_skus (
            sku, tag, brand_id, unit_id, volume, flavor_id, product_id,
            starting_stock, current_stock, stock_trigger, inventory_mode, cogs,
            approval_request_id, created_at, updated_at
        ) VALUES (
            :sku, :tag, :brand_id, :unit_id, :volume, :flavor_id, :product_id,
            :starting_stock, :current_stock, :stock_trigger, "auto", :cogs,
            :approval_request_id, :created_at, :updated_at
        )'
    );
    $stmt->execute([
        ':sku' => $parts['sku'],
        ':tag' => $tag,
        ':brand_id' => $brandId,
        ':unit_id' => $unitId,
        ':volume' => $parts['volume'],
        ':flavor_id' => $flavorId,
        ':product_id' => $productId,
        ':starting_stock' => $startingStock,
        ':current_stock' => $startingStock,
        ':stock_trigger' => $stockTrigger,
        ':cogs' => $cogs,
        ':approval_request_id' => $approvalRequestId,
        ':created_at' => $now,
        ':updated_at' => $now,
    ]);

    $historyStmt = $pdo->prepare(
        'INSERT INTO sku_cogs_history (sku, old_price, new_price, takes_place, recorded_at)
         VALUES (:sku, NULL, :new_price, "starting stock", :recorded_at)'
    );
    $historyStmt->execute([
        ':sku' => $parts['sku'],
        ':new_price' => $cogs,
        ':recorded_at' => $now,
    ]);
}

jg_sku_require_auth_json();

try {
    $pdo = jg_sku_db();
} catch (Throwable $throwable) {
    jg_sku_fail('Unable to connect to the SKU database.', 500);
}

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method === 'GET') {
    jg_sku_response($pdo);
}

if ($method !== 'POST') {
    jg_sku_fail('Method not allowed.', 405);
}

$request = jg_sku_request_body();
$action = (string) ($request['action'] ?? '');

try {
    if ($action === 'add_brand') {
        jg_sku_require_branch_json();

        $name = jg_sku_normalize_name((string) ($request['name'] ?? ''));
        jg_sku_assert_unique_brand($pdo, $name);

        $pdo->beginTransaction();
        $brandId = 'brand-' . jg_sku_slug($name) . '-' . substr(sha1($name . microtime(true)), 0, 6);
        $brandCode = jg_sku_next_code($pdo, 'sku_brands');
        $now = jg_sku_now();

        $stmt = $pdo->prepare('INSERT INTO sku_brands (id, name, code, created_at) VALUES (:id, :name, :code, :created_at)');
        $stmt->execute([
            ':id' => $brandId,
            ':name' => $name,
            ':code' => $brandCode,
            ':created_at' => $now,
        ]);

        $flavorStmt = $pdo->prepare('INSERT INTO sku_flavors (id, brand_id, name, code, created_at) VALUES (:id, :brand_id, "UNFLAVORED", "00", :created_at)');
        $flavorStmt->execute([
            ':id' => $brandId . '-flavor-unflavored',
            ':brand_id' => $brandId,
            ':created_at' => $now,
        ]);

        jg_sku_touch_version($pdo);
        $pdo->commit();
        jg_sku_response($pdo);
    }

    if ($action === 'add_unit') {
        jg_sku_require_branch_json();

        $name = jg_sku_normalize_name((string) ($request['name'] ?? ''));
        jg_sku_assert_unique_unit($pdo, $name);

        $stmt = $pdo->prepare('INSERT INTO sku_units (id, name, code, created_at) VALUES (:id, :name, :code, :created_at)');
        $stmt->execute([
            ':id' => 'unit-' . jg_sku_slug($name) . '-' . substr(sha1($name . microtime(true)), 0, 6),
            ':name' => $name,
            ':code' => jg_sku_next_code($pdo, 'sku_units'),
            ':created_at' => jg_sku_now(),
        ]);

        jg_sku_touch_version($pdo);
        jg_sku_response($pdo);
    }

    if ($action === 'add_flavor') {
        jg_sku_require_branch_json();

        $brandId = (string) ($request['brand_id'] ?? '');
        $name = strtoupper(jg_sku_normalize_name((string) ($request['name'] ?? '')));
        jg_sku_get_brand($pdo, $brandId);
        jg_sku_assert_unique_brand_child($pdo, 'sku_flavors', $brandId, $name, 'Flavor already exists for this brand.');

        $stmt = $pdo->prepare('INSERT INTO sku_flavors (id, brand_id, name, code, created_at) VALUES (:id, :brand_id, :name, :code, :created_at)');
        $stmt->execute([
            ':id' => $brandId . '-flavor-' . jg_sku_slug($name) . '-' . substr(sha1($name . microtime(true)), 0, 6),
            ':brand_id' => $brandId,
            ':name' => $name,
            ':code' => jg_sku_next_code($pdo, 'sku_flavors', 'brand_id', $brandId),
            ':created_at' => jg_sku_now(),
        ]);

        jg_sku_touch_version($pdo);
        jg_sku_response($pdo);
    }

    if ($action === 'add_product') {
        jg_sku_require_branch_json();

        $brandId = (string) ($request['brand_id'] ?? '');
        $name = jg_sku_normalize_name((string) ($request['name'] ?? ''));
        jg_sku_get_brand($pdo, $brandId);
        jg_sku_assert_unique_brand_child($pdo, 'sku_products', $brandId, $name, 'Product already exists for this brand.');

        $stmt = $pdo->prepare('INSERT INTO sku_products (id, brand_id, name, code, created_at) VALUES (:id, :brand_id, :name, :code, :created_at)');
        $stmt->execute([
            ':id' => $brandId . '-product-' . jg_sku_slug($name) . '-' . substr(sha1($name . microtime(true)), 0, 6),
            ':brand_id' => $brandId,
            ':name' => $name,
            ':code' => jg_sku_next_code($pdo, 'sku_products', 'brand_id', $brandId),
            ':created_at' => jg_sku_now(),
        ]);

        jg_sku_touch_version($pdo);
        jg_sku_response($pdo);
    }

    if ($action === 'create_sku') {
        jg_sku_require_branch_json();

        $pdo->beginTransaction();
        jg_sku_create_sku($pdo, $request, isset($request['approval_request_id']) ? (int) $request['approval_request_id'] : null);
        jg_sku_touch_version($pdo);
        $pdo->commit();
        jg_sku_response($pdo);
    }

    if ($action === 'submit_request') {
        $brandId = (string) ($request['brand_id'] ?? '');
        $unitId = (string) ($request['unit_id'] ?? '');
        $volumeInput = (string) ($request['volume'] ?? '');
        $flavorId = (string) ($request['flavor_id'] ?? '');
        $productId = (string) ($request['product_id'] ?? '');

        $parts = jg_sku_compose_code($pdo, $brandId, $unitId, $volumeInput, $flavorId, $productId);
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM sku_skus WHERE sku = :sku');
        $stmt->execute([':sku' => $parts['sku']]);
        if ((int) $stmt->fetchColumn() > 0) {
            jg_sku_fail('That SKU already exists in the database.');
        }

        jg_sku_assert_request_is_unique($pdo, $parts['sku']);

        $insertStmt = $pdo->prepare(
            'INSERT INTO sku_requests (
                requester_username, requester_role, brand_id, unit_id, volume,
                flavor_id, product_id, proposed_sku, status, created_at
            ) VALUES (
                :requester_username, :requester_role, :brand_id, :unit_id, :volume,
                :flavor_id, :product_id, :proposed_sku, "pending", :created_at
            )'
        );
        $insertStmt->execute([
            ':requester_username' => jg_sku_session_username(),
            ':requester_role' => jg_sku_session_role(),
            ':brand_id' => $brandId,
            ':unit_id' => $unitId,
            ':volume' => $parts['volume'],
            ':flavor_id' => $flavorId,
            ':product_id' => $productId,
            ':proposed_sku' => $parts['sku'],
            ':created_at' => jg_sku_now(),
        ]);

        jg_sku_response($pdo);
    }

    if ($action === 'approve_request') {
        jg_sku_require_branch_json();

        $requestId = (int) ($request['request_id'] ?? 0);
        if ($requestId < 1) {
            jg_sku_fail('Request not found.', 404);
        }

        $stmt = $pdo->prepare('SELECT * FROM sku_requests WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $requestId]);
        $requestRow = $stmt->fetch();
        if (!is_array($requestRow)) {
            jg_sku_fail('Request not found.', 404);
        }

        if ((string) ($requestRow['status'] ?? '') !== 'pending') {
            jg_sku_fail('Only pending requests can be approved.');
        }

        $pdo->beginTransaction();
        jg_sku_create_sku($pdo, [
            'brand_id' => (string) ($requestRow['brand_id'] ?? ''),
            'unit_id' => (string) ($requestRow['unit_id'] ?? ''),
            'volume' => (string) ($requestRow['volume'] ?? ''),
            'flavor_id' => (string) ($requestRow['flavor_id'] ?? ''),
            'product_id' => (string) ($requestRow['product_id'] ?? ''),
            'tag' => (string) ($request['tag'] ?? ''),
            'starting_stock' => $request['starting_stock'] ?? null,
            'stock_trigger' => $request['stock_trigger'] ?? null,
            'cogs' => $request['cogs'] ?? null,
        ], $requestId);

        $approvedSku = (string) ($requestRow['proposed_sku'] ?? '');
        $updateStmt = $pdo->prepare(
            'UPDATE sku_requests
             SET status = "approved",
                 approved_sku = :approved_sku,
                 decision_notes = :decision_notes,
                 decided_by = :decided_by,
                 decided_at = :decided_at
             WHERE id = :id'
        );
        $updateStmt->execute([
            ':approved_sku' => $approvedSku,
            ':decision_notes' => trim((string) ($request['decision_notes'] ?? '')),
            ':decided_by' => jg_sku_session_username(),
            ':decided_at' => jg_sku_now(),
            ':id' => $requestId,
        ]);

        jg_sku_touch_version($pdo);
        $pdo->commit();
        jg_sku_response($pdo);
    }

    if ($action === 'deny_request') {
        jg_sku_require_branch_json();

        $requestId = (int) ($request['request_id'] ?? 0);
        if ($requestId < 1) {
            jg_sku_fail('Request not found.', 404);
        }

        $stmt = $pdo->prepare('UPDATE sku_requests SET status = "denied", decision_notes = :decision_notes, decided_by = :decided_by, decided_at = :decided_at WHERE id = :id AND status = "pending"');
        $stmt->execute([
            ':decision_notes' => trim((string) ($request['decision_notes'] ?? '')),
            ':decided_by' => jg_sku_session_username(),
            ':decided_at' => jg_sku_now(),
            ':id' => $requestId,
        ]);

        if ($stmt->rowCount() < 1) {
            jg_sku_fail('Only pending requests can be denied.');
        }

        jg_sku_response($pdo);
    }

    if ($action === 'change_cogs') {
        jg_sku_require_branch_json();

        $sku = trim((string) ($request['sku'] ?? ''));
        if ($sku === '') {
            jg_sku_fail('SKU is required.');
        }

        $newPrice = jg_sku_money($request['new_price'] ?? null, 'New price');
        $takesPlace = trim((string) ($request['takes_place'] ?? ''));
        if ($takesPlace === '') {
            jg_sku_fail('Takes place is required.');
        }

        $stmt = $pdo->prepare('SELECT cogs FROM sku_skus WHERE sku = :sku LIMIT 1');
        $stmt->execute([':sku' => $sku]);
        $oldPrice = $stmt->fetchColumn();
        if ($oldPrice === false) {
            jg_sku_fail('SKU not found.', 404);
        }

        $pdo->beginTransaction();
        $updateStmt = $pdo->prepare('UPDATE sku_skus SET cogs = :cogs, updated_at = :updated_at WHERE sku = :sku');
        $updateStmt->execute([
            ':cogs' => $newPrice,
            ':updated_at' => jg_sku_now(),
            ':sku' => $sku,
        ]);

        $historyStmt = $pdo->prepare(
            'INSERT INTO sku_cogs_history (sku, old_price, new_price, takes_place, recorded_at)
             VALUES (:sku, :old_price, :new_price, :takes_place, :recorded_at)'
        );
        $historyStmt->execute([
            ':sku' => $sku,
            ':old_price' => number_format((float) $oldPrice, 2, '.', ''),
            ':new_price' => $newPrice,
            ':takes_place' => $takesPlace,
            ':recorded_at' => jg_sku_now(),
        ]);

        jg_sku_touch_version($pdo);
        $pdo->commit();
        jg_sku_response($pdo);
    }

    if ($action === 'change_inventory') {
        jg_sku_require_branch_json();

        $sku = trim((string) ($request['sku'] ?? ''));
        if ($sku === '') {
            jg_sku_fail('SKU is required.');
        }

        $newStock = jg_sku_integer($request['new_stock'] ?? null, 'New stock');

        $stmt = $pdo->prepare('SELECT sku FROM sku_skus WHERE sku = :sku LIMIT 1');
        $stmt->execute([':sku' => $sku]);
        if ($stmt->fetchColumn() === false) {
            jg_sku_fail('SKU not found.', 404);
        }

        $updateStmt = $pdo->prepare('UPDATE sku_skus SET current_stock = :current_stock, updated_at = :updated_at WHERE sku = :sku');
        $updateStmt->execute([
            ':current_stock' => $newStock,
            ':updated_at' => jg_sku_now(),
            ':sku' => $sku,
        ]);

        jg_sku_touch_version($pdo);
        jg_sku_response($pdo);
    }

    jg_sku_fail('Unknown action.', 400);
} catch (Throwable $throwable) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ($throwable instanceof PDOException) {
        jg_sku_fail('Database operation failed.', 500);
    }

    throw $throwable;
}
