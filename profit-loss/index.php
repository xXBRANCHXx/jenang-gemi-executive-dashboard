<?php
declare(strict_types=1);

require dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/admin-nav.php';

if (!jg_admin_is_authenticated()) {
    header('Location: ../dashboard/');
    exit;
}

$adminCssVersion = (string) @filemtime(dirname(__DIR__) . '/admin.css');
$pageJsVersion = (string) @filemtime(__DIR__ . '/accounting.js');
?>
<!DOCTYPE html>
<html lang="en" data-admin-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Accounting | Executive Dashboard</title>
    <meta name="robots" content="noindex,nofollow">
<?php render_admin_initial_theme_script(); ?>
<?php render_admin_favicons('profit-loss'); ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard is-executive-dashboard is-profit-loss is-accounting">
<div class="admin-app admin-app-suite" data-accounting-page data-accounting-endpoint="../api/accounting/">
    <div class="admin-shell">
        <?php render_admin_sidebar('profit-loss'); ?>
        <div class="admin-shell-main">
            <header class="admin-topbar profit-loss-topbar admin-accounting-topbar">
                <div class="admin-topbar-brand">
                    <span class="admin-admin-mark">Finance</span>
                    <h1>Accounting</h1>
                    <p>Operational finance</p>
                </div>
                <?php render_admin_topbar_actions('profit-loss'); ?>
            </header>

            <main class="profit-loss-layout admin-accounting-view" data-accounting-view>
                <section class="admin-accounting-command" aria-label="Accounting controls">
                    <div class="admin-accounting-command-fields">
                        <label class="admin-accounting-field">
                            <span>Month</span>
                            <input type="month" data-accounting-month-select>
                        </label>
                        <div class="admin-accounting-range" data-accounting-range-controls aria-label="Accounting range">
                            <button type="button" class="admin-toggle-pill is-active" data-accounting-range="this_month">This Month</button>
                            <button type="button" class="admin-toggle-pill" data-accounting-range="last_month">Last Month</button>
                            <button type="button" class="admin-toggle-pill" data-accounting-range="ytd">YTD</button>
                            <button type="button" class="admin-toggle-pill" data-accounting-range="custom">Custom</button>
                        </div>
                        <label class="admin-accounting-field">
                            <span>From</span>
                            <input type="date" data-accounting-date-from>
                        </label>
                        <label class="admin-accounting-field">
                            <span>To</span>
                            <input type="date" data-accounting-date-to>
                        </label>
                    </div>
                    <div class="admin-accounting-command-actions">
                        <button type="button" class="admin-ghost-btn" data-accounting-refresh>Refresh</button>
                        <button type="button" class="admin-primary-btn" data-accounting-open-mode="expense_paid">Expense</button>
                        <button type="button" class="admin-primary-btn" data-accounting-open-mode="bill_received">Bill</button>
                        <button type="button" class="admin-soft-btn" data-accounting-open-mode="pay_bill">Pay Bill</button>
                        <button type="button" class="admin-soft-btn" data-accounting-open-mode="transfer">Transfer</button>
                        <button type="button" class="admin-ghost-btn" data-accounting-export>Export</button>
                        <button type="button" class="admin-ghost-btn" data-accounting-settings>Settings</button>
                    </div>
                    <p class="admin-accounting-status" data-accounting-status>Accounting updated just now</p>
                </section>

                <section class="admin-accounting-metrics" aria-label="Accounting metrics">
                    <article class="admin-accounting-metric">
                        <span>Cash Available</span>
                        <strong data-accounting-kpi="real-cash">Rp0</strong>
                        <small>Bank + cash</small>
                    </article>
                    <article class="admin-accounting-metric">
                        <span>Marketplace</span>
                        <strong data-accounting-kpi="marketplace-outstanding">Rp0</strong>
                        <small>Receivable</small>
                    </article>
                    <article class="admin-accounting-metric">
                        <span>Bills Due</span>
                        <strong data-accounting-kpi="bills-due">Rp0</strong>
                        <small>Next 7 days</small>
                    </article>
                    <article class="admin-accounting-metric">
                        <span>Overdue</span>
                        <strong data-accounting-kpi="overdue">Rp0</strong>
                        <small>Open bills</small>
                    </article>
                    <article class="admin-accounting-metric">
                        <span>Expenses</span>
                        <strong data-accounting-kpi="expenses">Rp0</strong>
                        <small>This month</small>
                    </article>
                    <article class="admin-accounting-metric" data-accounting-safe-cash-card>
                        <span>Safe Cash</span>
                        <strong data-accounting-kpi="safe-cash">Rp0</strong>
                        <small>Net estimate</small>
                    </article>
                    <article class="admin-accounting-metric">
                        <span>Review</span>
                        <strong data-accounting-kpi="pending-review">0</strong>
                        <small>Open items</small>
                    </article>
                </section>

                <section class="admin-accounting-workspace">
                    <article class="admin-accounting-panel admin-accounting-entry">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Quick Entry</span><h3>Daily entry</h3></div>
                            <span class="admin-panel-meta" data-accounting-form-status>Ready</span>
                        </div>
                        <div class="admin-accounting-mode-row">
                            <button type="button" class="admin-toggle-pill is-active" data-accounting-quick-mode="expense_paid">Expense Paid</button>
                            <button type="button" class="admin-toggle-pill" data-accounting-quick-mode="bill_received">Bill Received</button>
                            <button type="button" class="admin-toggle-pill" data-accounting-quick-mode="pay_bill">Pay Bill</button>
                            <button type="button" class="admin-toggle-pill" data-accounting-quick-mode="transfer">Transfer</button>
                            <button type="button" class="admin-toggle-pill" data-accounting-quick-mode="manual_income">Money In</button>
                        </div>
                        <div class="admin-accounting-helper" data-accounting-mode-helper>Money already paid from the business.</div>
                        <form class="admin-accounting-form" data-accounting-form>
                            <input type="hidden" name="mode" data-accounting-mode-field value="expense_paid">
                            <div class="admin-accounting-warning" data-accounting-marketplace-warning hidden>Marketplace sales are already counted from Orders/Wallet. Use Transfer for payouts.</div>
                            <label data-accounting-field="transaction_date">
                                <span>Date</span>
                                <input type="date" name="transaction_date" data-accounting-date>
                            </label>
                            <label data-accounting-field="issue_date" hidden>
                                <span>Bill Date</span>
                                <input type="date" name="issue_date" data-accounting-issue-date>
                            </label>
                            <label data-accounting-field="due_date" hidden>
                                <span>Due Date</span>
                                <input type="date" name="due_date">
                            </label>
                            <label data-accounting-field="bill_id" hidden>
                                <span>Bill</span>
                                <select name="bill_id" data-accounting-bill-select></select>
                            </label>
                            <label>
                                <span>Amount</span>
                                <input type="text" inputmode="numeric" name="amount" data-accounting-amount placeholder="Rp0" required>
                            </label>
                            <label data-accounting-field="account_id">
                                <span>Paid From Account</span>
                                <select name="account_id" data-accounting-account-select required></select>
                            </label>
                            <label data-accounting-field="to_account_id" hidden>
                                <span>To Account</span>
                                <select name="to_account_id" data-accounting-to-account-select></select>
                            </label>
                            <label data-accounting-field="category_id">
                                <span>Category</span>
                                <select name="category_id" data-accounting-category-select required></select>
                            </label>
                            <label data-accounting-field="counterparty">
                                <span>Vendor / Source</span>
                                <input type="text" name="counterparty_name" data-accounting-counterparty-input list="accounting-counterparties" placeholder="Search or quick-create" required>
                                <datalist id="accounting-counterparties" data-accounting-counterparty-options></datalist>
                            </label>
                            <label data-accounting-field="bill_no" hidden>
                                <span>Bill / Invoice No.</span>
                                <input type="text" name="bill_no" maxlength="120">
                            </label>
                            <label>
                                <span>Brand</span>
                                <select name="brand" data-accounting-brand-select>
                                    <option>General / Shared</option>
                                    <option>ZERO</option>
                                    <option>Jenang Gemi</option>
                                    <option>ZFit</option>
                                    <option>Superfoods</option>
                                    <option>Other</option>
                                </select>
                            </label>
                            <label>
                                <span>Channel</span>
                                <select name="channel" data-accounting-channel-select>
                                    <option>Internal</option>
                                    <option>Shopee</option>
                                    <option>TikTok</option>
                                    <option>Tokopedia</option>
                                    <option>Website</option>
                                    <option>WhatsApp</option>
                                    <option>Offline</option>
                                    <option>Partner</option>
                                    <option>Distributor</option>
                                    <option>Reseller</option>
                                    <option>Dropship</option>
                                    <option>Ads</option>
                                    <option>Production</option>
                                    <option>Fulfillment</option>
                                </select>
                            </label>
                            <label data-accounting-field="income_type" hidden>
                                <span>Income Type</span>
                                <select name="income_type" data-accounting-income-type>
                                    <option value="manual_income">Offline customer payment</option>
                                    <option value="manual_income">Website/manual invoice payment</option>
                                    <option value="owner_injection">Owner injection</option>
                                    <option value="manual_income">Loan received</option>
                                    <option value="refund">Refund/reimbursement received</option>
                                    <option value="manual_income">Other income</option>
                                </select>
                            </label>
                            <label>
                                <span>Payment Method</span>
                                <select name="payment_method">
                                    <option>Bank Transfer</option>
                                    <option>Cash</option>
                                    <option>QRIS</option>
                                    <option>E-wallet</option>
                                    <option>Marketplace Wallet</option>
                                    <option>Card</option>
                                    <option>Other</option>
                                </select>
                            </label>
                            <label data-accounting-field="transfer_fee_amount" hidden>
                                <span>Transfer Fee</span>
                                <input type="text" inputmode="numeric" name="transfer_fee_amount" placeholder="Rp0">
                            </label>
                            <label>
                                <span>Receipt URL</span>
                                <input type="url" name="receipt_url" placeholder="https://...">
                            </label>
                            <label>
                                <span>Receipt Status</span>
                                <select name="receipt_status">
                                    <option value="missing">Missing</option>
                                    <option value="attached">Attached</option>
                                    <option value="not_required">Not required</option>
                                </select>
                            </label>
                            <label>
                                <span>Reference No.</span>
                                <input type="text" name="reference_no" maxlength="160">
                            </label>
                            <label>
                                <span>Order / SKU</span>
                                <input type="text" name="order_no" maxlength="160">
                            </label>
                            <label class="admin-accounting-form-wide">
                                <span>Notes</span>
                                <textarea name="notes" rows="3"></textarea>
                            </label>
                            <p class="admin-form-error" data-accounting-form-error hidden></p>
                            <div class="admin-accounting-form-actions">
                                <button type="submit" class="admin-primary-btn" data-accounting-save>Save</button>
                                <button type="submit" class="admin-soft-btn" data-accounting-save-add value="1">Save &amp; Add</button>
                                <button type="submit" class="admin-ghost-btn" data-accounting-save-draft>Draft</button>
                                <button type="reset" class="admin-ghost-btn">Cancel</button>
                            </div>
                        </form>
                    </article>

                    <article class="admin-accounting-panel admin-accounting-alerts">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Attention</span><h3>Checks</h3></div>
                        </div>
                        <div class="admin-accounting-alert-grid" data-accounting-alerts>
                            <div class="admin-accounting-alert"><strong>No urgent alerts</strong><span>Checks appear after data loads.</span></div>
                        </div>
                    </article>
                </section>

                <section class="admin-accounting-panel admin-accounting-panel-wide">
                    <div class="admin-panel-head">
                        <div><span class="admin-panel-kicker">Bills Queue</span><h3>Unpaid bills</h3></div>
                        <span class="admin-panel-meta" data-accounting-bills-meta>Open bills</span>
                    </div>
                    <div class="admin-table-wrap admin-accounting-table-wrap">
                        <table class="admin-table admin-accounting-table">
                            <thead>
                                <tr>
                                    <th>Due Date</th>
                                    <th>Status</th>
                                    <th>Vendor</th>
                                    <th>Bill No.</th>
                                    <th>Category</th>
                                    <th>Brand</th>
                                    <th>Channel</th>
                                    <th>Total</th>
                                    <th>Paid</th>
                                    <th>Outstanding</th>
                                    <th>Age</th>
                                    <th>Attachment</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody data-accounting-bills-body>
                                <tr><td colspan="13" class="admin-empty">Loading bills.</td></tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section class="admin-accounting-panel admin-accounting-panel-wide">
                    <div class="admin-panel-head">
                        <div><span class="admin-panel-kicker">Transaction Ledger</span><h3>Manual entries</h3></div>
                        <span class="admin-panel-meta" data-accounting-ledger-meta>Selected month</span>
                    </div>
                    <div class="admin-table-wrap admin-accounting-table-wrap">
                        <table class="admin-table admin-accounting-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Account</th>
                                    <th>Direction</th>
                                    <th>Vendor / Payee</th>
                                    <th>Category</th>
                                    <th>Brand</th>
                                    <th>Channel</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Receipt</th>
                                    <th>Related Bill</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody data-accounting-transactions-body>
                                <tr><td colspan="13" class="admin-empty">Loading transactions.</td></tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section class="admin-accounting-secondary">
                    <article class="admin-accounting-panel">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Summary</span><h3>Profit and cash</h3></div>
                        </div>
                        <div class="admin-accounting-summary-list" data-accounting-monthly-summary></div>
                    </article>

                    <article class="admin-accounting-panel">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Insights</span><h3>Spend split</h3></div>
                        </div>
                        <div class="admin-accounting-tabs">
                            <button type="button" class="admin-toggle-pill is-active" data-accounting-insight-tab="category">Category</button>
                            <button type="button" class="admin-toggle-pill" data-accounting-insight-tab="vendor">Vendor</button>
                            <button type="button" class="admin-toggle-pill" data-accounting-insight-tab="brand">Brand</button>
                            <button type="button" class="admin-toggle-pill" data-accounting-insight-tab="channel">Channel</button>
                        </div>
                        <div class="admin-accounting-insight-list" data-accounting-insights></div>
                    </article>

                    <article class="admin-accounting-panel admin-accounting-panel-wide">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Review Queue</span><h3>Data checks</h3></div>
                            <span class="admin-panel-meta">Category, receipt, duplicate, marketplace income</span>
                        </div>
                        <div class="admin-table-wrap admin-accounting-table-wrap admin-accounting-review-wrap">
                            <table class="admin-table admin-accounting-table">
                                <thead>
                                    <tr>
                                        <th>Issue</th>
                                        <th>Severity</th>
                                        <th>Transaction / Bill</th>
                                        <th>Suggested Fix</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody data-accounting-review-body>
                                    <tr><td colspan="5" class="admin-empty">Loading review queue.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </article>
                </section>

                <div class="admin-modal-shell admin-accounting-drawer" data-accounting-drawer hidden>
                    <button type="button" class="admin-modal-backdrop" data-accounting-drawer-close aria-label="Close accounting details"></button>
                    <aside class="admin-modal-card admin-accounting-drawer-card" role="dialog" aria-modal="true" aria-labelledby="accounting-drawer-title">
                        <div class="admin-modal-head">
                            <div>
                                <span class="admin-panel-kicker" data-accounting-drawer-kicker>Accounting</span>
                                <h3 id="accounting-drawer-title" data-accounting-drawer-title>Details</h3>
                            </div>
                            <button type="button" class="admin-ghost-btn" data-accounting-drawer-close>Close</button>
                        </div>
                        <div class="admin-accounting-drawer-body" data-accounting-drawer-body>
                            <p class="admin-empty">Select a bill or transaction.</p>
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    </div>
</div>
<?php render_admin_notification_drawer(); ?>
<?php render_admin_chrome_script('../'); ?>
<script type="module" src="./accounting.js?v=<?php echo urlencode($pageJsVersion ?: '1'); ?>"></script>
</body>
</html>
