We Craft Memories — Hamper delivery-charge correction (28 October 2026)

ROOT CAUSE
The registered-customer delivery quote endpoint only used cart.sellItems. Hamper
items reside in cart.sellHamperItems, so hamper-only carts were quoted as empty,
producing a zero delivery charge. The order-creation flow already expanded
hamper components; this also risked a mismatch between displayed and charged totals.

API REPLACEMENT
Replace controllers/user/logisticPartnerController.js in the API project.
- Uses the same buildHamperOrder/getStockRequirements helpers as order creation.
- Combines active regular items and actual hamper components and quantities.
- Empty carts fail instead of appearing to qualify for free shipping.
- Keeps data.computed.totalDeliveryCharge; corrects alternate response fields.
- Returns a valid guest totalCharge as well.
- Does not change shipping rates or hamper prices.

WEBSITE REPLACEMENT
Replace src/components/CheckoutPanel.tsx in the website project.
- Never renders unavailable shipping as ₹0 or an artificially low final total.
- Shows 'Calculating delivery' / 'Delivery quote unavailable'; allows retry.
- Disables desktop and mobile order buttons until a quote is available.
- Genuine free-shipping coupons still waive shipping AFTER obtaining a quote.

NO ADMIN PANEL CHANGES / NO DATABASE MIGRATION REQUIRED.

VALIDATION
- New API regression tests: hamper-only, mixed, inactive, empty carts all passed.
- 23 selected API hamper/checkout tests passed; 5 website hamper tests passed.
- Website CheckoutPanel TSX parsed successfully using TypeScript parser.
- Other pre-existing broader suite failures from unrelated tests/mock dependencies
  may need independent attention; complete production build was not performed.

DEPLOY / VERIFY
1. Back up the files and replace in each respective project.
2. Deploy API first, then website (restart/rebuild both according to your setup).
3. Add a single hamper to a logged-in customer's cart, choose an address, and
   inspect GET /v1/logistic_partner/get_delivery_charge/:pincode?customerId=...
   Expect data.computed.totalDeliveryCharge to be the per-box charge (not zero),
   with data.inputs listing each hamper component product and quantity.
4. Confirm checkout shows the delivery amount and the order/payment amount agrees.
5. Test a mixed cart, regular-product-only cart, free-shipping coupon and guest checkout.
