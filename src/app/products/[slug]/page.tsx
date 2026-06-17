import React from "react";
import ProductClient from "../../../components/ProductDetails";

export const dynamic = "force-dynamic";

async function fetchProduct(value: string) {
    const API_BASE =
        process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") || "";

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(value);

    const url = isObjectId
        ? `${API_BASE}/product/sell/${value}`
        : `${API_BASE}/product/sell/slug/${encodeURIComponent(value)}`;

    const res = await fetch(url, {
        cache: "no-store",
    });

    if (!res.ok) return null;

    const json = await res.json();

    return json?.productData || null;
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

    return {
        title:
            product.seoMetaTitle ||
            product.productName,

        description:
            product.seoMetaDescription ||
            product.shortDescription,

        alternates: {
            canonical:
                product.seoCanonicalUrl ||
                `https://www.wecraftmemories.com/products/${slug}`,
        },

        openGraph: {
            title:
                product.seoMetaTitle ||
                product.productName,

            description:
                product.seoMetaDescription ||
                product.shortDescription,

            images: product.productImage
                ? [product.productImage]
                : [],

            type: "website",
        },

        twitter: {
            card: "summary_large_image",
            title:
                product.seoMetaTitle ||
                product.productName,

            description:
                product.seoMetaDescription ||
                product.shortDescription,

            images: product.productImage
                ? [product.productImage]
                : [],
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

    if (!productData) {
        return (
            <div className="p-8 text-center">
                Product not found
            </div>
        );
    }

    const productSchema = {
        "@context": "https://schema.org",
        "@type": "Product",

        name: productData.productName,

        image: productData.productImage
            ? [productData.productImage]
            : [],

        description:
            productData.shortDescription,

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

            url:
                productData.seoCanonicalUrl ||
                `https://www.wecraftmemories.com/products/${slug}`,
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(productSchema),
                }}
            />

            <ProductClient product={productData} />
        </>
    );
}