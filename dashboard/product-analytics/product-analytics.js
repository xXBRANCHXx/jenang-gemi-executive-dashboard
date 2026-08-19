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
    history: root.querySelector('[data-history-body]')
  };

  const jakartaDate = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  const today = jakartaDate();
  const year = today.slice(0, 4);
  const state = {
    product: root.dataset.product || 'syrup',
    dimension: root.dataset.dimension || 'product',
    flavor: root.dataset.flavor || '',
    volume: root.dataset.volume || '',
    scope: 'all',
    metric: 'quantity',
    startDate: `${year}-01-01`,
    endDate: today,
    data: null,
    requestId: 0,
    chartPoints: []
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
    const params = new URLSearchParams({ product: state.product, dimension });
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

  const renderKpis = () => {
    const totals = state.data.totals || {};
    const [latest, previous] = lastPair();
    const quantityChange = latest && previous && Number(previous.quantity) > 0
      ? ((Number(latest.quantity) - Number(previous.quantity)) / Number(previous.quantity)) * 100 : null;
    const revenueChange = latest && previous && Number(previous.revenue) > 0
      ? ((Number(latest.revenue) - Number(previous.revenue)) / Number(previous.revenue)) * 100 : null;
    const changeNote = (value, label) => value === null
      ? `<small>No earlier month to compare</small>`
      : `<small class="${value > 0 ? 'is-up' : value < 0 ? 'is-down' : ''}">${value > 0 ? '↑' : value < 0 ? '↓' : '→'} ${escapeHtml(percent(value))} ${escapeHtml(label)}</small>`;
    const bestPlatform = state.data.breakdowns?.platforms?.[0];
    const bestPartner = state.data.breakdowns?.partners?.[0];
    refs.kpis.innerHTML = `
      <article class="product-analytics-kpi"><span>Total units</span><strong>${escapeHtml(integer(totals.quantity))}</strong>${changeNote(quantityChange, 'latest month')}</article>
      <article class="product-analytics-kpi"><span>Seller revenue</span><strong>${escapeHtml(compact(totals.revenue, 'revenue'))}</strong>${changeNote(revenueChange, 'latest month')}</article>
      <article class="product-analytics-kpi"><span>Revenue / unit</span><strong>${escapeHtml(currency(Number(totals.quantity) > 0 ? Number(totals.revenue) / Number(totals.quantity) : 0))}</strong><small>Average across the selected history</small></article>
      <article class="product-analytics-kpi"><span>${bestPartner ? 'Top partner' : 'Top platform'}</span><strong title="${escapeHtml((bestPartner || bestPlatform)?.label || 'No sales')}">${escapeHtml((bestPartner || bestPlatform)?.label || '—')}</strong><small>${bestPartner || bestPlatform ? `${escapeHtml(percent(((bestPartner || bestPlatform)?.quantity_share || 0) * 100))} of units sold` : 'No channel data in this period'}</small></article>
    `;
  };

  const rankPalette = ['#5da9ff', '#b48cff', '#31d47b', '#ffad55', '#ff6470', '#53d5c5', '#e57ddd', '#9bc75b'];
  const renderRanking = (target, rows, type) => {
    if (!rows?.length) {
      target.innerHTML = `<div class="product-analytics-ranking-empty">${type === 'partner' ? 'No partner sales match this selection yet.' : 'No breakdown data is available.'}</div>`;
      return;
    }
    const maximum = Math.max(1, ...rows.map((row) => Number(row[state.metric] || 0)));
    target.innerHTML = rows.slice(0, 12).map((row, index) => {
      const value = Number(row[state.metric] || 0);
      const share = Number(row[`${state.metric}_share`] || 0) * 100;
      const href = type === 'flavor' ? selectedUrl('flavor', row.key) : type === 'volume' ? selectedUrl('volume', '', row.key) : '';
      const label = href
        ? `<a href="${escapeHtml(href)}" title="Open ${escapeHtml(row.label)} analytics">${escapeHtml(row.label)}</a>`
        : `<strong title="${escapeHtml(row.label)}">${escapeHtml(row.label)}</strong>`;
      return `<div class="product-analytics-rank-row">
        <div class="product-analytics-rank-label">${label}<small>${escapeHtml(percent(share))} share</small></div>
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
    const actual = state.data.history || [];
    const combined = actual.map((row) => ({ ...row, predicted: false }));
    let prior = actual.at(-1) || null;
    (state.data.forecast || []).forEach((row) => {
      const quantityPrevious = Number(prior?.quantity || 0);
      const revenuePrevious = Number(prior?.revenue || 0);
      combined.push({
        ...row,
        quantity_change: Number(row.quantity || 0) - quantityPrevious,
        quantity_change_percent: quantityPrevious > 0 ? ((Number(row.quantity || 0) - quantityPrevious) / quantityPrevious) * 100 : null,
        revenue_change: Number(row.revenue || 0) - revenuePrevious,
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
      <td><span class="product-analytics-status-pill ${row.predicted ? 'is-predicted' : ''}">${row.predicted ? 'Predicted' : 'Actual'}</span></td>
    </tr>`).join('');
  };

  const chartRows = () => [
    ...(state.data?.history || []).map((row) => ({ ...row, predicted: false })),
    ...(state.data?.forecast || []).map((row) => ({ ...row, predicted: true }))
  ];

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
    const padding = { top: 24, right: 23, bottom: 42, left: width < 600 ? 44 : 62 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const rows = chartRows();
    const values = rows.map((row) => Number(row[state.metric] || 0));
    const maximum = Math.max(1, ...values) * 1.12;
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
      context.textAlign = 'right'; context.fillText(compact(tickValue), padding.left - 10, tickY);
    }
    const labelEvery = Math.max(1, Math.ceil(rows.length / (width < 600 ? 5 : 9)));
    rows.forEach((row, index) => {
      if (index % labelEvery !== 0 && index !== rows.length - 1) return;
      context.textAlign = index === 0 ? 'left' : index === rows.length - 1 ? 'right' : 'center';
      context.fillText(dateLabel(row.start_date), x(index), height - 17);
    });

    const actualCount = state.data.history?.length || 0;
    if (actualCount > 1) {
      const gradient = context.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, `${css('--pa-actual')}35`);
      gradient.addColorStop(1, `${css('--pa-actual')}00`);
      context.beginPath(); context.moveTo(x(0), height - padding.bottom);
      for (let index = 0; index < actualCount; index++) context.lineTo(x(index), y(values[index]));
      context.lineTo(x(actualCount - 1), height - padding.bottom); context.closePath(); context.fillStyle = gradient; context.fill();
    }
    const drawLine = (start, end, color, dashed = false) => {
      if (end <= start) return;
      context.beginPath();
      for (let index = start; index <= end; index++) {
        const method = index === start ? 'moveTo' : 'lineTo';
        context[method](x(index), y(values[index]));
      }
      context.strokeStyle = color; context.lineWidth = 2.25; context.lineJoin = 'round'; context.lineCap = 'round';
      context.setLineDash(dashed ? [6, 6] : []); context.stroke(); context.setLineDash([]);
    };
    drawLine(0, Math.max(0, actualCount - 1), css('--pa-actual'));
    if (rows.length > actualCount && actualCount > 0) drawLine(actualCount - 1, rows.length - 1, css('--pa-forecast'), true);
    state.chartPoints = rows.map((row, index) => ({ row, x: x(index), y: y(values[index]) }));
    state.chartPoints.forEach((point) => {
      context.beginPath(); context.arc(point.x, point.y, point.row.predicted ? 3 : 2.5, 0, Math.PI * 2);
      context.fillStyle = point.row.predicted ? css('--pa-forecast') : css('--pa-actual'); context.fill();
    });
  };

  const render = () => {
    const data = state.data;
    const selection = data.selection || {};
    refs.title.textContent = selection.title || `${selection.product_label || state.product} analytics`;
    document.title = `${refs.title.textContent} sales analytics`;
    refs.dimensionLabel.textContent = ({ product: 'Product overview', flavor: 'Flavor analytics', volume: 'Volume analytics', sku: 'Product analytics' }[selection.dimension] || 'Sales intelligence');
    refs.subtitle.textContent = selectionDescription(selection);
    refs.forecastMethod.textContent = `Forecast note: ${data.forecast_method || 'Directional estimate based on recent history.'}`;
    const hasSales = Number(data.totals?.quantity || 0) > 0 || Number(data.totals?.revenue || 0) > 0;
    refs.content.hidden = !hasSales;
    refs.empty.hidden = hasSales;
    if (!hasSales) return;
    renderKpis();
    renderRanking(refs.flavors, data.breakdowns?.flavors, 'flavor');
    renderRanking(refs.volumes, data.breakdowns?.volumes, 'volume');
    renderRanking(refs.platforms, data.breakdowns?.platforms, 'platform');
    renderRanking(refs.partners, data.breakdowns?.partners, 'partner');
    renderHistory();
    window.requestAnimationFrame(drawChart);
  };

  const load = async () => {
    const requestId = ++state.requestId;
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
      const url = new URL(root.dataset.endpoint, window.location.href);
      url.searchParams.set('action', 'product_analytics');
      url.searchParams.set('product', state.product);
      url.searchParams.set('dimension', state.dimension);
      url.searchParams.set('grain', 'month');
      url.searchParams.set('start_date', state.startDate);
      url.searchParams.set('end_date', state.endDate);
      if (state.flavor) url.searchParams.set('flavor', state.flavor);
      if (state.volume) url.searchParams.set('volume', state.volume);
      const response = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'The product analytics could not be loaded.');
      if (requestId !== state.requestId) return;
      state.data = payload;
      refs.startDate.value = state.startDate;
      refs.endDate.value = state.endDate;
      render();
      setStatus(`Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    } catch (error) {
      if (requestId !== state.requestId) return;
      refs.empty.hidden = false;
      refs.empty.querySelector('strong').textContent = 'Could not load product analytics';
      refs.empty.querySelector('p').textContent = error?.message || 'Please try again.';
      setStatus('Unavailable', 'error');
    }
  };

  const exportCsv = () => {
    if (!state.data) return;
    const rows = [['Month', 'Units', 'Unit change', 'Revenue', 'Revenue change', 'Status']];
    (state.data.history || []).forEach((row) => rows.push([row.label, row.quantity, row.quantity_change ?? '', row.revenue, row.revenue_change ?? '', 'Actual']));
    (state.data.forecast || []).forEach((row) => rows.push([row.label, row.quantity, '', row.revenue, '', 'Predicted']));
    const encode = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const blob = new Blob([rows.map((row) => row.map(encode).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${state.product}-${state.dimension}-analytics-${state.startDate}-to-${state.endDate}.csv`;
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
    if (state.scope === 'year') { state.startDate = `${year}-01-01`; state.endDate = today; }
    await load();
  }));
  refs.metricButtons.forEach((button) => button.addEventListener('click', () => {
    state.metric = button.dataset.metric || 'quantity';
    activeButton(refs.metricButtons, 'metric', state.metric);
    if (state.data) render();
  }));
  refs.dateForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!refs.startDate.value || !refs.endDate.value || refs.startDate.value > refs.endDate.value) {
      refs.startDate.setCustomValidity(refs.startDate.value > refs.endDate.value ? 'Start date must be before end date.' : 'Choose a start date.');
      refs.startDate.reportValidity(); return;
    }
    refs.startDate.setCustomValidity(''); state.startDate = refs.startDate.value; state.endDate = refs.endDate.value; await load();
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
    const nearest = state.chartPoints.reduce((best, point) => !best || Math.abs(point.x - mouseX) < Math.abs(best.x - mouseX) ? point : best, null);
    if (!nearest || Math.abs(nearest.x - mouseX) > 28) { refs.tooltip.hidden = true; return; }
    refs.tooltip.innerHTML = `<strong>${escapeHtml(nearest.row.label || dateLabel(nearest.row.start_date))}</strong><span>${escapeHtml(metricValue(nearest.row[state.metric]))} · ${nearest.row.predicted ? 'Predicted' : 'Actual'}</span>`;
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
  load();
})();
