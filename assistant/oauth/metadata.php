<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/lib/config.php';
try { JenangMcp\requireHttps();$c=JenangMcp\config();$i=JenangMcp\issuer($c);JenangMcp\jsonResponse(['issuer'=>$i,'authorization_endpoint'=>$i.'/authorize.php','token_endpoint'=>$i.'/token.php','revocation_endpoint'=>$i.'/revoke.php','response_types_supported'=>['code'],'grant_types_supported'=>['authorization_code','refresh_token'],'token_endpoint_auth_methods_supported'=>['none'],'code_challenge_methods_supported'=>['S256'],'scopes_supported'=>[JenangMcp\SCOPE],'authorization_response_iss_parameter_supported'=>true]); }
catch (Throwable) { JenangMcp\jsonResponse(['error'=>'mcp_unavailable'],503); }
