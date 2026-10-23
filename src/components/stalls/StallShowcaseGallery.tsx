"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
    ArrowUpRight,
    ChevronLeft,
    ChevronRight,
    Search,
    X,
} from "lucide-react";
import type { StallShowcaseProduct, StallStatus } from "@/types/stall";
import StallProductImage from "./StallProductImage";

const PAGE_SIZE = 12;

export default function StallShowcaseGallery({
    products,
    status,
}: {
    products: StallShowcaseProduct[];
    status: StallStatus;
}) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const filtered = useMemo(() => {
        const q = search.trim().toLocaleLowerCase();
        return q
            ? products.filter((product) =>
                  product.name.toLocaleLowerCase().includes(q),
              )
            : products;
    }, [products, search]);
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const actualPage = Math.min(pages, page);
    const start = (actualPage - 1) * PAGE_SIZE;
    const shown = filtered.slice(start, start + PAGE_SIZE);
    const switchPage = (number: number) =>
        setPage(Math.max(1, Math.min(number, pages)));
    return (
        <section
            id="stall-showcase"
            aria-labelledby="showcase-title"
            className="mt-5 scroll-mt-28 rounded-[22px] border border-[#e3ebee] bg-white px-4 py-5 shadow-[0_5px_24px_rgba(17,59,76,.04)] sm:px-6 sm:py-6"
        >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#14809b]">
                        Handmade product showcase
                    </p>
                    <h2
                        id="showcase-title"
                        className="mt-1 font-serif text-2xl font-semibold text-[#153e4d] sm:text-[1.75rem]"
                    >
                        {status === "completed"
                            ? "What we showcased"
                            : "What you'll find"}
                    </h2>
                    <p className="mt-1 text-[13px] text-[#748891]">
                        {status === "completed"
                            ? "Designs from this event"
                            : "A preview of designs we're bringing"}{" "}
                        · {products.length}{" "}
                        {products.length === 1 ? "design" : "designs"}
                    </p>
                </div>
                {products.length > 8 && (
                    <div className="relative w-full md:max-w-[290px]">
                        <Search
                            size={17}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a6ac]"
                        />
                        <input
                            type="search"
                            aria-label="Search showcase products"
                            placeholder="Find a product..."
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            className="min-h-11 w-full rounded-xl border border-[#d9e6eb] bg-[#fbfcfd] py-2 pl-10 pr-9 text-sm outline-none focus:border-[#76b7ca] focus:ring-2 focus:ring-[#cae9f1]"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch("");
                                    setPage(1);
                                }}
                                aria-label="Clear product search"
                                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-[#849ca5] hover:bg-[#eff7fa]"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {shown.length ? (
                <>
                    <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                        {shown.map((product) => {
                            const body = (
                                <>
                                    <div className="aspect-square overflow-hidden rounded-xl border border-[#e8edef] bg-[#f2f9fa]">
                                        <StallProductImage
                                            src={product.image}
                                            alt={product.name}
                                            sizes="(max-width: 640px) 48vw, (max-width: 1024px) 31vw, 180px"
                                        />
                                    </div>
                                    <div className="flex min-h-[45px] items-start justify-between gap-1 px-1 pt-2">
                                        <span className="line-clamp-2 text-xs font-semibold leading-[18px] text-[#305564] sm:text-[13px]">
                                            {product.name}
                                        </span>
                                        {product.slug && (
                                            <ArrowUpRight
                                                size={13}
                                                className="mt-0.5 shrink-0 text-[#177b98]"
                                            />
                                        )}
                                    </div>
                                </>
                            );
                            const cls =
                                "group block min-w-0 rounded-2xl border border-[#edf1f3] bg-white p-1.5 transition hover:-translate-y-0.5 hover:border-[#b7dbe6] hover:shadow-[0_10px_24px_rgba(17,59,76,.08)]";
                            return product.slug ? (
                                <Link
                                    href={`/products/${product.slug}`}
                                    key={product.id}
                                    title={product.name}
                                    className={cls}
                                >
                                    {body}
                                </Link>
                            ) : (
                                <div key={product.id} className={cls}>
                                    {body}
                                </div>
                            );
                        })}
                    </div>
                    {pages > 1 && (
                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f3] pt-4">
                            <p className="text-xs text-[#778d95]">
                                Showing {start + 1}–
                                {Math.min(start + PAGE_SIZE, filtered.length)}{" "}
                                of {filtered.length}
                            </p>
                            <nav
                                className="flex items-center gap-2"
                                aria-label="Product showcase pages"
                            >
                                <button
                                    type="button"
                                    onClick={() => switchPage(actualPage - 1)}
                                    disabled={actualPage === 1}
                                    aria-label="Previous products"
                                    className="grid h-9 w-9 place-items-center rounded-lg border border-[#dce8ec] text-[#36697a] disabled:opacity-35"
                                >
                                    <ChevronLeft size={17} />
                                </button>
                                <span className="min-w-[76px] text-center text-xs font-bold text-[#2e5d70]">
                                    {actualPage} of {pages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => switchPage(actualPage + 1)}
                                    disabled={actualPage === pages}
                                    aria-label="Next products"
                                    className="grid h-9 w-9 place-items-center rounded-lg border border-[#dce8ec] text-[#36697a] disabled:opacity-35"
                                >
                                    <ChevronRight size={17} />
                                </button>
                            </nav>
                        </div>
                    )}
                </>
            ) : (
                <div className="mt-4 rounded-xl bg-[#f7fafb] px-4 py-8 text-center text-sm text-[#6b838e]">
                    No matching designs.{" "}
                    <button
                        type="button"
                        onClick={() => {
                            setSearch("");
                            setPage(1);
                        }}
                        className="font-bold text-[#0b7291] underline"
                    >
                        Show all products
                    </button>
                </div>
            )}
        </section>
    );
}