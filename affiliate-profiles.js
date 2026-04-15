document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-affiliate-profiles]');
  if (!root) return;

  const themeStorageKey = 'jg-admin-theme';
  const endpoint = root.dataset.affiliatesEndpoint || './affiliates.php';
  const liveEndpoint = root.dataset.liveEndpoint || './live/';
  const menuShell = document.querySelector('[data-menu-shell]');
  const menuTrigger = document.querySelector('[data-menu-trigger]');
  const menuPanel = document.querySelector('[data-menu-panel]');
  const affiliateList = document.querySelector('[data-affiliate-list]');
  const affiliateModal = document.querySelector('[data-affiliate-modal]');
  const affiliateForm = document.querySelector('[data-affiliate-form]');
  const affiliateFormError = document.querySelector('[data-affiliate-form-error]');
  const loader = document.querySelector('[data-admin-loader]');
  const loaderProgress = document.querySelector('[data-admin-loader-progress]');
  const loaderLabel = document.querySelector('[data-admin-loader-label]');

  const state = {
    affiliates: [],
    liveSequence: -1,
    liveSource: null
  };

  const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const toTitleCase = (value) => String(value || '').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

  const applyTheme = (theme) => {
    document.documentElement.dataset.adminTheme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
  };

  const closeMenu = () => {
    if (!menuPanel || !menuTrigger) return;
    menuPanel.hidden = true;
    menuTrigger.setAttribute('aria-expanded', 'false');
  };

  const openMenu = () => {
    if (!menuPanel || !menuTrigger) return;
    menuPanel.hidden = false;
    menuTrigger.setAttribute('aria-expanded', 'true');
  };

  const setupTopbarMenu = () => {
    menuTrigger?.addEventListener('click', () => {
      if (menuPanel?.hidden === false) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuShell && !menuShell.contains(target)) closeMenu();
    });

    document.querySelectorAll('[data-dashboard-view-link]').forEach((link) => {
      link.addEventListener('click', () => {
        const view = link.getAttribute('data-dashboard-view-link') || 'home';
        window.localStorage.setItem('jg-dashboard-view', view);
      });
    });
  };

  const setLoaderState = (progress, label) => {
    if (loaderProgress) loaderProgress.style.width = `${Math.max(8, Math.min(progress, 100))}%`;
    if (loaderLabel && label) loaderLabel.textContent = label;
  };

  const finishLoader = () => {
    setLoaderState(100, 'Affiliate profiles ready');
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.body.classList.remove('is-loading');
        document.body.classList.add('is-ready');
        if (loader) window.setTimeout(() => loader.remove(), 500);
      });
    });
  };

  const requestJson = async (url, options = {}) => {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {})
      },
      credentials: 'same-origin',
      ...options
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }
    return payload;
  };

  const renderAffiliates = () => {
    if (!affiliateList) return;
    if (!state.affiliates.length) {
      affiliateList.innerHTML = '<p class="admin-empty">Belum ada affiliate.</p>';
      return;
    }

    affiliateList.innerHTML = state.affiliates.map((affiliate) => {
      const urls = affiliate.urls && typeof affiliate.urls === 'object' ? affiliate.urls : {};
      const urlLinks = Object.entries(urls).map(([platform, url]) => `
        <a class="admin-affiliate-url" href="https://jenanggemi.com${escapeHtml(String(url || ''))}" target="_blank" rel="noopener">
          <strong>${escapeHtml(toTitleCase(platform))}</strong>
          <span>${escapeHtml(String(url || ''))}</span>
        </a>
      `).join('');

      return `
        <article class="admin-affiliate-card">
          <div class="admin-affiliate-head">
            <div>
              <span class="admin-chip">${escapeHtml(affiliate.code || '')}</span>
              <h4>${escapeHtml(affiliate.name || affiliate.code || 'Affiliate')}</h4>
            </div>
            <div class="admin-affiliate-actions">
              <a class="admin-primary-btn admin-link-btn" href="../affiliate-profile/?code=${encodeURIComponent(affiliate.code || '')}">Edit Profile</a>
            </div>
          </div>
          <div class="admin-affiliate-field">
            <span class="admin-control-label">Platforms</span>
            <div class="admin-affiliate-platform-grid">
              ${(Array.isArray(affiliate.platforms) ? affiliate.platforms : []).map((platform) => `
                <div class="admin-platform-choice">
                  <span>${escapeHtml(toTitleCase(platform))}</span>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="admin-affiliate-field">
            <span class="admin-control-label">Products</span>
            <div class="admin-affiliate-platform-grid">
              ${(Array.isArray(affiliate.products) ? affiliate.products : []).map((product) => `
                <div class="admin-platform-choice">
                  <span>${escapeHtml(toTitleCase(product))}</span>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="admin-affiliate-field">
            <span class="admin-control-label">Landing URLs</span>
            <div class="admin-affiliate-url-list">${urlLinks || '<p class="admin-empty">Belum ada URL.</p>'}</div>
          </div>
        </article>
      `;
    }).join('');
  };

  const loadAffiliates = async (showLoader = false) => {
    if (showLoader) setLoaderState(24, 'Loading affiliate records');
    const payload = await requestJson(endpoint);
    state.affiliates = Array.isArray(payload.affiliates) ? payload.affiliates : [];
    renderAffiliates();
    if (showLoader) finishLoader();
  };

  const closeAffiliateModal = () => {
    if (!affiliateModal) return;
    affiliateModal.hidden = true;
    affiliateForm?.reset();
    if (affiliateFormError) {
      affiliateFormError.hidden = true;
      affiliateFormError.textContent = '';
    }
  };

  const openAffiliateModal = () => {
    if (!affiliateModal) return;
    affiliateModal.hidden = false;
  };

  const closeLiveStream = () => {
    if (state.liveSource) {
      state.liveSource.close();
      state.liveSource = null;
    }
  };

  const connectLiveStream = () => {
    if (!window.EventSource || !liveEndpoint) return;
    closeLiveStream();
    const source = new window.EventSource(`${liveEndpoint}?last_sequence=${encodeURIComponent(String(state.liveSequence))}`, { withCredentials: true });
    state.liveSource = source;

    source.addEventListener('change', async (event) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        const nextSequence = Number(payload.sequence || 0);
        if (!Number.isFinite(nextSequence) || nextSequence <= state.liveSequence) return;
        state.liveSequence = nextSequence;
        if (payload.reason === 'analytics_event') return;
        await loadAffiliates(false);
      } catch (_) {
        // Keep current state until the next valid event.
      }
    });

    source.addEventListener('error', () => {
      closeLiveStream();
      window.setTimeout(() => {
        if (!document.hidden) connectLiveStream();
      }, 2000);
    });
  };

  applyTheme(window.localStorage.getItem(themeStorageKey) || 'dark');
  setupTopbarMenu();

  document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.adminTheme === 'dark' ? 'light' : 'dark');
  });

  document.querySelectorAll('[data-open-affiliate-modal]').forEach((button) => {
    button.addEventListener('click', openAffiliateModal);
  });

  document.querySelectorAll('[data-close-affiliate-modal]').forEach((node) => {
    node.addEventListener('click', closeAffiliateModal);
  });

  affiliateForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(affiliateForm);
    const payload = {
      name: String(formData.get('name') || '').trim(),
      platforms: formData.getAll('platforms[]').map((value) => String(value)),
      products: formData.getAll('products[]').map((value) => String(value))
    };

    try {
      if (affiliateFormError) {
        affiliateFormError.hidden = true;
        affiliateFormError.textContent = '';
      }
      await requestJson(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      closeAffiliateModal();
      await loadAffiliates(false);
    } catch (error) {
      if (affiliateFormError) {
        affiliateFormError.hidden = false;
        affiliateFormError.textContent = error.message;
      }
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      closeLiveStream();
      return;
    }
    connectLiveStream();
    loadAffiliates(false);
  });

  window.addEventListener('beforeunload', closeLiveStream);

  const initialize = async () => {
    try {
      await loadAffiliates(true);
    } catch (error) {
      if (affiliateList) {
        affiliateList.innerHTML = `<p class="admin-empty">Gagal memuat affiliate: ${escapeHtml(error.message)}</p>`;
      }
      finishLoader();
    }
    connectLiveStream();
  };

  initialize();
});
