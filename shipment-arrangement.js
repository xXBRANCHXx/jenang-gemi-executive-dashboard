document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-shipment-arrangement]');
  if (!root) return;

  const schedule = window.JgShipmentSchedule;
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
    day: schedule.dayKey(new Date()),
    followToday: true,
    account: '',
    query: '',
    filter: 'all',
    otherLimit: 8,
    lastLoaded: null,
    loadError: '',
    incomplete: false,
    board: null,
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
    notice: root.querySelector('[data-shipment-notice]'),
    date: root.querySelector('[data-shipment-date]'),
    account: root.querySelector('[data-shipment-account]'),
    search: root.querySelector('[data-shipment-search]'),
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
  if (refs.eventOverlay && refs.eventOverlay.parentElement !== document.body) {
    document.body.append(refs.eventOverlay);
  }

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

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  const parseUtc = schedule.parse;

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

  const zeroRulesFor = (policy = state.workingPolicy) => {
    const zero = policy?.account_overrides?.shopee?.['zero-shopee'] || {};
    const weekend = zero.weekend_dependent || {};
    const guards = policy?.guards || {};
    return {
      selectionPriority: String(zero.selection_priority || 'PICKUP_FIRST'),
      weekdayPickupOnly: zero.weekday_pickup_only !== false,
      deadlineDropoffFallback: zero.deadline_dropoff_fallback !== false,
      weekdayRetryDays: Math.max(1, Number(guards.weekday_retry_days || 1)),
      packageRetryMinutes: Math.max(1, Number(guards.package_not_ready_retry_minutes || 10)),
      weekendEnabled: weekend.enabled !== false,
      weekendAutomatic: weekend.automatic_arrangement !== false,
      weekendCutoff: String(weekend.cutoff || '12:00'),
      weekendPickupFallback: weekend.pickup_fallback !== false
    };
  };

  const orderDeadline = schedule.deadline;
  const pickupConfirmed = schedule.confirmed;
  const pickupWindowLabel = (order) => {
    const { start, end } = schedule.window(order);
    if (!start) return ['DROP_OFF', 'DROPOFF'].includes(String(order.handover_method).toUpperCase()) ? 'Drop-off · no courier pickup' : 'Pickup time not supplied';
    return `${formatDate(start, { weekday: 'short', day: '2-digit', month: 'short' })} · ${formatDate(start, { hour: '2-digit', minute: '2-digit' })}${end ? `–${schedule.dayKey(start) !== schedule.dayKey(end) ? `${formatDate(end, { weekday: 'short', day: '2-digit', month: 'short' })} ` : ''}${formatDate(end, { hour: '2-digit', minute: '2-digit' })}` : ' · end unknown'} WIB`;
  };
  const pickupOrderState = (order) => {
    const health = schedule.classify(order, state.windowNow);
    return { ...health, key: health.key === 'complete' ? 'picked-up' : health.tone === 'red' ? 'awaiting-confirmation' : health.tone === 'amber' ? 'window-open' : 'scheduled' };
  };
  const pickupGroupCounts = group => {
    const orders = group?.orders || [];
    const pickedUp = orders.filter(pickupConfirmed).length;
    return { total: orders.length, pickedUp, awaiting: orders.length - pickedUp };
  };
  const board = () => schedule.build(state.data?.orders || [], {
    now: state.windowNow, day: state.day, account: state.account, query: state.query, filter: state.filter
  });
  const timeLabel = value => formatDate(value, { hour: '2-digit', minute: '2-digit' });
  const dayLabel = value => formatDate(value, { weekday: 'short', day: '2-digit', month: 'short' });
  const shortAccount = order => `${String(order.platform || 'Marketplace').replace(/^shopee$/, 'Shopee').replace(/^tiktok$/, 'TikTok')} · ${String(order.account_key || 'Unknown shop').replace(/[-_](shopee|tiktok)$/i, '').replace(/[-_]/g, ' ')}`;
  const countLabel = n => `${n} shipment${n === 1 ? '' : 's'}`;
  const deadlineLabel = order => {
    const due = orderDeadline(order);
    return due ? `${dayLabel(due)} · ${timeLabel(due)} WIB` : 'Ship-by time not supplied';
  };
  const canReschedule = order => !pickupConfirmed(order) && schedule.classify(order, state.windowNow).label !== 'Cancellation pending' && String(order.platform).toLowerCase() === 'shopee'
    && (String(order.handover_method).toUpperCase() === 'PICKUP' || Boolean(schedule.window(order).start));
  const renderSchedule = () => {
    if (!refs.map || !state.data) return;
    const model = board();
    state.board = model;
    const { start, end } = model.range;
    const position = date => Math.max(0, Math.min(100, (date - start) / (end - start) * 100));
    const nowVisible = state.windowNow >= start && state.windowNow < end;
    const scroll = refs.map.querySelector('.shipment-timeline-scroll')?.scrollLeft || 0;
    const focused = document.activeElement?.dataset?.shipmentFocus;
    const ticks = [0, 6, 12, 18, 24].map(hour => `<span style="left:${hour / 24 * 100}%">${hour === 24 ? '24:00' : `${String(hour).padStart(2, '0')}:00`}</span>`).join('');
    const rows = model.groups.map((group, index) => {
      const health = group.health;
      const left = position(group.start), right = position(group.end || group.start);
      const deadlineHere = group.deadline && group.deadline >= start && group.deadline < end;
      const windowTime = date => `${schedule.dayKey(date) !== state.day ? `${formatDate(date, { weekday: 'short' })} ` : ''}${timeLabel(date)}`;
      const complete = group.pending === 0;
      const progress = group.pickedUp / group.orders.length * 100;
      return `<button type="button" class="shipment-lane is-${health.tone}" data-shipment-group="${index}" data-shipment-focus="${escapeHtml(`group-${encodeURIComponent(group.key)}`)}"
        aria-label="${escapeHtml(group.carrier)}, ${escapeHtml(shortAccount(group.orders[0]))}, ${escapeHtml(pickupWindowLabel(group.orders[0]))}. ${escapeHtml(health.label)}. ${group.pickedUp} of ${group.orders.length} picked up. View orders.">
        <span class="shipment-lane-heading"><strong>${escapeHtml(group.carrier)}</strong><small>${escapeHtml(shortAccount(group.orders[0]))}</small>
          <span class="shipment-lane-progress"><i><b style="width:${progress}%"></b></i><span>${group.pickedUp}/${group.orders.length} picked up</span></span>
        </span>
        <span class="shipment-lane-track" aria-hidden="true">
          ${nowVisible ? `<i class="shipment-now" style="left:${position(state.windowNow)}%"></i>` : ''}
          <span class="shipment-window ${group.end ? '' : 'is-point'}" style="left:${left}%;width:${Math.max(.4, right - left)}%"></span>
          <span class="shipment-window-time ${left > 66 ? 'is-end' : ''}" style="left:${Math.min(99, left)}%">${windowTime(group.start)}${group.end ? `–${windowTime(group.end)}` : ' · end unknown'}</span>
          ${deadlineHere ? `<i class="shipment-deadline" style="left:${position(group.deadline)}%" title="Ship by ${timeLabel(group.deadline)} WIB"></i>` : ''}
        </span>
        <span class="shipment-lane-result"><strong>${escapeHtml(health.label)}</strong>
          <small>${complete ? 'All shipments collected' : `${group.pending} awaiting · ${group.prepared}/${group.pending} prepared`}</small>
          <span>${group.deadline ? `${group.orders.length > 1 ? 'First ship by' : 'Ship by'} ${dayLabel(group.deadline)} · ${timeLabel(group.deadline)}` : complete ? 'View pickup details →' : 'Ship-by time unavailable'}</span>
        </span>
      </button>`;
    }).join('');
    const remaining = model.other;
    const shown = remaining.slice(0, state.otherLimit);
    const list = shown.map((order, index) => {
      const health = schedule.classify(order, state.windowNow);
      const confirmed = pickupConfirmed(order);
      return `<button type="button" class="shipment-order is-${health.tone}" data-shipment-order="${index}" data-shipment-focus="${escapeHtml(`order-${encodeURIComponent(orderIdentity(order))}`)}">
        <span><strong>${escapeHtml(order.order_id)}</strong><small>${escapeHtml(shortAccount(order))}${order.package_id ? ` · ${escapeHtml(order.package_id)}` : ''}</small></span>
        <span><strong>${escapeHtml(health.label)}</strong><small>${escapeHtml(health.detail)}</small></span>
        <span><strong>${escapeHtml(confirmed ? 'Pickup confirmed' : schedule.window(order).start ? pickupWindowLabel(order) : order.shipping_provider_name || 'Courier not supplied')}</strong>
          <small>${escapeHtml(confirmed ? formatEventTime(order.pickup_confirmed_at || order.picked_up_at) : `Ship by ${deadlineLabel(order)}`)}</small></span>
        <span class="shipment-order-arrow" aria-hidden="true">↗</span>
      </button>`;
    }).join('');
    const hasScope = state.account || state.query || state.filter !== 'all';
    refs.map.innerHTML = `
      ${model.groups.length ? `<div class="shipment-timeline-scroll" tabindex="0" role="region" aria-label="Pickup timeline; scroll horizontally on small screens">
        <div class="shipment-timeline">
          <div class="shipment-axis"><span>Courier / shop</span><div>${ticks}${nowVisible ? `<b class="shipment-now-label" style="left:${position(state.windowNow)}%">Now ${timeLabel(state.windowNow)}</b>` : ''}</div><span>Handover status</span></div>
          ${rows}
        </div>
      </div>` : `<div class="shipment-empty ${remaining.length ? 'is-compact' : ''}">
        <span class="shipment-empty-symbol" aria-hidden="true">${model.counts.pending ? '◷' : '✓'}</span>
        <strong>${hasScope ? 'No pickup windows match this view' : model.counts.pending ? 'No pickup windows on this day' : model.counts.complete ? 'Pickups on this day are complete' : 'No shipments to show for this day'}</strong>
        <p>${remaining.length ? model.counts.pending ? 'Shipments outside this day or without a booked window are listed below.' : 'Confirmed collections are listed below.' : hasScope ? 'Try another day, shop or filter.' : 'No outstanding shipments were returned. Choose another day to inspect recent pickup history.'}</p>
      </div>`}
      ${remaining.length ? `<section class="shipment-other">
        <header><div><h3>${!model.counts.pending ? 'Pickup confirmations' : model.groups.length ? 'Outside this timeline' : 'Shipment list'} <span>${remaining.length}</span></h3><p>${model.counts.pending ? 'Earlier or later pickups, drop-offs and shipments without a window. Most urgent first.' : 'Marketplace confirmations for the selected day.'}</p></div></header>
        ${list}
        ${remaining.length > shown.length ? `<button type="button" class="admin-arrangement-secondary-button shipment-show-more" data-shipment-more>Show ${Math.min(20, remaining.length - shown.length)} more · ${remaining.length - shown.length} remaining</button>` : ''}
      </section>` : ''}
      <footer class="shipment-board-foot"><span>${countLabel(model.groups.reduce((n, g) => n + g.orders.length, 0) + remaining.length)} in this view${model.groups.length && state.filter !== 'all' ? ' · shared pickup windows include their full group' : ''}</span><span>Prepared = confirmed in Store Ops · Pickup history: last 14 days</span></footer>`;
    const scroller = refs.map.querySelector('.shipment-timeline-scroll');
    if (scroller) scroller.scrollLeft = scroll;
    if (focused) refs.map.querySelector(`[data-shipment-focus="${focused}"]`)?.focus({ preventScroll: true });
    if (refs.windowLabel) refs.windowLabel.textContent = `${dayLabel(start)} · WIB (UTC+7)`;
    if (refs.date) refs.date.value = state.day;
    root.querySelectorAll('[data-shipment-filter]').forEach(button => {
      const key = button.dataset.shipmentFilter;
      button.setAttribute('aria-pressed', String(state.filter === key));
      button.classList.toggle('is-selected', state.filter === key);
    });
    Object.entries(model.counts).forEach(([key, count]) => {
      const metric = root.querySelector(`[data-arrangement-metric="${key}"]`);
      if (metric) metric.textContent = String(count);
    });
    const completedLabel = root.querySelector('[data-shipment-completed-label]');
    if (completedLabel) completedLabel.textContent = state.day === schedule.dayKey(state.windowNow) ? 'Picked up today' : `Picked up ${dayLabel(start)}`;
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
    const pickupState = pickupOrderState({ ...order, ...scheduledOrder }, state.pickupEvent?.group);
    const marketplace = String(order.platform || scheduledOrder.platform).toLowerCase() === 'tiktok' ? 'TikTok' : 'Shopee';
    const currency = order.currency || 'IDR';
    const gross = Number(financials.gross_revenue || 0);
    const fees = Number(financials.marketplace_fees || 0);
    const net = Number(financials.net_revenue || 0);
    const feeRate = gross > 0 ? `${((fees / gross) * 100).toFixed(1)}% of gross` : 'Gross sale unavailable';
    const sources = financials.sources || {};
    const netSource = String(sources.net_revenue?.source || 'missing');
    const financeQuality = !financials.available
      ? ['Financial data unavailable', `${marketplace} has not supplied stored financial facts for this order yet.`, 'is-unavailable']
      : netSource === 'gross_revenue_fallback' || netSource === 'missing'
        ? ['Financials are provisional', `Net revenue is provisional; values may change when ${marketplace} releases the order income.`, 'is-provisional']
        : [`${marketplace} financials stored`, 'Gross, deductions, and seller net come from the stored marketplace order record.', 'is-ready'];
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
            <div><dt>Ship-by deadline</dt><dd>${escapeHtml(deadlineLabel(scheduledOrder))}</dd></div>
            <div><dt>Workflow</dt><dd>${escapeHtml(readableStatus(order.workflow_status, 'Not supplied'))}</dd></div>
          </dl>
        </section>

        <section class="admin-arrangement-finance-grid">
          <article><span>Customer paid</span><strong>${financials.available ? formatMoney(gross, currency) : '—'}</strong><small>Gross order value</small></article>
          <article><span>${marketplace} deductions</span><strong>${financials.available ? formatMoney(fees, currency) : '—'}</strong><small>${escapeHtml(feeRate)} · gross minus seller net</small></article>
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
                    <div><dt>${marketplace} deductions</dt><dd>${formatMoney(item.marketplace_fees || 0, currency)}</dd></div>
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
    refs.eventOverlay.hidden = false;
    refs.eventOverlay.setAttribute('aria-hidden', 'false');
    if (refs.eventKicker) refs.eventKicker.textContent = isWindow ? `${group.carrier || 'Courier'} · ${group.account || ''}` : 'Shipment details';
    if (refs.eventTitle) {
      refs.eventTitle.textContent = isWindow
        ? pickupWindowLabel(orders[0])
        : String(orders[0]?.order_id || 'Shipment');
    }
    if (refs.eventSubtitle) {
      refs.eventSubtitle.textContent = isWindow
        ? `${counts.total} scheduled shipment${counts.total === 1 ? '' : 's'} · ${counts.awaiting} awaiting collection`
        : `${shortAccount(orders[0] || {})} · ${pickupWindowLabel(orders[0] || {})}`;
    }
    if (refs.eventOrders) {
      refs.eventOrders.innerHTML = `
        <div class="admin-arrangement-event-summary">
          <span>${isWindow ? 'Window progress' : 'Pickup progress'}</span>
          <strong>${counts.pickedUp}/${counts.total}</strong>
          <small>${counts.pickedUp} picked up · ${counts.awaiting} awaiting confirmation</small>
          <div class="admin-arrangement-event-progress" aria-label="${counts.pickedUp} of ${counts.total} picked up">
            <i style="--pickup-progress:${counts.total ? (counts.pickedUp / counts.total) * 100 : 0}%"></i>
          </div>
        </div>
        ${orders.length === 1 && canReschedule(orders[0]) ? '<button type="button" class="admin-arrangement-secondary-button shipment-inspector-change" data-inspector-change-pickup>Change pickup</button>' : ''}
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
    if (selectedOrder) {
      refs.orderDetail.insertAdjacentHTML('afterbegin', `<div class="shipment-inspector-facts">
        <div><small>Preparation</small><strong>${escapeHtml(schedule.preparation(selectedOrder))}</strong></div>
        <div><small>Ship by</small><strong>${escapeHtml(deadlineLabel(selectedOrder))}</strong></div>
        ${orders.length > 1 && canReschedule(selectedOrder) ? '<button type="button" class="admin-arrangement-secondary-button" data-inspector-change-pickup>Change pickup</button>' : ''}
      </div>`);
    }
  };

  const closePickupEvent = () => {
    const returnFocus = state.pickupEvent?.returnFocus;
    const returnKey = returnFocus?.dataset?.shipmentFocus;
    state.pickupEvent = null;
    if (refs.eventOverlay) {
      refs.eventOverlay.hidden = true;
      refs.eventOverlay.setAttribute('aria-hidden', 'true');
    }
    document.documentElement.classList.remove('has-arrangement-dialog');
    renderSchedule();
    const target = returnKey ? Array.from(refs.map?.querySelectorAll('[data-shipment-focus]') || []).find(element => element.dataset.shipmentFocus === returnKey) : returnFocus;
    if (target instanceof HTMLElement && document.contains(target)) queueMicrotask(() => target.focus({ preventScroll: true }));
  };

  const openPickupInspector = (kind, groupIndex, returnFocus = null) => {
    const selected = kind === 'order' ? state.board?.other[Number(groupIndex)] : null;
    const group = kind === 'window' ? state.board?.groups[Number(groupIndex)] : selected ? { orders: [selected] } : null;
    if (!group) return;
    const id = ++state.pickupEventSequence;
    state.pickupEvent = {
      id,
      kind: kind === 'window' ? 'window' : 'order',
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
    const pending = { order, loading: true };
    state.reschedule = pending;
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
      if (state.reschedule !== pending) return;
      state.reschedule = { order, payload };
    } catch (error) {
      if (state.reschedule !== pending) return;
      state.reschedule = { order, error: error.message };
    }
    renderRescheduler();
  };

  const renderStatus = () => {
    const age = state.lastLoaded ? Date.now() - state.lastLoaded : null;
    const stale = Boolean(state.loadError) || (age !== null && age > 3 * 60000);
    if (refs.live) {
      refs.live.classList.toggle('is-paused', stale);
      refs.live.innerHTML = `<i></i>${state.loading ? 'Checking shipments…' : stale ? 'Update delayed' : age === null ? 'Connecting' : `Checked ${age < 60000 ? 'just now' : `${Math.floor(age / 60000)}m ago`}`}`;
    }
    if (refs.notice) {
      const messages = [];
      if (state.loadError) messages.push(`${state.data ? 'Could not refresh. Showing the last successful snapshot' : 'Could not load shipments'}${state.lastLoaded ? ` from ${timeLabel(new Date(state.lastLoaded))} WIB` : ''}. ${state.loadError} Use Refresh to retry.`);
      else if (stale) messages.push('This snapshot is over 3 minutes old. Refresh to check the latest pickup confirmations.');
      if (state.incomplete) messages.push('The service returned a limited shipment list. Counts may be incomplete; refresh after the shipment service has updated.');
      if (state.data?.hard_set?.enabled === false) messages.push('Automatic arrangement is paused. Existing bookings are still tracked.');
      refs.notice.textContent = messages.join(' ');
      refs.notice.hidden = !messages.length;
    }
  };

  const renderAll = () => {
    renderStatus();
    renderSchedule();
  };

  const requestJson = async (url, options = {}) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {
        ...options,
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'application/json', ...(options.headers || {}) },
        signal: controller.signal
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload || payload.ok === false) throw new Error(payload?.error || 'Shipment service is unavailable.');
      return payload;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Shipment service timed out.');
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const load = async ({ showRules = false } = {}) => {
    if (state.loading) return;
    state.loading = true;
    refs.refresh?.setAttribute('disabled', '');
    refs.map?.setAttribute('aria-busy', 'true');
    renderStatus();
    try {
      let payload = await requestJson(`${endpoint}?limit=500`);
      if (!Array.isArray(payload.orders)) throw new Error('Shipment service returned an incomplete response.');
      const orders = [...payload.orders];
      const first = payload;
      let cursor = 0;
      while (payload.pagination?.has_more) {
        const next = Number(payload.pagination.next_after_id);
        const through = Number(payload.pagination.through_id);
        if (!Number.isSafeInteger(next) || next <= cursor || !Number.isSafeInteger(through) || through < next) throw new Error('Shipment pagination could not be completed.');
        cursor = next;
        payload = await requestJson(`${endpoint}?limit=500&after_id=${cursor}&through_id=${through}`);
        if (!Array.isArray(payload.orders) || !payload.pagination) throw new Error('Some shipment records could not be loaded.');
        orders.push(...payload.orders);
      }
      state.data = { ...first, orders };
      state.incomplete = !first.pagination && first.orders.length >= 500;
      state.lastLoaded = Date.now();
      state.windowNow = new Date();
      if (state.followToday) state.day = schedule.dayKey(state.windowNow);
      state.loadError = '';
      state.orderDetailCache.clear();
      const accounts = [...new Map(orders.map(order => [`${order.platform}|${order.account_key}`, shortAccount(order)])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
      if (state.account && !accounts.some(([key]) => key === state.account)) accounts.push([state.account, refs.account?.selectedOptions[0]?.textContent || state.account]);
      if (refs.account) {
        refs.account.innerHTML = '<option value="">All shops</option>' + accounts.map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`).join('');
        refs.account.value = state.account;
      }
      renderAll();
      // A background poll must not overwrite an unsaved rule edit.
      if (state.tab === 'rules' && (showRules || !state.workingPolicy)) showEditorAccess();
      if (state.pickupEvent) {
        const refreshed = new Map(orders.map(order => [orderIdentity(order), order]));
        state.pickupEvent.group.orders = state.pickupEvent.group.orders.map(order => refreshed.get(orderIdentity(order)) || order);
        renderPickupEvent();
      }
    } catch (error) {
      state.loadError = error.message;
      if (!state.data && refs.map) refs.map.innerHTML = '<div class="shipment-empty"><strong>Shipment status unavailable</strong><p>Refresh to retry. Counts will appear once the shipment service responds.</p></div>';
    } finally {
      state.loading = false;
      refs.refresh?.removeAttribute('disabled');
      refs.map?.setAttribute('aria-busy', 'false');
      renderStatus();
    }
  };

  const dayOptions = (selected) => [
    ['EARLIEST_WEEKDAY', 'Next available weekday'],
    ...DAYS.map((day, index) => [String(index + 1), day])
  ].map(([value, label]) => `<option value="${value}" ${String(selected) === value ? 'selected' : ''}>${label}</option>`).join('');

  const methodOptions = (selected) => ['PICKUP', 'DROP_OFF', 'HOLD']
    .map((value) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${value === 'DROP_OFF' ? 'Drop-off' : value.charAt(0) + value.slice(1).toLowerCase()}</option>`)
    .join('');

  const zeroEditorValues = () => {
    const current = zeroRulesFor();
    if (!refs.ruleGrid) return current;
    return {
      selectionPriority: refs.ruleGrid.querySelector('[name="zero-selection-priority"]')?.value || current.selectionPriority,
      weekdayPickupOnly: Boolean(refs.ruleGrid.querySelector('[name="zero-weekday-only"]')?.checked),
      deadlineDropoffFallback: Boolean(refs.ruleGrid.querySelector('[name="zero-deadline-dropoff"]')?.checked),
      weekdayRetryDays: Math.max(1, Number(refs.ruleGrid.querySelector('[name="weekday-retry-days"]')?.value || current.weekdayRetryDays)),
      packageRetryMinutes: Math.max(1, Number(refs.ruleGrid.querySelector('[name="package-retry-minutes"]')?.value || current.packageRetryMinutes)),
      weekendEnabled: Boolean(refs.ruleGrid.querySelector('[name="zero-weekend-enabled"]')?.checked),
      weekendAutomatic: Boolean(refs.ruleGrid.querySelector('[name="zero-weekend-automatic"]')?.checked),
      weekendCutoff: refs.ruleGrid.querySelector('[name="zero-weekend-cutoff"]')?.value || current.weekendCutoff,
      weekendPickupFallback: Boolean(refs.ruleGrid.querySelector('[name="zero-weekend-pickup"]')?.checked)
    };
  };

  const renderZeroDecisionPreview = () => {
    const preview = refs.ruleGrid?.querySelector('[data-zero-decision-preview]');
    if (!preview) return;
    const rules = zeroEditorValues();
    const preference = rules.selectionPriority === 'DROP_OFF_FIRST' ? 'Drop-off first' : 'Pickup first';
    const pickupScope = rules.weekdayPickupOnly ? 'Monday–Friday pickup only' : 'Earliest pickup on any day';
    const retry = rules.weekdayPickupOnly
      ? `Retry in ${rules.weekdayRetryDays} day${rules.weekdayRetryDays === 1 ? '' : 's'} while a weekday can still beat the deadline`
      : 'No weekday wait; the earliest marketplace slot can be used';
    const deadline = rules.deadlineDropoffFallback
      ? 'If waiting reaches the deadline, use drop-off when Shopee offers it'
      : 'Do not switch to drop-off at the deadline';
    const weekend = !rules.weekendEnabled
      ? 'Weekend Dependent handling is off'
      : rules.weekendAutomatic
        ? `Saturday order due Saturday/Sunday: use Saturday pickup before ${rules.weekendCutoff} when drop-off is unavailable`
        : `Saturday order due Saturday/Sunday: flag for manual handling; no automatic weekend arrangement`;
    preview.innerHTML = [
      ['1', 'Start', preference, 'is-start'],
      ['2', 'Pickup filter', pickupScope, rules.weekdayPickupOnly ? 'is-pickup' : 'is-neutral'],
      ['3', 'No usable pickup', retry, rules.weekdayPickupOnly ? 'is-wait' : 'is-neutral'],
      ['4', 'Deadline guard', deadline, rules.deadlineDropoffFallback ? 'is-dropoff' : 'is-hold'],
      ['5', 'No usable drop-off', weekend, rules.weekendEnabled ? 'is-weekend' : 'is-hold']
    ].map(([number, label, detail, className], index) => `
      ${index ? '<span class="admin-arrangement-decision-arrow" aria-hidden="true">→</span>' : ''}
      <article class="admin-arrangement-decision-step ${className}">
        <i>${number}</i><span>${label}</span><strong>${escapeHtml(detail)}</strong>
      </article>`).join('');
  };

  const renderEditor = () => {
    if (!state.workingPolicy || !refs.ruleGrid) return;
    const zero = zeroRulesFor();
    refs.ruleGrid.className = 'admin-arrangement-pickup-editor';
    refs.ruleGrid.innerHTML = `
      <section class="admin-arrangement-smart-policy">
        <header class="admin-arrangement-smart-head">
          <div><span class="admin-panel-kicker">ZERO Shopee</span><h3>Smart handover decision</h3><p>Change the exact order in which pickup, retry, drop-off, and the weekend exception are evaluated.</p></div>
          <span class="admin-arrangement-pause-lock">Hard Set remains paused</span>
        </header>
        <div class="admin-arrangement-decision-flow" data-zero-decision-preview aria-label="Current ZERO Shopee decision flow"></div>
        <div class="admin-arrangement-smart-controls">
          <label><span>First choice</span><select name="zero-selection-priority"><option value="PICKUP_FIRST" ${zero.selectionPriority === 'PICKUP_FIRST' ? 'selected' : ''}>Pickup first</option><option value="DROP_OFF_FIRST" ${zero.selectionPriority === 'DROP_OFF_FIRST' ? 'selected' : ''}>Drop-off first</option></select><small>Which offered method is checked first.</small></label>
          <label class="admin-arrangement-switch-control"><span>Weekday pickup only</span><input type="checkbox" name="zero-weekday-only" ${zero.weekdayPickupOnly ? 'checked' : ''}><small>Reject ordinary Saturday and Sunday pickup slots.</small></label>
          <label><span>No-weekday retry <em>All shops</em></span><div class="admin-arrangement-unit-input"><input type="number" name="weekday-retry-days" min="1" max="7" value="${zero.weekdayRetryDays}"><b>days</b></div><small>Shared timing; continue only while the next run is before ship-by.</small></label>
          <label><span>Package not ready <em>All shops</em></span><div class="admin-arrangement-unit-input"><input type="number" name="package-retry-minutes" min="1" max="1440" value="${zero.packageRetryMinutes}"><b>minutes</b></div><small>Shared delay before asking a marketplace for shipping options again.</small></label>
          <label class="admin-arrangement-switch-control"><span>Deadline drop-off</span><input type="checkbox" name="zero-deadline-dropoff" ${zero.deadlineDropoffFallback ? 'checked' : ''}><small>Use offered drop-off when another pickup retry would miss ship-by.</small></label>
          <label class="admin-arrangement-switch-control"><span>Weekend Dependent</span><input type="checkbox" name="zero-weekend-enabled" ${zero.weekendEnabled ? 'checked' : ''}><small>Recognize Saturday orders due Saturday or Sunday as urgent.</small></label>
          <label class="admin-arrangement-switch-control"><span>Automatic Saturday exception</span><input type="checkbox" name="zero-weekend-automatic" ${zero.weekendAutomatic ? 'checked' : ''}><small>The only automatic path allowed while Hard Set is paused.</small></label>
          <label><span>Saturday cutoff</span><input type="time" name="zero-weekend-cutoff" value="${escapeHtml(zero.weekendCutoff)}"><small>At this exact time, automatic handling closes.</small></label>
          <label class="admin-arrangement-switch-control"><span>Saturday pickup fallback</span><input type="checkbox" name="zero-weekend-pickup" ${zero.weekendPickupFallback ? 'checked' : ''}><small>Use Saturday pickup when drop-off is unavailable.</small></label>
        </div>
      </section>
      <div class="admin-arrangement-weekly-heading"><span class="admin-panel-kicker">All marketplaces</span><h3>Order day → pickup day</h3><p>These mappings remain available for fixed-day workflows.</p></div>
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
    renderZeroDecisionPreview();
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
    const zeroValues = zeroEditorValues();
    state.workingPolicy.account_overrides ||= {};
    state.workingPolicy.account_overrides.shopee ||= {};
    state.workingPolicy.account_overrides.shopee['zero-shopee'] = {
      method: 'MARKETPLACE_AVAILABLE',
      selection_priority: zeroValues.selectionPriority,
      weekday_pickup_only: zeroValues.weekdayPickupOnly,
      deadline_dropoff_fallback: zeroValues.deadlineDropoffFallback,
      weekend_dependent: {
        enabled: zeroValues.weekendEnabled,
        automatic_arrangement: zeroValues.weekendAutomatic,
        cutoff: zeroValues.weekendCutoff,
        pickup_fallback: zeroValues.weekendPickupFallback
      }
    };
    state.workingPolicy.guards ||= {};
    state.workingPolicy.guards.weekday_retry_days = zeroValues.weekdayRetryDays;
    state.workingPolicy.guards.package_not_ready_retry_minutes = zeroValues.packageRetryMinutes;
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
    const ready = ['shopee', 'tiktok'].every(platform => state.data?.policy?.policy?.platforms?.[platform]?.regular);
    let unavailable = root.querySelector('[data-shipment-rules-unavailable]');
    if (!ready) {
      if (!unavailable) {
        refs.policyForm?.insertAdjacentHTML('beforebegin', '<p class="admin-empty" data-shipment-rules-unavailable>Pickup rules are unavailable. Refresh to retry.</p>');
      }
      if (refs.policyForm) refs.policyForm.hidden = true;
      if (refs.unlock) refs.unlock.hidden = true;
      if (refs.applyMonday) refs.applyMonday.hidden = true;
      return;
    }
    unavailable?.remove();
    if (refs.unlock) refs.unlock.hidden = branch;
    if (refs.policyForm) refs.policyForm.hidden = false;
    if (refs.applyMonday) refs.applyMonday.hidden = !branch;
    state.workingPolicy = structuredClone(state.data?.policy?.policy || {});
    renderEditor();
    refs.policyForm?.classList.toggle('is-read-only', !branch);
    refs.policyForm?.querySelectorAll('input, select, button').forEach((control) => {
      control.disabled = !branch;
    });
    if (refs.policyMeta) {
      refs.policyMeta.textContent = `${branch ? 'Editable' : 'Read-only'} · Revision ${Number(state.data?.policy?.revision || 0)} · ${state.data?.policy?.updated_by || 'defaults'}`;
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
  refs.map?.addEventListener('click', event => {
    const group = event.target.closest('[data-shipment-group]');
    if (group) return openPickupInspector('window', Number(group.dataset.shipmentGroup), group);
    const order = event.target.closest('[data-shipment-order]');
    if (order) return openPickupInspector('order', Number(order.dataset.shipmentOrder), order);
    if (event.target.closest('[data-shipment-more]')) {
      const firstNew = state.otherLimit;
      state.otherLimit += 20;
      renderSchedule();
      refs.map.querySelector(`[data-shipment-order="${firstNew}"]`)?.focus({ preventScroll: true });
    }
  });
  root.querySelectorAll('[data-shipment-filter]').forEach(button => button.addEventListener('click', () => {
    state.filter = state.filter === button.dataset.shipmentFilter ? 'all' : button.dataset.shipmentFilter;
    state.otherLimit = 8;
    renderSchedule();
  }));
  const changeDay = (day, followToday = false) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(+schedule.bounds(day).start)) return;
    state.day = day;
    state.followToday = followToday;
    state.otherLimit = 8;
    renderSchedule();
  };
  root.querySelectorAll('[data-shipment-day]').forEach(button => button.addEventListener('click', () => {
    changeDay(schedule.dayKey(new Date(+schedule.bounds(state.day).start + Number(button.dataset.shipmentDay) * 86400000)));
  }));
  root.querySelector('[data-shipment-today]')?.addEventListener('click', () => changeDay(schedule.dayKey(new Date()), true));
  refs.date?.addEventListener('change', () => changeDay(refs.date.value));
  refs.account?.addEventListener('change', () => { state.account = refs.account.value; state.otherLimit = 8; renderSchedule(); });
  refs.search?.addEventListener('input', () => { state.query = refs.search.value; state.otherLimit = 8; renderSchedule(); });
  refs.eventOverlay?.addEventListener('click', (event) => {
    if (event.target === refs.eventOverlay || event.target.closest('[data-arrangement-event-close]')) {
      closePickupEvent();
      return;
    }
    if (event.target.closest('[data-inspector-change-pickup]')) {
      const order = state.pickupEvent?.group?.orders?.[state.pickupEvent.selectedIndex];
      if (order) { closePickupEvent(); openRescheduler(order); refs.rescheduler?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
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
    } else if (!event.shiftKey && (document.activeElement === last || !focusable.includes(document.activeElement))) {
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
      await load();
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
  refs.ruleGrid?.addEventListener('input', renderZeroDecisionPreview);
  refs.ruleGrid?.addEventListener('change', renderZeroDecisionPreview);
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
      await load({ showRules: true });
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
      const result = await requestJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy: state.workingPolicy,
          expected_revision: Number(state.data?.policy?.revision || 0)
        })
      });
      state.data = { ...state.data, policy: result.policy || state.data?.policy };
      await load();
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

  window.setInterval(() => {
    if (document.hidden || !root.classList.contains('is-active')) return;
    state.windowNow = new Date();
    if (state.followToday) state.day = schedule.dayKey(state.windowNow);
    renderStatus();
    if (state.tab === 'schedule' && !state.pickupEvent) renderSchedule();
  }, 30000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && root.classList.contains('is-active') && (!state.lastLoaded || Date.now() - state.lastLoaded > 60000)) load();
  });
  window.addEventListener('jg-shipment-arrangement-refresh', load);
  window.setInterval(() => {
    if (!document.hidden && root.classList.contains('is-active')) load();
  }, 60000);
  if (root.classList.contains('is-active')) load();
});
