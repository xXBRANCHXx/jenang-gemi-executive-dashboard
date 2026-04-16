<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/');
    exit;
}

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$profilesJsVersion = (string) @filemtime(dirname(__DIR__) . '/partner-profiles.js');
$adminJsVersion = (string) @filemtime(dirname(__DIR__) . '/partner-admin.js');
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>Partner Profiles | Jenang Gemi Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/png" href="https://jenanggemi.com/Media/Jenang%20Gemi%20Website%20Logo.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard">
    <div class="admin-app" data-partner-profiles data-partners-endpoint="../api/partners/">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <header class="admin-topbar">
            <div class="admin-topbar-brand">
                <span class="admin-chip">Partner Profiles</span>
                <h1>Partner Profiles</h1>
                <p>Create partner records here and control which companies, products, sizes, and pricing agreements they can access inside the partner portal.</p>
            </div>
            <div class="admin-topbar-actions">
                <div class="admin-view-indicator">Partner Profiles</div>
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
                    <span class="admin-chip admin-chip-accent">Profile Directory</span>
                    <h2>Each partner gets its own profile page with company access, product access, size variations, and pricing agreement fields.</h2>
                    <p>Companies are the brands. For now, Jenang Gemi products use `15`, `30`, and `60 Sachet` variation pricing.</p>
                </div>
                <div class="admin-hero-actions">
                    <div class="admin-status-pill">
                        <span class="admin-status-dot"></span>
                        <span>Secure Session Active</span>
                    </div>
                    <button type="button" class="admin-primary-btn" data-open-partner-modal>Add Partner</button>
                </div>
            </section>

            <section class="admin-panel admin-panel-affiliates">
                <div class="admin-panel-head">
                    <div>
                        <span class="admin-panel-kicker">Profile List</span>
                        <h3>Partner profiles</h3>
                    </div>
                    <button type="button" class="admin-primary-btn" data-open-partner-modal>Add Partner</button>
                </div>
                <div class="admin-affiliate-list" data-partner-list>
                    <p class="admin-empty">No partners yet.</p>
                </div>
            </section>

            <div class="admin-bottom-actions">
                <a class="admin-ghost-btn admin-link-btn" href="../partner-program/">Return To Partner Program</a>
            </div>
        </main>
    </div>

    <div class="admin-modal-shell" data-partner-modal hidden>
        <div class="admin-modal-backdrop" data-close-partner-modal></div>
        <div class="admin-modal-card admin-modal-card-partner" role="dialog" aria-modal="true" aria-labelledby="partner-modal-title">
            <div class="admin-modal-head">
                <div>
                    <span class="admin-panel-kicker">New Partner</span>
                    <h3 id="partner-modal-title">Create partner profile</h3>
                </div>
                <button type="button" class="admin-ghost-btn" data-close-partner-modal>Close</button>
            </div>
            <form class="admin-affiliate-form" data-partner-form>
                <label>
                    <span>Partner name</span>
                    <input type="text" name="name" maxlength="160" placeholder="e.g. Rina Sulistyo" required>
                </label>
                <label>
                    <span>Partner page slug</span>
                    <input type="text" name="partner_slug" maxlength="160" placeholder="e.g. rina-sulistyo">
                </label>
                <fieldset class="admin-affiliate-platforms" data-company-section="Jenang Gemi">
                    <legend>Companies</legend>
                    <div class="admin-affiliate-platform-grid">
                        <label><input type="checkbox" name="companies[]" value="Jenang Gemi"> <span>Jenang Gemi</span></label>
                        <label><input type="checkbox" name="companies[]" value="ZERO"> <span>ZERO</span></label>
                        <label><input type="checkbox" name="companies[]" value="ZFIT"> <span>ZFIT</span></label>
                    </div>
                </fieldset>
                <fieldset class="admin-affiliate-platforms" data-company-section="Jenang Gemi">
                    <legend>Jenang Gemi product access</legend>
                    <div class="admin-note-stack">
                        <div class="admin-note-card">
                            <strong>Bubur</strong>
                            <span>Select whether this partner can sell Bubur and which sizes they can sell.</span>
                        </div>
                    </div>
                    <div class="admin-affiliate-platform-grid">
                        <label><input type="checkbox" name="product_access[Jenang Gemi][Bubur][enabled]" value="1"> <span>Enable Bubur</span></label>
                        <label><input type="checkbox" name="product_access[Jenang Gemi][Bubur][sizes][]" value="15 Sachet"> <span>15 Sachet</span></label>
                        <label><input type="checkbox" name="product_access[Jenang Gemi][Bubur][sizes][]" value="30 Sachet"> <span>30 Sachet</span></label>
                        <label><input type="checkbox" name="product_access[Jenang Gemi][Bubur][sizes][]" value="60 Sachet"> <span>60 Sachet</span></label>
                    </div>
                    <div class="admin-note-stack">
                        <div class="admin-note-card">
                            <strong>Jamu</strong>
                            <span>Select whether this partner can sell Jamu and which sizes they can sell.</span>
                        </div>
                    </div>
                    <div class="admin-affiliate-platform-grid">
                        <label><input type="checkbox" name="product_access[Jenang Gemi][Jamu][enabled]" value="1"> <span>Enable Jamu</span></label>
                        <label><input type="checkbox" name="product_access[Jenang Gemi][Jamu][sizes][]" value="15 Sachet"> <span>15 Sachet</span></label>
                        <label><input type="checkbox" name="product_access[Jenang Gemi][Jamu][sizes][]" value="30 Sachet"> <span>30 Sachet</span></label>
                        <label><input type="checkbox" name="product_access[Jenang Gemi][Jamu][sizes][]" value="60 Sachet"> <span>60 Sachet</span></label>
                    </div>
                </fieldset>
                <fieldset class="admin-affiliate-platforms" data-company-section="Jenang Gemi">
                    <legend>Jenang Gemi pricing agreement</legend>
                    <div class="admin-sku-form-grid">
                        <label><span>Bubur 15 Sachet</span><input type="number" name="pricing[Jenang Gemi][Bubur][15 Sachet]" min="0" step="0.01" placeholder="e.g. 18000"></label>
                        <label><span>Bubur 30 Sachet</span><input type="number" name="pricing[Jenang Gemi][Bubur][30 Sachet]" min="0" step="0.01" placeholder="e.g. 35000"></label>
                        <label><span>Bubur 60 Sachet</span><input type="number" name="pricing[Jenang Gemi][Bubur][60 Sachet]" min="0" step="0.01" placeholder="e.g. 68000"></label>
                        <label><span>Jamu 15 Sachet</span><input type="number" name="pricing[Jenang Gemi][Jamu][15 Sachet]" min="0" step="0.01" placeholder="e.g. 22000"></label>
                        <label><span>Jamu 30 Sachet</span><input type="number" name="pricing[Jenang Gemi][Jamu][30 Sachet]" min="0" step="0.01" placeholder="e.g. 42000"></label>
                        <label><span>Jamu 60 Sachet</span><input type="number" name="pricing[Jenang Gemi][Jamu][60 Sachet]" min="0" step="0.01" placeholder="e.g. 81000"></label>
                    </div>
                </fieldset>
                <p class="admin-table-note" data-company-empty-state hidden>Select a company above to configure product access and pricing for that company.</p>
                <label>
                    <span>Notes</span>
                    <input type="text" name="notes" maxlength="300" placeholder="Optional note">
                </label>
                <p class="admin-form-error" data-partner-form-error hidden></p>
                <div class="admin-modal-actions">
                    <button type="button" class="admin-ghost-btn" data-close-partner-modal>Cancel</button>
                    <button type="submit" class="admin-primary-btn">Create Partner</button>
                </div>
            </form>
        </div>
    </div>

    <script type="module" src="../partner-admin.js?v=<?php echo urlencode($adminJsVersion ?: '1'); ?>"></script>
    <script type="module" src="../partner-profiles.js?v=<?php echo urlencode($profilesJsVersion ?: '1'); ?>"></script>
</body>
</html>
