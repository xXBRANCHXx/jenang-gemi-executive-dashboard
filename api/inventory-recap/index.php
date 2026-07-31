<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/auth.php';
jg_admin_require_auth_json();

require_once dirname(__DIR__, 2) . '/config.php';
require_once dirname(__DIR__, 2) . '/sku-db-bootstrap.php';
require_once dirname(__DIR__, 2) . '/accounting-bootstrap.php';
require_once dirname(__DIR__, 2) . '/website-commerce-bootstrap.php';
require_once dirname(__DIR__, 2) . '/inventory-recap-bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

try {
    $analyticsPdo = analyticsDb();
    $skuPdo = jg_sku_db();
    $month = function_exists('jg_accounting_month') ? jg_accounting_month($_GET['month'] ?? null) : gmdate('Y-m');
    $cashContext = jg_inventory_recap_accounting_cash_context($analyticsPdo, $month);
    if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) === 'POST') {
        $body = json_decode((string) file_get_contents('php://input'), true);
        $action = is_array($body) ? (string) ($body['action'] ?? '') : '';
        if ($action === 'update_purchase_days') {
            $purchaseDays = filter_var($body['purchase_days'] ?? null, FILTER_VALIDATE_FLOAT);
            if ($purchaseDays === false || $purchaseDays < 1 || $purchaseDays > 90) {
                http_response_code(422);
                throw new InvalidArgumentException('Order days must be between 1 and 90.');
            }
            jg_inventory_recap_set_global_purchase_days($skuPdo, (float) $purchaseDays);
        } elseif ($action === 'update_settings') {
            $sku = trim((string) ($body['sku'] ?? ''));
            $mode = !empty($body['automatic']) ? 'auto' : 'manual';
            $manualTrigger = filter_var($body['manual_trigger'] ?? null, FILTER_VALIDATE_INT);
            $purchaseMoq = filter_var($body['purchase_moq'] ?? null, FILTER_VALIDATE_INT);
            if ($sku === '' || $manualTrigger === false || $manualTrigger < 0 || $purchaseMoq === false || $purchaseMoq < 1) {
                http_response_code(422);
                throw new InvalidArgumentException('SKU, trigger, and MOQ values are required.');
            }
            $stmt = $skuPdo->prepare(
                'UPDATE sku_skus
                 SET inventory_mode = :inventory_mode,
                     stock_trigger = :stock_trigger,
                     purchase_moq = :purchase_moq,
                     updated_at = :updated_at
                 WHERE sku = :sku'
            );
            $stmt->execute([
                ':inventory_mode' => $mode,
                ':stock_trigger' => min(1000000, $manualTrigger),
                ':purchase_moq' => min(100000, $purchaseMoq),
                ':updated_at' => gmdate('Y-m-d H:i:s'),
                ':sku' => $sku,
            ]);
            if ($stmt->rowCount() === 0) {
                $exists = $skuPdo->prepare('SELECT COUNT(*) FROM sku_skus WHERE sku = :sku');
                $exists->execute([':sku' => $sku]);
                if ((int) $exists->fetchColumn() === 0) {
                    http_response_code(404);
                    throw new RuntimeException('Product was not found.');
                }
            }
        } else {
            throw new InvalidArgumentException('Invalid inventory settings request.');
        }
    }
    $payload = jg_inventory_recap_payload($skuPdo, $analyticsPdo, $cashContext, $_GET);
    if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) === 'POST') {
        $payload['settings_updated'] = true;
    }
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    if (http_response_code() < 400) {
        http_response_code(500);
    }
    echo json_encode([
        'ok' => false,
        'error' => 'inventory_recap_failed',
        'message' => $error->getMessage(),
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}
