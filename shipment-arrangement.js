document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-shipment-arrangement]');
  if (!root) return;

  const endpoint = root.dataset.shipmentArrangementEndpoint || '../api/shipment-arrangement/';
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const CARRIERS = [
    ['pos_indonesia', 'POS'],
    ['jnt_express', 'J&T Express'],
    ['jnt_cargo', 'J&T Cargo']
  ];
  const state = {
    data: null,
    weekStart: startOfWeek(new Date()),
    tab: 'schedule',
    orderFilter: null,
    workingPolicy: null,
    loading: false
  };
  const refs = {
    live: root.querySelector('[data-arrangement-live]'),
    refresh: root.querySelector('[data-arrangement-refresh]'),
    map: root.querySelector('[data-arrangement-map]'),
    orders: root.querySelector('[data-arrangement-orders]'),
    orderMeta: root.querySelector('[data-arrangement-order-meta]'),
    orderPanel: root.querySelector('[data-arrangement-order-panel]'),
    weekLabel: root.querySelector('[data-arrangement-week-label]'),
    unlock: root.querySelector('[data-arrangement-unlock]'),
    unlockForm: root.querySelector('[data-arrangement-unlock-form]'),
    policyForm: root.querySelector('[data-arrangement-policy-form]'),
    ruleGrid: root.querySelector('[data-arrangement-rule-grid]'),
    advancedGrid: root.querySelector('[data-arrangement-advanced-grid]'),
    policyMeta: root.querySelector('[data-arrangement-policy-meta]'),
    error: root.querySelector('[data-arrangement-error]'),
    save: root.querySelector('[data-arrangement-save]'),
    applyMonday: root.querySelector('[data-arrangement-apply-monday]'),
    attentionCopy: root.querySelector('[data-arrangement-attention-copy]'),
    review: root.querySelector('[data-arrangement-review]')
  };

  function jakartaParts(value, includeTime = false) {
    const options = {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...(includeTime ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } : {})
    };
    const parts = new Intl.DateTimeFormat('en-CA', options)
      .formatToParts(new Date(value))
      .reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
    return {
      date: `${parts.year}-${parts.month}-${parts.day}`,
      hour: Number(parts.hour || 0),
      minute: Number(parts.minute || 0)
    };
  }

  function startOfWeek(value) {
    const dateKey = jakartaParts(value).date;
    const calendarDay = new Date(`${dateKey}T12:00:00Z`).getUTCDay() || 7;
    return new Date(new Date(`${dateKey}T00:00:00+07:00`).getTime() - ((calendarDay - 1) * 86400000));
  }

  const addDays = (date, days) => new Date(new Date(date).getTime() + (days * 86400000));
  const weekEnd = () => addDays(state.weekStart, 7);
  const dateKey = (date) => jakartaParts(date).date;

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

  const pickupRule = (platform, dayNumber, policy = state.data?.policy?.policy) =>
    String(policy?.platforms?.[platform]?.regular?.pickup_days?.[String(dayNumber)] || 'EARLIEST_WEEKDAY');

  const pickupRuleLabel = (rule) => {
    if (rule === 'EARLIEST_WEEKDAY') return 'Next available weekday';
    const index = Math.max(1, Math.min(7, Number(rule))) - 1;
    return DAYS[index];
  };

  const selectedOrders = () => {
    const orders = Array.isArray(state.data?.orders) ? state.data.orders : [];
    return orders.filter((order) => {
      const dates = [parseUtc(order.pickup_start_at), parseUtc(order.ship_by_at), parseUtc(order.updated_at)].filter(Boolean);
      return dates.some((date) => date >= state.weekStart && date < weekEnd());
    });
  };

  const orderGroupKey = (order) => {
    const pickup = parseUtc(order.pickup_start_at);
    const displayDate = pickup || parseUtc(order.ship_by_at) || parseUtc(order.updated_at) || state.weekStart;
    const [status] = statusLabel(order);
    const platform = String(order.platform || '').toLowerCase();
    const time = pickup ? formatDate(pickup, { hour: '2-digit', minute: '2-digit' }) : '—';
    return [dateKey(displayDate), platform, time, status].join('|');
  };

  const renderSchedule = () => {
    if (!refs.map || !state.data) return;
    const orders = selectedOrders().sort((left, right) => {
      const a = parseUtc(left.pickup_start_at)?.getTime() || parseUtc(left.ship_by_at)?.getTime() || parseUtc(left.updated_at)?.getTime() || 0;
      const b = parseUtc(right.pickup_start_at)?.getTime() || parseUtc(right.ship_by_at)?.getTime() || parseUtc(right.updated_at)?.getTime() || 0;
      return a - b;
    });
    if (refs.weekLabel) {
      refs.weekLabel.textContent = `${formatDate(state.weekStart, { day: 'numeric', month: 'short' })} – ${formatDate(addDays(state.weekStart, 6), { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }

    const groups = new Map();
    orders.forEach((order) => {
      const pickup = parseUtc(order.pickup_start_at);
      const fallbackDate = parseUtc(order.ship_by_at) || parseUtc(order.updated_at) || state.weekStart;
      const displayDate = pickup || fallbackDate;
      const [status, statusClass] = statusLabel(order);
      const platform = String(order.platform || '').toLowerCase();
      const time = pickup ? formatDate(pickup, { hour: '2-digit', minute: '2-digit' }) : '—';
      const key = orderGroupKey(order);
      if (!groups.has(key)) {
        groups.set(key, { key, date: displayDate, platform, time, status, statusClass, orders: [] });
      }
      groups.get(key).orders.push(order);
    });

    if (!groups.size) {
      refs.map.innerHTML = '<div class="admin-arrangement-agenda-empty"><strong>No pickups this week</strong><p>There are no scheduled or waiting marketplace orders in this date range.</p></div>';
      return;
    }

    const rows = [...groups.values()].map((group) => {
      const count = group.orders.length;
      const platformLabel = group.platform === 'shopee' ? 'Shopee' : group.platform === 'tiktok' ? 'TikTok Shop' : group.platform || 'Marketplace';
      return `
        <tr>
          <td><strong>${escapeHtml(formatDate(group.date, { weekday: 'short', day: '2-digit', month: 'short' }))}</strong></td>
          <td><span class="admin-arrangement-marketplace is-${escapeHtml(group.platform)}">${escapeHtml(platformLabel)}</span></td>
          <td>${escapeHtml(group.time)}</td>
          <td>
            <strong>${count} order${count === 1 ? '' : 's'}</strong>
            <button type="button" data-arrangement-order-group="${escapeHtml(group.key)}">View orders</button>
          </td>
          <td><span class="admin-arrangement-row-status ${escapeHtml(group.statusClass)}">${escapeHtml(group.status)}</span></td>
        </tr>`;
    }).join('');

    refs.map.innerHTML = `
      <div class="admin-arrangement-agenda-scroll">
        <table>
          <thead><tr><th>Date</th><th>Marketplace</th><th>Pickup time</th><th>Orders</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="admin-arrangement-agenda-end">No other pickups this week.</p>`;
  };

  const statusLabel = (order) => {
    if (order.exception_status || order.last_error) return ['Needs attention', 'is-attention'];
    if (order.shipment_arranged || order.pickup_start_at) return ['Scheduled', 'is-scheduled'];
    return ['Waiting', 'is-waiting'];
  };

  const renderOrders = () => {
    let orders = selectedOrders().sort((left, right) => {
      const a = parseUtc(left.pickup_start_at)?.getTime() || parseUtc(left.ship_by_at)?.getTime() || 0;
      const b = parseUtc(right.pickup_start_at)?.getTime() || parseUtc(right.ship_by_at)?.getTime() || 0;
      return a - b;
    });
    if (state.orderFilter === 'attention') {
      orders = orders.filter((order) => order.exception_status || order.last_error);
    } else if (state.orderFilter) {
      orders = orders.filter((order) => orderGroupKey(order) === state.orderFilter);
    }
    if (refs.orderMeta) refs.orderMeta.textContent = `${orders.length} order${orders.length === 1 ? '' : 's'}`;
    if (!refs.orders) return;
    refs.orders.innerHTML = orders.length ? orders.map((order) => {
      const [label, className] = statusLabel(order);
      const pickup = parseUtc(order.pickup_start_at);
      const deadline = parseUtc(order.ship_by_at);
      return `
        <article class="admin-arrangement-order">
          <span class="admin-arrangement-order-platform is-${escapeHtml(order.platform)}">${escapeHtml(order.platform)}</span>
          <div><strong>${escapeHtml(order.order_id)}</strong><small>${escapeHtml(order.account_key || '')} · ${escapeHtml(order.order_type || 'regular')}</small></div>
          <div><span>Ship by</span><strong>${deadline ? escapeHtml(formatDate(deadline, { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })) : '—'}</strong></div>
          <div><span>Pickup</span><strong>${pickup ? escapeHtml(formatDate(pickup, { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })) : 'Not arranged'}</strong></div>
          <span class="admin-status-badge ${className}">${escapeHtml(label)}</span>
        </article>`;
    }).join('') : '<p class="admin-empty">No matching orders in this week.</p>';
  };

  const renderStatus = () => {
    const orders = Array.isArray(state.data?.orders) ? state.data.orders : [];
    const visible = selectedOrders();
    const exceptions = orders.filter((order) => order.exception_status || order.last_error);
    const paused = Boolean(state.data?.hard_set?.automation_paused);
    const enabled = Boolean(state.data?.hard_set?.enabled);
    root.querySelector('[data-arrangement-metric="awaiting"]').textContent =
      String(orders.filter((order) => order.order_type !== 'instant' && !order.shipment_arranged && !order.is_processed).length);
    root.querySelector('[data-arrangement-metric="pickups"]').textContent =
      String(visible.filter((order) => parseUtc(order.pickup_start_at)).length);
    root.querySelector('[data-arrangement-metric="exceptions"]').textContent =
      String(exceptions.length);
    if (refs.attentionCopy) {
      refs.attentionCopy.textContent = exceptions.length
        ? `${exceptions.length} order${exceptions.length === 1 ? '' : 's'} could not be assigned to the selected pickup day.`
        : 'No orders need attention right now.';
    }
    if (refs.review) refs.review.hidden = exceptions.length === 0;
    if (refs.live) {
      refs.live.classList.toggle('is-paused', paused || !enabled);
      refs.live.innerHTML = `<i></i>${paused ? ' Paused' : !enabled ? ' Not active' : ' Live · 2 min'}`;
    }
  };

  const renderAll = () => {
    renderStatus();
    renderSchedule();
    renderOrders();
  };

  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, {
      cache: 'no-store',
      credentials: 'same-origin',
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
    try {
      state.data = await requestJson(`${endpoint}?limit=500`);
      renderAll();
      if (state.tab === 'rules') showEditorAccess();
    } catch (error) {
      if (refs.live) refs.live.innerHTML = '<i></i> Unavailable';
      if (refs.map) refs.map.innerHTML = `<p class="admin-empty">${escapeHtml(error.message)}</p>`;
    } finally {
      state.loading = false;
      refs.refresh?.removeAttribute('disabled');
    }
  };

  const dayOptions = (selected) => [
    ['EARLIEST_WEEKDAY', 'Next available weekday'],
    ...DAYS.map((day, index) => [String(index + 1), day])
  ].map(([value, label]) => `<option value="${value}" ${String(selected) === value ? 'selected' : ''}>${label}</option>`).join('');

  const methodOptions = (selected) => ['PICKUP', 'DROP_OFF', 'HOLD']
    .map((value) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${value === 'DROP_OFF' ? 'Drop-off' : value.charAt(0) + value.slice(1).toLowerCase()}</option>`)
    .join('');

  const renderEditor = () => {
    if (!state.workingPolicy || !refs.ruleGrid) return;
    refs.ruleGrid.className = 'admin-arrangement-pickup-editor';
    refs.ruleGrid.innerHTML = `
      <div class="admin-arrangement-editor-head"><span>Order arranged</span><span>Shopee pickup</span><span>TikTok pickup</span></div>
      ${DAYS.map((day, index) => {
        const key = String(index + 1);
        return `
          <div class="admin-arrangement-editor-row" data-pickup-rule-day="${key}">
            <strong>${day}</strong>
            <label><span>Shopee</span><select name="shopee-pickup-${key}">${dayOptions(pickupRule('shopee', key, state.workingPolicy))}</select></label>
            <label><span>TikTok</span><select name="tiktok-pickup-${key}">${dayOptions(pickupRule('tiktok', key, state.workingPolicy))}</select></label>
          </div>`;
      }).join('')}`;
    renderAdvancedEditor();
  };

  const renderAdvancedEditor = () => {
    if (!refs.advancedGrid || !state.workingPolicy) return;
    const platformSection = (platform) => {
      const regular = state.workingPolicy.platforms[platform].regular;
      return `
        <section class="admin-arrangement-advanced-platform">
          <h4>${platform === 'shopee' ? 'Shopee' : 'TikTok Shop'}</h4>
          ${DAYS.map((day, index) => {
            const key = String(index + 1);
            const windowRule = regular.windows[key];
            const methodFields = platform === 'shopee'
              ? `<select name="shopee-method-${key}">${methodOptions(regular.methods[key])}</select>`
              : CARRIERS.map(([carrier, label]) => `<label><span>${label}</span><select name="${carrier}-${key}">${methodOptions(regular.carriers[carrier].methods[key])}</select></label>`).join('');
            return `
              <div class="admin-arrangement-advanced-row" data-advanced-platform="${platform}" data-advanced-day="${key}">
                <label class="admin-arrangement-day-toggle"><input type="checkbox" name="${platform}-enabled-${key}" ${windowRule.enabled ? 'checked' : ''}><span>${day.slice(0, 3)}</span></label>
                <div class="admin-arrangement-time-range"><input type="time" name="${platform}-start-${key}" value="${escapeHtml(windowRule.start)}"><span>–</span><input type="time" name="${platform}-end-${key}" value="${escapeHtml(windowRule.end)}"></div>
                <div class="admin-arrangement-method-fields">${methodFields}</div>
              </div>`;
          }).join('')}
        </section>`;
    };
    refs.advancedGrid.innerHTML = platformSection('shopee') + platformSection('tiktok');
  };

  const collectEditor = () => {
    refs.ruleGrid?.querySelectorAll('[data-pickup-rule-day]').forEach((row) => {
      const key = row.dataset.pickupRuleDay;
      ['shopee', 'tiktok'].forEach((platform) => {
        state.workingPolicy.platforms[platform].regular.pickup_days[key] =
          row.querySelector(`[name="${platform}-pickup-${key}"]`)?.value || 'EARLIEST_WEEKDAY';
      });
    });
    refs.advancedGrid?.querySelectorAll('[data-advanced-platform]').forEach((row) => {
      const platform = row.dataset.advancedPlatform;
      const key = row.dataset.advancedDay;
      const regular = state.workingPolicy.platforms[platform].regular;
      regular.windows[key] = {
        enabled: Boolean(row.querySelector(`[name="${platform}-enabled-${key}"]`)?.checked),
        start: row.querySelector(`[name="${platform}-start-${key}"]`)?.value || '00:00',
        end: row.querySelector(`[name="${platform}-end-${key}"]`)?.value || '23:59'
      };
      if (platform === 'shopee') {
        regular.methods[key] = row.querySelector(`[name="shopee-method-${key}"]`)?.value || 'PICKUP';
      } else {
        CARRIERS.forEach(([carrier]) => {
          regular.carriers[carrier].methods[key] = row.querySelector(`[name="${carrier}-${key}"]`)?.value || 'PICKUP';
        });
      }
    });
  };

  const showEditorAccess = () => {
    const branch = Boolean(state.data?.access?.branch);
    if (refs.unlock) refs.unlock.hidden = branch;
    if (refs.policyForm) refs.policyForm.hidden = !branch;
    if (refs.applyMonday) refs.applyMonday.hidden = !branch;
    if (!branch) return;
    state.workingPolicy = structuredClone(state.data?.policy?.policy || {});
    renderEditor();
    if (refs.policyMeta) {
      refs.policyMeta.textContent = `Revision ${Number(state.data?.policy?.revision || 0)} · ${state.data?.policy?.updated_by || 'defaults'}`;
    }
  };

  const setTab = (tab) => {
    state.tab = tab === 'rules' ? 'rules' : 'schedule';
    root.querySelectorAll('[data-arrangement-tab]').forEach((button) => {
      const active = button.dataset.arrangementTab === state.tab;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    root.querySelectorAll('[data-arrangement-page]').forEach((page) => {
      page.hidden = page.dataset.arrangementPage !== state.tab;
    });
    if (state.tab === 'rules') showEditorAccess();
  };

  refs.refresh?.addEventListener('click', load);
  root.querySelectorAll('[data-arrangement-tab]').forEach((button) => button.addEventListener('click', () => {
    setTab(button.dataset.arrangementTab);
  }));
  root.querySelectorAll('[data-arrangement-week]').forEach((button) => button.addEventListener('click', () => {
    state.weekStart = addDays(state.weekStart, Number(button.dataset.arrangementWeek || 0) * 7);
    state.orderFilter = null;
    renderAll();
  }));
  root.querySelector('[data-arrangement-today]')?.addEventListener('click', () => {
    state.weekStart = startOfWeek(new Date());
    state.orderFilter = null;
    renderAll();
  });
  refs.applyMonday?.addEventListener('click', () => {
    const monday = refs.ruleGrid?.querySelector('[data-pickup-rule-day="1"]');
    if (!monday) return;
    ['shopee', 'tiktok'].forEach((platform) => {
      const value = monday.querySelector(`[name="${platform}-pickup-1"]`)?.value;
      refs.ruleGrid.querySelectorAll(`[name^="${platform}-pickup-"]`).forEach((select) => {
        select.value = value;
      });
    });
  });
  root.querySelector('[data-arrangement-cancel]')?.addEventListener('click', () => {
    state.workingPolicy = null;
    setTab('schedule');
  });
  refs.review?.addEventListener('click', () => {
    state.orderFilter = 'attention';
    renderOrders();
    if (refs.orderPanel) {
      refs.orderPanel.open = true;
      refs.orderPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  refs.map?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-arrangement-order-group]');
    if (!button) return;
    state.orderFilter = button.dataset.arrangementOrderGroup || null;
    renderOrders();
    if (refs.orderPanel) {
      refs.orderPanel.open = true;
      refs.orderPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  refs.unlockForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(refs.unlockForm);
    try {
      await requestJson('../api/hard-set/?action=unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.get('username'), password: form.get('password') })
      });
      await load();
    } catch (error) {
      const existing = refs.unlock.querySelector('.admin-form-error');
      if (existing) existing.remove();
      refs.unlock.insertAdjacentHTML('beforeend', `<p class="admin-form-error">${escapeHtml(error.message)}</p>`);
    }
  });
  refs.policyForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    collectEditor();
    if (refs.error) refs.error.hidden = true;
    refs.save?.setAttribute('disabled', '');
    try {
      state.data = await requestJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy: state.workingPolicy,
          expected_revision: Number(state.data?.policy?.revision || 0)
        })
      });
      renderAll();
      state.workingPolicy = null;
      setTab('schedule');
    } catch (error) {
      if (refs.error) {
        refs.error.textContent = error.message;
        refs.error.hidden = false;
      }
    } finally {
      refs.save?.removeAttribute('disabled');
    }
  });

  window.addEventListener('jg-shipment-arrangement-refresh', load);
  window.setInterval(() => {
    if (!document.hidden && root.classList.contains('is-active')) load();
  }, 60000);
  if (root.classList.contains('is-active')) load();
});
