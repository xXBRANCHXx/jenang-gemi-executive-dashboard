const root = document.querySelector('[data-profit-loss]');

if (root) {
  const apiEndpoint = root.dataset.apiEndpoint || '../api/profit-loss/';
  const salesEndpoint = root.dataset.salesEndpoint || '../api/sales/';
  const now = new Date();
  const currentYear = Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Jakarta' }).format(now));
  const currentMonth = Number(new Intl.DateTimeFormat('en', { month: 'numeric', timeZone: 'Asia/Jakarta' }).format(now));
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const state = {
    year: currentYear,
    month: currentMonth,
    sales: null,
    stored: null,
    products: [],
    monthly: [],
    search: '',
    loading: false
  };

  const refs = {
    year: root.querySelector('[data-pl-year]'),
    month: root.querySelector('[data-pl-month]'),
    periodLabel: root.querySelector('[data-pl-period-label]'),
    syncLabel: root.querySelector('[data-pl-sync-label]'),
    refresh: root.querySelector('[data-pl-refresh]'),
    search: root.querySelector('[data-pl-search]'),
    ledger: root.querySelector('[data-pl-ledger]'),
    coverage: root.querySelector('[data-pl-coverage]'),
    entrySections: root.querySelector('[data-pl-entry-sections]'),
    allocationList: root.querySelector('[data-pl-allocation-list]'),
    dataQuality: root.querySelector('[data-pl-data-quality]'),
    monthlyBody: root.querySelector('[data-pl-monthly-body]'),
    skuModal: root.querySelector('[data-pl-sku-modal]'),
    skuForm: root.querySelector('[data-pl-sku-form]'),
    skuTitle: root.querySelector('[data-pl-sku-title]'),
    skuPeriod: root.querySelector('[data-pl-sku-period]'),
    skuError: root.querySelector('[data-pl-sku-error]'),
    entryModal: root.querySelector('[data-pl-entry-modal]'),
    entryForm: root.querySelector('[data-pl-entry-form]'),
    entryTitle: root.querySelector('[data-pl-entry-title]'),
    entryError: root.querySelector('[data-pl-entry-error]'),
    entryLabels: root.querySelector('[data-pl-entry-labels]'),
    deleteEntry: root.querySelector('[data-pl-delete-entry]'),
    allocationModal: root.querySelector('[data-pl-allocation-modal]'),
    allocationForm: root.querySelector('[data-pl-allocation-form]'),
    allocationError: root.querySelector('[data-pl-allocation-error]'),
    toast: root.querySelector('[data-pl-toast]')
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);
  const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const money = (value, compact = false) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard'
  }).format(number(value));
  const integer = (value) => Math.round(number(value)).toLocaleString('id-ID');
  const percent = (value) => `${(number(value) * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;
  const safeDivide = (top, bottom) => number(bottom) ? number(top) / number(bottom) : 0;
  const inputNumber = (value) => String(value ?? '').replace(/[^\d.-]/g, '');

  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) throw new Error(payload.details || payload.error || `HTTP ${response.status}`);
    return payload;
  };

  const showToast = (message, isError = false) => {
    if (!refs.toast) return;
    refs.toast.textContent = message;
    refs.toast.classList.toggle('is-error', isError);
    refs.toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { refs.toast.hidden = true; }, 3200);
  };

  const initializeControls = () => {
    refs.year.innerHTML = Array.from({ length: 7 }, (_, index) => currentYear - 4 + index)
      .map((year) => `<option value="${year}"${year === state.year ? ' selected' : ''}>${year}</option>`).join('');
    const monthOptions = fullMonthNames.map((name, index) => `<option value="${index + 1}">${name}</option>`).join('');
    refs.month.insertAdjacentHTML('beforeend', monthOptions);
    refs.month.value = String(state.month);
    refs.entryForm.elements.month.innerHTML = monthOptions;
  };

  const skuInputMap = () => {
    const map = new Map();
    for (const row of state.stored?.sku_inputs || []) {
      map.set(`${String(row.sku || '').toUpperCase()}|${number(row.month)}`, row);
    }
    return map;
  };

  const catalogMap = () => {
    const map = new Map();
    for (const row of state.stored?.sku_catalog || []) map.set(String(row.sku || '').toUpperCase(), row);
    return map;
  };

  const rowsForPeriod = (month) => {
    const rows = Array.isArray(state.sales?.products?.by_month) ? state.sales.products.by_month : [];
    return rows.filter((row) => month === 0 || number(row.month) === month);
  };

  const catalogCogsForMonth = (catalogRow, month) => {
    const history = Array.isArray(catalogRow?.cogs_history) ? catalogRow.cogs_history : [];
    if (!history.length || !month) return number(catalogRow?.cogs);
    const monthEnd = new Date(Date.UTC(state.year, month, 1));
    let effective = null;
    for (const change of history) {
      const recordedAt = new Date(String(change.recorded_at || '').replace(' ', 'T') + 'Z');
      if (!Number.isNaN(recordedAt.getTime()) && recordedAt < monthEnd) effective = number(change.new_price);
    }
    if (effective !== null) return effective;
    const firstOldPrice = history[0]?.old_price;
    return firstOldPrice !== null && firstOldPrice !== '' && firstOldPrice !== undefined
      ? number(firstOldPrice)
      : number(history[0]?.new_price || catalogRow?.cogs);
  };

  const calculateProducts = (month) => {
    const catalog = catalogMap();
    const inputs = skuInputMap();
    const aggregates = new Map();
    for (const row of rowsForPeriod(month)) {
      const sku = String(row.sku || '').trim().toUpperCase();
      const key = sku || `UNMAPPED:${String(row.label || row.product_type || 'Unknown').trim()}`;
      const item = aggregates.get(key) || {
        key,
        sku,
        label: String(row.label || row.product_type || sku || 'Unmapped product'),
        productType: String(row.product_type || 'Uncategorized'),
        brand: '',
        units: 0,
        netRevenue: 0,
        grossRevenue: 0,
        orders: 0,
        cogs: 0,
        directUnitCost: 0,
        hasCatalog: false,
        hasCogs: false,
        months: new Set()
      };
      const quantity = number(row.quantity);
      const rowMonth = number(row.month);
      const catalogRow = catalog.get(sku);
      const input = inputs.get(`${sku}|${rowMonth}`) || {};
      const catalogCogs = catalogCogsForMonth(catalogRow, rowMonth);
      const baseCogs = input.cogs_override !== null && input.cogs_override !== '' && input.cogs_override !== undefined
        ? number(input.cogs_override)
        : catalogCogs;
      const unitCost = baseCogs + number(input.packaging_per_unit) + number(input.labor_per_unit) + number(input.other_per_unit);
      item.units += quantity;
      item.netRevenue += number(row.net_revenue);
      item.grossRevenue += number(row.gross_revenue);
      item.orders += number(row.orders);
      item.cogs += quantity * unitCost;
      item.directUnitCost = safeDivide(item.cogs, item.units);
      item.hasCatalog ||= Boolean(catalogRow);
      item.hasCogs ||= baseCogs > 0;
      item.brand = String(catalogRow?.brand_name || item.brand || row.product_type || 'Uncategorized');
      item.label = String(catalogRow?.product_name || row.label || item.label);
      item.tag = String(catalogRow?.tag || '');
      item.flavor = String(catalogRow?.flavor_name || row.flavor || '');
      item.catalogCogs = catalogCogs;
      item.months.add(rowMonth);
      aggregates.set(key, item);
    }
    return Array.from(aggregates.values()).map((item) => ({
      ...item,
      grossProfit: item.netRevenue - item.cogs,
      averagePrice: safeDivide(item.netRevenue, item.units),
      profitPerUnit: safeDivide(item.netRevenue - item.cogs, item.units),
      margin: safeDivide(item.netRevenue - item.cogs, item.netRevenue)
    })).sort((left, right) => right.netRevenue - left.netRevenue);
  };

  const entriesForPeriod = (month) => (state.stored?.entries || []).filter((entry) => month === 0 || number(entry.month) === month);
  const entryTotal = (month, section) => entriesForPeriod(month)
    .filter((entry) => entry.section === section)
    .reduce((sum, entry) => sum + number(entry.amount), 0);

  const calculateStatement = (month) => {
    const products = calculateProducts(month);
    const product = products.reduce((totals, row) => {
      totals.units += row.units;
      totals.netRevenue += row.netRevenue;
      totals.grossRevenue += row.grossRevenue;
      totals.cogs += row.cogs;
      return totals;
    }, { units: 0, netRevenue: 0, grossRevenue: 0, cogs: 0 });
    const income = entryTotal(month, 'income');
    const administration = entryTotal(month, 'administration');
    const marketing = entryTotal(month, 'marketing');
    const other = entryTotal(month, 'other');
    const revenue = product.netRevenue + income;
    const grossProfit = revenue - product.cogs;
    const netProfit = grossProfit - administration - marketing - other;
    return {
      ...product,
      marketplaceFees: Math.max(0, product.grossRevenue - product.netRevenue),
      income,
      revenue,
      averagePrice: safeDivide(revenue, product.units),
      averageCogs: safeDivide(product.cogs, product.units),
      grossProfit,
      grossProfitPerUnit: safeDivide(grossProfit, product.units),
      grossMargin: safeDivide(grossProfit, revenue),
      administration,
      administrationPerUnit: safeDivide(administration, product.units),
      administrationRate: safeDivide(administration, revenue),
      marketing,
      marketingPerUnit: safeDivide(marketing, product.units),
      marketingRate: safeDivide(marketing, revenue),
      other,
      netProfit,
      netMargin: safeDivide(netProfit, revenue),
      netProfitPerUnit: safeDivide(netProfit, product.units)
    };
  };

  const renderKpis = () => {
    const totals = calculateStatement(state.month);
    const values = {
      net_revenue: money(totals.revenue),
      units: integer(totals.units),
      cogs: money(totals.cogs),
      gross_profit: money(totals.grossProfit),
      administration: money(totals.administration),
      marketing: money(totals.marketing),
      net_profit: money(totals.netProfit),
      profit_per_unit: money(totals.netProfitPerUnit)
    };
    const meta = {
      net_revenue: `${money(totals.marketplaceFees)} marketplace fees`,
      units: `${integer(state.products.length)} product lines`,
      cogs: `${money(safeDivide(totals.cogs, totals.units))} / unit`,
      gross_profit: percent(totals.grossMargin),
      administration: `${percent(totals.administrationRate)} of revenue`,
      marketing: `${percent(totals.marketingRate)} of revenue`,
      net_profit: `${percent(totals.netMargin)} margin`,
      profit_per_unit: 'After operating expenses'
    };
    Object.entries(values).forEach(([key, value]) => {
      const target = root.querySelector(`[data-pl-kpi="${key}"]`);
      if (target) {
        target.textContent = value;
        if (key === 'net_profit') target.classList.toggle('is-negative', totals.netProfit < 0);
      }
      const metaTarget = root.querySelector(`[data-pl-kpi-meta="${key}"]`);
      if (metaTarget) metaTarget.textContent = meta[key];
    });
  };

  const renderLedger = () => {
    state.products = calculateProducts(state.month);
    const query = state.search.trim().toLowerCase();
    const filtered = state.products.filter((row) => !query || [row.sku, row.label, row.tag, row.brand, row.flavor].join(' ').toLowerCase().includes(query));
    const groups = new Map();
    for (const row of filtered) {
      if (!groups.has(row.brand)) groups.set(row.brand, []);
      groups.get(row.brand).push(row);
    }
    if (!filtered.length) {
      refs.ledger.innerHTML = '<p class="pl-empty">No matching SKU sales in this period.</p>';
      return;
    }
    refs.ledger.innerHTML = Array.from(groups.entries()).map(([brand, rows]) => {
      const totals = rows.reduce((result, row) => ({
        units: result.units + row.units,
        revenue: result.revenue + row.netRevenue,
        cogs: result.cogs + row.cogs
      }), { units: 0, revenue: 0, cogs: 0 });
      const grossProfit = totals.revenue - totals.cogs;
      return `
        <details class="pl-ledger-group" open>
          <summary>
            <span><strong>${escapeHtml(brand)}</strong><small>${rows.length} SKU${rows.length === 1 ? '' : 's'}</small></span>
            <span>${integer(totals.units)}</span><span>${money(totals.revenue, true)}</span><span>${money(safeDivide(totals.revenue, totals.units), true)}</span>
            <span>${money(totals.cogs, true)}</span><span class="${grossProfit < 0 ? 'is-negative' : ''}">${money(grossProfit, true)}</span>
            <span>${money(safeDivide(grossProfit, totals.units), true)}</span><span>${percent(safeDivide(grossProfit, totals.revenue))}</span><b aria-hidden="true"></b>
          </summary>
          <div class="pl-ledger-rows">
            ${rows.map((row) => `
              <div class="pl-ledger-row">
                <span><strong>${escapeHtml(row.label)}</strong><small>${escapeHtml(row.sku || 'No SKU')} ${row.flavor ? `· ${escapeHtml(row.flavor)}` : ''}</small></span>
                <span>${integer(row.units)}</span><span>${money(row.netRevenue, true)}</span><span>${money(row.averagePrice, true)}</span>
                <span>${money(row.cogs, true)}<small>${money(row.directUnitCost, true)} / unit</small></span>
                <span class="${row.grossProfit < 0 ? 'is-negative' : ''}">${money(row.grossProfit, true)}</span>
                <span>${money(row.profitPerUnit, true)}</span><span>${percent(row.margin)}</span>
                <button type="button" class="pl-row-edit" data-pl-edit-sku="${escapeHtml(row.key)}" ${!row.sku || state.month === 0 ? 'disabled' : ''} aria-label="Edit direct costs" title="${state.month === 0 ? 'Select one month to edit direct costs' : 'Edit direct costs'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16-.8 4 4-.8L18.5 7.9l-3.2-3.2z"/><path d="m13.8 6.2 3.2 3.2"/></svg></button>
              </div>
            `).join('')}
          </div>
        </details>`;
    }).join('');
  };

  const renderEntries = () => {
    const sections = [
      ['income', 'Other income'],
      ['administration', 'Administration'],
      ['marketing', 'Marketing'],
      ['other', 'Other expenses']
    ];
    const entries = entriesForPeriod(state.month);
    refs.entrySections.innerHTML = sections.map(([key, label]) => {
      const rows = entries.filter((entry) => entry.section === key);
      const total = rows.reduce((sum, row) => sum + number(row.amount), 0);
      return `
        <details class="pl-entry-section"${rows.length ? ' open' : ''}>
          <summary><span>${label}<small>${rows.length} entries</small></span><strong>${money(total, true)}</strong></summary>
          <div>
            ${rows.length ? rows.map((entry) => `
              <button type="button" class="pl-entry-row" data-pl-edit-entry="${number(entry.id)}">
                <span><strong>${escapeHtml(entry.label)}</strong><small>${fullMonthNames[number(entry.month) - 1]}${entry.notes ? ` · ${escapeHtml(entry.notes)}` : ''}</small></span>
                <b>${money(entry.amount, true)}</b>
              </button>`).join('') : '<p class="pl-empty">No saved entries.</p>'}
          </div>
        </details>`;
    }).join('');
  };

  const renderAllocation = () => {
    const totals = calculateStatement(state.month);
    const profit = Math.max(0, totals.netProfit);
    const settings = state.stored?.settings || {};
    const ownership = profit * number(settings.ownership_pct) / 100;
    const bng = ownership * Math.max(0, 100 - number(settings.director_pct)) / 100;
    const rows = [
      ['Reinvest', profit * number(settings.reinvest_pct) / 100, `${number(settings.reinvest_pct)}%`],
      ['Offering to SAGI', profit * number(settings.offering_pct) / 100, `${number(settings.offering_pct)}%`],
      ['Ownership share', ownership, `${number(settings.ownership_pct)}%`],
      ['Director', ownership * number(settings.director_pct) / 100, `${number(settings.director_pct)}% of ownership`],
      ['BnG', bng, `${Math.max(0, 100 - number(settings.director_pct))}% of ownership`],
      ['Loan to BnG', bng * number(settings.bng_loan_pct) / 100, `${number(settings.bng_loan_pct)}% of BnG`],
      ['Commissioner', bng * number(settings.commissioner_pct) / 100, `${number(settings.commissioner_pct)}% of BnG`],
      ['Advisor', bng * number(settings.advisor_pct) / 100, `${number(settings.advisor_pct)}% of BnG`]
    ];
    refs.allocationList.innerHTML = rows.map(([label, amount, note]) => `<div><span>${label}<small>${note}</small></span><strong>${money(amount, true)}</strong></div>`).join('');
  };

  const renderQuality = () => {
    const total = state.products.length;
    const unmapped = state.products.filter((row) => !row.hasCatalog);
    const missingCogs = state.products.filter((row) => !row.hasCogs);
    const zeroSkuRows = state.products.filter((row) => !row.sku);
    const covered = total ? Math.round(((total - missingCogs.length) / total) * 100) : 100;
    refs.coverage.textContent = `${covered}% COGS coverage`;
    refs.coverage.classList.toggle('is-warning', missingCogs.length > 0);
    const checks = [
      [missingCogs.length === 0, 'COGS coverage', missingCogs.length ? `${missingCogs.length} sold product lines have no COGS.` : 'Every sold SKU has direct cost coverage.'],
      [unmapped.length === 0, 'SKU catalog match', unmapped.length ? `${unmapped.length} sales lines do not match the SKU database.` : 'All SKU-coded sales match the catalog.'],
      [zeroSkuRows.length === 0, 'Marketplace SKU field', zeroSkuRows.length ? `${zeroSkuRows.length} product lines arrived without a SKU.` : 'All product lines include a SKU.']
    ];
    refs.dataQuality.innerHTML = checks.map(([ok, title, copy]) => `<div class="pl-quality-row ${ok ? 'is-ok' : 'is-warning'}"><span aria-hidden="true">${ok ? '✓' : '!'}</span><p><strong>${title}</strong><small>${copy}</small></p></div>`).join('');
  };

  const renderMonthly = () => {
    state.monthly = Array.from({ length: 12 }, (_, index) => calculateStatement(index + 1));
    const ytd = calculateStatement(0);
    const rows = [
      ['Units sold', 'units', integer],
      ['Gross revenue', 'grossRevenue', money],
      ['Marketplace fees', 'marketplaceFees', money],
      ['Other income', 'income', money],
      ['Net revenue + other income', 'revenue', money],
      ['Average selling price', 'averagePrice', money],
      ['COGS', 'cogs', money],
      ['Average COGS / unit', 'averageCogs', money],
      ['Gross profit', 'grossProfit', money],
      ['Gross profit / unit', 'grossProfitPerUnit', money],
      ['Gross margin', 'grossMargin', percent],
      ['Administration', 'administration', money],
      ['Administration / unit', 'administrationPerUnit', money],
      ['Administration %', 'administrationRate', percent],
      ['Marketing', 'marketing', money],
      ['Marketing / unit', 'marketingPerUnit', money],
      ['Marketing %', 'marketingRate', percent],
      ['Other expenses', 'other', money],
      ['Net profit (loss)', 'netProfit', money],
      ['Net profit / unit', 'netProfitPerUnit', money],
      ['Net margin', 'netMargin', percent]
    ];
    refs.monthlyBody.innerHTML = rows.map(([label, key, formatter]) => `
      <tr class="${key === 'netProfit' || key === 'grossProfit' ? 'is-emphasis' : ''}">
        <th>${label}</th>
        ${state.monthly.map((month) => `<td class="${number(month[key]) < 0 ? 'is-negative' : ''}">${formatter(month[key], true)}</td>`).join('')}
        <td class="${number(ytd[key]) < 0 ? 'is-negative' : ''}">${formatter(ytd[key], true)}</td>
      </tr>`).join('');
  };

  const render = () => {
    refs.periodLabel.textContent = state.month ? `${fullMonthNames[state.month - 1]} ${state.year}` : `${state.year} year to date`;
    renderLedger();
    renderKpis();
    renderEntries();
    renderAllocation();
    renderQuality();
    renderMonthly();
  };

  const load = async () => {
    if (state.loading) return;
    state.loading = true;
    refs.refresh.disabled = true;
    refs.syncLabel.textContent = 'Refreshing live sales';
    try {
      const stamp = Date.now();
      const [sales, stored] = await Promise.all([
        requestJson(`${salesEndpoint}?year=${state.year}&_ts=${stamp}`),
        requestJson(`${apiEndpoint}?year=${state.year}&_ts=${stamp}`)
      ]);
      state.sales = sales;
      state.stored = stored;
      refs.syncLabel.textContent = sales.last_order_at ? `Live through ${new Date(sales.last_order_at).toLocaleString('en-GB', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' })} WIB` : 'Live sales connected';
      populateEntryLabels();
      render();
    } catch (error) {
      refs.syncLabel.textContent = 'Data connection needs attention';
      refs.ledger.innerHTML = `<p class="pl-empty is-error">${escapeHtml(error.message)}</p>`;
      showToast(error.message, true);
    } finally {
      state.loading = false;
      refs.refresh.disabled = false;
    }
  };

  const populateEntryLabels = () => {
    const defaults = state.stored?.default_entries || {};
    refs.entryLabels.innerHTML = Object.values(defaults).flat().map((label) => `<option value="${escapeHtml(label)}"></option>`).join('');
  };

  const openSkuModal = (key) => {
    const row = state.products.find((product) => product.key === key);
    if (!row?.sku || state.month === 0) return;
    const input = skuInputMap().get(`${row.sku}|${state.month}`) || {};
    refs.skuForm.reset();
    refs.skuForm.elements.sku.value = row.sku;
    refs.skuForm.elements.month.value = String(state.month);
    refs.skuForm.elements.catalog_cogs.value = money(row.catalogCogs);
    refs.skuForm.elements.cogs_override.value = input.cogs_override ?? '';
    refs.skuForm.elements.packaging_per_unit.value = input.packaging_per_unit ?? '0';
    refs.skuForm.elements.labor_per_unit.value = input.labor_per_unit ?? '0';
    refs.skuForm.elements.other_per_unit.value = input.other_per_unit ?? '0';
    refs.skuForm.elements.notes.value = input.notes ?? '';
    refs.skuTitle.textContent = `${row.label} · ${row.sku}`;
    refs.skuPeriod.textContent = `${fullMonthNames[state.month - 1]} ${state.year}`;
    refs.skuError.hidden = true;
    refs.skuModal.hidden = false;
  };

  const openEntryModal = (entry = null) => {
    refs.entryForm.reset();
    refs.entryForm.elements.id.value = entry?.id || '';
    refs.entryForm.elements.month.value = String(entry?.month || state.month || currentMonth);
    refs.entryForm.elements.section.value = entry?.section || 'administration';
    refs.entryForm.elements.label.value = entry?.label || '';
    refs.entryForm.elements.amount.value = entry?.amount || '';
    refs.entryForm.elements.notes.value = entry?.notes || '';
    refs.entryTitle.textContent = entry ? 'Edit operating entry' : 'Add operating entry';
    refs.deleteEntry.hidden = !entry;
    refs.entryError.hidden = true;
    refs.entryModal.hidden = false;
  };

  const closeModal = (modal) => { if (modal) modal.hidden = true; };
  const postAction = (payload) => requestJson(apiEndpoint, { method: 'POST', body: JSON.stringify({ year: state.year, ...payload }) });

  refs.year.addEventListener('change', () => {
    state.year = number(refs.year.value);
    load();
  });
  refs.month.addEventListener('change', () => {
    state.month = number(refs.month.value);
    render();
  });
  refs.search.addEventListener('input', () => {
    state.search = refs.search.value;
    renderLedger();
  });
  refs.refresh.addEventListener('click', load);
  refs.ledger.addEventListener('click', (event) => {
    const button = event.target.closest('[data-pl-edit-sku]');
    if (button) openSkuModal(button.dataset.plEditSku || '');
  });
  refs.entrySections.addEventListener('click', (event) => {
    const button = event.target.closest('[data-pl-edit-entry]');
    if (!button) return;
    const entry = (state.stored?.entries || []).find((row) => number(row.id) === number(button.dataset.plEditEntry));
    if (entry) openEntryModal(entry);
  });
  root.querySelector('[data-pl-add-entry]').addEventListener('click', () => openEntryModal());

  root.querySelectorAll('[data-pl-close-sku]').forEach((element) => element.addEventListener('click', () => closeModal(refs.skuModal)));
  root.querySelectorAll('[data-pl-close-entry]').forEach((element) => element.addEventListener('click', () => closeModal(refs.entryModal)));
  root.querySelectorAll('[data-pl-close-allocation]').forEach((element) => element.addEventListener('click', () => closeModal(refs.allocationModal)));

  refs.skuForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    refs.skuError.hidden = true;
    const data = new FormData(refs.skuForm);
    try {
      await postAction({
        action: 'save_sku_input',
        sku: data.get('sku'),
        month: data.get('month'),
        cogs_override: inputNumber(data.get('cogs_override')),
        packaging_per_unit: inputNumber(data.get('packaging_per_unit')) || 0,
        labor_per_unit: inputNumber(data.get('labor_per_unit')) || 0,
        other_per_unit: inputNumber(data.get('other_per_unit')) || 0,
        notes: data.get('notes')
      });
      closeModal(refs.skuModal);
      showToast('SKU cost input saved.');
      await load();
    } catch (error) {
      refs.skuError.textContent = error.message;
      refs.skuError.hidden = false;
    }
  });

  refs.entryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    refs.entryError.hidden = true;
    const data = new FormData(refs.entryForm);
    try {
      await postAction({
        action: 'save_entry',
        id: data.get('id'),
        month: data.get('month'),
        section: data.get('section'),
        label: data.get('label'),
        amount: inputNumber(data.get('amount')) || 0,
        notes: data.get('notes')
      });
      closeModal(refs.entryModal);
      showToast('P&L entry saved.');
      await load();
    } catch (error) {
      refs.entryError.textContent = error.message;
      refs.entryError.hidden = false;
    }
  });

  refs.deleteEntry.addEventListener('click', async () => {
    const id = number(refs.entryForm.elements.id.value);
    if (!id || !window.confirm('Delete this P&L entry?')) return;
    try {
      await postAction({ action: 'delete_entry', id });
      closeModal(refs.entryModal);
      showToast('P&L entry deleted.');
      await load();
    } catch (error) {
      refs.entryError.textContent = error.message;
      refs.entryError.hidden = false;
    }
  });

  root.querySelector('[data-pl-edit-allocation]').addEventListener('click', () => {
    const settings = state.stored?.settings || {};
    for (const input of refs.allocationForm.elements) {
      if (input.name) input.value = settings[input.name] ?? '';
    }
    refs.allocationError.hidden = true;
    refs.allocationModal.hidden = false;
  });

  refs.allocationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(refs.allocationForm);
    const payload = { action: 'save_settings' };
    for (const [key, value] of data.entries()) payload[key] = inputNumber(value) || 0;
    try {
      const response = await postAction(payload);
      state.stored.settings = response.settings;
      closeModal(refs.allocationModal);
      renderAllocation();
      showToast('Profit allocation saved.');
    } catch (error) {
      refs.allocationError.textContent = error.message;
      refs.allocationError.hidden = false;
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    closeModal(refs.skuModal);
    closeModal(refs.entryModal);
    closeModal(refs.allocationModal);
  });

  initializeControls();
  load();
}
