"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Product as ProdType } from "../types/product";
import { ShoppingCart, Check, Heart, ArrowUpRight } from "lucide-react";
import { addToCart, isInCart } from "../lib/cart";
import favouritesClient from "../lib/favouritesClient";
import ConfirmModal from "@/components/ui/ConfirmModal";

type Product = ProdType;
type Props = { product: Product; initialAdded?: boolean };

const PLACEHOLDER = "/no-image-placeholder.png";

/* -------------------- format helpers (unchanged) -------------------- */
function formatStock(q: unknown): { isInStock: boolean; label: string } {
    if (q === null || q === undefined || q === "")
        return { isInStock: false, label: "Stock unknown" };
    if (typeof q === "number")
        return q > 0
            ? { isInStock: true, label: String(q) }
            : { isInStock: false, label: "0" };
    if (typeof q === "string") {
        const trimmed = q.trim();
        if (/\d+\+$/.test(trimmed)) return { isInStock: true, label: trimmed };
        const parsed = parseInt(trimmed.replace(/\D/g, ""), 10);
        if (!Number.isNaN(parsed))
            return parsed > 0
                ? { isInStock: true, label: trimmed }
                : { isInStock: false, label: trimmed };
        return { isInStock: false, label: "Stock not confirmed" };
    }
    return { isInStock: false, label: "Stock unknown" };
}

function formatPrice(n?: number | string | null) {
    if (n === null || n === undefined) return "";
    const num = typeof n === "string" ? Number(n) : n;
    if (Number.isNaN(num as number)) return String(n);
    return (num as number).toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}

function isGuestInCart(productId: string) {
    const raw = localStorage.getItem("wcm_guest_cart_v1");
    if (!raw) return false;

    try {
        const items = JSON.parse(raw);
        return items.some((i: any) => i.productId === productId);
    } catch {
        return false;
    }
}

/* -------------------- Component -------------------- */

export default function ProductCardClient({
    product,
    initialAdded = false,
}: Props) {
    const router = useRouter();

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
    }>({ open: false, message: "" });

    // 🔑 Cart sync effect — keeps "Add / Added" correct on Home, Shop & refresh
    useEffect(() => {
        if (typeof window === "undefined") return;

        const syncFromCart = () => {
            try {
                const token = localStorage.getItem("accessToken");

                const inCart = token
                    ? isInCart(String(product._id))
                    : isGuestInCart(String(product._id));
                setAdded(inCart);
            } catch {
                setAdded(false);
            }
        };

        // Initial sync (on mount & refresh)
        syncFromCart();

        // Sync when cart changes anywhere (home / shop / cart page)
        window.addEventListener("cartChanged", syncFromCart);

        return () => {
            window.removeEventListener("cartChanged", syncFromCart);
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
        };
        favouritesClient.subscribe(onChange);

        // set initial
        setWish(favouritesClient.isFavourite(String(product._id)));

        return () => {
            favouritesClient.unsubscribe(onChange);
        };
    }, [product._id]);

    const imageUrl = useMemo(() => {
        const img = String(product.productImage ?? "");
        if (img === "" || imgError) return PLACEHOLDER;
        if (img.startsWith("http")) return img;
        return img.startsWith("/") ? img : `/${img}`;
    }, [product.productImage, imgError]);

    const actualPrice = product.latestSalePrice?.actualPrice;
    const discountedPrice = product.latestSalePrice?.discountedPrice;
    const stock = useMemo(
        () =>
            formatStock(
                product.sellStockQuantity ?? product.sellStockDisplayQuantity,
            ),
        [product.sellStockQuantity, product.sellStockDisplayQuantity],
    );

    const isOnSale =
        discountedPrice &&
        actualPrice &&
        Number(discountedPrice) < Number(actualPrice);

    const inferredType: "SELL" | "RENT" = useMemo(() => {
        const raw = String(product.sellStockQuantity ?? "");
        const digits = raw.replace(/\D/g, "");
        const q = digits ? parseInt(digits, 10) : NaN;
        if (!Number.isNaN(q) && q > 0) return "SELL";
        return "SELL";
    }, [product.sellStockQuantity]);

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
                            message:
                                res.message || "Could not update favourite.",
                        });
                        return;
                    } else {
                        setErrorModal({
                            open: true,
                            message:
                                res.message || "Could not update favourite.",
                        });
                    }
                    return;
                }

                // update UI from source of truth
                setWish(favouritesClient.isFavourite(String(product._id)));
            } catch (err) {
                console.error("Favourite toggle error", err);
                setErrorModal({
                    open: true,
                    message: "Something went wrong while updating favourites.",
                });
            } finally {
                setLoadingWish(false);
            }
        },
        [product._id, loadingWish],
    );

    const productUrl = product.seoSlug
        ? `/products/${product.seoSlug}`
        : `/products/${product._id}`;

    return (
        <>
            <div className="block h-full min-w-0">
                <article className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[22px] border border-[#dcebf0] bg-white shadow-[0_10px_27px_rgba(27,65,42,.055)] transition-all duration-300 hover:-translate-y-1 hover:border-[#a2d5df] hover:shadow-[0_22px_45px_rgba(27,65,42,.13)] focus-within:ring-2 focus-within:ring-[#6dbcc9] sm:rounded-[26px] motion-reduce:transform-none">
                    {/* IMAGE */}
                    <div className="relative aspect-[1/1.08] w-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_40%,#fffdf9_7%,#eefafc_72%,#dff1f6_100%)]">
                        <Link
                            href={productUrl}
                            className="absolute inset-0"
                            aria-label={`View ${product.productName}`}
                        >
                            <Image
                                src={imageUrl}
                                alt={product.productName || "Product"}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 25vw, 20vw"
                                className="object-contain p-2 sm:p-3 transition-transform duration-500 ease-out group-hover:scale-[1.08] motion-reduce:transform-none"
                                onError={() => setImgError(true)}
                            />
                        </Link>

                        <span className="pointer-events-none absolute bottom-3 left-3 hidden items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-[#065975] shadow-sm backdrop-blur-sm transition-transform duration-300 group-hover:translate-x-1 sm:inline-flex">
                            See details <ArrowUpRight size={13} />
                        </span>
                        {isOnSale && (
                            <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-[#fff0e0] px-2.5 py-1.5 text-[10px] font-extrabold text-[#99501c] shadow-sm sm:left-3 sm:top-3 sm:text-xs">
                                Special price
                            </span>
                        )}
                        {/* Wishlist */}
                        <button
                            aria-pressed={wish}
                            aria-label={
                                wish
                                    ? `Remove ${product.productName} from favourites`
                                    : `Save ${product.productName} to favourites`
                            }
                            onClick={handleToggleWish}
                            disabled={loadingWish}
                            className={`absolute top-2 right-2 sm:top-3 sm:right-3 z-10 grid min-h-10 min-w-10 place-items-center rounded-full shadow-sm transition duration-200 hover:scale-105
                                ${
                                    wish
                                        ? "bg-rose-500 text-white"
                                        : "bg-white hover:bg-gray-100 text-slate-600"
                                }
                                `}
                        >
                            <Heart
                                size={16}
                                fill={wish ? "currentColor" : "none"}
                            />
                        </button>
                    </div>

                    {/* CONTENT */}
                    <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4 xl:p-5">
                        <p className="mb-1.5 truncate text-[10px] font-bold uppercase tracking-[.12em] text-[#788b91] sm:text-[11px]">
                            {product.categoryPublicName ||
                                product.categoryName ||
                                "Handmade with care"}
                        </p>
                        {/* PRODUCT NAME */}
                        <h3
                            className="line-clamp-2 min-h-10 text-sm font-extrabold leading-snug text-[#173b4a] sm:text-base"
                            title={product.productName}
                        >
                            <Link
                                href={productUrl}
                                className="transition-colors hover:text-[#ce3b49]"
                            >
                                {product.productName}
                            </Link>
                        </h3>

                        {/* PRICE */}
                        <div className="mt-3 flex min-h-9 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            {discountedPrice ? (
                                <>
                                    <span className="text-lg font-extrabold tracking-tight text-[#065975] sm:text-xl">
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
                        <div className="mt-auto pt-4">
                            {stock.isInStock && !added ? (
                                <button
                                    onClick={async (ev) => {
                                        ev.preventDefault();
                                        ev.stopPropagation();

                                        if (added || loadingAdd) return;

                                        setLoadingAdd(true);

                                        try {
                                            const token =
                                                typeof window !== "undefined"
                                                    ? localStorage.getItem(
                                                          "accessToken",
                                                      )
                                                    : null;

                                            // USER LOGGED IN → SERVER CART
                                            if (token) {
                                                const result = await addToCart(
                                                    String(product._id),
                                                    1,
                                                    inferredType,
                                                );

                                                if (result?.success) {
                                                    setAdded(true);
                                                    window.dispatchEvent(
                                                        new Event(
                                                            "cartChanged",
                                                        ),
                                                    );
                                                }
                                            } else {
                                                // GUEST USER → LOCAL STORAGE CART
                                                const key = "wcm_guest_cart_v1";

                                                let existing: any[] = [];

                                                try {
                                                    existing = JSON.parse(
                                                        localStorage.getItem(
                                                            key,
                                                        ) || "[]",
                                                    );
                                                } catch {
                                                    existing = [];
                                                }

                                                const existingItem =
                                                    existing.find(
                                                        (i: any) =>
                                                            String(
                                                                i.productId,
                                                            ) ===
                                                            String(product._id),
                                                    );

                                                if (existingItem) {
                                                    existingItem.quantity += 1;
                                                } else {
                                                    existing.push({
                                                        productId: String(
                                                            product._id,
                                                        ),
                                                        quantity: 1,
                                                        type: inferredType,
                                                    });
                                                }

                                                localStorage.setItem(
                                                    key,
                                                    JSON.stringify(existing),
                                                );

                                                setAdded(true);

                                                window.dispatchEvent(
                                                    new Event("cartChanged"),
                                                );
                                            }
                                        } catch (err) {
                                            console.error(err);

                                            setErrorModal({
                                                open: true,
                                                message:
                                                    "Something went wrong.",
                                            });
                                        } finally {
                                            setLoadingAdd(false);
                                        }
                                    }}
                                    disabled={loadingAdd}
                                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[13px] bg-[#065975] px-2 py-2 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:bg-[#03465e] hover:shadow-md sm:text-sm"
                                >
                                    {loadingAdd ? (
                                        "Adding…"
                                    ) : (
                                        <>
                                            <ShoppingCart size={16} />
                                            Add to Cart
                                        </>
                                    )}
                                </button>
                            ) : added ? (
                                <button
                                    onClick={(ev) => {
                                        ev.preventDefault();
                                        ev.stopPropagation();
                                        router.push("/cart");
                                    }}
                                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#e9f4e9] px-2 py-2 text-xs font-bold text-[#065975] transition-colors hover:bg-[#d6ebdc] sm:text-sm"
                                >
                                    <Check size={16} />
                                    Go to Cart
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled
                                    className="flex min-h-11 w-full items-center justify-center rounded-xl border border-[#e5e9e2] bg-[#f4f5f2] px-2 text-xs font-bold text-[#94a096] sm:text-sm"
                                >
                                    Currently unavailable
                                </button>
                            )}
                        </div>

                        {/* STOCK */}
                        <div className="mt-2 text-[11px] sm:text-xs">
                            {stock.isInStock ? (
                                <span className="inline-flex items-center gap-1 text-[#5b8b6a] font-medium">
                                    ● In stock
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[#a56a61] font-medium">
                                    Out of stock
                                </span>
                            )}
                        </div>
                    </div>
                </article>
            </div>

            <ConfirmModal
                open={showLoginModal}
                title="Login required"
                description="Please log in to manage your favourites."
                confirmLabel="Go to Login"
                cancelLabel="Cancel"
                onConfirm={() => {
                    setShowLoginModal(false);
                    window.location.href = "/login";
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
                    setErrorModal({ open: false, message: "" });
                    window.location.href = "/login";
                }}
                onCancel={() => {
                    setErrorModal({ open: false, message: "" });
                }}
            />
        </>
    );
}