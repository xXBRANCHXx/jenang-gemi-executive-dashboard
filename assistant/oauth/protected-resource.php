<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/lib/config.php';
try { JenangMcp\requireHttps();$c=JenangMcp\config();JenangMcp\jsonResponse(['resource'=>JenangMcp\resource($c),'authorization_servers'=>[JenangMcp\issuer($c)],'scopes_supported'=>JenangMcp\allowedScopes($c),'bearer_methods_supported'=>['header']]); }
catch (Throwable) { JenangMcp\jsonResponse(['error'=>'mcp_unavailable'],503); }
