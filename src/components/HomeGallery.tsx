"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const photos = [
    { src: "/images/stall_nov_2025/stall-1.jpeg", alt: "Customers visiting our crochet products stall" },
    { src: "/images/stall_nov_2025/stall-2.jpeg", alt: "Customers visiting our crochet products stall" },
    { src: "/images/stall_nov_2025/stall-3.jpeg", alt: "Customers visiting our crochet products stall" },
    { src: "/images/stall_nov_2025/stall-4.jpeg", alt: "Customers visiting our crochet products stall" },
    { src: "/images/stall_nov_2025/stall-5.jpeg", alt: "Customers visiting our crochet products stall" },
    { src: "/images/stall_nov_2025/stall-6.jpeg", alt: "Customers visiting our crochet products stall" },
    { src: "/images/stall_nov_2025/stall-7.jpeg", alt: "Customers visiting our crochet products stall" },
    { src: "/images/stall_nov_2025/stall-8.jpeg", alt: "Customers visiting our crochet products stall" },
];

export default function HomeStallGallery() {
    return (
        <section className="w-full bg-neutral-50 py-16">
            <div className="mx-auto max-w-7xl px-4">
                {/* Heading */}
                <div className="mb-10 text-center">
                    <h2 className="text-3xl font-bold text-neutral-900 sm:text-4xl">
                        Our Work, Beyond the Screen
                    </h2>
                    <p className="mt-3 max-w-2xl mx-auto text-neutral-600">
                        A glimpse of our presence at exhibitions, local markets, and pop-up stalls.
                    </p>
                </div>

                {/* Photo Grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {photos.map((photo, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 12 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: index * 0.04 }}
                            viewport={{ once: true }}
                            className="group relative overflow-hidden rounded-2xl bg-white shadow-sm"
                        >
                            {/* Image wrapper */}
                            <div className="relative aspect-[3/4] p-2">
                                <Image
                                    src={photo.src}
                                    alt={photo.alt}
                                    fill
                                    className="object-cover object-top rounded-xl transition-transform duration-300 ease-out group-hover:scale-95"
                                />
                            </div>

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 flex items-end rounded-2xl bg-gradient-to-t from-black/50 via-black/0 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                <p className="p-3 text-xs text-white">
                                    {photo.alt}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Trust Note */}
                <div className="mt-10 text-center">
                    <p className="text-sm text-neutral-500">
                        ✔ Offline exhibitions • ✔ Real customers • ✔ Handmade products
                    </p>
                </div>
            </div>
        </section>
    );
}