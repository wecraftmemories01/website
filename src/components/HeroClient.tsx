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
            <div className="grid items-center lg:grid-cols-[.9fr_1.1fr] min-h-[435px]">
                <motion.div
                    initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55 }}
                    className="relative z-10 p-7 pb-4 sm:p-12 lg:p-16 lg:pr-4"
                >
                    <span className="site-eyebrow">
                        <Sparkles size={14} /> Crafted slowly. Gifted joyfully.
                    </span>
                    <h1 className="mt-6 max-w-lg text-[clamp(2.35rem,5vw,4.6rem)] leading-[1.08] tracking-[-.045em] font-extrabold text-[#065975]">
                        Little gifts.
                        <br />
                        <span className="wcm-hero-highlight">
                            Big feelings.
                        </span>
                    </h1>
                    <p className="mt-5 max-w-md text-[15px] sm:text-lg leading-7 text-[#527481]">
                        From adorable crochet keepsakes to ready-to-gift
                        hampers, find something as special as the person
                        receiving it.
                    </p>
                    <div className="flex flex-col min-[390px]:flex-row gap-3 mt-7 sm:mt-9">
                        <Link href="/products" className="site-button-primary">
                            Shop handmade gifts <ArrowRight size={18} />
                        </Link>
                        <Link href="/hampers" className="site-button-outline">
                            <Gift size={18} /> Explore hampers
                        </Link>
                    </div>
                    <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[#527481]">
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
                    className="relative h-[270px] sm:h-[370px] lg:h-full min-h-[270px] overflow-hidden"
                >
                    <Image
                        src="/banner.png"
                        alt="A collection of handmade crochet gifts from We Craft Memories"
                        fill
                        priority
                        sizes="(max-width: 1024px) 100vw, 55vw"
                        className="object-contain object-center p-2 sm:p-4 lg:object-cover lg:object-center"
                    />
                    <div className="absolute inset-0 hidden lg:block bg-gradient-to-r from-[#f4fbfc] via-transparent to-transparent" />
                </motion.div>
            </div>
        </section>
    );
}