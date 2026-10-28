WE CRAFT MEMORIES – HAMPER ADD-TO-CART & PER-UNIT GIFT MESSAGES
October 28, 2026

Deployment order: API, Admin, Website.
Unzip each ZIP at the matching project root, preserving directories.
Restart the API and rebuild/redeploy Next.js Admin and Website.
Existing MongoDB data does NOT need to be cleared or migrated.
Existing single "note" values remain readable and are converted to per-unit message slots on change.

WHAT CHANGED
* Add to cart directly from /hampers and the homepage hamper grid; out-of-stock / View cart states.
* Hamper detail supports separate messages per copy (for large quantities customize the rest in cart).
* /cart shows an optional message textarea for each hamper, including when buying copies for different recipients; Save required before checkout.
* Logged-in and guest carts persist giftMessages[] and carry those values through order creation and order snapshots.
* Checkout review, order confirmation and order details display messages for each hamper copy.
* Admin order view shows each gift message for the packing team, and admin order edits preserve them.
* Previous hamper-delivery-charge fix from v40 replacement retained (API quote + website checkout).

NOTES
* Quantity and pricing still work as before: messages do NOT create separate priced cart lines.
* The legacy itemNotes field stays for compatibility, while giftMessages[] is the per-copy source of truth.
* No new routes, seeders, environment variables or database migrations.
* Static TypeScript/TSX syntax verification passed. 43 related API regression tests passed.
* Full Next.js production builds were not run in this environment (dependencies not installed).
