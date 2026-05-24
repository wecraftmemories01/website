'use client'

import { useRouter } from "next/navigation"
import React, { useRef, useState, useEffect } from 'react'
import { motion, Variants } from 'framer-motion'
import ProductCardClient from './ProductCardClient'
import type { Product } from '../types/product'
import { ChevronLeft, ChevronRight } from "lucide-react"

type Props = {
    products: Product[]
}

export default function ProductGrid({ products }: Props) {

    const router = useRouter()

    const scrollRef = useRef<HTMLDivElement>(null)

    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(true)

    const scroll = (direction: "left" | "right") => {
        if (!scrollRef.current) return

        const scrollAmount = 280

        scrollRef.current.scrollBy({
            left: direction === "left" ? -scrollAmount : scrollAmount,
            behavior: "smooth"
        })
    }

    const updateScrollButtons = () => {
        const el = scrollRef.current
        if (!el) return

        const { scrollLeft, scrollWidth, clientWidth } = el

        setCanScrollLeft(scrollLeft > 5)
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5)
    }

    useEffect(() => {
        const el = scrollRef.current
        if (!el) return

        updateScrollButtons()

        el.addEventListener("scroll", updateScrollButtons)
        window.addEventListener("resize", updateScrollButtons)

        return () => {
            el.removeEventListener("scroll", updateScrollButtons)
            window.removeEventListener("resize", updateScrollButtons)
        }
    }, [])

    const containerVariants: Variants = {
        hidden: {},
        visible: {
            transition: {
                staggerChildren: 0.08
            }
        }
    }

    const itemVariants: Variants = {
        hidden: {
            opacity: 0,
            y: 40,
            scale: 0.95
        },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1]
            }
        }
    }

    return (
        <section
            id="products"
            className="relative max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 pb-14 overflow-hidden"
        >

            {/* BACKGROUND GLOW */}
            <div className="absolute inset-0 -z-10 pointer-events-none">
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-teal-100/40 blur-3xl rounded-full" />
            </div>

            {/* HEADER */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1]
                }}
                className="flex items-center justify-between mb-7 mt-6"
            >

                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                        Popular Picks
                    </h2>

                    <p className="text-sm text-gray-500 mt-1">
                        Handcrafted favorites loved by our customers
                    </p>

                    <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: 48 }}
                        viewport={{ once: true }}
                        transition={{
                            delay: 0.2,
                            duration: 0.5,
                            ease: [0.22, 1, 0.36, 1]
                        }}
                        className="mt-2 h-1 bg-teal-500 rounded-full"
                    />
                </div>

                <motion.button
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => router.push("/products")}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-700 transition"
                >
                    <span className="sm:hidden">All →</span>
                    <span className="hidden sm:inline">Explore All →</span>
                </motion.button>

            </motion.div>

            {products.length === 0 ? (
                <div className="text-center text-slate-500 py-10">
                    No products available
                </div>
            ) : (
                <>
                    {/* MOBILE CAROUSEL */}
                    <div className="relative sm:hidden">

                        {/* LEFT BUTTON */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            whileHover={{ scale: 1.08 }}
                            onClick={() => scroll("left")}
                            disabled={!canScrollLeft}
                            className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 border rounded-full w-10 h-10 flex items-center justify-center transition-all duration-300
                            ${canScrollLeft
                                    ? "bg-white/90 backdrop-blur-md shadow-lg"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                }`}
                        >
                            <ChevronLeft size={18} />
                        </motion.button>

                        {/* RIGHT BUTTON */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            whileHover={{ scale: 1.08 }}
                            onClick={() => scroll("right")}
                            disabled={!canScrollRight}
                            className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 border rounded-full w-10 h-10 flex items-center justify-center transition-all duration-300
                            ${canScrollRight
                                    ? "bg-white/90 backdrop-blur-md shadow-lg"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                }`}
                        >
                            <ChevronRight size={18} />
                        </motion.button>

                        {/* SCROLL AREA */}
                        <motion.div
                            ref={scrollRef}
                            variants={containerVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory px-6 pb-5 pt-1 no-scrollbar"
                        >
                            {products.map((p) => (
                                <motion.div
                                    key={p._id}
                                    variants={itemVariants}
                                    whileHover={{
                                        y: -6,
                                        scale: 1.02
                                    }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 260,
                                        damping: 18
                                    }}
                                    className="snap-center shrink-0 w-[80%] max-w-[260px]"
                                >
                                    <div className="relative">

                                        {/* GLOW */}
                                        <div className="absolute inset-0 bg-teal-200/20 blur-2xl rounded-3xl scale-90" />

                                        <div className="relative">
                                            <ProductCardClient product={p} />
                                        </div>

                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>

                    </div>

                    {/* DESKTOP GRID */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="hidden sm:grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5"
                    >
                        {products.map((p) => (
                            <motion.div
                                key={p._id}
                                variants={itemVariants}
                                whileHover={{
                                    y: -8,
                                    scale: 1.03
                                }}
                                transition={{
                                    type: "spring",
                                    stiffness: 260,
                                    damping: 18
                                }}
                            >
                                <div className="relative">

                                    {/* HOVER GLOW */}
                                    <div className="absolute inset-0 bg-teal-200/20 blur-2xl rounded-3xl scale-90 opacity-0 hover:opacity-100 transition duration-300" />

                                    <div className="relative">
                                        <ProductCardClient
                                            product={p}
                                        />
                                    </div>

                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                </>
            )}
        </section>
    )
}