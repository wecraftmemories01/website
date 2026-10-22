const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

function loadModule(file, mockRequire = () => ({})) {
    const source = read(file);
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        fileName: file,
        reportDiagnostics: true,
    });
    assert.equal(compiled.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
    const storage = new Map([['accessToken', 'valid-token']]);
    const localStorage = {
        getItem: key => storage.get(key) ?? null,
        setItem: (key, val) => storage.set(key, String(val)),
        removeItem: key => storage.delete(key),
    };
    const window = new EventTarget();
    const requests = [];
    const sandbox = {
        exports: {}, require: mockRequire, window, localStorage, CustomEvent, Event, Headers,
        fetch: async (url, options) => {
            requests.push({ url, options });
            return { ok: true, json: async () => ({ ack: 'success' }) };
        },
        process: { env: { NEXT_PUBLIC_API_BASE: 'http://localhost:3000' } },
        Date, console,
    };
    vm.runInNewContext(compiled.outputText, sandbox, { filename: file });
    return { exports: sandbox.exports, window, requests, storage };
}

test('cart mutation preserves header events but identifies its own updates', async () => {
    const { exports: cart, window, requests, storage } = loadModule('src/lib/cart.ts');
    const events = [];
    window.addEventListener('cartChanged', event => events.push(event));
    const update = await cart.updateCartItem('cart-id', 'line-1', 'prod-1', 3, 'SELL', 'ClientCart');
    assert.equal(update.success, true);
    assert.equal(events.length, 1);
    assert.equal(events[0].detail.source, 'ClientCart');
    assert.equal(JSON.parse(requests[0].options.body).quantity, 3);
    assert.ok(storage.get('cartUpdatedAt'));
    const remove = await cart.removeFromCart('cart-id', 'line-1', 'prod-1', 'SELL', 'ClientCart');
    assert.equal(remove.success, true);
    assert.equal(events.length, 2);
    assert.equal(events[1].detail.source, 'ClientCart');
});

test('unrelated cart updates still send unmarked events for a background refresh', async () => {
    const { exports: cart, window } = loadModule('src/lib/cart.ts');
    const events = [];
    window.addEventListener('cartChanged', event => events.push(event));
    await cart.addToCart('prod-5');
    assert.equal(events.length, 1);
    assert.equal(events[0].detail, undefined);
});

test('guest hamper mutation can skip rehydrating its own cart, without changing storage', () => {
    const { exports: hampers, window, storage } = loadModule('src/lib/hampers.ts',
        () => ({ default: {} }));
    let event;
    window.addEventListener('cartChanged', e => { event = e; });
    const lines = [{ type: 'HAMPER', hamperId: 'a'.repeat(24), quantity: 2 }];
    hampers.writeGuestCart(lines, 'ClientCart');
    assert.equal(event.detail.source, 'ClientCart');
    assert.equal(JSON.parse(storage.get('wcm_guest_cart_v1'))[0].quantity, 2);
});

test('cart page shows the full skeleton only on first load and never refetches its own edits', () => {
    const source = read('src/components/ClientCart.tsx');
    assert.match(source, /const initialLoad = !cartLoadedRef\.current/);
    assert.match(source, /if \(initialLoad\) setLoading\(true\)/);
    assert.match(source, /if \(initialLoad\) setLoading\(false\)/);
    assert.match(source, /detail\?\.source === "ClientCart"\) return/);
    assert.match(source, /const qtyTimeoutsRef = React\.useRef\(new Map/);
    assert.match(source, /savingQuantityIds\.includes\(String\(item\._id\)\)/);
    assert.match(source, /"SELL",\s*"ClientCart"/);
    assert.match(source, /writeGuestCart\(guestLines, "ClientCart"\)/);
    const parsed = ts.createSourceFile('ClientCart.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    assert.equal(parsed.parseDiagnostics.length, 0);
});
