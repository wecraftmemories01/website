'use client'

import React from 'react'
import { motion } from 'framer-motion'

export default function HeroClient() {
    return (
        <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="
                relative overflow-hidden rounded-3xl
                bg-gradient-to-r
                from-[#D7EDF3]
                via-[#E4F3F7]
                to-[#F1F5F6]
                text-[#0B5C73]
                shadow-md
                min-h-[320px] max-h-[420px]
            "
        >
            {/* Decorative blobs – minimal, non-distracting */}
            <div className="absolute -top-24 -left-24 w-56 h-56 bg-[#1FA6B8]/15 rounded-full blur-3xl" />
            <div className="absolute -bottom-28 -right-28 w-72 h-72 bg-[#1FA6B8]/08 rounded-full blur-3xl" />

            <div className="relative max-w-7xl mx-auto h-full px-6 sm:px-10 py-10 flex items-center">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center w-full">

                    {/* Left content */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">
                            Handmade Treasures,
                            <span className="block text-[#C95A66]">
                                Cozy Memories.
                            </span>
                        </h1>

                        <p className="mt-4 text-base sm:text-lg text-[#355F6B] max-w-md">
                            Woolen gifts, playful accessories & warm home accents — made with love.
                        </p>

                        <div className="mt-6 flex gap-4 flex-wrap">
                            <motion.a
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.97 }}
                                href="/products"
                                className="
                                    bg-[#C95A66] text-white
                                    font-semibold px-5 py-2.5
                                    rounded-xl shadow-sm
                                    hover:bg-[#B84C58]
                                    transition
                                "
                            >
                                ✨ Shop New Arrivals
                            </motion.a>

                            <motion.a
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.97 }}
                                href="/products"
                                className="
                                    border border-[#0B5C73]
                                    text-[#0B5C73]
                                    px-5 py-2.5 rounded-xl
                                    hover:bg-[#0B5C73]/10
                                    transition
                                "
                            >
                                Browse All →
                            </motion.a>
                        </div>
                    </motion.div>

                    {/* Right image */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.7 }}
                        className="relative hidden md:block h-full"
                    >
                        <img
                            src="/wecraftmemories-hero-premium.png"
                            alt="Handmade crochet creations"
                            className="
                                absolute right-[-25%] top-1/2 -translate-y-1/2
                                w-[150%] h-auto max-w-none
                            "
                        />
                    </motion.div>
                </div>
            </div>
        </motion.section>
    )
}