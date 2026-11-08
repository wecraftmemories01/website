"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import api from "@/services/api";
import ProductCardClient from "@/components/ProductCardClient";
import type { Product } from "@/types/product";

type Recommendation = Product & { _id: string };

type Props = {
    context: "product" | "cart";
    productId?: string;
    productIds?: string[];
    showPopularWhenEmpty?: boolean;
};

/** Shared section for product details and checkout cart; no separate cart flow. */
export default function ProductRecommendations({ context, productId, productIds = [], showPopularWhenEmpty = false }: Props) {
    const [products, setProducts] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(false);
    const rowRef = useRef<HTMLDivElement>(null);
    const idsKey = productIds.join(",");

    useEffect(() => {
        const ids = idsKey.split(",").filter(Boolean);
        if ((context === "product" && !productId) || (context === "cart" && !ids.length && !showPopularWhenEmpty)) {
            setProducts([]);
            setLoading(false);
            return;
        }
        const controller = new AbortController();
        setLoading(true);
        setProducts([]);
        const request = context === "product"
            ? api.get(`/product/sell/${encodeURIComponent(productId!)}/recommendations`, { signal: controller.signal })
            : api.post("/product/sell/recommendations/cart", { productIds: ids }, { signal: controller.signal });

        request.then(({ data }) => {
            if (controller.signal.aborted) return;
            const excluded = new Set(context === "cart" ? ids : [productId]);
            setProducts((Array.isArray(data?.recommendations) ? data.recommendations : [])
                .filter((p: Recommendation) => p?._id && !excluded.has(p._id)));
        }).catch(() => {
            if (!controller.signal.aborted) setProducts([]);
        }).finally(() => {
            if (!controller.signal.aborted) setLoading(false);
        });
        return () => controller.abort();
    }, [context, productId, idsKey, showPopularWhenEmpty]);

    // An API problem should never block buying or clutter an empty cart.
    if (!loading && products.length === 0) return null;

    const title = context === "cart" ? "Make your gift extra special" : "You may also love";
    const description = context === "cart"
        ? "Handpicked ideas to pair with what's in your bag."
        : "More handmade finds chosen to match your taste.";

    return (
        <section aria-label={title} className="min-w-0 rounded-[24px] border border-[#dceae8] bg-gradient-to-br from-[#f8fdfc] via-white to-[#f1f9fc] p-4 shadow-[0_8px_32px_rgba(18,78,87,.06)] sm:p-6 lg:p-7">
            <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
                <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#daf2ee] text-[#087b84]"><Sparkles size={18} /></span>
                    <div className="min-w-0">
                        <h2 className="text-lg font-extrabold leading-snug text-[#123f49] sm:text-xl">{title}</h2>
                        <p className="mt-1 text-xs leading-relaxed text-[#58717a] sm:text-sm">{description}</p>
                    </div>
                </div>
                <div className="hidden shrink-0 gap-2 sm:flex">
                    <button type="button" onClick={() => rowRef.current?.scrollBy({ left: -440, behavior: "smooth" })}
                        aria-label="Previous recommendations" className="grid h-10 w-10 place-items-center rounded-full border border-[#c6e3e4] bg-white text-[#0b6979] transition hover:bg-[#eaf7f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6979]">
                        <ChevronLeft size={19} />
                    </button>
                    <button type="button" onClick={() => rowRef.current?.scrollBy({ left: 440, behavior: "smooth" })}
                        aria-label="Next recommendations" className="grid h-10 w-10 place-items-center rounded-full border border-[#c6e3e4] bg-white text-[#0b6979] transition hover:bg-[#eaf7f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b6979]">
                        <ChevronRight size={19} />
                    </button>
                </div>
            </div>
            <div ref={rowRef} className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 scrollbar-thin sm:gap-4" tabIndex={0} aria-label="Recommended product carousel">
                {loading ? Array.from({ length: context === "cart" ? 3 : 4 }, (_, i) => (
                    <div key={i} className="w-[min(68vw,210px)] shrink-0 animate-pulse snap-start overflow-hidden rounded-2xl border border-slate-100 bg-white sm:w-[220px]">
                        <div className="aspect-square bg-slate-100"/><div className="space-y-3 p-4"><div className="h-4 rounded bg-slate-100"/><div className="h-4 w-2/3 rounded bg-slate-100"/><div className="h-9 rounded bg-slate-100"/></div>
                    </div>
                )) : products.map((p) => (
                    <div key={p._id} className="w-[min(68vw,210px)] shrink-0 snap-start sm:w-[220px] lg:w-[230px]">
                        <ProductCardClient product={p} />
                    </div>
                ))}
            </div>
        </section>
    );
}
