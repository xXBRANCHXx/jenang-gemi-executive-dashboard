const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { startServer, routes } = require('./fixtures/mobile-pages.cjs');
const output = process.env.MOBILE_REVIEW_DIR;
if (output) fs.mkdirSync(output,{recursive:true});

function layoutIssues() {
  const shown = e => e.getClientRects().length && e.checkVisibility({visibilityProperty:true})
    && !e.closest('[hidden], [inert], [aria-hidden="true"], .admin-sr-only');
  const scrolls = e => {
    for (let parent=e.parentElement; parent && parent!==document.body; parent=parent.parentElement) {
      if (parent.matches('main,.admin-shell-main,.admin-shell,.admin-app,.admin-view,.admin-view-panel')) continue;
      if (/auto|scroll/.test(getComputedStyle(parent).overflowX) && parent.scrollWidth>parent.clientWidth+2) return true;
    }
    return false;
  };
  const describe = e => `${e.tagName.toLowerCase()}.${e.className}: ${(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,60)}`;
  const nodes = [...document.querySelectorAll('main *, .admin-shell-main *')].filter(shown);
  const mobile = matchMedia('(max-width: 1024px)').matches;
  const issues = [];
  for (const e of nodes) {
    const r=e.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(e).position==='fixed') continue;
    if ((r.x < -2 || r.right > innerWidth+2) && !scrolls(e)) issues.push('Outside viewport: '+describe(e));
    if (mobile && e.matches('button,summary') && !e.matches('.admin-liquidity-segment,.admin-liquidity-commitment-overlay') && r.height < 43.5) issues.push('Small touch target: '+describe(e));
    if (e.matches('h1,h2,h3,button') && !e.matches('.admin-liquidity-segment,.admin-liquidity-commitment-overlay') && e.scrollWidth>e.clientWidth+3 && !scrolls(e)) issues.push('Clipped text: '+describe(e));
    if (mobile && e.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=hidden]),select,textarea') && parseFloat(getComputedStyle(e).fontSize)<16) issues.push('Input can trigger zoom: '+describe(e));
  }
  const viewport=document.querySelector('meta[name=viewport]')?.content||'';
  if (/maximum-scale=1(?:,|$)|user-scalable=no/.test(viewport)) issues.push('Pinch zoom disabled');
  return [...new Set(issues)].slice(0,15);
}

(async () => {
  const {server,base}=await startServer();
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
    await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
    const errors=[]; page.on('pageerror',error=>errors.push(error.message));
    const report=[];
    const sizes=[{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:844,height:390},{width:1280,height:900}];
    for (const route of routes) {
      if (process.env.MOBILE_PAGES && !process.env.MOBILE_PAGES.split(',').includes(route.id)) continue;
      errors.length=0;
      await page.goto(base+route.href);
      await page.waitForFunction(()=>!document.body.classList.contains('is-loading'));
      const checks=[];
      for (const size of sizes) {
        await page.setViewportSize(size);
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const issues=await page.evaluate(layoutIssues);
        checks.push({size,issues});
        if (output && size.width===390) {
          for (const theme of ['dark','light']) {
            await page.evaluate(theme=>document.documentElement.dataset.adminTheme=theme,theme);
            await page.screenshot({path:path.join(output,`${route.id}-${theme}.png`),fullPage:true});
          }
          await page.evaluate(()=>document.documentElement.dataset.adminTheme='dark');
        }
      }
      report.push({page:route.id,checks,errors:[...errors]});
      console.log(route.id+': '+checks.map(c=>`${c.size.width}=${c.issues.length}`).join(', ')+(errors.length?' errors='+errors.join('; '):''));
      if (output) fs.writeFileSync(path.join(output,'mobile-audit.json'),JSON.stringify(report,null,2));
    }
    const destinationCount=report.length;

    // Real controls exercise menu focus, scrolling, dismissal and background isolation.
    await page.setViewportSize({width:320,height:568});
    await page.goto(base+'/dashboard/?view=orders');
    await page.locator('body.is-ready').waitFor();
    await page.locator('[data-mobile-nav-more]').tap();
    assert.equal(await page.locator('.admin-shell-main').evaluate(e=>e.inert),true);
    assert.equal(await page.locator('[data-mobile-nav-more]').getAttribute('aria-expanded'),'true');
    assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).touchAction),'auto');
    assert(await page.locator('.ed-navigation-columns').evaluate(e=>e.clientWidth>=e.parentElement.clientWidth-2),'Menu content fills the drawer');
    assert(await page.locator('.ed-toggle-close-icon').isVisible(),'Open menu shows a close control');
    const lastLink=page.locator('.ed-nav-footer a').last();
    await lastLink.scrollIntoViewIfNeeded();
    assert(await lastLink.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'Menu footer is reachable above app bars');
    await page.locator('.ed-mobile-toggle').tap();
    assert.equal(await page.locator('[data-mobile-nav-more]').evaluate(e=>e===document.activeElement),true);
    assert.equal(await page.locator('.admin-shell-main').evaluate(e=>e.inert),false);
    await page.locator('[data-mobile-nav-more]').tap();
    await page.locator('.ed-search-open').tap();
    await page.locator('[data-ed-search-input]').fill('product');
    assert(await page.locator('.ed-search-result').count()>0);
    await page.locator('[data-ed-search-close]').tap();
    await page.keyboard.press('Escape');

    await page.setViewportSize({width:844,height:390});
    await page.locator('.ed-mobile-toggle').tap();
    assert.equal(await page.locator('.ed-nav').evaluate(e=>e.inert),false,'Landscape uses the mobile menu');
    await page.locator('.ed-areas [data-ed-area="settings"]').scrollIntoViewIfNeeded();
    assert(await page.locator('.ed-areas [data-ed-area="settings"]').evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'All business areas remain reachable in landscape');
    await page.locator('.ed-mobile-toggle').tap();
    await page.setViewportSize({width:320,height:568});

    // A real, populated filter drawer retains reachable actions on the smallest phone.
    await page.locator('[data-orders-filter-open]').tap();
    const filter=page.locator('.admin-orders-filter-card');
    const bounds=await filter.boundingBox();
    assert(bounds.x>=0 && bounds.x+bounds.width<=320 && bounds.y>=0 && bounds.y+bounds.height<=568,'Filter fits viewport');
    assert.equal(await page.locator('.admin-mobile-tabbar').evaluate(e=>getComputedStyle(e).visibility),'hidden');
    const done=filter.locator('[data-orders-filter-close]').last();
    await done.scrollIntoViewIfNeeded();
    assert(await done.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'Filter action is not covered by navigation or build badge');
    await done.tap();
    assert.equal(await page.locator('.admin-mobile-tabbar').evaluate(e=>getComputedStyle(e).visibility),'visible');

    // Scrollable reports announce the gesture and can receive keyboard focus.
    await page.goto(base+'/dashboard/product-analytics/?product=syrup&scope=month&compare=drops-4x');
    await page.waitForFunction(()=>document.querySelector('[data-load-status] span').textContent.startsWith('Updated'));
    const table=page.locator('.product-analytics-table-scroll');
    await page.waitForFunction(()=>document.querySelector('.product-analytics-table-scroll').tabIndex===0);
    assert(await page.locator('.ed-table-scroll-hint').filter({visible:true}).count()>0);
    await table.evaluate(e=>e.scrollLeft=e.scrollWidth);
    assert(await table.evaluate(e=>e.scrollLeft>0),'Comparison revenue columns are reachable');
    const canvas=page.locator('[data-history-chart]');
    await canvas.scrollIntoViewIfNeeded();
    await canvas.tap({position:{x:64,y:120}});
    assert(await page.locator('[data-chart-tooltip]').isVisible(),'Chart values work on touch');

    // Read-only settings tabs and new draft editor expose their full mobile forms.
    await page.goto(base+'/profit-loss/');
    await page.locator('[data-accounting-settings]').tap();
    const settings=page.locator('.admin-accounting-account-settings-card');
    for (const tab of ['accounts','categories','lists','language']) {
      await page.locator(`[data-accounting-settings-tab="${tab}"]`).tap();
      assert(await settings.evaluate(e=>e.scrollWidth<=e.clientWidth+2),'Accounting settings fit: '+tab);
    }
    await settings.locator('[data-accounting-account-settings-close]').tap();

    await page.goto(base+'/whatsapp-orders/');
    await page.locator('[data-add-sku]').first().tap();
    assert.equal(await page.locator('[data-cart-row]').count(),1);
    await page.locator('[data-cart-discount-toggle]').tap();
    await page.locator('[data-cart-discount]').fill('5');
    await page.locator('[data-cart-discount-done]').tap();
    await page.locator('[data-channel-option="walk_in"]').tap();
    assert(await page.locator('[data-add-sku]').first().isVisible(),'Walk-in keeps product selection available');
    assert(await page.locator('[data-discount-value]').isVisible(),'Walk-in keeps order pricing available');
    assert.equal(await page.locator('[data-label-drop]').isVisible(),false,'Walk-in hides delivery-only fields');
    await page.locator('[data-channel-option="whatsapp"]').tap();
    assert(await page.locator('[data-label-drop]').isVisible(),'WhatsApp restores shipping fields');
    const cartChecks=[];
    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      cartChecks.push({size,issues:await page.evaluate(layoutIssues)});
    }
    report.push({page:'direct-order-cart',checks:cartChecks,errors:[]});
    await page.setViewportSize({width:320,height:568});
    await page.goto(base+'/blog-builder/');
    await page.locator('[data-new-post]').first().tap();
    assert(await page.locator('[data-editor-form]').isVisible());
    const editorChecks=[];
    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      editorChecks.push({size,issues:await page.evaluate(layoutIssues)});
    }
    report.push({page:'blog-editor',checks:editorChecks,errors:[]});

    if (output) fs.writeFileSync(path.join(output,'mobile-audit.json'),JSON.stringify(report,null,2));
    const failures=report.flatMap(row=>[...row.errors.map(error=>`${row.page}: ${error}`),...row.checks.flatMap(check=>check.issues.map(issue=>`${row.page} ${check.size.width}: ${issue}`))]);
    assert.deepEqual(failures,[]);
    console.log(`PASS: ${destinationCount} page destinations and login states, five viewport sizes, menu, filters, table scrolling, touch chart, accounting settings, direct-order cart and blog editor.`);
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
