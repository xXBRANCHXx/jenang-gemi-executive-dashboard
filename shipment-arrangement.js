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
    windowNow: new Date(),
    tab: 'schedule',
    advancedPlatform: 'shopee',
    workingPolicy: null,
    reschedule: null,
    pickupEvent: null,
    pickupEventSequence: 0,
    orderDetailCache: new Map(),
    loading: false
  };
  const refs = {
    live: root.querySelector('[data-arrangement-live]'),
    refresh: root.querySelector('[data-arrangement-refresh]'),
    map: root.querySelector('[data-arrangement-map]'),
    rescheduler: root.querySelector('[data-arrangement-rescheduler]'),
    eventOverlay: root.querySelector('[data-arrangement-event-overlay]'),
    eventKicker: root.querySelector('[data-arrangement-event-kicker]'),
    eventTitle: root.querySelector('[data-arrangement-event-title]'),
    eventSubtitle: root.querySelector('[data-arrangement-event-subtitle]'),
    eventOrders: root.querySelector('[data-arrangement-event-orders]'),
    orderDetail: root.querySelector('[data-arrangement-order-detail]'),
    windowLabel: root.querySelector('[data-arrangement-window-label]'),
    unlock: root.querySelector('[data-arrangement-unlock]'),
    unlockForm: root.querySelector('[data-arrangement-unlock-form]'),
    policyForm: root.querySelector('[data-arrangement-policy-form]'),
    ruleGrid: root.querySelector('[data-arrangement-rule-grid]'),
    advancedGrid: root.querySelector('[data-arrangement-advanced-grid]'),
    policyMeta: root.querySelector('[data-arrangement-policy-meta]'),
    error: root.querySelector('[data-arrangement-error]'),
    save: root.querySelector('[data-arrangement-save]'),
    applyMonday: root.querySelector('[data-arrangement-apply-monday]')
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

  const HOUR = 3600000;
  const WINDOW_BEFORE_HOURS = 8;
  const WINDOW_AFTER_HOURS = 24;
  const WINDOW_HOURS = WINDOW_BEFORE_HOURS + WINDOW_AFTER_HOURS;
  const windowStart = () => new Date(state.windowNow.getTime() - (WINDOW_BEFORE_HOURS * HOUR));
  const windowEnd = () => new Date(state.windowNow.getTime() + (WINDOW_AFTER_HOURS * HOUR));

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

  const formatMoney = (value, currency = 'IDR') => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency || 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));

  const formatEventTime = (value) => {
    const date = value instanceof Date ? value : parseUtc(value);
    return date
      ? formatDate(date, { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : 'Time unavailable';
  };

  const pickupRule = (platform, dayNumber, policy = state.data?.policy?.policy) =>
    String(policy?.platforms?.[platform]?.regular?.pickup_days?.[String(dayNumber)] || 'EARLIEST_WEEKDAY');

  const pickupRuleLabel = (rule) => {
    if (rule === 'EARLIEST_WEEKDAY') return 'Next available weekday';
    const index = Math.max(1, Math.min(7, Number(rule))) - 1;
    return DAYS[index];
  };

  const orderDeadline = (order) => [
    order.ship_by_at,
    order.collection_due_at,
    order.pickup_cutoff_at,
    order.deadline_at
  ].map(parseUtc).find(Boolean) || null;

  const normalizedStatus = (value) => String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const pickupConfirmed = (order) => {
    if (order.pickup_confirmed === true || order.pickup_confirmed === 1 || order.pickup_confirmed === '1') return true;
    if (parseUtc(order.pickup_confirmed_at) || parseUtc(order.picked_up_at)) return true;
    const platform = String(order.platform || '').toLowerCase();
    const statuses = [
      normalizedStatus(order.marketplace_package_status),
      normalizedStatus(order.package_status),
      normalizedStatus(order.marketplace_order_status),
      normalizedStatus(order.marketplace_status),
      normalizedStatus(order.order_status),
      normalizedStatus(order.status)
    ].filter(Boolean);
    const confirmed = platform === 'shopee'
      ? ['PICKED_UP', 'SHIPPED', 'TO_CONFIRM_RECEIVE', 'COMPLETED', 'DELIVERED']
      : ['PICKED_UP', 'IN_TRANSIT', 'SHIPPED', 'TO_CONFIRM_RECEIVE', 'COMPLETED', 'DELIVERED'];
    return statuses.some((status) => confirmed.includes(status));
  };

  const selectedOrders = () => {
    const orders = Array.isArray(state.data?.orders) ? state.data.orders : [];
    return orders.filter((order) => {
      const deadline = orderDeadline(order);
      return !pickupConfirmed(order) && deadline && deadline >= windowStart() && deadline <= windowEnd();
    });
  };

  const pickupConfirmationGroups = () => {
    const orders = Array.isArray(state.data?.orders) ? state.data.orders : [];
    const start = windowStart();
    const groups = new Map();
    orders.forEach((order) => {
      if (!pickupConfirmed(order)) return;
      const confirmedAt = parseUtc(order.pickup_confirmed_at || order.picked_up_at);
      if (!confirmedAt || confirmedAt < start || confirmedAt > state.windowNow) return;
      const bucket = Math.floor(confirmedAt.getTime() / (5 * 60 * 1000));
      if (!groups.has(bucket)) groups.set(bucket, { confirmedAt, orders: [] });
      const group = groups.get(bucket);
      if (confirmedAt < group.confirmedAt) group.confirmedAt = confirmedAt;
      group.orders.push(order);
    });
    return Array.from(groups.values()).sort((left, right) => left.confirmedAt - right.confirmedAt);
  };

  const pickupWindowGroups = () => {
    const orders = Array.isArray(state.data?.orders) ? state.data.orders : [];
    const start = windowStart();
    const end = windowEnd();
    const grouped = new Map();
    orders.forEach((order) => {
      const pickupStart = parseUtc(order.pickup_start_at);
      const pickupEnd = parseUtc(order.pickup_end_at) || (pickupStart ? new Date(pickupStart.getTime() + HOUR) : null);
      if (!pickupStart || !pickupEnd || pickupEnd <= start || pickupStart >= end) return;
      const platform = String(order.platform || '').toLowerCase();
      const key = `${platform}|${pickupStart.toISOString()}|${pickupEnd.toISOString()}`;
      if (!grouped.has(key)) grouped.set(key, { platform, start: pickupStart, end: pickupEnd, orders: [] });
      grouped.get(key).orders.push(order);
    });
    const groups = Array.from(grouped.values()).sort((left, right) =>
      left.start - right.start || left.end - right.end
    );
    const laneEnds = [];
    groups.forEach((group) => {
      let lane = laneEnds.findIndex((laneEnd) => group.start >= laneEnd);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = group.end;
      group.lane = lane;
    });
    return { groups, laneCount: laneEnds.length };
  };

  const pickupMarkerLayout = (groups, start) => {
    const laneEnds = [];
    const laidOut = groups.map((group) => {
      const elapsed = group.confirmedAt.getTime() - start.getTime();
      const position = Math.max(0, Math.min(100, (elapsed / (WINDOW_HOURS * HOUR)) * 100));
      const flip = position > 84;
      const labelStart = Math.max(0, position - (flip ? 10 : 0));
      const labelEnd = Math.min(100, position + (flip ? 0 : 10));
      let labelLane = laneEnds.findIndex((laneEnd) => labelStart >= laneEnd + 1);
      if (labelLane < 0) labelLane = laneEnds.length;
      laneEnds[labelLane] = labelEnd;
      return { ...group, position, labelLane, flip };
    });
    return { groups: laidOut, laneCount: Math.max(1, laneEnds.length) };
  };

  const pickupOrderState = (order, group = null) => {
    if (pickupConfirmed(order)) {
      const confirmedAt = parseUtc(order.pickup_confirmed_at || order.picked_up_at);
      return {
        key: 'picked-up',
        label: 'Picked up',
        detail: confirmedAt ? `Confirmed ${formatEventTime(confirmedAt)}` : 'Confirmed by marketplace'
      };
    }
    const start = parseUtc(order.pickup_start_at) || group?.start || null;
    const end = parseUtc(order.pickup_end_at) || group?.end || null;
    if (start && state.windowNow < start) {
      return { key: 'scheduled', label: 'Scheduled', detail: `Starts ${formatEventTime(start)}` };
    }
    if (start && end && state.windowNow >= start && state.windowNow <= end) {
      return { key: 'window-open', label: 'Pickup window open', detail: `Ends ${formatEventTime(end)}` };
    }
    if (end && state.windowNow > end) {
      return { key: 'awaiting-confirmation', label: 'Awaiting confirmation', detail: `Window ended ${formatEventTime(end)}` };
    }
    return { key: 'scheduled', label: 'Scheduled', detail: pickupWindowLabel(order) };
  };

  const pickupGroupCounts = (group) => {
    const orders = Array.isArray(group?.orders) ? group.orders : [];
    const pickedUp = orders.filter(pickupConfirmed).length;
    return { total: orders.length, pickedUp, awaiting: orders.length - pickedUp };
  };

  const orderTimelineStatus = (deadline) => {
    if (deadline < state.windowNow) return ['Past ship-by deadline', 'is-overdue'];
    if (deadline.getTime() - state.windowNow.getTime() <= 4 * HOUR) return ['Ship by soon', 'is-due-soon'];
    return ['Before ship-by', 'is-upcoming'];
  };

  const pickupWindowLabel = (order) => {
    const start = parseUtc(order.pickup_start_at);
    const end = parseUtc(order.pickup_end_at);
    if (!start) return 'No pickup window returned';
    const day = formatDate(start, { weekday: 'short' });
    const startTime = formatDate(start, { hour: '2-digit', minute: '2-digit' });
    const endTime = end ? `–${formatDate(end, { hour: '2-digit', minute: '2-digit' })}` : '';
    return `Pickup booked ${day} ${startTime}${endTime}`;
  };

  const renderSchedule = () => {
    if (!refs.map || !state.data) return;
    const start = windowStart();
    const end = windowEnd();
    const orders = selectedOrders().sort((left, right) =>
      orderDeadline(left).getTime() - orderDeadline(right).getTime()
    );
    const pickupGroups = pickupConfirmationGroups();
    const pickupMarkersLayout = pickupMarkerLayout(pickupGroups, start);
    const pickupWindows = pickupWindowGroups();
    if (refs.windowLabel) {
      refs.windowLabel.textContent = `${formatDate(start, { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} – ${formatDate(end, { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
    }

    if (!orders.length && !pickupGroups.length && !pickupWindows.groups.length) {
      refs.map.innerHTML = '<div class="admin-arrangement-agenda-empty"><strong>No unpicked orders in this window</strong><p>Picked-up orders disappear. No remaining orders have a ship-by deadline between 8 hours ago and 24 hours from now.</p></div>';
      return;
    }

    const ticks = [0, 4, 8, 12, 16, 20, 24, 32].map((offsetHours) => {
      const moment = new Date(start.getTime() + (offsetHours * HOUR));
      return `
        <span class="${offsetHours === WINDOW_HOURS ? 'is-window-end' : ''}" style="--tick-column:${offsetHours + 1}">
          <strong>${offsetHours === WINDOW_BEFORE_HOURS ? `Now · ${formatDate(state.windowNow, { hour: '2-digit', minute: '2-digit' })}` : formatDate(moment, { hour: '2-digit', minute: '2-digit' })}</strong>
          <small>${formatDate(moment, { weekday: 'short', day: '2-digit', month: 'short' })}</small>
        </span>`;
    }).join('');
    const gridLines = Array.from({ length: WINDOW_HOURS }, (_, index) =>
      `<i class="${index < WINDOW_BEFORE_HOURS ? 'is-history' : ''}"></i>`
    ).join('');
    const events = orders.map((order) => {
      const deadline = orderDeadline(order);
      const offset = Math.max(0, Math.min(WINDOW_HOURS - 1, (deadline.getTime() - start.getTime()) / HOUR));
      const column = Math.min(WINDOW_HOURS - 2, Math.floor(offset) + 1);
      const [status, statusClass] = orderTimelineStatus(deadline);
      const platform = String(order.platform || '').toLowerCase();
      const platformLabel = platform === 'shopee' ? 'Shopee' : platform === 'tiktok' ? 'TikTok Shop' : platform || 'Marketplace';
      const canReschedule = platform === 'shopee'
        && (String(order.handover_method || '').toUpperCase() === 'PICKUP' || Boolean(parseUtc(order.pickup_start_at)));
      return `
        <article class="admin-arrangement-deadline-event is-${escapeHtml(platform)} ${escapeHtml(statusClass)}" style="--event-column:${column}">
          <header>
            <span>${escapeHtml(platformLabel)}</span>
            <strong>Ship by ${escapeHtml(formatDate(deadline, { hour: '2-digit', minute: '2-digit' }))}</strong>
          </header>
          <b>${escapeHtml(order.order_id)}</b>
          <small>${escapeHtml(order.account_key || '')}</small>
          <footer>
            <span>${escapeHtml(status)}</span>
            <em>${escapeHtml(pickupWindowLabel(order))}</em>
            ${canReschedule ? `<button type="button" data-change-pickup
              data-platform="${escapeHtml(platform)}"
              data-account-key="${escapeHtml(order.account_key || '')}"
              data-order-id="${escapeHtml(order.order_id || '')}"
              data-package-id="${escapeHtml(order.package_id || '')}">Change pickup</button>` : ''}
          </footer>
        </article>`;
    }).join('');
    const pickupMarkers = pickupMarkersLayout.groups.map((group, groupIndex) => {
      const orderIds = group.orders.map((order) => String(order.order_id || '')).filter(Boolean);
      const count = orderIds.length;
      const time = formatDate(group.confirmedAt, { hour: '2-digit', minute: '2-digit' });
      const quickIds = orderIds.slice(0, 3);
      return `
        <button type="button" class="admin-arrangement-pickup-marker ${group.flip ? 'is-flipped' : ''}"
          style="--pickup-position:${group.position}%;--pickup-label-lane:${group.labelLane}"
          data-pickup-event-index="${groupIndex}"
          title="Shopee pickup confirmed at ${escapeHtml(time)}: ${escapeHtml(orderIds.join(', '))}"
          aria-label="Shopee pickup confirmed at ${escapeHtml(time)} for ${count} order${count === 1 ? '' : 's'}">
          <span class="admin-arrangement-pickup-marker-label">
            <span>${escapeHtml(time)}</span>
            <strong>${count} picked up</strong>
          </span>
          <div class="admin-arrangement-pickup-preview" aria-hidden="true">
            <small>Shopee confirmed · ${escapeHtml(time)}</small>
            <b>${count} picked-up order${count === 1 ? '' : 's'}</b>
            <ul>${quickIds.map((orderId) => `<li>${escapeHtml(orderId)}</li>`).join('')}</ul>
            ${count > 3 ? `<em>+${count - 3} more</em>` : ''}
            <i>Click to inspect this pickup</i>
          </div>
        </button>`;
    }).join('');
    const pickupWindowBlocks = pickupWindows.groups.map((group, groupIndex) => {
      const visibleStart = new Date(Math.max(group.start.getTime(), start.getTime()));
      const visibleEnd = new Date(Math.min(group.end.getTime(), end.getTime()));
      const left = Math.max(0, ((visibleStart.getTime() - start.getTime()) / (WINDOW_HOURS * HOUR)) * 100);
      const width = Math.max(.5, ((visibleEnd.getTime() - visibleStart.getTime()) / (WINDOW_HOURS * HOUR)) * 100);
      const passed = group.end < state.windowNow;
      const active = group.start <= state.windowNow && group.end >= state.windowNow;
      const counts = pickupGroupCounts(group);
      const orderIds = group.orders.map((order) => String(order.order_id || '')).filter(Boolean);
      const startLabel = formatDate(group.start, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
      const endLabel = formatDate(group.end, { hour: '2-digit', minute: '2-digit' });
      const stateLabel = counts.awaiting === 0
        ? `All ${counts.total} picked up`
        : counts.pickedUp > 0
          ? `${counts.pickedUp} of ${counts.total} picked up`
          : passed
            ? `Window passed · ${counts.awaiting} awaiting`
            : active
              ? `Window open · ${counts.awaiting} awaiting`
              : `${counts.total} scheduled pickup${counts.total === 1 ? '' : 's'}`;
      return `
        <button type="button" class="admin-arrangement-pickup-window ${passed ? 'is-passed' : active ? 'is-active' : ''} ${counts.awaiting === 0 ? 'is-complete' : counts.pickedUp > 0 ? 'is-mixed' : ''}"
          style="--pickup-window-left:${left}%;--pickup-window-width:${width}%;--pickup-window-lane:${group.lane}"
          data-pickup-window-index="${groupIndex}"
          title="${escapeHtml(startLabel)}–${escapeHtml(endLabel)}: ${escapeHtml(orderIds.join(', '))}"
          aria-label="${escapeHtml(stateLabel)}, ${escapeHtml(startLabel)} to ${escapeHtml(endLabel)}, ${counts.total} order${counts.total === 1 ? '' : 's'}. Open scheduled orders.">
          <span class="admin-arrangement-pickup-window-label">
            <strong>${escapeHtml(stateLabel)}</strong>
            <small>${escapeHtml(startLabel)}–${escapeHtml(endLabel)}</small>
            <em>View orders</em>
          </span>
        </button>`;
    }).join('');

    refs.map.innerHTML = `
      <div class="admin-arrangement-deadline-scroll">
        <div class="admin-arrangement-deadline-chart">
          <div class="admin-arrangement-deadline-axis" aria-hidden="true">${ticks}</div>
          <div class="admin-arrangement-deadline-plot" style="--pickup-lanes:${pickupWindows.laneCount};--pickup-label-lanes:${pickupMarkersLayout.laneCount}">
            <div class="admin-arrangement-deadline-grid" aria-hidden="true">${gridLines}</div>
            <div class="admin-arrangement-now-line" aria-label="Current time: ${escapeHtml(formatDate(state.windowNow, { hour: '2-digit', minute: '2-digit' }))}"></div>
            <div class="admin-arrangement-pickup-windows">${pickupWindowBlocks}</div>
            <div class="admin-arrangement-pickup-markers">${pickupMarkers}</div>
            <div class="admin-arrangement-deadline-events">${events}</div>
          </div>
        </div>
      </div>
      <p class="admin-arrangement-agenda-end">${orders.length} unpicked order${orders.length === 1 ? '' : 's'} shown at the final ship-by deadline. Select a full-height pickup band or dotted confirmation line to inspect its orders.</p>`;
  };

  const renderRescheduler = () => {
    if (!refs.rescheduler) return;
    const reschedule = state.reschedule;
    refs.rescheduler.hidden = !reschedule;
    if (!reschedule) {
      refs.rescheduler.innerHTML = '';
      return;
    }
    const order = reschedule.order || {};
    if (reschedule.loading) {
      refs.rescheduler.innerHTML = `<div><span class="admin-panel-kicker">Change one booked pickup</span><h3>${escapeHtml(order.order_id)}</h3><p>Asking Shopee for replacement windows…</p></div>`;
      return;
    }
    if (reschedule.error) {
      refs.rescheduler.innerHTML = `
        <div><span class="admin-panel-kicker">Change one booked pickup</span><h3>${escapeHtml(order.order_id)}</h3><p class="admin-form-error">${escapeHtml(reschedule.error)}</p></div>
        <button type="button" class="admin-arrangement-secondary-button" data-close-rescheduler>Close</button>`;
      return;
    }
    const payload = reschedule.payload || {};
    const options = Array.isArray(payload.options) ? payload.options : [];
    refs.rescheduler.innerHTML = `
      <div class="admin-arrangement-rescheduler-copy">
        <span class="admin-panel-kicker">Change one booked pickup</span>
        <h3>${escapeHtml(order.order_id)}</h3>
        <p>Current: <strong>${escapeHtml(payload.current?.label || pickupWindowLabel(order))}</strong></p>
        <small>These replacement windows come directly from Shopee. This changes only this order; weekly rules apply to future arrangements.</small>
      </div>
      <form data-reschedule-form>
        <label><span>New Shopee pickup window</span>
          <select name="pickup-option" required>
            ${options.map((option, index) => `<option value="${index}">${escapeHtml(option.label || 'Shopee pickup window')}</option>`).join('')}
          </select>
        </label>
        <div>
          <button type="button" class="admin-arrangement-secondary-button" data-close-rescheduler>Cancel</button>
          <button type="submit" class="admin-primary-btn">Update pickup</button>
        </div>
      </form>`;
  };

  const orderIdentity = (order) => [
    order?.platform || '',
    order?.account_key || '',
    order?.order_id || '',
    order?.package_id || ''
  ].join('|');

  const readableStatus = (value, fallback = 'Status unavailable') => {
    const normalized = String(value || '').trim();
    if (!normalized) return fallback;
    return normalized.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const orderDetailLoading = (order) => {
    const pickupState = pickupOrderState(order, state.pickupEvent?.group);
    return `
      <div class="admin-arrangement-order-loading">
        <div class="admin-arrangement-order-loading-head">
          <div>
            <span class="admin-panel-kicker">Loading order</span>
            <h3>${escapeHtml(order?.order_id || '')}</h3>
            <p>Retrieving products, marketplace money, and fulfillment history.</p>
          </div>
          <span class="admin-arrangement-order-state is-${pickupState.key}">${escapeHtml(pickupState.label)}</span>
        </div>
        <div class="admin-arrangement-loading-bars" aria-hidden="true">
          <i></i><i></i><i></i><i></i>
        </div>
      </div>`;
  };

  const renderOrderBreakdown = (detail, scheduledOrder = {}) => {
    const order = detail?.order || {};
    const financials = detail?.financials || {};
    const pickupState = pickupOrderState({ ...scheduledOrder, ...order }, state.pickupEvent?.group);
    const currency = order.currency || 'IDR';
    const gross = Number(financials.gross_revenue || 0);
    const fees = Number(financials.marketplace_fees || 0);
    const net = Number(financials.net_revenue || 0);
    const feeRate = gross > 0 ? `${((fees / gross) * 100).toFixed(1)}% of gross` : 'Gross sale unavailable';
    const sources = financials.sources || {};
    const netSource = String(sources.net_revenue?.source || 'missing');
    const financeQuality = !financials.available
      ? ['Financial data unavailable', 'Shopee has not supplied stored financial facts for this order yet.', 'is-unavailable']
      : netSource === 'gross_revenue_fallback' || netSource === 'missing'
        ? ['Financials are provisional', 'Net revenue is not yet settlement-backed; values may change when Shopee releases the order income.', 'is-provisional']
        : ['Shopee financials stored', 'Gross, deductions, and seller net come from the stored marketplace order record.', 'is-ready'];
    const items = Array.isArray(detail?.items) ? detail.items : [];
    const timeline = Array.isArray(detail?.timeline) ? detail.timeline : [];
    return `
      <article class="admin-arrangement-order-breakdown">
        <header class="admin-arrangement-order-breakdown-head">
          <div>
            <span class="admin-panel-kicker">${escapeHtml(order.platform || 'Marketplace')} · ${escapeHtml(order.account_key || '')}</span>
            <h3>${escapeHtml(order.order_id || '')}</h3>
            <p>${escapeHtml(readableStatus(order.marketplace_status))} · ${escapeHtml(order.shipping_provider || 'Carrier unavailable')}</p>
          </div>
          <span class="admin-arrangement-order-state is-${pickupState.key}">${escapeHtml(pickupState.label)}</span>
        </header>

        <section class="admin-arrangement-pickup-health is-${pickupState.key}">
          <div>
            <span>Pickup status</span>
            <strong>${escapeHtml(pickupState.label)}</strong>
            <small>${escapeHtml(pickupState.detail)}</small>
          </div>
          <dl>
            <div><dt>Booked window</dt><dd>${escapeHtml(order.pickup_slot_label || pickupWindowLabel(scheduledOrder))}</dd></div>
            <div><dt>Ship-by deadline</dt><dd>${escapeHtml(order.ship_by_label || scheduledOrder.ship_by_label || 'Not supplied')}</dd></div>
            <div><dt>Workflow</dt><dd>${escapeHtml(readableStatus(order.workflow_status, 'Not supplied'))}</dd></div>
          </dl>
        </section>

        <section class="admin-arrangement-finance-grid">
          <article><span>Customer paid</span><strong>${financials.available ? formatMoney(gross, currency) : '—'}</strong><small>Gross order value</small></article>
          <article><span>Shopee deductions</span><strong>${financials.available ? formatMoney(fees, currency) : '—'}</strong><small>${escapeHtml(feeRate)} · gross minus seller net</small></article>
          <article class="is-net"><span>Seller net revenue</span><strong>${financials.available ? formatMoney(net, currency) : '—'}</strong><small>${financials.funds_released ? `Released ${formatMoney(financials.funds_released_amount || net, currency)}` : 'Funds not released yet'}</small></article>
        </section>

        <section class="admin-arrangement-finance-quality ${financeQuality[2]}">
          <strong>${escapeHtml(financeQuality[0])}</strong>
          <span>${escapeHtml(financeQuality[1])}</span>
        </section>

        <div class="admin-arrangement-detail-columns">
          <section class="admin-arrangement-detail-section">
            <header><span class="admin-panel-kicker">Lifecycle</span><h4>Order timeline</h4></header>
            <ol class="admin-arrangement-order-timeline">
              ${timeline.length ? timeline.map((event) => `
                <li class="is-${escapeHtml(event.kind || 'event')}">
                  <time>${escapeHtml(formatEventTime(event.at))}</time>
                  <strong>${escapeHtml(event.label || 'Order event')}</strong>
                  ${event.end_at ? `<span>Until ${escapeHtml(formatEventTime(event.end_at))}</span>` : ''}
                  ${event.note ? `<small>${escapeHtml(event.note)}</small>` : ''}
                </li>`).join('') : '<li><strong>No timeline facts stored</strong><small>The marketplace has not supplied lifecycle timestamps for this order.</small></li>'}
            </ol>
          </section>

          <section class="admin-arrangement-detail-section">
            <header><span class="admin-panel-kicker">Contents</span><h4>Products sold</h4></header>
            <div class="admin-arrangement-product-list">
              ${items.length ? items.map((item) => `
                <article>
                  <div>
                    <strong>${escapeHtml(item.name || 'Unnamed marketplace item')}</strong>
                    <span>${escapeHtml([item.sku, item.flavor].filter(Boolean).join(' · ') || 'SKU unavailable')}</span>
                  </div>
                  <b>×${Number(item.quantity || 0)}</b>
                  <dl>
                    <div><dt>Gross</dt><dd>${formatMoney(item.gross_revenue || 0, currency)}</dd></div>
                    <div><dt>Shopee deductions</dt><dd>${formatMoney(item.marketplace_fees || 0, currency)}</dd></div>
                    <div><dt>Seller net</dt><dd>${formatMoney(item.net_revenue || 0, currency)}</dd></div>
                  </dl>
                  ${item.is_free_gift ? '<small>Free gift · excluded from seller revenue</small>' : ''}
                </article>`).join('') : '<p class="admin-empty">No product lines are stored for this order yet.</p>'}
            </div>
          </section>
        </div>

        <section class="admin-arrangement-detail-facts">
          <div><span>Package</span><strong>${escapeHtml(order.package_id || 'Not supplied')}</strong></div>
          <div><span>Pickup booking</span><strong>${escapeHtml(order.pickup_slot_label || 'Not supplied')}</strong></div>
          <div><span>Ship by</span><strong>${escapeHtml(order.ship_by_label || 'Not supplied')}</strong></div>
          <div><span>Shipping label</span><strong>${order.label_ready ? 'Ready' : 'Not ready'}</strong></div>
          <div><span>Last API update</span><strong>${escapeHtml(formatEventTime(order.updated_at))}</strong></div>
          <div><span>Finance source</span><strong>${escapeHtml(netSource.replaceAll('_', ' '))}</strong></div>
        </section>
      </article>`;
  };

  const renderPickupEvent = () => {
    if (!refs.eventOverlay || !state.pickupEvent) return;
    const eventState = state.pickupEvent;
    const group = eventState.group;
    const orders = Array.isArray(group?.orders) ? group.orders : [];
    const counts = pickupGroupCounts(group);
    const isWindow = eventState.kind === 'window';
    const confirmationTime = group?.confirmedAt
      ? formatDate(group.confirmedAt, { weekday: 'long', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : 'Time unavailable';
    const windowStartLabel = group?.start
      ? formatDate(group.start, { weekday: 'long', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : 'Time unavailable';
    const windowEndLabel = group?.end
      ? formatDate(group.end, { hour: '2-digit', minute: '2-digit' })
      : 'Time unavailable';
    refs.eventOverlay.hidden = false;
    refs.eventOverlay.setAttribute('aria-hidden', 'false');
    if (refs.eventKicker) refs.eventKicker.textContent = isWindow ? 'Booked courier window' : 'Courier pickup confirmation';
    if (refs.eventTitle) {
      refs.eventTitle.textContent = isWindow
        ? `${formatDate(group.start, { weekday: 'short' })} ${formatDate(group.start, { hour: '2-digit', minute: '2-digit' })}–${windowEndLabel}`
        : `${orders.length} order${orders.length === 1 ? '' : 's'} picked up`;
    }
    if (refs.eventSubtitle) {
      refs.eventSubtitle.textContent = isWindow
        ? `${windowStartLabel} to ${windowEndLabel} · ${counts.total} scheduled order${counts.total === 1 ? '' : 's'}`
        : `${confirmationTime} · first observed by the Shopee API worker`;
    }
    if (refs.eventOrders) {
      refs.eventOrders.innerHTML = `
        <div class="admin-arrangement-event-summary">
          <span>${isWindow ? 'Window progress' : 'Confirmed pickup event'}</span>
          <strong>${isWindow ? `${counts.pickedUp}/${counts.total}` : counts.total}</strong>
          <small>${isWindow
            ? `${counts.pickedUp} picked up · ${counts.awaiting} still awaiting marketplace confirmation`
            : `Every order below was confirmed picked up at ${confirmationTime}`}</small>
          <div class="admin-arrangement-event-progress" aria-label="${counts.pickedUp} of ${counts.total} picked up">
            <i style="--pickup-progress:${counts.total ? (counts.pickedUp / counts.total) * 100 : 0}%"></i>
          </div>
        </div>
        <div class="admin-arrangement-event-list-head">
          <strong>Orders</strong>
          <span>${counts.total} total</span>
        </div>
        <div class="admin-arrangement-event-order-list">
          ${orders.map((order, index) => {
            const selected = eventState.selectedIndex === index;
            const orderState = pickupOrderState(order, group);
            return `
              <button type="button" class="${selected ? 'is-selected' : ''}" data-pickup-event-order="${index}"
                aria-current="${selected ? 'true' : 'false'}">
                <span class="admin-arrangement-event-order-number">${String(index + 1).padStart(2, '0')}</span>
                <span class="admin-arrangement-event-order-copy">
                  <strong>${escapeHtml(order.order_id || '')}</strong>
                  <small>${escapeHtml(order.account_key || '')}${order.package_id ? ` · ${escapeHtml(order.package_id)}` : ''}</small>
                </span>
                <span class="admin-arrangement-order-state is-${orderState.key}">${escapeHtml(orderState.label)}</span>
                <em>${escapeHtml(orderState.detail)}</em>
              </button>`;
          }).join('')}
        </div>`;
    }
    if (!refs.orderDetail) return;
    const selectedOrder = orders[eventState.selectedIndex];
    if (eventState.loading) {
      refs.orderDetail.innerHTML = orderDetailLoading(selectedOrder);
    } else if (eventState.error) {
      const pickupState = pickupOrderState(selectedOrder || {}, group);
      refs.orderDetail.innerHTML = `
        <div class="admin-arrangement-order-error">
          <span class="admin-arrangement-order-state is-${pickupState.key}">${escapeHtml(pickupState.label)}</span>
          <span class="admin-panel-kicker">Order ${escapeHtml(selectedOrder?.order_id || '')}</span>
          <h3>The full order details did not load</h3>
          <p>${escapeHtml(eventState.error)}</p>
          <small>The pickup status above comes from the live arrangement map and is still available. Retry to load products, financials, and lifecycle history.</small>
          <button type="button" class="admin-primary-btn" data-retry-pickup-order>Retry order details</button>
        </div>`;
    } else if (eventState.detail) {
      refs.orderDetail.innerHTML = renderOrderBreakdown(eventState.detail, selectedOrder);
    } else if (!orders.length) {
      refs.orderDetail.innerHTML = `
        <div class="admin-arrangement-order-detail-empty">
          <span class="admin-panel-kicker">Pickup inspector</span>
          <h3>No orders in this pickup</h3>
          <p>The marketplace did not return any order records for this timeline item.</p>
        </div>`;
    } else {
      refs.orderDetail.innerHTML = orderDetailLoading(selectedOrder || orders[0]);
    }
  };

  const closePickupEvent = () => {
    const returnFocus = state.pickupEvent?.returnFocus;
    state.pickupEvent = null;
    if (refs.eventOverlay) {
      refs.eventOverlay.hidden = true;
      refs.eventOverlay.setAttribute('aria-hidden', 'true');
    }
    document.documentElement.classList.remove('has-arrangement-dialog');
    if (returnFocus instanceof HTMLElement && document.contains(returnFocus)) {
      queueMicrotask(() => returnFocus.focus());
    }
  };

  const openPickupInspector = (kind, groupIndex, returnFocus = null) => {
    const group = kind === 'window'
      ? pickupWindowGroups().groups[Number(groupIndex)]
      : pickupConfirmationGroups()[Number(groupIndex)];
    if (!group) return;
    const id = ++state.pickupEventSequence;
    state.pickupEvent = {
      id,
      kind: kind === 'window' ? 'window' : 'confirmation',
      group,
      selectedIndex: group.orders.length ? 0 : null,
      selectedOrderKey: group.orders.length ? orderIdentity(group.orders[0]) : '',
      detail: null,
      loading: group.orders.length > 0,
      error: '',
      returnFocus
    };
    document.documentElement.classList.add('has-arrangement-dialog');
    renderPickupEvent();
    refs.eventOverlay?.querySelector('.admin-arrangement-event-dialog')?.focus();
    if (group.orders.length) loadPickupEventOrder(0);
  };

  const loadPickupEventOrder = async (index) => {
    const eventState = state.pickupEvent;
    const order = eventState?.group?.orders?.[index];
    if (!eventState || !order) return;
    const eventId = eventState.id;
    const orderKey = orderIdentity(order);
    const cached = state.orderDetailCache.get(orderKey);
    state.pickupEvent = {
      ...eventState,
      selectedIndex: index,
      selectedOrderKey: orderKey,
      detail: cached || null,
      loading: !cached,
      error: ''
    };
    renderPickupEvent();
    if (cached) return;
    const query = new URLSearchParams({
      action: 'order-detail',
      platform: order.platform || '',
      account_key: order.account_key || '',
      order_id: order.order_id || '',
      package_id: order.package_id || ''
    });
    try {
      const detail = await requestJson(`${endpoint}?${query.toString()}`);
      if (!state.pickupEvent || state.pickupEvent.id !== eventId || state.pickupEvent.selectedOrderKey !== orderKey) return;
      state.orderDetailCache.set(orderKey, detail);
      state.pickupEvent = { ...state.pickupEvent, detail, loading: false, error: '' };
    } catch (error) {
      if (!state.pickupEvent || state.pickupEvent.id !== eventId || state.pickupEvent.selectedOrderKey !== orderKey) return;
      state.pickupEvent = { ...state.pickupEvent, detail: null, loading: false, error: error.message };
    }
    renderPickupEvent();
  };

  const openRescheduler = async (order) => {
    if (!state.data?.access?.branch) {
      state.reschedule = {
        order,
        error: 'Unlock Pickup rules with Branch-tier credentials first, then return to Schedule.'
      };
      renderRescheduler();
      return;
    }
    state.reschedule = { order, loading: true };
    renderRescheduler();
    const query = new URLSearchParams({
      action: 'pickup-options',
      platform: order.platform || '',
      account_key: order.account_key || '',
      order_id: order.order_id || '',
      package_id: order.package_id || ''
    });
    try {
      const payload = await requestJson(`${endpoint}?${query.toString()}`);
      state.reschedule = { order, payload };
    } catch (error) {
      state.reschedule = { order, error: error.message };
    }
    renderRescheduler();
  };

  const renderStatus = () => {
    const orders = Array.isArray(state.data?.orders) ? state.data.orders : [];
    const visible = selectedOrders();
    const overdue = visible.filter((order) => orderDeadline(order) < state.windowNow);
    const upcoming = visible.filter((order) => {
      const deadline = orderDeadline(order);
      return deadline >= state.windowNow;
    });
    const booked = pickupWindowGroups().groups.reduce((count, group) => count + group.orders.length, 0);
    const enabled = Boolean(state.data?.hard_set?.enabled);
    root.querySelector('[data-arrangement-metric="overdue"]').textContent = String(overdue.length);
    root.querySelector('[data-arrangement-metric="due"]').textContent = String(upcoming.length);
    root.querySelector('[data-arrangement-metric="booked"]').textContent = String(booked);
    if (refs.live) {
      refs.live.classList.toggle('is-paused', !enabled);
      refs.live.innerHTML = `<i></i>${!enabled ? ' Not active' : ' Shopee API · 2 min'}`;
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
    state.windowNow = new Date();
    refs.refresh?.setAttribute('disabled', '');
    try {
      state.data = await requestJson(`${endpoint}?limit=500`);
      state.orderDetailCache.clear();
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
  refs.map?.addEventListener('click', (event) => {
    const pickupMarker = event.target.closest('[data-pickup-event-index]');
    if (pickupMarker) {
      openPickupInspector('confirmation', pickupMarker.dataset.pickupEventIndex, pickupMarker);
      return;
    }
    const pickupWindow = event.target.closest('[data-pickup-window-index]');
    if (pickupWindow) {
      openPickupInspector('window', pickupWindow.dataset.pickupWindowIndex, pickupWindow);
      return;
    }
    const button = event.target.closest('[data-change-pickup]');
    if (!button) return;
    openRescheduler({
      platform: button.dataset.platform || '',
      account_key: button.dataset.accountKey || '',
      order_id: button.dataset.orderId || '',
      package_id: button.dataset.packageId || '',
      ...((state.data?.orders || []).find((order) =>
        String(order.platform || '') === String(button.dataset.platform || '')
        && String(order.account_key || '') === String(button.dataset.accountKey || '')
        && String(order.order_id || '') === String(button.dataset.orderId || '')
        && String(order.package_id || '') === String(button.dataset.packageId || '')
      ) || {})
    });
  });
  refs.eventOverlay?.addEventListener('click', (event) => {
    if (event.target === refs.eventOverlay || event.target.closest('[data-arrangement-event-close]')) {
      closePickupEvent();
      return;
    }
    const orderButton = event.target.closest('[data-pickup-event-order]');
    if (orderButton) {
      loadPickupEventOrder(Number(orderButton.dataset.pickupEventOrder));
      return;
    }
    if (event.target.closest('[data-retry-pickup-order]')) {
      const index = state.pickupEvent?.selectedIndex;
      if (Number.isInteger(index)) loadPickupEventOrder(index);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (!state.pickupEvent || !refs.eventOverlay) return;
    if (event.key === 'Escape') {
      closePickupEvent();
      return;
    }
    const orderButton = event.target.closest?.('[data-pickup-event-order]');
    if (orderButton && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      const buttons = Array.from(refs.eventOverlay.querySelectorAll('[data-pickup-event-order]'));
      const current = buttons.indexOf(orderButton);
      const next = event.key === 'ArrowDown'
        ? Math.min(buttons.length - 1, current + 1)
        : Math.max(0, current - 1);
      buttons[next]?.focus();
      loadPickupEventOrder(Number(buttons[next]?.dataset.pickupEventOrder));
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(refs.eventOverlay.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => element instanceof HTMLElement && element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  refs.rescheduler?.addEventListener('click', (event) => {
    if (!event.target.closest('[data-close-rescheduler]')) return;
    state.reschedule = null;
    renderRescheduler();
  });
  refs.rescheduler?.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-reschedule-form]');
    if (!form) return;
    event.preventDefault();
    const payload = state.reschedule?.payload;
    const order = state.reschedule?.order;
    const selected = payload?.options?.[Number(new FormData(form).get('pickup-option'))];
    if (!selected || !order) return;
    const submit = form.querySelector('[type="submit"]');
    submit?.setAttribute('disabled', '');
    try {
      const result = await requestJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pickup-reschedule',
          platform: order.platform,
          account_key: order.account_key,
          order_id: order.order_id,
          package_id: order.package_id,
          address_id: selected.address_id,
          pickup_time_id: selected.pickup_time_id
        })
      });
      state.data = { ...state.data, orders: Array.isArray(result.orders) ? result.orders : state.data.orders };
      state.orderDetailCache.clear();
      state.reschedule = null;
      renderRescheduler();
      renderAll();
    } catch (error) {
      state.reschedule = { ...state.reschedule, error: error.message };
      renderRescheduler();
    } finally {
      submit?.removeAttribute('disabled');
    }
  });
  root.querySelectorAll('[data-arrangement-tab]').forEach((button) => button.addEventListener('click', () => {
    setTab(button.dataset.arrangementTab);
  }));
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
