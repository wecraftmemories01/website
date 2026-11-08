import api from "@/services/api";
import { getStoredAccessToken } from "@/lib/auth";
import { hasValidSellPrice } from "@/lib/productPricing";

/* ---------------- Helpers ---------------- */

function getStoredCustomerId(): string | null {
    try {
        if (typeof window === "undefined") return null;
        const raw = localStorage.getItem("auth");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.customerId ?? null;
    } catch {
        return null;
    }
}

/* ---------------- Main Logic ---------------- */

export async function fetchCartCountUtil(): Promise<number> {
    try {
        if (typeof window === "undefined") return 0;

        const token = getStoredAccessToken();

        /* ================= GUEST CART ================= */
        if (!token) {
            try {
                const raw = localStorage.getItem("wcm_guest_cart_v1");
                if (!raw) {
                    localStorage.setItem("cartCount", "0");
                    return 0;
                }

                const items = JSON.parse(raw);

                if (!Array.isArray(items)) {
                    localStorage.setItem("cartCount", "0");
                    return 0;
                }

                const count = items.reduce(
                    (sum: number, item: any) => sum + (Number(item.quantity) || 0),
                    0
                );

                localStorage.setItem("cartCount", String(count));
                return count;

            } catch {
                localStorage.setItem("cartCount", "0");
                return 0;
            }
        }

        /* ================= LOGGED-IN CART ================= */

        const res = await api.get("/cart");

        const body = res.data;

        const raw = Array.isArray(body?.cartData)
            ? body.cartData[0]
            : body.cartData;

        if (!raw) {
            localStorage.setItem("cartCount", "0");
            return 0;
        }

        // totalItems is the number of stored lines/units and still includes
        // products whose price was removed after they were added. Only show
        // purchasable SELL lines in the header badge.
        const sellCount = (raw.sellItems || []).reduce(
            (sum: number, item: any) =>
                sum + (item.inUse !== false && hasValidSellPrice(item.product?.price)
                    ? Number(item.quantity) || 0
                    : 0),
            0,
        );
        const hamperCount = (raw.sellHamperItems || []).reduce(
            (sum: number, item: any) => sum + (Number(item.quantity) || 0), 0,
        );
        const rentCount = (raw.rentItems || []).reduce(
            (sum: number, item: any) => sum + (Number(item.quantity) || 0), 0,
        );
        const count = sellCount + hamperCount + rentCount;

        localStorage.setItem("cartCount", String(count));

        return count;

    } catch (err) {
        console.error("[cartCountUtil] error:", err);
        // A temporary network failure is not proof that a shopper's cart is empty.
        return Number(localStorage.getItem("cartCount") || 0);
    }
}