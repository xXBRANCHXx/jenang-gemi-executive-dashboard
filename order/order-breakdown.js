const root = document.querySelector('[data-order-breakdown]');

if (root) {
  const refs = {
    title: root.querySelector('[data-order-title]'),
    subtitle: root.querySelector('[data-order-subtitle]'),
    status: root.querySelector('[data-order-status]'),
    label: root.querySelector('[data-order-label]'),
    loading: root.querySelector('[data-order-loading]'),
    error: root.querySelector('[data-order-error]'),
    errorMessage: root.querySelector('[data-order-error-message]'),
    retry: root.querySelector('[data-order-retry]'),
    content: root.querySelector('[data-order-content]'),
    net: root.querySelector('[data-order-net]'),
    cogs: root.querySelector('[data-order-cogs]'),
    packing: root.querySelector('[data-order-packing]'),
    gp: root.querySelector('[data-order-gp]'),
    margin: root.querySelector('[data-order-margin]'),
    coverage: root.querySelector('[data-order-coverage]'),
    itemCount: root.querySelector('[data-order-item-count]'),
    items: root.querySelector('[data-order-items]'),
    timelineSummary: root.querySelector('[data-order-timeline-summary]'),
    timeline: root.querySelector('[data-order-timeline]'),
    facts: root.querySelector('[data-order-facts]')
  };

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
  const readable = (value, fallback = 'Not supplied') => {
    const text = String(value || '').trim();
    if (!text) return fallback;
    return text.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  };
  const money = (value, currency = 'IDR') => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: currency || 'IDR', maximumFractionDigits: 0
  }).format(Number(value || 0));
  const dateTime = (value) => {
    const date = new Date(value || '');
    return Number.isNaN(date.getTime()) ? 'Not supplied' : new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta'
    }).format(date);
  };
  const timelineIcon = (kind) => {
    const icons = {
      order: '<svg viewBox="0 0 24 24"><path d="M5 7h14l-1 12H6L5 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>',
      payment: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h3"/></svg>',
      arranged: '<svg viewBox="0 0 24 24"><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
      pickup_window: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M12 13v4l3 1"/></svg>',
      deadline: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></svg>',
      pickup_confirmed: '<svg viewBox="0 0 24 24"><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><path d="m6 11 2 2 4-4"/><circle cx="18" cy="18" r="2"/></svg>',
      funds: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></svg>',
      event: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg>'
    };
    return icons[String(kind || '').toLowerCase()] || icons.event;
  };

  const render = (payload) => {
    const order = payload.order || {};
    const financials = payload.financials || {};
    const coverage = payload.coverage || {};
    const items = Array.isArray(payload.items) ? payload.items : [];
    const timeline = Array.isArray(payload.timeline) ? payload.timeline : [];
    const currency = financials.currency || 'IDR';
    const status = order.status || order.package_status || 'Order found';
    const physicalItems = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const now = Date.now();
    const timelineDates = timeline.map((event) => {
      const date = new Date(event.at || '');
      return Number.isNaN(date.getTime()) ? null : date;
    });
    const nextIndex = timelineDates.findIndex((date) => date && date.getTime() > now);
    const completedCount = timelineDates.filter((date) => date && date.getTime() <= now).length;
    const nextEvent = nextIndex >= 0 ? timeline[nextIndex] : null;
    const progress = timeline.length ? Math.min(100, Math.max(0, (completedCount / timeline.length) * 100)) : 0;

    document.title = `${order.order_id || root.dataset.orderId} · Order breakdown`;
    refs.title.textContent = order.order_id || root.dataset.orderId;
    refs.subtitle.textContent = [readable(order.platform, ''), order.account_key, dateTime(order.ordered_at)]
      .filter(Boolean).join(' · ');
    refs.status.textContent = readable(status);
    refs.status.dataset.tone = /cancel|fail|remove/.test(String(status).toLowerCase())
      ? 'danger'
      : /fulfilled|delivered|completed|processed/.test(String(status).toLowerCase()) ? 'done' : 'neutral';
    const labelAvailable = Boolean(order.label_ready && order.label_url);
    refs.label.classList.toggle('is-available', labelAvailable);
    refs.label.setAttribute('aria-disabled', labelAvailable ? 'false' : 'true');
    refs.label.querySelector('span').textContent = labelAvailable ? 'View label' : 'Label unavailable';
    if (labelAvailable) {
      refs.label.href = order.label_url;
      refs.label.target = '_blank';
      refs.label.rel = 'noopener noreferrer';
    } else {
      refs.label.removeAttribute('href');
      refs.label.removeAttribute('target');
      refs.label.removeAttribute('rel');
    }
    refs.net.textContent = money(financials.net_revenue, currency);
    refs.cogs.textContent = money(financials.cogs, currency);
    refs.packing.textContent = money(financials.packing_cost, currency);
    refs.gp.textContent = money(financials.estimated_gross_profit, currency);
    refs.gp.classList.toggle('is-negative', Number(financials.estimated_gross_profit || 0) < 0);
    refs.margin.textContent = financials.gross_margin_percent === null
      ? 'Net revenue − COGS − packing'
      : `${Number(financials.gross_margin_percent).toFixed(1)}% estimated gross margin`;
    refs.itemCount.textContent = `${physicalItems.toLocaleString('id-ID')} unit${physicalItems === 1 ? '' : 's'}`;

    const missingCogs = Number(coverage.cogs_missing_items || 0);
    const missingPacking = Number(coverage.packing_missing_items || 0);
    refs.coverage.className = `admin-order-cost-quality ${coverage.complete ? 'is-complete' : 'is-partial'}`;
    refs.coverage.innerHTML = coverage.complete
      ? '<strong>Complete cost coverage</strong><span>Every physical item has COGS and packing-cost coverage.</span>'
      : `<strong>Estimated GP has partial cost coverage</strong><span>${missingCogs.toLocaleString('id-ID')} item(s) missing COGS · ${missingPacking.toLocaleString('id-ID')} item(s) missing packing cost. Missing costs are treated as Rp0.</span>`;

    refs.items.innerHTML = items.length ? items.map((item) => `
      <article class="admin-order-product">
        <div class="admin-order-product-head">
          <div><strong>${escapeHtml(item.name || 'Order item')}</strong><span>${escapeHtml([item.sku || item.marketplace_sku, item.flavor].filter(Boolean).join(' · ') || 'SKU unavailable')}</span></div>
          <b>×${Number(item.quantity || 0).toLocaleString('id-ID')}</b>
        </div>
        <dl>
          <div><dt>Net revenue</dt><dd>${money(item.net_revenue, currency)}</dd></div>
          <div><dt>COGS</dt><dd>${money(item.cogs, currency)}</dd></div>
          <div><dt>Packing</dt><dd>${money(item.packing_cost, currency)}</dd></div>
          <div><dt>Est. GP</dt><dd class="${Number(item.estimated_gross_profit || 0) < 0 ? 'is-negative' : ''}">${money(item.estimated_gross_profit, currency)}</dd></div>
        </dl>
        ${item.is_free_gift ? '<small class="admin-order-product-note">Free gift · costs included with no attributed revenue</small>' : ''}
      </article>`).join('') : '<p class="admin-empty">No product lines are stored for this order yet.</p>';

    refs.timelineSummary.innerHTML = `
      <div class="admin-order-current-state">
        <i aria-hidden="true"></i>
        <div><span>Current status</span><strong>${escapeHtml(readable(status))}</strong></div>
      </div>
      <div class="admin-order-next-state">
        <span>${nextEvent ? 'Next milestone' : 'Next update'}</span>
        <strong>${escapeHtml(nextEvent?.label || 'Waiting for source confirmation')}</strong>
        <small>${nextEvent ? escapeHtml(dateTime(nextEvent.at)) : 'No later milestone has been supplied yet'}</small>
      </div>
      <div class="admin-order-progress" aria-label="${completedCount} of ${timeline.length} recorded milestones completed">
        <span><strong>${completedCount}</strong> of ${timeline.length} milestones done</span>
        <div><i style="--order-progress:${progress}%"></i></div>
      </div>`;

    refs.timeline.innerHTML = timeline.length ? timeline.map((event, index) => {
      const kind = String(event.kind || 'event').toLowerCase();
      const at = timelineDates[index];
      const scheduled = at && at.getTime() > now;
      const milestoneState = scheduled ? (index === nextIndex ? 'next' : 'upcoming') : 'done';
      return `
        <li class="is-${escapeHtml(kind)} is-${milestoneState}">
          <div class="admin-order-timeline-marker" aria-hidden="true">${timelineIcon(kind)}</div>
          <div class="admin-order-timeline-copy">
            <div><strong>${escapeHtml(event.label || 'Order event')}</strong><b>${milestoneState === 'done' ? 'Done' : milestoneState === 'next' ? 'Next' : 'Upcoming'}</b></div>
            ${event.note ? `<span>${escapeHtml(event.note)}</span>` : ''}
          </div>
          <time>${escapeHtml(dateTime(event.at))}</time>
        </li>`;
    }).join('') : '<li class="is-empty"><div class="admin-order-timeline-marker" aria-hidden="true">' + timelineIcon('event') + '</div><div class="admin-order-timeline-copy"><strong>No timeline facts stored</strong><span>The source has not supplied lifecycle timestamps yet.</span></div></li>';

    const facts = [
      ['Order ID', order.order_id],
      ['Source', readable(order.platform)],
      ['Account', order.account_key || 'Not supplied'],
      ['Marketplace status', readable(order.status)],
      ['Package status', readable(order.package_status)],
      ['Courier', order.shipping_provider || 'Not supplied'],
      ['Last data update', dateTime(order.updated_at)]
    ];
    refs.facts.innerHTML = facts.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('');
    refs.loading.hidden = true;
    refs.error.hidden = true;
    refs.content.hidden = false;
  };

  const load = async () => {
    const orderId = String(root.dataset.orderId || '').trim();
    refs.loading.hidden = false;
    refs.error.hidden = true;
    refs.content.hidden = true;
    if (!orderId) {
      refs.loading.hidden = true;
      refs.error.hidden = false;
      refs.errorMessage.textContent = 'No order ID was supplied.';
      return;
    }
    const query = new URLSearchParams({ action: 'order_detail', order_id: orderId });
    try {
      const response = await fetch(`${root.dataset.endpoint}?${query}`, { credentials: 'same-origin', cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.message || payload.error || 'Order detail request failed.');
      render(payload);
    } catch (error) {
      refs.loading.hidden = true;
      refs.error.hidden = false;
      refs.errorMessage.textContent = error instanceof Error ? error.message : 'Order detail request failed.';
      refs.status.textContent = 'Unavailable';
      refs.status.dataset.tone = 'danger';
    }
  };

  refs.retry?.addEventListener('click', load);
  load();
}
