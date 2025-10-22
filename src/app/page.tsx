'use client'

import React, { useEffect, useState } from 'react'
import HeroClient from '../components/HeroClient'
import HomeProductGrid from '../components/HomeProductGrid'
import Testimonials from '../components/Testimonials'
import type { Product } from '../types/product'

export default function HomePage() {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const API_BASE = process.env.NEXT_PUBLIC_API_BASE
                const res = await fetch(`${API_BASE}/product/sell/top_products`)
                const data = await res.json()
                if (data.ack === 'success' && Array.isArray(data.productData)) {
                    setProducts(data.productData)
                }
            } catch (err) {
                console.error('Failed to fetch products:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchProducts()
    }, [])

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 text-slate-900">
            <main className="flex-1">
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <HeroClient />
                </section>

                {loading ? (
                    <div className="text-center py-12">Loading products...</div>
                ) : (
                    <HomeProductGrid products={products} />
                )}

                <Testimonials />
            </main>
        </div>
    )
}