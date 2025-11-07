"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, FileText, Sliders } from "lucide-react";
import Pagination from "../components/ui/Pagination";

type ApiOrderProduct = {
    productId: string;
    productNameSnapshot: string;
    quantity: number;
    sellPrice: number;
    productImage?: string | null;
};

type ApiOrder = {
    _id: string;
    orderNumber: number | string;
    quotedDeliveryCharge?: number;
    orderTotal: number;
    purchaseDate: string;
    orderId?: string;
    orderProductsDetails: ApiOrderProduct[];
};

const TOKEN_KEY = "accessToken";

function getStoredAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

async function authFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    const token = getStoredAccessToken();
    const headers = new Headers(init?.headers ?? {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (!headers.get("Content-Type")) headers.set("Content-Type", "application/json");
    return fetch(input, { ...init, headers });
}

function currency(n: number) {
    return `₹${n.toLocaleString("en-IN")}`;
}

function monthKey(iso?: string) {
    if (!iso) return "Unknown";
    const d = new Date(iso);
    return d.toLocaleString("en-IN", { month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

function formatShortDate(iso?: string) {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

function aggregateProducts(products: ApiOrderProduct[] = []) {
    const map = new Map<string, ApiOrderProduct>();
    for (const p of products) {
        const id = p.productId ?? p.productNameSnapshot;
        if (!map.has(id)) map.set(id, { ...p });
        else {
            const ex = map.get(id)!;
            ex.quantity = (ex.quantity ?? 0) + (p.quantity ?? 0);
        }
    }
    return Array.from(map.values());
}

export default function OrdersCompact({
    customerId = "",
    apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000",
}: {
    customerId?: string;
    apiBase?: string;
}) {
    const [orders, setOrders] = useState<ApiOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [query, setQuery] = useState("");
    const [refreshToggle, setRefreshToggle] = useState(0);

    // Pagination
    const [page, setPage] = useState(1);
    const perPageOptions = [5, 10, 20];
    const [perPage, setPerPage] = useState<number>(5);

    // Filters UI
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [dateFrom, setDateFrom] = useState<string | "">("");
    const [dateTo, setDateTo] = useState<string | "">("");
    const [minItems, setMinItems] = useState<number | "">("");
    const [minTotal, setMinTotal] = useState<number | "">("");

    useEffect(() => {
        let mounted = true;
        async function fetchOrders() {
            setLoading(true);
            setError(null);
            try {
                const url = `${apiBase.replace(/\/$/, "")}/sell_order/orders?customerId=${encodeURIComponent(customerId)}`;
                const res = await authFetch(url, { method: "GET" });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = (await res.json().catch(() => ({}))) as any;
                if (!mounted) return;
                if (json.ack !== "success") throw new Error(json.message ?? "API ack != success");
                setOrders(Array.isArray(json.data) ? json.data : (json || []));
            } catch (err: any) {
                setError(err?.message ?? "Failed to fetch orders");
            } finally {
                if (mounted) setLoading(false);
            }
        }
        if (customerId) fetchOrders();
        return () => {
            mounted = false;
        };
    }, [customerId, apiBase, refreshToggle]);

    // Apply search + filter logic
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        let list = orders.slice();

        // search by order number / product name
        if (q) {
            list = list.filter(
                (o) =>
                    (o.orderNumber + "").toLowerCase().includes(q) ||
                    o.orderProductsDetails.some((p) => p.productNameSnapshot.toLowerCase().includes(q))
            );
        }

        // date filters (inclusive)
        if (dateFrom) {
            const fromMs = Date.parse(dateFrom);
            if (!Number.isNaN(fromMs)) {
                list = list.filter((o) => Date.parse(o.purchaseDate) >= fromMs);
            }
        }
        if (dateTo) {
            // include the whole day by adding 1 day to dateTo end
            const toMs = Date.parse(dateTo);
            if (!Number.isNaN(toMs)) {
                const endOfDay = toMs + 24 * 60 * 60 * 1000 - 1;
                list = list.filter((o) => Date.parse(o.purchaseDate) <= endOfDay);
            }
        }

        // min items filter (sum of quantities)
        if (minItems !== "") {
            const min = Number(minItems) || 0;
            list = list.filter((o) => {
                const cnt = (o.orderProductsDetails || []).reduce((s, p) => s + (Number(p.quantity ?? 0) || 0), 0);
                return cnt >= min;
            });
        }

        // min total (items subtotal from API or computed)
        if (minTotal !== "") {
            const min = Number(minTotal) || 0;
            list = list.filter((o) => {
                const apiItemsTotal = Number(o.orderTotal ?? 0);
                const computedItemsTotal = (o.orderProductsDetails || []).reduce(
                    (s, p) => s + (Number(p.sellPrice ?? 0) * Number(p.quantity ?? 0)),
                    0
                );
                const itemsTotal = apiItemsTotal || computedItemsTotal;
                return itemsTotal >= min;
            });
        }

        // sort by latest
        list.sort((a, b) => Number(new Date(b.purchaseDate)) - Number(new Date(a.purchaseDate)));

        return list;
    }, [orders, query, dateFrom, dateTo, minItems, minTotal]);

    // reset page when filters/search/perPage change
    useEffect(() => {
        setPage(1);
    }, [query, dateFrom, dateTo, minItems, minTotal, perPage, orders]);

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    // slice for current page
    const pageItems = useMemo(() => {
        const start = (page - 1) * perPage;
        return filtered.slice(start, start + perPage);
    }, [filtered, page, perPage]);

    // build grouped from pageItems
    const grouped = useMemo(() => {
        const map = new Map<string, ApiOrder[]>();
        pageItems.forEach((o) => {
            const key = monthKey(o.purchaseDate);
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(o);
        });
        const sorted = Array.from(map.entries()).sort((a, b) => {
            const ad = new Date(a[1][0]?.purchaseDate || 0).getTime();
            const bd = new Date(b[1][0]?.purchaseDate || 0).getTime();
            return bd - ad;
        });
        return sorted.map(([month, arr]) => ({ month, orders: arr }));
    }, [pageItems]);

    const clearFilters = () => {
        setDateFrom("");
        setDateTo("");
        setMinItems("");
        setMinTotal("");
    };

    return (
        <section className="bg-white rounded-2xl p-6 shadow-md border border-slate-100">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Orders</h2>
                    <p className="text-sm text-slate-500">Recent purchases and quick actions</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-80">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <Search className="w-4 h-4" />
                        </span>
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search order #, product..."
                            aria-label="Search orders"
                            className="pl-10 pr-3 py-2 w-full rounded-full bg-slate-50 border border-slate-100 focus:ring-2 focus:ring-opacity-50 focus:ring-slate-200 text-sm outline-none"
                        />
                    </div>

                    {/* Filters button replaces the Refresh button */}
                    <button
                        onClick={() => setFiltersOpen((s) => !s)}
                        title="Filters"
                        className="flex items-center gap-2 rounded-full px-3 py-2 bg-gradient-to-r from-[#08607b] to-[#045a66] text-white shadow-sm hover:opacity-95 transition text-sm"
                    >
                        <Sliders className="w-4 h-4" />
                        <span className="hidden md:inline">Filters</span>
                    </button>
                </div>
            </header>

            {/* Filter panel (simple slide-over style) */}
            {filtersOpen && (
                <div className="mt-4">
                    <div className="bg-white border rounded-lg p-4 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-xs text-slate-600">Date from</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="mt-1 w-full text-sm px-2 py-1 border rounded-md"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-slate-600">Date to</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="mt-1 w-full text-sm px-2 py-1 border rounded-md"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-slate-600">Min items</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={minItems as any}
                                    onChange={(e) => setMinItems(e.target.value === "" ? "" : Number(e.target.value))}
                                    className="mt-1 w-full text-sm px-2 py-1 border rounded-md"
                                    placeholder="e.g. 2"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-slate-600">Min total (₹)</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={minTotal as any}
                                    onChange={(e) => setMinTotal(e.target.value === "" ? "" : Number(e.target.value))}
                                    className="mt-1 w-full text-sm px-2 py-1 border rounded-md"
                                    placeholder="e.g. 200"
                                />
                            </div>
                        </div>

                        <div className="mt-3 flex items-center gap-3">
                            <button
                                onClick={() => {
                                    // close and keep filters applied (they already apply live)
                                    setFiltersOpen(false);
                                }}
                                className="px-3 py-1 rounded-md bg-[#065975] text-white text-sm"
                            >
                                Apply
                            </button>

                            <button
                                onClick={() => {
                                    clearFilters();
                                    setFiltersOpen(false);
                                }}
                                className="px-3 py-1 rounded-md border text-sm"
                            >
                                Clear
                            </button>

                            <div className="text-sm text-slate-500 ml-auto">
                                {total} orders, showing {pageItems.length}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-6 space-y-6">
                {/* Top pagination/status row */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="text-sm text-slate-600">
                        Showing <span className="font-medium">{pageItems.length}</span> of <span className="font-medium">{total}</span> orders
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="text-xs text-slate-500 hidden sm:inline">Per page</label>
                        <select
                            value={perPage}
                            onChange={(e) => {
                                setPerPage(Number(e.target.value));
                                setPage(1);
                            }}
                            className="text-sm px-2 py-1 border rounded-md bg-white"
                        >
                            {perPageOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading && (
                    <div className="grid gap-4">
                        {Array.from({ length: perPage }).map((_, i) => (
                            <div key={i} className="animate-pulse flex items-center justify-between gap-4 bg-slate-50 p-4 rounded-lg">
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-1/3 bg-slate-200 rounded" />
                                    <div className="h-3 w-1/2 bg-slate-200 rounded mt-2" />
                                </div>
                                <div className="w-24 h-6 bg-slate-200 rounded" />
                            </div>
                        ))}
                    </div>
                )}

                {!loading && error && <div className="text-sm text-rose-600">Error: {error}</div>}

                {!loading && !error && pageItems.length === 0 && (
                    <div className="p-6 border rounded-lg bg-gradient-to-br from-slate-50 to-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="text-lg font-semibold">No orders found</div>
                            <div className="text-sm text-slate-500 mt-1">Try adjusting filters or search.</div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setRefreshToggle((s) => s + 1)} className="px-4 py-2 rounded-full bg-[#065975] text-white">
                                Refresh
                            </button>
                        </div>
                    </div>
                )}

                {!loading &&
                    !error &&
                    grouped.map((grp) => (
                        <div key={grp.month}>
                            <h3 className="text-sm font-semibold text-slate-600 mb-3">{grp.month}</h3>
                            <div className="space-y-3">
                                {grp.orders
                                    .sort((a, b) => Number(new Date(b.purchaseDate)) - Number(new Date(a.purchaseDate)))
                                    .map((o) => {
                                        const id = o.orderId ?? o._id;
                                        const aggregated = aggregateProducts(o.orderProductsDetails || []);
                                        const collapsedPreview = aggregated.slice(0, 4); // show up to 4 items
                                        const extra = Math.max(0, aggregated.length - collapsedPreview.length);
                                        const isExpanded = !!expanded[id];

                                        // Use API totals, falling back to computed items total as sanity check
                                        const apiItemsTotal = Number(o.orderTotal ?? 0);
                                        const computedItemsTotal = (o.orderProductsDetails || []).reduce(
                                            (s, p) => s + (Number(p.sellPrice ?? 0) * Number(p.quantity ?? 0)),
                                            0
                                        );
                                        const itemsTotal = apiItemsTotal || computedItemsTotal;
                                        const delivery = Number(o.quotedDeliveryCharge ?? 0);
                                        const grandTotal = itemsTotal + delivery;

                                        // total number of pieces in the order
                                        const totalItemsCount = (o.orderProductsDetails || []).reduce((s, p) => s + (Number(p.quantity ?? 0) || 0), 0);
                                        // also derive from aggregated to be safe (aggregated sums duplicates)
                                        const aggTotalCount = aggregated.reduce((s, p) => s + (Number(p.quantity ?? 0) || 0), 0);
                                        const totalCount = Math.max(totalItemsCount, aggTotalCount);

                                        return (
                                            <article
                                                key={id}
                                                className="group bg-white border rounded-lg p-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-start hover:shadow-lg transition cursor-pointer"
                                                onClick={() => setExpanded((s) => ({ ...s, [id]: !s[id] }))}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") setExpanded((s) => ({ ...s, [id]: !s[id] }));
                                                }}
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="text-sm font-semibold">Order #{o.orderNumber}</div>
                                                        <div className="text-xs text-slate-500">{formatShortDate(o.purchaseDate)}</div>
                                                    </div>

                                                    {!isExpanded && (
                                                        // COLLAPSED: show products stacked vertically (one below the other)
                                                        <div className="mt-3 space-y-2">
                                                            {collapsedPreview.map((p, i) => {
                                                                const href = p.productId
                                                                    ? `/products/${encodeURIComponent(String(p.productId))}`
                                                                    : `/products/search?q=${encodeURIComponent(p.productNameSnapshot)}`;

                                                                return (
                                                                    <Link
                                                                        href={href}
                                                                        key={`${p.productId ?? p.productNameSnapshot}-${i}`}
                                                                        onClick={(e) => {
                                                                            // prevent toggling the order expand when user clicks product link
                                                                            e.stopPropagation();
                                                                        }}
                                                                        className="flex items-center gap-3 bg-slate-50 px-3 py-2 rounded-lg border hover:bg-slate-100 transition"
                                                                    >
                                                                        <div className="w-12 h-12 rounded overflow-hidden relative bg-white border flex-shrink-0">
                                                                            {p.productImage ? (
                                                                                <Image src={p.productImage} alt={p.productNameSnapshot} fill sizes="48px" style={{ objectFit: "cover" }} />
                                                                            ) : (
                                                                                <div className="w-full h-full grid place-items-center text-xs text-slate-500">No image</div>
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            {/* allow wrapping for long names */}
                                                                            <div className="text-sm font-medium break-words leading-tight">{p.productNameSnapshot}</div>
                                                                            <div className="text-xs text-slate-500">Qty {p.quantity} • {currency(p.sellPrice * p.quantity)}</div>
                                                                        </div>
                                                                    </Link>
                                                                );
                                                            })}
                                                            {extra > 0 && (
                                                                <div className="flex items-center justify-center text-sm text-slate-500 px-3 py-2 rounded-lg bg-slate-50 border">
                                                                    +{extra} more
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {isExpanded && (
                                                        // EXPANDED: stack all products vertically
                                                        <div className="mt-3 text-sm text-slate-700 space-y-2">
                                                            {aggregated.map((p, i) => {
                                                                const href = p.productId
                                                                    ? `/products/${encodeURIComponent(String(p.productId))}`
                                                                    : `/products/search?q=${encodeURIComponent(p.productNameSnapshot)}`;

                                                                return (
                                                                    <Link
                                                                        href={href}
                                                                        key={`${p.productId ?? p.productNameSnapshot}-expanded-${i}`}
                                                                        onClick={(e) => {
                                                                            // prevent toggling the order expand when user clicks product link
                                                                            e.stopPropagation();
                                                                        }}
                                                                        className="flex items-center gap-3 bg-slate-50 px-3 py-2 rounded-lg border hover:bg-slate-100 transition"
                                                                    >
                                                                        <div className="w-12 h-12 rounded overflow-hidden relative bg-white border flex-shrink-0">
                                                                            {p.productImage ? (
                                                                                <Image src={p.productImage} alt={p.productNameSnapshot} fill sizes="48px" style={{ objectFit: "cover" }} />
                                                                            ) : (
                                                                                <div className="w-full h-full grid place-items-center text-xs text-slate-500">No image</div>
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            {/* allow wrapping for long names */}
                                                                            <div className="text-sm font-medium break-words leading-tight">{p.productNameSnapshot}</div>
                                                                            <div className="text-xs text-slate-500">Qty {p.quantity} • {currency(p.sellPrice * p.quantity)}</div>
                                                                        </div>
                                                                    </Link>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* ---- Totals / Invoice aside (aligned + compact) ---- */}
                                                <aside className="flex flex-col items-end justify-between gap-3 md:gap-4">
                                                    <div className="w-full md:w-44 bg-slate-50 border rounded-lg p-3 text-sm">
                                                        {/* Top row: Items label + count on left, subtotal on right (horizontal alignment) */}
                                                        <div className="flex justify-between items-center">
                                                            <div className="text-xs text-slate-600">
                                                                <div className="font-medium">Items <span className="text-xs text-slate-500">({totalCount})</span></div>
                                                            </div>
                                                            <div className="text-slate-800 font-medium">{currency(itemsTotal)}</div>
                                                        </div>

                                                        {/* Delivery row */}
                                                        <div className="flex justify-between items-center text-slate-600 mt-2">
                                                            <span className="text-xs">Delivery</span>
                                                            <span className="font-medium text-slate-800">
                                                                {delivery > 0 ? currency(delivery) : "—"}
                                                            </span>
                                                        </div>

                                                        <hr className="my-2 border-slate-200" />

                                                        <div className="flex justify-between items-center text-slate-700 font-semibold">
                                                            <span className="text-sm">Total</span>
                                                            <span className="text-[#065975] text-sm font-bold">{currency(grandTotal)}</span>
                                                        </div>

                                                        {/* optional: show if API total mismatches computed total */}
                                                        {apiItemsTotal && apiItemsTotal !== computedItemsTotal && (
                                                            <div className="mt-1 text-xs text-rose-600">Note: subtotal mismatch</div>
                                                        )}
                                                    </div>

                                                    <div className="w-full">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                alert(`Invoice for #${o.orderNumber} (mock)`);
                                                            }}
                                                            className="w-full flex items-center justify-center gap-2 p-2 rounded-md bg-[#065975] text-white hover:bg-[#05485c] transition font-medium"
                                                            title="Invoice"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                            <span>View Invoice</span>
                                                        </button>
                                                    </div>
                                                </aside>
                                            </article>
                                        );
                                    })}
                            </div>
                        </div>
                    ))}

                {/* Pagination controls */}
                {!loading && !error && total > 0 && (
                    <div className="mt-6 flex items-center justify-center">
                        <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
                    </div>
                )}
            </div>
        </section>
    );
}