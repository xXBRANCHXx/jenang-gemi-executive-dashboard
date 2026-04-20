<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/');
    exit;
}

$affiliateCode = strtoupper(trim((string) ($_GET['code'] ?? '')));
$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$profileJsVersion = (string) @filemtime(dirname(__DIR__) . '/affiliate-profile.js');
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>Affiliate Profile | Jenang Gemi Executive Dashboard</title>
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
            <span class="admin-chip">Preparing Affiliate Profile</span>
            <h2>Loading affiliate profile</h2>
            <p>Fetching profile details, generated URLs, and edit controls before reveal.</p>
            <div class="admin-loader-bar">
                <span class="admin-loader-progress" data-admin-loader-progress></span>
            </div>
            <strong class="admin-loader-label" data-admin-loader-label>Initializing...</strong>
        </div>
    </div>

    <div class="admin-app" data-affiliate-profile data-affiliates-endpoint="../api/affiliates/" data-affiliate-code="<?php echo htmlspecialchars($affiliateCode, ENT_QUOTES); ?>">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <div class="admin-shell">
            <aside class="admin-rail" aria-label="Admin navigation">
                <a class="admin-rail-brand" href="../dashboard/" aria-label="Executive Dashboard home">
                    <span class="admin-rail-brand-mark" aria-hidden="true"><span class="admin-rail-brand-core"></span></span>
                    <span class="admin-rail-brand-wordmark">ADMIN</span>
                </a>
                <nav class="admin-rail-nav">
                    <a class="admin-rail-link" href="../dashboard/" aria-label="Open home dashboard"><span class="admin-rail-icon admin-rail-icon-home" aria-hidden="true"><span></span></span><span class="admin-rail-link-text">Home</span></a>
                    <a class="admin-rail-link" href="../dashboard/" data-dashboard-view-link="website" aria-label="Open website dashboard"><span class="admin-rail-icon admin-rail-icon-rocket" aria-hidden="true"><span></span></span><span class="admin-rail-link-text">Website</span></a>
                    <a class="admin-rail-link is-active" aria-current="page" href="../affiliate-program/" aria-label="Open affiliate program dashboard"><span class="admin-rail-icon admin-rail-icon-affiliate" aria-hidden="true"><span></span></span><span class="admin-rail-link-text">Affiliate</span></a>
                    <a class="admin-rail-link" href="../partner-program/" aria-label="Open partner program dashboard"><span class="admin-rail-icon admin-rail-icon-partner" aria-hidden="true"><span></span></span><span class="admin-rail-link-text">Partner</span></a>
                    <a class="admin-rail-link" href="../sku-db/" aria-label="Open SKU database"><span class="admin-rail-icon admin-rail-icon-sku" aria-hidden="true"><span>SKU</span></span><span class="admin-rail-link-text">SKU DB</span></a>
                </nav>
                <div class="admin-rail-footer">
                    <a class="admin-rail-link" href="../dashboard/" data-dashboard-view-link="settings" aria-label="Open admin settings"><span class="admin-rail-icon admin-rail-icon-settings" aria-hidden="true"><span></span></span><span class="admin-rail-link-text">Settings</span></a>
                </div>
            </aside>

            <div class="admin-shell-main">
                <header class="admin-topbar">
                    <div class="admin-topbar-brand">
                        <span class="admin-chip">Affiliate Profile</span>
                        <h1 data-profile-title>Affiliate Profile</h1>
                        <p>Dedicated editing surface for a single affiliate profile.</p>
                    </div>
                    <div class="admin-topbar-actions">
                        <div class="admin-view-indicator">Affiliate Profile</div>
                        <div class="admin-menu-shell" data-menu-shell>
                            <button type="button" class="admin-ghost-btn admin-menu-trigger" data-menu-trigger aria-expanded="false" aria-label="Open dashboard menu">...</button>
                            <div class="admin-menu-panel" data-menu-panel hidden>
                                <a class="admin-menu-item admin-link-btn" href="../dashboard/" data-dashboard-view-link="home">Home Dashboard</a>
                                <a class="admin-menu-item admin-link-btn" href="../dashboard/" data-dashboard-view-link="website">Official Website Dashboard</a>
                                <a class="admin-menu-item admin-link-btn" href="../affiliate-program/">Affiliate Program Dashboard</a>
                                <a class="admin-menu-item admin-link-btn" href="../affiliate-profiles/">Affiliate Profiles</a>
                                <button type="button" class="admin-menu-item" data-theme-toggle>Toggle Theme</button>
                                <a class="admin-menu-item admin-link-btn" href="../logout/">Lock Dashboard</a>
                            </div>
                        </div>
                    </div>
                </header>

                <main class="admin-layout">
            <section class="admin-hero-panel">
                <div class="admin-hero-copy">
                    <span class="admin-chip admin-chip-accent" data-profile-code>Affiliate</span>
                    <h2 data-profile-name>Loading affiliate profile</h2>
                    <p>Edit profile details here without exposing mutation controls on the analytics pages.</p>
                </div>
                <div class="admin-hero-actions">
                    <div class="admin-status-pill">
                        <span class="admin-status-dot"></span>
                        <span>Secure Session Active</span>
                    </div>
                </div>
            </section>

            <section class="admin-panel admin-panel-affiliates">
                <div class="admin-panel-head">
                    <div>
                        <span class="admin-panel-kicker">Profile Settings</span>
                        <h3>Edit affiliate profile</h3>
                    </div>
                </div>
                <form class="admin-affiliate-editor" data-profile-form>
                    <label class="admin-affiliate-field">
                        <span class="admin-control-label">Affiliate name</span>
                        <input type="text" name="name" maxlength="120" required>
                    </label>
                    <fieldset class="admin-affiliate-platforms">
                        <legend>Platforms</legend>
                        <div class="admin-affiliate-platform-grid" data-platform-grid>
                            <label><input type="checkbox" name="platforms[]" value="youtube"> <span>YouTube</span></label>
                            <label><input type="checkbox" name="platforms[]" value="facebook"> <span>Facebook</span></label>
                            <label><input type="checkbox" name="platforms[]" value="instagram"> <span>Instagram</span></label>
                            <label><input type="checkbox" name="platforms[]" value="tiktok"> <span>TikTok</span></label>
                        </div>
                    </fieldset>
                    <fieldset class="admin-affiliate-platforms">
                        <legend>Products</legend>
                        <div class="admin-affiliate-platform-grid" data-product-grid>
                            <label><input type="checkbox" name="products[]" value="bubur"> <span>Bubur</span></label>
                            <label><input type="checkbox" name="products[]" value="jamu"> <span>Jamu</span></label>
                        </div>
                    </fieldset>
                    <p class="admin-form-error" data-profile-error hidden></p>
                    <div class="admin-affiliate-actions">
                        <button type="submit" class="admin-primary-btn">Save Profile</button>
                        <button type="button" class="admin-ghost-btn" data-delete-affiliate>Delete Affiliate</button>
                    </div>
                </form>
            </section>

            <section class="admin-panel admin-panel-affiliates">
                <div class="admin-panel-head">
                    <div>
                        <span class="admin-panel-kicker">Generated URLs</span>
                        <h3>Affiliate landing pages</h3>
                    </div>
                </div>
                <div class="admin-affiliate-url-list" data-profile-urls>
                    <p class="admin-empty">Belum ada URL.</p>
                </div>
            </section>

            <div class="admin-bottom-actions">
                <a class="admin-ghost-btn admin-link-btn" href="../affiliate-profiles/">Return To Affiliate Profiles</a>
            </div>
                </main>
            </div>
        </div>
    </div>

    <script type="module" src="../affiliate-profile.js?v=<?php echo urlencode($profileJsVersion ?: '1'); ?>"></script>
</body>
</html>
