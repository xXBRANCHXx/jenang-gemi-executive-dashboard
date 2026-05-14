const root = document.querySelector('[data-api-health]');

if (root) {
  const endpoint = root.dataset.apiHealthEndpoint || '../api/api-health/';
  const refreshButton = document.querySelector('[data-api-health-refresh]');
  const statusNode = document.querySelector('[data-api-health-status]');
  const updatedNode = document.querySelector('[data-api-health-updated]');
  const summaryNode = document.querySelector('[data-api-health-summary]');
  const dotNode = document.querySelector('[data-api-health-dot]');
  const checksBody = document.querySelector('[data-api-health-checks]');
  const failuresNode = document.querySelector('[data-api-health-failures]');
  const totalNode = document.querySelector('[data-health-total]');
  const failingNode = document.querySelector('[data-health-failing]');
  const loggedNode = document.querySelector('[data-health-logged]');
  const lastNode = document.querySelector('[data-health-last]');
  let refreshTimer = 0;

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const formatTime = (value) => {
    if (!value) return 'None';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const statusLabel = (check) => check.ok
    ? '<span class="admin-health-badge admin-health-badge-ok">OK</span>'
    : '<span class="admin-health-badge admin-health-badge-fail">FAIL</span>';

  const renderChecks = (checks) => {
    if (!checksBody) return;
    if (!Array.isArray(checks) || !checks.length) {
      checksBody.innerHTML = '<tr><td colspan="5" class="admin-empty">No checks returned.</td></tr>';
      return;
    }

    checksBody.innerHTML = checks.map((check) => `
      <tr class="${check.ok ? '' : 'is-health-failed'}">
        <td>${statusLabel(check)}</td>
        <td>
          <strong>${escapeHtml(check.label || check.id)}</strong>
          <small>${escapeHtml(check.category || '')}</small>
          <code>${escapeHtml(check.url || '')}</code>
        </td>
        <td>${check.status_code ? escapeHtml(check.status_code) : '-'}</td>
        <td>${escapeHtml(check.duration_ms ?? 0)}ms</td>
        <td>
          <span>${escapeHtml(check.details || check.error || '')}</span>
          ${check.error ? `<small>${escapeHtml(check.error)}</small>` : ''}
          ${check.response_excerpt ? `<pre>${escapeHtml(check.response_excerpt)}</pre>` : ''}
        </td>
      </tr>
    `).join('');
  };

  const renderFailures = (failures) => {
    if (!failuresNode) return;
    if (!Array.isArray(failures) || !failures.length) {
      failuresNode.innerHTML = '<p class="admin-empty">No failures logged.</p>';
      return;
    }

    failuresNode.innerHTML = failures.map((failure) => `
      <article class="admin-api-log-item">
        <div>
          <span class="admin-health-badge admin-health-badge-fail">FAIL</span>
          <strong>${escapeHtml(failure.label || failure.id)}</strong>
          <small>${escapeHtml(formatTime(failure.recorded_at))}</small>
        </div>
        <dl>
          <dt>HTTP</dt><dd>${failure.status_code ? escapeHtml(failure.status_code) : '-'}</dd>
          <dt>URL</dt><dd><code>${escapeHtml(failure.url || '')}</code></dd>
          <dt>Details</dt><dd>${escapeHtml(failure.details || failure.error || '')}</dd>
        </dl>
        ${failure.response_excerpt ? `<pre>${escapeHtml(failure.response_excerpt)}</pre>` : ''}
      </article>
    `).join('');
  };

  const render = (payload) => {
    const summary = payload.summary || {};
    const failing = Number(summary.failing || 0);
    if (totalNode) totalNode.textContent = String(summary.checked || 0);
    if (failingNode) failingNode.textContent = String(failing);
    if (loggedNode) loggedNode.textContent = String(summary.logged_failures || 0);
    if (lastNode) lastNode.textContent = formatTime(summary.last_failure_at || '');
    if (updatedNode) updatedNode.textContent = `Last checked ${formatTime(payload.generated_at)}`;
    if (statusNode) statusNode.textContent = failing ? `${failing} failing` : 'Healthy';
    if (summaryNode) summaryNode.textContent = failing ? `${failing} check${failing === 1 ? '' : 's'} failing` : 'All configured checks are healthy';
    if (dotNode) dotNode.classList.toggle('is-health-failing', failing > 0);
    renderChecks(payload.checks || []);
    renderFailures(payload.failures || []);
  };

  const loadHealth = async () => {
    if (refreshButton instanceof HTMLButtonElement) refreshButton.disabled = true;
    if (statusNode) statusNode.textContent = 'Checking';
    try {
      const response = await fetch(`${endpoint}?run=1&_ts=${Date.now()}`, {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Unable to run API health checks.');
      }
      render(payload);
    } catch (error) {
      if (statusNode) statusNode.textContent = 'Health check failed';
      if (checksBody) {
        checksBody.innerHTML = `<tr><td colspan="5" class="admin-empty">${escapeHtml(error instanceof Error ? error.message : 'Unable to run API health checks.')}</td></tr>`;
      }
    } finally {
      if (refreshButton instanceof HTMLButtonElement) refreshButton.disabled = false;
    }
  };

  document.querySelector('[data-menu-trigger]')?.addEventListener('click', () => {
    const panel = document.querySelector('[data-menu-panel]');
    if (!panel) return;
    panel.hidden = !panel.hidden;
  });

  refreshButton?.addEventListener('click', loadHealth);
  loadHealth();
  refreshTimer = window.setInterval(loadHealth, 60000);
  window.addEventListener('pagehide', () => window.clearInterval(refreshTimer));
}
