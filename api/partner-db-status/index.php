<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/auth.php';
require_once dirname(__DIR__, 2) . '/partner-db-bootstrap.php';

jg_admin_require_auth_json();

header('Content-Type: application/json; charset=utf-8');

$pdo = jg_partner_db();
$config = jg_partner_db_config();
$tableExists = false;
$rowCount = 0;

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
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
