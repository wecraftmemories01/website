"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    Menu,
    X,
    Search,
    ShoppingCart,
    User,
    ChevronDown,
    Heart,
} from "lucide-react";
import useAuthGuard from "../../components/useAuthGuard";

/** Simple spinner (same style as Header) */
const Spinner: React.FC<{ size?: number }> = ({ size = 14 }) => (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.15"></circle>
        <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"></path>
    </svg>
);

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3000/v1";
const TOKEN_KEY = "accessToken";
const CUSTOMER_KEY = "customerId";

/** Helpers */
function getStoredAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

function getStoredCustomerId(): string | null {
    if (typeof window === "undefined") return null;
    try {
        return localStorage.getItem(CUSTOMER_KEY);
    } catch {
        return null;
    }
}

/** Fetch wrapper that attaches Authorization header if token available */
async function fetchWithAuth(url: string, opts: RequestInit = {}) {
    const headers = new Headers(opts.headers ?? {});
    const token = getStoredAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (!headers.get("Content-Type")) headers.set("Content-Type", "application/json");
    return fetch(url, { ...opts, headers });
}

export default function NavbarEcommerce(): React.ReactElement {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [catOpen, setCatOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [query, setQuery] = useState("");
    const catRef = useRef<HTMLDivElement | null>(null);
    const profileRef = useRef<HTMLDivElement | null>(null);

    // hover close helpers for categories
    const catHoverRef = useRef(false);
    const catCloseTimer = useRef<number | null>(null);
    const CAT_CLOSE_DELAY = 200;

    function scheduleCloseCat() {
        if (catCloseTimer.current) window.clearTimeout(catCloseTimer.current);
        catCloseTimer.current = window.setTimeout(() => {
            if (!catHoverRef.current) setCatOpen(false);
        }, CAT_CLOSE_DELAY) as unknown as number;
    }
    function cancelCloseCat() {
        if (catCloseTimer.current) {
            window.clearTimeout(catCloseTimer.current);
            catCloseTimer.current = null;
        }
    }

    const { ready: authReady, isAuthed } = useAuthGuard({ verifyWithServer: true });

    // cart count state
    const [cartCount, setCartCount] = useState<number | null>(null); // null => unknown/loading
    const [cartLoading, setCartLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    // close menus on outside click / escape
    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setMobileOpen(false);
                setCatOpen(false);
                setProfileOpen(false);
            }
        }
        document.addEventListener("click", onDocClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("click", onDocClick);
            document.removeEventListener("keydown", onKey);
        };
    }, []);

    // cleanup cat timer on unmount
    useEffect(() => {
        return () => {
            if (catCloseTimer.current) {
                window.clearTimeout(catCloseTimer.current);
                catCloseTimer.current = null;
            }
        };
    }, []);

    const doLogout = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            window.dispatchEvent(new Event("authChanged"));
        }
    };

    /** Read cart service and set count */
    async function fetchCartCount() {
        if (typeof window === "undefined") return;
        setCartLoading(true);
        setCartCount(null);
        try {
            const customerId = getStoredCustomerId();
            console.debug("[Navbar] fetchCartCount called. customerId:", customerId);

            const param = customerId ? `?customerId=${encodeURIComponent(customerId)}` : "";
            const url = `${API_BASE}/cart${param}`;
            console.debug("[Navbar] calling cart service:", url);

            const res = await fetchWithAuth(url, { method: "GET" });
            const body = await res.json().catch(() => null);

            if (!res.ok) {
                console.warn("[Navbar] cart fetch failed:", res.status, body);
                setCartCount(0);
                return;
            }

            const raw = Array.isArray(body?.cartData) ? body.cartData[0] : body.cartData;
            if (!raw) {
                setCartCount(0);
                return;
            }

            let count: number;
            if (typeof raw.totalItems === "number") {
                count = raw.totalItems;
            } else if (Array.isArray(raw.sellItems)) {
                count = raw.sellItems.reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0);
            } else {
                count = 0;
            }

            console.debug("[Navbar] cart count resolved:", count, raw);
            setCartCount(count);
        } catch (err) {
            console.error("[Navbar] fetchCartCount error:", err);
            setCartCount(0);
        } finally {
            setCartLoading(false);
        }
    }

    // mounted flag
    useEffect(() => {
        setMounted(true);
    }, []);

    // fetch on mount, and also when authChanged or storage events occur
    useEffect(() => {
        if (!mounted) return;
        fetchCartCount();

        function onAuthChanged() {
            console.debug("[Navbar] authChanged event -> refetch cart");
            fetchCartCount();
        }
        window.addEventListener("authChanged", onAuthChanged);

        function onStorage(e: StorageEvent) {
            if (!e.key) return;
            if (e.key === CUSTOMER_KEY || e.key === TOKEN_KEY) {
                console.debug(`[Navbar] storage event key=${e.key} changed -> refetch cart`);
                fetchCartCount();
            }
        }
        window.addEventListener("storage", onStorage);

        return () => {
            window.removeEventListener("authChanged", onAuthChanged);
            window.removeEventListener("storage", onStorage);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted]);

    // also refresh when the auth guard becomes ready
    useEffect(() => {
        if (!mounted) return;
        if (authReady) {
            console.debug("[Navbar] authReady -> refetch cart");
            fetchCartCount();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authReady, isAuthed, mounted]);

    return (
        <header className="w-full bg-white border-b sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 md:px-6">
                <div className="flex items-center gap-4 py-3 md:py-4">
                    {/* left: mobile menu + logo */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button aria-label={mobileOpen ? "Close menu" : "Open menu"} onClick={() => setMobileOpen((v) => !v)} className="inline-flex items-center justify-center p-2 md:hidden rounded-md text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-200">
                            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>

                        <Link href="/" className="flex items-center gap-3">
                            <div className="relative h-10 w-10 rounded-md overflow-hidden bg-white ring-1 ring-slate-100">
                                <Image src="/logo.png" alt="WeCraftMemories" fill style={{ objectFit: "contain" }} />
                            </div>
                            <span className="hidden sm:inline text-lg font-semibold text-slate-900">WeCraftMemories</span>
                        </Link>
                    </div>

                    {/* center: categories + search (collapses on small) */}
                    <div className="hidden md:flex items-center gap-4 flex-1">
                        <div
                            ref={catRef}
                            className="relative"
                            onMouseEnter={() => {
                                catHoverRef.current = true;
                                cancelCloseCat();
                                setCatOpen(true);
                            }}
                            onMouseLeave={() => {
                                catHoverRef.current = false;
                                scheduleCloseCat();
                            }}
                        >
                            <button aria-haspopup="true" aria-expanded={catOpen} onClick={() => setCatOpen((v) => !v)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-200">
                                Categories <ChevronDown className="w-4 h-4" />
                            </button>

                            <div role="menu" aria-hidden={!catOpen} className={`absolute left-0 top-full mt-2 w-[720px] bg-white rounded-lg shadow-lg ring-1 ring-black/5 transform transition duration-150 ${catOpen ? "opacity-100 scale-100" : "opacity-0 pointer-events-none scale-95"}`}>
                                <div className="p-5 grid grid-cols-3 gap-4">
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-800">Home Decor</h3>
                                        <ul className="mt-3 space-y-2 text-sm text-slate-600">
                                            <li><Link href="/products/cushions" className="block hover:text-teal-600">Cushions & Throws</Link></li>
                                            <li><Link href="/products/wallhangings" className="block hover:text-teal-600">Wall Hangings</Link></li>
                                            <li><Link href="/products/planters" className="block hover:text-teal-600">Planters</Link></li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-800">Gifts</h3>
                                        <ul className="mt-3 space-y-2 text-sm text-slate-600">
                                            <li><Link href="/gifts/for-her" className="block hover:text-teal-600">For Her</Link></li>
                                            <li><Link href="/gifts/for-kids" className="block hover:text-teal-600">For Kids</Link></li>
                                            <li><Link href="/gifts/personalized" className="block hover:text-teal-600">Personalized</Link></li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-800">Collections</h3>
                                        <ul className="mt-3 space-y-2 text-sm text-slate-600">
                                            <li><Link href="/collections/new" className="block hover:text-teal-600">New Arrivals</Link></li>
                                            <li><Link href="/collections/bestsellers" className="block hover:text-teal-600">Best Sellers</Link></li>
                                            <li><Link href="/collections/seasonal" className="block hover:text-teal-600">Seasonal Picks</Link></li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="px-5 pb-5">
                                    <Link href="/collections/handmade-essentials" className="flex items-center gap-4 rounded-md p-3 hover:bg-slate-50">
                                        <div className="w-16 h-12 rounded-md overflow-hidden bg-slate-100" />
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">Handmade Essentials</p>
                                            <p className="text-xs text-slate-500">Curated kits & ready-to-gift combos</p>
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Search */}
                        <form onSubmit={(e) => e.preventDefault()} className="flex items-center flex-1 max-w-2xl" role="search" aria-label="Search products, collections and more">
                            <label htmlFor="nav-search" className="sr-only">Search</label>
                            <div className="relative w-full">
                                <input id="nav-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products, e.g. 'crochet bouquet' or 'diwali gift'" className="w-full rounded-md border border-slate-200 px-4 py-2 pl-10 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-200" />
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>

                            <button type="submit" className="ml-3 inline-flex items-center gap-2 px-3 py-2 rounded-md bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-200">
                                Search
                            </button>
                        </form>
                    </div>

                    {/* right: actions */}
                    <div className="ml-auto flex items-center gap-3">
                        <Link href="/wishlist" className="hidden md:inline-flex items-center gap-2 text-slate-700 hover:text-teal-600">
                            <Heart className="w-5 h-5" />
                            <span className="text-sm">Wishlist</span>
                        </Link>

                        <div ref={profileRef} className="relative">
                            <button aria-haspopup="true" aria-expanded={profileOpen} onClick={() => setProfileOpen((v) => !v)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-200">
                                <User className="w-5 h-5" />
                                <span className="hidden sm:inline">Account</span>
                                <ChevronDown className="w-4 h-4" />
                            </button>

                            <div className={`absolute right-0 mt-2 w-44 bg-white rounded-md shadow-lg ring-1 ring-black/5 transition ${profileOpen ? "opacity-100 scale-100" : "opacity-0 pointer-events-none scale-95"}`} role="menu" aria-hidden={!profileOpen}>
                                <ul className="py-2 text-sm text-slate-700">
                                    {!authReady && <li className="px-4 py-2 flex items-center gap-2"><Spinner size={14} /> Checking…</li>}

                                    {authReady && !isAuthed && (
                                        <>
                                            <li><Link href="/login" className="block px-4 py-2 hover:bg-slate-50">Sign in</Link></li>
                                            <li><Link href="/register" className="block px-4 py-2 hover:bg-slate-50">Register</Link></li>
                                        </>
                                    )}

                                    {authReady && isAuthed && (
                                        <>
                                            <li><Link href="/account" className="block px-4 py-2 hover:bg-slate-50">My account</Link></li>
                                            <li><Link href="/orders" className="block px-4 py-2 hover:bg-slate-50">Orders</Link></li>
                                            <li><button onClick={doLogout} className="w-full text-left px-4 py-2 hover:bg-slate-50">Logout</button></li>
                                        </>
                                    )}
                                </ul>
                            </div>
                        </div>

                        <Link href="/cart" className="relative inline-flex items-center gap-2 px-3 py-2 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-800">
                            <ShoppingCart className="w-5 h-5" />
                            <span className="text-sm font-medium">Cart</span>

                            <span className="sr-only" aria-live="polite">
                                {mounted ? (cartLoading ? "Cart count loading" : `Cart has ${cartCount ?? 0} items`) : "Cart info unavailable"}
                            </span>

                            <div className="ml-1">
                                {mounted ? (
                                    cartLoading ? <Spinner size={14} /> : (
                                        <span className="inline-flex items-center justify-center min-w-[22px] h-6 px-2 text-xs font-medium rounded-full bg-rose-600 text-white">
                                            {cartCount ?? 0}
                                        </span>
                                    )
                                ) : (
                                    <span className="inline-block w-[22px] h-6" aria-hidden />
                                )}
                            </div>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Mobile drawer */}
            <div className={`md:hidden fixed inset-0 z-50 transform transition duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`} aria-hidden={!mobileOpen}>
                <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
                <nav className="relative w-80 max-w-full h-full bg-white shadow-xl p-4 overflow-auto">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="relative h-8 w-8 rounded-md overflow-hidden">
                                <Image src="/logo.png" alt="logo" fill style={{ objectFit: "contain" }} />
                            </div>
                            <span className="font-semibold text-slate-900">WeCraftMemories</span>
                        </div>
                        <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="p-2 rounded-md">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-3">
                        <form className="flex items-center gap-2" onSubmit={(e) => e.preventDefault()}>
                            <input className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm" placeholder="Search products" value={query} onChange={(e) => setQuery(e.target.value)} />
                            <button className="rounded-md bg-teal-600 text-white px-3 py-2">Go</button>
                        </form>

                        <div className="border-t pt-3">
                            <h4 className="text-xs font-medium text-slate-600 uppercase mb-2">Shop</h4>
                            <ul className="space-y-2">
                                <li><Link href="/products" className="block py-2">All Products</Link></li>
                                <li>
                                    <details className="group">
                                        <summary className="flex items-center justify-between py-2 cursor-pointer">Categories <ChevronDown className="w-4 h-4 group-open:rotate-180 transition" /></summary>
                                        <ul className="pl-4 mt-2 space-y-1 text-sm text-slate-600">
                                            <li><Link href="/gifts/for-her" className="block py-1">For Her</Link></li>
                                            <li><Link href="/gifts/for-kids" className="block py-1">For Kids</Link></li>
                                            <li><Link href="/collections/handmade-essentials" className="block py-1">Kits & Combos</Link></li>
                                        </ul>
                                    </details>
                                </li>
                                <li><Link href="/collections/bestsellers" className="block py-2">Best Sellers</Link></li>
                            </ul>
                        </div>

                        <div className="border-t pt-3">
                            <h4 className="text-xs font-medium text-slate-600 uppercase mb-2">Account</h4>
                            <ul className="space-y-2">
                                <li><Link href="/account" className="block py-2">My account</Link></li>
                                <li><Link href="/orders" className="block py-2">Orders</Link></li>
                                <li><Link href="/contact" className="block py-2">Contact</Link></li>
                            </ul>
                        </div>

                        <div className="pt-4">
                            <Link href="/cart" className="inline-flex items-center gap-2 w-full justify-center px-4 py-2 rounded-md bg-teal-600 text-white">
                                <ShoppingCart className="w-4 h-4" /> View cart
                                <span className="ml-2 inline-flex items-center justify-center min-w-[22px] h-6 px-2 text-xs font-medium rounded-full bg-rose-600 text-white">
                                    {cartCount ?? 0}
                                </span>
                            </Link>
                        </div>
                    </div>
                </nav>
            </div>
        </header>
    );
}