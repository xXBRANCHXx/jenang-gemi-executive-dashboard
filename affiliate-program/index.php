<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/?view=overview');
    exit;
}

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$affiliateJsVersion = (string) @filemtime(dirname(__DIR__) . '/affiliate-program.js');
?>
<!DOCTYPE html>
<html lang="id" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>Affiliate Program | Jenang Gemi Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/svg+xml" href="/assets/admin-icons/executive-dashboard-favicon-light.svg" media="(prefers-color-scheme: light)">
    <link rel="icon" type="image/svg+xml" href="/assets/admin-icons/executive-dashboard-favicon-dark.svg" media="(prefers-color-scheme: dark)">
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

    <div class="admin-app admin-app-suite" data-affiliate-dashboard data-analytics-endpoint="../api/analytics/" data-affiliates-endpoint="../api/affiliates/" data-live-endpoint="../api/live/">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <div class="admin-shell">
            <?php render_admin_sidebar('affiliate'); ?>

            <div class="admin-shell-main">
                <header class="admin-topbar">
                    <div class="admin-topbar-brand">
                        <span class="admin-chip">Affiliate Program</span>
                        <h1>Jenang Gemi Affiliate Program</h1>
                    </div>
                    <?php render_admin_topbar_actions(); ?>
                </header>

                <main class="admin-layout">
            <section class="admin-affiliate-toolbar" aria-label="Affiliate shortcuts">
                <a class="admin-primary-btn admin-link-btn" href="../affiliate-profiles/">Affiliate Profiles</a>
                <a class="admin-ghost-btn admin-link-btn" href="../dashboard/?view=campaigns">Campaigns</a>
            </section>

            <section class="admin-control-strip admin-control-strip-compact admin-affiliate-controls">
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
                    <div class="admin-toggle-row admin-sliding-chart-toggle" data-timeframe-controls data-sliding-chart-toggle role="group" aria-label="Affiliate timeframe">
                        <button type="button" class="admin-toggle-pill" data-timeframe="1h"><span>1H</span></button>
                        <button type="button" class="admin-toggle-pill is-active" data-timeframe="24h"><span>24H</span></button>
                        <button type="button" class="admin-toggle-pill" data-timeframe="7d"><span>7D</span></button>
                        <button type="button" class="admin-toggle-pill" data-timeframe="30d"><span>30D</span></button>
                        <button type="button" class="admin-toggle-pill" data-timeframe="90d"><span>90D</span></button>
                        <button type="button" class="admin-toggle-pill" data-timeframe="all"><span>ALL</span></button>
                    </div>
                </div>
                <div class="admin-control-group">
                    <span class="admin-control-label">Trend Metric</span>
                    <div class="admin-toggle-row admin-sliding-chart-toggle" data-metric-controls data-sliding-chart-toggle role="group" aria-label="Affiliate trend metric">
                        <button type="button" class="admin-toggle-pill is-active" data-metric="views"><span>Views</span></button>
                        <button type="button" class="admin-toggle-pill" data-metric="order_now_clicks"><span>Order Now</span></button>
                        <button type="button" class="admin-toggle-pill" data-metric="checkout_clicks"><span>Checkout</span></button>
                    </div>
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
                    <div class="admin-panel-inline-toggles admin-sliding-chart-toggle" data-affiliate-series-controls data-sliding-chart-toggle role="group" aria-label="Affiliate product lines">
                        <button type="button" class="admin-toggle-pill admin-toggle-pill-series admin-toggle-pill-series-bubur is-active" data-affiliate-series="bubur"><span>Bubur</span></button>
                        <button type="button" class="admin-toggle-pill admin-toggle-pill-series admin-toggle-pill-series-jamu is-active" data-affiliate-series="jamu"><span>Jamu</span></button>
                    </div>
                    <div class="admin-chart-surface">
                        <canvas class="admin-chart-canvas admin-chart-canvas-lg" data-trend-chart width="1200" height="360"></canvas>
                    </div>
                </article>

                <article class="admin-panel admin-panel-chart admin-hour-activity-panel">
                    <div class="admin-panel-head">
                        <div>
                            <span class="admin-panel-kicker">Time of Day</span>
                            <h3>Activity by hour</h3>
                        </div>
                        <span class="admin-panel-meta">Peak engagement hours</span>
                    </div>
                    <div class="admin-chart-surface">
                        <canvas class="admin-chart-canvas admin-chart-canvas-tall" data-hour-chart width="1000" height="420"></canvas>
                    </div>
                </article>

                <article class="admin-panel admin-product-cart-panel">
                    <div class="admin-panel-head">
                        <div>
                            <span class="admin-panel-kicker">Cart Composition</span>
                            <h3>Product added to cart</h3>
                        </div>
                        <span class="admin-panel-meta" data-product-cart-meta>Share of cart adds</span>
                    </div>
                    <div class="admin-product-cart-rundown" data-product-cart-rundown>
                        <p class="admin-empty">Pilih affiliate untuk melihat data.</p>
                    </div>
                </article>

            </section>
                </main>
            </div>
        </div>
    </div>

    <?php render_admin_notification_drawer(); ?>
    <?php render_admin_chrome_script(); ?>
    <script type="module" src="../affiliate-program.js?v=<?php echo urlencode($affiliateJsVersion ?: '1'); ?>"></script>
</body>
</html>
