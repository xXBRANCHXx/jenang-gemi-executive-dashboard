document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('[data-billing-notification-toggle]');
  const drawer = document.querySelector('[data-billing-notification-drawer]');
  const list = document.querySelector('[data-billing-notification-list]');
  if (!(toggle instanceof HTMLButtonElement) || !(drawer instanceof HTMLElement) || !(list instanceof HTMLElement)) return;

  const endpoint = toggle.dataset.billingEndpoint || '/api/partner-billing/';
  const count = document.querySelector('[data-billing-notification-count]');
  const summary = document.querySelector('[data-billing-notification-summary]');
  const close = document.querySelector('[data-billing-notification-close]');
  const back = document.querySelector('[data-billing-notification-back]');
  const backdrop = document.querySelector('[data-billing-notification-backdrop]');
  const mode = document.querySelector('[data-billing-notification-mode]');
  const state = { open: false, loading: false, events: [], selectedId: '', feedback: null };

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const money = (value) => `Rp ${Math.round(Number(value || 0)).toLocaleString('id-ID')}`;
  const shortDate = (value) => {
    const date = new Date(String(value || '').replace(' ', 'T') + (String(value || '').includes('Z') ? '' : 'Z'));
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(date);
  };
  const relativeTime = (value) => {
    const date = new Date(String(value || '').replace(' ', 'T') + (String(value || '').includes('Z') ? '' : 'Z'));
    if (Number.isNaN(date.getTime())) return '';
    const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const request = async (options = {}) => {
    const response = await fetch(options.url || `${endpoint}?action=notifications&_ts=${Date.now()}`, {
      method: options.method || 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json', ...(options.headers || {}) },
      body: options.body
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) throw new Error(payload.error || `HTTP ${response.status}`);
    return payload;
  };

  const avatarMarkup = (event) => `
    <span class="admin-billing-avatar">
      <img src="${escapeHtml(event.favicon_url || '')}" alt="" data-billing-avatar-image>
      <span data-billing-avatar-fallback aria-hidden="true">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 20a7 7 0 0 1 14 0"></path></svg>
      </span>
    </span>`;

  const paymentTitle = (event) => `${event.partner_name} paid their ${event.period_type === 'calendar_month' ? 'monthly' : 'calendar-week'} bill ${event.period_label}`;
  const disputeTitle = (event) => event.dispute_type === 'price'
    ? `${event.partner_name} proposed new prices for ${event.items?.length || 0} orders`
    : `${event.partner_name} disputed ${event.items?.length || 0} orders on ${event.period_label}`;
  const eventTitle = (event) => {
    if (event.type === 'payment') return paymentTitle(event);
    if (event.type === 'dispute') return disputeTitle(event);
    if (event.type === 'balance_deposit') return `${event.partner_name} requested a balance deposit`;
    if (event.type === 'stock_order') return `${event.partner_name} placed a stock order`;
    return `${event.partner_name || 'Partner'} needs review`;
  };
  const eventSubtitle = (event) => {
    if (event.type === 'payment') return 'Check proof of payment';
    if (event.type === 'dispute') return event.dispute_type === 'price' ? 'Review the proposed product prices' : 'Review the claimed paid orders';
    if (event.type === 'balance_deposit') return event.status === 'investigating' ? 'Investigation in progress · review corrected amount' : 'Verify proof and approve the balance';
    if (event.type === 'stock_order') return `${event.items?.length || 0} products · arrange shipment and upload label`;
    return 'Open review';
  };

  const eventVersion = (event) => JSON.stringify(event);
  const listRowMarkup = (event, index) => `
      <article class="admin-billing-notification-row is-${escapeHtml(event.type)}" style="--billing-row-index:${index}" data-billing-event-id="${escapeHtml(event.id)}">
        <button type="button" class="admin-billing-notification-main" data-billing-select="${escapeHtml(event.id)}">
          ${avatarMarkup(event)}
          <span class="admin-billing-notification-copy">
            <strong>${escapeHtml(eventTitle(event))}</strong>
            <small>${escapeHtml(eventSubtitle(event))}</small>
            <em><span>${escapeHtml(event.type === 'dispute' && event.dispute_type === 'price' ? `${money(event.amount)} → ${money((event.items || []).reduce((sum, item) => sum + Number(item.proposed_amount || 0), 0))}` : money(event.amount))}</span> · <span data-billing-relative-time>${escapeHtml(relativeTime(event.created_at))}</span></em>
          </span>
          <svg class="admin-billing-row-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
        </button>
        ${event.type === 'dispute' ? `<div class="admin-billing-quick-actions"><button type="button" data-billing-action="accept_dispute" data-record-id="${Number(event.record_id)}">${event.dispute_type === 'price' ? 'Accept proposed prices' : 'Accept'}</button><button type="button" data-billing-select="${escapeHtml(event.id)}">Investigate</button></div>` : ''}
        ${event.type === 'balance_deposit' ? `<div class="admin-billing-quick-actions"><button type="button" data-stock-action="approve_deposit" data-record-id="${Number(event.record_id)}">Approve</button><a href="${escapeHtml(event.detail_url)}">Investigate</a></div>` : ''}
        ${event.type === 'stock_order' ? `<div class="admin-billing-quick-actions"><a href="${escapeHtml(event.detail_url)}">Open partner activity</a></div>` : ''}
      </article>`;

  const listMarkup = () => {
    if (!state.events.length) {
      return `<div class="admin-notification-empty admin-billing-empty"><span>✓</span><strong>All caught up</strong><p>No partner payments, deposits, disputes, or stock orders need review.</p></div>`;
    }
    return state.events.map(listRowMarkup).join('');
  };

  const paymentDetail = (event) => {
    const proof = event.proof || {};
    const isPdf = proof.mime_type === 'application/pdf';
    return `
      <article class="admin-billing-detail" data-billing-record="${Number(event.record_id)}">
        <div class="admin-billing-proof-head">
          <div>${avatarMarkup(event)}<span><small>Payment confirmation</small><strong>${escapeHtml(event.partner_name)}</strong><em>${escapeHtml(event.period_label)}</em></span></div>
          <button type="button" class="admin-billing-proof-close" data-billing-preview-close aria-label="Close proof preview">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>
          </button>
        </div>
        <div class="admin-billing-proof-frame is-${isPdf ? 'pdf' : 'image'}">
          ${isPdf
            ? `<object data="${escapeHtml(proof.url)}" type="application/pdf"><a href="${escapeHtml(proof.url)}" target="_blank" rel="noopener">Open payment proof</a></object>`
            : `<img src="${escapeHtml(proof.url)}" alt="Payment proof submitted by ${escapeHtml(event.partner_name)}">`}
        </div>
        <div class="admin-billing-proof-meta"><span><strong>${escapeHtml(proof.name || 'Payment proof')}</strong><small>${escapeHtml(shortDate(event.created_at))}</small></span><strong>${escapeHtml(money(event.amount))}</strong></div>
        <p class="admin-billing-detail-error" data-billing-detail-error hidden></p>
        <button type="button" class="admin-billing-confirm-button" data-billing-action="confirm_payment" data-record-id="${Number(event.record_id)}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>
          Confirm payment
        </button>
      </article>`;
  };

  const disputeProductMarkup = (item, line) => `
    <label class="admin-billing-price-line">
      <span><strong>${escapeHtml(line.label || line.sku_code || 'Product')}</strong><small>${Number(line.quantity || 1)} units${line.sku_code ? ` · ${escapeHtml(line.sku_code)}` : ''}</small></span>
      <span class="admin-billing-price-comparison"><del>${escapeHtml(money(line.original_unit_price || 0))}</del><i>→</i><span class="admin-billing-price-input"><em>Rp</em><input type="number" min="0" max="1000000000000" step="1" value="${Math.max(0, Math.round(Number(line.proposed_unit_price ?? line.original_unit_price ?? 0)))}" data-billing-adjust-price data-order-id="${escapeHtml(item.order_id)}" data-line-index="${Number(line.line_index || 0)}" required></span></span>
    </label>`;

  const disputeDetail = (event) => {
    const proposedTotal = (event.items || []).reduce((sum, item) => sum + Number(item.proposed_amount || 0), 0);
    const priceSummary = event.dispute_type === 'price' ? `${money(event.amount)} → ${money(proposedTotal)}` : `${money(event.amount)} disputed`;
    return `
    <article class="admin-billing-detail admin-billing-dispute-detail" data-billing-record="${Number(event.record_id)}">
      <header class="admin-billing-dispute-head">
        ${avatarMarkup(event)}
        <div><small>${event.dispute_type === 'price' ? 'Price review' : 'Dispute investigation'}</small><strong>${escapeHtml(event.partner_name)}</strong><span>${escapeHtml(event.period_label)} · ${escapeHtml(priceSummary)}</span></div>
      </header>
      <section class="admin-billing-dispute-reason"><span>Partner's explanation</span><p>${escapeHtml(event.reason || 'No explanation supplied.')}</p></section>
      <form class="admin-billing-adjust-form" data-billing-adjust-form>
        <section class="admin-billing-investigate-orders">
          <div><span>Orders and editable product prices</span><strong>${event.items?.length || 0}</strong></div>
          ${(event.items || []).map((item) => `<article class="admin-billing-price-order"><header><span><strong>${escapeHtml(item.order_id)}</strong><small>${escapeHtml(item.description || 'Order items')}</small><em>${escapeHtml(item.platform || 'Other')} · ${Number(item.units || 0)} units${item.customer_name ? ` · ${escapeHtml(item.customer_name)}` : ''}</em></span><strong>${escapeHtml(money(item.amount))}${event.dispute_type === 'price' ? ` → ${escapeHtml(money(item.proposed_amount))}` : ''}</strong></header><div>${(item.price_lines || []).map((line) => disputeProductMarkup(item, line)).join('')}</div></article>`).join('')}
        </section>
        <div class="admin-billing-investigate-actions"><button type="submit">Apply adjusted prices</button><button type="button" class="is-accept" data-billing-action="accept_dispute" data-record-id="${Number(event.record_id)}">${event.dispute_type === 'price' ? 'Accept proposed prices' : 'Accept and remove orders'}</button></div>
      </form>
      <form class="admin-billing-reject-form" data-billing-reject-form>
        <label><span>Reason if rejected</span><textarea name="reason" maxlength="4000" placeholder="Explain what finance found so the partner can reconcile it…" required></textarea></label>
        <label class="admin-billing-evidence-picker">
          <input type="file" name="evidence" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" data-billing-evidence hidden>
          <button type="button" data-billing-choose-evidence><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17 9 12l4 4 3-3 4 4"></path><rect x="3" y="4" width="18" height="16" rx="2"></rect></svg>Add screenshot</button>
          <span data-billing-evidence-name>Optional · PNG, JPG, or WebP</span>
        </label>
        <p class="admin-billing-detail-error" data-billing-detail-error hidden></p>
        <div class="admin-billing-investigate-actions"><button type="submit" class="is-reject">Reject dispute</button></div>
      </form>
    </article>`;
  };

  const stockDetail = (event) => {
    if (event.type === 'stock_order') return `<article class="admin-billing-detail admin-stock-notification-detail"><header class="admin-billing-dispute-head">${avatarMarkup(event)}<div><small>Stock order</small><strong>${escapeHtml(event.partner_name)}</strong><span>${escapeHtml(event.record_id)} · ${escapeHtml(money(event.amount))}</span></div></header><section class="admin-billing-investigate-orders"><div><span>Products paid from balance</span><strong>${event.items?.length || 0}</strong></div>${(event.items || []).map(item => `<article class="admin-billing-price-order"><header><span><strong>${escapeHtml(item.sku_label || item.product || item.sku_code)}</strong><small>${escapeHtml(item.sku_code || '')} · ${Number(item.quantity || 0)} units</small></span><strong>${escapeHtml(money(item.line_revenue || 0))}</strong></header></article>`).join('')}</section><a class="admin-billing-confirm-button admin-link-btn" href="${escapeHtml(event.detail_url)}">Open partner activity</a></article>`;
    const proof = event.proof || {}; const isPdf = proof.mime_type === 'application/pdf';
    return `<article class="admin-billing-detail admin-stock-notification-detail" data-billing-record="${Number(event.record_id)}"><div class="admin-billing-proof-head"><div>${avatarMarkup(event)}<span><small>Balance request</small><strong>${escapeHtml(event.partner_name)}</strong><em>${escapeHtml(shortDate(event.created_at))}</em></span></div></div><div class="admin-billing-proof-frame is-${isPdf ? 'pdf' : 'image'}">${isPdf ? `<object data="${escapeHtml(proof.url)}" type="application/pdf"><a href="${escapeHtml(proof.url)}" target="_blank" rel="noopener">Open proof</a></object>` : `<img src="${escapeHtml(proof.url)}" alt="Payment proof from ${escapeHtml(event.partner_name)}">`}</div><form class="admin-stock-deposit-review" data-stock-deposit-form><label><span>Amount to credit</span><span class="admin-billing-price-input"><em>Rp</em><input type="number" name="amount" min="1" max="1000000000000" step="0.01" value="${Number(event.amount || 0)}" required></span></label><label><span>Review note</span><textarea name="note" maxlength="1000" placeholder="Optional note or reason for a correction"></textarea></label><p class="admin-billing-detail-error" data-billing-detail-error hidden></p><div class="admin-billing-investigate-actions"><button type="button" class="is-accept" data-stock-action="approve_deposit" data-record-id="${Number(event.record_id)}">Approve balance</button><button type="button" data-stock-action="investigate_deposit" data-record-id="${Number(event.record_id)}">Save investigation</button><button type="button" class="is-reject" data-stock-action="reject_deposit" data-record-id="${Number(event.record_id)}">Reject</button></div></form><a class="admin-ghost-btn admin-link-btn" href="${escapeHtml(event.detail_url)}">Open partner activity</a></article>`;
  };

  const feedbackMarkup = () => `<div class="admin-billing-feedback"><span>✓</span><strong>${escapeHtml(state.feedback?.title || 'Review complete')}</strong><p>${escapeHtml(state.feedback?.message || 'The record was updated.')}</p></div>`;

  const bindAvatarFallbacks = () => {
    list.querySelectorAll('[data-billing-avatar-image]').forEach((image) => {
      if (image.dataset.billingAvatarBound === 'true') return;
      image.dataset.billingAvatarBound = 'true';
      const fallback = image.parentElement?.querySelector('[data-billing-avatar-fallback]');
      const showFallback = () => { image.hidden = true; if (fallback instanceof HTMLElement) fallback.hidden = false; };
      if (!(image instanceof HTMLImageElement) || !image.getAttribute('src')) showFallback();
      else {
        if (fallback instanceof HTMLElement) fallback.hidden = true;
        image.addEventListener('error', showFallback, { once: true });
      }
    });
  };

  const renderChrome = () => {
    const selected = state.events.find((event) => event.id === state.selectedId) || null;
    if (count instanceof HTMLElement) {
      count.hidden = state.events.length === 0;
      count.textContent = state.events.length > 99 ? '99+' : String(state.events.length);
    }
    if (summary instanceof HTMLElement) summary.textContent = state.events.length ? `${state.events.length} notification${state.events.length === 1 ? '' : 's'}` : 'No notifications';
    if (back instanceof HTMLButtonElement) back.hidden = !selected && !state.feedback;
    if (mode instanceof HTMLElement) mode.textContent = selected
      ? eventSubtitle(selected)
      : 'Partner activity requiring attention';
  };

  const reconcileList = () => {
    renderChrome();
    if (!state.events.length) {
      if (!list.querySelector('.admin-billing-empty') || list.children.length !== 1) list.innerHTML = listMarkup();
      return;
    }

    list.querySelectorAll(':scope > :not([data-billing-event-id])').forEach((node) => node.remove());
    const retainedIds = new Set(state.events.map((event) => event.id));
    list.querySelectorAll(':scope > [data-billing-event-id]').forEach((node) => {
      if (!retainedIds.has(node.getAttribute('data-billing-event-id') || '')) node.remove();
    });

    state.events.forEach((event, index) => {
      let row = Array.from(list.children).find((node) => node.getAttribute('data-billing-event-id') === event.id);
      const version = eventVersion(event);
      if (!(row instanceof HTMLElement) || row.dataset.billingEventVersion !== version) {
        const template = document.createElement('template');
        template.innerHTML = listRowMarkup(event, index).trim();
        const replacement = template.content.firstElementChild;
        if (!(replacement instanceof HTMLElement)) return;
        replacement.dataset.billingEventVersion = version;
        if (row) row.replaceWith(replacement);
        else list.appendChild(replacement);
        row = replacement;
      }
      row.style.setProperty('--billing-row-index', String(index));
      const relative = row.querySelector('[data-billing-relative-time]');
      if (relative) relative.textContent = relativeTime(event.created_at);
      const expected = list.children[index];
      if (expected !== row) list.insertBefore(row, expected || null);
    });
    bindAvatarFallbacks();
  };

  const render = () => {
    const selected = state.events.find((event) => event.id === state.selectedId) || null;
    renderChrome();
    if (state.feedback) list.innerHTML = feedbackMarkup();
    else if (selected) list.innerHTML = selected.type === 'payment' ? paymentDetail(selected) : (selected.type === 'dispute' ? disputeDetail(selected) : stockDetail(selected));
    else {
      list.innerHTML = listMarkup();
      state.events.forEach((event) => {
        const row = Array.from(list.children).find((node) => node.getAttribute('data-billing-event-id') === event.id);
        if (row instanceof HTMLElement) row.dataset.billingEventVersion = eventVersion(event);
      });
    }
    bindAvatarFallbacks();
  };

  const load = async ({ silent = false } = {}) => {
    if (state.loading) return;
    state.loading = true;
    if (!silent && !state.events.length) list.innerHTML = '<div class="admin-billing-loading"><span></span><span></span><span></span><p>Loading notifications…</p></div>';
    try {
      const payload = await request();
      const previousSelected = state.events.find((event) => event.id === state.selectedId) || null;
      const nextEvents = Array.isArray(payload.notifications) ? payload.notifications : [];
      const nextSelected = nextEvents.find((event) => event.id === state.selectedId) || null;
      state.events = nextEvents;
      if (state.selectedId && !state.events.some((event) => event.id === state.selectedId)) state.selectedId = '';
      if (state.feedback) renderChrome();
      else if (state.selectedId) {
        if (eventVersion(previousSelected) !== eventVersion(nextSelected)) render();
        else renderChrome();
      } else reconcileList();
    } catch (error) {
      if (!silent) list.innerHTML = `<div class="admin-billing-feedback is-error"><strong>Notifications unavailable</strong><p>${escapeHtml(error.message)}</p><button type="button" data-billing-retry>Try again</button></div>`;
      if (summary instanceof HTMLElement) summary.textContent = 'Notifications unavailable';
    } finally {
      state.loading = false;
    }
  };

  const setOpen = (open) => {
    state.open = open;
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (backdrop instanceof HTMLElement) backdrop.hidden = !open;
    document.body.classList.toggle('admin-notifications-open', open);
    if (open) {
      load({ silent: Boolean(state.events.length) });
      window.setTimeout(() => close?.focus(), 80);
    } else if (drawer.contains(document.activeElement)) toggle.focus();
  };

  const showError = (message) => {
    const node = list.querySelector('[data-billing-detail-error]');
    if (node instanceof HTMLElement) { node.hidden = false; node.textContent = message; }
  };

  const performJsonAction = async (action, recordId, button) => {
    if (button instanceof HTMLButtonElement) button.disabled = true;
    const reviewedEvent = state.events.find((event) => Number(event.record_id) === Number(recordId) && event.type === 'dispute');
    try {
      const idKey = action === 'confirm_payment' ? 'payment_id' : 'dispute_id';
      const payload = await request({
        url: endpoint,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, [idKey]: recordId })
      });
      state.events = Array.isArray(payload.notifications) ? payload.notifications : [];
      state.selectedId = '';
      state.feedback = action === 'confirm_payment'
        ? { title: 'Payment confirmed', message: 'Available cash and the partner bill are updated.' }
        : { title: 'Dispute accepted', message: reviewedEvent?.dispute_type === 'price' ? 'The proposed prices now update the orders and partner bill.' : 'The claimed orders were removed and marked paid.' };
      render();
      if (action === 'confirm_payment') window.dispatchEvent(new CustomEvent('partner-billing:confirmed'));
      window.setTimeout(() => { state.feedback = null; render(); }, 1500);
    } catch (error) {
      if (button instanceof HTMLButtonElement) button.disabled = false;
      showError(error.message);
    }
  };

  const performStockAction = async (action, recordId, button) => {
    if (button instanceof HTMLButtonElement) button.disabled = true;
    const form = button.closest('[data-stock-deposit-form]');
    const amount = form instanceof HTMLFormElement ? form.elements.amount?.value : null;
    const note = form instanceof HTMLFormElement ? form.elements.note?.value : '';
    if (action === 'reject_deposit' && !String(note || '').trim()) {
      if (button instanceof HTMLButtonElement) button.disabled = false;
      showError('Add a short reason before rejecting this deposit.');
      return;
    }
    try {
      await request({
        url: '/api/partner-stock/', method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, deposit_id: recordId, amount, note })
      });
      state.selectedId = '';
      state.feedback = {
        title: action === 'approve_deposit' ? 'Balance approved' : (action === 'reject_deposit' ? 'Deposit rejected' : 'Investigation saved'),
        message: action === 'approve_deposit' ? 'The approved amount is now available in the partner balance.' : 'The request history and partner view have been updated.'
      };
      await load({ silent: true });
      render();
      window.setTimeout(() => { state.feedback = null; render(); }, 1700);
    } catch (error) {
      if (button instanceof HTMLButtonElement) button.disabled = false;
      showError(error.message);
    }
  };

  toggle.addEventListener('click', () => setOpen(!state.open));
  close?.addEventListener('click', () => setOpen(false));
  backdrop?.addEventListener('click', () => setOpen(false));
  back?.addEventListener('click', () => { state.selectedId = ''; state.feedback = null; render(); });

  list.addEventListener('click', async (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-billing-select], [data-billing-action], [data-stock-action], [data-billing-preview-close], [data-billing-choose-evidence], [data-billing-retry]') : null;
    if (!(target instanceof HTMLElement)) return;
    if (target.hasAttribute('data-billing-retry')) { load(); return; }
    if (target.hasAttribute('data-billing-preview-close')) { state.selectedId = ''; render(); return; }
    if (target.hasAttribute('data-billing-choose-evidence')) { list.querySelector('[data-billing-evidence]')?.click(); return; }
    if (target.hasAttribute('data-billing-select')) {
      state.selectedId = target.dataset.billingSelect || '';
      state.feedback = null;
      render();
      return;
    }
    const stockAction = target.dataset.stockAction || '';
    if (stockAction) {
      await performStockAction(stockAction, Number(target.dataset.recordId || 0), target);
      return;
    }
    const action = target.dataset.billingAction || '';
    const recordId = Number(target.dataset.recordId || 0);
    if (action && recordId > 0) await performJsonAction(action, recordId, target);
  });

  list.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.matches('[data-billing-evidence]')) return;
    const file = input.files?.[0];
    const name = list.querySelector('[data-billing-evidence-name]');
    if (name) name.textContent = file ? `${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)} MB` : 'Optional · PNG, JPG, or WebP';
  });

  list.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-billing-reject-form], [data-billing-adjust-form]')) return;
    event.preventDefault();
    const selected = state.events.find((item) => item.id === state.selectedId);
    if (!selected || selected.type !== 'dispute') return;
    const buttons = Array.from(form.querySelectorAll('button'));
    buttons.forEach((button) => { button.disabled = true; });
    try {
      let payload;
      if (form.matches('[data-billing-adjust-form]')) {
        const adjustments = Array.from(form.querySelectorAll('[data-billing-adjust-price]')).reduce((orders, input) => {
          if (!(input instanceof HTMLInputElement)) return orders;
          const orderId = input.dataset.orderId || '';
          let order = orders.find((entry) => entry.order_id === orderId);
          if (!order) { order = { order_id: orderId, lines: [] }; orders.push(order); }
          order.lines.push({ line_index: Number(input.dataset.lineIndex || 0), unit_price: Number(input.value) });
          return orders;
        }, []);
        payload = await request({
          url: endpoint,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'adjust_dispute', dispute_id: selected.record_id, adjustments })
        });
      } else {
        const formData = new FormData(form);
        formData.append('action', 'reject_dispute');
        formData.append('dispute_id', String(selected.record_id));
        payload = await request({ url: endpoint, method: 'POST', body: formData });
      }
      state.events = Array.isArray(payload.notifications) ? payload.notifications : [];
      state.selectedId = '';
      state.feedback = form.matches('[data-billing-adjust-form]')
        ? { title: 'Prices updated', message: 'The order values and partner bill now reflect the reviewed product prices.' }
        : { title: 'Dispute rejected', message: 'The partner can now see your reason and screenshot.' };
      render();
      window.setTimeout(() => { state.feedback = null; render(); }, 1600);
    } catch (error) {
      buttons.forEach((button) => { button.disabled = false; });
      showError(error.message);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.open) setOpen(false);
  });

  load({ silent: true });
  window.setInterval(() => load({ silent: true }), 30000);
});
