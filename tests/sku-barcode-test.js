'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const barcode = require('../sku-barcode.js');

test('calculates the GS1 modulo-10 EAN-13 check digit', () => {
  assert.equal(barcode.toEan13('400638133393'), '4006381333931');
  assert.equal(barcode.toEan13('590123412345'), '5901234123457');
});

test('preserves all 12 SKU digits as the EAN-13 data payload', () => {
  ['010101502001', '120100015299', '990999990101'].forEach((sku) => {
    const ean13 = barcode.toEan13(sku);
    assert.equal(ean13.length, 13);
    assert.equal(ean13.slice(0, 12), sku);
  });
});

test('round-trips full EAN-13 and leading-zero UPC-A scanner outputs', () => {
  const sku = '012345678901';
  const ean13 = barcode.toEan13(sku);
  const fullEanScannerSku = ean13.slice(0, -1);
  const upcScannerOutput = ean13.slice(1);
  const upcScannerSku = `0${upcScannerOutput.slice(0, -1)}`;

  assert.equal(fullEanScannerSku, sku);
  assert.equal(upcScannerSku, sku);
});

test('encodes a complete 95-module EAN-13 symbol with guards', () => {
  const modules = barcode.encodeModules('400638133393');
  assert.equal(modules.length, 95);
  assert.equal(modules.slice(0, 3), '101');
  assert.equal(modules.slice(45, 50), '01010');
  assert.equal(modules.slice(-3), '101');
});

test('builds a self-contained SVG labeled with the full EAN-13 value', () => {
  const output = barcode.buildSvg('400638133393');
  assert.match(output.svg, /^<\?xml version="1\.0"/);
  assert.match(output.svg, /aria-label="EAN-13 barcode 4006381333931"/);
  assert.match(output.svg, />4<\/text>/);
  assert.match(output.svg, />006381<\/text>/);
  assert.match(output.svg, />333931<\/text>/);
});

test('rejects values that cannot preserve an exact 12-digit SKU', () => {
  ['123', 'ABCDEFGHIJKL', '1234567890123', ' 12345678901 '].forEach((value) => {
    assert.throws(() => barcode.toEan13(value), /exact 12-digit numeric SKU/);
  });
});
