// Progressive mobile improvements shared by every native dashboard page.
const mobileQuery = matchMedia('(max-width: 1024px)');
const tableRegions = new Map();
let pending = false;

const updateTables = () => {
  pending = false;
  if (mobileQuery.matches) {
    document.querySelectorAll('table').forEach(table => {
      if (!table.getClientRects().length) return;
      let container = table.parentElement;
      while (container && container !== document.body) {
        const overflow = getComputedStyle(container).overflowX;
        if (/auto|scroll/.test(overflow)) break;
        container = container.parentElement;
      }
      if (!container || container === document.body || tableRegions.has(container)) return;
      const hint = document.createElement('p');
      hint.className = 'ed-table-scroll-hint';
      hint.textContent = 'Swipe left or right to see all columns.';
      hint.setAttribute('aria-hidden', 'true');
      hint.hidden = true;
      container.before(hint);
      tableRegions.set(container, {hint, tabindex: container.getAttribute('tabindex')});
    });
  }
  tableRegions.forEach(({hint, tabindex}, container) => {
    if (!container.isConnected) { hint.remove(); tableRegions.delete(container); return; }
    const scrollable = mobileQuery.matches && container.getClientRects().length > 0 && container.scrollWidth > container.clientWidth + 2;
    if (hint.hidden === scrollable) hint.hidden = !scrollable;
    container.classList.toggle('ed-scroll-region', scrollable);
    if (scrollable && tabindex === null) container.tabIndex = 0;
    else if (!scrollable && tabindex === null) container.removeAttribute('tabindex');
  });
};
const scheduleTables = () => {
  if (!pending) { pending = true; requestAnimationFrame(updateTables); }
};
new MutationObserver(records => {
  if (records.some(record => record.type === 'childList' || record.attributeName === 'hidden' || record.attributeName === 'data-active-view')) scheduleTables();
}).observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['hidden', 'data-active-view']});
window.addEventListener('resize', scheduleTables);
mobileQuery.addEventListener('change', scheduleTables);
scheduleTables();

// App bars must not sit over a form while the on-screen keyboard is open.
const updateKeyboard = () => {
  const viewport = window.visualViewport;
  const editing = document.activeElement?.matches('input, textarea, [contenteditable="true"]');
  document.body.classList.toggle('ed-keyboard-open', Boolean(mobileQuery.matches && editing && viewport && viewport.scale === 1 && viewport.height < innerHeight * .75));
};
window.visualViewport?.addEventListener('resize', updateKeyboard);
document.addEventListener('focusin', updateKeyboard);
document.addEventListener('focusout', updateKeyboard);
mobileQuery.addEventListener('change', updateKeyboard);

// Non-native drawers share the page's stacking contexts; keep app bars out of
// their hit targets while their existing controllers own opening and closing.
const updateDialogs = () => {
  const open = [...document.querySelectorAll('dialog[open], [role="dialog"]')].some(element =>
    !element.closest('[hidden], [aria-hidden="true"]') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden'
  );
  if (document.body.classList.contains('ed-dialog-open') !== open) document.body.classList.toggle('ed-dialog-open', open);
};
new MutationObserver(updateDialogs).observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['hidden', 'open', 'aria-hidden', 'class']});
updateDialogs();
