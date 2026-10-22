const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const read = p => fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('all TS and TSX storefront files have valid syntax', () => {
  let count = 0;
  function walk(dir) {
    for (const entry of fs.readdirSync(path.join(__dirname,'..',dir),{withFileTypes:true})) {
      const rel = path.join(dir,entry.name);
      if(entry.isDirectory())walk(rel);
      else if(/\.(ts|tsx)$/.test(entry.name)) {
        count++;
        const source = ts.createSourceFile(rel,read(rel),ts.ScriptTarget.Latest,true,entry.name.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
        assert.equal(source.parseDiagnostics.length,0,rel);
      }
    }
  }
  walk('src');
  assert.ok(count >= 100);
});
test('navigation has mobile drawer, shopping bag, search and sign in', () => {
  const header=read('src/components/layout/Header.tsx');
  for(const text of ['aria-modal="true"','aria-label="Open menu"','role="search"','fetchCartCountUtil','/cart','/login','/profile','/hampers','/products','DeliveryPincodeInput'])assert.ok(header.includes(text),text);
});
test('hamper detail retains server backed cart, availability, gift notes, and included products', () => {
  const detail=read('src/app/hampers/[slug]/page.tsx');
  for(const text of ['getHamper(','addHamperToCart(','maxOrderQuantity','isAvailableForSale','hamper.products.map','hamper-note','HamperMediaImage','HamperRichDescription'])assert.ok(detail.includes(text),text);
});
test('cart and checkout still support regular and hamper items', () => {
  const cart=read('src/components/ClientCart.tsx');
  for(const text of ['changeHamperQuantity','deleteHamperLine','handleQuantityChangeById','sellHamperItems','sellItems','/guest_checkout','/checkout'])assert.ok(cart.includes(text),text);
  assert.ok(read('src/components/CheckoutPanel.tsx').includes('cartHamperLines'));
  assert.ok(read('src/components/GuestCheckoutPanel.tsx').includes('isHamperGuestLine'));
  assert.ok(read('src/components/GuestCheckoutPanel.tsx').includes('getHamper')); 
});
test('reduced motion is supported by the global style system', () => {
  const css=read('src/app/globals.css');
  assert.match(css,/prefers-reduced-motion:\s*reduce/);
  assert.match(css,/:focus-visible/);
});
