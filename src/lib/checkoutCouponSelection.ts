/**
 * Coupon selection rules for the authenticated checkout.
 *
 * Suggestions come from the API, which computes eligibility and savings.
 * The browser only chooses which valid code to verify/apply; it never
 * calculates the final charge or overrides a customer's manual selection.
 */
export type BestCouponSuggestion = {
    valid?: boolean;
    coupon?: { code?: string | null } | null;
} | null | undefined;

export function getAutomaticCouponCode({
    cartLoaded,
    couponReady,
    couponLoading,
    manualSelection,
    appliedCode,
    bestCoupon,
}: {
    cartLoaded: boolean;
    couponReady: boolean;
    couponLoading: boolean;
    manualSelection: boolean;
    appliedCode: string | null;
    bestCoupon: BestCouponSuggestion;
}): string | null {
    if (!cartLoaded || !couponReady || couponLoading || manualSelection) {
        return null;
    }
    if (bestCoupon?.valid !== true) return null;
    const code = String(bestCoupon.coupon?.code || "").trim().toUpperCase();
    if (!code || code === String(appliedCode || "").trim().toUpperCase()) {
        return null;
    }
    return code;
}

/**
 * Older persisted coupons did not record if the customer chose them. They
 * must remain eligible for automatic upgrades rather than locking in SAVE5.
 * New manual selections are honored only for the cart in which they occurred.
 */
export function isSavedCouponManuallySelected(
    selectionMode: unknown,
    savedCartKey: unknown,
    currentCartKey: string,
): boolean {
    return (
        selectionMode === "manual" &&
        (typeof savedCartKey !== "string" ||
            savedCartKey === currentCartKey)
    );
}
