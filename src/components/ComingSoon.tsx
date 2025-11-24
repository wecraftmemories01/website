"use client";

import React from "react";
import { motion } from "framer-motion";

export default function ComingSoonSimple(): React.ReactElement {
    return (
        <main className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-6xl bg-white/90 backdrop-blur-md shadow-xl border border-slate-200 rounded-3xl overflow-hidden"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 p-8 md:p-14 w-full">

                    {/* LEFT SIDE - Brand + Message */}
                    <section className="flex flex-col justify-center space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 text-white grid place-items-center text-2xl font-bold shadow-md">
                                W
                            </div>
                            <div>
                                <h1 className="text-3xl font-semibold text-slate-900">
                                    WeCraftMemories
                                </h1>
                                <p className="text-sm text-slate-600">
                                    Handmade kids' clothing — rent & buy
                                </p>
                            </div>
                        </div>

                        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-snug">
                            This page will be available soon
                        </h2>

                        <p className="text-slate-600 text-base leading-relaxed">
                            We’re still working on this section. Thank you for your patience!
                            Feel free to browse the main collection or explore our updates meanwhile.
                        </p>

                        <ul className="text-slate-700 space-y-1 text-sm">
                            <li>• Follow our Instagram for updates & new outfits</li>
                            <li>• Browse the main clothing collection (rent & buy)</li>
                            <li>• Contact us for custom requests</li>
                        </ul>
                    </section>

                    {/* RIGHT SIDE - Nice illustration block */}
                    <section className="rounded-2xl bg-slate-50/60 border border-slate-200 shadow-inner p-10 flex items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4 }}
                            className="text-center"
                        >
                            <h3 className="text-2xl font-semibold text-slate-800 mb-3">
                                Coming Soon
                            </h3>
                            <p className="text-slate-600 max-w-sm mx-auto">
                                We're putting final touches on this page to make it perfect.
                                It will be available shortly.
                            </p>
                        </motion.div>
                    </section>
                </div>
            </motion.div>
        </main>
    );
}