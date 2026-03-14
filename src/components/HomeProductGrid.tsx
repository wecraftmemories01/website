'use client'

import React, { useRef } from 'react'
import ProductCardClient from './ProductCardClient'
import type { Product } from '../types/product'
import { ChevronLeft, ChevronRight } from "lucide-react"

type Props = { products: Product[] }

export default function ProductGrid({ products }: Props) {

    const scrollRef = useRef<HTMLDivElement>(null)

    const scroll = (direction: "left" | "right") => {
        if (!scrollRef.current) return

        const scrollAmount = 260

        scrollRef.current.scrollBy({
            left: direction === "left" ? -scrollAmount : scrollAmount,
            behavior: "smooth"
        })
    }

    return (
        <section
            id="products"
            className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 pb-12"
        >

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold tracking-tight">
                    Popular Products
                </h2>

                <span className="text-xs text-slate-500">
                    {products.length} items
                </span>
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
                            className="
                                absolute left-0 top-1/2 -translate-y-1/2
                                z-20
                                bg-white/90 backdrop-blur
                                shadow-md border
                                rounded-full
                                w-9 h-9
                                flex items-center justify-center
                                active:scale-95
                            "
                        >
                            <ChevronLeft size={18} />
                        </button>

                        {/* RIGHT BUTTON */}
                        <button
                            onClick={() => scroll("right")}
                            className="
                                absolute right-0 top-1/2 -translate-y-1/2
                                z-20
                                bg-white/90 backdrop-blur
                                shadow-md border
                                rounded-full
                                w-9 h-9
                                flex items-center justify-center
                                active:scale-95
                            "
                        >
                            <ChevronRight size={18} />
                        </button>


                        {/* SCROLL AREA */}
                        <div
                            ref={scrollRef}
                            className="
                                flex
                                gap-4
                                overflow-x-auto
                                scroll-smooth
                                snap-x snap-mandatory
                                px-6
                                pb-4
                            "
                        >
                            {products.map((p) => (
                                <div
                                    key={p._id}
                                    className="
                                        snap-center
                                        shrink-0
                                        w-[80%]
                                        max-w-65
                                    "
                                >
                                    <ProductCardClient product={p} />
                                </div>
                            ))}
                        </div>

                    </div>


                    {/* DESKTOP GRID */}
                    <div
                        className="
                            hidden
                            sm:grid
                            grid-cols-3
                            md:grid-cols-4
                            lg:grid-cols-5
                            gap-5
                        "
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