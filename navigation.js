// Navigation only: existing page controllers own data loading and all mutations.
const rail = document.querySelector('[data-ed-current]');
if (rail) {
  const map = JSON.parse(document.getElementById('ed-navigation-map').textContent);
  const pages = new Map(map.pages.map(page => [page.id, page]));
  const dialog = document.querySelector('[data-ed-search]');
  const input = document.querySelector('[data-ed-search-input]');
  const results = document.querySelector('[data-ed-search-results]');
  const root = document.querySelector('[data-admin-dashboard]');
  let current = pages.get(rail.dataset.edCurrent) || pages.get('overview');
  let resultIndex = 0;
  const parentOf = page => page.parent ? parentOf(pages.get(page.parent)) : page;
  const normalizeView = view => view === 'home' ? 'campaigns' : view;
  const areaTitle = id => map.areas.find(area => area.id === id).title;
  const showArea = id => {
    rail.querySelectorAll('[data-ed-area]').forEach(button => {
      button.classList.toggle('is-selected', button.dataset.edArea === id);
      if (button.dataset.edArea === id) button.setAttribute('aria-current', 'location');
      else button.removeAttribute('aria-current');
    });
    rail.querySelectorAll('[data-ed-section]').forEach(section => section.hidden = section.dataset.edSection !== id);
  };
  const host = document.querySelector('.admin-shell-main') || (document.body.classList.contains('ed-standalone') ? document.querySelector('main') : null);
  const breadcrumb = document.createElement('nav');
  breadcrumb.className = 'ed-breadcrumb';
  breadcrumb.setAttribute('aria-label', 'Page location');
  host?.prepend(breadcrumb);
  const link = (title, href) => { const a = document.createElement('a'); a.textContent = title; a.href = href; return a; };
  const sync = () => {
    const view = root?.dataset.activeView;
    if (view) current = map.pages.find(page => page.href === '/dashboard/?view=' + normalizeView(view)) || current;
    const parent = parentOf(current);
    showArea(current.area);
    rail.querySelectorAll('[data-ed-page]').forEach(a => {
      const active = a.dataset.edPage === parent.id;
      a.classList.toggle('is-current', active);
      if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    breadcrumb.replaceChildren();
    const area = document.createElement('button'); area.type = 'button'; area.textContent = areaTitle(current.area);
    area.addEventListener('click', () => { showArea(current.area); if (matchMedia('(max-width: 820px)').matches) document.querySelector('[data-admin-rail-toggle]')?.click(); });
    breadcrumb.append(area);
    if (current.parent) { const sep = document.createElement('span'); sep.textContent = '/'; breadcrumb.append(sep, link(parent.title, parent.href)); }
    const slash = document.createElement('span'); slash.textContent = '/';
    const title = document.createElement('span'); title.textContent = current.title; title.setAttribute('aria-current', 'page');
    breadcrumb.append(slash, title);
  };
  if (root) new MutationObserver(sync).observe(root, {attributes:true, attributeFilter:['data-active-view']});
  sync();
  // Record pages keep their existing URLs and IDs. Search leads to the owning list,
  // where a real record is selected; it never invents an ID or opens an empty record.
  const aliases = {activation:'hard set big set',connections:'back dash api ingest authorization',ads:'ad view shopee',inventory:'inventory recap stock',customers:'repeat customers',accounting:'cash control profit-loss', 'direct-history':'whatsapp history walk in', 'direct-new':'direct orders whatsapp orders walk in'};
  const drawResults = () => {
    const query = input.value.trim().toLowerCase();
    const matches = map.pages.filter(page => `${page.title} ${page.description} ${areaTitle(page.area)} ${aliases[page.id] || ''}`.toLowerCase().includes(query));
    results.replaceChildren(); resultIndex = 0;
    matches.forEach((page, index) => {
      const destination = page.parent ? parentOf(page) : page;
      const a = link(page.title, destination.href);
      a.className = 'ed-search-result' + (index === 0 ? ' is-selected' : '');
      const context = document.createElement('small'); context.textContent = `${areaTitle(page.area)} / ${page.parent ? destination.title + ' · select a record' : page.section.toLowerCase()}`;
      a.append(context); a.addEventListener('click', () => dialog.close()); results.append(a);
    });
    if (!matches.length) { const p = document.createElement('p'); p.textContent = 'No matching pages.'; results.append(p); }
  };
  const openSearch = () => { input.value = ''; drawResults(); dialog.showModal(); input.focus(); };
  document.querySelectorAll('[data-ed-search-open]').forEach(button => button.addEventListener('click', openSearch));
  document.querySelector('[data-ed-search-close]').addEventListener('click', () => dialog.close());
  input.addEventListener('input', drawResults);
  // Cmd/Ctrl+/ avoids taking over the existing dashboard's order/content search.
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === '/') { event.preventDefault(); if (dialog.open) dialog.close(); else openSearch(); }
    if (!dialog.open || !['ArrowDown','ArrowUp','Enter'].includes(event.key)) return;
    const links = [...results.querySelectorAll('a')]; if (!links.length) return;
    event.preventDefault();
    if (event.key === 'Enter') { links[resultIndex].click(); return; }
    resultIndex = (resultIndex + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
    links.forEach((a,i) => a.classList.toggle('is-selected', i === resultIndex));
    links[resultIndex].scrollIntoView({block:'nearest'});
  });
  // Preserve unpaid-order, stock and low-ad-credit awareness when an area is closed.
  const syncAlerts = () => {
    for (const [area,selector,flag] of [['sales','[data-ed-page="orders"]','has-unpaid-direct-order'],['growth','[data-ed-page="ads"]','is-credit-alert'],['products','[data-ed-page="inventory"]','has-critical-dot']]) {
      rail.querySelector(`[data-ed-area="${area}"]`).classList.toggle('has-alert', rail.querySelector(selector)?.classList.contains(flag) || false);
    }
  };
  for (const selector of ['[data-ed-page="orders"]','[data-ed-page="ads"]','[data-ed-page="inventory"]']) {
    const source = rail.querySelector(selector);
    if (source) new MutationObserver(syncAlerts).observe(source,{attributes:true,attributeFilter:['class']});
  }
  syncAlerts();
  const toggle = document.querySelector('[data-admin-rail-toggle]');
  const mobileQuery = matchMedia('(max-width: 820px)');
  let wasMobileOpen = false;
  const syncMobile = () => {
    const open = mobileQuery.matches && document.body.classList.contains('admin-rail-open');
    const focusWasInside = rail.contains(document.activeElement);
    rail.inert = mobileQuery.matches && !open;
    if (open && !wasMobileOpen) rail.querySelector('.ed-brand')?.focus();
    if (!open && wasMobileOpen && focusWasInside) toggle?.focus();
    wasMobileOpen = open;
  };
  document.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || !wasMobileOpen || dialog.open) return;
    const controls = [...rail.querySelectorAll('a,button,input')].filter(el => el.offsetParent !== null);
    controls.push(toggle);
    const first = controls[0], last = controls[controls.length-1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  new MutationObserver(syncMobile).observe(document.body,{attributes:true,attributeFilter:['class']});
  mobileQuery.addEventListener('change',syncMobile); syncMobile();
  dialog.addEventListener('close', () => { if (mobileQuery.matches && rail.inert) toggle?.focus(); });
}
