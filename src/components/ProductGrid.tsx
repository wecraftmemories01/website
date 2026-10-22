import React from "react";
import ProductCardClient from "./ProductCardClient";
import type { Product } from "../types/product";

type Props = {
    products: Product[];
    sidebarOpen?: boolean;
};

function ProductGrid({ products, sidebarOpen = false }: Props) {
    if (products.length === 0) {
        return (
            <div className="text-center py-16 text-slate-500">
                No products found
            </div>
        );
    }

    return (
        <div
            className={`site-reveal grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 ${sidebarOpen ? "lg:grid-cols-3 2xl:grid-cols-4" : "lg:grid-cols-4 2xl:grid-cols-5"}`}
        >
            {products.map((product) => (
                <ProductCardClient key={product._id} product={product} />
            ))}
        </div>
    );
}

export default React.memo(ProductGrid);