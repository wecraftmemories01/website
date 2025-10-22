'use client'

import React from 'react'
import { motion } from 'framer-motion'

export default function HeroClient() {
    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 p-10 text-white shadow-xl"
        >
            {/* Decorative gradient orbs */}
            <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-white/10 blur-3xl"></div>
            <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>

            <div className="relative max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                {/* Left content */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.7 }}
                >
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight drop-shadow-md">
                        Handmade Treasures,
                        <span className="block text-yellow-200">Cozy Memories.</span>
                    </h1>

                    <p className="mt-5 text-lg sm:text-xl text-white/90 max-w-lg">
                        Discover woolen gifts, playful accessories, and warm home accents — crafted to bring comfort and joy.
                    </p>

                    <div className="mt-8 flex gap-4 flex-wrap">
                        <motion.a
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.97 }}
                            href="#products"
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-300 to-yellow-500 text-teal-900 font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition"
                        >
                            ✨ Shop New Arrivals
                        </motion.a>

                        <motion.a
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.97 }}
                            href="#collections"
                            className="inline-flex items-center gap-2 border border-white/40 px-6 py-3 rounded-xl hover:bg-white/10 transition"
                        >
                            Browse Collections →
                        </motion.a>
                    </div>
                </motion.div>

                {/* Right content (logo/image) */}
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="hidden md:flex items-center justify-center"
                >
                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 4 }}
                        className="bg-white/10 rounded-2xl p-6 shadow-inner backdrop-blur-sm"
                    >
                        <img
                            src="/logo.png"
                            alt="logo"
                            className="max-w-[300px] object-contain drop-shadow-lg"
                        />
                    </motion.div>
                </motion.div>
            </div>
        </motion.section>
    )
}