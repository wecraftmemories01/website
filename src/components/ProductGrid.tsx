import React, { useEffect, useMemo, useState } from 'react'
import ProductCardClient from './ProductCardClient'
import type { Product } from '../types/product'

type Props = { products: Product[] }

const CART_CACHE_TTL_MS = 30 * 1000 // throttle refetches; tune to your needs

// NOTE: you can replace this callApi with your shared helper if you have one
async function callApi(path: string, opts: { method?: string; body?: any } = {}) {
    const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_BASE || '') : ''
    const url = `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`

    const headers: Record<string, string> = {}
    if (opts.body !== undefined && opts.body !== null) headers['Content-Type'] = 'application/json'
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (token) headers['Authorization'] = `Bearer ${token}`

    const fetchOpts: RequestInit = {
        method: opts.method ?? (opts.body ? 'POST' : 'GET'),
        headers,
    }
    if (opts.body !== undefined && opts.body !== null) {
        fetchOpts.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)
    }

    const res = await fetch(url, fetchOpts)
    const contentType = res.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')
    const payload = isJson ? await res.json().catch(() => null) : null
    if (!res.ok) {
        const err: any = new Error(payload?.message || payload?.error || res.statusText || 'API error')
        err.status = res.status
        err.payload = payload
        throw err
    }
    return payload
}

function getStoredCustomerId(): string | null {
    if (typeof window === 'undefined') return null
    try {
        return localStorage.getItem('customerId')
    } catch {
        return null
    }
}

export default function ProductGrid({ products }: Props) {
    const [addedMap, setAddedMap] = useState<Record<string, true>>({})

    // create a stable key so effect re-runs when visible product list changes (pagination)
    const productsKey = useMemo(() => products.map((p) => String(p._id)).join(','), [products])

    useEffect(() => {
        let mounted = true
        let lastFetchTs = 0

        async function fetchCartForPage() {
            const customerId = getStoredCustomerId()
            if (!customerId) {
                if (mounted) {
                    setAddedMap({})
                    // publish globally
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    window.__cartAddedMap = {}
                    window.dispatchEvent(new CustomEvent('cartFetched'))
                }
                return
            }

            const now = Date.now()
            if (now - lastFetchTs < CART_CACHE_TTL_MS) return
            lastFetchTs = now

            try {
                const payload = await callApi(`/cart?customerId=${customerId}`, { method: 'GET' })
                if (!mounted) return
                const cartData = Array.isArray(payload?.cartData) ? payload.cartData : []
                const present: Record<string, true> = {}
                const productIdsOnPage = new Set(products.map((p) => String(p._id)))

                for (const c of cartData) {
                    const sellItems = Array.isArray(c?.sellItems) ? c.sellItems : []
                    for (const s of sellItems) {
                        const pid = s?.productId ?? s?.product?.productId ?? s?.product?._id
                        if (!pid) continue
                        const idStr = String(pid)
                        if (productIdsOnPage.has(idStr)) {
                            present[idStr] = true
                        }
                    }
                }

                setAddedMap(present)
                // global small cache for cards
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                window.__cartAddedMap = present
                window.dispatchEvent(new CustomEvent('cartFetched'))
            } catch (err) {
                console.warn('Could not fetch cart for page', err)
                // keep existing map; optionally clear it on serious error
            }
        }

        // initial fetch
        fetchCartForPage()

        const onCartUpdated = () => {
            fetchCartForPage().catch(() => { })
        }
        window.addEventListener('cartUpdated', onCartUpdated as EventListener)

        return () => {
            mounted = false
            window.removeEventListener('cartUpdated', onCartUpdated as EventListener)
        }
    }, [productsKey])

    return (
        <section id="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Popular Products</h2>
                <div className="text-sm text-slate-600">Showing {products.length} items</div>
            </div>

            {products.length === 0 ? (
                <div className="text-center text-slate-500 py-12">No products available</div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map((p) => (
                        <ProductCardClient key={p._id} product={p} initialAdded={Boolean(addedMap[String(p._id)])} />
                    ))}
                </div>
            )}
        </section>
    )
}