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
    advancedPlatform: 'shopee',
    workingPolicy: null,
    loading: false
  };
  const refs = {
    live: root.querySelector('[data-arrangement-live]'),
    refresh: root.querySelector('[data-arrangement-refresh]'),
    map: root.querySelector('[data-arrangement-map]'),
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
    attentionCopy: root.querySelector('[data-arrangement-attention-copy]')
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

  const statusLabel = (order) => {
    if (order.exception_status || order.last_error) return ['Needs attention', 'is-attention'];
    if (order.shipment_arranged || order.pickup_start_at) return ['Scheduled', 'is-scheduled'];
    return ['Waiting', 'is-waiting'];
  };

  const orderDisplayDate = (order) => {
    const pickup = parseUtc(order.pickup_start_at);
    const deadline = parseUtc(order.ship_by_at);
    const updated = parseUtc(order.updated_at);
    return [pickup, deadline, updated].find((date) => date && date >= state.weekStart && date < weekEnd())
      || pickup
      || deadline
      || updated
      || state.weekStart;
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

    if (!orders.length) {
      refs.map.innerHTML = '<div class="admin-arrangement-agenda-empty"><strong>No pickups this week</strong><p>There are no scheduled or waiting marketplace orders in this date range.</p></div>';
      return;
    }

    refs.map.innerHTML = `
      <div class="admin-arrangement-timeline-scroll">
        <div class="admin-arrangement-timeline">
          <div class="admin-arrangement-time-axis" aria-hidden="true">
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
          </div>
          ${DAYS.map((day, index) => {
            const date = addDays(state.weekStart, index);
            const key = dateKey(date);
            const dayOrders = orders.filter((order) => dateKey(orderDisplayDate(order)) === key);
            const events = dayOrders.map((order) => {
              const pickup = parseUtc(order.pickup_start_at);
              const deadline = parseUtc(order.ship_by_at);
              const moment = orderDisplayDate(order);
              const parts = jakartaParts(moment, true);
              const start = Math.min(21, Math.max(1, parts.hour + 1));
              const [status, statusClass] = statusLabel(order);
              const platform = String(order.platform || '').toLowerCase();
              const platformLabel = platform === 'shopee' ? 'Shopee' : platform === 'tiktok' ? 'TikTok Shop' : platform || 'Marketplace';
              const time = pickup
                ? formatDate(pickup, { hour: '2-digit', minute: '2-digit' })
                : deadline
                  ? `Ship by ${formatDate(deadline, { hour: '2-digit', minute: '2-digit' })}`
                  : formatDate(moment, { hour: '2-digit', minute: '2-digit' });
              return `
                <article class="admin-arrangement-timeline-event is-${escapeHtml(platform)} ${escapeHtml(statusClass)}" style="--event-start:${start}">
                  <header>
                    <span>${escapeHtml(platformLabel)}</span>
                    <strong>${escapeHtml(time)}</strong>
                  </header>
                  <b>${escapeHtml(order.order_id)}</b>
                  <small>${escapeHtml(order.account_key || '')} · ${escapeHtml(order.order_type || 'regular')}</small>
                  <footer>
                    <span>${escapeHtml(status)}</span>
                    <span>${deadline ? `Ship by ${escapeHtml(formatDate(deadline, { weekday: 'short', hour: '2-digit', minute: '2-digit' }))}` : 'No ship-by time'}</span>
                  </footer>
                  ${(order.last_error || order.exception_status) ? `<em>${escapeHtml(order.last_error || order.exception_status)}</em>` : ''}
                </article>`;
            }).join('');
            return `
              <section class="admin-arrangement-timeline-day ${key === dateKey(new Date()) ? 'is-today' : ''}">
                <header>
                  <strong>${day.slice(0, 3)}</strong>
                  <span>${formatDate(date, { day: '2-digit', month: 'short' })}</span>
                  <small>${dayOrders.length} order${dayOrders.length === 1 ? '' : 's'}</small>
                </header>
                <div class="admin-arrangement-timeline-track">
                  ${events || '<p>No marketplace activity</p>'}
                </div>
              </section>`;
          }).join('')}
        </div>
      </div>
      <p class="admin-arrangement-agenda-end">All orders in this week are shown directly on the timeline.</p>`;
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
    if (refs.live) {
      refs.live.classList.toggle('is-paused', paused || !enabled);
      refs.live.innerHTML = `<i></i>${paused ? ' Paused' : !enabled ? ' Not active' : ' Live · 2 min'}`;
    }
  };

  const renderAll = () => {
    renderStatus();
    renderSchedule();
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
      <div class="admin-arrangement-rule-card-grid">
        ${DAYS.map((day, index) => {
          const key = String(index + 1);
          return `
            <article class="admin-arrangement-rule-editor-card" data-pickup-rule-day="${key}">
              <header><span>Orders arranged</span><strong>${day}</strong></header>
              <label class="is-shopee">
                <span>Shopee</span>
                <small>Pickup on</small>
                <select name="shopee-pickup-${key}">${dayOptions(pickupRule('shopee', key, state.workingPolicy))}</select>
              </label>
              <label class="is-tiktok">
                <span>TikTok Shop</span>
                <small>Pickup on</small>
                <select name="tiktok-pickup-${key}">${dayOptions(pickupRule('tiktok', key, state.workingPolicy))}</select>
              </label>
            </article>`;
        }).join('')}
      </div>`;
    renderAdvancedEditor();
  };

  const renderAdvancedEditor = () => {
    if (!refs.advancedGrid || !state.workingPolicy) return;
    const platformSection = (platform) => {
      const regular = state.workingPolicy.platforms[platform].regular;
      const active = state.advancedPlatform === platform;
      return `
        <section class="admin-arrangement-advanced-platform is-${platform}" data-advanced-platform-panel="${platform}" ${active ? '' : 'hidden'}>
          <header>
            <div><h4>${platform === 'shopee' ? 'Shopee' : 'TikTok Shop'}</h4><p>Automatic arrangement window and handover method by day.</p></div>
            <button type="button" class="admin-arrangement-text-button" data-arrangement-copy-advanced="${platform}">Apply Monday settings to all days</button>
          </header>
          <div class="admin-arrangement-advanced-table">
            <div class="admin-arrangement-advanced-head is-${platform}">
              <span>Day</span><span>Automatic hours</span>
              ${platform === 'shopee'
                ? '<span>Handover</span>'
                : '<span>POS</span><span>J&amp;T Express</span><span>J&amp;T Cargo</span>'}
            </div>
            ${DAYS.map((day, index) => {
              const key = String(index + 1);
              const windowRule = regular.windows[key];
              const methodFields = platform === 'shopee'
                ? `<label><span>Handover</span><select name="shopee-method-${key}">${methodOptions(regular.methods[key])}</select></label>`
                : CARRIERS.map(([carrier, label]) => `<label><span>${label}</span><select name="${carrier}-${key}">${methodOptions(regular.carriers[carrier].methods[key])}</select></label>`).join('');
              return `
                <div class="admin-arrangement-advanced-row is-${platform}" data-advanced-platform="${platform}" data-advanced-day="${key}">
                  <label class="admin-arrangement-day-toggle"><input type="checkbox" name="${platform}-enabled-${key}" ${windowRule.enabled ? 'checked' : ''}><span>${day}</span></label>
                  <div class="admin-arrangement-time-range">
                    <label><span>Start</span><input type="time" name="${platform}-start-${key}" value="${escapeHtml(windowRule.start)}"></label>
                    <span>to</span>
                    <label><span>End</span><input type="time" name="${platform}-end-${key}" value="${escapeHtml(windowRule.end)}"></label>
                  </div>
                  <div class="admin-arrangement-method-fields">${methodFields}</div>
                </div>`;
            }).join('')}
          </div>
        </section>`;
    };
    refs.advancedGrid.innerHTML = `
      <div class="admin-arrangement-advanced-tabs" role="tablist" aria-label="Marketplace advanced settings">
        <button type="button" class="${state.advancedPlatform === 'shopee' ? 'is-active' : ''}" data-advanced-platform-tab="shopee">Shopee</button>
        <button type="button" class="${state.advancedPlatform === 'tiktok' ? 'is-active' : ''}" data-advanced-platform-tab="tiktok">TikTok Shop</button>
      </div>
      ${platformSection('shopee')}
      ${platformSection('tiktok')}`;
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
    renderAll();
  }));
  root.querySelector('[data-arrangement-today]')?.addEventListener('click', () => {
    state.weekStart = startOfWeek(new Date());
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
  refs.advancedGrid?.addEventListener('click', (event) => {
    const platformTab = event.target.closest('[data-advanced-platform-tab]');
    if (platformTab) {
      collectEditor();
      state.advancedPlatform = platformTab.dataset.advancedPlatformTab === 'tiktok' ? 'tiktok' : 'shopee';
      renderAdvancedEditor();
      return;
    }

    const copyButton = event.target.closest('[data-arrangement-copy-advanced]');
    if (!copyButton) return;
    const platform = copyButton.dataset.arrangementCopyAdvanced;
    const monday = refs.advancedGrid.querySelector(`[data-advanced-platform="${platform}"][data-advanced-day="1"]`);
    if (!monday) return;
    refs.advancedGrid.querySelectorAll(`[data-advanced-platform="${platform}"]`).forEach((row) => {
      if (row === monday) return;
      const enabled = monday.querySelector(`[name="${platform}-enabled-1"]`)?.checked;
      const start = monday.querySelector(`[name="${platform}-start-1"]`)?.value;
      const end = monday.querySelector(`[name="${platform}-end-1"]`)?.value;
      const key = row.dataset.advancedDay;
      const enabledInput = row.querySelector(`[name="${platform}-enabled-${key}"]`);
      if (enabledInput) enabledInput.checked = enabled;
      const startInput = row.querySelector(`[name="${platform}-start-${key}"]`);
      if (startInput) startInput.value = start;
      const endInput = row.querySelector(`[name="${platform}-end-${key}"]`);
      if (endInput) endInput.value = end;
      if (platform === 'shopee') {
        const mondayMethod = monday.querySelector('[name="shopee-method-1"]')?.value;
        const method = row.querySelector(`[name="shopee-method-${key}"]`);
        if (method) method.value = mondayMethod;
      } else {
        CARRIERS.forEach(([carrier]) => {
          const mondayMethod = monday.querySelector(`[name="${carrier}-1"]`)?.value;
          const method = row.querySelector(`[name="${carrier}-${key}"]`);
          if (method) method.value = mondayMethod;
        });
      }
    });
  });
  root.querySelector('[data-arrangement-cancel]')?.addEventListener('click', () => {
    state.workingPolicy = null;
    setTab('schedule');
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
