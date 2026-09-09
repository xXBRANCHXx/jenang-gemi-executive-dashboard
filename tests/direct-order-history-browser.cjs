const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const base='http://127.0.0.1:4180';
const common={status:'FULFILLED',payment_status:'paid',payment_method:'bank',customer:{name:'Sample customer',phone:'08123456789'},item_count:2,merchandise_total:180000,discount_total:20000,shipping_cost:0,created_at:'2026-09-09T01:00:00Z',can_archive:true};
const orders=[{...common,order_id:'WAEXEC-SAMPLE',sales_channel:'whatsapp',source:'dashboard',pay_later:true,payment_status:'unpaid',can_confirm_payment:true},
 {...common,order_id:'WALKIN-SAMPLE',sales_channel:'walk_in',source:'dashboard'},
 {...common,order_id:'WI-COUNTER',sales_channel:'walk_in',source:'counter',customer_total:198000,tax:18000,payment_method:'QRIS',can_archive:false,can_confirm_payment:false}];
let partial=false;
(async()=>{
 const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1600,height:1000}});const errors=[],requests=[],posts=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin!==base)return route.abort();
  if(url.pathname==='/api/whatsapp-orders/'){
   const action=url.searchParams.get('action');requests.push(url.searchParams);
   if(action==='history'){
    assert.equal(url.searchParams.get('include_walk_ins'),'1');
    const channel=url.searchParams.get('channel')||'all';
    const filtered=orders.filter(o=>channel==='all'||o.sales_channel===channel);
    return route.fulfill({json:{ok:true,orders:filtered,summary:{orders:filtered.length,item_count:filtered.length*2,customer_total:filtered.reduce((sum,o)=>sum+(o.customer_total||o.merchandise_total),0),discount_total:filtered.length*20000},pagination:{page:1,per_page:50,total:filtered.length,total_pages:1},warnings:partial?['Counter sales unavailable. Totals only include dashboard orders.']:[]}});
   }
   if(action==='walk_in_invoice'){
    assert.equal(url.searchParams.get('invoice'),'WI-COUNTER');
    return route.fulfill({json:{ok:true,invoice:{...orders[2],items:[{sku:'COFFEE',product_name:'Coffee <sample>',quantity:2,unit_price:100000,discount_total:20000,line_total:180000}]}}});
   }
   if(req.method()==='POST'){posts.push(req.postDataJSON());return route.fulfill({json:{ok:true,order:{...orders[0],payment_status:'paid',can_confirm_payment:false}}});}
  }
  return route.continue();
 });
 await page.goto(base+'/whatsapp-order-history/');
 await page.waitForFunction(()=>document.querySelector('[data-history-status]').textContent==='3 orders found');
 assert.equal(await page.locator('h1').textContent(),'Direct order history');
 const counter=page.locator('[data-counter-invoice]');
 assert.match(await counter.textContent(),/Walk-in · Counter/);
 assert.equal(await counter.locator('[data-history-archive],.whatsapp-history-archived-mark,[data-history-confirm-payment]').count(),0);
 assert.match(await counter.locator('td').nth(6).textContent(),/198\.000/,'Paid total includes tax');
 for(const theme of ['dark','light']){
  await page.evaluate(t=>document.documentElement.dataset.adminTheme=t,theme);
  await page.screenshot({path:path.join(__dirname,`../verification/ui/direct-history-${theme}.png`)});
 }
 await counter.locator('a').click();
 const dialog=page.locator('[data-history-invoice-dialog]');
 await dialog.getByText('Coffee <sample>',{exact:true}).waitFor();
 assert.equal(await dialog.locator('sample').count(),0,'Product names escaped');
 assert.match(await dialog.textContent(),/QRIS/);
 await page.screenshot({path:path.join(__dirname,'../verification/ui/direct-history-receipt.png')});
 await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),false);
 await counter.focus();await page.keyboard.press('Enter');await dialog.waitFor();await page.keyboard.press('Escape');
 await page.locator('[data-history-channel-filter]').selectOption('walk_in');
 await page.waitForFunction(()=>document.querySelector('[data-history-status]').textContent==='2 orders found');
 assert.equal(new URL(page.url()).searchParams.get('channel'),'walk_in');
 await page.reload();await page.waitForFunction(()=>document.querySelector('[data-history-status]').textContent==='2 orders found');
 assert.equal(await page.locator('[data-history-channel-filter]').inputValue(),'walk_in');
 await page.locator('[data-history-channel-filter]').selectOption('whatsapp');
 await page.waitForFunction(()=>document.querySelector('[data-history-status]').textContent==='1 order found');
 await page.locator('[data-history-confirm-payment]').click();
 assert(await page.locator('[data-history-payment-dialog]').isVisible());await page.locator('[data-history-payment-confirm]').click();
 await page.waitForFunction(()=>!document.querySelector('[data-history-payment-dialog]').open);
 assert.deepEqual(posts,[{order_id:'WAEXEC-SAMPLE',payment_method:'bank'}]);
 await page.locator('[data-history-archive]').focus();await page.keyboard.press('Enter');
 assert(await page.locator('[data-history-archive-dialog]').isVisible(),'Keyboard opens archive dialog instead of navigating');await page.keyboard.press('Escape');
 partial=true;await page.locator('[data-history-channel-filter]').selectOption('all');
 await page.waitForFunction(()=>document.querySelector('[data-history-status]').textContent.includes('Partial results'));
 assert(await page.locator('[data-history-error]').isVisible());
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile ledger does not overflow the page');
 await page.screenshot({path:path.join(__dirname,'../verification/ui/direct-history-mobile.png')});
 assert.deepEqual(errors,[]);
 console.log('PASS: combined history labels, exact counter totals, receipt dialog and escaping, persisted channel filter, original payment/archive controls, source warning, light/dark/mobile.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
