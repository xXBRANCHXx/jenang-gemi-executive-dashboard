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
    <link rel="stylesheet" href="../admin.css?v=1">
</head>
<body class="admin-body<?php echo $isAuthenticated ? ' is-dashboard' : ' is-login'; ?>">
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
                <button type="button" class="admin-ghost-btn" data-admin-refresh>Refresh</button>
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
                    <a class="admin-soft-btn" href="https://jenanggemi.com/bubur-youtube.html" target="_blank" rel="noopener">Open Landing Page</a>
                    <div class="admin-status-pill">
                        <span class="admin-status-dot"></span>
                        <span>Secure Session Active</span>
                    </div>
                </div>
            </section>

            <section class="admin-metric-grid">
                <article class="admin-metric-card"><span>Total Views</span><strong data-summary-total-views>0</strong><small>All campaign page views</small></article>
                <article class="admin-metric-card"><span>Order Now Clicks</span><strong data-summary-order-clicks>0</strong><small>Sticky + hero CTA demand</small></article>
                <article class="admin-metric-card"><span>Checkout Clicks</span><strong data-summary-checkout-clicks>0</strong><small>WhatsApp intent clicks</small></article>
                <article class="admin-metric-card"><span>Avg. Time Spent</span><strong data-summary-time-spent>0s</strong><small>Average dwell time per session</small></article>
            </section>

            <section class="admin-main-grid">
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
                    </div>
                </article>
            </section>
        </main>
    </div>
    <script type="module" src="../admin.js?v=1"></script>
<?php endif; ?>
</body>
</html>
