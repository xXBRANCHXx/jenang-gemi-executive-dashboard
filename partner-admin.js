document.addEventListener('DOMContentLoaded', () => {
  const themeStorageKey = 'jg-admin-theme';
  const menuShell = document.querySelector('[data-menu-shell]');
  const menuTrigger = document.querySelector('[data-menu-trigger]');
  const menuPanel = document.querySelector('[data-menu-panel]');

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

  applyTheme(window.localStorage.getItem(themeStorageKey) || 'dark');

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
      applyTheme(document.documentElement.dataset.adminTheme === 'dark' ? 'light' : 'dark');
    });
  });
});
