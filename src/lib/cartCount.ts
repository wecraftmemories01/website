import api from "@/services/api";
import { getStoredAccessToken } from "@/lib/auth";

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

                if (!Array.isArray(items)) return 0;

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

        let count = 0;

        if (typeof raw.totalItems === "number") {
            count = raw.totalItems;
        } else if (Array.isArray(raw.sellItems)) {
            count = raw.sellItems.reduce(
                (s: number, it: any) => s + (Number(it.quantity) || 0),
                0
            );
        }

        localStorage.setItem("cartCount", String(count));

        return count;

    } catch (err) {
        console.error("[cartCountUtil] error:", err);
        localStorage.setItem("cartCount", "0");
        return 0;
    }
}