const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const project = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(project, file), 'utf8');
const validPrice = price => Boolean(price) && Number(price.actualPrice) > 0 && Number(price.discountedPrice) > 0;

function compile(source, fileName = 'fixture.ts') {
    const output = ts.transpileModule(source, {
        fileName,
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
        reportDiagnostics: true,
    });
    assert.deepEqual(output.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).map(e => e.messageText), []);
    return output.outputText;
}

function loadAvailability() {
    const exports = {};
    vm.runInNewContext(compile(read('src/lib/savedProductAvailability.ts')), {
        exports,
        require(name) {
            assert.equal(name, '@/lib/productPricing');
            return { hasValidSellPrice: validPrice };
        },
    });
    return exports;
}

const { getSavedProductAvailability, savedProductStatusLabel } = loadAvailability();

test('in-stock, valid-price saved product is available to move to cart', () => {
    assert.equal(getSavedProductAvailability({
        isAvailableForSale: true,
        sellStockQuantity: 5,
        price: { actualPrice: 450, discountedPrice: 380 },
    }), 'available');
});

test('missing price is labelled correctly, never out of stock when stock exists', () => {
    const status = getSavedProductAvailability({
        isAvailableForSale: true, sellStockQuantity: 5, price: null,
    });
    assert.equal(status, 'price_unavailable');
    assert.match(savedProductStatusLabel(status), /Price unavailable/);
    assert.doesNotMatch(savedProductStatusLabel(status), /Out of stock/);
});

test('zero inventory, disabled sale and unknown stock are not purchasable', () => {
    const price = { actualPrice: 450, discountedPrice: 380 };
    assert.equal(getSavedProductAvailability({ sellStockQuantity: 0, price }), 'out_of_stock');
    assert.equal(getSavedProductAvailability({ sellStockQuantity: 5, price, isAvailableForSale: false }), 'not_for_sale');
    assert.equal(getSavedProductAvailability({ sellStockQuantity: null, price }), 'stock_unknown');
});

test('saved API response reads real SELL price without inventing stock', async () => {
    const source = read('src/components/ClientCart.tsx');
    const helper = source.slice(source.indexOf('function safeNumber('), source.indexOf('function formatCurrency('));
    const errorClass = source.slice(source.indexOf('class ApiError'), source.indexOf('function extractErrorMessage('));
    const getSaved = source.slice(source.indexOf('async function apiGetSaved('), source.indexOf('async function apiAddSaved('));
    const exports = {};
    const ctx = {
        exports,
        api: { get: async () => ({ data: { savedData: [
            { savedId: 'saved123', product: { _id: 'product123', productName: 'Sunflower', sellStockQuantity: 5,
                isAvailableForSale: true, price: { actualPrice: 450, discountedPrice: 380 } } },
        ] } }) },
    };
    vm.runInNewContext(compile(helper + errorClass + getSaved + '\nexports.get = apiGetSaved;'), ctx);
    const items = await exports.get('customer123');
    assert.equal(items.length, 1);
    assert.equal(items[0].sellStockQuantity, 5);
    assert.equal(items[0].price.discountedPrice, 380);
    assert.equal(items[0].price.actualPrice, 450);
    assert.equal(getSavedProductAvailability(items[0]), 'available');
});

test('legacy API without price refreshes saved items via sell-product list', async () => {
    const source = read('src/components/ClientCart.tsx');
    const helper = source.slice(source.indexOf('function safeNumber('), source.indexOf('function formatCurrency('));
    const fetch = source.slice(source.indexOf('    async function fetchSavedItems()'), source.indexOf('    async function loadGuestCart()'));
    const exports = {};
    const results = { items: null, loading: [] };
    const api = {
        get: async url => {
            assert.equal(url, '/product/sell');
            return { data: { productData: [{ _id: 'product123', sellStockQuantity: 5, isAvailableForSale: true,
                latestSalePrice: { actualPrice: 450, discountedPrice: 380 } }] } };
        },
    };
    vm.runInNewContext(compile(helper + fetch + '\nexports.fetch = fetchSavedItems;'), {
        exports, api,
        getStoredCustomerId: () => 'customer123',
        apiGetSaved: async () => [{ id: 'product123', productId: 'product123', title: 'Sunflower',
            sellStockQuantity: 5, isAvailableForSale: true, price: null }],
        hasValidSellPrice: validPrice,
        setSavedLoading: v => results.loading.push(v),
        setSavedItems: items => { results.items = items; },
        setError: e => { throw Error(e); },
        console,
        Promise,
    });
    await exports.fetch();
    assert.equal(results.items[0].price.discountedPrice, 380);
    assert.equal(getSavedProductAvailability(results.items[0]), 'available');
    assert.deepEqual(results.loading, [true, false]);
});

test('saved cart JSX uses availability status for badge and move button', () => {
    const source = read('src/components/ClientCart.tsx');
    const parsed = ts.createSourceFile('ClientCart.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    assert.equal(parsed.parseDiagnostics.length, 0);
    assert.match(source, /savedProductStatusLabel\(status\)/);
    assert.match(source, /disabled=\{saving \|\| unavailable\}/);
    assert.doesNotMatch(source, /setSavedStockOverrides/);
});
