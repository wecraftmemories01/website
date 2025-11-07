"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

// adjust these imports if your project paths differ
import { addToCart, updateCartItem, removeFromCart } from "@/lib/cart";
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

/* ---------------- Config / Auth helpers ---------------- */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3000";
const TOKEN_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";
const CUSTOMER_KEY = "customerId";

function getStoredAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}
function getStoredRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    try {
        return localStorage.getItem(REFRESH_KEY);
    } catch {
        return null;
    }
}
function getStoredCustomerId(): string | null {
    if (typeof window === "undefined") return null;
    try {
        return localStorage.getItem(CUSTOMER_KEY);
    } catch {
        return null;
    }
}
function clearAuthStorage(): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
    } catch { }
}
function storeAuthTokens(payload: { accessToken: string; refreshToken?: string }) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(TOKEN_KEY, payload.accessToken);
        if (payload.refreshToken) localStorage.setItem(REFRESH_KEY, payload.refreshToken);
    } catch { }
}

async function refreshAccessToken(): Promise<boolean> {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
        console.debug("[auth] no refresh token available");
        return false;
    }
    try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
            console.warn("[auth] refresh endpoint returned non-ok:", res.status);
            return false;
        }
        const data = await res.json().catch(() => null);
        if (!data || !data.accessToken) {
            console.warn("[auth] refresh response missing accessToken:", data);
            return false;
        }
        storeAuthTokens({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken ?? refreshToken,
        });
        return true;
    } catch (err) {
        console.error("[auth] refreshAccessToken error:", err);
        return false;
    }
}

async function authFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    let token = getStoredAccessToken();
    const headers = new Headers(init?.headers ?? {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (!headers.get("Content-Type")) headers.set("Content-Type", "application/json");

    let res = await fetch(input, { ...init, headers });

    if (res.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            const retryToken = getStoredAccessToken();
            const retryHeaders = new Headers(init?.headers ?? {});
            if (retryToken) retryHeaders.set("Authorization", `Bearer ${retryToken}`);
            if (!retryHeaders.get("Content-Type")) retryHeaders.set("Content-Type", "application/json");
            return fetch(input, { ...init, headers: retryHeaders });
        } else {
            clearAuthStorage();
            throw new Error("Auth required");
        }
    }

    if (res.status >= 400 && res.status < 500) {
        try {
            const maybeJson = await res.clone().json().catch(() => null);
            const msg = ((maybeJson?.message || maybeJson?.error || "") + "").toString().toLowerCase();
            if (msg.includes("invalid token") || msg.includes("token expired") || msg.includes("unauthorized")) {
                const refreshed = await refreshAccessToken();
                if (refreshed) {
                    const retryToken = getStoredAccessToken();
                    const retryHeaders = new Headers(init?.headers ?? {});
                    if (retryToken) retryHeaders.set("Authorization", `Bearer ${retryToken}`);
                    if (!retryHeaders.get("Content-Type")) retryHeaders.set("Content-Type", "application/json");
                    return fetch(input, { ...init, headers: retryHeaders });
                } else {
                    clearAuthStorage();
                    throw new Error("Auth required");
                }
            }
        } catch {
            // ignore
        }
    }

    return res;
}

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
        _id: raw._id,
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
                    inUse: si.inUse,
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

/* ---------------- Saved API helpers ---------------- */
async function apiGetSaved(customerId: string): Promise<SavedItem[]> {
    const url = `${API_BASE}/customer/${encodeURIComponent(customerId)}/saved_product`;
    const res = await authFetch(url, { method: "GET" });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error((json?.error || json?.message) ?? `Failed to fetch saved (${res.status})`);
    }

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
        const rawProdId =
            (product && ((product as any).productId ?? (product as any)._id ?? (product as any).id)) ?? s.productId ?? s.product_id ?? s._id ?? s.id ?? "";

        const prodId = rawProdId === null || rawProdId === undefined ? "" : String(rawProdId);

        const title =
            (product && ((product as any).productName ?? (product as any).name ?? (product as any).title)) ?? s.title ?? "Untitled";

        let priceVal: number | undefined = undefined;
        try {
            const p = product && (product as any).price;
            if (p) {
                if (typeof p.discountedPrice === "number") priceVal = p.discountedPrice;
                else if (typeof p.actualPrice === "number") priceVal = p.actualPrice;
                else if (typeof p.price === "number") priceVal = p.price;
            }
            if (priceVal === undefined && typeof s.price === "number") priceVal = s.price;
        } catch {
            priceVal = undefined;
        }

        const rawImg = (product && ((product as any).productImage ?? (product as any).productImg ?? (product as any).image)) ?? s.img ?? s.image ?? null;
        const img = rawImg ? String(rawImg) : null;

        return {
            id: prodId,
            title: String(title),
            price: typeof priceVal === "number" ? priceVal : undefined,
            img,
            qty: 1,
            _savedId: s.savedId ?? s._id ?? s.id ?? undefined,
            productId: (product && ((product as any).productId ?? (product as any)._id)) ?? undefined,
        } as SavedItem;
    });
}

async function apiAddSaved(customerId: string, product: any) {
    const url = `${API_BASE}/customer/${encodeURIComponent(customerId)}/saved_product`;

    const pAny = product as any;

    const resolvedProductId = (pAny.productId ?? pAny.id ?? pAny._id ?? pAny.product_id ?? "") || "";

    const resolvedTitle = (pAny.productPublicName ?? pAny.productName ?? pAny.title ?? pAny.name ?? "") || "";

    let resolvedPrice: number | undefined = undefined;
    if (typeof pAny.price === "number") resolvedPrice = pAny.price;
    else if (pAny.price && typeof pAny.price === "object") {
        if (typeof pAny.price.discountedPrice === "number") resolvedPrice = pAny.price.discountedPrice;
        else if (typeof pAny.price.actualPrice === "number") resolvedPrice = pAny.price.actualPrice;
        else if (typeof pAny.price.price === "number") resolvedPrice = pAny.price.price;
    } else if (typeof pAny.priceVal === "number") {
        resolvedPrice = pAny.priceVal;
    }

    const resolvedImg = (pAny.image ?? pAny.img ?? pAny.imagePath ?? pAny.thumbnail ?? pAny.productImage ?? null) ?? null;

    const body: any = {
        productId: String(resolvedProductId),
        title: String(resolvedTitle),
        ...(typeof resolvedPrice === "number" ? { price: resolvedPrice } : {}),
        img: resolvedImg,
    };

    const res = await authFetch(url, { method: "POST", body: JSON.stringify(body) });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error((json?.error || json?.message) ?? `Failed to add saved (${res.status})`);
    }
    return json;
}

async function apiDeleteSaved(customerId: string, savedId: string) {
    const url = `${API_BASE}/customer/${encodeURIComponent(customerId)}/saved_product/${encodeURIComponent(savedId)}`;
    const res = await authFetch(url, { method: "DELETE" });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error((json?.error || json?.message) ?? `Failed to delete saved (${res.status})`);
    }
    return json;
}

async function apiDeleteSavedByProduct(customerId: string, productId: string) {
    const url = `${API_BASE}/customer/${encodeURIComponent(customerId)}/saved_product?productId=${encodeURIComponent(productId)}`;
    const res = await authFetch(url, { method: "DELETE" });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error((json?.error || json?.message) ?? `Failed to delete saved by productId (${res.status})`);
    }
    return json;
}

/* ---------------- Component ---------------- */
export default function ClientCart() {
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

    const router = useRouter();

    // derived counts used for disabling checkout
    const totalItemsCount = (localCart?.sellItems ?? []).reduce((c, it) => c + (it.inUse === false ? 0 : Number(it.quantity ?? 0)), 0);
    const hasItems = totalItemsCount > 0;

    function redirectToLogin(): void {
        clearAuthStorage();
        try {
            router.push("/login");
        } catch {
            window.location.href = "/login";
        }
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
        if (typeof window === "undefined") return;
        fetchCart();
        fetchSavedItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function fetchCart(): Promise<void> {
        setLoading(true);
        setError("");
        try {
            const customerId = getStoredCustomerId();
            if (!customerId) {
                setError("No customer information available. Please login.");
                redirectToLogin();
                return;
            }

            const url = `${API_BASE}/cart?customerId=${encodeURIComponent(customerId)}`;
            const res = await authFetch(url, { method: "GET" });
            const json = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error((json?.error || json?.message) ?? `Failed to fetch cart (${res.status})`);
            }

            const rawCart = Array.isArray(json.cartData) ? json.cartData[0] : json.cartData;
            const normalized = normalizeCartResponse(rawCart);
            setCart(normalized);
            setLocalCart(normalized ? clampCartQuantities(normalized) : null);
        } catch (err: any) {
            if (err?.message === "Auth required") {
                redirectToLogin();
                return;
            }
            console.error("fetchCart error:", err);
            setError(err?.message || "Unable to load cart");
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
            setError(err?.message || "Unable to load saved items");
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
        const cartId = cartObject?._id ?? cartObject?.cartId ?? getStoredCustomerId() ?? undefined;
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
        const cartId = cart?._id ?? cart?.cartId ?? getStoredCustomerId();
        if (!cartId) {
            setError("Cart identifier is missing.");
            console.warn("performDelete aborted - no cart id", { cart });
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

        const cartId = cart?._id ?? cart?.cartId ?? getStoredCustomerId();
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

    /* ---------------- Save-for-later actions ---------------- */

    async function saveForLater(itemId?: string): Promise<void> {
        if (!itemId || !localCart) return;
        const idx = (localCart.sellItems ?? []).findIndex((s) => s._id === itemId);
        if (idx === -1) return;
        const item = localCart.sellItems![idx];

        const customerId = getStoredCustomerId();
        const cartId = cart?._id ?? cart?.cartId ?? getStoredCustomerId();

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
            setError(err?.message || "Could not save item for later");

            await fetchCart();
            await fetchSavedItems();
        } finally {
            setSaving(false);
        }
    }

    async function moveSavedToCart(saved: SavedItem) {
        const customerId = getStoredCustomerId();
        const token = getStoredAccessToken();
        const cartId = cart?._id ?? cart?.cartId ?? getStoredCustomerId();

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

            const res = await fetch(`${API_BASE}/cart/${cartId}/move_to_cart`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || data?.message || "Failed to move item to cart");

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
            setError(err?.message || "Unable to delete saved item");
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
                setError(err2?.message || "Unable to delete saved item");
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

    if (!cart && !loading)
        return (
            <div className="p-8">
                <EmptyIllustration />
            </div>
        );

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <section className="md:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-lg p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Items in your cart</h3>
                        </div>

                        {(localCart?.sellItems ?? []).filter((it) => it.inUse !== false).length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <p>No sell items in your cart.</p>
                                <a href="/products" className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
                                    Shop Now
                                </a>
                            </div>
                        ) : (
                            <ul className="space-y-4">
                                {localCart
                                    ?.sellItems?.filter((it) => it.inUse !== false)
                                    .map((item, idx) => {
                                        const stock = safeNumber(item.sellStockQuantity);
                                        const qty = Number(item.quantity ?? 1);
                                        const atStockLimit = stock !== null ? qty >= Math.max(0, Math.floor(stock)) : false;
                                        const increaseDisabled = Boolean(savingItemId && savingItemId !== item._id) || atStockLimit || item.isAvailableForSale === false;
                                        const decreaseDisabled = Boolean(savingItemId && savingItemId !== item._id) || item.isAvailableForSale === false;
                                        const thisItemSaving = savingItemId === item._id;

                                        return (
                                            <motion.li
                                                key={item._id ?? idx}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.04 }}
                                                className={`flex items-start gap-4 bg-gray-50 rounded-lg p-3 hover:shadow transition-shadow ${item.isAvailableForSale === false ? "opacity-60" : ""}`}
                                            >
                                                <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-white border">
                                                    <Link href={item.productId ? `/products/${item.productId}` : "/products"} className="block w-full h-full">
                                                        <Image
                                                            alt={item.productPublicName ?? "product image"}
                                                            src={item.imagePath ?? item.thumbnail ?? "/placeholder-80x80.png"}
                                                            width={96}
                                                            height={96}
                                                            className="object-cover"
                                                        />
                                                    </Link>
                                                </div>

                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="min-w-0">
                                                            <div className="font-medium text-md truncate">{item.productPublicName ?? item.productId}</div>
                                                            <div className="text-xs text-gray-500 mt-1">SKU: {item.productNumber ?? "—"}</div>

                                                            <div className="mt-3 flex items-center gap-3 flex-wrap">
                                                                {item.price ? (
                                                                    <>
                                                                        {typeof item.price.discountedPrice === "number" && typeof item.price.actualPrice === "number" ? (
                                                                            <div className="text-sm">
                                                                                <span className="text-xs text-gray-400 line-through mr-2">{formatCurrency(item.price.actualPrice)}</span>
                                                                                <span className="font-semibold">{formatCurrency(item.price.discountedPrice)}</span>
                                                                            </div>
                                                                        ) : typeof item.price.actualPrice === "number" ? (
                                                                            <div className="font-semibold">{formatCurrency(item.price.actualPrice)}</div>
                                                                        ) : (
                                                                            <div className="text-sm text-gray-500">Price unavailable</div>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <div className="text-sm text-gray-500">Price unavailable</div>
                                                                )}

                                                                {item.isAvailableForSale === false ? <span className="ml-2 text-red-500 text-xs bg-red-50 px-2 py-0.5 rounded">Not for sale</span> : null}
                                                                {item.sellStockQuantity != null ? <span className="ml-2 text-xs text-gray-500">Stock: {String(item.sellStockQuantity)}</span> : null}
                                                            </div>
                                                        </div>

                                                        <div className="text-right flex-shrink-0">
                                                            <button onClick={() => openConfirmDialog(item._id)} className="text-red-600 hover:text-red-800 p-2 rounded" title="Remove" disabled={saving || thisItemSaving} aria-disabled={saving || thisItemSaving}>
                                                                <Trash size={18} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 flex items-center gap-3">
                                                        <div className="inline-flex items-center border rounded-md overflow-hidden bg-white">
                                                            <button
                                                                onClick={() => handleQuantityChangeById(item._id, Math.max(1, (item.quantity ?? 1) - 1))}
                                                                className="px-3 py-1"
                                                                aria-label="Decrease quantity"
                                                                disabled={decreaseDisabled}
                                                            >
                                                                <Minus size={14} />
                                                            </button>
                                                            <div className="px-5 py-1 font-medium">{thisItemSaving ? "…" : item.quantity}</div>
                                                            <button
                                                                onClick={() => handleQuantityChangeById(item._id, (item.quantity ?? 1) + 1)}
                                                                className="px-3 py-1"
                                                                aria-label="Increase quantity"
                                                                disabled={increaseDisabled}
                                                                title={increaseDisabled && stock !== null ? `Max available: ${stock}` : undefined}
                                                            >
                                                                <Plus size={14} />
                                                            </button>
                                                        </div>

                                                        <div className="ml-4 flex items-center gap-3">
                                                            <button
                                                                onClick={() => saveForLater(item._id)}
                                                                className="text-sm text-slate-600 hover:text-slate-800 border px-3 py-1 rounded"
                                                                disabled={saving}
                                                            >
                                                                Save for later
                                                            </button>
                                                        </div>

                                                        <div className="ml-auto flex items-center gap-4">
                                                            <div className="text-sm text-gray-600">
                                                                <div className="text-xs">Total</div>
                                                                <div className="font-semibold">{formatCurrency(lineTotal(item))}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.li>
                                        );
                                    })}
                            </ul>
                        )}
                    </div>

                    {/* Saved for later */}
                    <div className="bg-white rounded-xl shadow-lg p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Saved for later</h3>
                            <div className="text-sm text-gray-500">{savedLoading ? "Loading…" : `${savedItems.length} item${savedItems.length !== 1 ? "s" : ""}`}</div>
                        </div>

                        {savedLoading ? (
                            <div className="text-sm text-gray-500">Loading saved items…</div>
                        ) : savedItems.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">You don’t have any saved items.</div>
                        ) : (
                            <ul className="space-y-3">
                                {savedItems.map((s) => (
                                    <li key={s._savedId ?? s.id} className="flex items-center gap-4 p-3 rounded-lg border bg-gray-50">
                                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-white border">
                                            <Link href={s.productId ? `/products/${s.productId}` : "/products"} className="block w-full h-full">
                                                <Image src={s.img ?? "/placeholder-80x80.png"} alt={s.title} width={80} height={80} className="object-cover" />
                                            </Link>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">{s.title}</div>
                                            <div className="text-sm text-gray-500 mt-1">{typeof s.price === "number" ? formatCurrency(s.price) : ""}</div>
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
                </section>

                <aside className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-5 sticky top-6">
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
        </>
    );
}