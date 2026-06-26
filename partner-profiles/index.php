<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/?view=overview');
    exit;
}

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$partnerAccessCssVersion = (string) @filemtime(dirname(__DIR__) . '/partner-access.css');
$profilesJsVersion = (string) @filemtime(dirname(__DIR__) . '/partner-profiles.js');
$adminJsVersion = (string) @filemtime(dirname(__DIR__) . '/partner-admin.js');
?>
<!DOCTYPE html>
<html lang="id" data-admin-theme="minimal-black">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>Partner Profiles | Jenang Gemi Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/svg+xml" href="/assets/admin-icons/executive-dashboard.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
    <link rel="stylesheet" href="../partner-access.css?v=<?php echo urlencode($partnerAccessCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard">
    <div class="admin-app admin-app-suite" data-partner-profiles data-partners-endpoint="../api/partners/">
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <div class="admin-shell">
            <?php render_admin_sidebar('partner'); ?>

            <div class="admin-shell-main">
                <header class="admin-topbar">
                    <div class="admin-topbar-brand">
                        <span class="admin-chip">Partner Profiles</span>
                        <h1>Partner Profiles</h1>
                        <p>Create partner records here and control which brands, products, and live SKUs they can access inside the partner portal.</p>
                    </div>
                    <div class="admin-topbar-actions">
                        <div class="admin-view-indicator">Partner Profiles</div>
                        <div class="admin-menu-shell" data-menu-shell>
                            <button type="button" class="admin-ghost-btn admin-menu-trigger" data-menu-trigger aria-expanded="false" aria-label="Open dashboard menu">...</button>
                            <div class="admin-menu-panel" data-menu-panel hidden>
                                <a class="admin-menu-item admin-link-btn" href="../dashboard/?view=overview" data-dashboard-view-link="overview">Executive Sales Overview</a>
                                <a class="admin-menu-item admin-link-btn" href="../dashboard/?view=campaigns" data-dashboard-view-link="home">Campaigns Dashboard</a>
                                <a class="admin-menu-item admin-link-btn" href="../dashboard/?view=website" data-dashboard-view-link="website">Official Website Dashboard</a>
                                <a class="admin-menu-item admin-link-btn" href="../back-dash/">API Ingest Workspace</a>
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
                    <h2>Build partner access from the live SKU database, one question at a time.</h2>
                    <p>Question 1 asks for brand. Question 2 narrows to products inside those brands. Question 3 lists the exact SKU names the partner can sell, and those selections can be changed later at any time.</p>
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
        </div>
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
                <label data-partner-locked-field>
                    <span>Initial portal password</span>
                    <div class="admin-inline-input">
                        <input type="text" name="portal_password" maxlength="160" placeholder="Set or generate an initial password" autocomplete="new-password" required>
                        <button type="button" class="admin-ghost-btn" data-generate-portal-password data-partner-gated-action>Generate Password</button>
                    </div>
                </label>
                <section class="partner-access-shell" data-partner-access-shell>
                    <div class="partner-access-intro">
                        <span class="partner-access-intro-kicker">Catalog-Guided Setup</span>
                        <h4>Answer two questions to build this partner.</h4>
                        <p>The choices below come directly from the SKU database. Brand and product name are selected here, while SKU codes stay linked automatically in the backend.</p>
                    </div>
                    <div class="partner-access-steps" data-partner-steps>
                        <article class="partner-access-step is-active" data-partner-step-indicator="brands">
                            <span class="partner-access-step-index">01</span>
                            <strong>Brand</strong>
                            <span>Choose the brands from the live SKU database.</span>
                        </article>
                        <article class="partner-access-step" data-partner-step-indicator="products">
                            <span class="partner-access-step-index">02</span>
                            <strong>Product</strong>
                            <span>Pick products, then refine the SKU access.</span>
                        </article>
                    </div>

                    <section class="partner-access-card" data-partner-step-panel="brands">
                        <div class="partner-access-card-head">
                            <div>
                                <span class="partner-access-question-index">Question 1 of 2</span>
                                <h4>Select brand</h4>
                                <p>Multiple choice. This list comes straight from the SKU database.</p>
                            </div>
                        </div>
                        <label class="partner-access-search">
                            <span>Search brands</span>
                            <input type="search" placeholder="Type to filter brands" data-brand-search>
                        </label>
                        <div class="partner-access-choice-grid" data-brand-choice-grid>
                            <div class="partner-access-empty">Loading brands from the SKU database.</div>
                        </div>
                        <div class="partner-access-actions">
                            <span class="partner-access-inline-note">You can choose more than one brand.</span>
                            <button type="button" class="admin-primary-btn" data-partner-next-step="products">Continue To Products</button>
                        </div>
                    </section>

                    <section class="partner-access-card" data-partner-step-panel="products" hidden>
                        <div class="partner-access-card-head">
                            <div>
                                <span class="partner-access-question-index">Question 2 of 2</span>
                                <h4>Select products and SKUs</h4>
                                <p>Products are grouped by brand from the SKU database. Toggle a product to select all its SKUs, then deselect individual SKU records if needed.</p>
                            </div>
                        </div>
                        <label class="partner-access-search">
                            <span>Search products</span>
                            <input type="search" placeholder="Type to filter products" data-product-search>
                        </label>
                        <div class="partner-access-choice-grid" data-product-choice-grid>
                            <div class="partner-access-empty">Select a brand first.</div>
                        </div>
                        <div class="partner-access-actions">
                            <button type="button" class="admin-ghost-btn" data-partner-prev-step="brands">Back</button>
                            <span class="partner-access-inline-note">Select at least one SKU to unlock Notes and Create Partner.</span>
                        </div>
                    </section>

                    <section class="partner-access-summary">
                        <div class="partner-access-summary-grid">
                            <article class="partner-access-summary-card">
                                <strong>Brands</strong>
                                <span data-partner-brand-summary>None selected</span>
                            </article>
                            <article class="partner-access-summary-card">
                                <strong>Products</strong>
                                <span data-partner-product-summary>None selected</span>
                            </article>
                            <article class="partner-access-summary-card">
                                <strong>Backend SKU Links</strong>
                                <span data-partner-sku-summary>None linked yet</span>
                            </article>
                        </div>
                        <div class="partner-access-tag-list" data-partner-selected-skus>
                            <div class="partner-access-empty">Linked backend SKU records will show here.</div>
                        </div>
                    </section>

                    <section class="partner-pricing-editor">
                        <div class="partner-access-card-head">
                            <div>
                                <span class="partner-access-question-index">Revenue pricing</span>
                                <h4>Partner unit prices</h4>
                                <p>Set the partner price per billable unit. SKU price is calculated from volume divided by the SKU ASTRA value.</p>
                            </div>
                        </div>
                        <div class="partner-pricing-list" data-partner-pricing-list>
                            <div class="partner-access-empty">Select products to create partner prices.</div>
                        </div>
                    </section>
                </section>
                <label data-partner-locked-field>
                    <span>Notes</span>
                    <input type="text" name="notes" maxlength="300" placeholder="Optional note">
                </label>
                <p class="admin-form-error" data-partner-form-error hidden></p>
                <div class="admin-modal-actions">
                    <button type="button" class="admin-ghost-btn" data-close-partner-modal data-partner-gated-action>Cancel</button>
                    <button type="submit" class="admin-primary-btn" data-partner-gated-action>Create Partner</button>
                </div>
            </form>
        </div>
    </div>

    <script type="module" src="../partner-admin.js?v=<?php echo urlencode($adminJsVersion ?: '1'); ?>"></script>
    <script type="module" src="../partner-profiles.js?v=<?php echo urlencode($profilesJsVersion ?: '1'); ?>"></script>
</body>
</html>
