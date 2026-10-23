"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Gift, Heart, PackageCheck, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export default function HeroClient() {
    const reduceMotion = useReducedMotion();

    return (
        <section className="site-hero wcm-hero relative isolate overflow-hidden rounded-[26px] sm:rounded-[36px]">
            <div className="absolute -left-32 -top-36 h-80 w-80 rounded-full bg-white/40 blur-3xl pointer-events-none" />
            {/* Single column until desktop, so hidden images leave no blank column. */}
            <div className="grid grid-cols-1 items-center min-[1200px]:grid-cols-[.92fr_1.08fr] min-[1200px]:min-h-[430px]">
                <motion.div
                    initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55 }}
                    className="relative z-10 px-5 py-7 sm:px-10 sm:py-9 lg:px-12 lg:py-11 min-[1200px]:p-12 min-[1450px]:p-16 min-[1200px]:pr-5 text-left sm:text-center min-[1200px]:text-left"
                >
                    <span className="site-eyebrow">
                        <Sparkles size={14} /> Crafted slowly. Gifted joyfully.
                    </span>
                    <h1 className="mt-4 min-[1200px]:mt-6 max-w-2xl sm:mx-auto min-[1200px]:mx-0 min-[1200px]:max-w-xl text-[clamp(2rem,5.5vw,3.5rem)] min-[1200px]:text-[clamp(3.25rem,4.4vw,4.5rem)] leading-[1.08] tracking-[-.045em] font-extrabold text-[#065975]">
                        Little gifts.
                        <br />
                        <span className="wcm-hero-highlight">
                            Big feelings.
                        </span>
                    </h1>
                    <p className="mt-3 min-[1200px]:mt-5 max-w-xl sm:mx-auto min-[1200px]:mx-0 text-sm sm:text-base min-[1200px]:text-lg leading-6 min-[1200px]:leading-7 text-[#527481]">
                        From adorable crochet keepsakes to ready-to-gift
                        hampers, find something as special as the person
                        receiving it.
                    </p>
                    <div className="mt-5 min-[1200px]:mt-8 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center sm:justify-center min-[1200px]:justify-start gap-3">
                        <Link href="/products" className="site-button-primary">
                            Shop handmade gifts <ArrowRight size={18} />
                        </Link>
                        <Link href="/hampers" className="site-button-outline">
                            <Gift size={18} /> Explore hampers
                        </Link>
                    </div>
                    <div className="mt-5 min-[1200px]:mt-8 flex flex-wrap sm:justify-center min-[1200px]:justify-start gap-x-4 min-[1200px]:gap-x-5 gap-y-2 text-xs font-medium text-[#527481]">
                        <span className="inline-flex items-center gap-1.5">
                            <Heart size={14} /> Handmade
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <PackageCheck size={14} /> Packed with care
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Gift size={14} /> Made to gift
                        </span>
                    </div>
                </motion.div>
                <motion.div
                    initial={reduceMotion ? false : { opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7 }}
                    className="relative hidden min-[1200px]:block h-full min-h-[430px] overflow-hidden"
                >
                    <Image
                        src="/banner.png"
                        alt="A collection of handmade crochet gifts from We Craft Memories"
                        fill
                        loading="lazy"
                        sizes="(min-width: 1200px) 55vw, 1px"
                        className="object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#f4fbfc] via-transparent to-transparent" />
                </motion.div>
            </div>
        </section>
    );
}