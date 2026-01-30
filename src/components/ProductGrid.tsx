import React from 'react'
import ProductCardClient from './ProductCardClient'
import type { Product } from '../types/product'

type Props = {
    products: Product[]
}

export default function ProductGrid({ products }: Props) {
    return (
        <section
            id="products"
            className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 pb-16"
        >
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Popular Products</h2>
                <div className="text-sm text-slate-600">
                    Showing {products.length} items
                </div>
            </div>

            {products.length === 0 ? (
                <div className="text-center text-slate-500 py-12">
                    No products available
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map((product) => (
                        <ProductCardClient
                            key={product._id}
                            product={product}
                        />
                    ))}
                </div>
            )}
        </section>
    )
}