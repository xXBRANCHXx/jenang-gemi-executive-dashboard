document.addEventListener('DOMContentLoaded', () => {
  const themeStorageKey = 'jg-admin-theme';
  const themeCookieMaxAge = 60 * 60 * 24 * 365 * 2;
  const themeOptions = ['dark', 'minimal-white', 'classic-white', 'minimal-black', 'prism'];
  const menuShell = document.querySelector('[data-menu-shell]');
  const menuTrigger = document.querySelector('[data-menu-trigger]');
  const menuPanel = document.querySelector('[data-menu-panel]');

  const normalizeTheme = (theme) => {
    if (theme === 'light') return 'classic-white';
    return themeOptions.includes(theme) ? theme : 'dark';
  };

  const readThemeCookie = () => {
    const escapedKey = themeStorageKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escapedKey}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : '';
  };

  const writeThemeCookie = (theme) => {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${themeStorageKey}=${encodeURIComponent(theme)}; Path=/; SameSite=Lax; Max-Age=${themeCookieMaxAge}${secure}`;
  };

  const readStoredTheme = () => {
    try {
      return window.localStorage.getItem(themeStorageKey) || readThemeCookie();
    } catch (_error) {
      return readThemeCookie();
    }
  };

  const writeStoredTheme = (theme) => {
    try {
      window.localStorage.setItem(themeStorageKey, theme);
    } catch (_error) {
      // Cookies keep the device preference when localStorage is unavailable.
    }
    writeThemeCookie(theme);
  };

  const getNextTheme = () => {
    const currentTheme = normalizeTheme(document.documentElement.dataset.adminTheme);
    const currentIndex = themeOptions.indexOf(currentTheme);
    return themeOptions[(currentIndex + 1) % themeOptions.length];
  };

  const applyTheme = (theme) => {
    const normalizedTheme = normalizeTheme(theme);
    document.documentElement.dataset.adminTheme = normalizedTheme;
    writeStoredTheme(normalizedTheme);
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

  applyTheme(readStoredTheme() || 'dark');

  menuTrigger?.addEventListener('click', () => {
    if (menuPanel?.hidden === false) closeMenu();
    else openMenu();
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

  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      applyTheme(getNextTheme());
    });
  });
});
