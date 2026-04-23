<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/');
    exit;
}

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$partnerAccessCssVersion = (string) @filemtime(dirname(__DIR__) . '/partner-access.css');
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
    <link rel="stylesheet" href="../partner-access.css?v=<?php echo urlencode($partnerAccessCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard">
    <div class="admin-app admin-app-suite" data-partner-profiles data-partners-endpoint="../api/partners/">
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
                        <span class="admin-chip">Partner Profiles</span>
                        <h1>Partner Profiles</h1>
                        <p>Create partner records here and control which brands, products, and live SKUs they can access inside the partner portal.</p>
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
                            <span>Pick the product names inside the chosen brands.</span>
                        </article>
                    </div>

                    <section class="partner-access-card" data-partner-step-panel="brands">
                        <div class="partner-access-card-head">
                            <div>
                                <span class="partner-access-question-index">Question 1 of 3</span>
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
                                <h4>Select product</h4>
                                <p>Multiple choice. Products are filtered by the brands you selected. Matching SKU records are linked automatically in the backend.</p>
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
                            <span class="partner-access-inline-note">Related SKU records are assigned automatically.</span>
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
                </section>
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
