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
$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$adminJsVersion = (string) @filemtime(dirname(__DIR__) . '/admin.js');
$storeOpsJsVersion = (string) @filemtime(dirname(__DIR__) . '/store-ops.js');
$dashboardBuildVersion = 'exec3.50.0';
$requestedView = strtolower(trim((string) ($_GET['view'] ?? 'overview')));
$activeSidebarSection = match ($requestedView) {
    'campaigns', 'home', 'landing', 'landing-pages' => 'campaigns',
    'website', 'site' => 'website',
    'accounting', 'cash-control', 'cash_control', 'profit-loss', 'profit_loss' => 'accounting',
    'settings' => 'settings',
    default => 'home',
};
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/png" href="https://jenanggemi.com/Media/Jenang%20Gemi%20Website%20Logo.png">
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
    <div class="admin-app admin-app-suite" data-admin-dashboard data-analytics-endpoint="../api/analytics/" data-live-endpoint="../api/live/" data-settings-endpoint="../api/settings/" data-sales-endpoint="../api/sales/" data-accounting-endpoint="../api/accounting/" data-sku-catalog-endpoint="../api/sales/?action=sku_catalog">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <div class="admin-shell">
            <?php render_admin_sidebar($activeSidebarSection); ?>

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
                                <button type="button" class="admin-menu-item" data-orders-nav>
                                    <span class="admin-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3.5h12v17H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg></span>
                                    <span><strong>Orders</strong><small>Monthly marketplace order facts</small></span>
                                </button>
                                <button type="button" class="admin-menu-item" data-view-switch="home">
                                    <span class="admin-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 19V5"/><path d="M4 6h11l-.8 4 3.8 2H4"/><path d="M4 12h13"/></svg></span>
                                    <span><strong>Campaigns</strong><small>Landing-page analytics</small></span>
                                </button>
                                <button type="button" class="admin-menu-item" data-view-switch="website">
                                    <span class="admin-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.4 3.8 5.4 3.8 9S14.5 18.6 12 21c-2.5-2.4-3.8-5.4-3.8-9S9.5 5.4 12 3z"/></svg></span>
                                    <span><strong>Official Website Dashboard</strong><small>Site traffic and conversion analytics</small></span>
                                </button>
                                <button type="button" class="admin-menu-item" data-view-switch="accounting">
                                    <span class="admin-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 3h8l2 3v15H6V6z"/><path d="M9 8h6M9 12h6M9 16h3"/><path d="M17 3v4h4"/></svg></span>
                                    <span><strong>Accounting</strong><small>Cash, bills, expenses, and manual finance control</small></span>
                                </button>
                                <a class="admin-menu-item admin-link-btn" href="../back-dash/">
                                    <span class="admin-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5H5v14h14v-3"/><path d="M11 13 20 4M14 4h6v6"/></svg></span>
                                    <span><strong>API Workspace</strong><small>Ingest and webhook controls</small></span>
                                </a>
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
                        <span data-overview-year-summary>Loading year window...</span>
                        <span data-overview-last-updated>Waiting for first marketplace sync</span>
                        <span data-overview-endpoint-label>../api/sales/</span>
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
                            <button type="button" class="admin-sales-recap-close" data-sales-recap-close aria-label="Close Sales Recap">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
                            </button>
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
                    <article class="admin-panel admin-panel-chart admin-panel-wide" data-chart-id="C1">
                        <div class="admin-panel-head">
                            <div>
                                <h3 data-overview-trend-title>Net revenue by month</h3>
                                <span class="admin-panel-meta" data-overview-trend-meta>Selected year</span>
                            </div>
                            <div class="admin-panel-inline-toggles" data-overview-metric-controls>
                                <button type="button" class="admin-toggle-pill is-active" data-overview-metric="sales">Net</button>
                                <button type="button" class="admin-toggle-pill" data-overview-metric="gross_revenue">Gross</button>
                                <button type="button" class="admin-toggle-pill" data-overview-metric="orders">Orders</button>
                                <button type="button" class="admin-toggle-pill" data-overview-metric="average_order_value">AOV</button>
                            </div>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas admin-chart-canvas-lg" data-overview-trend-chart width="1200" height="300"></canvas>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-chart" data-chart-id="C2">
                        <div class="admin-panel-head">
                            <div>
                                <h3>Order volume</h3>
                                <span class="admin-panel-meta">Live from stored order facts</span>
                            </div>
                            <div class="admin-panel-inline-toggles">
                                <button type="button" class="admin-toggle-pill is-active" data-overview-volume-metric="orders">Orders</button>
                                <button type="button" class="admin-toggle-pill" data-overview-volume-metric="item_count">Items</button>
                                <button type="button" class="admin-toggle-pill" data-overview-volume-metric="average_order_value">AOV</button>
                            </div>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas" data-overview-orders-chart width="880" height="280"></canvas>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-chart">
                        <div class="admin-panel-head">
                            <div>
                                <h3>Marketplace mix</h3>
                                <span class="admin-panel-meta">Shopee, TikTok Shop, future channels</span>
                            </div>
                            <div class="admin-panel-inline-toggles">
                                <button type="button" class="admin-toggle-pill is-active" data-overview-platform-metric="sales">Net</button>
                                <button type="button" class="admin-toggle-pill" data-overview-platform-metric="gross_revenue">Gross</button>
                                <button type="button" class="admin-toggle-pill" data-overview-platform-metric="orders">Orders</button>
                                <button type="button" class="admin-toggle-pill" data-overview-platform-metric="marketplace_fees">Fees</button>
                            </div>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas" data-overview-platform-chart width="880" height="280"></canvas>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-chart" data-chart-id="C3">
                        <div class="admin-panel-head">
                            <div>
                                <h3>Current totals</h3>
                                <span class="admin-panel-meta">Year to date</span>
                            </div>
                        </div>
                        <div class="admin-mini-metric-list">
                            <div><span>Net revenue</span><strong data-overview-summary-sales>Rp0</strong></div>
                            <div><span>Orders</span><strong data-overview-summary-orders>0</strong></div>
                            <div><span>AOV</span><strong data-overview-summary-aov>Rp0</strong></div>
                            <div><span>Best month</span><strong data-overview-summary-best-month>-</strong><small data-overview-summary-best-month-meta>No peak yet</small></div>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-table admin-orders-panel" id="orders">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Orders</span>
                                <h3>Marketplace order explorer</h3>
                                <span class="admin-panel-meta" data-orders-status>Loading stored orders from newest to oldest</span>
                            </div>
                            <div class="admin-orders-actions">
                                <button type="button" class="admin-primary-btn admin-orders-ops-btn" data-view-switch="store-ops">Ops</button>
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
                            <table class="admin-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Order</th>
                                        <th>Company</th>
                                        <th>Product</th>
                                        <th>Flavor</th>
                                        <th>Platform</th>
                                        <th>Net</th>
                                        <th>Orders</th>
                                    </tr>
                                </thead>
                                <tbody data-orders-table-body>
                                    <tr><td colspan="8" class="admin-empty">Loading orders.</td></tr>
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

                    <section class="admin-view admin-view-daily" data-view-panel="daily">
                <section class="daily-hero-panel">
                    <div class="daily-hero-copy">
                        <span class="admin-chip admin-chip-accent">Daily</span>
                        <h2>Daily platform rundown</h2>
                        <p data-daily-status>Loading current month Daily.</p>
                    </div>
                    <div class="daily-hero-actions">
                        <label class="daily-month-picker">
                            <span>Month <span class="admin-info-dot" title="Shows the selected calendar month in WIB. The dashboard opens on the current month automatically." aria-label="Shows the selected calendar month in WIB. The dashboard opens on the current month automatically.">i</span></span>
                            <input type="month" data-daily-month>
                        </label>
                        <button type="button" class="admin-ghost-btn daily-export-btn" data-daily-export disabled>
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11"/><path d="m7 10 5 5 5-5"/><path d="M5 19h14"/></svg>
                            <span>Export PDF</span>
                        </button>
                    </div>
                </section>

                <section class="admin-metric-grid daily-metric-grid">
                    <article class="admin-metric-card"><span>Total Qty <span class="admin-info-dot" title="Total units sold from order lines in the selected month." aria-label="Total units sold from order lines in the selected month.">i</span></span><strong class="daily-text-green" data-daily-total-qty>0</strong><small>Units sold</small></article>
                    <article class="admin-metric-card"><span>Total Rp <span class="admin-info-dot" title="Total net revenue from order lines in the selected month." aria-label="Total net revenue from order lines in the selected month.">i</span></span><strong class="daily-text-blue" data-daily-total-revenue>Rp0</strong><small>Revenue</small></article>
                    <article class="admin-metric-card"><span>Avg Qty <span class="admin-info-dot" title="Average units per calendar day, including zero-sale days." aria-label="Average units per calendar day, including zero-sale days.">i</span></span><strong class="daily-text-yellow" data-daily-avg-qty>0</strong><small>Per day</small></article>
                    <article class="admin-metric-card"><span>Avg Rp <span class="admin-info-dot" title="Average revenue per calendar day, including zero-sale days." aria-label="Average revenue per calendar day, including zero-sale days.">i</span></span><strong class="daily-text-red" data-daily-avg-revenue>Rp0</strong><small>Per day</small></article>
                    <article class="admin-metric-card"><span>Platforms <span class="admin-info-dot" title="Platforms found in order data plus any manual placeholders." aria-label="Platforms found in order data plus any manual placeholders.">i</span></span><strong data-daily-platform-count>0</strong><small>Tracked channels</small></article>
                    <article class="admin-metric-card"><span>Top Day <span class="admin-info-dot" title="The highest revenue day in the selected month." aria-label="The highest revenue day in the selected month.">i</span></span><strong data-daily-top-day>-</strong><small>By Rp</small></article>
                </section>

                <section class="admin-main-grid daily-main-grid">
                    <article class="admin-panel admin-panel-wide daily-platform-panel">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Platform Rundown</span>
                                <h3>QTY, Rp, and daily averages</h3>
                                <span class="admin-panel-meta">Selected month by platform</span>
                            </div>
                        </div>
                        <div class="daily-platform-summary" data-daily-platform-summary>
                            <p class="admin-empty">Daily platform totals will appear after the month loads.</p>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-table admin-panel-wide daily-days-panel">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Days</span>
                                <h3>Every day in the selected month</h3>
                                <span class="admin-panel-meta">Calendar days with platform totals</span>
                            </div>
                        </div>
                        <div class="admin-table-wrap daily-table-wrap">
                            <table class="admin-table daily-table">
                                <thead>
                                    <tr>
                                        <th>Day</th>
                                        <th>Total Qty</th>
                                        <th>Total Rp</th>
                                        <th>Platform breakdown</th>
                                    </tr>
                                </thead>
                                <tbody data-daily-day-table-body>
                                    <tr><td colspan="4" class="admin-empty">Loading Daily.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </article>

                    <article class="admin-panel daily-platform-manager">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Future Platforms</span>
                                <h3>Add platform slot</h3>
                                <span class="admin-panel-meta">For partner, website, or channel placeholders.</span>
                            </div>
                        </div>
                        <form class="daily-platform-form" data-daily-platform-form>
                            <label>
                                <span>Platform name <span class="admin-info-dot" title="Adds a zero-value placeholder until that platform appears in sales data." aria-label="Adds a zero-value placeholder until that platform appears in sales data.">i</span></span>
                                <input type="text" data-daily-platform-name placeholder="Example: Partner Web" maxlength="48">
                            </label>
                            <button type="submit" class="admin-soft-btn daily-add-platform-btn">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                                <span>Add</span>
                            </button>
                        </form>
                        <div class="daily-platform-list" data-daily-platform-list>
                            <p class="admin-empty">No manual platform placeholders.</p>
                        </div>
                    </article>
                </section>
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
                                <h3 data-home-trend-title>Views over time</h3>
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

                    <article class="admin-panel admin-panel-chart" data-c4-chart data-chart-id="C4">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">C4</span>
                                <h3 data-home-hour-title>Revenue by hour</h3>
                            </div>
                            <span class="admin-panel-meta" data-home-hour-meta>Marketplace orders by WIB hour</span>
                        </div>
                        <div class="admin-panel-inline-toggles" data-c4-metric-controls>
                            <button type="button" class="admin-toggle-pill" data-c4-metric="orders">Daily Orders QTY</button>
                            <button type="button" class="admin-toggle-pill" data-c4-metric="gross_profit">Gross Profit</button>
                            <button type="button" class="admin-toggle-pill is-active" data-c4-metric="revenue">Revenue</button>
                            <button type="button" class="admin-toggle-pill" data-c4-metric="item_count">QTY Sold</button>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas" data-home-hour-chart width="880" height="340"></canvas>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-chart">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Source Mix</span>
                                <h3>Views by source</h3>
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
                                <h3>Checkout by landing URL</h3>
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
                                <span class="admin-panel-kicker">Website</span>
                                <h3>Which website do you want to inspect?</h3>
                            </div>
                            <span class="admin-panel-meta">Dedicated analytics for each public domain.</span>
                        </div>
                        <div class="admin-launchpad-grid">
                            <button type="button" class="admin-launchpad-link" data-website-open="jenang_gemi">
                                <span>jenanggemi.com</span>
                                <small>Official Jenang Gemi website analytics</small>
                            </button>
                            <button type="button" class="admin-launchpad-link" data-website-open="zero">
                                <span>zerofoods.id</span>
                                <small>zerofoods.id website analytics</small>
                            </button>
                        </div>
                    </article>
                </section>

                <div data-website-detail hidden>
                <section class="admin-website-analytics">
                    <div class="admin-website-toolbar">
                        <div class="admin-panel-inline-toggles" data-website-timeframe-controls aria-label="Website timeframe">
                            <button type="button" class="admin-toggle-pill" data-website-timeframe="1h">1H</button>
                            <button type="button" class="admin-toggle-pill" data-website-timeframe="24h">24H</button>
                            <button type="button" class="admin-toggle-pill is-active" data-website-timeframe="7d">7D</button>
                            <button type="button" class="admin-toggle-pill" data-website-timeframe="30d">30D</button>
                            <button type="button" class="admin-toggle-pill" data-website-timeframe="90d">90D</button>
                            <button type="button" class="admin-toggle-pill" data-website-timeframe="all">ALL</button>
                        </div>
                        <div class="admin-panel-inline-toggles" data-website-metric-controls aria-label="Website trend metric">
                            <button type="button" class="admin-toggle-pill is-active" data-website-metric="visitors">Visitors</button>
                            <button type="button" class="admin-toggle-pill" data-website-metric="page_views">Page Views</button>
                            <button type="button" class="admin-toggle-pill" data-website-metric="add_to_cart_events">Add To Cart</button>
                            <button type="button" class="admin-toggle-pill" data-website-metric="checkout_clicks">Checkout</button>
                        </div>
                        <div class="admin-live-status admin-website-live-status">
                            <strong>Live</strong>
                            <span data-website-last-updated>Waiting for first sync</span>
                        </div>
                    </div>

                    <section class="admin-website-bento" aria-label="Website analytics summary">
                        <article class="admin-website-bento-card admin-website-bento-card-hero"><span>Total Visitors</span><strong data-website-summary-total-visitors>0</strong><small>Unique tracked website sessions</small></article>
                        <article class="admin-website-bento-card"><span>Page Views</span><strong data-website-summary-page-views>0</strong><small>Browser page loads only</small></article>
                        <article class="admin-website-bento-card"><span>Add to Cart</span><strong data-website-summary-add-to-cart>0</strong><small>Tracked product additions</small></article>
                        <article class="admin-website-bento-card"><span>Checkout Intent</span><strong data-website-summary-checkout>0</strong><small>WhatsApp checkout clicks</small></article>
                        <article class="admin-website-bento-card"><span>Avg. Time Spent</span><strong data-website-summary-time-spent>0s</strong><small>Average per website session</small></article>
                        <article class="admin-website-bento-card admin-website-bento-card-wide"><span>Top Region</span><strong data-website-summary-top-region>Unknown</strong><small>Most active region in selected timeframe</small></article>
                        <article class="admin-website-bento-card"><span>Paid Orders</span><strong data-website-summary-paid-orders>0</strong><small>Marketplace orders in this window</small></article>
                        <article class="admin-website-bento-card"><span>Paid QTY</span><strong data-website-summary-paid-qty>0</strong><small>Paid units sold</small></article>
                        <article class="admin-website-bento-card admin-website-bento-card-revenue"><span>Paid Revenue</span><strong data-website-summary-paid-revenue>Rp0</strong><small data-website-sales-meta>Protected sales feed</small></article>
                    </section>

                    <article class="admin-panel admin-panel-chart admin-panel-wide admin-website-trend-panel">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Analytics</span>
                                <h3 data-website-trend-title>Website visitors over time</h3>
                            </div>
                            <span class="admin-panel-meta" data-website-trend-meta>Official website only</span>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas admin-chart-canvas-lg" data-website-trend-chart width="1200" height="360"></canvas>
                        </div>
                    </article>
                </section>

                <section class="admin-main-grid admin-website-commerce-grid">
                    <article class="admin-panel admin-panel-table admin-panel-wide">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Products</span>
                                <h3>Paid product activity</h3>
                            </div>
                            <span class="admin-panel-meta">Sales feed below analytics</span>
                        </div>
                        <div class="admin-table-wrap">
                            <table class="admin-table">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Orders</th>
                                        <th>QTY</th>
                                        <th>Revenue</th>
                                    </tr>
                                </thead>
                                <tbody data-website-product-table-body>
                                    <tr><td colspan="4" class="admin-empty">Waiting for paid sales data.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-feed admin-website-discount-panel">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Discounts</span>
                                <h3>Paid order adjustments</h3>
                            </div>
                            <span class="admin-panel-meta" data-website-settings-endpoint>../api/settings/</span>
                        </div>
                        <div class="admin-website-discount-list" data-website-discount-summary>
                            <div><span>Total discounts</span><strong>Rp0</strong></div>
                            <div><span>Average discount</span><strong>Rp0</strong></div>
                            <div><span>Discounted orders</span><strong>0</strong></div>
                        </div>
                    </article>
                </section>
                </div>
                    </section>

                    <section class="admin-view admin-accounting-view" data-view-panel="accounting" data-accounting-view>
                <section class="admin-accounting-hero">
                    <div>
                        <span class="admin-chip admin-chip-accent">Cash Control</span>
                        <h2>Accounting</h2>
                        <p>Cash, bills, expenses, and manual finance control</p>
                        <span class="admin-panel-meta" data-accounting-status>Accounting data updates live from manual entries, wallet context, and stored order facts.</span>
                    </div>
                    <div class="admin-accounting-actions">
                        <button type="button" class="admin-ghost-btn" data-accounting-refresh>Refresh</button>
                        <button type="button" class="admin-primary-btn" data-accounting-open-mode="expense_paid">Add Expense</button>
                        <button type="button" class="admin-primary-btn" data-accounting-open-mode="bill_received">Add Bill</button>
                        <button type="button" class="admin-soft-btn" data-accounting-open-mode="pay_bill">Pay Bill</button>
                        <button type="button" class="admin-soft-btn" data-accounting-open-mode="transfer">Transfer Money</button>
                        <button type="button" class="admin-ghost-btn" data-accounting-export>Export CSV</button>
                        <button type="button" class="admin-ghost-btn" data-accounting-settings>Settings</button>
                    </div>
                </section>

                <section class="admin-accounting-toolbar admin-accounting-panel">
                    <label>
                        <span>Month</span>
                        <input type="month" data-accounting-month-select>
                    </label>
                    <div class="admin-panel-inline-toggles" data-accounting-range-controls>
                        <button type="button" class="admin-toggle-pill is-active" data-accounting-range="this_month">This Month</button>
                        <button type="button" class="admin-toggle-pill" data-accounting-range="last_month">Last Month</button>
                        <button type="button" class="admin-toggle-pill" data-accounting-range="ytd">YTD</button>
                        <button type="button" class="admin-toggle-pill" data-accounting-range="custom">Custom</button>
                    </div>
                    <label>
                        <span>From</span>
                        <input type="date" data-accounting-date-from>
                    </label>
                    <label>
                        <span>To</span>
                        <input type="date" data-accounting-date-to>
                    </label>
                </section>

                <section class="admin-accounting-kpi-grid">
                    <article class="admin-accounting-kpi"><span>Real Cash Available</span><strong data-accounting-kpi="real-cash">Rp0</strong><small>Bank + cash only</small></article>
                    <article class="admin-accounting-kpi"><span>Marketplace Outstanding</span><strong data-accounting-kpi="marketplace-outstanding">Rp0</strong><small>Expected, not cash yet</small></article>
                    <article class="admin-accounting-kpi"><span>Bills Due Soon</span><strong data-accounting-kpi="bills-due">Rp0</strong><small>Due in 7 days</small></article>
                    <article class="admin-accounting-kpi"><span>Overdue Bills</span><strong data-accounting-kpi="overdue">Rp0</strong><small>Needs action</small></article>
                    <article class="admin-accounting-kpi"><span>Expenses This Month</span><strong data-accounting-kpi="expenses">Rp0</strong><small>Paid expenses</small></article>
                    <article class="admin-accounting-kpi" data-accounting-safe-cash-card><span>Net Safe Cash</span><strong data-accounting-kpi="safe-cash">Rp0</strong><small>Estimated safe-to-spend</small></article>
                    <article class="admin-accounting-kpi"><span>Pending Manual Review</span><strong data-accounting-kpi="pending-review">0</strong><small>Needs cleanup</small></article>
                </section>

                <section class="admin-accounting-panel">
                    <div class="admin-panel-head">
                        <div><span class="admin-panel-kicker">Command Center</span><h3>What needs attention</h3></div>
                    </div>
                    <div class="admin-accounting-alert-grid" data-accounting-alerts>
                        <div class="admin-accounting-alert"><strong>No urgent alerts</strong><span>Accounting checks will appear after data loads.</span></div>
                    </div>
                </section>

                <section class="admin-accounting-panel admin-accounting-quick-entry">
                    <div class="admin-panel-head">
                        <div><span class="admin-panel-kicker">Quick Entry</span><h3>Daily finance entry</h3></div>
                        <span class="admin-panel-meta" data-accounting-form-status>Ready</span>
                    </div>
                    <div class="admin-accounting-mode-row">
                        <button type="button" class="admin-toggle-pill is-active" data-accounting-quick-mode="expense_paid">Expense Paid</button>
                        <button type="button" class="admin-toggle-pill" data-accounting-quick-mode="bill_received">Bill Received</button>
                        <button type="button" class="admin-toggle-pill" data-accounting-quick-mode="pay_bill">Pay Existing Bill</button>
                        <button type="button" class="admin-toggle-pill" data-accounting-quick-mode="transfer">Transfer Money</button>
                        <button type="button" class="admin-toggle-pill" data-accounting-quick-mode="manual_income">Money In / Manual Income</button>
                    </div>
                    <div class="admin-accounting-helper" data-accounting-mode-helper>Use this when money already left the business.</div>
                    <form class="admin-accounting-form" data-accounting-form>
                        <input type="hidden" name="mode" data-accounting-mode-field value="expense_paid">
                        <div class="admin-accounting-warning" data-accounting-marketplace-warning hidden>Do not enter Shopee/TikTok/Tokopedia order revenue here. Marketplace revenue comes from Orders/Wallet.</div>
                        <label data-accounting-field="transaction_date">
                            <span>Date</span>
                            <input type="date" name="transaction_date" data-accounting-date>
                        </label>
                        <label data-accounting-field="issue_date" hidden>
                            <span>Bill Date</span>
                            <input type="date" name="issue_date" data-accounting-issue-date>
                        </label>
                        <label data-accounting-field="due_date" hidden>
                            <span>Due Date</span>
                            <input type="date" name="due_date">
                        </label>
                        <label data-accounting-field="bill_id" hidden>
                            <span>Bill</span>
                            <select name="bill_id" data-accounting-bill-select></select>
                        </label>
                        <label>
                            <span>Amount</span>
                            <input type="text" inputmode="numeric" name="amount" data-accounting-amount placeholder="Rp0" required>
                        </label>
                        <label data-accounting-field="account_id">
                            <span>Paid From Account</span>
                            <select name="account_id" data-accounting-account-select required></select>
                        </label>
                        <label data-accounting-field="to_account_id" hidden>
                            <span>To Account</span>
                            <select name="to_account_id" data-accounting-to-account-select></select>
                        </label>
                        <label data-accounting-field="category_id">
                            <span>Category</span>
                            <select name="category_id" data-accounting-category-select required></select>
                        </label>
                        <label data-accounting-field="counterparty">
                            <span>Vendor / Payee / Source</span>
                            <input type="text" name="counterparty_name" data-accounting-counterparty-input list="accounting-counterparties" placeholder="Search or quick-create" required>
                            <datalist id="accounting-counterparties" data-accounting-counterparty-options></datalist>
                        </label>
                        <label data-accounting-field="bill_no" hidden>
                            <span>Bill / Invoice No.</span>
                            <input type="text" name="bill_no" maxlength="120">
                        </label>
                        <label>
                            <span>Brand</span>
                            <select name="brand" data-accounting-brand-select>
                                <option>General / Shared</option>
                                <option>ZERO</option>
                                <option>Jenang Gemi</option>
                                <option>ZFit</option>
                                <option>Superfoods</option>
                                <option>Other</option>
                            </select>
                        </label>
                        <label>
                            <span>Channel</span>
                            <select name="channel" data-accounting-channel-select>
                                <option>Internal</option>
                                <option>Shopee</option>
                                <option>TikTok</option>
                                <option>Tokopedia</option>
                                <option>Website</option>
                                <option>WhatsApp</option>
                                <option>Offline</option>
                                <option>Partner</option>
                                <option>Distributor</option>
                                <option>Reseller</option>
                                <option>Ads</option>
                                <option>Production</option>
                                <option>Fulfillment</option>
                            </select>
                        </label>
                        <label data-accounting-field="income_type" hidden>
                            <span>Income Type</span>
                            <select name="income_type" data-accounting-income-type>
                                <option value="manual_income">Offline customer payment</option>
                                <option value="manual_income">Website/manual invoice payment</option>
                                <option value="owner_injection">Owner injection</option>
                                <option value="manual_income">Loan received</option>
                                <option value="refund">Refund/reimbursement received</option>
                                <option value="manual_income">Other income</option>
                            </select>
                        </label>
                        <label>
                            <span>Payment Method</span>
                            <select name="payment_method">
                                <option>Bank Transfer</option>
                                <option>Cash</option>
                                <option>QRIS</option>
                                <option>E-wallet</option>
                                <option>Marketplace Wallet</option>
                                <option>Card</option>
                                <option>Other</option>
                            </select>
                        </label>
                        <label data-accounting-field="transfer_fee_amount" hidden>
                            <span>Transfer Fee</span>
                            <input type="text" inputmode="numeric" name="transfer_fee_amount" placeholder="Rp0">
                        </label>
                        <label>
                            <span>Receipt / Attachment URL</span>
                            <input type="url" name="receipt_url" placeholder="https://...">
                        </label>
                        <label>
                            <span>Receipt Status</span>
                            <select name="receipt_status">
                                <option value="missing">Missing</option>
                                <option value="attached">Attached</option>
                                <option value="not_required">Not required</option>
                            </select>
                        </label>
                        <label>
                            <span>Reference No.</span>
                            <input type="text" name="reference_no" maxlength="160">
                        </label>
                        <label>
                            <span>Related Order / SKU</span>
                            <input type="text" name="order_no" maxlength="160">
                        </label>
                        <label class="admin-accounting-form-wide">
                            <span>Notes</span>
                            <textarea name="notes" rows="3"></textarea>
                        </label>
                        <p class="admin-form-error" data-accounting-form-error hidden></p>
                        <div class="admin-accounting-form-actions">
                            <button type="submit" class="admin-primary-btn" data-accounting-save>Save</button>
                            <button type="submit" class="admin-soft-btn" data-accounting-save-add value="1">Save &amp; Add Another</button>
                            <button type="submit" class="admin-ghost-btn" data-accounting-save-draft>Save Draft</button>
                            <button type="reset" class="admin-ghost-btn">Cancel</button>
                        </div>
                    </form>
                </section>

                <section class="admin-main-grid admin-accounting-main-grid">
                    <article class="admin-panel admin-accounting-panel admin-panel-wide">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Bills Queue</span><h3>Unpaid and upcoming bills</h3></div>
                            <span class="admin-panel-meta" data-accounting-bills-meta>Open bills</span>
                        </div>
                        <div class="admin-table-wrap admin-accounting-table-wrap">
                            <table class="admin-table admin-accounting-table">
                                <thead>
                                    <tr>
                                        <th>Due Date</th>
                                        <th>Status</th>
                                        <th>Vendor</th>
                                        <th>Bill No.</th>
                                        <th>Category</th>
                                        <th>Brand</th>
                                        <th>Channel</th>
                                        <th>Total</th>
                                        <th>Paid</th>
                                        <th>Outstanding</th>
                                        <th>Age</th>
                                        <th>Attachment</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody data-accounting-bills-body>
                                    <tr><td colspan="13" class="admin-empty">Loading bills.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </article>

                    <article class="admin-panel admin-accounting-panel admin-panel-wide">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Transaction Ledger</span><h3>Manual finance history</h3></div>
                            <span class="admin-panel-meta" data-accounting-ledger-meta>Selected month</span>
                        </div>
                        <div class="admin-table-wrap admin-accounting-table-wrap">
                            <table class="admin-table admin-accounting-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Type</th>
                                        <th>Account</th>
                                        <th>Direction</th>
                                        <th>Vendor / Payee</th>
                                        <th>Category</th>
                                        <th>Brand</th>
                                        <th>Channel</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Receipt</th>
                                        <th>Related Bill</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody data-accounting-transactions-body>
                                    <tr><td colspan="13" class="admin-empty">Loading transactions.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </article>

                    <article class="admin-panel admin-accounting-panel">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Monthly Summary</span><h3>Revenue context and cash movement</h3></div>
                        </div>
                        <div class="admin-accounting-summary-list" data-accounting-monthly-summary></div>
                    </article>

                    <article class="admin-panel admin-accounting-panel">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Vendor / Category Insights</span><h3>Spend split</h3></div>
                        </div>
                        <div class="admin-accounting-tabs">
                            <button type="button" class="admin-toggle-pill is-active" data-accounting-insight-tab="category">Category</button>
                            <button type="button" class="admin-toggle-pill" data-accounting-insight-tab="vendor">Vendor</button>
                            <button type="button" class="admin-toggle-pill" data-accounting-insight-tab="brand">Brand</button>
                            <button type="button" class="admin-toggle-pill" data-accounting-insight-tab="channel">Channel</button>
                        </div>
                        <div class="admin-accounting-insight-list" data-accounting-insights></div>
                    </article>

                    <article class="admin-panel admin-accounting-panel admin-panel-wide">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Reconciliation / Review Queue</span><h3>Data quality checks</h3></div>
                            <span class="admin-panel-meta">Missing category, receipt, duplicate, and marketplace-income checks</span>
                        </div>
                        <div class="admin-table-wrap admin-accounting-table-wrap">
                            <table class="admin-table admin-accounting-table">
                                <thead>
                                    <tr>
                                        <th>Issue</th>
                                        <th>Severity</th>
                                        <th>Transaction / Bill</th>
                                        <th>Suggested Fix</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody data-accounting-review-body>
                                    <tr><td colspan="5" class="admin-empty">Loading review queue.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </article>
                </section>

                <div class="admin-modal-shell admin-accounting-drawer" data-accounting-drawer hidden>
                    <button type="button" class="admin-modal-backdrop" data-accounting-drawer-close aria-label="Close accounting details"></button>
                    <aside class="admin-modal-card admin-accounting-drawer-card" role="dialog" aria-modal="true" aria-labelledby="accounting-drawer-title">
                        <div class="admin-modal-head">
                            <div>
                                <span class="admin-panel-kicker" data-accounting-drawer-kicker>Accounting</span>
                                <h3 id="accounting-drawer-title" data-accounting-drawer-title>Details</h3>
                            </div>
                            <button type="button" class="admin-ghost-btn" data-accounting-drawer-close>Close</button>
                        </div>
                        <div class="admin-accounting-drawer-body" data-accounting-drawer-body>
                            <p class="admin-empty">Select a bill or transaction.</p>
                        </div>
                    </aside>
                </div>
                    </section>

                    <section class="admin-view" data-view-panel="store-ops" data-store-ops-dashboard data-store-ops-endpoint="../api/store-ops/">
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

                    <section class="admin-view admin-view-settings" data-view-panel="settings">
                <section class="admin-settings-grid">
                    <article class="admin-panel admin-settings-card">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Appearance</span><h3>Theme</h3></div>
                        </div>
                        <p class="admin-settings-copy">Switch the dashboard between dark and light mode without leaving the page.</p>
                        <button type="button" class="admin-primary-btn" data-theme-toggle>Toggle Theme</button>
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
                    <div class="admin-orders-date-grid">
                        <label>
                            <span>Start Date</span>
                            <input type="date" data-orders-start-date>
                        </label>
                        <label>
                            <span>End Date</span>
                            <input type="date" data-orders-end-date>
                        </label>
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
