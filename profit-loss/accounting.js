const root = document.querySelector('[data-accounting-page]');

if (root) {
  const DASHBOARD_TIMEZONE = 'Asia/Jakarta';
  const endpoint = root.dataset.accountingEndpoint || '../api/accounting/';
  const ACCOUNTING_CACHE_PREFIX = 'jg-accounting-page-cache-v5';
  const ACCOUNTING_LOOKUPS_CACHE_KEY = 'jg-accounting-lookups-cache-v1';
  const ACCOUNTING_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
  const formatCurrency = (value) => `Rp${Math.round(Number(value) || 0).toLocaleString('id-ID')}`;
  const formatDateParts = (date = new Date(), timezone = DASHBOARD_TIMEZONE) => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date).reduce((carry, part) => {
      carry[part.type] = part.value;
      return carry;
    }, {});
    return {
      year: parts.year || String(date.getFullYear()),
      month: parts.month || String(date.getMonth() + 1).padStart(2, '0'),
      day: parts.day || String(date.getDate()).padStart(2, '0')
    };
  };
  const getDateString = (date = new Date()) => {
    const parts = formatDateParts(date);
    return `${parts.year}-${parts.month}-${parts.day}`;
  };
  const getMonthKey = (date = new Date()) => {
    const parts = formatDateParts(date);
    return `${parts.year}-${parts.month}`;
  };
  const validMonthKey = (value) => /^\d{4}-\d{2}$/.test(String(value || ''));
  const parseMonth = (monthKey) => {
    const [yearRaw, monthRaw] = String(monthKey || getMonthKey()).split('-');
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const safeYear = Number.isFinite(year) ? year : Number(getMonthKey().slice(0, 4));
    const safeMonth = Number.isFinite(month) ? Math.max(1, Math.min(12, month)) : Number(getMonthKey().slice(5, 7));
    const endDay = new Date(Date.UTC(safeYear, safeMonth, 0)).getUTCDate();
    return {
      year: safeYear,
      month: safeMonth,
      start: `${safeYear}-${String(safeMonth).padStart(2, '0')}-01`,
      end: `${safeYear}-${String(safeMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
    };
  };
  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json', ...(options.headers || {}) },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      const apiMessage = Array.isArray(payload.errors) && payload.errors[0]?.message
        ? payload.errors[0].message
        : '';
      throw new Error(apiMessage || payload.error || `HTTP ${response.status}`);
    }
    return payload;
  };

  const readCacheEntry = (key, maxAgeMs = ACCOUNTING_CACHE_MAX_AGE_MS) => {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const entry = JSON.parse(raw);
      const savedAt = Number(entry?.savedAt || 0);
      if (!entry || !entry.data || !savedAt) return null;
      if (maxAgeMs > 0 && Date.now() - savedAt > maxAgeMs) return null;
      return { data: entry.data, savedAt };
    } catch (_error) {
      return null;
    }
  };

  const writeCacheEntry = (key, data) => {
    try {
      window.localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
    } catch (_error) {
      try {
        window.localStorage.removeItem(key);
      } catch (_removeError) {
        // Storage can be unavailable in private browsing or strict browser modes.
      }
    }
  };

  const state = {
    month: getMonthKey(),
    range: 'this_month',
    mode: 'expense_paid',
    insightTab: 'category',
    summary: null,
    bills: [],
    transactions: [],
    ledger: [],
    reviewQueue: [],
    accounts: [],
    categories: [],
    counterparties: [],
    lookupsLoaded: false,
    cashHistory: [],
    cashHistorySummary: {},
    cashHistoryLoaded: false
  };

  const refs = {
    view: root.querySelector('[data-accounting-view]'),
    status: root.querySelector('[data-accounting-status]'),
    refresh: root.querySelector('[data-accounting-refresh]'),
    monthInput: root.querySelector('[data-accounting-month-select]'),
    previousMonth: root.querySelector('[data-accounting-previous-month]'),
    currentMonth: root.querySelector('[data-accounting-current-month]'),
    dateFrom: root.querySelector('[data-accounting-date-from]'),
    dateTo: root.querySelector('[data-accounting-date-to]'),
    rangeButtons: root.querySelectorAll('[data-accounting-range]'),
    openModeButtons: root.querySelectorAll('[data-accounting-open-mode]'),
    exportButton: root.querySelector('[data-accounting-export]'),
    cashRecordsExportButton: root.querySelector('[data-accounting-cash-records-export]'),
    settingsButton: root.querySelector('[data-accounting-settings]'),
    kpis: {
      realCash: root.querySelector('[data-accounting-kpi="real-cash"]'),
      marketplaceOutstanding: root.querySelector('[data-accounting-kpi="marketplace-outstanding"]'),
      billsDue: root.querySelector('[data-accounting-kpi="bills-due"]'),
      overdue: root.querySelector('[data-accounting-kpi="overdue"]'),
      expenses: root.querySelector('[data-accounting-kpi="expenses"]'),
      safeCash: root.querySelector('[data-accounting-kpi="safe-cash"]'),
      pendingReview: root.querySelector('[data-accounting-kpi="pending-review"]')
    },
    safeCashCard: root.querySelector('[data-accounting-safe-cash-card]'),
    cashHistoryOpenButtons: root.querySelectorAll('[data-accounting-cash-history-open]'),
    cashHistory: root.querySelector('[data-accounting-cash-history]'),
    cashHistoryCard: root.querySelector('.admin-accounting-cash-history-card'),
    cashHistoryCloseButtons: root.querySelectorAll('[data-accounting-cash-history-close]'),
    cashHistoryBody: root.querySelector('[data-accounting-cash-history-body]'),
    cashHistoryPlatform: root.querySelector('[data-accounting-cash-history-platform]'),
    cashHistoryAccount: root.querySelector('[data-accounting-cash-history-account]'),
    cashHistoryDirection: root.querySelector('[data-accounting-cash-history-direction]'),
    cashHistoryCount: root.querySelector('[data-accounting-cash-history-count]'),
    cashHistoryCurrentLabel: root.querySelector('[data-accounting-cash-history-current-label]'),
    cashHistoryCurrent: root.querySelector('[data-accounting-cash-history-current]'),
    cashHistoryAdded: root.querySelector('[data-accounting-cash-history-added]'),
    cashHistorySubtracted: root.querySelector('[data-accounting-cash-history-subtracted]'),
    cashHistoryNote: root.querySelector('[data-accounting-cash-history-note]'),
    pulseCash: root.querySelector('[data-accounting-pulse-cash]'),
    reconciliationCopy: root.querySelector('[data-accounting-reconciliation-copy]'),
    walletBreakdown: root.querySelector('[data-accounting-wallet-breakdown]'),
    walletsMeta: root.querySelector('[data-accounting-wallets-meta]'),
    marketplaceOpen: root.querySelector('[data-accounting-marketplace-open]'),
    billsOpenButtons: root.querySelectorAll('[data-accounting-bills-open]'),
    breakdown: root.querySelector('[data-accounting-breakdown]'),
    breakdownCard: root.querySelector('.admin-accounting-breakdown-card'),
    breakdownCloseButtons: root.querySelectorAll('[data-accounting-breakdown-close]'),
    breakdownKicker: root.querySelector('[data-accounting-breakdown-kicker]'),
    breakdownTitle: root.querySelector('[data-accounting-breakdown-title]'),
    breakdownCopy: root.querySelector('[data-accounting-breakdown-copy]'),
    breakdownBody: root.querySelector('[data-accounting-breakdown-body]'),
    reconcile: root.querySelector('[data-accounting-reconcile]'),
    reconcileCard: root.querySelector('.admin-accounting-reconcile-card'),
    reconcileOpen: root.querySelector('[data-accounting-reconcile-open]'),
    reconcileCloseButtons: root.querySelectorAll('[data-accounting-reconcile-close]'),
    reconcileForm: root.querySelector('[data-accounting-reconcile-form]'),
    reconcileAmount: root.querySelector('[data-accounting-reconcile-amount]'),
    reconcileError: root.querySelector('[data-accounting-reconcile-error]'),
    alerts: root.querySelector('[data-accounting-alerts]'),
    form: root.querySelector('[data-accounting-form]'),
    formStatus: root.querySelector('[data-accounting-form-status]'),
    formError: root.querySelector('[data-accounting-form-error]'),
    modeButtons: root.querySelectorAll('[data-accounting-quick-mode]'),
    modeSelect: root.querySelector('[data-accounting-mode-select]'),
    modeField: root.querySelector('[data-accounting-mode-field]'),
    modeHelper: root.querySelector('[data-accounting-mode-helper]'),
    marketplaceWarning: root.querySelector('[data-accounting-marketplace-warning]'),
    dateInput: root.querySelector('[data-accounting-date]'),
    issueDateInput: root.querySelector('[data-accounting-issue-date]'),
    amountInput: root.querySelector('[data-accounting-amount]'),
    transferFeeInput: root.querySelector('[name="transfer_fee_amount"]'),
    accountSelect: root.querySelector('[data-accounting-account-select]'),
    toAccountSelect: root.querySelector('[data-accounting-to-account-select]'),
    categorySelect: root.querySelector('[data-accounting-category-select]'),
    counterpartyInput: root.querySelector('[data-accounting-counterparty-input]'),
    counterpartyOptions: root.querySelector('[data-accounting-counterparty-options]'),
    billSelect: root.querySelector('[data-accounting-bill-select]'),
    brandSelect: root.querySelector('[data-accounting-brand-select]'),
    channelSelect: root.querySelector('[data-accounting-channel-select]'),
    incomeType: root.querySelector('[data-accounting-income-type]'),
    billsBody: root.querySelector('[data-accounting-bills-body]'),
    transactionsBody: root.querySelector('[data-accounting-transactions-body]'),
    ledgerBody: root.querySelector('[data-accounting-ledger-body]'),
    reviewBody: root.querySelector('[data-accounting-review-body]'),
    billsMeta: root.querySelector('[data-accounting-bills-meta]'),
    ledgerMeta: root.querySelector('[data-accounting-ledger-meta]'),
    reviewCount: root.querySelector('[data-accounting-review-count]'),
    monthlySummary: root.querySelector('[data-accounting-monthly-summary]'),
    insightTabs: root.querySelectorAll('[data-accounting-insight-tab]'),
    insights: root.querySelector('[data-accounting-insights]'),
    drawer: root.querySelector('[data-accounting-drawer]'),
    drawerCloseButtons: root.querySelectorAll('[data-accounting-drawer-close]'),
    drawerKicker: root.querySelector('[data-accounting-drawer-kicker]'),
    drawerTitle: root.querySelector('[data-accounting-drawer-title]'),
    drawerBody: root.querySelector('[data-accounting-drawer-body]')
  };

  const buildUrl = (action, options = {}) => {
    const params = new URLSearchParams({
      action,
      month: options.month || state.month
    });
    [
      'date_from',
      'date_to',
      'due_from',
      'due_to',
      'status',
      'type',
      'search',
      'include_voided',
      'review_status',
      'brand',
      'channel',
      'transaction_id',
      'bill_id'
    ].forEach((key) => {
      if (options[key]) params.set(key, options[key]);
    });
    if (options.cacheBust) params.set('_ts', String(Date.now()));
    return `${endpoint}?${params.toString()}`;
  };

  const lastMonthKey = () => {
    const range = parseMonth(state.month);
    const date = new Date(Date.UTC(range.year, range.month - 2, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  };

  const rangeOptions = () => {
    const range = parseMonth(state.month);
    if (state.range === 'last_month') {
      const previousMonth = lastMonthKey();
      const previous = parseMonth(previousMonth);
      return { month: previousMonth, date_from: previous.start, date_to: previous.end };
    }
    if (state.range === 'ytd') {
      return { month: state.month, date_from: `${range.year}-01-01`, date_to: range.end };
    }
    if (state.range === 'custom') {
      return {
        month: state.month,
        date_from: refs.dateFrom?.value || '',
        date_to: refs.dateTo?.value || ''
      };
    }
    return { month: state.month };
  };

  const accountingCacheKey = (options = rangeOptions()) => {
    const params = new URLSearchParams({
      range: state.range,
      month: options.month || state.month,
      date_from: options.date_from || '',
      date_to: options.date_to || ''
    });
    return `${ACCOUNTING_CACHE_PREFIX}:${params.toString()}`;
  };

  const getLookupPayload = () => ({
    accounts: state.accounts,
    categories: state.categories,
    counterparties: state.counterparties
  });

  const applyLookupsPayload = (payload, { renderControls = true } = {}) => {
    if (!payload || !Array.isArray(payload.accounts) || !Array.isArray(payload.categories) || !Array.isArray(payload.counterparties)) {
      return false;
    }
    state.accounts = payload.accounts;
    state.categories = payload.categories;
    state.counterparties = payload.counterparties;
    state.lookupsLoaded = true;
    if (renderControls) renderLookups();
    return true;
  };

  const applyAccountingPayload = (payload, renderOptions = {}) => {
    state.summary = payload?.summary || {};
    state.bills = Array.isArray(payload?.bills) ? payload.bills : [];
    state.transactions = Array.isArray(payload?.transactions) ? payload.transactions : [];
    state.ledger = Array.isArray(payload?.ledger) ? payload.ledger : [];
    state.reviewQueue = Array.isArray(payload?.reviewQueue) ? payload.reviewQueue : [];
    applyLookupsPayload(payload?.lookups, { renderControls: false });
    render(renderOptions);
  };

  const amountInputToRaw = (value) => String(value || '').replace(/[^0-9]/g, '');
  const normalizeAmountInput = (value) => {
    const raw = amountInputToRaw(value);
    return raw ? formatCurrency(raw) : '';
  };
  const statusClass = (status) => `admin-accounting-chip admin-accounting-chip-${String(status || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const option = (value, label, selected = false) => `<option value="${escapeHtml(String(value))}"${selected ? ' selected' : ''}>${escapeHtml(label)}</option>`;

  const modeConfig = {
    expense_paid: {
      helper: 'Money out from a business account.',
      action: 'create_transaction',
      type: 'expense',
      direction: 'money_out',
      shown: ['transaction_date', 'account_id', 'category_id', 'counterparty']
    },
    bill_received: {
      helper: 'Supplier invoice saved before payment.',
      action: 'create_bill',
      shown: ['issue_date', 'due_date', 'category_id', 'counterparty', 'bill_no']
    },
    pay_bill: {
      helper: 'Payment against an open bill.',
      action: 'mark_bill_paid',
      shown: ['transaction_date', 'bill_id', 'account_id']
    },
    customer_refund: {
      helper: 'Money returned to a customer. Add the order number or reference so it can be traced.',
      action: 'create_transaction',
      type: 'refund',
      direction: 'money_out',
      shown: ['transaction_date', 'account_id', 'category_id', 'counterparty']
    },
    transfer: {
      helper: 'Internal movement between accounts.',
      action: 'create_transaction',
      type: 'transfer',
      direction: 'internal_transfer',
      shown: ['transaction_date', 'account_id', 'to_account_id', 'transfer_fee_amount']
    },
    manual_income: {
      helper: 'Non-marketplace money in.',
      action: 'create_transaction',
      type: 'manual_income',
      direction: 'money_in',
      shown: ['transaction_date', 'account_id', 'category_id', 'counterparty', 'income_type'],
      warning: true
    }
  };

  const showToast = (message, isError = false) => {
    let toast = root.querySelector('[data-accounting-toast]');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'admin-accounting-toast';
      toast.dataset.accountingToast = '';
      (refs.view || root).appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.toggle('is-error', isError);
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      toast.hidden = true;
    }, 3000);
  };

  const setFormError = (message = '') => {
    if (!refs.formError) return;
    refs.formError.hidden = !message;
    refs.formError.textContent = message;
    if (message) showToast(message, true);
  };

  const renderLookups = () => {
    const accounts = state.accounts;
    const categories = state.categories.filter((item) => item.parent_id !== null || Number(item.is_billable) === 1);
    const openBills = state.bills.filter((bill) => ['unpaid', 'partially_paid', 'overdue'].includes(String(bill.status || '')));
    const selectedAccount = refs.accountSelect?.value || '';
    const selectedToAccount = refs.toAccountSelect?.value || '';
    const selectedCategory = refs.categorySelect?.value || '';
    const selectedBill = refs.billSelect?.value || '';
    const accountOptions = [
      option('', 'Choose account'),
      ...accounts.map((account) => option(account.id, `${account.name}${Number(account.is_spendable) ? '' : ' (not spendable)'}`))
    ].join('');
    if (refs.accountSelect) {
      refs.accountSelect.innerHTML = accountOptions;
      refs.accountSelect.value = accounts.some((account) => String(account.id) === selectedAccount) ? selectedAccount : '';
    }
    if (refs.toAccountSelect) {
      refs.toAccountSelect.innerHTML = accountOptions;
      refs.toAccountSelect.value = accounts.some((account) => String(account.id) === selectedToAccount) ? selectedToAccount : '';
    }
    if (refs.categorySelect) {
      refs.categorySelect.innerHTML = [
        option('', 'Choose category'),
        ...categories.map((category) => option(category.id, category.parent_name ? `${category.parent_name} - ${category.name}` : category.name))
      ].join('');
      refs.categorySelect.value = categories.some((category) => String(category.id) === selectedCategory) ? selectedCategory : '';
    }
    if (refs.billSelect) {
      refs.billSelect.innerHTML = [
        option('', 'Choose bill'),
        ...openBills.map((bill) => option(bill.id, `${bill.vendor_name || 'Vendor'} - ${bill.bill_no || bill.bill_key} - ${formatCurrency(bill.outstanding_amount || 0)}`))
      ].join('');
      refs.billSelect.value = openBills.some((bill) => String(bill.id) === selectedBill) ? selectedBill : '';
    }
    if (refs.counterpartyOptions) {
      refs.counterpartyOptions.innerHTML = state.counterparties
        .map((item) => `<option value="${escapeHtml(item.name || '')}"></option>`)
        .join('');
    }
  };

  const setMode = (mode) => {
    const nextMode = modeConfig[mode] ? mode : 'expense_paid';
    state.mode = nextMode;
    const config = modeConfig[nextMode];
    if (refs.modeField) refs.modeField.value = nextMode;
    if (refs.modeSelect) refs.modeSelect.value = nextMode;
    if (refs.modeHelper) refs.modeHelper.textContent = config.helper;
    if (refs.marketplaceWarning) refs.marketplaceWarning.hidden = !config.warning;
    refs.modeButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.accountingQuickMode === nextMode);
    });
    refs.openModeButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.accountingOpenMode === nextMode);
    });
    root.querySelectorAll('[data-accounting-field]').forEach((field) => {
      const key = field.getAttribute('data-accounting-field') || '';
      field.hidden = !config.shown.includes(key);
      field.querySelectorAll('input, select, textarea').forEach((input) => {
        if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement || input instanceof HTMLTextAreaElement)) return;
        input.required = !field.hidden && ['account_id', 'category_id', 'counterparty', 'bill_id', 'issue_date', 'due_date'].includes(key);
      });
    });
    if (refs.accountSelect) {
      const label = refs.accountSelect.closest('label')?.querySelector('span');
      if (label) {
        label.textContent = nextMode === 'manual_income'
          ? 'Received Into Account'
          : (nextMode === 'transfer' ? 'From Account' : 'Paid From Account');
      }
    }
    if (refs.counterpartyInput) {
      refs.counterpartyInput.placeholder = nextMode === 'manual_income' ? 'Source / customer' : 'Search or quick-create';
    }
    setFormError('');
  };

  let resettingForm = false;
  const resetForm = () => {
    if (resettingForm) return;
    resettingForm = true;
    try {
      refs.form?.reset();
      const today = getDateString();
      if (refs.dateInput) refs.dateInput.value = today;
      if (refs.issueDateInput) refs.issueDateInput.value = today;
      if (refs.amountInput) refs.amountInput.value = '';
      if (refs.transferFeeInput) refs.transferFeeInput.value = '';
      if (refs.brandSelect) refs.brandSelect.value = 'General / Shared';
      if (refs.channelSelect) refs.channelSelect.value = 'Internal';
      renderLookups();
      setMode(state.mode);
    } finally {
      resettingForm = false;
    }
  };

  const renderKpis = (summary) => {
    const kpis = summary?.kpis || {};
    if (refs.kpis.realCash) refs.kpis.realCash.textContent = formatCurrency(kpis.real_cash_available || 0);
    if (refs.pulseCash) refs.pulseCash.textContent = formatCurrency(kpis.real_cash_available || 0);
    if (refs.kpis.marketplaceOutstanding) {
      refs.kpis.marketplaceOutstanding.textContent = summary?.marketplace_outstanding_context?.available === false
        ? 'Unavailable'
        : formatCurrency(kpis.marketplace_outstanding || 0);
    }
    if (refs.kpis.billsDue) refs.kpis.billsDue.textContent = formatCurrency(kpis.bills_due_soon || 0);
    if (refs.kpis.overdue) refs.kpis.overdue.textContent = formatCurrency(kpis.overdue_bills || 0);
    if (refs.kpis.expenses) refs.kpis.expenses.textContent = formatCurrency(kpis.expenses_this_month || 0);
    if (refs.kpis.safeCash) refs.kpis.safeCash.textContent = formatCurrency(kpis.net_safe_cash || 0);
    if (refs.kpis.pendingReview) refs.kpis.pendingReview.textContent = Number(kpis.pending_manual_review || 0).toLocaleString('id-ID');
    refs.safeCashCard?.classList.toggle('is-danger', Number(kpis.net_safe_cash || 0) < 0);
    const reconciliation = summary?.cash_reconciliation;
    if (refs.reconciliationCopy) {
      refs.reconciliationCopy.textContent = reconciliation
        ? `Baseline set ${formatHistoryDate(String(reconciliation.reconciled_at || '').slice(0, 10))}; later entries move from that count.`
        : 'Built from opening balances and every confirmed movement. Reconcile after your next cash count.';
    }
    renderWalletBreakdown(summary);
  };

  const renderWalletBreakdown = (summary) => {
    if (!refs.walletBreakdown) return;
    const wallets = Array.isArray(summary?.wallet_breakdown) ? summary.wallet_breakdown : [];
    if (refs.walletsMeta) {
      refs.walletsMeta.textContent = wallets.length
        ? `${wallets.length.toLocaleString('id-ID')} connected`
        : 'No live balance yet';
    }
    if (!wallets.length) {
      refs.walletBreakdown.innerHTML = '<p class="admin-empty">Wallet balances appear after the first Wallet sync.</p>';
      return;
    }
    refs.walletBreakdown.innerHTML = wallets.map((wallet) => `
      <div class="admin-accounting-wallet">
        <span>${escapeHtml(wallet.label || wallet.account_key || 'Wallet')}</span>
        <strong>${wallet.current_balance === null ? '—' : formatCurrency(wallet.current_balance || 0)}</strong>
        <small>${Number(wallet.outstanding_amount || 0) > 0 ? `${formatCurrency(wallet.outstanding_amount)} outstanding` : 'No outstanding orders'}</small>
      </div>
    `).join('');
  };

  const formatHistoryDate = (value) => {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return 'Opening';
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(date);
  };

  const populateCashHistoryPlatforms = () => {
    if (!refs.cashHistoryPlatform) return;
    const selected = refs.cashHistoryPlatform.value || 'all';
    const platforms = new Map([
      ['shopee', 'Shopee'],
      ['tiktok', 'TikTok'],
      ['tokopedia', 'Tokopedia'],
      ['jenang-gemi-website', 'Jenang Gemi Website'],
      ['zero-website', 'ZERO Website']
    ]);
    state.cashHistory.forEach((row) => {
      const key = String(row.platform || '').trim();
      if (key) platforms.set(key, String(row.platform_label || key));
    });
    const preferredOrder = ['shopee', 'tiktok', 'tokopedia', 'jenang-gemi-website', 'zero-website', 'zfit-website', 'website', 'whatsapp'];
    const entries = [...platforms.entries()].sort(([leftKey, leftLabel], [rightKey, rightLabel]) => {
      const leftIndex = preferredOrder.indexOf(leftKey);
      const rightIndex = preferredOrder.indexOf(rightKey);
      if (leftIndex !== rightIndex) {
        return (leftIndex < 0 ? preferredOrder.length : leftIndex) - (rightIndex < 0 ? preferredOrder.length : rightIndex);
      }
      return leftLabel.localeCompare(rightLabel);
    });
    refs.cashHistoryPlatform.innerHTML = [
      '<option value="all">All platforms</option>',
      ...entries.map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`)
    ].join('');
    refs.cashHistoryPlatform.value = platforms.has(selected) ? selected : 'all';
  };

  const renderCashHistory = () => {
    if (!refs.cashHistoryBody) return;
    const selectedPlatform = refs.cashHistoryPlatform?.value || 'all';
    const selectedAccount = refs.cashHistoryAccount?.value || 'all';
    const direction = refs.cashHistoryDirection?.value || 'all';
    const scopedRows = state.cashHistory.filter((row) => {
      if (selectedPlatform !== 'all' && String(row.platform || '') !== selectedPlatform) return false;
      if (selectedAccount !== 'all' && String(row.cash_account || '') !== selectedAccount) return false;
      return true;
    });
    const rows = scopedRows.filter((row) => {
      if (direction === 'added' && Number(row.amount_added || 0) <= 0) return false;
      if (direction === 'subtracted' && Number(row.amount_subtracted || 0) <= 0) return false;
      return true;
    });
    const filteredSummary = scopedRows.reduce((summary, row) => {
      summary.total_added += Number(row.amount_added || 0);
      summary.total_subtracted += Number(row.amount_subtracted || 0);
      return summary;
    }, { total_added: 0, total_subtracted: 0 });
    filteredSummary.current_cash = filteredSummary.total_added - filteredSummary.total_subtracted;
    const hasSourceFilter = selectedPlatform !== 'all' || selectedAccount !== 'all';
    const summary = hasSourceFilter ? filteredSummary : (state.cashHistorySummary || {});
    const filteredRunningBalances = new Map();
    if (hasSourceFilter) {
      let runningBalance = 0;
      [...scopedRows].reverse().forEach((row) => {
        runningBalance += Number(row.amount_added || 0) - Number(row.amount_subtracted || 0);
        filteredRunningBalances.set(String(row.id || ''), runningBalance);
      });
    }
    if (refs.cashHistoryCurrent) refs.cashHistoryCurrent.textContent = formatCurrency(summary.current_cash || 0);
    if (refs.cashHistoryCurrentLabel) {
      refs.cashHistoryCurrentLabel.textContent = hasSourceFilter ? 'Net filtered cash' : 'Current cash';
    }
    if (refs.cashHistoryAdded) refs.cashHistoryAdded.textContent = formatCurrency(summary.total_added || 0);
    if (refs.cashHistorySubtracted) refs.cashHistorySubtracted.textContent = formatCurrency(summary.total_subtracted || 0);
    if (refs.cashHistoryCount) {
      refs.cashHistoryCount.textContent = `${rows.length.toLocaleString('id-ID')} of ${scopedRows.length.toLocaleString('id-ID')} entries`;
    }
    if (refs.cashHistoryNote) {
      if (hasSourceFilter) {
        const platformLabel = selectedPlatform === 'all'
          ? 'all platforms'
          : (refs.cashHistoryPlatform?.selectedOptions?.[0]?.textContent || 'selected platform');
        const accountLabel = selectedAccount === 'all'
          ? 'all accounts'
          : (refs.cashHistoryAccount?.selectedOptions?.[0]?.textContent || 'selected account');
        refs.cashHistoryNote.textContent = `Showing bank cash movements for ${platformLabel} and ${accountLabel}. Totals and running balances use only this selection.`;
      } else {
        const cardCash = Number(state.summary?.kpis?.real_cash_available || 0);
        const historyCash = Number(state.cashHistorySummary?.current_cash || 0);
        refs.cashHistoryNote.textContent = cardCash === historyCash
          ? 'The running balance reconciles to Cash Available, including the latest cash count, entries, wallet payouts, website payments, and completed direct orders.'
          : 'Cash history includes the latest cash count and every later manual or automatic movement.';
      }
    }
    if (!rows.length) {
      refs.cashHistoryBody.innerHTML = `<tr><td colspan="5" class="admin-empty">${state.cashHistory.length ? 'No cash movements match these filters.' : 'No additions or subtractions have been recorded yet.'}</td></tr>`;
      return;
    }
    refs.cashHistoryBody.innerHTML = rows.map((row) => {
      const added = Number(row.amount_added || 0);
      const subtracted = Number(row.amount_subtracted || 0);
      const isAddition = added > 0;
      const movementAmount = isAddition ? added : subtracted;
      const runningBalance = !hasSourceFilter
        ? Number(row.running_balance || 0)
        : Number(filteredRunningBalances.get(String(row.id || '')) || 0);
      return `
        <tr>
          <td><strong>${escapeHtml(formatHistoryDate(row.date))}</strong></td>
          <td><strong>${escapeHtml(row.reason || 'Cash movement')}</strong></td>
          <td><span>${escapeHtml(row.source || '-')}</span>${row.reference ? `<small class="admin-table-note">${escapeHtml(row.reference)}</small>` : ''}</td>
          <td class="is-numeric cash-movement-amount ${isAddition ? 'is-added' : 'is-subtracted'}">${isAddition ? '+' : '−'}${formatCurrency(movementAmount)}</td>
          <td class="is-numeric"><strong>${formatCurrency(runningBalance)}</strong></td>
        </tr>
      `;
    }).join('');
  };

  const closeCashHistory = () => {
    if (!refs.cashHistory || refs.cashHistory.hidden) return;
    refs.cashHistory.hidden = true;
    refs.cashHistoryOpenButtons[0]?.focus();
  };

  const openCashHistory = async () => {
    if (!refs.cashHistory) return;
    refs.cashHistory.hidden = false;
    refs.cashHistoryCard?.focus();
    if (state.cashHistoryLoaded) renderCashHistory();
    if (refs.cashHistoryCount) refs.cashHistoryCount.textContent = state.cashHistoryLoaded ? 'Refreshing history…' : 'Loading history…';
    if (!state.cashHistoryLoaded && refs.cashHistoryBody) {
      refs.cashHistoryBody.innerHTML = '<tr><td colspan="5" class="admin-empty">Loading cash history.</td></tr>';
    }
    try {
      const payload = await requestJson(buildUrl('cash_history', { cacheBust: true }));
      state.cashHistory = Array.isArray(payload.data?.rows) ? payload.data.rows : [];
      state.cashHistorySummary = payload.data?.summary || {};
      state.cashHistoryLoaded = true;
      populateCashHistoryPlatforms();
      renderCashHistory();
    } catch (error) {
      if (refs.cashHistoryCount) refs.cashHistoryCount.textContent = 'History unavailable';
      if (refs.cashHistoryBody) refs.cashHistoryBody.innerHTML = `<tr><td colspan="5" class="admin-empty">${escapeHtml(error?.message || 'Unable to load cash history.')}</td></tr>`;
    }
  };

  const closeBreakdown = () => {
    if (!refs.breakdown) return;
    refs.breakdown.hidden = true;
  };

  const openBreakdown = ({ kicker, title, copy, rows, empty }) => {
    if (!refs.breakdown || !refs.breakdownBody) return;
    if (refs.breakdownKicker) refs.breakdownKicker.textContent = kicker;
    if (refs.breakdownTitle) refs.breakdownTitle.textContent = title;
    if (refs.breakdownCopy) refs.breakdownCopy.textContent = copy;
    refs.breakdownBody.innerHTML = rows.length ? rows.join('') : `<p class="admin-empty">${escapeHtml(empty)}</p>`;
    refs.breakdown.hidden = false;
    refs.breakdownCard?.focus();
  };

  const openMarketplaceBreakdown = () => {
    const wallets = Array.isArray(state.summary?.wallet_breakdown) ? state.summary.wallet_breakdown : [];
    openBreakdown({
      kicker: 'Marketplace receivable',
      title: 'Outstanding by wallet',
      copy: 'Orders stay here until their funds are released. A wallet payout moves into available cash automatically.',
      empty: 'No outstanding marketplace orders or wallet balances are available.',
      rows: wallets.map((wallet) => `
        <div class="admin-accounting-breakdown-row">
          <span><strong>${escapeHtml(wallet.label || wallet.account_key || 'Wallet')}</strong><small>${Number(wallet.order_count || 0).toLocaleString('id-ID')} unreleased orders</small></span>
          <span><small>Wallet now</small><strong>${wallet.current_balance === null ? '—' : formatCurrency(wallet.current_balance || 0)}</strong></span>
          <span><small>Outstanding</small><strong>${formatCurrency(wallet.outstanding_amount || 0)}</strong></span>
        </div>
      `)
    });
  };

  const addDays = (dateString, days) => {
    const [year, month, day] = String(dateString).split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + days));
    return date.toISOString().slice(0, 10);
  };

  const openBillsBreakdown = (kind) => {
    const today = getDateString();
    const soon = addDays(today, 7);
    const bills = state.bills.filter((bill) => {
      const due = String(bill.due_date || '');
      if (!due) return false;
      return kind === 'overdue' ? due < today : due >= today && due <= soon;
    });
    const title = kind === 'overdue' ? 'Overdue bills' : 'Bills due in 7 days';
    const rows = bills.map((bill) => `
      <button type="button" class="admin-accounting-breakdown-row" data-accounting-breakdown-bill="${escapeHtml(String(bill.id))}">
        <span><strong>${escapeHtml(bill.vendor_name || 'Supplier')}</strong><small>${escapeHtml(bill.bill_no || bill.bill_key || 'No reference')}</small></span>
        <span><small>Due</small><strong>${escapeHtml(formatHistoryDate(bill.due_date || ''))}</strong></span>
        <span><small>Outstanding</small><strong>${formatCurrency(bill.outstanding_amount || 0)}</strong></span>
      </button>
    `);
    const partnerDue = Number(state.summary?.kpis?.partner_bills_due || 0);
    if (kind === 'due' && partnerDue > 0) {
      rows.push(`
        <div class="admin-accounting-breakdown-row">
          <span><strong>Partner weekly bills</strong><small>Receivable from partners · managed in notifications</small></span>
          <span><small>Type</small><strong>Money in</strong></span>
          <span><small>Outstanding</small><strong>${formatCurrency(partnerDue)}</strong></span>
        </div>
      `);
    }
    openBreakdown({
      kicker: 'Cash commitments',
      title,
      copy: kind === 'overdue'
        ? 'These bills need action now. Open one to pay it or correct its details.'
        : 'These are the supplier bills that affect your next seven days.',
      empty: kind === 'overdue' ? 'No overdue bills.' : 'No bills are due in the next seven days.',
      rows
    });
  };

  const closeReconcile = () => {
    if (!refs.reconcile) return;
    refs.reconcile.hidden = true;
    if (refs.reconcileError) refs.reconcileError.hidden = true;
  };

  const openReconcile = () => {
    if (!refs.reconcile) return;
    if (refs.reconcileAmount) {
      refs.reconcileAmount.value = normalizeAmountInput(String(state.summary?.kpis?.real_cash_available || 0));
    }
    refs.reconcile.hidden = false;
    refs.reconcileCard?.focus();
    refs.reconcileAmount?.focus();
  };

  const submitReconciliation = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) return;
    const data = new FormData(form);
    const amount = amountInputToRaw(data.get('available_cash_amount'));
    if (amount === '') {
      if (refs.reconcileError) {
        refs.reconcileError.hidden = false;
        refs.reconcileError.textContent = 'Enter the cash amount you verified.';
      }
      return;
    }
    try {
      await requestJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reconcile_cash',
          available_cash_amount: amount,
          note: String(data.get('note') || '').trim()
        })
      });
      closeReconcile();
      state.cashHistoryLoaded = false;
      showToast('Cash baseline reconciled.');
      await loadAccounting(true);
    } catch (error) {
      if (refs.reconcileError) {
        refs.reconcileError.hidden = false;
        refs.reconcileError.textContent = error?.message || 'Unable to reconcile cash.';
      }
    }
  };

  const renderAlerts = (summary) => {
    if (!refs.alerts) return;
    const alerts = Array.isArray(summary?.alerts) ? summary.alerts : [];
    if (!alerts.length) {
      refs.alerts.innerHTML = '<div class="admin-accounting-alert"><strong>No alerts</strong><span>Checks appear after data loads.</span></div>';
      return;
    }
    refs.alerts.innerHTML = alerts.map((alert) => {
      const title = String(alert.title || '');
      const billKind = /overdue/i.test(title) ? 'overdue' : (/due/i.test(title) ? 'due' : '');
      return `
      <button type="button" class="admin-accounting-alert admin-accounting-alert-${escapeHtml(alert.type || 'info')}" ${billKind ? `data-accounting-alert-bills="${billKind}"` : 'data-accounting-alert-target="accounting-review"'}>
        <strong>${escapeHtml(alert.title || 'Alert')}</strong>
        <span>${Number(alert.amount || 0) > 0 ? formatCurrency(alert.amount) : escapeHtml(alert.action || 'Review')}</span>
      </button>
    `;
    }).join('');
  };

  const renderBills = () => {
    if (!refs.billsBody) return;
    const bills = state.bills;
    if (refs.billsMeta) refs.billsMeta.textContent = `${bills.length.toLocaleString('id-ID')} bills loaded`;
    if (!bills.length) {
      refs.billsBody.innerHTML = '<tr><td colspan="13" class="admin-empty">No unpaid bills. Add a bill when supplier invoices arrive.</td></tr>';
      renderLookups();
      return;
    }
    refs.billsBody.innerHTML = bills.map((bill) => `
      <tr class="${bill.status === 'overdue' ? 'is-overdue' : ''}" data-accounting-bill-row="${escapeHtml(String(bill.id))}">
        <td><strong>${escapeHtml(bill.due_date || '-')}</strong><small class="admin-table-note">${escapeHtml(bill.issue_date || '')}</small></td>
        <td><span class="${statusClass(bill.status)}">${escapeHtml(bill.status || '-')}</span></td>
        <td>${escapeHtml(bill.vendor_name || '-')}</td>
        <td>${escapeHtml(bill.bill_no || bill.bill_key || '-')}</td>
        <td>${escapeHtml(bill.category_name || '-')}</td>
        <td>${escapeHtml(bill.brand || 'General / Shared')}</td>
        <td>${escapeHtml(bill.channel || 'Internal')}</td>
        <td>${formatCurrency(bill.total_amount || 0)}</td>
        <td>${formatCurrency(bill.paid_amount || 0)}</td>
        <td><strong>${formatCurrency(bill.outstanding_amount || 0)}</strong></td>
        <td>${Number(bill.age_days || 0).toLocaleString('id-ID')}d</td>
        <td><span class="${statusClass(bill.receipt_status)}">${escapeHtml(bill.receipt_status || 'missing')}</span></td>
        <td>
          <div class="admin-accounting-row-actions">
            <button type="button" class="admin-soft-btn" data-accounting-pay-bill="${escapeHtml(String(bill.id))}">Pay</button>
            <button type="button" class="admin-ghost-btn" data-accounting-view-bill="${escapeHtml(String(bill.id))}">Fix / view</button>
            <button type="button" class="admin-danger-btn" data-accounting-void-bill="${escapeHtml(String(bill.id))}">Void</button>
          </div>
        </td>
      </tr>
    `).join('');
    renderLookups();
  };

  const renderTransactions = () => {
    if (!refs.transactionsBody) return;
    const rows = state.transactions;
    if (refs.ledgerMeta) refs.ledgerMeta.textContent = `${rows.length.toLocaleString('id-ID')} rows loaded`;
    if (!rows.length) {
      refs.transactionsBody.innerHTML = '<tr><td colspan="13" class="admin-empty">No manual accounting entries for this month yet.</td></tr>';
      return;
    }
    refs.transactionsBody.innerHTML = rows.map((row) => `
      <tr data-accounting-transaction-row="${escapeHtml(String(row.id))}">
        <td><strong>${escapeHtml(row.transaction_date || '-')}</strong><small class="admin-table-note">${escapeHtml(row.transaction_key || '')}</small></td>
        <td><span class="${statusClass(row.type)}">${escapeHtml(String(row.type || '-').replace(/_/g, ' '))}</span></td>
        <td>${escapeHtml(row.account_name || '-')} ${row.to_account_name ? `<small class="admin-table-note">to ${escapeHtml(row.to_account_name)}</small>` : ''}</td>
        <td>${escapeHtml(String(row.direction || '-').replace(/_/g, ' '))}</td>
        <td>${escapeHtml(row.counterparty_name || '-')}</td>
        <td>${escapeHtml(row.category_name || '-')}</td>
        <td>${escapeHtml(row.brand || 'General / Shared')}</td>
        <td>${escapeHtml(row.channel || 'Internal')}</td>
        <td><strong>${formatCurrency(row.amount || 0)}</strong></td>
        <td><span class="${statusClass(row.status)}">${escapeHtml(row.status || '-')}</span></td>
        <td><span class="${statusClass(row.receipt_status)}">${escapeHtml(row.receipt_status || 'missing')}</span></td>
        <td>${escapeHtml(row.bill_no || '-')}</td>
        <td>
          <div class="admin-accounting-row-actions">
            <button type="button" class="admin-ghost-btn" data-accounting-view-transaction="${escapeHtml(String(row.id))}">Fix / view</button>
            <button type="button" class="admin-danger-btn" data-accounting-void-transaction="${escapeHtml(String(row.id))}">Void</button>
          </div>
        </td>
      </tr>
    `).join('');
  };

  const renderLedger = () => {
    if (!refs.ledgerBody) return;
    const rows = state.ledger;
    if (refs.ledgerMeta) refs.ledgerMeta.textContent = `${rows.length.toLocaleString('id-ID')} entries · manual + automatic`;
    if (!rows.length) {
      refs.ledgerBody.innerHTML = '<p class="admin-empty">No entries for this month yet.</p>';
      return;
    }
    refs.ledgerBody.innerHTML = rows.map((row) => {
      const amountClass = ['cash_in', 'baseline'].includes(String(row.impact || ''))
        ? 'is-added'
        : (row.impact === 'cash_out' ? 'is-subtracted' : '');
      const prefix = row.impact === 'cash_in' ? '+' : (row.impact === 'cash_out' ? '−' : '');
      const canOpen = ['transaction', 'bill'].includes(String(row.kind || ''));
      return `
        <${canOpen ? 'button' : 'div'} class="admin-accounting-ledger-row" ${canOpen ? `type="button" data-accounting-ledger-open="${escapeHtml(row.kind)}:${escapeHtml(String(row.source_id || ''))}"` : ''}>
          <time>${escapeHtml(formatHistoryDate(row.date || ''))}</time>
          <span class="admin-accounting-ledger-mark is-${escapeHtml(row.impact || 'entry')}" aria-hidden="true"></span>
          <span class="admin-accounting-ledger-copy">
            <strong>${escapeHtml(row.title || 'Accounting entry')}</strong>
            <small>${escapeHtml([row.subtitle, row.account].filter(Boolean).join(' · '))}</small>
          </span>
          <span class="admin-accounting-ledger-state">${escapeHtml(String(row.status || '').replace(/_/g, ' '))}</span>
          <strong class="admin-accounting-ledger-amount ${amountClass}">${prefix}${formatCurrency(row.amount || 0)}</strong>
        </${canOpen ? 'button' : 'div'}>
      `;
    }).join('');
  };

  const renderSummary = (summary) => {
    if (!refs.monthlySummary) return;
    const monthly = summary?.monthly_summary || {};
    const rows = [
      ['Paid Operating Expenses', monthly.paid_operating_expenses || 0],
      ['Marketing Expenses', monthly.marketing_expenses || 0],
      ['Product Purchases / Production', monthly.production_cogs_support_expenses || 0],
      ['Payroll / Labor', monthly.payroll_labor || 0],
      ['Software / Admin', monthly.software_admin || 0],
      ['Wallet Withdrawals to Bank', monthly.wallet_withdrawals_to_bank || 0],
      ['Website Paid Orders', monthly.website_payments_to_bank || 0],
      ['Bills Created', monthly.bills_created || 0],
      ['Bills Paid', monthly.bills_paid || 0],
      ['Bills Still Unpaid', monthly.bills_still_unpaid || 0],
      ['Estimated Net Cash Movement', monthly.estimated_net_cash_movement || 0]
    ];
    refs.monthlySummary.innerHTML = rows.map(([label, value]) => `
      <div>
        <span>${escapeHtml(label)}</span>
        <strong>${formatCurrency(value)}</strong>
      </div>
    `).join('');
  };

  const renderInsights = (summary) => {
    if (!refs.insights) return;
    const key = `${state.insightTab}_summary`;
    const rows = Array.isArray(summary?.[key]) ? summary[key] : [];
    refs.insightTabs.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.accountingInsightTab === state.insightTab);
    });
    if (!rows.length) {
      refs.insights.innerHTML = '<p class="admin-empty">No spend split for this period yet.</p>';
      return;
    }
    const max = Math.max(...rows.map((row) => Number(row.this_month || 0)), 1);
    refs.insights.innerHTML = rows.map((row) => {
      const value = Number(row.this_month || 0);
      return `
        <div class="admin-accounting-insight-row">
          <div><strong>${escapeHtml(row.label || '-')}</strong><span>${row.last_transaction ? escapeHtml(row.last_transaction) : 'Selected period'}</span></div>
          <div class="admin-accounting-bar"><span style="width:${Math.max(4, Math.round((value / max) * 100))}%"></span></div>
          <b>${formatCurrency(value)}</b>
        </div>
      `;
    }).join('');
  };

  const renderReviewQueue = () => {
    if (!refs.reviewBody) return;
    const rows = state.reviewQueue;
    if (refs.reviewCount) refs.reviewCount.textContent = rows.length.toLocaleString('id-ID');
    if (!rows.length) {
      refs.reviewBody.innerHTML = '<tr><td colspan="5" class="admin-empty">No review issues. Accounting data looks clean.</td></tr>';
      return;
    }
    refs.reviewBody.innerHTML = rows.map((row) => `
      <tr>
        <td><strong>${escapeHtml(row.issue_message || row.issue_key || '-')}</strong><small class="admin-table-note">${escapeHtml(row.issue_key || '')}</small></td>
        <td><span class="${statusClass(row.severity)}">${escapeHtml(row.severity || 'warning')}</span></td>
        <td>${escapeHtml(row.entity_type || '-')} #${Number(row.entity_id || 0).toLocaleString('id-ID')}</td>
        <td>${escapeHtml(row.suggested_action || '-')}</td>
        <td><div class="admin-accounting-row-actions"><button type="button" class="admin-primary-btn" data-accounting-fix-review="${escapeHtml(String(row.id))}" data-accounting-entity-type="${escapeHtml(row.entity_type || '')}" data-accounting-entity-id="${escapeHtml(String(row.entity_id || ''))}">Fix</button><button type="button" class="admin-soft-btn" data-accounting-resolve-review="${escapeHtml(String(row.id))}">Mark reviewed</button></div></td>
      </tr>
    `).join('');
  };

  const openDrawer = async (kind, id) => {
    const collection = kind === 'bill' ? state.bills : state.transactions;
    let item = collection.find((row) => Number(row.id) === Number(id));
    if (!item) {
      try {
        const payload = await requestJson(buildUrl(kind, { [`${kind}_id`]: id, cacheBust: true }));
        item = payload.data?.[kind] || null;
        if (item) collection.push(item);
      } catch (error) {
        showToast(error?.message || 'Unable to load accounting record.', true);
      }
    }
    if (!item || !refs.drawer) return;
    if (refs.drawerKicker) refs.drawerKicker.textContent = kind === 'bill' ? 'Bill' : 'Transaction';
    if (refs.drawerTitle) refs.drawerTitle.textContent = kind === 'bill'
      ? (item.bill_no || item.bill_key || 'Bill')
      : (item.transaction_key || 'Transaction');
    if (refs.drawerBody) {
      const categoryOptions = [option('', 'Choose category'), ...state.categories
        .filter((category) => category.parent_id !== null || Number(category.is_billable) === 1)
        .map((category) => option(category.id, category.parent_name ? `${category.parent_name} - ${category.name}` : category.name, Number(category.id) === Number(item.category_id)))].join('');
      const accountOptions = [option('', 'Choose account'), ...state.accounts
        .map((account) => option(account.id, account.name, Number(account.id) === Number(item.account_id || item.expected_account_id)))].join('');
      const receiptOptions = ['missing', 'attached', 'not_required']
        .map((status) => option(status, status.replace(/_/g, ' '), status === item.receipt_status)).join('');
      refs.drawerBody.innerHTML = kind === 'bill' ? `
        <form class="admin-accounting-edit-form" data-accounting-edit-form data-kind="bill" data-id="${escapeHtml(String(item.id))}">
          <label><span>Bill / invoice no.</span><input name="bill_no" value="${escapeHtml(item.bill_no || '')}"></label>
          <label><span>Bill date</span><input type="date" name="issue_date" value="${escapeHtml(item.issue_date || '')}" required></label>
          <label><span>Due date</span><input type="date" name="due_date" value="${escapeHtml(item.due_date || '')}"></label>
          <label><span>Total</span><input name="total_amount" inputmode="numeric" value="${escapeHtml(String(item.total_amount || ''))}" ${Number(item.paid_amount || 0) > 0 ? 'disabled' : ''} required></label>
          <label><span>Category</span><select name="category_id" required>${categoryOptions}</select></label>
          <label><span>Expected account</span><select name="expected_account_id">${accountOptions}</select></label>
          <label><span>Receipt status</span><select name="receipt_status">${receiptOptions}</select></label>
          <label><span>Attachment URL</span><input type="url" name="attachment_url" value="${escapeHtml(item.attachment_url || '')}"></label>
          <label class="admin-accounting-form-wide"><span>Notes</span><textarea name="notes" rows="4">${escapeHtml(item.notes || '')}</textarea></label>
          <p class="admin-form-error" data-accounting-edit-error hidden></p>
          <button type="submit" class="admin-primary-btn">Save correction</button>
        </form>
      ` : `
        <form class="admin-accounting-edit-form" data-accounting-edit-form data-kind="transaction" data-id="${escapeHtml(String(item.id))}">
          <label><span>Date</span><input type="date" name="transaction_date" value="${escapeHtml(item.transaction_date || '')}" required></label>
          <label><span>Amount</span><input name="amount" inputmode="numeric" value="${escapeHtml(String(item.amount || ''))}" required></label>
          <label><span>Account</span><select name="account_id" required>${accountOptions}</select></label>
          <label><span>Category</span><select name="category_id" ${item.type === 'transfer' ? '' : 'required'}>${categoryOptions}</select></label>
          <label><span>Receipt status</span><select name="receipt_status">${receiptOptions}</select></label>
          <label><span>Receipt URL</span><input type="url" name="receipt_url" value="${escapeHtml(item.receipt_url || '')}"></label>
          <label><span>Reference no.</span><input name="reference_no" value="${escapeHtml(item.reference_no || '')}"></label>
          <label><span>Order / SKU</span><input name="order_no" value="${escapeHtml(item.order_no || '')}"></label>
          <label class="admin-accounting-form-wide"><span>Notes</span><textarea name="notes" rows="4">${escapeHtml(item.notes || '')}</textarea></label>
          <p class="admin-form-error" data-accounting-edit-error hidden></p>
          <button type="submit" class="admin-primary-btn">Save correction</button>
        </form>
      `;
    }
    refs.drawer.hidden = false;
  };

  const render = ({ savedAt = Date.now(), cached = false } = {}) => {
    if (refs.monthInput) refs.monthInput.value = state.month;
    renderKpis(state.summary);
    renderAlerts(state.summary);
    renderBills();
    renderTransactions();
    renderLedger();
    renderSummary(state.summary);
    renderInsights(state.summary);
    renderReviewQueue();
    renderLookups();
    if (refs.status) {
      const statusDate = new Date(savedAt);
      const time = new Intl.DateTimeFormat('en-GB', {
        timeZone: DASHBOARD_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit'
      }).format(Number.isNaN(statusDate.getTime()) ? new Date() : statusDate);
      refs.status.textContent = cached ? `Accounting cached ${time} WIB` : `Accounting updated ${time} WIB`;
    }
  };

  const loadLookups = async (force = false) => {
    if (state.lookupsLoaded && !force) {
      renderLookups();
      return;
    }
    if (!force) {
      const cached = readCacheEntry(ACCOUNTING_LOOKUPS_CACHE_KEY);
      if (cached && applyLookupsPayload(cached.data)) return;
    }
    const [accounts, categories, counterparties] = await Promise.all([
      requestJson(buildUrl('accounts', { cacheBust: force })),
      requestJson(buildUrl('categories', { cacheBust: force })),
      requestJson(buildUrl('counterparties', { cacheBust: force }))
    ]);
    const payload = {
      accounts: Array.isArray(accounts.data?.accounts) ? accounts.data.accounts : [],
      categories: Array.isArray(categories.data?.categories) ? categories.data.categories : [],
      counterparties: Array.isArray(counterparties.data?.counterparties) ? counterparties.data.counterparties : []
    };
    applyLookupsPayload(payload);
    writeCacheEntry(ACCOUNTING_LOOKUPS_CACHE_KEY, payload);
  };

  const loadAccounting = async (force = false) => {
    const options = rangeOptions();
    const cacheKey = accountingCacheKey(options);
    const pendingEntry = refs.form instanceof HTMLFormElement
      ? [...refs.form.querySelectorAll('input[name], select[name], textarea[name]')].reduce((values, field) => {
          values[field.name] = field.value;
          return values;
        }, {})
      : {};
    const restorePendingEntry = () => {
      if (!(refs.form instanceof HTMLFormElement)) return;
      Object.entries(pendingEntry).forEach(([name, value]) => {
        const field = [...refs.form.elements].find((element) => element.name === name);
        if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
          field.value = value;
        }
      });
    };
    let renderedCache = false;
    if (!force) {
      const cached = readCacheEntry(cacheKey);
      if (cached) {
        applyAccountingPayload(cached.data, { cached: true, savedAt: cached.savedAt });
        renderedCache = true;
      }
    }
    if (refs.status) refs.status.textContent = renderedCache ? 'Refreshing accounting data' : 'Loading accounting data';
    const billOptions = { month: options.month, status: 'open' };
    try {
      const [summary, bills, transactions, ledger, review] = await Promise.all([
        requestJson(buildUrl('summary', { ...options, cacheBust: force })),
        requestJson(buildUrl('bills', { ...billOptions, cacheBust: force })),
        requestJson(buildUrl('transactions', { ...options, cacheBust: force })),
        requestJson(buildUrl('activity_ledger', { ...options, cacheBust: force })),
        requestJson(buildUrl('review_queue', { ...options, cacheBust: force })),
        loadLookups(force)
      ]);
      const payload = {
        summary: summary.data || {},
        bills: Array.isArray(bills.data?.bills) ? bills.data.bills : [],
        transactions: Array.isArray(transactions.data?.transactions) ? transactions.data.transactions : [],
        ledger: Array.isArray(ledger.data?.ledger) ? ledger.data.ledger : [],
        reviewQueue: Array.isArray(review.data?.review_queue) ? review.data.review_queue : [],
        lookups: getLookupPayload()
      };
      applyAccountingPayload(payload);
      restorePendingEntry();
      writeCacheEntry(cacheKey, payload);
    } catch (error) {
      if (renderedCache) {
        if (refs.status) refs.status.textContent = 'Accounting cached; refresh failed';
        return;
      }
      throw error;
    }
  };

  const loadSafely = async (force = false) => {
    try {
      await loadAccounting(force);
    } catch (error) {
      const message = error?.message || 'Could not load accounting data';
      if (refs.status) refs.status.textContent = message;
      if (refs.billsBody) refs.billsBody.innerHTML = `<tr><td colspan="13" class="admin-empty">${escapeHtml(message)}</td></tr>`;
      if (refs.transactionsBody) refs.transactionsBody.innerHTML = `<tr><td colspan="13" class="admin-empty">${escapeHtml(message)}</td></tr>`;
      if (refs.ledgerBody) refs.ledgerBody.innerHTML = `<p class="admin-empty">${escapeHtml(message)}</p>`;
      showToast(message, true);
    }
  };

  const marketplaceManualIncomeAttempt = (payload) => {
    if (state.mode !== 'manual_income') return false;
    const text = `${payload.channel || ''} ${payload.counterparty_name || ''}`.toLowerCase();
    return /(shopee|tiktok|tik ?tok|tokopedia)/.test(text);
  };

  const fillPayBillAmount = () => {
    if (state.mode !== 'pay_bill' || !refs.billSelect || !refs.amountInput) return;
    const bill = state.bills.find((item) => Number(item.id) === Number(refs.billSelect.value));
    if (bill && !amountInputToRaw(refs.amountInput.value)) {
      refs.amountInput.value = normalizeAmountInput(String(bill.outstanding_amount || 0));
    }
  };

  const payloadFromForm = (submitter) => {
    const form = refs.form;
    if (!(form instanceof HTMLFormElement)) return null;
    const data = new FormData(form);
    const config = modeConfig[state.mode];
    const amount = amountInputToRaw(data.get('amount'));
    const payload = {
      action: config.action,
      month: state.month,
      amount,
      transaction_date: String(data.get('transaction_date') || ''),
      issue_date: String(data.get('issue_date') || ''),
      due_date: String(data.get('due_date') || ''),
      bill_id: String(data.get('bill_id') || ''),
      account_id: String(data.get('account_id') || ''),
      to_account_id: String(data.get('to_account_id') || ''),
      category_id: String(data.get('category_id') || ''),
      counterparty_name: String(data.get('counterparty_name') || '').trim(),
      vendor_name: String(data.get('counterparty_name') || '').trim(),
      bill_no: String(data.get('bill_no') || '').trim(),
      brand: String(data.get('brand') || ''),
      channel: String(data.get('channel') || ''),
      type: state.mode === 'manual_income' ? String(data.get('income_type') || 'manual_income') : (config.type || ''),
      direction: config.direction || '',
      payment_method: String(data.get('payment_method') || ''),
      transfer_fee_amount: amountInputToRaw(data.get('transfer_fee_amount')),
      receipt_url: String(data.get('receipt_url') || '').trim(),
      attachment_url: String(data.get('receipt_url') || '').trim(),
      receipt_status: String(data.get('receipt_status') || 'missing'),
      reference_no: String(data.get('reference_no') || '').trim(),
      order_no: String(data.get('order_no') || '').trim(),
      notes: String(data.get('notes') || ''),
      status: submitter?.hasAttribute('data-accounting-save-draft') ? 'draft' : 'posted'
    };
    if (state.mode === 'bill_received') {
      payload.total_amount = amount;
      payload.action = 'create_bill';
    }
    if (state.mode === 'pay_bill') {
      payload.action = 'mark_bill_paid';
      payload.payment_date = payload.transaction_date;
    }
    return payload;
  };

  const validatePayload = (payload) => {
    if (!payload) return 'Unable to read Accounting entry.';
    if (!Number(amountInputToRaw(payload.amount))) return 'Amount is required.';
    if (state.mode === 'bill_received') {
      if (!payload.issue_date) return 'Bill Date is required.';
      if (!payload.due_date) return 'Due Date is required.';
      if (!payload.counterparty_name) return 'Choose a vendor/payee.';
      if (!payload.category_id) return 'Choose a category so reports stay clean.';
    } else if (state.mode === 'pay_bill') {
      if (!payload.bill_id) return 'Choose a bill.';
      if (!payload.account_id) return 'Choose which account paid this.';
    } else if (state.mode === 'transfer') {
      if (!payload.account_id || !payload.to_account_id) return 'Choose both transfer accounts.';
      if (payload.account_id === payload.to_account_id) return 'From Account and To Account cannot be the same.';
    } else {
      if (!payload.account_id) return 'Choose which account paid this.';
      if (!payload.category_id) return 'Choose a category so reports stay clean.';
      if (!payload.counterparty_name) return 'Choose a vendor/payee.';
    }
    if (marketplaceManualIncomeAttempt(payload)) {
      return 'This looks like marketplace revenue. Use Transfer Money if this is a payout.';
    }
    return '';
  };

  const submitForm = async (event) => {
    event.preventDefault();
    const submitter = event.submitter instanceof HTMLElement ? event.submitter : null;
    const payload = payloadFromForm(submitter);
    const validation = validatePayload(payload);
    setFormError(validation);
    if (validation || !payload) return;
    if (refs.formStatus) refs.formStatus.textContent = 'Saving...';
    try {
      await requestJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (refs.formStatus) refs.formStatus.textContent = 'Saved';
      showToast('Saved');
      await loadAccounting(true);
      if (submitter?.hasAttribute('data-accounting-save-add')) {
        if (refs.amountInput) refs.amountInput.value = '';
        root.querySelectorAll('[name="receipt_url"], [name="reference_no"], [name="order_no"], [name="notes"]').forEach((input) => {
          input.value = '';
        });
      } else {
        resetForm();
      }
    } catch (error) {
      const message = error?.message || 'Unable to save Accounting entry.';
      setFormError(message);
      if (refs.formStatus) refs.formStatus.textContent = 'Needs attention';
    }
  };

  if (refs.monthInput) {
    refs.monthInput.value = state.month;
    refs.monthInput.addEventListener('change', async () => {
      state.month = validMonthKey(refs.monthInput?.value) ? refs.monthInput.value : getMonthKey();
      await loadSafely(false);
    });
  }

  refs.rangeButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      state.range = button.dataset.accountingRange || 'this_month';
      refs.rangeButtons.forEach((item) => item.classList.toggle('is-active', item === button));
      await loadSafely(false);
    });
  });

  [refs.dateFrom, refs.dateTo].forEach((input) => {
    input?.addEventListener('change', async () => {
      if (state.range === 'custom') await loadSafely(false);
    });
  });

  refs.modeButtons.forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.accountingQuickMode || 'expense_paid'));
  });
  refs.modeSelect?.addEventListener('change', () => setMode(refs.modeSelect?.value || 'expense_paid'));
  refs.openModeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setMode(button.dataset.accountingOpenMode || 'expense_paid');
      refs.form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  refs.amountInput?.addEventListener('input', () => {
    refs.amountInput.value = normalizeAmountInput(refs.amountInput.value);
  });
  refs.transferFeeInput?.addEventListener('input', () => {
    refs.transferFeeInput.value = normalizeAmountInput(refs.transferFeeInput.value);
  });
  refs.billSelect?.addEventListener('change', fillPayBillAmount);
  refs.form?.addEventListener('submit', submitForm);
  refs.form?.addEventListener('reset', () => {
    if (resettingForm) return;
    window.setTimeout(resetForm, 0);
  });
  refs.previousMonth?.addEventListener('click', async () => {
    state.month = lastMonthKey();
    await loadSafely(false);
  });
  refs.currentMonth?.addEventListener('click', async () => {
    state.month = getMonthKey();
    await loadSafely(false);
  });
  refs.alerts?.addEventListener('click', (event) => {
    const billTarget = event.target instanceof Element ? event.target.closest('[data-accounting-alert-bills]') : null;
    if (billTarget instanceof HTMLElement) {
      openBillsBreakdown(billTarget.dataset.accountingAlertBills || 'due');
      return;
    }
    const target = event.target instanceof Element ? event.target.closest('[data-accounting-alert-target]') : null;
    if (target instanceof HTMLElement) document.getElementById(target.dataset.accountingAlertTarget || '')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  refs.billsBody?.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const payButton = target.closest('[data-accounting-pay-bill]');
    if (payButton instanceof HTMLElement) {
      setMode('pay_bill');
      if (refs.billSelect) refs.billSelect.value = payButton.dataset.accountingPayBill || '';
      if (refs.amountInput) refs.amountInput.value = '';
      fillPayBillAmount();
      refs.form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const viewButton = target.closest('[data-accounting-view-bill]');
    if (viewButton instanceof HTMLElement) {
      openDrawer('bill', viewButton.dataset.accountingViewBill || '');
      return;
    }
    const voidButton = target.closest('[data-accounting-void-bill]');
    if (voidButton instanceof HTMLElement) {
      const reason = window.prompt('Void reason');
      if (!reason) return;
      await requestJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'void_bill', bill_id: voidButton.dataset.accountingVoidBill, void_reason: reason })
      }).then(() => showToast('Bill voided')).catch((error) => setFormError(error.message));
      await loadSafely(true);
    }
  });

  refs.transactionsBody?.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const viewButton = target.closest('[data-accounting-view-transaction]');
    if (viewButton instanceof HTMLElement) {
      openDrawer('transaction', viewButton.dataset.accountingViewTransaction || '');
      return;
    }
    const voidButton = target.closest('[data-accounting-void-transaction]');
    if (voidButton instanceof HTMLElement) {
      const reason = window.prompt('Void reason');
      if (!reason) return;
      await requestJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'void_transaction', transaction_id: voidButton.dataset.accountingVoidTransaction, void_reason: reason })
      }).then(() => showToast('Transaction voided')).catch((error) => setFormError(error.message));
      await loadSafely(true);
    }
  });

  refs.ledgerBody?.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-accounting-ledger-open]') : null;
    if (!(target instanceof HTMLElement)) return;
    const [kind, id] = String(target.dataset.accountingLedgerOpen || '').split(':');
    if (kind && id) openDrawer(kind, id);
  });

  refs.reviewBody?.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const fixButton = target.closest('[data-accounting-fix-review]');
    if (fixButton instanceof HTMLElement) {
      const kind = fixButton.dataset.accountingEntityType === 'bill' ? 'bill' : 'transaction';
      const id = fixButton.dataset.accountingEntityId || '';
      openDrawer(kind, id);
      return;
    }
    const button = target.closest('[data-accounting-resolve-review]');
    if (!(button instanceof HTMLElement)) return;
    await requestJson(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_review_resolved', review_id: button.dataset.accountingResolveReview })
    }).then(() => showToast('Review marked')).catch((error) => setFormError(error.message));
    await loadSafely(true);
  });

  refs.insightTabs.forEach((button) => {
    button.addEventListener('click', () => {
      state.insightTab = button.dataset.accountingInsightTab || 'category';
      renderInsights(state.summary);
    });
  });
  refs.refresh?.addEventListener('click', async () => loadSafely(true));
  refs.cashHistoryOpenButtons.forEach((button) => button.addEventListener('click', openCashHistory));
  refs.cashHistoryCloseButtons.forEach((button) => button.addEventListener('click', closeCashHistory));
  refs.cashHistoryPlatform?.addEventListener('change', renderCashHistory);
  refs.cashHistoryAccount?.addEventListener('change', renderCashHistory);
  refs.cashHistoryDirection?.addEventListener('change', renderCashHistory);
  refs.marketplaceOpen?.addEventListener('click', openMarketplaceBreakdown);
  refs.billsOpenButtons.forEach((button) => {
    button.addEventListener('click', () => openBillsBreakdown(button.dataset.accountingBillsOpen || 'due'));
  });
  refs.breakdownCloseButtons.forEach((button) => button.addEventListener('click', closeBreakdown));
  refs.breakdownBody?.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-accounting-breakdown-bill]') : null;
    if (!(target instanceof HTMLElement)) return;
    closeBreakdown();
    openDrawer('bill', target.dataset.accountingBreakdownBill || '');
  });
  refs.reconcileOpen?.addEventListener('click', openReconcile);
  refs.reconcileCloseButtons.forEach((button) => button.addEventListener('click', closeReconcile));
  refs.reconcileAmount?.addEventListener('input', () => {
    refs.reconcileAmount.value = normalizeAmountInput(refs.reconcileAmount.value);
  });
  refs.reconcileForm?.addEventListener('submit', submitReconciliation);
  refs.exportButton?.addEventListener('click', () => {
    window.location.href = buildUrl('export_csv', { ...rangeOptions(), include_voided: '0' });
  });
  refs.cashRecordsExportButton?.addEventListener('click', () => {
    window.location.href = buildUrl('export_cash_records_csv', { ...rangeOptions() });
  });
  refs.settingsButton?.addEventListener('click', () => {
    setFormError('Settings are read-only in this version. Accounts and categories are seeded safely by the API.');
  });
  refs.drawerCloseButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (refs.drawer) refs.drawer.hidden = true;
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeCashHistory();
      closeBreakdown();
      closeReconcile();
    }
  });
  window.addEventListener('partner-billing:confirmed', () => {
    loadSafely(true);
  });
  refs.drawerBody?.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-accounting-edit-form]')) return;
    event.preventDefault();
    const data = new FormData(form);
    const kind = form.dataset.kind === 'bill' ? 'bill' : 'transaction';
    const original = (kind === 'bill' ? state.bills : state.transactions).find((row) => Number(row.id) === Number(form.dataset.id));
    if (!original) return;
    const payload = Object.fromEntries(data.entries());
    payload.action = kind === 'bill' ? 'update_bill' : 'update_transaction';
    payload[`${kind}_id`] = form.dataset.id || '';
    if (kind === 'transaction') {
      payload.amount = amountInputToRaw(payload.amount);
      payload.type = original.type;
      payload.direction = original.direction;
      payload.to_account_id = original.to_account_id || '';
      payload.counterparty_id = original.counterparty_id || '';
    } else if (payload.total_amount) {
      payload.total_amount = amountInputToRaw(payload.total_amount);
      payload.vendor_id = original.vendor_id || '';
    }
    const errorNode = form.querySelector('[data-accounting-edit-error]');
    try {
      await requestJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      showToast('Correction saved and audit history updated.');
      refs.drawer.hidden = true;
      await loadSafely(true);
    } catch (error) {
      if (errorNode) {
        errorNode.hidden = false;
        errorNode.textContent = error?.message || 'Unable to save correction.';
      }
    }
  });

  resetForm();
  loadSafely(false);
}
