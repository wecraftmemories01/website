"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import ProductCardClient from "./ProductCardClient";
import type { Product } from "@/types/product";

export default function HomeProductGrid({ products }: { products: Product[] }) {
    const reduceMotion = useReducedMotion();
    return (
        <section id="products" aria-label="Popular products">
            <div className="flex items-end justify-between gap-4 mb-5 sm:mb-7">
                <div>
                    <p className="text-xs uppercase tracking-widest font-bold text-[#c04753] mb-2">
                        Handpicked favourites
                    </p>
                    <h2 className="site-section-title">
                        Little things to love
                    </h2>
                    <p className="text-sm text-slate-500 mt-2">
                        Crochet creations our customers adore.
                    </p>
                </div>
                <Link
                    href="/products"
                    className="site-text-link text-sm inline-flex items-center gap-1.5 shrink-0"
                >
                    View all <ArrowRight size={17} />
                </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4 2xl:gap-7">
                {products.slice(0, 8).map((product, i) => (
                    <motion.div
                        key={product._id}
                        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.1 }}
                        transition={{
                            duration: 0.32,
                            delay: Math.min(i, 4) * 0.055,
                        }}
                        className="min-w-0 h-full"
                    >
                        <ProductCardClient product={product} />
                    </motion.div>
                ))}
            </div>
        </section>
    );
}