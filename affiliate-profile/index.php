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
        <header class="admin-topbar">
            <div class="admin-topbar-brand">
                <span class="admin-chip">Affiliate Profile</span>
                <h1 data-profile-title>Affiliate Profile</h1>
                <p>Dedicated editing surface for a single affiliate profile.</p>
            </div>
            <div class="admin-topbar-actions">
                <a class="admin-ghost-btn admin-link-btn" href="../affiliate-profiles/">Affiliate Profiles</a>
                <a class="admin-ghost-btn admin-link-btn" href="../affiliate-program/">Affiliate Program</a>
                <button type="button" class="admin-ghost-btn" data-theme-toggle aria-label="Toggle theme">Toggle Theme</button>
                <a class="admin-primary-btn admin-link-btn" href="../logout/">Lock Dashboard</a>
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

    <script type="module" src="../affiliate-profile.js?v=<?php echo urlencode($profileJsVersion ?: '1'); ?>"></script>
</body>
</html>
