import api from "@/services/api";

export const GUEST_CART_KEY = "wcm_guest_cart_v1";
export type Hamper = {
    hamperId: string;
    hamperNumber?: number;
    hamperName: string;
    hamperImage?: string | null;
    shortDescription?: string;
    longDescription?: string;
    price: number;
    seo?: { slug?: string; metaTitle?: string; metaDescription?: string };
    tags?: string[];
    isAvailableForSale: boolean;
    maxOrderQuantity: number;
    products?: {
        productId: string;
        productName: string | null;
        productImage?: string | null;
        quantity: number;
    }[];
};
export type HamperCartLine = {
    _id: string;
    hamperId: string;
    quantity: number;
    note?: string;
    giftMessages?: string[];
    hamper: Hamper | null;
    isAvailable?: boolean;
};
export type GuestHamperLine = {
    type: "HAMPER";
    hamperId: string;
    quantity: number;
    note?: string;
    giftMessages?: string[];
};

/** Normalize existing single-note carts and preserve a slot for each physical gift. */
export function hamperGiftMessages(line: { quantity: number; note?: string; giftMessages?: string[] }): string[] {
    return Array.from({ length: Math.max(0, line.quantity) }, (_, i) => {
        const value = Array.isArray(line.giftMessages) ? line.giftMessages[i] : line.note;
        return typeof value === "string" ? value.slice(0, 5000) : "";
    });
}

export function currencyINR(amount: number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
    }).format(amount || 0);
}
export function hamperPath(hamper: Hamper) {
    return `/hampers/${encodeURIComponent(hamper.seo?.slug || hamper.hamperId)}`;
}
export function isHamperGuestLine(value: any): value is GuestHamperLine {
    return (
        value?.type === "HAMPER" &&
        typeof value.hamperId === "string" &&
        /^[a-fA-F0-9]{24}$/.test(value.hamperId) &&
        Number.isSafeInteger(value.quantity) &&
        value.quantity > 0
    );
}
export function readGuestCart(): any[] {
    if (typeof window === "undefined") return [];
    try {
        const parsed = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}
export function writeGuestCart(lines: any[], source?: string) {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(lines));
    window.dispatchEvent(
        source
            ? new CustomEvent("cartChanged", { detail: { source } })
            : new Event("cartChanged"),
    );
}
export function guestHamperLines() {
    return readGuestCart().filter(isHamperGuestLine);
}
export async function listHampers(
    page = 1,
    limit = 12,
    search = "",
): Promise<{ data: Hamper[]; totalRecords: number; page: number }> {
    const { data } = await api.get("/hamper/sell", {
        params: { page, limit, ...(search ? { search } : {}) },
    });
    if (data?.ack !== "success" || !Array.isArray(data.data))
        throw new Error(data?.error || "Unable to load hampers");
    return data;
}
export async function getHamper(
    idOrSlug: string,
    byId = false,
): Promise<Hamper> {
    const { data } = await api.get(
        byId
            ? `/hamper/sell/${encodeURIComponent(idOrSlug)}`
            : `/hamper/sell/slug/${encodeURIComponent(idOrSlug)}`,
    );
    if (data?.ack !== "success" || !data?.hamper)
        throw new Error(data?.error || "Hamper is unavailable");
    return data.hamper;
}
export async function addHamperToCart(
    hamper: Hamper,
    quantity: number,
    note = "",
    giftMessages?: string[],
) {
    if (
        !Number.isSafeInteger(quantity) ||
        quantity < 1 ||
        !hamper.isAvailableForSale ||
        quantity > hamper.maxOrderQuantity
    ) {
        throw new Error("The selected hamper quantity is unavailable");
    }
    if (typeof window === "undefined") throw new Error("Cart is unavailable");
    if (localStorage.getItem("accessToken")) {
        const { data } = await api.post("/cart", {
            type: "HAMPER",
            hamperId: hamper.hamperId,
            quantity,
            note: note.slice(0, 5000),
            giftMessages: giftMessages ?? Array(quantity).fill(note.slice(0, 5000)),
        });
        if (data?.ack === "failure")
            throw new Error(data.error || "Unable to add hamper");
        window.dispatchEvent(new Event("cartChanged"));
    } else {
        const lines = readGuestCart();
        const existing = lines.find(isHamperGuestLineAndId(hamper.hamperId));
        const total = quantity + (existing?.quantity || 0);
        if (total > hamper.maxOrderQuantity)
            throw new Error(
                `Only ${hamper.maxOrderQuantity} hamper(s) are currently available`,
            );
        if (existing) {
            existing.giftMessages = hamperGiftMessages(existing).concat(
                giftMessages ?? Array(quantity).fill(note.slice(0, 5000)),
            );
            existing.quantity = total;
            existing.note = existing.note || note || "";
        } else
            lines.push({
                type: "HAMPER",
                hamperId: hamper.hamperId,
                quantity,
                note: note.slice(0, 5000),
                giftMessages: giftMessages ?? Array(quantity).fill(note.slice(0, 5000)),
            });
        writeGuestCart(lines);
    }
}
function isHamperGuestLineAndId(id: string) {
    return (value: any): value is GuestHamperLine =>
        isHamperGuestLine(value) && value.hamperId === id;
}
export async function hydrateGuestHampers(): Promise<HamperCartLine[]> {
    const lines = guestHamperLines();
    const rows = await Promise.all(
        lines.map(async (line) => {
            try {
                const hamper = await getHamper(line.hamperId, true);
                return {
                    _id: `hamper:${line.hamperId}`,
                    hamperId: line.hamperId,
                    quantity: line.quantity,
                    note: line.note,
                    giftMessages: hamperGiftMessages(line),
                    hamper,
                    isAvailable:
                        hamper.isAvailableForSale &&
                        hamper.maxOrderQuantity >= line.quantity,
                };
            } catch {
                return {
                    _id: `hamper:${line.hamperId}`,
                    hamperId: line.hamperId,
                    quantity: line.quantity,
                    note: line.note,
                    giftMessages: hamperGiftMessages(line),
                    hamper: null,
                    isAvailable: false,
                };
            }
        }),
    );
    return rows;
}
export function cartHamperLines(rawCart: any): HamperCartLine[] {
    return (
        Array.isArray(rawCart?.sellHamperItems) ? rawCart.sellHamperItems : []
    ).map((line: any) => ({
        _id: String(line._id),
        hamperId: String(line.hamperId),
        quantity: Number(line.quantity || 0),
        note: line.note,
        giftMessages: hamperGiftMessages(line),
        hamper: line.hamper || null,
        isAvailable: line.isAvailable === true,
    }));
}

let syncPromise: Promise<void> | null = null;
/** Safely import a pre-login basket, one line at a time, without re-posting successful lines. */
export async function syncGuestCartToServer(): Promise<void> {
    if (typeof window === "undefined" || !localStorage.getItem("accessToken"))
        return;
    if (syncPromise) return syncPromise;
    syncPromise = (async () => {
        for (const line of readGuestCart()) {
            if (isHamperGuestLine(line)) {
                await api.post("/cart", {
                    type: "HAMPER",
                    hamperId: line.hamperId,
                    quantity: line.quantity,
                    note: line.note || "",
                    giftMessages: hamperGiftMessages(line),
                });
            } else if (line?.productId) {
                await api.post("/cart", {
                    type: line.type === "RENT" ? "RENT" : "SELL",
                    productId: line.productId,
                    quantity: line.quantity,
                });
            } else continue;
            // Leave any unsynced entries in storage when a later line fails.
            const current = readGuestCart();
            const index = current.findIndex((it) =>
                isHamperGuestLine(line)
                    ? isHamperGuestLine(it) && it.hamperId === line.hamperId
                    : it.productId === line.productId && it.type !== "HAMPER",
            );
            if (index >= 0) {
                current.splice(index, 1);
                localStorage.setItem(GUEST_CART_KEY, JSON.stringify(current));
            }
        }
        window.dispatchEvent(new Event("cartChanged"));
    })();
    try {
        await syncPromise;
    } finally {
        syncPromise = null;
    }
}