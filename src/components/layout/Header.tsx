"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
    ArrowRight,
    Gift,
    Menu,
    Search,
    ShoppingBag,
    UserRound,
    X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { fetchCartCountUtil } from "@/lib/cartCount";
import { getStoredAccessToken, logout } from "@/lib/auth";
import DeliveryPincodeInput from "@/components/DeliveryPincodeInput";

interface HeaderProps {
    containerClass?: string;
    headerHeight?: string;
}
const links = [
    { label: "Home", href: "/" },
    { label: "Shop all", href: "/products" },
    { label: "Gift hampers", href: "/hampers" },
    { label: "Our stalls", href: "/stalls" },
    { label: "Contact", href: "/contact" },
];

export default function Header({
    containerClass = "w-full max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-12",
}: HeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchId = useId();
    const reduceMotion = useReducedMotion();
    const searchRef = useRef<HTMLInputElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [cartCount, setCartCount] = useState(0);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        setReady(true);
        let active = true;
        const sync = () => {
            setIsAuthenticated(Boolean(getStoredAccessToken()));
            setCartCount(Number(localStorage.getItem("cartCount") || 0));
            void fetchCartCountUtil().then((count) => {
                if (active) setCartCount(count);
            });
        };
        sync();
        window.addEventListener("cartChanged", sync);
        window.addEventListener("authChanged", sync);
        window.addEventListener("storage", sync);
        return () => {
            active = false;
            window.removeEventListener("cartChanged", sync);
            window.removeEventListener("authChanged", sync);
            window.removeEventListener("storage", sync);
        };
    }, []);

    useEffect(() => {
        setMenuOpen(false);
        setSearchOpen(false);
    }, [pathname]);
    useEffect(() => {
        if (!menuOpen) return;
        const oldOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const escape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setMenuOpen(false);
        };
        window.addEventListener("keydown", escape);
        return () => {
            document.body.style.overflow = oldOverflow;
            window.removeEventListener("keydown", escape);
            menuButtonRef.current?.focus();
        };
    }, [menuOpen]);
    // Close an open mobile drawer when resizing into desktop navigation.
    useEffect(() => {
        const desktop = window.matchMedia("(min-width: 1100px)");
        const onBreakpointChange = () => {
            if (desktop.matches) setMenuOpen(false);
        };
        desktop.addEventListener("change", onBreakpointChange);
        return () => desktop.removeEventListener("change", onBreakpointChange);
    }, []);
    useEffect(() => {
        if (searchOpen) searchRef.current?.focus();
    }, [searchOpen]);

    function doSearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        router.push(
            query.trim()
                ? `/products?q=${encodeURIComponent(query.trim())}`
                : "/products",
        );
        setSearchOpen(false);
        setMenuOpen(false);
    }

    const navLink = (label: string, href: string, mobile = false) => (
        <Link
            key={href}
            href={href}
            onClick={() => setMenuOpen(false)}
            aria-current={
                pathname === href ||
                (href !== "/" && pathname.startsWith(href + "/"))
                    ? "page"
                    : undefined
            }
            className={`${mobile ? "flex items-center justify-between rounded-2xl px-4 py-4 text-base" : "px-3 py-2.5 text-sm"} font-semibold transition-colors rounded-xl ${pathname === href || (href !== "/" && pathname.startsWith(href + "/")) ? "bg-[#e3f5f8] text-[#086c87]" : "text-slate-700 hover:text-[#086c87] hover:bg-[#eef9fa]"}`}
        >
            {label}
            {mobile && <ArrowRight size={17} aria-hidden />}
        </Link>
    );

    return (
        <>
            <div className="wcm-announcement text-white text-center text-[11px] sm:text-xs tracking-wide px-3 py-2.5">
                <span className="text-[#ffcb35]" aria-hidden="true">
                    ✦
                </span>{" "}
                Handmade with love <span className="mx-2 opacity-60">•</span>{" "}
                Gifts as unique as your memories{" "}
                <span className="text-[#ffcb35]" aria-hidden="true">
                    ✦
                </span>
            </div>
            <header className="wcm-header sticky top-0 z-50 border-b border-[#e0edf0] bg-white/95 backdrop-blur-xl">
                <div className={containerClass}>
                    <div className="flex min-h-[68px] lg:min-h-[82px] items-center gap-2 sm:gap-5">
                        {/* Hide the whole wrapper: `.site-icon-button` sets its own
                            display in globals.css, overriding Tailwind's `hidden`. */}
                        <div className="shrink-0 min-[1100px]:hidden">
                            <button
                                ref={menuButtonRef}
                                type="button"
                                className="site-icon-button"
                                aria-label="Open menu"
                                aria-expanded={menuOpen}
                                aria-controls="mobile-store-menu"
                                onClick={() => setMenuOpen(true)}
                            >
                                <Menu size={23} />
                            </button>
                        </div>
                        <Link
                            href="/"
                            className="shrink-0 flex items-center gap-2 sm:gap-3 group"
                            aria-label="We Craft Memories, home"
                        >
                            <Image
                                src="/logo.png"
                                alt="We Craft Memories"
                                width={170}
                                height={87}
                                className="h-auto max-h-[70px] w-[88px] min-[350px]:w-[100px] min-[390px]:w-[122px] sm:w-[145px] lg:w-[165px] object-contain"
                                priority
                            />
                        </Link>
                        <nav
                            aria-label="Main navigation"
                            className="hidden min-[1100px]:flex items-center gap-1 ml-4"
                        >
                            {links.map((link) =>
                                navLink(link.label, link.href),
                            )}
                        </nav>
                        <div className="ml-auto flex items-center gap-1 sm:gap-2">
                            <button
                                className="site-icon-button"
                                aria-label="Search products"
                                aria-expanded={searchOpen}
                                aria-controls="site-search-panel"
                                onClick={() => setSearchOpen((v) => !v)}
                                type="button"
                            >
                                <Search size={21} />
                            </button>
                            <div className="hidden xl:block px-2">
                                <DeliveryPincodeInput />
                            </div>
                            <Link
                                href="/cart"
                                aria-label={`Shopping cart, ${cartCount} items`}
                                className="site-icon-button relative"
                            >
                                <ShoppingBag size={22} />
                                {ready && cartCount > 0 && (
                                    <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-[#ce3b49] text-white text-[10px] font-bold grid place-items-center">
                                        {cartCount > 99 ? "99+" : cartCount}
                                    </span>
                                )}
                            </Link>
                            <Link
                                href={
                                    ready && isAuthenticated
                                        ? "/profile"
                                        : "/login"
                                }
                                className="site-icon-button"
                                aria-label={
                                    ready && isAuthenticated
                                        ? "My account"
                                        : "Sign in"
                                }
                            >
                                <UserRound size={21} />
                            </Link>
                            {ready && isAuthenticated && (
                                <button
                                    className="hidden md:inline-flex site-text-link text-xs"
                                    type="button"
                                    onClick={() => void logout("/")}
                                >
                                    Sign out
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                <AnimatePresence initial={false}>
                    {searchOpen && (
                        <motion.div
                            id="site-search-panel"
                            initial={
                                reduceMotion ? false : { height: 0, opacity: 0 }
                            }
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-slate-100 bg-white"
                        >
                            <form
                                className={`${containerClass} flex items-center gap-3 py-3`}
                                onSubmit={doSearch}
                                role="search"
                            >
                                <label className="sr-only" htmlFor={searchId}>
                                    Search products
                                </label>
                                <Search
                                    className="text-slate-400 shrink-0"
                                    size={19}
                                />
                                <input
                                    id={searchId}
                                    ref={searchRef}
                                    type="search"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Try sunflower, crochet, gifts…"
                                    className="min-w-0 grow py-2.5 outline-none text-sm"
                                />
                                <button
                                    type="submit"
                                    className="site-button-primary !min-h-10 !px-5"
                                >
                                    Search
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSearchOpen(false)}
                                    aria-label="Close search"
                                    className="site-icon-button"
                                >
                                    <X size={19} />
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>
            <AnimatePresence>
                {menuOpen && (
                    <div
                        className="fixed inset-0 z-[100] min-[1100px]:hidden"
                        id="mobile-store-menu"
                    >
                        <motion.button
                            type="button"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-[#0c3241]/55"
                            aria-label="Close menu"
                            onClick={() => setMenuOpen(false)}
                        />
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-label="Navigation menu"
                            initial={reduceMotion ? false : { x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "tween", duration: 0.23 }}
                            className="relative h-full w-[min(88vw,360px)] bg-white shadow-2xl flex flex-col overflow-y-auto"
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 p-5">
                                <span className="font-bold text-xl text-[#065975]">
                                    Explore
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setMenuOpen(false)}
                                    aria-label="Close menu"
                                    className="site-icon-button"
                                >
                                    <X size={23} />
                                </button>
                            </div>
                            <nav
                                aria-label="Mobile navigation"
                                className="p-3 space-y-1"
                            >
                                {links.map((link) =>
                                    navLink(link.label, link.href, true),
                                )}
                            </nav>
                            <div className="mx-4 border-t border-slate-100 pt-5 space-y-3">
                                <p className="text-xs uppercase tracking-wider font-bold text-slate-400">
                                    Your account
                                </p>
                                <Link
                                    href={
                                        isAuthenticated ? "/profile" : "/login"
                                    }
                                    onClick={() => setMenuOpen(false)}
                                    className="flex gap-3 items-center text-sm font-semibold py-2 text-[#065975]"
                                >
                                    <UserRound size={18} />
                                    {isAuthenticated
                                        ? "My account & orders"
                                        : "Sign in or create an account"}
                                </Link>
                                <Link
                                    href="/cart"
                                    onClick={() => setMenuOpen(false)}
                                    className="flex gap-3 items-center text-sm font-semibold py-2 text-[#065975]"
                                >
                                    <ShoppingBag size={18} />
                                    Shopping bag ({cartCount})
                                </Link>
                                {isAuthenticated && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            void logout("/");
                                        }}
                                        className="text-sm text-rose-600 py-2 font-medium"
                                    >
                                        Sign out
                                    </button>
                                )}
                            </div>
                            <div className="mx-4 mt-auto pt-8 pb-6">
                                <p className="text-xs text-slate-500 mb-3">
                                    Check delivery to your location
                                </p>
                                <DeliveryPincodeInput />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}