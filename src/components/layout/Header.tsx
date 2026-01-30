"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { House, Store, Headset } from "lucide-react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    Menu,
    Search,
    ShoppingCart,
    X,
    User as UserIcon,
    ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useAuthGuard from "../../components/useAuthGuard";
import { fetchCartFromApi } from "../../lib/cart";

/* ================= BRAND ================= */
const ACCENT = "#0B5C73";

/* ================= HEADER ================= */
export default function Header() {
    const router = useRouter();
    const { ready: authReady, isAuthed } = useAuthGuard({ verifyWithServer: true });

    const [mounted, setMounted] = useState(false);
    const [portalReady, setPortalReady] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [cartCount, setCartCount] = useState(0);

    /* account menu */
    const [accountOpen, setAccountOpen] = useState(false);
    const accountRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setMounted(true);
        setPortalReady(true);
    }, []);

    /* ===== SEARCH ===== */
    const doSearch = useCallback(
        (q: string) => {
            const v = q.trim();
            router.push(v ? `/products?q=${encodeURIComponent(v)}` : "/products");
        },
        [router]
    );

    /* ===== CART ===== */
    useEffect(() => {
        if (!mounted) return;
        fetchCartFromApi();
        const stored = localStorage.getItem("cartCount");
        if (stored) setCartCount(Number(stored));
    }, [mounted]);

    /* ===== CLOSE ACCOUNT MENU ON OUTSIDE CLICK ===== */
    useEffect(() => {
        function onClick(e: MouseEvent) {
            if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
                setAccountOpen(false);
            }
        }
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    /* ===== BODY LOCK ===== */
    useEffect(() => {
        document.body.style.overflow = mobileOpen ? "hidden" : "";
    }, [mobileOpen]);

    /* ===== USER NAME ===== */
    function getUserName() {
        try {
            const raw = localStorage.getItem("auth");
            if (!raw) return "Account";
            const parsed = JSON.parse(raw);
            return parsed?.name || parsed?.firstName || "Account";
        } catch {
            return "Account";
        }
    }

    function handleLogout() {
        localStorage.clear();
        window.location.href = "/";
    }

    return (
        <>
            {/* ================= HEADER ================= */}
            <header className="sticky top-0 z-50 bg-white border-b">
                <div className="max-w-7xl mx-auto px-4">

                    {/* ================= TOP ROW ================= */}
                    <div className="min-h-[64px] flex items-center gap-6">

                        {/* LEFT */}
                        <div className="flex items-center gap-4 shrink-0">
                            <Link href="/">
                                <Image src="/logo.png" alt="WeCraftMemories" width={78} height={44} />
                            </Link>
                        </div>

                        {/* DESKTOP MENU */}
                        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-700 shrink-0">

                            <Link
                                href="/"
                                className="flex items-center gap-1.5 hover:text-[color:var(--a)] transition"
                                style={{ "--a": ACCENT } as any}
                            >
                                <House size={16} />
                                <span>Home</span>
                            </Link>

                            <Link
                                href="/products"
                                className="flex items-center gap-1.5 hover:text-[color:var(--a)] transition"
                                style={{ "--a": ACCENT } as any}
                            >
                                <Store size={16} />
                                <span>Shop</span>
                            </Link>

                            <Link
                                href="/contact"
                                className="flex items-center gap-1.5 hover:text-[color:var(--a)] transition"
                                style={{ "--a": ACCENT } as any}
                            >
                                <Headset size={16} />
                                <span>Contact</span>
                            </Link>

                        </nav>

                        {/* SEARCH — EXPANDS */}
                        <div className="hidden md:flex flex-1 mx-4">
                            <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-4 py-2 w-full">
                                <Search size={16} className="text-slate-500" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && doSearch(query)}
                                    placeholder="Search handmade gifts, crochet toys, decor…"
                                    className="bg-transparent outline-none text-sm w-full"
                                />
                            </div>
                        </div>

                        {/* RIGHT — DESKTOP */}
                        <div className="hidden md:flex items-center gap-3 shrink-0">

                            {/* CART */}
                            <Link href="/cart" className="relative p-2">
                                <ShoppingCart size={20} />
                                {mounted && cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[18px] h-5 rounded-full bg-amber-400 text-xs font-semibold flex items-center justify-center">
                                        {cartCount}
                                    </span>
                                )}
                            </Link>

                            {/* AUTH */}
                            {authReady && !isAuthed && (
                                <>
                                    <Link href="/login" className="text-sm font-medium">Login</Link>
                                    <Link
                                        href="/register"
                                        className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                                        style={{ background: ACCENT }}
                                    >
                                        Register
                                    </Link>
                                </>
                            )}

                            {authReady && isAuthed && (
                                <div ref={accountRef} className="relative">
                                    <button
                                        onClick={() => setAccountOpen(v => !v)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100"
                                    >
                                        <UserIcon size={18} />
                                        <span
                                            className="max-w-[120px] truncate text-sm font-medium"
                                            title={mounted ? getUserName() : ""}
                                        >
                                            {mounted ? getUserName() : "Account"}
                                        </span>
                                        <ChevronDown size={14} />
                                    </button>

                                    <AnimatePresence>
                                        {accountOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -6 }}
                                                className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50"
                                            >
                                                <Link href="/profile" className="block px-4 py-2 text-sm hover:bg-slate-100">
                                                    Profile
                                                </Link>
                                                <Link href="/orders" className="block px-4 py-2 text-sm hover:bg-slate-100">
                                                    Orders
                                                </Link>
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-slate-100"
                                                >
                                                    Logout
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>

                        {/* RIGHT — MOBILE */}
                        <div className="md:hidden flex items-center gap-2 ml-auto">
                            <Link href="/cart" className="relative p-2">
                                <ShoppingCart size={20} />
                                {mounted && cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[18px] h-5 rounded-full bg-amber-400 text-xs font-semibold flex items-center justify-center">
                                        {cartCount}
                                    </span>
                                )}
                            </Link>

                            {authReady && (
                                <Link href={isAuthed ? "/profile" : "/login"} className="flex items-center gap-1 p-2">
                                    <UserIcon size={18} />
                                    {isAuthed && (
                                        <span className="max-w-[80px] truncate text-sm">
                                            {mounted ? getUserName() : ""}
                                        </span>
                                    )}
                                </Link>
                            )}

                            <button onClick={() => setMobileOpen(true)} className="p-2">
                                <Menu size={22} />
                            </button>
                        </div>
                    </div>

                    {/* ================= SEARCH DOWN (MOBILE / WRAP) ================= */}
                    <div className="md:hidden pb-3">
                        <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                            <Search size={16} className="text-slate-500" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && doSearch(query)}
                                placeholder="Search handmade gifts…"
                                className="bg-transparent outline-none w-full text-sm"
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* ================= MOBILE DRAWER ================= */}
            {portalReady &&
                createPortal(
                    <AnimatePresence>
                        {mobileOpen && (
                            <>
                                <motion.div
                                    className="fixed inset-0 bg-black/50 z-[100]"
                                    onClick={() => setMobileOpen(false)}
                                />
                                <motion.aside
                                    className="fixed top-0 left-0 h-full w-[80%] max-w-sm bg-white z-[101]"
                                    initial={{ x: "-100%" }}
                                    animate={{ x: 0 }}
                                    exit={{ x: "-100%" }}
                                >
                                    <div className="h-14 px-4 flex items-center justify-between border-b">
                                        <span className="font-semibold">Menu</span>
                                        <button onClick={() => setMobileOpen(false)}>
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <nav className="p-4 space-y-2 text-sm font-medium">
                                        <Link href="/" onClick={() => setMobileOpen(false)} className="block px-4 py-3 rounded-lg hover:bg-slate-100">Home</Link>
                                        <Link href="/products" onClick={() => setMobileOpen(false)} className="block px-4 py-3 rounded-lg hover:bg-slate-100">Shop</Link>
                                        <Link href="/contact" onClick={() => setMobileOpen(false)} className="block px-4 py-3 rounded-lg hover:bg-slate-100">Contact</Link>
                                    </nav>
                                </motion.aside>
                            </>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
        </>
    );
}