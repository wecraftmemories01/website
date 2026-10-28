"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { publicImageUrl } from "@/lib/publicImageUrl";
import { getStoredAccessToken, getAuth, logout } from "@/lib/auth";
import MobileCartItem from "@/components/ui/MobileCartItem";
import HamperMediaImage from "@/components/HamperMediaImage";
import DesktopCartItem from "@/components/ui/DesktopCartItem";

// adjust these imports if your project paths differ
import { updateCartItem, removeFromCart } from "@/lib/cart";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
    HamperCartLine,
    cartHamperLines,
    hydrateGuestHampers,
    readGuestCart,
    writeGuestCart,
    currencyINR,
    hamperPath,
    isHamperGuestLine,
    hamperGiftMessages,
    syncGuestCartToServer as syncGuestCartAfterLogin,
} from "@/lib/hampers";

/* ---------------- Types ---------------- */
type ObjectIdString = string;

type PriceShape = {
    priceId?: string;
    actualPrice?: number | null;
    discountedPrice?: number | null;
};

type CartItem = {
    _id?: string;
    productId?: ObjectIdString;
    quantity?: number;
    inUse?: boolean;
    imagePath?: string | null;
    thumbnail?: string | null;
    productPublicName?: string | null;
    sellStockQuantity?: number | string | null;
    isAvailableForSale?: boolean | null;
    productNumber?: number | null;
    price?: PriceShape | null;
};

type Cart = {
    _id?: string;
    cartId?: ObjectIdString;
    customerId?: ObjectIdString;
    sellItems?: CartItem[];
    sellHamperItems?: HamperCartLine[];
    inUse?: boolean;
    createdAt?: string;
    updatedAt?: string;
    totalItems?: number | null;
    productNames?: string[] | null;
};

type SavedItem = {
    id: string; // product id or saved id fallback
    title: string;
    price?: number | null;
    img?: string | null;
    qty?: number;
    _savedId?: string; // server saved id
    productId?: string | undefined; // optional product reference
    sellStockQuantity?: number | string | null;
    isAvailableForSale?: boolean | null;
};

/* ---------------- Helpers ---------------- */
function safeNumber(v: any): number | null {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return v;
    const n = Number(String(v).replace(/[^\d.-]+/g, ""));
    return Number.isFinite(n) ? n : null;
}

// Stock 0 and explicitly disabled products cannot be purchased, even if the
// API still returns isAvailableForSale: true (as with existing cart entries).
function isProductUnavailable(item: {
    sellStockQuantity?: number | string | null;
    isAvailableForSale?: boolean | null;
}): boolean {
    const stock = safeNumber(item.sellStockQuantity);
    return (stock !== null && stock <= 0) || item.isAvailableForSale === false;
}

function formatCurrency(amount: number | null | undefined): string {
    if (typeof amount !== "number" || Number.isNaN(amount)) return "—";
    return `₹${amount.toFixed(2)}`;
}

function normalizeCartResponse(raw: any): Cart | null {
    if (!raw) return null;

    const out: Cart = {
        _id: raw.cartId ?? raw._id ?? null,
        cartId: raw.cartId ?? raw._id,
        customerId: raw.customerId,
        inUse: raw.inUse,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        totalItems: typeof raw.totalItems === "number" ? raw.totalItems : null,
        productNames: Array.isArray(raw.productNames) ? raw.productNames : [],
        sellHamperItems: cartHamperLines(raw),
        sellItems: Array.isArray(raw.sellItems)
            ? raw.sellItems.map((si: any) => {
                  const p = si.product ?? {};
                  const priceObj: PriceShape | null = p.price
                      ? {
                            priceId: p.price.priceId,
                            actualPrice: safeNumber(p.price.actualPrice),
                            discountedPrice: safeNumber(
                                p.price.discountedPrice,
                            ),
                        }
                      : null;

                  return {
                      _id: si._id,
                      productId: si.productId,
                      quantity: si.quantity ?? 1,
                      inUse: si.inUse !== false,
                      imagePath: p.productImage ?? null,
                      thumbnail: p.productImage ?? null,
                      productPublicName:
                          p.productName ??
                          p.name ??
                          (typeof p.productNumber !== "undefined"
                              ? `Product #${p.productNumber}`
                              : null),
                      sellStockQuantity: p.sellStockQuantity ?? null,
                      isAvailableForSale:
                          typeof p.isAvailableForSale === "boolean"
                              ? p.isAvailableForSale
                              : null,
                      productNumber: p.productNumber ?? null,
                      price: priceObj,
                  } as CartItem;
              })
            : [],
    };

    return out;
}

/* ---------------- Error helpers & ApiError ---------------- */

class ApiError extends Error {
    code?: number | string | null;
    details?: any;
    constructor(message: string, code?: number | string | null, details?: any) {
        super(message);
        this.name = "ApiError";
        this.code = code ?? null;
        this.details = details;
    }
}

function extractErrorMessage(json: any, fallback = "Unknown error"): string {
    if (!json) return fallback;

    if (typeof json.error === "string") return json.error;
    if (typeof json.message === "string") return json.message;

    if (json.error && typeof json.error === "object") {
        if (typeof json.error.message === "string") return json.error.message;
        if (typeof json.error.msg === "string") return json.error.msg;
    }

    if (
        json.ack === "failure" &&
        json.error &&
        typeof json.error === "object"
    ) {
        if (typeof json.error.message === "string") return json.error.message;
    }

    if (typeof json === "string") return json;

    try {
        const s = JSON.stringify(json);
        return s.length > 200 ? s.slice(0, 200) + "…" : s;
    } catch {
        return fallback;
    }
}

function getStoredCustomerId(): string | null {
    return getAuth()?.customerId ?? null;
}

/* ---------------- Saved API helpers (updated to throw ApiError) ---------------- */
async function apiGetSaved(customerId: string): Promise<SavedItem[]> {
    try {
        const res = await api.get(`/customer/${customerId}/saved_product`);

        const json = res.data;

        const arr = Array.isArray(json?.savedData)
            ? json.savedData
            : Array.isArray(json?.saved)
              ? json.saved
              : Array.isArray(json?.savedProducts)
                ? json.savedProducts
                : Array.isArray(json?.data)
                  ? json.data
                  : [];

        return arr.map((s: any) => {
            const product = s.product || s.productObj || s;
            const productId = String(
                product?.productId ?? product?._id ?? s.productId ?? s._id ?? "",
            );

            return {
                id: productId,
                title: product?.productName ?? s.title ?? "Untitled",
                price:
                    safeNumber(product?.price?.discountedPrice) ??
                    safeNumber(product?.price?.actualPrice),
                img: product?.productImage ?? s.img ?? null,
                _savedId: s._id,
                productId,
                sellStockQuantity:
                    product?.sellStockQuantity ?? s.sellStockQuantity ?? null,
                isAvailableForSale:
                    product?.isAvailableForSale ?? s.isAvailableForSale ?? null,
            } as SavedItem;
        });
    } catch (error: any) {
        throw new ApiError(
            error?.response?.data?.error?.message ||
                error?.message ||
                "Failed to fetch saved",
            error?.response?.data?.error?.code,
            error?.response?.data,
        );
    }
}

async function apiAddSaved(customerId: string, product: any) {
    try {
        const res = await api.post(`/customer/${customerId}/saved_product`, {
            productId: product.productId ?? product.id,
        });

        if (res.data?.ack === "failure") {
            throw new ApiError(
                extractErrorMessage(res.data, "Unable to save item"),
                res.data?.error?.code,
                res.data,
            );
        }
        return res.data;
    } catch (error: any) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(
            error?.response?.data?.error?.message ||
                error?.message ||
                "Unable to save item",
            error?.response?.data?.error?.code,
            error?.response?.data,
        );
    }
}

async function apiDeleteSaved(customerId: string, savedId: string) {
    try {
        const res = await api.delete(`/customer/saved_product/${savedId}`);
        return res.data;
    } catch (error: any) {
        throw new ApiError(
            error?.response?.data?.error?.message ||
                error?.message ||
                "Unable to delete saved item",
            error?.response?.data?.error?.code,
            error?.response?.data,
        );
    }
}

async function apiDeleteSavedByProduct(customerId: string, productId: string) {
    try {
        const res = await api.delete(`/customer/${customerId}/saved_product`, {
            params: { productId },
        });

        return res.data;
    } catch (error: any) {
        throw new ApiError(
            error?.response?.data?.error?.message ||
                error?.message ||
                "Unable to delete saved item by product",
            error?.response?.data?.error?.code,
            error?.response?.data,
        );
    }
}

function SavedProductImage({
    src,
    alt,
    unavailable,
}: {
    src?: string | null;
    alt: string;
    unavailable: boolean;
}) {
    const [failed, setFailed] = useState(false);
    const url = failed ? null : publicImageUrl(src);
    return (
        <Image
            src={url || "/no-image-placeholder.png"}
            alt={alt}
            width={64}
            height={64}
            onError={() => setFailed(true)}
            className={`h-full w-full object-cover ${unavailable ? "grayscale opacity-65" : ""}`}
        />
    );
}

/* ---------------- Component ---------------- */
export default function ClientCart() {
    const fetchIdRef = React.useRef(0);
    const qtyTimeoutsRef = React.useRef(
        new Map<string, ReturnType<typeof setTimeout>>(),
    );
    const cartLoadedRef = React.useRef(false);
    const autoMoveRunningRef = React.useRef(false);
    const autoMoveFailedRef = React.useRef(new Set<string>());
    const [autoMovingIds, setAutoMovingIds] = useState<string[]>([]);
    const [automaticallySavedCount, setAutomaticallySavedCount] = useState(0);
    const [savedStockOverrides, setSavedStockOverrides] = useState<
        Record<string, number>
    >({});

    // Notify the header and other shopping widgets without reloading this page.
    const notifyOwnCartChange = () =>
        window.dispatchEvent(
            new CustomEvent("cartChanged", {
                detail: { source: "ClientCart" },
            }),
        );

    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [localCart, setLocalCart] = useState<Cart | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [savingItemId, setSavingItemId] = useState<string | null>(null);
    const [giftDrafts, setGiftDrafts] = useState<Record<string, string[]>>({});
    const [savingQuantityIds, setSavingQuantityIds] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
    const [savedLoading, setSavedLoading] = useState<boolean>(false);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [toDeleteItemId, setToDeleteItemId] = useState<string | undefined>(
        undefined,
    );
    const [deleting, setDeleting] = useState(false);

    const [confirmSavedOpen, setConfirmSavedOpen] = useState(false);
    const [toDeleteSavedId, setToDeleteSavedId] = useState<string | undefined>(
        undefined,
    );
    const [deletingSaved, setDeletingSaved] = useState(false);
    const [toDeleteSavedTitle, setToDeleteSavedTitle] = useState<
        string | undefined
    >(undefined);

    // NEW: modal for "already saved" message
    const [savedExistsModalOpen, setSavedExistsModalOpen] = useState(false);
    const [savedExistsTitle, setSavedExistsTitle] = useState<
        string | undefined
    >(undefined);

    const router = useRouter();

    const guestCartLoading = React.useRef(false);

    // derived counts used for disabling checkout
    const activeSellItems = (localCart?.sellItems ?? []).filter(
        (it) => it.inUse !== false && !isProductUnavailable(it),
    );
    const unavailableSellItems = (localCart?.sellItems ?? []).filter(
        (it) => it.inUse !== false && isProductUnavailable(it),
    );
    const totalItemsCount = activeSellItems.reduce(
        (sum, it) => sum + Number(it.quantity ?? 1),
        0,
    );
    const hamperLines = localCart?.sellHamperItems ?? [];
    const hamperCount = hamperLines.reduce(
        (sum, it) => sum + Number(it.quantity || 0),
        0,
    );
    const hamperTotal = hamperLines.reduce(
        (sum, it) =>
            sum + Number(it.hamper?.price || 0) * Number(it.quantity || 0),
        0,
    );
    const hasUnavailableHamper = hamperLines.some(
        (it) => !it.hamper || it.isAvailable !== true,
    );
    const hasUnsavedGiftMessages = hamperLines.some(line => {
        const draft = giftDrafts[line.hamperId];
        return !!draft && draft.slice(0, line.quantity).some(
            (value, index) => value !== hamperGiftMessages(line)[index]
        );
    });
    const cartItemsCount = totalItemsCount + hamperCount;
    const cartSubtotal = orderTotal(activeSellItems) + hamperTotal;
    const hasItems =
        cartItemsCount > 0 &&
        !hasUnavailableHamper &&
        unavailableSellItems.length === 0 &&
        autoMovingIds.length === 0;

    function redirectToLogin(): void {
        logout("/login");
    }

    function clampCartQuantities(inCart: Cart | null): Cart | null {
        if (!inCart) return inCart;

        return {
            ...inCart,
            sellItems: (inCart.sellItems ?? []).map((it) => {
                const stock = safeNumber(it.sellStockQuantity);
                const currentQty = Number(it.quantity ?? 1);

                if (stock === null || stock <= 0) {
                    return {
                        ...it,
                        quantity: Math.max(1, Math.floor(currentQty)),
                    };
                }

                const clamped = Math.max(
                    1,
                    Math.min(
                        Math.floor(currentQty),
                        Math.max(0, Math.floor(stock)),
                    ),
                );

                return { ...it, quantity: clamped };
            }),
        };
    }

    useEffect(() => {
        return () => {
            for (const timer of qtyTimeoutsRef.current.values())
                clearTimeout(timer);
            qtyTimeoutsRef.current.clear();
        };
    }, []);

    useEffect(() => {
        const checkAuth = () => {
            const token = getStoredAccessToken();
            setIsAuthenticated(Boolean(token));
        };

        checkAuth();

        window.addEventListener("authChanged", checkAuth);
        window.addEventListener("storage", checkAuth);

        return () => {
            window.removeEventListener("authChanged", checkAuth);
            window.removeEventListener("storage", checkAuth);
        };
    }, []);

    useEffect(() => {
        async function init() {
            if (isAuthenticated) {
                await syncGuestCartToServer();

                // Show saved-for-later while the first cart request completes.
                setSavedLoading(true);
                await fetchCart();
                void fetchSavedItems();
            } else {
                loadGuestCart();
            }
        }

        init();
    }, [isAuthenticated]);

    useEffect(() => {
        const reload = (event: Event) => {
            // Quantity changes and removals made here already update localCart.
            // Re-fetching them used to replace the page with the loading skeleton.
            if (
                (event as CustomEvent<{ source?: string }>).detail?.source ===
                "ClientCart"
            )
                return;

            if (!getStoredAccessToken()) {
                void loadGuestCart();
            } else {
                void fetchCart(); // Silent refresh once the cart has loaded.
            }
        };

        window.addEventListener("cartChanged", reload);

        return () => {
            window.removeEventListener("cartChanged", reload);
        };
    }, []);

    async function fetchCart(): Promise<void> {
        const fetchId = ++fetchIdRef.current;

        // Show the skeleton for the initial load only, never for cart refreshes.
        // The existing rows and order summary stay mounted during a refresh.
        const initialLoad = !cartLoadedRef.current;
        if (initialLoad) setLoading(true);
        if (initialLoad) setError(null);

        try {
            const res = await api.get(`/cart`);

            if (fetchId !== fetchIdRef.current) return;

            const json = res.data;

            const rawCart = Array.isArray(json.cartData)
                ? json.cartData[0]
                : json.cartData;

            const normalized = normalizeCartResponse(rawCart);

            setLocalCart(clampCartQuantities(normalized));
        } catch (err: any) {
            if (fetchId !== fetchIdRef.current) return;

            console.error("fetchCart error:", err);

            setError(
                err?.response?.data?.error?.message ||
                    err?.message ||
                    "Unable to load cart",
            );
        } finally {
            if (fetchId === fetchIdRef.current) {
                cartLoadedRef.current = true;
                if (initialLoad) setLoading(false);
            }
        }
    }

    // Moving to saved-for-later is a two-step server change: save first, then
    // delete the cart line. Treat an already-saved product as a successful save.
    // Never remove the cart entry if saving failed (prevents data loss).
    async function moveCartProductToSaved(
        cart: Cart,
        item: CartItem,
    ): Promise<void> {
        const customerId = getStoredCustomerId();
        const cartId = cart.cartId ?? cart._id;
        if (!customerId || !cartId || !item._id || !item.productId) {
            throw new Error("Cart or customer information is missing.");
        }

        try {
            await apiAddSaved(customerId, { productId: item.productId });
        } catch (err: any) {
            if (!(err instanceof ApiError) || String(err.code) !== "1003") {
                throw err;
            }
            // 1003 means the item is already in Saved for Later.
        }

        const result = await removeFromCart(
            cartId,
            String(item._id),
            String(item.productId),
            "SELL",
            "ClientCart",
        );
        if (!result?.success) {
            // Some backends remove a cart item when it is saved. In that case
            // the redundant DELETE can fail, but the move has succeeded.
            const response = await api.get("/cart");
            const freshCart = Array.isArray(response.data?.cartData)
                ? response.data.cartData[0]
                : response.data?.cartData;
            const stillInCart = (freshCart?.sellItems ?? []).some(
                (line: any) =>
                    String(line._id) === String(item._id) ||
                    String(line.productId) === String(item.productId),
            );
            if (stillInCart) {
                throw new Error(
                    typeof result?.message === "string"
                        ? result.message
                        : "Could not remove this item from your cart.",
                );
            }
        }
    }

    // Runs after GET /cart (and subsequent silent refreshes). One migration
    // runs at a time so React refreshes cannot trigger duplicate requests.
    useEffect(() => {
        if (!isAuthenticated || !localCart || autoMoveRunningRef.current) {
            return;
        }
        const cartId = localCart.cartId ?? localCart._id;
        if (!cartId || !getStoredCustomerId()) return;

        const candidates = (localCart.sellItems ?? []).filter(
            (item) =>
                item.inUse !== false &&
                isProductUnavailable(item) &&
                Boolean(item._id && item.productId) &&
                !autoMoveFailedRef.current.has(String(item._id)),
        );
        if (candidates.length === 0) return;

        autoMoveRunningRef.current = true;
        setAutoMovingIds(candidates.map((item) => String(item._id)));

        void (async () => {
            try {
                for (const item of candidates) {
                    try {
                        await moveCartProductToSaved(localCart, item);
                        setSavedStockOverrides((prev) => ({
                            ...prev,
                            [String(item.productId)]: 0,
                        }));
                        setAutomaticallySavedCount((n) => n + 1);
                        // Do not leave sold-out products in the payable UI.
                        fetchIdRef.current += 1;
                        setLocalCart((prev) =>
                            prev
                                ? {
                                      ...prev,
                                      sellItems: (prev.sellItems ?? []).filter(
                                          (line) => line._id !== item._id,
                                      ),
                                  }
                                : prev,
                        );
                    } catch (err: any) {
                        autoMoveFailedRef.current.add(String(item._id));
                        setError(
                            `"${item.productPublicName || "An unavailable product"}" could not be moved to Saved for Later. It will not be included in checkout. ${err?.message || "Please try again."}`,
                        );
                    } finally {
                        setAutoMovingIds((ids) =>
                            ids.filter((id) => id !== String(item._id)),
                        );
                    }
                }
            } finally {
                autoMoveRunningRef.current = false;
                // Reconcile against the server and show the saved items even if
                // this was the last product in the cart.
                await Promise.all([fetchCart(), fetchSavedItems()]);
            }
        })();
    }, [isAuthenticated, localCart]);

    async function fetchSavedItems(): Promise<void> {
        setSavedLoading(true);
        try {
            const customerId = getStoredCustomerId();
            if (!customerId) {
                setSavedItems([]);
                setSavedLoading(false);
                return;
            }
            const items = await apiGetSaved(customerId);
            const missingStockIds = items
                .filter(
                    (item) =>
                        item.productId &&
                        item.sellStockQuantity == null &&
                        item.isAvailableForSale !== false,
                )
                .map((item) => String(item.productId));
            if (missingStockIds.length) {
                try {
                    const response = await api.get("/product/sell", {
                        params: { ids: [...new Set(missingStockIds)].join(",") },
                    });
                    const products = Array.isArray(response.data?.productData)
                        ? response.data.productData
                        : [];
                    const byId = new Map<string, any>(
                        products.map((p: any) => [
                            String(p.productId ?? p._id),
                            p,
                        ]),
                    );
                    for (const saved of items) {
                        const matched = byId.get(String(saved.productId));
                        if (matched) {
                            saved.sellStockQuantity =
                                matched.sellStockQuantity ?? null;
                            saved.isAvailableForSale =
                                matched.isAvailableForSale ?? null;
                        }
                    }
                    // The sell list may omit sold-out products. Its individual
                    // detail endpoint still exposes sellStockQuantity.
                    const stillUnknown = items.filter(
                        (item) =>
                            item.productId &&
                            item.sellStockQuantity == null &&
                            item.isAvailableForSale !== false,
                    );
                    const individual = await Promise.allSettled(
                        stillUnknown.map((item) =>
                            api.get(`/product/sell/${encodeURIComponent(String(item.productId))}`),
                        ),
                    );
                    individual.forEach((result, index) => {
                        if (result.status !== "fulfilled") return;
                        const product = result.value.data?.productData;
                        if (!product) return;
                        stillUnknown[index].sellStockQuantity =
                            product.sellStockQuantity ?? null;
                        stillUnknown[index].isAvailableForSale =
                            product.isAvailableForSale ?? null;
                    });
                } catch (err) {
                    // Saved items are still usable even if the stock lookup fails.
                    console.warn("Could not refresh saved product stock", err);
                }
            }
            setSavedItems(items);
        } catch (err: any) {
            console.error("fetchSavedItems error:", err);
            if (err instanceof ApiError) setError(err.message);
            else setError(err?.message || "Unable to load saved items");
        } finally {
            setSavedLoading(false);
        }
    }

    async function loadGuestCart() {
        if (guestCartLoading.current) return;
        guestCartLoading.current = true;

        try {
            const raw = localStorage.getItem("wcm_guest_cart_v1");
            if (!raw) {
                setLocalCart(null);
                return;
            }

            let items: any[] = [];

            try {
                items = JSON.parse(raw);
            } catch {
                window.dispatchEvent(new Event("cartChanged"));
                localStorage.removeItem("wcm_guest_cart_v1");
                setLocalCart(null);
                return;
            }

            if (!Array.isArray(items) || items.length === 0) {
                setLocalCart({
                    _id: "guest",
                    sellItems: [],
                    sellHamperItems: [],
                });
                return;
            }

            const guestProducts = items.filter(
                (i: any) => i.productId && i.type !== "HAMPER",
            );
            const ids = [
                ...new Set(guestProducts.map((i: any) => i.productId)),
            ].join(",");
            const res = ids ? await api.get(`/product/sell?ids=${ids}`) : null;
            const products = Array.isArray(res?.data?.productData)
                ? res.data.productData
                : [];

            const sellItems = products
                .filter((p: any) =>
                    items.some(
                        (i: any) => String(i.productId) === String(p._id),
                    ),
                )
                .map((p: any) => {
                    const cartItem = items.find(
                        (i: any) => String(i.productId) === String(p._id),
                    );

                    return {
                        _id: p._id,
                        productId: p._id,
                        quantity: cartItem?.quantity ?? 1,
                        inUse: true,
                        imagePath: p.productImage,
                        thumbnail: p.productImage,
                        productPublicName: p.productName,
                        sellStockQuantity: p.sellStockQuantity,
                        isAvailableForSale: p.isAvailableForSale ?? null,
                        price: {
                            actualPrice: p.latestSalePrice?.actualPrice,
                            discountedPrice: p.latestSalePrice?.discountedPrice,
                        },
                    };
                });

            const validIds = new Set(products.map((p: any) => String(p._id)));

            const cleanedItems = items.filter(
                (i: any) =>
                    isHamperGuestLine(i) || validIds.has(String(i.productId)),
            );
            const sellHamperItems = await hydrateGuestHampers();

            // FIX: remove invalid productIds
            if (cleanedItems.length !== items.length) {
                console.warn(
                    "Removed invalid cart items:",
                    items.filter((i) => !validIds.has(String(i.productId))),
                );
            }

            localStorage.setItem(
                "wcm_guest_cart_v1",
                JSON.stringify(cleanedItems),
            );

            setLocalCart({
                _id: "guest",
                sellItems,
                sellHamperItems,
            });
        } catch (err) {
            console.error("Invalid guest cart", err);
        } finally {
            guestCartLoading.current = false;
        }
    }

    async function syncGuestCartToServer() {
        try {
            await syncGuestCartAfterLogin();
        } catch (err: any) {
            setError(
                err?.response?.data?.error ||
                    err?.message ||
                    "Unable to transfer your guest cart",
            );
        }
    }

    // Update an existing hamper cart line, not the underlying products.
    async function changeHamperQuantity(
        line: HamperCartLine,
        requestedQty: number,
    ): Promise<void> {
        if (savingItemId) return;
        if (!Number.isSafeInteger(requestedQty) || requestedQty < 1) return;
        if (!line.hamper || !line.hamper.isAvailableForSale) {
            setError("This hamper is currently unavailable.");
            return;
        }
        if (requestedQty > line.hamper.maxOrderQuantity) {
            setError(
                `Only ${line.hamper.maxOrderQuantity} of this hamper can be ordered.`,
            );
            return;
        }

        const authenticated = Boolean(getStoredAccessToken());
        setError(null);
        setSavingItemId(line._id);
        fetchIdRef.current += 1;
        setLocalCart((prev) =>
            prev
                ? {
                      ...prev,
                      sellHamperItems: (prev.sellHamperItems ?? []).map(
                          (item) =>
                              item.hamperId === line.hamperId
                                  ? {
                                        ...item,
                                        quantity: requestedQty,
                                        giftMessages: hamperGiftMessages(item).slice(0, requestedQty).concat(
                                            Array(Math.max(0, requestedQty - item.quantity)).fill(""),
                                        ),
                                        isAvailable:
                                            Boolean(
                                                item.hamper?.isAvailableForSale,
                                            ) &&
                                            requestedQty <=
                                                (item.hamper
                                                    ?.maxOrderQuantity ?? 0),
                                    }
                                  : item,
                      ),
                  }
                : prev,
        );

        try {
            if (!authenticated) {
                // Guest cart: keep other products and hampers untouched.
                const guestLines = readGuestCart();
                const index = guestLines.findIndex(
                    (item) =>
                        isHamperGuestLine(item) &&
                        item.hamperId === line.hamperId,
                );
                if (index === -1)
                    throw new Error("Hamper not found in your cart.");

                guestLines[index] = {
                    ...guestLines[index],
                    quantity: requestedQty,
                    giftMessages: hamperGiftMessages(line).slice(0, requestedQty).concat(
                        Array(Math.max(0, requestedQty - line.quantity)).fill(""),
                    ),
                };
                writeGuestCart(guestLines, "ClientCart"); // Update header without rehydrating this page.
            } else {
                const cartId = localCart?.cartId ?? localCart?._id;
                if (!cartId) throw new Error("Cart identifier is missing.");

                const { data } = await api.put(
                    `/cart/${encodeURIComponent(cartId)}`,
                    {
                        type: "HAMPER",
                        itemId: line._id, // Server cart subdocument ID, not hamperId.
                        quantity: requestedQty,
                    },
                );
                if (data?.ack === "failure") {
                    throw new Error(
                        extractErrorMessage(
                            data,
                            "Unable to update hamper quantity.",
                        ),
                    );
                }
                notifyOwnCartChange();
            }
        } catch (err: any) {
            const message = extractErrorMessage(
                err?.response?.data,
                err?.message || "Unable to update hamper quantity.",
            );
            if (authenticated) await fetchCart();
            else await loadGuestCart();
            setError(message);
        } finally {
            setSavingItemId(null);
        }
    }

    // Save independent recipient messages without changing prices, products or quantity.
    async function saveHamperGiftMessages(line: HamperCartLine): Promise<void> {
        if (savingItemId) return;
        const messages = Array.from({ length: line.quantity }, (_, index) =>
            (giftDrafts[line.hamperId]?.[index] ?? hamperGiftMessages(line)[index] ?? "").slice(0, 5000)
        );
        setError(null);
        setSavingItemId(line._id);
        try {
            if (!getStoredAccessToken()) {
                const lines = readGuestCart();
                const found = lines.findIndex(item => isHamperGuestLine(item) && item.hamperId === line.hamperId);
                if (found < 0) throw new Error("Gift hamper no longer in cart");
                lines[found] = { ...lines[found], giftMessages: messages };
                writeGuestCart(lines, "ClientCart");
            } else {
                const cartId = localCart?.cartId ?? localCart?._id;
                if (!cartId) throw new Error("Cart identifier is missing.");
                const { data } = await api.put(`/cart/${encodeURIComponent(cartId)}`, {
                    type: "HAMPER", itemId: line._id, giftMessages: messages,
                });
                if (data?.ack === "failure") throw new Error(extractErrorMessage(data, "Unable to save gift messages."));
            }
            setLocalCart(prev => prev ? {
                ...prev,
                sellHamperItems: (prev.sellHamperItems ?? []).map(item => item.hamperId === line.hamperId
                    ? { ...item, giftMessages: messages } : item),
            } : prev);
            setGiftDrafts(prev => { const next = { ...prev }; delete next[line.hamperId]; return next; });
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || "Unable to save gift messages.");
        } finally {
            setSavingItemId(null);
        }
    }

    // Remove only the selected hamper line. Product cart entries are unaffected.
    async function deleteHamperLine(line: HamperCartLine): Promise<void> {
        if (savingItemId) return;

        const authenticated = Boolean(getStoredAccessToken());
        setError(null);
        setSavingItemId(line._id);
        fetchIdRef.current += 1;
        setLocalCart((prev) =>
            prev
                ? {
                      ...prev,
                      sellHamperItems: (prev.sellHamperItems ?? []).filter(
                          (item) => item.hamperId !== line.hamperId,
                      ),
                  }
                : prev,
        );

        try {
            if (!authenticated) {
                const guestLines = readGuestCart();
                const remaining = guestLines.filter(
                    (item) =>
                        !(
                            item?.type === "HAMPER" &&
                            item.hamperId === line.hamperId
                        ),
                );
                if (remaining.length === guestLines.length) {
                    throw new Error("Hamper not found in your cart.");
                }
                writeGuestCart(remaining, "ClientCart");
            } else {
                const cartId = localCart?.cartId ?? localCart?._id;
                if (!cartId) throw new Error("Cart identifier is missing.");

                // Axios DELETE request bodies must be supplied through `data`.
                const { data } = await api.delete(
                    `/cart/${encodeURIComponent(cartId)}`,
                    {
                        data: { type: "HAMPER", itemId: line._id },
                    },
                );
                if (data?.ack === "failure") {
                    throw new Error(
                        extractErrorMessage(data, "Unable to remove hamper."),
                    );
                }
                notifyOwnCartChange();
            }
        } catch (err: any) {
            const message = extractErrorMessage(
                err?.response?.data,
                err?.message || "Unable to remove hamper.",
            );
            if (authenticated) await fetchCart();
            else await loadGuestCart();
            setError(message);
        } finally {
            setSavingItemId(null);
        }
    }

    function updateLocalItemById(
        itemId: string | undefined,
        patch: Partial<CartItem>,
    ): void {
        if (!itemId) return;

        // Any fetch started before this edit must not revert the new quantity.
        fetchIdRef.current += 1;
        setLocalCart((prev) => {
            if (!prev) return prev;

            const updatedItems = prev.sellItems?.map((item) =>
                item._id === itemId ? { ...item, ...patch } : item,
            );

            return {
                ...prev,
                sellItems: updatedItems,
            };
        });
    }

    async function saveItem(item: CartItem): Promise<void> {
        const cartId = localCart?._id ?? localCart?.cartId;

        if (!cartId) {
            setError("Cart identifier is missing.");
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const result = await updateCartItem(
                cartId,
                String(item._id),
                String(item.productId),
                Number(item.quantity ?? 1),
                "SELL",
                "ClientCart",
            );

            if (!result?.success) {
                throw new Error(result?.message || "Failed to update item");
            }

            // updateCartItem already emitted the marked cartChanged event.
        } catch (err: any) {
            if (err?.message === "Auth required") {
                redirectToLogin();
                return;
            }

            setError(err?.message || "Unable to save item");
            await fetchCart();
        } finally {
            setSaving(false);
        }
    }

    function openConfirmDialog(itemId?: string) {
        setToDeleteItemId(itemId);
        setConfirmOpen(true);
    }

    function closeConfirmDialog() {
        setConfirmOpen(false);
        setToDeleteItemId(undefined);
    }

    async function performDelete() {
        if (!toDeleteItemId) {
            setError("No item selected for deletion.");
            closeConfirmDialog();
            return;
        }

        const token = getStoredAccessToken();

        // GUEST CART DELETE
        if (!token) {
            const raw = localStorage.getItem("wcm_guest_cart_v1");
            if (!raw) return;

            let items: any[] = [];

            try {
                items = JSON.parse(raw);
            } catch {
                localStorage.removeItem("wcm_guest_cart_v1");
                closeConfirmDialog();
                return;
            }

            const item = localCart?.sellItems?.find(
                (it) => String(it._id) === String(toDeleteItemId),
            );

            const filtered = items.filter(
                (i: any) => String(i.productId) !== String(item?.productId),
            );

            localStorage.setItem("wcm_guest_cart_v1", JSON.stringify(filtered));

            fetchIdRef.current += 1;
            setLocalCart((prev) => {
                if (!prev) return prev;

                return {
                    ...prev,
                    sellItems: prev.sellItems?.filter(
                        (it) => it._id !== toDeleteItemId,
                    ),
                };
            });

            notifyOwnCartChange();
            closeConfirmDialog();

            return;
        }

        // SERVER CART DELETE
        const cartId = localCart?._id ?? localCart?.cartId;

        if (!cartId) {
            setError("Cart not initialized yet.");
            closeConfirmDialog();
            return;
        }

        setDeleting(true);

        try {
            const item = localCart?.sellItems?.find(
                (it) => String(it._id) === String(toDeleteItemId),
            );

            if (!item?.productId) {
                setError("Product not found for deletion.");
                closeConfirmDialog();
                return;
            }

            // 1. Optimistic UI update
            fetchIdRef.current += 1;
            setLocalCart((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    sellItems: prev.sellItems?.filter(
                        (it) => String(it._id) !== String(toDeleteItemId),
                    ),
                };
            });

            // 2. ACTUAL API CALL (this was missing ❌)
            const result = await removeFromCart(
                cartId,
                String(toDeleteItemId),
                String(item.productId),
                "SELL",
                "ClientCart",
            );

            if (!result?.success) {
                throw new Error(result?.message || "Delete failed");
            }

            // removeFromCart already notified header and product cards.

            closeConfirmDialog();
        } catch (err: any) {
            console.error("performDelete error:", err);
            setError(err?.message || "Unable to delete item");

            // rollback if API fails
            await fetchCart();
        } finally {
            setDeleting(false);
        }
    }

    async function deleteItem(
        cartObject: Cart | null,
        itemId?: string,
    ): Promise<void> {
        openConfirmDialog(itemId);
    }

    function lineTotal(item?: CartItem): number {
        const qty = item?.quantity ?? 0;
        const price =
            item?.price?.discountedPrice ?? item?.price?.actualPrice ?? 0;
        return (Number(qty) || 0) * (Number(price) || 0);
    }

    function orderTotal(items?: CartItem[] | undefined): number {
        return (items ?? []).reduce((sum, it) => sum + lineTotal(it), 0);
    }

    async function handleQuantityChangeById(
        itemId: string | undefined,
        requestedQty: number,
    ) {
        if (!itemId) return;
        if (!localCart || savingQuantityIds.includes(itemId)) return;

        const arr = localCart.sellItems ?? [];
        const idxInFull = arr.findIndex((s) => s._id === itemId);
        if (idxInFull === -1) return;

        const item = arr[idxInFull];
        if (isProductUnavailable(item)) return;
        const stock = safeNumber(item.sellStockQuantity);

        let qty = Math.max(1, Math.floor(requestedQty));

        if (stock !== null) {
            const maxAllowed = Math.max(0, Math.floor(stock));
            qty = Math.min(qty, Math.max(1, maxAllowed));
        }

        updateLocalItemById(itemId, { quantity: qty });

        const token = getStoredAccessToken();

        // GUEST CART QUANTITY UPDATE
        if (!token) {
            const raw = localStorage.getItem("wcm_guest_cart_v1");
            if (!raw) return;

            let items: any[] = [];

            try {
                items = JSON.parse(raw);
            } catch {
                localStorage.removeItem("wcm_guest_cart_v1");
                closeConfirmDialog();
                return;
            }

            const index = items.findIndex(
                (i: any) => String(i.productId) === String(item?.productId),
            );

            if (index >= 0) {
                items[index].quantity = qty;
                localStorage.setItem(
                    "wcm_guest_cart_v1",
                    JSON.stringify(items),
                );

                notifyOwnCartChange();
            }

            return;
        }

        // SERVER CART QUANTITY UPDATE
        const cartId = localCart?._id ?? localCart?.cartId;

        if (!cartId) {
            setError("Cart not initialized yet.");
            return;
        }

        setSavingQuantityIds((ids) =>
            ids.includes(itemId) ? ids : [...ids, itemId],
        );

        // Debounce each product independently. Editing a second item must not
        // cancel the first item's pending server update.
        const previousTimer = qtyTimeoutsRef.current.get(itemId);
        if (previousTimer) clearTimeout(previousTimer);

        const timer = setTimeout(async () => {
            qtyTimeoutsRef.current.delete(itemId);
            try {
                const result = await updateCartItem(
                    cartId,
                    String(itemId),
                    String(item.productId),
                    qty,
                    "SELL",
                    "ClientCart",
                );

                if (!result?.success) {
                    throw new Error(
                        result?.message || "Failed to update quantity",
                    );
                }
            } catch (err: any) {
                console.error("handleQuantityChangeById error:", err);
                setError(err?.message || "Unable to update quantity");
                await fetchCart();
            } finally {
                setSavingQuantityIds((ids) =>
                    ids.filter((id) => id !== itemId),
                );
            }
        }, 300);
        qtyTimeoutsRef.current.set(itemId, timer);
    }

    /* ---------------- Save-for-later actions (with ApiError handling) ---------------- */

    async function saveForLater(itemId?: string): Promise<void> {
        if (!itemId || !localCart || saving || autoMovingIds.length > 0) return;
        const item = (localCart.sellItems ?? []).find((s) => s._id === itemId);
        if (!item) return;
        if (!getStoredCustomerId()) {
            redirectToLogin();
            return;
        }
        setSaving(true);
        setSavingItemId(itemId);
        setError(null);
        try {
            await moveCartProductToSaved(localCart, item);
            fetchIdRef.current += 1;
            setLocalCart((prev) =>
                prev
                    ? {
                          ...prev,
                          sellItems: (prev.sellItems ?? []).filter(
                              (line) => line._id !== itemId,
                          ),
                      }
                    : prev,
            );
            await Promise.all([fetchCart(), fetchSavedItems()]);
        } catch (err: any) {
            setError(err?.message || "Could not save item for later");
            await Promise.all([fetchCart(), fetchSavedItems()]);
        } finally {
            setSaving(false);
            setSavingItemId(null);
        }
    }

    async function moveSavedToCart(saved: SavedItem) {
        const customerId = getStoredCustomerId();

        const cartId = localCart?._id ?? localCart?.cartId;
        if (!cartId) {
            setError("Cart not initialized yet.");
            return;
        }

        if (!customerId) {
            redirectToLogin();
            return;
        }
        if (!saved) return;
        if (
            isProductUnavailable({
                ...saved,
                sellStockQuantity:
                    saved.sellStockQuantity ??
                    savedStockOverrides[String(saved.productId ?? saved.id)] ??
                    null,
            })
        ) {
            setError("This product is out of stock. You can move it back when it is available.");
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const productId = saved.productId ?? saved.id;
            if (!productId)
                throw new Error("Product ID missing for saved item.");

            const body = {
                type: "SELL",
                itemId: productId,
                productId: productId,
                quantity: 1,
            };

            await api.put(`/cart/${cartId}/move_to_cart`, body);

            await Promise.all([fetchCart(), fetchSavedItems()]);
        } catch (err: any) {
            console.error("moveSavedToCart error:", err);
            setError(err?.message || "Could not move saved item to cart");
            await fetchCart();
            await fetchSavedItems();
        } finally {
            setSaving(false);
        }
    }

    async function deleteSaved(saved: SavedItem) {
        const customerId = getStoredCustomerId();
        if (!customerId) {
            redirectToLogin();
            return;
        }
        if (!saved) return;

        setSaving(true);
        setError(null);
        try {
            const savedServerId = saved._savedId ?? saved.id;
            if (!savedServerId) throw new Error("Saved id is missing");
            await apiDeleteSaved(customerId, String(savedServerId));
            await fetchSavedItems();
        } catch (err: any) {
            console.error("deleteSaved error:", err);
            if (err instanceof ApiError) setError(err.message);
            else setError(err?.message || "Unable to delete saved item");
            await fetchSavedItems();
        } finally {
            setSaving(false);
        }
    }

    function openSavedConfirm(saved: SavedItem) {
        const id = saved._savedId ?? saved.id;
        setToDeleteSavedId(id ? String(id) : undefined);
        setToDeleteSavedTitle(saved.title ?? undefined);
        setConfirmSavedOpen(true);
    }
    function closeSavedConfirm() {
        setToDeleteSavedId(undefined);
        setToDeleteSavedTitle(undefined);
        setConfirmSavedOpen(false);
    }

    async function performSavedDelete() {
        const customerId = getStoredCustomerId();
        if (!customerId) {
            redirectToLogin();
            return;
        }
        if (!toDeleteSavedId) {
            setError("No saved item selected for deletion.");
            closeSavedConfirm();
            return;
        }

        setDeletingSaved(true);
        setError(null);
        try {
            await apiDeleteSaved(customerId, String(toDeleteSavedId));
            await fetchSavedItems();
            closeSavedConfirm();
        } catch (err: any) {
            console.warn(
                "performSavedDelete direct delete failed, trying fallback by productId:",
                err,
            );
            try {
                await apiDeleteSavedByProduct(
                    customerId,
                    String(toDeleteSavedId),
                );
                await fetchSavedItems();
                closeSavedConfirm();
            } catch (err2: any) {
                console.error("performSavedDelete fallback also failed:", err2);
                setError(
                    err2 instanceof ApiError
                        ? err2.message
                        : err2?.message || "Unable to delete saved item",
                );
            }
        } finally {
            setDeletingSaved(false);
        }
    }

    /* ---------------- UI helpers ---------------- */
    function EmptyIllustration({
        isAuthenticated,
    }: {
        isAuthenticated: boolean;
    }) {
        return (
            <div className="max-w-sm mx-auto text-center">
                <svg
                    width="180"
                    height="120"
                    viewBox="0 0 180 120"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="mx-auto mb-4"
                >
                    <rect
                        x="8"
                        y="28"
                        width="164"
                        height="72"
                        rx="8"
                        fill="#F3F4F6"
                    />
                    <rect
                        x="20"
                        y="40"
                        width="60"
                        height="40"
                        rx="6"
                        fill="#FFFFFF"
                    />
                    <rect
                        x="92"
                        y="40"
                        width="60"
                        height="40"
                        rx="6"
                        fill="#FFFFFF"
                    />
                    <circle cx="50" cy="60" r="6" fill="#E5E7EB" />
                    <circle cx="122" cy="60" r="6" fill="#E5E7EB" />
                </svg>

                <h3 className="text-lg font-semibold">Your cart is empty</h3>

                <p className="text-sm text-gray-500 mt-2">
                    When you add items, they’ll show up here. Ready to find
                    something lovely?
                </p>

                {/* 👇 SHOW ONLY FOR GUEST USERS */}
                {!isAuthenticated && (
                    <p className="text-xs text-gray-400 mt-3">
                        Login to save your cart across devices
                    </p>
                )}

                <div className="mt-4 flex justify-center gap-3">
                    <a
                        href="/products"
                        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md shadow"
                    >
                        Browse products
                    </a>
                    <a
                        href="/products"
                        className="inline-flex items-center gap-2 border px-4 py-2 rounded-md"
                    >
                        Continue shopping
                    </a>
                </div>
            </div>
        );
    }

    function LoaderSkeleton() {
        return (
            <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="flex gap-4 items-center animate-pulse bg-white rounded-lg p-4 shadow-sm"
                    >
                        <div className="w-20 h-20 bg-gray-200 rounded-md" />
                        <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        </div>
                        <div className="w-20 h-8 bg-gray-200 rounded" />
                    </div>
                ))}
            </div>
        );
    }

    if (loading)
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-6">
                <div className="w-full max-w-4xl">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <div className="h-8 w-48 bg-gray-200 rounded mb-2 animate-pulse" />
                            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                        </div>
                        <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <LoaderSkeleton />
                </div>
            </div>
        );

    if (
        !loading &&
        (!localCart ||
            (localCart.sellItems?.length ?? 0) +
                (localCart.sellHamperItems?.length ?? 0) ===
                0) &&
        !(isAuthenticated && (savedItems.length > 0 || savedLoading || automaticallySavedCount > 0))
    ) {
        return (
            <div className="p-8">
                <EmptyIllustration isAuthenticated={isAuthenticated} />
            </div>
        );
    }

    return (
        <>
            {automaticallySavedCount > 0 && (
                <div
                    role="status"
                    className="max-w-4xl mx-auto mb-4 rounded-2xl border border-[#c9e4d7] bg-[#f3fbf6] px-4 py-3 text-sm text-[#286347]"
                >
                    {automaticallySavedCount} out-of-stock product
                    {automaticallySavedCount === 1 ? " was" : "s were"} automatically
                    moved to <strong>Saved for later</strong>. You can find
                    {automaticallySavedCount === 1 ? " it" : " them"} below.
                </div>
            )}
            {/* Error banner */}
            {error ? (
                <div className="max-w-4xl mx-auto mb-4">
                    <div className="rounded-md bg-rose-50 border border-rose-100 text-rose-800 px-4 py-2 text-sm">
                        {error}
                    </div>
                </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] gap-5 lg:gap-7 items-start pb-24 lg:pb-0">
                <section className="order-1 lg:order-0 space-y-6 min-w-0">
                    {/* ================= CART ================= */}
                    <div className="site-card p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">
                                Items in your cart
                            </h3>
                            {savingQuantityIds.length > 0 && (
                                <span
                                    role="status"
                                    className="text-xs font-medium text-[#527363]"
                                >
                                    Saving changes…
                                </span>
                            )}
                        </div>

                        {(localCart?.sellItems ?? []).filter(
                            (it) => it.inUse !== false,
                        ).length === 0 && hamperLines.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <p>Your cart is clear. Items saved for later appear below.</p>
                                <a
                                    href="/products"
                                    className="mt-4 inline-block site-button-primary"
                                >
                                    Shop Now
                                </a>
                            </div>
                        ) : (
                            <>
                                {/* MOBILE */}
                                <div className="space-y-4 md:hidden">
                                    {localCart!
                                        .sellItems!.filter(
                                            (it) => it.inUse !== false,
                                        )
                                        .map((item) => (
                                            <MobileCartItem
                                                key={item._id ?? item.productId}
                                                item={item}
                                                outOfStock={isProductUnavailable(item)}
                                                removeDisabled={
                                                    saving ||
                                                    deleting ||
                                                    autoMovingIds.length > 0
                                                }
                                                disabled={
                                                    isProductUnavailable(item) ||
                                                    saving ||
                                                    autoMovingIds.length > 0 ||
                                                    savingItemId === item._id ||
                                                    savingQuantityIds.includes(
                                                        String(item._id),
                                                    )
                                                }
                                                onIncrease={() =>
                                                    handleQuantityChangeById(
                                                        item._id,
                                                        (item.quantity ?? 1) +
                                                            1,
                                                    )
                                                }
                                                onDecrease={() =>
                                                    handleQuantityChangeById(
                                                        item._id,
                                                        (item.quantity ?? 1) -
                                                            1,
                                                    )
                                                }
                                                onRemove={() =>
                                                    openConfirmDialog(item._id)
                                                }
                                                onSave={() =>
                                                    saveForLater(item._id)
                                                }
                                                lineTotal={lineTotal(item)}
                                                formatCurrency={formatCurrency}
                                            />
                                        ))}
                                </div>

                                {/* DESKTOP */}
                                <div className="hidden md:block bg-white rounded-xl overflow-hidden">
                                    {localCart!
                                        .sellItems!.filter(
                                            (it) => it.inUse !== false,
                                        )
                                        .map((item) => (
                                            <DesktopCartItem
                                                key={item._id ?? item.productId}
                                                item={item}
                                                outOfStock={isProductUnavailable(item)}
                                                removeDisabled={
                                                    saving ||
                                                    deleting ||
                                                    autoMovingIds.length > 0
                                                }
                                                disabled={
                                                    isProductUnavailable(item) ||
                                                    saving ||
                                                    autoMovingIds.length > 0 ||
                                                    savingItemId === item._id ||
                                                    savingQuantityIds.includes(
                                                        String(item._id),
                                                    )
                                                }
                                                onIncrease={() =>
                                                    handleQuantityChangeById(
                                                        item._id,
                                                        (item.quantity ?? 1) +
                                                            1,
                                                    )
                                                }
                                                onDecrease={() =>
                                                    handleQuantityChangeById(
                                                        item._id,
                                                        (item.quantity ?? 1) -
                                                            1,
                                                    )
                                                }
                                                onRemove={() =>
                                                    openConfirmDialog(item._id)
                                                }
                                                onSave={() =>
                                                    saveForLater(item._id)
                                                }
                                                lineTotal={lineTotal(item)}
                                                formatCurrency={formatCurrency}
                                            />
                                        ))}
                                </div>
                            </>
                        )}
                        {unavailableSellItems.length > 0 && (
                            <p className="mt-3 text-xs text-amber-800" role="status">
                                {isAuthenticated
                                    ? "Unavailable products are being moved to Saved for later. If a move fails, you can remove the item manually."
                                    : "Unavailable products are excluded from the order total. Sign in to save them for later."}
                            </p>
                        )}
                        {hamperLines.length > 0 && (
                            <div className="mt-6 space-y-3">
                                <h4 className="font-semibold text-[#065975]">
                                    Gift hampers
                                </h4>
                                {hamperLines.map((line) => (
                                    <div
                                        key={line._id}
                                        className="border border-slate-200 rounded-2xl p-3 sm:p-4 flex flex-row flex-wrap gap-3 sm:gap-4 bg-[#fffaf6]"
                                    >
                                        <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-[#e6f7f9]">
                                            <HamperMediaImage
                                                src={line.hamper?.hamperImage}
                                                alt={
                                                    line.hamper?.hamperName ||
                                                    "Gift hamper"
                                                }
                                                sizes="80px"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {line.hamper ? (
                                                <Link
                                                    href={hamperPath(
                                                        line.hamper,
                                                    )}
                                                    className="font-semibold text-slate-900 hover:underline"
                                                >
                                                    {line.hamper.hamperName}
                                                </Link>
                                            ) : (
                                                <b className="text-rose-600">
                                                    Hamper unavailable
                                                </b>
                                            )}
                                            <p className="font-medium text-[#065975] mt-1">
                                                {currencyINR(
                                                    Number(
                                                        line.hamper?.price || 0,
                                                    ),
                                                )}{" "}
                                                each
                                            </p>
                                            <div className="mt-3 rounded-xl border border-[#d7e7e3] bg-[#f6faf9] p-3">
                                                <p className="text-sm font-bold text-[#173b4a]">
                                                    {line.quantity > 1 ? "Gift messages — one per hamper" : "Gift message (optional)"}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {line.quantity > 1
                                                        ? "Sending these to different people? Write a different message for each copy. Leave any blank if no message is needed."
                                                        : "Add a personalized note for the recipient, or leave it blank."}
                                                </p>
                                                <div className="mt-3 space-y-3">
                                                    {hamperGiftMessages(line).map((storedMessage, index) => (
                                                        <label key={index} className="block text-xs font-semibold text-slate-600">
                                                            {line.quantity > 1 ? `Hamper ${index + 1} message` : "Your message"}
                                                            <textarea
                                                                rows={2}
                                                                maxLength={5000}
                                                                value={giftDrafts[line.hamperId]?.[index] ?? storedMessage}
                                                                onChange={event => {
                                                                    const value = event.target.value;
                                                                    setGiftDrafts(prev => {
                                                                        const messages = prev[line.hamperId] ?? hamperGiftMessages(line);
                                                                        const next = [...messages];
                                                                        next[index] = value;
                                                                        return { ...prev, [line.hamperId]: next };
                                                                    });
                                                                }}
                                                                placeholder="Write a heartfelt message…"
                                                                disabled={savingItemId === line._id}
                                                                className="site-field mt-1 w-full resize-y font-normal"
                                                            />
                                                        </label>
                                                    ))}
                                                </div>
                                                {Boolean(giftDrafts[line.hamperId]) && giftDrafts[line.hamperId].some((v, i) => v !== hamperGiftMessages(line)[i]) && (
                                                    <div className="mt-3 flex flex-wrap items-center gap-3">
                                                        <button type="button" onClick={() => saveHamperGiftMessages(line)} disabled={Boolean(savingItemId)} className="site-button-primary !min-h-9 !px-4 text-xs disabled:opacity-50">
                                                            {savingItemId === line._id ? "Saving…" : "Save gift messages"}
                                                        </button>
                                                        <span className="text-xs text-amber-700">Unsaved changes</span>
                                                    </div>
                                                )}
                                            </div>
                                            {!line.isAvailable && (
                                                <p className="text-xs text-rose-600 mt-2">
                                                    Currently unavailable in
                                                    this quantity. Reduce
                                                    quantity or remove this
                                                    hamper to checkout.
                                                </p>
                                            )}
                                            <div className="mt-3 flex items-center gap-3 flex-wrap">
                                                <button
                                                    aria-label={`Decrease ${line.hamper?.hamperName || "hamper"} quantity`}
                                                    disabled={
                                                        savingItemId ===
                                                            line._id ||
                                                        line.quantity <= 1
                                                    }
                                                    onClick={() =>
                                                        changeHamperQuantity(
                                                            line,
                                                            line.quantity - 1,
                                                        )
                                                    }
                                                    className="border rounded px-3 py-1 disabled:opacity-40"
                                                >
                                                    −
                                                </button>
                                                <span>{line.quantity}</span>
                                                <button
                                                    aria-label={`Increase ${line.hamper?.hamperName || "hamper"} quantity`}
                                                    disabled={
                                                        savingItemId ===
                                                            line._id ||
                                                        !line.hamper ||
                                                        line.quantity >=
                                                            line.hamper
                                                                .maxOrderQuantity
                                                    }
                                                    onClick={() =>
                                                        changeHamperQuantity(
                                                            line,
                                                            line.quantity + 1,
                                                        )
                                                    }
                                                    className="border rounded px-3 py-1 disabled:opacity-40"
                                                >
                                                    +
                                                </button>
                                                <button
                                                    disabled={
                                                        savingItemId ===
                                                        line._id
                                                    }
                                                    onClick={() =>
                                                        deleteHamperLine(line)
                                                    }
                                                    className="text-sm text-rose-600 underline ml-auto"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                        <div className="font-semibold">
                                            {currencyINR(
                                                Number(
                                                    line.hamper?.price || 0,
                                                ) * line.quantity,
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <aside className="site-card p-5 sm:p-6 lg:sticky lg:top-28 space-y-5">
                    {/* Title */}
                    <h4 className="font-semibold text-lg">Order Summary</h4>

                    {/* Pricing */}
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span>Items ({cartItemsCount})</span>
                            <span>{formatCurrency(cartSubtotal)}</span>
                        </div>

                        <div className="flex justify-between text-gray-500">
                            <span>Delivery</span>
                            <span className="text-xs">
                                Calculated at Checkout
                            </span>
                        </div>

                        <div className="border-t pt-2 flex justify-between font-semibold">
                            <span>Total before delivery</span>
                            <span>{formatCurrency(cartSubtotal)}</span>
                        </div>
                    </div>

                    {unavailableSellItems.length > 0 && (
                        <p role="alert" className="text-sm text-amber-700">
                            {autoMovingIds.length > 0
                                ? "Moving sold-out products to Saved for later…"
                                : "Sold-out products cannot be checked out. Remove unavailable items to continue."}
                        </p>
                    )}
                    {hasUnsavedGiftMessages && (
                        <p role="alert" className="text-sm text-amber-700">Please save your gift messages before checkout.</p>
                    )}
                    {hasUnavailableHamper && (
                        <p role="alert" className="text-sm text-rose-600">
                            Some gift hampers are unavailable. Please update
                            your cart before checkout.
                        </p>
                    )}

                    {/* ✅ LOGGED-IN USER */}
                    {isAuthenticated && (
                        <button
                            onClick={() => router.push("/checkout")}
                            disabled={
                                !hasItems ||
                                savingQuantityIds.length > 0 ||
                                hasUnsavedGiftMessages ||
                                savingItemId !== null ||
                                saving ||
                                deleting
                            }
                            className="site-button-primary w-full disabled:opacity-50"
                        >
                            Continue to Checkout
                        </button>
                    )}

                    {/* ⚠️ SECONDARY (LESS PROMINENT) */}
                    {!isAuthenticated && (
                        <button
                            onClick={() => router.push("/guest_checkout")}
                            disabled={
                                !hasItems ||
                                savingQuantityIds.length > 0 ||
                                hasUnsavedGiftMessages ||
                                savingItemId !== null ||
                                saving ||
                                deleting
                            }
                            className="site-button-primary w-full disabled:opacity-50"
                        >
                            Continue as Guest
                        </button>
                    )}

                    {/* 🌿 TRUST + BENEFITS */}
                    <div className="border-t pt-4 space-y-2 text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                            <span>🔒</span>
                            <span>Secure checkout</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span>🚚</span>
                            <span>Fast delivery across India</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span>🎁</span>
                            <span>Handmade with care</span>
                        </div>
                    </div>

                    {/* 🛍 CONTINUE SHOPPING */}
                    <button
                        onClick={() => router.push("/products")}
                        className="w-full text-sm text-emerald-700 hover:underline text-center"
                    >
                        ← Continue shopping
                    </button>
                </aside>

                {/* ================= SAVED FOR LATER (NOW FIXED POSITION) ================= */}
                {isAuthenticated && (
                    <div className="order-3 lg:col-span-1 mt-2 md:mt-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-md font-semibold text-gray-700">
                                Saved for later
                            </h3>
                            <div className="text-xs text-gray-400">
                                {savedLoading
                                    ? "Loading…"
                                    : `${savedItems.length} item${savedItems.length !== 1 ? "s" : ""}`}
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border p-4">
                            {savedLoading ? (
                                <div className="text-sm text-gray-500">
                                    Loading…
                                </div>
                            ) : savedItems.length === 0 ? (
                                <div className="text-sm text-gray-500 text-center py-6">
                                    No saved items yet
                                </div>
                            ) : (
                                <ul className="space-y-3">
                                    {savedItems.map((s) => (
                                        <li
                                            key={s._savedId ?? s.id}
                                            className={`flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 rounded-xl p-2 transition-colors ${
                                                isProductUnavailable({
                                                    ...s,
                                                    sellStockQuantity:
                                                        s.sellStockQuantity ??
                                                        savedStockOverrides[String(s.productId ?? s.id)] ??
                                                        null,
                                                })
                                                    ? "bg-slate-100 border border-slate-200"
                                                    : ""
                                            }`}
                                        >
                                            <div className="w-16 h-16 rounded-md overflow-hidden border bg-white">
                                                <Link
                                                    href={
                                                        s.productId
                                                            ? `/products/${s.productId}`
                                                            : "/products"
                                                    }
                                                    className="block w-full h-full"
                                                >
                                                    <SavedProductImage
                                                        src={s.img}
                                                        alt={s.title}
                                                        unavailable={isProductUnavailable({
                                                            ...s,
                                                            sellStockQuantity:
                                                                s.sellStockQuantity ??
                                                                savedStockOverrides[String(s.productId ?? s.id)] ??
                                                                null,
                                                        })}
                                                    />
                                                </Link>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className={`text-sm font-medium ${
                                                    isProductUnavailable({
                                                        ...s,
                                                        sellStockQuantity:
                                                            s.sellStockQuantity ??
                                                            savedStockOverrides[String(s.productId ?? s.id)] ??
                                                            null,
                                                    }) ? "text-slate-500" : "text-slate-900"
                                                }`}>
                                                    {s.title}
                                                </div>
                                                {isProductUnavailable({
                                                    ...s,
                                                    sellStockQuantity:
                                                        s.sellStockQuantity ??
                                                        savedStockOverrides[String(s.productId ?? s.id)] ??
                                                        null,
                                                }) && (
                                                    <span className="mt-1 inline-flex rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                                        Out of stock · Saved for later
                                                    </span>
                                                )}
                                                {typeof s.price ===
                                                    "number" && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {formatCurrency(
                                                            s.price,
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() =>
                                                        moveSavedToCart(s)
                                                    }
                                                    disabled={
                                                        saving ||
                                                        isProductUnavailable({
                                                            ...s,
                                                            sellStockQuantity:
                                                                s.sellStockQuantity ??
                                                                savedStockOverrides[String(s.productId ?? s.id)] ??
                                                                null,
                                                        })
                                                    }
                                                    title={isProductUnavailable({
                                                        ...s,
                                                        sellStockQuantity:
                                                            s.sellStockQuantity ??
                                                            savedStockOverrides[String(s.productId ?? s.id)] ??
                                                            null,
                                                    }) ? "Available again when stock returns" : "Move to cart"}
                                                    className="text-xs px-3 py-1 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Move to cart
                                                </button>

                                                <button
                                                    onClick={() =>
                                                        openSavedConfirm(s)
                                                    }
                                                    disabled={
                                                        saving || deletingSaved
                                                    }
                                                    className="text-xs px-3 py-1 rounded text-rose-600 hover:bg-rose-50"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <ConfirmModal
                open={confirmOpen}
                title="Remove item from cart?"
                description="This will remove the item from your cart. You can always add it back later."
                confirmLabel="Remove"
                cancelLabel="Keep item"
                loading={deleting}
                onConfirm={performDelete}
                onCancel={closeConfirmDialog}
            />

            <ConfirmModal
                open={confirmSavedOpen}
                title={
                    toDeleteSavedTitle
                        ? `Remove “${toDeleteSavedTitle}” from saved items?`
                        : "Remove saved item?"
                }
                description="This will remove the item from your saved list. You can always save it again later."
                confirmLabel="Remove"
                cancelLabel="Keep"
                loading={deletingSaved}
                onConfirm={performSavedDelete}
                onCancel={closeSavedConfirm}
            />

            {/* --------- Saved-exists modal (friendly popup) --------- */}
            {savedExistsModalOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setSavedExistsModalOpen(false)}
                    />
                    <div className="relative max-w-md w-full bg-white rounded-lg shadow-lg p-6 z-10">
                        <h3 className="text-lg font-semibold mb-2">
                            Already saved
                        </h3>
                        <p className="text-sm text-gray-700 mb-4">
                            {savedExistsTitle
                                ? `"${savedExistsTitle}"`
                                : "This item"}{" "}
                            is already in your <strong>Save for later</strong>{" "}
                            list.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setSavedExistsModalOpen(false);
                                    setSavedExistsTitle(undefined);
                                }}
                                className="px-4 py-2 rounded border"
                            >
                                Close
                            </button>
                            <button
                                onClick={async () => {
                                    // optionally navigate to saved items area
                                    setSavedExistsModalOpen(false);
                                    setSavedExistsTitle(undefined);
                                    // refresh saved items and cart to ensure sync
                                    await fetchSavedItems();
                                    await fetchCart();
                                }}
                                className="px-4 py-2 rounded bg-emerald-600 text-white"
                            >
                                View saved items
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}