const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3000").replace(/\/+$/, '');

const TOKEN_KEY = 'accessToken';
const CART_PRODUCTS_KEY = 'cartProductIds';

let cartProductSet = new Set<string>();
let cartFetched = false;

function getCartProductIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(CART_PRODUCTS_KEY) || '[]');
    } catch {
        return [];
    }
}

function setCartProductIds(ids: string[]) {
    try {
        localStorage.setItem(CART_PRODUCTS_KEY, JSON.stringify([...new Set(ids)]));
    } catch { }
}

export function isInCart(productId: string): boolean {
    const id = String(productId);

    // memory first
    if (cartProductSet.has(id)) return true;

    // fallback to localStorage (refresh-safe)
    try {
        const ids = JSON.parse(localStorage.getItem(CART_PRODUCTS_KEY) || '[]');
        return Array.isArray(ids) && ids.includes(id);
    } catch {
        return false;
    }
}

function getStoredAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function getStoredCustomerId(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem('auth');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.customerId ?? null;
    } catch {
        return null;
    }
}

async function fetchWithAuth(input: RequestInfo, init: RequestInit = {}) {
    const headers = new Headers(init.headers ?? {});
    const token = getStoredAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (!headers.get('Content-Type')) headers.set('Content-Type', 'application/json');
    return fetch(input, { ...init, headers });
}

function notifyCartChange(updatedPayload?: any) {
    try {
        // optimistic: if backend returned totalItems, update local storage exactly
        const totalItems = updatedPayload?.totalItems ?? updatedPayload?.cartData?.totalItems ?? null;
        if (typeof totalItems === 'number') {
            try { localStorage.setItem('cartCount', String(totalItems)); } catch { }
        }
    } catch { }
    try { window.dispatchEvent(new Event('cartChanged')); } catch { }
    try { localStorage.setItem('cartUpdatedAt', String(Date.now())); } catch { }
}

/**
 * Add to cart (SELL/RENT)
 */
export async function addToCart(productId: string, quantity = 1, type: 'SELL' | 'RENT' = 'SELL', note?: string) {
    if (typeof window === 'undefined') return { success: false, message: 'not-in-browser' };
    const customerId = getStoredCustomerId();
    if (!customerId) return { success: false, message: 'no-customer' };

    try {
        const res = await fetchWithAuth(`${API_BASE}/cart`, {
            method: 'POST',
            body: JSON.stringify({ customerId, productId, quantity, type, note }),
        });
        const payload = await res.json().catch(() => null);

        if (res.ok && (res.status === 201 || payload?.ack === 'success' || res.status === 200)) {
            cartProductSet.add(String(productId));

            try {
                const ids = getCartProductIds();
                ids.push(String(productId));
                setCartProductIds(ids);
            } catch { }

            notifyCartChange(payload);
            return { success: true, payload };
        } else {
            const msg = payload?.error || payload?.message || `HTTP ${res.status}`;
            return { success: false, message: msg, payload };
        }
    } catch (err: any) {
        return { success: false, message: err?.message || String(err) };
    }
}

/**
 * Update item quantity in cart.
 * Expects backend endpoint: PUT /cart/:cartId with body { type, itemId, quantity }
 */
export async function updateCartItem(cartId: string, itemId: string, quantity: number, type: 'SELL' | 'RENT' = 'SELL') {
    if (typeof window === 'undefined') return { success: false, message: 'not-in-browser' };
    if (!cartId) return { success: false, message: 'missing-cartId' };
    try {
        const res = await fetchWithAuth(`${API_BASE}/cart/${encodeURIComponent(cartId)}`, {
            method: 'PUT',
            body: JSON.stringify({ type, itemId, quantity }),
        });
        const payload = await res.json().catch(() => null);

        if (res.ok) {
            if (quantity === 0 && itemId) {
                cartProductSet.delete(String(itemId));
            }

            // Handle quantity = 0
            try {
                if (quantity === 0 && itemId) {
                    const ids = getCartProductIds().filter(
                        id => id !== String(itemId)
                    );
                    setCartProductIds(ids);
                }
            } catch { }

            // backend may return updated cart or totals — if so, write exact totalItems
            if (payload) {
                if (typeof payload.totalItems === 'number') {
                    try { localStorage.setItem('cartCount', String(payload.totalItems)); } catch { }
                } else {
                    // try to find cartData.totalItems shape used elsewhere
                    const raw = Array.isArray(payload?.cartData) ? payload.cartData[0] : payload.cartData;
                    if (raw && typeof raw.totalItems === 'number') {
                        try { localStorage.setItem('cartCount', String(raw.totalItems)); } catch { }
                    }
                }
            }

            notifyCartChange(payload);
            return { success: true, payload };
        } else {
            const msg = payload?.error || payload?.message || `HTTP ${res.status}`;
            return { success: false, message: msg, payload };
        }
    } catch (err: any) {
        return { success: false, message: err?.message || String(err) };
    }
}

/**
 * Remove item from cart.
 * Uses DELETE /cart/:cartId with body { type, itemId } matching your existing backend call style.
 */
export async function removeFromCart(cartId: string, itemId: string | undefined, type: 'SELL' | 'RENT' = 'SELL') {
    if (typeof window === 'undefined') return { success: false, message: 'not-in-browser' };
    if (!cartId) return { success: false, message: 'missing-cartId' };

    try {
        const res = await fetchWithAuth(`${API_BASE}/cart/${encodeURIComponent(cartId)}`, {
            method: 'DELETE',
            body: JSON.stringify({ type, itemId }),
        });
        const payload = await res.json().catch(() => null);

        if (res.ok) {

            try {
                if (itemId) {
                    const ids = getCartProductIds().filter(
                        id => id !== String(itemId)
                    );
                    setCartProductIds(ids);
                }
            } catch { }

            if (itemId) {
                cartProductSet.delete(String(itemId));
            }

            // update exact total if server returned it
            if (payload) {
                if (typeof payload.totalItems === 'number') {
                    try { localStorage.setItem('cartCount', String(payload.totalItems)); } catch { }
                } else {
                    const raw = Array.isArray(payload?.cartData) ? payload.cartData[0] : payload.cartData;
                    if (raw && typeof raw.totalItems === 'number') {
                        try { localStorage.setItem('cartCount', String(raw.totalItems)); } catch { }
                    } else {
                        // fallback: decrement by 1 (optimistic) if we don't know
                        try {
                            const prev = Number(localStorage.getItem('cartCount') ?? '0');
                            const next = Math.max(0, prev - 1);
                            localStorage.setItem('cartCount', String(next));
                        } catch { }
                    }
                }
            }
            notifyCartChange(payload);
            return { success: true, payload };
        } else {
            const msg = payload?.error || payload?.message || `HTTP ${res.status}`;
            return { success: false, message: msg, payload };
        }
    } catch (err: any) {
        return { success: false, message: err?.message || String(err) };
    }
}

/**
 * Fetch cart from backend and cache productIds
 */
export async function fetchCartFromApi() {
    if (typeof window === 'undefined') return;

    const customerId = getStoredCustomerId();
    if (!customerId) return;

    try {
        const res = await fetchWithAuth(
            `${API_BASE}/cart?customerId=${encodeURIComponent(customerId)}`,
            { method: 'GET' }
        );

        const data = await res.json().catch(() => null);

        cartProductSet.clear();

        const productIds: string[] = [];

        const cart = data?.cartData?.[0];
        if (cart) {
            for (const item of cart.sellItems || []) {
                if (item.inUse && item.productId) {
                    const id = String(item.productId);
                    cartProductSet.add(id);
                    productIds.push(id);
                }
            }

            for (const item of cart.rentItems || []) {
                if (item.inUse && item.productId) {
                    const id = String(item.productId);
                    cartProductSet.add(id);
                    productIds.push(id);
                }
            }
        }

        // 🔑 persist for refresh safety
        setCartProductIds(productIds);

        cartFetched = true;
        window.dispatchEvent(new Event('cartChanged'));
    } catch (err) {
        console.error('fetchCartFromApi failed', err);
    }
}