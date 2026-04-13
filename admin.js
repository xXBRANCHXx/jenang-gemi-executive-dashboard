const SOURCE_COLORS = {
  youtube: '#ff5252',
  facebook: '#ffd400',
  instagram: '#9dff00',
  tiktok: '#22d3ee',
  google: '#22d3ee',
  direct: '#9dff00',
  internal: '#ffd400',
  unknown: '#7a879a'
};

const SOURCE_LABELS = {
  youtube: 'YouTube',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  google: 'Google',
  direct: 'Direct',
  internal: 'Internal',
  unknown: 'Unknown'
};

const HOME_METRIC_LABELS = {
  views: 'Views over time',
  order_now_clicks: 'Order Now clicks over time',
  checkout_clicks: 'Checkout clicks over time'
};

const HOME_METRIC_UNITS = {
  views: 'views',
  order_now_clicks: 'clicks',
  checkout_clicks: 'checkouts'
};

const WEBSITE_METRIC_LABELS = {
  visitors: 'Website visitors over time',
  page_views: 'Website page views over time'
};

const WEBSITE_METRIC_UNITS = {
  visitors: 'visitors',
  page_views: 'page views'
};

const DASHBOARD_TIMEZONE = 'Asia/Jakarta';

const formatSeconds = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  return `${minutes}m ${remaining}s`;
};

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const toTitleCase = (value) => {
  const normalized = String(value || '').toLowerCase();
  return SOURCE_LABELS[normalized] || normalized.replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDashboardTime = (value, timezone, options = {}) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString('id-ID', {
    timeZone: timezone,
    ...options
  });
};

const formatMetricValue = (metric, value, unitsMap) => `${Number(value).toLocaleString('id-ID')} ${unitsMap[metric] || 'units'}`;

const formatPageLabel = (pagePath = '') => {
  const cleaned = String(pagePath).replace(/^\//, '').replace(/\.html$/i, '');
  return cleaned || '/';
};

const prepareCanvas = (canvas) => {
  if (!(canvas instanceof HTMLCanvasElement)) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || canvas.width;
  const height = canvas.clientHeight || canvas.height;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { ctx, width, height };
};

const getThemePalette = () => {
  const styles = window.getComputedStyle(document.documentElement);
  return {
    text: styles.getPropertyValue('--admin-text').trim() || '#0c1117',
    muted: styles.getPropertyValue('--admin-muted').trim() || 'rgba(55, 65, 81, 0.68)',
    border: styles.getPropertyValue('--admin-border').trim() || 'rgba(17, 24, 39, 0.08)',
    surface: styles.getPropertyValue('--admin-surface').trim() || '#ffffff',
    surfaceSoft: styles.getPropertyValue('--admin-surface-soft').trim() || '#f6f8f4'
  };
};

const drawValueBadge = (ctx, x, y, text, palette) => {
  ctx.font = '700 12px "Space Grotesk", sans-serif';
  const metrics = ctx.measureText(text);
  const badgeWidth = Math.ceil(metrics.width) + 14;
  const badgeHeight = 22;
  const badgeX = x - (badgeWidth / 2);
  const badgeY = y - 24;

  ctx.fillStyle = palette.surface;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 999);
  ctx.fill();

  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 999);
  ctx.stroke();

  ctx.fillStyle = palette.text;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, badgeY + 15);
};

const drawGrid = (ctx, width, height, padding, maxValue, metric, unitsMap, palette) => {
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const y = padding.top + ((height - padding.top - padding.bottom) / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    const tickValue = Math.round(maxValue - ((maxValue / 3) * i));
    ctx.fillStyle = palette.muted;
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(formatMetricValue(metric, Math.max(0, tickValue), unitsMap), 8, y - (i === 0 ? -12 : 4));
  }
};

const drawBarChart = (canvas, items, config) => {
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { ctx, width, height } = prepared;
  const chartItems = items.slice(0, config.limit || items.length);
  const maxValue = Math.max(...chartItems.map((item) => Number(config.value(item) || 0)), 1);
  const padding = { top: 20, right: 20, bottom: 48, left: 92 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const itemCount = Math.max(chartItems.length, 1);
  const barWidth = (chartWidth / itemCount) * 0.58;
  const gap = (chartWidth / itemCount) * 0.42;
  const palette = getThemePalette();

  drawGrid(ctx, width, height, padding, maxValue, config.metric, config.unitsMap, palette);

  chartItems.forEach((item, index) => {
    const value = Number(config.value(item) || 0);
    const barHeight = (value / maxValue) * (chartHeight - 10);
    const x = padding.left + index * (barWidth + gap) + gap / 2;
    const y = padding.top + chartHeight - barHeight;

    ctx.fillStyle = palette.surfaceSoft;
    ctx.beginPath();
    ctx.roundRect(x, padding.top + 8, barWidth, chartHeight - 8, 10);
    ctx.fill();

    ctx.fillStyle = config.color(item);
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 10);
    ctx.fill();

    drawValueBadge(ctx, x + (barWidth / 2), y, String(value), palette);

    ctx.fillStyle = palette.muted;
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config.label(item), x + (barWidth / 2), height - 16);
  });
};

const drawLineChart = (canvas, items, metric, unitsMap) => {
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { ctx, width, height } = prepared;
  const padding = { top: 20, right: 18, bottom: 48, left: 92 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const values = items.map((item) => Number(item[metric] || 0));
  const maxValue = Math.max(...values, 1);
  const palette = getThemePalette();

  drawGrid(ctx, width, height, padding, maxValue, metric, unitsMap, palette);

  if (!items.length) return;

  ctx.strokeStyle = SOURCE_COLORS.instagram;
  ctx.lineWidth = 3;
  ctx.beginPath();

  items.forEach((item, index) => {
    const x = padding.left + (chartWidth * index / Math.max(items.length - 1, 1));
    const y = padding.top + chartHeight - ((Number(item[metric] || 0) / maxValue) * (chartHeight - 6));
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  items.forEach((item, index) => {
    const x = padding.left + (chartWidth * index / Math.max(items.length - 1, 1));
    const y = padding.top + chartHeight - ((Number(item[metric] || 0) / maxValue) * (chartHeight - 6));
    ctx.fillStyle = SOURCE_COLORS.instagram;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    if (index === 0 || index === items.length - 1 || items.length <= 8 || index % Math.ceil(items.length / 6) === 0) {
      ctx.fillStyle = palette.muted;
      ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.label || '', x, height - 16);
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-admin-dashboard]');
  if (!root) return;

  const themeStorageKey = 'jg-admin-theme';
  const viewStorageKey = 'jg-dashboard-view';

  const state = {
    activeView: window.localStorage.getItem(viewStorageKey) || 'home',
    timezone: DASHBOARD_TIMEZONE,
    requestSequence: 0,
    home: {
      timeframe: '24h',
      metric: 'views',
      data: null,
      requestToken: 0
    },
    website: {
      timeframe: '7d',
      metric: 'visitors',
      data: null,
      exclusions: [],
      requestToken: 0,
      settingsRequestToken: 0
    },
    liveSequence: -1,
    liveSource: null
  };

  const endpoint = root.dataset.analyticsEndpoint || './analytics.php';
  const liveEndpoint = root.dataset.liveEndpoint || './live/';
  const settingsEndpoint = root.dataset.settingsEndpoint || './settings/';

  const loader = document.querySelector('[data-admin-loader]');
  const loaderProgress = document.querySelector('[data-admin-loader-progress]');
  const loaderLabel = document.querySelector('[data-admin-loader-label]');
  const menuShell = document.querySelector('[data-menu-shell]');
  const menuTrigger = document.querySelector('[data-menu-trigger]');
  const menuPanel = document.querySelector('[data-menu-panel]');
  const viewLabel = document.querySelector('[data-active-view-label]');
  const viewPanels = document.querySelectorAll('[data-view-panel]');

  const homeRefs = {
    summaryViews: document.querySelector('[data-home-summary-total-views]'),
    summaryOrder: document.querySelector('[data-home-summary-order-clicks]'),
    summaryCheckout: document.querySelector('[data-home-summary-checkout-clicks]'),
    summaryTime: document.querySelector('[data-home-summary-time-spent]'),
    urlTableBody: document.querySelector('[data-home-url-table-body]'),
    sourceTableBody: document.querySelector('[data-home-source-table-body]'),
    recentEvents: document.querySelector('[data-home-recent-events]'),
    endpointLabel: document.querySelector('[data-home-endpoint-label]'),
    sourceCanvas: document.querySelector('[data-home-source-chart]'),
    urlCanvas: document.querySelector('[data-home-url-chart]'),
    trendCanvas: document.querySelector('[data-home-trend-chart]'),
    hourCanvas: document.querySelector('[data-home-hour-chart]'),
    sourceLegend: document.querySelector('[data-home-source-legend]'),
    lastUpdated: document.querySelector('[data-home-last-updated]'),
    trendTitle: document.querySelector('[data-home-trend-title]'),
    trendMeta: document.querySelector('[data-home-trend-meta]'),
    timeframeButtons: document.querySelectorAll('[data-home-timeframe]'),
    metricButtons: document.querySelectorAll('[data-home-metric]')
  };

  const websiteRefs = {
    summaryVisitors: document.querySelector('[data-website-summary-total-visitors]'),
    summaryPageViews: document.querySelector('[data-website-summary-page-views]'),
    summaryTime: document.querySelector('[data-website-summary-time-spent]'),
    summaryTopRegion: document.querySelector('[data-website-summary-top-region]'),
    excludedCount: document.querySelector('[data-website-excluded-ip-count]'),
    pageTableBody: document.querySelector('[data-website-page-table-body]'),
    regionTableBody: document.querySelector('[data-website-region-table-body]'),
    recentEvents: document.querySelector('[data-website-recent-events]'),
    settingsEndpointLabel: document.querySelector('[data-website-settings-endpoint]'),
    trendCanvas: document.querySelector('[data-website-trend-chart]'),
    regionCanvas: document.querySelector('[data-website-region-chart]'),
    pageCanvas: document.querySelector('[data-website-page-chart]'),
    lastUpdated: document.querySelector('[data-website-last-updated]'),
    trendTitle: document.querySelector('[data-website-trend-title]'),
    trendMeta: document.querySelector('[data-website-trend-meta]'),
    timeframeButtons: document.querySelectorAll('[data-website-timeframe]'),
    metricButtons: document.querySelectorAll('[data-website-metric]'),
    exclusionForm: document.querySelector('[data-ip-exclusion-form]'),
    exclusionError: document.querySelector('[data-ip-exclusion-error]'),
    exclusionList: document.querySelector('[data-ip-exclusion-list]')
  };

  const setLoaderState = (progress, label) => {
    if (loaderProgress) loaderProgress.style.width = `${Math.max(8, Math.min(progress, 100))}%`;
    if (loaderLabel && label) loaderLabel.textContent = label;
  };

  const setupTopbarMenu = () => {
    menuTrigger?.addEventListener('click', () => {
      if (menuPanel?.hidden === false) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuShell && !menuShell.contains(target)) closeMenu();
    });

    document.querySelectorAll('[data-dashboard-view-link]').forEach((link) => {
      link.addEventListener('click', () => {
        const view = link.getAttribute('data-dashboard-view-link') || 'home';
        window.localStorage.setItem(viewStorageKey, view);
      });
    });
  };

  const finishLoader = () => {
    setLoaderState(100, 'Dashboard ready');
    window.requestAnimationFrame(() => {
      document.body.classList.remove('is-loading');
      document.body.classList.add('is-ready');
      if (loader) window.setTimeout(() => loader.remove(), 500);
    });
  };

  const applyTheme = (theme) => {
    document.documentElement.dataset.adminTheme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
    renderCachedCharts();
  };

  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', ...(options.headers || {}) },
      credentials: 'same-origin',
      cache: 'no-store',
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }
    return payload;
  };

  const renderRows = (items, emptyColspan, formatter, emptyMessage = 'Belum ada data.') => {
    if (!items.length) {
      return `<tr><td colspan="${emptyColspan}" class="admin-empty">${escapeHtml(emptyMessage)}</td></tr>`;
    }
    return items.map(formatter).join('');
  };

  const renderEventFeed = (container, items, formatter, emptyMessage) => {
    if (!container) return;
    if (!items.length) {
      container.innerHTML = `<p class="admin-empty">${escapeHtml(emptyMessage)}</p>`;
      return;
    }
    container.innerHTML = items.map(formatter).join('');
  };

  const renderSourceLegend = (items) => {
    if (!homeRefs.sourceLegend) return;
    homeRefs.sourceLegend.innerHTML = items.map((item) => {
      const source = String(item.source || 'unknown').toLowerCase();
      const color = SOURCE_COLORS[source] || SOURCE_COLORS.unknown;
      return `
        <div class="admin-legend-item">
          <span class="admin-legend-swatch" style="background:${color};"></span>
          <strong>${escapeHtml(toTitleCase(item.source || 'unknown'))}</strong>
          <span>${Number(item.views || 0).toLocaleString('id-ID')} views</span>
        </div>
      `;
    }).join('');
  };

  const setLastUpdated = (target, isoString) => {
    if (!target) return;
    const date = isoString ? new Date(isoString) : new Date();
    target.textContent = `Updated ${formatDashboardTime(date, state.timezone, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })} WIB`;
  };

  const syncViewState = () => {
    const labels = {
      home: 'Home Dashboard',
      website: 'Official Website Dashboard',
      settings: 'Settings'
    };
    viewPanels.forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.viewPanel === state.activeView);
    });
    if (viewLabel) {
      viewLabel.textContent = labels[state.activeView] || 'Dashboard';
    }
    window.localStorage.setItem(viewStorageKey, state.activeView);
  };

  const closeMenu = () => {
    if (!menuPanel || !menuTrigger) return;
    menuPanel.hidden = true;
    menuTrigger.setAttribute('aria-expanded', 'false');
  };

  const openMenu = () => {
    if (!menuPanel || !menuTrigger) return;
    menuPanel.hidden = false;
    menuTrigger.setAttribute('aria-expanded', 'true');
  };

  const buildAnalyticsUrl = (dataset, timeframe) => {
    const params = new URLSearchParams({
      timeframe,
      timezone: state.timezone,
      recent_limit: '120',
      dataset,
      _ts: String(Date.now())
    });
    return `${endpoint}?${params.toString()}`;
  };

  const buildSettingsUrl = (action) => `${settingsEndpoint}?action=${encodeURIComponent(action)}&_ts=${encodeURIComponent(String(Date.now()))}`;

  const beginRequest = (key, settings = false) => {
    state.requestSequence += 1;
    const token = state.requestSequence;
    if (settings) {
      state[key].settingsRequestToken = token;
    } else {
      state[key].requestToken = token;
    }
    return token;
  };

  const isLatestRequest = (key, token, settings = false) => (
    settings
      ? state[key].settingsRequestToken === token
      : state[key].requestToken === token
  );

  const renderHome = (data) => {
    state.home.data = data;
    const summary = data.summary || {};
    const bySource = Array.isArray(data.by_source) ? data.by_source : [];
    const byUrl = Array.isArray(data.by_url) ? data.by_url : [];
    const timeseries = Array.isArray(data.timeseries) ? data.timeseries : [];
    const hourOfDay = Array.isArray(data.hour_of_day) ? data.hour_of_day : [];

    if (homeRefs.summaryViews) homeRefs.summaryViews.textContent = Number(summary.total_views || 0).toLocaleString('id-ID');
    if (homeRefs.summaryOrder) homeRefs.summaryOrder.textContent = Number(summary.order_now_clicks || 0).toLocaleString('id-ID');
    if (homeRefs.summaryCheckout) homeRefs.summaryCheckout.textContent = Number(summary.checkout_clicks || 0).toLocaleString('id-ID');
    if (homeRefs.summaryTime) homeRefs.summaryTime.textContent = formatSeconds(Number(summary.avg_time_spent_seconds || 0));
    if (homeRefs.endpointLabel) homeRefs.endpointLabel.textContent = endpoint;

    if (homeRefs.urlTableBody) {
      homeRefs.urlTableBody.innerHTML = renderRows(byUrl, 6, (item) => `
        <tr>
          <td><strong>${escapeHtml(item.page_path || '-')}</strong></td>
          <td>${escapeHtml(toTitleCase(item.source || 'unknown'))}</td>
          <td>${Number(item.views || 0).toLocaleString('id-ID')}</td>
          <td>${Number(item.order_now_clicks || 0).toLocaleString('id-ID')}</td>
          <td>${Number(item.checkout_clicks || 0).toLocaleString('id-ID')}</td>
          <td>${formatSeconds(Number(item.avg_time_spent_seconds || 0))}</td>
        </tr>
      `);
    }

    if (homeRefs.sourceTableBody) {
      homeRefs.sourceTableBody.innerHTML = renderRows(bySource, 5, (item) => `
        <tr>
          <td><strong>${escapeHtml(toTitleCase(item.source || 'unknown'))}</strong></td>
          <td>${Number(item.views || 0).toLocaleString('id-ID')}</td>
          <td>${Number(item.order_now_clicks || 0).toLocaleString('id-ID')}</td>
          <td>${Number(item.checkout_clicks || 0).toLocaleString('id-ID')}</td>
          <td>${formatSeconds(Number(item.avg_time_spent_seconds || 0))}</td>
        </tr>
      `);
    }

    renderEventFeed(homeRefs.recentEvents, Array.isArray(data.recent_events) ? data.recent_events : [], (item) => `
      <div class="admin-event-item">
        <strong>${escapeHtml(item.event_type || 'event')} • ${escapeHtml(toTitleCase(item.source || 'unknown'))}</strong>
        <span>${escapeHtml(item.page_path || '-')}</span>
        <small>${escapeHtml(item.occurred_at || '')}</small>
      </div>
    `, 'Belum ada aktivitas.');

    drawLineChart(homeRefs.trendCanvas, timeseries, state.home.metric, HOME_METRIC_UNITS);
    drawBarChart(homeRefs.hourCanvas, hourOfDay, {
      value: (item) => item[state.home.metric] || 0,
      label: (item) => `${String(item.hour).padStart(2, '0')}:00`,
      color: () => SOURCE_COLORS.facebook,
      metric: state.home.metric,
      unitsMap: HOME_METRIC_UNITS,
      limit: 24
    });
    drawBarChart(homeRefs.sourceCanvas, bySource, {
      value: (item) => item.views || 0,
      label: (item) => String(toTitleCase(item.source || 'unknown')),
      color: (item) => SOURCE_COLORS[String(item.source || 'unknown').toLowerCase()] || SOURCE_COLORS.unknown,
      metric: 'views',
      unitsMap: HOME_METRIC_UNITS,
      limit: 6
    });
    drawBarChart(homeRefs.urlCanvas, byUrl, {
      value: (item) => item.checkout_clicks || 0,
      label: (item) => formatPageLabel(item.page_path || '-'),
      color: (item) => SOURCE_COLORS[String(item.source || 'unknown').toLowerCase()] || SOURCE_COLORS.unknown,
      metric: 'checkout_clicks',
      unitsMap: HOME_METRIC_UNITS,
      limit: 6
    });
    renderSourceLegend(bySource);
    setLastUpdated(homeRefs.lastUpdated, data.meta?.generated_at);
    if (homeRefs.trendTitle) homeRefs.trendTitle.textContent = HOME_METRIC_LABELS[state.home.metric];
    if (homeRefs.trendMeta) homeRefs.trendMeta.textContent = `Timeframe: ${state.home.timeframe.toUpperCase()} • Scope: Landing pages • Timezone: WIB`;
    homeRefs.timeframeButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.homeTimeframe === state.home.timeframe);
    });
    homeRefs.metricButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.homeMetric === state.home.metric);
    });
  };

  const renderWebsite = (data) => {
    state.website.data = data;
    state.website.exclusions = Array.isArray(data.excluded_ips) ? data.excluded_ips : state.website.exclusions;
    const summary = data.summary || {};
    const pages = Array.isArray(data.by_page) ? data.by_page : [];
    const regions = Array.isArray(data.by_region) ? data.by_region : [];
    const timeseries = Array.isArray(data.timeseries) ? data.timeseries : [];

    if (websiteRefs.summaryVisitors) websiteRefs.summaryVisitors.textContent = Number(summary.total_visitors || 0).toLocaleString('id-ID');
    if (websiteRefs.summaryPageViews) websiteRefs.summaryPageViews.textContent = Number(summary.total_page_views || 0).toLocaleString('id-ID');
    if (websiteRefs.summaryTime) websiteRefs.summaryTime.textContent = formatSeconds(Number(summary.avg_time_spent_seconds || 0));
    if (websiteRefs.summaryTopRegion) websiteRefs.summaryTopRegion.textContent = summary.top_region || 'Unknown';
    if (websiteRefs.excludedCount) websiteRefs.excludedCount.textContent = Number(summary.excluded_ip_count || state.website.exclusions.length || 0).toLocaleString('id-ID');
    if (websiteRefs.settingsEndpointLabel) websiteRefs.settingsEndpointLabel.textContent = settingsEndpoint;

    if (websiteRefs.pageTableBody) {
      websiteRefs.pageTableBody.innerHTML = renderRows(pages, 4, (item) => `
        <tr>
          <td><strong>${escapeHtml(item.page_path || '/')}</strong></td>
          <td>${Number(item.visitors || 0).toLocaleString('id-ID')}</td>
          <td>${Number(item.page_views || 0).toLocaleString('id-ID')}</td>
          <td>${formatSeconds(Number(item.avg_time_spent_seconds || 0))}</td>
        </tr>
      `, 'Belum ada data website.');
    }

    if (websiteRefs.regionTableBody) {
      websiteRefs.regionTableBody.innerHTML = renderRows(regions, 4, (item) => `
        <tr>
          <td><strong>${escapeHtml(item.region_label || 'Unknown')}</strong></td>
          <td>${escapeHtml(item.country_code || '-')}</td>
          <td>${Number(item.visitors || 0).toLocaleString('id-ID')}</td>
          <td>${Number(item.page_views || 0).toLocaleString('id-ID')}</td>
        </tr>
      `, 'Belum ada data region.');
    }

    renderEventFeed(websiteRefs.recentEvents, Array.isArray(data.recent_events) ? data.recent_events : [], (item) => `
      <div class="admin-event-item">
        <strong>${escapeHtml(item.page_path || '/')} • ${escapeHtml(item.region_label || 'Unknown')}</strong>
        <span>${escapeHtml(item.ip_address_masked || 'Unknown')}</span>
        <small>${escapeHtml(item.occurred_at || '')}</small>
      </div>
    `, 'Belum ada kunjungan website.');

    drawLineChart(websiteRefs.trendCanvas, timeseries, state.website.metric, WEBSITE_METRIC_UNITS);
    drawBarChart(websiteRefs.regionCanvas, regions, {
      value: (item) => item.visitors || 0,
      label: (item) => String(item.region_label || 'Unknown').slice(0, 14),
      color: () => SOURCE_COLORS.google,
      metric: 'visitors',
      unitsMap: WEBSITE_METRIC_UNITS,
      limit: 6
    });
    drawBarChart(websiteRefs.pageCanvas, pages, {
      value: (item) => item[state.website.metric] || 0,
      label: (item) => formatPageLabel(item.page_path || '/').slice(0, 14),
      color: () => SOURCE_COLORS.direct,
      metric: state.website.metric,
      unitsMap: WEBSITE_METRIC_UNITS,
      limit: 6
    });

    setLastUpdated(websiteRefs.lastUpdated, data.meta?.generated_at);
    if (websiteRefs.trendTitle) websiteRefs.trendTitle.textContent = WEBSITE_METRIC_LABELS[state.website.metric];
    if (websiteRefs.trendMeta) websiteRefs.trendMeta.textContent = `Timeframe: ${state.website.timeframe.toUpperCase()} • Scope: Official website • Timezone: WIB`;
    websiteRefs.timeframeButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.websiteTimeframe === state.website.timeframe);
    });
    websiteRefs.metricButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.websiteMetric === state.website.metric);
    });
    renderExclusionList();
  };

  const renderExclusionList = () => {
    if (!websiteRefs.exclusionList) return;
    const items = state.website.exclusions;
    if (!items.length) {
      websiteRefs.exclusionList.innerHTML = '<p class="admin-empty">Belum ada IP yang dikecualikan.</p>';
      return;
    }

    websiteRefs.exclusionList.innerHTML = items.map((item) => `
      <div class="admin-settings-chip">
        <strong>${escapeHtml(item.ip_address || '')}</strong>
        <span>${escapeHtml(item.label || 'No label')}</span>
        <button type="button" data-delete-exclusion="${escapeHtml(String(item.id || ''))}">Remove</button>
      </div>
    `).join('');
  };

  const loadHome = async () => {
    const requestToken = beginRequest('home');
    const data = await requestJson(buildAnalyticsUrl('landing', state.home.timeframe));
    if (!isLatestRequest('home', requestToken)) return;
    renderHome(data);
  };

  const loadWebsite = async () => {
    const requestToken = beginRequest('website');
    const data = await requestJson(buildAnalyticsUrl('website', state.website.timeframe));
    if (!isLatestRequest('website', requestToken)) return;
    renderWebsite(data);
  };

  const loadWebsiteSettings = async () => {
    const requestToken = beginRequest('website', true);
    const data = await requestJson(buildSettingsUrl('website_settings'));
    if (!isLatestRequest('website', requestToken, true)) return;
    state.website.exclusions = Array.isArray(data.excluded_ips) ? data.excluded_ips : [];
    renderExclusionList();
    if (websiteRefs.excludedCount) websiteRefs.excludedCount.textContent = Number(state.website.exclusions.length).toLocaleString('id-ID');
  };

  const loadActiveView = async () => {
    if (state.activeView === 'home') {
      await loadHome();
      return;
    }
    if (state.activeView === 'website') {
      await loadWebsite();
      return;
    }
    if (state.activeView === 'settings') {
      await loadWebsiteSettings();
    }
  };

  const renderCachedCharts = () => {
    if (state.home.data) renderHome(state.home.data);
    if (state.website.data) renderWebsite(state.website.data);
  };

  const switchView = async (nextView) => {
    state.activeView = nextView;
    syncViewState();
    closeMenu();
    await loadActiveView();
  };

  const closeLiveStream = () => {
    if (state.liveSource) {
      state.liveSource.close();
      state.liveSource = null;
    }
  };

  const connectLiveStream = () => {
    if (!window.EventSource || !liveEndpoint) return;
    closeLiveStream();
    const streamUrl = `${liveEndpoint}?last_sequence=${encodeURIComponent(String(state.liveSequence))}`;
    const source = new window.EventSource(streamUrl, { withCredentials: true });
    state.liveSource = source;

    source.addEventListener('change', async (event) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        const nextSequence = Number(payload.sequence || 0);
        if (!Number.isFinite(nextSequence) || nextSequence <= state.liveSequence) return;
        state.liveSequence = nextSequence;
        await loadActiveView();
      } catch (_) {
        // Keep the polling fallback simple.
      }
    });

    source.addEventListener('error', () => {
      closeLiveStream();
      window.setTimeout(() => {
        if (!document.hidden) connectLiveStream();
      }, 2000);
    });
  };

  applyTheme(window.localStorage.getItem(themeStorageKey) || 'dark');
  syncViewState();
  setLoaderState(20, 'Connecting to analytics');

  Promise.all([loadHome(), loadWebsiteSettings()])
    .then(() => {
      setLoaderState(70, 'Preparing interface');
      return state.activeView === 'website' ? loadWebsite() : Promise.resolve();
    })
    .then(() => {
      finishLoader();
      connectLiveStream();
    })
    .catch((error) => {
      document.body.classList.remove('is-loading');
      document.body.classList.add('is-ready');
      const target = state.activeView === 'website' ? websiteRefs.recentEvents : homeRefs.recentEvents;
      renderEventFeed(target, [], () => '', `Gagal memuat dashboard: ${error.message}`);
    });

  homeRefs.timeframeButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      state.home.timeframe = button.dataset.homeTimeframe || '24h';
      await loadHome();
    });
  });

  homeRefs.metricButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.home.metric = button.dataset.homeMetric || 'views';
      if (state.home.data) renderHome(state.home.data);
    });
  });

  websiteRefs.timeframeButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      state.website.timeframe = button.dataset.websiteTimeframe || '7d';
      await loadWebsite();
    });
  });

  websiteRefs.metricButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.website.metric = button.dataset.websiteMetric || 'visitors';
      if (state.website.data) renderWebsite(state.website.data);
    });
  });

  document.querySelectorAll('[data-view-switch]').forEach((button) => {
    button.addEventListener('click', async () => {
      await switchView(button.dataset.viewSwitch || 'home');
    });
  });

  setupTopbarMenu();

  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      applyTheme(document.documentElement.dataset.adminTheme === 'dark' ? 'light' : 'dark');
    });
  });

  websiteRefs.exclusionForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) return;

    const formData = new FormData(form);
    const payload = {
      ip_address: String(formData.get('ip_address') || '').trim(),
      label: String(formData.get('label') || '').trim()
    };

    if (websiteRefs.exclusionError) {
      websiteRefs.exclusionError.hidden = true;
      websiteRefs.exclusionError.textContent = '';
    }

    try {
      const data = await requestJson(buildSettingsUrl('website_exclusion_add'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      state.website.exclusions = Array.isArray(data.excluded_ips) ? data.excluded_ips : [];
      form.reset();
      renderExclusionList();
      if (websiteRefs.excludedCount) websiteRefs.excludedCount.textContent = Number(state.website.exclusions.length).toLocaleString('id-ID');
      if (state.website.data) {
        await loadWebsite();
      }
    } catch (error) {
      if (websiteRefs.exclusionError) {
        websiteRefs.exclusionError.hidden = false;
        websiteRefs.exclusionError.textContent = error.message;
      }
    }
  });

  websiteRefs.exclusionList?.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const id = target.dataset.deleteExclusion || '';
    if (!id) return;

    try {
      const data = await requestJson(buildSettingsUrl('website_exclusion_delete'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(id) })
      });
      state.website.exclusions = Array.isArray(data.excluded_ips) ? data.excluded_ips : [];
      renderExclusionList();
      if (websiteRefs.excludedCount) websiteRefs.excludedCount.textContent = Number(state.website.exclusions.length).toLocaleString('id-ID');
      if (state.website.data) {
        await loadWebsite();
      }
    } catch (error) {
      if (websiteRefs.exclusionError) {
        websiteRefs.exclusionError.hidden = false;
        websiteRefs.exclusionError.textContent = error.message;
      }
    }
  });

  window.setInterval(() => {
    loadActiveView().catch(() => {});
  }, 60000);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      closeLiveStream();
      return;
    }
    connectLiveStream();
    loadActiveView().catch(() => {});
  });

  window.addEventListener('resize', () => renderCachedCharts());
  window.addEventListener('beforeunload', closeLiveStream);
});
