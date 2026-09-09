<?php
declare(strict_types=1);

function ed_navigation_map(): array
{
    static $map;
    return $map ??= json_decode((string) file_get_contents(__DIR__ . '/navigation-map.json'), true, 512, JSON_THROW_ON_ERROR);
}
function ed_navigation_escape(string $value): string { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function ed_navigation_icon(string $key): string
{
    static $icons;
    $icons ??= json_decode((string) file_get_contents(__DIR__ . '/assets/navigation/icons.json'), true, 512, JSON_THROW_ON_ERROR);
    return $icons[$key] ?? $icons['home'];
}
function ed_navigation_current(): string
{
    $path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/dashboard/'), PHP_URL_PATH) ?: '/dashboard/';
    $path = rtrim((string) preg_replace('~/index\.php$~', '/', $path), '/') . '/';
    $view = strtolower(trim((string) ($_GET['view'] ?? 'overview')));
    $aliases = ['home'=>'campaigns','campaign'=>'campaigns','landing'=>'campaigns','landing-pages'=>'campaigns','ads'=>'ad-view','ad_view'=>'ad-view','shopee-ads'=>'ad-view','site'=>'website','inventory'=>'inventory-recap','inventory_recap'=>'inventory-recap','purchase'=>'purchase-order','purchase_order'=>'purchase-order','cash-control'=>'accounting','cash_control'=>'accounting','profit_loss'=>'profit-loss','p&l'=>'profit-loss'];
    $view = $aliases[$view] ?? $view;
    if ($path === '/dashboard/' && $view === 'accounting') return 'accounting';
    if ($path === '/dashboard/' && $view === 'profit-loss') return 'pnl';
    foreach (ed_navigation_map()['pages'] as $page) {
        $sourcePath = parse_url($page['href'], PHP_URL_PATH);
        if ($sourcePath !== $path) continue;
        if ($path !== '/dashboard/' || parse_url($page['href'], PHP_URL_QUERY) === 'view=' . $view) return $page['id'];
    }
    return 'overview';
}
function render_executive_navigation(): void
{
    $map = ed_navigation_map();
    $pages = array_column($map['pages'], null, 'id');
    $current = ed_navigation_current();
    $page = $pages[$current];
    $root = $page;
    while (!empty($root['parent'])) $root = $pages[$root['parent']];
    $version = max(filemtime(__DIR__ . '/navigation.css'), filemtime(__DIR__ . '/navigation.js'), filemtime(__DIR__ . '/navigation-map.json'));
    echo '<link rel="stylesheet" href="/navigation.css?v=' . $version . '">';
    echo '<link rel="stylesheet" href="/executive-ui.css?v=' . filemtime(__DIR__ . '/executive-ui.css') . '" media="screen">';
    echo '<button type="button" class="admin-mobile-rail-toggle ed-mobile-toggle" data-admin-rail-toggle aria-controls="admin-rail-nav" aria-expanded="false" aria-label="Open navigation">' . ed_navigation_icon('menu') . '</button>';
    echo '<div class="admin-mobile-rail-backdrop" data-admin-rail-backdrop hidden></div>';
    echo '<aside class="admin-rail ed-nav" id="admin-rail-nav" data-admin-rail data-ed-current="' . ed_navigation_escape($current) . '" aria-label="Executive Dashboard navigation">';
    echo '<a class="ed-brand" href="/dashboard/?view=overview">' . ed_navigation_icon('dashboard') . '<span>Executive Dashboard</span></a>';
    echo '<div class="ed-navigation-columns"><nav class="ed-areas" aria-label="Business areas">';
    foreach ($map['areas'] as $area) {
        $landing = $pages[$area['landing']];
        echo '<a class="ed-area' . ($area['id'] === $page['area'] ? ' is-selected' : '') . '" href="' . ed_navigation_escape($landing['href']) . '" data-ed-area="' . $area['id'] . '" aria-label="' . ed_navigation_escape($area['title']) . '"' . ($area['id'] === $page['area'] ? ' aria-current="location"' : '') . (!empty($landing['view']) ? ' data-dashboard-view-link="' . ed_navigation_escape($landing['view']) . '"' : '') . ' title="' . ed_navigation_escape($area['title']) . '">' . ed_navigation_icon($area['icon']) . '<span>' . ed_navigation_escape($area['title']) . '</span></a>';
    }
    echo '</nav><div class="ed-pages"><button type="button" class="ed-search-open" data-ed-search-open>' . ed_navigation_icon('search') . '<span>Find a page</span><kbd>⌘ /</kbd></button>';
    foreach ($map['areas'] as $area) {
        echo '<nav data-ed-section="' . $area['id'] . '" aria-label="' . ed_navigation_escape($area['title']) . ' pages"' . ($area['id'] !== $page['area'] ? ' hidden' : '') . '><h2>' . ed_navigation_escape($area['title']) . '</h2>';
        $section = '';
        foreach ($map['pages'] as $item) {
            if ($item['area'] !== $area['id'] || !empty($item['parent'])) continue;
            if ($item['section'] !== $section) {
                $section = $item['section'];
                echo '<h3>' . ed_navigation_escape($section) . '</h3>';
            }
            $active = $root['id'] === $item['id'];
            echo '<a class="ed-page' . (($item['kind'] ?? '') === 'action' ? ' is-action' : '') . ($active ? ' is-current' : '') . '" href="' . ed_navigation_escape($item['href']) . '" data-ed-page="' . $item['id'] . '"' . ($active ? ' aria-current="page"' : '') . (!empty($item['view']) ? ' data-dashboard-view-link="' . ed_navigation_escape($item['view']) . '"' : '') . ($item['id'] === 'orders' ? ' data-dashboard-nav-section="orders" data-nav-label="All orders"' : ($item['id'] === 'ads' ? ' data-dashboard-nav-section="ad-view"' : '')) . ($item['id'] === 'inventory' ? ' data-menu-alert-item="inventory-recap"' : '') . '>' . ed_navigation_icon($item['icon'] ?? 'arrow') . '<span>' . ed_navigation_escape($item['title']) . '</span>' . ($item['id'] === 'orders' ? '<i class="admin-rail-unpaid-dot" aria-hidden="true"></i>' : '') . '</a>';
        }
        echo '</nav>';
    }
    echo '<div class="ed-nav-footer"><a class="ed-budget-link" data-ed-budget-link href="/dashboard/?view=ad-view" data-dashboard-view-link="ad-view" hidden>Ad credit alert · Review</a><button type="button" data-ed-search-open>' . ed_navigation_icon('map') . ' All pages</button><a href="/">Launch Pad ' . ed_navigation_icon('external') . '</a></div></div></div></aside>';
    echo '<div class="ed-page-tools" data-ed-page-tools><a class="ed-back" data-ed-back href="/dashboard/?view=overview" aria-label="Back">' . ed_navigation_icon('arrow') . '<span>Back</span></a></div>';
    echo '<div class="ed-budget-alert" data-ed-budget-alert role="alert" hidden>' . ed_navigation_icon('alert') . '<div><strong>Ad budget needs attention</strong><span>One or more accounts reached the configured credit threshold.</span></div><a href="/dashboard/?view=ad-view" data-dashboard-view-link="ad-view">Review ad budget ' . ed_navigation_icon('arrow') . '</a></div>';
    echo '<dialog class="ed-search" data-ed-search aria-label="Find a dashboard page"><div class="ed-search-head">' . ed_navigation_icon('search') . '<input type="search" data-ed-search-input aria-label="Search pages" placeholder="Page name, report or task…"><button type="button" data-ed-search-close aria-label="Close page search">' . ed_navigation_icon('close') . '</button></div><div class="ed-search-results" data-ed-search-results></div><footer>↑ ↓ navigate · Enter opens · Esc closes</footer></dialog>';
    echo '<script type="application/json" id="ed-navigation-map">' . json_encode($map, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) . '</script>';
    echo '<script type="module" src="/navigation.js?v=' . $version . '"></script>';
    render_admin_mobile_sidebar_script();
    render_admin_unpaid_order_indicator_script();
}
