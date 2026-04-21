"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { getStoredAccessToken, getAuth, logout } from "@/lib/auth";
import MobileCartItem from "@/components/ui/MobileCartItem";
import DesktopCartItem from "@/components/ui/DesktopCartItem";

// adjust these imports if your project paths differ
import { updateCartItem, removeFromCart } from "@/lib/cart";
import ConfirmModal from "@/components/ui/ConfirmModal";

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
};

/* ---------------- Helpers ---------------- */
function safeNumber(v: any): number | null {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return v;
    const n = Number(String(v).replace(/[^\d.-]+/g, ""));
    return Number.isFinite(n) ? n : null;
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
        sellItems: Array.isArray(raw.sellItems)
            ? raw.sellItems.map((si: any) => {
                const p = si.product ?? {};
                const priceObj: PriceShape | null = p.price
                    ? {
                        priceId: p.price.priceId,
                        actualPrice: safeNumber(p.price.actualPrice),
                        discountedPrice: safeNumber(p.price.discountedPrice),
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
                        p.productName ?? p.name ?? (typeof p.productNumber !== "undefined" ? `Product #${p.productNumber}` : null),
                    sellStockQuantity: p.sellStockQuantity ?? null,
                    isAvailableForSale: typeof p.isAvailableForSale === "boolean" ? p.isAvailableForSale : null,
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

    if (json.ack === "failure" && json.error && typeof json.error === "object") {
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
        const res = await api.get(
            `/customer/${customerId}/saved_product`
        );

        const json = res.data;

        const arr =
            Array.isArray(json?.savedData)
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

            return {
                id: product?._id ?? s._id,
                title: product?.productName ?? s.title ?? "Untitled",
                price: product?.price?.discountedPrice ?? product?.price?.actualPrice,
                img: product?.productImage ?? s.img ?? null,
                _savedId: s._id,
                productId: product?._id,
            } as SavedItem;
        });

    } catch (error: any) {
        throw new ApiError(
            error?.response?.data?.error?.message ||
            error?.message ||
            "Failed to fetch saved",
            error?.response?.data?.error?.code,
            error?.response?.data
        );
    }
}

async function apiAddSaved(customerId: string, product: any) {
    try {
        const res = await api.post(
            `/customer/${customerId}/saved_product`,
            {
                productId: product.productId ?? product.id,
            }
        );

        return res.data;

    } catch (error: any) {
        throw new ApiError(
            error?.response?.data?.error?.message ||
            error?.message ||
            "Unable to save item",
            error?.response?.data?.error?.code,
            error?.response?.data
        );
    }
}

async function apiDeleteSaved(customerId: string, savedId: string) {
    try {
        const res = await api.delete(
            `/customer/saved_product/${savedId}`
        );
        return res.data;
    } catch (error: any) {
        throw new ApiError(
            error?.response?.data?.error?.message ||
            error?.message ||
            "Unable to delete saved item",
            error?.response?.data?.error?.code,
            error?.response?.data
        );
    }
}

async function apiDeleteSavedByProduct(customerId: string, productId: string) {
    try {
        const res = await api.delete(
            `/customer/${customerId}/saved_product`,
            {
                params: { productId }
            }
        );

        return res.data;

    } catch (error: any) {
        throw new ApiError(
            error?.response?.data?.error?.message ||
            error?.message ||
            "Unable to delete saved item by product",
            error?.response?.data?.error?.code,
            error?.response?.data
        );
    }
}

/* ---------------- Component ---------------- */
export default function ClientCart() {
    const fetchIdRef = React.useRef(0);
    const qtyTimeoutRef = React.useRef<any>(null);

    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [localCart, setLocalCart] = useState<Cart | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [savingItemId, setSavingItemId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
    const [savedLoading, setSavedLoading] = useState<boolean>(false);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [toDeleteItemId, setToDeleteItemId] = useState<string | undefined>(undefined);
    const [deleting, setDeleting] = useState(false);

    const [confirmSavedOpen, setConfirmSavedOpen] = useState(false);
    const [toDeleteSavedId, setToDeleteSavedId] = useState<string | undefined>(undefined);
    const [deletingSaved, setDeletingSaved] = useState(false);
    const [toDeleteSavedTitle, setToDeleteSavedTitle] = useState<string | undefined>(undefined);

    // NEW: modal for "already saved" message
    const [savedExistsModalOpen, setSavedExistsModalOpen] = useState(false);
    const [savedExistsTitle, setSavedExistsTitle] = useState<string | undefined>(undefined);

    // ===== Coupon suggestion (guest only) =====
    const [bestCoupon, setBestCoupon] = useState<any>(null);
    const [couponLoading, setCouponLoading] = useState(false);

    const router = useRouter();

    const guestCartLoading = React.useRef(false);

    // derived counts used for disabling checkout
    const totalItemsCount =
        (localCart?.sellItems ?? []).reduce(
            (sum, it) => sum + Number(it.quantity ?? 1),
            0
        )
    const hasItems = totalItemsCount > 0;

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

                if (stock === null) {
                    return { ...it, quantity: Math.max(1, Math.floor(currentQty)) };
                }

                const clamped = Math.max(
                    1,
                    Math.min(Math.floor(currentQty), Math.max(0, Math.floor(stock)))
                );

                return { ...it, quantity: clamped };
            }),
        };
    }

    useEffect(() => {
        return () => {
            if (qtyTimeoutRef.current) {
                clearTimeout(qtyTimeoutRef.current);
            }
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
                await syncGuestCartToServer()

                await fetchCart()
                fetchSavedItems()
            } else {
                loadGuestCart()
            }
        }

        init()
    }, [isAuthenticated])

    useEffect(() => {
        const reload = () => {

            const token = getStoredAccessToken()

            if (!token) {
                loadGuestCart()
            } else {
                fetchCart()
            }
        }

        window.addEventListener("cartChanged", reload)

        return () => {
            window.removeEventListener("cartChanged", reload)
        }
    }, [])

    // ===== Fetch best coupon for guest users =====
    useEffect(() => {
        async function fetchCouponSuggestion() {

            if (isAuthenticated) {
                setBestCoupon(null);
                return;
            }

            const subtotal = orderTotal(localCart?.sellItems);

            if (!subtotal || subtotal <= 0) {
                setBestCoupon(null);
                return;
            }

            setCouponLoading(true);

            try {
                const res = await api.get(
                    `/coupon/suggestions?subtotal=${Math.floor(subtotal)}`
                );

                const data = res.data;

                if (data?.success && data?.bestCoupon?.valid) {
                    setBestCoupon(data.bestCoupon);
                } else {
                    setBestCoupon(null);
                }

            } catch (err) {
                console.error("Coupon suggestion error:", err);
                setBestCoupon(null);
            } finally {
                setCouponLoading(false);
            }
        }

        fetchCouponSuggestion();

    }, [localCart, isAuthenticated]);

    async function fetchCart(): Promise<void> {
        const fetchId = ++fetchIdRef.current;

        setLoading(true);
        setError(null);

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
                "Unable to load cart"
            );
        } finally {
            if (fetchId === fetchIdRef.current) {
                setLoading(false);
            }
        }
    }

    async function fetchSavedItems(): Promise<void> {
        setSavedLoading(true);
        setError(null);
        try {
            const customerId = getStoredCustomerId();
            if (!customerId) {
                setSavedItems([]);
                setSavedLoading(false);
                return;
            }
            const items = await apiGetSaved(customerId);
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

            const raw = localStorage.getItem("wcm_guest_cart_v1")
            if (!raw) {
                setLocalCart(null)
                return
            }

            let items: any[] = []

            try {
                items = JSON.parse(raw)
            } catch {
                window.dispatchEvent(new Event("cartChanged"));
                localStorage.removeItem("wcm_guest_cart_v1")
                setLocalCart(null)
                return
            }

            if (!Array.isArray(items) || items.length === 0) {
                setLocalCart({ _id: "guest", sellItems: [] })
                return
            }

            const ids = [...new Set(items.map((i: any) => i.productId))].join(",")

            const res = await api.get(`/product/sell?ids=${ids}`)

            const products = Array.isArray(res.data?.productData)
                ? res.data.productData
                : []

            const sellItems = products
                .filter((p: any) =>
                    items.some((i: any) => String(i.productId) === String(p._id))
                )
                .map((p: any) => {

                    const cartItem = items.find(
                        (i: any) => String(i.productId) === String(p._id)
                    )

                    return {
                        _id: p._id,
                        productId: p._id,
                        quantity: cartItem?.quantity ?? 1,
                        inUse: true,
                        imagePath: p.productImage,
                        thumbnail: p.productImage,
                        productPublicName: p.productName,
                        sellStockQuantity: p.sellStockQuantity,
                        price: {
                            actualPrice: p.latestSalePrice?.actualPrice,
                            discountedPrice: p.latestSalePrice?.discountedPrice
                        }
                    }

                })

            const validIds = new Set(products.map((p: any) => String(p._id)))

            const cleanedItems = items.filter((i: any) =>
                validIds.has(String(i.productId))
            )

            // FIX: remove invalid productIds
            if (cleanedItems.length !== items.length) {
                console.warn("Removed invalid cart items:", items.filter(i => !validIds.has(String(i.productId))))
            }

            localStorage.setItem("wcm_guest_cart_v1", JSON.stringify(cleanedItems))

            setLocalCart({
                _id: "guest",
                sellItems
            })

        } catch (err) {
            console.error("Invalid guest cart", err)
        } finally {
            guestCartLoading.current = false
        }
    }

    async function syncGuestCartToServer() {

        const raw = localStorage.getItem("wcm_guest_cart_v1")
        if (!raw) return

        try {

            let items: any[] = []

            try {
                items = JSON.parse(raw)
            } catch {
                localStorage.removeItem("wcm_guest_cart_v1")
                closeConfirmDialog()
                return
            }

            if (!items.length) {
                localStorage.removeItem("wcm_guest_cart_v1")
                return
            }

            await Promise.all(
                items.map((item) =>
                    api.post("/cart", {
                        productId: item.productId,
                        quantity: item.quantity,
                        type: "SELL",
                    })
                )
            );

            localStorage.removeItem("wcm_guest_cart_v1")

            window.dispatchEvent(new Event("cartChanged"));

        } catch (err) {
            console.error("Guest cart sync failed", err)
        }
    }

    function updateLocalItemById(itemId: string | undefined, patch: Partial<CartItem>): void {
        if (!itemId) return;

        setLocalCart((prev) => {
            if (!prev) return prev;

            const updatedItems = prev.sellItems?.map((item) =>
                item._id === itemId ? { ...item, ...patch } : item
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
                "SELL"
            );

            if (!result?.success) {
                throw new Error(result?.message || "Failed to update item");
            }

            window.dispatchEvent(new Event("cartChanged"));

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

        const token = getStoredAccessToken()

        // GUEST CART DELETE
        if (!token) {

            const raw = localStorage.getItem("wcm_guest_cart_v1")
            if (!raw) return

            let items: any[] = []

            try {
                items = JSON.parse(raw)
            } catch {
                localStorage.removeItem("wcm_guest_cart_v1")
                closeConfirmDialog()
                return
            }

            const item = localCart?.sellItems?.find(
                (it) => String(it._id) === String(toDeleteItemId)
            );

            const filtered = items.filter(
                (i: any) => String(i.productId) !== String(item?.productId)
            );

            localStorage.setItem("wcm_guest_cart_v1", JSON.stringify(filtered))

            setLocalCart(prev => {
                if (!prev) return prev

                return {
                    ...prev,
                    sellItems: prev.sellItems?.filter(
                        (it) => it._id !== toDeleteItemId
                    )
                }
            })

            window.dispatchEvent(new Event("cartChanged"));
            closeConfirmDialog()

            return
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
                (it) => String(it._id) === String(toDeleteItemId)
            );

            if (!item?.productId) {
                setError("Product not found for deletion.");
                closeConfirmDialog();
                return;
            }

            // 1. Optimistic UI update
            setLocalCart(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    sellItems: prev.sellItems?.filter(
                        (it) => String(it._id) !== String(toDeleteItemId)
                    )
                };
            });

            // 2. ACTUAL API CALL (this was missing ❌)
            const result = await removeFromCart(
                cartId,
                String(toDeleteItemId),
                String(item.productId),
                "SELL"
            );

            if (!result?.success) {
                throw new Error(result?.message || "Delete failed");
            }

            // 3. notify other components (header, product cards)
            window.dispatchEvent(new Event("cartChanged"));

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

    async function deleteItem(cartObject: Cart | null, itemId?: string): Promise<void> {
        openConfirmDialog(itemId);
    }

    function lineTotal(item?: CartItem): number {
        const qty = item?.quantity ?? 0;
        const price = item?.price?.discountedPrice ?? item?.price?.actualPrice ?? 0;
        return (Number(qty) || 0) * (Number(price) || 0);
    }

    function orderTotal(items?: CartItem[] | undefined): number {
        return (items ?? []).reduce((sum, it) => sum + lineTotal(it), 0);
    }

    async function handleQuantityChangeById(itemId: string | undefined, requestedQty: number) {
        if (!itemId) return;
        if (!localCart) return;

        const arr = localCart.sellItems ?? [];
        const idxInFull = arr.findIndex((s) => s._id === itemId);
        if (idxInFull === -1) return;

        const item = arr[idxInFull];
        const stock = safeNumber(item.sellStockQuantity);

        let qty = Math.max(1, Math.floor(requestedQty));

        if (stock !== null) {
            const maxAllowed = Math.max(0, Math.floor(stock));
            qty = Math.min(qty, Math.max(1, maxAllowed));
        }

        updateLocalItemById(itemId, { quantity: qty });

        const token = getStoredAccessToken()

        // GUEST CART QUANTITY UPDATE
        if (!token) {

            const raw = localStorage.getItem("wcm_guest_cart_v1")
            if (!raw) return

            let items: any[] = []

            try {
                items = JSON.parse(raw)
            } catch {
                localStorage.removeItem("wcm_guest_cart_v1")
                closeConfirmDialog()
                return
            }

            const index = items.findIndex(
                (i: any) => String(i.productId) === String(item?.productId)
            )

            if (index >= 0) {
                items[index].quantity = qty
                localStorage.setItem("wcm_guest_cart_v1", JSON.stringify(items))

                window.dispatchEvent(new Event("cartChanged"));
            }

            return
        }

        // SERVER CART QUANTITY UPDATE
        const cartId = localCart?._id ?? localCart?.cartId

        if (!cartId) {
            setError("Cart not initialized yet.")
            return
        }

        setSavingItemId(itemId)

        clearTimeout(qtyTimeoutRef.current);

        qtyTimeoutRef.current = setTimeout(async () => {
            try {
                const result = await updateCartItem(
                    cartId,
                    String(itemId),
                    String(item.productId),
                    qty,
                    "SELL"
                );

                if (!result?.success) {
                    throw new Error(result?.message || "Failed to update quantity");
                }
            } catch (err: any) {
                console.error("handleQuantityChangeById error:", err);
                setError(err?.message || "Unable to update quantity");
                await fetchCart();
            } finally {
                setSavingItemId(null);
            }
        }, 300);
    }

    /* ---------------- Save-for-later actions (with ApiError handling) ---------------- */

    async function saveForLater(itemId?: string): Promise<void> {
        if (!itemId || !localCart) return;
        const idx = (localCart.sellItems ?? []).findIndex((s) => s._id === itemId);
        if (idx === -1) return;
        const item = localCart.sellItems![idx];

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

        // Optimistically remove locally so UI feels snappy
        setLocalCart((prev) => {
            if (!prev) return prev;
            const cp: Cart = {
                ...prev,
                sellItems: prev.sellItems?.map(i => ({ ...i })) ?? []
            };
            cp.sellItems = (cp.sellItems ?? []).filter((s) => s._id !== itemId);
            return cp;
        });

        setSaving(true);
        setError(null);
        try {
            const priceVal: number | undefined =
                typeof item.price?.discountedPrice === "number"
                    ? item.price!.discountedPrice
                    : typeof item.price?.actualPrice === "number"
                        ? item.price!.actualPrice
                        : undefined;

            await apiAddSaved(customerId, {
                id: item.productId ?? item._id,
                productId: item.productId,
                productPublicName: item.productPublicName ?? undefined,
                price: priceVal,
                image: item.imagePath ?? item.thumbnail ?? null,
            });

            await Promise.all([fetchCart(), fetchSavedItems()]);
        } catch (err: any) {
            console.error("saveForLater error:", err);

            // If this is our ApiError (contains server message and code), show that message.
            if (err instanceof ApiError) {
                // If server says 'already exists' (code 1003) - show friendly popup
                if (err.code === 1003 || String(err.code) === "1003") {
                    // open a friendly modal instead of showing raw ApiError
                    setSavedExistsTitle(item.productPublicName ?? item.productId ?? "This item");
                    setSavedExistsModalOpen(true);

                    // re-sync state from server so optimistic removal is undone
                    await fetchCart();
                    await fetchSavedItems();
                    return;
                }

                // For other ApiError codes, show message banner
                setError(err.message || "Could not save item for later");
                await fetchCart();
                await fetchSavedItems();
                return;
            }

            // generic fallback
            setError(err?.message || "Could not save item for later");

            // restore state
            await fetchCart();
            await fetchSavedItems();
        } finally {
            setSaving(false);
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

        setSaving(true);
        setError(null);
        try {
            const productId = saved.productId ?? saved.id;
            if (!productId) throw new Error("Product ID missing for saved item.");

            const body = {
                type: "SELL",
                itemId: productId,
                productId: productId,
                quantity: 1,
            };

            await api.put(
                `/cart/${cartId}/move_to_cart`,
                body
            );

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
            console.warn("performSavedDelete direct delete failed, trying fallback by productId:", err);
            try {
                await apiDeleteSavedByProduct(customerId, String(toDeleteSavedId));
                await fetchSavedItems();
                closeSavedConfirm();
            } catch (err2: any) {
                console.error("performSavedDelete fallback also failed:", err2);
                setError(err2 instanceof ApiError ? err2.message : err2?.message || "Unable to delete saved item");
            }
        } finally {
            setDeletingSaved(false);
        }
    }

    /* ---------------- UI helpers ---------------- */
    function EmptyIllustration({ isAuthenticated }: { isAuthenticated: boolean }) {
        return (
            <div className="max-w-sm mx-auto text-center">
                <svg width="180" height="120" viewBox="0 0 180 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
                    <rect x="8" y="28" width="164" height="72" rx="8" fill="#F3F4F6" />
                    <rect x="20" y="40" width="60" height="40" rx="6" fill="#FFFFFF" />
                    <rect x="92" y="40" width="60" height="40" rx="6" fill="#FFFFFF" />
                    <circle cx="50" cy="60" r="6" fill="#E5E7EB" />
                    <circle cx="122" cy="60" r="6" fill="#E5E7EB" />
                </svg>

                <h3 className="text-lg font-semibold">Your cart is empty</h3>

                <p className="text-sm text-gray-500 mt-2">
                    When you add items, they’ll show up here. Ready to find something lovely?
                </p>

                {/* 👇 SHOW ONLY FOR GUEST USERS */}
                {!isAuthenticated && (
                    <p className="text-xs text-gray-400 mt-3">
                        Login to save your cart across devices
                    </p>
                )}

                <div className="mt-4 flex justify-center gap-3">
                    <a href="/products" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md shadow">
                        Browse products
                    </a>
                    <a href="/products" className="inline-flex items-center gap-2 border px-4 py-2 rounded-md">
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
                    <div key={i} className="flex gap-4 items-center animate-pulse bg-white rounded-lg p-4 shadow-sm">
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
            !Array.isArray(localCart.sellItems) ||
            localCart.sellItems.length === 0)
    ) {
        return (
            <div className="p-8">
                <EmptyIllustration isAuthenticated={isAuthenticated} />
            </div>
        );
    }

    return (
        <>
            {/* Error banner */}
            {error ? (
                <div className="max-w-4xl mx-auto mb-4">
                    <div className="rounded-md bg-rose-50 border border-rose-100 text-rose-800 px-4 py-2 text-sm">
                        {error}
                    </div>
                </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-start pb-24 md:pb-0">
                <section className="order-1 md:order-0 md:col-span-2 space-y-6">

                    {/* ================= CART ================= */}
                    <div className="bg-white rounded-xl shadow-lg p-5 order-1 md:order-none">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Items in your cart</h3>
                        </div>

                        {(localCart?.sellItems ?? []).filter((it) => it.inUse !== false).length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <p>No sell items in your cart.</p>
                                <a
                                    href="/products"
                                    className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                                >
                                    Shop Now
                                </a>
                            </div>
                        ) : (
                            <>
                                {/* MOBILE */}
                                <div className="space-y-4 md:hidden">
                                    {localCart!.sellItems!
                                        .filter((it) => it.inUse !== false)
                                        .map((item) => (
                                            <MobileCartItem
                                                key={item._id ?? item.productId}
                                                item={item}
                                                disabled={savingItemId === item._id}
                                                onIncrease={() =>
                                                    handleQuantityChangeById(item._id, (item.quantity ?? 1) + 1)
                                                }
                                                onDecrease={() =>
                                                    handleQuantityChangeById(item._id, (item.quantity ?? 1) - 1)
                                                }
                                                onRemove={() => openConfirmDialog(item._id)}
                                                onSave={() => saveForLater(item._id)}
                                                lineTotal={lineTotal(item)}
                                                formatCurrency={formatCurrency}
                                            />
                                        ))}
                                </div>

                                {/* DESKTOP */}
                                <div className="hidden md:block bg-white rounded-xl shadow-lg overflow-hidden">
                                    {localCart!.sellItems!
                                        .filter((it) => it.inUse !== false)
                                        .map((item) => (
                                            <DesktopCartItem
                                                key={item._id ?? item.productId}
                                                item={item}
                                                disabled={savingItemId === item._id}
                                                onIncrease={() =>
                                                    handleQuantityChangeById(item._id, (item.quantity ?? 1) + 1)
                                                }
                                                onDecrease={() =>
                                                    handleQuantityChangeById(item._id, (item.quantity ?? 1) - 1)
                                                }
                                                onRemove={() => openConfirmDialog(item._id)}
                                                onSave={() => saveForLater(item._id)}
                                                lineTotal={lineTotal(item)}
                                                formatCurrency={formatCurrency}
                                            />
                                        ))}
                                </div>
                            </>
                        )}
                    </div>
                </section>

                <aside className="bg-white rounded-xl shadow p-5 md:sticky md:top-6 space-y-5">

                    {/* Title */}
                    <h4 className="font-semibold text-lg">Order Summary</h4>

                    {/* Pricing */}
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span>Items ({totalItemsCount})</span>
                            <span>{formatCurrency(orderTotal(localCart?.sellItems))}</span>
                        </div>

                        <div className="flex justify-between text-gray-500">
                            <span>Delivery</span>
                            <span className="text-xs">Calculated at Checkout</span>
                        </div>

                        <div className="border-t pt-2 flex justify-between font-semibold">
                            <span>Total</span>
                            <span>{formatCurrency(orderTotal(localCart?.sellItems))}</span>
                        </div>
                    </div>

                    {/* 🔥 DISCOUNT HOOK (KEY CHANGE) */}
                    {!isAuthenticated && bestCoupon && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">

                            <div className="text-2xl mb-1">🎁</div>

                            <p className="text-sm text-gray-600">
                                You're eligible for a discount!
                            </p>

                            <p className="text-xl font-bold text-emerald-700">
                                Save {formatCurrency(bestCoupon.discountAmount)}
                            </p>

                            <p className="text-xs text-gray-500 mt-1">
                                Code: <span className="font-semibold">{bestCoupon.coupon.code}</span>
                            </p>

                            {/* 🔥 PRIMARY CTA (LOGIN) */}
                            <button
                                onClick={() => router.push("/login?redirect=/checkout")}
                                className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-medium shadow"
                            >
                                Unlock Discount & Checkout
                            </button>

                            <p className="text-[11px] text-gray-400 mt-2">
                                Login required to apply discount
                            </p>
                        </div>
                    )}

                    {/* ✅ LOGGED-IN USER */}
                    {isAuthenticated && (
                        <button
                            onClick={() => router.push("/checkout")}
                            disabled={!hasItems}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-medium"
                        >
                            Continue to Checkout
                        </button>
                    )}

                    {/* ⚠️ SECONDARY (LESS PROMINENT) */}
                    {!isAuthenticated && (
                        <button
                            onClick={() => router.push("/guest_checkout")}
                            disabled={!hasItems}
                            className="w-full py-2 rounded-md text-sm text-white bg-[rgb(6,89,117)] hover:bg-blue-700"
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
                    <div className="order-3 md:order-none md:col-span-2 md:max-w-2xl mt-2 md:mt-4">

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
                                <div className="text-sm text-gray-500">Loading…</div>
                            ) : savedItems.length === 0 ? (
                                <div className="text-sm text-gray-500 text-center py-6">
                                    No saved items yet
                                </div>
                            ) : (
                                <ul className="space-y-3">
                                    {savedItems.map((s) => (
                                        <li
                                            key={s._savedId ?? s.id}
                                            className="flex items-center gap-4"
                                        >
                                            <div className="w-16 h-16 rounded-md overflow-hidden border bg-white">
                                                <Link
                                                    href={s.productId ? `/products/${s.productId}` : "/products"}
                                                    className="block w-full h-full"
                                                >
                                                    <Image
                                                        src={s.img ?? "/placeholder-80x80.png"}
                                                        alt={s.title}
                                                        width={64}
                                                        height={64}
                                                        className="object-cover"
                                                    />
                                                </Link>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium truncate">
                                                    {s.title}
                                                </div>
                                                {typeof s.price === "number" && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {formatCurrency(s.price)}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => moveSavedToCart(s)}
                                                    disabled={saving}
                                                    className="text-xs px-3 py-1 rounded border hover:bg-gray-50"
                                                >
                                                    Move to cart
                                                </button>

                                                <button
                                                    onClick={() => openSavedConfirm(s)}
                                                    disabled={saving || deletingSaved}
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
                title={toDeleteSavedTitle ? `Remove “${toDeleteSavedTitle}” from saved items?` : "Remove saved item?"}
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
                    <div className="absolute inset-0 bg-black/40" onClick={() => setSavedExistsModalOpen(false)} />
                    <div className="relative max-w-md w-full bg-white rounded-lg shadow-lg p-6 z-10">
                        <h3 className="text-lg font-semibold mb-2">Already saved</h3>
                        <p className="text-sm text-gray-700 mb-4">
                            {savedExistsTitle ? `"${savedExistsTitle}"` : "This item"} is already in your <strong>Save for later</strong> list.
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