import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import StallDetailClient from "@/components/stalls/StallDetailClient";
import { fetchPublicStall, formatStallRange } from "@/lib/stalls";
import { publicImageUrl } from "@/lib/publicImageUrl";

/** Kept as [stallId] so existing Next routes continue to work. It now accepts slugs. */
type RouteProps = {
    params: Promise<{ stallId: string }>;
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};
const SITE_ORIGIN = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://wecraftmemories.com"
).replace(/\/+$/, "");

export async function generateMetadata({
    params,
}: RouteProps): Promise<Metadata> {
    const { stallId } = await params;
    let stall;
    try {
        stall = await fetchPublicStall(stallId);
    } catch {
        return {
            title: "Stall Details | We Craft Memories",
            robots: { index: false, follow: true },
        };
    }

    const slug = stall.slug || stallId;
    const canonicalUrl = `${SITE_ORIGIN}/stalls/${encodeURIComponent(slug)}`;
    const title = `${stall.name} | Visit We Craft Memories`;
    const description = [
        `Visit We Craft Memories at ${stall.name}`,
        stall.locationName || stall.address,
        formatStallRange(stall),
        "Explore handmade gifts, directions and daily opening hours.",
    ]
        .filter(Boolean)
        .join(" · ");

    const image = publicImageUrl(stall.products[0]?.image);

    return {
        title,
        description,
        alternates: { canonical: canonicalUrl },
        openGraph: {
            type: "website",
            title,
            description,
            url: canonicalUrl,
            siteName: "We Craft Memories",
            ...(image ? { images: [{ url: image }] } : {}),
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            ...(image ? { images: [image] } : {}),
        },
    };
}

export default async function StallDetailPage({
    params,
    searchParams,
}: RouteProps) {
    const { stallId } = await params;
    // Old /stalls/<Mongo ID> links remain valid, but resolve permanently to a
    // human-readable URL to consolidate analytics and search ranking signals.
    if (/^[a-f0-9]{24}$/i.test(stallId)) {
        let canonicalSlug: string | null = null;
        try {
            const stall = await fetchPublicStall(stallId);
            canonicalSlug = stall.slug;
        } catch {
            // Keep the existing retry UI if the API is temporarily unavailable.
        }
        if (canonicalSlug && canonicalSlug !== stallId) {
            // Keep campaign attribution on old links that used ?utm_source=... etc.
            const incoming = (await searchParams) || {};
            const query = new URLSearchParams();
            for (const [key, value] of Object.entries(incoming)) {
                if (Array.isArray(value))
                    value.forEach((item) => query.append(key, item));
                else if (typeof value === "string") query.append(key, value);
            }
            const suffix = query.toString();
            permanentRedirect(
                `/stalls/${encodeURIComponent(canonicalSlug)}${suffix ? `?${suffix}` : ""}`,
            );
        }
    }
    return <StallDetailClient stallId={stallId} />;
}