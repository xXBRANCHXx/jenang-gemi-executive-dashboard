<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/lib/oauth.php';
try { JenangMcp\requireHttps();$c=JenangMcp\config();if (!JenangMcp\rateLimit($c,'assistant/oauth/revoke.php',60)) JenangMcp\jsonResponse(['error'=>'rate_limited'],429);
    if (!JenangMcp\originAllowed($c)) JenangMcp\jsonResponse(['error'=>'origin_denied'],403);
    if ($_SERVER['REQUEST_METHOD']!=='POST' || ($_POST['client_id'] ?? '')!==$c['client_id'] || strlen((string)($_POST['token'] ?? ''))>128) JenangMcp\jsonResponse(['error'=>'invalid_request'],400);
    JenangMcp\revoke($c,(string)($_POST['token'] ?? ''));JenangMcp\jsonResponse([]);
} catch (Throwable) { JenangMcp\jsonResponse(['error'=>'temporarily_unavailable'],503); }
