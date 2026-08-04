<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/partner-sales-bootstrap.php';
require_once dirname(__DIR__, 2) . '/partner-billing-bootstrap.php';
require_once dirname(__DIR__, 2) . '/website-commerce-bootstrap.php';

jg_admin_require_auth_json();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function jg_partner_sales_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function jg_partner_sales_request_body(): array
{
    $decoded = json_decode((string) file_get_contents('php://input'), true);
    return is_array($decoded) ? $decoded : [];
}

function jg_partner_sales_date(mixed $value, string $field): ?string
{
    $raw = trim((string) $value);
    if ($raw === '') return null;
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $raw);
    if (!$date instanceof DateTimeImmutable || $date->format('Y-m-d') !== $raw) {
        jg_partner_sales_response(['error' => sprintf('%s must be a valid date.', $field)], 422);
    }
    return $raw;
}

function jg_partner_sales_profile_from_row(array $row): array
{
    $slug = trim((string) ($row['partner_slug'] ?? ''), '/');
    if ($slug === '') $slug = trim((string) ($row['store_path'] ?? ''), '/');
    return [
        'code' => (string) ($row['code'] ?? ''),
        'name' => (string) ($row['name'] ?? ''),
        'partner_slug' => $slug,
        'notes' => (string) ($row['notes'] ?? ''),
        'created_at' => (string) ($row['created_at'] ?? ''),
        'updated_at' => (string) ($row['updated_at'] ?? ''),
    ];
}

function jg_partner_sales_profile(?PDO $partnerPdo, string $code): ?array
{
    if ($partnerPdo instanceof PDO) {
        $stmt = $partnerPdo->prepare('SELECT code, name, partner_slug, notes, created_at, updated_at FROM partner_profiles WHERE code = :code LIMIT 1');
        $stmt->execute([':code' => $code]);
        $row = $stmt->fetch();
        if (is_array($row)) return jg_partner_sales_profile_from_row($row);
    }

    $runtimePath = dirname(__DIR__, 2) . '/data/partners.runtime.json';
    $fallbackPath = dirname(__DIR__, 2) . '/data/partners.json';
    $path = is_file($runtimePath) ? $runtimePath : $fallbackPath;
    $decoded = is_file($path) ? json_decode((string) file_get_contents($path), true) : null;
    foreach ((array) ($decoded['partners'] ?? []) as $partner) {
        if (is_array($partner) && strtoupper(trim((string) ($partner['code'] ?? ''))) === $code) {
            return jg_partner_sales_profile_from_row($partner);
        }
    }
    return null;
}

function jg_partner_sales_payments(PDO $pdo, string $code): array
{
    $stmt = $pdo->prepare(
        'SELECT id, partner_code, order_id, amount, payment_date, payment_method, reference_no, notes, created_at
         FROM partner_order_payments
         WHERE partner_code = :partner_code AND voided_at IS NULL
         ORDER BY payment_date DESC, id DESC'
    );
    $stmt->execute([':partner_code' => $code]);
    $payments = [];
    foreach ($stmt->fetchAll() as $row) {
        $payment = [
            'id' => (int) ($row['id'] ?? 0),
            'partner_code' => (string) ($row['partner_code'] ?? ''),
            'order_id' => (string) ($row['order_id'] ?? ''),
            'amount' => round((float) ($row['amount'] ?? 0), 2),
            'payment_date' => (string) ($row['payment_date'] ?? ''),
            'payment_method' => (string) ($row['payment_method'] ?? ''),
            'reference_no' => (string) ($row['reference_no'] ?? ''),
            'notes' => (string) ($row['notes'] ?? ''),
            'created_at' => (string) ($row['created_at'] ?? ''),
        ];
        $payments[$payment['order_id']][] = $payment;
    }
    return $payments;
}

function jg_partner_sales_database_orders(PDO $pdo, string $code, ?string $from, ?string $to): array
{
    $where = ['partner_code = :partner_code'];
    $params = [':partner_code' => $code];
    $dateColumn = 'COALESCE(order_timestamp, created_at)';
    if ($from !== null) {
        $where[] = $dateColumn . ' >= :from_date';
        $params[':from_date'] = $from . ' 00:00:00';
    }
    if ($to !== null) {
        $where[] = $dateColumn . ' < DATE_ADD(:to_date, INTERVAL 1 DAY)';
        $params[':to_date'] = $to . ' 00:00:00';
    }
    $stmt = $pdo->prepare(
        'SELECT id, partner_code, customer_name, brand_name, product_name, sku_code, sku_label, quantity,
                notes, status, order_timestamp, marketplace_platform, revenue_total, items_json, created_at, updated_at
         FROM partner_orders WHERE ' . implode(' AND ', $where) . '
         ORDER BY ' . $dateColumn . ' DESC, id DESC LIMIT 2500'
    );
    $stmt->execute($params);
    return array_values(array_filter($stmt->fetchAll(), 'is_array'));
}

function jg_partner_sales_store_ops_orders(string $code, ?string $from, ?string $to): array
{
    $baseUrl = rtrim(jg_website_config('JG_STORE_OPS_BASE_URL', 'store_ops_base_url', 'https://store.jenanggemi.com'), '/');
    $token = jg_website_store_ops_token();
    if ($baseUrl === '' || $token === '') {
        throw new RuntimeException('The secure Store Ops order connection is not configured.');
    }
    $query = ['source' => 'partner-sales', 'partner_code' => $code];
    if ($from !== null) $query['from'] = $from;
    if ($to !== null) $query['to'] = $to;
    $url = $baseUrl . '/api/orders-v2/?' . http_build_query($query);
    $headers = ['Accept: application/json', 'Authorization: Bearer ' . $token];

    if (function_exists('curl_init')) {
        $curl = curl_init($url);
        if ($curl === false) throw new RuntimeException('Unable to initialize the Store Ops request.');
        curl_setopt_array($curl, [
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 25,
        ]);
        $raw = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        curl_close($curl);
    } else {
        $context = stream_context_create(['http' => [
            'method' => 'GET',
            'header' => implode("\r\n", $headers) . "\r\n",
            'timeout' => 25,
            'ignore_errors' => true,
        ]]);
        $raw = @file_get_contents($url, false, $context);
        $status = is_array($http_response_header ?? null) && preg_match('/\s(\d{3})\s/', (string) ($http_response_header[0] ?? ''), $matches)
            ? (int) $matches[1]
            : 0;
    }
    $decoded = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($decoded) || $status >= 400 || empty($decoded['ok'])) {
        throw new RuntimeException((string) ($decoded['error'] ?? 'Store Ops did not return partner orders.'));
    }

    $orders = [];
    foreach ((array) ($decoded['orders'] ?? []) as $order) {
        if (!is_array($order)) continue;
        $items = [];
        foreach ((array) ($order['items'] ?? []) as $item) {
            if (!is_array($item)) continue;
            $quantity = max(0, (int) ($item['quantity'] ?? 0));
            $unitRevenue = max(0.0, (float) ($item['unitRevenue'] ?? $item['unit_revenue'] ?? 0));
            $items[] = [
                'sku_code' => (string) ($item['sku'] ?? $item['sku_code'] ?? ''),
                'sku_label' => (string) ($item['productName'] ?? $item['sku_label'] ?? ''),
                'product' => (string) ($item['productName'] ?? $item['product'] ?? ''),
                'quantity' => $quantity,
                'unit_revenue' => $unitRevenue,
                'line_revenue' => max(0.0, (float) ($item['lineRevenue'] ?? $item['line_revenue'] ?? ($unitRevenue * $quantity))),
            ];
        }
        $orders[] = [
            'id' => (string) ($order['sourceOrderId'] ?? preg_replace('/^PARTNER-/i', '', (string) ($order['id'] ?? ''))),
            'partner_code' => (string) ($order['partnerCode'] ?? $code),
            'customer_name' => (string) ($order['customerName'] ?? ''),
            'status' => (string) ($order['status'] ?? ''),
            'order_timestamp' => (string) ($order['orderTimestamp'] ?? $order['createdAt'] ?? ''),
            'created_at' => (string) ($order['createdAt'] ?? ''),
            'updated_at' => (string) ($order['updatedAt'] ?? ''),
            'marketplace_platform' => (string) ($order['marketplacePlatform'] ?? ''),
            'notes' => (string) ($order['notes'] ?? ''),
            'revenue_total' => max(0.0, (float) ($order['revenueTotal'] ?? 0)),
            'items' => $items,
            'quantity' => array_sum(array_column($items, 'quantity')),
        ];
    }
    return ['orders' => $orders, 'limited' => !empty($decoded['meta']['limited'])];
}

function jg_partner_sales_order_rows(?PDO $partnerPdo, string $code, ?string $from, ?string $to): array
{
    if ($partnerPdo instanceof PDO && jg_partner_sales_table_exists($partnerPdo, 'partner_orders')) {
        $orders = jg_partner_sales_database_orders($partnerPdo, $code, $from, $to);
        return ['orders' => $orders, 'limited' => count($orders) >= 2500, 'source' => 'partner_database'];
    }
    return jg_partner_sales_store_ops_orders($code, $from, $to) + ['source' => 'store_ops_secure_feed'];
}

try {
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $body = $method === 'GET' ? [] : jg_partner_sales_request_body();
    $code = strtoupper(jg_partner_sales_text($body['partner_code'] ?? $_GET['code'] ?? '', 64));
    if ($code === '') jg_partner_sales_response(['error' => 'Partner code is required.'], 422);

    $from = jg_partner_sales_date($_GET['from'] ?? null, 'From date');
    $to = jg_partner_sales_date($_GET['to'] ?? null, 'To date');
    $partnerPdo = jg_partner_db();
    $partner = jg_partner_sales_profile($partnerPdo, $code);
    if ($partner === null) jg_partner_sales_response(['error' => 'Partner not found.'], 404);

    $paymentPdo = analyticsDb();
    jg_partner_sales_ensure_schema($paymentPdo);
    $source = jg_partner_sales_order_rows($partnerPdo, $code, $from, $to);
    $rows = $source['orders'];

    if ($method === 'POST') {
        $action = strtolower(jg_partner_sales_text($body['action'] ?? '', 40));
        if ($action === 'update_order_prices') {
            if (!$partnerPdo instanceof PDO || !jg_partner_sales_table_exists($partnerPdo, 'partner_orders')) {
                jg_partner_sales_response(['error' => 'Order prices can only be edited while the Partner database is available.'], 503);
            }
            $orderId = jg_partner_sales_text($body['order_id'] ?? '', 64);
            $adjustments = is_array($body['prices'] ?? null) ? $body['prices'] : [];
            jg_partner_sales_update_order_prices($partnerPdo, $code, $orderId, $adjustments);
            $source = jg_partner_sales_order_rows($partnerPdo, $code, $from, $to);
            $rows = $source['orders'];
        } elseif ($action === 'record_payment') {
            $orderId = jg_partner_sales_text($body['order_id'] ?? '', 64);
            $order = current(array_values(array_filter($rows, static fn (array $row): bool => (string) ($row['id'] ?? '') === $orderId)));
            if (!is_array($order)) jg_partner_sales_response(['error' => 'Order not found for this partner.'], 404);
            if (jg_partner_sales_is_cancelled($order['status'] ?? '')) jg_partner_sales_response(['error' => 'Payments cannot be recorded against a cancelled order.'], 422);
            $amount = round((float) ($body['amount'] ?? 0), 2);
            if ($amount <= 0) jg_partner_sales_response(['error' => 'Payment amount must be greater than zero.'], 422);
            $existingPayments = jg_partner_sales_payments($paymentPdo, $code)[$orderId] ?? [];
            $normalized = jg_partner_sales_normalize_order($order, $existingPayments);
            if ($amount > (float) $normalized['outstanding_amount'] + 0.005) {
                jg_partner_sales_response(['error' => 'Payment exceeds the outstanding order balance.'], 422);
            }
            $stmt = $paymentPdo->prepare(
                'INSERT INTO partner_order_payments
                    (partner_code, order_id, amount, payment_date, payment_method, reference_no, notes, created_at)
                 VALUES (:partner_code, :order_id, :amount, :payment_date, :payment_method, :reference_no, :notes, UTC_TIMESTAMP())'
            );
            $stmt->execute([
                ':partner_code' => $code,
                ':order_id' => $orderId,
                ':amount' => number_format($amount, 2, '.', ''),
                ':payment_date' => jg_partner_sales_date($body['payment_date'] ?? gmdate('Y-m-d'), 'Payment date'),
                ':payment_method' => jg_partner_sales_text($body['payment_method'] ?? '', 80),
                ':reference_no' => jg_partner_sales_text($body['reference_no'] ?? '', 120),
                ':notes' => jg_partner_sales_text($body['notes'] ?? '', 300),
            ]);
        } elseif ($action === 'void_payment') {
            $stmt = $paymentPdo->prepare(
                'UPDATE partner_order_payments SET voided_at = UTC_TIMESTAMP(), void_reason = :void_reason
                 WHERE id = :id AND partner_code = :partner_code AND voided_at IS NULL'
            );
            $stmt->execute([
                ':id' => max(0, (int) ($body['payment_id'] ?? 0)),
                ':partner_code' => $code,
                ':void_reason' => jg_partner_sales_text($body['void_reason'] ?? 'Removed from partner sales breakdown', 300),
            ]);
            if ($stmt->rowCount() < 1) jg_partner_sales_response(['error' => 'Payment record not found.'], 404);
        } else {
            jg_partner_sales_response(['error' => 'Unknown action.'], 400);
        }
    } elseif ($method !== 'GET') {
        jg_partner_sales_response(['error' => 'Method not allowed.'], 405);
    }

    $paymentMap = jg_partner_sales_payments($paymentPdo, $code);
    $orders = array_map(
        static fn (array $row): array => jg_partner_sales_normalize_order($row, $paymentMap[(string) ($row['id'] ?? '')] ?? []),
        $rows
    );
    $allPayments = array_values(array_merge(...array_values($paymentMap ?: [[]])));
    jg_partner_sales_response([
        'ok' => true,
        'partner' => $partner,
        'range' => ['from' => $from, 'to' => $to],
        'summary' => jg_partner_sales_summary($orders),
        'orders' => $orders,
        'payments' => $allPayments,
        'source' => [
            'orders_available' => true,
            'orders_limited' => !empty($source['limited']),
            'orders' => (string) ($source['source'] ?? 'unknown'),
            'settlements' => 'analytics.partner_order_payments',
        ],
    ]);
} catch (InvalidArgumentException $error) {
    jg_partner_sales_response(['error' => $error->getMessage()], 422);
} catch (Throwable $error) {
    error_log('Partner sales API failed: ' . $error->getMessage());
    jg_partner_sales_response(['error' => $error->getMessage() ?: 'Unable to load the partner sales breakdown.'], 503);
}
