const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeShopName, shopSlugBase } = require('./slug');

test('normalizeShopName strips dash separators and normalizes spaces', () => {
  assert.equal(normalizeShopName('  Mohan - Fashion - Hub  '), 'Mohan Fashion Hub');
  assert.equal(normalizeShopName('Mohan_Fashion_Hub'), 'Mohan Fashion Hub');
  assert.equal(normalizeShopName('Mohan–Fashion—Hub'), 'Mohan Fashion Hub');
});

test('shopSlugBase keeps store slugs dash-free', () => {
  assert.equal(shopSlugBase('Mohan Fashion Hub'), 'mohanfashionhub');
  assert.equal(shopSlugBase('Mohan-Fashion-Hub'), 'mohanfashionhub');
  assert.equal(shopSlugBase('mohan_fashion_hub'), 'mohanfashionhub');
});
