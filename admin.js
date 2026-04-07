const SOURCE_COLORS = {
  youtube: ['#ff5252', '#ff5252'],
  facebook: ['#ffd400', '#ffd400'],
  instagram: ['#9dff00', '#9dff00'],
  tiktok: ['#22d3ee', '#22d3ee']
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

const drawBarChart = (canvas, items, config) => {
  if (!(canvas instanceof HTMLCanvasElement)) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || canvas.width;
  const height = canvas.clientHeight || canvas.height;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const chartItems = items.slice(0, 6);
  const maxValue = Math.max(...chartItems.map((item) => Number(config.value(item))), 1);
  const padding = { top: 20, right: 20, bottom: 54, left: 18 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = chartWidth / Math.max(chartItems.length, 1) * 0.58;
  const gap = chartWidth / Math.max(chartItems.length, 1) * 0.42;

  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const y = padding.top + (chartHeight / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  chartItems.forEach((item, index) => {
    const value = Number(config.value(item));
    const barHeight = (value / maxValue) * (chartHeight - 10);
    const x = padding.left + index * (barWidth + gap) + gap / 2;
    const y = padding.top + chartHeight - barHeight;
    const [colorA, colorB] = config.colors(item);
    const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
    gradient.addColorStop(0, colorA);
    gradient.addColorStop(1, colorB);

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.roundRect(x, padding.top + 8, barWidth, chartHeight - 8, 18);
    ctx.fill();

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 18);
    ctx.fill();

    ctx.fillStyle = '#f5f7ff';
    ctx.font = '700 13px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(value), x + (barWidth / 2), y - 8);

    ctx.fillStyle = 'rgba(228,233,255,0.8)';
    ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(config.label(item), x + (barWidth / 2), height - 18);
  });
};

document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-admin-dashboard]');
  if (!root) return;

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
  const sourceLegend = document.querySelector('[data-source-legend]');
  const loader = document.querySelector('[data-admin-loader]');
  const loaderProgress = document.querySelector('[data-admin-loader-progress]');
  const loaderLabel = document.querySelector('[data-admin-loader-label]');

  if (endpointLabel) endpointLabel.textContent = endpoint;

  const setLoaderState = (progress, label) => {
    if (loaderProgress) {
      loaderProgress.style.width = `${Math.max(8, Math.min(progress, 100))}%`;
    }
    if (loaderLabel && label) {
      loaderLabel.textContent = label;
    }
  };

  const finishLoader = () => {
    setLoaderState(100, 'Dashboard ready');
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.body.classList.remove('is-loading');
        document.body.classList.add('is-ready');
        if (loader) {
          window.setTimeout(() => loader.remove(), 500);
        }
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
      const [colorA] = SOURCE_COLORS[source] || ['#9ca3af', '#9ca3af'];
      return `
        <div class="admin-legend-item">
          <span class="admin-legend-swatch" style="background: ${colorA};"></span>
          <strong>${escapeHtml(item.source || 'Unknown')}</strong>
          <span>${Number(item.views || 0).toLocaleString('id-ID')} views</span>
        </div>
      `;
    }).join('');
  };

  const loadDashboard = async () => {
    try {
      setLoaderState(20, 'Connecting to analytics');
      const response = await fetch(endpoint, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setLoaderState(48, 'Processing campaign data');
      const data = await response.json();
      const summary = data.summary || {};
      const bySource = Array.isArray(data.by_source) ? data.by_source : [];
      const byUrl = Array.isArray(data.by_url) ? data.by_url : [];

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
                <small>${escapeHtml(item.occurred_at || '')}</small>
              </div>
            `).join('')
          : '<p class="admin-empty">Belum ada aktivitas.</p>';
      }

      setLoaderState(72, 'Rendering charts');
      drawBarChart(sourceCanvas, bySource, {
        value: (item) => item.views || 0,
        label: (item) => String(item.source || 'unknown'),
        colors: (item) => SOURCE_COLORS[String(item.source || 'unknown').toLowerCase()] || ['#9ca3af', '#cbd5e1']
      });

      drawBarChart(urlCanvas, byUrl, {
        value: (item) => item.checkout_clicks || 0,
        label: (item) => String(item.page_path || '-').replace('/bubur-', '').replace('.html', ''),
        colors: (item) => SOURCE_COLORS[String(item.source || 'unknown').toLowerCase()] || ['#9ca3af', '#cbd5e1']
      });

      setLoaderState(88, 'Finalizing interface');
      renderSourceLegend(bySource);
      finishLoader();
    } catch (error) {
      if (recentEvents) {
        recentEvents.innerHTML = `<p class="admin-empty">Gagal memuat dashboard: ${escapeHtml(error.message)}</p>`;
      }
      setLoaderState(100, 'Load failed');
      document.body.classList.remove('is-loading');
      document.body.classList.add('is-ready');
    }
  };

  document.querySelector('[data-admin-refresh]')?.addEventListener('click', loadDashboard);
  window.addEventListener('resize', loadDashboard);
  loadDashboard();
});
