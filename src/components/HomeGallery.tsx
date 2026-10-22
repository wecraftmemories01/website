"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
    ArrowLeft,
    ArrowRight,
    Camera,
    ChevronLeft,
    ChevronRight,
    Maximize2,
    X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/** A future gallery API can supply this array without changing the presentation. */
export type GalleryImage = {
    id: string;
    src: string;
    alt: string;
    caption?: string;
};

const DEFAULT_PHOTOS: GalleryImage[] = Array.from({ length: 8 }, (_, i) => ({
    id: `stall-${i + 1}`,
    src: `/images/stall_nov_2025/stall-${i + 1}.jpeg`,
    alt: `We Craft Memories at an exhibition or pop-up stall, photo ${i + 1}`,
    caption: "A moment from our pop-ups and exhibitions",
}));

export default function HomeGallery({
    items = DEFAULT_PHOTOS,
}: {
    items?: GalleryImage[];
}) {
    const [expanded, setExpanded] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const reduceMotion = useReducedMotion();
    const photos = items.filter((item) => Boolean(item.id && item.src));
    const visible = expanded ? photos : photos.slice(0, 8);

    useEffect(() => {
        if (activeIndex === null) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setActiveIndex(null);
            if (event.key === "ArrowLeft")
                setActiveIndex((current) =>
                    current === null
                        ? null
                        : (current + photos.length - 1) % photos.length,
                );
            if (event.key === "ArrowRight")
                setActiveIndex((current) =>
                    current === null ? null : (current + 1) % photos.length,
                );
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", onKey);
        };
    }, [activeIndex, photos.length]);

    if (!photos.length) return null;

    return (
        <section aria-label="Our work photo gallery">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
                <div>
                    <span className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#c04753]">
                        <Camera size={16} /> In real life
                    </span>
                    <h2 className="site-section-title">
                        Our Work, Beyond the Screen
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-[#607368] sm:text-base">
                        Beautiful moments from exhibitions, markets and pop-ups.
                        Every photo tells part of our handmade journey.
                    </p>
                </div>
                <span className="rounded-full border border-[#dce9dd] bg-white px-4 py-2 text-xs font-bold text-[#52715c]">
                    {photos.length} photos
                </span>
            </div>
            <div className="grid auto-rows-[105px] grid-cols-2 gap-2.5 sm:auto-rows-[135px] sm:gap-4 md:auto-rows-[150px] md:grid-cols-4 xl:auto-rows-[178px]">
                {visible.map((photo, index) => (
                    <motion.button
                        type="button"
                        key={photo.id}
                        aria-label={`View gallery photo ${index + 1}: ${photo.alt}`}
                        onClick={() => setActiveIndex(index)}
                        initial={reduceMotion ? false : { opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{
                            duration: 0.35,
                            delay: Math.min(index, 5) * 0.035,
                        }}
                        className={`group relative min-w-0 overflow-hidden rounded-[17px] bg-[#e6ede3] text-left shadow-[0_6px_22px_rgba(20,50,33,.06)] transition-shadow hover:shadow-xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#065975] sm:rounded-[23px] ${index === 0 ? "col-span-2 row-span-2" : index === visible.length - 1 && visible.length === 8 ? "col-span-2 row-span-1" : "col-span-1 row-span-1"}`}
                    >
                        <Image
                            src={photo.src}
                            alt={photo.alt}
                            fill
                            sizes={
                                index === 0
                                    ? "(max-width: 767px) 100vw, 50vw"
                                    : "(max-width: 767px) 50vw, 25vw"
                            }
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.055] motion-reduce:transform-none"
                        />
                        <span
                            aria-hidden="true"
                            className="absolute inset-0 bg-gradient-to-t from-[#0d271f]/70 via-transparent to-transparent opacity-75 transition-opacity group-hover:opacity-100"
                        />
                        {index === 0 && (
                            <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#255744] sm:left-6 sm:top-6">
                                From our community
                            </span>
                        )}
                        <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 text-xs font-semibold text-white sm:p-5 sm:text-sm">
                            <span className="line-clamp-2">
                                {photo.caption || "Life at We Craft Memories"}
                            </span>
                            <Maximize2
                                size={17}
                                className="shrink-0 opacity-80"
                            />
                        </span>
                    </motion.button>
                ))}
            </div>
            {photos.length > 8 && (
                <div className="mt-6 flex justify-center">
                    <button
                        type="button"
                        onClick={() => setExpanded((value) => !value)}
                        className="site-button-outline !min-h-11"
                    >
                        {expanded
                            ? "Show fewer photos"
                            : `View all ${photos.length} photos`}{" "}
                        {expanded ? (
                            <ArrowLeft size={16} />
                        ) : (
                            <ArrowRight size={16} />
                        )}
                    </button>
                </div>
            )}
            <p className="mt-5 text-center text-xs font-medium text-[#6c8271]">
                Real stalls. Real craft. Real moments together.
            </p>
            <AnimatePresence>
                {activeIndex !== null && photos[activeIndex] && (
                    <motion.div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-[#081a15]/95 p-4 sm:p-8"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Gallery photo viewer"
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setActiveIndex(null)}
                    >
                        <button
                            type="button"
                            aria-label="Close photo"
                            autoFocus
                            onClick={() => setActiveIndex(null)}
                            className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"
                        >
                            <X size={23} />
                        </button>
                        {photos.length > 1 && (
                            <button
                                type="button"
                                aria-label="Previous photo"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setActiveIndex(
                                        (activeIndex + photos.length - 1) %
                                            photos.length,
                                    );
                                }}
                                className="absolute left-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30 sm:left-8"
                            >
                                <ChevronLeft size={25} />
                            </button>
                        )}
                        <div
                            className="relative h-[75dvh] w-full max-w-5xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <Image
                                src={photos[activeIndex].src}
                                alt={photos[activeIndex].alt}
                                fill
                                sizes="100vw"
                                className="object-contain"
                            />
                            <div className="absolute inset-x-0 bottom-0 translate-y-full pt-3 text-center text-sm text-white/90">
                                {photos[activeIndex].caption ||
                                    photos[activeIndex].alt}{" "}
                                · {activeIndex + 1} / {photos.length}
                            </div>
                        </div>
                        {photos.length > 1 && (
                            <button
                                type="button"
                                aria-label="Next photo"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setActiveIndex(
                                        (activeIndex + 1) % photos.length,
                                    );
                                }}
                                className="absolute right-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30 sm:right-8"
                            >
                                <ChevronRight size={25} />
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}