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
    platform: 'all',
    workingPolicy: null,
    loading: false
  };
  const refs = {
    live: root.querySelector('[data-arrangement-live]'),
    refresh: root.querySelector('[data-arrangement-refresh]'),
    edit: root.querySelector('[data-arrangement-edit]'),
    ruleSummary: root.querySelector('[data-arrangement-rule-summary]'),
    map: root.querySelector('[data-arrangement-map]'),
    orders: root.querySelector('[data-arrangement-orders]'),
    orderMeta: root.querySelector('[data-arrangement-order-meta]'),
    weekLabel: root.querySelector('[data-arrangement-week-label]'),
    editor: root.querySelector('[data-arrangement-editor]'),
    unlock: root.querySelector('[data-arrangement-unlock]'),
    unlockForm: root.querySelector('[data-arrangement-unlock-form]'),
    policyForm: root.querySelector('[data-arrangement-policy-form]'),
    ruleGrid: root.querySelector('[data-arrangement-rule-grid]'),
    advancedGrid: root.querySelector('[data-arrangement-advanced-grid]'),
    policyMeta: root.querySelector('[data-arrangement-policy-meta]'),
    error: root.querySelector('[data-arrangement-error]'),
    save: root.querySelector('[data-arrangement-save]')
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
  const todayDayNumber = () => {
    const key = dateKey(new Date());
    return (new Date(`${key}T12:00:00Z`).getUTCDay() || 7);
  };

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

  const platformPolicy = (platform) => state.data?.policy?.policy?.platforms?.[platform]?.regular || {};
  const pickupRule = (platform, dayNumber, policy = state.data?.policy?.policy) =>
    String(policy?.platforms?.[platform]?.regular?.pickup_days?.[String(dayNumber)] || 'EARLIEST_WEEKDAY');

  const pickupRuleLabel = (rule, compact = false) => {
    if (rule === 'EARLIEST_WEEKDAY') return compact ? 'Next weekday' : 'Earliest available weekday';
    const index = Math.max(1, Math.min(7, Number(rule))) - 1;
    return compact ? DAYS[index].slice(0, 3) : DAYS[index];
  };

  const selectedOrders = () => {
    const orders = Array.isArray(state.data?.orders) ? state.data.orders : [];
    return orders.filter((order) => {
      if (state.platform !== 'all' && String(order.platform).toLowerCase() !== state.platform) return false;
      const dates = [parseUtc(order.pickup_start_at), parseUtc(order.ship_by_at), parseUtc(order.updated_at)].filter(Boolean);
      return dates.some((date) => date >= state.weekStart && date < weekEnd());
    });
  };

  const renderRuleSummary = () => {
    if (!refs.ruleSummary || !state.data) return;
    const activePlatforms = state.platform === 'all' ? ['shopee', 'tiktok'] : [state.platform];
    const today = todayDayNumber();
    refs.ruleSummary.innerHTML = DAYS.map((day, index) => {
      const dayNumber = index + 1;
      const routes = activePlatforms.map((platform) => {
        const rule = pickupRule(platform, dayNumber);
        return `
          <div class="admin-arrangement-rule-route is-${platform}">
            <span>${platform === 'shopee' ? 'Shopee' : 'TikTok'}</span>
            <strong>${escapeHtml(pickupRuleLabel(rule, true))}</strong>
          </div>`;
      }).join('');
      return `
        <article class="admin-arrangement-rule-card ${dayNumber === today ? 'is-today' : ''}">
          <div class="admin-arrangement-rule-day">
            <span>Arrange</span>
            <strong>${day.slice(0, 3)}</strong>
            ${dayNumber === today ? '<small>Today</small>' : ''}
          </div>
          <span class="admin-arrangement-rule-arrow" aria-hidden="true">→</span>
          <div class="admin-arrangement-rule-routes">${routes}</div>
        </article>`;
    }).join('');
  };

  const renderSchedule = () => {
    if (!refs.map || !state.data) return;
    const orders = selectedOrders();
    if (refs.weekLabel) {
      refs.weekLabel.textContent = `${formatDate(state.weekStart, { day: 'numeric', month: 'short' })} – ${formatDate(addDays(state.weekStart, 6), { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    refs.map.innerHTML = DAYS.map((day, index) => {
      const date = addDays(state.weekStart, index);
      const key = dateKey(date);
      const pickups = orders.filter((order) => dateKey(parseUtc(order.pickup_start_at) || 0) === key);
      const pickupIds = new Set(pickups.map((order) => `${order.platform}:${order.account_key}:${order.order_id}`));
      const deadlines = orders.filter((order) => {
        const deadline = parseUtc(order.ship_by_at);
        const identity = `${order.platform}:${order.account_key}:${order.order_id}`;
        return deadline && dateKey(deadline) === key && !pickupIds.has(identity);
      });
      const cards = pickups.map((order) => {
        const pickup = parseUtc(order.pickup_start_at);
        const deadline = parseUtc(order.ship_by_at);
        return `
          <article class="admin-arrangement-pickup-card is-${escapeHtml(order.platform)}">
            <div><span>${order.platform === 'shopee' ? 'Shopee' : 'TikTok'}</span><strong>${pickup ? escapeHtml(formatDate(pickup, { hour: '2-digit', minute: '2-digit' })) : ''}</strong></div>
            <b>${escapeHtml(order.order_id)}</b>
            <small>${escapeHtml(order.account_key || '')}</small>
            ${deadline ? `<em>Ship by ${escapeHtml(formatDate(deadline, { weekday: 'short', hour: '2-digit', minute: '2-digit' }))}</em>` : ''}
          </article>`;
      }).join('');
      const deadlineCards = deadlines.map((order) => {
        const deadline = parseUtc(order.ship_by_at);
        return `<div class="admin-arrangement-deadline-card"><i></i><span>Ship by ${deadline ? escapeHtml(formatDate(deadline, { hour: '2-digit', minute: '2-digit' })) : ''}</span><strong>${escapeHtml(order.order_id)}</strong></div>`;
      }).join('');
      return `
        <section class="admin-arrangement-schedule-day ${key === dateKey(new Date()) ? 'is-today' : ''}">
          <header><strong>${day.slice(0, 3)}</strong><span>${formatDate(date, { day: '2-digit', month: 'short' })}</span></header>
          <div>${cards || deadlineCards ? cards + deadlineCards : '<p>No pickups</p>'}</div>
        </section>`;
    }).join('');
  };

  const statusLabel = (order) => {
    if (order.exception_status || order.last_error) return ['Needs attention', 'is-danger'];
    if (order.order_type === 'instant' && !order.shipment_arranged) return ['Manual', 'is-warning'];
    if (order.shipment_arranged) return [order.handover_method || 'Arranged', 'is-success'];
    return ['Waiting', ''];
  };

  const renderOrders = () => {
    const orders = selectedOrders().sort((left, right) => {
      const a = parseUtc(left.pickup_start_at)?.getTime() || parseUtc(left.ship_by_at)?.getTime() || 0;
      const b = parseUtc(right.pickup_start_at)?.getTime() || parseUtc(right.ship_by_at)?.getTime() || 0;
      return a - b;
    });
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
    const paused = Boolean(state.data?.hard_set?.automation_paused);
    const enabled = Boolean(state.data?.hard_set?.enabled);
    root.querySelector('[data-arrangement-metric="awaiting"]').textContent =
      String(orders.filter((order) => order.order_type !== 'instant' && !order.shipment_arranged && !order.is_processed).length);
    root.querySelector('[data-arrangement-metric="pickups"]').textContent =
      String(visible.filter((order) => parseUtc(order.pickup_start_at)).length);
    root.querySelector('[data-arrangement-metric="exceptions"]').textContent =
      String(orders.filter((order) => order.exception_status || order.last_error).length);
    if (refs.live) {
      refs.live.classList.toggle('is-paused', paused || !enabled);
      refs.live.innerHTML = `<i></i>${paused ? ' Paused' : !enabled ? ' Not active' : ' Live · 2 min'}`;
    }
  };

  const renderAll = () => {
    renderStatus();
    renderRuleSummary();
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
    } catch (error) {
      if (refs.live) refs.live.innerHTML = '<i></i> Unavailable';
      if (refs.map) refs.map.innerHTML = `<p class="admin-empty">${escapeHtml(error.message)}</p>`;
    } finally {
      state.loading = false;
      refs.refresh?.removeAttribute('disabled');
    }
  };

  const dayOptions = (selected) => [
    ['EARLIEST_WEEKDAY', 'Earliest weekday'],
    ...DAYS.map((day, index) => [String(index + 1), day])
  ].map(([value, label]) => `<option value="${value}" ${String(selected) === value ? 'selected' : ''}>${label}</option>`).join('');

  const methodOptions = (selected) => ['PICKUP', 'DROP_OFF', 'HOLD']
    .map((value) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${value === 'DROP_OFF' ? 'Drop-off' : value.charAt(0) + value.slice(1).toLowerCase()}</option>`)
    .join('');

  const renderEditor = () => {
    if (!state.workingPolicy || !refs.ruleGrid) return;
    refs.ruleGrid.className = 'admin-arrangement-pickup-editor';
    refs.ruleGrid.innerHTML = `
      <div class="admin-arrangement-editor-head"><span>Arrange day</span><span>Shopee pickup</span><span>TikTok pickup</span></div>
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
    if (!branch) return;
    state.workingPolicy = structuredClone(state.data?.policy?.policy || {});
    renderEditor();
    if (refs.policyMeta) {
      refs.policyMeta.textContent = `Revision ${Number(state.data?.policy?.revision || 0)} · ${state.data?.policy?.updated_by || 'defaults'}`;
    }
  };

  refs.refresh?.addEventListener('click', load);
  root.querySelectorAll('[data-arrangement-platform]').forEach((button) => button.addEventListener('click', () => {
    state.platform = button.dataset.arrangementPlatform || 'all';
    root.querySelectorAll('[data-arrangement-platform]').forEach((item) => item.classList.toggle('is-active', item === button));
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.get('username'), password: form.get('password') })
      });
      await load();
      showEditorAccess();
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

  window.addEventListener('jg-shipment-arrangement-refresh', load);
  window.setInterval(() => {
    if (!document.hidden && root.classList.contains('is-active')) load();
  }, 60000);
  if (root.classList.contains('is-active')) load();
});
