document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-store-ops-dashboard]');
  if (!root) return;

  const endpoint = root.dataset.storeOpsEndpoint || '../api/store-ops/';
  const themeStorageKey = 'jg-admin-theme';
  const refs = {
    status: document.querySelector('[data-store-ops-status]'),
    form: document.querySelector('[data-store-ops-filters]'),
    dateFrom: document.querySelector('[data-store-ops-date-from]'),
    dateTo: document.querySelector('[data-store-ops-date-to]'),
    employees: document.querySelector('[data-store-ops-employees]'),
    source: document.querySelector('[data-store-ops-source]'),
    query: document.querySelector('[data-store-ops-query]'),
    reset: document.querySelector('[data-store-ops-reset]'),
    statusControls: document.querySelector('[data-store-ops-status-controls]'),
    tableBody: document.querySelector('[data-store-ops-table-body]'),
    tableMeta: document.querySelector('[data-store-ops-table-meta]'),
    drawer: document.querySelector('[data-store-ops-drawer]'),
    drawerTitle: document.querySelector('[data-store-ops-drawer-title]'),
    events: document.querySelector('[data-store-ops-events]'),
    throughput: document.querySelector('[data-store-ops-throughput]'),
    throughputDetail: document.querySelector('[data-store-ops-throughput-detail]')
  };
  let statusFilter = '';
  let employeesRendered = false;

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const applyTheme = () => {
    document.documentElement.dataset.adminTheme = window.localStorage.getItem(themeStorageKey) || 'dark';
  };

  const formatTime = (value) => {
    if (!value) return '-';
    const date = new Date(`${String(value).replace(' ', 'T')}Z`);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Asia/Jakarta'
    }).format(date);
  };

  const selectedEmployees = () => {
    if (!(refs.employees instanceof HTMLSelectElement)) return [];
    return Array.from(refs.employees.selectedOptions).map((option) => option.value).filter(Boolean);
  };

  const buildParams = (extra = {}) => {
    const params = new URLSearchParams();
    if (refs.dateFrom?.value) params.set('date_from', refs.dateFrom.value);
    if (refs.dateTo?.value) params.set('date_to', refs.dateTo.value);
    const employees = selectedEmployees();
    if (employees.length) params.set('employees', employees.join(','));
    if (statusFilter) params.set('status', statusFilter);
    if (refs.source?.value.trim()) params.set('source', refs.source.value.trim());
    if (refs.query?.value.trim()) params.set('q', refs.query.value.trim());
    Object.entries(extra).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value) !== '') params.set(key, String(value));
    });
    return params;
  };

  const fetchStoreOps = async (extra = {}) => {
    const params = buildParams(extra);
    const response = await fetch(`${endpoint}?${params.toString()}`, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || 'Unable to load Store Ops activity.');
    }
    return payload;
  };

  const renderMetrics = (metrics = {}) => {
    document.querySelectorAll('[data-store-ops-metric]').forEach((node) => {
      const key = node.dataset.storeOpsMetric;
      node.textContent = String(metrics[key] ?? (key === 'average_fulfillment_label' ? '0s' : 0));
    });
    const throughput = Array.isArray(metrics.employee_throughput) ? metrics.employee_throughput : [];
    const total = throughput.reduce((sum, item) => sum + Number(item.fulfilled_count || 0), 0);
    if (refs.throughput) refs.throughput.textContent = String(total);
    if (refs.throughputDetail) {
      refs.throughputDetail.textContent = throughput.length
        ? throughput.map((item) => `${item.employee_name}: ${item.fulfilled_count}`).join(' | ')
        : 'No fulfilled orders yet';
    }
  };

  const renderEmployees = (employees = []) => {
    if (employeesRendered || !(refs.employees instanceof HTMLSelectElement)) return;
    const selectedFromUrl = new Set((new URLSearchParams(window.location.search).get('employees') || '').split(',').filter(Boolean));
    refs.employees.innerHTML = employees
      .filter((employee) => employee.id && employee.display_name)
      .map((employee) => `<option value="${escapeHtml(employee.id)}" ${selectedFromUrl.has(employee.id) ? 'selected' : ''}>${escapeHtml(employee.display_name)}${employee.active ? '' : ' (inactive)'}</option>`)
      .join('');
    employeesRendered = true;
  };

  const renderOrders = (orders = []) => {
    if (!refs.tableBody) return;
    if (refs.tableMeta) refs.tableMeta.textContent = `${orders.length} order${orders.length === 1 ? '' : 's'} shown`;
    if (!orders.length) {
      refs.tableBody.innerHTML = '<tr><td colspan="9" class="admin-empty">No Store Ops activity matches these filters.</td></tr>';
      return;
    }
    refs.tableBody.innerHTML = orders.map((order) => `
      <tr
        class="admin-store-ops-row"
        data-order-id="${escapeHtml(order.order_id)}"
        data-source-platform="${escapeHtml(order.source_platform)}"
        data-source-account="${escapeHtml(order.source_account)}"
      >
        <td><strong>${escapeHtml(order.order_id)}</strong></td>
        <td>${escapeHtml(order.source_platform)}<small>${escapeHtml(order.source_account)}</small></td>
        <td><span class="admin-status-badge">${escapeHtml(order.status || 'UNCLAIMED')}</span></td>
        <td>${escapeHtml(order.employee_name || order.claimed_by || '-')}</td>
        <td>${escapeHtml(formatTime(order.claimed_at))}</td>
        <td>${escapeHtml(formatTime(order.scan_completed_at))}</td>
        <td>${escapeHtml(formatTime(order.label_printed_at))}</td>
        <td>${escapeHtml(formatTime(order.fulfilled_at))}</td>
        <td>${escapeHtml(order.duration_label || '-')}</td>
      </tr>
    `).join('');
  };

  const renderEvents = (events = []) => {
    if (!refs.events) return;
    if (!events.length) {
      refs.events.innerHTML = '<p class="admin-empty">No events recorded for this order yet.</p>';
      return;
    }
    refs.events.innerHTML = events.map((event) => {
      const progress = Number(event.progress_required || 0) > 0
        ? `${event.progress_scanned}/${event.progress_required}`
        : '';
      const detail = [event.employee_name, event.sku, progress].filter(Boolean).join(' | ');
      return `
        <div class="admin-event-item admin-store-ops-event">
          <strong>${escapeHtml(event.event_type)}</strong>
          <span>${escapeHtml(formatTime(event.created_at))}${detail ? ` | ${escapeHtml(detail)}` : ''}</span>
          ${event.message ? `<small>${escapeHtml(event.message)}</small>` : ''}
        </div>
      `;
    }).join('');
  };

  const setStatusFilter = (value) => {
    statusFilter = value;
    refs.statusControls?.querySelectorAll('[data-status-value]').forEach((button) => {
      const active = button.dataset.statusValue === value;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  };

  const load = async () => {
    if (refs.status) refs.status.textContent = 'Loading';
    const payload = await fetchStoreOps();
    if (refs.dateFrom instanceof HTMLInputElement && !refs.dateFrom.value) refs.dateFrom.value = payload.filters?.date_from || '';
    if (refs.dateTo instanceof HTMLInputElement && !refs.dateTo.value) refs.dateTo.value = payload.filters?.date_to || '';
    renderMetrics(payload.metrics || {});
    renderEmployees(payload.employees || []);
    renderOrders(payload.orders || []);
    if (refs.status) refs.status.textContent = 'Live';
  };

  const openDrawer = async (row) => {
    const orderId = row.dataset.orderId || '';
    if (!orderId) return;
    if (refs.drawerTitle) refs.drawerTitle.textContent = orderId;
    if (refs.events) refs.events.innerHTML = '<p class="admin-empty">Loading timeline.</p>';
    if (refs.drawer) refs.drawer.hidden = false;
    try {
      const payload = await fetchStoreOps({
        detail_order_id: orderId,
        detail_source_platform: row.dataset.sourcePlatform || '',
        detail_source_account: row.dataset.sourceAccount || ''
      });
      renderEvents(payload.events || []);
    } catch (error) {
      if (refs.events) refs.events.innerHTML = `<p class="admin-empty">${escapeHtml(error instanceof Error ? error.message : 'Unable to load timeline.')}</p>`;
    }
  };

  const closeDrawer = () => {
    if (refs.drawer) refs.drawer.hidden = true;
  };

  refs.form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const params = buildParams();
    window.history.replaceState(null, '', params.toString() ? `?${params.toString()}` : window.location.pathname);
    load().catch((error) => {
      if (refs.status) refs.status.textContent = 'Error';
      if (refs.tableBody) refs.tableBody.innerHTML = `<tr><td colspan="9" class="admin-empty">${escapeHtml(error.message)}</td></tr>`;
    });
  });

  refs.reset?.addEventListener('click', () => {
    refs.form?.reset();
    setStatusFilter('');
    window.history.replaceState(null, '', window.location.pathname);
    employeesRendered = false;
    load().catch(() => {});
  });

  refs.statusControls?.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-status-value]') : null;
    if (!(target instanceof HTMLButtonElement)) return;
    setStatusFilter(target.dataset.statusValue || '');
    refs.form?.requestSubmit();
  });

  refs.tableBody?.addEventListener('click', (event) => {
    const row = event.target instanceof Element ? event.target.closest('[data-order-id]') : null;
    if (row instanceof HTMLElement) openDrawer(row).catch(() => {});
  });

  document.querySelectorAll('[data-store-ops-drawer-close]').forEach((button) => {
    button.addEventListener('click', closeDrawer);
  });

  const initializeFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    if (refs.dateFrom instanceof HTMLInputElement) refs.dateFrom.value = params.get('date_from') || '';
    if (refs.dateTo instanceof HTMLInputElement) refs.dateTo.value = params.get('date_to') || '';
    if (refs.source instanceof HTMLInputElement) refs.source.value = params.get('source') || '';
    if (refs.query instanceof HTMLInputElement) refs.query.value = params.get('q') || '';
    setStatusFilter(params.get('status') || '');
  };

  applyTheme();
  initializeFromUrl();
  load().catch((error) => {
    if (refs.status) refs.status.textContent = 'Error';
    if (refs.tableBody) refs.tableBody.innerHTML = `<tr><td colspan="9" class="admin-empty">${escapeHtml(error.message)}</td></tr>`;
  });
});
