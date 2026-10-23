"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
    ArrowRight,
    ArrowUpRight,
    Search,
    ShoppingBag,
    Sparkles,
    X,
} from "lucide-react";
import type { StallShowcaseProduct, StallStatus } from "@/types/stall";
import StallProductImage from "./StallProductImage";

const INITIAL_COUNT = 12;
const BATCH_SIZE = 12;

export default function StallShowcaseGallery({
    products,
    status,
}: {
    products: StallShowcaseProduct[];
    status: StallStatus;
}) {
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("featured");
    const [limit, setLimit] = useState(INITIAL_COUNT);

    const filtered = useMemo(() => {
        const query = search.trim().toLocaleLowerCase();
        const matching = query
            ? products.filter((p) => p.name.toLocaleLowerCase().includes(query))
            : products;
        return sort === "az"
            ? [...matching].sort((a, b) => a.name.localeCompare(b.name))
            : matching;
    }, [products, search, sort]);
    const shown = filtered.slice(0, limit);
    const remaining = filtered.length - shown.length;

    return (
        <section
            id="stall-showcase"
            aria-labelledby="stall-showcase-title"
            className="mt-5 scroll-mt-24 overflow-hidden rounded-[25px] border border-[#e3eae7] bg-white shadow-[0_12px_32px_rgba(19,62,74,.045)]"
        >
            <div className="flex flex-col gap-3 border-b border-[#edf0ed] bg-[linear-gradient(110deg,#faf6f0,#f3faf7)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-7 sm:py-5">
                <div>
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[.15em] text-[#a96b44]">
                        <Sparkles size={14} /> The handmade edit
                    </p>
                    <h2
                        id="stall-showcase-title"
                        className="mt-1 text-[clamp(1.4rem,2.5vw,2rem)] font-extrabold tracking-[-.045em] text-[#24474d]"
                    >
                        {status === "completed"
                            ? "Designs we showcased"
                            : "What you'll find at our stall"}
                    </h2>
                    <p className="mt-1 text-[13px] text-[#6a8184]">
                        {status === "completed"
                            ? "Take another look at the creations from this event."
                            : "A little preview of handmade pieces waiting to be discovered."}
                    </p>
                </div>
                <div className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-[#cfe6e0] bg-white px-3 py-2 text-[13px] font-extrabold text-[#247078]">
                    <ShoppingBag size={16} /> {products.length}{" "}
                    {products.length === 1 ? "design" : "designs"}
                </div>
            </div>
            <div className="px-4 pb-5 pt-4 sm:px-7 sm:pb-7">
                {products.length > 8 && (
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative w-full sm:max-w-[390px]">
                            <Search
                                size={17}
                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#849c9c]"
                            />
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setLimit(INITIAL_COUNT);
                                }}
                                placeholder="Find a product in this stall..."
                                aria-label="Search stall products"
                                className="min-h-11 w-full rounded-xl border border-[#dce8e4] bg-[#fcfdfc] py-2 pl-10 pr-9 text-[13px] outline-none transition focus:border-[#83bcb7] focus:ring-2 focus:ring-[#e0f1ee]"
                            />
                            {search && (
                                <button
                                    type="button"
                                    aria-label="Clear search"
                                    onClick={() => {
                                        setSearch("");
                                        setLimit(INITIAL_COUNT);
                                    }}
                                    className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full hover:bg-[#edf6f3]"
                                >
                                    <X size={15} />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#7a9091]">
                                Sort by
                            </span>
                            <select
                                aria-label="Sort stall products"
                                value={sort}
                                onChange={(event) => {
                                    setSort(event.target.value);
                                    setLimit(INITIAL_COUNT);
                                }}
                                className="min-h-10 rounded-xl border border-[#dce8e4] bg-white px-3 text-[13px] font-semibold text-[#2c5257] outline-none focus:border-[#83bcb7]"
                            >
                                <option value="featured">Showcase order</option>
                                <option value="az">Name A–Z</option>
                            </select>
                        </div>
                    </div>
                )}

                {shown.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-6">
                            {shown.map((product) => {
                                const inner = (
                                    <>
                                        <div className="aspect-[1/1] overflow-hidden rounded-[14px] bg-[#f3f8f5]">
                                            <StallProductImage
                                                src={product.image}
                                                alt={product.name}
                                                sizes="(max-width: 640px) 48vw, (max-width: 1024px) 30vw, (max-width: 1280px) 23vw, 180px"
                                            />
                                        </div>
                                        <div className="px-1 pb-1 pt-2.5">
                                            <p className="line-clamp-2 min-h-[2.5rem] text-[12px] font-bold leading-[1.25rem] text-[#33555a] sm:text-[13px]">
                                                {product.name}
                                            </p>
                                            {product.slug ? (
                                                <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-extrabold text-[#087b86] group-hover:underline">
                                                    View design{" "}
                                                    <ArrowUpRight size={13} />
                                                </span>
                                            ) : (
                                                <span className="mt-1.5 inline-flex items-center text-[11px] font-semibold text-[#879899]">
                                                    Explore in person
                                                </span>
                                            )}
                                        </div>
                                    </>
                                );
                                const cls =
                                    "group block min-w-0 rounded-[18px] border border-[#e4eae5] bg-white p-2 transition duration-200 hover:-translate-y-0.5 hover:border-[#abd5cb] hover:shadow-[0_10px_24px_rgba(20,69,64,.09)]";
                                return product.slug ? (
                                    <Link
                                        key={product.id}
                                        href={`/products/${product.slug}`}
                                        title={product.name}
                                        className={cls}
                                    >
                                        {inner}
                                    </Link>
                                ) : (
                                    <div key={product.id} className={cls}>
                                        {inner}
                                    </div>
                                );
                            })}
                        </div>
                        {filtered.length > INITIAL_COUNT && (
                            <div className="mt-5 flex flex-col items-center gap-3 border-t border-[#edf1ef] pt-4 sm:flex-row sm:justify-between">
                                <p className="text-[13px] text-[#75898b]">
                                    Showing{" "}
                                    <strong className="text-[#2e5359]">
                                        {shown.length}
                                    </strong>{" "}
                                    of{" "}
                                    <strong className="text-[#2e5359]">
                                        {filtered.length}
                                    </strong>{" "}
                                    designs
                                </p>
                                {remaining > 0 ? (
                                    <div className="flex flex-wrap justify-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setLimit((n) => n + BATCH_SIZE)
                                            }
                                            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#087b86] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#05636b]"
                                        >
                                            Show{" "}
                                            {Math.min(BATCH_SIZE, remaining)}{" "}
                                            more <ArrowRight size={15} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setLimit(filtered.length)
                                            }
                                            className="inline-flex min-h-10 items-center rounded-xl border border-[#d2e2df] px-4 py-2 text-[13px] font-bold text-[#2e686d] hover:bg-[#f2faf8]"
                                        >
                                            View all {filtered.length}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setLimit(INITIAL_COUNT)}
                                        className="text-[13px] font-bold text-[#087b86] hover:underline"
                                    >
                                        Show fewer products ↑
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="rounded-2xl bg-[#f7faf8] px-4 py-10 text-center">
                        <p className="text-sm font-bold text-[#536d72]">
                            No designs match your search.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setSearch("");
                                setLimit(INITIAL_COUNT);
                            }}
                            className="mt-2 text-[13px] font-bold text-[#087b86] hover:underline"
                        >
                            Clear search
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}