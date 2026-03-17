const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3000").replace(/\/+$/, '');

const TOKEN_KEY = 'accessToken';
const CART_PRODUCTS_KEY = 'cartProductIds';

let cartProductSet = new Set<string>();
let cartFetched = false;

/* ---------------- Storage Helpers ---------------- */

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

/* ---------------- Public Helpers ---------------- */

export function isInCart(productId: string): boolean {
    const id = String(productId);

    try {
        const ids = getCartProductIds(); // ALWAYS read latest
        return ids.includes(id);
    } catch {
        return false;
    }
}

/* ---------------- Auth Helpers ---------------- */

function getStoredAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

/* ---------------- Fetch Wrapper ---------------- */

async function fetchWithAuth(input: RequestInfo, init: RequestInit = {}) {
    const headers = new Headers(init.headers ?? {});
    const token = getStoredAccessToken();

    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (!headers.get('Content-Type')) headers.set('Content-Type', 'application/json');

    return fetch(input, { ...init, headers });
}

/* ---------------- Events ---------------- */

function notifyCartChange() {
    try {
        window.dispatchEvent(new Event('cartChanged'));
    } catch { }

    try {
        localStorage.setItem('cartUpdatedAt', String(Date.now()));
    } catch { }
}

/* ---------------- Cart Actions ---------------- */

/**
 * Add to cart
 */
export async function addToCart(
    productId: string,
    quantity = 1,
    type: 'SELL' | 'RENT' = 'SELL',
    note?: string
) {
    if (typeof window === 'undefined') return { success: false, message: 'not-in-browser' };

    try {
        const res = await fetchWithAuth(`${API_BASE}/cart`, {
            method: 'POST',
            body: JSON.stringify({ productId, quantity, type, note }),
        });

        const payload = await res.json().catch(() => null);

        if (res.ok) {
            const id = String(productId);

            cartProductSet.add(id);

            const ids = getCartProductIds();
            ids.push(id);
            setCartProductIds(ids);

            notifyCartChange();

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
 * Update cart item
 */
export async function updateCartItem(
    cartId: string,
    itemId: string,
    productId: string,
    quantity: number,
    type: 'SELL' | 'RENT' = 'SELL'
) {
    if (typeof window === 'undefined') return { success: false, message: 'not-in-browser' };
    if (!cartId) return { success: false, message: 'missing-cartId' };

    try {
        const res = await fetchWithAuth(`${API_BASE}/cart/${encodeURIComponent(cartId)}`, {
            method: 'PUT',
            body: JSON.stringify({ type, itemId, quantity }),
        });

        const payload = await res.json().catch(() => null);

        if (res.ok) {
            const id = String(productId);

            if (quantity === 0) {
                cartProductSet.delete(id);

                const ids = getCartProductIds().filter(pid => pid !== id);
                setCartProductIds(ids);
            }

            notifyCartChange();

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
 * Remove from cart
 */
export async function removeFromCart(
    cartId: string,
    itemId: string,
    productId: string,
    type: 'SELL' | 'RENT' = 'SELL'
) {
    if (typeof window === 'undefined') return { success: false, message: 'not-in-browser' };
    if (!cartId) return { success: false, message: 'missing-cartId' };

    try {
        const res = await fetchWithAuth(`${API_BASE}/cart/${encodeURIComponent(cartId)}`, {
            method: 'DELETE',
            body: JSON.stringify({ type, itemId }),
        });

        const payload = await res.json().catch(() => null);

        if (res.ok) {
            const id = String(productId);

            cartProductSet.delete(id);

            const ids = getCartProductIds().filter(pid => pid !== id);
            setCartProductIds(ids);

            notifyCartChange();

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
 * Fetch cart (hydrates memory + storage)
 */
export async function fetchCartFromApi(): Promise<number> {
    try {
        const res = await fetchWithAuth(`${API_BASE}/cart`);
        const data = await res.json();

        let count = 0;
        const productIds: string[] = [];

        const cart = data?.cartData?.[0];

        if (cart) {
            for (const item of cart.sellItems || []) {
                if (item.inUse && item.productId) {
                    const id = String(item.productId);
                    productIds.push(id);
                    count += Number(item.quantity || 0);
                }
            }
        }

        setCartProductIds(productIds);
        cartProductSet = new Set(productIds);

        return count;

    } catch (err) {
        console.error('fetchCartFromApi failed', err);
        return 0;
    }
}

/**
 * Clear cart (on logout)
 */
export function clearCart() {
    if (typeof window === 'undefined') return;

    cartProductSet.clear();
    cartFetched = false;

    try {
        localStorage.removeItem(CART_PRODUCTS_KEY);
        localStorage.setItem('cartCount', '0');
    } catch { }

    notifyCartChange();
}

/* ---------------- Auto Logout Sync ---------------- */

if (typeof window !== 'undefined') {
    window.addEventListener("authChanged", () => {
        const token = getStoredAccessToken();
        if (!token) {
            clearCart();
        }
    });
}