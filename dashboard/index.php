<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

$hasError = false;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $submittedCode = (string) ($_POST['admin_code'] ?? '');
    if (jg_admin_attempt_login($submittedCode)) {
        header('Location: ./');
        exit;
    }
    $hasError = true;
}

$isAuthenticated = jg_admin_is_authenticated();
if ($isAuthenticated) {
    $requestedView = strtolower(trim((string) ($_GET['view'] ?? 'overview')));
    if (in_array($requestedView, ['accounting', 'cash-control', 'cash_control', 'profit-loss', 'profit_loss'], true)) {
        header('Location: ../profit-loss/', true, 302);
        exit;
    }
}
$dashboardBuildVersion = 'exec3.76.0';
$adminCssVersion = $dashboardBuildVersion . '-' . (string) @filemtime(dirname(__DIR__) . '/admin.css');
$adminJsVersion = $dashboardBuildVersion . '-' . (string) @filemtime(dirname(__DIR__) . '/admin.js');
$storeOpsJsVersion = $dashboardBuildVersion . '-' . (string) @filemtime(dirname(__DIR__) . '/store-ops.js');
?>
<!DOCTYPE html>
<html lang="id" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
<?php render_admin_initial_theme_script(); ?>
<?php render_admin_favicons(admin_dashboard_view_favicon_key()); ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
</head>
<body class="admin-body<?php echo $isAuthenticated ? ' is-dashboard is-loading is-executive-dashboard' : ' is-login'; ?>">
<div class="admin-build-badge" aria-label="Dashboard build version">
    Build <?php echo htmlspecialchars($dashboardBuildVersion, ENT_QUOTES); ?>
</div>
<?php if (!$isAuthenticated): ?>
    <main class="admin-login-shell">
        <div class="admin-login-orb admin-login-orb-a"></div>
        <div class="admin-login-orb admin-login-orb-b"></div>
        <section class="admin-login-card">
            <div class="admin-login-brand">
                <span class="admin-chip">Executive Access</span>
                <h1>Executive Dashboard</h1>
                <p>Secure access to traffic, attribution, conversion flow, and operational views across the wider Jenang Gemi admin scope.</p>
            </div>
            <form method="post" class="admin-login-form" autocomplete="off">
                <label for="admin_code">Security Code</label>
                <input id="admin_code" name="admin_code" type="password" inputmode="numeric" pattern="[0-9]*" placeholder="Enter 6-digit security code" required autofocus>
                <?php if ($hasError): ?>
                    <p class="admin-login-error">Security code tidak valid.</p>
                <?php endif; ?>
                <button type="submit" class="admin-primary-btn">Access Dashboard</button>
            </form>
        </section>
    </main>
<?php else: ?>
    <div class="admin-rotate-screen" aria-hidden="true">
        <div class="admin-rotate-card">
            <span class="admin-chip">Landscape Recommended</span>
            <h2>Putar ponsel ke samping</h2>
            <p>Dashboard ini dibuat untuk tampilan lebar agar grafik dan tabel tetap terbaca penuh.</p>
        </div>
    </div>
    <div class="admin-loader" data-admin-loader aria-live="polite">
        <div class="admin-loader-panel">
            <span class="admin-chip">Preparing Dashboard</span>
            <h2>Loading executive overview</h2>
            <p>Fetching analytics, rendering charts, and preparing the full interface before reveal.</p>
            <div class="admin-loader-worm" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
            </div>
            <div class="admin-loader-bar">
                <span class="admin-loader-progress" data-admin-loader-progress></span>
            </div>
            <strong class="admin-loader-label" data-admin-loader-label>Initializing...</strong>
        </div>
    </div>
    <div class="admin-app admin-app-suite" data-admin-dashboard data-analytics-endpoint="../api/analytics/" data-live-endpoint="../api/live/" data-settings-endpoint="../api/settings/" data-sales-endpoint="../api/sales/" data-orders-endpoint="../api/orders/" data-wallet-endpoint="../api/wallet/" data-inventory-recap-endpoint="../api/inventory-recap/" data-sku-catalog-endpoint="../api/sales/?action=sku_catalog" data-context-endpoint="../api/context/" data-zero-store-endpoint="../api/zero-store/" data-jenang-gemi-store-endpoint="../api/jenang-gemi-store/" data-website-orders-endpoint="../api/website-orders/" data-hard-set-endpoint="../api/hard-set/" data-province-map-url="../assets/data/indonesia-38-provinces.geojson">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <div class="admin-shell">
            <?php render_admin_sidebar('home'); ?>

            <div class="admin-shell-main">
                <header class="admin-topbar">
                    <div class="admin-topbar-left">
                        <div class="admin-topbar-brand">
                            <span class="admin-admin-mark">Admin Scope</span>
                            <h1>Executive <span class="admin-mobile-title-tail">Dashboard</span></h1>
                            <p data-active-view-label>Home</p>
                        </div>
                    </div>
                    <div class="admin-topbar-actions">
                        <div class="admin-search-shell admin-search-shell-topbar" data-dashboard-search-shell>
                            <div class="admin-search-surface" aria-hidden="true">
                                <div class="admin-search-surface-glow"></div>
                                <div class="admin-search-topline"></div>
                            </div>
                            <div class="admin-search-sweep" aria-hidden="true"></div>
                            <button type="button" class="admin-search-icon-button" data-dashboard-search-open aria-label="Open dashboard search" aria-expanded="false">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4.5 4.5"/></svg>
                            </button>
                            <form class="admin-search-form" data-dashboard-search-form role="search" aria-label="Search Executive Dashboard">
                                <input type="search" class="admin-search-input" data-dashboard-search-input placeholder="Search" autocomplete="off">
                            </form>
                            <button type="button" class="admin-search-close-button" data-dashboard-search-close aria-label="Close dashboard search">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
                            </button>
                            <div class="admin-search-focus-ring" aria-hidden="true"></div>
                            <div class="admin-search-results" data-dashboard-search-results hidden></div>
                        </div>
                        <button type="button" class="admin-notification-button" data-notification-toggle aria-label="Open website order notifications" aria-expanded="false">
                            <span class="admin-notification-button-icon">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
                                <span data-notification-count hidden>0</span>
                            </span>
                            <span class="admin-notification-button-copy"><strong>Order verification</strong><small data-notification-summary>No website orders pending</small></span>
                        </button>
                        <div class="admin-menu-shell" data-menu-shell>
                            <button type="button" class="admin-ghost-btn admin-menu-trigger" data-menu-trigger data-menu-alert-trigger aria-expanded="false" aria-label="Open dashboard menu">
                                <svg class="admin-menu-open-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
                                <svg class="admin-menu-close-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
                            </button>
                            <div class="admin-menu-panel" data-menu-panel aria-label="Executive Dashboard navigation" hidden>
                                <?php render_admin_dashboard_topbar_menu_items(admin_dashboard_view_menu_context()); ?>
                            </div>
                        </div>
                    </div>
                </header>

                <main class="admin-layout">
                    <section class="admin-view is-active" data-view-panel="overview">
                <section class="admin-overview-strip">
                    <div class="admin-overview-year-actions">
                        <label class="admin-overview-year-field" data-overview-year-controls>
                            <span>Year</span>
                            <select class="admin-overview-year-select" data-overview-year-select aria-label="Select sales year" disabled>
                                <option>Loading...</option>
                            </select>
                        </label>
                        <button type="button" class="admin-sales-recap-trigger" data-sales-recap-toggle aria-expanded="false">Sales Recap</button>
                    </div>
                    <div class="admin-overview-strip-meta">
                        <div class="admin-overview-sync-row">
                            <button type="button" class="admin-overview-refresh" data-overview-refresh aria-label="Refresh dashboard view">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.34 5.66"/><path d="M20 4v7h-7"/></svg>
                                <span data-overview-refresh-label>Refresh View</span>
                            </button>
                            <span class="admin-live-pill"><span class="admin-live-dot"></span>Live</span>
                        </div>
                        <small data-overview-last-updated>Updated after marketplace sync</small>
                    </div>
                </section>

                <section class="admin-sales-recap" data-sales-recap aria-hidden="true">
                    <article class="admin-sales-recap-sheet">
                        <div class="admin-sales-recap-head">
                            <div>
                                <span class="admin-panel-kicker">Sales Recap</span>
                                <h3 data-sales-recap-title>Yearly recap</h3>
                                <span class="admin-panel-meta" data-sales-recap-meta>Waiting for sales data</span>
                            </div>
                            <div class="admin-sales-recap-actions">
                                <button type="button" class="admin-sales-recap-icon" data-sales-recap-copy aria-label="Copy Sales Recap" title="Copy Sales Recap" disabled>
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
                                </button>
                                <button type="button" class="admin-sales-recap-icon" data-sales-recap-download aria-label="Download Sales Recap CSV" title="Download Sales Recap CSV" disabled>
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
                                </button>
                                <button type="button" class="admin-sales-recap-icon admin-sales-recap-close" data-sales-recap-close aria-label="Close Sales Recap" title="Close Sales Recap">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
                                </button>
                            </div>
                        </div>
                        <div class="admin-sales-recap-table-wrap">
                            <table class="admin-sales-recap-table">
                                <thead data-sales-recap-head>
                                    <tr><th>Metric</th><th>Total</th></tr>
                                </thead>
                                <tbody data-sales-recap-body>
                                    <tr><td colspan="2" class="admin-empty">Loading Sales Recap.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </article>
                </section>

                <section class="admin-main-grid admin-main-grid-compact">
                    <article class="admin-panel admin-panel-chart admin-panel-wide admin-overview-primary-chart" data-chart-id="C1">
                        <div class="admin-panel-head">
                            <div>
                                <div class="admin-chart-title-row">
                                    <h3 data-overview-trend-title>Revenue by month</h3>
                                    <button type="button" class="admin-chart-info-btn" aria-label="About revenue by month" data-chart-info="Shows how the selected year is performing month by month. Use the buttons to switch between seller-received revenue, gross profit after product cost, completed orders, and items sold. Historical values saved in Open Context are included. If the current month is still in progress, the dotted point estimates where it may finish based on the pace so far."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                </div>
                                <span class="admin-panel-meta" data-overview-trend-meta>Selected year</span>
                            </div>
                            <div class="admin-panel-inline-toggles admin-sliding-chart-toggle" data-overview-metric-controls data-sliding-chart-toggle role="group" aria-label="Revenue chart metric">
                                <button type="button" class="admin-toggle-pill is-active" data-overview-metric="revenue"><span>Revenue</span></button>
                                <button type="button" class="admin-toggle-pill" data-overview-metric="gross_profit"><span>Gross Profit</span></button>
                                <button type="button" class="admin-toggle-pill" data-overview-metric="orders"><span>Orders QTY</span></button>
                                <button type="button" class="admin-toggle-pill" data-overview-metric="item_count"><span>Items QTY</span></button>
                            </div>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas admin-chart-canvas-lg" data-overview-trend-chart width="1200" height="300"></canvas>
                            <div class="admin-chart-range-control" data-overview-range-shell>
                                <button type="button" class="admin-chart-icon-btn" aria-label="Select custom chart date range" data-overview-range-toggle><span class="admin-chart-icon-calendar" aria-hidden="true"></span></button>
                                <button type="button" class="admin-chart-icon-btn admin-chart-reset-btn" aria-label="Reset custom chart date range" data-overview-range-reset hidden><span class="admin-chart-icon-restart" aria-hidden="true"></span></button>
                                <div class="admin-chart-range-popover" data-overview-range-popover hidden>
                                    <div class="admin-range-calendar">
                                        <div class="admin-range-calendar-head">
                                            <button type="button" class="admin-range-nav" aria-label="Previous month" data-overview-range-prev></button>
                                            <strong data-overview-range-month></strong>
                                            <button type="button" class="admin-range-nav admin-range-nav-next" aria-label="Next month" data-overview-range-next></button>
                                        </div>
                                        <div class="admin-range-weekdays" aria-hidden="true">
                                            <span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span>
                                        </div>
                                        <div class="admin-range-grid" data-overview-range-grid></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </article>

                    <div class="admin-overview-totals-row">
                    <article class="admin-panel admin-panel-chart" data-chart-id="C2">
                        <div class="admin-panel-head">
                            <div>
                                <div class="admin-chart-title-row">
                                    <h3>Order volume</h3>
                                    <button type="button" class="admin-chart-info-btn" aria-label="About order volume" data-chart-info="Compares monthly demand. Orders means completed marketplace orders, Items means units inside those orders, and AOV means average seller-received rupiah per order. Use it to see whether growth is coming from more buyers, bigger baskets, or both."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                </div>
                                <span class="admin-panel-meta">Live from stored order facts</span>
                            </div>
                            <div class="admin-panel-inline-toggles admin-sliding-chart-toggle" data-sliding-chart-toggle role="group" aria-label="Order volume chart metric">
                                <button type="button" class="admin-toggle-pill is-active" data-overview-volume-metric="orders"><span>Orders</span></button>
                                <button type="button" class="admin-toggle-pill" data-overview-volume-metric="item_count"><span>Items</span></button>
                                <button type="button" class="admin-toggle-pill" data-overview-volume-metric="average_order_value"><span>AOV</span></button>
                            </div>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas" data-overview-orders-chart width="880" height="280"></canvas>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-chart" data-chart-id="C3">
                        <div class="admin-panel-head">
                            <div>
                                <div class="admin-chart-title-row">
                                    <h3>Current totals</h3>
                                    <button type="button" class="admin-chart-info-btn" aria-label="About current totals" data-chart-info="Year-to-date snapshot for the selected year. Revenue is money the business receives after marketplace deductions, Marketplace Fees are the platform deductions, Gross Profit is revenue minus product cost, and Orders QTY is completed orders with item count shown below."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                </div>
                                <span class="admin-panel-meta">Year to date</span>
                            </div>
                        </div>
                        <div class="admin-mini-metric-list">
                            <div><span>Revenue</span><strong data-overview-summary-sales>Rp0</strong></div>
                            <div><span>Marketplace Fees</span><strong data-overview-summary-orders>Rp0</strong></div>
                            <div><span>Gross Profit</span><strong data-overview-summary-aov>Rp0</strong></div>
                            <div><span>Orders QTY</span><strong data-overview-summary-best-month>0</strong><small data-overview-summary-best-month-meta>0 items</small></div>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-chart admin-overview-hourly-card" data-chart-id="C4">
                        <div class="admin-panel-head">
                            <div>
                                <div class="admin-chart-title-row">
                                    <h3 data-overview-hourly-title>Today Orders QTY by hour</h3>
                                    <button type="button" class="admin-chart-info-btn" aria-label="About today by hour" data-chart-info="Shows today's marketplace activity by hour in the selected timezone. Use it to spot the hours when customers are buying, then switch metrics to compare orders, units, revenue, or gross profit."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                </div>
                                <span class="admin-panel-meta" data-overview-hourly-meta>Live today, 0-23</span>
                            </div>
                            <div class="admin-panel-inline-toggles admin-sliding-chart-toggle" data-sliding-chart-toggle role="group" aria-label="Hourly chart metric">
                                <button type="button" class="admin-toggle-pill is-active" data-overview-hourly-metric="orders"><span>Orders</span></button>
                                <button type="button" class="admin-toggle-pill" data-overview-hourly-metric="gross_profit"><span>Gross Profit</span></button>
                                <button type="button" class="admin-toggle-pill" data-overview-hourly-metric="revenue"><span>Revenue</span></button>
                                <button type="button" class="admin-toggle-pill" data-overview-hourly-metric="item_count"><span>QTY Sold</span></button>
                            </div>
                        </div>
                        <div class="admin-chart-surface admin-chart-surface-tight">
                            <canvas class="admin-chart-canvas" data-overview-hourly-chart width="880" height="280"></canvas>
                        </div>
                    </article>
                    </div>

                    <article class="admin-panel admin-panel-chart admin-panel-wide" data-chart-id="C5">
                        <div class="admin-panel-head">
                            <div>
                                <div class="admin-chart-title-row">
                                    <h3>Units sold by platform account</h3>
                                    <button type="button" class="admin-chart-info-btn" aria-label="About units sold by platform account" data-chart-info="Shows which marketplace accounts are supplying the units each month. Each color is one account, so a tall segment means that account drove more item sales in that month."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                </div>
                                <span class="admin-panel-meta">Monthly unit contribution by account</span>
                            </div>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas" data-overview-account-stack-chart width="1200" height="300"></canvas>
                        </div>
                    </article>

                    <div class="admin-flavor-chart-grid">
                    <article class="admin-panel admin-panel-chart admin-flavor-chart-card" data-chart-id="C6">
                        <div class="admin-panel-head">
                            <div>
                                <div class="admin-chart-title-row">
                                    <h3>Syrup flavor share</h3>
                                    <button type="button" class="admin-chart-info-btn" aria-label="About syrup flavor share" data-chart-info="Looks only at syrup SKUs from the SKU database and groups sales by flavor. Switch between Qty and Rp to see whether a flavor is winning by units sold or by seller-received revenue."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                </div>
                                <span class="admin-panel-meta">Most popular syrup flavors</span>
                            </div>
                            <div class="admin-panel-inline-toggles admin-sliding-chart-toggle" data-sliding-chart-toggle role="group" aria-label="Syrup flavor chart metric">
                                <button type="button" class="admin-toggle-pill is-active" data-overview-flavor-metric="quantity"><span>Qty</span></button>
                                <button type="button" class="admin-toggle-pill" data-overview-flavor-metric="net_revenue"><span>Rp</span></button>
                            </div>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas admin-chart-canvas-lg" data-overview-syrup-flavor-chart width="720" height="440"></canvas>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-chart admin-flavor-chart-card" data-chart-id="C7">
                        <div class="admin-panel-head">
                            <div>
                                <div class="admin-chart-title-row">
                                    <h3>Drops flavor share</h3>
                                    <button type="button" class="admin-chart-info-btn" aria-label="About drops flavor share" data-chart-info="Looks only at drops SKUs from the SKU database and groups sales by flavor. Switch between Qty and Rp to compare unit demand against seller-received revenue."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                </div>
                                <span class="admin-panel-meta">Most popular drops flavors</span>
                            </div>
                            <div class="admin-panel-inline-toggles admin-sliding-chart-toggle" data-sliding-chart-toggle role="group" aria-label="Drops flavor chart metric">
                                <button type="button" class="admin-toggle-pill is-active" data-overview-flavor-metric="quantity"><span>Qty</span></button>
                                <button type="button" class="admin-toggle-pill" data-overview-flavor-metric="net_revenue"><span>Rp</span></button>
                            </div>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas admin-chart-canvas-lg" data-overview-drops-flavor-chart width="720" height="440"></canvas>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-chart admin-flavor-chart-card" data-chart-id="C8">
                        <div class="admin-panel-head">
                            <div>
                                <div class="admin-chart-title-row">
                                    <h3>Bubur flavor share</h3>
                                    <button type="button" class="admin-chart-info-btn" aria-label="About Bubur flavor share" data-chart-info="Looks only at Jenang Gemi Bubur SKUs from the SKU database and groups sales by flavor, matching the Syrup and Drops flavor chart behavior."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                </div>
                                <span class="admin-panel-meta">Most popular Bubur flavors</span>
                            </div>
                            <div class="admin-panel-inline-toggles admin-sliding-chart-toggle" data-sliding-chart-toggle role="group" aria-label="Bubur flavor chart metric">
                                <button type="button" class="admin-toggle-pill is-active" data-overview-flavor-metric="quantity"><span>Qty</span></button>
                                <button type="button" class="admin-toggle-pill" data-overview-flavor-metric="net_revenue"><span>Rp</span></button>
                            </div>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas admin-chart-canvas-lg" data-overview-bubur-flavor-chart width="720" height="440"></canvas>
                        </div>
                    </article>
                    </div>

                    <article class="admin-panel admin-panel-chart admin-panel-wide admin-location-heatmap-card" data-chart-id="C12">
                        <div class="admin-panel-head">
                            <div>
                                <div class="admin-chart-title-row">
                                    <h3>Orders by province</h3>
                                    <button type="button" class="admin-chart-info-btn" aria-label="About orders by province" data-chart-info="Maps distinct completed marketplace orders by Indonesian province for the selected year. Darker blue means more matched order addresses. Rows without a recognizable province stay out of the map count."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                </div>
                                <span class="admin-panel-meta" data-overview-location-status>Loading order locations</span>
                            </div>
                        </div>
                        <div class="admin-location-heatmap-shell">
                            <div class="admin-location-map" data-overview-location-map aria-label="Indonesia orders by province heat map"></div>
                            <aside class="admin-location-summary" aria-label="Top provinces by order count">
                                <div class="admin-location-legend" aria-hidden="true">
                                    <span>Low</span>
                                    <i></i>
                                    <span>High</span>
                                </div>
                                <div class="admin-location-list" data-overview-location-list></div>
                            </aside>
                        </div>
                    </article>

                    <div class="admin-product-mix-chart-grid">
                    <article class="admin-panel admin-panel-chart admin-product-mix-card admin-sku-product-card" data-chart-id="C13">
                        <div class="admin-panel-head">
                            <div>
                                <div class="admin-chart-title-row">
                                    <h3>Sales by SKU product</h3>
                                    <button type="button" class="admin-chart-info-btn" aria-label="About sales by SKU product" data-chart-info="Stacks each month by the general SKU DB product field, such as Bubur, Syrup, or Drops. Sticker SKUs are excluded, and the chart does not split bars by flavor or volume."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                </div>
                                <span class="admin-panel-meta">General SKU product field only</span>
                            </div>
                            <div class="admin-panel-inline-toggles admin-sliding-chart-toggle" data-sliding-chart-toggle role="group" aria-label="Product chart metric">
                                <button type="button" class="admin-toggle-pill is-active" data-overview-product-metric="quantity"><span>Qty</span></button>
                                <button type="button" class="admin-toggle-pill" data-overview-product-metric="net_revenue"><span>Rp</span></button>
                            </div>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas" data-overview-product-stack-chart width="760" height="300"></canvas>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-chart admin-product-mix-card" data-chart-id="C14">
                        <div class="admin-panel-head">
                            <div>
                                <div class="admin-chart-title-row">
                                    <h3>Syrup volume mix</h3>
                                    <button type="button" class="admin-chart-info-btn" aria-label="About Syrup volume mix" data-chart-info="Shows Syrup sales split by the requested SKU DB sizes: 550ml, 250ml, and 50ml."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                </div>
                                <span class="admin-panel-meta">550ml, 250ml, 50ml</span>
                            </div>
                            <div class="admin-panel-inline-toggles admin-sliding-chart-toggle" data-sliding-chart-toggle role="group" aria-label="Syrup volume chart metric">
                                <button type="button" class="admin-toggle-pill is-active" data-overview-product-metric="quantity"><span>Qty</span></button>
                                <button type="button" class="admin-toggle-pill" data-overview-product-metric="net_revenue"><span>Rp</span></button>
                            </div>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas admin-chart-canvas-lg" data-overview-syrup-volume-chart width="620" height="340"></canvas>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-chart admin-product-mix-card" data-chart-id="C15">
                        <div class="admin-panel-head">
                            <div>
                                <div class="admin-chart-title-row">
                                    <h3>Drops volume mix</h3>
                                    <button type="button" class="admin-chart-info-btn" aria-label="About Drops volume mix" data-chart-info="Shows Drops sales split by the requested SKU DB sizes: 30ml, 10ml, and 5ml."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                </div>
                                <span class="admin-panel-meta">30ml, 10ml, 5ml</span>
                            </div>
                            <div class="admin-panel-inline-toggles admin-sliding-chart-toggle" data-sliding-chart-toggle role="group" aria-label="Drops volume chart metric">
                                <button type="button" class="admin-toggle-pill is-active" data-overview-product-metric="quantity"><span>Qty</span></button>
                                <button type="button" class="admin-toggle-pill" data-overview-product-metric="net_revenue"><span>Rp</span></button>
                            </div>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas admin-chart-canvas-lg" data-overview-drops-volume-chart width="620" height="340"></canvas>
                        </div>
                    </article>
                    </div>
                </section>
                    </section>

                    <section class="admin-view admin-context-view" data-view-panel="context">
                        <section class="admin-context-toolbar">
                            <div class="admin-context-segments" role="group" aria-label="Context period">
                                <button type="button" class="admin-context-segment is-active" data-context-group="2025">2025</button>
                                <button type="button" class="admin-context-segment" data-context-group="2026-months">2026 Jan-Apr</button>
                                <button type="button" class="admin-context-segment" data-context-group="2026-may">May 1-19</button>
                            </div>
                            <button type="button" class="admin-chart-info-btn admin-context-info" aria-label="How to use Open Context" data-chart-info="Use Open Context when trusted spreadsheet or manual history needs to appear in the executive charts. Pick a period, enter only the values you know, and save. Blank fields leave that metric untouched. Monthly periods replace that month; the May 1-19 daily entries are combined into May."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                            <span class="admin-context-status" data-context-status aria-live="polite">Ready</span>
                            <button type="button" class="admin-primary-btn admin-context-save" data-context-save>Save changes</button>
                        </section>
                        <section class="admin-context-workspace">
                            <nav class="admin-context-periods" data-context-periods aria-label="Editable context periods"></nav>
                            <article class="admin-context-editor">
                                <div class="admin-context-period-mark">
                                    <strong data-context-period-title>January 2025</strong>
                                    <button type="button" class="admin-chart-info-btn" aria-label="About this period" data-chart-info="These saved values feed the C1 chart and annual totals for the selected period. Revenue and Gross Profit are rupiah amounts. Orders QTY and Items QTY are whole numbers, not rupiah."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                </div>
                                <form class="admin-context-form" data-context-form autocomplete="off">
                                    <label class="admin-context-field">
                                        <span class="admin-context-field-icon">Rp</span>
                                        <input type="text" inputmode="numeric" data-context-field="revenue" aria-label="Revenue" placeholder="Revenue">
                                        <button type="button" class="admin-chart-info-btn" aria-label="About Revenue" data-chart-info="Money the business actually receives for the period after marketplace deductions. Do not enter the customer-paid checkout total if it includes platform fees that the business never keeps."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                    </label>
                                    <label class="admin-context-field">
                                        <span class="admin-context-field-icon">Rp</span>
                                        <input type="text" inputmode="numeric" data-context-field="gross_profit" aria-label="Gross Profit" placeholder="Gross Profit">
                                        <button type="button" class="admin-chart-info-btn" aria-label="About Gross Profit" data-chart-info="Revenue left after product cost for the same period. This is before administration, marketing, loan, or other operating expenses."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                    </label>
                                    <label class="admin-context-field">
                                        <span class="admin-context-field-icon">#</span>
                                        <input type="text" inputmode="numeric" data-context-field="orders_qty" aria-label="Orders quantity" placeholder="Orders QTY">
                                        <button type="button" class="admin-chart-info-btn" aria-label="About Orders QTY" data-chart-info="Completed marketplace orders counted in this period. Cancelled, unpaid, refunded, returned, rejected, failed, expired, or closed orders should stay out."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                    </label>
                                    <label class="admin-context-field">
                                        <span class="admin-context-field-icon">×</span>
                                        <input type="text" inputmode="numeric" data-context-field="items_qty" aria-label="Items quantity" placeholder="Items QTY">
                                        <button type="button" class="admin-chart-info-btn" aria-label="About Items QTY" data-chart-info="Total units inside the completed orders. One order can contain more than one item, so this number is often higher than Orders QTY."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                    </label>
                                </form>
                                <div class="admin-context-progress">
                                    <span data-context-progress-bar></span>
                                </div>
                                <p class="admin-form-error" data-context-error hidden></p>
                            </article>
                        </section>
                    </section>

                    <section class="admin-view admin-view-daily" data-view-panel="daily">
                <section class="daily-sheet-shell">
                    <div class="daily-sheet-toolbar">
                        <div class="daily-sheet-title">
                            <span class="admin-chip admin-chip-accent">Daily</span>
                            <h2>Daily spreadsheet</h2>
                            <p data-daily-status>Loading current month Daily.</p>
                        </div>
                        <div class="daily-sheet-actions">
                            <label class="daily-month-picker">
                                <span>Month <span class="admin-info-dot" title="Shows the selected calendar month in the selected timezone. The dashboard opens on the current month automatically." aria-label="Shows the selected calendar month in the selected timezone. The dashboard opens on the current month automatically.">i</span></span>
                                <input type="month" data-daily-month>
                            </label>
                            <button type="button" class="admin-ghost-btn daily-export-btn" data-daily-export disabled>
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11"/><path d="m7 10 5 5 5-5"/><path d="M5 19h14"/></svg>
                                <span>Export PDF</span>
                            </button>
                        </div>
                    </div>

                    <div class="daily-trend-panel">
                        <div class="daily-trend-head">
                            <div>
                                <span class="admin-panel-kicker">Month-to-date</span>
                                <h3 data-daily-trend-title>Revenue by day</h3>
                                <span class="admin-panel-meta" data-daily-trend-meta>Waiting for Daily data</span>
                            </div>
                            <div class="admin-panel-inline-toggles admin-sliding-chart-toggle daily-trend-toggle" data-daily-metric-controls data-sliding-chart-toggle role="group" aria-label="Daily chart metric">
                                <button type="button" class="admin-toggle-pill is-active" data-daily-metric="revenue"><span>Revenue</span></button>
                                <button type="button" class="admin-toggle-pill" data-daily-metric="qty"><span>Qty</span></button>
                                <button type="button" class="admin-toggle-pill" data-daily-metric="orders"><span>Orders</span></button>
                            </div>
                        </div>
                        <div class="daily-trend-grid">
                            <div class="daily-trend-chart-surface">
                                <canvas class="admin-chart-canvas daily-trend-chart" data-daily-trend-chart width="1200" height="260"></canvas>
                            </div>
                            <div class="daily-trend-stats" aria-label="Daily month summary">
                                <div><span>Revenue</span><strong data-daily-summary-revenue>Rp0</strong></div>
                                <div><span>Qty</span><strong data-daily-summary-qty>0</strong></div>
                                <div><span>Orders</span><strong data-daily-summary-orders>0</strong></div>
                                <div><span>Avg / day</span><strong data-daily-summary-average>Rp0</strong></div>
                            </div>
                        </div>
                    </div>

                    <div class="daily-sheet-scroll" data-daily-sheet-scroll>
                        <table class="daily-sheet-table" data-daily-sheet>
                            <thead data-daily-sheet-head>
                                <tr><th>Day</th><th>Loading Daily.</th></tr>
                            </thead>
                            <tbody data-daily-sheet-body>
                                <tr><td colspan="2" class="admin-empty">Loading Daily.</td></tr>
                            </tbody>
                            <tfoot data-daily-sheet-foot></tfoot>
                        </table>
                    </div>

                    <div class="daily-sheet-footbar">
                        <form class="daily-platform-form" data-daily-platform-form>
                            <label>
                                <span>Add account column <span class="admin-info-dot" title="Adds a zero-value platform or platform/account column until that account appears in order data." aria-label="Adds a zero-value platform or platform/account column until that account appears in order data.">i</span></span>
                                <input type="text" data-daily-platform-name placeholder="Example: Partner Web / Wholesale" maxlength="64">
                            </label>
                            <button type="submit" class="admin-soft-btn daily-add-platform-btn">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                                <span>Add</span>
                            </button>
                        </form>
                        <div class="daily-platform-list" data-daily-platform-list>
                            <p class="admin-empty">No manual account columns.</p>
                        </div>
                    </div>
                </section>
                    </section>

                    <section class="admin-view" data-view-panel="orders">
                <section class="admin-main-grid">
                    <article class="admin-panel admin-panel-table admin-panel-wide">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Orders</span>
                                <h3>Marketplace order facts</h3>
                                <span class="admin-panel-meta" data-orders-status>Loading stored orders from newest to oldest</span>
                            </div>
                            <div class="admin-orders-actions">
                                <button type="button" class="admin-primary-btn admin-orders-ops-btn" data-view-switch="store-ops">Ops</button>
                                <button type="button" class="admin-orders-load-btn" data-orders-load-more hidden>Load older</button>
                                <button type="button" class="admin-orders-icon-btn" data-orders-filter-open aria-label="Open order filters">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6.2 7.1v5.2l-3.6 1.8v-7z"/></svg>
                                </button>
                                <button type="button" class="admin-orders-reset-btn" data-orders-filter-reset aria-label="Reset order filters" hidden>
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
                                </button>
                            </div>
                        </div>
                        <div class="admin-orders-filter-bar" data-orders-active-filters hidden></div>
                        <div class="admin-table-wrap admin-orders-table-wrap" data-orders-scroll>
                            <table class="admin-table admin-orders-table">
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>Order ID</th>
                                        <th>Platform + account</th>
                                        <th>Product Name</th>
                                        <th>QTY</th>
                                        <th>PO</th>
	                                        <th>Revenue</th>
	                                        <th>COGS</th>
	                                        <th>Wallet</th>
	                                        <th>Username</th>
	                                        <th>Address</th>
	                                        <th>Phone</th>
	                                    </tr>
	                                </thead>
	                                <tbody data-orders-table-body>
	                                    <tr><td colspan="12" class="admin-empty">Loading orders.</td></tr>
	                                </tbody>
	                            </table>
	                        </div>
	                    </article>
	                </section>
	                    </section>

	                    <section class="admin-view admin-wallet-view" data-view-panel="wallet">
	                <section class="admin-wallet-command">
		                    <div class="admin-wallet-mode admin-sliding-chart-toggle" data-sliding-chart-toggle role="group" aria-label="Wallet mode">
		                        <button type="button" class="admin-toggle-pill is-active" data-wallet-mode="wallet"><span>Wallet</span></button>
		                        <button type="button" class="admin-toggle-pill" data-wallet-mode="api"><span>API</span></button>
		                    </div>
	                    <div class="admin-wallet-actions">
	                        <span class="admin-panel-meta" data-wallet-status>Loading wallets</span>
	                        <button type="button" class="admin-wallet-backtrack" data-wallet-backtrack>Backtrack</button>
	                        <button type="button" class="admin-orders-icon-btn admin-wallet-refresh" data-wallet-refresh aria-label="Refresh wallets">
	                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 0 1-15.2 6.5L3 16"/><path d="M3 21v-5h5"/><path d="M3 12a9 9 0 0 1 15.2-6.5L21 8"/><path d="M21 3v5h-5"/></svg>
	                        </button>
	                    </div>
	                </section>

	                <section class="admin-wallet-summary" aria-label="Wallet totals">
		                    <article class="admin-wallet-stat"><span>Wallet</span><strong data-wallet-total-balance>Rp0</strong></article>
		                    <article class="admin-wallet-stat"><span>Outstanding</span><strong data-wallet-total-outstanding>Rp0</strong></article>
		                    <article class="admin-wallet-stat"><span>Released This Month</span><strong data-wallet-total-released>Rp0</strong></article>
		                </section>

	                <section class="admin-panel admin-panel-table admin-panel-wide admin-wallet-panel">
	                    <div class="admin-panel-head">
	                        <div><span class="admin-panel-kicker">Wallet</span><h3>Marketplace balances</h3></div>
	                        <span class="admin-panel-meta" data-wallet-table-meta>Per account</span>
	                    </div>
	                    <div class="admin-table-wrap admin-wallet-table-wrap" data-wallet-wallet-panel>
	                        <table class="admin-table admin-wallet-table">
	                            <thead>
	                                <tr>
	                                    <th>Account</th>
	                                    <th>Released This Month</th>
	                                    <th>Wallet</th>
	                                    <th>Outstanding</th>
	                                    <th>Orders Outstanding</th>
	                                    <th>Updated</th>
	                                </tr>
	                            </thead>
	                            <tbody data-wallet-table-body>
	                                <tr><td colspan="6" class="admin-empty">Loading wallets.</td></tr>
	                            </tbody>
	                        </table>
	                    </div>
	                    <div class="admin-wallet-api" data-wallet-api-panel hidden>
	                        <div class="admin-wallet-api-bar">
	                            <input type="text" data-wallet-api-input value="Jenang Gemi Shopee Wallet Info" autocomplete="off" spellcheck="false" aria-label="Wallet API query">
	                            <button type="button" class="admin-wallet-action" data-wallet-api-run>Run</button>
	                            <button type="button" class="admin-wallet-action is-secondary" data-wallet-api-copy>Copy</button>
		                        </div>
		                        <pre class="admin-wallet-api-output" data-wallet-api-output>{}</pre>
		                    </div>
		                </section>
		                    </section>

	                    <section class="admin-view admin-inventory-recap-view" data-view-panel="inventory-recap">
	                <section class="admin-inventory-recap-command">
	                    <div>
	                        <span class="admin-panel-kicker">Inventory Recap</span>
	                        <strong data-inventory-recap-status>Loading smart restock draft</strong>
	                    </div>
	                    <button type="button" class="admin-orders-icon-btn admin-inventory-recap-refresh" data-inventory-recap-refresh aria-label="Refresh Inventory Recap">
	                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 0 1-15.2 6.5L3 16"/><path d="M3 21v-5h5"/><path d="M3 12a9 9 0 0 1 15.2-6.5L21 8"/><path d="M21 3v5h-5"/></svg>
	                    </button>
	                </section>

	                <section class="admin-inventory-recap-summary" aria-label="Inventory Recap totals">
	                    <article class="admin-inventory-recap-stat"><span>Cash Available</span><strong data-inventory-recap-cash>Rp0</strong><small>From Accounting</small></article>
	                    <article class="admin-inventory-recap-stat"><span>Draft Cost</span><strong data-inventory-recap-cost>Rp0</strong><small data-inventory-recap-funding>Waiting for recap</small></article>
	                    <article class="admin-inventory-recap-stat"><span>Urgent SKUs</span><strong data-inventory-recap-critical>0</strong><small data-inventory-recap-critical-meta>No flagged SKUs</small></article>
	                    <article class="admin-inventory-recap-stat"><span>Order Lines</span><strong data-inventory-recap-suggested>0</strong><small>Production suggestions</small></article>
	                </section>

	                <section class="admin-inventory-recap-grid">
	                    <article class="admin-panel admin-inventory-recap-panel">
	                        <div class="admin-panel-head">
	                            <div>
	                                <span class="admin-panel-kicker">Stock Status</span>
	                                <h3>Stock now and days left</h3>
	                            </div>
	                            <span class="admin-panel-meta" data-inventory-recap-window>30-day minimum + 10-day buffer</span>
	                        </div>
	                        <div class="admin-inventory-recap-risk-list" data-inventory-recap-list>
	                            <p class="admin-empty">Loading Inventory Recap.</p>
	                        </div>
	                    </article>

	                    <article class="admin-panel admin-inventory-recap-panel">
	                        <div class="admin-panel-head">
	                            <div>
	                                <span class="admin-panel-kicker">Draft</span>
	                                <h3>Order to production</h3>
	                            </div>
	                            <button type="button" class="admin-ghost-btn" data-inventory-recap-copy>Copy</button>
	                        </div>
	                        <pre class="admin-inventory-recap-draft" data-inventory-recap-draft>Loading production draft.</pre>
	                    </article>
	                </section>

	                <section class="admin-panel admin-panel-table admin-panel-wide admin-inventory-recap-table-panel">
	                    <div class="admin-panel-head">
	                        <div>
	                            <span class="admin-panel-kicker">Products</span>
	                            <h3>Stock now and restock suggestion</h3>
	                        </div>
	                        <span class="admin-panel-meta" data-inventory-recap-table-meta>SKU-level formula</span>
	                    </div>
	                    <div class="admin-table-wrap admin-inventory-recap-table-wrap">
	                        <table class="admin-table admin-inventory-recap-table">
	                            <thead>
	                                <tr>
	                                    <th>SKU</th>
	                                    <th>Product</th>
	                                    <th>Stock now</th>
	                                    <th>Current stock lasts</th>
	                                    <th>Order for 40 days</th>
	                                    <th>Can order less</th>
	                                    <th>Cost</th>
	                                    <th>Status</th>
	                                </tr>
	                            </thead>
	                            <tbody data-inventory-recap-table-body>
	                                <tr><td colspan="8" class="admin-empty">Loading Inventory Recap.</td></tr>
	                            </tbody>
	                        </table>
	                    </div>
	                </section>
	                    </section>

	                    <section class="admin-view admin-store-ops-layout" data-view-panel="store-ops" data-store-ops-dashboard data-store-ops-endpoint="../api/store-ops/">
                <section class="admin-metric-grid admin-store-ops-metrics">
                    <article class="admin-metric-card"><span>Fulfilled Today</span><strong data-store-ops-metric="fulfilled_today">0</strong><small>Completed fulfillment rows</small></article>
                    <article class="admin-metric-card"><span>Active Claims</span><strong data-store-ops-metric="active_claims">0</strong><small>Currently owned orders</small></article>
                    <article class="admin-metric-card"><span>Avg Fulfillment</span><strong data-store-ops-metric="average_fulfillment_label">0s</strong><small>Claim to fulfilled</small></article>
                    <article class="admin-metric-card"><span>Scan Errors</span><strong data-store-ops-metric="scan_errors">0</strong><small>Rejected or wrong scans</small></article>
                    <article class="admin-metric-card"><span>Throughput</span><strong data-store-ops-throughput>0</strong><small data-store-ops-throughput-detail>No fulfilled orders yet</small></article>
                </section>

                <section class="admin-panel admin-panel-wide admin-store-ops-filter-panel">
                    <div class="admin-panel-head">
                        <div>
                            <span class="admin-panel-kicker">Ops</span>
                            <h3>Fulfillment activity</h3>
                            <span class="admin-panel-meta" data-store-ops-status>Loading</span>
                        </div>
                    </div>
                    <form class="admin-store-ops-filter-grid" data-store-ops-filters>
                        <label>
                            <span>Date From</span>
                            <input type="date" name="date_from" data-store-ops-date-from>
                        </label>
                        <label>
                            <span>Date To</span>
                            <input type="date" name="date_to" data-store-ops-date-to>
                        </label>
                        <label>
                            <span>Employee</span>
                            <select name="employees" multiple data-store-ops-employees></select>
                        </label>
                        <label>
                            <span>Source</span>
                            <input type="search" name="source" placeholder="shopee, tiktok, partner" data-store-ops-source>
                        </label>
                        <label>
                            <span>Order ID</span>
                            <input type="search" name="q" placeholder="SPX, PARTNER..." data-store-ops-query>
                        </label>
                        <div class="admin-store-ops-status-controls" data-store-ops-status-controls>
                            <span>Status</span>
                            <button type="button" class="admin-toggle-pill is-active" data-status-value="">All</button>
                            <button type="button" class="admin-toggle-pill" data-status-value="CLAIMED">Claimed</button>
                            <button type="button" class="admin-toggle-pill" data-status-value="SCAN_IN_PROGRESS">Scanning</button>
                            <button type="button" class="admin-toggle-pill" data-status-value="SCAN_COMPLETED">Scan Done</button>
                            <button type="button" class="admin-toggle-pill" data-status-value="LABEL_PRINTED">Printed</button>
                            <button type="button" class="admin-toggle-pill" data-status-value="FULFILLED">Fulfilled</button>
                        </div>
                        <div class="admin-store-ops-filter-actions">
                            <button type="submit" class="admin-primary-btn">Apply</button>
                            <button type="button" class="admin-ghost-btn" data-store-ops-reset>Reset</button>
                        </div>
                    </form>
                </section>

                <section class="admin-panel admin-panel-wide">
                    <div class="admin-panel-head">
                        <div>
                            <span class="admin-panel-kicker">Orders</span>
                            <h3>Fulfillment log</h3>
                            <span class="admin-panel-meta" data-store-ops-table-meta>Newest activity first</span>
                        </div>
                    </div>
                    <div class="admin-table-wrap admin-store-ops-table-wrap">
                        <table class="admin-table admin-store-ops-table">
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Source</th>
                                    <th>Status</th>
                                    <th>Employee</th>
                                    <th>Claimed</th>
                                    <th>Scan Complete</th>
                                    <th>Label Print</th>
                                    <th>Fulfilled</th>
                                    <th>Duration</th>
                                </tr>
                            </thead>
                            <tbody data-store-ops-table-body>
                                <tr><td colspan="9" class="admin-empty">Loading Store Ops activity.</td></tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <div class="admin-modal-shell admin-store-ops-drawer" data-store-ops-drawer hidden>
                    <div class="admin-modal-backdrop" data-store-ops-drawer-close></div>
                    <aside class="admin-modal-card admin-store-ops-drawer-card" role="dialog" aria-modal="true" aria-labelledby="store-ops-drawer-title">
                        <div class="admin-modal-head">
                            <div>
                                <span class="admin-panel-kicker">Timeline</span>
                                <h3 id="store-ops-drawer-title" data-store-ops-drawer-title>Order</h3>
                            </div>
                            <button type="button" class="admin-ghost-btn" data-store-ops-drawer-close>Close</button>
                        </div>
                        <div class="admin-event-feed admin-store-ops-events" data-store-ops-events>
                            <p class="admin-empty">Select an order.</p>
                        </div>
                    </aside>
                </div>
                    </section>

                    <section class="admin-view admin-campaign-view" data-view-panel="home">
                <section class="admin-campaign-command" aria-label="Campaign shortcuts">
                    <a class="admin-primary-btn admin-link-btn" href="../affiliate-program/">Affiliate Program</a>
                    <div class="admin-launchpad admin-launchpad-compact" aria-label="Landing page launchpad">
                        <div class="admin-launchpad-section">
                            <div class="admin-launchpad-head">
                                <span class="admin-panel-kicker">Bubur</span>
                                <strong>4 pages</strong>
                            </div>
                            <div class="admin-launchpad-grid">
                                <a class="admin-launchpad-link" href="https://jenanggemi.com/bubur-youtube.html" target="_blank" rel="noopener">
                                    <span>YouTube</span>
                                    <small>/bubur-youtube.html</small>
                                </a>
                                <a class="admin-launchpad-link" href="https://jenanggemi.com/bubur-facebook.html" target="_blank" rel="noopener">
                                    <span>Facebook</span>
                                    <small>/bubur-facebook.html</small>
                                </a>
                                <a class="admin-launchpad-link" href="https://jenanggemi.com/bubur-instagram.html" target="_blank" rel="noopener">
                                    <span>Instagram</span>
                                    <small>/bubur-instagram.html</small>
                                </a>
                                <a class="admin-launchpad-link" href="https://jenanggemi.com/bubur-tiktok.html" target="_blank" rel="noopener">
                                    <span>TikTok</span>
                                    <small>/bubur-tiktok.html</small>
                                </a>
                            </div>
                        </div>

                        <div class="admin-launchpad-section admin-launchpad-section-jamu">
                            <div class="admin-launchpad-head">
                                <span class="admin-panel-kicker">Jamu</span>
                                <strong>4 pages</strong>
                            </div>
                            <div class="admin-launchpad-grid">
                                <a class="admin-launchpad-link admin-launchpad-link-jamu" href="https://jenanggemi.com/jamu-youtube.html" target="_blank" rel="noopener">
                                    <span>YouTube</span>
                                    <small>/jamu-youtube.html</small>
                                </a>
                                <a class="admin-launchpad-link admin-launchpad-link-jamu" href="https://jenanggemi.com/jamu-facebook.html" target="_blank" rel="noopener">
                                    <span>Facebook</span>
                                    <small>/jamu-facebook.html</small>
                                </a>
                                <a class="admin-launchpad-link admin-launchpad-link-jamu" href="https://jenanggemi.com/jamu-instagram.html" target="_blank" rel="noopener">
                                    <span>Instagram</span>
                                    <small>/jamu-instagram.html</small>
                                </a>
                                <a class="admin-launchpad-link admin-launchpad-link-jamu" href="https://jenanggemi.com/jamu-tiktok.html" target="_blank" rel="noopener">
                                    <span>TikTok</span>
                                    <small>/jamu-tiktok.html</small>
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="admin-control-strip admin-control-strip-compact admin-campaign-controls">
                    <div class="admin-control-group">
                        <span class="admin-control-label">Timeframe</span>
                        <div class="admin-toggle-row admin-sliding-chart-toggle" data-home-timeframe-controls data-sliding-chart-toggle role="group" aria-label="Campaign timeframe">
                            <button type="button" class="admin-toggle-pill" data-home-timeframe="1h"><span>1H</span></button>
                            <button type="button" class="admin-toggle-pill is-active" data-home-timeframe="24h"><span>24H</span></button>
                            <button type="button" class="admin-toggle-pill" data-home-timeframe="7d"><span>7D</span></button>
                            <button type="button" class="admin-toggle-pill" data-home-timeframe="30d"><span>30D</span></button>
                            <button type="button" class="admin-toggle-pill" data-home-timeframe="90d"><span>90D</span></button>
                            <button type="button" class="admin-toggle-pill" data-home-timeframe="all"><span>ALL</span></button>
                        </div>
                    </div>
                    <div class="admin-control-group">
                        <span class="admin-control-label">Trend Metric</span>
                        <div class="admin-toggle-row admin-sliding-chart-toggle" data-home-metric-controls data-sliding-chart-toggle role="group" aria-label="Campaign trend metric">
                            <button type="button" class="admin-toggle-pill is-active" data-home-metric="views"><span>Views</span></button>
                            <button type="button" class="admin-toggle-pill" data-home-metric="order_now_clicks"><span>Order Now</span></button>
                            <button type="button" class="admin-toggle-pill" data-home-metric="checkout_clicks"><span>Checkout</span></button>
                        </div>
                    </div>
                </section>

                <section class="admin-metric-grid">
                    <article class="admin-metric-card"><span>Total Views</span><strong data-home-summary-total-views>0</strong><small>All campaign page views</small></article>
                    <article class="admin-metric-card"><span>Order Now Clicks</span><strong data-home-summary-order-clicks>0</strong><small>Sticky + hero CTA demand</small></article>
                    <article class="admin-metric-card"><span>Checkout Clicks</span><strong data-home-summary-checkout-clicks>0</strong><small>WhatsApp intent clicks</small></article>
                    <article class="admin-metric-card"><span>Avg. Time Spent</span><strong data-home-summary-time-spent>0s</strong><small>Average dwell time per session</small></article>
                </section>

                <section class="admin-main-grid">
                    <article class="admin-panel admin-panel-chart admin-panel-wide">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Trend</span>
                                <div class="admin-chart-title-row">
                                    <h3 data-home-trend-title>Views over time</h3>
                                    <button type="button" class="admin-chart-info-btn" aria-label="About campaign trend" data-chart-info="Shows how the campaign landing pages are moving over time. Switch the metric to compare page views, Order Now clicks, or checkout clicks, and use the Bubur/Jamu buttons to see each product line separately or together."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                </div>
                            </div>
                            <span class="admin-panel-meta" data-home-trend-meta>Live over selected timeframe</span>
                        </div>
                        <div class="admin-panel-inline-toggles admin-sliding-chart-toggle" data-home-series-controls data-sliding-chart-toggle role="group" aria-label="Campaign product lines">
                            <button type="button" class="admin-toggle-pill admin-toggle-pill-series admin-toggle-pill-series-bubur is-active" data-home-series="bubur"><span>Bubur</span></button>
                            <button type="button" class="admin-toggle-pill admin-toggle-pill-series admin-toggle-pill-series-jamu is-active" data-home-series="jamu"><span>Jamu</span></button>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas admin-chart-canvas-lg" data-home-trend-chart width="1200" height="360"></canvas>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-chart admin-hour-activity-panel">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Time of Day</span>
                                <div class="admin-chart-title-row">
                                    <h3>Activity by hour</h3>
                                    <button type="button" class="admin-chart-info-btn" aria-label="About activity by hour" data-chart-info="Groups the selected campaign metric by hour in the selected timezone. It helps reveal when people are most active so posting, ads, or live sessions can be timed around stronger demand windows."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                </div>
                            </div>
                            <span class="admin-panel-meta">Peak engagement hours</span>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas admin-chart-canvas-tall" data-home-hour-chart width="1000" height="420"></canvas>
                        </div>
                    </article>

                    <article class="admin-panel admin-product-cart-panel">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Cart Composition</span>
                                <h3>Product added to cart</h3>
                            </div>
                            <span class="admin-panel-meta" data-home-product-cart-meta>Share of cart adds</span>
                        </div>
                        <div class="admin-product-cart-rundown" data-home-product-cart-rundown>
                            <p class="admin-empty">Belum ada data.</p>
                        </div>
                    </article>

                </section>
                    </section>

                    <section class="admin-view" data-view-panel="website">
                <section class="admin-website-header" data-website-header>
                    <div class="admin-website-header-copy">
                        <div class="admin-website-title-row">
                            <button type="button" class="admin-back-icon-button admin-website-back-button" data-website-back hidden aria-label="Back to website selector" title="Back to website selector">
                                <img src="https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/arrow-left.svg" alt="" width="22" height="22" loading="lazy" referrerpolicy="no-referrer">
                            </button>
                            <h2 data-website-hero-title>Select a website dashboard.</h2>
                        </div>
                        <p data-website-hero-copy>Choose Jenang Gemi or ZERO to open the dedicated website analytics page. Each page uses browser-tagged website visits only.</p>
                    </div>
                    <div class="admin-website-selector" data-website-selector aria-label="Website selection">
                        <button type="button" class="admin-website-selection-card" data-website-open="jenang_gemi">
                            <span>Jenang Gemi</span>
                            <strong>jenanggemi.com</strong>
                            <small>Traffic, cart intent, checkout clicks, paid orders, and store settings.</small>
                        </button>
                        <button type="button" class="admin-website-selection-card" data-website-open="zero">
                            <span>ZERO</span>
                            <strong>zerofoods.id</strong>
                            <small>Traffic, cart intent, checkout clicks, paid orders, and product setup.</small>
                        </button>
                    </div>
                </section>

                <div data-website-detail hidden>
                <section class="admin-control-strip admin-control-strip-compact admin-website-controls">
                    <div class="admin-control-group">
                        <span class="admin-control-label">Timeframe</span>
                        <div class="admin-toggle-row admin-sliding-chart-toggle" data-website-timeframe-controls data-sliding-chart-toggle role="group" aria-label="Website timeframe">
                            <button type="button" class="admin-toggle-pill" data-website-timefra