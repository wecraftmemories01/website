'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react'
import Link from "next/link";

type Testimonial = {
    id: number
    name: string
    text: string
    rating?: number
    tag?: string
}

const sample: Testimonial[] = [
    { id: 1, name: 'Arathi Kamicheril', text: 'All the products are super cute and beautifully crafted. The lion, giraffe, rainbow and heart were all super adorable. My daughter’s personal favourite was the giraffe who has now become her new best friend and has to go with her everywhere she goes. Thank you! The delivery was quick as well. 💛', rating: 5, tag: 'Gifting' },
    { id: 2, name: 'Sanjana Patlekar Raut', text: 'Bought white daisy flower keychain.Cute, durable, and just what I needed. Perfect little detail for my keys!🔥🥰', rating: 5, tag: 'Gifting' },
    { id: 3, name: 'Trushna Supriya Mahesh Bhoir', text: 'U should definitely get stuff from them it\'s worth the order like I loved them a lot also the way they assist us is really well will surely order stuff in future 😃 ✨. The flowers i got were sooooo pretty better then my expectations 😍', rating: 5, tag: 'Gifting' },
    { id: 4, name: 'Ishita', text: 'Bought this flower pot, really liked it amazing, beautiful', rating: 5, tag: 'Home Decor' },
    { id: 5, name: 'Poonam Laheri', text: 'Absolutely in love with this crochet sunflower and rose! 🌻💛 The craftsmanship is stunning—each petal and stitch feels like it was made with care and creativity. 💡 The sunflower brings such a sunny, joyful vibe ☀️, while the rose adds a touch of elegance and charm 💃. Together, they make a beautiful duo that brightens up any space 🌞. I’m genuinely impressed by the quality and detail 👏. It’s not just a product—it’s a little piece of art 🎨. Highly recommend to anyone who appreciates handmade beauty 💯.', rating: 5, tag: 'Gifting' },
    { id: 6, name: 'Shailesh N Bangera', text: 'I ordered a gift from WeCraftMemories and was truly impressed! Beautiful craftsmanship, timely delivery, and heartfelt attention to detail made it extra special.', rating: 5, tag: 'Gifting' },
    { id: 7, name: 'Ranjitha Prashanth', text: 'I ordered sunflower, it was neat finish with an affordable price, the immediate response.', rating: 5, tag: 'Gifting' },
    { id: 8, name: 'Kartik Umredkar', text: 'Lovely🥰 gift for loved one, my greatest choice ever', rating: 5, tag: 'Gifting' },
    { id: 9, name: 'Tanushree Gupta', text: 'Excellent product 😍😍 loved it🤌🫂', rating: 5, tag: 'Gifting' },
    { id: 10, name: 'Priyanka Lad', text: 'I ordered a sunflower pot from them, it\'s a really amazing product and one more thing is appreciated that they provided me on very Short notice in less than 24 hours. It\'s really appreciated...keep it up guys. All the best 😍', rating: 5, tag: 'Gifting' },
    { id: 11, name: 'Pragya', text: 'I ordered a sunflower from them and it’s very pretty,thank you for such a cute sunflower it made my day.', rating: 5, tag: 'Gifting' },
    { id: 12, name: 'Dency Silva', text: 'I just an product from this page. It’s so cute and handcrafted!❤️ The price is also very affordable to buy !! Thankyou Wecraftmemories ❤️🙌', rating: 5, tag: 'Gifting' },
    { id: 13, name: 'Ashish Jayswal', text: 'Just ordered the daisy with bud! 🌼 The product is very good and beautifully crafted. Love the designs! 💕🙌 thank you so much Wecraftmemories✨💐', rating: 5, tag: 'Gifting' },
    { id: 14, name: 'Mayuri Ranim', text: 'Absolutely adorable #WeCraftMemories.. I love these beautiful crafed woolen red rose. the quality of the wool is excellent—soft to touch and durable..for the quality and beauty it offers, the price is very reasonable. Totally worth it!"', rating: 5, tag: 'Gifting' },
]

export default function TestimonialsPages({
    items = sample,
    interval = 4500,
}: {
    items?: Testimonial[]
    interval?: number
}) {
    const [visible, setVisible] = useState(1)
    const [isMounted, setIsMounted] = useState(false)
    const [pageIndex, setPageIndex] = useState(0)
    const [playing, setPlaying] = useState(true)
    const timeoutRef = useRef<number | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)

    const getPages = (arr: Testimonial[], per: number) => {
        const pages: Testimonial[][] = []
        for (let i = 0; i < arr.length; i += per) pages.push(arr.slice(i, i + per))
        return pages
    }

    useEffect(() => {
        setIsMounted(true)
        const decide = () => setVisible(window.innerWidth >= 768 ? 2 : 1)
        decide()
        window.addEventListener('resize', decide)
        return () => window.removeEventListener('resize', decide)
    }, [])

    const pages = getPages(items, visible)
    const pagesCount = pages.length || 1

    useEffect(() => {
        if (pageIndex >= pagesCount) setPageIndex(0)
    }, [pagesCount, pageIndex])

    useEffect(() => {
        if (!isMounted || !playing) return
        timeoutRef.current && window.clearTimeout(timeoutRef.current)
        timeoutRef.current = window.setTimeout(
            () => setPageIndex((p) => (p + 1) % pagesCount),
            interval
        )
        return () => {
            if (timeoutRef.current) {
                window.clearTimeout(timeoutRef.current)
            }
        }
    }, [pageIndex, playing, pagesCount, interval, isMounted])

    const prev = () => setPageIndex((p) => (p - 1 + pagesCount) % pagesCount)
    const next = () => setPageIndex((p) => (p + 1) % pagesCount)
    const goTo = (i: number) => setPageIndex(i)

    const pageWidth = isMounted ? 100 / pagesCount : 100

    return (
        <section className="py-16 bg-gradient-to-b from-white to-slate-50">
            <div className="max-w-6xl mx-auto px-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
                    <div>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800">
                            Loved by Families Across India ❤️
                        </h2>
                        <p className="mt-2 text-slate-600 max-w-xl">
                            Real stories from customers who chose handcrafted comfort for their loved ones.
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            Testimonials sourced from our <Link href="https://www.instagram.com/wecraftmemories01/" target="_blank">Instagram</Link> community
                        </p>
                    </div>

                    <div className="flex items-center gap-2 relative z-20">
                        {/* Play / Pause */}
                        <button
                            type="button"
                            onClick={() => setPlaying((p) => !p)}
                            className="h-10 w-10 rounded-full bg-white/80 backdrop-blur shadow-md
               flex items-center justify-center
               hover:scale-110 transition"
                            aria-label={playing ? 'Pause autoplay' : 'Play autoplay'}
                        >
                            {playing ? <Pause size={18} /> : <Play size={18} />}
                        </button>

                        {/* Previous */}
                        <button
                            type="button"
                            onClick={prev}
                            className="h-10 w-10 rounded-full bg-white shadow-md
               flex items-center justify-center
               hover:scale-110 transition"
                            aria-label="Previous testimonials"
                        >
                            <ArrowLeft size={18} />
                        </button>

                        {/* Next */}
                        <button
                            type="button"
                            onClick={next}
                            className="h-10 w-10 rounded-full bg-white shadow-md
               flex items-center justify-center
               hover:scale-110 transition"
                            aria-label="Next testimonials"
                        >
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </div>

                {/* Carousel */}
                <div
                    ref={containerRef}
                    onMouseEnter={() => setPlaying(false)}
                    onMouseLeave={() => setPlaying(true)}
                    className="overflow-hidden rounded-3xl"
                >
                    <div
                        className="flex transition-transform duration-500"
                        style={{
                            width: `${pagesCount * 100}%`,
                            transform: `translateX(-${pageIndex * pageWidth}%)`,
                        }}
                    >
                        {pages.map((page, pi) => (
                            <div key={pi} className="p-4 shrink-0" style={{ width: `${pageWidth}%` }}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {page.map((t) => (
                                        <blockquote
                                            key={t.id}
                                            className="relative p-7 rounded-3xl bg-gradient-to-br from-white to-slate-50
                      shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 animate-fadeIn"
                                        >
                                            <span className="absolute -top-6 -left-2 text-7xl text-wecraft-primary/20 select-none">
                                                “
                                            </span>

                                            {/* {t.tag && (
                                                <span className="inline-block mb-3 text-xs px-3 py-1 rounded-full bg-wecraft-primary/10 text-wecraft-primary">
                                                    {t.tag}
                                                </span>
                                            )} */}

                                            <p className="text-lg italic text-slate-700 leading-relaxed min-h-[72px]">
                                                {t.text}
                                            </p>

                                            <footer className="mt-6 flex items-center gap-4">
                                                <div className="h-11 w-11 rounded-full bg-wecraft-primary/10 flex items-center justify-center font-semibold text-wecraft-primary">
                                                    {t.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-800">{t.name}</div>
                                                    <div className="flex items-center gap-1 text-yellow-400 text-sm">
                                                        {'★'.repeat(t.rating ?? 5)}
                                                        <span className="ml-2 text-xs text-slate-500">Verified Buyer</span>
                                                    </div>
                                                </div>
                                            </footer>
                                        </blockquote>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Dots */}
                <div className="flex justify-center mt-6 gap-2">
                    {Array.from({ length: pagesCount }).map((_, i) => (
                        <button
                            type="button"
                            key={i}
                            onClick={() => goTo(i)}
                            className={`h-2.5 rounded-full transition-all duration-300 ${i === pageIndex
                                ? 'w-10 bg-wecraft-primary shadow-[0_0_0_4px_rgba(0,0,0,0.06)]'
                                : 'w-3 bg-slate-300 hover:bg-slate-400'
                                }`}
                        />
                    ))}
                </div>

                {/* CTA */}
                <div className="text-center mt-10">
                    <button className="px-8 py-3 rounded-full bg-wecraft-primary text-black font-medium shadow-lg hover:shadow-xl hover:scale-105 transition">
                        Join 1000+ Happy Customers
                    </button>
                </div>
            </div>
        </section>
    )
}
