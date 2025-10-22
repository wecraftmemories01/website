import React from 'react'
import ProductCardClient from './ProductCardClient'
import type { Product } from '../types/product'

type Props = { products: Product[] }

export default function ProductGrid({ products }: Props) {
    return (
        <section
            id="products"
            className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 pb-10"
        >
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold">Popular Products</h2>
                <div className="text-xs text-slate-600">
                    Showing {products.length} items
                </div>
            </div>

            {products.length === 0 ? (
                <div className="text-center text-slate-500 py-10">
                    No products available
                </div>
            ) : (
                <div
                    className="
                        grid 
                        grid-cols-2 
                        sm:grid-cols-3 
                        lg:grid-cols-5 
                        gap-3 
                        sm:gap-4 
                        lg:gap-5
                    "
                >
                    {products.map((p) => (
                        <div
                            key={p._id}
                            className="flex justify-center"
                        >
                            <div className="w-full max-w-[160px] sm:max-w-[180px] lg:max-w-[200px]">
                                <ProductCardClient product={p} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}