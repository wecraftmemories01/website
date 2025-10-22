'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Product as ProdType } from '../types/product'
import { ShoppingCart, Check, Heart, Tag } from 'lucide-react'
import { addToCart } from '../lib/cart'

type Product = ProdType
type Props = { product: Product; initialAdded?: boolean }

const PLACEHOLDER = '/no-image-placeholder.png'
const LOCAL_FAV_KEY = 'localFavourites'
const FAV_CACHE_TTL_MS = 60 * 1000 // 1 minute

/* -------------------- local storage helpers -------------------- */
function getStoredCustomerId(): string | null {
    if (typeof window === 'undefined') return null
    try {
        return localStorage.getItem('customerId')
    } catch {
        return null
    }
}

function readLocalFavourites(): string[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = localStorage.getItem(LOCAL_FAV_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed.map(String)
        return []
    } catch {
        return []
    }
}

function writeLocalFavourites(list: string[]) {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(LOCAL_FAV_KEY, JSON.stringify(Array.from(new Set(list))))
        window.dispatchEvent(new Event('localFavouritesUpdated'))
    } catch {
        // ignore
    }
}

function addLocalFavourite(productId: string) {
    const cur = readLocalFavourites()
    if (!cur.includes(productId)) {
        cur.push(productId)
        writeLocalFavourites(cur)
    }
}

function removeLocalFavourite(productId: string) {
    const cur = readLocalFavourites()
    const next = cur.filter((p) => p !== productId)
    writeLocalFavourites(next)
}

/* -------------------- format helpers -------------------- */
function formatStock(q: unknown): { isInStock: boolean; label: string } {
    if (q === null || q === undefined || q === '') return { isInStock: false, label: 'Stock unknown' }
    if (typeof q === 'number') return q > 0 ? { isInStock: true, label: String(q) } : { isInStock: false, label: '0' }
    if (typeof q === 'string') {
        const trimmed = q.trim()
        if (/\d+\+$/.test(trimmed)) return { isInStock: true, label: trimmed }
        const parsed = parseInt(trimmed.replace(/\D/g, ''), 10)
        if (!Number.isNaN(parsed)) return parsed > 0 ? { isInStock: true, label: trimmed } : { isInStock: false, label: trimmed }
        return { isInStock: true, label: trimmed }
    }
    return { isInStock: false, label: 'Stock unknown' }
}

function formatPrice(n?: number | string | null) {
    if (n === null || n === undefined) return ''
    const num = typeof n === 'string' ? Number(n) : n
    if (Number.isNaN(num as number)) return String(n)
    return (num as number).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })
}

/* -------------------- shared favourites cache (optional) -------------------- */
function getGlobalAny(): any {
    if (typeof window === 'undefined') return {}
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.__favouritesCache = window.__favouritesCache ?? null
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.__favouritesPromise = window.__favouritesPromise ?? null
    return window
}

function invalidateSharedFavourites() {
    if (typeof window === 'undefined') return
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.__favouritesCache = null
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.__favouritesPromise = null
}

/* -------------------- Component -------------------- */

export default function ProductCardClient({ product, initialAdded = false }: Props) {
    const [added, setAdded] = useState<boolean>(initialAdded)
    const [wish, setWish] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [imgError, setImgError] = useState(false)
    const [loadingAdd, setLoadingAdd] = useState(false)
    const [loadingWish, setLoadingWish] = useState(false)
    const [syncingLocalFavs, setSyncingLocalFavs] = useState(false)

    useEffect(() => {
        setMounted(true)

            ; (async () => {
                const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
                const customerId = getStoredCustomerId()
                if (token && customerId) {
                    // try to sync local favourites -> server (if you have API endpoints)
                    // We'll attempt to read shared cache first; if that fails fallback to local
                    try {
                        // If your app has a fetchSharedFavourites function, use it.
                        // For now, fall back to local storage.
                        const local = readLocalFavourites()
                        setWish(local.includes(String(product._id)))
                    } catch (e) {
                        const local = readLocalFavourites()
                        setWish(local.includes(String(product._id)))
                    }
                } else {
                    const local = readLocalFavourites()
                    setWish(local.includes(String(product._id)))
                }
            })()

        const onStorage = () => {
            const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
            const customerId = getStoredCustomerId()
            if (!token || !customerId) {
                const local = readLocalFavourites()
                setWish(local.includes(String(product._id)))
            } else {
                setTimeout(async () => {
                    try {
                        const local = readLocalFavourites()
                        setWish(local.includes(String(product._id)))
                    } catch {
                        const local = readLocalFavourites()
                        setWish(local.includes(String(product._id)))
                    }
                }, 0)
            }
        }

        window.addEventListener('storage', onStorage)
        window.addEventListener('localFavouritesUpdated', onStorage)
        return () => {
            window.removeEventListener('storage', onStorage)
            window.removeEventListener('localFavouritesUpdated', onStorage)
        }
    }, [product._id])

    // Listen to ProductGrid's global cart fetch event
    useEffect(() => {
        const onCartFetched = () => {
            try {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const m = typeof window !== 'undefined' ? window.__cartAddedMap : null
                if (m && String(product._id) in m) {
                    setAdded(true)
                } else {
                    setAdded(false)
                }
            } catch {
                // ignore
            }
        }
        window.addEventListener('cartFetched', onCartFetched as EventListener)
        // immediate check
        onCartFetched()
        return () => {
            window.removeEventListener('cartFetched', onCartFetched as EventListener)
        }
    }, [product._id])

    const imageUrl = useMemo(() => {
        const img = String(product.productImage ?? '')
        if (img === '' || imgError) return PLACEHOLDER
        if (img.startsWith('http')) return img
        return img.startsWith('/') ? img : `/${img}`
    }, [product.productImage, imgError])

    const actualPrice = product.latestSalePrice?.actualPrice
    const discountedPrice = product.latestSalePrice?.discountedPrice
    const stock = useMemo(() => formatStock(product.sellStockQuantity as unknown), [product.sellStockQuantity])

    const isOnSale = discountedPrice && actualPrice && Number(discountedPrice) < Number(actualPrice)
    const isLowStock = !stock.isInStock ? false : /^(0|1|2|3)$/.test(stock.label.replace(/\D/g, ''))
    const limitedBadge = String(stock.label).endsWith('+') || isLowStock

    const inferredType: 'SELL' | 'RENT' = useMemo(() => {
        const raw = String(product.sellStockQuantity ?? '')
        const digits = raw.replace(/\D/g, '')
        const q = digits ? parseInt(digits, 10) : NaN
        if (!Number.isNaN(q) && q > 0) return 'SELL'
        return 'SELL'
    }, [product.sellStockQuantity])

    // Favourite toggle (local-only fallback if not logged in)
    const handleToggleWish = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (loadingWish) return
        setLoadingWish(true)

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
            const customerId = getStoredCustomerId()
            if (!token || !customerId) {
                // local toggle
                if (!wish) {
                    addLocalFavourite(String(product._id))
                    setWish(true)
                } else {
                    removeLocalFavourite(String(product._id))
                    setWish(false)
                }
                setLoadingWish(false)
                return
            }

            // If logged in you should call server endpoints to add/remove favourites.
            // For simplicity in this file we'll toggle local and rely on your server sync elsewhere.

            if (!wish) {
                setWish(true)
                // ideally call server add favourite here, then invalidate shared cache
                removeLocalFavourite(String(product._id)) // if it existed locally
            } else {
                setWish(false)
                // ideally call server remove favourite here
            }
        } finally {
            setLoadingWish(false)
        }
    }

    return (
        <Link href={`/products/${product._id}`} className="block">
            <article className="group bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 h-full flex flex-col">
                <div className="relative w-full h-44 bg-gray-50">
                    <Image
                        src={imageUrl}
                        alt={product.productName || 'Product'}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={() => setImgError(true)}
                        priority={false}
                    />

                    <div className="absolute top-2 left-2 flex gap-1 items-center">
                        {isOnSale && (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 text-[10px] font-medium px-2 py-0.5 rounded-md shadow-sm">
                                <Tag size={12} /> Sale
                            </span>
                        )}
                        {limitedBadge && (
                            <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 text-[10px] font-medium px-2 py-0.5 rounded-md shadow-sm">
                                Limited
                            </span>
                        )}
                    </div>

                    <button
                        aria-pressed={wish}
                        onClick={handleToggleWish}
                        disabled={loadingWish || syncingLocalFavs}
                        className={`absolute top-2 right-2 p-2 rounded-md shadow-md transition-transform duration-150 focus:outline-none
              ${wish ? 'bg-rose-500 hover:bg-rose-600 active:scale-95' : 'bg-white hover:bg-gray-100 active:scale-95'}`}
                        title={loadingWish ? 'Working…' : wish ? 'Remove from favourites' : 'Add to favourites'}
                    >
                        <Heart
                            size={16}
                            className={`transition-colors duration-150 ${wish ? 'text-white' : 'text-slate-600'}`}
                            fill={wish ? 'currentColor' : 'none'}
                        />
                    </button>
                </div>

                <div className="p-2 flex-1 flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-800 truncate" title={String(product.productName)}>
                            {product.productName}
                        </h3>

                        <div className="mt-2 flex items-center justify-between gap-2">
                            <div>
                                {discountedPrice ? (
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-sm font-bold text-teal-600">₹{formatPrice(discountedPrice)}</span>
                                        {actualPrice && <span className="text-xs text-slate-400 line-through">₹{formatPrice(actualPrice)}</span>}
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-500">Price not available</span>
                                )}
                            </div>

                            {stock.isInStock && !added ? (
                                <button
                                    onClick={async (ev) => {
                                        ev.preventDefault()
                                        ev.stopPropagation()
                                        if (added || loadingAdd) return
                                        setLoadingAdd(true)
                                        try {
                                            const result = await addToCart(String(product._id), 1, inferredType)
                                            if (result?.success) {
                                                setAdded(true)
                                                window.dispatchEvent(new Event('cartUpdated'))
                                            } else {
                                                alert(typeof result?.message === 'string' ? `Could not add to cart: ${result.message}` : 'Could not add to cart')
                                            }
                                        } catch (err) {
                                            console.error('Add to cart unexpected error', err)
                                            alert('Add to cart failed.')
                                        } finally {
                                            setLoadingAdd(false)
                                        }
                                    }}
                                    aria-pressed={added}
                                    disabled={loadingAdd}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium shadow-sm transition ${added ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'}`}
                                >
                                    {mounted ? (added ? <Check size={14} /> : <ShoppingCart size={14} />) : <span className="w-3 h-3" />}
                                    {added ? 'Added' : loadingAdd ? 'Adding…' : 'Add'}
                                </button>
                            ) : (
                                added ? (
                                    <button
                                        aria-pressed
                                        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium shadow-sm transition bg-teal-600 text-white"
                                        onClick={(ev) => {
                                            ev.preventDefault()
                                            ev.stopPropagation()
                                            // optional: navigate to cart or show toast
                                        }}
                                    >
                                        <Check size={14} /> Added
                                    </button>
                                ) : (
                                    <div aria-hidden className="w-[68px] h-8" />
                                )
                            )}
                        </div>
                    </div>

                    <div className="mt-2 text-xs">
                        {stock.isInStock ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 font-medium">● {stock.label} units left</span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-600 font-medium">● {stock.label === '0' ? 'Out of stock' : stock.label}</span>
                        )}
                    </div>
                </div>
            </article>
        </Link>
    )
}