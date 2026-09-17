/* Shared by the shipment board and its behavioral tests. All API timestamps are UTC. */
(function (scope) {
  'use strict';
  const HOUR = 3600000;
  const status = value => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const yes = value => value === true || value === 1 || value === '1';
  const parse = value => {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(+value) ? null : value;
    const raw = String(value).trim();
    const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw) ? raw : `${raw.replace(' ', 'T')}Z`);
    return Number.isNaN(+date) ? null : date;
  };
  const identity = order => [order.platform, order.account_key, order.order_id, order.package_id].map(v => v || '').join('|');
  const statuses = order => [order.marketplace_order_status, order.marketplace_package_status,
    order.marketplace_status, order.package_status, order.order_status, order.status].map(status);
  const cancelled = order => [...statuses(order), status(order.workflow_status)].some(s => ['CANCELLED', 'CANCELED', 'CANCEL', 'REFUNDED', 'RETURNED', 'REJECTED', 'FAILED', 'EXPIRED', 'CLOSED', 'TO_RETURN'].includes(s));
  const excluded = order => cancelled(order) || statuses(order).some(s => ['UNPAID', 'TO_PAY'].includes(s));
  const confirmed = order => !excluded(order) && (yes(order.pickup_confirmed)
    || Boolean(parse(order.pickup_confirmed_at) || parse(order.picked_up_at))
    || statuses(order).some(s => ['PICKED_UP', 'SHIPPED', 'TO_CONFIRM_RECEIVE', 'COMPLETED', 'DELIVERED',
      ...(String(order.platform).toLowerCase() === 'tiktok' ? ['IN_TRANSIT'] : [])].includes(s)));
  const deadline = order => [order.ship_by_at, order.collection_due_at, order.pickup_cutoff_at, order.deadline_at].map(parse).find(Boolean) || null;
  const prepared = order => yes(order.is_processed) || Boolean(parse(order.processed_at))
    || ['IS_PROCESSED', 'FULFILLED'].includes(status(order.workflow_status));
  const preparation = order => prepared(order) ? 'Prepared'
    : parse(order.label_printed_at) || status(order.workflow_status) === 'LABEL_PRINTED' ? 'Label printed · finish preparation'
      : yes(order.label_ready) ? 'Label ready · prepare order'
        : order.label_ready === false || order.label_ready === 0 || order.label_ready === '0' ? 'Label not ready'
          : 'Preparation not reported';
  const window = order => {
    if (status(order.handover_method) === 'DROP_OFF' || status(order.handover_method) === 'DROPOFF') return { start: null, end: null };
    const start = parse(order.pickup_start_at);
    const end = parse(order.pickup_end_at);
    return { start, end: start && end && end > start ? end : null };
  };
  const duration = ms => {
    const minutes = Math.max(1, Math.ceil(Math.abs(ms) / 60000));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60), rest = minutes % 60;
    if (hours < 24) return `${hours}h${rest ? ` ${rest}m` : ''}`;
    return `${Math.floor(hours / 24)}d${hours % 24 ? ` ${hours % 24}h` : ''}`;
  };
  const classify = (order, now) => {
    const due = deadline(order), { start, end } = window(order);
    if (confirmed(order)) return { key: 'complete', label: 'Picked up', tone: 'green', rank: 9, detail: 'Marketplace confirmed collection' };
    if ([...statuses(order), status(order.workflow_status), status(order.exception_status)].some(s => ['IN_CANCEL', 'CANCEL_REQUESTED', 'CANCELLATION_REQUESTED', 'CANCEL_PENDING', 'CANCELLATION_PENDING'].includes(s))) {
      return { key: 'review', label: 'Cancellation pending', tone: 'amber', rank: 2, detail: 'Review cancellation before handover' };
    }
    if (due && due <= now) return { key: 'overdue', label: 'Ship-by missed', tone: 'red', rank: 0, detail: `${duration(now - due)} overdue · pickup unconfirmed` };
    if (end && end <= now) return { key: 'missed', label: 'Pickup window missed', tone: 'red', rank: 1, detail: `Ended ${duration(now - end)} ago · pickup unconfirmed` };
    if (start && start <= now) return { key: 'open', label: end ? 'Pickup window open' : 'Pickup time reached', tone: 'amber', rank: 3,
      detail: end ? `${duration(end - now)} left · ${preparation(order).toLowerCase()}` : `End time unavailable · ${preparation(order).toLowerCase()}` };
    if (due && due - now <= 4 * HOUR) return { key: 'due', label: 'Ship by soon', tone: 'amber', rank: 3, detail: `${duration(due - now)} left to hand over` };
    if (start && start - now <= 2 * HOUR) return { key: 'soon', label: 'Pickup approaching', tone: 'amber', rank: 4, detail: `Starts in ${duration(start - now)} · ${preparation(order).toLowerCase()}` };
    if (order.last_error || ['NEEDS_MANUAL_REVIEW', 'ARRANGE_FAILED', 'LABEL_FAILED'].includes(status(order.workflow_status))) {
      return { key: 'review', label: 'Check arrangement', tone: 'amber', rank: 5, detail: order.last_error || 'Arrangement needs review' };
    }
    if (start) return { key: 'scheduled', label: 'Pickup scheduled', tone: 'blue', rank: 6, detail: `Starts in ${duration(start - now)}` };
    if (['DROP_OFF', 'DROPOFF'].includes(status(order.handover_method))) return { key: 'dropoff', label: 'Drop-off required', tone: 'blue', rank: 6, detail: 'Take this order to the carrier before ship-by' };
    if (yes(order.shipment_arranged)) return { key: 'unknown', label: 'Pickup time missing', tone: 'amber', rank: 5, detail: 'Arranged, but no courier window was supplied' };
    return { key: 'unbooked', label: 'Not arranged', tone: 'amber', rank: 5, detail: due ? 'No pickup booked · arrange before ship-by' : 'Pickup and ship-by times unavailable' };
  };
  const dayKey = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
  const bounds = day => {
    const start = new Date(`${day}T00:00:00+07:00`);
    return { start, end: new Date(+start + 24 * HOUR) };
  };
  const sortOrders = now => (a, b) => classify(a, now).rank - classify(b, now).rank
    || +(deadline(a) || window(a).start || 8640000000000000) - +(deadline(b) || window(b).start || 8640000000000000)
    || identity(a).localeCompare(identity(b));
  const attention = item => ['overdue', 'missed', 'review', 'unknown', 'unbooked'].includes(item.key);
  const soon = item => ['open', 'soon', 'due'].includes(item.key);
  const build = (source, { now = new Date(), day = dayKey(now), account = '', query = '', filter = 'all' } = {}) => {
    const range = bounds(day), term = query.trim().toLowerCase();
    const all = Array.from(new Map(source.filter(order => !excluded(order)).map(order => [identity(order), order])).values());
    const scoped = all.filter(order => (!account || `${order.platform}|${order.account_key}` === account)
      && (!term || [order.order_id, order.package_id, order.account_key, order.shipping_provider_name, order.platform].join(' ').toLowerCase().includes(term)));
    const pickedOnDay = order => {
      const at = parse(order.pickup_confirmed_at) || parse(order.picked_up_at);
      return confirmed(order) && at && at >= range.start && at < range.end;
    };
    const counts = { attention: 0, soon: 0, pending: 0, complete: 0 };
    scoped.forEach(order => {
      const item = classify(order, now);
      if (!confirmed(order)) {
        counts.pending++;
        if (attention(item)) counts.attention++;
        if (soon(item)) counts.soon++;
      }
      if (pickedOnDay(order)) counts.complete++;
    });
    const matches = order => filter === 'attention' ? !confirmed(order) && attention(classify(order, now))
      : filter === 'soon' ? !confirmed(order) && soon(classify(order, now))
        : filter === 'pending' ? !confirmed(order) : filter === 'complete' ? pickedOnDay(order) : true;
    const groups = new Map();
    scoped.forEach(order => {
      const { start, end } = window(order);
      if (!start || start >= range.end || (end ? end <= range.start : start < range.start)) return;
      const key = [order.platform, order.account_key, order.shipping_provider_name, +start, end ? +end : ''].join('|');
      if (!groups.has(key)) groups.set(key, { key, start, end, orders: [], carrier: order.shipping_provider_name || 'Carrier not supplied', account: order.account_key || 'Unknown account' });
      groups.get(key).orders.push(order);
    });
    const visibleGroups = [...groups.values()].filter(group => group.orders.some(matches)).map(group => {
      group.orders.sort(sortOrders(now));
      group.pickedUp = group.orders.filter(confirmed).length;
      group.pending = group.orders.length - group.pickedUp;
      group.prepared = group.orders.filter(order => !confirmed(order) && prepared(order)).length;
      group.health = classify(group.orders[0], now);
      group.deadline = group.orders.filter(order => !confirmed(order)).map(deadline).filter(Boolean).sort((a, b) => a - b)[0] || null;
      return group;
    }).sort((a, b) => a.start - b.start || a.carrier.localeCompare(b.carrier) || a.account.localeCompare(b.account));
    const groupedKeys = new Set(visibleGroups.flatMap(group => group.orders.map(identity)));
    const other = scoped.filter(order => matches(order) && !groupedKeys.has(identity(order)) && (!confirmed(order) || pickedOnDay(order))).sort(sortOrders(now));
    return { groups: visibleGroups, other, counts, range, all, scoped };
  };
  const api = { HOUR, parse, identity, confirmed, excluded, deadline, prepared, preparation, window, duration, classify, dayKey, bounds, build };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else scope.JgShipmentSchedule = api;
})(typeof window === 'undefined' ? globalThis : window);
