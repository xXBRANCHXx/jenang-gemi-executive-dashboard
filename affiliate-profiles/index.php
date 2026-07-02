<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/?view=overview');
    exit;
}

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$profilesJsVersion = (string) @filemtime(dirname(__DIR__) . '/affiliate-profiles.js');
?>
<!DOCTYPE html>
<html lang="id" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>Affiliate Profiles | Jenang Gemi Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
<?php render_admin_favicons('affiliate-profiles'); ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard is-loading">
    <div class="admin-loader" data-admin-loader aria-live="polite">
        <div class="admin-loader-panel">
            <span class="admin-chip">Preparing Affiliate Profiles</span>
            <h2>Loading affiliate profiles</h2>
            <p>Fetching affiliate records and landing-page links before reveal.</p>
            <div class="admin-loader-bar">
                <span class="admin-loader-progress" data-admin-loader-progress></span>
            </div>
            <strong class="admin-loader-label" data-admin-loader-label>Initializing...</strong>
        </div>
    </div>

    <div class="admin-app admin-app-suite" data-affiliate-profiles data-affiliates-endpoint="../api/affiliates/" data-live-endpoint="../api/live/">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <div class="admin-shell">
            <?php render_admin_sidebar('affiliate'); ?>

            <div class="admin-shell-main">
                <header class="admin-topbar">
                    <div class="admin-topbar-brand">
                        <span class="admin-chip">Affiliate Profiles</span>
                        <h1>Jenang Gemi Affiliate Profiles</h1>
                    </div>
                    <?php render_admin_topbar_actions(); ?>
                </header>

                <main class="admin-layout">
            <section class="admin-affiliate-toolbar" aria-label="Affiliate profile shortcuts">
                <button type="button" class="admin-primary-btn" data-open-affiliate-modal>Add Affiliate</button>
                <a class="admin-ghost-btn admin-link-btn" href="../affiliate-program/">Affiliate Program</a>
            </section>

            <section class="admin-panel admin-panel-affiliates admin-affiliate-directory-panel">
                <div class="admin-affiliate-list" data-affiliate-list>
                    <p class="admin-empty">Belum ada affiliate.</p>
                </div>
            </section>
                </main>
            </div>
        </div>
    </div>

    <div class="admin-modal-shell" data-affiliate-modal hidden>
        <div class="admin-modal-backdrop" data-close-affiliate-modal></div>
        <div class="admin-modal-card" role="dialog" aria-modal="true" aria-labelledby="affiliate-modal-title">
            <div class="admin-modal-head">
                <div>
                    <span class="admin-panel-kicker">New Affiliate</span>
                    <h3 id="affiliate-modal-title">Create trackable affiliate pages</h3>
                </div>
                <button type="button" class="admin-ghost-btn" data-close-affiliate-modal>Close</button>
            </div>
            <form class="admin-affiliate-form" data-affiliate-form>
                <label>
                    <span>Affiliate name</span>
                    <input type="text" name="name" maxlength="120" placeholder="e.g. Rina Sulistyo" required>
                </label>
                <fieldset class="admin-affiliate-platforms">
                    <legend>Platforms</legend>
                    <div class="admin-affiliate-platform-grid">
                        <label><input type="checkbox" name="platforms[]" value="youtube"> <span>YouTube</span></label>
                        <label><input type="checkbox" name="platforms[]" value="facebook"> <span>Facebook</span></label>
                        <label><input type="checkbox" name="platforms[]" value="instagram"> <span>Instagram</span></label>
                        <label><input type="checkbox" name="platforms[]" value="tiktok"> <span>TikTok</span></label>
                    </div>
                </fieldset>
                <fieldset class="admin-affiliate-platforms">
                    <legend>Products</legend>
                    <div class="admin-affiliate-platform-grid">
                        <label><input type="checkbox" name="products[]" value="bubur"> <span>Bubur</span></label>
                        <label><input type="checkbox" name="products[]" value="jamu"> <span>Jamu</span></label>
                    </div>
                </fieldset>
                <p class="admin-form-error" data-affiliate-form-error hidden></p>
                <div class="admin-modal-actions">
                    <button type="button" class="admin-ghost-btn" data-close-affiliate-modal>Cancel</button>
                    <button type="submit" class="admin-primary-btn">Create Affiliate</button>
                </div>
            </form>
        </div>
    </div>

    <?php render_admin_notification_drawer(); ?>
    <?php render_admin_chrome_script(); ?>
    <script type="module" src="../affiliate-profiles.js?v=<?php echo urlencode($profilesJsVersion ?: '1'); ?>"></script>
</body>
</html>
