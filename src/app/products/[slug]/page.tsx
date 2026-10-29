import React from "react";
import { notFound } from "next/navigation";
import ProductClient from "../../../components/ProductDetails";
import { publicImageUrl } from "@/lib/publicImageUrl";

export const dynamic = "force-dynamic";

const SITE_ORIGIN = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://wecraftmemories.com"
).replace(/\/+$/, "");

async function fetchProduct(value: string) {
    const API_BASE =
        process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") || "";

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(value);

    const url = isObjectId
        ? `${API_BASE}/product/sell/${value}`
        : `${API_BASE}/product/sell/slug/${encodeURIComponent(value)}`;

    try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return null;
        const json = await res.json();
        return json?.productData || null;
    } catch (error) {
        console.error("Unable to fetch product", error);
        return null;
    }
}

/* SEO metadata */
export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const product = await fetchProduct(slug);

    if (!product) {
        return {
            title: "Product | WeCraftMemories",
            description: "Handmade crochet products by WeCraftMemories",
        };
    }

    const canonicalUrl =
        product.seoCanonicalUrl ||
        `${SITE_ORIGIN}/products/${encodeURIComponent(product.seoSlug || slug)}`;
    const image = publicImageUrl(product.productImage);

    return {
        title: product.seoMetaTitle || product.productName,

        description: product.seoMetaDescription || product.shortDescription,

        alternates: { canonical: canonicalUrl },

        openGraph: {
            url: canonicalUrl,
            siteName: "We Craft Memories",
            title: product.seoMetaTitle || product.productName,

            description: product.seoMetaDescription || product.shortDescription,

            images: image ? [{ url: image }] : [],

            type: "website",
        },

        twitter: {
            card: "summary_large_image",
            title: product.seoMetaTitle || product.productName,

            description: product.seoMetaDescription || product.shortDescription,

            images: image ? [{ url: image }] : [],
        },
    };
}

export default async function Page({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const productData = await fetchProduct(slug);

    if (!productData) notFound();

    const canonicalUrl =
        productData.seoCanonicalUrl ||
        `${SITE_ORIGIN}/products/${encodeURIComponent(productData.seoSlug || slug)}`;
    const productImage = publicImageUrl(productData.productImage);

    const productSchema = {
        "@context": "https://schema.org",
        "@type": "Product",

        name: productData.productName,

        image: productImage ? [productImage] : [],

        description: productData.shortDescription,

        sku: String(productData.productNumber),

        brand: {
            "@type": "Brand",
            name: "WeCraftMemories",
        },

        offers: {
            "@type": "Offer",

            price:
                productData.salePrice?.discountedPrice ??
                productData.salePrice?.actualPrice,

            priceCurrency: "INR",

            availability:
                productData.sellStockQuantity > 0
                    ? "https://schema.org/InStock"
                    : "https://schema.org/OutOfStock",

            url: canonicalUrl,
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(productSchema).replace(
                        /</g,
                        "\\u003c",
                    ),
                }}
            />

            <ProductClient product={productData} />
        </>
    );
}