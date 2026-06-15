<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/');
    exit;
}

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$pageJsVersion = (string) @filemtime(__DIR__ . '/profit-loss.js');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Profit and Loss | Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/png" href="https://jenanggemi.com/Media/Jenang%20Gemi%20Website%20Logo.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard is-executive-dashboard is-profit-loss">
<div class="admin-app admin-app-suite" data-profit-loss data-api-endpoint="../api/profit-loss/" data-sales-endpoint="../api/sales/">
    <div class="admin-shell">
        <?php render_admin_sidebar('profit-loss'); ?>
        <div class="admin-shell-main">
            <header class="admin-topbar profit-loss-topbar">
                <div class="admin-topbar-brand">
                    <span class="admin-admin-mark">Finance</span>
                    <h1>Profit &amp; Loss</h1>
                    <p><span data-pl-period-label>Loading period</span> · <span data-pl-sync-label>Connecting to live sales</span></p>
                </div>
                <div class="profit-loss-controls">
                    <label class="pl-compact-control">
                        <span>Year</span>
                        <select data-pl-year></select>
                    </label>
                    <label class="pl-compact-control">
                        <span>Period</span>
                        <select data-pl-month>
                            <option value="0">Year to date</option>
                        </select>
                    </label>
                    <button type="button" class="pl-icon-button" data-pl-refresh aria-label="Refresh live data" title="Refresh live sales and saved costs">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>
                    </button>
                </div>
            </header>

            <main class="profit-loss-layout">
                <section class="pl-kpi-strip" aria-label="Profit and loss summary">
                    <article><span>Net revenue <i title="Seller-received revenue after marketplace fees.">i</i></span><strong data-pl-kpi="net_revenue">Rp0</strong><small data-pl-kpi-meta="net_revenue">Live</small></article>
                    <article><span>Units sold <i title="Marketplace item quantity for the selected period.">i</i></span><strong data-pl-kpi="units">0</strong><small data-pl-kpi-meta="units">SKU facts</small></article>
                    <article><span>COGS <i title="SKU DB COGS plus saved per-unit packaging, labor, and direct costs.">i</i></span><strong data-pl-kpi="cogs">Rp0</strong><small data-pl-kpi-meta="cogs">Automatic</small></article>
                    <article><span>Gross profit <i title="Net revenue plus other income, less total direct product cost.">i</i></span><strong data-pl-kpi="gross_profit">Rp0</strong><small data-pl-kpi-meta="gross_profit">0.0%</small></article>
                    <article><span>Administration <i title="Saved operating and administration expenses.">i</i></span><strong data-pl-kpi="administration">Rp0</strong><small data-pl-kpi-meta="administration">0.0% of revenue</small></article>
                    <article><span>Marketing <i title="Advertising, ads tax, commissions, bonuses, free product, and marketing payroll.">i</i></span><strong data-pl-kpi="marketing">Rp0</strong><small data-pl-kpi-meta="marketing">0.0% of revenue</small></article>
                    <article class="is-net"><span>Net profit <i title="Gross profit less administration, marketing, and other operating expenses.">i</i></span><strong data-pl-kpi="net_profit">Rp0</strong><small data-pl-kpi-meta="net_profit">0.0% margin</small></article>
                    <article><span>Profit / unit <i title="Net profit divided by all units sold.">i</i></span><strong data-pl-kpi="profit_per_unit">Rp0</strong><small data-pl-kpi-meta="profit_per_unit">Blended</small></article>
                </section>

                <section class="pl-workspace-grid">
                    <div class="pl-main-stack">
                    <article class="pl-surface pl-syrup-volume-surface">
                        <div class="pl-surface-bar">
                            <div class="pl-inline-title"><strong>Syrup volumes</strong><i title="Volume groups follow the old Profit & Loss syrup split and can use automatic or manual SKU assignments.">i</i></div>
                            <button type="button" class="pl-icon-button pl-settings-icon" data-pl-edit-syrup-settings aria-label="Configure syrup volume SKU assignments" title="Configure syrup volume SKU assignments">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 0 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.3 7A2 2 0 1 1 7.1 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1a2 2 0 0 1 0 4H21a1.7 1.7 0 0 0-1.6 1z"/></svg>
                            </button>
                        </div>
                        <div class="pl-syrup-grid" data-pl-syrup-groups>
                            <p class="pl-empty">Loading syrup volume split...</p>
                        </div>
                    </article>

                    <article class="pl-surface pl-product-ledger">
                        <div class="pl-surface-bar">
                            <div class="pl-inline-title"><strong>SKU ledger</strong><i title="Sales are automatic. Select a row's edit button to add packaging, labor, other direct cost, or override COGS for a specific month.">i</i></div>
                            <div class="pl-ledger-tools">
                                <label class="pl-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg><input type="search" data-pl-search placeholder="Find SKU or product"></label>
                                <span class="pl-data-badge" data-pl-coverage>Checking SKU coverage</span>
                            </div>
                        </div>
                        <div class="pl-ledger-head" aria-hidden="true">
                            <span>Product / SKU</span><span>Sold</span><span>Net revenue</span><span>Avg price</span><span>COGS</span><span>Gross profit</span><span>GP / unit</span><span>Margin</span><span></span>
                        </div>
                        <div class="pl-ledger-groups" data-pl-ledger>
                            <p class="pl-empty">Loading live product facts...</p>
                        </div>
                    </article>

                    <section class="pl-surface pl-monthly-surface">
                        <div class="pl-surface-bar">
                            <div class="pl-inline-title"><strong>Monthly statement</strong><i title="The full year in the same monthly structure as the old workbook, calculated from live sales and saved manual inputs.">i</i></div>
                            <button type="button" class="pl-icon-button pl-settings-icon" data-pl-edit-metrics aria-label="Configure monthly statement rows" title="Configure monthly statement rows">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 0 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.3 7A2 2 0 1 1 7.1 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1a2 2 0 0 1 0 4H21a1.7 1.7 0 0 0-1.6 1z"/></svg>
                            </button>
                        </div>
                        <div class="pl-monthly-scroll">
                            <table class="pl-monthly-table">
                                <thead><tr><th>Metric</th><th>Jan</th><th>Feb</th><th>Mar</th><th>Apr</th><th>May</th><th>Jun</th><th>Jul</th><th>Aug</th><th>Sep</th><th>Oct</th><th>Nov</th><th>Dec</th><th>YTD</th></tr></thead>
                                <tbody data-pl-monthly-body></tbody>
                            </table>
                        </div>
                    </section>
                    </div>

                    <aside class="pl-side-stack">
                        <article class="pl-surface">
                            <div class="pl-surface-bar">
                                <div class="pl-inline-title"><strong>Operating entries</strong><i title="Add the costs and non-product income that marketplace and SKU systems cannot know automatically.">i</i></div>
                                <button type="button" class="pl-text-button" data-pl-add-entry>+ Add</button>
                            </div>
                            <div class="pl-entry-sections" data-pl-entry-sections></div>
                        </article>

                        <article class="pl-surface">
                            <div class="pl-surface-bar">
                                <div class="pl-inline-title"><strong>Profit allocation</strong><i title="Legacy distribution model applied only when net profit is positive. Percentages are editable.">i</i></div>
                                <button type="button" class="pl-text-button" data-pl-edit-allocation>Edit</button>
                            </div>
                            <div class="pl-allocation-list" data-pl-allocation-list></div>
                        </article>

                        <article class="pl-surface pl-data-quality">
                            <div class="pl-surface-bar"><div class="pl-inline-title"><strong>Data quality</strong><i title="These checks identify missing SKU or COGS links that prevent a complete P&L.">i</i></div></div>
                            <div data-pl-data-quality><p class="pl-empty">Running checks...</p></div>
                        </article>
                    </aside>
                </section>
            </main>
        </div>
    </div>

    <div class="pl-modal" data-pl-sku-modal hidden>
        <div class="pl-modal-backdrop" data-pl-close-sku></div>
        <form class="pl-modal-card" data-pl-sku-form>
            <div class="pl-modal-head"><div><small data-pl-sku-period></small><strong data-pl-sku-title>SKU cost input</strong></div><button type="button" data-pl-close-sku aria-label="Close">×</button></div>
            <input type="hidden" name="sku">
            <input type="hidden" name="month">
            <div class="pl-form-grid">
                <label><span>SKU DB COGS / unit <i title="Leave override blank to keep this automatic.">i</i></span><input name="catalog_cogs" readonly></label>
                <label><span>COGS override / unit <i title="Optional period-specific replacement for SKU DB COGS.">i</i></span><input name="cogs_override" inputmode="decimal" placeholder="Automatic"></label>
                <label><span>Packaging / unit</span><input name="packaging_per_unit" inputmode="decimal" value="0"></label>
                <label><span>Direct labor / unit</span><input name="labor_per_unit" inputmode="decimal" value="0"></label>
                <label><span>Other direct cost / unit</span><input name="other_per_unit" inputmode="decimal" value="0"></label>
                <label class="is-wide"><span>Notes</span><textarea name="notes" rows="3" placeholder="Supplier change, allocation basis, or audit note"></textarea></label>
            </div>
            <p class="pl-form-error" data-pl-sku-error hidden></p>
            <div class="pl-modal-actions"><button type="button" class="pl-secondary-button" data-pl-close-sku>Cancel</button><button type="submit" class="pl-primary-button">Save cost input</button></div>
        </form>
    </div>

    <div class="pl-modal" data-pl-entry-modal hidden>
        <div class="pl-modal-backdrop" data-pl-close-entry></div>
        <form class="pl-modal-card" data-pl-entry-form>
            <div class="pl-modal-head"><div><small>Manual P&amp;L input</small><strong data-pl-entry-title>Add operating entry</strong></div><button type="button" data-pl-close-entry aria-label="Close">×</button></div>
            <input type="hidden" name="id">
            <div class="pl-form-grid">
                <label><span>Month</span><select name="month" required></select></label>
                <label><span>Section</span><select name="section" required><option value="administration">Administration</option><option value="marketing">Marketing</option><option value="income">Other income</option><option value="other">Other expense</option></select></label>
                <label class="is-wide"><span>Label</span><input name="label" list="pl-entry-labels" maxlength="120" required placeholder="Choose a legacy line or enter a new one"></label>
                <label><span>Amount</span><input name="amount" inputmode="decimal" required placeholder="0"></label>
                <label><span>Notes</span><input name="notes" maxlength="500" placeholder="Optional audit note"></label>
            </div>
            <datalist id="pl-entry-labels" data-pl-entry-labels></datalist>
            <p class="pl-form-error" data-pl-entry-error hidden></p>
            <div class="pl-modal-actions"><button type="button" class="pl-danger-button" data-pl-delete-entry hidden>Delete</button><span></span><button type="button" class="pl-secondary-button" data-pl-close-entry>Cancel</button><button type="submit" class="pl-primary-button">Save entry</button></div>
        </form>
    </div>

    <div class="pl-modal" data-pl-allocation-modal hidden>
        <div class="pl-modal-backdrop" data-pl-close-allocation></div>
        <form class="pl-modal-card" data-pl-allocation-form>
            <div class="pl-modal-head"><div><small>Percentage of positive profit</small><strong>Profit allocation model</strong></div><button type="button" data-pl-close-allocation aria-label="Close">×</button></div>
            <div class="pl-form-grid">
                <label><span>Reinvest %</span><input name="reinvest_pct" inputmode="decimal"></label>
                <label><span>Offering to SAGI %</span><input name="offering_pct" inputmode="decimal"></label>
                <label><span>Ownership share %</span><input name="ownership_pct" inputmode="decimal"></label>
                <label><span>Director share of ownership %</span><input name="director_pct" inputmode="decimal"></label>
                <label><span>BnG loan share %</span><input name="bng_loan_pct" inputmode="decimal"></label>
                <label><span>Commissioner share %</span><input name="commissioner_pct" inputmode="decimal"></label>
                <label><span>Advisor share %</span><input name="advisor_pct" inputmode="decimal"></label>
            </div>
            <p class="pl-form-error" data-pl-allocation-error hidden></p>
            <div class="pl-modal-actions"><button type="button" class="pl-secondary-button" data-pl-close-allocation>Cancel</button><button type="submit" class="pl-primary-button">Save allocation</button></div>
        </form>
    </div>

    <div class="pl-modal" data-pl-syrup-settings-modal hidden>
        <div class="pl-modal-backdrop" data-pl-close-syrup-settings></div>
        <form class="pl-modal-card pl-settings-card" data-pl-syrup-settings-form>
            <div class="pl-modal-head"><div><small>SKU assignments</small><strong>Syrup volume groups</strong></div><button type="button" data-pl-close-syrup-settings aria-label="Close">×</button></div>
            <div class="pl-settings-list" data-pl-syrup-settings-list></div>
            <p class="pl-form-error" data-pl-syrup-settings-error hidden></p>
            <div class="pl-modal-actions"><button type="button" class="pl-secondary-button" data-pl-add-syrup-group>Add volume</button><span></span><button type="button" class="pl-secondary-button" data-pl-close-syrup-settings>Cancel</button><button type="submit" class="pl-primary-button">Save syrup settings</button></div>
        </form>
    </div>

    <div class="pl-modal" data-pl-metrics-modal hidden>
        <div class="pl-modal-backdrop" data-pl-close-metrics></div>
        <form class="pl-modal-card pl-settings-card" data-pl-metrics-form>
            <div class="pl-modal-head"><div><small>Statement rows</small><strong>Monthly metrics</strong></div><button type="button" data-pl-close-metrics aria-label="Close">×</button></div>
            <div class="pl-settings-list" data-pl-metrics-list></div>
            <p class="pl-form-error" data-pl-metrics-error hidden></p>
            <div class="pl-modal-actions"><button type="button" class="pl-secondary-button" data-pl-add-metric>Add metric</button><span></span><button type="button" class="pl-secondary-button" data-pl-close-metrics>Cancel</button><button type="submit" class="pl-primary-button">Save metrics</button></div>
        </form>
    </div>

    <div class="pl-toast" data-pl-toast hidden></div>
</div>
<script type="module" src="./profit-loss.js?v=<?php echo urlencode($pageJsVersion ?: '1'); ?>"></script>
</body>
</html>
