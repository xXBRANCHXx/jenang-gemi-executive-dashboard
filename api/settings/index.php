<?php
declare(strict_types=1);

require dirname(__DIR__, 2) . '/auth.php';
jg_admin_require_auth_json();

require dirname(__DIR__, 2) . '/analytics-api.php';
