export type AddFavouriteResult =
    | { success: true; data?: any }
    | { success: false; message?: string }
export type RemoveFavouriteResult = { success: true } | { success: false; message?: string }
export type FetchFavouritesResult = { success: true; data: any[] } | { success: false; message?: string }

/** Use NEXT_PUBLIC_API_BASE from .env.local (e.g. http://localhost:3000/v1) */
const BASE = (process.env.NEXT_PUBLIC_API_BASE || '/v1').replace(/\/$/, '')

/** Return a headers object that is always string->string (HeadersInit compatible) */
function getAuthHeader(token?: string | null): Record<string, string> {
    if (!token) return {}
    return { Authorization: `Bearer ${token}` }
}

/**
 * POST /v1/favourite_product/:customerId
 * body: { productId: string }
 */
export async function addFavouriteAPI(
    customerId: string,
    productId: string,
    token?: string | null
): Promise<AddFavouriteResult> {
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...getAuthHeader(token),
        }

        const res = await fetch(`${BASE}/favourite_product/${encodeURIComponent(customerId)}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ productId }),
        })

        const json = await res.json().catch(() => null)
        if (!res.ok) {
            return { success: false, message: json?.message ?? `HTTP ${res.status}` }
        }
        // return whatever backend responds with (normalized client will re-fetch)
        return { success: true, data: json?.data ?? json }
    } catch (err: any) {
        return { success: false, message: err?.message ?? 'Network error' }
    }
}

/**
 * GET /v1/favourite_product/:customerId?productName=optional
 *
 * Normalizes multiple backend response shapes into a predictable client array:
 * Each item will have:
 *   - _id (favourite id)
 *   - favouriteId
 *   - productId
 *   - product (object)
 *   - addedAt
 *   - raw (original item)
 */
export async function fetchFavouritesAPI(
    customerId: string,
    productName?: string,
    token?: string | null
): Promise<FetchFavouritesResult> {
    try {
        const q = productName ? `?productName=${encodeURIComponent(productName)}` : ''
        const headers: Record<string, string> = {
            Accept: 'application/json',
            ...getAuthHeader(token),
        }

        const res = await fetch(`${BASE}/favourite_product/${encodeURIComponent(customerId)}${q}`, {
            method: 'GET',
            headers,
        })
        const json = await res.json().catch(() => null)
        if (!res.ok) return { success: false, message: json?.message ?? `HTTP ${res.status}` }

        // Acceptable backend shapes:
        // - { favouritesData: [...] }
        // - { data: [...] }
        // - [...]
        const rawArray =
            Array.isArray(json?.data) ? json.data : Array.isArray(json?.favouritesData) ? json.favouritesData : Array.isArray(json) ? json : []

        const normalized = rawArray.map((it: any) => {
            const product = it.product ?? it.productData ?? null
            const favouriteId = it.favouriteId ?? it._id ?? it.id ?? null
            const productId = product?._id ?? it.productId ?? it.product ?? null
            return {
                _id: favouriteId, // earlier code expects _id sometimes
                favouriteId,
                productId,
                product,
                addedAt: it.addedAt ?? it.createdAt ?? null,
                raw: it,
            }
        })

        return { success: true, data: normalized }
    } catch (err: any) {
        return { success: false, message: err?.message ?? 'Network error' }
    }
}

/**
 * DELETE /v1/favourite_product/:favouriteId
 */
export async function removeFavouriteAPI(favouriteId: string, token?: string | null): Promise<RemoveFavouriteResult> {
    try {
        const headers: Record<string, string> = {
            ...getAuthHeader(token),
        }
        const res = await fetch(`${BASE}/favourite_product/${encodeURIComponent(favouriteId)}`, {
            method: 'DELETE',
            headers,
        })
        if (!res.ok) {
            const txt = await res.text().catch(() => '')
            return { success: false, message: txt || `HTTP ${res.status}` }
        }
        return { success: true }
    } catch (err: any) {
        return { success: false, message: err?.message ?? 'Network error' }
    }
}