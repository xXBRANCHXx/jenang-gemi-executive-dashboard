const root = document.querySelector('[data-pnl-page]');

if (root) {
  const salesEndpoint = root.dataset.salesEndpoint || '../api/sales/';
  const accountingEndpoint = root.dataset.accountingEndpoint || '../api/accounting/';
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const state = { year: currentYear, period: 'ytd', rows: [], reviewItems: 0 };
  const refs = {
    year: root.querySelector('[data-pnl-year]'),
    period: root.querySelector('[data-pnl-period]'),
    refresh: root.querySelector('[data-pnl-refresh]'),
    status: root.querySelector('[data-pnl-status]'),
    periodTitle: root.querySelector('[data-pnl-period-title]'),
    bridge: root.querySelector('[data-pnl-bridge]'),
    expenseMix: root.querySelector('[data-pnl-expense-mix]'),
    months: root.querySelector('[data-pnl-months]'),
    trend: root.querySelector('[data-pnl-trend]'),
    margin: root.querySelector('[data-pnl-margin]'),
    netMargin: root.querySelector('[data-pnl-net-margin]'),
    netCard: root.querySelector('[data-pnl-net-card]'),
    reviewStatus: root.querySelector('[data-pnl-review-status]'),
    kpis: Object.fromEntries([...root.querySelectorAll('[data-pnl-kpi]')].map((node) => [node.dataset.pnlKpi, node]))
  };
  const escapeHtml = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const money = (value) => `Rp${Math.round(Number(value) || 0).toLocaleString('id-ID')}`;
  const percent = (numerator, denominator) => denominator ? `${(Number(numerator || 0) / Number(denominator) * 100).toLocaleString('en-US', { maximumFractionDigits: 1 })}%` : '0%';
  const requestJson = async (url) => {
    const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) throw new Error(payload.error || `HTTP ${response.status}`);
    return payload;
  };
  const numeric = (row, keys) => {
    for (const key of keys) {
      const value = Number(row?.[key]);
      if (Number.isFinite(value)) return value;
    }
    return 0;
  };
  const monthNumber = (row, fallback) => {
    const direct = Number(row?.month || row?.month_number);
    if (direct >= 1 && direct <= 12) return direct;
    const matched = String(row?.period_key || row?.month_key || '').match(/-(\d{2})$/);
    return matched ? Number(matched[1]) : fallback;
  };
  const combine = (sales, accounting) => {
    const salesMonths = Array.isArray(sales?.months) ? sales.months : [];
    const accountingMonths = Array.isArray(accounting?.months) ? accounting.months : [];
    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const sale = salesMonths.find((row, rowIndex) => monthNumber(row, rowIndex + 1) === month) || {};
      const books = accountingMonths.find((row, rowIndex) => monthNumber(row, rowIndex + 1) === month) || {};
      const sourceRevenue = numeric(sale, ['revenue', 'net_revenue', 'seller_received', 'sales']);
      const refunds = numeric(books, ['manual_refunds']);
      const revenue = sourceRevenue - refunds;
      const cogs = numeric(sale, ['cogs']);
      const adCost = numeric(books, ['ad_cost']);
      const marketingOther = numeric(books, ['marketing_other']);
      const payroll = numeric(books, ['payroll']);
      const operations = numeric(books, ['operations']);
      const transferFees = numeric(books, ['transfer_fees']);
      const opex = adCost + marketingOther + payroll + operations + transferFees;
      const otherIncome = numeric(books, ['other_income']);
      const grossProfit = revenue - cogs;
      return {
        month,
        revenue,
        sourceRevenue,
        refunds,
        cogs,
        grossProfit,
        marketing: adCost,
        marketingOther,
        payroll,
        operations,
        transferFees,
        opex,
        otherIncome,
        netProfit: grossProfit + otherIncome - opex,
        productPurchases: numeric(books, ['product_purchases'])
      };
    });
  };
  const sumRows = (rows) => rows.reduce((total, row) => {
    Object.keys(row).forEach((key) => {
      if (key !== 'month' && typeof row[key] === 'number') total[key] = (total[key] || 0) + row[key];
    });
    return total;
  }, { month: 0 });
  const selectedRows = () => {
    if (state.period !== 'ytd') return state.rows.filter((row) => row.month === Number(state.period));
    const through = state.year === currentYear ? currentMonth : 12;
    return state.rows.filter((row) => row.month <= through);
  };
  const bridgeRow = (label, value, className = '') => `<div class="${className}"><span>${escapeHtml(label)}</span><strong>${money(value)}</strong></div>`;
  const render = () => {
    const selected = sumRows(selectedRows());
    const periodName = state.period === 'ytd' ? `${state.year} year to date` : `${monthNames[Number(state.period) - 1]} ${state.year}`;
    if (refs.periodTitle) refs.periodTitle.textContent = periodName;
    const values = {
      revenue: selected.revenue || 0,
      cogs: selected.cogs || 0,
      'gross-profit': selected.grossProfit || 0,
      'ad-cost': selected.marketing || 0,
      opex: selected.opex || 0,
      'net-profit': selected.netProfit || 0
    };
    Object.entries(values).forEach(([key, value]) => { if (refs.kpis[key]) refs.kpis[key].textContent = money(value); });
    if (refs.margin) refs.margin.textContent = `${percent(selected.grossProfit, selected.revenue)} margin`;
    if (refs.netMargin) refs.netMargin.textContent = `${percent(selected.netProfit, selected.revenue)} margin`;
    refs.netCard?.classList.toggle('is-negative', Number(selected.netProfit || 0) < 0);
    if (refs.bridge) refs.bridge.innerHTML = [
      bridgeRow('Seller-received sales', selected.sourceRevenue || 0),
      selected.refunds ? bridgeRow('Less: manual customer refunds', -(selected.refunds || 0), 'is-deduction') : '',
      bridgeRow('Net revenue', selected.revenue || 0, 'is-subtotal'),
      bridgeRow('Less: product COGS', -(selected.cogs || 0), 'is-deduction'),
      bridgeRow('Gross profit', selected.grossProfit || 0, 'is-subtotal'),
      bridgeRow('Other operating income', selected.otherIncome || 0),
      bridgeRow('Less: platform ad cost', -(selected.marketing || 0), 'is-deduction'),
      bridgeRow('Less: other marketing', -(selected.marketingOther || 0), 'is-deduction'),
      bridgeRow('Less: payroll and labor', -(selected.payroll || 0), 'is-deduction'),
      bridgeRow('Less: operations and fees', -((selected.operations || 0) + (selected.transferFees || 0)), 'is-deduction'),
      bridgeRow('Net profit', selected.netProfit || 0, 'is-total')
    ].join('');
    const expenseRows = [
      ['Marketing / ads', selected.marketing || 0],
      ['Other marketing', selected.marketingOther || 0],
      ['Payroll / labor', selected.payroll || 0],
      ['Operations / tax', selected.operations || 0],
      ['Bank / transfer fees', selected.transferFees || 0]
    ];
    const maxExpense = Math.max(...expenseRows.map(([, value]) => value), 1);
    if (refs.expenseMix) refs.expenseMix.innerHTML = expenseRows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><i><b style="width:${Math.round(value / maxExpense * 100)}%"></b></i><strong>${money(value)}</strong></div>`).join('');
    if (refs.months) refs.months.innerHTML = state.rows.map((row) => `<tr data-pnl-month="${row.month}" class="${state.period === String(row.month) ? 'is-selected' : ''}"><td><button type="button" data-pnl-focus-month="${row.month}">${monthNames[row.month - 1]}</button></td><td>${money(row.revenue)}</td><td>${money(row.cogs)}</td><td>${money(row.grossProfit)}</td><td>${money(row.marketing)}</td><td>${money(row.opex - row.marketing)}</td><td><strong>${money(row.netProfit)}</strong></td><td>${percent(row.netProfit, row.revenue)}</td></tr>`).join('');
    const maxProfit = Math.max(...state.rows.map((row) => Math.abs(row.netProfit)), 1);
    if (refs.trend) refs.trend.innerHTML = state.rows.map((row) => `<button type="button" data-pnl-focus-month="${row.month}" title="${escapeHtml(`${monthNames[row.month - 1]}: ${money(row.netProfit)}`)}"><i class="${row.netProfit < 0 ? 'is-negative' : ''}" style="height:${Math.max(4, Math.round(Math.abs(row.netProfit) / maxProfit * 100))}%"></i><span>${monthNames[row.month - 1].slice(0, 3)}</span></button>`).join('');
    if (refs.reviewStatus) refs.reviewStatus.textContent = state.reviewItems > 0 ? `${state.reviewItems.toLocaleString('id-ID')} open item${state.reviewItems === 1 ? '' : 's'} should be corrected before relying on final profit.` : 'No open Accounting review items.';
  };
  const renderControls = (years = []) => {
    const options = [...new Set([currentYear, currentYear - 1, ...years.map(Number).filter(Number.isFinite)])].sort((a, b) => b - a);
    refs.year.innerHTML = options.map((year) => `<option value="${year}"${year === state.year ? ' selected' : ''}>${year}</option>`).join('');
    refs.period.innerHTML = [`<option value="ytd">${state.year === currentYear ? 'Year to date' : 'Full year'}</option>`, ...monthNames.map((name, index) => `<option value="${index + 1}">${name}</option>`)].join('');
    refs.period.value = state.period;
  };
  const load = async (force = false) => {
    if (refs.status) refs.status.textContent = 'Loading revenue, COGS, and Accounting entries…';
    try {
      const suffix = force ? `&_ts=${Date.now()}` : '';
      const [sales, accountingResponse] = await Promise.all([
        requestJson(`${salesEndpoint}?year=${state.year}${suffix}`),
        requestJson(`${accountingEndpoint}?action=pnl_summary&year=${state.year}${suffix}`)
      ]);
      const accounting = accountingResponse.data || {};
      state.rows = combine(sales, accounting);
      state.reviewItems = Number(accounting.open_review_items || 0);
      renderControls(Array.isArray(sales.years) ? sales.years : []);
      render();
      if (refs.status) refs.status.textContent = `Updated ${new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date())} WIB`;
    } catch (error) {
      if (refs.status) refs.status.textContent = error?.message || 'Unable to load the P&L.';
      if (refs.months) refs.months.innerHTML = `<tr><td colspan="8" class="admin-empty">${escapeHtml(error?.message || 'Unable to load the P&L.')}</td></tr>`;
    }
  };
  refs.year?.addEventListener('change', () => { state.year = Number(refs.year.value) || currentYear; state.period = 'ytd'; load(); });
  refs.period?.addEventListener('change', () => { state.period = refs.period.value || 'ytd'; render(); });
  refs.refresh?.addEventListener('click', () => load(true));
  root.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-pnl-focus-month]') : null;
    if (!(button instanceof HTMLElement)) return;
    state.period = button.dataset.pnlFocusMonth || 'ytd';
    refs.period.value = state.period;
    render();
    root.querySelector('.pnl-kpis')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  renderControls();
  load();
}
