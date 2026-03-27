'use client'

import { useRouter } from "next/navigation"
import React, { useRef, useState, useEffect } from 'react'
import ProductCardClient from './ProductCardClient'
import type { Product } from '../types/product'
import { ChevronLeft, ChevronRight } from "lucide-react"

type Props = { products: Product[] }

export default function ProductGrid({ products }: Props) {

    const router = useRouter()

    const scrollRef = useRef<HTMLDivElement>(null)

    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(true)

    const scroll = (direction: "left" | "right") => {
        if (!scrollRef.current) return

        const scrollAmount = 260

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

    return (
        <section
            id="products"
            className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 pb-12"
        >

            {/* Header */}
            <div className="flex items-center justify-between mb-6 mt-6">

                {/* LEFT: Title + Subtitle */}
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                        Popular Picks
                    </h2>

                    <p className="text-sm text-gray-500 mt-1">
                        Handcrafted favorites loved by our customers
                    </p>

                    {/* Accent Line */}
                    <div className="mt-2 w-12 h-1 bg-teal-500 rounded-full" />
                </div>

                {/* RIGHT: CTA */}
                <button
                    onClick={() => router.push("/products")}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-700 transition"
                >
                    <span className="sm:hidden">All →</span>
                    <span className="hidden sm:inline">Explore All →</span>
                </button>

            </div>


            {products.length === 0 ? (
                <div className="text-center text-slate-500 py-10">
                    No products available
                </div>
            ) : (
                <>
                    {/* MOBILE CAROUSEL */}
                    <div className="relative sm:hidden">

                        {/* LEFT BUTTON */}
                        <button
                            onClick={() => scroll("left")}
                            disabled={!canScrollLeft}
                            className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 border rounded-full w-9 h-9 flex items-center justify-center
                            ${canScrollLeft ? "bg-white/90 backdrop-blur shadow-md active:scale-95" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                        >
                            <ChevronLeft size={18} />
                        </button>

                        {/* RIGHT BUTTON */}
                        <button
                            onClick={() => scroll("right")}
                            disabled={!canScrollRight}
                            className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 border rounded-full w-9 h-9 flex items-center justify-center
                            ${canScrollRight ? "bg-white/90 backdrop-blur shadow-md active:scale-95" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                        >
                            <ChevronRight size={18} />
                        </button>


                        {/* SCROLL AREA */}
                        <div
                            ref={scrollRef}
                            className=" flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory px-6 pb-4 "
                        >
                            {products.map((p) => (
                                <div
                                    key={p._id}
                                    className="snap-center shrink-0 w-[80%] max-w-65"
                                >
                                    <ProductCardClient product={p} />
                                </div>
                            ))}
                        </div>

                    </div>


                    {/* DESKTOP GRID */}
                    <div
                        className="hidden sm:grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5"
                    >
                        {products.map((p) => (
                            <ProductCardClient
                                key={p._id}
                                product={p}
                            />
                        ))}
                    </div>

                </>
            )}
        </section>
    )
}