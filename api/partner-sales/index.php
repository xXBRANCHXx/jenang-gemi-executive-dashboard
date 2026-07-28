<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/partner-sales-bootstrap.php';

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
    if ($raw === '') {
        return null;
    }
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $raw);
    if (!$date instanceof DateTimeImmutable || $date->format('Y-m-d') !== $raw) {
        jg_partner_sales_response(['error' => sprintf('%s must be a valid date.', $field)], 422);
    }
    return $raw;
}

function jg_partner_sales_profile(PDO $pdo, string $code): ?array
{
    $stmt = $pdo->prepare('SELECT code, name, partner_slug, notes, created_at, updated_at FROM partner_profiles WHERE code = :code LIMIT 1');
    $stmt->execute([':code' => $code]);
    $row = $stmt->fetch();
    if (!is_array($row)) {
        return null;
    }
    return [
        'code' => (string) ($row['code'] ?? ''),
        'name' => (string) ($row['name'] ?? ''),
        'partner_slug' => (string) ($row['partner_slug'] ?? ''),
        'notes' => (string) ($row['notes'] ?? ''),
        'created_at' => (string) ($row['created_at'] ?? ''),
        'updated_at' => (string) ($row['updated_at'] ?? ''),
    ];
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

function jg_partner_sales_orders(PDO $pdo, string $code, ?string $from, ?string $to): array
{
    if (!jg_partner_sales_table_exists($pdo, 'partner_orders')) {
        return [];
    }

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
         FROM partner_orders
         WHERE ' . implode(' AND ', $where) . '
         ORDER BY COALESCE(order_timestamp, created_at) DESC, id DESC
         LIMIT 2500'
    );
    $stmt->execute($params);
    return array_values(array_filter($stmt->fetchAll(), 'is_array'));
}

function jg_partner_sales_find_order(PDO $pdo, string $code, string $orderId): ?array
{
    if (!jg_partner_sales_table_exists($pdo, 'partner_orders')) {
        return null;
    }
    $stmt = $pdo->prepare(
        'SELECT id, partner_code, status, revenue_total, items_json, quantity
         FROM partner_orders WHERE partner_code = :partner_code AND id = :order_id LIMIT 1'
    );
    $stmt->execute([':partner_code' => $code, ':order_id' => $orderId]);
    $row = $stmt->fetch();
    return is_array($row) ? $row : null;
}

$pdo = jg_partner_db();
if (!$pdo instanceof PDO) {
    jg_partner_sales_response(['error' => 'Partner database is not configured.'], 503);
}

try {
    jg_partner_sales_ensure_schema($pdo);
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $body = $method === 'GET' ? [] : jg_partner_sales_request_body();
    $code = strtoupper(jg_partner_sales_text($body['partner_code'] ?? $_GET['code'] ?? '', 64));
    if ($code === '') {
        jg_partner_sales_response(['error' => 'Partner code is required.'], 422);
    }
    $partner = jg_partner_sales_profile($pdo, $code);
    if ($partner === null) {
        jg_partner_sales_response(['error' => 'Partner not found.'], 404);
    }

    if ($method === 'POST') {
        $action = strtolower(jg_partner_sales_text($body['action'] ?? '', 40));
        if ($action === 'record_payment') {
            $orderId = jg_partner_sales_text($body['order_id'] ?? '', 64);
            $amount = round((float) ($body['amount'] ?? 0), 2);
            $paymentDate = jg_partner_sales_date($body['payment_date'] ?? gmdate('Y-m-d'), 'Payment date');
            $order = jg_partner_sales_find_order($pdo, $code, $orderId);
            if ($order === null) {
                jg_partner_sales_response(['error' => 'Order not found for this partner.'], 404);
            }
            if (jg_partner_sales_is_cancelled($order['status'] ?? '')) {
                jg_partner_sales_response(['error' => 'Payments cannot be recorded against a cancelled order.'], 422);
            }
            if ($amount <= 0) {
                jg_partner_sales_response(['error' => 'Payment amount must be greater than zero.'], 422);
            }
            $existingPayments = jg_partner_sales_payments($pdo, $code)[$orderId] ?? [];
            $normalized = jg_partner_sales_normalize_order($order, $existingPayments);
            if ($amount > (float) $normalized['outstanding_amount'] + 0.005) {
                jg_partner_sales_response(['error' => 'Payment exceeds the outstanding order balance.'], 422);
            }
            $stmt = $pdo->prepare(
                'INSERT INTO partner_order_payments
                    (partner_code, order_id, amount, payment_date, payment_method, reference_no, notes, created_at)
                 VALUES
                    (:partner_code, :order_id, :amount, :payment_date, :payment_method, :reference_no, :notes, UTC_TIMESTAMP())'
            );
            $stmt->execute([
                ':partner_code' => $code,
                ':order_id' => $orderId,
                ':amount' => number_format($amount, 2, '.', ''),
                ':payment_date' => $paymentDate,
                ':payment_method' => jg_partner_sales_text($body['payment_method'] ?? '', 80),
                ':reference_no' => jg_partner_sales_text($body['reference_no'] ?? '', 120),
                ':notes' => jg_partner_sales_text($body['notes'] ?? '', 300),
            ]);
        } elseif ($action === 'void_payment') {
            $paymentId = max(0, (int) ($body['payment_id'] ?? 0));
            $stmt = $pdo->prepare(
                'UPDATE partner_order_payments
                 SET voided_at = UTC_TIMESTAMP(), void_reason = :void_reason
                 WHERE id = :id AND partner_code = :partner_code AND voided_at IS NULL'
            );
            $stmt->execute([
                ':id' => $paymentId,
                ':partner_code' => $code,
                ':void_reason' => jg_partner_sales_text($body['void_reason'] ?? 'Removed from partner sales breakdown', 300),
            ]);
            if ($stmt->rowCount() < 1) {
                jg_partner_sales_response(['error' => 'Payment record not found.'], 404);
            }
        } else {
            jg_partner_sales_response(['error' => 'Unknown action.'], 400);
        }
    } elseif ($method !== 'GET') {
        jg_partner_sales_response(['error' => 'Method not allowed.'], 405);
    }

    $from = jg_partner_sales_date($_GET['from'] ?? null, 'From date');
    $to = jg_partner_sales_date($_GET['to'] ?? null, 'To date');
    $paymentMap = jg_partner_sales_payments($pdo, $code);
    $rows = jg_partner_sales_orders($pdo, $code, $from, $to);
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
            'orders_available' => jg_partner_sales_table_exists($pdo, 'partner_orders'),
            'orders_limited' => count($rows) >= 2500,
            'settlements' => 'partner_order_payments',
        ],
    ]);
} catch (Throwable $error) {
    error_log('Partner sales API failed: ' . $error->getMessage());
    jg_partner_sales_response(['error' => 'Unable to load the partner sales breakdown.'], 500);
}
