"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import {
    Menu,
    Search,
    ShoppingCart,
    X,
    User as UserIcon,
    ChevronDown,
    Tag,
    Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useAuthGuard from "../../components/useAuthGuard";
import { getCategories, apiFetch } from "../../lib/api";

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
const CUSTOMER_KEY = "customerId";

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
        return localStorage.getItem(CUSTOMER_KEY);
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

    const handleLogout = useCallback(() => {
        try {
            if (typeof window !== "undefined") {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("tokenType");
                localStorage.removeItem("customerToken");
                localStorage.removeItem(CUSTOMER_KEY);
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
            if (e.key === CUSTOMER_KEY || e.key === TOKEN_KEY || e.key === "cartCount") fetchCartCount();
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

    return (
        <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-slate-100">
            <div className={containerClass}>
                <div className={`flex items-center justify-between ${headerHeight}`}>
                    {/* left */}
                    <div className="flex items-center gap-4">
                        <button onClick={() => setMobileOpen((v) => !v)} aria-label="menu" className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition">
                            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>

                        <Link href="/" className="flex items-center">
                            <div className="rounded-md p-1" style={{ background: ACCENT_LIGHT }}>
                                <Image src="/logo.png" alt="WeCraftMemories" width={110} height={44} priority />
                            </div>
                        </Link>
                    </div>

                    {/* center nav */}
                    <nav className="hidden md:flex items-center gap-6">
                        <Link href="/products" className="text-sm font-medium text-slate-700 hover:text-[color:var(--accent)] transition" style={{ ["--accent" as any]: ACCENT }}>
                            Shop
                        </Link>

                        {/* Collections trigger */}
                        <div className="relative">
                            <button
                                ref={triggerRef}
                                onClick={() => setCollectionsOpen((s) => !s)}
                                onMouseEnter={() => {
                                    hoverInsideRef.current = true;
                                    cancelCloseCollections();
                                    setCollectionsOpen(true);
                                }}
                                onMouseLeave={() => {
                                    hoverInsideRef.current = false;
                                    scheduleCloseCollections();
                                }}
                                className="flex items-center gap-2 px-3 py-1 rounded-full font-medium"
                                style={{ color: ACCENT, background: "rgba(6,89,117,0.04)" }}
                                aria-haspopup="true"
                                aria-expanded={collectionsOpen}
                            >
                                Collections <ChevronDown size={14} />
                            </button>

                            <AnimatePresence>
                                {collectionsOpen && mounted && ( // only mount the heavy panel on client to avoid SSR mismatch
                                    <motion.div
                                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                        transition={{ duration: 0.16 }}
                                        className="fixed left-1/2 transform -translate-x-1/2 top-[50px] z-50"
                                        onMouseEnter={() => {
                                            hoverInsideRef.current = true;
                                            cancelCloseCollections();
                                        }}
                                        onMouseLeave={() => {
                                            hoverInsideRef.current = false;
                                            scheduleCloseCollections();
                                        }}
                                    >
                                        <div
                                            ref={panelRef}
                                            className="w-[94vw] max-w-[1100px] bg-white rounded-2xl border shadow-xl"
                                            style={{ maxHeight: "calc(100vh - 8rem)", overflow: "hidden" }}
                                        >
                                            {/* panel header */}
                                            <div className="px-5 py-4 flex items-center justify-between border-b">
                                                <div>
                                                    <div className="text-lg font-semibold" style={{ color: ACCENT }}>Collections</div>
                                                    <div className="text-sm text-slate-500 mt-0.5">{loadingSubsMap ? "Loading…" : `${totalSubCount} sub-collections`}</div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => setCollectionsOpen(false)} className="p-2 rounded-md hover:bg-slate-100 transition" aria-label="Close collections">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* body... (kept same as your original) */}
                                            <div className="flex gap-4 p-4" style={{ minHeight: 220 }}>
                                                {/* left column */}
                                                <div className="w-64 border-r pr-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="text-sm font-medium">Categories</div>
                                                        <div className="text-xs text-slate-400">{categories.length} items</div>
                                                    </div>

                                                    <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 20rem)" }}>
                                                        {loadingCats ? (
                                                            <div className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> Loading…</div>
                                                        ) : catsError ? (
                                                            <div className="text-sm text-rose-600">{catsError}</div>
                                                        ) : categories.length === 0 ? (
                                                            <div className="text-sm text-slate-500">No categories</div>
                                                        ) : (
                                                            <ul className="space-y-1">
                                                                {categories.map((cat) => {
                                                                    const active = selectedCat === cat._id;
                                                                    return (
                                                                        <li key={cat._id}>
                                                                            <button
                                                                                onMouseEnter={() => setSelectedCat(cat._id)}
                                                                                onFocus={() => setSelectedCat(cat._id)}
                                                                                onClick={() => setSelectedCat(cat._id)}
                                                                                className={`w-full text-left px-3 py-2 rounded-md transition flex items-center justify-between ${active ? "bg-[#065975] text-white" : "hover:bg-slate-50"}`}
                                                                            >
                                                                                <span className="text-sm font-medium">{cat.publicName}</span>
                                                                                <span className={`text-xs ${active ? "text-white/80" : "text-slate-400"}`}>{(subsMap[cat._id] || []).length}</span>
                                                                            </button>
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* right content */}
                                                <div className="flex-1 grid grid-cols-3 gap-4 items-start">
                                                    <div className="col-span-1 rounded-md overflow-hidden border" style={{ minHeight: 120 }}>
                                                        <div className="p-4">
                                                            <div className="text-sm font-semibold mb-2">{(() => {
                                                                const c = categories.find(c => c._id === selectedCat);
                                                                return c ? c.publicName : "Featured";
                                                            })()}</div>

                                                            <div className="h-24 rounded-md bg-gradient-to-br from-[rgba(6,89,117,0.06)] to-[rgba(6,89,117,0.02)] flex items-center justify-center text-sm text-slate-600">
                                                                Featured collection imagery
                                                            </div>

                                                            <div className="mt-3 flex gap-2">
                                                                <Link href="/collections" className="px-3 py-1 text-sm rounded-md border" style={{ borderColor: ACCENT, color: ACCENT }}>
                                                                    Browse all
                                                                </Link>
                                                                <Link href="/products" className="px-3 py-1 text-sm rounded-md bg-[color:var(--accent)] text-white" style={{ ["--accent" as any]: ACCENT }}>
                                                                    Shop now
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="col-span-2">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="text-sm font-medium">Sub-collections</div>
                                                            <div className="text-xs text-slate-400">{selectedSubs.length} items</div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2" style={{ maxHeight: "calc(100vh - 22rem)", overflowY: "auto", paddingRight: 6 }}>
                                                            {selectedSubs.length === 0 ? (
                                                                <div className="text-sm text-slate-500 col-span-2">No sub-collections</div>
                                                            ) : (
                                                                selectedSubs.map((s) => (
                                                                    <Link
                                                                        key={s._id}
                                                                        href={`/products?subCategory=${encodeURIComponent(s._id)}`}
                                                                        onClick={() => setCollectionsOpen(false)}
                                                                        className="px-3 py-2 rounded-md border hover:shadow-sm transition bg-white flex items-center"
                                                                    >
                                                                        {s.publicName}
                                                                    </Link>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* footer */}
                                            <div className="px-5 py-3 border-t flex items-center justify-between">
                                                <div className="text-sm text-slate-500">Navigate categories — quick preview mode.</div>
                                                <div className="flex items-center gap-2">
                                                    <Link href="/collections" className="px-3 py-1.5 rounded-md border text-sm font-medium" style={{ borderColor: ACCENT, color: ACCENT }}>
                                                        Browse all
                                                    </Link>
                                                    <Link href="/products" className="px-3 py-1.5 rounded-md bg-[color:var(--accent)] text-white font-medium text-sm" style={{ ["--accent" as any]: ACCENT }}>
                                                        Shop now
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <Link href="/coming_soon" className="flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700 transition"><Tag size={14} /> Sale</Link>
                        <Link href="/coming_soon" className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-[color:var(--accent)] transition" style={{ ["--accent" as any]: ACCENT }}>
                            <Sparkles size={14} /> Inspiration
                        </Link>
                    </nav>

                    {/* right controls */}
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center bg-slate-100 rounded-full px-3 py-1 gap-2">
                            <Search size={14} className="text-slate-600" />
                            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products..." className="bg-transparent outline-none text-sm text-slate-800 placeholder-slate-400 w-44" aria-label="Search products" />
                        </div>

                        <button onClick={() => { /* mobile search */ }} className="sm:hidden p-2 rounded-md hover:bg-slate-100 transition" aria-label="Open search">
                            <Search size={16} />
                        </button>

                        <div className="hidden sm:flex items-center">
                            {/* DeliveryPincodeInput is client-only (dynamically imported with ssr:false) */}
                            {/* Render a stable placeholder when not mounted to keep DOM identical */}
                            {!mounted ? (
                                <div aria-hidden={true} className="w-[160px] h-8 rounded-md bg-transparent" />
                            ) : (
                                <DeliveryPincodeInput />
                            )}
                        </div>

                        <Link href="/cart" className="relative group flex items-center" aria-label="View cart">
                            <button className="p-2 rounded-full hover:bg-slate-100 transition" aria-hidden>
                                <ShoppingCart size={18} />
                            </button>

                            {/* Cart badge: same span node both server and client to avoid node replacement */}
                            <span
                                className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-amber-400 text-slate-900 text-xs flex items-center justify-center font-semibold"
                                style={{ visibility: (mounted && (cartLoading || cartCount > 0)) ? "visible" : "hidden" }}
                                aria-hidden={!mounted}
                            >
                                {mounted ? (cartLoading ? <Spinner size={12} /> : String(cartCount)) : ""}
                            </span>
                        </Link>

                        <div className="hidden md:flex items-center gap-3">
                            {/* To avoid hydration mismatch we only render auth-dependent UI after mount.
                                During SSR we render a stable placeholder of the same node shape. */}
                            {!mounted ? (
                                // stable placeholder area (same DOM footprint)
                                <div className="w-40 h-8 rounded-md bg-transparent" aria-hidden />
                            ) : (
                                <>
                                    {!authReady && <div className="w-6 h-6 flex items-center justify-center"><Spinner size={14} /></div>}

                                    {authReady && !isAuthed && (
                                        <>
                                            <Link href="/login" className="text-sm text-slate-700 hover:text-[color:var(--accent)] transition" style={{ ["--accent" as any]: ACCENT }}>Login</Link>
                                            <Link href="/register" className="px-3 py-1.5 rounded-md" style={{ background: ACCENT, color: "#fff" }}>Register</Link>
                                        </>
                                    )}

                                    {authReady && isAuthed && (
                                        <div className="relative">
                                            <button
                                                ref={accountTriggerRef}
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 transition"
                                                aria-haspopup="true"
                                                onClick={() => setAccountOpen((v) => !v)}
                                            >
                                                <UserIcon size={16} />
                                                <span className="text-sm font-medium">Account</span>
                                                <ChevronDown size={14} />
                                            </button>

                                            <AnimatePresence>
                                                {accountOpen && (
                                                    <motion.div
                                                        ref={accountPanelRef}
                                                        initial={{ opacity: 0, y: -6 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -6 }}
                                                        className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg border z-50 py-2"
                                                    >
                                                        <Link href="/profile" className="block px-4 py-2 text-sm hover:bg-slate-50">Profile</Link>
                                                        <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50">Logout</button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* mobile menu */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden px-4 pb-4 bg-white border-t">
                        <div className="flex flex-col gap-3 text-slate-800">
                            <Link href="/products" className="py-2">Shop</Link>
                            <button onClick={() => setCollectionsOpen(s => !s)} className="py-2 text-left">Collections</button>
                            <Link href="/gifts" className="py-2">Gifts</Link>

                            {/* Match mobile hrefs with desktop to avoid hydration mismatches */}
                            <Link href="/coming_soon" className="py-2 text-rose-600 font-semibold">Sale</Link>
                            <Link href="/coming_soon" className="py-2">Inspiration</Link>

                            <hr className="my-2 border-slate-200" />

                            <Link href="/cart" className="py-2 flex items-center gap-2">
                                <ShoppingCart size={16} />
                                <span>View Cart</span>
                                <span className="ml-1 inline-block w-6 text-center text-sm font-semibold">{mounted ? String(cartCount) : ""}</span>
                            </Link>

                            <div className="py-2">
                                <div className="text-sm font-medium pb-1">Delivery Pincode</div>
                                {/* DeliveryPincodeInput (client-only) - placeholder for SSR */}
                                {!mounted ? (
                                    <div aria-hidden className="w-full h-10 rounded-md bg-transparent" />
                                ) : (
                                    <DeliveryPincodeInput />
                                )}
                            </div>

                            <div className="flex gap-2">
                                {!mounted ? (
                                    <div className="py-2 px-3 rounded-md w-full text-center bg-slate-100">Checking…</div>
                                ) : !authReady ? (
                                    <div className="py-2 px-3 rounded-md w-full text-center bg-slate-100">Checking…</div>
                                ) : !isAuthed ? (
                                    <>
                                        <Link href="/login" className="py-2 px-3 rounded-md w-full text-center bg-slate-100">Login</Link>
                                        <Link href="/register" className="py-2 px-3 rounded-md w-full text-center" style={{ background: ACCENT, color: "#fff" }}>Register</Link>
                                    </>
                                ) : (
                                    <>
                                        <Link href="/dashboard" className="py-2 px-3 rounded-md w-full text-center bg-slate-100">Dashboard</Link>
                                        <button onClick={handleLogout} className="py-2 px-3 rounded-md w-full text-center bg-rose-600 text-white font-semibold">Logout</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}