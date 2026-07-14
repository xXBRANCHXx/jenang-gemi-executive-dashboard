(function initializeSkuBarcode(globalScope) {
  'use strict';

  const LEFT_ODD = [
    '0001101', '0011001', '0010011', '0111101', '0100011',
    '0110001', '0101111', '0111011', '0110111', '0001011'
  ];
  const LEFT_EVEN = [
    '0100111', '0110011', '0011011', '0100001', '0011101',
    '0111001', '0000101', '0010001', '0001001', '0010111'
  ];
  const RIGHT = [
    '1110010', '1100110', '1101100', '1000010', '1011100',
    '1001110', '1010000', '1000100', '1001000', '1110100'
  ];
  const LEFT_PARITY = [
    'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
    'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'
  ];
  const GUARD_MODULES = new Set([0, 2, 46, 48, 92, 94]);
  const styles = Object.freeze([
    Object.freeze({ id: 'standard', label: 'Standard', ratio: '2:1', height: 234, barTop: 22, fontSize: 28, description: 'Full height for the easiest scanning.' }),
    Object.freeze({ id: 'compact', label: 'Compact', ratio: '3:1', height: 156, barTop: 16, fontSize: 23, description: 'Shorter and balanced for most labels.' }),
    Object.freeze({ id: 'slim', label: 'Slim', ratio: '4:1', height: 117, barTop: 12, fontSize: 18, description: 'Low profile when vertical space is tight.' })
  ]);

  const normalizeSku = (value) => {
    const sku = String(value ?? '').trim();
    if (!/^\d{12}$/.test(sku)) {
      throw new TypeError('EAN-13 barcodes require an exact 12-digit numeric SKU.');
    }
    return sku;
  };

  const checkDigit = (value) => {
    const sku = normalizeSku(value);
    const weightedSum = [...sku].reduce((sum, digit, index) => (
      sum + Number(digit) * (index % 2 === 0 ? 1 : 3)
    ), 0);
    return String((10 - (weightedSum % 10)) % 10);
  };

  const toEan13 = (value) => {
    const sku = normalizeSku(value);
    // Preserve the full SKU protocol as the 12 data digits; EAN-13 adds only its check digit.
    return `${sku}${checkDigit(sku)}`;
  };

  const encodeModules = (value) => {
    const ean13 = toEan13(value);
    const parity = LEFT_PARITY[Number(ean13[0])];
    const left = [...ean13.slice(1, 7)].map((digit, index) => (
      parity[index] === 'L' ? LEFT_ODD[Number(digit)] : LEFT_EVEN[Number(digit)]
    )).join('');
    const right = [...ean13.slice(7)].map((digit) => RIGHT[Number(digit)]).join('');
    return `101${left}01010${right}101`;
  };

  const resolveStyle = (value) => styles.find((style) => style.id === value) || styles[0];

  const buildSvg = (value, options = {}) => {
    const sku = normalizeSku(value);
    const ean13 = toEan13(sku);
    const modules = encodeModules(sku);
    const style = resolveStyle(String(options.style || 'standard'));
    const moduleWidth = Math.max(2, Number(options.moduleWidth) || 4);
    const quietModules = 11;
    const width = (modules.length + quietModules * 2) * moduleWidth;
    const height = Math.max(117, Number(options.height) || style.height);
    const barcodeX = quietModules * moduleWidth;
    const barTop = Math.min(style.barTop, Math.max(10, Math.round(height * 0.1)));
    const fontSize = Math.min(style.fontSize, Math.max(18, Math.round(height * 0.15)));
    const textY = height - Math.max(13, Math.round(height * 0.1));
    const barHeight = Math.max(54, textY - fontSize - barTop - 8);
    const guardHeight = barHeight + Math.min(14, Math.max(8, Math.round(height * 0.06)));
    const bars = [];

    [...modules].forEach((module, index) => {
      if (module !== '1') return;
      bars.push(
        `<rect x="${barcodeX + index * moduleWidth}" y="${barTop}" width="${moduleWidth}" height="${GUARD_MODULES.has(index) ? guardHeight : barHeight}"/>`
      );
    });

    const firstDigitX = barcodeX - moduleWidth * 3;
    const leftDigitsX = barcodeX + moduleWidth * 24;
    const rightDigitsX = barcodeX + moduleWidth * 71;
    const svg = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="EAN-13 barcode ${ean13}">`,
      `<rect width="${width}" height="${height}" fill="#fff"/>`,
      `<g fill="#000" shape-rendering="crispEdges">${bars.join('')}</g>`,
      `<g fill="#000" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" text-anchor="middle">`,
      `<text x="${firstDigitX}" y="${textY}">${ean13[0]}</text>`,
      `<text x="${leftDigitsX}" y="${textY}" letter-spacing="${moduleWidth * 2.45}">${ean13.slice(1, 7)}</text>`,
      `<text x="${rightDigitsX}" y="${textY}" letter-spacing="${moduleWidth * 2.45}">${ean13.slice(7)}</text>`,
      '</g>',
      '</svg>'
    ].join('');

    return { sku, ean13, modules, svg, width, height, style };
  };

  const api = Object.freeze({ styles, normalizeSku, checkDigit, toEan13, encodeModules, buildSvg });
  globalScope.JGSkuBarcode = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
