'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Product as ProdType } from '../types/product'
import { ShoppingCart, Check, Heart, Tag } from 'lucide-react'
import { addToCart, isInCart } from '../lib/cart'
import favouritesClient from '../lib/favouritesClient'
import ConfirmModal from "@/components/ui/ConfirmModal";

type Product = ProdType
type Props = { product: Product; initialAdded?: boolean }

const PLACEHOLDER = '/no-image-placeholder.png'

/* -------------------- format helpers (unchanged) -------------------- */
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

function isGuestInCart(productId: string) {

    const raw = localStorage.getItem("wcm_guest_cart_v1")
    if (!raw) return false

    try {
        const items = JSON.parse(raw)
        return items.some((i: any) => i.productId === productId)
    } catch {
        return false
    }
}

/* -------------------- Component -------------------- */

export default function ProductCardClient({ product, initialAdded = false }: Props) {
    const router = useRouter()

    const [added, setAdded] = useState<boolean>(initialAdded);
    const [wish, setWish] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [loadingAdd, setLoadingAdd] = useState(false);
    const [loadingWish, setLoadingWish] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showRemoveFavModal, setShowRemoveFavModal] = useState(false);
    const [errorModal, setErrorModal] = useState<{
        open: boolean;
        message: string;
    }>({ open: false, message: '' });

    // 🔑 Cart sync effect — keeps "Add / Added" correct on Home, Shop & refresh
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const syncFromCart = () => {
            try {
                const token = localStorage.getItem("accessToken")

                const inCart = token
                    ? isInCart(String(product._id))
                    : isGuestInCart(String(product._id))
                setAdded(inCart);
            } catch {
                setAdded(false);
            }
        };

        // Initial sync (on mount & refresh)
        syncFromCart();

        // Sync when cart changes anywhere (home / shop / cart page)
        window.addEventListener('cartChanged', syncFromCart);

        return () => {
            window.removeEventListener('cartChanged', syncFromCart);
        };
    }, [product._id]);


    useEffect(() => {
        setMounted(true);
        // initialize client once
        favouritesClient.init();

        // subscribe to changes
        const onChange = () => {
            try {
                setWish(favouritesClient.isFavourite(String(product._id)));
            } catch {
                // ignore
            }
        }
        favouritesClient.subscribe(onChange);

        // set initial
        setWish(favouritesClient.isFavourite(String(product._id)));

        return () => {
            favouritesClient.unsubscribe(onChange);
        }
    }, [product._id])

    const imageUrl = useMemo(() => {
        const img = String(product.productImage ?? '')
        if (img === '' || imgError) return PLACEHOLDER;
        if (img.startsWith('http')) return img;
        return img.startsWith('/') ? img : `/${img}`;
    }, [product.productImage, imgError]);

    const actualPrice = product.latestSalePrice?.actualPrice;
    const discountedPrice = product.latestSalePrice?.discountedPrice;
    const stock = useMemo(
        () => formatStock(product.sellStockDisplayQuantity),
        [product.sellStockDisplayQuantity]
    );

    const isOnSale = discountedPrice && actualPrice && Number(discountedPrice) < Number(actualPrice);
    // const isLowStock = !stock.isInStock ? false : /^(0|1|2|3)$/.test(stock.label.replace(/\D/g, ''));
    const limitedBadge = product.sellStockQuantity < 10;
    // String(stock.label).endsWith('+') || isLowStock;
    // console.log('limitedBadge: ', limitedBadge);

    const inferredType: 'SELL' | 'RENT' = useMemo(() => {
        const raw = String(product.sellStockQuantity ?? '')
        const digits = raw.replace(/\D/g, '')
        const q = digits ? parseInt(digits, 10) : NaN
        if (!Number.isNaN(q) && q > 0) return 'SELL'
        return 'SELL'
    }, [product.sellStockQuantity])

    const handleToggleWish = useCallback(
        async (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (loadingWish) return;

            try {
                setLoadingWish(true);

                const res = await favouritesClient.toggle(String(product._id));

                if (!res.success) {
                    if (!res.success) {
                        setErrorModal({
                            open: true,
                            message: res.message || 'Could not update favourite.',
                        });
                        return;
                    } else {
                        setErrorModal({
                            open: true,
                            message: res.message || 'Could not update favourite.',
                        });
                    }
                    return;
                }

                // update UI from source of truth
                setWish(favouritesClient.isFavourite(String(product._id)));
            } catch (err) {
                console.error('Favourite toggle error', err);
                setErrorModal({
                    open: true,
                    message: 'Something went wrong while updating favourites.',
                });
            } finally {
                setLoadingWish(false);
            }
        },
        [product._id, loadingWish]
    );

    return (
        <>
            <Link href={`/products/${product._id}`} className="block">
                <article className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
                    {/* IMAGE */}
                    <div className="relative w-full aspect-square bg-gray-50 overflow-hidden">
                        <Image
                            src={imageUrl}
                            alt={product.productName || "Product"}
                            fill
                            sizes="(max-width:768px) 50vw, (max-width:1200px) 33vw, 25vw"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={() => setImgError(true)}
                        />

                        {/* Wishlist */}
                        <button
                            aria-pressed={wish}
                            onClick={handleToggleWish}
                            disabled={loadingWish}
                            className={`absolute top-3 right-3 p-2 rounded-full shadow-md transition
                                ${wish
                                    ? "bg-rose-500 text-white"
                                    : "bg-white hover:bg-gray-100 text-slate-600"}
                                `}
                        >
                            <Heart size={16} fill={wish ? "currentColor" : "none"} />
                        </button>
                    </div>

                    {/* CONTENT */}
                    <div className="p-4 flex flex-col flex-1">
                        {/* PRODUCT NAME */}
                        <h3
                            className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 min-h-10"
                            title={product.productName}
                        >
                            {product.productName}
                        </h3>

                        {/* PRICE */}
                        <div className="mt-2 flex items-center gap-2">
                            {discountedPrice ? (
                                <>
                                    <span className="text-lg font-bold text-[#0B5C73]">
                                        ₹{formatPrice(discountedPrice)}
                                    </span>

                                    {actualPrice && (
                                        <span className="text-sm text-slate-400 line-through">
                                            ₹{formatPrice(actualPrice)}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <span className="text-sm text-slate-500">
                                    Price not available
                                </span>
                            )}
                        </div>

                        {/* ADD TO CART */}
                        <div className="mt-3">
                            {stock.isInStock && !added ? (
                                <button
                                    onClick={async (ev) => {
                                        ev.preventDefault()
                                        ev.stopPropagation()

                                        if (added || loadingAdd) return

                                        setLoadingAdd(true)

                                        try {

                                            const token =
                                                typeof window !== "undefined"
                                                    ? localStorage.getItem("accessToken")
                                                    : null

                                            // USER LOGGED IN → SERVER CART
                                            if (token) {

                                                const result = await addToCart(String(product._id), 1, inferredType)

                                                if (result?.success) {
                                                    setAdded(true)
                                                    window.dispatchEvent(new Event("cartChanged"))
                                                }

                                            } else {

                                                // GUEST USER → LOCAL STORAGE CART
                                                const key = "wcm_guest_cart_v1"

                                                let existing: any[] = []

                                                try {
                                                    existing = JSON.parse(localStorage.getItem(key) || "[]")
                                                } catch {
                                                    existing = []
                                                }

                                                const existingItem = existing.find(
                                                    (i: any) => String(i.productId) === String(product._id)
                                                )

                                                if (existingItem) {
                                                    existingItem.quantity += 1
                                                } else {
                                                    existing.push({
                                                        productId: String(product._id),
                                                        quantity: 1,
                                                        type: inferredType
                                                    })
                                                }

                                                localStorage.setItem(key, JSON.stringify(existing))

                                                setAdded(true)

                                                window.dispatchEvent(new Event("cartChanged"))
                                            }

                                        } catch (err) {
                                            console.error(err)

                                            setErrorModal({
                                                open: true,
                                                message: "Something went wrong."
                                            })
                                        } finally {
                                            setLoadingAdd(false)
                                        }
                                    }}
                                    disabled={loadingAdd}
                                    className="w-full flex items-center justify-center gap-2 bg-[#0B5C73] hover:bg-[#094a5d] text-white text-sm font-semibold py-2 rounded-lg transition"
                                >
                                    {loadingAdd ? "Adding…" : (
                                        <>
                                            <ShoppingCart size={16} />
                                            Add to Cart
                                        </>
                                    )}
                                </button>
                            ) : added ? (
                                <button
                                    onClick={(ev) => {
                                        ev.preventDefault()
                                        ev.stopPropagation()
                                        router.push("/cart")
                                    }}
                                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded-lg transition"
                                >
                                    <Check size={16} />
                                    Go to Cart
                                </button>
                            ) : null}
                        </div>

                        {/* STOCK */}
                        <div className="mt-3 text-xs">
                            {stock.isInStock ? (
                                <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">
                                    ● {stock.label} units left
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 px-2 py-1 rounded-full font-medium">
                                    Out of stock
                                </span>
                            )}
                        </div>
                    </div>
                </article>
            </Link>


            <ConfirmModal
                open={showLoginModal}
                title="Login required"
                description="Please log in to manage your favourites."
                confirmLabel="Go to Login"
                cancelLabel="Cancel"
                onConfirm={() => {
                    setShowLoginModal(false);
                    window.location.href = '/login';
                }}
                onCancel={() => setShowLoginModal(false)}
            />

            <ConfirmModal
                open={showRemoveFavModal}
                title="Remove from favourites?"
                description="This product will be removed from your favourites."
                confirmLabel="Remove"
                cancelLabel="Keep"
                loading={loadingWish}
                onCancel={() => setShowRemoveFavModal(false)}
                onConfirm={async () => {
                    try {
                        setLoadingWish(true);
                        await favouritesClient.toggle(String(product._id));
                        setWish(false);
                    } finally {
                        setLoadingWish(false);
                        setShowRemoveFavModal(false);
                    }
                }}
            />

            <ConfirmModal
                open={errorModal.open}
                title="Login required"
                description="Please log in to add products to your cart."
                confirmLabel="Go to Login"
                cancelLabel="Cancel"
                onConfirm={() => {
                    setErrorModal({ open: false, message: '' });
                    window.location.href = '/login';
                }}
                onCancel={() => {
                    setErrorModal({ open: false, message: '' });
                }}
            />
        </>
    )
}