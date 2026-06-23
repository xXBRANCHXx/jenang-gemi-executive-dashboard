<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';

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
$dashboardBuildVersion = 'exec3.70.0';
$adminCssVersion = $dashboardBuildVersion . '-' . (string) @filemtime(dirname(__DIR__) . '/admin.css');
$adminJsVersion = $dashboardBuildVersion . '-' . (string) @filemtime(dirname(__DIR__) . '/admin.js');
$storeOpsJsVersion = $dashboardBuildVersion . '-' . (string) @filemtime(dirname(__DIR__) . '/store-ops.js');
?>
<!DOCTYPE html>
<html lang="id" data-admin-theme="minimal-black">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/svg+xml" href="/assets/admin-icons/executive-dashboard.svg">
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
            <div class="admin-loader-bar">
                <span class="admin-loader-progress" data-admin-loader-progress></span>
            </div>
            <strong class="admin-loader-label" data-admin-loader-label>Initializing...</strong>
        </div>
    </div>
    <div class="admin-app admin-app-suite" data-admin-dashboard data-analytics-endpoint="../api/analytics/" data-live-endpoint="../api/live/" data-settings-endpoint="../api/settings/" data-sales-endpoint="../api/sales/" data-orders-endpoint="../api/orders/" data-sku-catalog-endpoint="../api/sales/?action=sku_catalog" data-context-endpoint="../api/context/" data-zero-store-endpoint="../api/zero-store/" data-jenang-gemi-store-endpoint="../api/jenang-gemi-store/" data-website-orders-endpoint="../api/website-orders/" data-hard-set-endpoint="../api/hard-set/">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <div class="admin-shell">
            <?php render_admin_sidebar('home'); ?>

            <div class="admin-shell-main">
                <header class="admin-topbar">
                    <div class="admin-topbar-left">
                        <div class="admin-topbar-brand">
                            <span class="admin-admin-mark">Admin Scope</span>
                            <h1>Executive Dashboard</h1>
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
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
                            <span data-notification-count hidden>0</span>
                        </button>
                        <a class="admin-ghost-btn admin-link-btn" href="../back-dash/">Back Dash</a>
                        <div class="admin-menu-shell" data-menu-shell>
                            <button type="button" class="admin-ghost-btn admin-menu-trigger" data-menu-trigger aria-expanded="false" aria-label="Open dashboard menu">
                                <svg class="admin-menu-open-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
                                <svg class="admin-menu-close-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
                            </button>
                            <div class="admin-menu-panel" data-menu-panel aria-label="Executive Dashboard navigation" hidden>
                                <button type="button" class="admin-menu-item" data-view-switch="overview">
                                    <span class="admin-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/></svg></span>
                                    <span><strong>Home</strong><small>Executive sales overview</small></span>
                                </button>
                                <button type="button" class="admin-menu-item" data-view-switch="daily">
                                    <span class="admin-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 3v4M17 3v4"/><path d="M4.5 8.5h15"/><path d="M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M8 13h3M13 13h3M8 17h3M13 17h3"/></svg></span>
                                    <span><strong>Daily</strong><small>Daily platform Qty and Rp</small></span>
                                </button>
                                <button type="button" class="admin-menu-item" data-view-switch="orders">
                                    <span class="admin-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3.5h12v17H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg></span>
                                    <span><strong>Orders</strong><small>Order detail and fulfillment facts</small></span>
                                </button>
                                <button type="button" class="admin-menu-item" data-view-switch="home">
                                    <span class="admin-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 19V5"/><path d="M4 6h11l-.8 4 3.8 2H4"/><path d="M4 12h13"/></svg></span>
                                    <span><strong>Campaigns</strong><small>Landing-page analytics</small></span>
                                </button>
                                <a class="admin-menu-item admin-link-btn" href="../profit-loss/">
                                    <span class="admin-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 19.5V10M10 19.5V5M16 19.5v-7M3 19.5h18"/><path d="m4 7 5-4 6 5 5-4"/></svg></span>
                                    <span><strong>P&amp;L</strong><small>Revenue, costs, and operating profit</small></span>
                                </a>
                                <button type="button" class="admin-menu-item" data-view-switch="context">
                                    <span class="admin-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5H5v14h14v-3"/><path d="M11 13 20 4M14 4h6v6"/></svg></span>
                                    <span><strong>Context</strong><small>Operational context and live signals</small></span>
                                </button>
                                <button type="button" class="admin-menu-item" data-view-switch="website">
                                    <span class="admin-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.4 3.8 5.4 3.8 9S14.5 18.6 12 21c-2.5-2.4-3.8-5.4-3.8-9S9.5 5.4 12 3z"/></svg></span>
                                    <span><strong>Website</strong><small>Site traffic and conversion analytics</small></span>
                                </button>
                                <button type="button" class="admin-menu-item" data-view-switch="hard-set">
                                    <span class="admin-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M12 5v14"/><circle cx="12" cy="12" r="9"/></svg></span>
                                    <span><strong>Hard Set</strong><small>One-way Store Ops cutover</small></span>
                                </button>
                                <button type="button" class="admin-menu-item" data-view-switch="settings">
                                    <span class="admin-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1 1.6V21a2 2 0 0 1-4 0v-.1a1.8 1.8 0 0 0-1-1.6 1.8 1.8 0 0 0-2 .4l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.8 1.8 0 0 0 .4-2 1.8 1.8 0 0 0-1.6-1H3a2 2 0 0 1 0-4h.1a1.8 1.8 0 0 0 1.6-1 1.8 1.8 0 0 0-.4-2l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.8 1.8 0 0 0 2 .4 1.8 1.8 0 0 0 1-1.6V3a2 2 0 0 1 4 0v.1a1.8 1.8 0 0 0 1 1.6 1.8 1.8 0 0 0 2-.4l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.6 1h.1a2 2 0 0 1 0 4h-.1a1.8 1.8 0 0 0-1.7 1z"/></svg></span>
                                    <span><strong>Settings</strong><small>Theme, lock, and tracking controls</small></span>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <main class="admin-layout">
                    <section class="admin-view is-active" data-view-panel="overview">
                <section class="admin-overview-strip">
                    <div class="admin-toggle-row" data-overview-year-controls>
                        <button type="button" class="admin-toggle-pill is-active" data-overview-year-placeholder>Loading...</button>
                    </div>
                    <div class="admin-overview-strip-meta">
                        <span class="admin-live-pill"><span class="admin-live-dot"></span>Live</span>
                        <small data-overview-last-updated>Updated after marketplace sync</small>
                    </div>
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
                                    <button type="button" class="admin-chart-info-btn" aria-label="About today by hour" data-chart-info="Shows today's marketplace activity by hour in WIB. Use it to spot the hours when customers are buying, then switch metrics to compare orders, units, revenue, or gross profit."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
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
                            <canvas class="admin-chart-canvas" data-overview-product-stack-chart width="1200" height="300"></canvas>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-chart admin-panel-wide" data-chart-id="C6">
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
                            <canvas class="admin-chart-canvas admin-chart-canvas-lg" data-overview-syrup-flavor-chart width="1200" height="520"></canvas>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-table" id="orders">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Monthly Breakdown</span><h3>Revenue and orders by month</h3></div>
                        </div>
                        <div class="admin-table-wrap">
                            <table class="admin-table">
                                <thead>
                                    <tr>
                                        <th>Month</th>
                                        <th>Revenue</th>
                                        <th>Orders</th>
                                        <th>Top Platform</th>
                                    </tr>
                                </thead>
                                <tbody data-overview-table-body>
                                    <tr><td colspan="4" class="admin-empty">Belum ada data marketplace.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-feed">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Summary</span><h3>Annual notes</h3></div>
                        </div>
                        <div class="admin-note-stack" data-overview-notes>
                            <div class="admin-note-card"><strong>Preparing</strong><span>Marketplace totals will appear once the yearly summary endpoint responds.</span></div>
                        </div>
                    </article>
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
                                <span>Month <span class="admin-info-dot" title="Shows the selected calendar month in WIB. The dashboard opens on the current month automatically." aria-label="Shows the selected calendar month in WIB. The dashboard opens on the current month automatically.">i</span></span>
                                <input type="month" data-daily-month>
                            </label>
                            <button type="button" class="admin-ghost-btn daily-export-btn" data-daily-export disabled>
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11"/><path d="m7 10 5 5 5-5"/><path d="M5 19h14"/></svg>
                                <span>Export PDF</span>
                            </button>
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
                                        <th>Username</th>
                                        <th>Address</th>
                                        <th>Phone</th>
                                    </tr>
                                </thead>
                                <tbody data-orders-table-body>
                                    <tr><td colspan="11" class="admin-empty">Loading orders.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </article>
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

                    <section class="admin-view" data-view-panel="home">
                <section class="admin-hero-panel">
                    <div class="admin-hero-copy">
                        <span class="admin-chip admin-chip-accent">Campaigns Dashboard</span>
                        <h2>Campaign performance across YouTube, Facebook, Instagram, and TikTok.</h2>
                        <p>Views, Order Now clicks, checkout intent, average time spent, and the latest tracked sessions are available here without exposing the raw analytics endpoint publicly.</p>
                    </div>
                    <div class="admin-hero-actions">
                        <div class="admin-status-pill">
                            <span class="admin-status-dot"></span>
                            <span>Secure Session Active</span>
                        </div>
                        <a class="admin-primary-btn admin-link-btn" href="../affiliate-program/">Open Affiliate Program</a>
                        <div class="admin-launchpad">
                            <div class="admin-launchpad-section">
                                <div class="admin-launchpad-head">
                                    <span class="admin-panel-kicker">Jenang Gemi Bubur</span>
                                    <strong>Live now</strong>
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
                                    <span class="admin-panel-kicker">Jenang Gemi Jamu</span>
                                    <strong>Live now</strong>
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
                    </div>
                </section>

                <section class="admin-control-strip">
                    <div class="admin-control-group">
                        <span class="admin-control-label">Timeframe</span>
                        <div class="admin-toggle-row" data-home-timeframe-controls>
                            <button type="button" class="admin-toggle-pill" data-home-timeframe="1h">1H</button>
                            <button type="button" class="admin-toggle-pill is-active" data-home-timeframe="24h">24H</button>
                            <button type="button" class="admin-toggle-pill" data-home-timeframe="7d">7D</button>
                            <button type="button" class="admin-toggle-pill" data-home-timeframe="30d">30D</button>
                            <button type="button" class="admin-toggle-pill" data-home-timeframe="90d">90D</button>
                            <button type="button" class="admin-toggle-pill" data-home-timeframe="all">ALL</button>
                        </div>
                    </div>
                    <div class="admin-control-group">
                        <span class="admin-control-label">Trend Metric</span>
                        <div class="admin-toggle-row" data-home-metric-controls>
                            <button type="button" class="admin-toggle-pill is-active" data-home-metric="views">Views</button>
                            <button type="button" class="admin-toggle-pill" data-home-metric="order_now_clicks">Order Now</button>
                            <button type="button" class="admin-toggle-pill" data-home-metric="checkout_clicks">Checkout</button>
                        </div>
                    </div>
                    <div class="admin-live-status">
                        <strong>Live</strong>
                        <span data-home-last-updated>Waiting for first sync</span>
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
                        <div class="admin-panel-inline-toggles" data-home-series-controls>
                            <button type="button" class="admin-toggle-pill admin-toggle-pill-series admin-toggle-pill-series-bubur is-active" data-home-series="bubur">Bubur</button>
                            <button type="button" class="admin-toggle-pill admin-toggle-pill-series admin-toggle-pill-series-jamu is-active" data-home-series="jamu">Jamu</button>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas admin-chart-canvas-lg" data-home-trend-chart width="1200" height="360"></canvas>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-chart">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Time of Day</span>
                                <div class="admin-chart-title-row">
                                    <h3>Activity by hour</h3>
                                    <button type="button" class="admin-chart-info-btn" aria-label="About activity by hour" data-chart-info="Groups the selected campaign metric by hour in WIB. It helps reveal when people are most active so posting, ads, or live sessions can be timed around stronger demand windows."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                </div>
                            </div>
                            <span class="admin-panel-meta">Peak engagement hours</span>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas" data-home-hour-chart width="880" height="340"></canvas>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-chart">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Source Mix</span>
                                <div class="admin-chart-title-row">
                                    <h3>Views by source</h3>
                                    <button type="button" class="admin-chart-info-btn" aria-label="About views by source" data-chart-info="Shows where campaign visitors appear to come from, such as Facebook, Instagram, TikTok, YouTube, Google, direct visits, or unknown sources. Use it to compare which channels are creating attention."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                </div>
                            </div>
                            <span class="admin-panel-meta">Live from the dashboard analytics service</span>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas" data-home-source-chart width="880" height="340"></canvas>
                        </div>
                        <div class="admin-chart-legend" data-home-source-legend></div>
                    </article>

                    <article class="admin-panel admin-panel-chart">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">URL Performance</span>
                                <div class="admin-chart-title-row">
                                    <h3>Checkout by landing URL</h3>
                                    <button type="button" class="admin-chart-info-btn" aria-label="About checkout by landing URL" data-chart-info="Ranks landing pages by checkout intent. A higher bar means more people clicked toward WhatsApp checkout from that page during the selected timeframe."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                </div>
                            </div>
                            <span class="admin-panel-meta">Conversion intent by page path</span>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas" data-home-url-chart width="880" height="340"></canvas>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-table">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Landing URLs</span><h3>Per URL metrics</h3></div>
                        </div>
                        <div class="admin-table-wrap">
                            <table class="admin-table">
                                <thead>
                                    <tr>
                                        <th>Landing URL</th>
                                        <th>Source</th>
                                        <th>Views</th>
                                        <th>Order Now</th>
                                        <th>Checkout</th>
                                        <th>Avg. Time</th>
                                    </tr>
                                </thead>
                                <tbody data-home-url-table-body>
                                    <tr><td colspan="6" class="admin-empty">Belum ada data.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-table">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Source Summary</span><h3>Per source metrics</h3></div>
                        </div>
                        <div class="admin-table-wrap">
                            <table class="admin-table">
                                <thead>
                                    <tr>
                                        <th>Source</th>
                                        <th>Views</th>
                                        <th>Order Now</th>
                                        <th>Checkout</th>
                                        <th>Avg. Time</th>
                                    </tr>
                                </thead>
                                <tbody data-home-source-table-body>
                                    <tr><td colspan="5" class="admin-empty">Belum ada data.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-feed">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Recent Events</span><h3>Latest tracked actions</h3></div>
                        </div>
                        <div class="admin-event-feed" data-home-recent-events>
                            <p class="admin-empty">Belum ada aktivitas.</p>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-feed">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Protected Access</span><h3>System notes</h3></div>
                        </div>
                        <div class="admin-note-stack">
                            <div class="admin-note-card"><strong>Auth gate</strong><span>Dashboard and analytics access are protected by server-side session auth.</span></div>
                            <div class="admin-note-card"><strong>Source API</strong><span>Data is queried server-side from the dashboard analytics database.</span></div>
                            <div class="admin-note-card"><strong>Endpoint</strong><span data-home-endpoint-label>../api/analytics/</span></div>
                            <div class="admin-note-card"><strong>Live Sync</strong><span>Dashboard listens for local analytics changes and refreshes automatically.</span></div>
                        </div>
                    </article>
                </section>
                <div class="admin-bottom-actions">
                    <a class="admin-primary-btn admin-link-btn" href="../affiliate-program/">Go To Affiliate Program</a>
                    <a class="admin-ghost-btn admin-link-btn" href="../back-dash/">Open API Workspace</a>
                </div>
                    </section>

                    <section class="admin-view" data-view-panel="website">
                <section class="admin-hero-panel admin-hero-panel-website">
                    <div class="admin-hero-copy">
                        <span class="admin-chip admin-chip-accent" data-website-hero-chip>Official Website Dashboard</span>
                        <h2 data-website-hero-title>Select a website dashboard.</h2>
                        <p data-website-hero-copy>Choose Jenang Gemi or ZERO to open the dedicated website analytics page. Each page uses browser-tagged website visits only.</p>
                    </div>
                    <div class="admin-hero-actions">
                        <button type="button" class="admin-ghost-btn" data-website-back hidden>Back To Website Selector</button>
                        <div class="admin-status-pill">
                            <span class="admin-status-dot"></span>
                            <span>Website Visitor Tracking Active</span>
                        </div>
                        <div class="admin-note-card admin-note-card-compact">
                            <strong>Exclusions</strong>
                            <span><span data-website-excluded-ip-count>0</span> IPs hidden from website analytics.</span>
                        </div>
                        <div class="admin-note-card admin-note-card-compact">
                            <strong>Filtering</strong>
                            <span>Website-only events, no webhooks, no backend requests.</span>
                        </div>
                    </div>
                </section>

                <section class="admin-main-grid" data-website-selector>
                    <article class="admin-panel admin-panel-wide">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Website Pages</span>
                                <h3>Which website do you want to inspect?</h3>
                            </div>
                            <span class="admin-panel-meta">The old page is Jenang Gemi. The new page is ZERO.</span>
                        </div>
                        <div class="admin-launchpad-grid">
                            <button type="button" class="admin-launchpad-link" data-website-open="jenang_gemi">
                                <span>Jenang Gemi</span>
                                <small>Official Jenang Gemi website analytics</small>
                            </button>
                            <button type="button" class="admin-launchpad-link" data-website-open="zero">
                                <span>ZERO</span>
                                <small>zerofoods.id website analytics</small>
                            </button>
                        </div>
                    </article>
                </section>

                <div data-website-detail hidden>
                <section class="admin-control-strip">
                    <div class="admin-control-group">
                        <span class="admin-control-label">Timeframe</span>
                        <div class="admin-toggle-row" data-website-timeframe-controls>
                            <button type="button" class="admin-toggle-pill" data-website-timeframe="1h">1H</button>
                            <button type="button" class="admin-toggle-pill" data-website-timeframe="24h">24H</button>
                            <button type="button" class="admin-toggle-pill is-active" data-website-timeframe="7d">7D</button>
                            <button type="button" class="admin-toggle-pill" data-website-timeframe="30d">30D</button>
                            <button type="button" class="admin-toggle-pill" data-website-timeframe="90d">90D</button>
                            <button type="button" class="admin-toggle-pill" data-website-timeframe="all">ALL</button>
                        </div>
                    </div>
                    <div class="admin-control-group">
                        <span class="admin-control-label">Trend Metric</span>
                        <div class="admin-toggle-row" data-website-metric-controls>
                            <button type="button" class="admin-toggle-pill is-active" data-website-metric="visitors">Visitors</button>
                            <button type="button" class="admin-toggle-pill" data-website-metric="page_views">Page Views</button>
                            <button type="button" class="admin-toggle-pill" data-website-metric="add_to_cart_events">Add To Cart</button>
                            <button type="button" class="admin-toggle-pill" data-website-metric="checkout_clicks">Checkout</button>
                        </div>
                    </div>
                    <div class="admin-live-status">
                        <strong>Live</strong>
                        <span data-website-last-updated>Waiting for first sync</span>
                    </div>
                </section>

                <section class="admin-metric-grid">
                    <article class="admin-metric-card"><span>Total Visitors</span><strong data-website-summary-total-visitors>0</strong><small>Unique tracked website sessions</small></article>
                    <article class="admin-metric-card"><span>Page Views</span><strong data-website-summary-page-views>0</strong><small>Browser page loads only</small></article>
                    <article class="admin-metric-card"><span>Add To Cart</span><strong data-website-summary-add-to-cart>0</strong><small>Tracked product additions</small></article>
                    <article class="admin-metric-card"><span>Checkout Intent</span><strong data-website-summary-checkout>0</strong><small>WhatsApp checkout clicks</small></article>
                    <article class="admin-metric-card"><span>Avg. Time Spent</span><strong data-website-summary-time-spent>0s</strong><small>Average per website session</small></article>
                    <article class="admin-metric-card"><span>Top Region</span><strong data-website-summary-top-region>Unknown</strong><small>Most active region in selected timeframe</small></article>
                    <article class="admin-metric-card"><span>Paid Orders</span><strong data-website-paid-orders>0</strong><small>Confirmed website sales only</small></article>
                    <article class="admin-metric-card"><span>Paid Quantity</span><strong data-website-paid-quantity>0</strong><small>Paid line-item units</small></article>
                    <article class="admin-metric-card"><span>Paid Revenue</span><strong data-website-paid-revenue>Rp0</strong><small>Net revenue after discounts</small></article>
                </section>

                <section class="admin-main-grid" data-jenang-gemi-store-panel hidden>
                    <article class="admin-panel admin-panel-wide">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Jenang Gemi Store</span><h3>Items For Sale</h3></div>
                            <span class="admin-panel-meta">Exact SKU DB linkage, stock, COGS, independent pricing, and availability.</span>
                        </div>
                        <form class="admin-store-form" data-jg-item-form>
                            <input type="hidden" name="item_key">
                            <label><span>SKU DB code</span><input name="sku" maxlength="12" placeholder="12 character SKU" required></label>
                            <label><span>Website price</span><input name="price" type="number" min="0" step="1" required></label>
                            <label class="admin-checkbox-line"><input name="is_active" type="checkbox"><span>Visible for sale on Jenang Gemi website</span></label>
                            <button type="submit" class="admin-primary-btn">Save Website Settings</button>
                        </form>
                        <p class="admin-form-error" data-jg-store-error hidden></p>
                        <div class="admin-table-wrap">
                            <table class="admin-table">
                                <thead><tr><th>SKU</th><th>Product</th><th>Variant</th><th>Size</th><th>Stock</th><th>COGS</th><th>Price</th><th>Status</th><th>Edit</th></tr></thead>
                                <tbody data-jg-item-table><tr><td colspan="9" class="admin-empty">Loading Jenang Gemi catalog...</td></tr></tbody>
                            </table>
                        </div>
                    </article>
                    <article class="admin-panel admin-panel-wide">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Jenang Gemi Discounts</span><h3>Scheduled Discount Groups</h3></div>
                            <span class="admin-panel-meta">Overlapping active discounts on the same item are rejected.</span>
                        </div>
                        <form class="admin-store-form admin-store-form-discount" data-jg-discount-form>
                            <input type="hidden" name="id">
                            <label><span>Name</span><input name="name" maxlength="160" required></label>
                            <label><span>Type</span><select name="discount_type" class="admin-select"><option value="fixed">Fixed amount</option><option value="percent">Percent</option></select></label>
                            <label><span>Amount</span><input name="amount" type="number" min="0" step="1" required></label>
                            <label><span>Starts</span><input name="starts_on" type="date" required></label>
                            <label><span>Ends</span><input name="ends_on" type="date" required></label>
                            <label class="admin-checkbox-line"><input name="is_active" type="checkbox" checked><span>Discount active</span></label>
                            <div class="admin-store-sku-picker" data-jg-discount-items><p class="admin-empty">Load catalog items first.</p></div>
                            <button type="submit" class="admin-primary-btn">Save Discount</button>
                            <button type="button" class="admin-ghost-btn" data-jg-discount-reset>New Discount</button>
                        </form>
                        <div class="admin-note-stack" data-jg-discount-list><p class="admin-empty">No Jenang Gemi discounts yet.</p></div>
                    </article>
                </section>

                <section class="admin-main-grid" data-zero-store-panel hidden>
                    <article class="admin-panel admin-panel-wide">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">ZERO Store</span>
                                <h3>Items For Sale</h3>
                            </div>
                            <span class="admin-panel-meta">SKU, stock, and COGS come from the SKU DB. Edit ZERO website price and availability here.</span>
                        </div>
                        <div class="admin-store-toolbar">
                            <label class="admin-store-filter">
                                <span class="admin-control-label">Product Filter</span>
                                <select class="admin-select" data-zero-product-filter>
                                    <option value="">All Products</option>
                                    <option value="syrup">ZERO Syrup</option>
                                    <option value="drops">ZERO Drops</option>
                                    <option value="maple-topping">ZERO Maple Topping</option>
                                </select>
                            </label>
                        </div>
                        <form class="admin-store-form" data-zero-item-form>
                            <input type="hidden" name="item_key">
                            <input type="hidden" name="is_active" value="1">
                            <label><span>SKU DB code</span><input name="sku" maxlength="12" placeholder="12 character SKU"></label>
                            <label><span>Website price</span><input name="price" type="number" min="0" step="1" value="0" required></label>
                            <label class="admin-checkbox-line"><input name="is_active_checkbox" type="checkbox" checked><span>Visible for sale on ZERO website</span></label>
                            <button type="submit" class="admin-primary-btn">Save Website Settings</button>
                        </form>
                        <div class="admin-table-wrap">
                            <table class="admin-table">
                                <thead>
                                    <tr>
                                        <th>SKU</th>
                                        <th>Product</th>
                                        <th>Variant</th>
                                        <th>Size</th>
                                        <th>Stock</th>
                                        <th>COGS</th>
                                        <th>Price</th>
                                        <th>Sale Status</th>
                                        <th>Edit</th>
                                    </tr>
                                </thead>
                                <tbody data-zero-item-table>
                                    <tr><td colspan="9" class="admin-empty">Loading ZERO SKUs from the SKU DB...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-wide">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Discounts</span>
                                <h3>Discount Groups</h3>
                            </div>
                            <span class="admin-panel-meta">A SKU can be scheduled in multiple discounts, but date ranges cannot overlap for the same SKU.</span>
                        </div>
                        <div class="admin-store-toolbar">
                            <label class="admin-store-filter admin-store-filter-wide">
                                <span class="admin-control-label">Search Discount Groups</span>
                                <input type="search" data-zero-discount-search placeholder="Search by name, item, SKU, type, or date">
                            </label>
                        </div>
                        <form class="admin-store-form admin-store-form-discount" data-zero-discount-form>
                            <input type="hidden" name="id">
                            <input type="hidden" name="is_active" value="1">
                            <input type="hidden" name="starts_on" data-zero-discount-start>
                            <input type="hidden" name="ends_on" data-zero-discount-end>
                            <label><span>Discount name</span><input name="name" maxlength="160" placeholder="Launch bundle" required></label>
                            <label>
                                <span>Type</span>
                                <select name="discount_type" class="admin-select">
                                    <option value="fixed">Fixed amount</option>
                                    <option value="percent">Percent</option>
                                </select>
                            </label>
                            <label><span>Amount</span><input name="amount" type="number" min="0" step="1" value="0" required></label>
                            <div class="admin-store-date-range">
                                <span class="admin-control-label">Start / End</span>
                                <button type="button" class="admin-chart-icon-btn" data-zero-discount-calendar-toggle aria-label="Select discount date range"><span class="admin-chart-icon-calendar" aria-hidden="true"></span></button>
                                <strong data-zero-discount-range-label>Select date range</strong>
                                <div class="admin-chart-range-popover admin-store-calendar-popover" data-zero-discount-calendar hidden>
                                    <div class="admin-range-calendar">
                                        <div class="admin-range-calendar-head">
                                            <button type="button" class="admin-range-nav" data-zero-discount-month-prev aria-label="Previous month"></button>
                                            <strong data-zero-discount-month></strong>
                                            <button type="button" class="admin-range-nav admin-range-nav-next" data-zero-discount-month-next aria-label="Next month"></button>
                                        </div>
                                        <div class="admin-range-weekdays" aria-hidden="true"><span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span><span>Min</span></div>
                                        <div class="admin-range-grid" data-zero-discount-calendar-grid></div>
                                    </div>
                                </div>
                            </div>
                            <div class="admin-store-sku-picker" data-zero-discount-sku-picker>
                                <span class="admin-control-label">Included SKUs</span>
                                <p class="admin-empty">Load ZERO SKUs first, then choose SKUs for the discount.</p>
                            </div>
                            <button type="submit" class="admin-primary-btn">Save Discount</button>
                            <button type="button" class="admin-ghost-btn" data-zero-discount-reset>New Discount</button>
                        </form>
                        <p class="admin-form-error" data-zero-store-error hidden></p>
                        <div class="admin-note-stack" data-zero-discount-list>
                            <p class="admin-empty">No discounts yet.</p>
                        </div>
                    </article>
                </section>

                <section class="admin-main-grid">
                    <article class="admin-panel admin-panel-chart admin-panel-wide">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Trend</span>
                                <div class="admin-chart-title-row">
                                    <h3 data-website-trend-title>Website visitors over time</h3>
                                    <button type="button" class="admin-chart-info-btn" aria-label="About website visitors over time" data-chart-info="Shows official website traffic over the selected timeframe. Visitors are unique tracked sessions, Page Views are page loads, and saved internal or excluded IPs are removed before the chart is shown."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                </div>
                            </div>
                            <span class="admin-panel-meta" data-website-trend-meta>Official website only</span>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas admin-chart-canvas-lg" data-website-trend-chart width="1200" height="360"></canvas>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-chart">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Regions</span>
                                <div class="admin-chart-title-row">
                                    <h3>Visitors by region</h3>
                                    <button type="button" class="admin-chart-info-btn" aria-label="About visitors by region" data-chart-info="Shows the regions sending the most official website visitors after excluded IPs are removed. Location is based on the analytics data attached to each visit, so treat it as a useful guide rather than a perfect address."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                </div>
                            </div>
                            <span class="admin-panel-meta">Excluded IPs already removed</span>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas" data-website-region-chart width="880" height="340"></canvas>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-chart">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Top Pages</span>
                                <div class="admin-chart-title-row">
                                    <h3 data-website-page-chart-title>Visitors by page</h3>
                                    <button type="button" class="admin-chart-info-btn" aria-label="About visitors by page" data-chart-info="Ranks official website pages by the selected metric. It uses normal browser visits only, so API calls, webhooks, and excluded internal traffic do not inflate the chart."><span class="admin-chart-info-icon" aria-hidden="true"></span></button>
                                </div>
                            </div>
                            <span class="admin-panel-meta" data-website-page-chart-meta>Selected website only</span>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas" data-website-page-chart width="880" height="340"></canvas>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-table">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Pages</span><h3 data-website-page-table-title>Official website pages</h3></div>
                        </div>
                        <div class="admin-table-wrap">
                            <table class="admin-table">
                                <thead>
                                    <tr>
                                        <th>Page</th>
                                        <th>Visitors</th>
                                        <th>Page Views</th>
                                        <th>Avg. Time</th>
                                    </tr>
                                </thead>
                                <tbody data-website-page-table-body>
                                    <tr><td colspan="4" class="admin-empty">Belum ada data website.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-table">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Regions</span><h3>Visitor geography</h3></div>
                        </div>
                        <div class="admin-table-wrap">
                            <table class="admin-table">
                                <thead>
                                    <tr>
                                        <th>Region</th>
                                        <th>Country</th>
                                        <th>Visitors</th>
                                        <th>Page Views</th>
                                    </tr>
                                </thead>
                                <tbody data-website-region-table-body>
                                    <tr><td colspan="4" class="admin-empty">Belum ada data region.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-feed">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Recent Visits</span><h3>Latest website visitors</h3></div>
                        </div>
                        <div class="admin-event-feed" data-website-recent-events>
                            <p class="admin-empty">Belum ada kunjungan website.</p>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-feed">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Website Notes</span><h3>Filter and scope</h3></div>
                        </div>
                        <div class="admin-note-stack">
                            <div class="admin-note-card"><strong>Scope</strong><span data-website-scope-note>Counts only `traffic_kind=website` browser events from the selected website.</span></div>
                            <div class="admin-note-card"><strong>Exclusions</strong><span>Your saved IP list is applied at query time, so old visits from your IP disappear from the charts too.</span></div>
                            <div class="admin-note-card"><strong>Geo source</strong><span>Regions use whatever geolocation headers Hostinger or proxy layers expose to PHP.</span></div>
                            <div class="admin-note-card"><strong>Settings API</strong><span data-website-settings-endpoint>../api/settings/</span></div>
                        </div>
                    </article>
                </section>
                </div>
                    </section>

                    <section class="admin-view admin-hard-set-view" data-view-panel="hard-set">
                <section class="admin-hard-set-hero">
                    <div>
                        <span class="admin-chip admin-chip-accent">Hard Set</span>
                        <h2>Hard Set</h2>
                        <p class="admin-hard-set-subtitle">Big Set</p>
                        <p data-hard-set-explanation>Website orders notify and count in metrics now. Store Ops remains isolated until this switch is permanently activated.</p>
                    </div>
                    <div class="admin-hard-set-state"><span>Current state</span><strong data-hard-set-state>Loading</strong><small data-hard-set-activation></small></div>
                </section>
                <section class="admin-hard-set-switch-stage">
                    <button type="button" class="admin-hard-set-switch" data-hard-set-switch aria-label="Activate Big Set" aria-pressed="false" disabled>
                        <span class="admin-hard-set-track"><span class="admin-hard-set-knob"></span></span>
                        <strong data-hard-set-switch-label>OFF</strong>
                    </button>
                    <p data-hard-set-switch-note>All readiness checks must pass. Activation cannot be undone.</p>
                </section>
                <section class="admin-hard-set-readiness" data-hard-set-readiness>
                    <article class="admin-panel"><p class="admin-empty">Loading ZERO Website readiness...</p></article>
                    <article class="admin-panel"><p class="admin-empty">Loading Jenang Gemi Website readiness...</p></article>
                </section>
                <section class="admin-panel admin-hard-set-audit-panel">
                    <div class="admin-panel-head"><div><span class="admin-panel-kicker">Permanent Audit</span><h3>Activation record</h3></div></div>
                    <div class="admin-note-stack" data-hard-set-audit><p class="admin-empty">No activation event.</p></div>
                </section>
                    </section>

                    <section class="admin-view admin-view-settings" data-view-panel="settings">
                <section class="admin-settings-grid">
                    <article class="admin-panel admin-settings-card">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Appearance</span><h3>Theme</h3></div>
                        </div>
                        <p class="admin-settings-copy">Choose the dashboard theme without changing dashboard access or abilities.</p>
                        <div class="admin-theme-options" data-theme-options>
                            <button type="button" class="admin-theme-option" data-theme-option="minimal-black" aria-pressed="false">
                                <span class="admin-theme-swatch admin-theme-swatch-minimal-black" aria-hidden="true"></span>
                                <span><strong>Minimal Black</strong><small>Default flat dark</small></span>
                            </button>
                            <button type="button" class="admin-theme-option" data-theme-option="dark" aria-pressed="false">
                                <span class="admin-theme-swatch admin-theme-swatch-current" aria-hidden="true"></span>
                                <span><strong>Green Glass</strong><small>Original executive dark</small></span>
                            </button>
                            <button type="button" class="admin-theme-option" data-theme-option="minimal-white" aria-pressed="false">
                                <span class="admin-theme-swatch admin-theme-swatch-minimal-white" aria-hidden="true"></span>
                                <span><strong>Minimal White</strong><small>Clean and quiet</small></span>
                            </button>
                            <button type="button" class="admin-theme-option" data-theme-option="classic-white" aria-pressed="false">
                                <span class="admin-theme-swatch admin-theme-swatch-classic-white" aria-hidden="true"></span>
                                <span><strong>Polished White</strong><small>Layered and bright</small></span>
                            </button>
                            <button type="button" class="admin-theme-option" data-theme-option="prism" aria-pressed="false">
                                <span class="admin-theme-swatch admin-theme-swatch-prism" aria-hidden="true"></span>
                                <span><strong>Prism</strong><small>Vivid signal room</small></span>
                            </button>
                        </div>
                    </article>

                    <article class="admin-panel admin-settings-card">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Security</span><h3>Lock Dashboard</h3></div>
                        </div>
                        <p class="admin-settings-copy">End the current authenticated session and return to the access screen.</p>
                        <a class="admin-primary-btn admin-link-btn" href="../logout/">Lock Dashboard</a>
                    </article>

                    <article class="admin-panel admin-settings-card admin-settings-card-wide">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Device Exclusions</span><h3>Ignore specific browsers and devices</h3></div>
                        </div>
                        <p class="admin-settings-copy">Use this when IPs keep changing. A saved device ID is shared between the website and dashboard, so future visits from that browser can be removed from landing-page and website analytics.</p>
                        <div class="admin-note-stack">
                            <div class="admin-note-card">
                                <strong>This browser device ID</strong>
                                <span data-current-device-id>Loading current device ID...</span>
                                <label class="admin-affiliate-field">
                                    <span>Tag</span>
                                    <input type="text" name="current_device_label" data-current-device-label placeholder="Example: Sales iPhone" maxlength="120">
                                </label>
                                <button type="button" class="admin-soft-btn" data-ignore-current-device disabled>Ignore This Device</button>
                            </div>
                        </div>
                        <form class="admin-settings-form" data-device-exclusion-form>
                            <label class="admin-affiliate-field">
                                <span>Device ID</span>
                                <input type="text" name="device_id" placeholder="Example: device-2a4f..." maxlength="120" required>
                            </label>
                            <label class="admin-affiliate-field">
                                <span>Label</span>
                                <input type="text" name="label" placeholder="Example: Sales iPhone" maxlength="120">
                            </label>
                            <button type="submit" class="admin-primary-btn">Add Excluded Device</button>
                        </form>
                        <p class="admin-form-error" data-device-exclusion-error hidden></p>
                        <div class="admin-settings-chip-row" data-device-exclusion-list>
                            <p class="admin-empty">Belum ada device yang dikecualikan.</p>
                        </div>
                    </article>
                </section>
                    </section>
                </main>
            </div>
        </div>
    </div>
    <aside class="admin-notification-drawer" data-notification-drawer aria-hidden="true">
        <div class="admin-notification-head">
            <div><span class="admin-panel-kicker">Website Orders</span><h2>Notifications</h2></div>
            <button type="button" class="admin-orders-icon-btn" data-notification-close aria-label="Close notifications"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        </div>
        <p class="admin-notification-mode" data-notification-mode>Loading Hard Set state...</p>
        <div class="admin-notification-list" data-notification-list><p class="admin-empty">Loading website orders...</p></div>
    </aside>
    <div class="admin-notification-backdrop" data-notification-backdrop hidden></div>
    <dialog class="admin-hard-set-dialog" data-hard-set-dialog aria-labelledby="hard-set-confirm-title">
        <form method="dialog" data-hard-set-form>
            <span class="admin-panel-kicker">Irreversible cutover</span>
            <h2 id="hard-set-confirm-title">Activate Big Set?</h2>
            <p>Only orders created after the server records activation can enter Store Ops. Pre-activation orders remain manual-era forever.</p>
            <label><span>Type <strong>ACTIVATE BIG SET</strong></span><input name="confirmation" autocomplete="off" required></label>
            <p class="admin-form-error" data-hard-set-error hidden></p>
            <div class="admin-modal-actions"><button type="button" class="admin-ghost-btn" data-hard-set-cancel>Cancel</button><button type="submit" class="admin-danger-btn">Activate Permanently</button></div>
        </form>
    </dialog>
    <div class="admin-modal-shell admin-orders-filter-modal" data-orders-filter-modal hidden>
        <button type="button" class="admin-modal-backdrop" data-orders-filter-close aria-label="Close order filters"></button>
        <section class="admin-modal-card admin-orders-filter-card" role="dialog" aria-modal="true" aria-labelledby="orders-filter-title">
            <div class="admin-modal-head">
                <div>
                    <span class="admin-panel-kicker">Order Filters</span>
                    <h3 id="orders-filter-title">Filter marketplace orders</h3>
                </div>
                <button type="button" class="admin-orders-icon-btn" data-orders-filter-close aria-label="Close order filters">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
                </button>
            </div>
            <div class="admin-orders-filter-body">
                <details class="admin-orders-accordion">
                    <summary>Companies</summary>
                    <div class="admin-orders-accordion-content" data-orders-company-tree>
                        <p class="admin-empty">Loading SKU database.</p>
                    </div>
                </details>
                <details class="admin-orders-accordion">
                    <summary>Start and End Dates</summary>
                    <div class="admin-orders-date-range">
                        <div class="admin-orders-date-field">
                            <span>Start Date</span>
                            <button type="button" class="admin-orders-date-button" data-orders-date-toggle="start">
                                <span data-orders-start-label>Any start date</span>
                                <i class="admin-chart-icon-calendar" aria-hidden="true"></i>
                            </button>
                        </div>
                        <div class="admin-orders-date-field">
                            <span>End Date</span>
                            <button type="button" class="admin-orders-date-button" data-orders-date-toggle="end">
                                <span data-orders-end-label>Any end date</span>
                                <i class="admin-chart-icon-calendar" aria-hidden="true"></i>
                            </button>
                        </div>
                        <div class="admin-orders-date-popover admin-chart-range-popover" data-orders-date-popover hidden>
                            <div class="admin-range-calendar">
                                <div class="admin-range-calendar-head">
                                    <button type="button" class="admin-range-nav" aria-label="Previous month" data-orders-date-prev></button>
                                    <strong data-orders-date-month></strong>
                                    <button type="button" class="admin-range-nav admin-range-nav-next" aria-label="Next month" data-orders-date-next></button>
                                </div>
                                <div class="admin-range-weekdays" aria-hidden="true">
                                    <span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span>
                                </div>
                                <div class="admin-range-grid" data-orders-date-grid></div>
                            </div>
                        </div>
                    </div>
                </details>
                <details class="admin-orders-accordion">
                    <summary>Platforms</summary>
                    <div class="admin-orders-platform-grid" data-orders-platforms>
                        <p class="admin-empty">Platforms appear after orders load.</p>
                    </div>
                </details>
            </div>
            <div class="admin-modal-actions">
                <button type="button" class="admin-danger-btn" data-orders-filter-clear>Clear Filters</button>
                <button type="button" class="admin-primary-btn" data-orders-filter-close>Done</button>
            </div>
        </section>
    </div>
    <script type="module" src="../admin.js?v=<?php echo urlencode($adminJsVersion ?: '1'); ?>"></script>
    <script src="../store-ops.js?v=<?php echo urlencode($storeOpsJsVersion ?: '1'); ?>" defer></script>
<?php endif; ?>
</body>
</html>
