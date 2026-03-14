import React from 'react'
import ProductCardClient from './ProductCardClient'
import type { Product } from '../types/product'

type Props = {
    products: Product[]
}

export default function ProductGrid({ products }: Props) {

    if (products.length === 0) {
        return (
            <div className="text-center py-16 text-slate-500">
                No products found
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
                <ProductCardClient
                    key={product._id}
                    product={product}
                />
            ))}
        </div>
    )
}