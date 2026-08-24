const root = document.querySelector('[data-pnl-page]');

if (root) {
  const salesEndpoint = root.dataset.salesEndpoint || '../api/sales/';
  const accountingEndpoint = root.dataset.accountingEndpoint || '../api/accounting/';
  const profitLossEndpoint = root.dataset.profitLossEndpoint || '../api/profit-loss/';
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const state = {
    year: currentYear,
    period: String(currentMonth),
    rows: [],
    reviewItems: 0,
    loadedAt: null,
    allocationTree: [],
    allocationDraft: [],
    allocationId: 0,
    categorySettings: []
  };
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
    allocationTree: root.querySelector('[data-pnl-allocation-tree]'),
    allocationIntro: root.querySelector('[data-pnl-allocation-intro]'),
    allocationDialog: root.querySelector('[data-pnl-allocation-dialog]'),
    allocationForm: root.querySelector('[data-pnl-allocation-form]'),
    allocationEditor: root.querySelector('[data-pnl-allocation-editor]'),
    allocationError: root.querySelector('[data-pnl-allocation-error]'),
    allocationYear: root.querySelector('[data-pnl-allocation-year]'),
    saveAllocation: root.querySelector('[data-pnl-save-allocation]'),
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
  const postJson = async (payload) => {
    const response = await fetch(profitLossEndpoint, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) throw new Error(result.error || result.details || `HTTP ${response.status}`);
    return result;
  };
  const cloneAllocations = (nodes) => JSON.parse(JSON.stringify(Array.isArray(nodes) ? nodes : []));
  const allocationTotal = (nodes) => (Array.isArray(nodes) ? nodes : []).reduce((sum, node) => sum + (Number(node?.percentage) || 0), 0);
  const formatPercentage = (value) => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 4 });
  const findAllocation = (id, nodes = state.allocationDraft) => {
    for (const node of nodes) {
      if (String(node.id) === String(id)) return node;
      const child = findAllocation(id, Array.isArray(node.children) ? node.children : []);
      if (child) return child;
    }
    return null;
  };
  const removeAllocation = (id, nodes = state.allocationDraft) => {
    const index = nodes.findIndex((node) => String(node.id) === String(id));
    if (index >= 0) {
      nodes.splice(index, 1);
      return true;
    }
    return nodes.some((node) => removeAllocation(id, Array.isArray(node.children) ? node.children : []));
  };
  const newAllocation = (name = 'New allocation', percentage = 0) => ({
    id: `allocation-${Date.now()}-${++state.allocationId}`,
    name,
    percentage,
    children: []
  });
  const validateAllocationTree = (nodes, parentName = 'Net profit', depth = 1) => {
    if (!Array.isArray(nodes) || !nodes.length) throw new Error(`${parentName} needs at least one allocation.`);
    if (depth > 8) throw new Error('Profit allocations can be split up to 8 levels deep.');
    for (const node of nodes) {
      if (!String(node?.name || '').trim()) throw new Error('Every profit allocation needs a name.');
      const value = Number(node?.percentage);
      if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error(`${node.name} must be between 0% and 100%.`);
      if (Array.isArray(node.children) && node.children.length) validateAllocationTree(node.children, node.name, depth + 1);
    }
    const total = allocationTotal(nodes);
    if (Math.abs(total - 100) > 0.01) throw new Error(`${parentName} allocations must total 100% (currently ${formatPercentage(total)}%).`);
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
      const partnerPayments = numeric(books, ['partner_payments']);
      const otherIncome = numeric(books, ['other_income']);
      const revenue = sourceRevenue + partnerPayments + otherIncome - refunds;
      const productCosts = numeric(books, ['product_costs', 'product_purchases']);
      const packingCosts = numeric(books, ['packing_costs']);
      const adCost = numeric(books, ['ad_cost']);
      const marketingOther = numeric(books, ['marketing_other']);
      const payroll = numeric(books, ['payroll']);
      const operations = numeric(books, ['operations']);
      const fees = numeric(books, ['fees', 'transfer_fees']);
      const transferFees = numeric(books, ['transfer_fees']);
      const opex = adCost + marketingOther + payroll + operations + fees;
      const grossProfit = revenue - productCosts - packingCosts;
      return {
        month,
        revenue,
        sourceRevenue,
        partnerPayments,
        refunds,
        cogs: productCosts,
        packing: packingCosts,
        grossProfit,
        marketing: adCost,
        marketingOther,
        payroll,
        operations,
        transferFees,
        fees,
        opex,
        otherIncome,
        netProfit: revenue - productCosts - packingCosts - opex,
        productPurchases: productCosts,
        categoryAmounts: books?.category_amounts && typeof books.category_amounts === 'object' ? books.category_amounts : {}
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
  const pnlBucketLabels = {
    product_cost: 'PO / product cost',
    packing_cost: 'Actual packing cost',
    ad_cost: 'Marketing / platform ads',
    marketing: 'Other marketing',
    payroll: 'Payroll / labor',
    operations: 'Operations / tax',
    fees: 'Bank / payment fees',
    exclude: 'Excluded from Net Profit'
  };
  const operatingBuckets = new Set(['ad_cost', 'marketing', 'payroll', 'operations', 'fees']);
  const categoryDisplay = (category) => {
    const rawName = String(category?.name || 'Category').trim();
    const leafName = rawName.includes(' | ') ? rawName.split(' | ').at(-1).trim() : rawName;
    const codeMatch = leafName.match(/(?:\s+[–—-]\s*|\s+)([0-9]{4,}(?:-[A-Za-z0-9]+)?)\s*$/);
    const code = String(category?.account_code || codeMatch?.[1] || '').trim();
    const withoutCode = codeMatch ? leafName.slice(0, codeMatch.index).trim() : leafName;
    const translationMatch = withoutCode.match(/\(([^()]*)\)\s*$/);
    const translation = String(translationMatch?.[1] || '').trim();
    const title = (translationMatch ? withoutCode.slice(0, translationMatch.index) : withoutCode).trim() || withoutCode || 'Category';
    const rawParent = String(category?.parent_name || '').trim();
    const parentLeaf = rawParent.includes(' | ') ? rawParent.split(' | ').at(-1).trim() : rawParent;
    const parent = parentLeaf.replace(/\s*\([^()]*(?:\([^()]*\)[^()]*)*\)\s*$/, '').trim();
    return { title, translation, code, parent, rawName, rawParent };
  };
  const categoryTotals = (rows) => rows.reduce((totals, row) => {
    Object.entries(row.categoryAmounts || {}).forEach(([categoryId, amount]) => {
      totals[categoryId] = (totals[categoryId] || 0) + Number(amount || 0);
    });
    return totals;
  }, {});
  const operatingCategoryRows = (rows) => {
    const totals = categoryTotals(rows);
    return state.categorySettings
      .filter((category) => category.include_in_net_profit && operatingBuckets.has(String(category.pnl_bucket || '')))
      .map((category) => ({ ...category, amount: Number(totals[String(category.category_id)] || 0) }))
      .filter((category) => category.amount !== 0)
      .sort((a, b) => Number(b.amount) - Number(a.amount));
  };
  const allocationRows = (nodes, parentAmount, parentName = 'Net profit', depth = 0) => nodes.map((node) => {
    const amount = parentAmount * (Number(node.percentage) || 0) / 100;
    const children = Array.isArray(node.children) ? node.children : [];
    return `<div class="pnl-allocation-row${children.length ? ' has-children' : ''}" style="--pnl-allocation-depth:${depth}"><span><strong>${escapeHtml(node.name)}</strong><small>${formatPercentage(node.percentage)}% of ${escapeHtml(parentName)}</small></span><b>${money(amount)}</b></div>${children.length ? allocationRows(children, amount, node.name, depth + 1) : ''}`;
  }).join('');
  const renderAllocation = (netProfit) => {
    if (!refs.allocationTree) return;
    const distributableProfit = Math.max(0, Number(netProfit) || 0);
    if (!state.allocationTree.length) {
      refs.allocationTree.innerHTML = '<p class="pnl-allocation-empty">No profit allocation is configured.</p>';
      return;
    }
    refs.allocationTree.innerHTML = allocationRows(state.allocationTree, distributableProfit);
    if (refs.allocationIntro) refs.allocationIntro.textContent = distributableProfit > 0
      ? `${money(distributableProfit)} of positive net profit is allocated below. Parent rows show the amount before their sub-splits.`
      : 'There is no positive net profit to allocate in this period. The configured sharing structure is shown at Rp0.';
  };
  const renderAllocationEditorLevel = (nodes, parentName = 'Net profit', depth = 0) => `
    <section class="pnl-allocation-editor-level" style="--pnl-editor-depth:${depth}">
      <div class="pnl-allocation-level-summary"><span>${escapeHtml(parentName)} split</span><strong class="${Math.abs(allocationTotal(nodes) - 100) <= 0.01 ? 'is-valid' : 'is-invalid'}">${formatPercentage(allocationTotal(nodes))}% / 100%</strong></div>
      ${nodes.map((node) => `
        <div class="pnl-allocation-editor-item">
          <div class="pnl-allocation-editor-row">
            <label><span>Name</span><input type="text" maxlength="120" value="${escapeHtml(node.name)}" data-pnl-allocation-name="${escapeHtml(node.id)}"></label>
            <label class="pnl-allocation-percentage"><span>Percent</span><input type="number" min="0" max="100" step="0.0001" value="${escapeHtml(node.percentage)}" data-pnl-allocation-percentage="${escapeHtml(node.id)}"><b>%</b></label>
            <button type="button" class="admin-ghost-btn" data-pnl-add-child="${escapeHtml(node.id)}">Add sub-split</button>
            <button type="button" class="pnl-allocation-remove" data-pnl-remove-allocation="${escapeHtml(node.id)}" aria-label="Remove ${escapeHtml(node.name)}">Remove</button>
          </div>
          ${Array.isArray(node.children) && node.children.length ? renderAllocationEditorLevel(node.children, node.name, depth + 1) : ''}
        </div>`).join('')}
    </section>`;
  const renderAllocationEditor = () => {
    if (!refs.allocationEditor) return;
    refs.allocationEditor.innerHTML = state.allocationDraft.length
      ? renderAllocationEditorLevel(state.allocationDraft)
      : '<p class="pnl-allocation-empty">Add an allocation to begin.</p>';
  };
  const showAllocationError = (message = '') => {
    if (!refs.allocationError) return;
    refs.allocationError.textContent = message;
    refs.allocationError.hidden = !message;
  };
  const render = () => {
    const selected = sumRows(selectedRows());
    const periodName = state.period === 'ytd' ? `${state.year} year to date` : `${monthNames[Number(state.period) - 1]} ${state.year}`;
    if (refs.periodTitle) refs.periodTitle.textContent = periodName;
    const values = {
      revenue: selected.revenue || 0,
      cogs: selected.cogs || 0,
      packing: selected.packing || 0,
      'gross-profit': selected.grossProfit || 0,
      'ad-cost': selected.marketing || 0,
      opex: selected.opex || 0,
      'net-profit': selected.netProfit || 0
    };
    Object.entries(values).forEach(([key, value]) => { if (refs.kpis[key]) refs.kpis[key].textContent = money(value); });
    if (refs.margin) refs.margin.textContent = `${percent(selected.grossProfit, selected.revenue)} margin`;
    if (refs.netMargin) refs.netMargin.textContent = `${percent(selected.netProfit, selected.revenue)} margin`;
    refs.netCard?.classList.toggle('is-negative', Number(selected.netProfit || 0) < 0);
    const periodRows = selectedRows();
    const operatingRows = operatingCategoryRows(periodRows);
    if (refs.bridge) refs.bridge.innerHTML = [
      bridgeRow('Seller-received sales', selected.sourceRevenue || 0),
      bridgeRow('Partner payments', selected.partnerPayments || 0),
      selected.otherIncome ? bridgeRow('Other revenue', selected.otherIncome || 0) : '',
      selected.refunds ? bridgeRow('Less: manual customer refunds', -(selected.refunds || 0), 'is-deduction') : '',
      bridgeRow('Net revenue', selected.revenue || 0, 'is-subtotal'),
      bridgeRow('Less: actual PO / product payments', -(selected.cogs || 0), 'is-deduction'),
      bridgeRow('Less: actual Accounting packing costs', -(selected.packing || 0), 'is-deduction'),
      bridgeRow('Gross profit', selected.grossProfit || 0, 'is-subtotal'),
      ...operatingRows.map((category) => {
        const display = categoryDisplay(category);
        return bridgeRow(`Less: ${display.title}${display.code ? ` · ${display.code}` : ''}`, -category.amount, 'is-deduction');
      }),
      selected.transferFees ? bridgeRow('Less: transfer fees', -(selected.transferFees || 0), 'is-deduction') : '',
      bridgeRow('Net profit', selected.netProfit || 0, 'is-total')
    ].join('');
    const expenseRows = [
      ...operatingRows.map((category) => {
        const display = categoryDisplay(category);
        return [display.title, category.amount, [display.code, pnlBucketLabels[category.pnl_bucket] || 'Operating expense'].filter(Boolean).join(' · ')];
      }),
      ...(selected.transferFees ? [['Transfer fees', selected.transferFees, 'System-calculated fee']] : [])
    ];
    const maxExpense = Math.max(...expenseRows.map(([, value]) => value), 1);
    if (refs.expenseMix) refs.expenseMix.innerHTML = expenseRows.length
      ? expenseRows.map(([label, value, bucket]) => `<div><span>${escapeHtml(label)}<small>${escapeHtml(bucket)}</small></span><i><b style="width:${Math.round(value / maxExpense * 100)}%"></b></i><strong>${money(value)}</strong></div>`).join('')
      : '<p class="pnl-allocation-empty">No included operating expenses in this period.</p>';
    if (refs.months) refs.months.innerHTML = state.rows.map((row) => `<tr data-pnl-month="${row.month}" class="${state.period === String(row.month) ? 'is-selected' : ''}"><td><button type="button" data-pnl-focus-month="${row.month}">${monthNames[row.month - 1]}</button></td><td>${money(row.revenue)}</td><td>${money(row.cogs)}</td><td>${money(row.packing)}</td><td>${money(row.grossProfit)}</td><td>${money(row.marketing)}</td><td>${money(row.opex - row.marketing)}</td><td><strong>${money(row.netProfit)}</strong></td><td>${percent(row.netProfit, row.revenue)}</td></tr>`).join('');
    const maxProfit = Math.max(...state.rows.map((row) => Math.abs(row.netProfit)), 1);
    if (refs.trend) refs.trend.innerHTML = state.rows.map((row) => `<button type="button" data-pnl-focus-month="${row.month}" title="${escapeHtml(`${monthNames[row.month - 1]}: ${money(row.netProfit)}`)}"><i class="${row.netProfit < 0 ? 'is-negative' : ''}" style="height:${Math.max(4, Math.round(Math.abs(row.netProfit) / maxProfit * 100))}%"></i><span>${monthNames[row.month - 1].slice(0, 3)}</span></button>`).join('');
    if (refs.reviewStatus) refs.reviewStatus.textContent = state.reviewItems > 0 ? `${state.reviewItems.toLocaleString('id-ID')} open item${state.reviewItems === 1 ? '' : 's'} should be corrected before relying on final profit.` : 'No open Accounting review items.';
    renderAllocation(selected.netProfit || 0);
    if (refs.status && state.loadedAt) {
      refs.status.textContent = `Updated ${new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(state.loadedAt)} WIB`;
    }
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
      const [sales, accountingResponse, profitLossResponse] = await Promise.all([
        requestJson(`${salesEndpoint}?year=${state.year}${suffix}`),
        requestJson(`${accountingEndpoint}?action=pnl_summary&year=${state.year}${suffix}`),
        requestJson(`${profitLossEndpoint}?year=${state.year}&scope=allocation_settings${suffix}`)
      ]);
      const accounting = accountingResponse.data || {};
      state.rows = combine(sales, accounting);
      state.categorySettings = Array.isArray(accounting.category_settings) ? accounting.category_settings : [];
      state.allocationTree = cloneAllocations(profitLossResponse?.settings?.allocation_tree || []);
      state.reviewItems = Number(accounting.open_review_items || 0);
      state.loadedAt = new Date();
      renderControls(Array.isArray(sales.years) ? sales.years : []);
      render();
    } catch (error) {
      if (refs.status) refs.status.textContent = error?.message || 'Unable to load the P&L.';
      if (refs.months) refs.months.innerHTML = `<tr><td colspan="9" class="admin-empty">${escapeHtml(error?.message || 'Unable to load the P&L.')}</td></tr>`;
    }
  };
  refs.year?.addEventListener('change', () => { state.year = Number(refs.year.value) || currentYear; state.period = 'ytd'; load(); });
  refs.period?.addEventListener('change', () => { state.period = refs.period.value || 'ytd'; render(); });
  refs.refresh?.addEventListener('click', () => load(true));
  root.querySelector('[data-pnl-edit-allocation]')?.addEventListener('click', () => {
    state.allocationDraft = cloneAllocations(state.allocationTree);
    if (refs.allocationYear) refs.allocationYear.textContent = String(state.year);
    showAllocationError();
    renderAllocationEditor();
    refs.allocationDialog?.showModal();
  });
  root.querySelectorAll('[data-pnl-close-allocation], [data-pnl-cancel-allocation]').forEach((button) => button.addEventListener('click', () => refs.allocationDialog?.close()));
  root.querySelector('[data-pnl-add-allocation]')?.addEventListener('click', () => {
    state.allocationDraft.push(newAllocation());
    showAllocationError();
    renderAllocationEditor();
  });
  refs.allocationEditor?.addEventListener('input', (event) => {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    if (!input) return;
    const id = input.dataset.pnlAllocationName || input.dataset.pnlAllocationPercentage || '';
    const node = findAllocation(id);
    if (!node) return;
    if (input.matches('[data-pnl-allocation-name]')) node.name = input.value;
    if (input.matches('[data-pnl-allocation-percentage]')) node.percentage = input.value;
    const level = input.closest('.pnl-allocation-editor-level');
    const summary = level?.querySelector(':scope > .pnl-allocation-level-summary strong');
    if (summary) {
      const item = input.closest('.pnl-allocation-editor-item');
      const siblingsContainer = item?.parentElement;
      const siblingIds = siblingsContainer ? [...siblingsContainer.children].filter((child) => child.classList.contains('pnl-allocation-editor-item')).map((child) => child.querySelector('[data-pnl-allocation-name]')?.dataset.pnlAllocationName).filter(Boolean) : [];
      const total = siblingIds.reduce((sum, siblingId) => sum + (Number(findAllocation(siblingId)?.percentage) || 0), 0);
      summary.textContent = `${formatPercentage(total)}% / 100%`;
      summary.classList.toggle('is-valid', Math.abs(total - 100) <= 0.01);
      summary.classList.toggle('is-invalid', Math.abs(total - 100) > 0.01);
    }
    showAllocationError();
  });
  refs.allocationEditor?.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const addButton = target?.closest('[data-pnl-add-child]');
    const removeButton = target?.closest('[data-pnl-remove-allocation]');
    if (addButton instanceof HTMLElement) {
      const node = findAllocation(addButton.dataset.pnlAddChild || '');
      if (!node) return;
      if (!Array.isArray(node.children)) node.children = [];
      node.children.push(newAllocation('New sub-allocation', node.children.length ? 0 : 100));
      showAllocationError();
      renderAllocationEditor();
    }
    if (removeButton instanceof HTMLElement) {
      removeAllocation(removeButton.dataset.pnlRemoveAllocation || '');
      showAllocationError();
      renderAllocationEditor();
    }
  });
  refs.allocationForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    showAllocationError();
    try {
      validateAllocationTree(state.allocationDraft);
      if (refs.saveAllocation) refs.saveAllocation.disabled = true;
      const response = await postJson({ action: 'save_allocation_tree', year: state.year, allocation_tree: state.allocationDraft });
      state.allocationTree = cloneAllocations(response?.settings?.allocation_tree || state.allocationDraft);
      refs.allocationDialog?.close();
      render();
    } catch (error) {
      showAllocationError(error?.message || 'Unable to save the profit allocation.');
    } finally {
      if (refs.saveAllocation) refs.saveAllocation.disabled = false;
    }
  });
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
