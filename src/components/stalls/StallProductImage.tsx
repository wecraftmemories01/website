"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Gift } from "lucide-react";
import { publicImageUrl } from "@/lib/publicImageUrl";

/** Match the working Products page: same URL normalizer, optimized Next Image,
 * object-contain fit, and a fallback on image-load failure. */
export default function StallProductImage({
    src,
    alt,
    sizes = "120px",
}: {
    src?: string | null;
    alt: string;
    sizes?: string;
}) {
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        setFailed(false);
    }, [src]);
    const url = publicImageUrl(src);
    return (
        <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_40%,#fffdf9_7%,#eefafc_72%,#dff1f6_100%)]">
            {url && !failed ? (
                <Image
                    src={url}
                    alt={alt}
                    fill
                    sizes={sizes}
                    className="object-contain p-2 transition-transform duration-500 group-hover:scale-[1.06] motion-reduce:transform-none"
                    onError={() => setFailed(true)}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center text-[#8ca6a0]">
                    <Gift
                        size={30}
                        strokeWidth={1.3}
                        aria-label="Image unavailable"
                    />
                </div>
            )}
        </div>
    );
}