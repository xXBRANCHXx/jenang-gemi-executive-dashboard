<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/');
    exit;
}

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$affiliateJsVersion = (string) @filemtime(dirname(__DIR__) . '/affiliate-program.js');
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>Affiliate Program | Jenang Gemi Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/png" href="https://jenanggemi.com/Media/Jenang%20Gemi%20Website%20Logo.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard is-loading">
    <div class="admin-loader" data-admin-loader aria-live="polite">
        <div class="admin-loader-panel">
            <span class="admin-chip">Preparing Affiliate Program</span>
            <h2>Loading affiliate control room</h2>
            <p>Fetching affiliate profiles, live performance, and management controls before reveal.</p>
            <div class="admin-loader-bar">
                <span class="admin-loader-progress" data-admin-loader-progress></span>
            </div>
            <strong class="admin-loader-label" data-admin-loader-label>Initializing...</strong>
        </div>
    </div>

    <div class="admin-app" data-affiliate-dashboard data-analytics-endpoint="../api/analytics/" data-affiliates-endpoint="../api/affiliates/" data-live-endpoint="../api/live/">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <header class="admin-topbar">
            <div class="admin-topbar-brand">
                <span class="admin-chip">Affiliate Program</span>
                <h1>Jenang Gemi Affiliate Program</h1>
                <p>Create affiliate landing pages, manage platform assignments, and watch affiliate performance live from a dedicated workspace.</p>
            </div>
            <div class="admin-topbar-actions">
                <div class="admin-view-indicator">Affiliate Program</div>
                <div class="admin-menu-shell" data-menu-shell>
                    <button type="button" class="admin-ghost-btn admin-menu-trigger" data-menu-trigger aria-expanded="false" aria-label="Open dashboard menu">...</button>
                    <div class="admin-menu-panel" data-menu-panel hidden>
                        <a class="admin-menu-item admin-link-btn" href="../dashboard/" data-dashboard-view-link="home">Home Dashboard</a>
                        <a class="admin-menu-item admin-link-btn" href="../dashboard/" data-dashboard-view-link="website">Official Website Dashboard</a>
                        <a class="admin-menu-item admin-link-btn" href="../affiliate-program/">Affiliate Program Dashboard</a>
                        <a class="admin-menu-item admin-link-btn" href="../affiliate-profiles/">Affiliate Profiles</a>
                        <a class="admin-menu-item admin-link-btn" href="../sku-db/">SKU Database</a>
                        <a class="admin-menu-item admin-link-btn" href="../sku-db/new/">Add SKU</a>
                        <button type="button" class="admin-menu-item" data-theme-toggle>Toggle Theme</button>
                        <a class="admin-menu-item admin-link-btn" href="../logout/">Lock Dashboard</a>
                    </div>
                </div>
            </div>
        </header>

        <main class="admin-layout">
            <section class="admin-hero-panel">
                <div class="admin-hero-copy">
                    <span class="admin-chip admin-chip-accent">Affiliate Performance</span>
                    <h2>Watch affiliate traffic and conversions here without exposing editing controls on the analytics page.</h2>
                    <p>Select an affiliate to inspect live performance charts. For profile changes, platform assignments, or deletion, use the dedicated Affiliate Profiles area.</p>
                </div>
                <div class="admin-hero-actions">
                    <div class="admin-status-pill">
                        <span class="admin-status-dot"></span>
                        <span>Secure Session Active</span>
                    </div>
                    <a class="admin-primary-btn admin-link-btn" href="../affiliate-profiles/">Open Affiliate Profiles</a>
                </div>
            </section>

            <section class="admin-control-strip">
                <div class="admin-control-group">
                    <span class="admin-control-label">Affiliate</span>
                    <label class="admin-select-wrap">
                        <select class="admin-select" data-affiliate-select disabled>
                            <option value="">Select affiliate</option>
                        </select>
                    </label>
                </div>
                <div class="admin-control-group">
                    <span class="admin-control-label">Timeframe</span>
                    <div class="admin-toggle-row" data-timeframe-controls>
                        <button type="button" class="admin-toggle-pill" data-timeframe="1h">1H</button>
                        <button type="button" class="admin-toggle-pill is-active" data-timeframe="24h">24H</button>
                        <button type="button" class="admin-toggle-pill" data-timeframe="7d">7D</button>
                        <button type="button" class="admin-toggle-pill" data-timeframe="30d">30D</button>
                        <button type="button" class="admin-toggle-pill" data-timeframe="90d">90D</button>
                        <button type="button" class="admin-toggle-pill" data-timeframe="all">ALL</button>
                    </div>
                </div>
                <div class="admin-control-group">
                    <span class="admin-control-label">Trend Metric</span>
                    <div class="admin-toggle-row" data-metric-controls>
                        <button type="button" class="admin-toggle-pill is-active" data-metric="views">Views</button>
                        <button type="button" class="admin-toggle-pill" data-metric="order_now_clicks">Order Now</button>
                        <button type="button" class="admin-toggle-pill" data-metric="checkout_clicks">Checkout</button>
                    </div>
                </div>
                <div class="admin-live-status">
                    <strong>Live</strong>
                    <span data-last-updated>Waiting for first sync</span>
                </div>
            </section>

            <section class="admin-metric-grid">
                <article class="admin-metric-card"><span>Total Views</span><strong data-summary-total-views>0</strong><small>Selected affiliate page views</small></article>
                <article class="admin-metric-card"><span>Order Now Clicks</span><strong data-summary-order-clicks>0</strong><small>Demand from affiliate traffic</small></article>
                <article class="admin-metric-card"><span>Checkout Clicks</span><strong data-summary-checkout-clicks>0</strong><small>WhatsApp intent from affiliate traffic</small></article>
                <article class="admin-metric-card"><span>Avg. Time Spent</span><strong data-summary-time-spent>0s</strong><small>Average dwell time per affiliate session</small></article>
            </section>

            <section class="admin-main-grid">
                <article class="admin-panel admin-panel-chart admin-panel-wide">
                    <div class="admin-panel-head">
                        <div>
                            <span class="admin-panel-kicker">Trend</span>
                            <h3 data-trend-title>Affiliate performance over time</h3>
                        </div>
                        <span class="admin-panel-meta" data-trend-meta>Select an affiliate to begin</span>
                    </div>
                    <div class="admin-panel-inline-toggles" data-affiliate-series-controls>
                        <button type="button" class="admin-toggle-pill admin-toggle-pill-series admin-toggle-pill-series-bubur is-active" data-affiliate-series="bubur">Bubur</button>
                        <button type="button" class="admin-toggle-pill admin-toggle-pill-series admin-toggle-pill-series-jamu is-active" data-affiliate-series="jamu">Jamu</button>
                    </div>
                    <div class="admin-chart-surface">
                        <canvas class="admin-chart-canvas admin-chart-canvas-lg" data-trend-chart width="1200" height="360"></canvas>
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
                        <canvas class="admin-chart-canvas" data-hour-chart width="880" height="340"></canvas>
                    </div>
                </article>

                <article class="admin-panel admin-panel-chart">
                    <div class="admin-panel-head">
                        <div>
                            <span class="admin-panel-kicker">Source Mix</span>
                            <h3>Views by platform</h3>
                        </div>
                        <span class="admin-panel-meta">Platform mix inside the selected affiliate</span>
                    </div>
                    <div class="admin-chart-surface">
                        <canvas class="admin-chart-canvas" data-source-chart width="880" height="340"></canvas>
                    </div>
                    <div class="admin-chart-legend" data-source-legend></div>
                </article>

                <article class="admin-panel admin-panel-chart">
                    <div class="admin-panel-head">
                        <div>
                            <span class="admin-panel-kicker">URL Performance</span>
                            <h3>Checkout by affiliate landing URL</h3>
                        </div>
                        <span class="admin-panel-meta">Conversion intent by page path</span>
                    </div>
                    <div class="admin-chart-surface">
                        <canvas class="admin-chart-canvas" data-url-chart width="880" height="340"></canvas>
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
                            <tbody data-url-table-body>
                                <tr><td colspan="6" class="admin-empty">Pilih affiliate untuk melihat data.</td></tr>
                            </tbody>
                        </table>
                    </div>
                </article>

                <article class="admin-panel admin-panel-table">
                    <div class="admin-panel-head">
                        <div><span class="admin-panel-kicker">Platform Summary</span><h3>Per platform metrics</h3></div>
                    </div>
                    <div class="admin-table-wrap">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Platform</th>
                                    <th>Views</th>
                                    <th>Order Now</th>
                                    <th>Checkout</th>
                                    <th>Avg. Time</th>
                                </tr>
                            </thead>
                            <tbody data-source-table-body>
                                <tr><td colspan="5" class="admin-empty">Pilih affiliate untuk melihat data.</td></tr>
                            </tbody>
                        </table>
                    </div>
                </article>

                <article class="admin-panel admin-panel-feed">
                    <div class="admin-panel-head">
                        <div><span class="admin-panel-kicker">Recent Events</span><h3>Latest affiliate actions</h3></div>
                    </div>
                    <div class="admin-event-feed" data-recent-events>
                        <p class="admin-empty">Pilih affiliate untuk melihat aktivitas.</p>
                    </div>
                </article>

                <article class="admin-panel admin-panel-feed">
                    <div class="admin-panel-head">
                        <div><span class="admin-panel-kicker">Protected Access</span><h3>System notes</h3></div>
                    </div>
                    <div class="admin-note-stack">
                        <div class="admin-note-card"><strong>Auth gate</strong><span>Affiliate controls and analytics are protected by server-side session auth.</span></div>
                        <div class="admin-note-card"><strong>Source API</strong><span>Affiliate data is pulled server-side from jenanggemi.com over a shared secret header.</span></div>
                        <div class="admin-note-card"><strong>Endpoint</strong><span data-endpoint-label>../api/analytics/</span></div>
                        <div class="admin-note-card"><strong>Live Sync</strong><span>Affiliate charts refresh automatically when new affiliate events arrive.</span></div>
                    </div>
                </article>
            </section>

            <div class="admin-bottom-actions">
                <a class="admin-primary-btn admin-link-btn" href="../affiliate-profiles/">Manage Affiliate Profiles</a>
                <a class="admin-ghost-btn admin-link-btn" href="../dashboard/">Return To Main Dashboard</a>
            </div>
        </main>
    </div>

    <script type="module" src="../affiliate-program.js?v=<?php echo urlencode($affiliateJsVersion ?: '1'); ?>"></script>
</body>
</html>
