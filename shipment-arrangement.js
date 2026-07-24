document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-shipment-arrangement]');
  if (!root) return;

  const endpoint = root.dataset.shipmentArrangementEndpoint || '../api/shipment-arrangement/';
  const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const CARRIERS = [
    ['pos_indonesia', 'POS Indonesia'],
    ['jnt_express', 'J&T Express'],
    ['jnt_cargo', 'J&T Cargo']
  ];
  const state = {
    data: null,
    weekStart: startOfWeek(new Date()),
    platform: 'all',
    type: 'all',
    ruleTab: 'shopee',
    workingPolicy: null,
    loading: false
  };
  const refs = {
    live: root.querySelector('[data-arrangement-live]'),
    refresh: root.querySelector('[data-arrangement-refresh]'),
    edit: root.querySelector('[data-arrangement-edit]'),
    map: root.querySelector('[data-arrangement-map]'),
    orders: root.querySelector('[data-arrangement-orders]'),
    orderMeta: root.querySelector('[data-arrangement-order-meta]'),
    weekLabel: root.querySelector('[data-arrangement-week-label]'),
    editor: root.querySelector('[data-arrangement-editor]'),
    unlock: root.querySelector('[data-arrangement-unlock]'),
    unlockForm: root.querySelector('[data-arrangement-unlock-form]'),
    policyForm: root.querySelector('[data-arrangement-policy-form]'),
    ruleGrid: root.querySelector('[data-arrangement-rule-grid]'),
    policyMeta: root.querySelector('[data-arrangement-policy-meta]'),
    error: root.querySelector('[data-arrangement-error]'),
    save: root.querySelector('[data-arrangement-save]')
  };

  function startOfWeek(value) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date(value)).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
    const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
    const calendarDay = new Date(`${dateKey}T12:00:00Z`).getUTCDay() || 7;
    return new Date(new Date(`${dateKey}T00:00:00+07:00`).getTime() - ((calendarDay - 1) * 86400000));
  }

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  const parseUtc = (value) => {
    if (!value) return null;
    const raw = String(value);
    const date = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(raw) ? raw : `${raw.replace(' ', 'T')}Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatDate = (date, options) => new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    ...options
  }).format(date);

  const localParts = (date) => {
    if (!(date instanceof Date)) return null;
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
    return {
      date: `${parts.year}-${parts.month}-${parts.day}`,
      minute: Number(parts.hour) * 60 + Number(parts.minute)
    };
  };

  const localDateKey = (date) => formatDate(date, { year: 'numeric', month: '2-digit', day: '2-digit' })
    .split('/').reverse().join('-');

  const addDays = (date, days) => {
    return new Date(new Date(date).getTime() + (days * 86400000));
  };

  const weekEnd = () => addDays(state.weekStart, 7);

  const selectedOrders = () => {
    const orders = Array.isArray(state.data?.orders) ? state.data.orders : [];
    return orders.filter((order) => {
      if (state.platform !== 'all' && String(order.platform).toLowerCase() !== state.platform) return false;
      if (state.type !== 'all' && String(order.order_type).toLowerCase() !== state.type) return false;
      const dates = [parseUtc(order.pickup_start_at), parseUtc(order.ship_by_at), parseUtc(order.updated_at)].filter(Boolean);
      return dates.some((date) => date >= state.weekStart && date < weekEnd());
    });
  };

  const xPercent = (minutes) => Math.max(0, Math.min(100, (minutes / 1440) * 100));
  const durationPercent = (start, end) => Math.max(0.75, xPercent(Math.max(15, end - start)));

  const policyWindow = (platform, dayNumber) =>
    state.data?.policy?.policy?.platforms?.[platform]?.regular?.windows?.[String(dayNumber)] || null;

  const renderMap = () => {
    if (!refs.map || !state.data) return;
    const orders = selectedOrders();
    const startLabel = formatDate(state.weekStart, { day: 'numeric', month: 'short' });
    const endLabel = formatDate(addDays(state.weekStart, 6), { day: 'numeric', month: 'short', year: 'numeric' });
    if (refs.weekLabel) refs.weekLabel.textContent = `${startLabel} – ${endLabel}`;
    const hourTicks = [0, 4, 8, 12, 16, 20, 24]
      .map((hour) => `<span style="left:${(hour / 24) * 100}%">${String(hour).padStart(2, '0')}:00</span>`).join('');
    const rows = DAY_LABELS.map((label, index) => {
      const date = addDays(state.weekStart, index);
      const dateKey = localDateKey(date);
      const platforms = state.platform === 'all' ? ['shopee', 'tiktok'] : [state.platform];
      const policyBlocks = platforms.map((platform, platformIndex) => {
        const windowRule = policyWindow(platform, index + 1);
        if (!windowRule?.enabled) return '';
        const [startHour, startMinute] = String(windowRule.start).split(':').map(Number);
        const [endHour, endMinute] = String(windowRule.end).split(':').map(Number);
        const start = startHour * 60 + startMinute;
        const end = endHour * 60 + endMinute;
        return `<span class="admin-arrangement-policy-block is-${platform}" style="left:${xPercent(start)}%;width:${durationPercent(start, end)}%;top:${5 + platformIndex * 14}px" title="${escapeHtml(platform)} automatic arrangement ${escapeHtml(windowRule.start)}–${escapeHtml(windowRule.end)}"></span>`;
      }).join('');
      const dayOrders = orders.filter((order) => {
        const pickup = localParts(parseUtc(order.pickup_start_at));
        const deadline = localParts(parseUtc(order.ship_by_at));
        return pickup?.date === dateKey || deadline?.date === dateKey;
      });
      const events = dayOrders.map((order, orderIndex) => {
        const pickupDate = parseUtc(order.pickup_start_at);
        const pickupEndDate = parseUtc(order.pickup_end_at);
        const deadlineDate = parseUtc(order.ship_by_at);
        const pickup = localParts(pickupDate);
        const pickupEnd = localParts(pickupEndDate);
        const deadline = localParts(deadlineDate);
        const lane = 39 + (orderIndex % 3) * 18;
        const title = [
          order.platform, order.account_key, order.order_id,
          order.order_type === 'instant' ? 'Instant · manual only' : 'Regular',
          order.pickup_slot_label || order.handover_method
        ].filter(Boolean).join(' · ');
        const deadlineMarker = deadline?.date === dateKey
          ? `<button type="button" class="admin-arrangement-deadline" style="left:${xPercent(deadline.minute)}%;top:${lane}px" title="${escapeHtml(title)} · ship by ${escapeHtml(formatDate(deadlineDate, { hour: '2-digit', minute: '2-digit' }))}" aria-label="${escapeHtml(title)} ship-by deadline"></button>`
          : '';
        const pickupBlock = pickup?.date === dateKey
          ? `<button type="button" class="admin-arrangement-pickup is-${escapeHtml(order.platform)} ${order.order_type === 'instant' ? 'is-instant' : ''}" style="left:${xPercent(pickup.minute)}%;width:${durationPercent(pickup.minute, pickupEnd?.minute || pickup.minute + 60)}%;top:${lane}px" title="${escapeHtml(title)} · pickup ${escapeHtml(order.pickup_slot_label || formatDate(pickupDate, { hour: '2-digit', minute: '2-digit' }))}" aria-label="${escapeHtml(title)} pickup slot"><span>${escapeHtml(order.order_id)}</span></button>`
          : '';
        return deadlineMarker + pickupBlock;
      }).join('');
      return `
        <div class="admin-arrangement-day ${dateKey === localDateKey(new Date()) ? 'is-today' : ''}">
          <div class="admin-arrangement-day-label"><strong>${label.slice(0, 3)}</strong><span>${formatDate(date, { day: '2-digit', month: 'short' })}</span></div>
          <div class="admin-arrangement-day-track">
            <div class="admin-arrangement-hour-grid">${hourTicks}</div>
            ${policyBlocks}${events}
          </div>
        </div>`;
    }).join('');
    refs.map.innerHTML = `<div class="admin-arrangement-map-head"><div></div><div>${hourTicks}</div></div>${rows}`;
  };

  const statusLabel = (order) => {
    if (order.exception_status || order.last_error) return ['Exception', 'is-danger'];
    if (order.order_type === 'instant' && !order.shipment_arranged) return ['Manual action', 'is-warning'];
    if (order.shipment_arranged) return [order.handover_method || 'Arranged', 'is-success'];
    return ['Awaiting', ''];
  };

  const renderOrders = () => {
    const orders = selectedOrders().sort((a, b) => {
      const aTime = parseUtc(a.pickup_start_at)?.getTime() || parseUtc(a.ship_by_at)?.getTime() || 0;
      const bTime = parseUtc(b.pickup_start_at)?.getTime() || parseUtc(b.ship_by_at)?.getTime() || 0;
      return aTime - bTime;
    });
    if (refs.orderMeta) refs.orderMeta.textContent = `${orders.length} order${orders.length === 1 ? '' : 's'} in this view`;
    if (!refs.orders) return;
    if (!orders.length) {
      refs.orders.innerHTML = '<p class="admin-empty">No matching ship-by deadlines or pickup slots fall in this week.</p>';
      return;
    }
    refs.orders.innerHTML = orders.map((order) => {
      const [label, className] = statusLabel(order);
      const pickup = parseUtc(order.pickup_start_at);
      const deadline = parseUtc(order.ship_by_at);
      return `
        <article class="admin-arrangement-order">
          <div class="admin-arrangement-order-platform is-${escapeHtml(order.platform)}">${escapeHtml(String(order.platform).toUpperCase())}</div>
          <div><strong>${escapeHtml(order.order_id)}</strong><small>${escapeHtml(order.account_key || 'Default account')} · ${escapeHtml(order.order_type || 'regular')}</small></div>
          <div><span>Ship by</span><strong>${deadline ? escapeHtml(formatDate(deadline, { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })) : 'Not provided'}</strong></div>
          <div><span>Pickup / handover</span><strong>${pickup ? escapeHtml(formatDate(pickup, { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })) : escapeHtml(order.handover_method || 'Not arranged')}</strong><small>${escapeHtml(order.pickup_slot_label || order.shipping_provider_name || '')}</small></div>
          <span class="admin-status-badge ${className}">${escapeHtml(label)}</span>
        </article>`;
    }).join('');
  };

  const renderMetrics = () => {
    const orders = Array.isArray(state.data?.orders) ? state.data.orders : [];
    const visible = selectedOrders();
    const paused = Boolean(state.data?.hard_set?.automation_paused);
    const enabled = Boolean(state.data?.hard_set?.enabled);
    const automation = !enabled ? 'Not activated' : paused ? 'Paused' : 'Live';
    root.querySelector('[data-arrangement-metric="automation"]').textContent = automation;
    root.querySelector('[data-arrangement-metric="awaiting"]').textContent =
      String(orders.filter((order) => order.order_type !== 'instant' && !order.shipment_arranged && !order.is_processed).length);
    root.querySelector('[data-arrangement-metric="pickups"]').textContent =
      String(visible.filter((order) => parseUtc(order.pickup_start_at)).length);
    root.querySelector('[data-arrangement-metric="exceptions"]').textContent =
      String(orders.filter((order) => order.exception_status || order.last_error).length);
    const note = root.querySelector('[data-arrangement-automation-note]');
    if (note) note.textContent = paused ? 'No regular orders are being arranged' : 'Checked by the two-minute worker';
    if (refs.live) {
      refs.live.classList.toggle('is-paused', paused || !enabled);
      refs.live.innerHTML = `<i></i>${paused ? ' Automation paused' : !enabled ? ' Not activated' : ' Live · 2 min worker'}`;
    }
  };

  const renderAll = () => {
    renderMetrics();
    renderMap();
    renderOrders();
  };

  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, {
      cache: 'no-store', credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(options.headers || {}) },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Request failed.');
    return payload;
  };

  const load = async () => {
    if (state.loading) return;
    state.loading = true;
    refs.refresh?.setAttribute('disabled', '');
    if (refs.live) refs.live.innerHTML = '<i></i> Refreshing';
    try {
      state.data = await requestJson(`${endpoint}?limit=500`);
      renderAll();
    } catch (error) {
      if (refs.live) refs.live.innerHTML = '<i></i> Unavailable';
      if (refs.map) refs.map.innerHTML = `<p class="admin-empty">${escapeHtml(error.message)}</p>`;
    } finally {
      state.loading = false;
      refs.refresh?.removeAttribute('disabled');
    }
  };

  const showEditorAccess = () => {
    const branch = Boolean(state.data?.access?.branch);
    if (refs.unlock) refs.unlock.hidden = branch;
    if (refs.policyForm) refs.policyForm.hidden = !branch;
    if (branch) {
      state.workingPolicy = structuredClone(state.data?.policy?.policy || {});
      renderRuleGrid();
      if (refs.policyMeta) {
        const revision = Number(state.data?.policy?.revision || 0);
        refs.policyMeta.textContent = `Revision ${revision} · ${state.data?.policy?.updated_by || 'environment defaults'}`;
      }
    }
  };

  const methodSelect = (name, value) => `
    <select name="${escapeHtml(name)}">
      ${['PICKUP', 'DROP_OFF', 'HOLD'].map((method) =>
        `<option value="${method}" ${method === value ? 'selected' : ''}>${method === 'DROP_OFF' ? 'Drop-off' : method.charAt(0) + method.slice(1).toLowerCase()}</option>`
      ).join('')}
    </select>`;

  function renderRuleGrid() {
    if (!refs.ruleGrid || !state.workingPolicy) return;
    const tab = state.ruleTab;
    const windows = state.workingPolicy.platforms?.[tab]?.regular?.windows || {};
    const header = tab === 'shopee'
      ? '<span>Day</span><span>Automatic hours</span><span>Handover</span>'
      : '<span>Day</span><span>Automatic hours</span><span>POS</span><span>J&T Express</span><span>J&T Cargo</span>';
    const rows = DAY_LABELS.map((day, index) => {
      const key = String(index + 1);
      const windowRule = windows[key] || { enabled: true, start: '00:00', end: '23:59' };
      const methods = tab === 'shopee'
        ? methodSelect(`method-${key}`, state.workingPolicy.platforms.shopee.regular.methods[key])
        : CARRIERS.map(([carrier]) => methodSelect(`${carrier}-${key}`,
          state.workingPolicy.platforms.tiktok.regular.carriers[carrier].methods[key])).join('');
      return `
        <div class="admin-arrangement-rule-row" data-rule-day="${key}">
          <label class="admin-arrangement-day-toggle"><input type="checkbox" name="enabled-${key}" ${windowRule.enabled ? 'checked' : ''}><span>${day}</span></label>
          <div class="admin-arrangement-time-range"><input type="time" name="start-${key}" value="${escapeHtml(windowRule.start)}"><span>to</span><input type="time" name="end-${key}" value="${escapeHtml(windowRule.end)}"></div>
          ${methods}
        </div>`;
    }).join('');
    refs.ruleGrid.className = `admin-arrangement-rule-grid is-${tab}`;
    refs.ruleGrid.innerHTML = `<div class="admin-arrangement-rule-head">${header}</div>${rows}`;
  }

  const collectRuleGrid = () => {
    const tab = state.ruleTab;
    refs.ruleGrid?.querySelectorAll('[data-rule-day]').forEach((row) => {
      const key = row.dataset.ruleDay;
      const regular = state.workingPolicy.platforms[tab].regular;
      regular.windows[key] = {
        enabled: Boolean(row.querySelector(`[name="enabled-${key}"]`)?.checked),
        start: row.querySelector(`[name="start-${key}"]`)?.value || '00:00',
        end: row.querySelector(`[name="end-${key}"]`)?.value || '23:59'
      };
      if (tab === 'shopee') {
        regular.methods[key] = row.querySelector(`[name="method-${key}"]`)?.value || 'HOLD';
      } else {
        CARRIERS.forEach(([carrier]) => {
          regular.carriers[carrier].methods[key] = row.querySelector(`[name="${carrier}-${key}"]`)?.value || 'HOLD';
        });
      }
    });
  };

  refs.refresh?.addEventListener('click', () => load());
  root.querySelectorAll('[data-arrangement-platform]').forEach((button) => button.addEventListener('click', () => {
    state.platform = button.dataset.arrangementPlatform || 'all';
    root.querySelectorAll('[data-arrangement-platform]').forEach((item) => item.classList.toggle('is-active', item === button));
    renderAll();
  }));
  root.querySelectorAll('[data-arrangement-type]').forEach((button) => button.addEventListener('click', () => {
    state.type = button.dataset.arrangementType || 'all';
    root.querySelectorAll('[data-arrangement-type]').forEach((item) => item.classList.toggle('is-active', item === button));
    renderAll();
  }));
  root.querySelectorAll('[data-arrangement-week]').forEach((button) => button.addEventListener('click', () => {
    state.weekStart = addDays(state.weekStart, Number(button.dataset.arrangementWeek || 0) * 7);
    renderAll();
  }));
  root.querySelector('[data-arrangement-today]')?.addEventListener('click', () => {
    state.weekStart = startOfWeek(new Date());
    renderAll();
  });
  refs.edit?.addEventListener('click', () => {
    if (refs.editor) refs.editor.hidden = false;
    showEditorAccess();
  });
  root.querySelectorAll('[data-arrangement-editor-close]').forEach((button) => button.addEventListener('click', () => {
    if (refs.editor) refs.editor.hidden = true;
  }));
  refs.unlockForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(refs.unlockForm);
    try {
      await requestJson('../api/hard-set/?action=unlock', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.get('username'), password: form.get('password') })
      });
      await load();
      showEditorAccess();
    } catch (error) {
      if (refs.unlock) refs.unlock.insertAdjacentHTML('beforeend', `<p class="admin-form-error">${escapeHtml(error.message)}</p>`);
    }
  });
  root.querySelectorAll('[data-arrangement-rule-tab]').forEach((button) => button.addEventListener('click', () => {
    collectRuleGrid();
    state.ruleTab = button.dataset.arrangementRuleTab || 'shopee';
    root.querySelectorAll('[data-arrangement-rule-tab]').forEach((item) => item.classList.toggle('is-active', item === button));
    renderRuleGrid();
  }));
  refs.policyForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    collectRuleGrid();
    if (refs.error) refs.error.hidden = true;
    refs.save?.setAttribute('disabled', '');
    try {
      state.data = await requestJson(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy: state.workingPolicy,
          expected_revision: Number(state.data?.policy?.revision || 0)
        })
      });
      renderAll();
      if (refs.editor) refs.editor.hidden = true;
    } catch (error) {
      if (refs.error) {
        refs.error.textContent = error.message;
        refs.error.hidden = false;
      }
    } finally {
      refs.save?.removeAttribute('disabled');
    }
  });

  window.addEventListener('jg-shipment-arrangement-refresh', () => load());
  window.setInterval(() => {
    if (!document.hidden && root.classList.contains('is-active')) load();
  }, 60000);
  if (root.classList.contains('is-active')) load();
});
