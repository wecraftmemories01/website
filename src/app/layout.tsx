import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { GoogleAnalytics } from '@next/third-parties/google'

import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import PWAInstallPrompt from "@/components/PWAInstallPrompt"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Welcome to :: We Craft Memories ::",
    description: "Cute handmade crochet gifts and handcrafted decor.",
    manifest: "/manifest.json",
    icons: {
        icon: "/favicon.png",
        shortcut: "/favicon.png",
        apple: "/apple-touch-icon.png",
    },
};

export const viewport = {
    themeColor: "#0B5C73",
};

/**
 * Container preset (Balanced)
 * - max-w-7xl ≈ 1280px
 * - responsive paddings
 */
const CONTAINER = "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900`}>
                
                <PWAInstallPrompt />

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

                    <main id="content" className="flex-1 overflow-auto">
                        <div className={`${CONTAINER} py-4`}>{children}</div>
                    </main>

                    <Footer containerClass={CONTAINER} footerPadding="py-4" />
                </div>

                <Toaster
                    position="top-right"
                    toastOptions={{
                        style: {
                            borderRadius: "8px",
                            background: "#fff",
                            color: "#333",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        },
                    }}
                />

                <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID as string} />

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