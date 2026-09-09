const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = 'http://127.0.0.1:4180';
// Browser-only fixtures exercise the original controllers; no production writes.
const accounts = [
  { platform: 'shopee', account: 'jenang-gemi-shopee', label: 'Jenang Gemi Shopee' },
  { platform: 'shopee', account: 'zero-shopee', label: 'ZERO Shopee' },
  { platform: 'tiktok', account: 'jenang-gemi-tiktok', label: 'Jenang Gemi TikTok' },
  { platform: 'tiktok', account: 'zero-tiktok', label: 'ZERO TikTok' }
];
const daily = { month: '2026-09', accounts, days: Array.from({length:9}, (_,i) => ({date:`2026-09-0${i+1}`, accounts:accounts.map((a,j)=>({...a,qty:20+i*3+j,orders:10+i+j,revenue:(20+i*3+j)*17500}))})) };
const wallets = accounts.map((a,i)=>({platform:a.platform,account_key:a.account,label:a.label,wallet_balance:1250000+i*200000,wallet_balance_known:true,outstanding_total:8100000,released_month_total:9400000,outstanding_orders:140}));
const wallet = {wallets,totals:{known_balance_count:4,wallet_balance:6200000,outstanding_total:32400000,released_month_total:37600000,outstanding_orders:560}};
const ops = {ok:true,filters:{date_from:'2026-09-09',date_to:'2026-09-09'},employees:[{id:'a',display_name:'Ayu',active:true},{id:'b',display_name:'Budi',active:true}],metrics:{fulfilled_today:48,active_claims:6,average_fulfillment_label:'4m 12s',scan_errors:2,employee_throughput:[{employee_name:'Ayu',fulfilled_count:28},{employee_name:'Budi',fulfilled_count:20}]},orders:[{order_id:'SPX-00001',source_platform:'shopee',source_account:'jenang-gemi-shopee',status:'FULFILLED',employee_name:'Ayu',claimed_at:'2026-09-09 02:00:00',scan_completed_at:'2026-09-09 02:03:00',label_printed_at:'2026-09-09 02:04:00',fulfilled_at:'2026-09-09 02:04:12',duration_label:'4m 12s'}],events:[{event_type:'FULFILLED',employee_name:'Ayu',created_at:'2026-09-09 02:04:12'}]};
(async()=>{
 const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1440,height:1100}});const page=await context.newPage();const errors=[],opsRequests=[];let budgetActive=false;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==base)return r.abort();
  if(u.pathname==='/api/store-ops/'){opsRequests.push(u);return r.fulfill({json:ops});}
  if(u.searchParams.get('action')==='daily_summary')return r.fulfill({json:daily});
  if(u.pathname==='/api/wallet/')return r.fulfill({json:wallet});
  if(u.pathname==='/api/ads/')return r.fulfill({json:{accounts:[{account_key:'jenang-gemi-shopee',credit_alert_active:budgetActive}]}});
  return r.continue();});
 await page.goto(base+'/dashboard/?view=store-ops');
 await page.waitForFunction(()=>document.querySelector('[data-store-ops-metric="fulfilled_today"]').textContent==='48');
 assert.equal(new URL(await page.locator('[data-ed-back]').getAttribute('href'),base).search,'?view=orders','Direct entry has area parent');
 await page.locator('[data-store-ops-employee-summary]').click();await page.locator('[data-store-ops-employees]').selectOption(['a','b']);
 assert.equal(await page.locator('[data-store-ops-employee-summary]').textContent(),'2 employees');
 await page.locator('[data-store-ops-source]').fill('shopee');await page.locator('[data-store-ops-filters] button[type="submit"]').click();
 await page.waitForURL('**/*employees=a%2Cb*');
 assert(opsRequests.some(u=>u.searchParams.get('employees')==='a,b'&&u.searchParams.get('source')==='shopee'));
 await page.locator('[data-status-value="FULFILLED"]').click();await page.waitForURL('**/*status=FULFILLED*');
 const filtered=page.url();
 await page.locator('[data-ed-area="overview"]').click();await page.waitForURL('**/?view=overview*');
 await page.locator('[data-ed-back]').click();await page.waitForURL(filtered);
 await page.waitForFunction(()=>document.querySelector('[data-store-ops-employees]').selectedOptions.length===2);
 await page.locator('[data-store-ops-reset]').click();await page.waitForURL('**/?view=store-ops');
 await page.waitForFunction(()=>document.querySelector('[data-store-ops-employee-summary]').textContent==='All employees');
 await page.locator('[data-store-ops-table-body] tr').click();await page.locator('[data-store-ops-drawer]').waitFor({state:'visible'});
 await page.waitForFunction(()=>document.querySelector('[data-store-ops-events]').textContent.includes('FULFILLED'));await page.locator('[data-store-ops-drawer-close]').first().click();
 for(const view of ['store-ops','daily','wallet']){
  await page.goto(base+'/dashboard/?view='+view);await page.waitForTimeout(700);
  if(view==='daily'){
   assert.equal(await page.locator('[data-daily-sheet-body] tr').count(),30);
   await page.locator('[data-daily-metric="qty"]').click();assert(await page.locator('[data-daily-metric="qty"]').evaluate(e=>e.classList.contains('is-active')));
   const download=page.waitForEvent('download');await page.locator('[data-daily-export]').click();assert.match((await download).suggestedFilename(),/\.pdf$/);
   await page.locator('[data-daily-metric="revenue"]').click();
  }
  if(view==='wallet'){
   assert.match(await page.locator('[data-wallet-total-balance]').textContent(),/6\.200\.000/);
   await page.locator('[data-wallet-mode="api"]').click();assert(await page.locator('[data-wallet-api-panel]').isVisible());
   await page.locator('[data-wallet-mode="wallet"]').click();await page.locator('[data-wallet-balance-toggle]').first().click();
   assert(await page.locator('[data-wallet-balance-amount]').first().isVisible());await page.locator('[data-wallet-balance-toggle]').first().click();
  }
  for(const theme of ['dark','light']){
   await page.evaluate(t=>{document.documentElement.dataset.adminTheme=t;window.dispatchEvent(new Event('resize'));},theme);await page.waitForTimeout(300);
   const surfaces=await page.locator(`[data-view-panel="${view}"] :is(.admin-metric-card,.admin-panel,.admin-wallet-stat,.daily-sheet-shell,.daily-trend-panel)`).evaluateAll(nodes=>nodes.map(n=>({image:getComputedStyle(n).backgroundImage,bg:getComputedStyle(n).backgroundColor})));
   assert(surfaces.every(s=>s.image==='none'&&s.bg==='rgba(0, 0, 0, 0)'),view+' flat surfaces');
   await page.screenshot({path:path.join(__dirname,`../verification/ui/flat-${view}-${theme}.png`)});
  }
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),view+' fits mobile');
  await page.screenshot({path:path.join(__dirname,`../verification/ui/flat-${view}-mobile.png`)});
  await page.setViewportSize({width:1440,height:1100});
 }
 // Existing status feed, rather than an invented balance/threshold calculation.
 budgetActive=true;
 for(const route of ['/dashboard/?view=store-ops','/profit-loss/']){
  await page.goto(base+route);await page.locator('[data-ed-budget-alert]').waitFor({state:'visible'});
  assert(await page.locator('[data-ed-area="growth"]').evaluate(e=>e.classList.contains('has-budget-alert')));
  assert.equal(await page.locator('[data-ed-budget-alert] a').getAttribute('href'),'/dashboard/?view=ad-view');
 }
 await page.goto(base+'/dashboard/?view=wallet');await page.locator('[data-ed-budget-alert]').waitFor({state:'visible'});
 await page.waitForFunction(()=>!document.body.classList.contains('is-loading'));await page.waitForTimeout(500);
 await page.screenshot({path:path.join(__dirname,'../verification/ui/ad-budget-alert-dark.png')});
 await page.locator('[data-ed-budget-alert] a').click();await page.waitForURL('**/?view=ad-view');
 await page.setViewportSize({width:390,height:844});assert(await page.locator('[data-ed-budget-alert] a').isVisible());
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:path.join(__dirname,'../verification/ui/ad-budget-alert-mobile.png')});
 budgetActive=false;await page.goto(base+'/dashboard/?view=wallet');await page.waitForTimeout(600);
 assert(await page.locator('[data-ed-budget-alert]').isHidden());
 assert.deepEqual(errors,[]);await browser.close();
 console.log('PASS: three flat pages in both themes/mobile; multi-employee filters/reset/timeline; Back with filters; Daily chart/export; Wallet modes/editor; native ad-trigger feed across pages and responsive review banner.');
})().catch(e=>{console.error(e);process.exit(1)});
