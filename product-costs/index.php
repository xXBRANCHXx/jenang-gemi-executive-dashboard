<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/');
    exit;
}

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$pageCssVersion = (string) @filemtime(__DIR__ . '/product-costs.css');
$pageJsVersion = (string) @filemtime(__DIR__ . '/product-costs.js');
?>
<!DOCTYPE html>
<html lang="en" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Product Costs | Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
<?php render_admin_initial_theme_script(); ?>
<?php render_admin_favicons('sku-db'); ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=Space+Grotesk:wght@500;700&amp;display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
    <link rel="stylesheet" href="./product-costs.css?v=<?php echo urlencode($pageCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard is-product-costs">
<div class="admin-app admin-app-suite" data-product-costs data-api-endpoint="../api/product-costs/">
    <div class="admin-shell">
        <?php render_admin_sidebar('sku'); ?>
        <div class="admin-shell-main">
            <header class="admin-topbar product-costs-topbar">
                <div class="admin-topbar-brand">
                    <span class="admin-chip">SKU cost control</span>
                    <h1>Product Costs</h1>
                    <p>Set quarter-aware COGS and next-month packing prices without editing raw SKU records.</p>
                </div>
                <div class="product-costs-head-actions">
                    <a class="admin-ghost-btn" href="../sku-db/">Back to SKU DB</a>
                    <?php render_admin_topbar_actions('sku-db'); ?>
                </div>
            </header>

            <main class="product-costs-layout">
                <section class="product-costs-controls" aria-label="Packing price period and filters">
                    <label>
                        <span>Packing month</span>
                        <input type="month" data-cost-month min="2025-01" max="2100-12">
                    </label>
                    <label class="product-costs-search">
                        <span>Find product</span>
                        <input type="search" data-cost-search placeholder="Search product, flavor, volume, or SKU">
                    </label>
                    <button type="button" class="admin-ghost-btn" data-cost-refresh>Refresh</button>
                    <p data-cost-status>Loading product costs…</p>
                </section>

                <section class="product-costs-panel">
                    <div class="product-costs-panel-head">
                        <div>
                            <span>Grouped editing</span>
                            <div class="product-costs-title-line">
                                <h2>Product and volume costs</h2>
                                <p class="product-costs-readiness" data-cost-readiness><i></i><strong data-cost-missing>0</strong> <span data-cost-missing-label>need packing price</span></p>
                            </div>
                        </div>
                        <p>One edit updates every flavor and variant in the same product family and volume.</p>
                    </div>
                    <div class="admin-table-wrap product-costs-table-wrap">
                        <table class="admin-table product-costs-table">
                            <thead><tr><th>Status</th><th>Product</th><th>Volume</th><th>Variants</th><th>Current COGS</th><th>Packing / item</th><th>Actions</th></tr></thead>
                            <tbody data-cost-rows><tr><td colspan="7" class="admin-empty">Loading product groups.</td></tr></tbody>
                        </table>
                    </div>
                </section>

                <section class="product-costs-note">
                    <strong>Gross profit calculation</strong>
                    <span>Net revenue − physical item COGS − physical item packing cost. Free gifts still consume both costs.</span>
                </section>
            </main>
        </div>
    </div>
</div>

<div class="admin-modal-shell" data-packing-modal hidden>
    <div class="admin-modal-backdrop" data-close-packing></div>
    <div class="admin-modal-card product-costs-modal" role="dialog" aria-modal="true" aria-labelledby="packing-modal-title">
        <div class="product-costs-modal-head"><div><span>Monthly per-item cost</span><h2 id="packing-modal-title" data-packing-title>Set packing price</h2><p data-packing-period></p></div><button type="button" data-close-packing aria-label="Close">&times;</button></div>
        <form data-packing-form>
            <input type="hidden" name="source_sku">
            <label class="product-costs-toggle"><input type="checkbox" name="packing_required" checked><span><strong>Packing is required</strong><small>Turn this off only when this product needs no shipment packing cost.</small></span></label>
            <label data-packing-price-field><span>Packing price per physical item</span><div class="product-costs-money"><b>Rp</b><input type="number" name="packing_per_item" min="0" step="0.01" inputmode="decimal" required></div></label>
            <div class="product-costs-affected"><span>Affected SKUs</span><div data-packing-skus></div></div>
            <p class="admin-form-error" data-packing-error hidden></p>
            <div class="product-costs-modal-actions"><button type="submit" class="admin-primary-btn">Save monthly packing</button><button type="button" class="admin-ghost-btn" data-close-packing>Cancel</button></div>
        </form>
    </div>
</div>

<div class="admin-modal-shell" data-cogs-cost-modal hidden>
    <div class="admin-modal-backdrop" data-close-cost-cogs></div>
    <div class="admin-modal-card product-costs-modal product-costs-cogs-modal" role="dialog" aria-modal="true" aria-labelledby="cost-cogs-modal-title">
        <div class="product-costs-modal-head"><div><span>COGS timeline</span><h2 id="cost-cogs-modal-title" data-cogs-cost-title>Change COGS</h2><p>All matching variants and their ASTRA-linked selling sizes stay synchronized.</p></div><button type="button" data-close-cost-cogs aria-label="Close">&times;</button></div>
        <form data-cogs-cost-form>
            <input type="hidden" name="source_sku">
            <label><span>New COGS for this selling size</span><div class="product-costs-money"><b>Rp</b><input type="number" name="new_price" min="0" step="0.01" inputmode="decimal" required></div></label>
            <fieldset class="product-costs-timing">
                <legend>When should it apply?</legend>
                <label><input type="radio" name="change_mode" value="quarterly" checked><span><strong>Next quarter</strong><small data-cogs-quarter-label>Standard schedule</small></span></label>
                <label><input type="radio" name="change_mode" value="period"><span><strong>Specific period</strong><small>Temporarily overrides the normal timeline, then reverts.</small></span></label>
                <label class="is-danger"><input type="radio" name="change_mode" value="retroactive"><span><strong>Fully retroactive</strong><small>Recalculates all history and replaces earlier schedules.</small></span></label>
            </fieldset>
            <div class="product-costs-date-range" data-cogs-date-range hidden>
                <label><span>Start date</span><input type="date" name="start_date"></label>
                <label><span>End date</span><input type="date" name="end_date"></label>
            </div>
            <div class="product-costs-affected"><span>Affected product-volume SKUs</span><div data-cogs-cost-skus></div></div>
            <p class="admin-form-error" data-cogs-cost-error hidden></p>
            <div class="product-costs-modal-actions"><button type="submit" class="admin-primary-btn">Save COGS change</button><button type="button" class="admin-ghost-btn" data-close-cost-cogs>Cancel</button></div>
        </form>
    </div>
</div>

<?php render_admin_notification_drawer(); ?>
<?php render_admin_chrome_script('../'); ?>
<script type="module" src="./product-costs.js?v=<?php echo urlencode($pageJsVersion ?: '1'); ?>"></script>
</body>
</html>
