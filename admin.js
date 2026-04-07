const SOURCE_COLORS = {
  youtube: '#ff5252',
  facebook: '#ffd400',
  instagram: '#9dff00',
  tiktok: '#22d3ee',
  unknown: '#7a879a'
};

const METRIC_LABELS = {
  views: 'Views over time',
  order_now_clicks: 'Order Now clicks over time',
  checkout_clicks: 'Checkout clicks over time'
};

const METRIC_UNITS = {
  views: 'visitors',
  order_now_clicks: 'clicks',
  checkout_clicks: 'checkouts'
};

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

const formatMetricValue = (metric, value) => `${Number(value).toLocaleString('id-ID')} ${METRIC_UNITS[metric] || 'units'}`;
const formatDashboardTime = (value, timezone, options = {}) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString('id-ID', {
    timeZone: timezone,
    ...options
  });
};

const getBrowserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Makassar';

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

const drawGrid = (ctx, width, height, padding, maxValue, metric, palette) => {
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
    ctx.fillText(formatMetricValue(metric, Math.max(0, tickValue)), 8, y - (i === 0 ? -12 : 4));
  }
};

const drawBarChart = (canvas, items, config) => {
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { ctx, width, height } = prepared;
  const chartItems = items.slice(0, config.limit || items.length);
  const maxValue = Math.max(...chartItems.map((item) => Number(config.value(item))), 1);
  const padding = { top: 20, right: 20, bottom: 48, left: 92 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = chartWidth / Math.max(chartItems.length, 1) * 0.58;
  const gap = chartWidth / Math.max(chartItems.length, 1) * 0.42;
  const palette = getThemePalette();

  drawGrid(ctx, width, height, padding, maxValue, config.metric || 'views', palette);

  chartItems.forEach((item, index) => {
    const value = Number(config.value(item));
    const barHeight = (value / maxValue) * (chartHeight - 10);
    const x = padding.left + index * (barWidth + gap) + gap / 2;
    const y = padding.top + chartHeight - barHeight;
    const color = config.color(item);

    ctx.fillStyle = palette.surfaceSoft;
    ctx.beginPath();
    ctx.roundRect(x, padding.top + 8, barWidth, chartHeight - 8, 10);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 10);
    ctx.fill();

    drawValueBadge(ctx, x + (barWidth / 2), y, String(value), palette);

    ctx.fillStyle = palette.muted;
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(config.label(item), x + (barWidth / 2), height - 16);
  });
};

const chartHoverState = new WeakMap();

const drawLineChart = (canvas, items, metric) => {
  const prepared = prepareCanvas(canvas);
  if (!prepared) return;
  const { ctx, width, height } = prepared;
  const padding = { top: 20, right: 18, bottom: 48, left: 92 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const values = items.map((item) => Number(item[metric] || 0));
  const maxValue = Math.max(...values, 1);
  const palette = getThemePalette();

  drawGrid(ctx, width, height, padding, maxValue, metric, palette);

  if (items.length === 0) {
    chartHoverState.set(canvas, []);
    return;
  }

  ctx.strokeStyle = SOURCE_COLORS.instagram;
  ctx.lineWidth = 3;
  ctx.beginPath();
  const points = [];

  items.forEach((item, index) => {
    const x = padding.left + (chartWidth * index / Math.max(items.length - 1, 1));
    const y = padding.top + chartHeight - ((Number(item[metric] || 0) / maxValue) * (chartHeight - 6));
    points.push({
      x,
      y,
      label: item.label || '',
      value: Number(item[metric] || 0),
      metric
    });
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

  chartHoverState.set(canvas, points);
};

document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-admin-dashboard]');
  if (!root) return;

  const state = {
    timeframe: '24h',
    metric: 'views',
    timezone: getBrowserTimezone(),
    refreshMs: 60000,
    refreshHandle: null
  };

  const endpoint = root.dataset.analyticsEndpoint || './analytics.php';
  const themeStorageKey = 'jg-admin-theme';
  const summaryViews = document.querySelector('[data-summary-total-views]');
  const summaryOrderClicks = document.querySelector('[data-summary-order-clicks]');
  const summaryCheckoutClicks = document.querySelector('[data-summary-checkout-clicks]');
  const summaryTimeSpent = document.querySelector('[data-summary-time-spent]');
  const urlTableBody = document.querySelector('[data-url-table-body]');
  const sourceTableBody = document.querySelector('[data-source-table-body]');
  const recentEvents = document.querySelector('[data-recent-events]');
  const endpointLabel = document.querySelector('[data-endpoint-label]');
  const sourceCanvas = document.querySelector('[data-source-chart]');
  const urlCanvas = document.querySelector('[data-url-chart]');
  const trendCanvas = document.querySelector('[data-trend-chart]');
  const hourCanvas = document.querySelector('[data-hour-chart]');
  const sourceLegend = document.querySelector('[data-source-legend]');
  const trendSurface = trendCanvas?.parentElement;
  const loader = document.querySelector('[data-admin-loader]');
  const loaderProgress = document.querySelector('[data-admin-loader-progress]');
  const loaderLabel = document.querySelector('[data-admin-loader-label]');
  const lastUpdated = document.querySelector('[data-last-updated]');
  const trendTitle = document.querySelector('[data-trend-title]');
  const trendMeta = document.querySelector('[data-trend-meta]');
  const timeframeButtons = document.querySelectorAll('[data-timeframe]');
  const metricButtons = document.querySelectorAll('[data-metric]');
  const tooltip = document.createElement('div');
  tooltip.className = 'admin-chart-tooltip';
  tooltip.innerHTML = '<strong></strong><span></span>';
  trendSurface?.appendChild(tooltip);

  if (endpointLabel) endpointLabel.textContent = endpoint;

  const setLoaderState = (progress, label) => {
    if (loaderProgress) loaderProgress.style.width = `${Math.max(8, Math.min(progress, 100))}%`;
    if (loaderLabel && label) loaderLabel.textContent = label;
  };

  const finishLoader = () => {
    setLoaderState(100, 'Dashboard ready');
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.body.classList.remove('is-loading');
        document.body.classList.add('is-ready');
        if (loader) window.setTimeout(() => loader.remove(), 500);
      });
    });
  };

  const applyTheme = (theme) => {
    document.documentElement.dataset.adminTheme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
  };

  applyTheme(window.localStorage.getItem(themeStorageKey) || 'dark');

  document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.adminTheme === 'dark' ? 'light' : 'dark');
    loadDashboard(false);
  });

  const renderRows = (items, emptyColspan, formatter) => {
    if (!items.length) {
      return `<tr><td colspan="${emptyColspan}" class="admin-empty">Belum ada data.</td></tr>`;
    }
    return items.map(formatter).join('');
  };

  const renderSourceLegend = (items) => {
    if (!sourceLegend) return;
    sourceLegend.innerHTML = items.map((item) => {
      const source = String(item.source || 'unknown').toLowerCase();
      const color = SOURCE_COLORS[source] || SOURCE_COLORS.unknown;
      return `
        <div class="admin-legend-item">
          <span class="admin-legend-swatch" style="background:${color};"></span>
          <strong>${escapeHtml(item.source || 'Unknown')}</strong>
          <span>${Number(item.views || 0).toLocaleString('id-ID')} views</span>
        </div>
      `;
    }).join('');
  };

  const syncControls = () => {
    timeframeButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.timeframe === state.timeframe);
    });
    metricButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.metric === state.metric);
    });
  };

  const setLastUpdated = (isoString) => {
    if (!lastUpdated) return;
    const date = isoString ? new Date(isoString) : new Date();
    const zoneLabel = formatDashboardTime(date, state.timezone, {
      timeZoneName: 'short'
    }).split(' ').pop();
    lastUpdated.textContent = `Updated ${formatDashboardTime(date, state.timezone, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })} ${zoneLabel}`;
  };

  const hideTooltip = () => {
    tooltip.classList.remove('is-visible');
  };

  const showTooltip = (point, canvas, event) => {
    if (!trendSurface) return;
    const surfaceRect = trendSurface.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const localX = event.clientX - canvasRect.left;
    const localY = event.clientY - canvasRect.top;
    tooltip.querySelector('strong').textContent = point.label;
    tooltip.querySelector('span').textContent = formatMetricValue(point.metric, point.value);
    tooltip.style.left = `${localX + (canvasRect.left - surfaceRect.left)}px`;
    tooltip.style.top = `${localY + (canvasRect.top - surfaceRect.top)}px`;
    tooltip.classList.add('is-visible');
  };

  const loadDashboard = async (showLoader = true) => {
    try {
      if (showLoader) setLoaderState(18, 'Connecting to analytics');
      const response = await fetch(`${endpoint}?timeframe=${encodeURIComponent(state.timeframe)}&timezone=${encodeURIComponent(state.timezone)}`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (showLoader) setLoaderState(40, 'Processing analytics');
      const data = await response.json();
      const summary = data.summary || {};
      const bySource = Array.isArray(data.by_source) ? data.by_source : [];
      const byUrl = Array.isArray(data.by_url) ? data.by_url : [];
      const timeseries = Array.isArray(data.timeseries) ? data.timeseries : [];
      const hourOfDay = Array.isArray(data.hour_of_day) ? data.hour_of_day : [];
      state.timezone = data.meta?.timezone || state.timezone;

      if (summaryViews) summaryViews.textContent = Number(summary.total_views || 0).toLocaleString('id-ID');
      if (summaryOrderClicks) summaryOrderClicks.textContent = Number(summary.order_now_clicks || 0).toLocaleString('id-ID');
      if (summaryCheckoutClicks) summaryCheckoutClicks.textContent = Number(summary.checkout_clicks || 0).toLocaleString('id-ID');
      if (summaryTimeSpent) summaryTimeSpent.textContent = formatSeconds(Number(summary.avg_time_spent_seconds || 0));

      if (urlTableBody) {
        urlTableBody.innerHTML = renderRows(byUrl, 6, (item) => `
          <tr>
            <td><strong>${escapeHtml(item.page_path || '-')}</strong></td>
            <td>${escapeHtml(item.source || '-')}</td>
            <td>${Number(item.views || 0).toLocaleString('id-ID')}</td>
            <td>${Number(item.order_now_clicks || 0).toLocaleString('id-ID')}</td>
            <td>${Number(item.checkout_clicks || 0).toLocaleString('id-ID')}</td>
            <td>${formatSeconds(Number(item.avg_time_spent_seconds || 0))}</td>
          </tr>
        `);
      }

      if (sourceTableBody) {
        sourceTableBody.innerHTML = renderRows(bySource, 5, (item) => `
          <tr>
            <td><strong>${escapeHtml(item.source || '-')}</strong></td>
            <td>${Number(item.views || 0).toLocaleString('id-ID')}</td>
            <td>${Number(item.order_now_clicks || 0).toLocaleString('id-ID')}</td>
            <td>${Number(item.checkout_clicks || 0).toLocaleString('id-ID')}</td>
            <td>${formatSeconds(Number(item.avg_time_spent_seconds || 0))}</td>
          </tr>
        `);
      }

      if (recentEvents) {
        const items = Array.isArray(data.recent_events) ? data.recent_events : [];
        recentEvents.innerHTML = items.length
          ? items.map((item) => `
              <div class="admin-event-item">
                <strong>${escapeHtml(item.event_type || 'event')} • ${escapeHtml(item.source || 'unknown')}</strong>
                <span>${escapeHtml(item.page_path || '-')}</span>
                <small>${escapeHtml(item.occurred_at_iso ? formatDashboardTime(item.occurred_at_iso, state.timezone, {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZoneName: 'short'
                }) : (item.occurred_at || ''))}</small>
              </div>
            `).join('')
          : '<p class="admin-empty">Belum ada aktivitas.</p>';
      }

      if (showLoader) setLoaderState(68, 'Rendering time charts');
      drawLineChart(trendCanvas, timeseries, state.metric);
      drawBarChart(hourCanvas, hourOfDay, {
        value: (item) => item[state.metric] || 0,
        label: (item) => `${String(item.hour).padStart(2, '0')}:00`,
        color: () => SOURCE_COLORS.facebook,
        metric: state.metric,
        limit: 24
      });
      drawBarChart(sourceCanvas, bySource, {
        value: (item) => item.views || 0,
        label: (item) => String(item.source || 'unknown'),
        color: (item) => SOURCE_COLORS[String(item.source || 'unknown').toLowerCase()] || SOURCE_COLORS.unknown,
        metric: 'views',
        limit: 6
      });
      drawBarChart(urlCanvas, byUrl, {
        value: (item) => item.checkout_clicks || 0,
        label: (item) => String(item.page_path || '-').replace('/bubur-', '').replace('.html', ''),
        color: (item) => SOURCE_COLORS[String(item.source || 'unknown').toLowerCase()] || SOURCE_COLORS.unknown,
        metric: 'checkout_clicks',
        limit: 6
      });

      renderSourceLegend(bySource);
      syncControls();
      setLastUpdated(data.meta?.generated_at);
      if (trendTitle) trendTitle.textContent = METRIC_LABELS[state.metric] || 'Trend over time';
      if (trendMeta) trendMeta.textContent = `Timeframe: ${state.timeframe.toUpperCase()} • Timezone: ${state.timezone}`;

      if (showLoader) {
        setLoaderState(88, 'Finalizing interface');
        finishLoader();
      }
    } catch (error) {
      if (recentEvents) {
        recentEvents.innerHTML = `<p class="admin-empty">Gagal memuat dashboard: ${escapeHtml(error.message)}</p>`;
      }
      setLastUpdated(null);
      if (showLoader) {
        setLoaderState(100, 'Load failed');
        document.body.classList.remove('is-loading');
        document.body.classList.add('is-ready');
      }
    }
  };

  timeframeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.timeframe = button.dataset.timeframe || '7d';
      loadDashboard(false);
    });
  });

  metricButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.metric = button.dataset.metric || 'views';
      loadDashboard(false);
    });
  });

  trendCanvas?.addEventListener('mousemove', (event) => {
    const points = chartHoverState.get(trendCanvas) || [];
    if (!points.length) return hideTooltip();
    const rect = trendCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    let closest = points[0];
    let closestDistance = Math.abs(points[0].x - x);
    for (const point of points) {
      const distance = Math.abs(point.x - x);
      if (distance < closestDistance) {
        closest = point;
        closestDistance = distance;
      }
    }
    showTooltip(closest, trendCanvas, event);
  });

  trendCanvas?.addEventListener('mouseleave', hideTooltip);

  state.refreshHandle = window.setInterval(() => {
    loadDashboard(false);
  }, state.refreshMs);

  window.addEventListener('resize', () => loadDashboard(false));
  loadDashboard(true);
});
