"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const photos = [
    {
        src: "/images/stall_nov_2025/stall-1.jpeg",
        alt: "Customers visiting our crochet products stall",
    },
    {
        src: "/images/stall_nov_2025/stall-2.jpeg",
        alt: "Customers visiting our crochet products stall",
    },
    {
        src: "/images/stall_nov_2025/stall-3.jpeg",
        alt: "Customers visiting our crochet products stall",
    },
    {
        src: "/images/stall_nov_2025/stall-4.jpeg",
        alt: "Customers visiting our crochet products stall",
    },
    {
        src: "/images/stall_nov_2025/stall-5.jpeg",
        alt: "Customers visiting our crochet products stall",
    },
    {
        src: "/images/stall_nov_2025/stall-6.jpeg",
        alt: "Customers visiting our crochet products stall",
    },
    {
        src: "/images/stall_nov_2025/stall-7.jpeg",
        alt: "Customers visiting our crochet products stall",
    },
    {
        src: "/images/stall_nov_2025/stall-8.jpeg",
        alt: "Customers visiting our crochet products stall",
    },
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
                    <p className="mt-3 text-neutral-600 max-w-2xl mx-auto">
                        A glimpse of our presence at exhibitions, local markets, and pop-up stalls — where our handmade creations meet real people ❤️.
                    </p>
                </div>

                {/* Photo Grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {photos.map((photo, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.05 }}
                            viewport={{ once: true }}
                            className="group relative overflow-hidden rounded-2xl bg-white shadow-sm"
                        >
                            <div className="relative aspect-square">
                                <Image
                                    src={photo.src}
                                    alt={photo.alt}
                                    fill
                                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                                />
                            </div>

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                <p className="p-3 text-sm text-white">
                                    {photo.alt}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Trust Note */}
                <div className="mt-10 text-center">
                    <p className="text-sm text-neutral-500">
                        ✔ 100% genuine • ✔ Offline presence • ✔ Handmade products
                    </p>
                </div>
            </div>
        </section>
    );
}