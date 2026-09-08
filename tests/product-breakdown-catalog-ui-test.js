const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'product-breakdowns', 'index.php'), 'utf8');
const script = fs.readFileSync(path.join(root, 'product-breakdowns', 'product-breakdowns.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'product-breakdowns', 'product-breakdowns.css'), 'utf8');
const nav = fs.readFileSync(path.join(root, 'admin-nav.php'), 'utf8');
const adminStyles = fs.readFileSync(path.join(root, 'admin.css'), 'utf8');
const lightFavicon = fs.readFileSync(path.join(root, 'assets', 'admin-icons', 'favicon-product-breakdowns-light.svg'), 'utf8');
const darkFavicon = fs.readFileSync(path.join(root, 'assets', 'admin-icons', 'favicon-product-breakdowns-dark.svg'), 'utf8');
const api = fs.readFileSync(path.join(root, 'api', 'orders', 'index.php'), 'utf8');

const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

expect(page.includes("render_admin_sidebar('product-breakdowns')"), 'The product catalog must render as an active sidebar destination.');
expect(page.includes('../admin.css?v=') && page.includes("@filemtime(dirname(__DIR__) . '/admin.css')"), 'The page must cache-bust shared sidebar styles after every deployment.');
const navMap = JSON.parse(fs.readFileSync(path.join(root, 'navigation-map.json'), 'utf8'));
expect(navMap.pages.some(page => page.href === '/product-breakdowns/' && page.area === 'products' && !page.parent), 'Product Breakdowns must be a direct Products sidebar destination.');
expect(navMap.pages.some(page => page.href === '/dashboard/product-analytics/' && page.parent === 'breakdowns'), 'Product analytics must retain its parent catalog context.');
expect(fs.readFileSync(path.join(root, 'navigation.php'), 'utf8').includes('ed_navigation_icon'), 'The shared area rail must use the licensed icon set.');
expect(nav.includes('favicon-product-breakdowns-light.svg') && nav.includes('favicon-product-breakdowns-dark.svg'), 'The page must have a matching adaptive favicon.');
expect(lightFavicon.includes('M28 16c.7') && darkFavicon.includes('M28 16c.7'), 'Both adaptive favicons must retain the product-breakdown pie chart.');
expect(page.includes('Search product, flavor, size, brand, tag, or SKU'), 'The page must advertise catalog-wide search.');
expect(styles.includes('width: min(100%, 720px)') && styles.includes('min-height: 48px'), 'The desktop search control must be genuinely compact while remaining fluid on narrow screens.');
expect(!page.includes('data-catalog-summary'), 'The page must not waste primary space on catalog counter cards.');
['product', 'flavor', 'volume', 'variant'].forEach((type) => {
  expect(script.includes(`type: '${type}'`), `The search index must include ${type} results.`);
});
expect(script.includes("dimension: 'product'") || script.includes("analyticsUrl(product.key, 'product')"), 'Product results must open full product analytics.');
expect(script.includes("analyticsUrl(product.key, 'flavor'") && script.includes("analyticsUrl(product.key, 'volume'") && script.includes("analyticsUrl(product.key, 'sku'"), 'Flavor, size, and exact results must open the appropriate sales analytics.');
expect(api.includes("['product_breakdown_catalog', 'breakdown_catalog']") && api.includes('jg_orders_product_breakdown_catalog_payload'), 'The Orders API must expose the searchable SKU catalog.');
expect(api.includes("INNER JOIN sku_units") && api.includes("'volume_key' => $volumeKey"), 'The catalog must source real SKU sizes and canonical analytics keys.');
expect(!styles.includes('linear-gradient') && !styles.includes('radial-gradient'), 'The new workspace must not use gradients.');
expect(styles.includes('.product-catalog-result-icon') && styles.includes('background: transparent'), 'Catalog icons must remain unboxed and use transparent controls.');
expect(!page.includes('<p>'), 'The new workspace must avoid body-copy paragraphs.');
expect(styles.includes('@media (max-width: 620px)'), 'The catalog must adapt to mobile screens.');

console.log('product-breakdown-catalog-ui-test: ok');
