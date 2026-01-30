import { NextConfig } from "next";

const nextConfig: NextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    images: {
        remotePatterns: [
            // Local development
            {
                protocol: "http",
                hostname: "127.0.0.1",
                port: "3000",
                pathname: "/uploads/**",
            },

            // Production API
            {
                protocol: "https",
                hostname: "api.wecraftmemories.com",
                pathname: "/uploads/**",
            },
        ],
    },
};

export default nextConfig;