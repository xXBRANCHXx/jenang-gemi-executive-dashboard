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

  const paymentTitle = (event) => `${event.partner_name} paid their weekly bill ${event.period_label}`;
  const disputeTitle = (event) => event.dispute_type === 'price'
    ? `${event.partner_name} proposed new prices for ${event.items?.length || 0} orders`
    : `${event.partner_name} disputed ${event.items?.length || 0} orders on ${event.period_label}`;

  const listMarkup = () => {
    if (!state.events.length) {
      return `<div class="admin-notification-empty admin-billing-empty"><span>✓</span><strong>All caught up</strong><p>No partner payments or disputes need review.</p></div>`;
    }
    return state.events.map((event, index) => `
      <article class="admin-billing-notification-row is-${escapeHtml(event.type)}" style="--billing-row-index:${index}">
        <button type="button" class="admin-billing-notification-main" data-billing-select="${escapeHtml(event.id)}">
          ${avatarMarkup(event)}
          <span class="admin-billing-notification-copy">
            <strong>${escapeHtml(event.type === 'payment' ? paymentTitle(event) : disputeTitle(event))}</strong>
            <small>${escapeHtml(event.type === 'payment' ? 'Check proof of payment' : (event.dispute_type === 'price' ? 'Review the proposed product prices' : 'Review the claimed paid orders'))}</small>
            <em>${escapeHtml(event.type === 'dispute' && event.dispute_type === 'price' ? `${money(event.amount)} → ${money((event.items || []).reduce((sum, item) => sum + Number(item.proposed_amount || 0), 0))}` : money(event.amount))} · ${escapeHtml(relativeTime(event.created_at))}</em>
          </span>
          <svg class="admin-billing-row-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
        </button>
        ${event.type === 'dispute' ? `<div class="admin-billing-quick-actions"><button type="button" data-billing-action="accept_dispute" data-record-id="${Number(event.record_id)}">${event.dispute_type === 'price' ? 'Accept proposed prices' : 'Accept'}</button><button type="button" data-billing-select="${escapeHtml(event.id)}">Investigate</button></div>` : ''}
      </article>`).join('');
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

  const feedbackMarkup = () => `<div class="admin-billing-feedback"><span>✓</span><strong>${escapeHtml(state.feedback?.title || 'Review complete')}</strong><p>${escapeHtml(state.feedback?.message || 'The billing record was updated.')}</p></div>`;

  const bindAvatarFallbacks = () => {
    list.querySelectorAll('[data-billing-avatar-image]').forEach((image) => {
      const fallback = image.parentElement?.querySelector('[data-billing-avatar-fallback]');
      const showFallback = () => { image.hidden = true; if (fallback instanceof HTMLElement) fallback.hidden = false; };
      if (!(image instanceof HTMLImageElement) || !image.getAttribute('src')) showFallback();
      else {
        if (fallback instanceof HTMLElement) fallback.hidden = true;
        image.addEventListener('error', showFallback, { once: true });
      }
    });
  };

  const render = () => {
    const selected = state.events.find((event) => event.id === state.selectedId) || null;
    if (count instanceof HTMLElement) {
      count.hidden = state.events.length === 0;
      count.textContent = state.events.length > 99 ? '99+' : String(state.events.length);
    }
    if (summary instanceof HTMLElement) summary.textContent = state.events.length ? `${state.events.length} billing review${state.events.length === 1 ? '' : 's'} pending` : 'No billing reviews pending';
    if (back instanceof HTMLButtonElement) back.hidden = !selected && !state.feedback;
    if (mode instanceof HTMLElement) mode.textContent = selected
      ? (selected.type === 'payment' ? 'Check proof of payment' : 'Accept or investigate disputed orders')
      : 'Payment confirmations and disputes';
    if (state.feedback) list.innerHTML = feedbackMarkup();
    else if (selected) list.innerHTML = selected.type === 'payment' ? paymentDetail(selected) : disputeDetail(selected);
    else list.innerHTML = listMarkup();
    bindAvatarFallbacks();
  };

  const load = async ({ silent = false } = {}) => {
    if (state.loading) return;
    state.loading = true;
    if (!silent && !state.events.length) list.innerHTML = '<div class="admin-billing-loading"><span></span><span></span><span></span><p>Loading billing reviews…</p></div>';
    try {
      const payload = await request();
      state.events = Array.isArray(payload.notifications) ? payload.notifications : [];
      if (state.selectedId && !state.events.some((event) => event.id === state.selectedId)) state.selectedId = '';
      render();
    } catch (error) {
      if (!silent) list.innerHTML = `<div class="admin-billing-feedback is-error"><strong>Billing unavailable</strong><p>${escapeHtml(error.message)}</p><button type="button" data-billing-retry>Try again</button></div>`;
      if (summary instanceof HTMLElement) summary.textContent = 'Billing status unavailable';
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

  toggle.addEventListener('click', () => setOpen(!state.open));
  close?.addEventListener('click', () => setOpen(false));
  backdrop?.addEventListener('click', () => setOpen(false));
  back?.addEventListener('click', () => { state.selectedId = ''; state.feedback = null; render(); });

  list.addEventListener('click', async (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-billing-select], [data-billing-action], [data-billing-preview-close], [data-billing-choose-evidence], [data-billing-retry]') : null;
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
