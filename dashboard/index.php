<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';

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
$dashboardBuildVersion = 'exec3.47.0';
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
<body class="admin-body<?php echo $isAuthenticated ? ' is-dashboard is-loading' : ' is-login'; ?>">
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
    <div class="admin-app" data-admin-dashboard data-analytics-endpoint="../api/analytics/" data-live-endpoint="../api/live/" data-settings-endpoint="../api/settings/">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <div class="admin-shell">
            <aside class="admin-rail" aria-label="Admin navigation">
                <a class="admin-rail-brand" href="./" aria-label="Executive Dashboard home">
                    <span class="admin-rail-brand-mark" aria-hidden="true">
                        <span class="admin-rail-brand-core"></span>
                    </span>
                    <span class="admin-rail-brand-wordmark">ADMIN</span>
                </a>
                <nav class="admin-rail-nav">
                    <button type="button" class="admin-rail-link is-active" data-view-switch="home" aria-label="Open home dashboard">
                        <span class="admin-rail-icon admin-rail-icon-home" aria-hidden="true">
                            <span></span>
                        </span>
                        <span class="admin-rail-link-text">Home</span>
                    </button>
                    <button type="button" class="admin-rail-link" data-view-switch="website" aria-label="Open website dashboard">
                        <span class="admin-rail-icon admin-rail-icon-rocket" aria-hidden="true">
                            <span></span>
                        </span>
                        <span class="admin-rail-link-text">Website</span>
                    </button>
                    <a class="admin-rail-link" href="../affiliate-program/" aria-label="Open affiliate program dashboard">
                        <span class="admin-rail-icon admin-rail-icon-affiliate" aria-hidden="true">
                            <span></span>
                        </span>
                        <span class="admin-rail-link-text">Affiliate</span>
                    </a>
                    <a class="admin-rail-link" href="../partner-program/" aria-label="Open partner program dashboard">
                        <span class="admin-rail-icon admin-rail-icon-partner" aria-hidden="true">
                            <span></span>
                        </span>
                        <span class="admin-rail-link-text">Partner</span>
                    </a>
                    <a class="admin-rail-link" href="../sku-db/" aria-label="Open SKU database">
                        <span class="admin-rail-icon admin-rail-icon-sku" aria-hidden="true">
                            <span>SKU</span>
                        </span>
                        <span class="admin-rail-link-text">SKU DB</span>
                    </a>
                </nav>
                <div class="admin-rail-footer">
                    <button type="button" class="admin-rail-link admin-rail-link-settings" data-view-switch="settings" aria-label="Open admin settings">
                        <span class="admin-rail-icon admin-rail-icon-settings" aria-hidden="true">
                            <span></span>
                        </span>
                        <span class="admin-rail-link-text">Settings</span>
                    </button>
                </div>
            </aside>

            <div class="admin-shell-main">
                <header class="admin-topbar">
                    <div class="admin-topbar-left">
                        <div class="admin-topbar-brand">
                            <span class="admin-admin-mark">Admin Scope</span>
                            <h1>Executive Dashboard</h1>
                            <p data-active-view-label>Home Dashboard</p>
                        </div>
                    </div>
                    <div class="admin-topbar-actions">
                        <div class="admin-search-shell" data-dashboard-search-shell>
                            <button type="button" class="admin-ghost-btn admin-search-toggle" data-dashboard-search-toggle aria-expanded="false" aria-label="Open dashboard search">
                                <span aria-hidden="true">⌕</span>
                            </button>
                            <form class="admin-search-form" data-dashboard-search-form hidden>
                                <input type="search" class="admin-search-input" data-dashboard-search-input placeholder="Search current admin view" autocomplete="off">
                            </form>
                        </div>
                        <div class="admin-menu-shell" data-menu-shell>
                            <button type="button" class="admin-ghost-btn admin-menu-trigger" data-menu-trigger aria-expanded="false" aria-label="Open dashboard menu">...</button>
                            <div class="admin-menu-panel" data-menu-panel hidden>
                                <button type="button" class="admin-menu-item" data-view-switch="home">Home Dashboard</button>
                                <button type="button" class="admin-menu-item" data-view-switch="website">Official Website Dashboard</button>
                                <a class="admin-menu-item admin-link-btn" href="../affiliate-program/">Affiliate Program Dashboard</a>
                                <a class="admin-menu-item admin-link-btn" href="../partner-program/">Partner Program Dashboard</a>
                                <a class="admin-menu-item admin-link-btn" href="../partner-profiles/">Partner Profiles</a>
                                <a class="admin-menu-item admin-link-btn" href="../sku-db/">SKU Database</a>
                                <button type="button" class="admin-menu-item" data-view-switch="settings">Settings</button>
                            </div>
                        </div>
                    </div>
                </header>

                <main class="admin-layout">
                    <section class="admin-view is-active" data-view-panel="home">
                <section class="admin-hero-panel">
                    <div class="admin-hero-copy">
                        <span class="admin-chip admin-chip-accent">Realtime Campaign Monitoring</span>
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

                    <article class="admin-panel admin-panel-chart">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Time of Day</span>
                                <h3>Activity by hour</h3>
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
                    <a class="admin-ghost-btn admin-link-btn" href="../back-dash/">Open Back-dash</a>
                </div>
                    </section>

                    <section class="admin-view" data-view-panel="website">
                <section class="admin-hero-panel admin-hero-panel-website">
                    <div class="admin-hero-copy">
                        <span class="admin-chip admin-chip-accent">Official Website Dashboard</span>
                        <h2>Track real visitors, top regions, and page activity across the main Jenang Gemi website.</h2>
                        <p>This view only uses browser-tagged website visits. API calls, webhook traffic, and excluded IP addresses stay out of the charts.</p>
                    </div>
                    <div class="admin-hero-actions">
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
                    <article class="admin-metric-card"><span>Avg. Time Spent</span><strong data-website-summary-time-spent>0s</strong><small>Average per website session</small></article>
                    <article class="admin-metric-card"><span>Top Region</span><strong data-website-summary-top-region>Unknown</strong><small>Most active region in selected timeframe</small></article>
                </section>

                <section class="admin-main-grid">
                    <article class="admin-panel admin-panel-chart admin-panel-wide">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Trend</span>
                                <h3 data-website-trend-title>Website visitors over time</h3>
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
                                <h3>Visitors by region</h3>
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
                                <h3>Visitors by page</h3>
                            </div>
                            <span class="admin-panel-meta">Main site pages only</span>
                        </div>
                        <div class="admin-chart-surface">
                            <canvas class="admin-chart-canvas" data-website-page-chart width="880" height="340"></canvas>
                        </div>
                    </article>

                    <article class="admin-panel admin-panel-table">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Pages</span><h3>Official website pages</h3></div>
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
                            <div class="admin-note-card"><strong>Scope</strong><span>Counts only `traffic_kind=website` browser events from the official website.</span></div>
                            <div class="admin-note-card"><strong>Exclusions</strong><span>Your saved IP list is applied at query time, so old visits from your IP disappear from the charts too.</span></div>
                            <div class="admin-note-card"><strong>Geo source</strong><span>Regions use whatever geolocation headers Hostinger or proxy layers expose to PHP.</span></div>
                            <div class="admin-note-card"><strong>Settings API</strong><span data-website-settings-endpoint>../api/settings/</span></div>
                        </div>
                    </article>
                </section>
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
    <script type="module" src="../admin.js?v=<?php echo urlencode($adminJsVersion ?: '1'); ?>"></script>
<?php endif; ?>
</body>
</html>
