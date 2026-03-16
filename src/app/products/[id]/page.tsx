import React from "react";
import ProductClient from "../../../components/ProductDetails";

export const dynamic = "force-dynamic";

async function fetchProduct(productId: string) {
    const apiBaseRaw = process.env.NEXT_PUBLIC_API_BASE;
    const API_BASE = apiBaseRaw ? String(apiBaseRaw).replace(/\/+$/, "") : "";

    const fallback =
        typeof process !== "undefined" && process.env.NODE_ENV === "development"
            ? "http://localhost:3000"
            : "";

    const url = API_BASE
        ? `${API_BASE}/product/sell/${encodeURIComponent(productId)}`
        : `${fallback}/product/sell/${encodeURIComponent(productId)}`;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) return null;

    const json = await res.json().catch(() => null);
    return json?.productData ?? json?.data ?? null;
}

/* SEO metadata */
export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const product = await fetchProduct(id);

    if (!product) {
        return {
            title: "Product | WeCraftMemories",
        };
    }

    const productName =
        product?.name ||
        product?.title ||
        product?.productName ||
        "Handmade Crochet Gift";

    return {
        title: `${productName} | Handmade Crochet Gift – WeCraftMemories`,
        description:
            product?.shortDescription ||
            `Buy ${productName} from WeCraftMemories. Discover adorable handmade crochet toys and handcrafted gifts.`,
    };
}

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: productId } = await params;

    const productData = await fetchProduct(productId);

    if (!productData) {
        return <div className="p-8 text-center">Product not found</div>;
    }

    return <ProductClient product={productData} />;
}