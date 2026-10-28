WE CRAFT MEMORIES - COUPON UPGRADE (2026-10-28)
Based on: wecraft-api-38.zip, wecraft-admin-38.zip, wecraft-website-38.zip

HOW TO INSTALL
1. Make backups of application files and MongoDB before modifying production.
2. Unzip each patch INTO its corresponding project root (service, admin, website), keeping folders.
3. In the SERVICE directory run: node scripts/seedCouponMasters.js
   This ONLY upserts missing coupon benefit and condition master types. It does not reset orders or stock.
4. Run coupon calculation tests: node --test tests/coupon-rules.test.js
5. Build/test your existing admin and website normally (npm ci / npm run build).
6. Deploy service first, then admin and website.

SUPPORTED
- First-order signed-in customer offers; returning-customer condition
- N-redemption limited campaigns (with signed-in customer and per-customer=1)
- Bulk quantity-tier percentage savings (benefit: BULK_TIER)
- Product/category-scoped savings on eligible lines in mixed carts
- Minimum subtotal and quantity conditions
- Standard/free-shipping offers; quoted shipping subsidies recorded in order and redemption snapshots
- BOGO lowest-priced eligible gift units; fixed-price bundle of selected products
- Selected-customer restriction, per-customer and per-IP limits, platform restriction
- Signed-in coupon suggestions, guest discount-code entry, auto-best suggestions inherited from CheckoutPanel
- Admin promotion form, coupon redemption performance summary, product/category selection
- Single coupon per order (as previous code). Existing redeemed coupon benefit/conditions are locked.

IMPORTANT PRODUCTION SAFETY NOTES
- First-N limited campaigns enforce their cap at final paid redemption, NOT by reserving a slot before Razorpay capture. In a high-concurrency sellout, a buyer may start checkout while a slot exists and encounter a post-capture processing/reconciliation issue. Pilot with low-volume campaigns until a reservation/expiry subsystem is added.
- The guest checkout does not offer first-order/selected-customer promotions (sign-in required).
- No coupon-stacking, referral, birthday, birthday-data collection, abandoned-cart automation, region-based shipping caps, coupon simulator, or channel-specific stall redemption was added.
- Website's signed-in CheckoutPanel was already doing automatic best-offer suggestions; it was kept intact to avoid breaking existing checkout.
- MongoDB transaction/unique-index requirements are the same as the original service; verify availability on staging.
- Taxes/fees and promotional profitability are not evaluated. Only enable financially sustainable offers.
- Full npm build and payment integration tests could not be run in the isolated workspace (no project dependencies or live services). Unit tests and TypeScript syntax-only checks passed.
- Previous order-status fix package can remain installed: this patch does not overwrite controllers/admin/sellOrderController.js or utils/orderPaymentStage.js.
