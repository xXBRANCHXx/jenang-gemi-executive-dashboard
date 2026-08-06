const root = document.querySelector('[data-accounting-page]');

if (root) {
  const DASHBOARD_TIMEZONE = 'Asia/Jakarta';
  const endpoint = root.dataset.accountingEndpoint || '../api/accounting/';
  const ACCOUNTING_CACHE_PREFIX = 'jg-accounting-page-cache-v7';
  const ACCOUNTING_LOOKUPS_CACHE_KEY = 'jg-accounting-lookups-cache-v2';
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
  const defaultPreferences = {
    lists: {
      entry_types: [['expense_paid', 'Expense paid'], ['bill_received', 'Bill received'], ['pay_bill', 'Bill paid'], ['customer_refund', 'Customer refund paid'], ['transfer', 'Money transferred'], ['manual_income', 'Other money received']],
      brands: ['General / Shared', 'ZERO', 'Jenang Gemi', 'ZFit', 'Superfoods', 'Other'].map((value) => [value, value]),
      channels: ['Internal', 'Shopee', 'TikTok', 'Tokopedia', 'Website', 'WhatsApp', 'Offline', 'Partner', 'Distributor', 'Reseller', 'Dropship', 'Ads', 'Production', 'Fulfillment'].map((value) => [value, value]),
      payment_methods: ['Bank Transfer', 'Cash', 'QRIS', 'E-wallet', 'Card', 'Other'].map((value) => [value, value]),
      receipt_statuses: [['missing', 'Missing'], ['attached', 'Attached'], ['not_required', 'Not required']],
      income_types: [['manual_income', 'Offline customer payment'], ['manual_income', 'Website/manual invoice payment'], ['owner_injection', 'Owner injection'], ['loan_received', 'Loan received'], ['refund', 'Refund/reimbursement received'], ['manual_income', 'Other income']]
    },
    terms: {
      liquid_assets: 'Liquid assets', available_now: 'Available now', expected: 'Expected', going_out: 'Going out', scheduled_outflow: 'Scheduled outflow', projected_after_bills: 'Projected after bills', daily_entry: 'Daily entry', activity_ledger: 'Activity ledger', vendor_source: 'Vendor / Source', paid_from: 'Paid From Account', category: 'Category', amount: 'Amount', brand: 'Brand', channel: 'Channel', payment_method: 'Payment Method', receipt_status: 'Receipt Status', notes: 'Notes'
    }
  };
  Object.keys(defaultPreferences.lists).forEach((key) => {
    defaultPreferences.lists[key] = defaultPreferences.lists[key].map(([value, label]) => ({ value, label, active: true }));
  });
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
    cashHistoryLoaded: false,
    cashHistoryScope: 'all',
    partnerBills: null,
    partnerBillsRequest: 0,
    partnerBillsScope: 'due',
    ledgerImpact: 'all',
    ledgerSearch: '',
    preferences: JSON.parse(JSON.stringify(defaultPreferences))
  };

  const refs = {
    view: root.querySelector('[data-accounting-view]'),
    status: root.querySelector('[data-accounting-status]'),
    monthInput: root.querySelector('[data-accounting-month-select]'),
    ledgerImpact: root.querySelector('[data-accounting-ledger-impact]'),
    ledgerSearch: root.querySelector('[data-accounting-ledger-search]'),
    ledgerClear: root.querySelector('[data-accounting-ledger-clear]'),
    dateFrom: root.querySelector('[data-accounting-date-from]'),
    dateTo: root.querySelector('[data-accounting-date-to]'),
    rangeButtons: root.querySelectorAll('[data-accounting-range]'),
    openModeButtons: root.querySelectorAll('[data-accounting-open-mode]'),
    exportButton: root.querySelector('[data-accounting-export]'),
    cashRecordsExportButton: root.querySelector('[data-accounting-cash-records-export]'),
    pembukuanExportButtons: [...root.querySelectorAll('[data-accounting-pembukuan-export]')],
    settingsButton: root.querySelector('[data-accounting-settings]'),
    kpis: {
      liquidAssets: root.querySelector('[data-accounting-kpi="liquid-assets"]'),
      projectedAfterBills: root.querySelector('[data-accounting-kpi="projected-after-bills"]'),
      availableNow: root.querySelector('[data-accounting-kpi="available-now"]'),
      expectedTotal: root.querySelector('[data-accounting-kpi="expected-total"]'),
      scheduledOutflowCard: root.querySelector('[data-accounting-kpi="scheduled-outflow-card"]'),
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
    cashHistoryBalanceClass: root.querySelector('[data-accounting-cash-history-balance-class]'),
    cashHistoryAccount: root.querySelector('[data-accounting-cash-history-account]'),
    cashHistoryDirection: root.querySelector('[data-accounting-cash-history-direction]'),
    cashHistoryCount: root.querySelector('[data-accounting-cash-history-count]'),
    cashHistoryCurrentLabel: root.querySelector('[data-accounting-cash-history-current-label]'),
    cashHistoryCurrent: root.querySelector('[data-accounting-cash-history-current]'),
    cashHistoryAdded: root.querySelector('[data-accounting-cash-history-added]'),
    cashHistorySubtracted: root.querySelector('[data-accounting-cash-history-subtracted]'),
    cashHistoryNote: root.querySelector('[data-accounting-cash-history-note]'),
    cashHistoryTitle: root.querySelector('[data-accounting-cash-history-title]'),
    cashHistoryCopy: root.querySelector('[data-accounting-cash-history-copy]'),
    pulseBank: root.querySelector('[data-accounting-pulse-bank]'),
    pulseCash: root.querySelector('[data-accounting-pulse-cash]'),
    reconciliationCopy: root.querySelector('[data-accounting-reconciliation-copy]'),
    liquidityAssetsBar: root.querySelector('[data-accounting-liquidity-assets-bar]'),
    marketplaceOpen: root.querySelector('[data-accounting-marketplace-open]'),
    partnerBillsOpenButtons: root.querySelectorAll('[data-accounting-partner-bills-open]'),
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
    reconcileOpenButtons: root.querySelectorAll('[data-accounting-reconcile-open]'),
    reconcileCloseButtons: root.querySelectorAll('[data-accounting-reconcile-close]'),
    reconcileForm: root.querySelector('[data-accounting-reconcile-form]'),
    reconcileAccount: root.querySelector('[data-accounting-reconcile-account]'),
    reconcileAmount: root.querySelector('[data-accounting-reconcile-amount]'),
    reconcileError: root.querySelector('[data-accounting-reconcile-error]'),
    reconcileTitle: root.querySelector('[data-accounting-reconcile-title]'),
    reconcileCopy: root.querySelector('[data-accounting-reconcile-copy]'),
    accountSettings: root.querySelector('[data-accounting-account-settings]'),
    accountSettingsCard: root.querySelector('.admin-accounting-account-settings-card'),
    accountSettingsCloseButtons: root.querySelectorAll('[data-accounting-account-settings-close]'),
    accountList: root.querySelector('[data-accounting-account-list]'),
    accountForm: root.querySelector('[data-accounting-account-form]'),
    accountNew: root.querySelector('[data-accounting-account-new]'),
    accountError: root.querySelector('[data-accounting-account-error]'),
    settingsTabs: root.querySelectorAll('[data-accounting-settings-tab]'),
    settingsPanels: root.querySelectorAll('[data-accounting-settings-panel]'),
    categorySettings: root.querySelector('[data-accounting-category-settings]'),
    optionSettings: root.querySelector('[data-accounting-option-settings]'),
    termSettings: root.querySelector('[data-accounting-term-settings]'),
    preferenceForms: root.querySelectorAll('[data-accounting-preferences-form]'),
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
    categoryCombobox: root.querySelector('[data-accounting-category-combobox]'),
    categoryValue: root.querySelector('[data-accounting-category-value]'),
    counterpartyInput: root.querySelector('[data-accounting-counterparty-input]'),
    counterpartyOptions: root.querySelector('[data-accounting-counterparty-options]'),
    billSelect: root.querySelector('[data-accounting-bill-select]'),
    brandSelect: root.querySelector('[data-accounting-brand-select]'),
    channelSelect: root.querySelector('[data-accounting-channel-select]'),
    incomeType: root.querySelector('[data-accounting-income-type]'),
    paymentMethod: root.querySelector('[name="payment_method"]'),
    receiptStatus: root.querySelector('[name="receipt_status"]'),
    receiptUrl: root.querySelector('[name="receipt_url"]'),
    receiptUpload: root.querySelector('[data-accounting-receipt-upload]'),
    receiptFile: root.querySelector('[data-accounting-receipt-file]'),
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
    drawerBody: root.querySelector('[data-accounting-drawer-body]'),
    receiptModal: root.querySelector('[data-accounting-receipt-modal]'),
    receiptCard: root.querySelector('.admin-accounting-receipt-card'),
    receiptCloseButtons: root.querySelectorAll('[data-accounting-receipt-close]'),
    receiptPreview: root.querySelector('[data-accounting-receipt-preview]'),
    receiptLoading: root.querySelector('[data-accounting-receipt-loading]'),
    receiptImage: root.querySelector('[data-accounting-receipt-image]'),
    receiptPdf: root.querySelector('[data-accounting-receipt-pdf]'),
    receiptTitle: root.querySelector('[data-accounting-receipt-title]'),
    receiptNewTab: root.querySelector('[data-accounting-receipt-new-tab]')
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
      'bill_id',
      'format',
      'limit'
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
    counterparties: state.counterparties,
    preferences: state.preferences
  });

  const applyLookupsPayload = (payload, { renderControls = true } = {}) => {
    if (!payload || !Array.isArray(payload.accounts) || !Array.isArray(payload.categories) || !Array.isArray(payload.counterparties)) {
      return false;
    }
    state.accounts = payload.accounts;
    state.categories = payload.categories;
    state.counterparties = payload.counterparties;
    if (payload.preferences && typeof payload.preferences === 'object') {
      state.preferences = {
        lists: { ...defaultPreferences.lists, ...(payload.preferences.lists || {}) },
        terms: { ...defaultPreferences.terms, ...(payload.preferences.terms || {}) }
      };
    }
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

  const safeReceiptUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const parsed = new URL(raw, window.location.origin);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
    } catch (_error) {
      return '';
    }
  };

  let receiptObjectUrl = '';
  let receiptRequest = 0;

  const resetReceiptPreview = () => {
    if (receiptObjectUrl) URL.revokeObjectURL(receiptObjectUrl);
    receiptObjectUrl = '';
    if (refs.receiptImage) {
      refs.receiptImage.hidden = true;
      refs.receiptImage.onload = null;
      refs.receiptImage.onerror = null;
      refs.receiptImage.removeAttribute('src');
    }
    if (refs.receiptPdf) {
      refs.receiptPdf.hidden = true;
      refs.receiptPdf.removeAttribute('data');
    }
  };

  const closeReceipt = () => {
    receiptRequest += 1;
    if (refs.receiptModal) refs.receiptModal.hidden = true;
    resetReceiptPreview();
  };

  const openReceipt = async (url, name = 'Receipt') => {
    const safeUrl = safeReceiptUrl(url);
    if (!safeUrl || !refs.receiptModal) {
      showToast('This receipt link cannot be previewed.', true);
      return;
    }
    const requestId = ++receiptRequest;
    resetReceiptPreview();
    if (refs.receiptTitle) refs.receiptTitle.textContent = name || 'Receipt';
    if (refs.receiptNewTab) refs.receiptNewTab.href = safeUrl;
    if (refs.receiptLoading) {
      refs.receiptLoading.hidden = false;
      refs.receiptLoading.textContent = 'Loading receipt…';
    }
    refs.receiptModal.hidden = false;
    window.requestAnimationFrame(() => refs.receiptCard?.focus());
    try {
      const parsed = new URL(safeUrl);
      if (parsed.origin !== window.location.origin) throw new Error('external_receipt');
      const response = await fetch(safeUrl, { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      if (requestId !== receiptRequest) return;
      const mime = String(blob.type || response.headers.get('Content-Type') || '').split(';')[0].toLowerCase();
      receiptObjectUrl = URL.createObjectURL(blob);
      if (mime.startsWith('image/') && refs.receiptImage) {
        refs.receiptImage.src = receiptObjectUrl;
        refs.receiptImage.hidden = false;
      } else if (mime === 'application/pdf' && refs.receiptPdf) {
        refs.receiptPdf.data = receiptObjectUrl;
        refs.receiptPdf.hidden = false;
      } else {
        throw new Error('unsupported_receipt');
      }
      if (refs.receiptLoading) refs.receiptLoading.hidden = true;
    } catch (_error) {
      if (requestId !== receiptRequest) return;
      resetReceiptPreview();
      const isExternal = new URL(safeUrl).origin !== window.location.origin;
      if (isExternal && refs.receiptImage) {
        refs.receiptImage.onload = () => {
          if (requestId === receiptRequest && refs.receiptLoading) refs.receiptLoading.hidden = true;
        };
        refs.receiptImage.onerror = () => {
          if (requestId !== receiptRequest || !refs.receiptLoading) return;
          refs.receiptImage.hidden = true;
          refs.receiptLoading.hidden = false;
          refs.receiptLoading.textContent = 'This receipt host does not allow an embedded preview. Use “Open in new tab” to review it.';
        };
        refs.receiptImage.src = safeUrl;
        refs.receiptImage.hidden = false;
      } else if (refs.receiptLoading) {
        refs.receiptLoading.hidden = false;
        refs.receiptLoading.textContent = 'Preview unavailable. Use “Open in new tab” to review this receipt.';
      }
    }
  };

  const setFormError = (message = '') => {
    if (!refs.formError) return;
    refs.formError.hidden = !message;
    refs.formError.textContent = message;
    if (message) showToast(message, true);
  };

  const accountOptionsForRole = (role) => state.accounts.filter((account) => (
    String(account.type || '') !== 'marketplace_wallet'
    && Number(role === 'pay' ? account.can_pay : account.can_receive) === 1
  ));

  const renderAccountOptions = () => {
    const sourceRole = state.mode === 'manual_income' ? 'receive' : 'pay';
    const sourceAccounts = accountOptionsForRole(sourceRole);
    const destinationAccounts = accountOptionsForRole('receive');
    const selectedAccount = refs.accountSelect?.value || '';
    const selectedToAccount = refs.toAccountSelect?.value || '';
    if (refs.accountSelect) {
      refs.accountSelect.innerHTML = [
        option('', sourceRole === 'pay' ? 'Choose payment account' : 'Choose receiving account'),
        ...sourceAccounts.map((account) => option(account.id, account.name))
      ].join('');
      refs.accountSelect.value = sourceAccounts.some((account) => String(account.id) === selectedAccount) ? selectedAccount : '';
    }
    if (refs.toAccountSelect) {
      refs.toAccountSelect.innerHTML = [
        option('', 'Choose receiving account'),
        ...destinationAccounts.map((account) => option(account.id, account.name))
      ].join('');
      refs.toAccountSelect.value = destinationAccounts.some((account) => String(account.id) === selectedToAccount) ? selectedToAccount : '';
    }
  };

  const billableCategories = () => state.categories.filter((item) => (
    item.parent_id !== null || Number(item.is_billable) === 1
  ));

  const categoryLabel = (category) => (
    category?.parent_name ? `${category.parent_name} - ${category.name}` : String(category?.name || '')
  );

  const categoryComboboxMarkup = (selectedCategoryId = '') => `
    <div class="admin-accounting-category-combobox" data-accounting-category-combobox>
      <input type="hidden" name="category_id" value="${escapeHtml(String(selectedCategoryId || ''))}" data-accounting-category-value>
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
  `;

  const renderCategoryCombobox = (combobox) => {
    if (!(combobox instanceof HTMLElement)) return;
    const valueInput = combobox.querySelector('[data-accounting-category-value]');
    const label = combobox.querySelector('[data-accounting-category-label]');
    const searchInput = combobox.querySelector('[data-accounting-category-search]');
    const results = combobox.querySelector('[data-accounting-category-results]');
    if (!(valueInput instanceof HTMLInputElement) || !(results instanceof HTMLElement)) return;
    const selectedValue = valueInput.value;
    const selectedCategory = billableCategories().find((category) => String(category.id) === selectedValue);
    if (label instanceof HTMLElement) label.textContent = selectedCategory ? categoryLabel(selectedCategory) : 'Choose category';
    const search = String(searchInput?.value || '').trim().toLocaleLowerCase('id-ID');
    const visible = billableCategories().filter((category) => (
      !search || `${category.parent_name || ''} ${category.name || ''}`.toLocaleLowerCase('id-ID').includes(search)
    ));
    results.innerHTML = visible.length
      ? visible.map((category) => {
        const selected = String(category.id) === selectedValue;
        return `
          <button type="button" role="option" data-accounting-category-option="${escapeHtml(String(category.id))}" aria-selected="${selected ? 'true' : 'false'}">
            <span>${escapeHtml(category.name || '')}</span>
            <small>${escapeHtml(category.parent_name || 'General')}</small>
            <b aria-hidden="true">${selected ? '✓' : ''}</b>
          </button>
        `;
      }).join('')
      : '<p class="admin-accounting-category-empty">No matching categories</p>';
  };

  const renderCategoryOptions = () => {
    renderCategoryCombobox(refs.categoryCombobox);
  };

  const closeCategoryCombobox = (combobox) => {
    if (!(combobox instanceof HTMLElement)) return;
    const menu = combobox.querySelector('[data-accounting-category-menu]');
    const trigger = combobox.querySelector('[data-accounting-category-trigger]');
    if (menu instanceof HTMLElement) menu.hidden = true;
    if (trigger instanceof HTMLButtonElement) trigger.setAttribute('aria-expanded', 'false');
  };

  const closeCategoryComboboxes = (except = null) => {
    root.querySelectorAll('[data-accounting-category-combobox]').forEach((combobox) => {
      if (combobox !== except) closeCategoryCombobox(combobox);
    });
  };

  const openCategoryCombobox = (combobox) => {
    if (!(combobox instanceof HTMLElement)) return;
    closeCategoryComboboxes(combobox);
    const menu = combobox.querySelector('[data-accounting-category-menu]');
    const trigger = combobox.querySelector('[data-accounting-category-trigger]');
    const searchInput = combobox.querySelector('[data-accounting-category-search]');
    if (!(menu instanceof HTMLElement)) return;
    menu.hidden = false;
    if (trigger instanceof HTMLButtonElement) trigger.setAttribute('aria-expanded', 'true');
    if (searchInput instanceof HTMLInputElement) searchInput.value = '';
    renderCategoryCombobox(combobox);
    window.requestAnimationFrame(() => {
      if (searchInput instanceof HTMLInputElement) searchInput.focus();
      const selected = combobox.querySelector('[data-accounting-category-option][aria-selected="true"]');
      selected?.scrollIntoView({ block: 'nearest' });
    });
  };

  const activeChoices = (key) => {
    const rows = Array.isArray(state.preferences?.lists?.[key]) ? state.preferences.lists[key] : defaultPreferences.lists[key];
    return rows.filter((row) => row && row.value !== undefined && row.label && row.active !== false && Number(row.active) !== 0);
  };

  const renderChoiceSelect = (select, key, allowedValues = null) => {
    if (!(select instanceof HTMLSelectElement)) return;
    const selected = select.value;
    const rows = activeChoices(key).filter((row) => !allowedValues || allowedValues.includes(String(row.value)));
    select.innerHTML = rows.map((row) => option(row.value, row.label, String(row.value) === selected)).join('');
    if (rows.some((row) => String(row.value) === selected)) select.value = selected;
  };

  const applyTerminology = () => {
    root.querySelectorAll('[data-accounting-term]').forEach((node) => {
      const key = node.getAttribute('data-accounting-term') || '';
      if (state.preferences?.terms?.[key]) node.textContent = state.preferences.terms[key];
    });
  };

  const renderPreferenceDrivenControls = () => {
    renderChoiceSelect(refs.modeSelect, 'entry_types', Object.keys(modeConfig));
    renderChoiceSelect(refs.brandSelect, 'brands');
    renderChoiceSelect(refs.channelSelect, 'channels');
    renderChoiceSelect(refs.paymentMethod, 'payment_methods');
    renderChoiceSelect(refs.receiptStatus, 'receipt_statuses', ['missing', 'attached', 'not_required']);
    renderChoiceSelect(refs.incomeType, 'income_types', ['manual_income', 'owner_injection', 'loan_received', 'refund']);
    applyTerminology();
  };

  const renderLookups = () => {
    const openBills = state.bills.filter((bill) => ['unpaid', 'partially_paid', 'overdue'].includes(String(bill.status || '')));
    const selectedBill = refs.billSelect?.value || '';
    renderAccountOptions();
    renderCategoryOptions();
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
    renderPreferenceDrivenControls();
    renderAccountSettings();
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
        input.required = input.hasAttribute('name')
          && !field.hidden
          && ['account_id', 'category_id', 'counterparty', 'bill_id', 'issue_date', 'due_date'].includes(key);
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
    const canUploadReceipt = ['expense_paid', 'customer_refund'].includes(nextMode);
    if (refs.receiptUpload) refs.receiptUpload.hidden = !canUploadReceipt;
    if (refs.receiptFile) {
      refs.receiptFile.disabled = !canUploadReceipt;
      if (!canUploadReceipt) refs.receiptFile.value = '';
    }
    renderAccountOptions();
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
    const liquidity = summary?.liquid_assets || {};
    if (refs.kpis.liquidAssets) refs.kpis.liquidAssets.textContent = formatCurrency(liquidity.total || 0);
    if (refs.kpis.projectedAfterBills) refs.kpis.projectedAfterBills.textContent = formatCurrency(liquidity.projected_after_bills || 0);
    if (refs.kpis.availableNow) refs.kpis.availableNow.textContent = formatCurrency(liquidity.available_now || 0);
    if (refs.kpis.expectedTotal) refs.kpis.expectedTotal.textContent = formatCurrency(liquidity.expected_total || 0);
    if (refs.kpis.scheduledOutflowCard) refs.kpis.scheduledOutflowCard.textContent = formatCurrency(liquidity.scheduled_outflow || 0);
    if (refs.kpis.overdue) refs.kpis.overdue.textContent = formatCurrency(kpis.overdue_bills || 0);
    if (refs.kpis.expenses) refs.kpis.expenses.textContent = formatCurrency(kpis.expenses_this_month || 0);
    if (refs.kpis.safeCash) refs.kpis.safeCash.textContent = formatCurrency(kpis.net_safe_cash || 0);
    if (refs.kpis.pendingReview) refs.kpis.pendingReview.textContent = Number(kpis.pending_manual_review || 0).toLocaleString('id-ID');
    refs.safeCashCard?.classList.toggle('is-danger', Number(kpis.net_safe_cash || 0) < 0);
    const reconciliations = Array.isArray(summary?.balance_reconciliations) ? summary.balance_reconciliations : [];
    if (refs.reconciliationCopy) {
      const bankReconciliation = reconciliations.find((item) => {
        const account = state.accounts.find((candidate) => Number(candidate.id) === Number(item.account_id));
        return account?.balance_class === 'bank';
      });
      refs.reconciliationCopy.textContent = bankReconciliation
        ? `Bank baseline set ${formatHistoryDate(String(bankReconciliation.reconciled_at || '').slice(0, 10))}; later deposits and payments move from it.`
        : 'Deposits, payments, and transfers determine the bank balance. Reconcile it against your statement when needed.';
    }
    renderLiquidityOverview(summary);
  };

  const liquidityTooltip = (title, rows, total) => `
    <span class="admin-liquidity-tooltip" role="tooltip">
      <strong>${escapeHtml(title)}</strong>
      ${rows.map(([label, amount]) => `<span><small>${escapeHtml(label)}</small><b>${formatCurrency(amount)}</b></span>`).join('')}
      <span class="admin-liquidity-tooltip-total"><small>Total</small><b>${formatCurrency(total)}</b></span>
    </span>
  `;

  const renderLiquidityOverview = (summary) => {
    const liquidity = summary?.liquid_assets || {};
    const segments = liquidity.segments || {};
    const wallets = Array.isArray(summary?.wallet_breakdown) ? summary.wallet_breakdown : [];
    const walletReadyRows = wallets
      .filter((wallet) => wallet.current_balance !== null && Number(wallet.current_balance || 0) > 0)
      .map((wallet) => [wallet.label || wallet.account_key || 'Wallet', Number(wallet.current_balance || 0)]);
    const marketplaceRows = wallets
      .filter((wallet) => Number(wallet.outstanding_amount || 0) > 0)
      .map((wallet) => [wallet.label || wallet.account_key || 'Wallet', Number(wallet.outstanding_amount || 0)]);
    const assetSegments = [
      { key: 'bank', label: 'Bank', amount: Number(segments.bank || 0), rows: [['Deposited funds', Number(segments.bank || 0)]] },
      { key: 'cash', label: 'Cash', amount: Number(segments.cash || 0), rows: [['Physical cash', Number(segments.cash || 0)]] },
      { key: 'wallet', label: 'Wallets ready', amount: Number(segments.wallet_ready || 0), rows: walletReadyRows },
      { key: 'marketplace', label: 'Marketplace outstanding', amount: Number(segments.marketplace_outstanding || 0), rows: marketplaceRows },
      { key: 'direct', label: 'Direct orders unpaid', amount: Number(segments.direct_order_unpaid || 0), rows: [['WhatsApp and walk-in outstanding', Number(segments.direct_order_unpaid || 0)]] },
      { key: 'partner', label: 'Partner bills unpaid', amount: Number(segments.partner_unpaid || 0), rows: [['Unpaid partner bills', Number(segments.partner_unpaid || 0)]] }
    ];
    const positiveAssets = assetSegments.filter((segment) => segment.amount > 0);
    const outflow = liquidity.outflow_segments || {};
    const outflowRows = [
      ['POs left to pay', Number(outflow.purchase_orders || 0)],
      ['Supplier bills overdue', Number(outflow.overdue || 0)],
      ['Supplier bills due in 7 days', Number(outflow.due_soon || 0)],
      ['Supplier bills due later', Number(outflow.later || 0)]
    ].filter(([, amount]) => amount > 0);
    const total = Math.max(0, Number(liquidity.total || 0));
    const scheduledOutflow = Math.max(0, Number(liquidity.scheduled_outflow || 0));
    const reservedOutflow = Math.min(total, scheduledOutflow);
    const reservedShare = total > 0 ? (reservedOutflow / total) * 100 : 0;
    const bankShare = total > 0 ? (Math.max(0, Number(segments.bank || 0)) / total) * 100 : 0;
    const bankRight = Math.max(0, 100 - bankShare);
    if (refs.liquidityAssetsBar) {
      refs.liquidityAssetsBar.innerHTML = positiveAssets.length
        ? `<div class="admin-liquidity-sources">${positiveAssets.map((segment) => `
          <button type="button" class="admin-liquidity-segment is-${segment.key}" data-accounting-liquidity-segment="${segment.key}" style="flex-grow:${Math.max(1, segment.amount)}" aria-label="${escapeHtml(segment.label)} ${escapeHtml(formatCurrency(segment.amount))}">
            <span class="admin-visually-hidden">${escapeHtml(segment.label)}</span>
            ${liquidityTooltip(segment.label, segment.rows.length ? segment.rows : [[segment.label, segment.amount]], segment.amount)}
          </button>
        `).join('')}</div>${reservedOutflow > 0 ? `
          <button type="button" class="admin-liquidity-commitment-overlay" data-accounting-liquidity-segment="outflow" style="right:${bankRight}%;width:min(${bankShare}%, max(${reservedShare}%, 10px))" aria-label="Going out from bank ${escapeHtml(formatCurrency(scheduledOutflow))}">
            <span class="admin-visually-hidden">Going out</span>
            ${liquidityTooltip('Going out from bank', outflowRows, scheduledOutflow)}
          </button>
        ` : ''}`
        : '<span class="admin-liquidity-loading">No liquid assets recorded yet.</span>';
    }
  };

  let liquidityTooltipPortal = null;

  const hideLiquidityTooltip = () => {
    if (liquidityTooltipPortal) liquidityTooltipPortal.hidden = true;
  };

  const positionLiquidityTooltip = (segment) => {
    if (!(segment instanceof HTMLElement)) return;
    const source = segment.querySelector('.admin-liquidity-tooltip');
    if (!(source instanceof HTMLElement)) return;
    if (!(liquidityTooltipPortal instanceof HTMLElement)) {
      liquidityTooltipPortal = document.createElement('div');
      liquidityTooltipPortal.className = 'admin-liquidity-tooltip admin-liquidity-tooltip-portal';
      liquidityTooltipPortal.setAttribute('role', 'tooltip');
      document.body.appendChild(liquidityTooltipPortal);
    }
    const tooltip = liquidityTooltipPortal;
    tooltip.innerHTML = source.innerHTML;
    tooltip.hidden = false;
    tooltip.style.left = '-9999px';
    tooltip.style.top = '0px';
    const anchor = segment.getBoundingClientRect();
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const gutter = 12;
    const centeredLeft = anchor.left + (anchor.width / 2) - (width / 2);
    const desiredLeft = window.innerWidth - anchor.right >= width + gutter
      ? anchor.right + gutter
      : (anchor.left >= width + gutter ? anchor.left - width - gutter : centeredLeft);
    const left = Math.max(gutter, Math.min(window.innerWidth - width - gutter, desiredLeft));
    const centeredTop = anchor.top + (anchor.height / 2) - (height / 2);
    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(Math.max(gutter, Math.min(window.innerHeight - height - gutter, centeredTop)))}px`;
  };

  const repositionActiveLiquidityTooltip = () => {
    const segment = refs.liquidityAssetsBar?.querySelector('[data-accounting-liquidity-segment]:hover, [data-accounting-liquidity-segment]:focus-visible');
    if (segment instanceof HTMLElement) {
      positionLiquidityTooltip(segment);
    } else {
      hideLiquidityTooltip();
    }
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

  const populateCashHistoryAccounts = () => {
    if (!refs.cashHistoryAccount) return;
    const selected = refs.cashHistoryAccount.value || 'all';
    const accounts = new Map();
    state.cashHistory.forEach((row) => {
      const key = String(row.account_key || row.cash_account || '').trim();
      if (key) accounts.set(key, String(row.account_name || row.cash_account_label || key));
    });
    refs.cashHistoryAccount.innerHTML = [
      '<option value="all">All accounts</option>',
      ...[...accounts.entries()]
        .sort((left, right) => left[1].localeCompare(right[1]))
        .map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`)
    ].join('');
    refs.cashHistoryAccount.value = accounts.has(selected) ? selected : 'all';
  };

  const renderCashHistory = () => {
    if (!refs.cashHistoryBody) return;
    const selectedBalanceClass = refs.cashHistoryBalanceClass?.value || 'all';
    const selectedAccount = refs.cashHistoryAccount?.value || 'all';
    const direction = refs.cashHistoryDirection?.value || 'all';
    const scopedRows = state.cashHistory.filter((row) => {
      if (selectedBalanceClass !== 'all' && String(row.balance_class || '') !== selectedBalanceClass) return false;
      if (selectedAccount !== 'all' && String(row.account_key || row.cash_account || '') !== selectedAccount) return false;
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
    const hasSourceFilter = selectedBalanceClass !== 'all' || selectedAccount !== 'all';
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
      refs.cashHistoryCurrentLabel.textContent = selectedBalanceClass === 'bank'
        ? 'Bank balance'
        : (selectedBalanceClass === 'cash' ? 'Available cash' : (hasSourceFilter ? 'Selected balance' : 'Bank + cash'));
    }
    if (refs.cashHistoryAdded) refs.cashHistoryAdded.textContent = formatCurrency(summary.total_added || 0);
    if (refs.cashHistorySubtracted) refs.cashHistorySubtracted.textContent = formatCurrency(summary.total_subtracted || 0);
    if (refs.cashHistoryCount) {
      refs.cashHistoryCount.textContent = `${rows.length.toLocaleString('id-ID')} of ${scopedRows.length.toLocaleString('id-ID')} entries`;
    }
    if (refs.cashHistoryNote) {
      if (hasSourceFilter) {
        const balanceLabel = selectedBalanceClass === 'all'
          ? 'bank and cash'
          : (refs.cashHistoryBalanceClass?.selectedOptions?.[0]?.textContent || 'selected balance');
        const accountLabel = selectedAccount === 'all'
          ? 'all accounts'
          : (refs.cashHistoryAccount?.selectedOptions?.[0]?.textContent || 'selected account');
        refs.cashHistoryNote.textContent = `Showing ${balanceLabel} movements for ${accountLabel}. Transfers appear once on each affected account so both balances stay accurate.`;
      } else {
        refs.cashHistoryNote.textContent = 'This combined ledger includes bank and physical cash. Wallet balances stay outside it until a payout reaches the automatic deposit account.';
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
          <td><span>${escapeHtml(row.account_name || row.source || '-')}</span><small class="admin-table-note">${escapeHtml(row.source || '')}${row.reference ? ` · ${escapeHtml(row.reference)}` : ''}</small></td>
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

  const openCashHistory = async (scope = 'all') => {
    if (!refs.cashHistory) return;
    state.cashHistoryScope = ['bank', 'cash'].includes(scope) ? scope : 'all';
    if (refs.cashHistoryBalanceClass) refs.cashHistoryBalanceClass.value = state.cashHistoryScope;
    if (refs.cashHistoryAccount) refs.cashHistoryAccount.value = 'all';
    if (refs.cashHistoryTitle) {
      refs.cashHistoryTitle.textContent = state.cashHistoryScope === 'bank'
        ? 'Bank Balance history'
        : (state.cashHistoryScope === 'cash' ? 'Available Cash history' : 'Bank + Cash history');
    }
    if (refs.cashHistoryCopy) {
      refs.cashHistoryCopy.textContent = state.cashHistoryScope === 'bank'
        ? 'Deposits, payments, and transfers affecting business bank accounts.'
        : (state.cashHistoryScope === 'cash'
          ? 'Physical cash counts, receipts, payments, and transfers into Cash Office.'
          : 'Every movement across operational bank and physical cash accounts.');
    }
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
      populateCashHistoryAccounts();
      renderCashHistory();
    } catch (error) {
      if (refs.cashHistoryCount) refs.cashHistoryCount.textContent = 'History unavailable';
      if (refs.cashHistoryBody) refs.cashHistoryBody.innerHTML = `<tr><td colspan="5" class="admin-empty">${escapeHtml(error?.message || 'Unable to load cash history.')}</td></tr>`;
    }
  };

  const closeBreakdown = () => {
    if (!refs.breakdown) return;
    state.partnerBillsRequest += 1;
    refs.breakdown.hidden = true;
  };

  const openBreakdown = ({ kicker, title, copy, rows, empty }) => {
    if (!refs.breakdown || !refs.breakdownBody) return;
    if (refs.breakdownKicker) refs.breakdownKicker.textContent = kicker;
    if (refs.breakdownTitle) refs.breakdownTitle.textContent = title;
    if (refs.breakdownCopy) refs.breakdownCopy.textContent = copy;
    refs.breakdownBody.innerHTML = rows.length ? rows.join('') : `<p class="admin-empty">${escapeHtml(empty)}</p>`;
    refs.breakdownBody.scrollTop = 0;
    refs.breakdown.hidden = false;
    refs.breakdownBody.focus({ preventScroll: true });
  };

  const openMarketplaceBreakdown = () => {
    state.partnerBillsRequest += 1;
    const wallets = Array.isArray(state.summary?.wallet_breakdown) ? state.summary.wallet_breakdown : [];
    const partnerDue = Number(state.summary?.kpis?.partner_bills_due || 0);
    const partnerInProgress = Number(state.summary?.kpis?.partner_bills_in_progress || 0);
    const rows = wallets.map((wallet) => `
      <div class="admin-accounting-breakdown-row">
        <span><strong>${escapeHtml(wallet.label || wallet.account_key || 'Wallet')}</strong><small>${Number(wallet.order_count || 0).toLocaleString('id-ID')} unreleased orders</small></span>
        <span><small>Ready to withdraw</small><strong>${wallet.current_balance === null ? 'Unavailable' : formatCurrency(wallet.current_balance || 0)}</strong></span>
        <span><small>Outstanding</small><strong>${formatCurrency(wallet.outstanding_amount || 0)}</strong></span>
      </div>
    `);
    if (partnerDue > 0) {
      rows.push(`
        <button type="button" class="admin-accounting-breakdown-row is-partner-receivable" data-accounting-receivable-partner="due">
          <span><strong>Unpaid partner bills</strong><small>Issued bills awaiting payment, review, or dispute resolution</small></span>
          <span><small>Type</small><strong>Money in</strong></span>
          <span><small>Outstanding</small><strong>${formatCurrency(partnerDue)}</strong></span>
        </button>
      `);
    }
    if (partnerInProgress > 0) {
      rows.push(`
        <button type="button" class="admin-accounting-breakdown-row" data-accounting-receivable-partner="in_progress">
          <span><strong>Partner billing in progress</strong><small>Current periods still accumulating; excluded from liquid assets until issued</small></span>
          <span><small>Type</small><strong>Not issued</strong></span>
          <span><small>Current total</small><strong>${formatCurrency(partnerInProgress)}</strong></span>
        </button>
      `);
    }
    openBreakdown({
      kicker: 'Expected money',
      title: 'Receivables overview',
      copy: 'Wallet balances, marketplace orders, and unpaid partner bills are money expected to reach the business. Partner periods still in progress are shown for context but are not included yet.',
      empty: 'No marketplace or partner receivables are available.',
      rows
    });
  };

  const partnerBillStatusLabel = (status) => ({
    accruing: 'In progress',
    unpaid: 'Awaiting payment',
    payment_submitted: 'Payment review',
    disputed: 'Disputed',
    paid: 'Paid'
  }[String(status || '')] || String(status || 'Unknown').replace(/_/g, ' '));
  const partnerBillPeriodLabel = (bill) => bill?.period_type === 'calendar_month' ? 'Calendar month' : 'Business week';

  const renderPartnerBillsList = () => {
    const scope = state.partnerBillsScope;
    const allBills = Array.isArray(state.partnerBills?.bills) ? state.partnerBills.bills : [];
    const bills = allBills.filter((bill) => (
      scope === 'in_progress'
        ? String(bill.status || '') === 'accruing'
        : ['unpaid', 'payment_submitted', 'disputed'].includes(String(bill.status || ''))
    ));
    const inProgress = scope === 'in_progress';
    openBreakdown({
      kicker: 'Partner receivables',
      title: inProgress ? 'Partner Bills In Progress' : 'Partner Bills Due',
      copy: inProgress
        ? 'Current configured periods still accumulating partner orders. Select a bill to see its live order breakdown.'
        : 'Closed configured periods awaiting payment or review. Select a bill to see its totals and order-by-order breakdown.',
      empty: state.partnerBills?.available === false
        ? 'Partner billing is temporarily unavailable.'
        : (inProgress ? 'No partner billing periods are in progress.' : 'No partner bills are currently due.'),
      rows: bills.map((bill) => `
        <button type="button" class="admin-accounting-breakdown-row" data-accounting-partner-bill="${escapeHtml(bill.id || '')}">
          <span><strong>${escapeHtml(bill.partner_name || bill.partner_code || 'Partner')}</strong><small>${escapeHtml(partnerBillPeriodLabel(bill))} · ${escapeHtml(bill.period_label || 'Billing period')} · ${Number(bill.order_count || 0).toLocaleString('id-ID')} orders</small></span>
          <span><small>Status</small><strong>${escapeHtml(partnerBillStatusLabel(bill.status))}</strong></span>
          <span><small>${bill.status === 'paid' ? 'Paid total' : 'Bill total'}</small><strong>${formatCurrency(bill.total_amount || 0)}</strong></span>
        </button>
      `)
    });
  };

  const openPartnerBillsBreakdown = async (scope = 'due') => {
    state.partnerBillsScope = scope === 'in_progress' ? 'in_progress' : 'due';
    const inProgress = state.partnerBillsScope === 'in_progress';
    const requestId = ++state.partnerBillsRequest;
    openBreakdown({
      kicker: 'Partner receivables',
      title: inProgress ? 'Partner Bills In Progress' : 'Partner Bills Due',
      copy: 'Loading partner bills and their order details.',
      empty: 'Loading partner bills…',
      rows: []
    });
    try {
      const payload = await requestJson(buildUrl('partner_bills', { cacheBust: true }));
      if (requestId !== state.partnerBillsRequest) return;
      state.partnerBills = payload.data || { available: true, bills: [] };
      renderPartnerBillsList();
    } catch (error) {
      if (requestId !== state.partnerBillsRequest) return;
      state.partnerBills = { available: false, bills: [] };
      openBreakdown({
        kicker: 'Partner receivables',
        title: 'Partner Bills',
        copy: 'Partner bill details could not be loaded.',
        empty: error?.message || 'Partner billing is temporarily unavailable.',
        rows: []
      });
    }
  };

  const openPartnerBillDetail = (billId) => {
    const bills = Array.isArray(state.partnerBills?.bills) ? state.partnerBills.bills : [];
    const bill = bills.find((candidate) => String(candidate.id || '') === String(billId || ''));
    if (!bill || !refs.breakdownBody) return;
    const items = Array.isArray(bill.items) ? bill.items : [];
    if (refs.breakdownKicker) refs.breakdownKicker.textContent = bill.partner_name || bill.partner_code || 'Partner bill';
    if (refs.breakdownTitle) refs.breakdownTitle.textContent = `${partnerBillPeriodLabel(bill)} · ${bill.period_label || 'Billing period'}`;
    if (refs.breakdownCopy) refs.breakdownCopy.textContent = `${Number(bill.order_count || 0).toLocaleString('id-ID')} orders · ${Number(bill.unit_count || 0).toLocaleString('id-ID')} units`;
    refs.breakdownBody.innerHTML = `
      <div class="admin-accounting-partner-bill-toolbar">
        <button type="button" class="admin-back-icon-button" data-accounting-partner-bills-back aria-label="Back to all partner bills" title="Back to all partner bills"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6-6 6 6 6"/></svg></button>
        <span class="${statusClass(bill.status)}">${escapeHtml(partnerBillStatusLabel(bill.status))}</span>
      </div>
      <div class="admin-accounting-partner-bill-summary">
        <div><span>${bill.status === 'paid' ? 'Paid total' : (bill.status === 'accruing' ? 'Current total' : 'Amount due')}</span><strong>${formatCurrency(bill.total_amount || 0)}</strong></div>
        <div><span>Subtotal</span><strong>${formatCurrency(bill.subtotal_amount || 0)}</strong></div>
        <div><span>Adjustments</span><strong>${Number(bill.adjustment_amount || 0) > 0 ? `−${formatCurrency(bill.adjustment_amount)}` : formatCurrency(0)}</strong></div>
        <div><span>Due date</span><strong>${escapeHtml(formatHistoryDate(bill.due_date || ''))}</strong></div>
      </div>
      <div class="admin-accounting-partner-orders">
        <div class="admin-accounting-partner-orders-head"><strong>Order breakdown</strong><span>${Number(bill.unit_count || 0).toLocaleString('id-ID')} units</span></div>
        ${items.length ? items.map((item) => {
          const removed = String(item.status || '') === 'removed';
          const orderDate = String(item.order_date || '').slice(0, 10);
          const context = [orderDate ? formatHistoryDate(orderDate) : '', item.platform || '', item.customer_name || ''].filter(Boolean).join(' · ');
          return `
            <div class="admin-accounting-partner-order${removed ? ' is-removed' : ''}" data-accounting-partner-order="${escapeHtml(item.order_id || '')}">
              <span><strong>${escapeHtml(item.order_id || 'Order')}</strong><small>${escapeHtml(item.description || 'No product description')}</small><small>${escapeHtml(context)}</small></span>
              <span><strong>${removed ? 'Removed' : formatCurrency(item.amount || 0)}</strong><small>${Number(item.units || 0).toLocaleString('id-ID')} units${removed && item.removed_reason ? ` · ${escapeHtml(item.removed_reason)}` : ''}</small></span>
            </div>
          `;
        }).join('') : '<p class="admin-empty">No order lines are attached to this bill.</p>'}
      </div>
    `;
    refs.breakdownBody.scrollTop = 0;
    refs.breakdownBody.focus({ preventScroll: true });
  };

  const addDays = (dateString, days) => {
    const [year, month, day] = String(dateString).split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + days));
    return date.toISOString().slice(0, 10);
  };

  const openBillsBreakdown = (kind) => {
    state.partnerBillsRequest += 1;
    const today = getDateString();
    const soon = addDays(today, 7);
    const bills = state.bills.filter((bill) => {
      if (kind === 'scheduled') return ['unpaid', 'partially_paid', 'overdue'].includes(String(bill.status || ''));
      const due = String(bill.due_date || '');
      if (!due) return false;
      return kind === 'overdue' ? due < today : due >= today && due <= soon;
    });
    const title = kind === 'scheduled' ? 'Scheduled supplier bills' : (kind === 'overdue' ? 'Overdue bills' : 'Bills due in 7 days');
    const rows = bills.map((bill) => `
      <button type="button" class="admin-accounting-breakdown-row" data-accounting-breakdown-bill="${escapeHtml(String(bill.id))}">
        <span><strong>${escapeHtml(bill.vendor_name || 'Supplier')}</strong><small>${escapeHtml(bill.bill_no || bill.bill_key || 'No reference')}</small></span>
        <span><small>Due</small><strong>${escapeHtml(formatHistoryDate(bill.due_date || ''))}</strong></span>
        <span><small>Outstanding</small><strong>${formatCurrency(bill.outstanding_amount || 0)}</strong></span>
      </button>
    `);
    if (kind === 'scheduled') {
      const purchaseOrders = Array.isArray(state.summary?.purchase_order_outflow?.orders)
        ? state.summary.purchase_order_outflow.orders
        : [];
      purchaseOrders.filter((order) => Number(order.counted_amount || 0) > 0).forEach((order) => {
        const detail = [
          order.tag || '',
          String(order.status || '').replace(/_/g, ' '),
          Number(order.paid_total || 0) > 0 ? `${formatCurrency(order.paid_total)} paid` : 'No payment recorded'
        ].filter(Boolean).join(' · ');
        rows.push(`
          <a class="admin-accounting-breakdown-row is-purchase-order" href="../dashboard/?view=po-detail&amp;po=${Number(order.id || 0)}">
            <span><strong>${escapeHtml(order.po_number || 'Purchase order')}</strong><small>${escapeHtml(detail)}</small></span>
            <span><small>Type</small><strong>Purchase order</strong></span>
            <span><small>Left to pay</small><strong>${formatCurrency(order.counted_amount || 0)}</strong></span>
          </a>
        `);
      });
    }
    openBreakdown({
      kicker: 'Cash commitments',
      title,
      copy: kind === 'scheduled'
        ? 'These are unpaid supplier bills and the amount left to pay on existing purchase orders. Partner bills are receivables and never appear in this deduction.'
        : (kind === 'overdue'
        ? 'These bills need action now. Open one to pay it or correct its details.'
        : 'These are the supplier bills that affect your next seven days.'),
      empty: kind === 'scheduled' ? 'No supplier bills or purchase-order balances are going out.' : (kind === 'overdue' ? 'No overdue bills.' : 'No bills are due in the next seven days.'),
      rows
    });
  };

  const editableAccounts = () => state.accounts.filter((account) => String(account.type || '') !== 'marketplace_wallet');

  const settingsListMeta = {
    entry_types: ['Entry types', 'The workflows shown under “What happened?”'],
    brands: ['Brands', 'Business units attached to entries and bills'],
    channels: ['Channels', 'Where the transaction or order originated'],
    payment_methods: ['Payment methods', 'How money was paid or received'],
    receipt_statuses: ['Receipt statuses', 'Document-completeness choices'],
    income_types: ['Income sources', 'Types shown when other money is received']
  };
  const extensibleSettingsLists = new Set(['brands', 'channels', 'payment_methods']);
  const termLabels = {
    liquid_assets: 'Liquid assets', available_now: 'Available now', expected: 'Expected', going_out: 'Going out', scheduled_outflow: 'Scheduled outflow', projected_after_bills: 'Projected after bills', daily_entry: 'Daily entry', activity_ledger: 'Activity ledger', vendor_source: 'Vendor / Source', paid_from: 'Paid From Account', category: 'Category', amount: 'Amount', brand: 'Brand', channel: 'Channel', payment_method: 'Payment Method', receipt_status: 'Receipt Status', notes: 'Notes'
  };

  const renderOptionSettings = () => {
    if (!refs.optionSettings) return;
    refs.optionSettings.innerHTML = Object.entries(settingsListMeta).map(([key, [title, description]]) => {
      const rows = Array.isArray(state.preferences?.lists?.[key]) ? state.preferences.lists[key] : [];
      return `
        <details class="admin-accounting-option-group" data-accounting-option-group="${escapeHtml(key)}"${key === 'entry_types' ? ' open' : ''}>
          <summary><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(description)}</small></span><b>${rows.length}</b></summary>
          <div class="admin-accounting-option-rows">
            ${rows.map((row) => `
              <div class="admin-accounting-option-row" data-accounting-option-row>
                <label><span>Label</span><input type="text" data-accounting-option-label value="${escapeHtml(row.label || '')}" maxlength="120" required></label>
                <label><span>Stored value</span><input type="text" data-accounting-option-value value="${escapeHtml(row.value || '')}" maxlength="80" ${extensibleSettingsLists.has(key) ? '' : 'readonly'} required></label>
                <label class="admin-accounting-option-active"><input type="checkbox" data-accounting-option-active${row.active !== false && Number(row.active) !== 0 ? ' checked' : ''}><span>Shown</span></label>
                ${extensibleSettingsLists.has(key) ? '<button type="button" data-accounting-option-remove aria-label="Remove choice" title="Remove choice">×</button>' : ''}
              </div>
            `).join('')}
            ${extensibleSettingsLists.has(key) ? '<button type="button" class="admin-accounting-add-choice" data-accounting-option-add>+ Add choice</button>' : ''}
          </div>
        </details>
      `;
    }).join('');
  };

  const renderTermSettings = () => {
    if (!refs.termSettings) return;
    refs.termSettings.innerHTML = Object.entries(termLabels).map(([key, fallback]) => `
      <label><span>${escapeHtml(fallback)}</span><input type="text" name="${escapeHtml(key)}" value="${escapeHtml(state.preferences?.terms?.[key] || fallback)}" maxlength="120" required></label>
    `).join('');
  };

  const categoryTypes = ['income', 'expense', 'cogs_support', 'marketing', 'operations', 'payroll', 'asset', 'transfer', 'owner', 'tax', 'adjustment', 'other'];
  const renderCategorySettings = () => {
    if (!refs.categorySettings) return;
    refs.categorySettings.innerHTML = `
      <form class="admin-accounting-category-settings-form" data-accounting-category-settings-form>
        <label><span>Category to edit</span><select name="category_id"><option value="">New category</option>${state.categories.map((category) => option(category.id, categoryLabel(category))).join('')}</select></label>
        <div class="admin-accounting-settings-form-grid">
          <label><span>Name</span><input type="text" name="name" maxlength="160" placeholder="e.g. Packaging supplies" required></label>
          <label><span>Type</span><select name="type">${categoryTypes.map((type) => option(type, type.replaceAll('_', ' '))).join('')}</select></label>
          <label><span>Parent category</span><select name="parent_id"><option value="">No parent</option>${state.categories.filter((category) => category.parent_id === null).map((category) => option(category.id, category.name)).join('')}</select></label>
        </div>
        <div class="admin-accounting-category-flags">
          <label><input type="checkbox" name="requires_receipt"><span>Require a receipt</span></label>
          <label><input type="checkbox" name="is_billable" checked><span>Available on bills and entries</span></label>
          <label><input type="checkbox" name="is_active" checked><span>Active</span></label>
        </div>
        <p class="admin-form-error" data-accounting-category-settings-error hidden></p>
        <div><button type="reset" class="admin-ghost-btn">New category</button><button type="submit" class="admin-primary-btn">Save category</button></div>
      </form>
    `;
  };

  const renderSettingsWorkspace = () => {
    renderAccountSettings();
    renderCategorySettings();
    renderOptionSettings();
    renderTermSettings();
  };

  const renderAccountSettings = () => {
    if (!refs.accountList) return;
    const accounts = editableAccounts();
    refs.accountList.innerHTML = accounts.length
      ? accounts.map((account) => {
        const roles = [
          Number(account.can_pay) ? 'Pays' : '',
          Number(account.can_receive) ? 'Receives' : '',
          Number(account.receives_automatic) ? 'Automatic deposits' : ''
        ].filter(Boolean);
        const group = account.balance_class === 'cash' ? 'Available cash' : (account.balance_class === 'bank' ? 'Bank balance' : 'Other');
        return `
          <button type="button" data-accounting-account-edit="${escapeHtml(String(account.id))}">
            <span><strong>${escapeHtml(account.name || 'Account')}</strong><small>${escapeHtml(group)}</small></span>
            <span>${escapeHtml(roles.join(' · ') || 'Ledger only')}</span>
          </button>
        `;
      }).join('')
      : '<p class="admin-empty">No operational accounts yet.</p>';
  };

  const fillAccountForm = (account = null) => {
    if (!(refs.accountForm instanceof HTMLFormElement)) return;
    refs.accountForm.reset();
    refs.accountForm.elements.account_id.value = account ? String(account.id) : '';
    refs.accountForm.elements.name.value = account?.name || '';
    refs.accountForm.elements.balance_class.value = account?.balance_class || 'bank';
    refs.accountForm.elements.can_pay.checked = Boolean(Number(account?.can_pay || 0));
    refs.accountForm.elements.can_receive.checked = Boolean(Number(account?.can_receive || 0));
    refs.accountForm.elements.receives_automatic.checked = Boolean(Number(account?.receives_automatic || 0));
    if (refs.accountError) refs.accountError.hidden = true;
  };

  const openAccountSettings = () => {
    if (!refs.accountSettings) return;
    renderSettingsWorkspace();
    fillAccountForm(editableAccounts()[0] || null);
    activateSettingsTab('accounts');
    refs.accountSettings.hidden = false;
    refs.accountSettingsCard?.focus();
  };

  const activateSettingsTab = (tab) => {
    refs.settingsTabs.forEach((button) => button.classList.toggle('is-active', button.dataset.accountingSettingsTab === tab));
    refs.settingsPanels.forEach((panel) => { panel.hidden = panel.dataset.accountingSettingsPanel !== tab; });
  };

  const submitPreferences = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) return;
    const preferences = JSON.parse(JSON.stringify(state.preferences));
    if (form.dataset.accountingPreferencesForm === 'lists') {
      refs.optionSettings?.querySelectorAll('[data-accounting-option-group]').forEach((group) => {
        const key = group.getAttribute('data-accounting-option-group') || '';
        preferences.lists[key] = [...group.querySelectorAll('[data-accounting-option-row]')].map((row) => ({
          value: row.querySelector('[data-accounting-option-value]')?.value.trim() || '',
          label: row.querySelector('[data-accounting-option-label]')?.value.trim() || '',
          active: Boolean(row.querySelector('[data-accounting-option-active]')?.checked)
        })).filter((row) => row.value && row.label);
      });
    } else {
      new FormData(form).forEach((value, key) => { preferences.terms[key] = String(value).trim(); });
    }
    try {
      const payload = await requestJson(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save_ui_preferences', preferences }) });
      state.preferences = payload.data?.result?.preferences || preferences;
      renderPreferenceDrivenControls();
      renderSettingsWorkspace();
      writeCacheEntry(ACCOUNTING_LOOKUPS_CACHE_KEY, getLookupPayload());
      showToast('Accounting settings saved.');
    } catch (error) {
      showToast(error?.message || 'Unable to save accounting settings.', true);
    }
  };

  const submitCategorySettings = async (form) => {
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());
    payload.action = 'save_category';
    payload.requires_receipt = data.has('requires_receipt') ? '1' : '0';
    payload.is_billable = data.has('is_billable') ? '1' : '0';
    payload.is_active = data.has('is_active') ? '1' : '0';
    try {
      await requestJson(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      state.lookupsLoaded = false;
      await loadLookups(true);
      renderSettingsWorkspace();
      showToast('Category saved.');
    } catch (error) {
      const node = form.querySelector('[data-accounting-category-settings-error]');
      if (node) { node.hidden = false; node.textContent = error?.message || 'Unable to save category.'; }
    }
  };

  const closeAccountSettings = () => {
    if (!refs.accountSettings) return;
    refs.accountSettings.hidden = true;
  };

  const submitAccount = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) return;
    const data = new FormData(form);
    const payload = {
      action: 'save_account',
      account_id: String(data.get('account_id') || ''),
      name: String(data.get('name') || '').trim(),
      balance_class: String(data.get('balance_class') || 'bank'),
      can_pay: data.has('can_pay') ? '1' : '0',
      can_receive: data.has('can_receive') ? '1' : '0',
      receives_automatic: data.has('receives_automatic') ? '1' : '0'
    };
    if (!payload.name) {
      if (refs.accountError) {
        refs.accountError.hidden = false;
        refs.accountError.textContent = 'Enter an account name.';
      }
      return;
    }
    try {
      await requestJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      showToast('Account options saved.');
      await loadAccounting(true);
      renderAccountSettings();
      const saved = state.accounts.find((account) => account.name === payload.name);
      fillAccountForm(saved || null);
    } catch (error) {
      if (refs.accountError) {
        refs.accountError.hidden = false;
        refs.accountError.textContent = error?.message || 'Unable to save account.';
      }
    }
  };

  const closeReconcile = () => {
    if (!refs.reconcile) return;
    refs.reconcile.hidden = true;
    if (refs.reconcileError) refs.reconcileError.hidden = true;
  };

  const openReconcile = (scope = 'cash') => {
    if (!refs.reconcile) return;
    const balanceClass = scope === 'bank' ? 'bank' : 'cash';
    const accounts = state.accounts.filter((account) => (
      String(account.type || '') !== 'marketplace_wallet' && account.balance_class === balanceClass
    ));
    if (refs.reconcileAccount) {
      refs.reconcileAccount.innerHTML = accounts.map((account) => option(account.id, account.name)).join('');
    }
    if (refs.reconcileAmount) {
      const amount = balanceClass === 'bank'
        ? state.summary?.kpis?.bank_balance
        : state.summary?.kpis?.cash_available;
      refs.reconcileAmount.value = normalizeAmountInput(String(amount || 0));
    }
    if (refs.reconcileTitle) refs.reconcileTitle.textContent = balanceClass === 'bank' ? 'Reconcile bank balance' : 'Reconcile available cash';
    if (refs.reconcileCopy) {
      refs.reconcileCopy.textContent = balanceClass === 'bank'
        ? 'Use the verified statement balance. Later deposits, payments, and transfers move from this bank baseline.'
        : 'Use the physical amount counted now. Later cash receipts, payments, and transfers move from this baseline.';
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
        refs.reconcileError.textContent = 'Enter the balance you verified.';
      }
      return;
    }
    try {
      await requestJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reconcile_cash',
          account_id: String(data.get('account_id') || ''),
          available_cash_amount: amount,
          note: String(data.get('note') || '').trim()
        })
      });
      closeReconcile();
      state.cashHistoryLoaded = false;
      showToast('Account balance reconciled.');
      await loadAccounting(true);
    } catch (error) {
      if (refs.reconcileError) {
        refs.reconcileError.hidden = false;
        refs.reconcileError.textContent = error?.message || 'Unable to reconcile this balance.';
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
    const query = state.ledgerSearch.trim().toLowerCase();
    const rows = state.ledger.filter((row) => {
      const impact = String(row.impact || '');
      const impactMatches = state.ledgerImpact === 'all'
        || impact === state.ledgerImpact
        || (state.ledgerImpact === 'transfer' && /transfer/i.test(`${row.title || ''} ${row.subtitle || ''}`));
      if (!impactMatches) return false;
      if (!query) return true;
      return [row.title, row.subtitle, row.account, row.category, row.note, row.reference, row.status, row.kind, row.date]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
    if (refs.ledgerMeta) {
      const total = state.ledger.length;
      refs.ledgerMeta.textContent = rows.length === total
        ? `${total.toLocaleString('id-ID')} entries · manual + automatic`
        : `${rows.length.toLocaleString('id-ID')} of ${total.toLocaleString('id-ID')} entries`;
    }
    refs.ledgerClear?.classList.toggle('is-visible', Boolean(query || state.ledgerImpact !== 'all' || state.month !== getMonthKey()));
    if (!rows.length) {
      refs.ledgerBody.innerHTML = `<p class="admin-empty">${state.ledger.length ? 'No entries match these filters.' : 'No entries for this month yet.'}</p>`;
      return;
    }
    refs.ledgerBody.innerHTML = rows.map((row) => {
      const amountClass = ['cash_in', 'baseline'].includes(String(row.impact || ''))
        ? 'is-added'
        : (row.impact === 'cash_out' ? 'is-subtracted' : '');
      const prefix = row.impact === 'cash_in' ? '+' : (row.impact === 'cash_out' ? '−' : '');
      const canOpen = ['transaction', 'bill'].includes(String(row.kind || ''));
      const details = [row.subtitle, row.account].filter(Boolean).join(' · ');
      const receiptUrl = safeReceiptUrl(row.receipt_url || '');
      return `
        <div class="admin-accounting-ledger-row">
          <time>${escapeHtml(formatHistoryDate(row.date || ''))}</time>
          <span class="admin-accounting-ledger-mark is-${escapeHtml(row.impact || 'entry')}" aria-hidden="true"></span>
          <${canOpen ? 'button' : 'span'} class="admin-accounting-ledger-copy" ${canOpen ? `type="button" data-accounting-ledger-open="${escapeHtml(row.kind)}:${escapeHtml(String(row.source_id || ''))}"` : ''}>
            <strong>${escapeHtml(row.title || 'Accounting entry')}</strong>
            ${details ? `<small>${escapeHtml(details)}</small>` : ''}
          </${canOpen ? 'button' : 'span'}>
          <span class="admin-accounting-ledger-field admin-accounting-ledger-category">
            <b>Category</b>
            <span>${escapeHtml(row.category || '—')}</span>
          </span>
          <span class="admin-accounting-ledger-field admin-accounting-ledger-note">
            <b>Note</b>
            <span>${escapeHtml(row.note || '—')}</span>
          </span>
          ${receiptUrl ? `
            <button type="button" class="admin-accounting-review-receipt" data-accounting-receipt-open="${escapeHtml(receiptUrl)}" data-accounting-receipt-name="${escapeHtml(row.receipt_name || row.reference || 'Receipt')}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5c-5.2 0-9.2 4.1-10.5 7.5C2.8 15.4 6.8 19.5 12 19.5s9.2-4.1 10.5-7.5C21.2 8.6 17.2 4.5 12 4.5Zm0 12.2a4.7 4.7 0 1 1 0-9.4 4.7 4.7 0 0 1 0 9.4Zm0-2.4a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6Z"/></svg>
              <span>Review receipt</span>
            </button>
          ` : ''}
          <span class="admin-accounting-ledger-state">${escapeHtml(String(row.status || '').replace(/_/g, ' '))}</span>
          <strong class="admin-accounting-ledger-amount ${amountClass}">${prefix}${formatCurrency(row.amount || 0)}</strong>
        </div>
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
      const drawerAccountRole = kind === 'bill' || item.direction !== 'money_in' ? 'pay' : 'receive';
      const accountOptions = [option('', 'Choose account'), ...accountOptionsForRole(drawerAccountRole)
        .map((account) => option(account.id, account.name, Number(account.id) === Number(item.account_id || item.expected_account_id)))].join('');
      const receiptOptions = activeChoices('receipt_statuses')
        .filter((row) => ['missing', 'attached', 'not_required'].includes(String(row.value)))
        .map((row) => option(row.value, row.label, String(row.value) === item.receipt_status)).join('');
      refs.drawerBody.innerHTML = kind === 'bill' ? `
        <form class="admin-accounting-edit-form" data-accounting-edit-form data-kind="bill" data-id="${escapeHtml(String(item.id))}">
          <label><span>Bill / invoice no.</span><input name="bill_no" value="${escapeHtml(item.bill_no || '')}"></label>
          <label><span>Bill date</span><input type="date" name="issue_date" value="${escapeHtml(item.issue_date || '')}" required></label>
          <label><span>Due date</span><input type="date" name="due_date" value="${escapeHtml(item.due_date || '')}"></label>
          <label><span>Total</span><input name="total_amount" inputmode="numeric" value="${escapeHtml(String(item.total_amount || ''))}" ${Number(item.paid_amount || 0) > 0 ? 'disabled' : ''} required></label>
          <label><span>Category</span>${categoryComboboxMarkup(item.category_id)}</label>
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
          <label><span>Category</span>${categoryComboboxMarkup(item.category_id)}</label>
          <label><span>Receipt status</span><select name="receipt_status">${receiptOptions}</select></label>
          <label><span>Receipt URL</span><input type="url" name="receipt_url" value="${escapeHtml(item.receipt_url || '')}"></label>
          <label><span>Reference no.</span><input name="reference_no" value="${escapeHtml(item.reference_no || '')}"></label>
          <label><span>Order / SKU</span><input name="order_no" value="${escapeHtml(item.order_no || '')}"></label>
          <label class="admin-accounting-form-wide"><span>Notes</span><textarea name="notes" rows="4">${escapeHtml(item.notes || '')}</textarea></label>
          <p class="admin-form-error" data-accounting-edit-error hidden></p>
          <button type="submit" class="admin-primary-btn">Save correction</button>
        </form>
      `;
      refs.drawerBody.querySelectorAll('[data-accounting-category-combobox]').forEach(renderCategoryCombobox);
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
    const [accounts, categories, counterparties, preferences] = await Promise.all([
      requestJson(buildUrl('accounts', { cacheBust: force })),
      requestJson(buildUrl('categories', { cacheBust: force })),
      requestJson(buildUrl('counterparties', { cacheBust: force })),
      requestJson(buildUrl('ui_preferences', { cacheBust: force }))
    ]);
    const payload = {
      accounts: Array.isArray(accounts.data?.accounts) ? accounts.data.accounts : [],
      categories: Array.isArray(categories.data?.categories) ? categories.data.categories : [],
      counterparties: Array.isArray(counterparties.data?.counterparties) ? counterparties.data.counterparties : [],
      preferences: preferences.data?.preferences || defaultPreferences
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
    const billOptions = { month: options.month, status: 'open', limit: '200' };
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
      return 'This looks like marketplace revenue. Payouts are added automatically when they reach the bank.';
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
      const receiptFile = refs.receiptFile?.files?.[0] || null;
      if (receiptFile) {
        const multipartBody = new FormData();
        Object.entries(payload).forEach(([key, value]) => multipartBody.append(key, String(value ?? '')));
        multipartBody.set('receipt_status', 'attached');
        multipartBody.append('receipt_file', receiptFile, receiptFile.name);
        await requestJson(endpoint, { method: 'POST', body: multipartBody });
      } else {
        await requestJson(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      if (refs.formStatus) refs.formStatus.textContent = 'Saved';
      showToast('Saved');
      await loadAccounting(true);
      if (submitter?.hasAttribute('data-accounting-save-add')) {
        if (refs.amountInput) refs.amountInput.value = '';
        if (refs.receiptFile) refs.receiptFile.value = '';
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
  refs.ledgerImpact?.addEventListener('change', () => {
    state.ledgerImpact = refs.ledgerImpact?.value || 'all';
    renderLedger();
  });
  refs.ledgerSearch?.addEventListener('input', () => {
    state.ledgerSearch = refs.ledgerSearch?.value || '';
    renderLedger();
  });
  refs.ledgerClear?.addEventListener('click', async () => {
    const monthChanged = state.month !== getMonthKey();
    state.ledgerImpact = 'all';
    state.ledgerSearch = '';
    if (refs.ledgerImpact) refs.ledgerImpact.value = 'all';
    if (refs.ledgerSearch) refs.ledgerSearch.value = '';
    if (monthChanged) {
      state.month = getMonthKey();
      await loadSafely(false);
    } else {
      renderLedger();
    }
  });

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
  refs.receiptFile?.addEventListener('change', () => {
    if (refs.receiptFile?.files?.length && refs.receiptStatus) {
      refs.receiptStatus.value = 'attached';
    }
  });
  root.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const trigger = target?.closest('[data-accounting-category-trigger]');
    if (trigger instanceof HTMLButtonElement) {
      const combobox = trigger.closest('[data-accounting-category-combobox]');
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        closeCategoryCombobox(combobox);
      } else {
        openCategoryCombobox(combobox);
      }
      return;
    }
    const optionButton = target?.closest('[data-accounting-category-option]');
    if (optionButton instanceof HTMLButtonElement) {
      const combobox = optionButton.closest('[data-accounting-category-combobox]');
      const valueInput = combobox?.querySelector('[data-accounting-category-value]');
      const comboboxTrigger = combobox?.querySelector('[data-accounting-category-trigger]');
      if (valueInput instanceof HTMLInputElement) {
        valueInput.value = optionButton.dataset.accountingCategoryOption || '';
        valueInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      renderCategoryCombobox(combobox);
      closeCategoryCombobox(combobox);
      if (comboboxTrigger instanceof HTMLButtonElement) comboboxTrigger.focus();
    }
  });
  root.addEventListener('input', (event) => {
    const searchInput = event.target;
    if (!(searchInput instanceof HTMLInputElement) || !searchInput.matches('[data-accounting-category-search]')) return;
    renderCategoryCombobox(searchInput.closest('[data-accounting-category-combobox]'));
  });
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('[data-accounting-category-combobox]')) closeCategoryComboboxes();
  });
  refs.billSelect?.addEventListener('change', fillPayBillAmount);
  refs.form?.addEventListener('submit', submitForm);
  refs.form?.addEventListener('reset', () => {
    if (resettingForm) return;
    window.setTimeout(resetForm, 0);
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
    const receipt = event.target instanceof Element ? event.target.closest('[data-accounting-receipt-open]') : null;
    if (receipt instanceof HTMLElement) {
      openReceipt(receipt.dataset.accountingReceiptOpen || '', receipt.dataset.accountingReceiptName || 'Receipt');
      return;
    }
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
  refs.cashHistoryOpenButtons.forEach((button) => {
    button.addEventListener('click', () => openCashHistory(button.dataset.accountingCashHistoryOpen || 'all'));
  });
  refs.cashHistoryCloseButtons.forEach((button) => button.addEventListener('click', closeCashHistory));
  refs.cashHistoryBalanceClass?.addEventListener('change', () => {
    if (refs.cashHistoryAccount) refs.cashHistoryAccount.value = 'all';
    renderCashHistory();
  });
  refs.cashHistoryAccount?.addEventListener('change', renderCashHistory);
  refs.cashHistoryDirection?.addEventListener('change', renderCashHistory);
  refs.marketplaceOpen?.addEventListener('click', openMarketplaceBreakdown);
  refs.liquidityAssetsBar?.addEventListener('pointerover', (event) => {
    const segment = event.target instanceof Element ? event.target.closest('[data-accounting-liquidity-segment]') : null;
    if (segment instanceof HTMLElement) positionLiquidityTooltip(segment);
  });
  refs.liquidityAssetsBar?.addEventListener('pointerout', (event) => {
    const segment = event.target instanceof Element ? event.target.closest('[data-accounting-liquidity-segment]') : null;
    if (segment instanceof HTMLElement && !segment.contains(event.relatedTarget)) hideLiquidityTooltip();
  });
  refs.liquidityAssetsBar?.addEventListener('focusin', (event) => {
    const segment = event.target instanceof Element ? event.target.closest('[data-accounting-liquidity-segment]') : null;
    if (segment instanceof HTMLElement) positionLiquidityTooltip(segment);
  });
  refs.liquidityAssetsBar?.addEventListener('focusout', (event) => {
    const segment = event.target instanceof Element ? event.target.closest('[data-accounting-liquidity-segment]') : null;
    if (segment instanceof HTMLElement && !segment.contains(event.relatedTarget)) hideLiquidityTooltip();
  });
  window.addEventListener('resize', repositionActiveLiquidityTooltip);
  window.addEventListener('scroll', repositionActiveLiquidityTooltip, true);
  refs.liquidityAssetsBar?.addEventListener('click', (event) => {
    const segment = event.target instanceof Element ? event.target.closest('[data-accounting-liquidity-segment]') : null;
    if (!(segment instanceof HTMLElement)) return;
    hideLiquidityTooltip();
    const kind = segment.dataset.accountingLiquiditySegment || '';
    if (kind === 'bank' || kind === 'cash') {
      openCashHistory(kind);
      return;
    }
    if (kind === 'partner') {
      openPartnerBillsBreakdown('due');
      return;
    }
    if (kind === 'outflow') {
      openBillsBreakdown('scheduled');
      return;
    }
    openMarketplaceBreakdown();
  });
  refs.partnerBillsOpenButtons.forEach((button) => {
    button.addEventListener('click', () => openPartnerBillsBreakdown(button.dataset.accountingPartnerBillsOpen || 'due'));
  });
  refs.billsOpenButtons.forEach((button) => {
    button.addEventListener('click', () => openBillsBreakdown(button.dataset.accountingBillsOpen || 'due'));
  });
  refs.breakdownCloseButtons.forEach((button) => button.addEventListener('click', closeBreakdown));
  refs.breakdownBody?.addEventListener('click', (event) => {
    const partnerReceivable = event.target instanceof Element ? event.target.closest('[data-accounting-receivable-partner]') : null;
    if (partnerReceivable instanceof HTMLElement) {
      openPartnerBillsBreakdown(partnerReceivable.dataset.accountingReceivablePartner || 'due');
      return;
    }
    const partnerBill = event.target instanceof Element ? event.target.closest('[data-accounting-partner-bill]') : null;
    if (partnerBill instanceof HTMLElement) {
      openPartnerBillDetail(partnerBill.dataset.accountingPartnerBill || '');
      return;
    }
    const partnerBillsBack = event.target instanceof Element ? event.target.closest('[data-accounting-partner-bills-back]') : null;
    if (partnerBillsBack instanceof HTMLElement) {
      renderPartnerBillsList();
      return;
    }
    const target = event.target instanceof Element ? event.target.closest('[data-accounting-breakdown-bill]') : null;
    if (!(target instanceof HTMLElement)) return;
    closeBreakdown();
    openDrawer('bill', target.dataset.accountingBreakdownBill || '');
  });
  refs.reconcileOpenButtons.forEach((button) => {
    button.addEventListener('click', () => openReconcile(button.dataset.accountingReconcileOpen || 'cash'));
  });
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
  const downloadPembukuan = async (button) => {
    if (button.disabled) return;
    button.disabled = true;
    const originalLabel = button.textContent;
    button.textContent = 'Preparing…';
    try {
      const format = button.dataset.accountingPembukuanExport || 'xlsx';
      const response = await fetch(buildUrl('export_pembukuan', { ...rangeOptions(), format }), {
        credentials: 'same-origin'
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const detail = Array.isArray(payload.errors) ? payload.errors[0] : null;
        const message = [payload.error, detail?.record, detail?.expected_correction].filter(Boolean).join(' — ');
        throw new Error(message || 'Unable to generate Pembukuan.');
      }
      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') || '';
      const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || `pembukuan.${format}`;
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      button.closest('details')?.removeAttribute('open');
      showToast('Pembukuan downloaded.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to generate Pembukuan.', true);
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  };
  refs.pembukuanExportButtons.forEach((button) => {
    button.addEventListener('click', () => downloadPembukuan(button));
  });
  refs.settingsButton?.addEventListener('click', openAccountSettings);
  refs.accountSettingsCloseButtons.forEach((button) => button.addEventListener('click', closeAccountSettings));
  refs.settingsTabs.forEach((button) => button.addEventListener('click', () => activateSettingsTab(button.dataset.accountingSettingsTab || 'accounts')));
  refs.preferenceForms.forEach((form) => form.addEventListener('submit', submitPreferences));
  refs.optionSettings?.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const remove = target?.closest('[data-accounting-option-remove]');
    if (remove) {
      remove.closest('[data-accounting-option-row]')?.remove();
      return;
    }
    const add = target?.closest('[data-accounting-option-add]');
    if (!add) return;
    const rows = add.closest('.admin-accounting-option-rows');
    const row = document.createElement('div');
    row.className = 'admin-accounting-option-row';
    row.dataset.accountingOptionRow = '';
    row.innerHTML = '<label><span>Label</span><input type="text" data-accounting-option-label maxlength="120" required></label><label><span>Stored value</span><input type="text" data-accounting-option-value maxlength="80" placeholder="Unique value" required></label><label class="admin-accounting-option-active"><input type="checkbox" data-accounting-option-active checked><span>Shown</span></label><button type="button" data-accounting-option-remove aria-label="Remove choice" title="Remove choice">×</button>';
    rows?.insertBefore(row, add);
    row.querySelector('input')?.focus();
  });
  refs.categorySettings?.addEventListener('change', (event) => {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement) || select.name !== 'category_id') return;
    const form = select.closest('form');
    if (!(form instanceof HTMLFormElement)) return;
    const category = state.categories.find((item) => Number(item.id) === Number(select.value));
    form.elements.name.value = category?.name || '';
    form.elements.type.value = category?.type || 'expense';
    form.elements.parent_id.value = category?.parent_id ? String(category.parent_id) : '';
    form.elements.requires_receipt.checked = Boolean(Number(category?.requires_receipt || 0));
    form.elements.is_billable.checked = category ? Boolean(Number(category.is_billable)) : true;
    form.elements.is_active.checked = true;
  });
  refs.categorySettings?.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-accounting-category-settings-form]')) return;
    event.preventDefault();
    submitCategorySettings(form);
  });
  refs.accountNew?.addEventListener('click', () => fillAccountForm());
  refs.accountList?.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-accounting-account-edit]') : null;
    if (!(target instanceof HTMLElement)) return;
    const account = state.accounts.find((item) => Number(item.id) === Number(target.dataset.accountingAccountEdit));
    if (account) fillAccountForm(account);
  });
  refs.accountForm?.addEventListener('submit', submitAccount);
  refs.accountForm?.elements.receives_automatic?.addEventListener('change', () => {
    if (refs.accountForm.elements.receives_automatic.checked) {
      refs.accountForm.elements.can_receive.checked = true;
    }
  });
  refs.drawerCloseButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (refs.drawer) refs.drawer.hidden = true;
    });
  });
  refs.receiptCloseButtons.forEach((button) => button.addEventListener('click', closeReceipt));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const openCombobox = root.querySelector('[data-accounting-category-trigger][aria-expanded="true"]')?.closest('[data-accounting-category-combobox]');
      const categoryTrigger = openCombobox?.querySelector('[data-accounting-category-trigger]');
      closeCategoryComboboxes();
      if (categoryTrigger instanceof HTMLButtonElement) categoryTrigger.focus();
      closeCashHistory();
      closeBreakdown();
      closeReconcile();
      closeAccountSettings();
      closeReceipt();
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
