const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3000").replace(/\/+$/, '');

const TOKEN_KEY = 'accessToken';
const CUSTOMER_KEY = 'customerId';

function getStoredAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function getStoredCustomerId(): string | null {
    if (typeof window === 'undefined') return null;
    try { return localStorage.getItem(CUSTOMER_KEY); } catch { return null; }
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
            // optimistic increment if we don't have explicit total from server
            try {
                if (typeof payload?.totalItems === 'number') {
                    localStorage.setItem('cartCount', String(payload.totalItems));
                } else {
                    const prev = Number(localStorage.getItem('cartCount') ?? '0');
                    const next = prev + Number(quantity);
                    if (!Number.isNaN(next)) localStorage.setItem('cartCount', String(next));
                }
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