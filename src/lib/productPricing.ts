/** A sellable website product needs a configured, positive selling price. */
export function hasValidSellPrice(
    price?: { actualPrice?: number | string | null; discountedPrice?: number | string | null } | null,
): boolean {
    if (!price || price.actualPrice == null || price.discountedPrice == null) return false;
    const actual = Number(price.actualPrice);
    const discounted = Number(price.discountedPrice);
    return Number.isFinite(actual) && actual > 0 && Number.isFinite(discounted) && discounted > 0;
}
