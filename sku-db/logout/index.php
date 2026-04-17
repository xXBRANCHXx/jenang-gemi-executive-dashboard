<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/sku-auth.php';

jg_sku_logout();
header('Location: ../');
exit;
