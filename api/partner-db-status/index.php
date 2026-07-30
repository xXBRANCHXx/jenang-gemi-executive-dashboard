<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/partner-db-bootstrap.php';
require_once dirname(__DIR__, 2) . '/partner-billing-bootstrap.php';

function jg_partner_db_status_setup_token_matches(): bool
{
    $expected = jg_dashboard_marketplace_api_setup_token();
    $authorization = trim((string) ($_SERVER['HTTP_AUTHORIZATION'] ?? ''));
    if ($expected === '' || !preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches)) {
        return false;
    }
    return hash_equals($expected, trim((string) ($matches[1] ?? '')));
}

if (!jg_partner_db_status_setup_token_matches()) {
    jg_admin_require_auth_json();
}

header('Content-Type: application/json; charset=utf-8');

$pdo = jg_partner_db();
$config = jg_partner_db_config();
$tableExists = false;
$rowCount = 0;
$billingReady = false;
$pendingBillingReviews = 0;

if ($pdo instanceof PDO) {
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table_name'
    );
    $stmt->execute([':table_name' => 'partner_profiles']);
    $tableExists = (int) $stmt->fetchColumn() > 0;

    if ($tableExists) {
        $rowCount = (int) $pdo->query('SELECT COUNT(*) FROM partner_profiles')->fetchColumn();
    }

    try {
        jg_admin_partner_billing_ensure_schema($pdo);
        jg_admin_partner_billing_sync($pdo);
        $pendingBillingReviews = count(jg_admin_partner_billing_notifications('/api/partner-billing/'));
        $billingReady = true;
    } catch (Throwable) {
        $billingReady = false;
    }
}

echo json_encode([
    'connected' => $pdo instanceof PDO,
    'host' => $config['host'],
    'port' => $config['port'],
    'database_name' => $config['name'],
    'user_configured' => $config['user'] !== '',
    'password_configured' => $config['pass'] !== '',
    'table_exists' => $tableExists,
    'partner_count' => $rowCount,
    'billing_ready' => $billingReady,
    'pending_billing_reviews' => $pendingBillingReviews,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
