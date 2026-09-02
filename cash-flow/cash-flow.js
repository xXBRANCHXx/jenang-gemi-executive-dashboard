const root = document.querySelector('[data-cash-flow-page]');

if (root) {
  const endpoint = root.dataset.cashFlowEndpoint || '../api/accounting/';
  const nowParts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Jakarta', year: 'numeric', month: 'numeric' })
    .formatToParts(new Date()).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const params = new URLSearchParams(window.location.search);
  const requestedMonth = /^\d{4}-\d{2}$/.test(params.get('month') || '') ? params.get('month') : '';
  const state = {
    year: requestedMonth ? Number(requestedMonth.slice(0, 4)) : Number(nowParts.year),
    month: requestedMonth ? Number(requestedMonth.slice(5, 7)) : Number(nowParts.month),
    report: null,
    filter: 'all',
    search: ''
  };
  const refs = {
    year: root.querySelector('[data-cash-flow-year]'),
    month: root.querySelector('[data-cash-flow-month]'),
    refresh: root.querySelector('[data-cash-flow-refresh]'),
    period: root.querySelector('[data-cash-flow-period]'),
    status: root.querySelector('[data-cash-flow-status]'),
    totals: {
      income: root.querySelector('[data-cash-flow-total="income"]'),
      cost: root.querySelector('[data-cash-flow-total="cost"]'),
      net: root.querySelector('[data-cash-flow-total="net"]')
    },
    counts: {
      income: root.querySelector('[data-cash-flow-count="income"]'),
      cost: root.querySelector('[data-cash-flow-count="cost"]')
    },
    chart: root.querySelector('[data-cash-flow-chart]'),
    chartAxis: root.querySelector('[data-cash-flow-chart-axis]'),
    sources: root.querySelector('[data-cash-flow-sources]'),
    categories: root.querySelector('[data-cash-flow-categories]'),
    filter: root.querySelector('[data-cash-flow-filter]'),
    search: root.querySelector('[data-cash-flow-search]'),
    transactions: root.querySelector('[data-cash-flow-transactions]'),
    ledgerCount: root.querySelector('[data-cash-flow-ledger-count]'),
    methodology: root.querySelector('[data-cash-flow-methodology]')
  };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
  const money = (value) => `Rp${Math.round(Number(value) || 0).toLocaleString('id-ID')}`;
  const compactMoney = (value) => `Rp${new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0)}`;
  const periodKey = () => `${state.year}-${String(state.month).padStart(2, '0')}`;
  const readableDate = (value) => {
    const [year, month, day] = String(value || '').split('-').map(Number);
    if (!year || !month || !day) return value || '—';
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(Date.UTC(year, month - 1, day)));
  };
  const requestJson = async (url) => {
    const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) throw new Error(payload.error || `HTTP ${response.status}`);
    return payload;
  };

  const initializeControls = () => {
    refs.month.innerHTML = monthNames.map((name, index) => `<option value="${index + 1}">${name}</option>`).join('');
    const startYear = 2024;
    const endYear = Math.max(Number(nowParts.year) + 1, state.year);
    refs.year.innerHTML = Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index)
      .map((year) => `<option value="${year}">${year}</option>`).join('');
    refs.month.value = String(state.month);
    refs.year.value = String(state.year);
  };

  const renderChart = () => {
    const daily = Array.isArray(state.report?.daily) ? state.report.daily : [];
    refs.chart.style.gridTemplateColumns = `repeat(${Math.max(1, daily.length)}, minmax(7px, 1fr))`;
    if (!daily.length) {
      if (refs.chartAxis) refs.chartAxis.innerHTML = '';
      refs.chart.innerHTML = '<p class="admin-empty">No confirmed payments for this month.</p>';
      return;
    }
    const max = Math.max(...daily.flatMap((day) => [Number(day.income || 0), Number(day.cost || 0)]), 1);
    if (refs.chartAxis) refs.chartAxis.innerHTML = `<span>${escapeHtml(compactMoney(max))}</span><span>${escapeHtml(compactMoney(max / 2))}</span><span>Rp0</span>`;
    refs.chart.innerHTML = daily.map((day) => {
      const incomeHeight = Number(day.income || 0) ? Math.max(4, (Number(day.income) / max) * 100) : 0;
      const costHeight = Number(day.cost || 0) ? Math.max(4, (Number(day.cost) / max) * 100) : 0;
      const detail = `${readableDate(day.date)} · Income ${money(day.income)} · Cost ${money(day.cost)} · Net ${money(day.net)}`;
      return `<div class="cash-flow-day" tabindex="0" aria-label="${escapeHtml(detail)}" data-tooltip="${escapeHtml(detail)}">
        <div class="cash-flow-day-bars"><i class="is-income" style="height:${incomeHeight}%"></i><i class="is-cost" style="height:${costHeight}%"></i></div>
        <span>${day.day === 1 || day.day % 5 === 0 || day.day === daily.length ? day.day : ''}</span>
      </div>`;
    }).join('');
  };

  const renderSummary = (target, rows) => {
    if (!rows.length) {
      target.innerHTML = '<p class="admin-empty">No confirmed movements in this section.</p>';
      return;
    }
    const maxByFlow = rows.reduce((result, row) => ({ ...result, [row.flow]: Math.max(result[row.flow] || 0, Number(row.amount || 0)) }), {});
    target.innerHTML = rows.map((row) => `<div class="cash-flow-summary-row is-${escapeHtml(row.flow)}">
      <div><strong>${escapeHtml(row.label || 'Uncategorized')}</strong><span>${Number(row.transaction_count || 0).toLocaleString('id-ID')} transaction${Number(row.transaction_count || 0) === 1 ? '' : 's'}</span></div>
      <div class="cash-flow-summary-bar"><i style="width:${Math.max(3, (Number(row.amount || 0) / Math.max(1, maxByFlow[row.flow] || 1)) * 100)}%"></i></div>
      <b>${money(row.amount)}</b>
    </div>`).join('');
  };

  const filteredTransactions = () => {
    const needle = state.search.trim().toLowerCase();
    return (state.report?.transactions || []).filter((row) => {
      if (state.filter !== 'all' && row.flow !== state.filter) return false;
      if (!needle) return true;
      return [row.transaction, row.category, row.source_label, row.counterparty, row.account, row.reference, row.notes]
        .some((value) => String(value || '').toLowerCase().includes(needle));
    });
  };

  const renderTransactions = () => {
    const rows = filteredTransactions();
    refs.ledgerCount.textContent = `${rows.length.toLocaleString('id-ID')} of ${Number(state.report?.totals?.transaction_count || 0).toLocaleString('id-ID')} confirmed movements`;
    if (!rows.length) {
      refs.transactions.innerHTML = '<tr><td colspan="8" class="admin-empty">No cash movements match these filters.</td></tr>';
      return;
    }
    refs.transactions.innerHTML = rows.map((row) => {
      const context = [row.counterparty, row.source_label].filter(Boolean).join(' · ');
      const source = [row.source_label, row.account].filter(Boolean).join(' · ');
      const notes = [context && context !== source ? context : '', row.notes].filter(Boolean).join(' · ');
      let receipt = '';
      if (row.receipt_url) {
        try {
          const receiptUrl = new URL(row.receipt_url, window.location.href);
          if (['http:', 'https:'].includes(receiptUrl.protocol)) receipt = ` <a href="${escapeHtml(receiptUrl.href)}" target="_blank" rel="noopener">Receipt</a>`;
        } catch (_error) {
          receipt = '';
        }
      }
      return `<tr>
        <td data-label="Date"><time datetime="${escapeHtml(row.date)}">${escapeHtml(readableDate(row.date))}</time></td>
        <td data-label="Flow"><span class="cash-flow-chip is-${escapeHtml(row.flow)}">${row.flow === 'income' ? 'Money in' : 'Money out'}</span></td>
        <td data-label="Transaction"><strong>${escapeHtml(row.transaction || 'Cash movement')}</strong><small>${escapeHtml(row.counterparty || '')}</small></td>
        <td data-label="Category">${escapeHtml(row.category || 'Uncategorized')}</td>
        <td data-label="Source / account">${escapeHtml(source || '—')}</td>
        <td data-label="Reference">${escapeHtml(row.reference || '—')}${receipt}</td>
        <td data-label="Notes">${escapeHtml(notes || '—')}</td>
        <td data-label="Amount" class="is-numeric is-${escapeHtml(row.flow)}"><strong>${row.flow === 'cost' ? '−' : '+'}${money(row.amount)}</strong></td>
      </tr>`;
    }).join('');
  };

  const render = () => {
    const report = state.report || {};
    const totals = report.totals || {};
    refs.period.textContent = `${monthNames[state.month - 1]} ${state.year}`;
    refs.totals.income.textContent = money(totals.income);
    refs.totals.cost.textContent = money(totals.cost);
    const net = Number(totals.net_cash_flow || 0);
    refs.totals.net.textContent = `${net < 0 ? '−' : '+'}${money(Math.abs(net))}`;
    refs.totals.net.closest('.cash-flow-kpi')?.classList.toggle('is-negative', net < 0);
    refs.counts.income.textContent = `${Number(totals.income_count || 0).toLocaleString('id-ID')} received transactions`;
    refs.counts.cost.textContent = `${Number(totals.cost_count || 0).toLocaleString('id-ID')} paid transactions`;
    renderChart();
    renderSummary(refs.sources, Array.isArray(report.source_summary) ? report.source_summary : []);
    renderSummary(refs.categories, Array.isArray(report.category_summary) ? report.category_summary : []);
    renderTransactions();
    refs.methodology.innerHTML = (report.methodology || []).map((item) => `<p>${escapeHtml(item)}</p>`).join('');
    refs.status.textContent = `${Number(totals.transaction_count || 0).toLocaleString('id-ID')} actual movements · scheduled and unpaid items excluded`;
    refs.chart.setAttribute('aria-label', `${monthNames[state.month - 1]} cash flow: income ${money(totals.income)}, cost ${money(totals.cost)}, net ${money(totals.net_cash_flow)}`);
    document.title = `Cash Flow · ${monthNames[state.month - 1]} ${state.year} | Executive Dashboard`;
  };

  const load = async () => {
    refs.refresh.disabled = true;
    refs.refresh.textContent = 'Loading…';
    refs.status.textContent = 'Loading confirmed payments…';
    try {
      const url = new URL(endpoint, window.location.href);
      url.searchParams.set('action', 'cash_flow');
      url.searchParams.set('month', periodKey());
      url.searchParams.set('_', String(Date.now()));
      const payload = await requestJson(url);
      state.report = payload.data?.cash_flow || {};
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('month', periodKey());
      window.history.replaceState({}, '', nextUrl);
      render();
    } catch (error) {
      const message = error?.message || 'Could not load cash flow.';
      refs.status.textContent = message;
      refs.chart.innerHTML = `<p class="admin-empty">${escapeHtml(message)}</p>`;
      refs.transactions.innerHTML = `<tr><td colspan="8" class="admin-empty">${escapeHtml(message)}</td></tr>`;
    } finally {
      refs.refresh.disabled = false;
      refs.refresh.innerHTML = '<span aria-hidden="true">↻</span> Refresh';
    }
  };

  refs.month.addEventListener('change', () => { state.month = Number(refs.month.value); load(); });
  refs.year.addEventListener('change', () => { state.year = Number(refs.year.value); load(); });
  refs.refresh.addEventListener('click', load);
  refs.filter.addEventListener('change', () => { state.filter = refs.filter.value; renderTransactions(); });
  refs.search.addEventListener('input', () => { state.search = refs.search.value; renderTransactions(); });
  initializeControls();
  load();
}
