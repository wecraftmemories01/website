"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

type Theme = {
    _id: string;
    publicName?: string;
    name?: string;
    image?: string;
};
const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export default function HomeCollections() {
    const [themes, setThemes] = useState<Theme[]>([]);
    const [loading, setLoading] = useState(true);
    const reduceMotion = useReducedMotion();

    useEffect(() => {
        let active = true;
        if (!API_BASE) {
            setLoading(false);
            return;
        }
        const controller = new AbortController();
        fetch(`${API_BASE}/theme/top_themes`, { signal: controller.signal })
            .then((res) => {
                if (!res.ok) throw Error("Unable to fetch collections");
                return res.json();
            })
            .then((body) => {
                if (active && Array.isArray(body?.themeData))
                    setThemes(body.themeData);
            })
            .catch(() => {})
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
            controller.abort();
        };
    }, []);

    if (loading)
        return (
            <div
                aria-label="Loading collections"
                className="grid grid-cols-2 gap-3 md:grid-cols-4 sm:gap-5"
            >
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="aspect-[4/5] animate-pulse rounded-[24px] bg-[#e9f4f5]"
                    />
                ))}
            </div>
        );
    if (!themes.length) return null;

    return (
        <section aria-label="Shop by collection">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-7">
                <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-[#c04753]">
                        Find your occasion
                    </p>
                    <h2 className="site-section-title">
                        Made for every little moment
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-[#607987]">
                        Explore collections inspired by celebrations, colors and
                        the people you love.
                    </p>
                </div>
                <Link
                    href="/products"
                    className="site-button-outline !min-h-11"
                >
                    Explore all <ArrowRight size={17} />
                </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
                {themes.slice(0, 8).map((theme, i) => (
                    <motion.div
                        key={theme._id}
                        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.1 }}
                        transition={{
                            duration: 0.35,
                            delay: Math.min(i, 4) * 0.045,
                        }}
                        className="min-w-0"
                    >
                        <Link
                            href={`/products?theme=${encodeURIComponent(theme._id)}`}
                            className="group relative block aspect-[4/5] overflow-hidden rounded-[22px] border border-[#deedef] bg-[linear-gradient(135deg,#d5f5fa,#ffe7dc)] shadow-[0_10px_26px_rgba(29,63,40,.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(29,63,40,.14)] sm:rounded-[26px] motion-reduce:transform-none"
                            aria-label={`Shop ${theme.publicName || theme.name || "collection"}`}
                        >
                            {theme.image ? (
                                <Image
                                    src={theme.image}
                                    alt={
                                        theme.publicName ||
                                        theme.name ||
                                        "Handmade collection"
                                    }
                                    fill
                                    sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
                                    className="object-cover transition-transform duration-700 group-hover:scale-[1.065] motion-reduce:transform-none"
                                />
                            ) : (
                                <span className="absolute inset-0 grid place-items-center text-[#0d91aa]">
                                    <Sparkles size={50} />
                                </span>
                            )}
                            <span
                                aria-hidden="true"
                                className="absolute inset-0 bg-gradient-to-t from-[#073a4c]/90 via-[#073a4c]/15 to-transparent"
                            />
                            <span className="absolute left-3 top-3 rounded-full border border-white/40 bg-white/90 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#065975] backdrop-blur-md sm:left-4 sm:top-4">
                                Handpicked
                            </span>
                            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4 sm:p-5 xl:p-6">
                                <span className="min-w-0">
                                    <span className="block text-[10px] font-semibold uppercase tracking-[.16em] text-white/75 sm:text-xs">
                                        Discover
                                    </span>
                                    <span className="mt-1.5 block text-base font-extrabold leading-tight text-white sm:text-xl">
                                        {theme.publicName ||
                                            theme.name ||
                                            "Collection"}
                                    </span>
                                </span>
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#065975] transition-transform group-hover:-rotate-45 sm:h-11 sm:w-11">
                                    <ArrowRight size={18} />
                                </span>
                            </span>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}