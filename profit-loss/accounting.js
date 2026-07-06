const root = document.querySelector('[data-accounting-page]');

if (root) {
  const DASHBOARD_TIMEZONE = 'Asia/Jakarta';
  const endpoint = root.dataset.accountingEndpoint || '../api/accounting/';
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

  const state = {
    month: getMonthKey(),
    range: 'this_month',
    mode: 'expense_paid',
    insightTab: 'category',
    summary: null,
    bills: [],
    transactions: [],
    reviewQueue: [],
    accounts: [],
    categories: [],
    counterparties: [],
    lookupsLoaded: false
  };

  const refs = {
    view: root.querySelector('[data-accounting-view]'),
    status: root.querySelector('[data-accounting-status]'),
    refresh: root.querySelector('[data-accounting-refresh]'),
    monthInput: root.querySelector('[data-accounting-month-select]'),
    dateFrom: root.querySelector('[data-accounting-date-from]'),
    dateTo: root.querySelector('[data-accounting-date-to]'),
    rangeButtons: root.querySelectorAll('[data-accounting-range]'),
    openModeButtons: root.querySelectorAll('[data-accounting-open-mode]'),
    exportButton: root.querySelector('[data-accounting-export]'),
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
    alerts: root.querySelector('[data-accounting-alerts]'),
    form: root.querySelector('[data-accounting-form]'),
    formStatus: root.querySelector('[data-accounting-form-status]'),
    formError: root.querySelector('[data-accounting-form-error]'),
    modeButtons: root.querySelectorAll('[data-accounting-quick-mode]'),
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
    reviewBody: root.querySelector('[data-accounting-review-body]'),
    billsMeta: root.querySelector('[data-accounting-bills-meta]'),
    ledgerMeta: root.querySelector('[data-accounting-ledger-meta]'),
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
      'channel'
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

  const amountInputToRaw = (value) => String(value || '').replace(/[^0-9]/g, '');
  const normalizeAmountInput = (value) => {
    const raw = amountInputToRaw(value);
    return raw ? formatCurrency(raw) : '';
  };
  const statusClass = (status) => `admin-accounting-chip admin-accounting-chip-${String(status || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const option = (value, label, selected = false) => `<option value="${escapeHtml(String(value))}"${selected ? ' selected' : ''}>${escapeHtml(label)}</option>`;

  const modeConfig = {
    expense_paid: {
      helper: 'Use this when money already left the business.',
      action: 'create_transaction',
      type: 'expense',
      direction: 'money_out',
      shown: ['transaction_date', 'account_id', 'category_id', 'counterparty']
    },
    bill_received: {
      helper: 'Use this when we owe money but have not paid yet.',
      action: 'create_bill',
      shown: ['issue_date', 'due_date', 'category_id', 'counterparty', 'bill_no']
    },
    pay_bill: {
      helper: 'Use this when paying a bill already saved below.',
      action: 'mark_bill_paid',
      shown: ['transaction_date', 'bill_id', 'account_id']
    },
    transfer: {
      helper: 'Use this for wallet payout, bank transfer, cash deposit, or moving money. This does not count as income or expense.',
      action: 'create_transaction',
      type: 'transfer',
      direction: 'internal_transfer',
      shown: ['transaction_date', 'account_id', 'to_account_id', 'transfer_fee_amount']
    },
    manual_income: {
      helper: 'Use only for non-marketplace income, owner injection, refund, reimbursement, or offline/manual customer payment.',
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
    const accountOptions = [
      option('', 'Choose account'),
      ...accounts.map((account) => option(account.id, `${account.name}${Number(account.is_spendable) ? '' : ' (not spendable)'}`))
    ].join('');
    if (refs.accountSelect) refs.accountSelect.innerHTML = accountOptions;
    if (refs.toAccountSelect) refs.toAccountSelect.innerHTML = accountOptions;
    if (refs.categorySelect) {
      refs.categorySelect.innerHTML = [
        option('', 'Choose category'),
        ...categories.map((category) => option(category.id, category.parent_name ? `${category.parent_name} - ${category.name}` : category.name))
      ].join('');
    }
    if (refs.billSelect) {
      refs.billSelect.innerHTML = [
        option('', 'Choose bill'),
        ...openBills.map((bill) => option(bill.id, `${bill.vendor_name || 'Vendor'} - ${bill.bill_no || bill.bill_key} - ${formatCurrency(bill.outstanding_amount || 0)}`))
      ].join('');
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

  const resetForm = () => {
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
  };

  const renderKpis = (summary) => {
    const kpis = summary?.kpis || {};
    if (refs.kpis.realCash) refs.kpis.realCash.textContent = formatCurrency(kpis.real_cash_available || 0);
    if (refs.kpis.marketplaceOutstanding) refs.kpis.marketplaceOutstanding.textContent = formatCurrency(kpis.marketplace_outstanding || 0);
    if (refs.kpis.billsDue) refs.kpis.billsDue.textContent = formatCurrency(kpis.bills_due_soon || 0);
    if (refs.kpis.overdue) refs.kpis.overdue.textContent = formatCurrency(kpis.overdue_bills || 0);
    if (refs.kpis.expenses) refs.kpis.expenses.textContent = formatCurrency(kpis.expenses_this_month || 0);
    if (refs.kpis.safeCash) refs.kpis.safeCash.textContent = formatCurrency(kpis.net_safe_cash || 0);
    if (refs.kpis.pendingReview) refs.kpis.pendingReview.textContent = Number(kpis.pending_manual_review || 0).toLocaleString('id-ID');
    refs.safeCashCard?.classList.toggle('is-danger', Number(kpis.net_safe_cash || 0) < 0);
  };

  const renderAlerts = (summary) => {
    if (!refs.alerts) return;
    const alerts = Array.isArray(summary?.alerts) ? summary.alerts : [];
    if (!alerts.length) {
      refs.alerts.innerHTML = '<div class="admin-accounting-alert"><strong>No urgent alerts</strong><span>Accounting checks will appear after data loads.</span></div>';
      return;
    }
    refs.alerts.innerHTML = alerts.map((alert) => `
      <button type="button" class="admin-accounting-alert admin-accounting-alert-${escapeHtml(alert.type || 'info')}">
        <strong>${escapeHtml(alert.title || 'Alert')}</strong>
        <span>${Number(alert.amount || 0) > 0 ? formatCurrency(alert.amount) : escapeHtml(alert.action || 'Review')}</span>
      </button>
    `).join('');
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
            <button type="button" class="admin-ghost-btn" data-accounting-view-bill="${escapeHtml(String(bill.id))}">View</button>
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
            <button type="button" class="admin-ghost-btn" data-accounting-view-transaction="${escapeHtml(String(row.id))}">View</button>
            <button type="button" class="admin-danger-btn" data-accounting-void-transaction="${escapeHtml(String(row.id))}">Void</button>
          </div>
        </td>
      </tr>
    `).join('');
  };

  const renderSummary = (summary) => {
    if (!refs.monthlySummary) return;
    const monthly = summary?.monthly_summary || {};
    const rows = [
      ['Sales Revenue Context', monthly.sales_revenue_context || 0],
      ['Gross Profit Context', monthly.gross_profit_context || 0],
      ['Paid Operating Expenses', monthly.paid_operating_expenses || 0],
      ['Marketing Expenses', monthly.marketing_expenses || 0],
      ['Production / COGS Support', monthly.production_cogs_support_expenses || 0],
      ['Payroll / Labor', monthly.payroll_labor || 0],
      ['Software / Admin', monthly.software_admin || 0],
      ['Owner Draw', monthly.owner_draw || 0],
      ['Owner Injection', monthly.owner_injection || 0],
      ['Manual Income', monthly.manual_income || 0],
      ['Transfers In', monthly.transfers_in || 0],
      ['Transfers Out', monthly.transfers_out || 0],
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
        <td><button type="button" class="admin-soft-btn" data-accounting-resolve-review="${escapeHtml(String(row.id))}">Mark reviewed</button></td>
      </tr>
    `).join('');
  };

  const openDrawer = (kind, id) => {
    const collection = kind === 'bill' ? state.bills : state.transactions;
    const item = collection.find((row) => Number(row.id) === Number(id));
    if (!item || !refs.drawer) return;
    if (refs.drawerKicker) refs.drawerKicker.textContent = kind === 'bill' ? 'Bill' : 'Transaction';
    if (refs.drawerTitle) refs.drawerTitle.textContent = kind === 'bill'
      ? (item.bill_no || item.bill_key || 'Bill')
      : (item.transaction_key || 'Transaction');
    if (refs.drawerBody) {
      const entries = Object.entries(item).filter(([, value]) => value !== null && value !== '');
      refs.drawerBody.innerHTML = entries.map(([key, value]) => `
        <div class="admin-accounting-detail-row">
          <span>${escapeHtml(key.replace(/_/g, ' '))}</span>
          <strong>${escapeHtml(String(value))}</strong>
        </div>
      `).join('');
    }
    refs.drawer.hidden = false;
  };

  const render = () => {
    if (refs.monthInput) refs.monthInput.value = state.month;
    renderKpis(state.summary);
    renderAlerts(state.summary);
    renderBills();
    renderTransactions();
    renderSummary(state.summary);
    renderInsights(state.summary);
    renderReviewQueue();
    renderLookups();
    if (refs.status) {
      const time = new Intl.DateTimeFormat('en-GB', {
        timeZone: DASHBOARD_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date());
      refs.status.textContent = `Accounting updated ${time} WIB`;
    }
  };

  const loadLookups = async (force = false) => {
    if (state.lookupsLoaded && !force) {
      renderLookups();
      return;
    }
    const [accounts, categories, counterparties] = await Promise.all([
      requestJson(buildUrl('accounts', { cacheBust: force })),
      requestJson(buildUrl('categories', { cacheBust: force })),
      requestJson(buildUrl('counterparties', { cacheBust: force }))
    ]);
    state.accounts = Array.isArray(accounts.data?.accounts) ? accounts.data.accounts : [];
    state.categories = Array.isArray(categories.data?.categories) ? categories.data.categories : [];
    state.counterparties = Array.isArray(counterparties.data?.counterparties) ? counterparties.data.counterparties : [];
    state.lookupsLoaded = true;
    renderLookups();
  };

  const loadAccounting = async (force = false) => {
    const options = rangeOptions();
    if (refs.status) refs.status.textContent = 'Loading accounting data';
    const billOptions = {
      ...options,
      due_from: options.date_from || '',
      due_to: options.date_to || '',
      status: 'open'
    };
    const [summary, bills, transactions, review] = await Promise.all([
      requestJson(buildUrl('summary', { ...options, cacheBust: force })),
      requestJson(buildUrl('bills', { ...billOptions, cacheBust: force })),
      requestJson(buildUrl('transactions', { ...options, cacheBust: force })),
      requestJson(buildUrl('review_queue', { ...options, cacheBust: force })),
      loadLookups(force)
    ]);
    state.summary = summary.data || {};
    state.bills = Array.isArray(bills.data?.bills) ? bills.data.bills : [];
    state.transactions = Array.isArray(transactions.data?.transactions) ? transactions.data.transactions : [];
    state.reviewQueue = Array.isArray(review.data?.review_queue) ? review.data.review_queue : [];
    render();
  };

  const loadSafely = async (force = false) => {
    try {
      await loadAccounting(force);
    } catch (error) {
      const message = error?.message || 'Could not load accounting data';
      if (refs.status) refs.status.textContent = message;
      if (refs.billsBody) refs.billsBody.innerHTML = `<tr><td colspan="13" class="admin-empty">${escapeHtml(message)}</td></tr>`;
      if (refs.transactionsBody) refs.transactionsBody.innerHTML = `<tr><td colspan="13" class="admin-empty">${escapeHtml(message)}</td></tr>`;
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
      await loadSafely(true);
    });
  }

  refs.rangeButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      state.range = button.dataset.accountingRange || 'this_month';
      refs.rangeButtons.forEach((item) => item.classList.toggle('is-active', item === button));
      await loadSafely(true);
    });
  });

  [refs.dateFrom, refs.dateTo].forEach((input) => {
    input?.addEventListener('change', async () => {
      if (state.range === 'custom') await loadSafely(true);
    });
  });

  refs.modeButtons.forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.accountingQuickMode || 'expense_paid'));
  });
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
    window.setTimeout(resetForm, 0);
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

  refs.reviewBody?.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
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
  refs.exportButton?.addEventListener('click', () => {
    window.location.href = buildUrl('export_csv', { ...rangeOptions(), include_voided: '0' });
  });
  refs.settingsButton?.addEventListener('click', () => {
    setFormError('Settings are read-only in this version. Accounts and categories are seeded safely by the API.');
  });
  refs.drawerCloseButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (refs.drawer) refs.drawer.hidden = true;
    });
  });

  resetForm();
  loadSafely(true);
}
