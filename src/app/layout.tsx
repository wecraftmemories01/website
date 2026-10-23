import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import AnalyticsConsent from "@/components/AnalyticsConsent";
import AuthSessionKeeper from "@/components/AuthSessionKeeper";

import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import FavouritesInitializer from "@/components/ui/FavouritesInitializer";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "We Craft Memories | Handmade Crochet Gifts & Hampers",
    description: "Cute handmade crochet gifts and handcrafted decor.",
    manifest: "/manifest.json",
    icons: {
        icon: "/favicon.png",
        shortcut: "/favicon.png",
        apple: "/icons/icon-192.png",
    },
    other: {
        "color-scheme": "light",
    },
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
    themeColor: "#065975",
};

/** Wide but still comfortably padded shared storefront canvas. */
const CONTAINER =
    "w-full max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-12";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" data-theme="light">
            <head>
                <meta name="color-scheme" content="light" />
            </head>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
            >
                <AuthSessionKeeper />
                <PWAInstallPrompt />

                <FavouritesInitializer />

                {/* accessibility skip link */}
                <a
                    href="#content"
                    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-white px-3 py-2 rounded shadow"
                >
                    Skip to content
                </a>

                <div className="min-h-screen flex flex-col">
                    {/* pass the same container class so header, main and footer align */}
                    <Header containerClass={CONTAINER} headerHeight="h-14" />

                    <main id="content" className="flex-1">
                        <div className={`${CONTAINER} py-4 sm:py-6`}>
                            {children}
                        </div>
                    </main>

                    <Footer containerClass={CONTAINER} footerPadding="py-4" />
                </div>

                <Toaster
                    position="top-right"
                    toastOptions={{
                        style: {
                            borderRadius: "15px",
                            background: "#fff",
                            color: "#173b4a",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        },
                    }}
                />

                <AnalyticsConsent gaId={process.env.NEXT_PUBLIC_GA_ID} />

                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                        if ('serviceWorker' in navigator) {
                            window.addEventListener('load', function () {
                            navigator.serviceWorker.register('/sw.js');
                            });
                        }
                        `,
                    }}
                />
            </body>
        </html>
    );
}