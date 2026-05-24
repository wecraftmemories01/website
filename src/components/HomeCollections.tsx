'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, Variants } from 'framer-motion'
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

    const containerVariants: Variants = {
        hidden: {},
        visible: {
            transition: {
                staggerChildren: 0.08
            }
        }
    }

    const itemVariants: Variants = {
        hidden: {
            opacity: 0,
            y: 40,
            scale: 0.96
        },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1]
            }
        }
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
        <section className="relative max-w-7xl mx-auto px-4 py-14 overflow-hidden">

            {/* BACKGROUND GLOW */}
            <div className="absolute inset-0 -z-10 pointer-events-none">
                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-100/40 blur-3xl rounded-full" />
            </div>

            {/* HEADER */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1]
                }}
                className="flex items-center justify-between mb-7"
            >

                <div>

                    <p className="text-xs uppercase tracking-[0.22em] text-[#0B5C73] font-semibold mb-2">
                        Collections
                    </p>

                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                        Shop by Collection
                    </h2>

                    <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: 56 }}
                        viewport={{ once: true }}
                        transition={{
                            delay: 0.2,
                            duration: 0.5,
                            ease: [0.22, 1, 0.36, 1]
                        }}
                        className="mt-3 h-1 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full"
                    />

                </div>

                <motion.button
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => router.push('/products')}
                    className="
                        hidden sm:flex items-center gap-1.5
                        text-sm font-semibold text-slate-700
                        hover:text-black transition
                    "
                >
                    View all
                    <ArrowRight size={15} />
                </motion.button>

            </motion.div>

            {/* MOBILE */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="sm:hidden flex gap-4 overflow-x-auto no-scrollbar pb-2"
            >
                {themes.map((theme) => (
                    <motion.div
                        key={theme._id}
                        variants={itemVariants}
                        className="shrink-0"
                    >
                        <CollectionCard
                            theme={theme}
                            onClick={handleClick}
                            mobile
                        />
                    </motion.div>
                ))}
            </motion.div>

            {/* DESKTOP */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5"
            >
                {themes.slice(0, 6).map((theme) => (
                    <motion.div
                        key={theme._id}
                        variants={itemVariants}
                    >
                        <CollectionCard
                            theme={theme}
                            onClick={handleClick}
                        />
                    </motion.div>
                ))}
            </motion.div>

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
            whileHover={{
                y: -8,
                scale: 1.03
            }}
            whileTap={{
                scale: 0.98
            }}
            transition={{
                type: "spring",
                stiffness: 260,
                damping: 18
            }}
            onClick={() => onClick(theme._id)}
            className={`
                group cursor-pointer relative
                ${mobile ? 'min-w-[170px]' : ''}
            `}
        >

            {/* CARD GLOW */}
            <div className="
                absolute inset-0
                bg-cyan-200/20
                blur-2xl
                rounded-3xl
                scale-90
                opacity-0
                group-hover:opacity-100
                transition duration-500
            " />

            {/* IMAGE CARD */}
            <div className="
                relative overflow-hidden rounded-3xl
                aspect-[4/5]
                bg-slate-100
                border border-white/40
                shadow-[0_10px_30px_rgba(0,0,0,0.06)]
                backdrop-blur-xl
            ">

                {theme.image ? (
                    <Image
                        src={theme.image}
                        alt={name}
                        fill
                        className="
                            object-cover
                            transition-transform duration-700
                            group-hover:scale-110
                        "
                        sizes="300px"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-cyan-100 to-orange-100" />
                )}

                {/* DARK OVERLAY */}
                <div className="
                    absolute inset-0
                    bg-gradient-to-t
                    from-black/65
                    via-black/10
                    to-transparent
                " />

                {/* TOP SHINE */}
                <div className="
                    absolute inset-0
                    opacity-0 group-hover:opacity-100
                    transition duration-500
                    bg-gradient-to-br
                    from-white/30
                    via-transparent
                    to-transparent
                " />

                {/* CONTENT */}
                <div className="absolute bottom-0 left-0 right-0 p-4">

                    <div className="flex items-center justify-between gap-2">

                        <div>

                            <h3 className="
                                text-white text-sm sm:text-base
                                font-semibold
                                line-clamp-1
                            ">
                                {name}
                            </h3>

                            <p className="
                                text-white/70 text-xs mt-1
                            ">
                                Explore collection
                            </p>

                        </div>

                        {/* ARROW */}
                        <div className="
                            w-8 h-8 rounded-full
                            bg-white/15 backdrop-blur-md
                            border border-white/20
                            flex items-center justify-center
                            text-white
                            opacity-0 translate-x-2
                            group-hover:opacity-100
                            group-hover:translate-x-0
                            transition-all duration-300
                        ">
                            <ArrowRight size={15} />
                        </div>

                    </div>

                </div>

            </div>

        </motion.div>
    )
}