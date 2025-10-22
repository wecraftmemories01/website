// ReviewModule.tsx
'use client'

import React, { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns"; // OPTIONAL: remove if date-fns unavailable

// If you don't have date-fns in your project, either install it or
// replace formatDistanceToNow usage with a simple fallback.
// For safety, I'll provide a small fallback below if date-fns isn't installed.

type Review = {
    id: string;
    name: string;
    rating: number; // 1-5
    text: string;
    createdAt: string; // ISO
    helpful?: number;
    images?: string[]; // optional image URLs
};

type Props = {
    productName: string;
    initialReviews?: Review[];
    maxPerPage?: number;
};

function formatRelative(dateIso: string) {
    // Try date-fns if present, otherwise fallback to "x days ago" naive
    try {
        // @ts-ignore
        if (typeof formatDistanceToNow === "function") {
            // @ts-ignore
            return formatDistanceToNow(new Date(dateIso), { addSuffix: true });
        }
    } catch {
        // ignore
    }
    const diff = Math.floor((Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return "today";
    if (diff === 1) return "1 day ago";
    return `${diff} days ago`;
}

function StarIcon({ filled }: { filled: boolean }) {
    return (
        <svg className={`w-4 h-4 ${filled ? "text-yellow-400" : "text-gray-300"}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.95a1 1 0 00.95.69h4.163c.969 0 1.371 1.24.588 1.81l-3.37 2.466a1 1 0 00-.364 1.118l1.287 3.95c.3.921-.755 1.688-1.54 1.118L10 15.347l-3.399 2.272c-.785.57-1.84-.197-1.54-1.118l1.287-3.95a1 1 0 00-.364-1.118L2.615 9.377c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.286-3.95z" />
        </svg>
    );
}

export default function ReviewModule({ productName, initialReviews = [], maxPerPage = 4 }: Props) {
    // Sample mock if none provided
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

    // new review form state
    const [formName, setFormName] = useState("");
    const [formRating, setFormRating] = useState(5);
    const [formText, setFormText] = useState("");
    const [formImage, setFormImage] = useState("");

    const stats = useMemo(() => {
        const total = reviews.length;
        const avg = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
        const counts = [0, 0, 0, 0, 0]; // index 0->1 star ... 4->5 star
        reviews.forEach((r) => {
            counts[r.rating - 1] += 1;
        });
        return { total, avg, counts };
    }, [reviews]);

    const filtered = useMemo(() => {
        const arr = filterRating ? reviews.filter((r) => r.rating === filterRating) : reviews;
        return arr;
    }, [reviews, filterRating]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / maxPerPage));
    const pageItems = filtered.slice((page - 1) * maxPerPage, page * maxPerPage);

    function handleHelpful(id: string) {
        setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, helpful: (r.helpful ?? 0) + 1 } : r)));
    }

    function submitReview(e?: React.FormEvent) {
        e?.preventDefault();
        if (!formName.trim() || !formText.trim()) {
            alert("Please enter name and review text.");
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

    // brief toast
    const [toast, setToast] = useState<string | null>(null);
    React.useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 1600);
        return () => clearTimeout(t);
    }, [toast]);

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm">
            {/* Header: average rating */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#004F64] text-white rounded-xl px-4 py-3 flex flex-col items-center justify-center">
                            <div className="text-2xl font-extrabold leading-none">{stats.total ? stats.avg.toFixed(1) : "—"}</div>
                            <div className="text-xs">avg rating</div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2">
                                {/* visual stars */}
                                <div className="flex">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <StarIcon key={i} filled={i < Math.round(stats.avg)} />
                                    ))}
                                </div>
                                <div className="text-sm text-gray-600">{stats.total} review{stats.total !== 1 ? "s" : ""}</div>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">Rated by customers who bought this product</div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { setShowWrite(true); }}
                        className="px-3 py-2 bg-[#E94E4E] text-white rounded-md shadow-sm hover:brightness-95"
                    >
                        Write a review
                    </button>

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

            {/* rating distribution */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                <div className="md:col-span-3">
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, idx) => {
                            const star = 5 - idx; // 5..1
                            const count = stats.counts[star - 1] ?? 0;
                            const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                            return (
                                <button
                                    key={star}
                                    onClick={() => {
                                        setFilterRating((cur) => (cur === star ? null : star));
                                        setPage(1);
                                    }}
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
                        {filterRating && (
                            <button onClick={() => setFilterRating(null)} className="mt-2 text-xs text-[#004F64] underline">
                                Clear filter
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* review list */}
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
                                            {Array.from({ length: 5 }).map((__, i) => (
                                                <StarIcon key={i} filled={i < r.rating} />
                                            ))}
                                        </div>
                                        <div className="text-xs text-gray-500 ml-2">{formatRelative(r.createdAt)}</div>
                                    </div>

                                    <div className="text-sm text-gray-500">{r.helpful ?? 0} helpful</div>
                                </div>

                                <p className="mt-3 text-gray-700">{r.text}</p>

                                {/* review images */}
                                {r.images?.length ? (
                                    <div className="mt-3 flex gap-2">
                                        {r.images.map((img, i) => (
                                            <a key={i} href={img} target="_blank" rel="noreferrer" className="w-20 h-20 rounded-md overflow-hidden border">
                                                {/* we use a plain img to avoid extra Next/Image layout issues in popups */}
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
                    <div className="text-sm text-gray-600">Showing {Math.min((page - 1) * maxPerPage + 1, filtered.length)}–{Math.min(page * maxPerPage, filtered.length)} of {filtered.length}</div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
                        <div className="text-sm">{page} / {totalPages}</div>
                        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
                    </div>
                </div>
            </div>

            {/* Write review modal */}
            {showWrite && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowWrite(false)} />
                    <form onSubmit={submitReview} className="relative max-w-xl w-full bg-white rounded-xl p-6 z-10 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Write a review</h3>
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
                                            <button type="button" key={i} onClick={() => setFormRating(star)} className={`p-2 rounded ${formRating >= star ? "bg-yellow-50" : "bg-gray-50"}`} aria-label={`Rate ${star} star`}>
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
            {toast && (
                <div className="fixed left-1/2 transform -translate-x-1/2 bottom-8 bg-[#004F64] text-white px-4 py-2 rounded-md shadow z-50">
                    {toast}
                </div>
            )}
        </div>
    );
}