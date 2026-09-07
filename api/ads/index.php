<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/auth.php';
jg_admin_require_auth_json();
header('Content-Type: application/json; charset=utf-8');

require dirname(__DIR__, 2) . '/ads-bootstrap.php';
jgAdViewHandle();
