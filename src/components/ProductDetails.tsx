"use client";
import { publicImageUrl } from "@/lib/publicImageUrl";

import React, { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { addToCart, isInCart } from "../lib/cart";
import favouritesClient from "../lib/favouritesClient";
import ShareMenu from "@/components/ui/ShareMenu";

/* ---------------- Types ---------------- */
type SalePrice = { discountedPrice?: number; actualPrice?: number };
type ProductAttribute = {
    attributeId: string;
    attributePublicName: string;
    value: string;
    showOnWeb?: boolean;
};
type ProductImage = { imageId?: string; imagePath?: string; title?: string };

type Product = {
    _id: string;
    productName: string;
    seoSlug?: string;
    productImage?: string;
    shortDescription?: string;
    longDescription?: string;
    isAvailableForSale?: boolean;
    sellStockQuantity?:
        string | number | { quantity?: number; qty?: number } | null;
    sellStockDisplayQuantity?: string | number | null;
    productAttributes?: ProductAttribute[];
    productImages?: ProductImage[];
    salePrice?: SalePrice | null;
};

/* Return shape for addToCart helper — adjust to match your lib/cart implementation if needed */
type AddToCartResult = {
    success: boolean;
    cartCount?: number;
    count?: number;
    needLogin?: boolean;
    status?: number;
    message?: string;
    payload?: any;
} | null;

/* ---------- Utilities ---------- */
function formatINR(value?: number | null) {
    if (value == null || Number.isNaN(value)) return "-";
    try {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(value);
    } catch {
        return `₹${value}`;
    }
}

function isGuestInCart(productId: string) {
    try {
        const raw = localStorage.getItem("wcm_guest_cart_v1");
        if (!raw) return false;

        const items = JSON.parse(raw);
        return items.some(
            (i: any) => String(i.productId) === String(productId),
        );
    } catch {
        return false;
    }
}

/** Robust parser for different backend shapes */
function parseStockValue(raw: Product["sellStockQuantity"]): number {
    if (raw == null) return 0;

    if (typeof raw === "number") {
        if (Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
        return 0;
    }

    if (typeof raw === "object") {
        const maybeQty =
            (raw as any).quantity ??
            (raw as any).qty ??
            (raw as any).stock ??
            null;
        if (typeof maybeQty === "number" && Number.isFinite(maybeQty))
            return Math.max(0, Math.floor(maybeQty));
        if (typeof maybeQty === "string") {
            const digits = maybeQty.match(/-?\d+(\.\d+)?/);
            if (digits) return Math.max(0, Math.floor(Number(digits[0])));
        }
        return 0;
    }

    if (typeof raw === "string") {
        const trimmed = raw.trim();
        const direct = Number(trimmed);
        if (!Number.isNaN(direct) && Number.isFinite(direct))
            return Math.max(0, Math.floor(direct));
        const match = trimmed.match(/-?\d+(\.\d+)?/);
        if (match) {
            const n = Number(match[0]);
            if (!Number.isNaN(n) && Number.isFinite(n))
                return Math.max(0, Math.floor(n));
        }
        return 0;
    }

    return 0;
}

function getStoredCustomerId(): string | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem("auth");
        return raw ? (JSON.parse(raw)?.customerId ?? null) : null;
    } catch {
        return null;
    }
}

/* ---------- Review Module (embedded; copied from your original) ---------- */

type Review = {
    id: string;
    name: string;
    rating: number; // 1-5
    text: string;
    createdAt: string; // ISO
    helpful?: number;
    images?: string[];
};

function formatRelative(dateIso: string) {
    try {
        const diffMs = Date.now() - new Date(dateIso).getTime();
        const mins = Math.floor(diffMs / (1000 * 60));
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 30) return `${days}d ago`;
        const months = Math.floor(days / 30);
        if (months < 12) return `${months}mo ago`;
        const years = Math.floor(months / 12);
        return `${years}y ago`;
    } catch {
        return dateIso;
    }
}

function StarIcon({ filled }: { filled: boolean }) {
    return (
        <svg
            className={`w-4 h-4 ${filled ? "text-yellow-400" : "text-gray-300"}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
        >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.95a1 1 0 00.95.69h4.163c.969 0 1.371 1.24.588 1.81l-3.37 2.466a1 1 0 00-.364 1.118l1.287 3.95c.3.921-.755 1.688-1.54 1.118L10 15.347 6.601 17.619c-.785.57-1.84-.197-1.54-1.118l1.287-3.95a1 1 0 00-.364-1.118L2.615 9.377c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.286-3.95z" />
        </svg>
    );
}

function ReviewModule({
    productName,
    initialReviews = [] as Review[],
    maxPerPage = 4,
}: {
    productName?: string;
    initialReviews?: Review[];
    maxPerPage?: number;
}) {
    const sample: Review[] = [
        {
            id: "r1",
            name: "Asha",
            rating: 5,
            text: "Absolutely lovely! Great gift & very well packed. The stitches are neat and colors are vibrant.",
            createdAt: new Date(
                Date.now() - 1000 * 60 * 60 * 24 * 2,
            ).toISOString(),
            helpful: 12,
            images: [],
        },
        {
            id: "r2",
            name: "Ravi",
            rating: 4,
            text: "Nice quality, shipping took a little long but product matched the photos.",
            createdAt: new Date(
                Date.now() - 1000 * 60 * 60 * 24 * 10,
            ).toISOString(),
            helpful: 3,
            images: [],
        },
        {
            id: "r3",
            name: "Maya",
            rating: 5,
            text: "My sister loved it — looks premium!",
            createdAt: new Date(
                Date.now() - 1000 * 60 * 60 * 24 * 30,
            ).toISOString(),
            helpful: 7,
            images: [],
        },
    ];

    const [reviews, setReviews] = useState<Review[]>(
        initialReviews.length ? initialReviews : sample,
    );
    const [filterRating, setFilterRating] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    const [showWrite, setShowWrite] = useState(false);

    const [formName, setFormName] = useState("");
    const [formRating, setFormRating] = useState(5);
    const [formText, setFormText] = useState("");
    const [formImage, setFormImage] = useState("");

    const stats = useMemo(() => {
        const total = reviews.length;
        const avg = total
            ? reviews.reduce((s, r) => s + r.rating, 0) / total
            : 0;
        const counts = [0, 0, 0, 0, 0];
        reviews.forEach((r) => {
            counts[r.rating - 1] += 1;
        });
        return { total, avg, counts };
    }, [reviews]);

    const filtered = useMemo(() => {
        return filterRating
            ? reviews.filter((r) => r.rating === filterRating)
            : reviews;
    }, [reviews, filterRating]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / maxPerPage));
    const pageItems = filtered.slice(
        (page - 1) * maxPerPage,
        page * maxPerPage,
    );

    const [toast, setToast] = useState<string | null>(null);
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 1500);
        return () => clearTimeout(t);
    }, [toast]);

    function handleHelpful(id: string) {
        setReviews((prev) =>
            prev.map((r) =>
                r.id === id ? { ...r, helpful: (r.helpful ?? 0) + 1 } : r,
            ),
        );
        setToast("Thank you — helpful noted");
    }

    function submitReview(e?: React.FormEvent) {
        e?.preventDefault();
        if (!formName.trim() || !formText.trim()) {
            setToast("Please enter name and review");
            return;
        }
        const newReview: Review = {
            id: `r_${Date.now()}`,
            name: formName.trim(),
            rating: Math.max(1, Math.min(5, Math.round(formRating))),
            text: formText.trim(),
            createdAt: new Date().toISOString(),
            helpful: 0,
            images: formImage ? [formImage.trim()] : [],
        };
        setReviews((p) => [newReview, ...p]);
        setFormName("");
        setFormRating(5);
        setFormText("");
        setFormImage("");
        setShowWrite(false);
        setToast("Thanks for your review!");
    }

    return (
        <section className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-[#065975] text-white rounded-xl px-4 py-3 flex flex-col items-center justify-center">
                        <div className="text-2xl font-extrabold leading-none">
                            {stats.total ? stats.avg.toFixed(1) : "—"}
                        </div>
                        <div className="text-xs">avg rating</div>
                    </div>

                    <div>
                        <div className="flex items-center gap-3">
                            <div className="flex">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <StarIcon
                                        key={i}
                                        filled={i < Math.round(stats.avg)}
                                    />
                                ))}
                            </div>
                            <div className="text-sm text-gray-600">
                                {" "}
                                {stats.total} review
                                {stats.total !== 1 ? "s" : ""}
                            </div>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                            Rated by customers who bought this product
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowWrite(true)}
                        className="px-3 py-2 bg-[#0c7d96] text-white rounded-md shadow-sm hover:brightness-95"
                    >
                        Write a review
                    </button>
                    <div className="text-sm text-gray-600">Sort:</div>
                    <select
                        onChange={(e) => {
                            const v = e.target.value;
                            if (v === "newest")
                                setReviews((r) =>
                                    [...r].sort(
                                        (a, b) =>
                                            +new Date(b.createdAt) -
                                            +new Date(a.createdAt),
                                    ),
                                );
                            if (v === "helpful")
                                setReviews((r) =>
                                    [...r].sort(
                                        (a, b) =>
                                            (b.helpful ?? 0) - (a.helpful ?? 0),
                                    ),
                                );
                        }}
                        className="border rounded px-2 py-1 text-sm"
                        aria-label="Sort reviews"
                        defaultValue="newest"
                    >
                        <option value="newest">Newest</option>
                        <option value="helpful">Most helpful</option>
                    </select>
                </div>
            </div>

            {/* distribution */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                <div className="md:col-span-3">
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, idx) => {
                            const star = 5 - idx;
                            const count = stats.counts[star - 1] ?? 0;
                            const pct = stats.total
                                ? Math.round((count / stats.total) * 100)
                                : 0;
                            return (
                                <button
                                    key={star}
                                    onClick={() => {
                                        setFilterRating((cur) =>
                                            cur === star ? null : star,
                                        );
                                        setPage(1);
                                    }}
                                    className={`w-full flex items-center gap-3 px-2 py-1 rounded hover:bg-gray-50 focus:outline-none ${filterRating === star ? "bg-gray-100 ring-1 ring-[#0c7d96]" : ""}`}
                                >
                                    <div className="w-14 text-sm text-gray-700">
                                        {star}{" "}
                                        <span className="text-yellow-400">
                                            ★
                                        </span>
                                    </div>
                                    <div className="flex-1 bg-gray-100 rounded h-3 overflow-hidden">
                                        <div
                                            className="h-3 bg-[#0c7d96]"
                                            style={{
                                                width: `${pct}%`,
                                                transition: "width .3s",
                                            }}
                                        />
                                    </div>
                                    <div className="w-10 text-right text-sm text-gray-600">
                                        {pct}%
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="md:col-span-2">
                    <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                        <div className="font-semibold">Filter</div>
                        <div className="mt-2 text-sm text-gray-600">
                            Showing{" "}
                            {filterRating ? `${filterRating}-star` : "all"}{" "}
                            reviews
                        </div>
                        {filterRating && (
                            <button
                                onClick={() => setFilterRating(null)}
                                className="mt-2 text-xs text-[#065975] underline"
                            >
                                Clear filter
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* list */}
            <div className="mt-6 space-y-4">
                {pageItems.map((r) => (
                    <article
                        key={r.id}
                        className="border rounded-lg p-4 bg-white shadow-sm"
                    >
                        <header className="flex items-start gap-4">
                            <div
                                aria-hidden
                                className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-semibold"
                            >
                                {r.name
                                    .split(" ")
                                    .map((s) => s[0])
                                    .slice(0, 2)
                                    .join("")
                                    .toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="font-medium text-gray-800">
                                            {r.name}
                                        </div>
                                        <div className="flex items-center text-sm">
                                            {Array.from({ length: 5 }).map(
                                                (__, i) => (
                                                    <StarIcon
                                                        key={i}
                                                        filled={i < r.rating}
                                                    />
                                                ),
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 ml-2">
                                            {formatRelative(r.createdAt)}
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {r.helpful ?? 0} helpful
                                    </div>
                                </div>

                                <p className="mt-3 text-gray-700">{r.text}</p>

                                {r.images?.length ? (
                                    <div className="mt-3 flex gap-2">
                                        {r.images.map((img, i) => (
                                            <a
                                                key={i}
                                                href={img}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="w-20 h-20 rounded-md overflow-hidden border"
                                            >
                                                <img
                                                    src={img}
                                                    alt={`review-${r.id}-${i}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </a>
                                        ))}
                                    </div>
                                ) : null}

                                <div className="mt-3 flex gap-3">
                                    <button
                                        onClick={() => handleHelpful(r.id)}
                                        className="text-sm px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                                    >
                                        Helpful
                                    </button>
                                    <button
                                        onClick={() =>
                                            setToast("Report submitted")
                                        }
                                        className="text-sm px-2 py-1 rounded bg-gray-50 hover:bg-gray-100"
                                    >
                                        Report
                                    </button>
                                </div>
                            </div>
                        </header>
                    </article>
                ))}

                {/* pagination */}
                <div className="flex items-center justify-between mt-1">
                    <div className="text-sm text-gray-600">
                        Showing{" "}
                        {filtered.length === 0
                            ? 0
                            : Math.min(
                                  (page - 1) * maxPerPage + 1,
                                  filtered.length,
                              )}
                        –{Math.min(page * maxPerPage, filtered.length)} of{" "}
                        {filtered.length}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            Prev
                        </button>
                        <div className="text-sm">
                            {page} / {totalPages}
                        </div>
                        <button
                            onClick={() =>
                                setPage((p) => Math.min(totalPages, p + 1))
                            }
                            disabled={page === totalPages}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* write modal */}
            {showWrite && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setShowWrite(false)}
                    />
                    <form
                        onSubmit={submitReview}
                        className="relative max-w-xl w-full bg-white rounded-xl p-6 z-10 shadow-2xl"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">
                                Write a review for{" "}
                                {productName ?? "this product"}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowWrite(false)}
                                className="text-gray-500 px-2"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3">
                            <label className="text-sm">
                                Your name
                                <input
                                    value={formName}
                                    onChange={(e) =>
                                        setFormName(e.target.value)
                                    }
                                    className="mt-1 w-full border rounded px-3 py-2"
                                />
                            </label>

                            <label className="text-sm">
                                Rating
                                <div className="mt-1 flex items-center gap-2">
                                    {Array.from({ length: 5 }).map((_, i) => {
                                        const star = i + 1;
                                        return (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() =>
                                                    setFormRating(star)
                                                }
                                                className={`p-2 rounded ${formRating >= star ? "bg-yellow-50" : "bg-gray-50"}`}
                                                aria-label={`Rate ${star} star`}
                                            >
                                                <StarIcon
                                                    filled={formRating >= star}
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
                            </label>

                            <label className="text-sm">
                                Review
                                <textarea
                                    value={formText}
                                    onChange={(e) =>
                                        setFormText(e.target.value)
                                    }
                                    rows={4}
                                    className="mt-1 w-full border rounded px-3 py-2"
                                />
                            </label>

                            <label className="text-sm">
                                Image URL (optional)
                                <input
                                    value={formImage}
                                    onChange={(e) =>
                                        setFormImage(e.target.value)
                                    }
                                    className="mt-1 w-full border rounded px-3 py-2"
                                    placeholder="https://..."
                                />
                            </label>

                            <div className="flex items-center justify-end gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowWrite(false)}
                                    className="px-3 py-2 rounded border"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[#0c7d96] text-white rounded"
                                >
                                    Submit review
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* small toast */}
            {toast && (
                <div className="fixed left-1/2 transform -translate-x-1/2 bottom-8 bg-[#065975] text-white px-4 py-2 rounded-md shadow z-50">
                    {toast}
                </div>
            )}
        </section>
    );
}

/* ---------- Main ProductClient Component ---------- */

export default function ProductClient({ product }: { product: Product }) {
    const router = useRouter();
    const addingRef = React.useRef(false);

    const {
        _id,
        productName,
        shortDescription,
        longDescription,
        isAvailableForSale,
        sellStockQuantity,
        sellStockDisplayQuantity,
        productAttributes = [],
        productImages = [],
        salePrice,
    } = product;

    // Put primary (product.productImage) first so display image is shown immediately
    function normalizeImage(src: unknown): string | null {
        return typeof src === "string" ? publicImageUrl(src) : null;
    }

    const primaryImage = normalizeImage(product.productImage);

    const otherImages = (productImages || [])
        .map((p) => normalizeImage(p.imagePath ?? p.imageId))
        .filter(Boolean) as string[];

    const images = useMemo(() => {
        return [
            ...(primaryImage ? [primaryImage] : []),
            ...otherImages.filter((src) => src !== primaryImage),
        ];
    }, [primaryImage, otherImages]);

    // selectedImage starts with the primary image (if any), otherwise first available
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const [quantity, setQuantity] = useState<number>(1);
    const [cartState, setCartState] = useState<
        "unknown" | "added" | "not_added"
    >("unknown");
    const [toast, setToast] = useState<string | null>(null);
    const [lightbox, setLightbox] = useState(false);
    const [adding, setAdding] = useState(false); // indicates API call in progress
    const [isFavourite, setIsFavourite] = useState(false);
    const [favLoading, setFavLoading] = useState(false);
    const [unitSystem, setUnitSystem] = useState<"metric" | "converted">(
        "metric",
    );
    const visibleProductAttributes = useMemo(() => {
        return (productAttributes || []).filter(
            (attr) => attr.showOnWeb !== false,
        );
    }, [productAttributes]);

    const sanitizedHTML = useMemo(() => {
        if (typeof window === "undefined") return longDescription || "";
        return typeof longDescription === "string"
            ? DOMPurify.sanitize(longDescription)
            : "";
    }, [longDescription]);

    useEffect(() => {
        if (!selectedImage && images.length) {
            setSelectedImage(images[0]);
        }
    }, [images, selectedImage]);

    useEffect(() => {
        const saved = localStorage.getItem("wc_units");
        if (saved === "metric" || saved === "converted") {
            setUnitSystem(saved);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("wc_units", unitSystem);
    }, [unitSystem]);

    // NEW: show thumbnails only after main image is loaded or after a small timeout
    const [thumbsVisible, setThumbsVisible] = useState(false);
    useEffect(() => {
        // fallback: reveal thumbs after a short timeout if onLoadingComplete doesn't fire
        const t = window.setTimeout(() => setThumbsVisible(true), 450);
        return () => clearTimeout(t);
    }, []);

    const stockNumber = parseStockValue(sellStockQuantity);
    const stockDisplay =
        sellStockDisplayQuantity ?? (stockNumber > 0 ? stockNumber : 0);
    const priceDisplay =
        salePrice?.discountedPrice ?? salePrice?.actualPrice ?? null;
    const isOutOfStock = stockNumber === 0 || !isAvailableForSale;

    // infer SELL or RENT for addToCart helper (similar to ProductCardClient)
    const inferredType: "SELL" | "RENT" = useMemo(() => {
        const raw = String(sellStockQuantity ?? "");
        const digits = raw.replace(/\D/g, "");
        const q = digits ? parseInt(digits, 10) : NaN;
        if (!Number.isNaN(q) && q > 0) return "SELL";
        return "SELL";
    }, [sellStockQuantity]);

    useEffect(() => {
        if (cartState === "not_added" && quantity > stockNumber) {
            setQuantity(stockNumber || 1);
        }
    }, [sellStockQuantity, stockNumber, _id, cartState]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 1400);
        return () => clearTimeout(t);
    }, [toast]);

    function handleQuantity(delta: number) {
        setQuantity((q) => {
            const next = q + delta;
            if (next < 1) return 1;
            if (stockNumber && next > stockNumber) return stockNumber;
            return next;
        });
    }

    useEffect(() => {
        const client = favouritesClient;

        let mounted = true;

        const update = () => {
            if (!mounted) return;

            try {
                const fav = client.isFavourite(String(_id));
                setIsFavourite(!!fav);
            } catch {
                setIsFavourite(false);
            }
        };

        // SAFE async call
        client
            .refreshFromServerIfAuthorized?.()
            .then(() => {
                if (mounted) update();
            })
            .catch(() => {
                // prevent crash / loop
            });

        client.subscribe(update);
        update();

        return () => {
            mounted = false;
            client.unsubscribe(update);
        };
    }, [_id]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const syncFromCart = () => {
            try {
                const token = localStorage.getItem("accessToken");

                // ================= LOGGED IN =================
                if (token) {
                    const inCart = isInCart(String(_id));
                    setCartState(inCart ? "added" : "not_added");
                    return;
                }

                // ================= GUEST CART =================
                const raw = localStorage.getItem("wcm_guest_cart_v1");

                if (raw) {
                    try {
                        const items = JSON.parse(raw);

                        const found = items.find(
                            (i: any) => String(i.productId) === String(_id),
                        );

                        if (found) {
                            setQuantity(found.quantity || 1);
                            setCartState("added");
                            return;
                        }
                    } catch {}
                }

                setCartState("not_added");
            } catch (err) {
                console.warn("Cart sync failed", err);
                setCartState("not_added");
            }
        };

        // initial
        syncFromCart();

        // listen for global updates
        window.addEventListener("cartChanged", syncFromCart);

        return () => {
            window.removeEventListener("cartChanged", syncFromCart);
        };
    }, [_id]);

    // ===== add to cart using shared helper OR fallback to raw fetch =====
    async function handleAddToCart() {
        if (isOutOfStock) {
            setToast("Cannot add — out of stock");
            return;
        }

        if (addingRef.current) return;

        addingRef.current = true;
        setAdding(true);

        try {
            const token = localStorage.getItem("accessToken");

            // ================= LOGGED IN =================
            if (token) {
                const result = await addToCart(
                    String(_id),
                    quantity,
                    inferredType,
                );

                if (result?.success) {
                    setCartState("added");
                    setToast("Added to cart");
                    window.dispatchEvent(new Event("cartChanged"));
                    return;
                }

                setToast(result?.message || "Failed to add to cart");
                return;
            }

            // ================= GUEST CART =================
            const key = "wcm_guest_cart_v1";

            let existing: any[] = [];

            try {
                existing = JSON.parse(localStorage.getItem(key) || "[]");
            } catch {
                existing = [];
            }

            const existingItem = existing.find(
                (i: any) => String(i.productId) === String(_id),
            );

            if (existingItem) {
                existingItem.quantity = Math.min(
                    existingItem.quantity + quantity,
                    stockNumber || existingItem.quantity + quantity,
                );
            } else {
                existing.push({
                    productId: String(_id),
                    quantity,
                    type: inferredType,
                });
            }

            localStorage.setItem(key, JSON.stringify(existing));

            setCartState("added");
            setToast("Added to cart");

            window.dispatchEvent(new Event("cartChanged"));
        } catch (err) {
            console.error("Add to cart error:", err);
            setToast("Something went wrong");
        } finally {
            addingRef.current = false;
            setAdding(false);
        }
    }

    async function toggleFavourite() {
        if (favLoading) return;

        const prev = isFavourite;

        // optimistic UI
        setIsFavourite(!prev);
        setFavLoading(true);

        try {
            const res = await favouritesClient.toggle(String(_id));

            if (!res.success) {
                setIsFavourite(prev); // rollback
                setToast(res.message || "Failed");
                return;
            }

            setToast(!prev ? "Added to favourites" : "Removed from favourites");
        } catch {
            setIsFavourite(prev);
            setToast("Something went wrong");
        } finally {
            setFavLoading(false);
        }
    }

    /** Gms to Kg and Cms to Inch */
    function formatNumber(n: number, decimals = 2) {
        return Number.isFinite(n)
            ? n.toFixed(decimals).replace(/\.00$/, "")
            : "";
    }

    function toKg(grams: number) {
        return grams / 1000;
    }

    function toInches(cm: number) {
        return cm / 2.54;
    }

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 5);

    const formattedDelivery = deliveryDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
    });

    return (
        <div className="relative">
            {/* Compact introduction keeps the product image and purchase action in view. */}
            <div className="rounded-[24px] border border-[#e3ebe2] bg-white/85 px-4 py-4 sm:px-6 sm:py-5 lg:px-7 lg:py-6 shadow-[0_10px_35px_rgba(25,65,45,.035)]">
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                    <div className="min-w-0">
                        <span className="text-[10px] sm:text-xs uppercase font-extrabold tracking-[.16em] text-[#8c704c]">
                            Made with care · We Craft Memories
                        </span>
                        <h1 className="mt-1 text-[clamp(1.4rem,2.4vw,2.25rem)] font-extrabold tracking-[-.035em] text-[#065975] leading-tight">
                            {productName ?? "Product"}
                        </h1>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <ShareMenu
                            kind="product"
                            title={productName}
                            path={`/products/${encodeURIComponent(product.seoSlug || _id)}`}
                        />
                        <span
                            className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${isOutOfStock ? "bg-rose-50 border-rose-100 text-rose-700" : "bg-[#edf7ed] border-[#d5e8d8] text-[#0a7791]"}`}
                        >
                            <span
                                className={`h-2 w-2 rounded-full ${isOutOfStock ? "bg-rose-500" : "bg-[#36a46c]"}`}
                            />
                            {isOutOfStock ? "Out of stock" : "Ready to order"}
                        </span>
                    </div>
                </div>
                <div className="mt-3 flex items-center gap-3 lg:hidden">
                    <span className="text-[1.65rem] font-extrabold tracking-tight text-[#065975]">
                        {priceDisplay != null ? formatINR(priceDisplay) : "—"}
                    </span>
                    {salePrice?.actualPrice != null &&
                        salePrice.actualPrice !== salePrice.discountedPrice && (
                            <span className="text-sm text-slate-400 line-through">
                                {formatINR(salePrice.actualPrice)}
                            </span>
                        )}
                    <span className="ml-auto text-[11px] font-medium text-[#607987]">
                        Secure checkout
                    </span>
                </div>
            </div>

            <div className="w-full mx-auto pt-4 pb-36 lg:pt-6 lg:pb-28">
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.12fr)_minmax(340px,.88fr)] xl:grid-cols-[minmax(0,1.05fr)_minmax(380px,.95fr)] gap-5 lg:gap-8 xl:gap-10 items-start">
                    <div className="min-w-0 space-y-5 lg:space-y-7">
                        <div className="rounded-[24px] sm:rounded-[30px] border border-[#e4ebe2] bg-white p-3 sm:p-5 lg:p-6 shadow-[0_14px_45px_rgba(23,79,67,.05)]">
                            {/* Reduced-height, contained product photo; click for full resolution. */}
                            <div className="relative mx-auto w-full max-w-[670px] h-[clamp(240px,73vw,355px)] sm:h-[430px] lg:h-[min(40vw,510px)] overflow-hidden rounded-[18px] sm:rounded-[24px] bg-[radial-gradient(circle_at_50%_35%,#fff_12%,#edf4e9_100%)]">
                                {typeof selectedImage === "string" &&
                                selectedImage ? (
                                    <button
                                        type="button"
                                        onClick={() => setLightbox(true)}
                                        aria-label={`Enlarge image of ${productName}`}
                                        className="relative block w-full h-full group cursor-zoom-in"
                                    >
                                        <Image
                                            src={selectedImage}
                                            alt={productName ?? "Product image"}
                                            fill
                                            priority
                                            sizes="(max-width: 640px) 95vw, (max-width: 1024px) 640px, 42vw"
                                            className="object-contain p-3 sm:p-5 transition-transform duration-500 group-hover:scale-[1.045]"
                                        />
                                        <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-[#065975] shadow-sm">
                                            Tap to enlarge ↗
                                        </span>
                                    </button>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                                        No image available
                                    </div>
                                )}
                            </div>
                            {images.length > 1 && (
                                <div
                                    className="mt-4 flex w-full max-w-[670px] mx-auto gap-2.5 overflow-x-auto pb-1 custom-scrollbar"
                                    role="group"
                                    aria-label="Choose a product photo"
                                >
                                    {images.map((src, idx) => (
                                        <button
                                            type="button"
                                            key={`${src}-${idx}`}
                                            onClick={() =>
                                                setSelectedImage(src)
                                            }
                                            aria-label={`View product photo ${idx + 1}`}
                                            aria-pressed={selectedImage === src}
                                            className={`relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-[#f5f8f2] transition-all duration-200 hover:-translate-y-0.5 ${selectedImage === src ? "border-[#0c7d96] ring-2 ring-[#0c7d96]/10" : "border-transparent hover:border-[#b3cbb5]"}`}
                                        >
                                            <Image
                                                src={src}
                                                alt={`${productName} view ${idx + 1}`}
                                                fill
                                                sizes="64px"
                                                className="object-contain p-1"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-[#607987]">
                                <span>✦ Thoughtfully handmade</span>
                                <span aria-hidden="true">·</span>
                                <span>Details worth a closer look</span>
                            </div>
                        </div>

                        {/* ================= MOBILE PRODUCT INFO ================= */}
                        <div className="lg:hidden space-y-4">
                            {/* Short Description */}
                            {shortDescription && (
                                <div className="bg-white rounded-2xl shadow p-5 text-gray-700 text-sm leading-relaxed">
                                    {shortDescription}
                                </div>
                            )}

                            {/* Add to Favourites */}
                            <button
                                onClick={toggleFavourite}
                                disabled={favLoading}
                                className={`w-full py-3 rounded-xl border font-medium transition
            ${
                isFavourite
                    ? "bg-[#0c7d96]/10 text-[#0c7d96] border-[#0c7d96]"
                    : "text-gray-700 bg-white"
            }
            ${favLoading ? "opacity-60 cursor-not-allowed" : ""}
        `}
                            >
                                {favLoading
                                    ? "Please wait..."
                                    : isFavourite
                                      ? "♥ Added to Favourites"
                                      : "♡ Add to Favourites"}
                            </button>

                            {/* Estimated Delivery */}
                            <div className="bg-[#065975]/5 rounded-xl p-4 text-sm text-gray-700">
                                <div className="mt-1">
                                    Delivery timing is confirmed for your
                                    address at checkout
                                </div>
                            </div>

                            {/* Product Details */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-base font-semibold text-[#065975]">
                                        Product Details
                                    </h3>

                                    <div className="flex items-center gap-2 text-xs">
                                        <button
                                            onClick={() =>
                                                setUnitSystem("metric")
                                            }
                                            className={`px-3 py-1 rounded-full border transition
                        ${
                            unitSystem === "metric"
                                ? "bg-[#065975] text-white border-[#065975]"
                                : "border-gray-300 text-gray-600"
                        }`}
                                        >
                                            gms / cms
                                        </button>

                                        <button
                                            onClick={() =>
                                                setUnitSystem("converted")
                                            }
                                            className={`px-3 py-1 rounded-full border transition
                        ${
                            unitSystem === "converted"
                                ? "bg-[#065975] text-white border-[#065975]"
                                : "border-gray-300 text-gray-600"
                        }`}
                                        >
                                            kg / inches
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-[#ed943f]/10 rounded-xl p-5 shadow">
                                    <ul className="text-sm text-gray-700 space-y-2">
                                        {visibleProductAttributes.length ===
                                        0 ? (
                                            <li className="text-gray-500">
                                                No attributes provided
                                            </li>
                                        ) : (
                                            visibleProductAttributes.map(
                                                (attr) => {
                                                    const name =
                                                        attr.attributePublicName;
                                                    const rawValue = parseFloat(
                                                        attr.value,
                                                    );
                                                    let displayValue: React.ReactNode =
                                                        attr.value;

                                                    if (
                                                        !Number.isNaN(rawValue)
                                                    ) {
                                                        if (name === "Weight") {
                                                            displayValue =
                                                                unitSystem ===
                                                                "metric"
                                                                    ? `${formatNumber(rawValue, 0)} gms`
                                                                    : `${formatNumber(toKg(rawValue))} kg`;
                                                        }

                                                        if (
                                                            [
                                                                "Width",
                                                                "Length",
                                                                "Height",
                                                            ].includes(name)
                                                        ) {
                                                            displayValue =
                                                                unitSystem ===
                                                                "metric"
                                                                    ? `${formatNumber(rawValue)} cms`
                                                                    : `${formatNumber(toInches(rawValue))}"`;
                                                        }
                                                    }

                                                    return (
                                                        <li
                                                            key={
                                                                attr.attributeId
                                                            }
                                                            className="flex justify-between"
                                                        >
                                                            <span className="text-gray-600">
                                                                {name}
                                                            </span>
                                                            <span className="font-medium text-gray-800">
                                                                {displayValue}
                                                            </span>
                                                        </li>
                                                    );
                                                },
                                            )
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        {/* ================= END MOBILE PRODUCT INFO ================= */}

                        {/* Long Description */}
                        {longDescription && (
                            <div className="bg-white rounded-2xl shadow p-6">
                                {/* <h3 className="text-lg font-semibold text-[#065975] mb-4">
                                    Description
                                </h3> */}

                                <div
                                    className="prose max-w-none text-gray-700"
                                    dangerouslySetInnerHTML={{
                                        __html: sanitizedHTML,
                                    }}
                                />
                            </div>
                        )}

                        {/* Reviews Module inserted here */}
                        {/* <ReviewModule productName={productName} /> */}
                    </div>

                    <aside className="hidden lg:block space-y-6 min-w-0 lg:sticky lg:top-24">
                        <div className="site-card p-5 xl:p-7 sticky top-28 border-[#ccdece] shadow-[0_18px_55px_rgba(23,79,67,.08)]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs uppercase tracking-[.12em] font-bold text-[#77867d]">
                                        Your handmade favourite
                                    </div>
                                    <div className="text-4xl font-extrabold tracking-tight text-[#065975] mt-1">
                                        {priceDisplay
                                            ? formatINR(priceDisplay)
                                            : "—"}
                                    </div>
                                    {salePrice?.actualPrice &&
                                        salePrice.actualPrice !==
                                            salePrice.discountedPrice && (
                                            <div className="text-sm text-gray-400 line-through mt-1">
                                                {formatINR(
                                                    salePrice.actualPrice,
                                                )}
                                            </div>
                                        )}
                                </div>

                                <div className="text-right">
                                    <div className="text-xs text-gray-500">
                                        Availability
                                    </div>
                                    <div
                                        className={`text-sm font-semibold ${isOutOfStock ? "text-red-600" : "text-green-700"}`}
                                    >
                                        {isOutOfStock
                                            ? "Out of stock"
                                            : `In stock (${stockDisplay})`}
                                    </div>

                                    {stockNumber > 0 && stockNumber <= 5 && (
                                        <div className="text-xs text-orange-600 mt-1 font-medium">
                                            Only {stockNumber} left in stock!
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 flex items-center gap-4">
                                <div
                                    className={`flex items-center border rounded-lg overflow-hidden ${cartState !== "not_added" || isOutOfStock ? "opacity-50 pointer-events-none" : ""}`}
                                >
                                    <button
                                        onClick={() => handleQuantity(-1)}
                                        disabled={quantity <= 1 || isOutOfStock}
                                        className="px-3 py-2 disabled:opacity-50"
                                    >
                                        −
                                    </button>
                                    <input
                                        aria-label="Quantity"
                                        value={quantity}
                                        onChange={(e) => {
                                            const v = Number(
                                                e.target.value || 1,
                                            );
                                            if (Number.isNaN(v)) return;
                                            if (v < 1) setQuantity(1);
                                            else if (
                                                stockNumber &&
                                                v > stockNumber
                                            )
                                                setQuantity(stockNumber);
                                            else setQuantity(Math.floor(v));
                                        }}
                                        className="w-20 text-center py-2"
                                    />
                                    <button
                                        onClick={() => handleQuantity(1)}
                                        disabled={
                                            isOutOfStock ||
                                            Boolean(
                                                stockNumber &&
                                                quantity >= stockNumber,
                                            )
                                        }
                                        className="px-3 py-2 disabled:opacity-50"
                                    >
                                        +
                                    </button>
                                </div>

                                {cartState === "added" ? (
                                    <button
                                        onClick={() => router.push("/cart")}
                                        className="flex-1 min-h-12 py-3 rounded-xl bg-[#065975] hover:bg-[#03465e] text-white font-bold shadow-md transition"
                                    >
                                        Go to Cart →
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleAddToCart}
                                        disabled={
                                            cartState !== "not_added" ||
                                            adding ||
                                            isOutOfStock
                                        }
                                        className={`flex-1 min-h-12 py-3 rounded-xl text-white font-bold shadow-md transition ${
                                            isOutOfStock
                                                ? "bg-gray-300 cursor-not-allowed"
                                                : "bg-[#065975] hover:bg-[#03465e]"
                                        }`}
                                    >
                                        {cartState === "unknown"
                                            ? "Checking cart…"
                                            : adding
                                              ? "Adding…"
                                              : "Add to cart"}
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={toggleFavourite}
                                disabled={favLoading}
                                className={`mt-4 w-full py-2 rounded-lg border transition
                                    ${
                                        isFavourite
                                            ? "bg-[#0c7d96]/10 text-[#0c7d96] border-[#0c7d96]"
                                            : "text-gray-700 hover:bg-gray-50"
                                    }
                                        ${favLoading ? "opacity-60 cursor-not-allowed" : ""}
                                `}
                            >
                                {favLoading
                                    ? "Please wait..."
                                    : isFavourite
                                      ? "♥ Added to Favourites"
                                      : "♡ Add to Favourites"}
                            </button>

                            <div className="mt-4 text-xs text-gray-600 space-y-1">
                                <div>✔ Secure checkout</div>
                                <div>✔ Handmade in India</div>
                                {/* <div>✔ Easy returns</div> */}
                            </div>

                            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                                <div>Delivery estimates shown at checkout</div>
                            </div>
                        </div>

                        {/* Short Description */}
                        {shortDescription && (
                            <div className="bg-white rounded-xl p-5 shadow-sm text-gray-700 text-sm leading-relaxed">
                                {shortDescription}
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-[#065975]">
                                Product Details
                            </h3>

                            <div className="flex items-center gap-2 text-xs">
                                <button
                                    onClick={() => setUnitSystem("metric")}
                                    className={`px-3 py-1 rounded-full border transition ${
                                        unitSystem === "metric"
                                            ? "bg-[#065975] text-white border-[#065975]"
                                            : "border-gray-300 text-gray-600"
                                    }`}
                                >
                                    gms / cms
                                </button>

                                <button
                                    onClick={() => setUnitSystem("converted")}
                                    className={`px-3 py-1 rounded-full border transition ${
                                        unitSystem === "converted"
                                            ? "bg-[#065975] text-white border-[#065975]"
                                            : "border-gray-300 text-gray-600"
                                    }`}
                                >
                                    kg / inches
                                </button>
                            </div>
                        </div>

                        <div className="bg-[#ed943f]/10 rounded-xl p-6 shadow">
                            <ul className="text-sm text-gray-700 space-y-2">
                                {visibleProductAttributes.length === 0 ? (
                                    <li className="text-gray-500">
                                        No attributes provided
                                    </li>
                                ) : (
                                    visibleProductAttributes.map((attr) => {
                                        const name = attr.attributePublicName;
                                        const rawValue = parseFloat(attr.value);
                                        let displayValue: React.ReactNode =
                                            attr.value;

                                        if (!Number.isNaN(rawValue)) {
                                            if (name === "Weight") {
                                                displayValue =
                                                    unitSystem === "metric"
                                                        ? `${formatNumber(rawValue, 0)} gms`
                                                        : `${formatNumber(toKg(rawValue))} kg`;
                                            }

                                            if (
                                                [
                                                    "Width",
                                                    "Length",
                                                    "Height",
                                                ].includes(name)
                                            ) {
                                                displayValue =
                                                    unitSystem === "metric"
                                                        ? `${formatNumber(rawValue)} cms`
                                                        : `${formatNumber(toInches(rawValue))}"`;
                                            }
                                        }

                                        return (
                                            <li
                                                key={attr.attributeId}
                                                className="flex justify-between"
                                            >
                                                <span className="text-gray-600">
                                                    {name}
                                                </span>
                                                <span className="font-medium text-gray-800">
                                                    {displayValue}
                                                </span>
                                            </li>
                                        );
                                    })
                                )}
                            </ul>
                        </div>

                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <div className="text-sm font-semibold text-gray-700 mb-2">
                                Need help?
                            </div>
                            <div className="text-sm text-gray-600">
                                Chat with us or call{" "}
                                <span className="font-medium">
                                    +91-8097987769
                                </span>
                            </div>
                        </div>
                    </aside>
                </div>

                {/* Lightbox */}
                {lightbox && typeof selectedImage === "string" && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <div
                            className="absolute inset-0 bg-black/60"
                            onClick={() => setLightbox(false)}
                        />
                        <div className="relative w-full max-w-4xl h-[85vh] bg-white rounded-xl overflow-hidden shadow-2xl">
                            <button
                                onClick={() => setLightbox(false)}
                                className="absolute right-4 top-4 z-20 bg-white/90 px-3 py-1 rounded-full"
                            >
                                ✕
                            </button>
                            <div className="relative w-full h-full p-6">
                                {selectedImage ? (
                                    <Image
                                        src={selectedImage}
                                        alt={productName ?? "Product image"}
                                        fill
                                        style={{ objectFit: "contain" }}
                                        sizes="100vw"
                                    />
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= STICKY MOBILE BUY BAR ================= */}
                <div className="product-mobile-dock lg:hidden fixed bottom-0 left-0 right-0 z-40">
                    {/* subtle fade */}
                    <div className="h-3 bg-linear-to-t from-white to-transparent pointer-events-none" />
                    <div className="bg-white/95 border-t border-[#d9e5d9] shadow-[0_-10px_30px_rgba(23,79,67,.09)] px-3 sm:px-5 py-2.5 backdrop-blur-md pb-[calc(.65rem+env(safe-area-inset-bottom,0px))]">
                        <div className="flex items-center gap-2.5 max-w-2xl mx-auto">
                            {/* Price */}
                            <div className="flex flex-col shrink-0">
                                <span className="text-base sm:text-lg font-extrabold text-[#065975] leading-tight">
                                    {priceDisplay
                                        ? formatINR(priceDisplay)
                                        : "—"}
                                </span>
                                <span
                                    className={`text-xs font-medium ${isOutOfStock ? "text-red-600" : "text-green-700"}`}
                                >
                                    {isOutOfStock ? "Out of stock" : "In stock"}
                                </span>
                            </div>

                            {/* Quantity */}
                            <div
                                className={`flex items-center border rounded-xl overflow-hidden ${cartState !== "not_added" || isOutOfStock ? "opacity-50 pointer-events-none" : ""}`}
                            >
                                <button
                                    onClick={() => handleQuantity(-1)}
                                    disabled={quantity <= 1 || isOutOfStock}
                                    className="px-3 py-2 text-lg disabled:opacity-40"
                                >
                                    −
                                </button>

                                <span className="px-3 font-medium text-sm">
                                    {quantity}
                                </span>

                                <button
                                    onClick={() => handleQuantity(1)}
                                    disabled={
                                        isOutOfStock ||
                                        Boolean(
                                            stockNumber &&
                                            quantity >= stockNumber,
                                        )
                                    }
                                    className="px-3 py-2 text-lg disabled:opacity-40"
                                >
                                    +
                                </button>
                            </div>

                            {/* Button */}
                            {cartState === "added" ? (
                                <button
                                    onClick={() => router.push("/cart")}
                                    className="min-w-0 flex-1 min-h-11 px-3 py-2 rounded-xl bg-[#065975] text-white text-sm font-bold shadow-md"
                                >
                                    Go to Cart →
                                </button>
                            ) : (
                                <button
                                    onClick={handleAddToCart}
                                    disabled={
                                        cartState !== "not_added" ||
                                        adding ||
                                        isOutOfStock
                                    }
                                    className={`min-w-0 flex-1 min-h-11 px-3 py-2 rounded-xl text-white text-sm font-bold shadow-md ${
                                        isOutOfStock
                                            ? "bg-gray-300 cursor-not-allowed"
                                            : "bg-[#0c7d96] hover:brightness-95"
                                    }`}
                                >
                                    {adding ? "Adding…" : "Add to Cart"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                {/* ================= END STICKY MOBILE BUY BAR ================= */}

                {/* Desktop quick-buy dock mirrors the same cart state as the purchase card. */}
                <div
                    className="hidden lg:block wcm-buy-dock"
                    role="region"
                    aria-label="Quick product purchase"
                >
                    <div className="w-full max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-12 py-3 flex items-center gap-5">
                        <span className="text-sm text-[#576f79] truncate grow font-semibold">
                            {productName}
                        </span>
                        <span className="font-extrabold text-xl text-[#065975] shrink-0">
                            {priceDisplay ? formatINR(priceDisplay) : "—"}
                        </span>
                        <span
                            className={`text-xs font-semibold shrink-0 ${isOutOfStock ? "text-rose-600" : "text-[#0c7d96]"}`}
                        >
                            {isOutOfStock ? "Out of stock" : "In stock"}
                        </span>
                        {cartState === "added" ? (
                            <button
                                type="button"
                                onClick={() => router.push("/cart")}
                                className="site-button-primary !min-h-11 !px-8"
                            >
                                Go to cart →
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleAddToCart}
                                disabled={
                                    adding ||
                                    cartState !== "not_added" ||
                                    isOutOfStock
                                }
                                className="site-button-primary !min-h-11 !px-8 disabled:opacity-50"
                            >
                                {cartState === "unknown"
                                    ? "Checking cart…"
                                    : adding
                                      ? "Adding…"
                                      : isOutOfStock
                                        ? "Out of stock"
                                        : "Add to cart"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Toast */}
                {toast && (
                    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-[#065975] text-white px-4 py-2 rounded-md shadow z-50">
                        {toast}
                    </div>
                )}
            </div>
        </div>
    );
}