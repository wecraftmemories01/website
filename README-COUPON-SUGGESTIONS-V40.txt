WE CRAFT MEMORIES — Coupon Suggestion Eligibility Fix (v40)
================================================================
APPLIES TO: API v39 coupon upgrade, Admin v39 coupon upgrade, Website v39 coupon upgrade

Reported case:
  Coupon FIRST10 has minimum cart value Rs. 300 AND minimum cart units 3.
  At 1 unit / Rs. 140 it appeared as 'Add Rs. 160 more'.
  At 2 units / Rs. 520 it disappeared despite the quantity condition still being unmet.

Fix:
  * All unmet cart requirements are calculated together and returned as unlockRequirements.
  * The coupon stays visible as locked at 2 units / Rs. 520 ('Add 1 more unit to unlock').
  * At 3 units / Rs. 660, it becomes applicable if all other conditions are satisfied.
  * The engine checks first-order, returning-customer, selected-customer, product scope, etc.
    BEFORE advertising remaining cart requirements, to avoid misleading customers.
  * Quantity-tier and BOGO offers also show remaining eligible unit counts.
  * Checkout renders each unmet requirement and suppresses the contradictory 'No suggested offers' text.
  * Admin coupon form explains that minimum value and minimum units are cumulative requirements.

Deployment — files are relative to each project root:
  API zip:
    utils/couponRules.js
    controllers/user/couponController.js
    tests/coupon-rules.test.js
    tests/coupon-suggestions.test.js

  WEBSITE zip:
    src/components/CheckoutPanel.tsx

  ADMIN zip (text-only helper change; optional):
    src/components/CouponPromotionForm.tsx

Deploy API first, then website, then admin. Restart relevant services/build them as usual.
No database changes, migration or seeder needed.

Test API logic:
  node --test tests/coupon-rules.test.js tests/coupon-suggestions.test.js

Test manually using a first-time signed-in customer:
  1) Add one Rs. 140 unit -> locked FIRST10: Rs. 160 more AND 2 more units.
  2) Add one Rs. 380 unit -> locked FIRST10: 1 more unit.
  3) Increase the Rs. 140 item to quantity 2 -> FIRST10 eligible, potentially auto-applied.
  4) Use a customer with prior paid orders -> FIRST10 must not appear as available or as an unlockable offer.

If FIRST10 was intended to require ONLY a Rs. 300 minimum, clear the
'Minimum cart units' field in Admin. No code change is needed for that.

Validation:
  22 API unit/controller tests passing (including screenshot scenario).
  JS syntax checks pass. Modified TSX files have zero TypeScript parser diagnostics.
  Full builds and live database/payment integration were not run in this environment.
