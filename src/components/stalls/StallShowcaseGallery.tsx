"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
    ArrowUpRight,
    ChevronLeft,
    ChevronRight,
    Search,
    ShoppingBag,
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
    const activePage = Math.min(page, pages);
    const start = (activePage - 1) * PAGE_SIZE;
    const shown = filtered.slice(start, start + PAGE_SIZE);

    return (
        <section
            id="stall-showcase"
            className="mt-6 rounded-[28px] border border-[#e3edf1] bg-white p-5 shadow-[0_10px_34px_rgba(14,66,86,.05)] sm:p-6"
            aria-labelledby="showcase-title"
        >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0b7896]">
                        Handmade showcase
                    </p>
                    <h2
                        id="showcase-title"
                        className="mt-1 text-2xl font-semibold tracking-tight text-[#173f4f] sm:text-3xl"
                    >
                        {status === "completed"
                            ? "What we showcased"
                            : "What you'll find at this stall"}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b838d]">
                        {status === "completed"
                            ? "A look back at the handmade designs we displayed at this stall."
                            : "Browse the products planned for this stall and discover what you may find when you visit."}
                    </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#eef7fa] px-4 py-2 text-sm font-semibold text-[#0b7896]">
                        <ShoppingBag size={16} /> {filtered.length}{" "}
                        {filtered.length === 1 ? "design" : "designs"}
                    </span>
                    {products.length > 8 && (
                        <div className="relative w-full sm:w-[300px]">
                            <Search
                                size={17}
                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#93a6ad]"
                            />
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPage(1);
                                }}
                                placeholder="Search products in this stall..."
                                aria-label="Search showcased products"
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
            </div>

            {shown.length > 0 ? (
                <>
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                        {shown.map((product) => {
                            const content = (
                                <>
                                    <div className="aspect-square overflow-hidden rounded-[18px] bg-[#f2f9fa]">
                                        <StallProductImage
                                            src={product.image}
                                            alt={product.name}
                                            sizes="(max-width: 640px) 48vw, (max-width: 1024px) 31vw, 180px"
                                        />
                                    </div>
                                    <div className="px-1 pt-3">
                                        <p className="line-clamp-2 min-h-[2.7rem] text-sm font-semibold leading-5 text-[#315362]">
                                            {product.name}
                                        </p>
                                        {product.slug && (
                                            <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#0b7896]">
                                                View product{" "}
                                                <ArrowUpRight size={12} />
                                            </span>
                                        )}
                                    </div>
                                </>
                            );

                            const className =
                                "group block rounded-[22px] border border-[#e5edf0] bg-white p-2 shadow-[0_8px_20px_rgba(17,59,76,.04)] transition hover:-translate-y-1 hover:border-[#cfe2e8] hover:shadow-[0_16px_34px_rgba(17,59,76,.08)]";
                            return product.slug ? (
                                <Link
                                    href={`/products/${product.slug}`}
                                    key={product.id}
                                    title={product.name}
                                    className={className}
                                >
                                    {content}
                                </Link>
                            ) : (
                                <div key={product.id} className={className}>
                                    {content}
                                </div>
                            );
                        })}
                    </div>

                    {pages > 1 && (
                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f3] pt-4">
                            <p className="text-sm text-[#6b838d]">
                                Showing{" "}
                                <span className="font-semibold text-[#173f4f]">
                                    {start + 1}–
                                    {Math.min(
                                        start + PAGE_SIZE,
                                        filtered.length,
                                    )}
                                </span>{" "}
                                of{" "}
                                <span className="font-semibold text-[#173f4f]">
                                    {filtered.length}
                                </span>{" "}
                                designs
                            </p>
                            <nav
                                className="flex items-center gap-2"
                                aria-label="Product showcase pages"
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        setPage(Math.max(1, activePage - 1))
                                    }
                                    disabled={activePage === 1}
                                    aria-label="Previous products"
                                    className="grid h-10 w-10 place-items-center rounded-xl border border-[#dce8ec] text-[#36697a] disabled:opacity-35 hover:bg-[#eef8fa]"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="min-w-[90px] text-center text-sm font-semibold text-[#315362]">
                                    {activePage} of {pages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setPage(Math.min(pages, activePage + 1))
                                    }
                                    disabled={activePage === pages}
                                    aria-label="Next products"
                                    className="grid h-10 w-10 place-items-center rounded-xl border border-[#dce8ec] text-[#36697a] disabled:opacity-35 hover:bg-[#eef8fa]"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </nav>
                        </div>
                    )}
                </>
            ) : (
                <div className="mt-5 rounded-[20px] bg-[#f7fafb] px-4 py-8 text-center text-sm text-[#6b838e]">
                    No matching designs.{" "}
                    <button
                        type="button"
                        onClick={() => {
                            setSearch("");
                            setPage(1);
                        }}
                        className="font-semibold text-[#0b7291] underline underline-offset-2"
                    >
                        Show all products
                    </button>
                </div>
            )}
        </section>
    );
}