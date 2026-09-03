const fs = require('fs');
const path = require('path');

const script = fs.readFileSync(path.join(__dirname, '..', 'profit-loss', 'accounting.js'), 'utf8');

const expect = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
};

expect(
  script.includes("shown: ['transaction_date', 'account_id', 'to_account_id', 'transfer_fee_amount', 'category_id']"),
  'Transfer mode must display the Category field.'
);
expect(
  script.includes("String(category.account_code || '').trim() === '11102'"),
  'Transfer mode must identify its only category by account code 11102.'
);
expect(
  script.includes("String(category.category_key || '').trim() === 'operating-cash'"),
  'Transfer mode must fall back to the stable Operating Cash system key.'
);
expect(
  script.includes('internalTransferCategories = () => state.categories.filter'),
  'The internal-transfer category must remain available even when it is not an expense/bill category.'
);
expect(
  script.includes("return category ? [category] : []"),
  'The transfer Category dropdown must contain only the internal-transfer category.'
);
expect(
  script.includes("refs.categoryValue.value = String(internalTransferCategory()?.id || '')"),
  'The internal-transfer category must be selected automatically.'
);
expect(
  script.includes("category_id: String(data.get('category_id') || '')"),
  'The visible selected transfer category must be included in the request.'
);

console.log('accounting-internal-transfer-category-ui-test: ok');
