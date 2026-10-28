const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const pathToHelper = path.join(root, 'src/lib/checkoutCouponSelection.ts');
const source = fs.readFileSync(pathToHelper, 'utf8');
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);
const moduleRef = { exports: {} };
new Function('module', 'exports', compiled.outputText)(moduleRef, moduleRef.exports);
const { getAutomaticCouponCode, isSavedCouponManuallySelected } = moduleRef.exports;

const params = {
    cartLoaded: true, couponReady: true, couponLoading: false,
    manualSelection: false, appliedCode: 'SAVE5',
    bestCoupon: { valid: true, coupon: { code: 'FIRST10' } },
};

test('an automatically applied SAVE5 upgrades to FIRST10 when API marks FIRST10 best', () => {
    assert.equal(getAutomaticCouponCode(params), 'FIRST10');
});

test('the same code is not reapplied repeatedly', () => {
    assert.equal(getAutomaticCouponCode({ ...params, appliedCode: 'first10' }), null);
});

test('a customer-selected SAVE5 is preserved', () => {
    assert.equal(getAutomaticCouponCode({ ...params, manualSelection: true }), null);
});

test('waits for the cart and saved coupon to finish loading', () => {
    assert.equal(getAutomaticCouponCode({ ...params, cartLoaded: false }), null);
    assert.equal(getAutomaticCouponCode({ ...params, couponReady: false }), null);
    assert.equal(getAutomaticCouponCode({ ...params, couponLoading: true }), null);
});

test('invalid or missing best offers are not applied', () => {
    assert.equal(getAutomaticCouponCode({ ...params, bestCoupon: null }), null);
    assert.equal(getAutomaticCouponCode({ ...params, bestCoupon: { valid: false, coupon: { code: 'FIRST10' } } }), null);
    assert.equal(getAutomaticCouponCode({ ...params, bestCoupon: { valid: true, coupon: { code: '' } } }), null);
});

test('legacy stored coupons with no metadata may be automatically upgraded', () => {
    assert.equal(isSavedCouponManuallySelected(undefined, undefined, 'cart-one'), false);
    assert.equal(isSavedCouponManuallySelected('automatic', 'cart-one', 'cart-one'), false);
});

test('manual choice is remembered for the matching cart', () => {
    assert.equal(isSavedCouponManuallySelected('manual', 'cart-one', 'cart-one'), true);
    assert.equal(isSavedCouponManuallySelected('manual', 'cart-one', 'cart-two'), false);
});

test('component uses server best-coupon result and stores manual-choice mode', () => {
    const component = fs.readFileSync(path.join(root, 'src/components/CheckoutPanel.tsx'), 'utf8');
    assert.match(component, /getAutomaticCouponCode\(\{/);
    assert.match(component, /bestCoupon: bestCouponData\?\.offer/);
    assert.match(component, /selectionMode: couponOverrideRef\.current/);
    assert.match(component, /isSavedCouponManuallySelected\(/);
});
