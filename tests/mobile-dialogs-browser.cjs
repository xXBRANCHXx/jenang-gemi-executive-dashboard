const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { startServer } = require('./fixtures/mobile-pages.cjs');

const routes = [
  '/dashboard/?view=orders', '/dashboard/?view=purchase-order',
  '/dashboard/?view=po-detail', '/dashboard/?view=daily',
  '/dashboard/?view=ad-view', '/dashboard/?view=website',
  '/profit-loss/', '/product-costs/', '/sku-db/',
  '/partner-profile/?code=SAMPLE', '/partner-sales/?code=SAMPLE',
  '/blog-builder/', '/whatsapp-order-history/'
];
const sizes = [{width:320,height:568}, {width:844,height:390}];
const output = process.env.MOBILE_REVIEW_DIR;
if (output) fs.mkdirSync(output, {recursive:true});

// Open real form shells without submitting transactions. Opening/dismissal via
// their actual buttons is covered separately in mobile-ux-browser.cjs.
function setOpen(element, open) {
  if (element.tagName === 'DIALOG') {
    if (open) element.showModal();
    else element.close();
    return true;
  }
  const shell = element.closest('.admin-modal-shell,[data-po-payment-modal],[data-purchase-order-modal]');
  if (!shell) return false;
  shell.hidden = !open;
  return true;
}

(async () => {
  const {server, base} = await startServer();
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH || undefined});
  try {
    const page = await browser.newPage({viewport:sizes[0], hasTouch:true, reducedMotion:'reduce'});
    await page.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
    const report = [], seen = new Set();
    for (const route of routes) {
      await page.goto(base + route);
      await page.waitForFunction(() => !document.body.classList.contains('is-loading'));
      const descriptors = await page.locator('dialog,[role=dialog]').evaluateAll(elements => elements.map((e,index) => ({
        index, key:e.getAttribute('aria-labelledby') || e.className
      })).filter(e => !e.key.includes('ed-search') && !e.key.includes('notification')));
      for (const descriptor of descriptors) {
        if (seen.has(descriptor.key)) continue;
        const modal = page.locator('dialog,[role=dialog]').nth(descriptor.index);
        if (!await modal.evaluate(setOpen, true)) continue;
        try {
          if (!await modal.isVisible()) continue;
          seen.add(descriptor.key);
          for (const size of sizes) {
            await page.setViewportSize(size);
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            const issues = await modal.evaluate(element => {
              const bounds = element.getBoundingClientRect(), problems = [];
              if (bounds.x < -1 || bounds.right > innerWidth+1 || bounds.y < -1 || bounds.bottom > innerHeight+1) problems.push('Dialog outside viewport');
              if (element.scrollWidth > element.clientWidth+3) problems.push('Content overflows dialog');
              for (const button of element.querySelectorAll('button')) {
                if (!button.checkVisibility() || button.closest('[hidden]')) continue;
                if (button.scrollWidth > button.clientWidth+3) problems.push('Clipped button: '+button.textContent.trim());
              }
              return problems;
            });
            report.push({route, dialog:descriptor.key, size, issues});
            if (output && issues.length) await page.screenshot({path:path.join(output, `dialog-failure-${report.length}.png`)});
          }
        } finally {
          await modal.evaluate(setOpen, false);
        }
      }
    }
    if (output) fs.writeFileSync(path.join(output, 'mobile-dialogs.json'), JSON.stringify(report,null,2));
    assert(seen.size >= 30, 'Expected the native dialog forms to render');
    assert.deepEqual(report.filter(row => row.issues.length), []);
    console.log(`PASS: ${seen.size} native dialog layouts at 320px portrait and 844px landscape.`);
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
