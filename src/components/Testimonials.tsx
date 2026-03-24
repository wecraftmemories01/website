'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Pause, Play, Star } from 'lucide-react'
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
    const [pageIndex, setPageIndex] = useState(0)
    const [playing, setPlaying] = useState(true)
    const timeoutRef = useRef<number | null>(null)

    useEffect(() => {
        const update = () => setVisible(window.innerWidth >= 768 ? 2 : 1)
        update()
        window.addEventListener('resize', update)
        return () => window.removeEventListener('resize', update)
    }, [])

    const pages = []
    for (let i = 0; i < items.length; i += visible) {
        pages.push(items.slice(i, i + visible))
    }

    useEffect(() => {
        if (!playing) return
        timeoutRef.current && clearTimeout(timeoutRef.current)
        timeoutRef.current = window.setTimeout(() => {
            setPageIndex((p) => (p + 1) % pages.length)
        }, interval)
    }, [pageIndex, playing, pages.length])

    const prev = () => setPageIndex((p) => (p - 1 + pages.length) % pages.length)
    const next = () => setPageIndex((p) => (p + 1) % pages.length)

    return (
        <section className="py-16 bg-[radial-gradient(circle_at_top,_#E6F7F5,_white_60%,_#FFF4E6)]">
            <div className="max-w-6xl mx-auto px-4 relative">

                {/* soft glow background */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#1FA6B8]/10 blur-3xl rounded-full -z-10" />

                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B5C73]">
                        Loved by Families Across India ❤️
                    </h2>
                    <p className="mt-2 text-[#4B6B73]">
                        Real stories from happy customers.
                    </p>
                </div>

                {/* Trust */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="flex text-[#F6B73C]">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={16} fill="currentColor" strokeWidth={0} />
                        ))}
                    </div>
                    <span className="text-sm text-[#4B6B73]">
                        4.9 rating • 1000+ happy customers
                    </span>
                </div>

                {/* Controls */}
                <div className="flex gap-3 mb-8">
                    {[prev, next, () => setPlaying(p => !p)].map((fn, i) => (
                        <button
                            key={i}
                            onClick={fn}
                            className="h-11 w-11 rounded-full bg-white border border-[#0B5C73]/15 shadow-[0_6px_16px_rgba(11,92,115,0.12)] flex items-center justify-center text-[#0B5C73] hover:bg-[#0B5C73] hover:text-white hover:shadow-[0_10px_25px_rgba(11,92,115,0.25)] active:scale-95 transition-all"
                        >
                            {i === 0 && <ArrowLeft size={18} />}
                            {i === 1 && <ArrowRight size={18} />}
                            {i === 2 && (playing ? <Pause size={18} /> : <Play size={18} />)}
                        </button>
                    ))}
                </div>

                {/* Carousel */}
                <div className="overflow-hidden">
                    <div
                        className="flex transition-transform duration-500"
                        style={{
                            width: `${pages.length * 100}%`,
                            transform: `translateX(-${pageIndex * (100 / pages.length)}%)`
                        }}
                    >
                        {pages.map((page, i) => (
                            <div key={i} className="p-2" style={{ width: `${100 / pages.length}%` }}>
                                <div className="grid md:grid-cols-2 gap-6">

                                    {page.map((t) => (
                                        <div key={t.id} className="relative">

                                            <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-3xl bg-[#0B5C73]/5" />

                                            <div className="relative p-6 rounded-3xl bg-white border border-[#0B5C73]/10 shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_50px_rgba(11,92,115,0.15)] transition-all duration-300 hover:-translate-y-1">

                                                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#1FA6B8]/5 to-[#F6B73C]/5 pointer-events-none" />

                                                <span className="absolute top-3 left-4 text-4xl text-[#1FA6B8]/15 font-serif">“</span>

                                                {t.tag && (
                                                    <span className="absolute -top-3 right-4 text-[11px] px-3 py-1 rounded-full bg-white border border-[#0B5C73]/10 shadow text-[#0B5C73] font-medium">
                                                        {t.tag}
                                                    </span>
                                                )}

                                                <p className="text-[15px] leading-relaxed text-[#3F5F66] mt-6">
                                                    {t.text}
                                                </p>

                                                <div className="mt-5 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-[#1FA6B8]/20 flex items-center justify-center font-semibold text-[#0B5C73]">
                                                            {t.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-[#0B5C73]">{t.name}</div>
                                                            <div className="text-xs text-gray-500">Verified Buyer</div>
                                                        </div>
                                                    </div>

                                                    <div className="flex text-[#F6B73C]">
                                                        {Array.from({ length: t.rating ?? 5 }).map((_, i) => (
                                                            <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
                                                        ))}
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    ))}

                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="mt-12 flex justify-center relative">
                    <div className="absolute w-60 h-16 bg-[#0B5C73]/20 blur-2xl rounded-full" />
                    <button className="relative px-10 py-3 rounded-full bg-[#0B5C73] text-white font-semibold shadow-[0_10px_25px_rgba(11,92,115,0.25)] hover:bg-[#094B5C] hover:shadow-[0_15px_35px_rgba(11,92,115,0.35)] hover:scale-105 active:scale-95 transition-all duration-300">
                        🎁 Gift Something Handmade & Meaningful
                    </button>
                </div>

            </div>
        </section>
    )
}