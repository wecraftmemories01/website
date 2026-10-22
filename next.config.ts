import type { NextConfig } from "next";

type RemotePattern = NonNullable<
    NonNullable<NextConfig["images"]>["remotePatterns"]
>[number];

const remotePatterns: RemotePattern[] = [
    // Local API: website is normally localhost:3002 and API localhost:3000.
    {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/uploads/**",
    },
    {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "3000",
        pathname: "/uploads/**",
    },
    // Existing production image host.
    {
        protocol: "http",
        hostname: "api.wecraftmemories.com",
        pathname: "/uploads/**",
    },
    {
        protocol: "https",
        hostname: "api.wecraftmemories.com",
        pathname: "/uploads/**",
    },
];

// The API domain can vary by environment; allow its exact upload path without
// opening image optimization to arbitrary third-party hosts.
for (const envUrl of [
    process.env.NEXT_PUBLIC_API_BASE,
    process.env.NEXT_PUBLIC_HAMPER_IMAGE_ORIGIN,
]) {
    if (!envUrl || !/^https?:\/\//i.test(envUrl)) continue;
    try {
        const parsed = new URL(envUrl);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
            continue;
        if (parsed.username || parsed.password) continue;
        const candidate: RemotePattern = {
            protocol: parsed.protocol === "https:" ? "https" : "http",
            hostname: parsed.hostname,
            port: parsed.port || undefined,
            pathname: "/uploads/**",
        };
        if (
            !remotePatterns.some(
                (p) =>
                    p.protocol === candidate.protocol &&
                    p.hostname === candidate.hostname &&
                    (p.port || "") === (candidate.port || ""),
            )
        ) {
            remotePatterns.push(candidate);
        }
    } catch {
        /* Ignore invalid optional environment values. */
    }
}

const nextConfig: NextConfig = {
    images: {
        remotePatterns,
        // Needed for the Next image optimizer to fetch localhost API images in dev.
        // Keep local-IP access disabled in production.
        dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
    },
};

export default nextConfig;