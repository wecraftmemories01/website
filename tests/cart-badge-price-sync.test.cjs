const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const base = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(base, file), 'utf8');

function loadCount({ token, cartData, guestItems, cachedCount = 1 }) {
    const storage = new Map([['cartCount', String(cachedCount)]]);
    if (guestItems !== undefined) storage.set('wcm_guest_cart_v1', JSON.stringify(guestItems));
    const localStorage = {
        getItem: key => storage.get(key) ?? null,
        setItem: (key, val) => storage.set(key, String(val)),
    };
    const src = read('src/lib/cartCount.ts');
    const compiled = ts.transpileModule(src, {
        fileName: 'cartCount.ts',
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
        reportDiagnostics: true,
    });
    assert.equal(compiled.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
    const exported = {};
    const sandbox = {
        exports: exported,
        localStorage,
        window: {},
        console,
        require: name => {
            if (name === '@/services/api') return { default: { get: async () => ({ data: { cartData } }) } };
            if (name === '@/lib/auth') return { getStoredAccessToken: () => token };
            if (name === '@/lib/productPricing') return {
                hasValidSellPrice: p => !!p && Number(p.actualPrice) > 0 && Number(p.discountedPrice) > 0,
            };
            throw Error('Unexpected import ' + name);
        },
    };
    vm.runInNewContext(compiled.outputText, sandbox);
    return { fetchCount: exported.fetchCartCountUtil, storage };
}

test('guest cart count updates to zero when an invalid entry has been removed', async () => {
    const { fetchCount, storage } = loadCount({ token: null, guestItems: [], cachedCount: 1 });
    assert.equal(await fetchCount(), 0);
    assert.equal(storage.get('cartCount'), '0');
});

test('authenticated header ignores an unpriced product even if the API totalItems includes it', async () => {
    const { fetchCount, storage } = loadCount({
        token: 'token',
        cartData: [{
            totalItems: 4,
            sellItems: [
                { quantity: 1, inUse: true, product: { price: null } },
                { quantity: 2, inUse: true, product: { price: { actualPrice: 120, discountedPrice: 100 } } },
                { quantity: 1, inUse: false, product: { price: { actualPrice: 99, discountedPrice: 99 } } },
            ],
            sellHamperItems: [{ quantity: 1 }],
        }],
    });
    assert.equal(await fetchCount(), 3);
    assert.equal(storage.get('cartCount'), '3');
});

test('cart cleanup writes to storage before notifying the header in the same tab', () => {
    const src = read('src/components/ClientCart.tsx');
    const cleanup = src.slice(src.indexOf('const removedCount = items.length - cleanedItems.length'), src.indexOf('setLocalCart({', src.indexOf('const removedCount = items.length - cleanedItems.length')));
    assert.match(cleanup, /localStorage\.setItem\(\s*"wcm_guest_cart_v1"/);
    assert.match(cleanup, /localStorage\.setItem\("cartCount", String\(remainingQty\)\)/);
    assert.match(cleanup, /notifyOwnCartChange\(\)/);
    assert.ok(cleanup.indexOf('localStorage.setItem("cartCount"') < cleanup.indexOf('notifyOwnCartChange()'));
    assert.match(src, /guestCartNotice/);
    assert.match(read('src/components/layout/Header.tsx'), /requestId === cartCountRequestRef\.current/);
});

test('changed TS and TSX files parse successfully', () => {
    for (const file of [
        'src/components/ClientCart.tsx',
        'src/components/layout/Header.tsx',
        'src/lib/cartCount.ts',
        'src/lib/cart.ts',
    ]) {
        const src = read(file);
        const parsed = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
        assert.equal(parsed.parseDiagnostics.length, 0, file);
    }
});

function loadGuestCartLogic({ entries, products }) {
    const src = read('src/components/ClientCart.tsx');
    const begin = src.indexOf('    async function loadGuestCart()');
    const end = src.indexOf('    async function syncGuestCartToServer()', begin);
    assert.ok(begin > -1 && end > begin);
    const source = src.slice(begin, end) + '\nexports.loadGuestCart = loadGuestCart;';
    const compiled = ts.transpileModule(source, {
        fileName: 'loadGuestCart.ts',
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
        reportDiagnostics: true,
    });
    assert.equal(compiled.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
    const storage = new Map([['wcm_guest_cart_v1', JSON.stringify(entries)], ['cartCount', String(entries.length)]]);
    const recorded = { events: [], lastCart: null, notice: null };
    const sandbox = {
        exports: {},
        console,
        localStorage: {
            getItem: key => storage.get(key) ?? null,
            setItem: (key, val) => storage.set(key, String(val)),
            removeItem: key => storage.delete(key),
        },
        api: { get: async () => ({ data: { productData: products } }) },
        hasValidSellPrice: p => !!p && Number(p.actualPrice) > 0 && Number(p.discountedPrice) > 0,
        isHamperGuestLine: i => i.type === 'HAMPER',
        hydrateGuestHampers: async () => [],
        guestCartLoading: { current: false },
        setLocalCart: v => { recorded.lastCart = v; },
        setGuestCartNotice: v => { recorded.notice = v; },
        notifyOwnCartChange: () => recorded.events.push('cartChanged'),
    };
    vm.runInNewContext(compiled.outputText, sandbox);
    return { load: sandbox.exports.loadGuestCart, storage, recorded };
}

test('guest cleanup drops a price-deleted product, tells shopper why, and notifies header', async () => {
    const id = 'a'.repeat(24);
    const context = loadGuestCartLogic({
        entries: [{ productId: id, quantity: 1, type: 'SELL' }],
        products: [{ _id: id, productName: 'Flower', latestSalePrice: null }],
    });
    await context.load();
    assert.equal(JSON.parse(context.storage.get('wcm_guest_cart_v1')).length, 0);
    assert.equal(context.storage.get('cartCount'), '0');
    assert.equal(context.recorded.events.length, 1);
    assert.equal(context.recorded.lastCart.sellItems.length, 0);
    assert.match(context.recorded.notice, /1 product was removed/);
});

test('guest cleanup keeps correctly priced products and counts their quantities', async () => {
    const bad = 'a'.repeat(24), good = 'b'.repeat(24);
    const context = loadGuestCartLogic({
        entries: [
            { productId: bad, quantity: 1, type: 'SELL' },
            { productId: good, quantity: 3, type: 'SELL' },
        ],
        products: [
            { _id: bad, productName: 'Unavailable', latestSalePrice: null },
            { _id: good, productName: 'Good', latestSalePrice: { actualPrice: 90, discountedPrice: 80 } },
        ],
    });
    await context.load();
    assert.equal(context.storage.get('cartCount'), '3');
    assert.equal(context.recorded.events.length, 1);
    assert.equal(context.recorded.lastCart.sellItems.length, 1);
    assert.equal(context.recorded.lastCart.sellItems[0].quantity, 3);
});
