<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/');
    exit;
}

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$adminJsVersion = (string) @filemtime(dirname(__DIR__) . '/partner-admin.js');
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>Partner Program | Jenang Gemi Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/png" href="https://jenanggemi.com/Media/Jenang%20Gemi%20Website%20Logo.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard">
    <div class="admin-build-badge" aria-label="Dashboard build version">Build exec3.47.0</div>
    <div class="admin-app">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <div class="admin-shell">
            <aside class="admin-rail" aria-label="Admin navigation">
                <a class="admin-rail-brand" href="../dashboard/" aria-label="Executive Dashboard home"><span class="admin-rail-brand-mark" aria-hidden="true"><span class="admin-rail-brand-core"></span></span><span class="admin-rail-brand-wordmark">ADMIN</span></a>
                <nav class="admin-rail-nav">
                    <a class="admin-rail-link" href="../dashboard/" aria-label="Open home dashboard"><span class="admin-rail-icon admin-rail-icon-home" aria-hidden="true"><span></span></span><span class="admin-rail-link-text">Home</span></a>
                    <a class="admin-rail-link" href="../dashboard/" data-dashboard-view-link="website" aria-label="Open website dashboard"><span class="admin-rail-icon admin-rail-icon-rocket" aria-hidden="true"><span></span></span><span class="admin-rail-link-text">Website</span></a>
                    <a class="admin-rail-link" href="../affiliate-program/" aria-label="Open affiliate program dashboard"><span class="admin-rail-icon admin-rail-icon-affiliate" aria-hidden="true"><span></span></span><span class="admin-rail-link-text">Affiliate</span></a>
                    <a class="admin-rail-link is-active" aria-current="page" href="../partner-program/" aria-label="Open partner program dashboard"><span class="admin-rail-icon admin-rail-icon-partner" aria-hidden="true"><span></span></span><span class="admin-rail-link-text">Partner</span></a>
                    <a class="admin-rail-link" href="../sku-db/" aria-label="Open SKU database"><span class="admin-rail-icon admin-rail-icon-sku" aria-hidden="true"><span>SKU</span></span><span class="admin-rail-link-text">SKU DB</span></a>
                </nav>
                <div class="admin-rail-footer">
                    <a class="admin-rail-link" href="../dashboard/" data-dashboard-view-link="settings" aria-label="Open admin settings"><span class="admin-rail-icon admin-rail-icon-settings" aria-hidden="true"><span></span></span><span class="admin-rail-link-text">Settings</span></a>
                </div>
            </aside>

            <div class="admin-shell-main">
                <header class="admin-topbar">
                    <div class="admin-topbar-brand">
                        <span class="admin-chip">Partner Program</span>
                        <h1>Jenang Gemi Partner Program</h1>
                        <p>Manage partner profiles, pricing agreements, company access, and the live registry used by `partner.jenanggemi.com`.</p>
                    </div>
                    <div class="admin-topbar-actions">
                        <div class="admin-view-indicator">Partner Program</div>
                        <div class="admin-menu-shell" data-menu-shell>
                            <button type="button" class="admin-ghost-btn admin-menu-trigger" data-menu-trigger aria-expanded="false" aria-label="Open dashboard menu">...</button>
                            <div class="admin-menu-panel" data-menu-panel hidden>
                                <a class="admin-menu-item admin-link-btn" href="../dashboard/" data-dashboard-view-link="home">Home Dashboard</a>
                                <a class="admin-menu-item admin-link-btn" href="../dashboard/" data-dashboard-view-link="website">Official Website Dashboard</a>
                                <a class="admin-menu-item admin-link-btn" href="../partner-program/">Partner Program Dashboard</a>
                                <a class="admin-menu-item admin-link-btn" href="../partner-profiles/">Partner Profiles</a>
                                <button type="button" class="admin-menu-item" data-theme-toggle>Toggle Theme</button>
                                <a class="admin-menu-item admin-link-btn" href="../logout/">Lock Dashboard</a>
                            </div>
                        </div>
                    </div>
                </header>

                <main class="admin-layout">
            <section class="admin-hero-panel">
                <div class="admin-hero-copy">
                    <span class="admin-chip admin-chip-accent">Dropshipper Control Layer</span>
                    <h2>Keep partner management inside the executive dashboard while the partner-facing dashboard runs on its own subdomain.</h2>
                    <p>Profiles created here are exposed to the partner portal through the live partner registry API. This is the admin side of the program.</p>
                </div>
                <div class="admin-hero-actions">
                    <div class="admin-status-pill">
                        <span class="admin-status-dot"></span>
                        <span>Registry Enabled</span>
                    </div>
                    <a class="admin-primary-btn admin-link-btn" href="../partner-profiles/">Open Partner Profiles</a>
                </div>
            </section>

            <section class="admin-metric-grid">
                <article class="admin-metric-card"><span>Profiles</span><strong>Live</strong><small>Create and edit partner records</small></article>
                <article class="admin-metric-card"><span>Companies</span><strong>Live</strong><small>Jenang Gemi, ZERO, ZFIT assignment</small></article>
                <article class="admin-metric-card"><span>Pricing</span><strong>Live</strong><small>Per-partner agreement fields</small></article>
                <article class="admin-metric-card"><span>Partner Portal Feed</span><strong>Live</strong><small>Public partner registry endpoint is available</small></article>
            </section>

            <section class="admin-main-grid">
                <article class="admin-panel">
                    <div class="admin-panel-head">
                        <div>
                            <span class="admin-panel-kicker">Profiles</span>
                            <h3>Partner management</h3>
                        </div>
                    </div>
                    <div class="admin-bottom-actions">
                        <a class="admin-primary-btn admin-link-btn" href="../partner-profiles/">Open Profiles</a>
                    </div>
                </article>

                <article class="admin-panel">
                    <div class="admin-panel-head">
                        <div>
                            <span class="admin-panel-kicker">Portal</span>
                            <h3>Partner-facing environment</h3>
                        </div>
                    </div>
                    <p class="admin-table-note">The partner portal should use these profiles to allow login and restrict brands/products shown to each partner.</p>
                    <div class="admin-bottom-actions">
                        <a class="admin-ghost-btn admin-link-btn" href="https://partner.jenanggemi.com" target="_blank" rel="noopener">Open Partner Portal</a>
                    </div>
                </article>
            </section>
                </main>
            </div>
        </div>
    </div>

    <script type="module" src="../partner-admin.js?v=<?php echo urlencode($adminJsVersion ?: '1'); ?>"></script>
</body>
</html>
