(() => {
  'use strict';

  const root = document.querySelector('[data-product-analytics]');
  if (!root) return;

  const refs = {
    back: root.querySelector('[data-back]'),
    title: root.querySelector('[data-page-title]'),
    subtitle: root.querySelector('[data-page-subtitle]'),
    dimensionLabel: root.querySelector('[data-dimension-label]'),
    status: root.querySelector('[data-load-status]'),
    statusText: root.querySelector('[data-load-status] span'),
    theme: root.querySelector('[data-theme-toggle]'),
    export: root.querySelector('[data-export]'),
    scopeButtons: Array.from(root.querySelectorAll('[data-scope]')),
    metricButtons: Array.from(root.querySelectorAll('[data-metric]')),
    dateForm: root.querySelector('[data-date-form]'),
    startDate: root.querySelector('[data-start-date]'),
    endDate: root.querySelector('[data-end-date]'),
    content: root.querySelector('[data-content]'),
    empty: root.querySelector('[data-empty]'),
    kpis: root.querySelector('[data-kpis]'),
    canvas: root.querySelector('[data-history-chart]'),
    tooltip: root.querySelector('[data-chart-tooltip]'),
    forecastMethod: root.querySelector('[data-forecast-method]'),
    flavors: root.querySelector('[data-flavor-breakdown]'),
    volumes: root.querySelector('[data-volume-breakdown]'),
    platforms: root.querySelector('[data-platform-breakdown]'),
    partners: root.querySelector('[data-partner-breakdown]'),
    accounts: root.querySelector('[data-account-breakdown]'),
    history: root.querySelector('[data-history-body]'),
    historyHead: root.querySelector('[data-history-head]'),
    historyTitle: root.querySelector('#monthly-change-title'),
    historyNote: root.querySelector('[data-history-note]'),
    chartTitle: root.querySelector('#sales-history-title'),
    chartEyebrow: root.querySelector('[data-chart-eyebrow]'),
    legend: root.querySelector('[data-chart-legend]'),
    compareProduct: root.querySelector('[data-compare-product]'),
    compareFlavor: root.querySelector('[data-compare-flavor]'),
    compareVolume: root.querySelector('[data-compare-volume]'),
    comparePrimary: root.querySelector('[data-compare-primary]'),
    compareClear: root.querySelector('[data-compare-clear]'),
    compareMessage: root.querySelector('[data-compare-message]'),
    compareRetry: root.querySelector('[data-compare-retry]'),
    comparison: root.querySelector('[data-comparison]'),
    mixContext: root.querySelector('[data-mix-context]')
  };

  const jakartaDate = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  const today = jakartaDate();
  const year = today.slice(0, 4);
  const params = new URLSearchParams(window.location.search);
  const initialScope = params.get('scope');
  const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
  const state = {
    product: root.dataset.product || 'syrup',
    dimension: root.dataset.dimension || 'product',
    flavor: root.dataset.flavor || '',
    volume: root.dataset.volume || '',
    scope: ['today', 'month', 'year', 'custom'].includes(initialScope) ? initialScope : 'all',
    metric: params.get('metric') === 'revenue' ? 'revenue' : 'quantity',
    startDate: `${year}-01-01`,
    endDate: today,
    data: null,
    compare: params.get('compare') || '',
    compareFlavor: params.get('compare_flavor') || '',
    compareVolume: params.get('compare_volume') || '',
    comparison: null,
    catalog: null,
    loading: false,
    requestId: 0,
    chartPoints: []
  };
  if (state.scope === 'custom') {
    const start = params.get('start_date');
    const end = params.get('end_date');
    if (validDate(start) && validDate(end) && start <= end) {
      state.startDate = start; state.endDate = end;
    } else state.scope = 'all';
  }
  const applyPreset = () => {
    const current = jakartaDate();
    if (state.scope === 'today') state.startDate = current;
    if (state.scope === 'month') state.startDate = `${current.slice(0, 7)}-01`;
    if (state.scope === 'year') state.startDate = `${current.slice(0, 4)}-01-01`;
    if (['today', 'month', 'year'].includes(state.scope)) state.endDate = current;
  };
  const grain = () => state.scope === 'today' ? 'hour' : state.scope === 'month' ? 'day' : 'month';
  const comparisonSelection = () => ({
    product: state.compare, flavor: state.compareFlavor, volume: state.compareVolume,
    dimension: state.compareFlavor && state.compareVolume ? 'sku' : state.compareFlavor ? 'flavor' : state.compareVolume ? 'volume' : 'product'
  });
  const sameSelection = () => {
    const compare = comparisonSelection();
    return compare.product === state.product && compare.dimension === state.dimension
      && compare.flavor === (['flavor', 'sku'].includes(state.dimension) ? state.flavor : '')
      && compare.volume === (['volume', 'sku'].includes(state.dimension) ? state.volume : '');
  };
  const writeUrl = () => {
    const url = new URL(window.location.href);
    const values = { scope: state.scope, metric: state.metric, start_date: state.startDate, end_date: state.endDate,
      compare: state.compare, compare_flavor: state.compareFlavor, compare_volume: state.compareVolume };
    Object.entries(values).forEach(([key, value]) => value ? url.searchParams.set(key, value) : url.searchParams.delete(key));
    window.history.replaceState(null, '', url);
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[character]));
  const integer = (value) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value || 0));
  const currency = (value) => `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(value || 0))}`;
  const compact = (value, metric = state.metric) => {
    const number = Number(value || 0);
    if (metric === 'revenue') {
      if (Math.abs(number) < 1000000) return currency(number);
      return `Rp ${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(number)}`;
    }
    return new Intl.NumberFormat('en-US', { notation: Math.abs(number) >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(number);
  };
  const metricValue = (value, metric = state.metric) => metric === 'revenue' ? currency(value) : `${integer(value)} units`;
  const percent = (value) => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(Number(value || 0))}%`;
  const dateLabel = (value) => {
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00+07:00`);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(date);
  };
  const longDate = (value) => {
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00+07:00`);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(date);
  };
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const selectedUrl = (dimension, flavor = '', volume = '') => {
    const params = new URLSearchParams({ product: state.product, dimension, scope: state.scope, metric: state.metric,
      start_date: state.startDate, end_date: state.endDate });
    if (flavor) params.set('flavor', flavor);
    if (volume) params.set('volume', volume);
    return `./?${params.toString()}`;
  };

  const setStatus = (message, mode = '') => {
    refs.statusText.textContent = message;
    refs.status.classList.toggle('is-loading', mode === 'loading');
    refs.status.classList.toggle('is-error', mode === 'error');
  };
  const activeButton = (buttons, key, value) => buttons.forEach((button) => {
    const active = button.dataset[key] === value;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  const compareMessage = (message = '', retry = false) => {
    refs.compareMessage.textContent = message;
    refs.compareRetry.hidden = !retry;
  };
  const populateCompareOptions = () => {
    const product = state.catalog?.find((item) => item.key === state.compare);
    const options = (rows, label) => `<option value="">${label}</option>${(rows || []).map((row) => `<option value="${escapeHtml(row.key)}">${escapeHtml(row.label)}</option>`).join('')}`;
    refs.compareProduct.innerHTML = options(state.catalog, 'Choose a product…');
    refs.compareProduct.value = state.compare;
    refs.compareProduct.disabled = false;
    refs.compareFlavor.innerHTML = options(product?.flavors, 'All flavors');
    refs.compareFlavor.value = state.compareFlavor;
    refs.compareFlavor.disabled = !product;
    const volumes = (product?.volumes || []).filter((volume) => !state.compareFlavor || (product.variants || []).some((variant) => variant.flavor_key === state.compareFlavor && variant.volume_key === volume.key));
    if (!volumes.some((volume) => volume.key === state.compareVolume)) state.compareVolume = '';
    refs.compareVolume.innerHTML = options(volumes, 'All sizes');
    refs.compareVolume.value = state.compareVolume;
    refs.compareVolume.disabled = !product;
    refs.compareClear.hidden = !state.compare;
  };
  const loadCatalog = async () => {
    try {
      const url = new URL(root.dataset.endpoint, window.location.href);
      url.searchParams.set('action', 'product_breakdown_catalog');
      const response = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error('Could not load products.');
      state.catalog = payload.products || [];
      if (state.compare && !state.catalog.some((product) => product.key === state.compare)) {
        state.compare = ''; state.compareFlavor = ''; state.compareVolume = '';
        compareMessage('That comparison product is no longer available. Choose another product.');
      }
      const product = state.catalog.find((item) => item.key === state.compare);
      if (!(product?.flavors || []).some((flavor) => flavor.key === state.compareFlavor)) state.compareFlavor = '';
      populateCompareOptions();
      if (!state.catalog.length) compareMessage('No products are available to compare yet.');
    } catch (_error) {
      refs.compareProduct.innerHTML = '<option value="">Products unavailable</option>';
      compareMessage('Could not load the product list. Your analytics are still available.', true);
    }
  };

  const readAllTimeRange = async () => {
    const url = new URL(root.dataset.endpoint, window.location.href);
    url.searchParams.set('action', 'status');
    const response = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'Could not discover the sales history.');
    return {
      startDate: String(payload?.mirror?.oldest_order_at || `${year}-01-01`).slice(0, 10),
      endDate: String(payload?.mirror?.newest_order_at || today).slice(0, 10)
    };
  };

  const selectionDescription = (selection) => {
    const range = `${longDate(state.data.start_date)} – ${longDate(state.data.end_date)}`;
    const base = {
      flavor: `Every sold volume of ${selection.flavor_label || 'this flavor'}, across all recorded channels and partners.`,
      volume: `Every flavor sold in ${selection.volume_label || 'this volume'}, across all recorded channels and partners.`,
      sku: `The exact ${selection.flavor_label || 'flavor'} and ${selection.volume_label || 'volume'} combination, across all recorded channels and partners.`,
      product: `Every flavor and volume in this product family, across all recorded channels and partners.`
    }[selection.dimension] || '';
    return `${base} Showing ${range}.`;
  };

  const lastPair = () => {
    const rows = state.data?.history || [];
    return [rows.at(-1) || null, rows.at(-2) || null];
  };

  const rankedByMetric = (rows) => [...(rows || [])].sort((left, right) => (
    Number(right?.[state.metric] || 0) - Number(left?.[state.metric] || 0)
    || String(left?.label || '').localeCompare(String(right?.label || ''))
  ));

  const renderKpis = () => {
    const totals = state.data.totals || {};
    const [latest, previous] = lastPair();
    const projection = state.data.forecast?.[0] || null;
    const comparison = projection || latest;
    const quantityChange = comparison && previous && Number(previous.quantity) > 0
      ? ((Number(comparison.quantity) - Number(previous.quantity)) / Number(previous.quantity)) * 100 : null;
    const revenueChange = comparison && previous && Number(previous.revenue) > 0
      ? ((Number(comparison.revenue) - Number(previous.revenue)) / Number(previous.revenue)) * 100 : null;
    const periodLabel = ({ hour: 'hour', day: 'day', month: 'month' })[state.data.grain] || 'month';
    const comparisonLabel = projection ? 'projected month-end' : `latest ${periodLabel}`;
    const changeNote = (value, label) => value === null
      ? `<small>No earlier ${periodLabel} to compare</small>`
      : `<small class="${value > 0 ? 'is-up' : value < 0 ? 'is-down' : ''}">${value > 0 ? '↑' : value < 0 ? '↓' : '→'} ${escapeHtml(percent(value))} ${escapeHtml(label)}</small>`;
    const accountRows = rankedByMetric(state.data.breakdowns?.accounts).slice(0, 4);
    const accountLeaderboard = accountRows.length
      ? `<ol class="product-analytics-kpi-ranking">${accountRows.map((row, index) => `<li><i>${index + 1}</i><span><b title="${escapeHtml(row.label)}">${escapeHtml(row.label)}</b><small>${escapeHtml(row.platform_label || '')}</small></span><em>${escapeHtml(compact(row[state.metric]))}</em></li>`).join('')}</ol>`
      : '<p class="product-analytics-kpi-ranking-empty">No Shopee or TikTok account sales</p>';
    refs.kpis.innerHTML = `
      <article class="product-analytics-kpi"><span>Total units</span><strong>${escapeHtml(integer(totals.quantity))}</strong>${changeNote(quantityChange, comparisonLabel)}</article>
      <article class="product-analytics-kpi"><span>Seller revenue</span><strong>${escapeHtml(compact(totals.revenue, 'revenue'))}</strong>${changeNote(revenueChange, comparisonLabel)}</article>
      <article class="product-analytics-kpi"><span>Revenue / unit</span><strong>${escapeHtml(currency(Number(totals.quantity) > 0 ? Number(totals.revenue) / Number(totals.quantity) : 0))}</strong><small>Average across the selected history</small></article>
      <article class="product-analytics-kpi is-ranking"><span>Account ranking · ${state.metric === 'revenue' ? 'revenue' : 'units'}</span>${accountLeaderboard}</article>
    `;
  };

  const comparisonHistory = () => {
    const first = new Map((state.data?.history || []).map((row) => [row.key, row]));
    const second = new Map((state.comparison?.history || []).map((row) => [row.key, row]));
    return [...new Set([...first.keys(), ...second.keys()])].sort().map((key) => {
      const row = first.get(key) || second.get(key);
      const empty = { ...row, quantity: 0, revenue: 0 };
      return { first: first.get(key) || empty, second: second.get(key) || empty };
    });
  };

  const renderComparison = () => {
    const datasets = [state.data, state.comparison];
    refs.comparison.innerHTML = datasets.map((data, index) => {
      const totals = data.totals || {};
      const quantity = Number(totals.quantity || 0);
      const revenue = Number(totals.revenue || 0);
      return `<article class="product-analytics-comparison-card ${index ? 'is-comparison' : 'is-primary'}">
        <h3>${escapeHtml(data.selection.title)}</h3>
        <dl><div><dt>Total units</dt><dd>${escapeHtml(integer(quantity))}</dd></div>
        <div><dt>Seller revenue</dt><dd>${escapeHtml(currency(revenue))}</dd></div>
        <div><dt>Revenue / unit</dt><dd>${quantity > 0 ? escapeHtml(currency(revenue / quantity)) : '—'}</dd></div></dl>
        ${quantity === 0 && revenue === 0 ? '<p>No sales in this period.</p>' : ''}
      </article>`;
    }).join('');
    const first = Number(state.data.totals?.[state.metric] || 0);
    const second = Number(state.comparison.totals?.[state.metric] || 0);
    const difference = Math.abs(first - second);
    const leader = first > second ? state.data.selection.title : state.comparison.selection.title;
    const smaller = Math.min(first, second);
    const note = first === second ? `Both selections have the same ${state.metric === 'revenue' ? 'revenue' : 'unit sales'}.`
      : `${leader} has ${metricValue(difference)} more${smaller > 0 ? ` (${percent(difference / smaller * 100)})` : ''} in this period.`;
    refs.comparison.insertAdjacentHTML('beforeend', `<p class="product-analytics-comparison-difference">${escapeHtml(note)}</p>`);
  };

  const rankPalette = ['#5da9ff', '#b48cff', '#31d47b', '#ffad55', '#ff6470', '#53d5c5', '#e57ddd', '#9bc75b'];
  const renderRanking = (target, rows, type) => {
    if (!rows?.length) {
      target.innerHTML = `<div class="product-analytics-ranking-empty">${type === 'partner' ? 'No partner sales match this selection yet.' : 'No breakdown data is available.'}</div>`;
      return;
    }
    const rankedRows = rankedByMetric(rows);
    const maximum = Math.max(1, ...rankedRows.map((row) => Number(row[state.metric] || 0)));
    target.innerHTML = rankedRows.slice(0, 12).map((row, index) => {
      const value = Number(row[state.metric] || 0);
      const share = Number(row[`${state.metric}_share`] || 0) * 100;
      const href = type === 'flavor' ? selectedUrl('flavor', row.key) : type === 'volume' ? selectedUrl('volume', '', row.key) : '';
      const visibleLabel = type === 'account' ? (row.account_label || row.label) : row.label;
      const label = href
        ? `<a href="${escapeHtml(href)}" title="Open ${escapeHtml(row.label)} analytics">${escapeHtml(row.label)}</a>`
        : `<strong title="${escapeHtml(visibleLabel)}">${type === 'account' ? `<b class="product-analytics-rank-number">${index + 1}</b>` : ''}${escapeHtml(visibleLabel)}</strong>`;
      const meta = type === 'account' ? `${row.platform_label || 'Marketplace'} · ${percent(share)} share` : `${percent(share)} share`;
      return `<div class="product-analytics-rank-row${type === 'account' ? ' is-account' : ''}">
        <div class="product-analytics-rank-label">${label}<small>${escapeHtml(meta)}</small></div>
        <div class="product-analytics-rank-track" aria-hidden="true"><i style="--rank-fill:${Math.max(2, (value / maximum) * 100).toFixed(1)}%;--rank-color:${rankPalette[index % rankPalette.length]}"></i></div>
        <div class="product-analytics-rank-value"><strong>${escapeHtml(compact(value))}</strong><small>${state.metric === 'revenue' ? 'revenue' : 'units'}</small></div>
      </div>`;
    }).join('');
  };

  const changeCell = (value, percentageValue) => {
    if (value === null || value === undefined) return '<span class="product-analytics-change is-flat">—</span>';
    const numeric = Number(value || 0);
    const tone = numeric > 0 ? 'is-up' : numeric < 0 ? 'is-down' : 'is-flat';
    const arrow = numeric > 0 ? '↑' : numeric < 0 ? '↓' : '→';
    const detail = percentageValue === null || percentageValue === undefined ? compact(Math.abs(numeric)) : percent(percentageValue);
    return `<span class="product-analytics-change ${tone}">${arrow} ${escapeHtml(detail)}</span>`;
  };

  const renderHistory = () => {
    const period = ({ hour: 'Hour (WIB)', day: 'Day', month: 'Month' })[state.data.grain] || 'Month';
    if (state.comparison) {
      const first = escapeHtml(state.data.selection.title);
      const second = escapeHtml(state.comparison.selection.title);
      refs.historyHead.innerHTML = `<tr><th scope="col">${period}</th><th scope="col">${first} · units</th><th scope="col">${second} · units</th><th scope="col">${first} · revenue</th><th scope="col">${second} · revenue</th></tr>`;
      refs.history.innerHTML = comparisonHistory().reverse().map(({ first, second }) => `<tr><td>${escapeHtml(first.label)}</td><td>${escapeHtml(integer(first.quantity))}</td><td>${escapeHtml(integer(second.quantity))}</td><td>${escapeHtml(currency(first.revenue))}</td><td>${escapeHtml(currency(second.revenue))}</td></tr>`).join('');
      return;
    }
    refs.historyHead.innerHTML = `<tr><th>${period}</th><th>Units</th><th>Unit change</th><th>Revenue</th><th>Revenue change</th><th>Status</th></tr>`;
    const actual = state.data.history || [];
    const combined = actual.map((row) => ({ ...row, predicted: false }));
    let prior = actual.length > 1 ? actual.at(-2) : null;
    (state.data.forecast || []).forEach((row) => {
      const quantityPrevious = Number(prior?.quantity || 0);
      const revenuePrevious = Number(prior?.revenue || 0);
      combined.push({
        ...row,
        quantity_change: prior ? Number(row.quantity || 0) - quantityPrevious : null,
        quantity_change_percent: quantityPrevious > 0 ? ((Number(row.quantity || 0) - quantityPrevious) / quantityPrevious) * 100 : null,
        revenue_change: prior ? Number(row.revenue || 0) - revenuePrevious : null,
        revenue_change_percent: revenuePrevious > 0 ? ((Number(row.revenue || 0) - revenuePrevious) / revenuePrevious) * 100 : null,
        predicted: true
      });
      prior = row;
    });
    refs.history.innerHTML = combined.reverse().map((row) => `<tr class="${row.predicted ? 'is-predicted' : ''}">
      <td>${escapeHtml(row.label || dateLabel(row.start_date))}</td>
      <td>${escapeHtml(integer(row.quantity))}</td>
      <td>${changeCell(row.quantity_change, row.quantity_change_percent)}</td>
      <td>${escapeHtml(currency(row.revenue))}</td>
      <td>${changeCell(row.revenue_change, row.revenue_change_percent)}</td>
      <td><span class="product-analytics-status-pill ${row.predicted ? 'is-predicted' : ''}">${row.predicted ? 'Projected month-end' : 'Actual'}</span></td>
    </tr>`).join('');
  };

  const drawChart = () => {
    const canvas = refs.canvas;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height || !state.data) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(bounds.width * dpr);
    canvas.height = Math.round(bounds.height * dpr);
    const context = canvas.getContext('2d');
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const width = bounds.width;
    const height = bounds.height;
    const padding = { top: 24, right: 23, bottom: 42, left: state.metric === 'revenue' ? 65 : width < 600 ? 44 : 62 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const pairs = state.comparison ? comparisonHistory() : [];
    const rows = (state.comparison ? pairs.map((pair) => pair.first) : state.data.history || []).map((row) => ({ ...row, predicted: false }));
    const comparisonValues = pairs.map((pair) => Number(pair.second[state.metric] || 0));
    const projection = !state.comparison && state.data.forecast?.[0] ? { ...state.data.forecast[0], predicted: true } : null;
    const values = rows.map((row) => Number(row[state.metric] || 0));
    const projectionValue = Number(projection?.[state.metric] || 0);
    const maximum = Math.max(1, ...values, ...comparisonValues, projectionValue) * 1.12;
    const x = (index) => padding.left + (rows.length <= 1 ? plotWidth / 2 : (index / (rows.length - 1)) * plotWidth);
    const y = (value) => padding.top + plotHeight - (Number(value || 0) / maximum) * plotHeight;
    context.clearRect(0, 0, width, height);
    context.font = '9px Inter, system-ui, sans-serif';
    context.textBaseline = 'middle';
    context.fillStyle = css('--pa-chart-label');
    context.strokeStyle = css('--pa-chart-grid');
    context.lineWidth = 1;
    for (let tick = 0; tick <= 4; tick++) {
      const tickValue = (maximum / 4) * tick;
      const tickY = y(tickValue);
      context.beginPath(); context.moveTo(padding.left, tickY); context.lineTo(width - padding.right, tickY); context.stroke();
      const tickLabel = state.metric === 'revenue' ? `Rp ${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(tickValue)}` : compact(tickValue);
      context.textAlign = 'right'; context.fillText(tickLabel, padding.left - 10, tickY);
    }
    const labelEvery = Math.max(1, Math.ceil(rows.length / (width < 600 ? 5 : 9)));
    rows.forEach((row, index) => {
      if (index % labelEvery !== 0 && index !== rows.length - 1) return;
      context.textAlign = index === 0 ? 'left' : index === rows.length - 1 ? 'right' : 'center';
      const label = state.data.grain === 'hour' ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Jakarta' }).format(new Date(row.start_at))
        : state.data.grain === 'day' ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(`${row.start_date}T00:00:00+07:00`)) : dateLabel(row.start_date);
      context.fillText(label, x(index), height - 17);
    });

    const actualCount = rows.length;
    if (actualCount > 1 && !state.comparison) {
      const gradient = context.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, `${css('--pa-actual')}35`);
      gradient.addColorStop(1, `${css('--pa-actual')}00`);
      context.beginPath(); context.moveTo(x(0), height - padding.bottom);
      for (let index = 0; index < actualCount; index++) context.lineTo(x(index), y(values[index]));
      context.lineTo(x(actualCount - 1), height - padding.bottom); context.closePath(); context.fillStyle = gradient; context.fill();
    }
    const drawLine = (start, end, color, dashed = false, series = values) => {
      if (end <= start) return;
      context.beginPath();
      for (let index = start; index <= end; index++) {
        const method = index === start ? 'moveTo' : 'lineTo';
        context[method](x(index), y(series[index]));
      }
      context.strokeStyle = color; context.lineWidth = 2.25; context.lineJoin = 'round'; context.lineCap = 'round';
      context.setLineDash(dashed ? [6, 6] : []); context.stroke(); context.setLineDash([]);
    };
    drawLine(0, Math.max(0, actualCount - 1), css('--pa-actual'));
    state.chartPoints = rows.map((row, index) => ({ row, title: state.data.selection.title, x: x(index), y: y(values[index]) }));
    if (state.comparison) {
      drawLine(0, Math.max(0, actualCount - 1), css('--pa-compare'), true, comparisonValues);
      pairs.forEach((pair, index) => state.chartPoints.push({ row: pair.second, title: state.comparison.selection.title, comparison: true, x: x(index), y: y(comparisonValues[index]) }));
    }
    if (projection && actualCount > 0) {
      const forecastX = x(actualCount - 1);
      const forecastY = y(projectionValue);
      if (actualCount > 1) {
        const previousMonthIndex = actualCount - 2;
        context.beginPath();
        context.moveTo(x(previousMonthIndex), y(values[previousMonthIndex]));
        context.lineTo(forecastX, forecastY);
        context.strokeStyle = css('--pa-forecast'); context.lineWidth = 2.25; context.lineCap = 'round';
        context.setLineDash([6, 6]); context.stroke(); context.setLineDash([]);
      }
      state.chartPoints.push({ row: projection, x: forecastX, y: forecastY });
    }
    state.chartPoints.forEach((point) => {
      context.beginPath();
      if (point.comparison) context.rect(point.x - 3, point.y - 3, 6, 6);
      else context.arc(point.x, point.y, point.row.predicted ? 3 : 2.5, 0, Math.PI * 2);
      context.fillStyle = point.comparison ? css('--pa-compare') : point.row.predicted ? css('--pa-forecast') : css('--pa-actual'); context.fill();
    });
  };

  const render = () => {
    const data = state.data;
    const selection = data.selection || {};
    refs.title.textContent = selection.title || `${selection.product_label || state.product} analytics`;
    document.title = `${refs.title.textContent} sales analytics`;
    refs.dimensionLabel.textContent = ({ product: 'Product overview', flavor: 'Flavor analytics', volume: 'Volume analytics', sku: 'Product analytics' }[selection.dimension] || 'Sales intelligence');
    refs.subtitle.textContent = selectionDescription(selection);
    refs.comparePrimary.textContent = selection.title;
    const daily = data.grain === 'day';
    const hourly = data.grain === 'hour';
    const periodLabel = hourly ? 'Hourly' : daily ? 'Daily' : 'Monthly';
    const comparing = Boolean(state.comparison);
    refs.chartTitle.textContent = `${periodLabel} sales ${comparing ? 'comparison' : 'pace'}`;
    refs.chartEyebrow.textContent = comparing ? 'Same dates · recorded sales' : daily || hourly ? 'Recorded sales' : 'Actual + run rate';
    refs.historyTitle.textContent = comparing ? 'Sales side by side' : `${periodLabel} increase & decrease`;
    refs.historyNote.textContent = hourly ? 'Sales per hour in Jakarta time (WIB). The current hour is still in progress.' : comparing ? 'Both products use the same dates and sales channels.' : daily ? 'Recorded sales for each day in the selected range.' : 'The current month projection is separated from recorded sales.';
    refs.legend.innerHTML = comparing
      ? `<span class="is-actual"><i></i>${escapeHtml(selection.title)}</span><span class="is-comparison"><i></i>${escapeHtml(state.comparison.selection.title)}</span>`
      : `<span class="is-actual"><i></i>Actual to date</span>${data.forecast?.length ? '<span class="is-forecast"><i></i>Projected month-end</span>' : ''}`;
    refs.canvas.setAttribute('aria-label', `${refs.chartTitle.textContent}: ${selection.title}${comparing ? ` and ${state.comparison.selection.title}` : ''}, ${state.metric === 'revenue' ? 'revenue' : 'units'}. Values are in the table below.`);
    refs.forecastMethod.textContent = hourly ? `Hourly sales · ${longDate(data.start_date)} · Jakarta time (WIB). The current hour is still in progress.` : comparing || daily ? `Recorded sales · ${longDate(data.start_date)} – ${longDate(data.end_date)} · Asia/Jakarta` : `Forecast note: ${data.forecast_method || 'Directional estimate based on recent history.'}`;
    const hasSales = Number(data.totals?.quantity || 0) > 0 || Number(data.totals?.revenue || 0) > 0;
    refs.content.hidden = !hasSales && !comparing;
    refs.empty.hidden = hasSales || comparing;
    refs.empty.querySelector('strong').textContent = 'No sales found for this selection';
    refs.empty.querySelector('p').textContent = 'Try All time, choose another flavor or volume, or compare another product.';
    if (!hasSales && !comparing) return;
    refs.kpis.hidden = comparing;
    refs.comparison.hidden = !comparing;
    refs.mixContext.hidden = !comparing;
    refs.mixContext.textContent = `Sales mix · ${selection.title}`;
    if (comparing) renderComparison(); else renderKpis();
    renderRanking(refs.flavors, data.breakdowns?.flavors, 'flavor');
    renderRanking(refs.volumes, data.breakdowns?.volumes, 'volume');
    renderRanking(refs.platforms, data.breakdowns?.platforms, 'platform');
    renderRanking(refs.partners, data.breakdowns?.partners, 'partner');
    renderRanking(refs.accounts, data.breakdowns?.accounts, 'account');
    renderHistory();
    window.requestAnimationFrame(drawChart);
  };

  const load = async () => {
    const requestId = ++state.requestId;
    applyPreset();
    state.loading = true;
    state.data = null;
    state.comparison = null;
    state.chartPoints = [];
    refs.tooltip.hidden = true;
    refs.export.disabled = true;
    setStatus('Updating…', 'loading');
    refs.content.hidden = true;
    refs.empty.hidden = true;
    try {
      if (state.scope === 'all') {
        const range = await readAllTimeRange();
        if (requestId !== state.requestId) return;
        state.startDate = range.startDate;
        state.endDate = range.endDate;
      }
      writeUrl();
      const fetchSelection = async (selection) => {
        const url = new URL(root.dataset.endpoint, window.location.href);
        url.searchParams.set('action', 'product_analytics');
        url.searchParams.set('grain', grain());
        url.searchParams.set('start_date', state.startDate);
        url.searchParams.set('end_date', state.endDate);
        ['product', 'dimension', 'flavor', 'volume'].forEach((key) => {
          if (selection[key]) url.searchParams.set(key, selection[key]);
        });
        const response = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'The product analytics could not be loaded.');
        return payload;
      };
      const shouldCompare = state.compare && !sameSelection();
      if (state.catalog) compareMessage(state.compare && !shouldCompare ? 'Choose a different product, flavor, or size to compare.' : shouldCompare ? 'Loading comparison…' : '');
      const [primary, secondary] = await Promise.allSettled([
        fetchSelection(state),
        shouldCompare ? fetchSelection(comparisonSelection()) : Promise.resolve(null)
      ]);
      if (requestId !== state.requestId) return;
      if (primary.status === 'rejected') throw primary.reason;
      state.data = primary.value;
      state.comparison = secondary.status === 'fulfilled' ? secondary.value : null;
      if (shouldCompare) compareMessage(secondary.status === 'rejected' ? 'Could not load the comparison. Your selected product is still shown.' : '', secondary.status === 'rejected');
      state.loading = false;
      refs.export.disabled = false;
      refs.startDate.value = state.startDate;
      refs.endDate.value = state.endDate;
      render();
      setStatus(`Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    } catch (error) {
      if (requestId !== state.requestId) return;
      state.loading = false;
      refs.empty.hidden = false;
      refs.empty.querySelector('strong').textContent = 'Could not load product analytics';
      refs.empty.querySelector('p').textContent = error?.message || 'Please try again.';
      setStatus('Unavailable', 'error');
    }
  };

  const exportCsv = () => {
    if (!state.data) return;
    const rows = [['Product', 'Period', 'Start date', 'End date', 'Units', 'Unit change', 'Revenue', 'Revenue change', 'Status']];
    [state.data, state.comparison].filter(Boolean).forEach((data) => {
      (data.history || []).forEach((row) => rows.push([data.selection.title, row.label, data.start_date, data.end_date, row.quantity, row.quantity_change ?? '', row.revenue, row.revenue_change ?? '', 'Actual']));
      if (!state.comparison) (data.forecast || []).forEach((row) => rows.push([data.selection.title, row.label, data.start_date, data.end_date, row.quantity, '', row.revenue, '', 'Projected month-end']));
    });
    const encode = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const blob = new Blob([rows.map((row) => row.map(encode).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${state.product}-${state.comparison ? `vs-${state.compare}` : state.dimension}-analytics-${state.startDate}-to-${state.endDate}.csv`;
    document.body.appendChild(link); link.click();
    window.setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 0);
  };

  refs.scopeButtons.forEach((button) => button.addEventListener('click', async () => {
    state.scope = button.dataset.scope || 'all';
    activeButton(refs.scopeButtons, 'scope', state.scope);
    refs.dateForm.hidden = state.scope !== 'custom';
    if (state.scope === 'custom') {
      refs.startDate.value = state.startDate; refs.endDate.value = state.endDate; refs.startDate.focus(); return;
    }
    await load();
  }));
  refs.metricButtons.forEach((button) => button.addEventListener('click', () => {
    state.metric = button.dataset.metric || 'quantity';
    activeButton(refs.metricButtons, 'metric', state.metric);
    writeUrl();
    if (state.data && !state.loading) render();
  }));
  refs.dateForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!refs.startDate.value || !refs.endDate.value || refs.startDate.value > refs.endDate.value) {
      refs.startDate.setCustomValidity(refs.startDate.value > refs.endDate.value ? 'Start date must be before end date.' : 'Choose a start date.');
      refs.startDate.reportValidity(); return;
    }
    refs.startDate.setCustomValidity(''); state.startDate = refs.startDate.value; state.endDate = refs.endDate.value; await load();
  });
  refs.startDate.addEventListener('input', () => refs.startDate.setCustomValidity(''));
  refs.endDate.addEventListener('input', () => refs.startDate.setCustomValidity(''));
  refs.compareProduct.addEventListener('change', () => {
    state.compare = refs.compareProduct.value;
    state.compareFlavor = ''; state.compareVolume = '';
    populateCompareOptions(); load();
  });
  refs.compareFlavor.addEventListener('change', () => {
    state.compareFlavor = refs.compareFlavor.value;
    populateCompareOptions(); load();
  });
  refs.compareVolume.addEventListener('change', () => {
    state.compareVolume = refs.compareVolume.value;
    load();
  });
  refs.compareClear.addEventListener('click', () => {
    state.compare = ''; state.compareFlavor = ''; state.compareVolume = '';
    populateCompareOptions(); load();
  });
  refs.compareRetry.addEventListener('click', async () => {
    setStatus('Updating…', 'loading');
    compareMessage('Retrying…');
    if (!state.catalog) await loadCatalog();
    await load();
  });
  refs.export.addEventListener('click', exportCsv);
  refs.theme.addEventListener('click', () => {
    const next = document.documentElement.dataset.adminTheme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.adminTheme = next;
    document.documentElement.dataset.adminThemeMode = next;
    try { window.localStorage.setItem('jg-admin-theme', next); } catch (_error) { /* no-op */ }
    document.cookie = `jg-admin-theme=${next};path=/;max-age=31536000;SameSite=Lax`;
    window.requestAnimationFrame(drawChart);
  });
  refs.back.addEventListener('click', (event) => {
    if (window.history.length <= 1 || !document.referrer.startsWith(window.location.origin)) return;
    event.preventDefault(); window.history.back();
  });
  refs.canvas.addEventListener('mousemove', (event) => {
    const bounds = refs.canvas.getBoundingClientRect();
    const mouseX = event.clientX - bounds.left;
    const mouseY = event.clientY - bounds.top;
    const distance = (point) => Math.hypot(point.x - mouseX, point.y - mouseY);
    const nearest = state.chartPoints.reduce((best, point) => !best || distance(point) < distance(best) ? point : best, null);
    if (!nearest || distance(nearest) > 32) { refs.tooltip.hidden = true; return; }
    const points = state.comparison ? state.chartPoints.filter((point) => point.row.key === nearest.row.key) : [nearest];
    refs.tooltip.innerHTML = `<strong>${escapeHtml(nearest.row.label || dateLabel(nearest.row.start_date))}</strong>${points.map((point) => `<span>${state.comparison ? `${escapeHtml(point.title)} · ` : ''}${escapeHtml(metricValue(point.row[state.metric]))}${state.comparison ? '' : ` · ${point.row.predicted ? 'Projected month-end' : 'Actual to date'}`}</span>`).join('')}`;
    refs.tooltip.hidden = false;
    const left = Math.max(8, Math.min(bounds.width - refs.tooltip.offsetWidth - 8, nearest.x + 12));
    const top = Math.max(8, nearest.y - refs.tooltip.offsetHeight - 12);
    refs.tooltip.style.left = `${left}px`; refs.tooltip.style.top = `${top}px`;
  });
  refs.canvas.addEventListener('mouseleave', () => { refs.tooltip.hidden = true; });
  let resizeFrame = 0;
  window.addEventListener('resize', () => { window.cancelAnimationFrame(resizeFrame); resizeFrame = window.requestAnimationFrame(drawChart); });

  activeButton(refs.scopeButtons, 'scope', state.scope);
  activeButton(refs.metricButtons, 'metric', state.metric);
  refs.dateForm.hidden = state.scope !== 'custom';
  if (state.compare) loadCatalog().then(load);
  else { loadCatalog(); load(); }
})();
