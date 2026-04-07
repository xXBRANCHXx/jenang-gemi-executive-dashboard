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
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jenang Gemi Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/png" href="https://jenanggemi.com/Media/Jenang%20Gemi%20Website%20Logo.png">
    <link rel="stylesheet" href="../admin.css?v=2">
</head>
<body class="admin-body<?php echo $isAuthenticated ? ' is-dashboard is-loading' : ' is-login'; ?>">
<?php if (!$isAuthenticated): ?>
    <main class="admin-login-shell">
        <div class="admin-login-orb admin-login-orb-a"></div>
        <div class="admin-login-orb admin-login-orb-b"></div>
        <section class="admin-login-card">
            <div class="admin-login-brand">
                <span class="admin-chip">Executive Access</span>
                <h1>Jenang Gemi Executive Dashboard</h1>
                <p>Secure access to traffic, source attribution, conversion flow, and session-depth analytics for Bubur campaign landing pages.</p>
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
    <div class="admin-app" data-admin-dashboard data-analytics-endpoint="../api/analytics/">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <header class="admin-topbar">
            <div class="admin-topbar-brand">
                <span class="admin-chip">Authenticated Session</span>
                <h1>Jenang Gemi Executive Dashboard</h1>
                <p>Track source performance, CTA engagement, checkout intent, and visit depth from a private control panel.</p>
            </div>
            <div class="admin-topbar-actions">
                <button type="button" class="admin-ghost-btn" data-theme-toggle aria-label="Toggle theme">Toggle Theme</button>
                <a class="admin-primary-btn admin-link-btn" href="../logout/">Lock Dashboard</a>
            </div>
        </header>

        <main class="admin-layout">
            <section class="admin-hero-panel">
                <div class="admin-hero-copy">
                    <span class="admin-chip admin-chip-accent">Realtime Campaign Monitoring</span>
                    <h2>High-contrast control panel for YouTube, Facebook, Instagram, and TikTok performance.</h2>
                    <p>Views, Order Now clicks, checkout intent, average time spent, and the latest tracked sessions are available here without exposing the raw analytics endpoint publicly.</p>
                </div>
                <div class="admin-hero-actions">
                    <div class="admin-status-pill">
                        <span class="admin-status-dot"></span>
                        <span>Secure Session Active</span>
                    </div>
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

                        <div class="admin-launchpad-section admin-launchpad-section-muted">
                            <div class="admin-launchpad-head">
                                <span class="admin-panel-kicker">Jenang Gemi Jamu</span>
                                <strong>Coming soon</strong>
                            </div>
                            <div class="admin-launchpad-grid">
                                <div class="admin-launchpad-link is-disabled" aria-disabled="true">
                                    <span>YouTube</span>
                                    <small>Coming soon</small>
                                </div>
                                <div class="admin-launchpad-link is-disabled" aria-disabled="true">
                                    <span>Facebook</span>
                                    <small>Coming soon</small>
                                </div>
                                <div class="admin-launchpad-link is-disabled" aria-disabled="true">
                                    <span>Instagram</span>
                                    <small>Coming soon</small>
                                </div>
                                <div class="admin-launchpad-link is-disabled" aria-disabled="true">
                                    <span>TikTok</span>
                                    <small>Coming soon</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section class="admin-control-strip">
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
                <article class="admin-metric-card"><span>Total Views</span><strong data-summary-total-views>0</strong><small>All campaign page views</small></article>
                <article class="admin-metric-card"><span>Order Now Clicks</span><strong data-summary-order-clicks>0</strong><small>Sticky + hero CTA demand</small></article>
                <article class="admin-metric-card"><span>Checkout Clicks</span><strong data-summary-checkout-clicks>0</strong><small>WhatsApp intent clicks</small></article>
                <article class="admin-metric-card"><span>Avg. Time Spent</span><strong data-summary-time-spent>0s</strong><small>Average dwell time per session</small></article>
            </section>

            <section class="admin-main-grid">
                <article class="admin-panel admin-panel-chart admin-panel-wide">
                    <div class="admin-panel-head">
                        <div>
                            <span class="admin-panel-kicker">Trend</span>
                            <h3 data-trend-title>Views over time</h3>
                        </div>
                        <span class="admin-panel-meta" data-trend-meta>Live over selected timeframe</span>
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
                            <h3>Views by source</h3>
                        </div>
                        <span class="admin-panel-meta">Live from protected analytics proxy</span>
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
                            <h3>Checkout by landing URL</h3>
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
                            <tbody data-source-table-body>
                                <tr><td colspan="5" class="admin-empty">Belum ada data.</td></tr>
                            </tbody>
                        </table>
                    </div>
                </article>

                <article class="admin-panel admin-panel-feed">
                    <div class="admin-panel-head">
                        <div><span class="admin-panel-kicker">Recent Events</span><h3>Latest tracked actions</h3></div>
                    </div>
                    <div class="admin-event-feed" data-recent-events>
                        <p class="admin-empty">Belum ada aktivitas.</p>
                    </div>
                </article>

                <article class="admin-panel admin-panel-feed">
                    <div class="admin-panel-head">
                        <div><span class="admin-panel-kicker">Protected Access</span><h3>System notes</h3></div>
                    </div>
                    <div class="admin-note-stack">
                        <div class="admin-note-card"><strong>Auth gate</strong><span>Dashboard and analytics access are protected by server-side session auth.</span></div>
                        <div class="admin-note-card"><strong>Source API</strong><span>Data is pulled server-side from jenanggemi.com over a shared secret header.</span></div>
                        <div class="admin-note-card"><strong>Endpoint</strong><span data-endpoint-label>../api/analytics/</span></div>
                        <div class="admin-note-card"><strong>Auto Update</strong><span>Dashboard refreshes automatically every 60 seconds.</span></div>
                    </div>
                </article>
            </section>
        </main>
    </div>
    <script type="module" src="../admin.js?v=2"></script>
<?php endif; ?>
</body>
</html>
