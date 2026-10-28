We Craft Memories — Checkout best-coupon auto-upgrade fix (v41)
==========================================================
Base: apply on top of website coupon suggestion fix (v40).

WHY
---
The API correctly returns FIRST10 as best (₹42) but an auto-selected
SAVE5 (₹21) can remain applied. CheckoutPanel.tsx previously stopped its
auto-suggestion effect whenever ANY coupon was already applied. An older
SAVE5 restored from localStorage would therefore block the newer best offer.

CHANGES
-------
1. Automatically selected coupons can be replaced by the current valid
   API bestCoupon, even when another coupon is already applied.
2. Explicit manual selections remain selected. Customers can still click
   Apply on a different suggested coupon.
3. Store the selection mode ('automatic' or 'manual') and the cart key
   alongside the coupon. Older saved coupons without this metadata are
   treated as automatic so they receive the fix without clearing storage.
4. A manual choice from an old cart does not lock a different cart.
5. If a saved code is no longer valid, its manual lock is released.
6. A repeated validation request for the same best coupon/cart is avoided.

REPLACEMENT FILES
-----------------
src/components/CheckoutPanel.tsx          REPLACE
src/lib/checkoutCouponSelection.ts       NEW
tests/checkout-coupon-selection.test.cjs   NEW (optional test)

No API/admin/seeder/database changes are required.

TEST
----
From the website project root:
  node --test tests/checkout-coupon-selection.test.cjs

CHECK IN BROWSER
----------------
1. Have a cart with subtotal ₹420, meeting the FIRST10 rules.
2. Open authenticated checkout with a previously auto-applied SAVE5.
3. Wait for coupon suggestions and validation to complete.
4. FIRST10 should become applied: the discount should show ₹42,
   subject to server-side validation. (Before the fix it showed ₹21.)
5. Explicitly click Apply for SAVE5. It should remain selected for that
   cart even though FIRST10 is marked best. Refresh: selection persists.
6. Change the cart: suggestions are recalculated and auto selection
   can resume based on the updated cart.

VALIDATION
----------
8 focused tests passed; both TS and TSX changed files passed TypeScript
transpile parsing. Full Next.js production build and payment flow have not
been executed in this environment.
