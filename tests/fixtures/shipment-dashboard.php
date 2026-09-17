<?php
// Local browser fixture only: render the real authenticated template, with all
// network requests intercepted by the browser test. No live login or mutation.
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REQUEST_URI'] = '/dashboard/?view=shipment-arrangement';
$_SERVER['SCRIPT_NAME'] = '/dashboard/index.php';
$_GET['view'] = 'shipment-arrangement';
session_start();
$_SESSION['jg_admin_authenticated'] = true;
require dirname(__DIR__, 2) . '/dashboard/index.php';
