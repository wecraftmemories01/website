import { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            // Local development
            {
                protocol: "http",
                hostname: "localhost",
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

        // REQUIRED for localhost images
        dangerouslyAllowLocalIP: true,
    },
};

export default nextConfig;