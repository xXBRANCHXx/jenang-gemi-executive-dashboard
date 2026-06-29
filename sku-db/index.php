<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/sku-auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';

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
<html lang="id" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
    <title>Jenang Gemi SKU Database</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/svg+xml" href="/assets/admin-icons/executive-dashboard.svg">
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
        <section class="admin-login-card admin-sku-login-card">
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
            <?php render_admin_sidebar('sku'); ?>

            <div class="admin-shell-main admin-sku-shell-main">
                <h1 class="admin-sr-only">Jenang Gemi SKU Database</h1>

                <div class="admin-sku-commandbar" aria-label="SKU database controls">
                    <div class="admin-sku-commandmark">
                        <span class="admin-sku-commandglyph" aria-hidden="true"></span>
                        <span class="admin-sku-mode"><?php echo $isBranch ? 'Branch' : 'Request'; ?></span>
                    </div>
                    <div class="admin-sku-commandmetrics" aria-label="SKU database status">
                        <span><strong data-sku-brand-count>0</strong><small>Brands</small></span>
                        <span><strong data-sku-unit-count>0</strong><small>Units</small></span>
                        <span><strong data-sku-count>0</strong><small>Live</small></span>
                        <span><strong data-sku-version>1.00.00</strong><small>Version</small></span>
                    </div>
                    <div class="admin-sku-command-actions">
                        <span class="admin-status-pill">
                            <span class="admin-status-dot"></span>
                            <span><?php echo htmlspecialchars(jg_sku_session_username(), ENT_QUOTES); ?></span>
                        </span>
                        <a class="admin-ghost-btn admin-link-btn" href="../dashboard/?view=overview">Home</a>
                        <div class="admin-menu-shell" data-menu-shell>
                            <button type="button" class="admin-ghost-btn admin-menu-trigger" data-menu-trigger aria-expanded="false" aria-label="Open dashboard menu">...</button>
                            <div class="admin-menu-panel" data-menu-panel hidden>
                                <a class="admin-menu-item admin-link-btn" href="../dashboard/?view=overview" data-dashboard-view-link="overview">Executive Sales Overview</a>
                                <a class="admin-menu-item admin-link-btn" href="../dashboard/?view=campaigns" data-dashboard-view-link="home">Campaigns Dashboard</a>
                                <a class="admin-menu-item admin-link-btn" href="../back-dash/">API Ingest Workspace</a>
                                <button type="button" class="admin-menu-item" data-theme-toggle>Toggle Theme</button>
                                <a class="admin-menu-item admin-link-btn" href="./logout/">Lock SKU Database</a>
                            </div>
                        </div>
                    </div>
                </div>

                <main class="admin-layout admin-sku-layout">
                    <?php if ($isBranch): ?>
                        <section class="admin-sku-workbench" aria-label="SKU creation workspace">
                            <article class="admin-sku-composer">
                                <div class="admin-sku-preview-surface">
                                    <span class="admin-control-label">12-digit SKU</span>
                                    <strong data-sku-preview>------------</strong>
                                    <div class="admin-sku-segment-strip" data-sku-segment-strip aria-label="SKU code segments">
                                        <span><b>BR</b><em>--</em></span>
                                        <span><b>UN</b><em>--</em></span>
                                        <span><b>VOL</b><em>----</em></span>
                                        <span><b>FL</b><em>--</em></span>
                                        <span><b>PR</b><em>--</em></span>
                                    </div>
                                </div>

                                <form class="admin-sku-builder admin-sku-builder-compact" data-setup-form>
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
                                        <input type="text" name="volume" inputmode="decimal" placeholder="15 or 15.2" required>
                                    </label>
                                    <label>
                                        <span>ASTRA</span>
                                        <input type="number" name="astra" min="0.01" step="0.01" placeholder="15" required>
                                    </label>
                                    <label>
                                        <span>Flavor</span>
                                        <select class="admin-select" name="flavor_id" data-flavor-select required></select>
                                    </label>
                                    <label>
                                        <span>Product</span>
                                        <select class="admin-select" name="product_id" data-product-select required></select>
                                    </label>
                                    <label class="admin-sku-builder-tag">
                                        <span>TAG</span>
                                        <input type="text" name="tag" maxlength="50" placeholder="BAGGOSMEDIA_BUBUR_ORIGINAL" required>
                                    </label>
                                    <div class="admin-sku-actions admin-sku-builder-actions">
                                        <button type="button" class="admin-primary-btn" data-continue-apply>Apply</button>
                                    </div>
                                </form>
                                <p class="admin-form-error" data-setup-error hidden></p>
                            </article>

                            <aside class="admin-sku-side-stack" aria-label="SKU operations">
                                <article class="admin-sku-dock admin-sku-request-dock">
                                    <div class="admin-sku-dock-head">
                                        <span class="admin-sku-dock-mark">01</span>
                                        <strong>Approvals</strong>
                                    </div>
                                    <div class="admin-request-stack" data-request-list>
                                        <p class="admin-empty">No requests yet.</p>
                                    </div>
                                    <p class="admin-form-error" data-request-error hidden></p>
                                </article>

                                <article class="admin-sku-dock">
                                    <div class="admin-sku-dock-head">
                                        <span class="admin-sku-dock-mark">02</span>
                                        <strong>Mappings</strong>
                                    </div>
                                    <div class="admin-sku-form-grid admin-sku-master-create-grid">
                                        <form class="admin-sku-mini-form" data-add-brand-form>
                                            <label>
                                                <span>New brand</span>
                                                <input type="text" name="name" maxlength="120" placeholder="Jenang Gemi" required>
                                            </label>
                                            <button type="submit" class="admin-primary-btn">Add</button>
                                        </form>
                                        <form class="admin-sku-mini-form" data-add-unit-form>
                                            <label>
                                                <span>New unit</span>
                                                <input type="text" name="name" maxlength="120" placeholder="sachet or ml" required>
                                            </label>
                                            <button type="submit" class="admin-primary-btn">Add</button>
                                        </form>
                                        <form class="admin-sku-mini-form" data-add-flavor-form>
                                            <label>
                                                <span>Brand</span>
                                                <select class="admin-select" name="brand_id" data-brand-select required></select>
                                            </label>
                                            <label>
                                                <span>Flavor</span>
                                                <input type="text" name="name" maxlength="120" placeholder="Pandan" required>
                                            </label>
                                            <button type="submit" class="admin-primary-btn">Add</button>
                                        </form>
                                        <form class="admin-sku-mini-form" data-add-product-form>
                                            <label>
                                                <span>Brand</span>
                                                <select class="admin-select" name="brand_id" data-brand-select required></select>
                                            </label>
                                            <label>
                                                <span>Product</span>
                                                <input type="text" name="name" maxlength="120" placeholder="Bubur" required>
                                            </label>
                                            <button type="submit" class="admin-primary-btn">Add</button>
                                        </form>
                                    </div>
                                    <p class="admin-form-error" data-master-form-error hidden></p>
                                </article>
                            </aside>
                        </section>

                        <section class="admin-sku-apply-band" data-apply-panel hidden aria-label="Push SKU to live database">
                            <div class="admin-sku-apply-preview">
                                <span class="admin-control-label">Ready</span>
                                <strong data-apply-preview>Finish setup first</strong>
                            </div>
                            <form class="admin-sku-form-grid" data-apply-form>
                                <label>
                                    <span>Stock</span>
                                    <input type="number" name="starting_stock" min="0" step="1" placeholder="100" required>
                                </label>
                                <label>
                                    <span>Trigger</span>
                                    <input type="number" name="stock_trigger" min="0" step="1" placeholder="20" required>
                                </label>
                                <label>
                                    <span>COGS</span>
                                    <input type="number" name="cogs" min="0" step="0.01" placeholder="0">
                                </label>
                                <label>
                                    <span>Sale</span>
                                    <input type="number" name="sale_price" min="0" step="0.01" placeholder="0">
                                </label>
                                <label>
                                    <span>PO</span>
                                    <input type="text" name="po_number" maxlength="80" placeholder="P01411">
                                </label>
                                <div class="admin-sku-actions">
                                    <button type="submit" class="admin-primary-btn">Push Live</button>
                                    <button type="button" class="admin-ghost-btn" data-back-setup>Back</button>
                                </div>
                            </form>
                            <p class="admin-form-error" data-apply-error hidden></p>
                        </section>

                    <?php else: ?>
                        <section class="admin-sku-workbench admin-sku-workbench-request" aria-label="SKU request workspace">
                            <article class="admin-sku-composer">
                                <div class="admin-sku-preview-surface">
                                    <span class="admin-control-label">Proposed SKU</span>
                                    <strong data-sku-preview>------------</strong>
                                    <div class="admin-sku-segment-strip" data-sku-segment-strip aria-label="SKU code segments">
                                        <span><b>BR</b><em>--</em></span>
                                        <span><b>UN</b><em>--</em></span>
                                        <span><b>VOL</b><em>----</em></span>
                                        <span><b>FL</b><em>--</em></span>
                                        <span><b>PR</b><em>--</em></span>
                                    </div>
                                </div>

                                <form class="admin-sku-builder admin-sku-builder-compact" data-request-form>
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
                                        <input type="text" name="volume" inputmode="decimal" placeholder="15 or 15.2" required>
                                    </label>
                                    <label>
                                        <span>ASTRA</span>
                                        <input type="number" name="astra" min="0.01" step="0.01" placeholder="15" required>
                                    </label>
                                    <label>
                                        <span>Flavor</span>
                                        <select class="admin-select" name="flavor_id" data-flavor-select required></select>
                                    </label>
                                    <label>
                                        <span>Product</span>
                                        <select class="admin-select" name="product_id" data-product-select required></select>
                                    </label>
                                    <div class="admin-sku-actions admin-sku-builder-actions">
                                        <button type="submit" class="admin-primary-btn">Submit</button>
                                    </div>
                                </form>
                                <p class="admin-form-error" data-request-submit-error hidden></p>
                            </article>

                            <aside class="admin-sku-side-stack" aria-label="Request status">
                                <article class="admin-sku-dock admin-sku-request-dock">
                                    <div class="admin-sku-dock-head">
                                        <span class="admin-sku-dock-mark">01</span>
                                        <strong>Requests</strong>
                                    </div>
                                    <div class="admin-request-stack" data-request-list>
                                        <p class="admin-empty">You have not submitted any requests yet.</p>
                                    </div>
                                </article>
                            </aside>
                        </section>
                    <?php endif; ?>

                    <section class="admin-sku-table-shell" aria-label="Approved live SKU database">
                        <div class="admin-sku-table-toolbar">
                            <div class="admin-sku-live-gauge">
                                <strong data-sku-visible-count>0</strong>
                                <span>Shown</span>
                            </div>
                            <div class="admin-sku-filter-strip">
                                <label>
                                    <span>Search</span>
                                    <input type="text" data-sku-search placeholder="SKU, TAG, brand, product">
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
                            <button type="button" class="admin-ghost-btn admin-download-pdf-btn" data-download-approved-live-pdf disabled>PDF</button>
                        </div>

                        <div class="admin-table-wrap admin-sku-table-wrap">
                            <table class="admin-table admin-sku-data-table">
                                <thead>
                                <tr>
                                    <th>SKU</th>
                                    <th>TAG</th>
                                    <th>Brand</th>
                                    <th>Product</th>
                                    <th>Flavor</th>
                                    <th>Unit</th>
                                    <th>Vol</th>
                                    <th>ASTRA</th>
                                    <th>Skip</th>
                                    <th>Stock</th>
                                    <th>Trigger</th>
                                    <th>COGS</th>
                                    <th>Sale</th>
                                    <th></th>
                                </tr>
                                </thead>
                                <tbody data-sku-table-body>
                                <tr><td colspan="14" class="admin-empty">No SKUs yet.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <?php if ($isBranch): ?>
                        <section class="admin-sku-reference-band" aria-label="Current SKU mappings">
                            <div class="admin-sku-master-grid">
                                <section class="admin-sku-master-card">
                                    <h2>Brands</h2>
                                    <div data-brand-list class="admin-sku-token-list"></div>
                                </section>
                                <section class="admin-sku-master-card">
                                    <h2>Units</h2>
                                    <div data-unit-list class="admin-sku-token-list"></div>
                                </section>
                                <section class="admin-sku-master-card admin-sku-master-card-wide">
                                    <h2>Flavors</h2>
                                    <div data-flavor-list class="admin-sku-master-stack"></div>
                                </section>
                                <section class="admin-sku-master-card admin-sku-master-card-wide">
                                    <h2>Products</h2>
                                    <div data-product-list class="admin-sku-master-stack"></div>
                                </section>
                            </div>
                        </section>
                    <?php endif; ?>
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

    <div class="admin-modal-shell" data-sale-price-modal hidden>
        <div class="admin-modal-backdrop" data-close-sale-price-modal></div>
        <div class="admin-modal-card">
            <div class="admin-panel-head admin-modal-head">
                <div>
                    <span class="admin-panel-kicker">Sale Price</span>
                    <h3>Change SKU sale price</h3>
                </div>
            </div>
            <form class="admin-sku-form-grid" data-sale-price-form>
                <input type="hidden" name="sku">
                <label>
                    <span>SKU</span>
                    <input type="text" name="sku_display" readonly>
                </label>
                <label>
                    <span>Sale Price</span>
                    <input type="number" name="sale_price" min="0" step="0.01" required>
                </label>
                <div class="admin-sku-actions">
                    <button type="submit" class="admin-primary-btn">Save Sale Price</button>
                    <button type="button" class="admin-ghost-btn" data-close-sale-price-modal>Cancel</button>
                </div>
            </form>
            <p class="admin-form-error" data-sale-price-error hidden></p>
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
                    <span>Brand</span>
                    <input type="text" name="brand_display" readonly>
                </label>
                <label>
                    <span>Flavor</span>
                    <input type="text" name="flavor_display" readonly>
                </label>
                <label>
                    <span>Product</span>
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

    <?php if ($isBranch): ?>
        <div class="admin-modal-shell" data-astra-modal hidden>
            <div class="admin-modal-backdrop" data-close-astra-modal></div>
            <div class="admin-modal-card">
                <div class="admin-panel-head admin-modal-head">
                    <div>
                        <span class="admin-panel-kicker">ASTRA Update</span>
                        <h3>Change base stock unit</h3>
                    </div>
                </div>
                <form class="admin-sku-form-grid" data-astra-form>
                    <input type="hidden" name="sku">
                    <label>
                        <span>SKU</span>
                        <input type="text" name="sku_display" readonly>
                    </label>
                    <label>
                        <span>Volume</span>
                        <input type="text" name="volume_display" readonly>
                    </label>
                    <label class="admin-sku-full-span">
                        <span>ASTRA</span>
                        <input type="number" name="astra" min="0.01" step="0.01" required>
                    </label>
                    <div class="admin-sku-actions">
                        <button type="submit" class="admin-primary-btn">Save ASTRA</button>
                        <button type="button" class="admin-ghost-btn" data-close-astra-modal>Cancel</button>
                    </div>
                </form>
                <p class="admin-form-error" data-astra-error hidden></p>
            </div>
        </div>
    <?php endif; ?>

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
        <div class="admin-modal-shell" data-delete-modal hidden>
            <div class="admin-modal-backdrop" data-close-delete-modal></div>
            <div class="admin-modal-card admin-delete-modal-card">
                <div class="admin-panel-head admin-modal-head">
                    <div>
                        <span class="admin-panel-kicker">Password Required</span>
                        <h3>Confirm removal</h3>
                    </div>
                </div>
                <form class="admin-sku-form-grid admin-delete-form-grid" data-delete-form>
                    <div class="admin-sku-preview admin-sku-preview-wide">
                        <span class="admin-control-label">Removal target</span>
                        <strong data-delete-summary>Waiting for selection</strong>
                        <small>Enter the Branch password to remove this record from the SKU database.</small>
                    </div>
                    <label class="admin-sku-full-span">
                        <span>Branch password</span>
                        <input type="password" name="password" maxlength="255" placeholder="Enter password" autocomplete="current-password" required>
                    </label>
                    <div class="admin-sku-actions">
                        <button type="submit" class="admin-primary-btn admin-danger-btn">Remove</button>
                        <button type="button" class="admin-ghost-btn" data-close-delete-modal>Cancel</button>
                    </div>
                </form>
                <p class="admin-form-error" data-delete-error hidden></p>
            </div>
        </div>

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
                        <span>ASTRA</span>
                        <input type="number" name="astra" min="0.01" step="0.01" required>
                    </label>
                    <label>
                        <span>Opening COGS (Optional)</span>
                        <input type="number" name="cogs" min="0" step="0.01" placeholder="Add later from invoice import">
                    </label>
                    <label>
                        <span>Sale Price (Optional)</span>
                        <input type="number" name="sale_price" min="0" step="0.01" placeholder="Add later">
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
