'use client'

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { addToCart } from "../lib/cart";

/* ---------------- Types ---------------- */
type SalePrice = { discountedPrice?: number; actualPrice?: number };
type ProductAttribute = { attributeId: string; attributePublicName: string; value: string };
type ProductImage = { imageId?: string; imagePath?: string; title?: string };

type Product = {
    _id: string;
    productName: string;
    productImage?: string;
    shortDescription?: string;
    longDescription?: string;
    isAvailableForSale?: boolean;
    sellStockQuantity?: string | number | { quantity?: number; qty?: number } | null;
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

/** Robust parser for different backend shapes */
function parseStockValue(raw: Product['sellStockQuantity']): number {
    if (raw == null) return 0;

    if (typeof raw === 'number') {
        if (Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
        return 0;
    }

    if (typeof raw === 'object') {
        const maybeQty = (raw as any).quantity ?? (raw as any).qty ?? (raw as any).stock ?? null;
        if (typeof maybeQty === 'number' && Number.isFinite(maybeQty)) return Math.max(0, Math.floor(maybeQty));
        if (typeof maybeQty === 'string') {
            const digits = maybeQty.match(/-?\d+(\.\d+)?/);
            if (digits) return Math.max(0, Math.floor(Number(digits[0])));
        }
        return 0;
    }

    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        const direct = Number(trimmed);
        if (!Number.isNaN(direct) && Number.isFinite(direct)) return Math.max(0, Math.floor(direct));
        const match = trimmed.match(/-?\d+(\.\d+)?/);
        if (match) {
            const n = Number(match[0]);
            if (!Number.isNaN(n) && Number.isFinite(n)) return Math.max(0, Math.floor(n));
        }
        return 0;
    }

    return 0;
}

function getStoredCustomerId(): string | null {
    if (typeof window === "undefined") return null;
    try {
        return localStorage.getItem("customerId");
    } catch {
        return null;
    }
}

/* lightweight API caller used only for cart-check; replace with your shared helper if available */
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
        <svg className={`w-4 h-4 ${filled ? "text-yellow-400" : "text-gray-300"}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.95a1 1 0 00.95.69h4.163c.969 0 1.371 1.24.588 1.81l-3.37 2.466a1 1 0 00-.364 1.118l1.287 3.95c.3.921-.755 1.688-1.54 1.118L10 15.347 6.601 17.619c-.785.57-1.84-.197-1.54-1.118l1.287-3.95a1 1 0 00-.364-1.118L2.615 9.377c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.286-3.95z" />
        </svg>
    );
}

function ReviewModule({ productName, initialReviews = [] as Review[], maxPerPage = 4 }: { productName?: string; initialReviews?: Review[]; maxPerPage?: number }) {
    const sample: Review[] = [
        {
            id: "r1",
            name: "Asha",
            rating: 5,
            text: "Absolutely lovely! Great gift & very well packed. The stitches are neat and colors are vibrant.",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
            helpful: 12,
            images: [],
        },
        {
            id: "r2",
            name: "Ravi",
            rating: 4,
            text: "Nice quality, shipping took a little long but product matched the photos.",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
            helpful: 3,
            images: [],
        },
        {
            id: "r3",
            name: "Maya",
            rating: 5,
            text: "My sister loved it — looks premium!",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
            helpful: 7,
            images: [],
        },
    ];

    const [reviews, setReviews] = useState<Review[]>(initialReviews.length ? initialReviews : sample);
    const [filterRating, setFilterRating] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    const [showWrite, setShowWrite] = useState(false);

    const [formName, setFormName] = useState("");
    const [formRating, setFormRating] = useState(5);
    const [formText, setFormText] = useState("");
    const [formImage, setFormImage] = useState("");

    const stats = useMemo(() => {
        const total = reviews.length;
        const avg = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
        const counts = [0, 0, 0, 0, 0];
        reviews.forEach((r) => {
            counts[r.rating - 1] += 1;
        });
        return { total, avg, counts };
    }, [reviews]);

    const filtered = useMemo(() => {
        return filterRating ? reviews.filter((r) => r.rating === filterRating) : reviews;
    }, [reviews, filterRating]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / maxPerPage));
    const pageItems = filtered.slice((page - 1) * maxPerPage, page * maxPerPage);

    const [toast, setToast] = useState<string | null>(null);
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 1500);
        return () => clearTimeout(t);
    }, [toast]);

    function handleHelpful(id: string) {
        setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, helpful: (r.helpful ?? 0) + 1 } : r)));
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
                    <div className="bg-[#004F64] text-white rounded-xl px-4 py-3 flex flex-col items-center justify-center">
                        <div className="text-2xl font-extrabold leading-none">{stats.total ? stats.avg.toFixed(1) : "—"}</div>
                        <div className="text-xs">avg rating</div>
                    </div>

                    <div>
                        <div className="flex items-center gap-3">
                            <div className="flex">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <StarIcon key={i} filled={i < Math.round(stats.avg)} />
                                ))}
                            </div>
                            <div className="text-sm text-gray-600"> {stats.total} review{stats.total !== 1 ? "s" : ""}</div>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">Rated by customers who bought this product</div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => setShowWrite(true)} className="px-3 py-2 bg-[#E94E4E] text-white rounded-md shadow-sm hover:brightness-95">Write a review</button>
                    <div className="text-sm text-gray-600">Sort:</div>
                    <select
                        onChange={(e) => {
                            const v = e.target.value;
                            if (v === "newest") setReviews((r) => [...r].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
                            if (v === "helpful") setReviews((r) => [...r].sort((a, b) => (b.helpful ?? 0) - (a.helpful ?? 0)));
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
                            const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                            return (
                                <button
                                    key={star}
                                    onClick={() => { setFilterRating((cur) => (cur === star ? null : star)); setPage(1); }}
                                    className={`w-full flex items-center gap-3 px-2 py-1 rounded hover:bg-gray-50 focus:outline-none ${filterRating === star ? 'bg-gray-100 ring-1 ring-[#E94E4E]' : ''}`}
                                >
                                    <div className="w-14 text-sm text-gray-700">{star} <span className="text-yellow-400">★</span></div>
                                    <div className="flex-1 bg-gray-100 rounded h-3 overflow-hidden">
                                        <div className="h-3 bg-[#E94E4E]" style={{ width: `${pct}%`, transition: "width .3s" }} />
                                    </div>
                                    <div className="w-10 text-right text-sm text-gray-600">{pct}%</div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="md:col-span-2">
                    <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                        <div className="font-semibold">Filter</div>
                        <div className="mt-2 text-sm text-gray-600">Showing {filterRating ? `${filterRating}-star` : "all"} reviews</div>
                        {filterRating && <button onClick={() => setFilterRating(null)} className="mt-2 text-xs text-[#004F64] underline">Clear filter</button>}
                    </div>
                </div>
            </div>

            {/* list */}
            <div className="mt-6 space-y-4">
                {pageItems.map((r) => (
                    <article key={r.id} className="border rounded-lg p-4 bg-white shadow-sm">
                        <header className="flex items-start gap-4">
                            <div aria-hidden className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-semibold">
                                {r.name.split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="font-medium text-gray-800">{r.name}</div>
                                        <div className="flex items-center text-sm">
                                            {Array.from({ length: 5 }).map((__, i) => (<StarIcon key={i} filled={i < r.rating} />))}
                                        </div>
                                        <div className="text-xs text-gray-500 ml-2">{formatRelative(r.createdAt)}</div>
                                    </div>
                                    <div className="text-sm text-gray-500">{r.helpful ?? 0} helpful</div>
                                </div>

                                <p className="mt-3 text-gray-700">{r.text}</p>

                                {r.images?.length ? (
                                    <div className="mt-3 flex gap-2">
                                        {r.images.map((img, i) => (
                                            <a key={i} href={img} target="_blank" rel="noreferrer" className="w-20 h-20 rounded-md overflow-hidden border">
                                                <img src={img} alt={`review-${r.id}-${i}`} className="w-full h-full object-cover" />
                                            </a>
                                        ))}
                                    </div>
                                ) : null}

                                <div className="mt-3 flex gap-3">
                                    <button onClick={() => handleHelpful(r.id)} className="text-sm px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">Helpful</button>
                                    <button onClick={() => setToast("Report submitted")} className="text-sm px-2 py-1 rounded bg-gray-50 hover:bg-gray-100">Report</button>
                                </div>
                            </div>
                        </header>
                    </article>
                ))}

                {/* pagination */}
                <div className="flex items-center justify-between mt-1">
                    <div className="text-sm text-gray-600">Showing {filtered.length === 0 ? 0 : (Math.min((page - 1) * maxPerPage + 1, filtered.length))}–{Math.min(page * maxPerPage, filtered.length)} of {filtered.length}</div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
                        <div className="text-sm">{page} / {totalPages}</div>
                        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
                    </div>
                </div>
            </div>

            {/* write modal */}
            {showWrite && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowWrite(false)} />
                    <form onSubmit={submitReview} className="relative max-w-xl w-full bg-white rounded-xl p-6 z-10 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Write a review for {productName ?? "this product"}</h3>
                            <button type="button" onClick={() => setShowWrite(false)} className="text-gray-500 px-2">✕</button>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3">
                            <label className="text-sm">
                                Your name
                                <input value={formName} onChange={(e) => setFormName(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
                            </label>

                            <label className="text-sm">
                                Rating
                                <div className="mt-1 flex items-center gap-2">
                                    {Array.from({ length: 5 }).map((_, i) => {
                                        const star = i + 1;
                                        return (
                                            <button key={i} type="button" onClick={() => setFormRating(star)} className={`p-2 rounded ${formRating >= star ? "bg-yellow-50" : "bg-gray-50"}`} aria-label={`Rate ${star} star`}>
                                                <StarIcon filled={formRating >= star} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </label>

                            <label className="text-sm">
                                Review
                                <textarea value={formText} onChange={(e) => setFormText(e.target.value)} rows={4} className="mt-1 w-full border rounded px-3 py-2" />
                            </label>

                            <label className="text-sm">
                                Image URL (optional)
                                <input value={formImage} onChange={(e) => setFormImage(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" placeholder="https://..." />
                            </label>

                            <div className="flex items-center justify-end gap-2 mt-2">
                                <button type="button" onClick={() => setShowWrite(false)} className="px-3 py-2 rounded border">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-[#E94E4E] text-white rounded">Submit review</button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* small toast */}
            {toast && <div className="fixed left-1/2 transform -translate-x-1/2 bottom-8 bg-[#004F64] text-white px-4 py-2 rounded-md shadow z-50">{toast}</div>}
        </section>
    );
}

/* ---------- Main ProductClient Component ---------- */

export default function ProductClient({ product }: { product: Product }) {
    const router = useRouter();

    const {
        _id,
        productName,
        shortDescription,
        longDescription,
        isAvailableForSale,
        sellStockQuantity,
        productAttributes = [],
        productImages = [],
        salePrice,
    } = product;

    // Put primary (product.productImage) first so display image is shown immediately
    const primaryImage = product.productImage ?? null;
    const otherImages = (productImages?.map((p) => (p.imagePath ?? p.imageId)).filter(Boolean) as string[]) ?? [];
    const images = [
        ...(primaryImage ? [primaryImage] : []),
        ...otherImages.filter((src) => src !== primaryImage),
    ].filter(Boolean) as string[];

    // selectedImage starts with the primary image (if any), otherwise first available
    const [selectedImage, setSelectedImage] = useState<string | null>(() => images[0] ?? null);

    const [quantity, setQuantity] = useState<number>(1);
    const [wish, setWish] = useState(false);
    const [added, setAdded] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [lightbox, setLightbox] = useState(false);
    const [adding, setAdding] = useState(false); // indicates API call in progress

    // NEW: show thumbnails only after main image is loaded or after a small timeout
    const [thumbsVisible, setThumbsVisible] = useState(false);
    useEffect(() => {
        // fallback: reveal thumbs after a short timeout if onLoadingComplete doesn't fire
        const t = window.setTimeout(() => setThumbsVisible(true), 450);
        return () => clearTimeout(t);
    }, []);

    const stockNumber = parseStockValue(sellStockQuantity);
    const priceDisplay = salePrice?.discountedPrice ?? salePrice?.actualPrice ?? null;
    const isOutOfStock = stockNumber === 0 || !isAvailableForSale;

    // infer SELL or RENT for addToCart helper (similar to ProductCardClient)
    const inferredType: 'SELL' | 'RENT' = useMemo(() => {
        const raw = String(sellStockQuantity ?? '')
        const digits = raw.replace(/\D/g, '')
        const q = digits ? parseInt(digits, 10) : NaN
        if (!Number.isNaN(q) && q > 0) return 'SELL'
        return 'SELL'
    }, [sellStockQuantity])

    useEffect(() => {
        if (quantity > stockNumber) setQuantity(stockNumber || 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sellStockQuantity, stockNumber, _id]);

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

    // Helper: update localStorage cart count (simple shared mechanism)
    function incrementLocalCartCount(by = 1) {
        try {
            const key = 'wc_cart_count';
            const cur = Number(localStorage.getItem(key) ?? 0);
            localStorage.setItem(key, String(Math.max(0, cur + by)));
        } catch (e) {
            console.warn('incrementLocalCartCount failed', e);
        }
    }

    /* ------------------ NEW: check if product present in cart once, and on cartUpdated ------------------ */
    useEffect(() => {
        let active = true;

        async function checkCartPresence() {
            try {
                const customerId = getStoredCustomerId();
                if (!customerId) {
                    if (active) setAdded(false);
                    return;
                }
                const payload = await callApi(`/cart?customerId=${customerId}`, { method: 'GET' });
                if (!active) return;
                const cartData = Array.isArray(payload?.cartData) ? payload.cartData : [];
                let foundAny = false;
                for (const c of cartData) {
                    const sellItems = Array.isArray(c?.sellItems) ? c.sellItems : [];
                    const found = sellItems.find((s: any) => String(s.productId) === String(_id) || String(s.product?.productId) === String(_id));
                    if (found) {
                        foundAny = true;
                        break;
                    }
                }
                if (active) setAdded(foundAny);
            } catch (err) {
                console.warn('Could not fetch cart to check presence', err);
            }
        }

        checkCartPresence();

        const onCartUpdated = () => {
            checkCartPresence().catch(() => { });
        };
        window.addEventListener('cartUpdated', onCartUpdated as EventListener);

        return () => {
            active = false;
            window.removeEventListener('cartUpdated', onCartUpdated as EventListener);
        };
    }, [_id]);

    // ===== add to cart using shared helper OR fallback to raw fetch =====
    async function handleAddToCart() {
        if (isOutOfStock) {
            setToast("Cannot add — out of stock");
            return;
        }
        if (adding || added) return;

        setToast("Adding to cart...");
        setAdding(true);

        try {
            const raw = await addToCart(String(_id), quantity, inferredType).catch((e: any) => {
                console.warn('addToCart helper failed, falling back to raw fetch', e);
                return null;
            });

            const result = raw as AddToCartResult;

            if (result) {
                if (result.needLogin || result.status === 401) {
                    setToast("Please login to add to cart");
                    setAdding(false);
                    router.push('/login');
                    return;
                }

                if (result.success) {
                    const serverCount = (result as any)?.cartCount ?? (result as any)?.count ?? null;
                    if (serverCount != null && Number.isFinite(Number(serverCount))) {
                        try { localStorage.setItem('wc_cart_count', String(Number(serverCount))); } catch { }
                    } else {
                        incrementLocalCartCount(quantity);
                    }
                    setToast("Added to cart");
                    setAdded(true);
                    // notify other parts of the app to refetch cart
                    window.dispatchEvent(new Event('cartUpdated'));
                    setAdding(false);
                    return;
                }

                setToast(typeof (result as any)?.message === 'string' ? (result as any).message : "Failed to add to cart");
                setAdding(false);
                return;
            }

            // fallback: original POST to /cart
            const apiBaseRaw = process.env.NEXT_PUBLIC_API_BASE;
            const API_BASE = apiBaseRaw ? String(apiBaseRaw).replace(/\/+$/, "") : "";
            const fallback = typeof window !== "undefined" && process.env.NODE_ENV === "development"
                ? "http://localhost:3000"
                : "";
            const cartUrl = API_BASE ? `${API_BASE}/cart` : `${fallback}/cart`;

            const payload = { productId: _id, quantity };

            const res = await fetch(cartUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (res.status === 401) {
                setToast("Please login to add to cart");
                setAdding(false);
                router.push('/login');
                return;
            }

            if (!res.ok) {
                const text = await res.text().catch(() => null);
                console.error('Add to cart fallback failed', res.status, text);
                setToast("Failed to add to cart");
                setAdding(false);
                return;
            }

            const json = await res.json().catch(() => null);
            const serverCount = json?.cartCount ?? json?.count ?? null;
            if (serverCount != null && Number.isFinite(Number(serverCount))) {
                try { localStorage.setItem('wc_cart_count', String(Number(serverCount))); } catch { }
            } else {
                incrementLocalCartCount(quantity);
            }

            setToast("Added to cart");
            setAdded(true);
            window.dispatchEvent(new Event('cartUpdated'));
        } catch (err) {
            console.error("Add to cart unexpected error:", err);
            setToast("Network error — try again");
            setAdded(false);
        } finally {
            setAdding(false);
        }
    }

    async function copyProductId() {
        try {
            await navigator.clipboard.writeText(_id);
            setToast("Product ID copied");
        } catch {
            setToast("Copy failed");
        }
    }

    function openSharePopup() {
        const url = typeof window !== "undefined" ? window.location.href : "";
        const encodedUrl = encodeURIComponent(url);
        const encodedText = encodeURIComponent(productName ?? "");
        const encodedDesc = encodeURIComponent(shortDescription ?? "");

        const shareOptions = [
            { name: "WhatsApp", link: `https://wa.me/?text=${encodedText}%20${encodedUrl}` },
            { name: "Facebook", link: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
            { name: "Twitter", link: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}` },
            { name: "Pinterest", link: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedDesc}` },
        ];

        const w = 420;
        const h = 520;
        const left = (window.screen.width / 2) - (w / 2);
        const top = (window.screen.height / 2) - (h / 2);

        const popup = window.open("", "Share", `width=${w},height=${h},left=${left},top=${top},noopener`);
        if (!popup) {
            window.open(shareOptions[0].link, "_blank", "noopener");
            return;
        }

        const pageTitle = escape(String(productName ?? "Share"));
        popup.document.write(`
        <!doctype html>
        <html>
            <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <title>Share</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; padding: 18px; color: #062024; }
                h2 { margin: 0 0 12px 0; font-size: 18px; color: #004F64; }
                .opt { display:block; margin:10px 0; padding:12px 14px; border-radius:8px; text-decoration:none; color:#fff; font-weight:600; }
                .wa { background:#25D366; }
                .fb { background:#1877F2; }
                .tw { background:#1DA1F2; }
                .pt { background:#E60023; }
                .desc { margin-top:14px; font-size:13px; color:#375a5a; }
                small { display:block; margin-top:8px; color:#7a8a8a; }
            </style>
            </head>
            <body>
            <h2>Share "${pageTitle}"</h2>
            <a class="opt wa" href="${shareOptions[0].link}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
            <a class="opt fb" href="${shareOptions[1].link}" target="_blank" rel="noopener noreferrer">Facebook</a>
            <a class="opt tw" href="${shareOptions[2].link}" target="_blank" rel="noopener noreferrer">Twitter</a>
            <a class="opt pt" href="${shareOptions[3].link}" target="_blank" rel="noopener noreferrer">Pinterest</a>
            <div class="desc">Opens in a new tab. Close this window when done.</div>
            <small>${escape(String(shortDescription ?? ""))}</small>
            </body>
        </html>
    `);
        popup.document.close();
    }

    return (
        <div className="relative">
            {/* Sticky product title */}
            <div className="sticky top-0">
                <div className="backdrop-blur-sm bg-white/70 border-b">
                    <div className="max-w-7xl mx-auto px-6 py-3">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <span className="w-1.5 h-8 rounded-md bg-[#E94E4E] inline-block" />
                                <div>
                                    <div className="text-xs text-gray-500">You are viewing</div>
                                    <div className="text-lg md:text-2xl font-extrabold text-[#004F64] leading-tight">{productName ?? "Product"}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-lg p-4">
                            <div className="relative w-full h-[360px] md:h-[460px] lg:h-[520px] max-h-[60vh] bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden">
                                {selectedImage ? (
                                    <button
                                        onClick={() => setLightbox(true)}
                                        aria-label="Open image"
                                        className="absolute inset-0 focus:outline-none"
                                    >
                                        <div className="relative w-full h-full">
                                            <Image
                                                src={selectedImage}
                                                alt={productName ?? "Product image"}
                                                fill
                                                style={{ objectFit: "contain" }}
                                                sizes="(max-width: 1024px) 100vw, 60vw"
                                                priority // main image priority remains
                                                onLoadingComplete={() => {
                                                    // when main image finishes loading, reveal thumbnails
                                                    setThumbsVisible(true);
                                                }}
                                            />
                                        </div>
                                    </button>
                                ) : (
                                    <div className="text-gray-400">No image available</div>
                                )}
                            </div>

                            <div className="mt-4 flex gap-3 overflow-x-auto">
                                {images.length === 0 && <div className="text-sm text-gray-500">No thumbnails</div>}

                                {/* if thumbsVisible is false, render skeleton placeholders to keep layout stable */}
                                {!thumbsVisible && images.length > 0 && (
                                    <>
                                        {images.map((_, idx) => (
                                            <div key={idx} className="w-20 h-20 rounded-lg overflow-hidden border-gray-200 border bg-gray-100 animate-pulse" />
                                        ))}
                                    </>
                                )}

                                {/* once thumbsVisible is true, render the actual thumbnails (they will lazy-load by default) */}
                                {thumbsVisible && images.map((src, idx) => {
                                    const isSelected = selectedImage === src;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedImage(src)}
                                            className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition ${isSelected ? 'border-[#E94E4E] scale-105' : 'border-gray-200 hover:scale-105'}`}
                                            aria-pressed={isSelected}
                                            aria-label={`Select image ${idx + 1}`}
                                        >
                                            <div className="relative w-full h-full">
                                                <Image
                                                    src={src}
                                                    alt={`${productName ?? 'Product'} ${idx + 1}`}
                                                    fill
                                                    style={{ objectFit: "cover" }}
                                                    sizes="80px"
                                                // leave default lazy loading for thumbnails (do not set priority)
                                                />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Reviews Module inserted here */}
                        {/* <ReviewModule productName={productName} /> */}
                    </div>

                    <aside className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-2xl p-6 sticky top-28">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs text-gray-500">Price</div>
                                    <div className="text-3xl font-extrabold text-[#E94E4E]">{priceDisplay ? formatINR(priceDisplay) : "—"}</div>
                                    {salePrice?.actualPrice && salePrice.actualPrice !== salePrice.discountedPrice && (
                                        <div className="text-sm text-gray-400 line-through mt-1">{formatINR(salePrice.actualPrice)}</div>
                                    )}
                                </div>

                                <div className="text-right">
                                    <div className="text-xs text-gray-500">Availability</div>
                                    <div className={`text-sm font-semibold ${isOutOfStock ? 'text-red-600' : 'text-green-700'}`}>{isOutOfStock ? 'Out of stock' : `In stock (${stockNumber})`}</div>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center gap-4">
                                <div className="flex items-center border rounded-lg overflow-hidden">
                                    <button onClick={() => handleQuantity(-1)} disabled={quantity <= 1} className="px-3 py-2 disabled:opacity-50">−</button>
                                    <input aria-label="Quantity" value={quantity} onChange={(e) => {
                                        const v = Number(e.target.value || 1);
                                        if (Number.isNaN(v)) return;
                                        if (v < 1) setQuantity(1);
                                        else if (stockNumber && v > stockNumber) setQuantity(stockNumber);
                                        else setQuantity(Math.floor(v));
                                    }} className="w-20 text-center py-2" />
                                    <button onClick={() => handleQuantity(1)} disabled={Boolean(stockNumber && quantity >= stockNumber)} className="px-3 py-2 disabled:opacity-50">+</button>
                                </div>

                                <button onClick={handleAddToCart} disabled={isOutOfStock || adding} className={`flex-1 py-3 rounded-lg text-white font-semibold shadow-md transition ${isOutOfStock ? 'bg-gray-300 cursor-not-allowed' : (added ? 'bg-green-600 hover:bg-green-700' : 'bg-[#E94E4E] hover:bg-[#c93b3b]')}`}>
                                    {adding ? 'Adding...' : (added ? 'Added ✓' : 'Add to cart')}
                                </button>
                            </div>

                            <button onClick={() => { setWish(w => !w); setToast(wish ? "Removed from wishlist" : "Added to wishlist"); }} className={`mt-4 w-full py-2 rounded-lg border ${wish ? 'bg-[#F58634]/10 text-[#F58634]' : 'text-gray-700'}`}>
                                {wish ? '♥ Wishlisted' : '♡ Add to Wishlist'}
                            </button>

                            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                                <div>Delivery: <span className="font-medium text-gray-800">3–5 business days</span></div>
                                <div className="flex gap-2">
                                    <button onClick={copyProductId} className="px-3 py-1 border rounded text-xs">Copy ID</button>
                                    <button onClick={openSharePopup} className="px-3 py-1 border rounded text-xs">Share</button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#F58634]/10 rounded-xl p-6 shadow">
                            <h3 className="text-lg font-semibold text-[#004F64] mb-3">Product Details</h3>
                            <ul className="text-sm text-gray-700 space-y-2">
                                {productAttributes.length === 0 ? (
                                    <li className="text-gray-500">No attributes provided</li>
                                ) : (
                                    productAttributes.map((attr) => (
                                        <li key={attr.attributeId} className="flex justify-between">
                                            <span className="text-gray-600">{attr.attributePublicName}</span>
                                            <span className="font-medium text-gray-800">{attr.value}</span>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>

                        <div className="bg-[#2BAE66]/10 rounded-xl p-6 shadow">
                            <h3 className="text-lg font-semibold text-[#004F64] mb-3">About</h3>
                            <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: longDescription ?? "<p>No description provided.</p>" }} />
                        </div>

                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <div className="text-sm font-semibold text-gray-700 mb-2">Need help?</div>
                            <div className="text-sm text-gray-600">Chat with us or call <span className="font-medium">+91-XXXXXXXXXX</span></div>
                        </div>
                    </aside>
                </div>

                {/* Lightbox */}
                {lightbox && selectedImage && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <div className="absolute inset-0 bg-black/60" onClick={() => setLightbox(false)} />
                        <div className="relative w-full max-w-4xl h-[85vh] bg-white rounded-xl overflow-hidden shadow-2xl">
                            <button onClick={() => setLightbox(false)} className="absolute right-4 top-4 z-20 bg-white/90 px-3 py-1 rounded-full">✕</button>
                            <div className="relative w-full h-full p-6">
                                <Image src={selectedImage} alt={productName ?? 'Product image'} fill style={{ objectFit: 'contain' }} sizes="100vw" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Toast */}
                {toast && (
                    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-[#004F64] text-white px-4 py-2 rounded-md shadow z-50">{toast}</div>
                )}
            </div>
        </div>
    );
}