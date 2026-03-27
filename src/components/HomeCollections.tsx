'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'

type Theme = {
    _id: string
    publicName?: string
    name?: string
    image?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE

export default function HomeCollections() {
    const router = useRouter()
    const [themes, setThemes] = useState<Theme[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchThemes = async () => {
            try {
                const res = await fetch(`${API_BASE}/theme`)
                const data = await res.json()

                if (data?.themeData) {
                    setThemes(data.themeData)
                }
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        fetchThemes()
    }, [])

    const handleClick = (id: string) => {
        router.push(`/products?theme=${id}`)
    }

    if (loading) {
        return <div className="py-10 text-center">Loading...</div>
    }

    if (!themes.length) return null

    const featured = themes[0]
    const rest = themes.slice(1, 7)

    return (
        <section className="max-w-7xl mx-auto px-4 py-8">

            {/* HEADER */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    Shop by Collection
                </h2>

                <button
                    onClick={() => router.push('/products')}
                    className="text-sm text-[#0B5C73] font-medium hover:underline"
                >
                    View all →
                </button>
            </div>

            {/* MOBILE → SCROLL */}
            <div className="flex gap-4 overflow-x-auto no-scrollbar sm:hidden">
                {themes.map((t) => (
                    <Card key={t._id} theme={t} onClick={handleClick} />
                ))}
            </div>

            {/* DESKTOP → PREMIUM GRID */}
            <div className="hidden sm:grid grid-cols-3 gap-5">

                {/* FEATURED BIG CARD */}
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="col-span-2 row-span-2 cursor-pointer"
                    onClick={() => handleClick(featured._id)}
                >
                    <div className="relative h-full rounded-3xl overflow-hidden shadow-lg">

                        {featured.image ? (
                            <Image
                                src={featured.image}
                                alt={featured.publicName || featured.name || 'Collection'}
                                fill
                                priority
                                className="object-cover"
                                sizes="(max-width: 1024px) 100vw, 66vw"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1FA6B8]/20 to-[#F6B73C]/20 text-4xl">
                                🌼
                            </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                        <div className="absolute bottom-0 p-6 text-white">
                            <h3 className="text-2xl font-bold">
                                {featured.publicName || featured.name}
                            </h3>
                            <p className="text-sm opacity-90 mt-1">
                                Explore this collection →
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* SMALL CARDS */}
                {rest.map((t) => (
                    <Card key={t._id} theme={t} onClick={handleClick} small />
                ))}
            </div>
        </section>
    )
}

/* ---------------- CARD COMPONENT ---------------- */

function Card({
    theme,
    onClick,
    small
}: {
    theme: Theme
    onClick: (id: string) => void
    small?: boolean
}) {
    const name = theme.publicName ?? theme.name ?? 'Collection'

    return (
        <motion.div
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -5 }}
            className={`cursor-pointer ${small ? '' : 'min-w-[160px]'}`}
            onClick={() => onClick(theme._id)}
        >
            <div className={`
                relative overflow-hidden rounded-2xl
                ${small ? 'h-[180px]' : 'aspect-[4/5]'}
                shadow-md hover:shadow-xl transition
            `}>

                {/* IMAGE */}
                {theme.image ? (
                    <Image
                        src={theme.image}
                        alt={name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 40vw, (max-width: 1024px) 25vw, 200px"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1FA6B8]/20 to-[#F6B73C]/20 text-3xl">
                        🌼
                    </div>
                )}

                {/* OVERLAY */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* TEXT */}
                <div className="absolute bottom-0 p-3 text-white">
                    <p className="text-sm font-semibold">
                        {name}
                    </p>
                </div>

            </div>
        </motion.div>
    )
}