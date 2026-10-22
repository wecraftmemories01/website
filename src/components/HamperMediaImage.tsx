"use client";

import { useState } from "react";
import Image from "next/image";
import { Gift } from "lucide-react";
import { resolveHamperImageUrl } from "@/lib/hamperDisplay";

type Props = {
    src?: string | null;
    alt: string;
    sizes: string;
    className?: string;
    iconSize?: number;
};

/**
 * Normalizes uploaded API paths and displays a deliberate fallback for images
 * which are missing or which fail to load (instead of a broken-image symbol).
 * Keep Next.js image optimization ON, as on the working product pages.
 * Direct browser image requests from the website (e.g. localhost:3002) to
 * the API (localhost:3000) can be blocked by Helmet's default
 * Cross-Origin-Resource-Policy: same-origin response header.
 * Next's image optimizer fetches the image server-side instead.
 */
export default function HamperMediaImage({
    src,
    alt,
    sizes,
    className = "object-cover",
    iconSize = 40,
}: Props) {
    const imageUrl = resolveHamperImageUrl(src);
    const [failedUrl, setFailedUrl] = useState<string | null>(null);

    if (!imageUrl || failedUrl === imageUrl) {
        return (
            <span
                className="absolute inset-0 flex items-center justify-center bg-[#e6f7f9] text-[#065975]"
                role="img"
                aria-label={alt}
            >
                <Gift size={iconSize} aria-hidden="true" />
            </span>
        );
    }

    return (
        <Image
            src={imageUrl}
            alt={alt}
            fill
            sizes={sizes}
            className={className}
            onError={() => setFailedUrl(imageUrl)}
        />
    );
}