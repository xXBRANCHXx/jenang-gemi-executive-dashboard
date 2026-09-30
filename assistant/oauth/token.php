<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/lib/oauth.php';
try { JenangMcp\requireHttps();$c=JenangMcp\config();if (!JenangMcp\rateLimit($c,'assistant/oauth/token.php',60)) JenangMcp\jsonResponse(['error'=>'rate_limited'],429);if (!JenangMcp\originAllowed($c)) JenangMcp\jsonResponse(['error'=>'origin_denied'],403);
    if ($_SERVER['REQUEST_METHOD']!=='POST' || !str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''),'application/x-www-form-urlencoded')) JenangMcp\jsonResponse(['error'=>'invalid_request'],400);
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0)>8192 || count($_POST)>12 || array_filter($_POST,fn($v)=>!is_string($v))) JenangMcp\jsonResponse(['error'=>'invalid_request'],400);
    $r=JenangMcp\exchange($c,$_POST);JenangMcp\jsonResponse($r,isset($r['error'])?400:200);
} catch (Throwable) { JenangMcp\jsonResponse(['error'=>'temporarily_unavailable'],503); }
