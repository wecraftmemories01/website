import Link from "next/link";
import Image from "next/image";
import { CookieSettingsButton } from "@/components/AnalyticsConsent";
import {
    Gift,
    HeartHandshake,
    Instagram,
    PackageCheck,
    Youtube,
} from "lucide-react";

interface FooterProps {
    containerClass?: string;
    footerPadding?: string;
}

function PinterestIcon({ size = 18 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            focusable="false"
        >
            <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.407.042-3.442.218-.937 1.408-5.965 1.408-5.965s-.359-.718-.359-1.779c0-1.666.966-2.91 2.168-2.91 1.022 0 1.516.767 1.516 1.687 0 1.027-.654 2.563-.992 3.986-.283 1.193.6 2.167 1.78 2.167 2.136 0 3.78-2.252 3.78-5.504 0-2.876-2.066-4.886-5.018-4.886-3.418 0-5.425 2.563-5.425 5.213 0 1.032.398 2.139.896 2.74.099.12.112.225.083.345-.09.379-.293 1.193-.334 1.36-.053.22-.174.267-.402.16-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.93-7.262 4.162 0 7.397 2.966 7.397 6.928 0 4.136-2.608 7.462-6.229 7.462-1.216 0-2.36-.632-2.752-1.378l-.748 2.853c-.27 1.043-1.002 2.349-1.493 3.147 1.124.347 2.319.534 3.558.534C18.627 24 24 18.627 24 12S18.627 0 12 0Z" />
        </svg>
    );
}

const socialLinkClass =
    "inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d2e7eb] bg-white/80 px-3.5 py-2 text-sm font-semibold text-[#065975] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#85bdcd] hover:bg-white hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#065975] motion-reduce:transform-none";

export default function Footer({
    containerClass = "w-full max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-12",
}: FooterProps) {
    return (
        <footer className="wcm-footer mt-16 border-t border-[#d8ebef] bg-[#ecf8f9] text-slate-800">
            <div
                className={`${containerClass} grid gap-10 py-12 sm:py-16 md:grid-cols-[1.5fr_1fr_1fr_1fr]`}
            >
                <div className="max-w-sm">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-3"
                        aria-label="We Craft Memories home"
                    >
                        <Image
                            src="/logo.png"
                            alt="We Craft Memories"
                            width={180}
                            height={92}
                            className="h-auto w-[170px] object-contain"
                        />
                    </Link>
                    <p className="mt-4 text-sm leading-7 text-slate-600">
                        Little things, made with love. Discover handmade crochet
                        gifts and thoughtful hampers for every occasion.
                    </p>
                    <div className="mt-5">
                        <h2 className="mb-3 text-sm font-bold text-[#065975]">
                            Follow our handmade journey
                        </h2>
                        <div
                            className="flex flex-wrap gap-2.5"
                            role="group"
                            aria-label="Social media channels"
                        >
                            <a
                                href="https://www.instagram.com/wecraftmemories01/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={socialLinkClass}
                                aria-label="We Craft Memories on Instagram (opens in a new tab)"
                            >
                                <Instagram size={18} aria-hidden="true" />{" "}
                                Instagram
                            </a>
                            <a
                                href="https://in.pinterest.com/wecraftmemories/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={socialLinkClass}
                                aria-label="We Craft Memories on Pinterest (opens in a new tab)"
                            >
                                <PinterestIcon /> Pinterest
                            </a>
                            <a
                                href="https://www.youtube.com/@WeCraftMemories"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={socialLinkClass}
                                aria-label="We Craft Memories on YouTube (opens in a new tab)"
                            >
                                <Youtube size={19} aria-hidden="true" /> YouTube
                            </a>
                        </div>
                    </div>
                </div>
                <div>
                    <h2 className="mb-4 text-sm font-bold tracking-wide">
                        Explore
                    </h2>
                    <ul className="space-y-3 text-sm text-slate-600">
                        <li>
                            <Link
                                className="hover:text-[#065975]"
                                href="/products"
                            >
                                All handmade gifts
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="hover:text-[#065975]"
                                href="/hampers"
                            >
                                Gift hampers
                            </Link>
                        </li>
                        <li>
                            <Link className="hover:text-[#065975]" href="/cart">
                                Your cart
                            </Link>
                        </li>
                    </ul>
                </div>
                <div>
                    <h2 className="mb-4 text-sm font-bold tracking-wide">
                        Need help?
                    </h2>
                    <ul className="space-y-3 text-sm text-slate-600">
                        <li>
                            <Link
                                className="hover:text-[#065975]"
                                href="/contact"
                            >
                                Contact us
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="hover:text-[#065975]"
                                href="/profile"
                            >
                                My account & orders
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="hover:text-[#065975]"
                                href="/privacy"
                            >
                                Privacy policy
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="hover:text-[#065975]"
                                href="/terms"
                            >
                                Terms & conditions
                            </Link>
                        </li>
                    </ul>
                </div>
                <div>
                    <h2 className="mb-4 text-sm font-bold tracking-wide">
                        Made for gifting
                    </h2>
                    <div className="space-y-4 text-sm text-slate-600">
                        <p className="flex items-center gap-3">
                            <HeartHandshake
                                size={19}
                                className="shrink-0 text-[#0d7892]"
                            />
                            Thoughtfully handcrafted
                        </p>
                        <p className="flex items-center gap-3">
                            <Gift
                                size={19}
                                className="shrink-0 text-[#0d7892]"
                            />
                            Gifts with a personal touch
                        </p>
                        <p className="flex items-center gap-3">
                            <PackageCheck
                                size={19}
                                className="shrink-0 text-[#0d7892]"
                            />
                            Carefully packed
                        </p>
                    </div>
                </div>
            </div>
            <div className="border-t border-[#d4e7ec]">
                <div
                    className={`${containerClass} flex flex-col items-center justify-between gap-2 py-5 text-xs text-slate-500 sm:flex-row`}
                >
                    <span>
                        © {new Date().getFullYear()} We Craft Memories. Made
                        with care.
                    </span>
                    <span className="inline-flex items-center gap-4">
                        <CookieSettingsButton /> Handmade joy, delivered to you.
                    </span>
                </div>
            </div>
        </footer>
    );
}