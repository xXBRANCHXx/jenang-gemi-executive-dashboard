document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-customer-profiles]');
  if (!root) return;

  const endpoint = root.dataset.endpoint || '../api/customer-profiles/';
  const refs = {
    freshness: root.querySelector('[data-profile-freshness]'),
    refresh: root.querySelector('[data-profile-refresh]'),
    segments: root.querySelector('[data-profile-segments]'),
    channels: root.querySelector('[data-profile-channels]'),
    table: root.querySelector('[data-profile-table]'),
    tableStatus: root.querySelector('[data-profile-table-status]'),
    search: root.querySelector('[data-profile-search]'),
    segment: root.querySelector('[data-profile-segment-filter]'),
    channel: root.querySelector('[data-profile-channel-filter]'),
    repeatOnly: root.querySelector('[data-profile-repeat-only]'),
    definition: root.querySelector('[data-profile-definition]'),
    unattributed: root.querySelector('[data-profile-unattributed]')
  };
  const state = { data: null, loading: false };
  const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
  const integer = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
  const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
  const dateTime = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const title = (value) => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const formatDate = (value) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '—' : date.format(parsed);
  };
  const formatDateTime = (value) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '—' : dateTime.format(parsed);
  };

  const renderKpis = () => {
    const summary = state.data?.summary || {};
    root.querySelectorAll('[data-profile-kpi]').forEach((element) => {
      const key = element.dataset.profileKpi;
      const value = Number(summary[key] || 0);
      element.textContent = ['repeat_rate', 'repeat_revenue_share'].includes(key) ? `${value.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%` : integer.format(value);
    });
  };

  const renderSegments = () => {
    if (!refs.segments) return;
    const segments = state.data?.segments || {};
    const definitions = state.data?.definitions?.segments || {};
    const colors = { new: '#94a3b8', returning: '#60a5fa', loyal: '#6ee7b7', champion: '#facc15' };
    const total = Math.max(1, Object.values(segments).reduce((sum, value) => sum + Number(value || 0), 0));
    refs.segments.innerHTML = ['new', 'returning', 'loyal', 'champion'].map((key) => {
      const value = Number(segments[key] || 0);
      return `<div class="customer-segment-row"><div class="customer-segment-meta"><strong>${escapeHtml(title(key))}</strong><span>${integer.format(value)} · ${escapeHtml(definitions[key] || '')}</span></div><div class="customer-profile-bar"><i style="--bar-width:${Math.round(value / total * 100)}%;--bar-color:${colors[key]}"></i></div></div>`;
    }).join('');
  };

  const renderChannels = () => {
    if (!refs.channels) return;
    const channels = Array.isArray(state.data?.channels) ? state.data.channels : [];
    const maxOrders = Math.max(1, ...channels.map((channel) => Number(channel.orders || 0)));
    refs.channels.innerHTML = channels.length ? channels.map((channel) => {
      const repeatRate = Number(channel.customers || 0) ? Number(channel.repeat_customers || 0) / Number(channel.customers) * 100 : 0;
      return `<div class="customer-channel-row"><div class="customer-channel-meta"><strong>${escapeHtml(channel.label || title(channel.channel))}</strong><span>${integer.format(channel.orders || 0)} orders · ${repeatRate.toLocaleString('id-ID', { maximumFractionDigits: 0 })}% repeat · ${escapeHtml(currency.format(channel.revenue || 0))}</span></div><div class="customer-profile-bar"><i style="--bar-width:${Math.round(Number(channel.orders || 0) / maxOrders * 100)}%"></i></div></div>`;
    }).join('') : '<p class="admin-empty">No customer-linked channels yet.</p>';
    if (refs.channel) {
      refs.channel.innerHTML = '<option value="">All channels</option>' + channels.map((channel) => `<option value="${escapeHtml(channel.channel)}">${escapeHtml(channel.label)}</option>`).join('');
    }
  };

  const filteredProfiles = () => {
    const profiles = Array.isArray(state.data?.profiles) ? state.data.profiles : [];
    const query = String(refs.search?.value || '').trim().toLowerCase();
    const segment = refs.segment?.value || '';
    const channel = refs.channel?.value || '';
    return profiles.filter((profile) => {
      const channelKeys = (profile.channels || []).map((item) => item.key);
      const haystack = [profile.customer_name, profile.phone, profile.phone_display, profile.favorite_product, ...channelKeys].join(' ').toLowerCase();
      return (!query || haystack.includes(query))
        && (!segment || profile.segment === segment)
        && (!channel || channelKeys.includes(channel))
        && (!refs.repeatOnly?.checked || Number(profile.orders || 0) >= 2);
    });
  };

  const renderTable = () => {
    if (!refs.table) return;
    const profiles = filteredProfiles();
    const total = state.data?.profiles?.length || 0;
    if (refs.tableStatus) refs.tableStatus.textContent = `${integer.format(profiles.length)} shown from ${integer.format(total)} profiled customers`;
    if (!profiles.length) {
      refs.table.innerHTML = '<tr><td colspan="8" class="admin-empty">No customer profiles match these filters.</td></tr>';
      return;
    }
    refs.table.innerHTML = profiles.map((profile) => {
      const channels = (profile.channels || []).map((channel) => `<span class="customer-channel-chip">${escapeHtml(channel.label)}</span>`).join('');
      const contact = profile.phone_display || (profile.identity_confidence === 'channel_name' ? 'Channel-only match' : 'No phone');
      return `<tr>
        <td><strong>${escapeHtml(profile.customer_name || 'Unnamed customer')}</strong><small>${escapeHtml(contact)}</small></td>
        <td><span class="customer-segment-badge is-${escapeHtml(profile.segment)}">${escapeHtml(title(profile.segment))}</span><small>${escapeHtml(title(profile.lifecycle))} · ${integer.format(profile.days_since_last || 0)}d ago</small></td>
        <td><strong>${integer.format(profile.orders || 0)}</strong><small>${integer.format(profile.items || 0)} items</small></td>
        <td><strong>${escapeHtml(currency.format(profile.revenue || 0))}</strong><small>Lifetime recorded</small></td>
        <td>${escapeHtml(currency.format(profile.average_order_value || 0))}</td>
        <td>${channels || '—'}</td>
        <td>${escapeHtml(profile.favorite_product || '—')}</td>
        <td><strong>${escapeHtml(formatDate(profile.last_order_at))}</strong><small>First ${escapeHtml(formatDate(profile.first_order_at))}</small></td>
      </tr>`;
    }).join('');
  };

  const render = () => {
    renderKpis();
    renderSegments();
    renderChannels();
    renderTable();
    if (refs.definition && state.data?.definitions?.identity) refs.definition.textContent = state.data.definitions.identity;
    if (refs.unattributed) refs.unattributed.textContent = `${integer.format(state.data?.summary?.unattributed_orders || 0)} orders could not be profiled`;
    if (refs.freshness) refs.freshness.textContent = `Updated ${formatDateTime(state.data?.generated_at)}`;
  };

  const load = async () => {
    if (state.loading) return;
    state.loading = true;
    if (refs.refresh) refs.refresh.disabled = true;
    if (refs.freshness) refs.freshness.textContent = 'Refreshing customer profiles…';
    try {
      const response = await fetch(endpoint, { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || 'Customer profiles are unavailable.');
      state.data = data;
      render();
    } catch (error) {
      if (refs.freshness) refs.freshness.textContent = error.message;
      if (refs.table) refs.table.innerHTML = `<tr><td colspan="8" class="admin-empty">${escapeHtml(error.message)}</td></tr>`;
    } finally {
      state.loading = false;
      if (refs.refresh) refs.refresh.disabled = false;
    }
  };

  [refs.search, refs.segment, refs.channel, refs.repeatOnly].forEach((control) => control?.addEventListener('input', renderTable));
  refs.refresh?.addEventListener('click', load);
  load();
});
