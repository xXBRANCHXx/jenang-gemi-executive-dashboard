<?php
declare(strict_types=1);

require_once __DIR__ . '/website-commerce-bootstrap.php';

const JG_ZERO_BITESHIP_BASE_URL = 'https://api.biteship.com';
const JG_ZERO_DUITKU_SANDBOX_URL = 'https://api-sandbox.duitku.com/api/merchant/createInvoice';
const JG_ZERO_DUITKU_PRODUCTION_URL = 'https://api-prod.duitku.com/api/merchant/createInvoice';

final class JGZeroProviderException extends RuntimeException
{
    public array $providerPayload;
    public int $httpStatus;

    public function __construct(string $message, int $httpStatus, array $providerPayload = [])
    {
        parent::__construct($message);
        $this->httpStatus = $httpStatus;
        $this->providerPayload = $providerPayload;
    }
}

function jg_zero_commerce_config(string $envKey, string $configKey, string $default = ''): string
{
    return jg_website_config($envKey, $configKey, $default);
}

function jg_zero_commerce_mode(): string
{
    return strtolower(jg_zero_commerce_config('JG_ZERO_COMMERCE_MODE', 'zero_commerce_mode', 'sandbox')) === 'production'
        ? 'production'
        : 'sandbox';
}

function jg_zero_commerce_enabled(): bool
{
    return in_array(
        strtolower(jg_zero_commerce_config('JG_ZERO_COMMERCE_ENABLED', 'zero_commerce_enabled', 'false')),
        ['1', 'true', 'yes', 'on'],
        true
    );
}

function jg_zero_commerce_secret(): string
{
    $secret = jg_zero_commerce_config('JG_ZERO_COMMERCE_SIGNING_SECRET', 'zero_commerce_signing_secret');
    if (strlen($secret) < 32) {
        throw new RuntimeException('ZERO commerce signing secret must be at least 32 characters.');
    }
    return $secret;
}

function jg_zero_biteship_token(): string
{
    $token = jg_zero_commerce_config('JG_BITESHIP_API_TOKEN', 'biteship_api_token');
    $prefix = jg_zero_commerce_mode() === 'production' ? 'biteship_live.' : 'biteship_test.';
    if (!str_starts_with($token, $prefix)) {
        throw new RuntimeException('Biteship token does not match ZERO commerce mode.');
    }
    return $token;
}

function jg_zero_duitku_credentials(): array
{
    $merchantCode = jg_zero_commerce_config('JG_DUITKU_MERCHANT_CODE', 'duitku_merchant_code');
    $merchantKey = jg_zero_commerce_config('JG_DUITKU_MERCHANT_KEY', 'duitku_merchant_key');
    if ($merchantCode === '' || $merchantKey === '') {
        throw new RuntimeException('Duitku merchant credentials are not configured.');
    }
    return ['merchant_code' => $merchantCode, 'merchant_key' => $merchantKey];
}

function jg_zero_duitku_callback_ip_allowed(string $ip): bool
{
    $defaults = jg_zero_commerce_mode() === 'production'
        ? '182.23.85.8,182.23.85.9,182.23.85.10,182.23.85.13,182.23.85.14,103.177.101.184,103.177.101.185,103.177.101.186,103.177.101.189,103.177.101.190'
        : '182.23.85.11,182.23.85.12,103.177.101.187,103.177.101.188';
    $configured = jg_zero_commerce_config('JG_DUITKU_CALLBACK_IP_ALLOWLIST', 'duitku_callback_ip_allowlist', $defaults);
    return in_array(trim($ip), array_values(array_filter(array_map('trim', explode(',', $configured)))), true);
}

function jg_zero_biteship_webhook_authorized(array $server): bool
{
    $headerName = jg_zero_commerce_config(
        'JG_BITESHIP_WEBHOOK_HEADER',
        'biteship_webhook_header',
        'X-Zero-Webhook-Secret'
    );
    $expectedSecret = jg_zero_commerce_config('JG_BITESHIP_WEBHOOK_SECRET', 'biteship_webhook_secret');
    $serverKey = 'HTTP_' . strtoupper(str_replace('-', '_', trim($headerName)));
    $receivedSecret = trim((string) ($server[$serverKey] ?? ''));
    return $headerName !== '' && $expectedSecret !== ''
        && hash_equals($expectedSecret, $receivedSecret);
}

function jg_zero_commerce_require_enabled(): void
{
    if (!jg_zero_commerce_enabled()) {
        throw new RuntimeException('ZERO commerce testing is not enabled.');
    }
    jg_zero_commerce_secret();
    jg_zero_biteship_token();
    jg_zero_duitku_credentials();
}

function jg_zero_commerce_ensure_schema(PDO $pdo): void
{
    jg_website_ensure_schema($pdo);
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS zero_commerce_orders (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            website_order_id BIGINT UNSIGNED NOT NULL,
            public_token_hash CHAR(64) NOT NULL,
            customer_email VARCHAR(160) NOT NULL DEFAULT "",
            destination_area_id VARCHAR(100) NOT NULL,
            destination_area_name VARCHAR(255) NOT NULL,
            destination_postal_code VARCHAR(12) NOT NULL,
            destination_note VARCHAR(500) NOT NULL DEFAULT "",
            total_weight_grams INT UNSIGNED NOT NULL,
            courier_company VARCHAR(50) NOT NULL,
            courier_type VARCHAR(80) NOT NULL,
            courier_name VARCHAR(120) NOT NULL,
            courier_service_name VARCHAR(160) NOT NULL,
            courier_duration VARCHAR(80) NOT NULL DEFAULT "",
            collection_method VARCHAR(30) NOT NULL DEFAULT "pickup",
            shipping_price DECIMAL(14,2) NOT NULL,
            payment_total DECIMAL(16,2) NOT NULL,
            payment_status VARCHAR(30) NOT NULL DEFAULT "PENDING",
            duitku_reference VARCHAR(120) NOT NULL DEFAULT "",
            duitku_payment_url VARCHAR(500) NOT NULL DEFAULT "",
            duitku_payment_code VARCHAR(40) NOT NULL DEFAULT "",
            duitku_publisher_order_id VARCHAR(160) NOT NULL DEFAULT "",
            biteship_order_id VARCHAR(100) NOT NULL DEFAULT "",
            biteship_tracking_id VARCHAR(120) NOT NULL DEFAULT "",
            biteship_waybill_id VARCHAR(160) NOT NULL DEFAULT "",
            biteship_routing_code VARCHAR(120) NOT NULL DEFAULT "",
            biteship_status VARCHAR(60) NOT NULL DEFAULT "",
            biteship_actual_price DECIMAL(14,2) NOT NULL DEFAULT 0,
            shipment_error VARCHAR(500) NOT NULL DEFAULT "",
            provider_payload_json LONGTEXT NULL DEFAULT NULL,
            created_at DATETIME(6) NOT NULL,
            updated_at DATETIME(6) NOT NULL,
            paid_at DATETIME(6) NULL DEFAULT NULL,
            shipment_created_at DATETIME(6) NULL DEFAULT NULL,
            UNIQUE KEY uniq_zero_commerce_website_order (website_order_id),
            UNIQUE KEY uniq_zero_commerce_public_token (public_token_hash),
            KEY idx_zero_commerce_payment (payment_status, created_at),
            CONSTRAINT fk_zero_commerce_website_order FOREIGN KEY (website_order_id) REFERENCES website_orders(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    analyticsEnsureTableColumn($pdo, 'zero_commerce_orders', 'biteship_actual_price', 'DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER `biteship_status`');
}

function jg_zero_http_json(string $method, string $url, ?array $payload, array $headers = []): array
{
    $curl = curl_init($url);
    if ($curl === false) {
        throw new RuntimeException('Unable to initialize provider request.');
    }
    $requestHeaders = array_merge(['Accept: application/json'], $headers);
    curl_setopt_array($curl, [
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_HTTPHEADER => $requestHeaders,
    ]);
    if ($payload !== null) {
        $body = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        curl_setopt($curl, CURLOPT_POSTFIELDS, $body);
    }
    $raw = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    $curlError = curl_error($curl);
    curl_close($curl);
    $decoded = is_string($raw) ? json_decode($raw, true) : null;
    if ($status < 200 || $status >= 300 || !is_array($decoded)) {
        $message = is_array($decoded)
            ? (string) ($decoded['error'] ?? $decoded['message'] ?? '')
            : $curlError;
        throw new JGZeroProviderException(
            trim($message) !== '' ? trim($message) : 'Provider request failed.',
            $status,
            is_array($decoded) ? $decoded : []
        );
    }
    return $decoded;
}

function jg_zero_biteship_request(string $method, string $path, ?array $payload = null): array
{
    $basicAuth = base64_encode(jg_zero_biteship_token() . ':');
    return jg_zero_http_json(
        $method,
        JG_ZERO_BITESHIP_BASE_URL . '/' . ltrim($path, '/'),
        $payload,
        ['Authorization: Basic ' . $basicAuth, 'Content-Type: application/json']
    );
}

function jg_zero_biteship_search_areas(string $query): array
{
    $query = trim(preg_replace('/\s+/', ' ', $query) ?? '');
    if (mb_strlen($query) < 3 || mb_strlen($query) > 120) {
        throw new InvalidArgumentException('Enter at least 3 characters to search an Indonesian area.');
    }
    $response = jg_zero_biteship_request(
        'GET',
        'v1/maps/areas?countries=ID&type=single&input=' . rawurlencode($query)
    );
    return array_values(array_map(static fn (array $area): array => [
        'id' => (string) ($area['id'] ?? ''),
        'name' => (string) ($area['name'] ?? ''),
        'postal_code' => (string) ($area['postal_code'] ?? ''),
        'city' => (string) ($area['administrative_division_level_2_name'] ?? ''),
        'province' => (string) ($area['administrative_division_level_1_name'] ?? ''),
    ], array_filter($response['areas'] ?? [], 'is_array')));
}

function jg_zero_weight_map(): array
{
    $configured = jg_zero_commerce_config('JG_ZERO_SHIPPING_WEIGHTS_JSON', 'zero_shipping_weights_json');
    $decoded = $configured !== '' ? json_decode($configured, true) : null;
    if (is_array($decoded)) {
        return array_map('intval', $decoded);
    }
    if (jg_zero_commerce_mode() === 'production') {
        throw new RuntimeException('Production shipping weights must be configured per size.');
    }
    return [
        '5ml' => 30,
        '10ml' => 50,
        '30ml' => 100,
        '50ml' => 120,
        '100ml' => 220,
        '250ml' => 480,
        '550ml' => 900,
    ];
}

function jg_zero_shipping_weight(array $item): int
{
    $size = strtolower(trim((string) ($item['size_label'] ?? '')));
    $map = array_change_key_case(jg_zero_weight_map(), CASE_LOWER);
    $weight = (int) ($map[$size] ?? 0);
    if ($weight <= 0) {
        throw new RuntimeException('Shipping weight is missing for ' . ($size !== '' ? $size : 'an item') . '.');
    }
    return $weight;
}

function jg_zero_cart_items(PDO $skuPdo, array $payload): array
{
    $requested = is_array($payload['items'] ?? null) ? array_values(array_filter($payload['items'], 'is_array')) : [];
    if ($requested === [] || count($requested) > 50) {
        throw new InvalidArgumentException('An order must contain between 1 and 50 items.');
    }
    $voucher = null;
    $voucherCode = zero_voucher_normalize_code($payload['voucher_code'] ?? '');
    if ($voucherCode !== '') {
        $voucher = zero_voucher_match_active($skuPdo, $voucherCode);
        if (!$voucher) {
            throw new InvalidArgumentException('Voucher code is invalid or inactive.');
        }
    }
    return array_map(
        static fn (array $item): array => jg_website_catalog_item($skuPdo, 'zero_website', $item, $voucher),
        $requested
    );
}

function jg_zero_biteship_items(array $items): array
{
    return array_map(static function (array $item): array {
        return [
            'name' => mb_substr(trim($item['product_name'] . ' ' . $item['option_name'] . ' ' . $item['size_label']), 0, 100),
            'description' => mb_substr((string) $item['option_name'], 0, 255),
            'category' => 'food_and_drink',
            'sku' => (string) $item['sku'],
            'value' => (int) round((float) $item['unit_net_price']),
            'quantity' => (int) $item['quantity'],
            'weight' => jg_zero_shipping_weight($item),
        ];
    }, $items);
}

function jg_zero_items_total(array $items): int
{
    return (int) round(array_reduce(
        $items,
        static fn (float $sum, array $item): float => $sum + ((float) $item['unit_net_price'] * (int) $item['quantity']),
        0.0
    ));
}

function jg_zero_items_weight(array $items): int
{
    return array_reduce(
        $items,
        static fn (int $sum, array $item): int => $sum + (jg_zero_shipping_weight($item) * (int) $item['quantity']),
        0
    );
}

function jg_zero_cart_fingerprint(array $items): string
{
    $rows = array_map(static fn (array $item): string => implode(':', [
        $item['item_key'],
        $item['sku'],
        $item['quantity'],
        number_format((float) $item['unit_net_price'], 2, '.', ''),
        jg_zero_shipping_weight($item),
    ]), $items);
    sort($rows);
    return hash('sha256', implode('|', $rows));
}

function jg_zero_base64url_encode(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function jg_zero_base64url_decode(string $value): string
{
    $decoded = base64_decode(strtr($value, '-_', '+/'), true);
    if (!is_string($decoded)) {
        throw new InvalidArgumentException('Shipping quote is invalid.');
    }
    return $decoded;
}

function jg_zero_quote_token(array $quote): string
{
    $payload = jg_zero_base64url_encode((string) json_encode($quote, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    $signature = hash_hmac('sha256', $payload, jg_zero_commerce_secret());
    return $payload . '.' . $signature;
}

function jg_zero_verify_quote(string $token, ?int $now = null): array
{
    [$payload, $signature] = array_pad(explode('.', trim($token), 2), 2, '');
    $expected = hash_hmac('sha256', $payload, jg_zero_commerce_secret());
    if ($payload === '' || !hash_equals($expected, $signature)) {
        throw new InvalidArgumentException('Shipping quote is invalid.');
    }
    $quote = json_decode(jg_zero_base64url_decode($payload), true);
    $now ??= time();
    if (!is_array($quote) || (int) ($quote['expires_at'] ?? 0) < $now) {
        throw new InvalidArgumentException('Shipping quote expired. Please refresh the rates.');
    }
    return $quote;
}

function jg_zero_shipping_rates(PDO $skuPdo, array $payload): array
{
    $areaId = trim((string) ($payload['destination_area_id'] ?? ''));
    $areaName = trim((string) ($payload['destination_area_name'] ?? ''));
    $postalCode = preg_replace('/\D/', '', (string) ($payload['destination_postal_code'] ?? '')) ?? '';
    if ($areaId === '' || $areaName === '' || $postalCode === '') {
        throw new InvalidArgumentException('Select a Biteship destination area.');
    }
    $originAreaId = jg_zero_commerce_config('JG_BITESHIP_ORIGIN_AREA_ID', 'biteship_origin_area_id');
    if ($originAreaId === '') {
        throw new RuntimeException('Biteship origin area is not configured.');
    }
    $items = jg_zero_cart_items($skuPdo, $payload);
    $couriers = jg_zero_commerce_config(
        'JG_BITESHIP_COURIERS',
        'biteship_couriers',
        'jne,sicepat,anteraja,jnt,tiki'
    );
    $response = jg_zero_biteship_request('POST', 'v1/rates/couriers', [
        'origin_area_id' => $originAreaId,
        'destination_area_id' => $areaId,
        'couriers' => $couriers,
        'items' => jg_zero_biteship_items($items),
    ]);
    $subtotal = jg_zero_items_total($items);
    $weight = jg_zero_items_weight($items);
    $fingerprint = jg_zero_cart_fingerprint($items);
    $rates = [];
    foreach (array_filter($response['pricing'] ?? [], 'is_array') as $pricing) {
        $price = (int) round((float) ($pricing['price'] ?? 0));
        $company = trim((string) ($pricing['courier_code'] ?? $pricing['company'] ?? ''));
        $type = trim((string) ($pricing['courier_service_code'] ?? $pricing['type'] ?? ''));
        if ($price <= 0 || $company === '' || $type === '') {
            continue;
        }
        $collection = is_array($pricing['available_collection_method'] ?? null)
            ? (string) (($pricing['available_collection_method'][0] ?? 'pickup'))
            : 'pickup';
        $quote = [
            'version' => 1,
            'expires_at' => time() + 900,
            'cart_fingerprint' => $fingerprint,
            'items_subtotal' => $subtotal,
            'total_weight_grams' => $weight,
            'destination_area_id' => $areaId,
            'destination_area_name' => $areaName,
            'destination_postal_code' => $postalCode,
            'courier_company' => $company,
            'courier_type' => $type,
            'courier_name' => (string) ($pricing['courier_name'] ?? strtoupper($company)),
            'courier_service_name' => (string) ($pricing['courier_service_name'] ?? strtoupper($type)),
            'courier_duration' => (string) ($pricing['duration'] ?? ''),
            'collection_method' => in_array($collection, ['pickup', 'drop_off'], true) ? $collection : 'pickup',
            'shipping_price' => $price,
            'payment_total' => $subtotal + $price,
        ];
        $rates[] = array_merge($quote, ['quote_token' => jg_zero_quote_token($quote)]);
    }
    usort($rates, static fn (array $a, array $b): int => $a['shipping_price'] <=> $b['shipping_price']);
    if ($rates === []) {
        throw new RuntimeException('No shipping services are available for this destination.');
    }
    return ['rates' => $rates, 'items_subtotal' => $subtotal, 'total_weight_grams' => $weight];
}

function jg_zero_public_token_hash(string $token): string
{
    return hash_hmac('sha256', $token, jg_zero_commerce_secret());
}

function jg_zero_duitku_item_details(array $orderItems, array $commerce): array
{
    $items = array_map(static fn (array $item): array => [
        'name' => mb_substr(trim($item['product_name'] . ' ' . $item['option_name'] . ' ' . $item['size_label']), 0, 50),
        'price' => (int) round((float) $item['unit_net_price'] * (int) $item['quantity']),
        'quantity' => (int) $item['quantity'],
    ], $orderItems);
    $productLinesTotal = array_reduce(
        $items,
        static fn (int $sum, array $item): int => $sum + $item['price'],
        0
    );
    $shippingLine = (int) round((float) $commerce['payment_total']) - $productLinesTotal;
    if ($shippingLine <= 0) {
        throw new RuntimeException('Duitku invoice item totals are invalid.');
    }
    $items[] = [
        'name' => 'Shipping - ' . mb_substr($commerce['courier_name'] . ' ' . $commerce['courier_service_name'], 0, 38),
        'price' => $shippingLine,
        'quantity' => 1,
    ];
    return $items;
}

function jg_zero_duitku_invoice(array $order, array $commerce): array
{
    $credentials = jg_zero_duitku_credentials();
    $timestamp = (string) round(microtime(true) * 1000);
    $signature = hash_hmac('sha256', $credentials['merchant_code'] . $timestamp, $credentials['merchant_key']);
    $items = jg_zero_duitku_item_details($order['items'], $commerce);
    $baseUrl = rtrim(jg_zero_commerce_config('JG_ZERO_PUBLIC_SITE_URL', 'zero_public_site_url', 'https://zerofoods.id'), '/');
    $apiBaseUrl = rtrim(jg_zero_commerce_config('JG_ZERO_COMMERCE_API_URL', 'zero_commerce_api_url', 'https://admin.jenanggemi.com/api/zero-commerce/'), '/');
    $payload = [
        'paymentAmount' => (int) $commerce['payment_total'],
        'merchantOrderId' => (string) $order['order_id'],
        'productDetails' => 'ZERO Foods order ' . $order['order_id'],
        'additionalParam' => '',
        'merchantUserInfo' => (string) $commerce['customer_email'],
        'paymentMethod' => '',
        'customerVaName' => mb_substr((string) $order['customer']['name'], 0, 20),
        'email' => (string) $commerce['customer_email'],
        'phoneNumber' => (string) $order['customer']['phone'],
        'itemDetails' => $items,
        'callbackUrl' => $apiBaseUrl . '/?action=duitku_callback',
        'returnUrl' => $baseUrl . '/payment-status?order=' . rawurlencode((string) $order['order_id']) . '&token=' . rawurlencode((string) $commerce['public_token']),
        'expiryPeriod' => 15,
    ];
    $url = jg_zero_commerce_mode() === 'production' ? JG_ZERO_DUITKU_PRODUCTION_URL : JG_ZERO_DUITKU_SANDBOX_URL;
    return jg_zero_http_json('POST', $url, $payload, [
        'Content-Type: application/json',
        'x-duitku-timestamp: ' . $timestamp,
        'x-duitku-signature: ' . $signature,
        'x-duitku-merchantcode: ' . $credentials['merchant_code'],
    ]);
}

function jg_zero_commerce_checkout(PDO $pdo, PDO $skuPdo, array $payload): array
{
    $quote = jg_zero_verify_quote((string) ($payload['quote_token'] ?? ''));
    $items = jg_zero_cart_items($skuPdo, $payload);
    if (!hash_equals((string) $quote['cart_fingerprint'], jg_zero_cart_fingerprint($items))) {
        throw new InvalidArgumentException('Cart changed after shipping was quoted. Please refresh the rates.');
    }
    if ((int) $quote['items_subtotal'] !== jg_zero_items_total($items)) {
        throw new InvalidArgumentException('Product total changed. Please refresh the rates.');
    }
    $customer = is_array($payload['customer'] ?? null) ? $payload['customer'] : [];
    $phone = preg_replace('/[^\d+]/', '', (string) ($customer['phone'] ?? '')) ?? '';
    $email = trim(strtolower((string) ($customer['email'] ?? '')));
    $address = trim((string) ($customer['address'] ?? ''));
    if (strlen($phone) < 8 || !filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($address) < 5) {
        throw new InvalidArgumentException('Full delivery address, phone, and email are required.');
    }
    $idempotencyKey = trim((string) ($payload['idempotency_key'] ?? ''));
    $publicToken = trim((string) ($payload['public_token'] ?? ''));
    if ($publicToken !== '' && (strlen($publicToken) < 32 || strlen($publicToken) > 150)) {
        throw new InvalidArgumentException('Checkout status token is invalid.');
    }
    $orderPayload = $payload;
    $orderPayload['platform'] = 'zero_website';
    $orderPayload['customer'] = [
        'name' => (string) ($customer['name'] ?? ''),
        'address' => $address . ', ' . $quote['destination_area_name'],
        'phone' => $phone,
    ];
    $orderPayload['items'] = array_map(static fn (array $item): array => [
        'item_key' => $item['item_key'],
        'sku' => $item['sku'],
        'quantity' => $item['quantity'],
    ], $items);
    $orderPayload['idempotency_key'] = $idempotencyKey;
    $order = jg_website_create_order($pdo, $skuPdo, $orderPayload);
    jg_zero_commerce_ensure_schema($pdo);

    $existing = $pdo->prepare('SELECT * FROM zero_commerce_orders WHERE website_order_id = :website_order_id LIMIT 1');
    $existing->execute([':website_order_id' => $order['id']]);
    $commerceRow = $existing->fetch();
    if (!is_array($commerceRow)) {
        if ($publicToken === '') {
            $publicToken = bin2hex(random_bytes(24));
        }
        $now = jg_website_now();
        $insert = $pdo->prepare(
            'INSERT INTO zero_commerce_orders
                (website_order_id, public_token_hash, customer_email, destination_area_id, destination_area_name,
                 destination_postal_code, destination_note, total_weight_grams, courier_company, courier_type,
                 courier_name, courier_service_name, courier_duration, collection_method, shipping_price,
                 payment_total, created_at, updated_at)
             VALUES
                (:website_order_id, :public_token_hash, :customer_email, :destination_area_id, :destination_area_name,
                 :destination_postal_code, :destination_note, :total_weight_grams, :courier_company, :courier_type,
                 :courier_name, :courier_service_name, :courier_duration, :collection_method, :shipping_price,
                 :payment_total, :created_at, :updated_at)'
        );
        $insert->execute([
            ':website_order_id' => $order['id'],
            ':public_token_hash' => jg_zero_public_token_hash($publicToken),
            ':customer_email' => mb_substr($email, 0, 160),
            ':destination_area_id' => $quote['destination_area_id'],
            ':destination_area_name' => mb_substr((string) $quote['destination_area_name'], 0, 255),
            ':destination_postal_code' => mb_substr((string) $quote['destination_postal_code'], 0, 12),
            ':destination_note' => mb_substr(trim((string) ($customer['note'] ?? '')), 0, 500),
            ':total_weight_grams' => $quote['total_weight_grams'],
            ':courier_company' => $quote['courier_company'],
            ':courier_type' => $quote['courier_type'],
            ':courier_name' => mb_substr((string) $quote['courier_name'], 0, 120),
            ':courier_service_name' => mb_substr((string) $quote['courier_service_name'], 0, 160),
            ':courier_duration' => mb_substr((string) $quote['courier_duration'], 0, 80),
            ':collection_method' => $quote['collection_method'],
            ':shipping_price' => number_format((float) $quote['shipping_price'], 2, '.', ''),
            ':payment_total' => number_format((float) $quote['payment_total'], 2, '.', ''),
            ':created_at' => $now,
            ':updated_at' => $now,
        ]);
        $existing->execute([':website_order_id' => $order['id']]);
        $commerceRow = $existing->fetch();
    }
    if (!is_array($commerceRow)) {
        throw new RuntimeException('Unable to save ZERO commerce checkout.');
    }
    if ($publicToken === '' || !hash_equals((string) $commerceRow['public_token_hash'], jg_zero_public_token_hash($publicToken))) {
        throw new RuntimeException('This checkout attempt already exists. Start a new checkout if payment was not opened.');
    }
    if ((string) $commerceRow['duitku_payment_url'] === '') {
        $invoice = jg_zero_duitku_invoice($order, array_merge($commerceRow, ['public_token' => $publicToken]));
        if ((string) ($invoice['statusCode'] ?? '') !== '00' || trim((string) ($invoice['paymentUrl'] ?? '')) === '') {
            throw new RuntimeException((string) ($invoice['statusMessage'] ?? 'Duitku did not create a payment invoice.'));
        }
        $pdo->prepare(
            'UPDATE zero_commerce_orders
             SET duitku_reference = :reference, duitku_payment_url = :payment_url,
                 provider_payload_json = :provider_payload_json, updated_at = :updated_at
             WHERE website_order_id = :website_order_id'
        )->execute([
            ':reference' => mb_substr((string) ($invoice['reference'] ?? ''), 0, 120),
            ':payment_url' => mb_substr((string) $invoice['paymentUrl'], 0, 500),
            ':provider_payload_json' => json_encode(['duitku_invoice' => $invoice], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            ':updated_at' => jg_website_now(),
            ':website_order_id' => $order['id'],
        ]);
        $commerceRow['duitku_reference'] = (string) ($invoice['reference'] ?? '');
        $commerceRow['duitku_payment_url'] = (string) $invoice['paymentUrl'];
    }
    return [
        'order_id' => $order['order_id'],
        'payment_url' => (string) $commerceRow['duitku_payment_url'],
        'duitku_reference' => (string) $commerceRow['duitku_reference'],
        'payment_total' => (int) round((float) $commerceRow['payment_total']),
        'public_token' => $publicToken,
        'mode' => jg_zero_commerce_mode(),
    ];
}

function jg_zero_commerce_row(PDO $pdo, string $orderId): array
{
    $stmt = $pdo->prepare(
        'SELECT c.*, o.order_id, o.status AS website_status, o.customer_name, o.customer_address, o.customer_phone
         FROM zero_commerce_orders c INNER JOIN website_orders o ON o.id = c.website_order_id
         WHERE o.order_id = :order_id LIMIT 1'
    );
    $stmt->execute([':order_id' => trim($orderId)]);
    $row = $stmt->fetch();
    if (!is_array($row)) {
        throw new RuntimeException('ZERO commerce order was not found.');
    }
    return $row;
}

function jg_zero_commerce_status(PDO $pdo, string $orderId, string $publicToken): array
{
    $row = jg_zero_commerce_row($pdo, $orderId);
    if (!hash_equals((string) $row['public_token_hash'], jg_zero_public_token_hash($publicToken))) {
        throw new InvalidArgumentException('Order status token is invalid.');
    }
    return [
        'order_id' => (string) $row['order_id'],
        'payment_status' => (string) $row['payment_status'],
        'shipment_status' => (string) $row['biteship_status'],
        'courier' => trim((string) $row['courier_name'] . ' ' . (string) $row['courier_service_name']),
        'tracking_id' => (string) $row['biteship_tracking_id'],
        'waybill_id' => (string) $row['biteship_waybill_id'],
        'payment_total' => (int) round((float) $row['payment_total']),
        'mode' => jg_zero_commerce_mode(),
    ];
}

function jg_zero_create_biteship_shipment(PDO $pdo, string $orderId): array
{
    $commerce = jg_zero_commerce_row($pdo, $orderId);
    if ((string) $commerce['biteship_order_id'] !== '') {
        return $commerce;
    }
    $order = jg_website_order_by_id($pdo, (int) $commerce['website_order_id']);
    $originName = jg_zero_commerce_config('JG_BITESHIP_ORIGIN_CONTACT_NAME', 'biteship_origin_contact_name');
    $originPhone = jg_zero_commerce_config('JG_BITESHIP_ORIGIN_CONTACT_PHONE', 'biteship_origin_contact_phone');
    $originAddress = jg_zero_commerce_config('JG_BITESHIP_ORIGIN_ADDRESS', 'biteship_origin_address');
    $originArea = jg_zero_commerce_config('JG_BITESHIP_ORIGIN_AREA_ID', 'biteship_origin_area_id');
    if ($originName === '' || $originPhone === '' || $originAddress === '' || $originArea === '') {
        throw new RuntimeException('Biteship pickup details are incomplete.');
    }
    $payload = [
        'shipper_contact_name' => $originName,
        'shipper_contact_phone' => $originPhone,
        'shipper_organization' => 'ZERO Foods Indonesia',
        'origin_contact_name' => $originName,
        'origin_contact_phone' => $originPhone,
        'origin_address' => $originAddress,
        'origin_area_id' => $originArea,
        'origin_collection_method' => (string) $commerce['collection_method'],
        'destination_contact_name' => (string) $commerce['customer_name'],
        'destination_contact_phone' => (string) $commerce['customer_phone'],
        'destination_contact_email' => (string) $commerce['customer_email'],
        'destination_address' => (string) $commerce['customer_address'],
        'destination_note' => (string) $commerce['destination_note'],
        'destination_area_id' => (string) $commerce['destination_area_id'],
        'courier_company' => (string) $commerce['courier_company'],
        'courier_type' => (string) $commerce['courier_type'],
        'delivery_type' => 'now',
        'reference_id' => (string) $order['order_id'],
        'metadata' => ['website_order_id' => $order['order_id'], 'payment_provider' => 'duitku'],
        'tags' => ['zero-website', jg_zero_commerce_mode()],
        'items' => jg_zero_biteship_items($order['items']),
    ];
    try {
        $response = jg_zero_biteship_request('POST', 'v1/orders', $payload);
    } catch (JGZeroProviderException $error) {
        $details = is_array($error->providerPayload['details'] ?? null)
            ? $error->providerPayload['details']
            : [];
        $isDuplicate = (int) ($error->providerPayload['code'] ?? 0) === 40002060;
        if ($isDuplicate && trim((string) ($details['order_id'] ?? '')) !== '') {
            $response = [
                'id' => (string) $details['order_id'],
                'status' => (string) ($details['status'] ?? 'confirmed'),
                'courier' => [
                    'tracking_id' => (string) ($details['tracking_id'] ?? ''),
                    'waybill_id' => (string) ($details['waybill_id'] ?? ''),
                    'routing_code' => (string) ($details['routing_code'] ?? ''),
                ],
                'recovered_from_duplicate_reference' => true,
            ];
        } else {
            $pdo->prepare(
                'UPDATE zero_commerce_orders SET shipment_error = :shipment_error, updated_at = :updated_at WHERE website_order_id = :website_order_id'
            )->execute([
                ':shipment_error' => mb_substr($error->getMessage(), 0, 500),
                ':updated_at' => jg_website_now(),
                ':website_order_id' => $commerce['website_order_id'],
            ]);
            throw $error;
        }
    } catch (RuntimeException $error) {
        $pdo->prepare(
            'UPDATE zero_commerce_orders SET shipment_error = :shipment_error, updated_at = :updated_at WHERE website_order_id = :website_order_id'
        )->execute([
            ':shipment_error' => mb_substr($error->getMessage(), 0, 500),
            ':updated_at' => jg_website_now(),
            ':website_order_id' => $commerce['website_order_id'],
        ]);
        throw $error;
    }
    $courier = is_array($response['courier'] ?? null) ? $response['courier'] : [];
    $now = jg_website_now();
    $pdo->prepare(
        'UPDATE zero_commerce_orders
         SET biteship_order_id = :biteship_order_id, biteship_tracking_id = :tracking_id,
             biteship_waybill_id = :waybill_id, biteship_routing_code = :routing_code,
             biteship_status = :biteship_status, shipment_error = "", provider_payload_json = :provider_payload_json,
             shipment_created_at = :shipment_created_at, updated_at = :updated_at
         WHERE website_order_id = :website_order_id'
    )->execute([
        ':biteship_order_id' => mb_substr((string) ($response['id'] ?? ''), 0, 100),
        ':tracking_id' => mb_substr((string) ($courier['tracking_id'] ?? ''), 0, 120),
        ':waybill_id' => mb_substr((string) ($courier['waybill_id'] ?? ''), 0, 160),
        ':routing_code' => mb_substr((string) ($courier['routing_code'] ?? ''), 0, 120),
        ':biteship_status' => mb_substr((string) ($response['status'] ?? 'confirmed'), 0, 60),
        ':provider_payload_json' => json_encode(['biteship_order' => $response], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        ':shipment_created_at' => $now,
        ':updated_at' => $now,
        ':website_order_id' => $commerce['website_order_id'],
    ]);
    return jg_zero_commerce_row($pdo, $orderId);
}

function jg_zero_biteship_webhook(PDO $pdo, array $payload): array
{
    $event = trim((string) ($payload['event'] ?? ''));
    $orderId = trim((string) ($payload['order_id'] ?? ''));
    if (!in_array($event, ['order.status', 'order.price', 'order.waybill_id'], true) || $orderId === '') {
        throw new InvalidArgumentException('Biteship webhook payload is invalid.');
    }
    $lookup = $pdo->prepare('SELECT website_order_id FROM zero_commerce_orders WHERE biteship_order_id = :biteship_order_id LIMIT 1');
    $lookup->execute([':biteship_order_id' => $orderId]);
    $websiteOrderId = $lookup->fetchColumn();
    if ($websiteOrderId === false) {
        throw new RuntimeException('Biteship webhook order was not found.');
    }
    $pdo->prepare(
        'UPDATE zero_commerce_orders
         SET biteship_tracking_id = COALESCE(NULLIF(:tracking_id, ""), biteship_tracking_id),
             biteship_waybill_id = COALESCE(NULLIF(:waybill_id, ""), biteship_waybill_id),
             biteship_status = COALESCE(NULLIF(:biteship_status, ""), biteship_status),
             biteship_actual_price = COALESCE(NULLIF(:actual_price, 0), biteship_actual_price),
             provider_payload_json = :provider_payload_json, updated_at = :updated_at
         WHERE website_order_id = :website_order_id'
    )->execute([
        ':tracking_id' => mb_substr(trim((string) ($payload['courier_tracking_id'] ?? '')), 0, 120),
        ':waybill_id' => mb_substr(trim((string) ($payload['courier_waybill_id'] ?? '')), 0, 160),
        ':biteship_status' => mb_substr(trim((string) ($payload['status'] ?? '')), 0, 60),
        ':actual_price' => max(0, (int) round((float) ($payload['price'] ?? $payload['order_price'] ?? 0))),
        ':provider_payload_json' => json_encode(['biteship_webhook' => $payload], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        ':updated_at' => jg_website_now(),
        ':website_order_id' => (int) $websiteOrderId,
    ]);
    return ['received' => true, 'event' => $event, 'order_id' => $orderId];
}

function jg_zero_duitku_callback(PDO $pdo, array $callback): array
{
    $credentials = jg_zero_duitku_credentials();
    $merchantCode = trim((string) ($callback['merchantCode'] ?? ''));
    $amount = trim((string) ($callback['amount'] ?? ''));
    $orderId = trim((string) ($callback['merchantOrderId'] ?? ''));
    $signature = trim((string) ($callback['signature'] ?? ''));
    $expected = hash_hmac('sha256', $merchantCode . $amount . $orderId, $credentials['merchant_key']);
    if ($merchantCode !== $credentials['merchant_code'] || $signature === '' || !hash_equals($expected, $signature)) {
        throw new InvalidArgumentException('Duitku callback signature is invalid.');
    }
    $commerce = jg_zero_commerce_row($pdo, $orderId);
    if ((int) round((float) $commerce['payment_total']) !== (int) $amount) {
        throw new InvalidArgumentException('Duitku callback amount does not match the order.');
    }
    $resultCode = trim((string) ($callback['resultCode'] ?? ''));
    if ($resultCode !== '00') {
        $pdo->prepare(
            'UPDATE zero_commerce_orders SET payment_status = "FAILED", updated_at = :updated_at WHERE website_order_id = :website_order_id'
        )->execute([':updated_at' => jg_website_now(), ':website_order_id' => $commerce['website_order_id']]);
        return ['paid' => false, 'order_id' => $orderId];
    }
    if ((string) $commerce['payment_status'] !== 'PAID') {
        jg_website_order_mark_paid($pdo, $orderId);
        $now = jg_website_now();
        $pdo->prepare(
            'UPDATE zero_commerce_orders
             SET payment_status = "PAID", duitku_reference = :reference, duitku_payment_code = :payment_code,
                 duitku_publisher_order_id = :publisher_order_id, paid_at = :paid_at, updated_at = :updated_at
             WHERE website_order_id = :website_order_id'
        )->execute([
            ':reference' => mb_substr((string) ($callback['reference'] ?? ''), 0, 120),
            ':payment_code' => mb_substr((string) ($callback['paymentCode'] ?? ''), 0, 40),
            ':publisher_order_id' => mb_substr((string) ($callback['publisherOrderId'] ?? ''), 0, 160),
            ':paid_at' => $now,
            ':updated_at' => $now,
            ':website_order_id' => $commerce['website_order_id'],
        ]);
    }
    try {
        $shipment = jg_zero_create_biteship_shipment($pdo, $orderId);
        return ['paid' => true, 'shipment_created' => (string) $shipment['biteship_order_id'] !== '', 'order_id' => $orderId];
    } catch (Throwable $error) {
        error_log('Paid ZERO order needs Biteship retry: ' . $orderId . ' - ' . $error->getMessage());
        return ['paid' => true, 'shipment_created' => false, 'order_id' => $orderId];
    }
}

function jg_zero_code128_svg(string $value): string
{
    $patterns = [
        '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213',
        '221312','231212','112232','122132','122231','113222','123122','123221','223211','221132',
        '221231','213212','223112','312131','311222','321122','321221','312212','322112','322211',
        '212123','212321','232121','111323','131123','131321','112313','132113','132311','211313',
        '231113','231311','112133','112331','132131','113123','113321','133121','313121','211331',
        '231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
        '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214',
        '112412','122114','122411','142112','142211','241211','221114','413111','241112','134111',
        '111242','121142','121241','114212','124112','124211','411212','421112','421211','212141',
        '214121','412121','111143','111341','131141','114113','114311','411113','411311','113141',
        '114131','311141','411131','211412','211214','211232','2331112'
    ];
    $clean = '';
    foreach (str_split($value) as $char) {
        $ord = ord($char);
        $clean .= ($ord >= 32 && $ord <= 126) ? $char : '-';
    }
    $codes = [104];
    foreach (str_split($clean) as $char) {
        $codes[] = ord($char) - 32;
    }
    $checksum = 104;
    foreach (array_slice($codes, 1) as $index => $code) {
        $checksum += $code * ($index + 1);
    }
    $codes[] = $checksum % 103;
    $codes[] = 106;
    $x = 12;
    $rects = '';
    foreach ($codes as $code) {
        $pattern = $patterns[$code];
        foreach (str_split($pattern) as $index => $width) {
            $moduleWidth = (int) $width * 2;
            if ($index % 2 === 0) {
                $rects .= '<rect x="' . $x . '" y="4" width="' . $moduleWidth . '" height="54"/>';
            }
            $x += $moduleWidth;
        }
    }
    $width = $x + 12;
    return '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' . htmlspecialchars($clean, ENT_QUOTES) . '" viewBox="0 0 ' . $width . ' 78" preserveAspectRatio="none"><g fill="#000">' . $rects . '</g><text x="' . ($width / 2) . '" y="73" text-anchor="middle" font-family="monospace" font-size="12">' . htmlspecialchars($clean, ENT_QUOTES) . '</text></svg>';
}

function jg_zero_shipping_label_html(PDO $pdo, string $orderId): string
{
    $row = jg_zero_commerce_row($pdo, $orderId);
    if ((string) $row['biteship_order_id'] === '') {
        throw new RuntimeException('Biteship shipment has not been created yet.');
    }
    $order = jg_website_order_by_id($pdo, (int) $row['website_order_id']);
    $escape = static fn (mixed $value): string => htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $waybill = (string) ($row['biteship_waybill_id'] ?: $row['biteship_tracking_id']);
    $itemLines = implode('', array_map(static fn (array $item): string =>
        '<li>' . htmlspecialchars((string) $item['sku'], ENT_QUOTES) . ' · ' .
        htmlspecialchars(trim($item['product_name'] . ' ' . $item['option_name'] . ' ' . $item['size_label']), ENT_QUOTES) .
        ' × ' . (int) $item['quantity'] . '</li>', $order['items']));
    $mode = strtoupper(jg_zero_commerce_mode());
    return '<!doctype html><html><head><meta charset="utf-8"><title>Label ' . $escape($orderId) . '</title><style>
        @page{size:A5 portrait;margin:7mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#050505}
        .label{width:100%;min-height:190mm;border:2px solid #000;padding:5mm;display:grid;grid-template-rows:auto auto auto 1fr auto;gap:4mm}
        .top{display:flex;justify-content:space-between;align-items:start;border-bottom:2px solid #000;padding-bottom:3mm}
        h1{margin:0;font-size:26pt;letter-spacing:-1px}.courier{text-align:right;font-size:15pt;font-weight:800}.route{font-size:12pt}
        .barcode{height:30mm}.barcode svg{width:100%;height:100%}.grid{display:grid;grid-template-columns:1fr 1.7fr;gap:4mm}
        .box{border:1.5px solid #000;padding:3mm}.box h2{font-size:9pt;text-transform:uppercase;margin:0 0 2mm}.box p{font-size:11pt;line-height:1.35;margin:0}
        .recipient strong{font-size:16pt;display:block;margin-bottom:2mm}.items{font-size:9pt;margin:2mm 0 0;padding-left:5mm}
        .foot{display:flex;justify-content:space-between;border-top:1.5px solid #000;padding-top:3mm;font-size:9pt}.test{color:#a00;font-weight:800}
        @media screen{body{background:#ddd;padding:20px}.label{background:#fff;max-width:148mm;margin:auto}}
    </style></head><body><main class="label">
        <section class="top"><div><h1>ZERO</h1><div>' . $escape($orderId) . '</div></div><div class="courier">' .
            $escape($row['courier_name']) . '<br><span class="route">' . $escape($row['courier_service_name']) . ' · ' . $escape($row['biteship_routing_code']) . '</span></div></section>
        <div class="barcode">' . jg_zero_code128_svg($waybill) . '</div>
        <section class="grid"><div class="box"><h2>From</h2><p><strong>ZERO Foods Indonesia</strong><br>' .
            $escape(jg_zero_commerce_config('JG_BITESHIP_ORIGIN_ADDRESS', 'biteship_origin_address')) . '</p></div>
        <div class="box recipient"><h2>Deliver to</h2><p><strong>' . $escape($row['customer_name']) . '</strong>' .
            $escape($row['customer_phone']) . '<br>' . nl2br($escape($row['customer_address'])) . '<br>' .
            $escape($row['destination_postal_code']) . '</p></div></section>
        <section class="box"><h2>Package · ' . $escape($row['total_weight_grams']) . ' g</h2><ul class="items">' . $itemLines . '</ul></section>
        <footer class="foot"><span>Waybill: ' . $escape($waybill) . '</span><span class="' . ($mode === 'SANDBOX' ? 'test' : '') . '">' . $mode . '</span></footer>
    </main></body></html>';
}
