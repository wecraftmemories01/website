"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";

/* --------------------- Helpers --------------------- */
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
    if (init?.body && !headers.get("Content-Type")) headers.set("Content-Type", "application/json");
    return fetch(input, { ...init, headers });
}
function currency(n?: number) {
    let v = Number(n ?? 0);
    if (isNaN(v)) v = 0;
    return `₹${v.toLocaleString("en-IN")}`;
}
function formatFullDate(iso?: string) {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
    });
}

/* --------------------- Inline Icons --------------------- */
const IconBack = () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
);

/* --------------------- Types --------------------- */
type ApiOrderProduct = {
    productId?: string | null;
    productNameSnapshot: string;
    quantity: number;
    sellPrice: number;
    productImage?: string | null;
};
type PaymentField = { key: string; value: string };
type PaymentMethod = {
    paymentMethodNameSnapshot: string;
    amount: number;
    date?: string | null;
    paymentNotes?: string | null;
    fields?: PaymentField[] | null;
};
type AddressSnapshot = {
    recipientNameSnapshot?: string | null;
    recipientContactSnapshot?: string | null;
    addressLine1Snapshot?: string | null;
    addressLine2Snapshot?: string | null;
    addressLine3Snapshot?: string | null;
    landmarkSnapshot?: string | null;
    countryNameSnapshot?: string | null;
    stateNameSnapshot?: string | null;
    cityNameSnapshot?: string | null;
    pincodeSnapshot?: string | null;
};
type ApiOrder = {
    _id: string;
    orderNumber: number | string;
    quotedDeliveryCharge?: number;
    orderTotal?: number;
    purchaseDate?: string;
    orderCustomerAddressDetails?: {
        deliveryAddress?: AddressSnapshot;
        billingAddress?: AddressSnapshot;
    };
    orderProductsDetails?: ApiOrderProduct[];
    paymentMethods?: PaymentMethod[] | null;
    customerSnapshot?: { customerNameSnapshot?: string; customerMobileSnapshot?: string; customerEmailSnapshot?: string };
};

/* --------------------- Component --------------------- */
export default function OrderDetails({
    customerId,
    orderId,
    apiBase = process.env.NEXT_PUBLIC_API_BASE,
}: {
    customerId: string;
    orderId: string;
    apiBase?: string;
}) {
    const [order, setOrder] = useState<ApiOrder | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!customerId || !orderId) return;
        let mounted = true;
        const controller = new AbortController();

        async function fetchOrder() {
            setLoading(true);
            setError(null);
            try {
                const base = apiBase.replace(/\/$/, "");
                const params = new URLSearchParams();
                params.set("customerId", customerId);
                params.set("orderId", orderId);
                const url = `${base}/sell_order/order_details?${params.toString()}`;

                const res = await authFetch(url, { method: "GET", signal: controller.signal });

                // Redirect on 401 unauthorized (keeps UX smooth)
                if (res.status === 401) {
                    try {
                        localStorage.removeItem(TOKEN_KEY);
                    } catch { }
                    window.location.href = "/login";
                    return;
                }

                if (!res.ok) {
                    const txt = await res.text().catch(() => "");
                    throw new Error(`HTTP ${res.status} ${res.statusText} ${txt}`);
                }

                const payload = await res.json().catch(() => ({} as any));
                if (!mounted) return;
                if (payload?.ack !== "success" || !payload?.data) {
                    throw new Error(payload?.message ?? "Unexpected API response");
                }
                setOrder(payload.data as ApiOrder);
            } catch (err: any) {
                if (err.name === "AbortError") return;
                // eslint-disable-next-line no-console
                console.error("Order fetch error", err);
                setError(err?.message ?? "Failed to load order");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchOrder();
        return () => {
            mounted = false;
            controller.abort();
        };
    }, [customerId, orderId, apiBase]);

    const products = order?.orderProductsDetails ?? [];
    const itemsSubtotal = useMemo(() => {
        return products.reduce((s, p) => s + (Number(p.sellPrice ?? 0) * Number(p.quantity ?? 0)), 0);
    }, [products]);

    const delivery = Number(order?.quotedDeliveryCharge ?? 0);
    const displayedTotal = itemsSubtotal + delivery;
    const serverItemTotal = typeof order?.orderTotal !== "undefined" ? Number(order!.orderTotal) : undefined;

    const renderAddress = (a?: AddressSnapshot | null) => {
        if (!a) return <div className="text-sm text-slate-500">—</div>;
        const lines: (string | null | undefined)[] = [
            a.recipientNameSnapshot ?? null,
            a.recipientContactSnapshot ? `Contact: ${a.recipientContactSnapshot}` : null,
            a.addressLine1Snapshot ?? null,
            a.addressLine2Snapshot ?? null,
            a.addressLine3Snapshot ?? null,
            a.landmarkSnapshot ? `Landmark: ${a.landmarkSnapshot}` : null,
            [a.cityNameSnapshot, a.stateNameSnapshot, a.pincodeSnapshot].filter(Boolean).join(", ") || null,
            a.countryNameSnapshot ?? null,
        ];
        const filled = lines.filter((l) => l && String(l).trim() !== "");
        if (filled.length === 0) return <div className="text-sm text-slate-500">—</div>;
        return (
            <div className="text-sm text-slate-700 space-y-1">
                {filled.map((line, idx) => (
                    <div key={idx}>{line}</div>
                ))}
            </div>
        );
    };

    /* ---------------- Payment method parsing ----------------
       We parse paymentMethods[].fields looking for key === "method"
       Fallback to paymentMethodNameSnapshot when "method" is absent.
    ---------------------------------------------------------*/
    const paymentMethodsRaw: PaymentMethod[] = Array.isArray(order?.paymentMethods) ? (order?.paymentMethods as PaymentMethod[]) : [];
    const paymentAggregates = useMemo(() => {
        // Map methodLabel -> { amount, statusSet }
        const map = new Map<
            string,
            { amount: number; statuses: Set<string>; sources: string[] }
        >();

        for (const pm of paymentMethodsRaw) {
            const amount = Number(pm.amount ?? 0);
            let methodLabel = pm.paymentMethodNameSnapshot ?? "Other";
            let status = "";

            if (Array.isArray(pm.fields)) {
                for (const f of pm.fields) {
                    if (!f) continue;
                    const k = String(f.key ?? "").toLowerCase();
                    const v = String(f.value ?? "").trim();
                    if (k === "method" && v) {
                        methodLabel = v; // e.g. "card", "upi"
                    }
                    if (k === "status" && v) {
                        status = v; // e.g. "captured"
                    }
                }
            }

            const existing = map.get(methodLabel) ?? { amount: 0, statuses: new Set<string>(), sources: [] };
            existing.amount += amount;
            if (status) existing.statuses.add(status);
            existing.sources.push(pm.paymentMethodNameSnapshot ?? "");
            map.set(methodLabel, existing);
        }

        // convert to array preserving insertion order
        const arr: { method: string; amount: number; statuses: string[]; sources: string[] }[] = [];
        for (const [method, obj] of map.entries()) {
            arr.push({ method, amount: obj.amount, statuses: Array.from(obj.statuses), sources: obj.sources });
        }
        return arr;
    }, [paymentMethodsRaw]);

    // totals
    const totalPaid = paymentMethodsRaw.reduce((s, p) => s + Number(p.amount ?? 0), 0);
    const balance = Math.max(0, displayedTotal - totalPaid);

    /* ----- loading / error / empty states ----- */
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="p-6 bg-white rounded-2xl border shadow w-full max-w-4xl">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 w-2/3 bg-slate-200 rounded" />
                        <div className="h-48 bg-slate-200 rounded" />
                        <div className="h-6 bg-slate-200 rounded" />
                    </div>
                </div>
            </div>
        );
    }
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="max-w-3xl w-full bg-white rounded-2xl p-6 shadow">
                    <div className="text-rose-600 font-medium">Error: {error}</div>
                </div>
            </div>
        );
    }
    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="max-w-3xl w-full bg-white rounded-2xl p-6 shadow text-slate-600">No order selected.</div>
            </div>
        );
    }

    const customer = order.customerSnapshot ?? { customerNameSnapshot: "—", customerMobileSnapshot: "—", customerEmailSnapshot: "—" };

    /* --------------------- Render full-page layout --------------------- */
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#f7fbfd] to-slate-50">
            {/* Topbar */}
            <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-slate-100">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.history.back()}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
                            aria-label="Back"
                        >
                            <IconBack />
                            <span className="text-sm text-slate-700">Back</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Invoice button removed as requested */}
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-6xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Details & summary */}
                    <aside className="lg:col-span-4 space-y-6">
                        <div className="bg-white border rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-slate-500">Purchased</div>
                                    <div className="text-lg font-semibold text-slate-900">{formatFullDate(order.purchaseDate)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-slate-500">Status</div>
                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${balance > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                                        {balance > 0 ? "Pending" : "Paid"}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 border-t pt-4">
                                <div className="text-xs text-slate-500">Customer</div>
                                <div className="mt-2 flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#065975] to-slate-700 grid place-items-center text-white font-bold text-lg">
                                        {customer.customerNameSnapshot ? String(customer.customerNameSnapshot).charAt(0).toUpperCase() : "U"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-slate-900 truncate">{customer.customerNameSnapshot ?? "—"}</div>
                                        <div className="text-xs text-slate-500 mt-1 truncate">{customer.customerMobileSnapshot ?? "—"}</div>
                                        <div className="text-xs text-slate-500 mt-1 truncate">{customer.customerEmailSnapshot ?? "—"}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Delivery address */}
                        <div className="bg-white border rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <div className="font-bold text-slate-800">Delivery Address</div>
                                <div className="text-xs text-slate-400">{order.orderCustomerAddressDetails?.deliveryAddress?.recipientContactSnapshot ?? ""}</div>
                            </div>
                            <div className="text-sm text-slate-700">{renderAddress(order.orderCustomerAddressDetails?.deliveryAddress)}</div>
                        </div>

                        {/* Billing address */}
                        <div className="bg-white border rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <div className="font-bold text-slate-800">Billing Address</div>
                                <div className="text-xs text-slate-400">{order.orderCustomerAddressDetails?.billingAddress?.recipientContactSnapshot ?? ""}</div>
                            </div>
                            <div className="text-sm text-slate-700">{renderAddress(order.orderCustomerAddressDetails?.billingAddress)}</div>
                        </div>

                        {/* Sticky summary */}
                        <div className="hidden lg:block sticky top-28">
                            <div className="bg-gradient-to-r from-white to-slate-50 border rounded-2xl p-5 shadow-lg">
                                <div className="flex justify-between text-sm text-slate-600">
                                    <div>Items</div>
                                    <div className="font-medium">{currency(itemsSubtotal)}</div>
                                </div>
                                <div className="flex justify-between text-sm text-slate-600 mt-3">
                                    <div>Delivery</div>
                                    <div className="font-medium">{delivery > 0 ? currency(delivery) : "—"}</div>
                                </div>

                                <hr className="my-3 border-dashed" />

                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-slate-600">Total</div>
                                        <div className="text-xs text-slate-400">(Items + Delivery)</div>
                                    </div>
                                    <div className="text-2xl font-extrabold text-[#065975]">{currency(displayedTotal)}</div>
                                </div>

                                {typeof serverItemTotal !== "undefined" && serverItemTotal !== itemsSubtotal && (
                                    <div className="mt-3 text-xs text-rose-600">Note: server item total differs from computed subtotal</div>
                                )}
                            </div>
                        </div>
                    </aside>

                    {/* Right: Items & payments */}
                    <section className="lg:col-span-8 space-y-6">
                        {/* Items */}
                        <div className="bg-white border rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-slate-500">Items</div>
                                    <div className="text-lg font-semibold text-slate-900">{products.length} product{products.length !== 1 ? "s" : ""}</div>
                                </div>
                                <div className="text-sm text-slate-500">Order #{order.orderNumber}</div>
                            </div>

                            <div className="mt-4 space-y-3">
                                {products.length === 0 && <div className="text-sm text-slate-500">No items</div>}
                                {products.map((p, idx) => {
                                    const subtotal = Number(p.sellPrice ?? 0) * Number(p.quantity ?? 0);
                                    return (
                                        <div key={`${p.productNameSnapshot ?? idx}-${idx}`} className="flex gap-4 p-4 bg-slate-50 border rounded-xl items-center hover:shadow-md transition">
                                            <div className="relative w-28 h-20 rounded-lg overflow-hidden bg-white flex-shrink-0 border">
                                                {p.productImage ? (
                                                    // next/image expects absolute hostnames allowed in next config; if local dev, this still works in many setups
                                                    <Image src={p.productImage} alt={p.productNameSnapshot} fill sizes="112px" style={{ objectFit: "cover" }} />
                                                ) : (
                                                    <div className="w-full h-full grid place-items-center text-xs text-slate-400">No image</div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-semibold text-slate-900 truncate">{p.productNameSnapshot}</div>

                                                {/* Quantity + Price under name */}
                                                <div className="text-xs text-slate-600 mt-2 flex items-center justify-between">
                                                    <div className="truncate">
                                                        <span className="mr-3">Qty: <strong className="text-slate-800">{p.quantity}</strong></span>
                                                        <span>Price: <strong className="text-slate-800">{currency(Number(p.sellPrice ?? 0))}</strong></span>
                                                    </div>

                                                    <div className="text-right">
                                                        <div className="text-xs text-slate-400">Subtotal</div>
                                                        <div className="text-sm font-semibold">{currency(subtotal)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Payments - customer-friendly read-only summary that shows method */}
                        <div className="bg-white border rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-slate-500">Payments</div>
                                    <div className="text-lg font-semibold text-slate-900">Summary</div>
                                </div>

                                <div className="text-right">
                                    <div className="text-sm text-slate-600">Total Due</div>
                                    <div className="text-xl font-bold text-[#065975]">{currency(displayedTotal)}</div>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-3 rounded-lg bg-slate-50 border">
                                    <div className="text-xs text-slate-500">Total Paid</div>
                                    <div className="text-lg font-semibold">{currency(totalPaid)}</div>
                                </div>

                                {balance > 0 && (
                                    <div className="p-3 rounded-lg bg-slate-50 border">
                                        <div className="text-xs text-slate-500">Balance</div>
                                        <div className="text-lg font-semibold text-rose-600">
                                            {currency(balance)}
                                        </div>
                                    </div>
                                )}

                                <div className="p-3 rounded-lg bg-slate-50 border">
                                    <div className="text-xs text-slate-500">Payment Method</div>

                                    <div className="mt-2 space-y-2 text-sm text-slate-700">
                                        {paymentAggregates.length === 0 ? (
                                            <div className="text-xs text-slate-400">No payments recorded</div>
                                        ) : (
                                            paymentAggregates.map((pm) => (
                                                <div key={pm.method} className="flex items-center justify-between">
                                                    <div className="truncate pr-2">
                                                        <span className="inline-flex items-center gap-2">
                                                            <span className="capitalize">{pm.method}</span>
                                                            {/* if there are statuses, show first status in small badge */}
                                                            {pm.statuses.length > 0 && (
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 ml-2">
                                                                    {pm.statuses[0]}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="font-medium">{currency(pm.amount)}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {balance > 0 && (
                                <div className="mt-4 text-sm text-slate-600">
                                    If you believe there's an issue with payment status, please contact customer support.
                                </div>
                            )}
                        </div>

                        {/* Mobile summary */}
                        <div className="lg:hidden">
                            <div className="bg-white border rounded-lg p-4 shadow-sm">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="text-sm text-slate-600">Total</div>
                                        <div className="text-xs text-slate-400">Items + Delivery</div>
                                    </div>
                                    <div className="text-2xl font-extrabold text-[#065975]">{currency(displayedTotal)}</div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}