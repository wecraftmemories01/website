'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

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
                const res = await fetch(`${API_BASE}/theme/top_themes`)
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
        return (
            <div className="py-10 text-center text-sm text-slate-500">
                Loading collections...
            </div>
        )
    }

    if (!themes.length) return null

    return (
        <section className="max-w-7xl mx-auto px-4 py-10">

            {/* HEADER */}
            <div className="flex items-center justify-between mb-6">

                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#0B5C73] font-medium mb-1">
                        Collections
                    </p>

                    <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">
                        Shop by Collection
                    </h2>
                </div>

                <button
                    onClick={() => router.push('/products')}
                    className="
                        hidden sm:flex items-center gap-1
                        text-sm font-medium text-slate-700
                        hover:text-black transition
                    "
                >
                    View all
                    <ArrowRight size={15} />
                </button>

            </div>

            {/* MOBILE */}
            <div className="sm:hidden flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {themes.map((theme) => (
                    <CollectionCard
                        key={theme._id}
                        theme={theme}
                        onClick={handleClick}
                        mobile
                    />
                ))}
            </div>

            {/* DESKTOP */}
            <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {themes.slice(0, 6).map((theme) => (
                    <CollectionCard
                        key={theme._id}
                        theme={theme}
                        onClick={handleClick}
                    />
                ))}
            </div>

        </section>
    )
}

/* -------------------------------------- */
/* CARD */
/* -------------------------------------- */

function CollectionCard({
    theme,
    onClick,
    mobile
}: {
    theme: Theme
    onClick: (id: string) => void
    mobile?: boolean
}) {
    const name = theme.publicName ?? theme.name ?? 'Collection'

    return (
        <motion.div
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
            onClick={() => onClick(theme._id)}
            className={`
                group cursor-pointer
                ${mobile ? 'min-w-[160px]' : ''}
            `}
        >

            {/* IMAGE */}
            <div className="
                relative overflow-hidden rounded-2xl
                aspect-[4/5]
                bg-slate-100
            ">

                {theme.image ? (
                    <Image
                        src={theme.image}
                        alt={name}
                        fill
                        className="
                            object-cover
                            transition-transform duration-500
                            group-hover:scale-105
                        "
                        sizes="300px"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1FA6B8]/10 to-[#F6B73C]/10" />
                )}

                {/* OVERLAY */}
                <div className="
                    absolute inset-0
                    bg-gradient-to-t from-black/50 to-transparent
                " />

                {/* TITLE */}
                <div className="absolute bottom-0 left-0 right-0 p-3">

                    <div className="flex items-center justify-between gap-2">

                        <h3 className="
                            text-white text-sm font-medium
                            line-clamp-1
                        ">
                            {name}
                        </h3>

                        <div className="
                            opacity-0 group-hover:opacity-100
                            transition
                            text-white
                        ">
                            <ArrowRight size={15} />
                        </div>

                    </div>

                </div>

            </div>

        </motion.div>
    )
}