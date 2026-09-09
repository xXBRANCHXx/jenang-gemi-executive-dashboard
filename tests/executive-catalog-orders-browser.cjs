const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const base='http://127.0.0.1:4180';
const database={meta:{version:'1.00.01'},brands:[{id:'01',code:'01',name:'Jenang Gemi',flavors:[{id:'01',code:'01',name:'Original'},{id:'02',code:'02',name:'Pandan'}],products:[{id:'01',code:'01',name:'Bubur'}]}],units:[{id:'01',code:'01',name:'sachet'}],skus:[1,2,3].map((i)=>({sku:`01010015010${i}`,tag:`BUBUR_${i===2?'PANDAN':'ORIGINAL'}_${i}`,brand_id:'01',brand_name:'Jenang Gemi',product_id:'01',product_name:'Bubur',flavor_id:i===2?'02':'01',flavor_name:i===2?'Pandan':'Original',unit_id:'01',unit_name:'sachet',volume:'15',astra:15,current_stock:100*i,stock_trigger:50,cogs:12000,sale_price:20000,shipping_profile_complete:true,unit_weight_grams:250,has_package_dimensions:true,package_length_cm:20,package_width_cm:10,package_height_cm:5}))};
const orders=[1,2,3].map(i=>({order_id:`SAMPLE-${i}`,order_create_time:'2026-09-09 03:00:00',timestamp:'2026-09-09 03:00:00',platform:i===2?'whatsapp':'shopee',account_key:i===2?'direct':'jenang-gemi-shopee',sku:'010100150101',product_name:'Bubur Original',quantity:i,net_revenue:20000*i,cogs:12000*i,status:i===3?'CANCELLED':'COMPLETED',order_status:i===3?'CANCELLED':'COMPLETED',payment_status:i===2?'unpaid':'paid',funds_released:i!==2,company:'Jenang Gemi',flavor_name:'Original'}));
(async()=>{
 const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1050}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let opsCount=1,opsError=false,opsReads=0;
 await page.addInitScript(()=>{const interval=window.setInterval.bind(window);window.setInterval=(fn,ms,...args)=>interval(fn,ms===30000?250:ms,...args);});
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==base)return r.abort();
  if(u.pathname==='/api/sku-db/')return r.fulfill({json:{ok:true,database,requests:[],mapping_requests:[]}});
  if(u.pathname==='/api/orders/')return r.fulfill({json:{ok:true,orders,has_more:false}});
  if(u.pathname==='/api/store-ops/'){
   opsReads++;
   if(opsError)return r.fulfill({status:503,json:{ok:false,error:'Store operations could not be loaded. Please retry.'}});
   return r.fulfill({json:{ok:true,filters:{date_from:'2026-09-09',date_to:'2026-09-09'},metrics:{fulfilled_today:opsCount,active_claims:1,average_fulfillment_label:'5m',scan_errors:0,employee_throughput:[{employee_name:'Ayu',fulfilled_count:opsCount}]},employees:[{id:'a',display_name:'Ayu',active:true}],orders:[{order_id:'SPX-REAL-SHAPE',source_platform:'shopee',source_account:'shop',status:'FULFILLED',employee_name:'Ayu',fulfilled_at:'2026-09-09 03:05:00',duration_label:'5m'}],events:[]}});
  }
  return r.continue();
 });
 await page.goto(base+'/sku-db/');await page.locator('[data-copy-sku]').first().waitFor();assert.equal(await page.locator('[data-copy-sku]').count(),3);
 await page.locator('[data-sku-search]').fill('PANDAN');assert.equal(await page.locator('[data-copy-sku]').count(),1);await page.locator('[data-sku-search]').fill('');
 await page.locator('[data-filter-brand]').selectOption('01');await page.locator('[data-filter-flavor]').selectOption('02');assert.equal(await page.locator('[data-copy-sku]').count(),1);await page.locator('[data-filter-flavor]').selectOption('');
 await page.locator('.admin-sku-composer summary').click();assert(await page.locator('[data-setup-form]').isVisible());assert(await page.locator('[data-setup-form] [name="tag"]').isVisible());await page.locator('.admin-sku-composer summary').click();
 assert(await page.locator('[data-change-skip-scan]').first().isDisabled(),'Requester privilege unchanged');
 const pdf=page.waitForEvent('download');await page.locator('[data-download-approved-live-pdf]').click();assert.match((await pdf).suggestedFilename(),/\.pdf$/);await page.locator('.admin-sku-copy-message').waitFor({state:'hidden'});
 for(const theme of ['dark','light']){await page.evaluate(t=>document.documentElement.dataset.adminTheme=t,theme);await page.waitForTimeout(800);await page.screenshot({path:path.join(__dirname,`../verification/ui/catalog-${theme}.png`)});}
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Catalog mobile width');await page.screenshot({path:path.join(__dirname,'../verification/ui/catalog-mobile.png')});
 await page.setViewportSize({width:1440,height:1050});await page.goto(base+'/dashboard/?view=orders');await page.locator('[data-order-detail-url]').first().waitFor();
 assert.equal(await page.locator('[data-order-detail-url]').count(),3);assert(await page.locator('[data-confirm-order-payment="SAMPLE-2"]').count()===1,'Unpaid direct order action retained');
 await page.locator('[data-orders-cancellation-quick] [data-toggle-order-cancellation="canceled"]').click();await page.waitForFunction(()=>document.querySelectorAll('[data-order-detail-url]').length===1);
 assert.match(await page.locator('[data-order-detail-url]').getAttribute('data-order-detail-url'),/SAMPLE-3/);
 await page.locator('[data-orders-cancellation-quick] [data-toggle-order-cancellation="canceled"]').click();
 await page.locator('[data-orders-filter-open]').click();await page.locator('[data-orders-filter-modal]').waitFor({state:'visible'});assert(await page.locator('.admin-orders-filter-card').evaluate(e=>e.scrollWidth<=e.clientWidth),'Filter dialog fits its container');
 await page.locator('[data-orders-quick-range="month"]').click();await page.locator('[data-orders-filter-close][aria-label="Close order filters"]').last().click();
 const csv=page.waitForEvent('download');await page.locator('[data-orders-export]').click();assert.match((await csv).suggestedFilename(),/\.csv$/);
 for(const theme of ['dark','light']){await page.evaluate(t=>document.documentElement.dataset.adminTheme=t,theme);await page.waitForTimeout(800);await page.screenshot({path:path.join(__dirname,`../verification/ui/all-orders-${theme}.png`)});}
 await page.locator('[data-orders-filter-open]').click();await page.screenshot({path:path.join(__dirname,'../verification/ui/all-orders-filters.png')});await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Orders mobile width');await page.screenshot({path:path.join(__dirname,'../verification/ui/all-orders-mobile.png')});
 await page.setViewportSize({width:1440,height:1050});await page.goto(base+'/dashboard/?view=store-ops');await page.waitForFunction(()=>document.querySelector('[data-store-ops-metric="fulfilled_today"]').textContent==='1');
 opsCount=2;await page.waitForFunction(()=>document.querySelector('[data-store-ops-metric="fulfilled_today"]').textContent==='2');assert(opsReads>=2,'Automatic refresh reads new activity');
 opsError=true;await page.waitForFunction(()=>document.querySelector('[data-store-ops-status]').textContent.includes('Update failed'));assert.equal(await page.locator('[data-store-ops-metric="fulfilled_today"]').textContent(),'2','Stale records retained and identified');
 await page.locator('[data-store-ops-filters] button[type="submit"]').click();await page.waitForFunction(()=>document.querySelector('[data-store-ops-metric="fulfilled_today"]').textContent==='—');assert.match(await page.locator('[data-store-ops-table-body]').textContent(),/could not be loaded/);
 opsError=false;await page.locator('[data-store-ops-refresh]').click();await page.waitForFunction(()=>document.querySelector('[data-store-ops-status]').textContent==='Live');assert.equal(await page.locator('[data-store-ops-metric="fulfilled_today"]').textContent(),'2');
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: SKU search/filter/builder/export and roles; All Orders cancellation/date/export/payment controls; both themes/mobile; real-controller Ops polling, failed refresh, unavailable state and recovery.');
})().catch(e=>{console.error(e);process.exit(1)});
