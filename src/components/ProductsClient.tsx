"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
    ArrowRight,
    PanelLeftClose,
    PanelLeftOpen,
    Heart,
    Search,
    SearchX,
    SlidersHorizontal,
    Sparkles,
    X,
} from "lucide-react";
import ProductGrid from "./ProductGrid";
import Pagination from "./ui/Pagination";
import SidebarFilters from "./SidebarFilters";
import type { Product } from "../types/product";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3000/v1";
type FilterOption = {
    _id: string;
    publicName?: string;
    name?: string;
    productCount?: number;
};
type FilterGroup =
    { selected?: FilterOption[]; unselected?: FilterOption[] } | FilterOption[];
type FilterResponse = {
    productIds?: string[];
    totalProducts?: number;
    masterCategories?: FilterGroup;
    superCategories?: FilterGroup;
    categories?: FilterGroup;
    subCategories?: FilterGroup;
    ageGroups?: FilterGroup;
    themes?: FilterGroup;
};
type FilterResult = {
    key: string;
    data: FilterResponse;
    ids: string[];
    filtered: boolean;
};
const optionsFrom = (group?: FilterGroup) => {
    const values = !group
        ? []
        : Array.isArray(group)
          ? group
          : [...(group.selected ?? []), ...(group.unselected ?? [])];
    return [
        ...new Map(
            values.map((v) => [
                v._id,
                {
                    id: v._id,
                    label: v.publicName || v.name || "Other",
                    count: v.productCount,
                },
            ]),
        ).values(),
    ];
};
const splitIds = (value: string | null) =>
    value?.split(",").filter(Boolean) ?? [];
const parseMoney = (value: string | null): number | "" =>
    value !== null && value !== "" && Number.isFinite(Number(value))
        ? Number(value)
        : "";

export default function ProductsClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const paramsString = searchParams.toString();
    const topRef = useRef<HTMLElement>(null);
    const drawerRef = useRef<HTMLDivElement>(null);
    const reduceMotion = useReducedMotion();
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const perPage = [16, 32, 64].includes(Number(searchParams.get("limit")))
        ? Number(searchParams.get("limit"))
        : 16;
    const q = searchParams.get("q") ?? "";
    const urlMin = searchParams.get("min");
    const urlMax = searchParams.get("max");
    const selectedMasters = splitIds(searchParams.get("master"));
    const selectedSupers = splitIds(searchParams.get("super"));
    const selectedCategories = splitIds(searchParams.get("category"));
    const selectedSubs = splitIds(searchParams.get("sub"));
    const selectedAges = splitIds(searchParams.get("age"));
    const selectedThemes = splitIds(searchParams.get("theme"));
    const inStockOnly = searchParams.get("stock") === "1";
    const [qInput, setQInput] = useState(q);
    const [minPrice, setMinPrice] = useState<number | "">(
        parseMoney(searchParams.get("min")),
    );
    const [maxPrice, setMaxPrice] = useState<number | "">(
        parseMoney(searchParams.get("max")),
    );
    const [filtersOpen, setFiltersOpen] = useState(true);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [sortBy, setSortBy] = useState("latest");
    const [filterResult, setFilterResult] = useState<FilterResult | null>(null);
    const [filtersLoading, setFiltersLoading] = useState(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [loadedOnce, setLoadedOnce] = useState(false);

    const updateUrl = useCallback(
        (updates: Record<string, string | null>, replace = false) => {
            const params = new URLSearchParams(paramsString);
            Object.entries(updates).forEach(([key, value]) =>
                value ? params.set(key, value) : params.delete(key),
            );
            params.delete("page");
            const path = `/products${params.size ? `?${params.toString()}` : ""}`;
            if (replace) router.replace(path, { scroll: false });
            else router.push(path, { scroll: false });
        },
        [paramsString, router],
    );
    const toggleSelection = (key: string, id: string) => {
        const current = splitIds(searchParams.get(key));
        updateUrl({
            [key]: (current.includes(id)
                ? current.filter((v) => v !== id)
                : [...current, id]
            ).join(","),
        });
    };
    const clearAll = () => {
        setQInput("");
        setMinPrice("");
        setMaxPrice("");
        const limit = searchParams.get("limit");
        router.push(`/products${limit ? `?limit=${limit}` : ""}`, {
            scroll: false,
        });
    };

    useEffect(() => {
        setQInput(q);
    }, [q]);
    useEffect(() => {
        setMinPrice(parseMoney(urlMin));
        setMaxPrice(parseMoney(urlMax));
    }, [urlMin, urlMax]);
    useEffect(() => {
        const id = window.setTimeout(() => {
            if (qInput !== q) updateUrl({ q: qInput.trim() || null }, true);
        }, 400);
        return () => clearTimeout(id);
    }, [qInput, q, updateUrl]);
    useEffect(() => {
        const currentMin = parseMoney(urlMin);
        const currentMax = parseMoney(urlMax);
        if (currentMin === minPrice && currentMax === maxPrice) return;
        const id = window.setTimeout(
            () =>
                updateUrl(
                    {
                        min: minPrice === "" ? null : String(minPrice),
                        max: maxPrice === "" ? null : String(maxPrice),
                    },
                    true,
                ),
            450,
        );
        return () => clearTimeout(id);
    }, [minPrice, maxPrice, urlMin, urlMax, updateUrl]);

    const filterKey = [
        q,
        selectedMasters.join(","),
        selectedSupers.join(","),
        selectedCategories.join(","),
        selectedSubs.join(","),
        selectedAges.join(","),
        selectedThemes.join(","),
        inStockOnly ? "1" : "",
        urlMin ?? "",
        urlMax ?? "",
    ].join("|");
    useEffect(() => {
        const controller = new AbortController();
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (selectedMasters.length)
            params.set("masterCategoryIds", selectedMasters.join(","));
        if (selectedSupers.length)
            params.set("superCategoryIds", selectedSupers.join(","));
        if (selectedCategories.length)
            params.set("categoryIds", selectedCategories.join(","));
        if (selectedSubs.length)
            params.set("subCategoryIds", selectedSubs.join(","));
        if (selectedAges.length)
            params.set("ageGroupIds", selectedAges.join(","));
        if (selectedThemes.length)
            params.set("themeIds", selectedThemes.join(","));
        if (inStockOnly) params.set("inStockOnly", "true");
        if (urlMin) params.set("priceFrom", urlMin);
        if (urlMax) params.set("priceTo", urlMax);
        setFiltersLoading(true);
        setError(null);
        (async () => {
            try {
                const res = await fetch(
                    `${API_BASE}/product/sell_product_filter?${params}`,
                    { signal: controller.signal },
                );
                if (!res.ok)
                    throw new Error(
                        "Could not load product filters. Please try again.",
                    );
                const json: FilterResponse = await res.json();
                if (controller.signal.aborted) return;
                setFilterResult({
                    key: filterKey,
                    data: json,
                    ids: Array.isArray(json.productIds) ? json.productIds : [],
                    filtered: params.size > 0,
                });
            } catch (err) {
                if (!controller.signal.aborted) {
                    setFilterResult(null);
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Unable to load filters",
                    );
                }
            } finally {
                if (!controller.signal.aborted) setFiltersLoading(false);
            }
        })();
        return () => controller.abort();
        // filterKey is the stable signature of all filter dependencies.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterKey]);

    const readyFilters = filterResult?.key === filterKey ? filterResult : null;
    useEffect(() => {
        if (!readyFilters) return;
        const controller = new AbortController();
        if (readyFilters.filtered && !readyFilters.ids.length) {
            setProducts([]);
            setTotalRecords(0);
            setProductsLoading(false);
            setLoadedOnce(true);
            return;
        }
        setProductsLoading(true);
        const params = new URLSearchParams({
            page: String(page),
            limit: String(perPage),
        });
        if (readyFilters.ids.length)
            params.set("ids", readyFilters.ids.join(","));
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/product/sell?${params}`, {
                    signal: controller.signal,
                });
                if (!res.ok)
                    throw new Error(
                        "Could not load the collection. Please try again.",
                    );
                const json = await res.json();
                if (controller.signal.aborted) return;
                setProducts(
                    Array.isArray(json.productData) ? json.productData : [],
                );
                setTotalRecords(
                    readyFilters.filtered
                        ? Number(
                              readyFilters.data.totalProducts ??
                                  readyFilters.ids.length,
                          )
                        : Number(json.totalRecords ?? 0),
                );
                setError(null);
            } catch (err) {
                if (!controller.signal.aborted) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Unable to load products",
                    );
                    setProducts([]);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setProductsLoading(false);
                    setLoadedOnce(true);
                }
            }
        })();
        return () => controller.abort();
    }, [readyFilters, page, perPage]);

    const totalPages = Math.ceil(totalRecords / perPage);
    const selectedFilterCount =
        selectedMasters.length +
        selectedSupers.length +
        selectedCategories.length +
        selectedSubs.length +
        selectedAges.length +
        selectedThemes.length +
        Number(inStockOnly) +
        Number(searchParams.has("min")) +
        Number(searchParams.has("max")) +
        Number(Boolean(q));
    const visibleProducts = useMemo(() => {
        const available = inStockOnly
            ? products.filter((p) => Number(p.sellStockQuantity) > 0)
            : products;
        if (sortBy === "latest") return available;
        const price = (p: Product) =>
            Number(
                p.latestSalePrice?.discountedPrice ??
                    p.latestSalePrice?.actualPrice ??
                    0,
            );
        return [...available].sort((a, b) =>
            sortBy === "price-low" ? price(a) - price(b) : price(b) - price(a),
        );
    }, [products, sortBy, inStockOnly]);
    const options: FilterResponse =
        readyFilters?.data ?? filterResult?.data ?? {};
    const filterProps = {
        q: qInput,
        onQChange: setQInput,
        inStockOnly,
        onToggleInStock: () => updateUrl({ stock: inStockOnly ? null : "1" }),
        masterOptions: optionsFrom(options.masterCategories),
        superOptions: optionsFrom(options.superCategories),
        categoryOptions: optionsFrom(options.categories),
        subOptions: optionsFrom(options.subCategories),
        ageOptions: optionsFrom(options.ageGroups),
        themeOptions: optionsFrom(options.themes),
        selectedMasters,
        selectedSupers,
        selectedCategories,
        selectedSubs,
        selectedAges,
        selectedThemes,
        minPrice,
        maxPrice,
        onMinPriceChange: setMinPrice,
        onMaxPriceChange: setMaxPrice,
        priceRangeMin: 0,
        priceRangeMax: 2000,
        onToggleMaster: (id: string) => toggleSelection("master", id),
        onToggleSuper: (id: string) => toggleSelection("super", id),
        onToggleCategory: (id: string) => toggleSelection("category", id),
        onToggleSub: (id: string) => toggleSelection("sub", id),
        onToggleAge: (id: string) => toggleSelection("age", id),
        onToggleTheme: (id: string) => toggleSelection("theme", id),
        onClearAll: clearAll,
    };

    // Lock the document (including iOS Safari) while the mobile filter sheet is open.
    useEffect(() => {
        if (!drawerOpen) return;
        const scrollY = window.scrollY;
        const style = document.body.style;
        const old = {
            position: style.position,
            top: style.top,
            width: style.width,
            overflow: style.overflow,
        };
        style.position = "fixed";
        style.top = `-${scrollY}px`;
        style.width = "100%";
        style.overflow = "hidden";
        const keydown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setDrawerOpen(false);
            if (event.key !== "Tab" || !drawerRef.current) return;
            const els = Array.from(
                drawerRef.current.querySelectorAll<HTMLElement>(
                    "button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]",
                ),
            );
            const first = els[0];
            const last = els[els.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
            }
        };
        document.addEventListener("keydown", keydown);
        drawerRef.current
            ?.querySelector<HTMLButtonElement>("[data-close-filters]")
            ?.focus();
        return () => {
            style.position = old.position;
            style.top = old.top;
            style.width = old.width;
            style.overflow = old.overflow;
            window.scrollTo(0, scrollY);
            document.removeEventListener("keydown", keydown);
        };
    }, [drawerOpen]);
    useEffect(() => {
        if (!drawerOpen) return;
        const query = window.matchMedia("(min-width: 1024px)");
        const closeOnDesktop = () => {
            if (query.matches) setDrawerOpen(false);
        };
        query.addEventListener("change", closeOnDesktop);
        return () => query.removeEventListener("change", closeOnDesktop);
    }, [drawerOpen]);

    const showLoading =
        filtersLoading || productsLoading || (!readyFilters && !error);
    return (
        <div className="w-full min-w-0 pb-8">
            <section
                className="relative mb-5 overflow-hidden rounded-[26px] border border-[#d4eef2] bg-[linear-gradient(115deg,#e5f8fb_0%,#fff9ef_58%,#ffe9e8_100%)] p-5 sm:p-8 lg:p-10"
                aria-label="Shop introduction"
            >
                <div
                    className="pointer-events-none absolute -right-14 -top-24 h-60 w-60 rounded-full border-[40px] border-white/30 sm:h-80 sm:w-80"
                    aria-hidden="true"
                />
                <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                    <div>
                        <p className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.17em] text-[#527683]">
                            <Sparkles size={15} /> Made with love, picked for
                            you
                        </p>
                        <h1 className="mt-3 max-w-3xl text-[clamp(2rem,3.3vw,3.55rem)] font-extrabold leading-[1.07] tracking-[-.052em] text-[#065975]">
                            Find something{" "}
                            <span className="text-[#d04453]">wonderful.</span>
                        </h1>
                        <p className="mt-4 max-w-xl text-sm leading-7 text-[#617b85] sm:text-base">
                            Thoughtful handmade creations, little keepsakes and
                            gifts worth remembering.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#1c5d72]">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/75 px-4 py-2.5">
                            <Heart size={15} /> Handmade charm
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/75 px-4 py-2.5">
                            <Sparkles size={15} /> Curated with care
                        </span>
                    </div>
                </div>
            </section>

            <section
                ref={topRef}
                className="scroll-mt-28"
                aria-label="Browse handmade products"
            >
                <div className="mb-5 rounded-[22px] border border-[#dfedf0] bg-white p-3 shadow-[0_8px_25px_rgba(34,70,45,.04)] sm:p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative min-w-[180px] flex-1 sm:max-w-md">
                            <Search
                                size={17}
                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6f919b]"
                            />
                            <input
                                type="search"
                                aria-label="Search all products"
                                value={qInput}
                                onChange={(e) => setQInput(e.target.value)}
                                placeholder="Search gifts, crochet, collections…"
                                className="site-field !min-h-11 w-full !pl-10 text-sm"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setFiltersOpen((open) => !open)}
                            aria-expanded={filtersOpen}
                            aria-controls="desktop-product-filters"
                            className={`hidden min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition-colors lg:inline-flex ${filtersOpen ? "border-[#065975] bg-[#e6f7f9] text-[#065975]" : "border-[#d4e9ed] text-[#235f75] hover:bg-[#eff9fa]"}`}
                        >
                            {filtersOpen ? (
                                <PanelLeftClose size={17} />
                            ) : (
                                <PanelLeftOpen size={17} />
                            )}
                            Filters
                            {selectedFilterCount > 0 && (
                                <span className="grid min-w-5 place-items-center rounded-full bg-[#065975] px-1 text-xs text-white">
                                    {selectedFilterCount}
                                </span>
                            )}
                            <span className="text-xs font-medium opacity-75">
                                {filtersOpen ? "Hide" : "Show"}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setDrawerOpen(true)}
                            aria-expanded={drawerOpen}
                            aria-controls="mobile-product-filters"
                            className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition-colors lg:hidden ${selectedFilterCount ? "border-[#065975] bg-[#e6f7f9] text-[#065975]" : "border-[#d4e9ed] text-[#235f75] hover:bg-[#eff9fa]"}`}
                        >
                            <SlidersHorizontal size={17} /> Filters
                            {selectedFilterCount > 0 && (
                                <span className="grid min-w-5 place-items-center rounded-full bg-[#065975] px-1 text-xs text-white">
                                    {selectedFilterCount}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={clearAll}
                            disabled={!selectedFilterCount}
                            aria-label="Clear all product filters"
                            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-[#eadbd6] bg-white px-3.5 text-xs font-bold text-[#9a594b] transition-colors hover:bg-[#fff4ef] disabled:cursor-not-allowed disabled:border-[#e6ece4] disabled:text-[#9ea99e] disabled:hover:bg-white sm:text-sm"
                        >
                            <X size={16} /> Clear filters
                            {selectedFilterCount > 0
                                ? ` (${selectedFilterCount})`
                                : ""}
                        </button>
                        <label className="flex min-h-11 items-center gap-2 text-xs text-[#607987] sm:text-sm">
                            <span className="hidden sm:inline">Sort</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                aria-label="Sort products on this page"
                                className="site-field !min-h-11 !px-3 text-xs font-semibold text-[#365846] sm:text-sm"
                            >
                                <option value="latest">Default order</option>
                                <option value="price-low">
                                    Price: low → high (page)
                                </option>
                                <option value="price-high">
                                    Price: high → low (page)
                                </option>
                            </select>
                        </label>
                        <label className="hidden items-center gap-2 text-sm text-[#607987] md:flex">
                            Show{" "}
                            <select
                                aria-label="Products per page"
                                value={perPage}
                                onChange={(e) =>
                                    updateUrl({ limit: e.target.value })
                                }
                                className="site-field !min-h-11 !px-3 text-sm font-semibold"
                            >
                                <option value="16">16</option>
                                <option value="32">32</option>
                                <option value="64">64</option>
                            </select>
                        </label>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#edf1eb] pt-3 text-xs sm:text-sm">
                        <p className="text-[#60766a]">
                            {showLoading && !loadedOnce ? (
                                "Finding lovely things…"
                            ) : totalRecords === 0 ? (
                                "No gifts found"
                            ) : (
                                <>
                                    <strong className="text-[#164c63]">
                                        {Math.min(
                                            (page - 1) * perPage + 1,
                                            totalRecords,
                                        )}
                                        –
                                        {Math.min(page * perPage, totalRecords)}
                                    </strong>{" "}
                                    of{" "}
                                    <strong className="text-[#164c63]">
                                        {totalRecords}
                                    </strong>{" "}
                                    gifts
                                </>
                            )}
                        </p>
                    </div>
                </div>

                {selectedFilterCount > 0 && (
                    <div
                        className="mb-5 flex flex-wrap gap-2"
                        aria-label="Active filters"
                    >
                        {[
                            ...selectedCategories.map((id) => ({
                                id,
                                key: "category",
                                label:
                                    optionsFrom(options.categories).find(
                                        (x) => x.id === id,
                                    )?.label ?? "Category",
                            })),
                            ...selectedThemes.map((id) => ({
                                id,
                                key: "theme",
                                label:
                                    optionsFrom(options.themes).find(
                                        (x) => x.id === id,
                                    )?.label ?? "Collection",
                            })),
                            ...selectedMasters.map((id) => ({
                                id,
                                key: "master",
                                label:
                                    optionsFrom(options.masterCategories).find(
                                        (x) => x.id === id,
                                    )?.label ?? "Family",
                            })),
                            ...selectedSupers.map((id) => ({
                                id,
                                key: "super",
                                label:
                                    optionsFrom(options.superCategories).find(
                                        (x) => x.id === id,
                                    )?.label ?? "Type",
                            })),
                            ...selectedSubs.map((id) => ({
                                id,
                                key: "sub",
                                label:
                                    optionsFrom(options.subCategories).find(
                                        (x) => x.id === id,
                                    )?.label ?? "Style",
                            })),
                            ...selectedAges.map((id) => ({
                                id,
                                key: "age",
                                label:
                                    optionsFrom(options.ageGroups).find(
                                        (x) => x.id === id,
                                    )?.label ?? "Age",
                            })),
                        ].map((chip) => (
                            <button
                                key={`${chip.key}-${chip.id}`}
                                type="button"
                                onClick={() =>
                                    toggleSelection(chip.key, chip.id)
                                }
                                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#bbe6ed] bg-[#e6f7f9] px-3 text-xs font-semibold text-[#065975] transition-colors hover:bg-[#e0eee3]"
                            >
                                {chip.label} <X size={13} />
                            </button>
                        ))}
                        {inStockOnly && (
                            <button
                                type="button"
                                onClick={() => updateUrl({ stock: null })}
                                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#bbe6ed] bg-[#e6f7f9] px-3 text-xs font-semibold text-[#065975]"
                            >
                                In stock <X size={13} />
                            </button>
                        )}
                        {q && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQInput("");
                                    updateUrl({ q: null });
                                }}
                                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#bbe6ed] bg-[#e6f7f9] px-3 text-xs font-semibold text-[#065975]"
                            >
                                “{q}” <X size={13} />
                            </button>
                        )}
                        {(searchParams.has("min") ||
                            searchParams.has("max")) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setMinPrice("");
                                    setMaxPrice("");
                                    updateUrl({ min: null, max: null });
                                }}
                                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#bbe6ed] bg-[#e6f7f9] px-3 text-xs font-semibold text-[#065975]"
                            >
                                Price range <X size={13} />
                            </button>
                        )}
                    </div>
                )}

                <div
                    className={`grid min-w-0 items-start gap-5 xl:gap-7 ${filtersOpen ? "lg:grid-cols-[276px_minmax(0,1fr)] 2xl:grid-cols-[304px_minmax(0,1fr)]" : "grid-cols-1"}`}
                >
                    {filtersOpen && (
                        <motion.aside
                            id="desktop-product-filters"
                            aria-label="Product filters"
                            initial={
                                reduceMotion ? false : { opacity: 0, x: -12 }
                            }
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.22 }}
                            className="hidden min-w-0 rounded-[24px] border border-[#deedef] bg-white p-4 shadow-[0_12px_35px_rgba(32,60,42,.05)] lg:block xl:p-5"
                        >
                            <div className="mb-4 flex items-center justify-between border-b border-[#edf2eb] pb-4">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#9c7964]">
                                        Refine your search
                                    </p>
                                    <h2 className="mt-1 text-lg font-extrabold tracking-tight text-[#065975]">
                                        Filter by
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFiltersOpen(false)}
                                    aria-label="Hide sidebar filters"
                                    className="site-icon-button !min-h-9 !min-w-9 !rounded-xl"
                                >
                                    <PanelLeftClose size={18} />
                                </button>
                            </div>
                            <SidebarFilters
                                {...filterProps}
                                variant="sidebar"
                            />
                        </motion.aside>
                    )}
                    <div className="min-w-0">
                        {error ? (
                            <div
                                role="alert"
                                className="rounded-[24px] border border-rose-200 bg-white px-6 py-16 text-center"
                            >
                                <SearchX
                                    size={34}
                                    className="mx-auto text-rose-400"
                                />
                                <h2 className="mt-3 text-lg font-bold text-[#254b3a]">
                                    We couldn’t load the gifts
                                </h2>
                                <p className="mt-2 text-sm text-[#718274]">
                                    {error}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => window.location.reload()}
                                    className="site-button-primary mt-5"
                                >
                                    Try again
                                </button>
                            </div>
                        ) : (
                            <div
                                className="relative min-h-40"
                                aria-busy={showLoading}
                            >
                                {showLoading && (
                                    <div className="absolute inset-0 z-10 grid place-items-start justify-center rounded-[20px] bg-[#fffaf6]/65 pt-20 backdrop-blur-[2px]">
                                        <span className="inline-flex items-center gap-2 rounded-full border border-[#d9e8da] bg-white px-5 py-3 text-sm font-semibold text-[#315a43] shadow-md">
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#065975] border-t-transparent" />{" "}
                                            Updating gifts…
                                        </span>
                                    </div>
                                )}
                                {!loadedOnce ? (
                                    <div
                                        className={`grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 ${filtersOpen ? "lg:grid-cols-3 2xl:grid-cols-4" : "lg:grid-cols-4 2xl:grid-cols-5"}`}
                                    >
                                        {Array.from({ length: 10 }, (_, i) => (
                                            <div
                                                key={i}
                                                className="aspect-[3/4] animate-pulse rounded-[22px] bg-[#e7eee5]"
                                            />
                                        ))}
                                    </div>
                                ) : !showLoading && !visibleProducts.length ? (
                                    <div className="rounded-[24px] border border-[#dbecf0] bg-white px-6 py-16 text-center">
                                        <SearchX
                                            className="mx-auto text-[#71967d]"
                                            size={40}
                                        />
                                        <h2 className="mt-4 text-xl font-bold text-[#065975]">
                                            No gifts match just yet
                                        </h2>
                                        <p className="mt-2 text-sm text-[#6f8273]">
                                            Try another collection, or clear a
                                            filter to see more.
                                        </p>
                                        <button
                                            onClick={clearAll}
                                            className="site-button-primary mt-6"
                                        >
                                            Explore all gifts{" "}
                                            <ArrowRight size={17} />
                                        </button>
                                    </div>
                                ) : (
                                    <ProductGrid
                                        products={visibleProducts}
                                        sidebarOpen={filtersOpen}
                                    />
                                )}
                            </div>
                        )}
                        {sortBy !== "latest" && (
                            <p className="mt-4 text-xs text-[#718275]">
                                Price sorting applies to items on this page, not
                                the entire catalogue.
                            </p>
                        )}
                        {!showLoading && totalPages > 1 && (
                            <div className="mt-10 flex justify-center">
                                <Pagination
                                    page={page}
                                    totalPages={totalPages}
                                    onPageChange={(next) => {
                                        const params = new URLSearchParams(
                                            paramsString,
                                        );
                                        params.set("page", String(next));
                                        router.push(`/products?${params}`);
                                        topRef.current?.scrollIntoView({
                                            behavior: reduceMotion
                                                ? "auto"
                                                : "smooth",
                                            block: "start",
                                        });
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <AnimatePresence>
                {drawerOpen && (
                    <motion.div
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[80] lg:hidden"
                        id="mobile-product-filters"
                    >
                        <div
                            className="absolute inset-0 bg-[#0f2d23]/55 backdrop-blur-[2px]"
                            onClick={() => setDrawerOpen(false)}
                            aria-hidden="true"
                        />
                        <motion.div
                            ref={drawerRef}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="filter-drawer-title"
                            initial={reduceMotion ? false : { x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ duration: 0.23 }}
                            className="absolute inset-y-0 right-0 flex h-[100dvh] w-full max-w-[520px] min-w-0 flex-col overflow-hidden bg-[#fffaf6] shadow-2xl"
                        >
                            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e0e9df] bg-white px-5 py-4">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#7b977f]">
                                        Personalize your picks
                                    </p>
                                    <h2
                                        id="filter-drawer-title"
                                        className="mt-1 text-xl font-extrabold text-[#065975]"
                                    >
                                        Filter gifts
                                    </h2>
                                </div>
                                <button
                                    data-close-filters
                                    type="button"
                                    onClick={() => setDrawerOpen(false)}
                                    aria-label="Close filters"
                                    className="site-icon-button !rounded-full !bg-[#f0f5ef]"
                                >
                                    <X size={22} />
                                </button>
                            </div>
                            <div
                                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5"
                                style={{
                                    WebkitOverflowScrolling: "touch",
                                    overscrollBehavior: "contain",
                                }}
                            >
                                <SidebarFilters {...filterProps} />
                            </div>
                            <div className="shrink-0 border-t border-[#e1eade] bg-white px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-[0_-6px_24px_rgba(24,58,38,.05)]">
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={clearAll}
                                        className="site-button-outline !min-h-12 flex-1"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDrawerOpen(false)}
                                        className="site-button-primary !min-h-12 flex-[1.5]"
                                    >
                                        Show {totalRecords} gifts{" "}
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}