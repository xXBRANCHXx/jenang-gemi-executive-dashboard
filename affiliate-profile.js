document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-affiliate-profile]');
  if (!root) return;

  const themeStorageKey = 'jg-admin-theme';
  const endpoint = root.dataset.affiliatesEndpoint || './affiliates.php';
  const affiliateCode = (root.dataset.affiliateCode || '').trim().toUpperCase();
  const menuShell = document.querySelector('[data-menu-shell]');
  const menuTrigger = document.querySelector('[data-menu-trigger]');
  const menuPanel = document.querySelector('[data-menu-panel]');
  const profileTitle = document.querySelector('[data-profile-title]');
  const profileCode = document.querySelector('[data-profile-code]');
  const profileName = document.querySelector('[data-profile-name]');
  const profileForm = document.querySelector('[data-profile-form]');
  const profileError = document.querySelector('[data-profile-error]');
  const profileUrls = document.querySelector('[data-profile-urls]');
  const loader = document.querySelector('[data-admin-loader]');
  const loaderProgress = document.querySelector('[data-admin-loader-progress]');
  const loaderLabel = document.querySelector('[data-admin-loader-label]');

  const state = {
    affiliate: null
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
    setLoaderState(100, 'Affiliate profile ready');
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

  const renderUrls = (affiliate) => {
    if (!profileUrls) return;
    const urls = affiliate?.urls && typeof affiliate.urls === 'object' ? affiliate.urls : {};
    const items = Object.entries(urls).map(([platform, url]) => `
      <a class="admin-affiliate-url" href="https://jenanggemi.com${escapeHtml(String(url || ''))}" target="_blank" rel="noopener">
        <strong>${escapeHtml(toTitleCase(platform))}</strong>
        <span>${escapeHtml(String(url || ''))}</span>
      </a>
    `).join('');
    profileUrls.innerHTML = items || '<p class="admin-empty">Belum ada URL.</p>';
  };

  const renderAffiliate = (affiliate) => {
    state.affiliate = affiliate;
    if (profileTitle) profileTitle.textContent = `${affiliate.name || 'Affiliate Profile'} | Jenang Gemi Executive Dashboard`;
    if (profileCode) profileCode.textContent = affiliate.code || 'Affiliate';
    if (profileName) profileName.textContent = affiliate.name || affiliate.code || 'Affiliate';
    if (profileForm) {
      const nameInput = profileForm.querySelector('input[name="name"]');
      if (nameInput instanceof HTMLInputElement) {
        nameInput.value = affiliate.name || '';
      }
      profileForm.querySelectorAll('input[name="platforms[]"]').forEach((input) => {
        if (!(input instanceof HTMLInputElement)) return;
        input.checked = Array.isArray(affiliate.platforms) && affiliate.platforms.includes(input.value);
      });
      profileForm.querySelectorAll('input[name="products[]"]').forEach((input) => {
        if (!(input instanceof HTMLInputElement)) return;
        input.checked = Array.isArray(affiliate.products) && affiliate.products.includes(input.value);
      });
    }
    renderUrls(affiliate);
  };

  const loadAffiliate = async (showLoader = false) => {
    if (!affiliateCode) {
      throw new Error('Affiliate code is required.');
    }
    if (showLoader) setLoaderState(34, 'Loading affiliate profile');
    const payload = await requestJson(endpoint);
    const affiliate = Array.isArray(payload.affiliates)
      ? payload.affiliates.find((item) => String(item.code || '').toUpperCase() === affiliateCode)
      : null;
    if (!affiliate) {
      throw new Error(`Affiliate ${affiliateCode} not found.`);
    }
    renderAffiliate(affiliate);
    if (showLoader) finishLoader();
  };

  applyTheme(window.localStorage.getItem(themeStorageKey) || 'dark');
  setupTopbarMenu();

  document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.adminTheme === 'dark' ? 'light' : 'dark');
  });

  profileForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(profileForm);
    const payload = {
      code: affiliateCode,
      name: String(formData.get('name') || '').trim(),
      platforms: formData.getAll('platforms[]').map((value) => String(value)),
      products: formData.getAll('products[]').map((value) => String(value))
    };

    try {
      if (profileError) {
        profileError.hidden = true;
        profileError.textContent = '';
      }
      const response = await requestJson(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      renderAffiliate(response.affiliate || state.affiliate);
    } catch (error) {
      if (profileError) {
        profileError.hidden = false;
        profileError.textContent = error.message;
      }
    }
  });

  document.querySelector('[data-delete-affiliate]')?.addEventListener('click', async () => {
    if (!window.confirm(`Delete affiliate ${affiliateCode}? This will remove all generated landing pages for that affiliate.`)) {
      return;
    }
    try {
      await requestJson(endpoint, {
        method: 'DELETE',
        body: JSON.stringify({ code: affiliateCode })
      });
      window.location.href = '../affiliate-profiles/';
    } catch (error) {
      if (profileError) {
        profileError.hidden = false;
        profileError.textContent = error.message;
      }
    }
  });

  const initialize = async () => {
    try {
      await loadAffiliate(true);
    } catch (error) {
      if (profileError) {
        profileError.hidden = false;
        profileError.textContent = error.message;
      }
      finishLoader();
    }
  };

  initialize();
});
