(() => {
  'use strict';

  const root = document.querySelector('[data-product-flavor-page]');
  if (!root) return;

  const refs = {
    close: root.querySelector('[data-close-detail]'),
    status: root.querySelector('[data-load-status]'),
    statusShell: root.querySelector('.product-flavor-live-status'),
    scopeButtons: Array.from(root.querySelectorAll('[data-scope]')),
    grainButtons: Array.from(root.querySelectorAll('[data-grain]')),
    metricButtons: Array.from(root.querySelectorAll('[data-metric]')),
    dateForm: root.querySelector('[data-date-form]'),
    startDate: root.querySelector('[data-start-date]'),
    endDate: root.querySelector('[data-end-date]'),
    export: root.querySelector('[data-export-csv]'),
    eyebrow: root.querySelector('[data-sheet-eyebrow]'),
    scroll: root.querySelector('[data-sheet-scroll]'),
    head: root.querySelector('[data-sheet-head]'),
    body: root.querySelector('[data-sheet-body]'),
    foot: root.querySelector('[data-sheet-foot]'),
    empty: root.querySelector('[data-empty-state]')
  };

  const now = new Date();
  const isoDate = (date) => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(date);
  };
  const currentDate = isoDate(now);
  const currentYear = currentDate.slice(0, 4);
  const state = {
    product: root.dataset.product || 'syrup',
    productLabel: root.dataset.productLabel || 'Product',
    scope: 'year',
    grain: 'month',
    metric: 'quantity',
    startDate: `${currentYear}-01-01`,
    endDate: currentDate,
    data: null,
    requestId: 0
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[character]));
  const formatInteger = (value) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value || 0));
  const formatCurrency = (value) => `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(value || 0))}`;
  const formatCompactCurrency = (value) => {
    const number = Number(value || 0);
    if (Math.abs(number) < 1000000) return formatCurrency(number);
    return `Rp ${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(number)}`;
  };
  const formatMetric = (value, metric = state.metric) => metric === 'revenue'
    ? formatCompactCurrency(value)
    : formatInteger(value);
  const dateLabel = (value) => {
    const date = new Date(`${value}T00:00:00+07:00`);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(date);
  };
  const grainLabel = () => ({ day: 'day', week: 'week', month: 'month' }[state.grain] || state.grain);

  const setStatus = (message, mode = '') => {
    refs.status.textContent = message;
    refs.statusShell?.classList.toggle('is-loading', mode === 'loading');
    refs.statusShell?.classList.toggle('is-error', mode === 'error');
  };

  const setActiveButton = (buttons, key, value) => {
    buttons.forEach((button) => {
      const active = button.dataset[key] === value;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  };

  const volumeTotals = (data, metric) => {
    const totals = {};
    (data?.volumes || []).forEach((volume) => { totals[volume.key] = 0; });
    (data?.periods || []).forEach((period) => {
      (period.flavors || []).forEach((flavor) => {
        Object.entries(flavor.volumes || {}).forEach(([key, values]) => {
          totals[key] = Number(totals[key] || 0) + Number(values?.[metric] || 0);
        });
      });
    });
    return totals;
  };

  const renderRangeContext = () => {
    const start = state.data?.start_date || state.startDate;
    const end = state.data?.end_date || state.endDate;
    refs.eyebrow.textContent = `Showing ${dateLabel(start)} – ${dateLabel(end)} · grouped by ${grainLabel()}`;
  };

  const renderSheet = () => {
    const data = state.data;
    const periods = Array.isArray(data?.periods) ? data.periods : [];
    const volumes = Array.isArray(data?.volumes) ? data.volumes : [];
    const metric = state.metric;
    renderRangeContext();
    refs.empty.hidden = periods.length > 0;
    refs.scroll.hidden = periods.length === 0;
    if (!periods.length) {
      refs.head.replaceChildren();
      refs.body.replaceChildren();
      refs.foot.replaceChildren();
      return;
    }

    const maximumCell = Math.max(1, ...periods.flatMap((period) => (
      (period.flavors || []).flatMap((flavor) => volumes.map((volume) => Number(flavor.volumes?.[volume.key]?.[metric] || 0)))
    )));

    refs.head.innerHTML = `
      <tr>
        <th class="is-period" scope="col">Period</th>
        <th class="is-flavor" scope="col">Flavor</th>
        ${volumes.map((volume) => `<th scope="col">${escapeHtml(volume.label)}</th>`).join('')}
        <th class="is-total" scope="col">${metric === 'revenue' ? 'Total revenue' : 'Total units'}</th>
        <th class="is-revenue" scope="col">${metric === 'revenue' ? 'Units sold' : 'Seller revenue'}</th>
      </tr>
    `;

    const rows = [];
    periods.forEach((period, periodIndex) => {
      const flavors = Array.isArray(period.flavors) ? period.flavors : [];
      flavors.forEach((flavor, index) => {
        rows.push(`
          <tr>
            ${index === 0 ? `<th class="is-period" scope="rowgroup" rowspan="${flavors.length}">${escapeHtml(period.label || period.key)}</th>` : ''}
            <th class="is-flavor" scope="row">${escapeHtml(flavor.label || 'Unspecified')}</th>
            ${volumes.map((volume) => {
              const value = Number(flavor.volumes?.[volume.key]?.[metric] || 0);
              const previousPeriod = periods[periodIndex + 1];
              const previousFlavor = (previousPeriod?.flavors || []).find((item) => (
                item.key === flavor.key || item.label === flavor.label
              ));
              const previousValue = previousPeriod
                ? Number(previousFlavor?.volumes?.[volume.key]?.[metric] || 0)
                : null;
              const trend = previousValue === null
                ? 'flat'
                : value > previousValue
                  ? 'up'
                  : value < previousValue
                    ? 'down'
                    : 'flat';
              const fillValue = value === 0 && previousValue > 0 ? 4 : (value / maximumCell) * 100;
              const fill = Math.max(0, Math.min(100, fillValue));
              const comparison = previousValue === null
                ? 'No previous period available'
                : `${trend === 'up' ? 'Increase' : trend === 'down' ? 'Decrease' : 'No change'} from ${formatMetric(previousValue)}`;
              const title = `${flavor.label} · ${volume.label} · ${formatMetric(value)} · ${comparison}`;
              return `<td class="is-value is-${trend}${value === 0 ? ' is-zero' : ''}" style="--cell-fill:${fill.toFixed(1)}%" title="${escapeHtml(title)}">${value === 0 ? '—' : escapeHtml(formatMetric(value))}</td>`;
            }).join('')}
            <td class="is-total">${escapeHtml(formatMetric(flavor[metric] || 0))}</td>
            <td class="is-revenue">${escapeHtml(metric === 'revenue' ? formatInteger(flavor.quantity || 0) : formatCurrency(flavor.revenue || 0))}</td>
          </tr>
        `);
      });
      rows.push(`
        <tr class="is-period-total">
          <th class="is-period" colspan="2">${escapeHtml(period.label || period.key)} total</th>
          ${volumes.map((volume) => {
            const total = flavors.reduce((sum, flavor) => sum + Number(flavor.volumes?.[volume.key]?.[metric] || 0), 0);
            return `<td>${escapeHtml(formatMetric(total))}</td>`;
          }).join('')}
          <td class="is-total">${escapeHtml(formatMetric(period[metric] || 0))}</td>
          <td class="is-revenue">${escapeHtml(metric === 'revenue' ? formatInteger(period.quantity || 0) : formatCurrency(period.revenue || 0))}</td>
        </tr>
      `);
    });
    refs.body.innerHTML = rows.join('');

    const byVolume = volumeTotals(data, metric);
    refs.foot.innerHTML = `
      <tr>
        <th class="is-period" colspan="2">Grand total</th>
        ${volumes.map((volume) => `<td>${escapeHtml(formatMetric(byVolume[volume.key] || 0))}</td>`).join('')}
        <td class="is-total">${escapeHtml(formatMetric(data.totals?.[metric] || 0))}</td>
        <td class="is-revenue">${escapeHtml(metric === 'revenue' ? formatInteger(data.totals?.quantity || 0) : formatCurrency(data.totals?.revenue || 0))}</td>
      </tr>
    `;
  };

  const readAllTimeRange = async () => {
    const url = new URL(root.dataset.endpoint, window.location.href);
    url.searchParams.set('action', 'status');
    const response = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) throw new Error(payload?.message || 'Could not read the available sales range.');
    const oldest = String(payload?.mirror?.oldest_order_at || '').slice(0, 10);
    const newest = String(payload?.mirror?.newest_order_at || '').slice(0, 10);
    return {
      startDate: oldest || `${currentYear}-01-01`,
      endDate: newest || currentDate
    };
  };

  const loadBreakdown = async () => {
    const requestId = ++state.requestId;
    setStatus('Updating sales…', 'loading');
    refs.body.innerHTML = '<tr><td class="product-flavor-loading-cell">Preparing the breakdown…</td></tr>';
    refs.head.replaceChildren();
    refs.foot.replaceChildren();
    refs.empty.hidden = true;
    refs.scroll.hidden = false;

    try {
      if (state.scope === 'all') {
        const range = await readAllTimeRange();
        if (requestId !== state.requestId) return;
        state.startDate = range.startDate;
        state.endDate = range.endDate;
      }
      const url = new URL(root.dataset.endpoint, window.location.href);
      url.searchParams.set('action', 'product_flavor_breakdown');
      url.searchParams.set('product', state.product);
      url.searchParams.set('grain', state.grain);
      url.searchParams.set('start_date', state.startDate);
      url.searchParams.set('end_date', state.endDate);
      const response = await fetch(url, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || 'The flavor breakdown could not be loaded.');
      }
      if (requestId !== state.requestId) return;
      state.data = payload;
      renderSheet();
      setStatus(`Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    } catch (error) {
      if (requestId !== state.requestId) return;
      refs.scroll.hidden = true;
      refs.empty.hidden = false;
      refs.empty.querySelector('strong').textContent = 'Could not load the breakdown';
      refs.empty.querySelector('p').textContent = error?.message || 'Please try again.';
      setStatus('Sales unavailable', 'error');
    }
  };

  const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const exportCsv = () => {
    const data = state.data;
    if (!data?.periods?.length) return;
    const volumes = data.volumes || [];
    const rows = [
      ['Period', 'Flavor', ...volumes.map((volume) => volume.label), 'Total units', 'Seller revenue']
    ];
    data.periods.forEach((period) => {
      (period.flavors || []).forEach((flavor) => {
        rows.push([
          period.label,
          flavor.label,
          ...volumes.map((volume) => Number(flavor.volumes?.[volume.key]?.quantity || 0)),
          Number(flavor.quantity || 0),
          Number(flavor.revenue || 0)
        ]);
      });
    });
    const blob = new Blob([rows.map((row) => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${state.product}-flavor-volume-${state.startDate}-to-${state.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(link.href);
      link.remove();
    }, 0);
  };

  refs.close?.addEventListener('click', (event) => {
    if (window.history.length <= 1 || !document.referrer.startsWith(window.location.origin)) return;
    event.preventDefault();
    window.history.back();
  });

  refs.scopeButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      state.scope = button.dataset.scope || 'year';
      setActiveButton(refs.scopeButtons, 'scope', state.scope);
      refs.dateForm.hidden = state.scope !== 'custom';
      if (state.scope === 'custom') {
        refs.startDate.value = state.startDate;
        refs.endDate.value = state.endDate;
        refs.startDate.focus();
        return;
      }
      if (state.scope === 'year') {
        state.startDate = `${currentYear}-01-01`;
        state.endDate = currentDate;
      }
      await loadBreakdown();
    });
  });

  refs.grainButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      state.grain = button.dataset.grain || 'month';
      setActiveButton(refs.grainButtons, 'grain', state.grain);
      await loadBreakdown();
    });
  });

  refs.metricButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.metric = button.dataset.metric || 'quantity';
      setActiveButton(refs.metricButtons, 'metric', state.metric);
      renderSheet();
    });
  });

  refs.dateForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const startDate = refs.startDate.value;
    const endDate = refs.endDate.value;
    if (!startDate || !endDate || startDate > endDate) {
      refs.startDate.setCustomValidity(startDate > endDate ? 'Start date must be before the end date.' : '');
      refs.startDate.reportValidity();
      return;
    }
    refs.startDate.setCustomValidity('');
    state.startDate = startDate;
    state.endDate = endDate;
    await loadBreakdown();
  });

  refs.export?.addEventListener('click', exportCsv);
  refs.startDate.value = state.startDate;
  refs.endDate.value = state.endDate;
  loadBreakdown();
})();
