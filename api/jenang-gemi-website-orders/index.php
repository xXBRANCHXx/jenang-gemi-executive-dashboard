<?php
declare(strict_types=1);

define('JG_WEBSITE_ORDER_PLATFORM', 'jenang_gemi_website');
$_GET['action'] = 'checkout';
require dirname(__DIR__) . '/website-orders/index.php';
