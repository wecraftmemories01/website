export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000'

type FetchOptions = RequestInit & { absolute?: boolean }

/**
 * Robust wrapper around fetch:
 * - If API_BASE is set (eg. http://localhost:3000 or https://api.example.com) it prefixes it.
 * - If API_BASE is empty, it uses relative paths (good for same-origin).
 * - Pass { absolute: true } to use the url exactly as passed.
 */
export async function apiFetch(path: string, options: FetchOptions = {}) {
    const { absolute, ...rest } = options

    const isAbsoluteUrl = /^https?:\/\//i.test(path)
    let url: string
    if (absolute || isAbsoluteUrl) {
        url = path
    } else if (API_BASE) {
        url = `${API_BASE.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
    } else {
        url = path.startsWith('/') ? path : `/${path}`
    }

    const res = await fetch(url, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(rest.headers || {}),
        },
        ...rest,
    })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        const err = new Error(`API error ${res.status}: ${text || res.statusText}`)
            ; (err as any).status = res.status
        throw err
    }

    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) return res.json()
    return res.text()
}

/* === category / sub-category helpers === */

export async function getCategories(signal?: AbortSignal) {
    const data = await apiFetch(`${API_BASE}/category`, { signal })
    const items = (data.categoryData || []).map((c: any) => ({
        _id: c._id,
        publicName: c.publicName ?? c.name,
        sortNumber: c.sortNumber,
        ...c,
    }))
    items.sort((a: any, b: any) => (b.sortNumber ?? 0) - (a.sortNumber ?? 0))
    return items
}

/**
 * Fetch subcategories for a given category. Tries server-side filter first
 * (GET /sub_category?categoryId=...), falls back to fetching all subcategories
 * and filtering client-side on common fields.
 */
export async function getSubCategoriesByCategory(categoryId: string, signal?: AbortSignal) {
    try {
        const data = await apiFetch(`${API_BASE}/sub_category?categoryId=${encodeURIComponent(categoryId)}`, { signal })
        const items = (data.subCategoryData || []).map((s: any) => ({
            _id: s._id,
            publicName: s.publicName ?? s.name,
            sortNumber: s.sortNumber,
            ...s,
        }))
        items.sort((a: any, b: any) => (b.sortNumber ?? 0) - (a.sortNumber ?? 0))
        return items
    } catch (err) {
        // fallback: fetch all and filter client-side
        console.warn('Filtered subcategory fetch failed, falling back to full list and client-side filter.', err)
        const all = await apiFetch(`${API_BASE}/sub_category`, { signal })
        const items = (all.subCategoryData || []).map((s: any) => ({
            _id: s._id,
            publicName: s.publicName ?? s.name,
            sortNumber: s.sortNumber,
            categoryId: s.categoryId ?? s.category?._id ?? s.superCategoryId ?? null,
            ...s,
        }))
        const filtered = items.filter((it: any) => {
            return (
                it.categoryId === categoryId ||
                it.superCategoryId === categoryId ||
                it.category === categoryId ||
                (it.category && it.category._id === categoryId)
            )
        })
        filtered.sort((a: any, b: any) => (b.sortNumber ?? 0) - (a.sortNumber ?? 0))
        return filtered
    }
}