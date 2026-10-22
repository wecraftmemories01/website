"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    Gift,
    Search,
    X,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import HamperMediaImage from "@/components/HamperMediaImage";
import { Hamper, currencyINR, hamperPath, listHampers } from "@/lib/hampers";
import { plainTextFromHtml } from "@/lib/hamperDisplay";

const PAGE_SIZE = 12;
export default function HampersPage() {
    const reduceMotion = useReducedMotion();
    const [search, setSearch] = useState("");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [hampers, setHampers] = useState<Hamper[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setPage(1);
            setQuery(search.trim());
        }, 350);
        return () => clearTimeout(timeout);
    }, [search]);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");
        listHampers(page, PAGE_SIZE, query)
            .then((result) => {
                if (active) {
                    setHampers(result.data);
                    setTotal(result.totalRecords);
                }
            })
            .catch((err) => {
                if (active) {
                    setError(
                        typeof err?.response?.data?.error === "string"
                            ? err.response.data.error
                            : err?.message || "Unable to load hampers",
                    );
                    setHampers([]);
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [page, query, retry]);

    const pages = Math.ceil(total / PAGE_SIZE);
    return (
        <div className="pb-12 sm:pb-20">
            <section className="site-gradient relative overflow-hidden rounded-[24px] sm:rounded-[32px] px-6 py-10 sm:px-12 sm:py-14 mt-2 sm:mt-3">
                <div className="absolute -top-20 right-0 h-64 w-64 rounded-full bg-[#d5e9da] blur-3xl" />
                <div className="relative max-w-2xl site-reveal">
                    <span className="site-eyebrow">
                        <Gift size={14} /> Gifts that tell a story
                    </span>
                    <h1 className="mt-5 text-[clamp(2.15rem,5vw,3.7rem)] leading-tight tracking-[-.04em] font-extrabold text-[#065975]">
                        Gift hampers, made personal.
                    </h1>
                    <p className="mt-4 text-slate-600 text-sm sm:text-base leading-7">
                        Thoughtful bundles of handmade favourites, ready to
                        bring a little joy to someone’s day.
                    </p>
                </div>
            </section>
            <section className="mt-8 sm:mt-12" aria-label="Browse gift hampers">
                <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between mb-6">
                    <div>
                        <h2 className="site-section-title">
                            Find their perfect gift
                        </h2>
                        <p
                            className="text-sm text-slate-500 mt-1"
                            aria-live="polite"
                        >
                            {loading
                                ? "Finding gifts for you…"
                                : `${total} ${total === 1 ? "hamper" : "hampers"} to explore`}
                        </p>
                    </div>
                    <form
                        role="search"
                        onSubmit={(e) => e.preventDefault()}
                        className="w-full md:w-80 relative"
                    >
                        <Search
                            size={19}
                            className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search gift hampers"
                            aria-label="Search gift hampers"
                            className="site-field !pl-11 !pr-11 w-full"
                        />
                        {search && (
                            <button
                                type="button"
                                aria-label="Clear search"
                                onClick={() => setSearch("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 site-icon-button"
                            >
                                <X size={17} />
                            </button>
                        )}
                    </form>
                </div>
                {error && (
                    <div
                        role="alert"
                        className="site-card p-5 mb-6 border-red-200 text-red-700"
                    >
                        {error}{" "}
                        <button
                            onClick={() => setRetry((v) => v + 1)}
                            type="button"
                            className="ml-2 font-bold underline"
                        >
                            Retry
                        </button>
                    </div>
                )}
                {loading ? (
                    <div
                        aria-label="Loading gift hampers"
                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-6"
                    >
                        {Array.from({ length: 8 }, (_, i) => (
                            <div
                                key={i}
                                className="site-card overflow-hidden animate-pulse"
                            >
                                <div className="aspect-[4/4.5] bg-slate-100" />
                                <div className="p-4 space-y-3">
                                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : hampers.length === 0 ? (
                    <div className="site-card py-14 sm:py-20 px-5 text-center">
                        <Gift
                            size={38}
                            className="text-[#648b75] mx-auto mb-4"
                        />
                        <h3 className="text-xl font-bold text-[#065975]">
                            No hampers found
                        </h3>
                        <p className="mt-2 text-slate-500 text-sm">
                            Try another search, or browse our handmade gifts.
                        </p>
                        <div className="flex justify-center gap-3 mt-5">
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                className="site-button-outline"
                            >
                                Clear search
                            </button>
                            <Link
                                href="/products"
                                className="site-button-primary"
                            >
                                Shop gifts
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-6">
                        {hampers.map((h, i) => (
                            <motion.div
                                key={h.hamperId}
                                initial={
                                    reduceMotion ? false : { opacity: 0, y: 12 }
                                }
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{
                                    duration: 0.35,
                                    delay: Math.min(i, 5) * 0.04,
                                }}
                            >
                                <Link
                                    href={hamperPath(h)}
                                    className="site-card site-card-hover block overflow-hidden h-full group"
                                >
                                    <div className="relative aspect-[4/4.4] sm:aspect-square overflow-hidden bg-[#e6f7f9]">
                                        <HamperMediaImage
                                            src={h.hamperImage}
                                            alt={h.hamperName}
                                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                            iconSize={54}
                                            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                                        />
                                        {!h.isAvailableForSale ? (
                                            <span className="absolute top-3 left-3 rounded-full bg-white/95 text-slate-600 px-3 py-1.5 text-[11px] font-bold">
                                                Out of stock
                                            </span>
                                        ) : (
                                            <span className="absolute top-3 left-3 rounded-full bg-white/95 text-[#215c47] px-3 py-1.5 text-[11px] font-bold">
                                                Handmade gift
                                            </span>
                                        )}
                                    </div>
                                    <div className="p-3 sm:p-5 flex flex-col min-h-[150px]">
                                        <h3 className="text-sm sm:text-base font-bold leading-snug text-[#173b4a] line-clamp-2">
                                            {h.hamperName}
                                        </h3>
                                        <p className="hidden sm:block text-sm text-slate-500 line-clamp-2 mt-2">
                                            {plainTextFromHtml(
                                                h.shortDescription,
                                            ) || "A thoughtful curated gift"}
                                        </p>
                                        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                                            <span className="font-extrabold text-base sm:text-lg text-[#065975]">
                                                {currencyINR(Number(h.price))}
                                            </span>
                                            <span className="w-9 h-9 rounded-full bg-[#e6f7f9] grid place-items-center text-[#065975] group-hover:bg-[#065975] group-hover:text-white transition-colors">
                                                <ArrowRight size={17} />
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
                {pages > 1 && (
                    <nav
                        aria-label="Hamper pages"
                        className="mt-10 flex justify-center items-center gap-3"
                    >
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={loading || page === 1}
                            className="site-button-outline !px-4 disabled:opacity-40"
                        >
                            <ChevronLeft size={17} />
                            Previous
                        </button>
                        <span
                            className="text-sm font-medium text-slate-600"
                            aria-live="polite"
                        >
                            {page} / {pages}
                        </span>
                        <button
                            type="button"
                            onClick={() =>
                                setPage((p) => Math.min(pages, p + 1))
                            }
                            disabled={loading || page === pages}
                            className="site-button-outline !px-4 disabled:opacity-40"
                        >
                            Next <ChevronRight size={17} />
                        </button>
                    </nav>
                )}
            </section>
        </div>
    );
}