"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Gift, Package } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import HamperMediaImage from "@/components/HamperMediaImage";
import HamperQuickAddButton from "@/components/HamperQuickAddButton";
import {
    currencyINR,
    hamperPath,
    listHampers,
    type Hamper,
} from "@/lib/hampers";

/** Uses the public hamper listing endpoint; no homepage-specific API changes required. */
export default function HomeHamperGrid() {
    const [hampers, setHampers] = useState<Hamper[]>([]);
    const [loading, setLoading] = useState(true);
    const reduceMotion = useReducedMotion();

    useEffect(() => {
        let active = true;
        listHampers(1, 8)
            .then(({ data }) => {
                if (active) setHampers(data);
            })
            .catch(() => {
                if (active) setHampers([]);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, []);

    return (
        <section aria-label="Handmade gift hampers">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-7">
                <div>
                    <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#c04753]">
                        <Gift size={15} /> Thoughtfully bundled
                    </p>
                    <h2 className="site-section-title">
                        A little box of happiness
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-[#607987]">
                        Thoughtful gift hampers, curated for the moments that
                        matter.
                    </p>
                </div>
                <Link href="/hampers" className="site-button-outline !min-h-11">
                    All hampers <ArrowRight size={17} />
                </Link>
            </div>
            {loading ? (
                <div
                    className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4"
                    aria-label="Loading gift hampers"
                >
                    {Array.from({ length: 4 }, (_, index) => (
                        <div
                            key={index}
                            className="aspect-[4/5] animate-pulse rounded-[24px] bg-[#e9f4f5]"
                        />
                    ))}
                </div>
            ) : hampers.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
                    {hampers.slice(0, 4).map((hamper, index) => (
                        <motion.div
                            key={hamper.hamperId}
                            initial={
                                reduceMotion ? false : { opacity: 0, y: 16 }
                            }
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{
                                duration: 0.32,
                                delay: index * 0.055,
                            }}
                            className="min-w-0"
                        >
                            <div className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[22px] border border-[#d8ebef] bg-white shadow-[0_10px_30px_rgba(33,67,46,.05)] transition-all duration-300 hover:-translate-y-1 hover:border-[#9ed5df] hover:shadow-[0_22px_45px_rgba(33,67,46,.12)] motion-reduce:transform-none">
                                <Link href={hamperPath(hamper)} className="flex flex-1 flex-col">
                                <div className="relative aspect-[5/4.5] overflow-hidden bg-[#eef9fa]">
                                    <HamperMediaImage
                                        src={hamper.hamperImage}
                                        alt={hamper.hamperName}
                                        sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
                                        iconSize={48}
                                        className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none"
                                    />
                                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1.5 text-[10px] font-extrabold text-[#116981] shadow-sm sm:text-xs">
                                        {hamper.isAvailableForSale
                                            ? "Curated gift"
                                            : "Currently unavailable"}
                                    </span>
                                </div>
                                <div className="flex min-h-[132px] flex-1 flex-col p-3.5 sm:p-5">
                                    <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7c949d]">
                                        <Package size={12} /> Gift hamper
                                    </p>
                                    <h3 className="line-clamp-2 text-sm font-bold leading-snug text-[#193c4d] sm:text-lg">
                                        {hamper.hamperName}
                                    </h3>
                                    <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                                        <span className="text-base font-extrabold text-[#065975] sm:text-xl">
                                            {currencyINR(Number(hamper.price))}
                                        </span>
                                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e6f7f9] text-[#065975] transition-colors group-hover:bg-[#065975] group-hover:text-white">
                                            <ArrowRight size={17} />
                                        </span>
                                    </div>
                                </div>
                                </Link>
                                <div className="px-3.5 pb-3.5 sm:px-5 sm:pb-5">
                                    <HamperQuickAddButton hamper={hamper} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-[#d8ebef] bg-[#f0fafb] p-6 sm:p-8">
                    <div>
                        <p className="text-lg font-bold text-[#065975]">
                            Your next thoughtful surprise awaits.
                        </p>
                        <p className="mt-2 text-sm text-[#607987]">
                            Explore our hamper collection.
                        </p>
                    </div>
                    <Link href="/hampers" className="site-button-primary">
                        Browse hampers <ArrowRight size={16} />
                    </Link>
                </div>
            )}
        </section>
    );
}