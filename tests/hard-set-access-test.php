<?php
declare(strict_types=1);

require dirname(__DIR__) . '/sku-auth.php';

function hard_set_access_expect(bool $expected, bool $actual, string $message): void
{
    if ($expected === $actual) {
        return;
    }
    fwrite(STDERR, $message . PHP_EOL);
    exit(1);
}

jg_admin_start_session();
$_SESSION['jg_sku_authenticated'] = true;
$_SESSION['jg_sku_username'] = 'Executive requester';
$_SESSION['jg_sku_role'] = 'requester';
hard_set_access_expect(false, jg_sku_is_branch(), 'Requester-tier SKU access must not unlock Hard Set.');

$_SESSION['jg_sku_username'] = 'Branch Vincent';
$_SESSION['jg_sku_role'] = 'branch';
hard_set_access_expect(true, jg_sku_is_branch(), 'Branch-tier SKU access must unlock Hard Set.');

jg_sku_logout();
hard_set_access_expect(false, jg_sku_is_branch(), 'Logging out of SKU access must relock Hard Set.');

echo "hard-set-access-test: ok\n";
