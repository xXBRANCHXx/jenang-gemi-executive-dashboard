<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/lib/oauth.php';
require_once dirname(__DIR__,2).'/auth.php';
header('Cache-Control: no-store');header('X-Frame-Options: DENY');header("Content-Security-Policy: default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");// Keep form POST Origin verifiable while withholding referrers from the OAuth callback.
header('Referrer-Policy: same-origin');
try {
    JenangMcp\requireHttps();$c=JenangMcp\config();if (!JenangMcp\rateLimit($c,'assistant/oauth/authorize.php',30)) JenangMcp\jsonResponse(['error'=>'rate_limited'],429);if (!JenangMcp\originAllowed($c)) JenangMcp\jsonResponse(['error'=>'origin_denied'],403);
    jg_admin_start_session();
    if ($_SERVER['REQUEST_METHOD']==='GET') {
        $q=JenangMcp\validateAuthorization($c,$_GET);$intent=JenangMcp\opaque();
        // One pending request per login session; GET does not create a grant.
        $_SESSION['jg_mcp_intent']=['id'=>$intent,'expires'=>time()+600,'request'=>$q];
    } elseif ($_SERVER['REQUEST_METHOD']==='POST') {
        $stored=$_SESSION['jg_mcp_intent'] ?? [];
        if (($stored['expires'] ?? 0)<time() || !hash_equals($stored['id'] ?? '',(string)($_POST['intent'] ?? '')) || !hash_equals(jg_admin_csrf_token(),(string)($_POST['csrf'] ?? ''))) throw new InvalidArgumentException('Expired consent form.');
        $intent=$stored['id'];$q=JenangMcp\validateAuthorization($c,$stored['request']);
        if (($_POST['action'] ?? '')==='login') {
            if (!JenangMcp\rateLimit($c,'login',10)) JenangMcp\jsonResponse(['error'=>'rate_limited'],429);
            if (!jg_admin_attempt_login((string)($_POST['code'] ?? ''))) $loginError='Login failed.';
        } else {
            if (!jg_admin_is_authenticated()) throw new InvalidArgumentException('Login required.');
            $reply=['state'=>$q['state'],'iss'=>JenangMcp\issuer($c)];
            if (($_POST['action'] ?? '')==='approve') $reply['code']=JenangMcp\issueCode($c,$q);else $reply['error']='access_denied';
            unset($_SESSION['jg_mcp_intent']);session_write_close();
            header('Location: '.$c['redirect_uri'].'?'.http_build_query($reply,'','&',PHP_QUERY_RFC3986),true,302);exit;
        }
    } else throw new InvalidArgumentException('Unsupported method.');
    $authenticated=jg_admin_is_authenticated();$csrf=jg_admin_csrf_token();
    $e=fn(string $v)=>htmlspecialchars($v,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
} catch (Throwable) { http_response_code(400);echo 'Connection request is invalid, expired or disabled.';exit; }
?>
<!doctype html><html lang="en"><meta charset="utf-8"><title>Connect Jenang Gemi reporting</title>
<h1>Connect Jenang Gemi reporting</h1>
<?php if (!$authenticated): ?><p>Sign in directly to your dashboard here.</p><p><?= $e($loginError ?? '') ?></p>
<form method="post"><input type="hidden" name="intent" value="<?= $e($intent) ?>"><input type="hidden" name="csrf" value="<?= $e($csrf) ?>"><input type="hidden" name="action" value="login"><label>Dashboard login code <input type="password" name="code" required autocomplete="current-password"></label><button>Sign in</button></form>
<?php else: ?><p>Allow ChatGPT to read product sales for <?= $e(implode(', ',$c['brands'])) ?>. No business writes or money transfers.</p>
<p>Accounts: <?= $e(implode(', ',$c['accounts'])) ?>. Partner scope: <?= $e(implode(', ',$c['partners'])) ?>.</p>
<p>This uses the shared Executive login and grants the configured reporting identity <?= $e($c['subject']) ?>. Disconnecting revokes this token family; an administrator can revoke all grants.</p>
<form method="post"><input type="hidden" name="intent" value="<?= $e($intent) ?>"><input type="hidden" name="csrf" value="<?= $e($csrf) ?>"><button name="action" value="approve">Allow reporting</button><button name="action" value="deny">Cancel</button></form>
<?php endif ?></html>
