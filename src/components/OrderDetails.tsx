"use client";
import { publicImageUrl } from "@/lib/publicImageUrl";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
    ArrowLeft,
    CheckCircle2,
    Clock3,
    CreditCard,
    Gift,
    MapPin,
    Package,
    ReceiptText,
    ShieldCheck,
    ShoppingBag,
    Truck,
} from "lucide-react";

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

async function authFetch(
    input: RequestInfo,
    init?: RequestInit,
): Promise<Response> {
    const token = getStoredAccessToken();
    const headers = new Headers(init?.headers ?? {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (init?.body && !headers.get("Content-Type"))
        headers.set("Content-Type", "application/json");
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
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
    });
}

function formatShortDate(iso?: string) {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

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

type OrderStatusEntry = {
    status: string;
    date?: string;
    notes?: string;
};

type ApiOrder = {
    _id: string;
    orderNumber: number | string;
    quotedDeliveryCharge?: number;
    isDeliveryChargeRefunded?: boolean;
    deliveryRefundAmount?: number;
    orderTotal?: number;
    purchaseDate?: string;

    orderStatusTimeline?: OrderStatusEntry[];

    coupon?: {
        code?: string;
        type?: "PERCENTAGE" | "FLAT" | "FREE_SHIPPING";
        value?: number;
        discountAmount?: number;
        isFreeShipping?: boolean;
    };
    couponAmount?: number;
    finalPayableAmount?: number;

    orderCustomerAddressDetails?: {
        deliveryAddress?: AddressSnapshot;
        billingAddress?: AddressSnapshot;
    };

    orderProductsDetails?: ApiOrderProduct[];
    orderHampersDetails?: {
        hamperId: string;
        hamperNameSnapshot: string;
        hamperImage?: string | null;
        quantity: number;
        sellPrice: number;
        totalPrice: number;
        itemNotes?: string;
    giftMessages?: string[];
        products?: { productNameSnapshot: string; totalQuantity: number }[];
    }[];
    paymentMethods?: PaymentMethod[] | null;

    customerSnapshot?: {
        customerNameSnapshot?: string;
        customerMobileSnapshot?: string;
        customerEmailSnapshot?: string;
    };
};

/* --------------------- Component --------------------- */
export default function OrderDetails({
    customerId,
    orderId,
    apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000",
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

                const res = await authFetch(url, {
                    method: "GET",
                    signal: controller.signal,
                });

                // Redirect on 401 unauthorized (keeps UX smooth)
                if (res.status === 401) {
                    try {
                        localStorage.removeItem(TOKEN_KEY);
                    } catch {}
                    window.location.href = "/login";
                    return;
                }

                if (!res.ok) {
                    const txt = await res.text().catch(() => "");
                    throw new Error(
                        `HTTP ${res.status} ${res.statusText} ${txt}`,
                    );
                }

                const payload = await res.json().catch(() => ({}) as any);
                if (!mounted) return;
                if (payload?.ack !== "success" || !payload?.data) {
                    throw new Error(
                        payload?.message ?? "Unexpected API response",
                    );
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
    const orderHampers = order?.orderHampersDetails ?? [];
    const itemsSubtotal = useMemo(() => {
        return (
            products.reduce(
                (s, p) =>
                    s + Number(p.sellPrice ?? 0) * Number(p.quantity ?? 0),
                0,
            ) +
            orderHampers.reduce(
                (s, h) => s + Number(h.totalPrice ?? h.sellPrice * h.quantity),
                0,
            )
        );
    }, [products, orderHampers]);

    const delivery = Number(order?.quotedDeliveryCharge ?? 0);

    const couponDiscount = Number(
        order?.coupon?.discountAmount ?? order?.couponAmount ?? 0,
    );

    const deliverySaved = order?.coupon?.isFreeShipping ? delivery : 0;

    const finalTotal = Number(
        order?.finalPayableAmount ?? itemsSubtotal + delivery - couponDiscount,
    );

    const totalSavings = couponDiscount + deliverySaved;

    const renderAddress = (a?: AddressSnapshot | null) => {
        if (!a) return <div className="text-sm text-slate-500">—</div>;
        const lines: (string | null | undefined)[] = [
            a.recipientNameSnapshot ?? null,
            a.recipientContactSnapshot
                ? `Contact: ${a.recipientContactSnapshot}`
                : null,
            a.addressLine1Snapshot ?? null,
            a.addressLine2Snapshot ?? null,
            a.addressLine3Snapshot ?? null,
            a.landmarkSnapshot ? `Landmark: ${a.landmarkSnapshot}` : null,
            [a.cityNameSnapshot, a.stateNameSnapshot, a.pincodeSnapshot]
                .filter(Boolean)
                .join(", ") || null,
            a.countryNameSnapshot ?? null,
        ];
        const filled = lines.filter((l) => l && String(l).trim() !== "");
        if (filled.length === 0)
            return <div className="text-sm text-slate-500">—</div>;
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
    const paymentMethodsRaw: PaymentMethod[] = Array.isArray(
        order?.paymentMethods,
    )
        ? (order?.paymentMethods as PaymentMethod[])
        : [];
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

            const existing = map.get(methodLabel) ?? {
                amount: 0,
                statuses: new Set<string>(),
                sources: [],
            };
            existing.amount += amount;
            if (status) existing.statuses.add(status);
            existing.sources.push(pm.paymentMethodNameSnapshot ?? "");
            map.set(methodLabel, existing);
        }

        // convert to array preserving insertion order
        const arr: {
            method: string;
            amount: number;
            statuses: string[];
            sources: string[];
        }[] = [];
        for (const [method, obj] of map.entries()) {
            arr.push({
                method,
                amount: obj.amount,
                statuses: Array.from(obj.statuses),
                sources: obj.sources,
            });
        }

        return arr;
    }, [paymentMethodsRaw]);

    // totals
    const totalPaid = paymentMethodsRaw.reduce(
        (s, p) => s + Number(p.amount ?? 0),
        0,
    );
    const balance = Math.max(0, finalTotal - totalPaid);
    const latestStatus = order?.orderStatusTimeline?.[0];

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
                    <div className="text-rose-600 font-medium">
                        Error: {error}
                    </div>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="max-w-3xl w-full bg-white rounded-2xl p-6 shadow text-slate-600">
                    No order selected.
                </div>
            </div>
        );
    }

    /* --------------------- Responsive order experience --------------------- */
    const itemCount =
        products.reduce((sum, p) => sum + Number(p.quantity || 0), 0) +
        orderHampers.reduce((sum, h) => sum + Number(h.quantity || 0), 0);

    return (
        <div className="min-w-0 bg-[#fffaf6] text-[#173b4a] pb-10">
            <main className="mx-auto w-full max-w-[1440px] px-3 sm:px-6 lg:px-8 py-4 sm:py-7 space-y-6 sm:space-y-8">
                {/* Navigation remains visible without competing with the order summary. */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#dce7de] bg-white px-4 text-sm font-bold text-[#065975] transition-colors hover:bg-[#eef6ee]"
                    >
                        <ArrowLeft size={17} /> My orders
                    </button>
                    <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[.15em] text-[#8a785e]">
                        We Craft Memories · Your order
                    </span>
                </div>

                {/* High contrast header with status, date, and final amount. */}
                <section
                    aria-labelledby="order-heading"
                    className="relative isolate overflow-hidden rounded-[26px] sm:rounded-[32px] bg-[#065975] px-5 py-6 sm:px-9 sm:py-9 text-white shadow-[0_18px_50px_rgba(23,79,67,.13)]"
                >
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border-[50px] border-white/5"
                    />
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-[-120px] left-[40%] h-64 w-64 rounded-full bg-[#3c8269]/20 blur-3xl"
                    />
                    <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0">
                            <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[.17em] text-[#d7e9d8] font-bold">
                                <ShoppingBag size={15} /> Order details
                            </div>
                            <h1
                                id="order-heading"
                                className="break-all text-[clamp(1.85rem,3.4vw,3rem)] leading-tight tracking-[-.045em] font-extrabold"
                            >
                                Order #{order.orderNumber}
                            </h1>
                            <p className="mt-2 flex items-center gap-2 text-sm text-[#d7e9dc]">
                                <Clock3 size={15} /> Placed{" "}
                                {formatFullDate(order.purchaseDate)}
                            </p>
                            <div className="mt-5 flex flex-wrap gap-2">
                                {latestStatus?.status && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-xs font-bold text-white">
                                        <Package size={14} />{" "}
                                        {latestStatus.status}
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
                                    {balance > 0 ? (
                                        <Clock3 size={14} />
                                    ) : (
                                        <CheckCircle2 size={14} />
                                    )}
                                    {balance > 0
                                        ? `Balance ${currency(balance)}`
                                        : "No balance remaining"}
                                </span>
                            </div>
                        </div>
                        <div className="sm:text-right shrink-0 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 sm:bg-transparent sm:border-0 sm:px-0 sm:py-0">
                            <div className="text-xs font-bold uppercase tracking-[.12em] text-[#d5e8db]">
                                Order total
                            </div>
                            <div className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight">
                                {currency(finalTotal)}
                            </div>
                            <div className="mt-1 text-xs text-[#d8e8de]">
                                {itemCount}{" "}
                                {itemCount === 1 ? "piece" : "pieces"} ordered
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.85fr)] xl:gap-8 items-start">
                    <div className="min-w-0 space-y-6">
                        {/* Item list: thumbnail first, readable text beside it at all widths. */}
                        <section
                            aria-labelledby="ordered-items-heading"
                            className="overflow-hidden rounded-[26px] border border-[#e1eef0] bg-white shadow-[0_12px_36px_rgba(23,79,67,.035)]"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8ede6] px-4 py-5 sm:px-6">
                                <div>
                                    <span className="text-[11px] font-bold tracking-[.14em] uppercase text-[#947950]">
                                        Handpicked for you
                                    </span>
                                    <h2
                                        id="ordered-items-heading"
                                        className="mt-1 text-xl sm:text-2xl font-extrabold tracking-tight text-[#065975]"
                                    >
                                        Items in your order
                                    </h2>
                                </div>
                                <span className="rounded-full bg-[#e6f7f9] px-3 py-1.5 text-xs font-bold text-[#065975]">
                                    {products.length + orderHampers.length}{" "}
                                    {products.length + orderHampers.length === 1
                                        ? "listing"
                                        : "listings"}
                                </span>
                            </div>
                            <div className="divide-y divide-[#f1f8f9]">
                                {products.map((p, idx) => (
                                    <article
                                        key={`${p.productId ?? p.productNameSnapshot}-${idx}`}
                                        className="flex min-w-0 gap-3 sm:gap-5 p-4 sm:p-6 transition-colors hover:bg-[#f9fcfd]"
                                    >
                                        <div className="relative h-20 w-20 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-2xl border border-[#e3eff2] bg-[#edf8fa]">
                                            {p.productImage ? (
                                                <Image
                                                    src={
                                                        publicImageUrl(
                                                            p.productImage,
                                                        ) ||
                                                        "/no-image-placeholder.png"
                                                    }
                                                    alt={
                                                        p.productNameSnapshot ||
                                                        "Ordered item"
                                                    }
                                                    fill
                                                    sizes="112px"
                                                    className="object-contain p-2"
                                                />
                                            ) : (
                                                <span className="absolute inset-0 flex items-center justify-center text-[#7ca8b5]">
                                                    <Package size={28} />
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="text-[10px] uppercase font-bold tracking-[.14em] text-[#87988d]">
                                                Handmade product
                                            </span>
                                            <h3 className="mt-1 break-words text-sm sm:text-base leading-snug font-bold text-[#173b4a]">
                                                {p.productNameSnapshot}
                                            </h3>
                                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-500">
                                                <span>
                                                    Qty{" "}
                                                    <strong className="font-bold text-[#344e42]">
                                                        {p.quantity}
                                                    </strong>
                                                </span>
                                                <span>
                                                    {currency(
                                                        Number(
                                                            p.sellPrice ?? 0,
                                                        ),
                                                    )}{" "}
                                                    each
                                                </span>
                                            </div>
                                            <p className="mt-2 sm:mt-3 text-sm font-extrabold text-[#065975]">
                                                {currency(
                                                    Number(p.sellPrice ?? 0) *
                                                        Number(p.quantity ?? 0),
                                                )}
                                            </p>
                                        </div>
                                    </article>
                                ))}
                                {orderHampers.map((h, idx) => (
                                    <article
                                        key={`${h.hamperId}-${idx}`}
                                        className="flex min-w-0 gap-3 sm:gap-5 p-4 sm:p-6 transition-colors hover:bg-[#f9fcfd]"
                                    >
                                        <div className="relative h-20 w-20 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-2xl border border-[#e3eff2] bg-[#edf8fa]">
                                            {h.hamperImage ? (
                                                <Image
                                                    src={
                                                        publicImageUrl(
                                                            h.hamperImage,
                                                        ) ||
                                                        "/no-image-placeholder.png"
                                                    }
                                                    alt={h.hamperNameSnapshot}
                                                    fill
                                                    sizes="112px"
                                                    className="object-contain p-2"
                                                />
                                            ) : (
                                                <span className="absolute inset-0 flex items-center justify-center text-[#7ca8b5]">
                                                    <Gift size={30} />
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-[.14em] text-[#9d7643]">
                                                <Gift size={12} /> Gift hamper
                                            </span>
                                            <h3 className="mt-1 break-words text-sm sm:text-base leading-snug font-bold text-[#173b4a]">
                                                {h.hamperNameSnapshot}
                                            </h3>
                                            <p className="mt-2 text-xs sm:text-sm text-slate-500">
                                                Qty {h.quantity} ·{" "}
                                                {currency(
                                                    Number(h.sellPrice ?? 0),
                                                )}{" "}
                                                each
                                            </p>
                                            {(h.giftMessages?.length ? h.giftMessages : h.itemNotes ? [h.itemNotes] : []).map((message, index) => message ? (
                                                <p key={index} className="mt-2 rounded-xl bg-[#fff9ef] px-3 py-2 text-xs leading-relaxed text-[#795c39] break-words">
                                                    Gift {h.quantity > 1 ? index + 1 : ""} message: {message}
                                                </p>
                                            ) : null)}
                                            {Boolean(h.products?.length) && (
                                                <p className="mt-2 text-xs leading-relaxed text-slate-500 break-words">
                                                    Inside:{" "}
                                                    {h.products
                                                        ?.map(
                                                            (p) =>
                                                                p.productNameSnapshot,
                                                        )
                                                        .filter(Boolean)
                                                        .join(", ")}
                                                </p>
                                            )}
                                            <p className="mt-3 text-sm font-extrabold text-[#065975]">
                                                {currency(
                                                    Number(
                                                        h.totalPrice ??
                                                            h.sellPrice *
                                                                h.quantity,
                                                    ),
                                                )}
                                            </p>
                                        </div>
                                    </article>
                                ))}
                                {products.length === 0 &&
                                    orderHampers.length === 0 && (
                                        <div className="p-8 text-center text-sm text-slate-500">
                                            No item details are available for
                                            this order.
                                        </div>
                                    )}
                            </div>
                        </section>

                        {/* Tracking timeline only shows the stages returned by the API. */}
                        <section
                            aria-labelledby="order-progress-heading"
                            className="rounded-[26px] border border-[#e1eef0] bg-white px-5 py-6 sm:px-7 sm:py-7 shadow-[0_12px_36px_rgba(23,79,67,.035)]"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ebf4ec] text-[#065975]">
                                    <Truck size={20} />
                                </span>
                                <div>
                                    <h2
                                        id="order-progress-heading"
                                        className="text-lg font-extrabold text-[#065975]"
                                    >
                                        Order updates
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Your order journey so far
                                    </p>
                                </div>
                            </div>
                            {Boolean(order.orderStatusTimeline?.length) ? (
                                <ol className="space-y-0">
                                    {order.orderStatusTimeline!.map(
                                        (step, idx) => (
                                            <li
                                                key={`${step.status}-${idx}`}
                                                className="relative flex gap-4 pb-6 last:pb-0"
                                            >
                                                {idx !==
                                                    order.orderStatusTimeline!
                                                        .length -
                                                        1 && (
                                                    <div
                                                        aria-hidden="true"
                                                        className="absolute left-[9px] top-6 bottom-0 w-[2px] bg-[#e0eae0]"
                                                    />
                                                )}
                                                <span
                                                    aria-hidden="true"
                                                    className={`relative mt-1 h-5 w-5 shrink-0 rounded-full border-[5px] ${idx === 0 ? "border-[#0c7d96] bg-white" : "border-[#c9ddd0] bg-white"}`}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                        <span className="font-bold text-sm text-[#173b4a]">
                                                            {step.status}
                                                        </span>
                                                        <time className="text-xs font-medium text-[#7c8c81]">
                                                            {formatShortDate(
                                                                step.date,
                                                            )}
                                                        </time>
                                                    </div>
                                                    {step.notes && (
                                                        <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-500 break-words">
                                                            {step.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </li>
                                        ),
                                    )}
                                </ol>
                            ) : (
                                <p className="text-sm text-slate-500">
                                    Updates will appear here when available.
                                </p>
                            )}
                        </section>

                        <section
                            aria-label="Order addresses"
                            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                        >
                            <div className="rounded-[24px] border border-[#e1eef0] bg-white p-5 sm:p-6">
                                <h2 className="flex items-center gap-2 font-extrabold text-[#065975]">
                                    <MapPin size={18} /> Delivery address
                                </h2>
                                <div className="mt-4 leading-6">
                                    {renderAddress(
                                        order.orderCustomerAddressDetails
                                            ?.deliveryAddress,
                                    )}
                                </div>
                            </div>
                            <div className="rounded-[24px] border border-[#e1eef0] bg-white p-5 sm:p-6">
                                <h2 className="flex items-center gap-2 font-extrabold text-[#065975]">
                                    <ReceiptText size={18} /> Billing address
                                </h2>
                                <div className="mt-4 leading-6">
                                    {renderAddress(
                                        order.orderCustomerAddressDetails
                                            ?.billingAddress,
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Readable invoice-like totals, pinned on large monitors only. */}
                    <aside className="min-w-0 space-y-5 xl:sticky xl:top-24">
                        <section
                            aria-labelledby="order-payment-heading"
                            className="overflow-hidden rounded-[26px] border border-[#d8e6d8] bg-white shadow-[0_16px_42px_rgba(23,79,67,.07)]"
                        >
                            <div className="bg-[#f0f7ef] px-5 py-5 sm:px-6">
                                <div className="flex items-center gap-2 text-[#065975]">
                                    <CreditCard size={19} />{" "}
                                    <h2
                                        id="order-payment-heading"
                                        className="text-lg font-extrabold"
                                    >
                                        Payment summary
                                    </h2>
                                </div>
                                <p className="mt-1 text-xs text-[#6d8376]">
                                    A clear breakdown of your order
                                </p>
                            </div>
                            <div className="space-y-4 p-5 sm:p-6 text-sm">
                                <div className="flex justify-between gap-3">
                                    <span className="text-slate-500">
                                        Items subtotal
                                    </span>
                                    <span className="font-semibold">
                                        {currency(itemsSubtotal)}
                                    </span>
                                </div>
                                {couponDiscount > 0 && (
                                    <div className="flex justify-between gap-3 text-[#24734d]">
                                        <span>
                                            Discount{" "}
                                            {order.coupon?.code && (
                                                <span className="ml-1 inline-block rounded-md bg-[#eaf5ed] px-1.5 py-0.5 text-[10px] font-bold">
                                                    {order.coupon.code}
                                                </span>
                                            )}
                                        </span>
                                        <span className="font-bold">
                                            −{currency(couponDiscount)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between gap-3">
                                    <span className="text-slate-500">
                                        Delivery
                                    </span>
                                    <span className="font-semibold">
                                        {order.coupon?.isFreeShipping ? (
                                            <span className="text-[#0c7d96]">
                                                Free
                                            </span>
                                        ) : (
                                            currency(delivery)
                                        )}
                                    </span>
                                </div>
                                {order.isDeliveryChargeRefunded && (
                                    <p className="rounded-xl bg-[#f2f8f0] px-3 py-2 text-xs leading-relaxed text-[#0a7791]">
                                        Delivery refund recorded:{" "}
                                        {currency(
                                            order.deliveryRefundAmount || 0,
                                        )}
                                    </p>
                                )}
                                <div className="border-t border-dashed border-[#d8e3da] pt-4 flex items-center justify-between gap-3">
                                    <span className="text-base font-bold text-[#173b4a]">
                                        Order total
                                    </span>
                                    <strong className="text-2xl font-extrabold tracking-tight text-[#065975]">
                                        {currency(finalTotal)}
                                    </strong>
                                </div>
                                {totalSavings > 0 && (
                                    <p className="rounded-xl bg-[#eaf6e9] p-2.5 text-center text-xs font-bold text-[#0c7d96]">
                                        You saved {currency(totalSavings)} on
                                        this order
                                    </p>
                                )}
                                <div className="border-t border-[#f1f8f9] pt-4 space-y-3">
                                    <div className="flex justify-between gap-3">
                                        <span className="text-slate-500">
                                            Payments recorded
                                        </span>
                                        <span className="font-bold">
                                            {currency(totalPaid)}
                                        </span>
                                    </div>
                                    {balance > 0 && (
                                        <div className="flex justify-between gap-3 rounded-xl bg-[#fff8e8] px-3 py-2 text-[#8e651e]">
                                            <span className="font-bold">
                                                Balance remaining
                                            </span>
                                            <span className="font-extrabold">
                                                {currency(balance)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {paymentAggregates.length > 0 && (
                                    <div className="border-t border-[#f1f8f9] pt-4 space-y-3">
                                        <p className="text-[11px] uppercase tracking-[.12em] font-extrabold text-slate-400">
                                            Payment method details
                                        </p>
                                        {paymentAggregates.map((pm) => (
                                            <div
                                                key={pm.method}
                                                className="flex items-start justify-between gap-3 text-xs sm:text-sm"
                                            >
                                                <div className="min-w-0">
                                                    <span className="font-semibold capitalize break-words">
                                                        {pm.method}
                                                    </span>
                                                    {pm.statuses.length > 0 && (
                                                        <span className="ml-2 inline-block rounded-full bg-[#e6f7f9] px-2 py-0.5 text-[10px] text-[#065975]">
                                                            {pm.statuses.join(
                                                                ", ",
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="shrink-0 font-bold">
                                                    {currency(pm.amount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                        <div className="flex gap-3 rounded-2xl border border-[#dfedf0] bg-white p-4 text-xs leading-5 text-[#607987]">
                            <ShieldCheck
                                size={21}
                                className="shrink-0 text-[#0c7d96]"
                            />
                            <span>
                                Keep this order number handy if you contact us
                                about your purchase. Delivery details and
                                payment updates reflect the information recorded
                                for your order.
                            </span>
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}