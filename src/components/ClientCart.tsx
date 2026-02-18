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

/** Logged-Out UI component */
function LoggedOutState() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-xl font-semibold mb-2">
                    You’re not logged in
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                    Login or create an account to view your cart, save items,
                    and checkout faster.
                </p>

                <div className="flex flex-col gap-3">
                    <Link
                        href="/products"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-md"
                    >
                        Browse products
                    </Link>

                    <Link
                        href="/login"
                        className="w-full border px-4 py-3 rounded-md"
                    >
                        Login
                    </Link>

                    <Link
                        href="/register"
                        className="w-full border px-4 py-3 rounded-md"
                    >
                        Create account
                    </Link>
                </div>
            </div>
        </div>
    );
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
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [cart, setCart] = useState<Cart | null>(null);
    const [localCart, setLocalCart] = useState<Cart | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [savingItemId, setSavingItemId] = useState<string | null>(null);
    const [error, setError] = useState<string>("");

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

    const router = useRouter();

    // derived counts used for disabling checkout
    const totalItemsCount = isAuthenticated
        ? (localCart?.sellItems ?? []).reduce(
            (c, it) => c + (it.inUse === false ? 0 : Number(it.quantity ?? 0)),
            0
        )
        : 0;
    const hasItems = totalItemsCount > 0;

    function redirectToLogin(): void {
        logout("/login");
    }

    function clampCartQuantities(inCart: Cart | null): Cart | null {
        if (!inCart) return inCart;
        const copy: Cart = JSON.parse(JSON.stringify(inCart));
        copy.sellItems = (copy.sellItems ?? []).map((it) => {
            const stock = safeNumber(it.sellStockQuantity);
            const currentQty = Number(it.quantity ?? 1);
            if (stock === null) {
                return { ...it, quantity: Math.max(1, Math.floor(currentQty)) };
            }
            const clamped = Math.max(1, Math.min(Math.floor(currentQty), Math.max(0, Math.floor(stock))));
            return { ...it, quantity: clamped };
        });
        return copy;
    }

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
        if (!isAuthenticated) return;

        fetchCart();
        fetchSavedItems();
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) {
            setCart(null);
            setLocalCart(null);
            setSavedItems([]);
            setError("");
        }
    }, [isAuthenticated]);

    async function fetchCart(): Promise<void> {
        setLoading(true);
        setError("");
        try {
            const customerId = getStoredCustomerId();
            if (!customerId) {
                setLoading(false);
                return;
            }

            const res = await api.get(`/cart`);

            const json = res.data;

            const rawCart = Array.isArray(json.cartData)
                ? json.cartData[0]
                : json.cartData;

            const normalized = normalizeCartResponse(rawCart);
            console.log("RAW CART:", rawCart);
            console.log("NORMALIZED:", normalized);

            if (normalized) {
                setCart(normalized);
                setLocalCart(clampCartQuantities(normalized));
            } else {
                setCart(null);
                setLocalCart(null);
            }

        } catch (err: any) {
            console.error("fetchCart error:", err);

            setError(
                err?.response?.data?.error?.message ||
                err?.message ||
                "Unable to load cart"
            );
        } finally {
            setLoading(false);
        }
    }

    async function fetchSavedItems(): Promise<void> {
        setSavedLoading(true);
        setError("");
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

    function updateLocalItemById(itemId: string | undefined, patch: Partial<CartItem>): void {
        if (!itemId) return;
        setLocalCart((prev) => {
            if (!prev) return prev;
            const copy: Cart = JSON.parse(JSON.stringify(prev));
            const arr = copy.sellItems ?? [];
            const idx = arr.findIndex((a) => a._id === itemId);
            if (idx === -1) return prev;
            arr[idx] = { ...arr[idx], ...patch };
            return copy;
        });
        setCart((prev) => {
            if (!prev) return prev;
            const copy: Cart = JSON.parse(JSON.stringify(prev));
            const arr = copy.sellItems ?? [];
            const idx = arr.findIndex((a) => a._id === itemId);
            if (idx === -1) return prev;
            arr[idx] = { ...arr[idx], ...(patch as CartItem) };
            return copy;
        });
    }

    async function saveItem(cartObject: Cart | null, item: CartItem): Promise<void> {
        const cartId = cartObject?._id ?? cartObject?.cartId;
        if (!cartId) {
            setError("Cart identifier is missing.");
            console.warn("saveItem aborted - no cart id", { cartObject, item });
            return;
        }
        setSaving(true);
        setError("");
        try {
            const result = await updateCartItem(cartId, String(item._id), Number(item.quantity ?? 1), "SELL");
            if (!result?.success) {
                throw new Error(result?.message || "Failed to update item");
            }
        } catch (err: any) {
            if (err?.message === "Auth required") {
                redirectToLogin();
                return;
            }
            console.error("saveItem error:", err);
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
        const cartId = cart?._id ?? cart?.cartId;
        if (!cartId) {
            setError("Cart not initialized yet.");
            closeConfirmDialog();
            return;
        }

        if (!toDeleteItemId) {
            setError("No item selected for deletion.");
            closeConfirmDialog();
            return;
        }

        setDeleting(true);
        setError("");
        try {
            const result = await removeFromCart(cartId, toDeleteItemId, "SELL");
            if (!result?.success) throw new Error(result?.message || "Failed to delete item");
            await fetchCart();
            closeConfirmDialog();
        } catch (err: any) {
            if (err?.message === "Auth required") {
                redirectToLogin();
                return;
            }
            console.error("performDelete error:", err);
            setError(err?.message || "Unable to delete item");
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

        const cartId = cart?._id ?? cart?.cartId;
        if (!cartId) {
            setError("Cart not initialized yet.");
            return;
        }
        if (!cartId) {
            setError("Cart identifier missing - cannot update quantity.");
            return;
        }

        setSavingItemId(itemId);
        try {
            const result = await updateCartItem(cartId, String(itemId), qty, "SELL");
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
    }

    /* ---------------- Save-for-later actions (with ApiError handling) ---------------- */

    async function saveForLater(itemId?: string): Promise<void> {
        if (!itemId || !localCart) return;
        const idx = (localCart.sellItems ?? []).findIndex((s) => s._id === itemId);
        if (idx === -1) return;
        const item = localCart.sellItems![idx];

        const customerId = getStoredCustomerId();
        const cartId = cart?._id ?? cart?.cartId;
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
            const cp: Cart = JSON.parse(JSON.stringify(prev));
            cp.sellItems = (cp.sellItems ?? []).filter((s) => s._id !== itemId);
            return cp;
        });
        setCart((prev) => {
            if (!prev) return prev;
            const cp: Cart = JSON.parse(JSON.stringify(prev));
            cp.sellItems = (cp.sellItems ?? []).filter((s) => s._id !== itemId);
            return cp;
        });

        setSaving(true);
        setError("");
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

        const cartId = cart?._id ?? cart?.cartId;
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
        setError("");
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
        setError("");
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
        setError("");
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
    function EmptyIllustration() {
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
                <p className="text-sm text-gray-500 mt-2">When you add items, they’ll show up here. Ready to find something lovely?</p>
                <div className="mt-4 flex justify-center gap-3">
                    <a href="/products" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md shadow">
                        Browse products
                    </a>
                    <a href="/" className="inline-flex items-center gap-2 border px-4 py-2 rounded-md">
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

    // NOT logged in → show login / register CTA
    if (!loading && !isAuthenticated) {
        return <LoggedOutState />;
    }

    if (!loading && localCart && Array.isArray(localCart.sellItems) && localCart.sellItems.length === 0) {
        return (
            <div className="p-8">
                <EmptyIllustration />
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-start">
                <section className="order-1 md:order-none md:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-lg p-5">
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
                                {/* MOBILE VIEW */}
                                <div className="space-y-4 md:hidden">
                                    {localCart!.sellItems!
                                        .filter((it) => it.inUse !== false)
                                        .map((item) => (
                                            <MobileCartItem
                                                key={item._id}
                                                item={item}
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

                                {/* DESKTOP VIEW */}
                                <div className="hidden md:block bg-white rounded-xl shadow-lg overflow-hidden">
                                    {localCart!.sellItems!
                                        .filter((it) => it.inUse !== false)
                                        .map((item) => (
                                            <DesktopCartItem
                                                key={item._id}
                                                item={item}
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

                <aside className="order-2 md:order-none bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-5 md:sticky md:top-6">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-lg">Summary</h4>
                        <div className="text-sm text-gray-500">Ready when you are</div>
                    </div>

                    <div className="mt-4 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span>Items</span>
                            <span className="font-medium">{totalItemsCount}</span>
                        </div>

                        <div className="border-t pt-3 mt-3 flex justify-between font-medium">
                            <span>Total</span>
                            <span>{formatCurrency(orderTotal(localCart?.sellItems))}</span>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                if (!hasItems) return;
                                try {
                                    router.push("/checkout");
                                } catch {
                                    window.location.href = "/checkout";
                                }
                            }}
                            disabled={!hasItems || loading || saving}
                            aria-disabled={!hasItems || loading || saving}
                            className={`w-full inline-flex items-center justify-center gap-2 text-white px-4 py-3 rounded-md shadow
                ${hasItems && !loading && !saving ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-400 cursor-not-allowed opacity-60"}`}
                        >
                            Proceed to Checkout
                        </button>

                        <a href="/products" className="w-full inline-flex items-center justify-center gap-2 border px-4 py-3 rounded-md text-center">
                            Continue shopping
                        </a>
                    </div>

                    <p className="text-xs text-gray-500 mt-4">Quantities update automatically when changed. Final price will be calculated at checkout.</p>
                </aside>

                {/* Saved for later */}
                <div className="order-3 md:order-none md:col-span-2 bg-white rounded-xl shadow-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Saved for later</h3>
                        <div className="text-sm text-gray-500">
                            {savedLoading
                                ? "Loading…"
                                : `${savedItems.length} item${savedItems.length !== 1 ? "s" : ""}`}
                        </div>
                    </div>

                    {savedLoading ? (
                        <div className="text-sm text-gray-500">Loading saved items…</div>
                    ) : savedItems.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            You don’t have any saved items.
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {savedItems.map((s) => (
                                <li
                                    key={s._savedId ?? s.id}
                                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-3"
                                >
                                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-white border">
                                        <Link
                                            href={
                                                s.productId
                                                    ? `/products/${s.productId}`
                                                    : "/products"
                                            }
                                            className="block w-full h-full"
                                        >
                                            <Image
                                                src={s.img ?? "/placeholder-80x80.png"}
                                                alt={s.title}
                                                width={80}
                                                height={80}
                                                className="object-cover"
                                            />
                                        </Link>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">
                                            {s.title}
                                        </div>
                                        <div className="text-sm text-gray-500 mt-1">
                                            {typeof s.price === "number"
                                                ? formatCurrency(s.price)
                                                : ""}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => moveSavedToCart(s)}
                                            disabled={saving}
                                            className="px-3 py-1 rounded bg-white border hover:shadow-sm"
                                        >
                                            Move to cart
                                        </button>
                                        <button
                                            onClick={() => openSavedConfirm(s)}
                                            disabled={saving || deletingSaved}
                                            className="px-3 py-1 rounded border text-rose-600 hover:bg-rose-50"
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