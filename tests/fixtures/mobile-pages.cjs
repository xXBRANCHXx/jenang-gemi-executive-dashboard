// Loopback-only PHP page renderer. API fixtures and sessions never reach production.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const php = process.env.PHP_BINARY || 'php';
const map = require('../../navigation-map.json');
const examples = {analytics:'?product=syrup&scope=month&compare=drops-4x', flavors:'?product=syrup', 'partner-stock':'?partner=SAMPLE', 'partner-sales':'?code=SAMPLE', 'partner-detail':'?code=SAMPLE', 'affiliate-detail':'?code=SAMPLE', order:'?order_id=SAMPLE', 'direct-detail':'?order=SAMPLE'};
const routes = [...map.pages.map(page => ({...page, href:page.href + (examples[page.id] || '')})),
  {id:'launcher', href:'/'}, {id:'dashboard-login', href:'/dashboard/?fixture_logged_out=1'}, {id:'sku-login', href:'/sku-db/?fixture_logged_out=1'}];
const accounts = ['jenang-gemi-shopee','zero-shopee','jenang-gemi-tiktok','zero-tiktok'].map((account, i) => ({account, account_key:account, platform:i < 2 ? 'shopee' : 'tiktok', label:account.replaceAll('-', ' ')}));
const products = ['syrup','drops-4x'].map(key => ({key, label:key === 'syrup' ? 'Syrup' : 'Drops 4x', flavors:[{key:'vanilla',label:'Vanilla'}], volumes:[{key:'60-ml',label:'60 ML'}], variants:[{flavor_key:'vanilla',volume_key:'60-ml'}]}));
const orders = [1,2,3].map(i => ({order_id:`SAMPLE-ORDER-WITH-LONG-REFERENCE-${i}`, order_create_time:'2026-09-09 03:00:00', timestamp:'2026-09-09 03:00:00', platform:'shopee', account_key:'jenang-gemi-shopee', sku:'010100150101', product_name:'Vanilla syrup with a long product label', quantity:i, net_revenue:23000000 * i, cogs:12000*i, status:'COMPLETED', order_status:'COMPLETED', payment_status:'paid', funds_released:true, company:'Jenang Gemi', flavor_name:'Vanilla'}));
const database = {meta:{version:'1.00.01'}, brands:[{id:'01',code:'01',name:'Jenang Gemi',flavors:[{id:'01',code:'01',name:'Vanilla'}],products:[{id:'01',code:'01',name:'Syrup'}]}],units:[{id:'01',code:'01',name:'ml'}],skus:[1,2,3].map(i => ({sku:`01010015010${i}`,tag:`SYRUP_VANILLA_${i}`,brand_id:'01',brand_name:'Jenang Gemi',product_id:'01',product_name:'Syrup',flavor_id:'01',flavor_name:'Vanilla',unit_id:'01',unit_name:'ml',volume:'60',astra:15,current_stock:100*i,stock_trigger:50,cogs:12000,sale_price:20000,shipping_profile_complete:true,unit_weight_grams:250,has_package_dimensions:true,package_length_cm:20,package_width_cm:10,package_height_cm:5}))};
const summary = {liquid_assets:{total:93000000,available_now:62840000,expected_total:30160000,scheduled_outflow:12500000,projected_after_bills:80500000,segments:{bank:52000000,cash:10840000,wallet_ready:4000000,marketplace_outstanding:21650000,direct_order_unpaid:1510000,partner_unpaid:3000000},outflow_segments:{purchase_orders:8000000,due_soon:4500000}},wallet_breakdown:[]};

function response(url) {
  const action = url.searchParams.get('action');
  if (url.pathname === '/api/sku-db/') return {ok:true,database,requests:[],mapping_requests:[]};
  if (url.pathname === '/api/whatsapp-orders/' && action === 'catalog') return {ok:true,skus:database.skus.map(sku=>({...sku,base_product_name:sku.product_name,product_name:`${sku.product_name} ${sku.flavor_name} 60 ml`}))};
  if (action === 'product_breakdown_catalog') return {ok:true,products};
  if (action === 'product_analytics') {
    const product = products.find(p => p.key === url.searchParams.get('product')) || products[0];
    const grain = url.searchParams.get('grain') || 'month';
    const history = Array.from({length:6}, (_, i) => ({key:`2026-09-${String(i+1).padStart(2,'0')}`,label:`Sep ${i+1}, 2026`,start_date:`2026-09-${String(i+1).padStart(2,'0')}`,quantity:product.key === 'syrup' ? 100+i : 45+i,revenue:(product.key === 'syrup' ? 2300000 : 4800000)+i*65000}));
    return {ok:true,grain,start_date:url.searchParams.get('start_date'),end_date:url.searchParams.get('end_date'),selection:{product:product.key,title:product.label,dimension:'product',product_label:product.label},totals:{quantity:history.reduce((s,r)=>s+r.quantity,0),revenue:history.reduce((s,r)=>s+r.revenue,0)},history,forecast:[],breakdowns:{flavors:[{key:'vanilla',label:'Vanilla',quantity:400,revenue:8000000}],volumes:[],accounts:[]}};
  }
  if (action === 'daily_summary') {
    const month = url.searchParams.get('month') || '2026-09';
    return {month,accounts,days:Array.from({length:28},(_,i)=>({date:`${month}-${String(i+1).padStart(2,'0')}`,accounts:accounts.map((account,j)=>({...account,qty:250+i+j,orders:150+i+j,revenue:(250+i+j)*75000}))}))};
  }
  if (url.pathname === '/api/orders/' && action === 'status') return {ok:true,mirror:{oldest_order_at:'2026-01-01',newest_order_at:'2026-09-25'}};
  if (url.pathname === '/api/orders/' && action !== 'product_flavor_breakdown') return {ok:true,orders,has_more:false};
  if (url.pathname === '/api/wallet/') return {wallets:accounts.map(account=>({...account,wallet_balance:52000000,wallet_balance_known:true,outstanding_total:8100000,released_month_total:9400000,outstanding_orders:140})),totals:{known_balance_count:4,wallet_balance:208000000,outstanding_total:32400000,released_month_total:37600000,outstanding_orders:560}};
  if (url.pathname === '/api/store-ops/') return {ok:true,filters:{date_from:'2026-09-09',date_to:'2026-09-09'},metrics:{fulfilled_today:48,active_claims:6,average_fulfillment_label:'4m 12s',scan_errors:2,employee_throughput:[{employee_name:'Sample employee',fulfilled_count:48}]},employees:[{id:'a',display_name:'Sample employee',active:true}],orders:[{order_id:'SAMPLE-LONG-FULFILLMENT-REFERENCE',source_platform:'shopee',source_account:'shop',status:'FULFILLED',employee_name:'Sample employee',fulfilled_at:'2026-09-09 03:05:00',duration_label:'5m'}],events:[]};
  if (url.pathname === '/api/partner-billing/') return {ok:true,notifications:[{id:'payment:1',record_id:1,type:'payment',status:'confirmed',action_required:false,partner_code:'SAMPLE',partner_name:'Sample partner with a long business name',period_type:'calendar_month',period_label:'August 1–31, 2026',amount:45000000,created_at:'2026-09-09 01:00:00',updated_at:'2026-09-09 01:00:00',detail_url:'/partner-sales/?code=SAMPLE'}]};
  return {ok:true,orders:[],products:[],periods:[],volumes:[],history:[],accounts:[],categories:[],posts:[],data:{...summary,accounts:[],categories:[],counterparties:[],bills:[],transactions:[],entries:[],items:[],review:[],cash_flow:null},unpaid:{count:0},events:[]};
}

async function startServer() {
  const server = http.createServer((req,res) => {
    try {
      const url = new URL(req.url,'http://127.0.0.1');
      if (url.pathname.startsWith('/api/')) {
        res.setHeader('Content-Type','application/json');
        if (req.method !== 'GET') {res.writeHead(405);return res.end(JSON.stringify({ok:false,error:'Writes are disabled in the mobile layout fixture.'}));}
        return res.end(JSON.stringify(response(url)));
      }
      if (url.pathname === '/sku-db/new/') {res.writeHead(302,{Location:'/sku-db/'});return res.end();}
      const file = path.resolve(root,'.'+url.pathname, url.pathname.endsWith('/') ? 'index.php' : '');
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404);return res.end();}
      if (url.pathname.endsWith('/')) {
        const code = '$_SERVER["REQUEST_URI"]=$argv[1]; $_SERVER["REQUEST_METHOD"]="GET"; parse_str(parse_url($argv[1],PHP_URL_QUERY) ?? "", $_GET); session_start(); if (!isset($_GET["fixture_logged_out"])) {$_SESSION["jg_admin_authenticated"]=true; $_SESSION["jg_sku_authenticated"]=true; $_SESSION["jg_sku_username"]="Local test"; $_SESSION["jg_sku_role"]="requester";} include $argv[2];';
        const html = execFileSync(php,['-d','display_errors=0','-r',code,req.url,file],{maxBuffer:8e6,timeout:10000,stdio:['pipe','pipe','pipe']});
        res.setHeader('Content-Type','text/html');return res.end(html);
      }
      const mime = {'.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.avif':'image/avif','.ico':'image/x-icon','.woff2':'font/woff2'}[path.extname(file)];
      if (!mime) {res.writeHead(404);return res.end();}
      res.setHeader('Content-Type',mime);res.end(fs.readFileSync(file));
    } catch(error) {res.writeHead(500).end('Local fixture failed');console.error(error.message);}
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  return {server,base:`http://127.0.0.1:${server.address().port}`};
}
module.exports = {startServer,routes};
