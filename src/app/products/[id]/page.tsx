import React from "react";
import ProductClient from "../../../components/ProductDetails";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic"; // ensure server fetch each request (change if you want caching)

type SalePrice = { discountedPrice?: number; actualPrice?: number };
type ProductAttribute = { attributeId: string; attributePublicName: string; value: string };
type ProductImage = { imageId?: string; imagePath?: string; title?: string };

type Product = {
    _id: string;
    productName: string;
    productImage?: string;
    shortDescription?: string;
    longDescription?: string;
    isAvailableForSale?: boolean;
    sellStockQuantity?: string;
    productAttributes?: ProductAttribute[];
    productImages?: ProductImage[];
    subCategoryPublicName?: string;
    genderPublicName?: string;
    themePublicName?: string;
    editionPublicName?: string;
    categoryPublicName?: string;
    superCategoryPublicName?: string;
    masterCategoryPublicName?: string;
    salePrice?: SalePrice | null;
};

interface Props {
    params: { id: string };
}

export default async function Page({ params }: Props) {
    const productId = params.id;

    const apiBaseRaw = process.env.NEXT_PUBLIC_API_BASE;
    const API_BASE = apiBaseRaw ? String(apiBaseRaw).replace(/\/+$/, "") : "";

    // fallback: only use localhost when running locally and you know the dev server is there
    const fallback = typeof process !== "undefined" && process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : "";

    const url = API_BASE
        ? `${API_BASE}/product/sell/${encodeURIComponent(productId)}`
        : `${fallback}/product/sell/${encodeURIComponent(productId)}`;

    try {
        const res = await fetch(url, { cache: "no-store" }); // choose caching strategy
        if (!res.ok) {
            // if 404, prefer Next's notFound() (shows 404 page) — uncomment if desired
            if (res.status === 404) {
                // return notFound();
                return <div className="p-8 text-center">Product not found ({res.status})</div>;
            }
            return (
                <div className="p-8 text-center text-red-600">Failed to load product ({res.status})</div>
            );
        }

        const json = await res.json().catch(() => null);
        const productData: Product | null = json?.productData ?? json?.data ?? null;

        if (!productData) {
            // If you prefer a 404, call notFound() here instead of returning a div
            // notFound();
            return <div className="p-8 text-center">Product not found</div>;
        }

        return <ProductClient product={productData} />;
    } catch (err) {
        console.error("Product fetch error:", err);
        return (
            <div className="p-8 text-center text-red-600">
                Could not load product (network error)
            </div>
        );
    }
}