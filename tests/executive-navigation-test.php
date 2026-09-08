<?php
declare(strict_types=1);
require dirname(__DIR__) . '/admin-nav.php';
require dirname(__DIR__) . '/navigation.php';
function nav_expect(bool $ok, string $message): void { if (!$ok) throw new RuntimeException($message); }
$root = dirname(__DIR__);
$map = ed_navigation_map();
$pages = array_column($map['pages'], null, 'id');
nav_expect(count($pages) === count($map['pages']), 'Duplicate navigation IDs');
$routes = array_fill_keys(array_map(static fn($p) => parse_url($p['href'], PHP_URL_PATH), array_merge($map['pages'], $map['utilities'])), true);
$files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS));
$count = 0;
foreach ($files as $file) {
    $relative = substr($file->getPathname(), strlen($root) + 1);
    if ($file->getFilename() !== 'index.php' || str_starts_with($relative, 'api/') || str_starts_with($relative, '.git/')) continue;
    $route = $relative === 'index.php' ? '/' : '/' . substr($relative, 0, -9);
    nav_expect(isset($routes[$route]), 'Unmapped application route: ' . $route); $count++;
}
preg_match_all('/data-view-panel="([^"]+)"/', file_get_contents($root . '/dashboard/index.php'), $matches);
foreach ($matches[1] as $view) nav_expect(count(array_filter($map['pages'], static fn($p) => ($p['view'] ?? null) === $view)) === 1, 'Unmapped or duplicate dashboard view: ' . $view);
foreach ($pages as $page) {
    nav_expect(is_file($root . parse_url($page['href'], PHP_URL_PATH) . 'index.php'), 'Broken route: ' . $page['href']);
    if (!empty($page['parent'])) nav_expect(isset($pages[$page['parent']]), 'Missing parent: ' . $page['id']);
    $_SERVER['REQUEST_URI'] = $page['href']; parse_str(parse_url($page['href'], PHP_URL_QUERY) ?? '', $_GET);
    nav_expect(ed_navigation_current() === $page['id'], 'Wrong current page: ' . $page['id']);
}
$_SERVER['REQUEST_URI'] = '/dashboard/product-analytics/?product=syrup&flavor=original'; $_GET = ['product'=>'syrup'];
ob_start(); render_admin_sidebar(); $html = ob_get_clean();
nav_expect(str_contains($html, 'href="/profit-loss/"'), 'Accounting missing');
nav_expect(str_contains($html, 'data-ed-current="analytics"'), 'Detail context missing');
nav_expect(str_contains($html, 'data-dashboard-nav-section="ad-view"'), 'Ad alert hook missing');
nav_expect(str_contains($html, 'data-dashboard-nav-section="orders"'), 'Unpaid alert hook missing');
nav_expect(!str_contains($html, 'href="../'), 'Nested page has relative navigation links');
nav_expect(str_contains($html, 'Executive Dashboard'), 'Wrong workspace name');
// Every former hamburger destination must now be directly listed in an area.
foreach (admin_quick_menu_definitions() as $key => $item) {
    $href = '/' . preg_replace('~^(?:\.\./)+~', '', $item['href']);
    $mapped = array_values(array_filter($pages, static fn($p) => $p['href'] === $href));
    nav_expect(count($mapped) === 1 && empty($mapped[0]['parent']), 'Former menu destination missing from sidebar: ' . $key);
    nav_expect(str_contains($html, 'data-ed-page="' . $mapped[0]['id'] . '"'), 'Former menu destination not rendered: ' . $key);
}
nav_expect(str_contains($html, 'data-menu-alert-item="inventory-recap"'), 'Stock alert hook missing from sidebar');
ob_start(); render_admin_topbar_actions(); $topbar = ob_get_clean();
nav_expect(!str_contains($topbar, 'data-menu-trigger'), 'Shared hamburger still rendered');
nav_expect(!str_contains(file_get_contents($root . '/dashboard/index.php'), 'data-menu-trigger'), 'Dashboard hamburger still rendered');
nav_expect(str_contains($topbar, 'data-billing-notification-toggle'), 'Notifications removed');
nav_expect(str_contains($topbar, 'data-dashboard-search-open'), 'Record search removed');
echo "PASS: " . count($pages) . " destinations, $count application routes, " . count($matches[1]) . " embedded views, detail contexts and notification hooks.\n";
