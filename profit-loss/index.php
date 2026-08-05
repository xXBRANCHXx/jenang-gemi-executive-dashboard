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
<?php render_admin_favicons('accounting'); ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap">
    <link rel="stylesheet" href="../admin.css?v=<?php echo urlencode($adminCssVersion ?: '1'); ?>">
</head>
<body class="admin-body is-dashboard is-executive-dashboard is-accounting">
<div class="admin-app admin-app-suite" data-accounting-page data-accounting-endpoint="../api/accounting/">
    <div class="admin-shell">
        <?php render_admin_sidebar('accounting'); ?>
        <div class="admin-shell-main">
            <header class="admin-topbar admin-accounting-topbar admin-finance-page-head">
                <div class="admin-topbar-brand">
                    <span class="admin-admin-mark">Finance operations</span>
                    <h1>Accounting</h1>
                    <p>Record exceptions, control cash, and correct the books.</p>
                </div>
                <?php render_admin_topbar_actions('accounting'); ?>
            </header>

            <main class="admin-accounting-view" data-accounting-view>
                <section class="admin-accounting-command" aria-label="Accounting controls">
                    <div class="admin-accounting-command-copy">
                        <p class="admin-accounting-status" data-accounting-status>Accounting updated just now</p>
                        <div class="admin-accounting-alert-strip" data-accounting-alerts>
                            <div class="admin-accounting-alert"><strong>No alerts</strong><span>Checks appear after data loads.</span></div>
                        </div>
                    </div>
                    <div class="admin-accounting-command-actions">
                        <button type="button" class="admin-accounting-icon-action" data-accounting-settings aria-label="Open accounting settings" title="Accounting settings">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.09a2 2 0 0 1 1 1.74v.5a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <details class="admin-accounting-export-menu">
                            <summary class="admin-accounting-icon-action" aria-label="Download accounting reports" title="Download reports">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5"/><path d="M5 17.5V21h14v-3.5"/></svg>
                            </summary>
                            <div>
                                <span>Download reports</span>
                                <button type="button" data-accounting-pembukuan-export="xlsx">Excel</button>
                                <button type="button" data-accounting-pembukuan-export="pdf">PDF</button>
                                <button type="button" data-accounting-pembukuan-export="zip">Complete Package</button>
                                <button type="button" data-accounting-export>Manual ledger CSV</button>
                                <button type="button" data-accounting-cash-records-export>Automatic cash CSV</button>
                            </div>
                        </details>
                    </div>
                </section>

                <section class="admin-liquidity-overview" aria-labelledby="liquid-assets-title">
                    <header class="admin-liquidity-head">
                        <div>
                            <span class="admin-panel-kicker">Treasury at a glance</span>
                            <h2 id="liquid-assets-title" data-accounting-term="liquid_assets">Liquid assets</h2>
                            <strong data-accounting-kpi="liquid-assets">Rp0</strong>
                            <p>Money available now or expected from marketplaces and unpaid partner bills.</p>
                        </div>
                        <div class="admin-liquidity-projected">
                            <span data-accounting-term="projected_after_bills">Projected after bills</span>
                            <strong data-accounting-kpi="projected-after-bills">Rp0</strong>
                            <div>
                                <button type="button" data-accounting-reconcile-open="bank">Reconcile bank</button>
                                <button type="button" data-accounting-reconcile-open="cash">Count cash</button>
                            </div>
                        </div>
                    </header>

                    <div class="admin-liquidity-chart" aria-label="Liquid asset composition">
                        <div class="admin-liquidity-bar" data-accounting-liquidity-assets-bar>
                            <span class="admin-liquidity-loading">Loading liquid assets…</span>
                        </div>
                        <div class="admin-liquidity-legend" aria-label="Chart legend">
                            <span class="is-available" data-accounting-term="available_now">Available now</span>
                            <span class="is-expected" data-accounting-term="expected">Expected</span>
                            <span class="is-outflow" data-accounting-term="going_out">Going out</span>
                        </div>
                    </div>

                    <p class="admin-liquidity-help">The red stripes mark money reserved to leave the bank. Hover or focus any color for a breakdown; click to open its overview.</p>
                </section>

                <section class="admin-accounting-metrics admin-liquidity-metrics" aria-label="Liquid asset overviews">
                    <button type="button" class="admin-accounting-metric admin-liquidity-metric is-available" data-accounting-cash-history-open="all" aria-haspopup="dialog" aria-controls="accounting-cash-history">
                        <span class="admin-liquidity-metric-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M4 7.5h13.5A2.5 2.5 0 0 1 20 10v8.5H6A3 3 0 0 1 3 15.5V6a2.5 2.5 0 0 1 2.5-2.5H17"/><path d="M15 12h5v4h-5a2 2 0 0 1 0-4Z"/></svg>
                        </span>
                        <span class="admin-liquidity-metric-copy">
                            <span data-accounting-term="available_now">Available now</span>
                            <strong data-accounting-kpi="available-now">Rp0</strong>
                            <small>Bank + physical cash <b aria-hidden="true">→</b></small>
                        </span>
                    </button>
                    <button type="button" class="admin-accounting-metric admin-liquidity-metric is-expected" data-accounting-marketplace-open aria-haspopup="dialog" aria-controls="accounting-breakdown">
                        <span class="admin-liquidity-metric-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M4 10h16l-1.5-5h-13L4 10Z"/><path d="M5 10v9h14v-9M9 19v-5h6v5"/><path d="M8 10c0 1.1-.9 2-2 2s-2-.9-2-2m8 0c0 1.1-.9 2-2 2s-2-.9-2-2m8 0c0 1.1-.9 2-2 2s-2-.9-2-2m8 0c0 1.1-.9 2-2 2s-2-.9-2-2"/></svg>
                        </span>
                        <span class="admin-liquidity-metric-copy">
                            <span data-accounting-term="expected">Expected</span>
                            <strong data-accounting-kpi="expected-total">Rp0</strong>
                            <small>Wallets + marketplace + unpaid partner bills <b aria-hidden="true">→</b></small>
                        </span>
                    </button>
                    <button type="button" class="admin-accounting-metric admin-liquidity-metric is-outflow" data-accounting-bills-open="scheduled" aria-haspopup="dialog" aria-controls="accounting-breakdown">
                        <span class="admin-liquidity-metric-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M8 3v5M16 3v5M4 10h16M8 14h3M8 17h6"/></svg>
                        </span>
                        <span class="admin-liquidity-metric-copy">
                            <span data-accounting-term="scheduled_outflow">Scheduled outflow</span>
                            <strong data-accounting-kpi="scheduled-outflow-card">Rp0</strong>
                            <small>Supplier bills + PO balances <b aria-hidden="true">→</b></small>
                        </span>
                    </button>
                </section>

                <section class="admin-accounting-workspace">
                    <article class="admin-accounting-panel admin-accounting-entry" id="accounting-entry">
                        <div class="admin-panel-head">
                            <div><span class="admin-panel-kicker">Accounting</span><h3 data-accounting-term="daily_entry">Daily entry</h3></div>
                            <span class="admin-panel-meta" data-accounting-form-status>Ready</span>
                        </div>
                        <label class="admin-accounting-mode-picker">
                            <span>What happened?</span>
                            <select data-accounting-mode-select>
                                <option value="expense_paid">Expense paid</option>
                                <option value="bill_received">Bill received</option>
                                <option value="pay_bill">Bill paid</option>
                                <option value="customer_refund">Customer refund paid</option>
                                <option value="transfer">Money transferred</option>
                                <option value="manual_income">Other money received</option>
                            </select>
                        </label>
                        <div class="admin-accounting-helper" data-accounting-mode-helper>Money already paid from the business.</div>
                        <form class="admin-accounting-form" data-accounting-form>
                            <input type="hidden" name="mode" data-accounting-mode-field value="expense_paid">
                            <div class="admin-accounting-warning" data-accounting-marketplace-warning hidden>Marketplace payouts are added automatically when they reach the bank. Do not enter them again.</div>
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
                                <span data-accounting-term="amount">Amount</span>
                                <input type="text" inputmode="numeric" name="amount" data-accounting-amount placeholder="Rp0" required>
                            </label>
                            <label data-accounting-field="account_id">
                                <span data-accounting-term="paid_from">Paid From Account</span>
                                <select name="account_id" data-accounting-account-select required></select>
                            </label>
                            <label data-accounting-field="to_account_id" hidden>
                                <span>To Account</span>
                                <select name="to_account_id" data-accounting-to-account-select></select>
                            </label>
                            <label data-accounting-field="category_id">
                                <span data-accounting-term="category">Category</span>
                                <div class="admin-accounting-category-combobox" data-accounting-category-combobox>
                                    <input type="hidden" name="category_id" data-accounting-category-value>
                                    <button type="button" class="admin-accounting-category-trigger" data-accounting-category-trigger aria-haspopup="listbox" aria-expanded="false">
                                        <span data-accounting-category-label>Choose category</span>
                                        <b aria-hidden="true">⌄</b>
                                    </button>
                                    <div class="admin-accounting-category-menu" data-accounting-category-menu hidden>
                                        <div class="admin-accounting-category-search">
                                            <span aria-hidden="true">⌕</span>
                                            <input type="search" data-accounting-category-search placeholder="Search categories…" autocomplete="off" aria-label="Search categories">
                                        </div>
                                        <div class="admin-accounting-category-results" data-accounting-category-results role="listbox"></div>
                                    </div>
                                </div>
                            </label>
                            <label data-accounting-field="counterparty">
                                <span data-accounting-term="vendor_source">Vendor / Source</span>
                                <input type="text" name="counterparty_name" data-accounting-counterparty-input list="accounting-counterparties" placeholder="Search or quick-create" required>
                                <datalist id="accounting-counterparties" data-accounting-counterparty-options></datalist>
                            </label>
                            <label data-accounting-field="bill_no" hidden>
                                <span>Bill / Invoice No.</span>
                                <input type="text" name="bill_no" maxlength="120">
                            </label>
                            <label data-accounting-field="income_type" hidden>
                                <span>Income Type</span>
                                <select name="income_type" data-accounting-income-type>
                                    <option value="manual_income">Offline customer payment</option>
                                    <option value="manual_income">Website/manual invoice payment</option>
                                    <option value="owner_injection">Owner injection</option>
                                    <option value="loan_received">Loan received</option>
                                    <option value="refund">Refund/reimbursement received</option>
                                    <option value="manual_income">Other income</option>
                                </select>
                            </label>
                            <label data-accounting-field="transfer_fee_amount" hidden>
                                <span>Transfer Fee</span>
                                <input type="text" inputmode="numeric" name="transfer_fee_amount" placeholder="Rp0">
                            </label>
                            <details class="admin-accounting-more admin-accounting-form-wide">
                                <summary>More details <span>Brand, channel, receipt, reference, notes</span></summary>
                                <div>
                                    <label>
                                        <span data-accounting-term="brand">Brand</span>
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
                                        <span data-accounting-term="channel">Channel</span>
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
                                    <label>
                                        <span data-accounting-term="payment_method">Payment Method</span>
                                        <select name="payment_method">
                                            <option>Bank Transfer</option>
                                            <option>Cash</option>
                                            <option>QRIS</option>
                                            <option>E-wallet</option>
                                            <option>Card</option>
                                            <option>Other</option>
                                        </select>
                                    </label>
                                    <label>
                                        <span>Receipt URL</span>
                                        <input type="url" name="receipt_url" placeholder="https://...">
                                    </label>
                                    <label>
                                        <span data-accounting-term="receipt_status">Receipt Status</span>
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
                                    <label>
                                        <span data-accounting-term="notes">Notes</span>
                                        <textarea name="notes" rows="3"></textarea>
                                    </label>
                                </div>
                            </details>
                            <p class="admin-form-error" data-accounting-form-error hidden></p>
                            <div class="admin-accounting-form-actions">
                                <button type="reset" class="admin-ghost-btn">Clear</button>
                                <button type="submit" class="admin-primary-btn" data-accounting-save>Save entry</button>
                            </div>
                        </form>
                    </article>
                </section>

                <section class="admin-accounting-panel admin-accounting-panel-wide admin-accounting-ledger" id="accounting-ledger">
                    <div class="admin-panel-head">
                        <div><span class="admin-panel-kicker">One source of truth</span><h3 data-accounting-term="activity_ledger">Activity ledger</h3></div>
                        <span class="admin-panel-meta" data-accounting-ledger-meta>Selected month</span>
                    </div>
                    <div class="admin-accounting-ledger-filters" aria-label="Ledger filters">
                        <label><span>Month</span><input type="month" data-accounting-month-select></label>
                        <label><span>Activity</span><select data-accounting-ledger-impact><option value="all">All activity</option><option value="cash_in">Money in</option><option value="cash_out">Money out</option><option value="obligation">Bills &amp; obligations</option><option value="transfer">Transfers</option></select></label>
                        <label class="admin-accounting-ledger-search"><span>Search entries</span><span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg><input type="search" data-accounting-ledger-search placeholder="Vendor, account, reference…" autocomplete="off"></span></label>
                        <button type="button" class="admin-accounting-filter-clear" data-accounting-ledger-clear>Clear filters</button>
                    </div>
                    <div class="admin-accounting-ledger-list" data-accounting-ledger-body>
                        <p class="admin-empty">Loading ledger.</p>
                    </div>
                </section>

                <details class="admin-accounting-review admin-accounting-panel" id="accounting-review">
                    <summary>
                        <span><b data-accounting-review-count>0</b> items need review</span>
                        <small>Missing receipts, categories, or possible duplicates</small>
                    </summary>
                    <div>
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
                    </div>
                </details>

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

                <div class="admin-modal-shell admin-accounting-breakdown" id="accounting-breakdown" data-accounting-breakdown hidden>
                    <button type="button" class="admin-modal-backdrop" data-accounting-breakdown-close aria-label="Close breakdown"></button>
                    <section class="admin-modal-card admin-accounting-breakdown-card" role="dialog" aria-modal="true" aria-labelledby="accounting-breakdown-title" tabindex="-1">
                        <div class="admin-modal-head">
                            <div>
                                <span class="admin-panel-kicker" data-accounting-breakdown-kicker>Accounting</span>
                                <h3 id="accounting-breakdown-title" data-accounting-breakdown-title>Breakdown</h3>
                                <p data-accounting-breakdown-copy></p>
                            </div>
                            <button type="button" class="admin-accounting-cash-history-close" data-accounting-breakdown-close aria-label="Close breakdown">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>
                            </button>
                        </div>
                        <div class="admin-accounting-breakdown-body" data-accounting-breakdown-body tabindex="0"></div>
                    </section>
                </div>

                <div class="admin-modal-shell admin-accounting-reconcile" data-accounting-reconcile hidden>
                    <button type="button" class="admin-modal-backdrop" data-accounting-reconcile-close aria-label="Close reconciliation"></button>
                    <section class="admin-modal-card admin-accounting-reconcile-card" role="dialog" aria-modal="true" aria-labelledby="accounting-reconcile-title" tabindex="-1">
                        <div class="admin-modal-head">
                            <div>
                                <span class="admin-panel-kicker">Cash count</span>
                                <h3 id="accounting-reconcile-title" data-accounting-reconcile-title>Reconcile balance</h3>
                                <p data-accounting-reconcile-copy>Use the amount you can verify now. Future entries move from this account baseline.</p>
                            </div>
                            <button type="button" class="admin-accounting-cash-history-close" data-accounting-reconcile-close aria-label="Close reconciliation">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>
                            </button>
                        </div>
                        <form data-accounting-reconcile-form>
                            <label>
                                <span>Account</span>
                                <select name="account_id" data-accounting-reconcile-account required></select>
                            </label>
                            <label>
                                <span>Verified balance</span>
                                <input type="text" inputmode="numeric" name="available_cash_amount" data-accounting-reconcile-amount placeholder="Rp0" required>
                            </label>
                            <label>
                                <span>Count note</span>
                                <input type="text" name="note" maxlength="500" placeholder="e.g. Counted at close">
                            </label>
                            <p>Reconciliation is permanent and appears in the ledger. It does not delete earlier records.</p>
                            <p class="admin-form-error" data-accounting-reconcile-error hidden></p>
                            <div>
                                <button type="button" class="admin-ghost-btn" data-accounting-reconcile-close>Cancel</button>
                                <button type="submit" class="admin-primary-btn">Set new baseline</button>
                            </div>
                        </form>
                    </section>
                </div>

                <div class="admin-modal-shell admin-accounting-account-settings" data-accounting-account-settings hidden>
                    <button type="button" class="admin-modal-backdrop" data-accounting-account-settings-close aria-label="Close accounting settings"></button>
                    <section class="admin-modal-card admin-accounting-account-settings-card" role="dialog" aria-modal="true" aria-labelledby="accounting-account-settings-title" tabindex="-1">
                        <div class="admin-modal-head">
                            <div>
                                <span class="admin-panel-kicker">Workspace controls</span>
                                <h3 id="accounting-account-settings-title">Accounting settings</h3>
                                <p>Manage the choices and language your team sees while entering and reviewing money.</p>
                            </div>
                            <button type="button" class="admin-accounting-cash-history-close" data-accounting-account-settings-close aria-label="Close accounting settings">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>
                            </button>
                        </div>
                        <div class="admin-accounting-settings-layout">
                            <nav class="admin-accounting-settings-nav" aria-label="Accounting settings sections">
                                <button type="button" class="is-active" data-accounting-settings-tab="accounts"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5h17v11h-17zM3.5 10.5h17M7 15h4"/></svg><span><strong>Accounts</strong><small>Pay, receive &amp; deposits</small></span></button>
                                <button type="button" data-accounting-settings-tab="categories"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h6v5H4zM14 6h6v5h-6zM4 15h6v5H4zM14 15h6v5h-6z"/></svg><span><strong>Categories</strong><small>Bookkeeping groups</small></span></button>
                                <button type="button" data-accounting-settings-tab="lists"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg><span><strong>Dropdown choices</strong><small>Brands, channels &amp; more</small></span></button>
                                <button type="button" data-accounting-settings-tab="language"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h9M8.5 5v2c0 4-2 7-5 9m3-5c1.2 2 3 3.7 5 5M14 19l3.5-9 3.5 9M15.2 16h4.6"/></svg><span><strong>Language</strong><small>Terms your team uses</small></span></button>
                            </nav>
                            <div class="admin-accounting-settings-content">
                                <section data-accounting-settings-panel="accounts">
                                    <div class="admin-accounting-settings-intro"><h4>Payment accounts</h4><p>Choose which real accounts can pay, receive, and collect automatic deposits. Marketplace wallets stay read-only.</p></div>
                                    <div class="admin-accounting-account-settings-grid">
                                        <div data-accounting-account-list></div>
                                        <form data-accounting-account-form>
                                            <input type="hidden" name="account_id" value="">
                                            <label><span>Account name</span><input type="text" name="name" maxlength="160" placeholder="e.g. BRI Operations" required></label>
                                            <label><span>Balance group</span><select name="balance_class" required><option value="bank">Bank balance</option><option value="cash">Available cash</option></select></label>
                                            <label class="admin-accounting-account-toggle"><input type="checkbox" name="can_pay" value="1"><span>Show in Paid From</span></label>
                                            <label class="admin-accounting-account-toggle"><input type="checkbox" name="can_receive" value="1"><span>Show in Received Into / transfers</span></label>
                                            <label class="admin-accounting-account-toggle"><input type="checkbox" name="receives_automatic" value="1"><span>Automatic online deposits land here</span></label>
                                            <p class="admin-form-error" data-accounting-account-error hidden></p>
                                            <div><button type="button" class="admin-ghost-btn" data-accounting-account-new>New account</button><button type="submit" class="admin-primary-btn">Save account</button></div>
                                        </form>
                                    </div>
                                </section>
                                <section data-accounting-settings-panel="categories" hidden>
                                    <div class="admin-accounting-settings-intro"><h4>Categories</h4><p>Add or refine the bookkeeping categories available on entries and bills.</p></div>
                                    <div data-accounting-category-settings></div>
                                </section>
                                <section data-accounting-settings-panel="lists" hidden>
                                    <div class="admin-accounting-settings-intro"><h4>Dropdown choices</h4><p>Edit labels, add choices, or hide choices your team no longer uses. Existing records are never changed.</p></div>
                                    <form data-accounting-preferences-form="lists"><div data-accounting-option-settings></div><button type="submit" class="admin-primary-btn">Save dropdown choices</button></form>
                                </section>
                                <section data-accounting-settings-panel="language" hidden>
                                    <div class="admin-accounting-settings-intro"><h4>Language</h4><p>Rename the main accounting terms so the interface matches how your team speaks.</p></div>
                                    <form data-accounting-preferences-form="language"><div class="admin-accounting-language-grid" data-accounting-term-settings></div><button type="submit" class="admin-primary-btn">Save language</button></form>
                                </section>
                            </div>
                        </div>
                    </section>
                </div>

                <div class="admin-modal-shell admin-accounting-cash-history" id="accounting-cash-history" data-accounting-cash-history hidden>
                    <button type="button" class="admin-modal-backdrop" data-accounting-cash-history-close aria-label="Close cash history"></button>
                    <section class="admin-modal-card admin-accounting-cash-history-card" role="dialog" aria-modal="true" aria-labelledby="accounting-cash-history-title" tabindex="-1">
                        <div class="admin-modal-head admin-accounting-cash-history-head">
                            <div>
                                <span class="admin-panel-kicker">All-time balance ledger</span>
                                <h3 id="accounting-cash-history-title" data-accounting-cash-history-title>Balance history</h3>
                                <p data-accounting-cash-history-copy>Every addition and subtraction for the selected balance.</p>
                            </div>
                            <button type="button" class="admin-accounting-cash-history-close" data-accounting-cash-history-close aria-label="Close cash history" title="Close">
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M6 6l12 12M18 6 6 18"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="admin-accounting-cash-history-summary" aria-label="Cash history totals">
                            <div><span data-accounting-cash-history-current-label>Current cash</span><strong data-accounting-cash-history-current>Rp0</strong></div>
                            <div><span>Total added</span><strong class="is-added" data-accounting-cash-history-added>Rp0</strong></div>
                            <div><span>Total subtracted</span><strong class="is-subtracted" data-accounting-cash-history-subtracted>Rp0</strong></div>
                        </div>
                        <div class="admin-accounting-cash-history-tools">
                            <label>
                                <span>Balance type</span>
                                <select data-accounting-cash-history-balance-class aria-label="Filter balance history by type">
                                    <option value="all">Bank + cash</option>
                                    <option value="bank">Bank balance</option>
                                    <option value="cash">Available cash</option>
                                </select>
                            </label>
                            <label>
                                <span>Account</span>
                                <select data-accounting-cash-history-account aria-label="Filter cash history by account">
                                    <option value="all">All accounts</option>
                                </select>
                            </label>
                            <label>
                                <span>Movement</span>
                                <select data-accounting-cash-history-direction>
                                    <option value="all">All movements</option>
                                    <option value="added">Additions only</option>
                                    <option value="subtracted">Subtractions only</option>
                                </select>
                            </label>
                            <p data-accounting-cash-history-count>Loading history…</p>
                        </div>
                        <div class="admin-table-wrap admin-accounting-cash-history-table-wrap">
                            <table class="admin-table admin-accounting-cash-history-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Reason</th>
                                        <th>Source</th>
                                        <th class="is-numeric">Amount</th>
                                        <th class="is-numeric">Balance</th>
                                    </tr>
                                </thead>
                                <tbody data-accounting-cash-history-body>
                                    <tr><td colspan="5" class="admin-empty">Loading cash history.</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <p class="admin-accounting-cash-history-note" data-accounting-cash-history-note>Cash history includes the latest reconciliation, posted entries, wallet withdrawals, confirmed website payments, and completed direct orders.</p>
                    </section>
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
