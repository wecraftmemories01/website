'use client'

import React from "react"
import { motion } from "framer-motion"
import Image from "next/image"

export default function HeroClient() {
    return (
        <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative overflow-hidden rounded-3xl bg-linear-to-r from-[#D7EDF3] via-[#EAF6FA] to-[#F5FAFB] shadow-md"
        >
            {/* soft glow background */}
            <div className="absolute -top-20 -left-20 w-44 h-44 bg-[#1FA6B8]/15 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-56 h-56 bg-[#1FA6B8]/10 rounded-full blur-3xl" />
            <div className="relative max-w-7xl mx-auto px-6 sm:px-10 py-10">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                    {/* TEXT CONTENT */}
                    <div className="text-center md:text-left">
                        <p className="text-sm font-medium text-[#0B5C73]/80 mb-2">
                            ✨ Handmade with Love
                        </p>

                        <h1 className="text-3xl sm:text-4xl md:text-[42px] font-extrabold text-[#0B5C73] leading-tight">
                            Cute Handmade Treasures
                        </h1>

                        <p className="mt-3 text-[#355F6B] text-base max-w-md mx-auto md:mx-0">
                            Adorable crochet creations crafted with love — perfect for
                            gifting or adding joy to your day.
                        </p>

                        {/* trust badges */}
                        <div className="mt-4 flex gap-4 flex-wrap text-sm text-[#355F6B] justify-center md:justify-start">
                            <span>🧶 Handmade</span>
                            <span>🎁 Perfect Gifts</span>
                            <span>🚚 Pan-India Delivery</span>
                        </div>

                        {/* CTA */}
                        <motion.a
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.97 }}
                            href="/products"
                            className="inline-block mt-6 bg-[#E24B5B] text-white font-semibold px-6 py-3 rounded-xl shadow hover:bg-[#d23f4e] transition"
                        >
                            🛍 Shop Cute Gifts
                        </motion.a>
                    </div>

                    {/* HERO IMAGE (hidden on mobile) */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="hidden md:flex justify-center md:justify-end"
                    >
                        <div className="w-full max-w-[720px]">
                            <Image
                                src="/wecraftmemories-hero-premium.png"
                                alt="Cute handmade crochet gifts"
                                width={720}
                                height={720}
                                priority
                                className="w-full h-auto object-contain"
                            />
                        </div>
                    </motion.div>
                </div>
            </div>
        </motion.section>
    )
}