"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Gift, Heart, PackageCheck, Sparkles } from "lucide-react";
import HeroClient from "@/components/HeroClient";
import HomeProductGrid from "@/components/HomeProductGrid";
import HomeCollections from "@/components/HomeCollections";
import Testimonials from "@/components/Testimonials";
import HomeGallery from "@/components/HomeGallery";
import HomeHamperGrid from "@/components/HomeHamperGrid";
import { fetchCartFromApi } from "@/lib/cart";
import { getStoredAccessToken } from "@/lib/auth";
import type { Product } from "@/types/product";

export default function HomePage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (getStoredAccessToken()) void fetchCartFromApi();
        const ctrl = new AbortController();
        (async () => {
            try {
                const base = process.env.NEXT_PUBLIC_API_BASE;
                if (!base) return;
                const res = await fetch(`${base}/product/sell/top_products`, {
                    signal: ctrl.signal,
                });
                if (!res.ok) return;
                const data = await res.json();
                if (
                    !ctrl.signal.aborted &&
                    data.ack === "success" &&
                    Array.isArray(data.productData)
                )
                    setProducts(data.productData);
            } catch (err) {
                if (!ctrl.signal.aborted)
                    console.warn("Unable to load featured products", err);
            } finally {
                if (!ctrl.signal.aborted) setLoading(false);
            }
        })();
        return () => ctrl.abort();
    }, []);
    return (
        <div>
            <HeroClient />
            <section
                className="grid grid-cols-1 min-[520px]:grid-cols-3 gap-3 sm:gap-5 pt-6 sm:pt-9"
                aria-label="Why shop with us"
            >
                {[
                    {
                        icon: Heart,
                        title: "Made by hand",
                        text: "Thoughtful details in every stitch",
                    },
                    {
                        icon: Gift,
                        title: "Easy gifting",
                        text: "Find a keepsake or a curated hamper",
                    },
                    {
                        icon: PackageCheck,
                        title: "Packed with care",
                        text: "Prepared for your special moments",
                    },
                ].map((item) => (
                    <div
                        key={item.title}
                        className="site-card wcm-home-perk flex items-center gap-3 p-4 sm:p-5"
                    >
                        <span className="wcm-perk-icon shrink-0 grid place-items-center w-11 h-11 rounded-xl">
                            <item.icon size={21} />
                        </span>
                        <div>
                            <h2 className="text-sm font-bold text-[#173b4a]">
                                {item.title}
                            </h2>
                            <p className="text-xs mt-1 text-slate-500 leading-5">
                                {item.text}
                            </p>
                        </div>
                    </div>
                ))}
            </section>
            <section
                className="site-section"
                aria-label="Popular handmade gifts"
            >
                {loading ? (
                    <div>
                        <div className="h-8 w-48 rounded bg-slate-100 animate-pulse mb-6" />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[0, 1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="aspect-[3/4] rounded-2xl bg-slate-100 animate-pulse"
                                />
                            ))}
                        </div>
                    </div>
                ) : products.length > 0 ? (
                    <HomeProductGrid products={products} />
                ) : (
                    <div className="site-card text-center p-10">
                        <p className="text-slate-600">
                            Explore our latest handmade creations.
                        </p>
                        <Link
                            href="/products"
                            className="site-button-primary mt-4"
                        >
                            Browse products <ArrowRight size={17} />
                        </Link>
                    </div>
                )}
            </section>
            <section
                className="site-section !pt-0"
                aria-label="Shop by collection"
            >
                <HomeCollections />
            </section>
            <section
                className="site-section !pt-0"
                aria-label="Explore gift hampers"
            >
                <HomeHamperGrid />
            </section>
            <section className="site-gradient rounded-[26px] sm:rounded-[34px] overflow-hidden p-7 sm:p-12 flex flex-col md:flex-row items-start md:items-center gap-8 justify-between">
                <div className="max-w-2xl">
                    <span className="site-eyebrow">
                        <Sparkles size={14} /> Curated with care
                    </span>
                    <h2 className="site-section-title mt-4">
                        A lovely surprise, all in one hamper.
                    </h2>
                    <p className="text-slate-600 leading-7 mt-3 text-sm sm:text-base">
                        Handpicked collections made for birthdays, thank-yous,
                        celebrations and just-because moments.
                    </p>
                </div>
                <Link
                    href="/hampers"
                    className="site-button-primary shrink-0 w-full sm:w-auto"
                >
                    Shop gift hampers <ArrowRight size={17} />
                </Link>
            </section>
            <section
                className="site-section"
                aria-label="Our handmade community"
            >
                <HomeGallery />
            </section>
            <section
                className="site-section !pt-0"
                aria-label="Customer stories"
            >
                <Testimonials />
            </section>
            <section className="wcm-shop-finale text-center py-10 sm:py-14 px-6 rounded-[28px] text-white">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    Find a gift that feels like you.
                </h2>
                <p className="mt-3 text-sm sm:text-base text-white/80">
                    Something small can mean everything.
                </p>
                <Link href="/products" className="site-button-outline mt-6">
                    Discover handmade gifts <ArrowRight size={18} />
                </Link>
            </section>
        </div>
    );
}