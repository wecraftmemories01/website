'use client'

import React, { useEffect, useState } from 'react';
import HeroClient from '../components/HeroClient';
import HomeProductGrid from '../components/HomeProductGrid';
import HomeCollections from '../components/HomeCollections'
import Testimonials from '../components/Testimonials';
import HomeGallery from "@/components/HomeGallery";
import type { Product } from '../types/product';
import { fetchCartFromApi } from '@/lib/cart';

export default function HomePage() {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchCartFromApi();
    }, []);

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
                <section className="max-w-7xl mx-auto px-3 sm:px-3 lg:px-3 pl-2 pr-2 pt-2 pb-4">
                    <HeroClient />
                </section>

                {loading ? (
                    <div className="text-center py-12">Loading products...</div>
                ) : (
                    <HomeProductGrid products={products} />
                )}

                {/* <section className="max-w-7xl mx-auto px-3 sm:px-3 lg:px-3 pl-2 pr-2 pt-2 pb-2">
                    <HomeCollections />
                </section> */}

                <HomeGallery />

                <Testimonials />
            </main>
        </div>
    )
}