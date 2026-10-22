// Dependency-light regression tests for the shared hamper/guest cart contract.
// For project type checks/builds, install dependencies and run npm run typecheck / npm run build.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let ts;
try { ts = require('typescript'); } catch { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript'); }
const project = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(project, 'src/lib/hampers.ts'), 'utf8');
const parsed = ts.createSourceFile('hampers.ts', source, ts.ScriptTarget.Latest, true);

test('shared hamper helpers parse without errors', () => { assert.equal(parsed.parseDiagnostics.length, 0); });
function setup({ token = null, sourceCart = [] } = {}) {
  const data = new Map([[ 'wcm_guest_cart_v1', JSON.stringify(sourceCart) ]]);
  if (token) data.set('accessToken', token);
  const posts = [];
  const localStorage = { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,String(v)), removeItem: k => data.delete(k) };
  const window = { dispatchEvent() {} };
  const events = { Event: class Event {} };
  const api = {
    post: async (url, body) => { posts.push(body); return { data: { ack: 'success' } }; },
    get: async (url) => ({ data: { ack: 'success', hamper: {
      hamperId: 'aaaaaaaaaaaaaaaaaaaaaaaa', hamperName: 'Birthday hamper',
      price: 600, isAvailableForSale: true, maxOrderQuantity: 4,
      products: [{ productId: 'bbbbbbbbbbbbbbbbbbbbbbbb', quantity: 2 }]
    } } }),
  };
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  const context = { exports, require: name => ({ default: api }), window, localStorage, Event: events.Event,
    Intl, Number, Map, String, Array, JSON, Promise, console, Object };
  vm.runInNewContext(code, context);
  return { helpers: exports, localStorage, posts };
}
const ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const hamper = { hamperId: ID, price: 600, isAvailableForSale: true, maxOrderQuantity: 4 };

test('guest hamper add preserves regular products, merges quantities and notes', async () => {
  const { helpers: h, localStorage } = setup({ sourceCart: [{ productId: 'bbbbbbbbbbbbbbbbbbbbbbbb', quantity: 1, type: 'SELL' }] });
  await h.addHamperToCart(hamper, 2, 'Happy birthday');
  await h.addHamperToCart(hamper, 1);
  const cart = JSON.parse(localStorage.getItem('wcm_guest_cart_v1'));
  assert.equal(cart.length, 2);
  assert.equal(cart[0].type, 'SELL');
  assert.equal(cart[1].type, 'HAMPER');
  assert.equal(cart[1].quantity, 3);
  assert.equal(cart[1].note, 'Happy birthday');
});

test('guest hamper refuses overstock / noninteger quantities', async () => {
  const { helpers: h } = setup();
  await assert.rejects(h.addHamperToCart(hamper, 5));
  await assert.rejects(h.addHamperToCart(hamper, 1.5));
});

test('signed-in hamper posts correct HAMPER contract', async () => {
  const { helpers: h, posts } = setup({ token: 'jwt' });
  await h.addHamperToCart(hamper, 2, 'Wrap it');
  assert.equal(posts.length, 1);
  assert.equal(posts[0].type, 'HAMPER');
  assert.equal(posts[0].hamperId, ID);
  assert.equal(posts[0].quantity, 2);
  assert.equal(posts[0].note, 'Wrap it');
});

test('guest-to-login transfer posts product and hamper exactly once', async () => {
  const { helpers: h, posts, localStorage } = setup({ token: 'jwt', sourceCart: [
    { productId: 'bbbbbbbbbbbbbbbbbbbbbbbb', quantity: 1, type: 'SELL' },
    { hamperId: ID, quantity: 2, type: 'HAMPER', note: 'Surprise' },
  ]});
  await h.syncGuestCartToServer();
  await h.syncGuestCartToServer();
  assert.equal(posts.length, 2);
  assert.equal(posts[0].type, 'SELL');
  assert.equal(posts[1].type, 'HAMPER');
  assert.equal(JSON.parse(localStorage.getItem('wcm_guest_cart_v1')).length, 0);
});
