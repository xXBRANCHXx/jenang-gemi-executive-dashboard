const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = 'http://127.0.0.1:4180';
const common = {partner_code:'SAMPLE',partner_name:'Sample Partner',period_type:'calendar_month',period_label:'August 2026',amount:4500000,created_at:'2026-09-09 01:00:00',updated_at:'2026-09-09 01:00:00',detail_url:'/partner-sales/?code=SAMPLE'};
let events = [
 {...common,id:'payment:1',record_id:1,type:'payment',status:'pending',action_required:true,proof:{url:'/test-proof.svg',mime_type:'image/svg+xml',name:'payment.svg'}},
 {...common,id:'dispute:2',record_id:2,type:'dispute',status:'pending',action_required:true,dispute_type:'paid',items:[]},
 {...common,id:'payment:3',record_id:3,type:'payment',status:'confirmed',action_required:false,created_at:'2026-09-07 01:00:00'},
 {...common,id:'deposit:4',record_id:4,type:'balance_deposit',status:'approved',action_required:false,created_at:'2026-09-06 01:00:00',detail_url:'/partner-stock-orders/?deposit=4&partner=SAMPLE'}
];
(async()=>{
 const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1000}});const posts=[];const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const request=route.request(), url=new URL(request.url());
  if(url.origin!==base)return route.abort();
  if(url.pathname==='/test-proof.svg')return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150"><rect width="300" height="150" fill="#eee"/><text x="30" y="80">Sample payment proof</text></svg>'});
  if(url.pathname==='/api/partner-billing/'){
   assert.equal(url.searchParams.get('history'),'1');
   if(request.method()==='POST'){
    const body=request.postDataJSON();posts.push(body);
    assert.deepEqual(body,{action:'confirm_payment',payment_id:1});
    events=events.map(e=>e.id==='payment:1'?{...e,status:'confirmed',action_required:false,updated_at:'2026-09-09 02:00:00'}:e);
   }
   return route.fulfill({json:{ok:true,notifications:events}});
  }
  return route.continue();
 });
 await page.goto(base+'/profit-loss/');
 const drawer=page.locator('[data-billing-notification-drawer]');
 await page.waitForFunction(()=>document.querySelector('[data-billing-notification-count]').textContent==='2');
 await page.locator('[data-billing-notification-toggle]').click();await page.waitForTimeout(500);
 assert.equal(await drawer.locator('.admin-billing-notification-row').count(),4);
 assert.equal(await drawer.locator('.is-new').count(),2);
 const box=await drawer.boundingBox();assert(box.x+box.width===1440&&box.y===0&&box.height===1000,'Right-edge full-height inbox');
 for(const theme of ['dark','light']){
  await page.evaluate(t=>document.documentElement.dataset.adminTheme=t,theme);await page.waitForTimeout(500);
  await page.screenshot({path:path.join(__dirname,`../verification/ui/notifications-${theme}.png`)});
 }
 await drawer.locator('[data-notification-filter="new"]').click();assert.equal(await drawer.locator('.admin-billing-notification-row').count(),2);
 await drawer.locator('[data-billing-select="payment:1"]').click();
 assert(await drawer.locator('[data-billing-action="confirm_payment"]').isVisible());
 await drawer.locator('[data-billing-notification-back]').click();
 assert.equal(await drawer.locator('.admin-billing-notification-row').count(),1,'Opening an item marks it read');
 await drawer.locator('[data-notification-filter="all"]').click();assert.equal(await drawer.locator('.admin-billing-notification-row').count(),4);
 await drawer.locator('[data-billing-select="payment:3"]').click();assert.equal(await drawer.locator('[data-billing-action]').count(),0,'Completed payment cannot be confirmed again');
 assert.equal(await drawer.locator('.ed-notification-history a').last().getAttribute('href'),'/partner-sales/?code=SAMPLE');
 await drawer.locator('[data-billing-notification-back]').click();
 await drawer.locator('[data-notification-mark-read]').click();assert.equal(posts.length,0,'Read markers never approve payments');
 await page.reload();await page.locator('[data-billing-notification-toggle]').click();await page.waitForTimeout(500);
 assert.equal(await drawer.locator('.is-new').count(),0,'Read markers survive reload');
 assert.equal(await drawer.locator('.admin-billing-notification-row').count(),4,'Read items remain in history');
 await drawer.locator('[data-billing-select="payment:1"]').click();await drawer.locator('[data-billing-action="confirm_payment"]').click();
 await drawer.locator('.admin-billing-feedback').waitFor();await page.waitForTimeout(1700);
 await drawer.locator('[data-billing-select="payment:1"]').click();assert.equal(await drawer.locator('[data-billing-action]').count(),0);
 await drawer.locator('[data-billing-notification-back]').click();
 await page.keyboard.press('Escape');assert(await drawer.evaluate(e=>e.inert));
 assert.equal(await page.locator('[data-billing-notification-toggle]').evaluate(e=>e===document.activeElement),true);
 events.unshift({...common,id:'stock_order:5',record_id:5,type:'stock_order',status:'awaiting_shipment',action_required:true,items:[],detail_url:'/partner-stock-orders/?order=5&partner=SAMPLE'});
 await page.locator('[data-billing-notification-toggle]').click();await drawer.locator('[data-billing-event-id="stock_order:5"].is-new').waitFor();
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);const mobile=await drawer.boundingBox();assert(mobile.width===390&&mobile.height===844);
 await page.screenshot({path:path.join(__dirname,'../verification/ui/notifications-mobile.png')});
 assert.deepEqual(errors,[]);assert.equal(posts.length,1);
 console.log('PASS: right-side inbox, new/all filters, retained history, browser-persistent read state, new arrivals, safe historical links, original payment confirmation payload, focus return and mobile.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
