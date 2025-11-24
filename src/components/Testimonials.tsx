'use client'
import React, { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react'

type Testimonial = { id: number; name: string; text: string }

const sample: Testimonial[] = [
    { id: 1, name: 'Ananya', text: 'Love the quality — such cozy gifts!' },
    { id: 2, name: 'Rahul', text: 'Fast delivery and beautiful packaging.' },
    { id: 3, name: 'Priya', text: 'My kid adores the handcrafted toys.' },
    { id: 4, name: 'Deepa', text: 'Beautifully made — will buy again!' },
    { id: 5, name: 'Manish', text: 'Excellent customer support.' },
]

export default function TestimonialsPages({
    items = sample,
    interval = 4500,
}: {
    items?: Testimonial[]
    interval?: number
}) {
    // SSR-safe defaults (don't read window here)
    const [visible, setVisible] = useState<number>(1) // number of items per page (1 by default for SSR)
    const [isMounted, setIsMounted] = useState(false) // becomes true on client mount
    const [pageIndex, setPageIndex] = useState(0) // which page (0 .. pages-1)
    const [playing, setPlaying] = useState(true)
    const timeoutRef = useRef<number | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)

    // chunk items into pages depending on `visible`
    const getPages = (arr: Testimonial[], per: number) => {
        const pages: Testimonial[][] = []
        for (let i = 0; i < arr.length; i += per) pages.push(arr.slice(i, i + per))
        return pages
    }

    // Only measure window/decide visible on client after mount
    useEffect(() => {
        setIsMounted(true)
        const decide = () => setVisible(window.innerWidth >= 768 ? 2 : 1)
        decide()
        window.addEventListener('resize', decide)
        return () => window.removeEventListener('resize', decide)
        // run once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const pages = getPages(items, visible)
    const pagesCount = pages.length || 1

    // keep pageIndex valid when pagesCount changes (visible changed)
    useEffect(() => {
        if (pageIndex >= pagesCount) setPageIndex(Math.max(0, pagesCount - 1))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagesCount])

    // autoplay (only meaningful on client)
    useEffect(() => {
        if (!isMounted) return
        if (!playing) return
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
        timeoutRef.current = window.setTimeout(() => {
            setPageIndex((p) => (p + 1) % pagesCount)
        }, interval)
        return () => {
            if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
        }
    }, [pageIndex, playing, pagesCount, interval, isMounted])

    // pause on window blur/focus (client-only)
    useEffect(() => {
        if (!isMounted) return
        const onBlur = () => setPlaying(false)
        const onFocus = () => setPlaying(true)
        window.addEventListener('blur', onBlur)
        window.addEventListener('focus', onFocus)
        return () => {
            window.removeEventListener('blur', onBlur)
            window.removeEventListener('focus', onFocus)
        }
    }, [isMounted])

    // keyboard nav (client-only)
    useEffect(() => {
        if (!isMounted) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') prev()
            if (e.key === 'ArrowRight') next()
            if (e.key === ' ') setPlaying((p) => !p)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMounted, pageIndex, pagesCount])

    // touch swipe for pages (client-only)
    useEffect(() => {
        if (!isMounted) return
        let startX = 0
        let deltaX = 0
        const el = containerRef.current
        if (!el) return
        const onTouchStart = (e: TouchEvent) => {
            startX = e.touches[0].clientX
            deltaX = 0
        }
        const onTouchMove = (e: TouchEvent) => {
            deltaX = e.touches[0].clientX - startX
        }
        const onTouchEnd = () => {
            if (Math.abs(deltaX) > 50) {
                if (deltaX > 0) prev()
                else next()
            }
            startX = 0
            deltaX = 0
        }
        el.addEventListener('touchstart', onTouchStart)
        el.addEventListener('touchmove', onTouchMove)
        el.addEventListener('touchend', onTouchEnd)
        return () => {
            el.removeEventListener('touchstart', onTouchStart)
            el.removeEventListener('touchmove', onTouchMove)
            el.removeEventListener('touchend', onTouchEnd)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMounted, pagesCount])

    const prev = () => setPageIndex((p) => (p - 1 + pagesCount) % pagesCount)
    const next = () => setPageIndex((p) => (p + 1) % pagesCount)
    const goTo = (i: number) => setPageIndex(i % pagesCount)

    // width per page in percent (client-only used after mount)
    const pageWidthPercent = isMounted ? 100 / pagesCount : undefined

    return (
        <section
            id="testimonials"
            className="bg-gradient-to-b from-white to-slate-50 py-12"
            aria-label="Testimonials"
        >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-slate-800">
                            What Our Customers Say
                        </h3>
                        <p className="text-slate-600 mt-1">
                            Real experiences from people who love our handmade creations.
                        </p>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPlaying((p) => !p)}
                            aria-pressed={!playing}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-white shadow hover:shadow-md transition"
                            title={playing ? 'Pause autoplay' : 'Resume autoplay'}
                        >
                            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>

                        <button
                            onClick={prev}
                            className="p-2 rounded-full bg-white shadow hover:shadow-md transition"
                            aria-label="Previous testimonials"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>

                        <button
                            onClick={next}
                            className="p-2 rounded-full bg-white shadow hover:shadow-md transition"
                            aria-label="Next testimonials"
                        >
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Carousel viewport */}
                <div
                    ref={containerRef}
                    onMouseEnter={() => isMounted && setPlaying(false)}
                    onMouseLeave={() => isMounted && setPlaying(true)}
                    className="relative overflow-hidden rounded-2xl"
                >
                    {/* === SSR-safe fallback (renders same on server & initial client render) ===
              While not mounted we render a simple grid (no transforms) so server and client HTML match.
              After mount we render the interactive sliding carousel (which uses widths/transforms). */}
                    {!isMounted ? (
                        // SSR-safe static layout: show first two (or 1) items deterministically
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {items.slice(0, 2).map((t) => (
                                    <blockquote
                                        key={t.id}
                                        className="relative bg-white rounded-2xl shadow-md p-6"
                                    >
                                        <div className="absolute -top-4 left-6 bg-wecraft-primary text-white p-2 rounded-full shadow">
                                            <span className="sr-only">Quote</span>❝
                                        </div>

                                        <p className="text-base text-slate-700 italic leading-relaxed min-h-[64px]">
                                            “{t.text}”
                                        </p>

                                        <footer className="mt-4 flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-700">
                                                {t.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-wecraft-primary">
                                                    — {t.name}
                                                </div>
                                            </div>
                                        </footer>
                                    </blockquote>
                                ))}
                            </div>
                        </div>
                    ) : (
                        // Client-only interactive carousel (now safe because it only renders after mount)
                        <div
                            className="flex transition-transform duration-500"
                            style={{
                                width: `${pagesCount * 100}%`,
                                transform: `translateX(-${pageIndex * (pageWidthPercent ?? 100)}%)`,
                            }}
                            role="list"
                            aria-live={playing ? 'off' : 'polite'}
                        >
                            {pages.map((page, pi) => (
                                <div
                                    key={pi}
                                    className="flex-shrink-0 p-6"
                                    style={{ width: `${pageWidthPercent}%` }}
                                    role="group"
                                    aria-label={`Page ${pi + 1} of testimonials`}
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {page.map((t) => (
                                            <blockquote
                                                key={t.id}
                                                className="relative bg-white rounded-2xl shadow-md p-6 hover:shadow-xl transition transform hover:-translate-y-1"
                                            >
                                                <div className="absolute -top-4 left-6 bg-wecraft-primary text-white p-2 rounded-full shadow">
                                                    <span className="sr-only">Quote</span>❝
                                                </div>

                                                <p className="text-base text-slate-700 italic leading-relaxed min-h-[64px]">
                                                    “{t.text}”
                                                </p>

                                                <footer className="mt-4 flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-700">
                                                        {t.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-wecraft-primary">
                                                            — {t.name}
                                                        </div>
                                                    </div>
                                                </footer>
                                            </blockquote>
                                        ))}

                                        {page.length === 1 && <div className="hidden md:block" aria-hidden="true" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Dots */}
                    {/* We render dots both SSR and client; but pagesCount may be 1 on server. Dots are harmless. */}
                    <div className="mt-4 flex items-center justify-center gap-2">
                        {Array.from({ length: pagesCount }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => goTo(i)}
                                aria-label={`Go to testimonials page ${i + 1}`}
                                className={`h-2 w-8 rounded-full transition-all ${i === pageIndex ? 'bg-wecraft-primary scale-110' : 'bg-slate-300'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}