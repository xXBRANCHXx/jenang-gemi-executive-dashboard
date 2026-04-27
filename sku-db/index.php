<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/sku-auth.php';

$hasError = false;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $submittedUsername = (string) ($_POST['username'] ?? '');
    $submittedPassword = (string) ($_POST['password'] ?? '');
    if (jg_sku_attempt_login($submittedUsername, $submittedPassword)) {
        header('Location: ./');
        exit;
    }
    $hasError = true;
}

$isAuthenticated = jg_sku_is_authenticated();
$isBranch = jg_sku_is_branch();
$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$skuJsVersion = (string) @filemtime(dirname(__DIR__) . '/sku-db.js');
$pageBuildVersion = 'sku1.00.00';
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>Jenang Gemi SKU Database</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/png" href="https://jenanggemi.com/Media/Jenang%20Gemi%20Website%20Logo.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
</head>
<body class="admin-body<?php echo $isAuthenticated ? ' is-dashboard' : ' is-login'; ?>">
<div class="admin-build-badge" aria-label="Dashboard build version">
    Build <?php echo htmlspecialchars($pageBuildVersion, ENT_QUOTES); ?>
</div>
<?php if (!$isAuthenticated): ?>
    <main class="admin-login-shell">
        <div class="admin-login-orb admin-login-orb-a"></div>
        <div class="admin-login-orb admin-login-orb-b"></div>
        <section class="admin-login-card">
            <div class="admin-login-brand">
                <span class="admin-chip">SKU Access</span>
                <h1>Jenang Gemi SKU Database</h1>
                <p>Branch receives full SKU administration and approvals. Any other username that signs in with the executive admin code receives the restricted SKU request sheet.</p>
            </div>
            <form method="post" class="admin-login-form" autocomplete="off">
                <label for="sku_username">Username</label>
                <input id="sku_username" name="username" type="text" maxlength="160" placeholder="Branch Vincent" required autofocus>
                <label for="sku_password">Password</label>
                <input id="sku_password" name="password" type="password" maxlength="255" placeholder="Enter password" required>
                <?php if ($hasError): ?>
                    <p class="admin-login-error">Username or password is not valid for SKU access.</p>
                <?php endif; ?>
                <button type="submit" class="admin-primary-btn">Access SKU Database</button>
            </form>
        </section>
    </main>
<?php else: ?>
    <div
        class="admin-app admin-app-suite"
        data-sku-db
        data-sku-role="<?php echo $isBranch ? 'branch' : 'requester'; ?>"
        data-sku-username="<?php echo htmlspecialchars(jg_sku_session_username(), ENT_QUOTES); ?>"
        data-sku-db-endpoint="../api/sku-db/"
    >
        <div class="admin-backdrop admin-backdrop-a"></div>
        <div class="admin-backdrop admin-backdrop-b"></div>
        <div class="admin-shell">
            <aside class="admin-rail" aria-label="Admin navigation">
                <a class="admin-rail-brand" href="../dashboard/" aria-label="Executive Dashboard home"><span class="admin-rail-brand-mark" aria-hidden="true"><span class="admin-rail-brand-core"></span></span><span class="admin-rail-brand-wordmark">ADMIN</span></a>
                <nav class="admin-rail-nav">
                    <a class="admin-rail-link" href="../dashboard/" aria-label="Open home dashboard"><span class="admin-rail-icon admin-rail-icon-home" aria-hidden="true"><span></span></span><span class="admin-rail-link-text">Home</span></a>
                    <a class="admin-rail-link" href="../dashboard/" data-dashboard-view-link="website" aria-label="Open website dashboard"><span class="admin-rail-icon admin-rail-icon-rocket" aria-hidden="true"><span></span></span><span class="admin-rail-link-text">Website</span></a>
                    <a class="admin-rail-link" href="../affiliate-program/" aria-label="Open affiliate program dashboard"><span class="admin-rail-icon admin-rail-icon-affiliate" aria-hidden="true"><span></span></span><span class="admin-rail-link-text">Affiliate</span></a>
                    <a class="admin-rail-link" href="../partner-program/" aria-label="Open partner program dashboard"><span class="admin-rail-icon admin-rail-icon-partner" aria-hidden="true"><span></span></span><span class="admin-rail-link-text">Partner</span></a>
                    <a class="admin-rail-link is-active" aria-current="page" href="../sku-db/" aria-label="Open SKU database"><span class="admin-rail-icon admin-rail-icon-sku" aria-hidden="true"><span>SKU</span></span><span class="admin-rail-link-text">SKU DB</span></a>
                </nav>
                <div class="admin-rail-footer">
                    <a class="admin-rail-link" href="../dashboard/" data-dashboard-view-link="settings" aria-label="Open admin settings"><span class="admin-rail-icon admin-rail-icon-settings" aria-hidden="true"><span></span></span><span class="admin-rail-link-text">Settings</span></a>
                </div>
            </aside>

            <div class="admin-shell-main">
                <header class="admin-topbar">
                    <div class="admin-topbar-brand">
                        <span class="admin-chip"><?php echo $isBranch ? 'Branch Access' : 'Restricted Request Mode'; ?></span>
                        <h1>Jenang Gemi SKU Database</h1>
                        <p><?php echo $isBranch
                            ? 'Directly manage brands, units, flavors, products, live SKUs, and incoming approval requests from one executive dashboard module.'
                            : 'Select only from approved master lists, generate a proposed SKU, and submit it to Branch for approval.'; ?></p>
                    </div>
                    <div class="admin-topbar-actions">
                        <div class="admin-view-indicator"><?php echo $isBranch ? 'Branch Admin Sheet' : 'Approval Request Sheet'; ?></div>
                        <div class="admin-menu-shell" data-menu-shell>
                            <button type="button" class="admin-ghost-btn admin-menu-trigger" data-menu-trigger aria-expanded="false" aria-label="Open dashboard menu">...</button>
                            <div class="admin-menu-panel" data-menu-panel hidden>
                                <a class="admin-menu-item admin-link-btn" href="../dashboard/">Executive Dashboard</a>
                                <button type="button" class="admin-menu-item" data-theme-toggle>Toggle Theme</button>
                                <a class="admin-menu-item admin-link-btn" href="./logout/">Lock SKU Database</a>
                            </div>
                        </div>
                    </div>
                </header>

                <main class="admin-layout">
            <section class="admin-hero-panel">
                <div class="admin-hero-copy">
                    <span class="admin-chip admin-chip-accent">SKU System</span>
                    <h2>The SKU database remains the source of truth for 12-digit SKU mapping, COGS history, and brand-specific flavor/product codes.</h2>
                    <p>Brand and unit codes are global. Flavor and product codes are brand-specific. Pending requests never become live SKUs until Branch approves them.</p>
                </div>
                <div class="admin-hero-actions">
                    <div class="admin-status-pill">
                        <span class="admin-status-dot"></span>
                        <span><?php echo htmlspecialchars(jg_sku_session_username(), ENT_QUOTES); ?> signed in</span>
                    </div>
                    <a class="admin-ghost-btn admin-link-btn" href="../dashboard/">Back To Executive Dashboard</a>
                </div>
            </section>

            <section class="admin-metric-grid">
                <article class="admin-metric-card"><span>Brands</span><strong data-sku-brand-count>0</strong><small>Master brand records</small></article>
                <article class="admin-metric-card"><span>Units</span><strong data-sku-unit-count>0</strong><small>Shared unit records</small></article>
                <article class="admin-metric-card"><span>SKUs</span><strong data-sku-count>0</strong><small>Approved live SKUs</small></article>
                <article class="admin-metric-card"><span>Version</span><strong data-sku-version>1.00.00</strong><small>SKU database revision</small></article>
            </section>

            <section class="admin-main-grid admin-main-grid-sku">
                <?php if ($isBranch): ?>
                    <article class="admin-panel admin-panel-wide">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Notifications</span>
                                <h3>Incoming SKU approval requests</h3>
                            </div>
                            <span class="admin-panel-meta">Approve to create a live SKU or deny to reject the request</span>
                        </div>
                        <div class="admin-request-stack" data-request-list>
                            <p class="admin-empty">No requests yet.</p>
                        </div>
                        <p class="admin-form-error" data-request-error hidden></p>
                    </article>

                    <article class="admin-panel">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Master Lists</span>
                                <h3>Create missing mappings</h3>
                            </div>
                            <span class="admin-panel-meta">Only Branch can extend the source-of-truth lists</span>
                        </div>
                        <div class="admin-sku-form-grid">
                            <form class="admin-sku-mini-form" data-add-brand-form>
                                <label>
                                    <span>New brand</span>
                                    <input type="text" name="name" maxlength="120" placeholder="e.g. Jenang Gemi" required>
                                </label>
                                <button type="submit" class="admin-primary-btn">Add Brand</button>
                            </form>
                            <form class="admin-sku-mini-form" data-add-unit-form>
                                <label>
                                    <span>New unit</span>
                                    <input type="text" name="name" maxlength="120" placeholder="e.g. sachet or ml" required>
                                </label>
                                <button type="submit" class="admin-primary-btn">Add Unit</button>
                            </form>
                            <form class="admin-sku-mini-form" data-add-flavor-form>
                                <label>
                                    <span>Brand for flavor</span>
                                    <select class="admin-select" name="brand_id" data-brand-select required></select>
                                </label>
                                <label>
                                    <span>New flavor</span>
                                    <input type="text" name="name" maxlength="120" placeholder="e.g. Pandan" required>
                                </label>
                                <button type="submit" class="admin-primary-btn">Add Flavor</button>
                            </form>
                            <form class="admin-sku-mini-form" data-add-product-form>
                                <label>
                                    <span>Brand for product</span>
                                    <select class="admin-select" name="brand_id" data-brand-select required></select>
                                </label>
                                <label>
                                    <span>New product</span>
                                    <input type="text" name="name" maxlength="120" placeholder="e.g. Bubur" required>
                                </label>
                                <button type="submit" class="admin-primary-btn">Add Product</button>
                            </form>
                        </div>
                        <p class="admin-form-error" data-master-form-error hidden></p>
                    </article>

                    <article class="admin-panel admin-panel-wide">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Step 1</span>
                                <h3>Setup</h3>
                            </div>
                            <span class="admin-panel-meta">Generate the 12-digit SKU and choose the TAG</span>
                        </div>
                        <form class="admin-sku-builder" data-setup-form>
                            <label>
                                <span>Brand</span>
                                <select class="admin-select" name="brand_id" data-sku-brand-select required></select>
                            </label>
                            <label>
                                <span>Unit</span>
                                <select class="admin-select" name="unit_id" data-unit-select required></select>
                            </label>
                            <label>
                                <span>Volume</span>
                                <input type="text" name="volume" inputmode="decimal" placeholder="e.g. 15 or 15.2" required>
                            </label>
                            <label>
                                <span>Flavor</span>
                                <select class="admin-select" name="flavor_id" data-flavor-select required></select>
                            </label>
                            <label>
                                <span>Product</span>
                                <select class="admin-select" name="product_id" data-product-select required></select>
                            </label>
                            <label>
                                <span>TAG</span>
                                <input type="text" name="tag" maxlength="50" placeholder="e.g. BAGGOSMEDIA_BUBUR_ORIGINAL" required>
                            </label>
                            <div class="admin-sku-preview">
                                <span class="admin-control-label">SKU Preview</span>
                                <strong data-sku-preview>Waiting for complete selection</strong>
                                <small>Brand 2 digits + Unit 2 digits + Volume 4 digits + Flavor 2 digits + Product 2 digits</small>
                            </div>
                            <div class="admin-sku-actions">
                                <button type="button" class="admin-primary-btn" data-continue-apply>Continue To Apply</button>
                            </div>
                        </form>
                        <p class="admin-form-error" data-setup-error hidden></p>
                    </article>

                    <article class="admin-panel admin-panel-wide" data-apply-panel hidden>
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Step 2</span>
                                <h3>Apply</h3>
                            </div>
                            <span class="admin-panel-meta">Push the new SKU into the live SKU database</span>
                        </div>
                        <form class="admin-sku-form-grid" data-apply-form>
                            <label>
                                <span>Starting stock</span>
                                <input type="number" name="starting_stock" min="0" step="1" placeholder="e.g. 100" required>
                            </label>
                            <label>
                                <span>Starting stock trigger</span>
                                <input type="number" name="stock_trigger" min="0" step="1" placeholder="e.g. 20" required>
                            </label>
                            <label>
                                <span>Opening COGS (Optional)</span>
                                <input type="number" name="cogs" min="0" step="0.01" placeholder="Add later from invoice import">
                            </label>
                            <label>
                                <span>Opening PO Number (Optional)</span>
                                <input type="text" name="po_number" maxlength="80" placeholder="Add later from invoice import">
                            </label>
                            <div class="admin-sku-preview">
                                <span class="admin-control-label">Ready To Push</span>
                                <strong data-apply-preview>Finish step 1 first</strong>
                                <small>The SKU becomes live immediately after push and is searchable in the live table below.</small>
                            </div>
                            <div class="admin-sku-actions">
                                <button type="submit" class="admin-primary-btn">Push SKU</button>
                                <button type="button" class="admin-ghost-btn" data-back-setup>Previous</button>
                            </div>
                        </form>
                        <p class="admin-form-error" data-apply-error hidden></p>
                    </article>

                    <article class="admin-panel admin-panel-wide">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Reference</span>
                                <h3>Current master lists</h3>
                            </div>
                            <span class="admin-panel-meta">Codes are assigned in list order</span>
                        </div>
                        <div class="admin-sku-master-grid">
                            <section class="admin-sku-master-card">
                                <h4>Brands</h4>
                                <div data-brand-list class="admin-sku-token-list"></div>
                            </section>
                            <section class="admin-sku-master-card">
                                <h4>Units</h4>
                                <div data-unit-list class="admin-sku-token-list"></div>
                            </section>
                            <section class="admin-sku-master-card admin-sku-master-card-wide">
                                <h4>Brand flavors</h4>
                                <div data-flavor-list class="admin-sku-master-stack"></div>
                            </section>
                            <section class="admin-sku-master-card admin-sku-master-card-wide">
                                <h4>Brand products</h4>
                                <div data-product-list class="admin-sku-master-stack"></div>
                            </section>
                        </div>
                    </article>
                <?php else: ?>
                    <article class="admin-panel admin-panel-wide">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">Request Sheet</span>
                                <h3>Build a SKU request for Branch approval</h3>
                            </div>
                            <span class="admin-panel-meta">You can only select from already-approved brands, units, flavors, and products</span>
                        </div>
                        <form class="admin-sku-builder" data-request-form>
                            <label>
                                <span>Brand</span>
                                <select class="admin-select" name="brand_id" data-sku-brand-select required></select>
                            </label>
                            <label>
                                <span>Unit</span>
                                <select class="admin-select" name="unit_id" data-unit-select required></select>
                            </label>
                            <label>
                                <span>How many of that unit are in the product?</span>
                                <input type="text" name="volume" inputmode="decimal" placeholder="e.g. 15 or 15.2" required>
                            </label>
                            <label>
                                <span>Flavor</span>
                                <select class="admin-select" name="flavor_id" data-flavor-select required></select>
                            </label>
                            <label>
                                <span>Product</span>
                                <select class="admin-select" name="product_id" data-product-select required></select>
                            </label>
                            <div class="admin-sku-preview">
                                <span class="admin-control-label">Proposed SKU Preview</span>
                                <strong data-sku-preview>Waiting for complete selection</strong>
                                <small>This preview stays out of the live database until Branch approves it.</small>
                            </div>
                            <div class="admin-sku-actions">
                                <button type="submit" class="admin-primary-btn">Submit For Approval</button>
                            </div>
                        </form>
                        <p class="admin-form-error" data-request-submit-error hidden></p>
                    </article>

                    <article class="admin-panel admin-panel-wide">
                        <div class="admin-panel-head">
                            <div>
                                <span class="admin-panel-kicker">My Requests</span>
                                <h3>Status tracker</h3>
                            </div>
                            <span class="admin-panel-meta">Pending requests remain hidden from the live SKU database until Branch approves them</span>
                        </div>
                        <div class="admin-request-stack" data-request-list>
                            <p class="admin-empty">You have not submitted any requests yet.</p>
                        </div>
                    </article>
                <?php endif; ?>

                <article class="admin-panel admin-panel-wide">
                    <div class="admin-panel-head">
                        <div>
                            <span class="admin-panel-kicker">Live COGS Mapping</span>
                            <h3>Search approved SKU database</h3>
                        </div>
                        <span class="admin-panel-meta">Only approved SKUs appear here</span>
                    </div>
                    <div class="admin-sku-form-grid">
                        <label>
                            <span>Search</span>
                            <input type="text" data-sku-search placeholder="Search SKU, TAG, brand, product, flavor, or unit">
                        </label>
                        <label>
                            <span>Brand</span>
                            <select class="admin-select" data-filter-brand></select>
                        </label>
                        <label>
                            <span>Unit</span>
                            <select class="admin-select" data-filter-unit></select>
                        </label>
                        <label>
                            <span>Flavor</span>
                            <select class="admin-select" data-filter-flavor></select>
                        </label>
                        <label>
                            <span>Product</span>
                            <select class="admin-select" data-filter-product></select>
                        </label>
                    </div>
                </article>

                <article class="admin-panel admin-panel-wide">
                    <div class="admin-panel-head">
                        <div>
                            <span class="admin-panel-kicker">SKU Table</span>
                            <h3>Approved live SKUs</h3>
                        </div>
                        <span class="admin-panel-meta"><?php echo $isBranch ? 'Change records COGS updates by PO number only' : 'Pending requests never appear in this table'; ?></span>
                    </div>
                    <div class="admin-table-wrap">
                        <table class="admin-table">
                            <thead>
                            <tr>
                                <th>SKU</th>
                                <th>TAG</th>
                                <th>Brand</th>
                                <th>Product Name</th>
                                <th>Flavor</th>
                                <th>Unit</th>
                                <th>Volume</th>
                                <th>Stock</th>
                                <th>Trigger</th>
                                <th>COGS</th>
                                <th>Action</th>
                            </tr>
                            </thead>
                            <tbody data-sku-table-body>
                            <tr><td colspan="11" class="admin-empty">No SKUs yet.</td></tr>
                            </tbody>
                        </table>
                    </div>
                </article>
            </section>
                </main>
            </div>
        </div>
    </div>

    <div class="admin-modal-shell" data-cogs-modal hidden>
        <div class="admin-modal-backdrop" data-close-cogs-modal></div>
        <div class="admin-modal-card">
            <div class="admin-panel-head admin-modal-head">
                <div>
                    <span class="admin-panel-kicker">COGS Update</span>
                    <h3>Change live COGS</h3>
                </div>
            </div>
            <form class="admin-sku-form-grid" data-cogs-form>
                <input type="hidden" name="sku">
                <label>
                    <span>SKU</span>
                    <input type="text" name="sku_display" readonly>
                </label>
                <label>
                    <span>Old price</span>
                    <input type="text" name="old_price" readonly>
                </label>
                <label>
                    <span>New price</span>
                    <input type="number" name="new_price" min="0" step="0.01" required>
                </label>
                <label>
                    <span>PO Number</span>
                    <input type="text" name="po_number" maxlength="80" placeholder="e.g. P01411" required>
                </label>
                <div class="admin-sku-actions">
                    <button type="submit" class="admin-primary-btn">Save COGS Change</button>
                    <button type="button" class="admin-ghost-btn" data-close-cogs-modal>Cancel</button>
                </div>
            </form>
            <p class="admin-form-error" data-cogs-error hidden></p>
        </div>
    </div>

    <div class="admin-modal-shell" data-product-name-modal hidden>
        <div class="admin-modal-backdrop" data-close-product-name-modal></div>
        <div class="admin-modal-card">
            <div class="admin-panel-head admin-modal-head">
                <div>
                    <span class="admin-panel-kicker">Product Name</span>
                    <h3>Change cosmetic product name</h3>
                </div>
            </div>
            <form class="admin-sku-form-grid" data-product-name-form>
                <input type="hidden" name="sku">
                <label>
                    <span>SKU</span>
                    <input type="text" name="sku_display" readonly>
                </label>
                <label>
                    <span>Base product</span>
                    <input type="text" name="base_product_name" readonly>
                </label>
                <label class="admin-sku-full-span">
                    <span>Product Name</span>
                    <input type="text" name="product_name" maxlength="160" placeholder="Type readable product name" required>
                </label>
                <div class="admin-sku-actions">
                    <button type="submit" class="admin-primary-btn">Save Product Name</button>
                    <button type="button" class="admin-ghost-btn" data-close-product-name-modal>Cancel</button>
                </div>
            </form>
            <p class="admin-form-error" data-product-name-error hidden></p>
        </div>
    </div>

    <div class="admin-modal-shell" data-inventory-modal hidden>
        <div class="admin-modal-backdrop" data-close-inventory-modal></div>
        <div class="admin-modal-card">
            <div class="admin-panel-head admin-modal-head">
                <div>
                    <span class="admin-panel-kicker">Inventory Update</span>
                    <h3>Change real inventory stock</h3>
                </div>
            </div>
            <form class="admin-sku-form-grid" data-inventory-form>
                <input type="hidden" name="sku">
                <label>
                    <span>SKU</span>
                    <input type="text" name="sku_display" readonly>
                </label>
                <label>
                    <span>Current inventory stock</span>
                    <input type="number" name="current_stock_display" min="0" step="1" readonly>
                </label>
                <label>
                    <span>Change type</span>
                    <select class="admin-select" name="inventory_action" data-inventory-action required>
                        <option value="set_total">Set total stock</option>
                        <option value="add_stock">Add stock</option>
                    </select>
                </label>
                <label class="admin-sku-full-span">
                    <span>New inventory stock</span>
                    <input type="number" name="new_stock" min="0" step="1" required>
                </label>
                <label class="admin-sku-full-span" data-inventory-add-wrap hidden>
                    <span>Quantity to add</span>
                    <input type="number" name="quantity_to_add" min="1" step="1">
                </label>
                <label class="admin-sku-full-span" data-inventory-po-wrap hidden>
                    <span>PO Number</span>
                    <input type="text" name="po_number" maxlength="80" placeholder="e.g. P01411">
                </label>
                <div class="admin-sku-actions">
                    <button type="submit" class="admin-primary-btn">Save Inventory Change</button>
                    <button type="button" class="admin-ghost-btn" data-close-inventory-modal>Cancel</button>
                </div>
            </form>
            <p class="admin-form-error" data-inventory-error hidden></p>
        </div>
    </div>

    <?php if ($isBranch): ?>
        <div class="admin-modal-shell" data-approval-modal hidden>
            <div class="admin-modal-backdrop" data-close-approval-modal></div>
            <div class="admin-modal-card">
                <div class="admin-panel-head admin-modal-head">
                    <div>
                        <span class="admin-panel-kicker">Approve Request</span>
                        <h3>Create live SKU from request</h3>
                    </div>
                </div>
                <form class="admin-sku-form-grid" data-approval-form>
                    <input type="hidden" name="request_id">
                    <div class="admin-sku-preview admin-sku-preview-wide">
                        <span class="admin-control-label">Requested combination</span>
                        <strong data-approval-summary>Waiting for request selection</strong>
                        <small data-approval-requester>Requester</small>
                    </div>
                    <label>
                        <span>TAG</span>
                        <input type="text" name="tag" maxlength="50" placeholder="e.g. BAGGOSMEDIA_BUBUR_ORIGINAL" required>
                    </label>
                    <label>
                        <span>Starting stock</span>
                        <input type="number" name="starting_stock" min="0" step="1" required>
                    </label>
                    <label>
                        <span>Starting stock trigger</span>
                        <input type="number" name="stock_trigger" min="0" step="1" required>
                    </label>
                    <label>
                        <span>Opening COGS (Optional)</span>
                        <input type="number" name="cogs" min="0" step="0.01" placeholder="Add later from invoice import">
                    </label>
                    <label>
                        <span>Opening PO Number (Optional)</span>
                        <input type="text" name="po_number" maxlength="80" placeholder="Add later from invoice import">
                    </label>
                    <label class="admin-sku-full-span">
                        <span>Decision note</span>
                        <input type="text" name="decision_notes" maxlength="500" placeholder="Optional approval note">
                    </label>
                    <div class="admin-sku-actions">
                        <button type="submit" class="admin-primary-btn">Approve Request</button>
                        <button type="button" class="admin-ghost-btn" data-close-approval-modal>Cancel</button>
                    </div>
                </form>
                <p class="admin-form-error" data-approval-error hidden></p>
            </div>
        </div>
    <?php endif; ?>

    <script src="../sku-db.js?v=<?php echo urlencode($skuJsVersion ?: '1'); ?>" defer></script>
<?php endif; ?>
</body>
</html>
