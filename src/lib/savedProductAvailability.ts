import { hasValidSellPrice } from "@/lib/productPricing";

type Price = {
    actualPrice?: number | string | null;
    discountedPrice?: number | string | null;
};

export type SavedProductAvailability =
    | "available"
    | "out_of_stock"
    | "price_unavailable"
    | "not_for_sale"
    | "stock_unknown";

export type SavedProductAvailabilityInput = {
    sellStockQuantity?: number | string | null;
    isAvailableForSale?: boolean | null;
    price?: Price | null;
};

export function getSavedProductAvailability(
    product: SavedProductAvailabilityInput,
): SavedProductAvailability {
    const stock = product.sellStockQuantity == null
        ? null
        : Number(product.sellStockQuantity);

    if (product.isAvailableForSale === false) return "not_for_sale";
    if (stock !== null && Number.isFinite(stock) && stock <= 0) {
        return "out_of_stock";
    }
    if (!hasValidSellPrice(product.price)) return "price_unavailable";
    // Unknown stock must not be advertised as available or enable checkout.
    if (stock === null || !Number.isFinite(stock)) return "stock_unknown";
    return "available";
}

export function savedProductStatusLabel(
    status: SavedProductAvailability,
): string {
    switch (status) {
        case "out_of_stock": return "Out of stock · Saved for later";
        case "price_unavailable": return "Price unavailable · Saved for later";
        case "not_for_sale": return "Not available for sale · Saved for later";
        case "stock_unknown": return "Stock not confirmed · Saved for later";
        default: return "";
    }
}

export function savedProductActionTitle(
    status: SavedProductAvailability,
): string {
    switch (status) {
        case "out_of_stock": return "Move to cart when stock is available";
        case "price_unavailable": return "Move to cart when a selling price is available";
        case "not_for_sale": return "This product is not available for sale";
        case "stock_unknown": return "Unable to confirm stock right now";
        default: return "Move to cart";
    }
}
