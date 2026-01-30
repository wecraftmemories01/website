"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
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
    Tag,
    Sparkles,
    House,
    Store,
    Headset,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useAuthGuard from "../../components/useAuthGuard";
import { getCategories, apiFetch } from "../../lib/api";
import { fetchCartFromApi } from "../../lib/cart";

/* dynamic import for client-only widget */
const DeliveryPincodeInput = dynamic(() => import("../../components/DeliveryPincodeInput"), { ssr: false });

/* ---------------- Theme ---------------- */
const ACCENT = "#065975";
const ACCENT_LIGHT = "#eaf6f8";

/* ---------------- Types ---------------- */
type Category = { _id: string; publicName: string; sortNumber?: number;[k: string]: any };
type SubCategory = { _id: string; publicName: string; sortNumber?: number; categoryId?: string | null;[k: string]: any };

/* ---------------- Config ---------------- */
const API_ROOT = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3000";
const API_BASE = `${API_ROOT}`;

const TOKEN_KEY = "accessToken";

/* ---------------- Helpers & Spinner ---------------- */
function getStoredAccessToken(): string | null {
    try {
        if (typeof window === "undefined") return null;
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

function getStoredCustomerId(): string | null {
    try {
        if (typeof window === "undefined") return null;
        const raw = localStorage.getItem("auth");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.customerId ?? null;
    } catch {
        return null;
    }
}

async function fetchWithAuth(url: string, opts: RequestInit = {}) {
    const headers = new Headers(opts.headers ?? {});
    const token = getStoredAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (!headers.get("Content-Type")) headers.set("Content-Type", "application/json");
    return fetch(url, { ...opts, headers });
}
const Spinner: React.FC<{ size?: number }> = ({ size = 14 }) => (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.12"></circle>
        <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"></path>
    </svg>
);

/* ---------------- Header ---------------- */
interface HeaderProps {
    containerClass?: string;
    headerHeight?: string;
}

export default function Header({
    containerClass = "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
    headerHeight = "h-16",
}: HeaderProps): React.ReactElement {
    // split states: mobile menu vs account dropdown
    const [mobileOpen, setMobileOpen] = useState(false); // mobile menu
    const [accountOpen, setAccountOpen] = useState(false); // account dropdown
    const [collectionsOpen, setCollectionsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [mounted, setMounted] = useState(false);
    const [cartCount, setCartCount] = useState<number>(0);
    const [cartLoading, setCartLoading] = useState<boolean>(false);
    const [portalReady, setPortalReady] = useState(false);

    const router = useRouter();

    const { ready: authReady, isAuthed } = useAuthGuard({ verifyWithServer: true });

    // separate refs: collections trigger (button) and panel (mega)
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);

    // account trigger + panel refs
    const accountTriggerRef = useRef<HTMLButtonElement | null>(null);
    const accountPanelRef = useRef<HTMLDivElement | null>(null);

    // hover/leave close helpers
    const hoverInsideRef = useRef(false);
    const closeTimerRef = useRef<number | null>(null);
    const CLOSE_DELAY = 200; // ms

    useEffect(() => {
        setPortalReady(true);
    }, []);

    function scheduleCloseCollections() {
        if (closeTimerRef.current && typeof window !== "undefined") window.clearTimeout(closeTimerRef.current);
        if (typeof window !== "undefined") {
            closeTimerRef.current = window.setTimeout(() => {
                if (!hoverInsideRef.current) setCollectionsOpen(false);
            }, CLOSE_DELAY) as unknown as number;
        }
    }
    function cancelCloseCollections() {
        if (closeTimerRef.current && typeof window !== "undefined") {
            window.clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    }

    const [categories, setCategories] = useState<Category[]>([]);
    const [categoriesWithSubs, setCategoriesWithSubs] = useState<Set<string>>(new Set());
    const [loadingCats, setLoadingCats] = useState(false);
    const [catsError, setCatsError] = useState<string | null>(null);

    const [subsMap, setSubsMap] = useState<Record<string, SubCategory[]>>({});
    const [loadingSubsMap, setLoadingSubsMap] = useState(false);
    const [subsMapError, setSubsMapError] = useState<string | null>(null);

    const [selectedCat, setSelectedCat] = useState<string | null>(null);

    const catsAbortRef = useRef<AbortController | null>(null);

    // debounce search locally (kept for parity) - only uses window.setTimeout inside effect (safe)
    useEffect(() => {
        const t = (typeof window !== "undefined") ? window.setTimeout(() => setDebouncedQuery(query), 300) : null;
        return () => {
            if (t && typeof window !== "undefined") window.clearTimeout(t);
        };
    }, [query]);

    // mounted flag to avoid rendering client-only values server-side
    useEffect(() => {
        setMounted(true);
    }, []);

    // 🔑 Hydrate cart from server on first load (refresh-safe)
    useEffect(() => {
        if (!mounted) return;

        fetchCartFromApi();
    }, [mounted]);

    const handleLogout = useCallback(() => {
        try {
            if (typeof window !== "undefined") {
                localStorage.removeItem("auth");
                localStorage.removeItem("customerId");
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("rememberedUser");
                localStorage.removeItem("cartProductIds");
            }
            window.dispatchEvent(new Event("authChanged"));
            window.location.href = "/";
        } catch (e) {
            console.error("Logout error", e);
        }
    }, []);

    // click / escape / blur handlers: cover collections + account + mobile
    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            const t = e.target as Node | null;

            // collections: if click not on trigger nor inside panel -> close
            const clickedCollectionsTrigger = triggerRef.current && t && triggerRef.current.contains(t);
            const clickedCollectionsPanel = panelRef.current && t && panelRef.current.contains(t);
            if (!clickedCollectionsTrigger && !clickedCollectionsPanel) {
                setCollectionsOpen(false);
            }

            // account: if click not on account trigger nor account panel -> close
            const clickedAccountTrigger = accountTriggerRef.current && t && accountTriggerRef.current.contains(t);
            const clickedAccountPanel = accountPanelRef.current && t && accountPanelRef.current.contains(t);
            if (!clickedAccountTrigger && !clickedAccountPanel) {
                setAccountOpen(false);
            }
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setCollectionsOpen(false);
                setAccountOpen(false);
                setMobileOpen(false);
            }
        }

        function onWindowBlur() {
            setAccountOpen(false);
        }

        function onVisibilityChange() {
            if (typeof document !== "undefined" && document.hidden) {
                setAccountOpen(false);
            }
        }

        function onWindowMouseOut(e: MouseEvent) {
            // when the mouse leaves the window, relatedTarget is null
            // @ts-ignore
            const related = (e as any).relatedTarget || (e as any).toElement;
            if (!related) {
                setAccountOpen(false);
            }
        }

        document.addEventListener("click", onDocClick);
        document.addEventListener("keydown", onKey);
        if (typeof window !== "undefined") {
            window.addEventListener("blur", onWindowBlur);
            window.addEventListener("mouseout", onWindowMouseOut);
        }
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            document.removeEventListener("click", onDocClick);
            document.removeEventListener("keydown", onKey);
            if (typeof window !== "undefined") {
                window.removeEventListener("blur", onWindowBlur);
                window.removeEventListener("mouseout", onWindowMouseOut);
            }
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, []);

    useEffect(() => {
        catsAbortRef.current?.abort();
        const ctrl = new AbortController();
        catsAbortRef.current = ctrl;

        async function load() {
            setLoadingCats(true);
            setCatsError(null);
            setLoadingSubsMap(true);
            setSubsMapError(null);

            try {
                const [cats, allSubsRaw] = await Promise.all([
                    getCategories(ctrl.signal),
                    apiFetch(`${API_BASE}/sub_category`, { signal: ctrl.signal }),
                ]);

                const allSubs = (allSubsRaw?.subCategoryData || []).map((s: any) => ({
                    ...s,
                    categoryId: s.categoryId ?? s.superCategoryId ?? (s.category && s.category._id) ?? null,
                })) as SubCategory[];

                // build map
                const map: Record<string, SubCategory[]> = {};
                allSubs.forEach((s) => {
                    const cid = s.categoryId ?? "uncategorized";
                    if (!map[cid]) map[cid] = [];
                    map[cid].push(s);
                });
                setSubsMap(map);

                // categories that have subs
                const setIds = new Set<string>();
                allSubs.forEach((s) => {
                    if (s.categoryId) setIds.add(s.categoryId);
                });
                setCategoriesWithSubs(setIds);

                // filter categories to only those with subs for tidy UI
                const filtered = (cats || []).filter((c: any) => setIds.has(c._id));
                setCategories(filtered);

                if ((filtered || []).length > 0) setSelectedCat(filtered[0]._id);
            } catch (err: any) {
                if (err?.name !== "AbortError") {
                    console.error("Failed loading categories", err);
                    setCatsError("Failed to load collections");
                    setSubsMapError("Failed to load sub-collections");
                }
            } finally {
                setLoadingCats(false);
                setLoadingSubsMap(false);
                catsAbortRef.current = null;
            }
        }

        // load categories only on client (avoid SSR fetch differences)
        if (typeof window !== "undefined") load();
        return () => ctrl.abort();
    }, []);

    // lock body scroll when mega open
    useEffect(() => {
        if (typeof window === "undefined") return;

        // Save previous values so we can restore them exactly
        const prevOverflow = document.body.style.overflow;
        const prevPaddingRight = document.body.style.paddingRight || "";

        function getScrollbarWidth() {
            return window.innerWidth - document.documentElement.clientWidth;
        }

        if (collectionsOpen) {
            const scrollBarWidth = getScrollbarWidth();
            if (scrollBarWidth > 0) {
                document.body.style.paddingRight = `${scrollBarWidth}px`;
            }
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = prevOverflow || "";
            document.body.style.paddingRight = prevPaddingRight;
        }

        return () => {
            document.body.style.overflow = prevOverflow || "";
            document.body.style.paddingRight = prevPaddingRight;
        };
    }, [collectionsOpen]);

    // cleanup close timer on unmount
    useEffect(() => {
        return () => {
            if (closeTimerRef.current && typeof window !== "undefined") {
                window.clearTimeout(closeTimerRef.current);
                closeTimerRef.current = null;
            }
        };
    }, []);

    async function fetchCartCount() {
        if (typeof window === "undefined") return;
        setCartLoading(true);
        try {
            const customerId = getStoredCustomerId();
            const param = customerId ? `?customerId=${encodeURIComponent(customerId)}` : "";
            const url = `${API_BASE}/cart${param}`;
            const res = await fetchWithAuth(url, { method: "GET" });
            const body = await res.json().catch(() => null);
            if (!res.ok) {
                setCartCount(0);
                try { localStorage.setItem("cartCount", "0"); } catch { }
                return;
            }
            const raw = Array.isArray(body?.cartData) ? body.cartData[0] : body.cartData;
            if (!raw) {
                setCartCount(0);
                try { localStorage.setItem("cartCount", "0"); } catch { }
                return;
            }
            let count = 0;
            if (typeof raw.totalItems === "number") count = raw.totalItems;
            else if (Array.isArray(raw.sellItems)) count = raw.sellItems.reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0);
            else count = 0;
            setCartCount(count);
            try { localStorage.setItem("cartCount", String(count)); } catch { }
        } catch (err) {
            console.error("[Header] fetchCartCount error:", err);
            setCartCount(0);
            try { localStorage.setItem("cartCount", "0"); } catch { }
        } finally {
            setCartLoading(false);
        }
    }

    // only fetch cart after mount to avoid SSR/CSR mismatch
    useEffect(() => {
        if (!mounted) return;
        fetchCartCount();
        function onAuthChanged() { fetchCartCount(); }
        function onCartChanged() { fetchCartCount(); }
        function onStorage(e: StorageEvent) {
            if (!e.key) return;
            if (e.key === "auth" || e.key === TOKEN_KEY || e.key === "cartCount") fetchCartCount();
        }
        window.addEventListener("authChanged", onAuthChanged);
        window.addEventListener("cartChanged", onCartChanged);
        window.addEventListener("storage", onStorage);
        return () => {
            window.removeEventListener("authChanged", onAuthChanged);
            window.removeEventListener("cartChanged", onCartChanged);
            window.removeEventListener("storage", onStorage);
        };
    }, [mounted]);

    useEffect(() => {
        if (!mounted) return;
        if (authReady) fetchCartCount();
    }, [authReady, isAuthed, mounted]);

    const totalSubCount = useMemo(() => Object.values(subsMap).reduce((s, arr) => s + arr.length, 0), [subsMap]);
    const selectedSubs = selectedCat ? (subsMap[selectedCat] || []) : [];

    // ----- Search redirect logic -----
    const doHeaderSearch = useCallback((q: string) => {
        const trimmed = (q ?? "").trim();
        if (trimmed.length === 0) {
            router.push("/products");
        } else {
            const encoded = encodeURIComponent(trimmed);
            router.push(`/products?q=${encoded}`);
        }
    }, [router]);

    // allow Enter key to submit search
    const onHeaderKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            doHeaderSearch(query);
        }
    };

    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = "hidden";
            document.body.style.touchAction = "none";
        } else {
            document.body.style.overflow = "";
            document.body.style.touchAction = "";
        }
    }, [mobileOpen]);

    return (
        <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-slate-100 mt-1">
            <div className={containerClass}>
                <div className="relative">
                    {/* ================= DESKTOP HEADER ================= */}
                    <div className="hidden md:flex items-center justify-between gap-6 py-2">
                        {/* LEFT */}
                        <div className="flex items-center gap-4">
                            <Link href="/" className="flex items-center">
                                <div className="rounded-md p-1" style={{ background: ACCENT_LIGHT }}>
                                    <Image src="/logo.png" alt="WeCraftMemories" width={64} height={38} priority />
                                </div>
                            </Link>

                            <nav className="flex items-center gap-6">
                                <Link href="/" className="flex items-center gap-1 text-sm font-medium">
                                    <House size={14} /> Home
                                </Link>
                                <Link href="/products" className="flex items-center gap-1 text-sm font-medium">
                                    <Store size={14} /> Shop
                                </Link>
                                <Link href="/contact" className="flex items-center gap-1 text-sm font-medium">
                                    <Headset size={14} /> Contact
                                </Link>
                            </nav>
                        </div>

                        {/* CENTER SEARCH */}
                        <div className="flex items-center bg-slate-100 rounded-full px-4 py-2 gap-2 flex-1 max-w-xl">
                            <Search size={14} className="text-slate-600" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={onHeaderKeyDown}
                                placeholder="Search products..."
                                className="bg-transparent outline-none text-sm flex-1"
                            />
                            <button
                                onClick={() => doHeaderSearch(query)}
                                className="text-sm px-3 py-1 rounded-full bg-white"
                            >
                                Search
                            </button>
                        </div>

                        {/* RIGHT */}
                        <div className="flex items-center gap-3">
                            {mounted && <DeliveryPincodeInput />}

                            <Link href="/cart" className="relative">
                                <ShoppingCart size={18} />
                                <span
                                    className="absolute -top-2 -right-2 min-w-[18px] h-[18px] text-xs bg-amber-400 rounded-full flex items-center justify-center"
                                    style={{ visibility: cartCount > 0 ? "visible" : "hidden" }}
                                >
                                    {cartCount}
                                </span>
                            </Link>

                            {!isAuthed ? (
                                <>
                                    <Link href="/login">Login</Link>
                                    <Link href="/register" className="px-3 py-1 rounded-md text-white" style={{ background: ACCENT }}>
                                        Register
                                    </Link>
                                </>
                            ) : (
                                <button onClick={handleLogout}>Logout</button>
                            )}
                        </div>
                    </div>

                    {/* ================= MOBILE HEADER ================= */}
                    <div className="md:hidden flex flex-col gap-3 py-2">
                        {/* ROW 1 */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setMobileOpen(true)}>
                                    <Menu size={20} />
                                </button>

                                <Link href="/">
                                    <Image src="/logo.png" alt="WeCraftMemories" width={52} height={32} />
                                </Link>
                            </div>

                            <div className="flex items-center gap-3">
                                <Link href="/cart">
                                    <ShoppingCart size={18} />
                                </Link>
                                <button onClick={() => router.push(isAuthed ? "/profile" : "/login")}>
                                    <UserIcon size={18} />
                                </button>
                            </div>
                        </div>

                        {/* ROW 2 – SEARCH */}
                        <div className="mt-2">
                            <div className="flex items-center bg-slate-100 rounded-full px-3 py-2 gap-2">
                                <Search size={16} />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={onHeaderKeyDown}
                                    placeholder="Search products..."
                                    className="bg-transparent outline-none text-sm w-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* ================= MOBILE DRAWER (PORTAL) ================= */}
            {portalReady &&
                createPortal(
                    <AnimatePresence>
                        {mobileOpen && (
                            <>
                                {/* BACKDROP */}
                                <motion.div
                                    className="fixed inset-0 bg-black/50 z-[1000]"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setMobileOpen(false)}
                                />

                                {/* DRAWER */}
                                <motion.aside
                                    initial={{ x: "-100%" }}
                                    animate={{ x: 0 }}
                                    exit={{ x: "-100%" }}
                                    transition={{ type: "spring", stiffness: 260, damping: 28 }}
                                    className="fixed top-0 left-0 h-full w-[85%] max-w-sm bg-white z-[1001] flex flex-col"
                                >
                                    {/* HEADER */}
                                    <div className="h-14 px-4 flex items-center justify-between border-b">
                                        <span className="text-lg font-semibold">Menu</span>
                                        <button onClick={() => setMobileOpen(false)}>
                                            <X size={20} />
                                        </button>
                                    </div>

                                    {/* SEARCH */}
                                    <div className="px-4 py-3">
                                        <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
                                            <Search size={16} />
                                            <input
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && doHeaderSearch(query)}
                                                placeholder="Search products"
                                                className="bg-transparent outline-none w-full text-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* NAV */}
                                    <nav className="px-4 space-y-1">
                                        <Link
                                            href="/"
                                            onClick={() => setMobileOpen(false)}
                                            className="block px-3 py-3 rounded-xl hover:bg-slate-100"
                                        >
                                            Home
                                        </Link>
                                        <Link
                                            href="/products"
                                            onClick={() => setMobileOpen(false)}
                                            className="block px-3 py-3 rounded-xl hover:bg-slate-100"
                                        >
                                            Shop
                                        </Link>
                                    </nav>

                                    {/* PINCODE */}
                                    <div className="px-4 py-4 border-t">
                                        <div className="text-sm font-medium mb-2">Delivery Pincode</div>
                                        {mounted ? <DeliveryPincodeInput /> : <div className="h-10 bg-slate-100 rounded" />}
                                    </div>

                                    {/* FOOTER */}
                                    <div className="mt-auto px-4 py-4 border-t">
                                        {!authReady ? (
                                            <div className="text-center py-3 bg-slate-100 rounded-xl">
                                                Checking…
                                            </div>
                                        ) : !isAuthed ? (
                                            <Link
                                                href="/login"
                                                onClick={() => setMobileOpen(false)}
                                                className="block text-center py-3 rounded-xl text-white font-semibold"
                                                style={{ background: ACCENT }}
                                            >
                                                Login / Register
                                            </Link>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    localStorage.clear();
                                                    window.location.href = "/";
                                                }}
                                                className="w-full py-3 rounded-xl bg-rose-600 text-white font-semibold"
                                            >
                                                Logout
                                            </button>
                                        )}
                                    </div>
                                </motion.aside>
                            </>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
        </header>
    );
}