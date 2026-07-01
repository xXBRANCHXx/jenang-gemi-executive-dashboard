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
    <link rel="icon" type="image/svg+xml" href="/assets/admin-icons/executive-dashboard-favicon-light.svg" media="(prefers-color-scheme: light)">
    <link rel="icon" type="image/svg+xml" href="/assets/admin-icons/executive-dashboard-favicon-dark.svg" media="(prefers-color-scheme: dark)">
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
                <div class="admin-topbar-actions admin-topbar-actions-profit-loss" data-admin-home-chrome>
                    <div class="profit-loss-controls">
                        <label class="pl-compact-control">
                            <span>Year <i title="Choose the year for this P&amp;L. Red stars mark months that came from the imported workbook instead of live marketplace rows.">i</i></span>
                            <select data-pl-year></select>
                        </label>
                        <label class="pl-compact-control">
                            <span>Period <i title="Choose one month or year to date. Pick a single month when you need to edit SKU-level costs; year to date is for the rolled-up view.">i</i></span>
                            <select data-pl-month>
                                <option value="0">Year to date</option>
                            </select>
                        </label>
                        <button type="button" class="pl-icon-button" data-pl-refresh aria-label="Refresh live data" title="Refresh live sales and saved costs">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>
                        </button>
                    </div>
                    <?php render_admin_topbar_action_buttons(); ?>
                </div>
            </header>

            <main class="profit-loss-layout">
                <section class="pl-kpi-strip" aria-label="Profit and loss summary">
                    <article><span>Net revenue <i title="For live months, this starts with seller-received marketplace revenue and adds any manual other income saved for the period.">i</i></span><strong data-pl-kpi="net_revenue">Rp0</strong><small data-pl-kpi-meta="net_revenue">Live</small></article>
                    <article><span>Units sold <i title="Total items sold in the selected period. If one order contains three products, this counts three units.">i</i></span><strong data-pl-kpi="units">0</strong><small data-pl-kpi-meta="units">SKU facts</small></article>
                    <article><span>COGS <i title="Product cost for the sold units. It starts with SKU DB COGS, then includes any saved packaging, labor, other direct cost, or month-specific override.">i</i></span><strong data-pl-kpi="cogs">Rp0</strong><small data-pl-kpi-meta="cogs">Automatic</small></article>
                    <article><span>Gross profit <i title="Revenue left after product costs. This is the money available before administration, marketing, and other operating expenses.">i</i></span><strong data-pl-kpi="gross_profit">Rp0</strong><small data-pl-kpi-meta="gross_profit">0.0%</small></article>
                    <article><span>Administration <i title="Saved operating costs such as salary, rent, utilities, office supplies, legal/tax, shipping in, and similar admin expenses.">i</i></span><strong data-pl-kpi="administration">Rp0</strong><small data-pl-kpi-meta="administration">0.0% of revenue</small></article>
                    <article><span>Marketing <i title="Saved selling and promotion costs such as ads, ads tax, referral commissions, affiliate/free product, live costs, bonuses, and marketing payroll.">i</i></span><strong data-pl-kpi="marketing">Rp0</strong><small data-pl-kpi-meta="marketing">0.0% of revenue</small></article>
                    <article class="is-net"><span>Net profit <i title="Gross profit minus administration, marketing, and other operating expenses. This is the bottom-line result for the selected period.">i</i></span><strong data-pl-kpi="net_profit">Rp0</strong><small data-pl-kpi-meta="net_profit">0.0% margin</small></article>
                    <article><span>Profit / unit <i title="Net profit divided by units sold. Use it to see the average bottom-line profit earned by each item sold.">i</i></span><strong data-pl-kpi="profit_per_unit">Rp0</strong><small data-pl-kpi-meta="profit_per_unit">Blended</small></article>
                </section>

                <section class="pl-workspace-grid">
                    <div class="pl-main-stack">
                        <article class="pl-surface pl-product-card-surface">
                            <div class="pl-surface-bar">
                                <div class="pl-inline-title"><strong>Product cards</strong><i title="Product cards turn selected SKU DB products into month-by-month tables. Use them to watch a product family, flavor, syrup volume, selected SKUs, or imported workbook total without changing code.">i</i></div>
                                <div class="pl-surface-actions">
                                    <button type="button" class="pl-text-button pl-edit-text" data-pl-edit-product-cards>Edit</button>
                                    <button type="button" class="pl-text-button pl-add-text" data-pl-add-product-card>+Add card</button>
                                </div>
                            </div>
                            <div class="pl-product-card-stack" data-pl-product-cards>
                                <p class="pl-empty">Loading product cards...</p>
                            </div>
                        </article>

                        <article class="pl-surface pl-syrup-volume-surface">
                            <div class="pl-surface-bar">
                                <div class="pl-inline-title"><strong>Syrup volumes</strong><i title="Groups syrup sales by bottle or sample size. Auto mode uses SKU DB volume and syrup detection; manual mode lets you choose exact SKUs when the catalog does not match perfectly.">i</i></div>
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
                                <div class="pl-inline-title"><strong>SKU ledger</strong><i title="Detailed product ledger for the selected period. Sales come from marketplace rows; product names and base COGS come from SKU DB. Edit a row in a single month to add packaging, labor, other direct cost, or a temporary COGS override.">i</i></div>
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
                    </div>

                    <aside class="pl-side-stack">
                        <article class="pl-surface">
                            <div class="pl-surface-bar">
                                <div class="pl-inline-title"><strong>Operating entries</strong><i title="Manual income and expenses that marketplaces and SKU DB cannot know, such as rent, salaries, ads, bonuses, shipping in/out, or monetization income. They are saved by month.">i</i></div>
                                <button type="button" class="pl-text-button pl-add-text" data-pl-add-entry>+Add</button>
                            </div>
                            <div class="pl-entry-sections" data-pl-entry-sections></div>
                        </article>

                        <article class="pl-surface">
                            <div class="pl-surface-bar">
                                <div class="pl-inline-title"><strong>Profit allocation</strong><i title="Shows how positive net profit is split by the saved model. It only allocates profit above zero, and the percentages can be edited for each year.">i</i></div>
                                <button type="button" class="pl-text-button pl-edit-text" data-pl-edit-allocation>Edit</button>
                            </div>
                            <div class="pl-allocation-list" data-pl-allocation-list></div>
                        </article>

                        <article class="pl-surface pl-data-quality">
                            <div class="pl-surface-bar"><div class="pl-inline-title"><strong>Data quality</strong><i title="Checks whether live sales rows are connected to SKU DB and have COGS. Warnings mean the P&amp;L may be missing cost data or SKU mapping for sold products.">i</i></div></div>
                            <div data-pl-data-quality><p class="pl-empty">Running checks...</p></div>
                        </article>
                    </aside>
                </section>

                <section class="pl-surface pl-monthly-surface">
                    <div class="pl-surface-bar">
                        <div class="pl-inline-title"><strong>Monthly statement</strong><i title="Full-year statement using the same monthly structure as the workbook. Live months calculate from marketplace sales, SKU DB costs, and saved manual entries; red stars mark imported workbook values.">i</i></div>
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
                <label><span>SKU DB COGS / unit <i title="Default product cost per unit from the SKU database. Leave the override blank when this cost is correct for the month.">i</i></span><input name="catalog_cogs" readonly></label>
                <label><span>COGS override / unit <i title="Optional replacement cost per unit for this SKU and month only. Use it when the SKU DB cost is wrong for that month.">i</i></span><input name="cogs_override" inputmode="decimal" placeholder="Automatic"></label>
                <label><span>Packaging / unit <i title="Extra packaging cost per sold unit for this SKU and month. Add only costs not already included in SKU DB COGS.">i</i></span><input name="packaging_per_unit" inputmode="decimal" value="0"></label>
                <label><span>Direct labor / unit <i title="Extra hands-on labor cost per sold unit for this SKU and month. Add only labor that belongs directly to making or packing the product.">i</i></span><input name="labor_per_unit" inputmode="decimal" value="0"></label>
                <label><span>Other direct cost / unit <i title="Any other per-unit product cost for this SKU and month that is not already covered by COGS, packaging, or labor.">i</i></span><input name="other_per_unit" inputmode="decimal" value="0"></label>
                <label class="is-wide"><span>Notes <i title="Short audit note explaining why this cost was entered, such as supplier change, special packaging, or allocation basis.">i</i></span><textarea name="notes" rows="3" placeholder="Supplier change, allocation basis, or audit note"></textarea></label>
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
                <label><span>Month <i title="Month where this manual P&amp;L entry belongs.">i</i></span><select name="month" required></select></label>
                <label><span>Section <i title="Choose how this entry affects profit. Income adds money; administration, marketing, and other expenses reduce profit.">i</i></span><select name="section" required><option value="administration">Administration</option><option value="marketing">Marketing</option><option value="income">Other income</option><option value="other">Other expense</option></select></label>
                <label class="is-wide"><span>Label <i title="Name that will appear in the P&amp;L. Use an existing workbook line when it fits, or write a clear accounting label.">i</i></span><input name="label" list="pl-entry-labels" maxlength="120" required placeholder="Choose a legacy line or enter a new one"></label>
                <label><span>Amount <i title="Amount for this entry. Income increases profit; expense sections reduce profit.">i</i></span><input name="amount" inputmode="decimal" required placeholder="0"></label>
                <label><span>Notes <i title="Optional note for the source, reason, invoice, or decision behind this entry.">i</i></span><input name="notes" maxlength="500" placeholder="Optional audit note"></label>
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
                <label><span>Reinvest % <i title="Percent of positive net profit reserved for reinvestment before ownership allocations are shown.">i</i></span><input name="reinvest_pct" inputmode="decimal"></label>
                <label><span>Offering to SAGI % <i title="Percent of positive net profit assigned to the SAGI offering line.">i</i></span><input name="offering_pct" inputmode="decimal"></label>
                <label><span>Ownership share % <i title="Percent of positive net profit that enters the ownership distribution model.">i</i></span><input name="ownership_pct" inputmode="decimal"></label>
                <label><span>Director share of ownership % <i title="Percent of the ownership share assigned directly to the director.">i</i></span><input name="director_pct" inputmode="decimal"></label>
                <label><span>BnG loan share % <i title="Percent of BnG's ownership share assigned to loan repayment.">i</i></span><input name="bng_loan_pct" inputmode="decimal"></label>
                <label><span>Commissioner share % <i title="Percent of BnG's ownership share assigned to the commissioner line.">i</i></span><input name="commissioner_pct" inputmode="decimal"></label>
                <label><span>Advisor share % <i title="Percent of BnG's ownership share assigned to the advisor line.">i</i></span><input name="advisor_pct" inputmode="decimal"></label>
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
            <div class="pl-modal-actions"><button type="button" class="pl-secondary-button pl-add-text" data-pl-add-syrup-group>Add volume</button><span></span><button type="button" class="pl-secondary-button" data-pl-close-syrup-settings>Cancel</button><button type="submit" class="pl-primary-button">Save syrup settings</button></div>
        </form>
    </div>

    <div class="pl-modal" data-pl-metrics-modal hidden>
        <div class="pl-modal-backdrop" data-pl-close-metrics></div>
        <form class="pl-modal-card pl-settings-card" data-pl-metrics-form>
            <div class="pl-modal-head"><div><small>Statement rows</small><strong>Monthly metrics</strong></div><button type="button" data-pl-close-metrics aria-label="Close">×</button></div>
            <div class="pl-settings-list" data-pl-metrics-list></div>
            <p class="pl-form-error" data-pl-metrics-error hidden></p>
            <div class="pl-modal-actions"><button type="button" class="pl-secondary-button pl-add-text" data-pl-add-metric>Add metric</button><span></span><button type="button" class="pl-secondary-button" data-pl-close-metrics>Cancel</button><button type="submit" class="pl-primary-button">Save metrics</button></div>
        </form>
    </div>

    <div class="pl-modal" data-pl-product-card-modal hidden>
        <div class="pl-modal-backdrop" data-pl-close-product-cards></div>
        <form class="pl-modal-card pl-settings-card pl-product-settings-card" data-pl-product-card-form>
            <div class="pl-modal-head"><div><small>SKU DB card builder</small><strong data-pl-product-card-title>Product card settings</strong></div><button type="button" data-pl-close-product-cards aria-label="Close">×</button></div>
            <div class="pl-settings-list" data-pl-product-card-list></div>
            <p class="pl-form-error" data-pl-product-card-error hidden></p>
            <div class="pl-modal-actions"><button type="button" class="pl-secondary-button pl-add-text" data-pl-add-product-card-draft>Add card</button><span></span><button type="button" class="pl-secondary-button" data-pl-close-product-cards>Cancel</button><button type="submit" class="pl-primary-button">Save product cards</button></div>
        </form>
    </div>

    <div class="pl-toast" data-pl-toast hidden></div>
</div>
<?php render_admin_notification_drawer(); ?>
<?php render_admin_chrome_script('../'); ?>
<script type="module" src="./profit-loss.js?v=<?php echo urlencode($pageJsVersion ?: '1'); ?>"></script>
</body>
</html>
