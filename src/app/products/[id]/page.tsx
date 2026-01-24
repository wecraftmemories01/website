import React from "react";
import ProductClient from "../../../components/ProductDetails";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: productId } = await params;

    const apiBaseRaw = process.env.NEXT_PUBLIC_API_BASE;
    const API_BASE = apiBaseRaw ? String(apiBaseRaw).replace(/\/+$/, "") : "";

    const fallback =
        typeof process !== "undefined" && process.env.NODE_ENV === "development"
            ? "http://localhost:3000"
            : "";

    const url = API_BASE
        ? `${API_BASE}/product/sell/${encodeURIComponent(productId)}`
        : `${fallback}/product/sell/${encodeURIComponent(productId)}`;

    try {
        const res = await fetch(url, { cache: "no-store" });

        if (!res.ok) {
            if (res.status === 404) {
                // notFound();
                return <div className="p-8 text-center">Product not found ({res.status})</div>;
            }
            return (
                <div className="p-8 text-center text-red-600">
                    Failed to load product ({res.status})
                </div>
            );
        }

        const json = await res.json().catch(() => null);
        const productData = json?.productData ?? json?.data ?? null;

        if (!productData) {
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