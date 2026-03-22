"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { clearCart } from "@/lib/cart";
import {
    CheckCircle,
    Home,
    Truck,
    ClipboardList,
    Share2,
    Printer,
    ArrowRight,
    MapPin,
    Hash,
    Box,
    Users,
} from "lucide-react";

/* ----------------------- */
/* Types (match your API)  */
/* ----------------------- */

type ProductItem = {
    productId?: string;
    productNameSnapshot?: string;
    quantity?: number;
    sellPrice?: number;
    productImage?: string | null;
};

type AddressSnapshot = {
    addressId?: string;
    recipientNameSnapshot?: string;
    recipientContactSnapshot?: string;
    addressLine1Snapshot?: string;
    addressLine2Snapshot?: string;
    addressLine3Snapshot?: string;
    landmarkSnapshot?: string;
    countrySnapshot?: string;
    stateSnapshot?: string;
    districtSnapshot?: string;
    citySnapshot?: string;
    pincodeSnapshot?: string;
};

type CustomerDetailsSnapshot = {
    customerId?: string;
    customerNameSnapshot?: string;
    customerMobileSnapshot?: string;
    customerEmailSnapshot?: string;
};

type Order = {
    _id?: string;
    quotedDeliveryCharge?: number;
    orderTotal?: number;
    purchaseDate?: string;
    orderNumber?: number | string;
    orderId?: string;
    customerDetails?: CustomerDetailsSnapshot;
    orderCustomerAddressDetails?: {
        deliveryAddress?: AddressSnapshot;
        billingAddress?: AddressSnapshot;
    };
    orderProductsDetails?: ProductItem[];
};

type OrderShortDetailResponse = {
    ack?: string;
    page?: number;
    limit?: number;
    totalRecords?: number;
    data?: Order;
};

/* ------------- */
/* Config        */
/* ------------- */
function getApiBase(): string {
    if (typeof window === "undefined") return "";
    return process.env.NEXT_PUBLIC_API_BASE
        ? String(process.env.NEXT_PUBLIC_API_BASE).replace(/\/+$/, "")
        : "";
}
function buildUrl(path: string) {
    const base = getApiBase();
    if (!base) return path.startsWith("/") ? path : `/${path}`;
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/* ------------------------- */
/* Small ProductImage helper */
/* ------------------------- */
/* Uses next/image with fill; provides a local fallback if image load errors */
function ProductImage({ src, alt }: { src?: string | null; alt?: string }) {
    const [failed, setFailed] = useState(false);

    if (!src || failed) {
        return (
            <div className="w-16 h-16 bg-[#fbfbfb] border rounded-md grid place-items-center text-slate-300 shrink-0">
                <Box className="w-6 h-6 text-slate-300" />
            </div>
        );
    }

    return (
        <div className="w-16 h-16 rounded-md overflow-hidden relative shrink-0 border bg-white/0">
            <Image
                src={src}
                alt={alt ?? "product image"}
                fill
                sizes="64px"
                style={{ objectFit: "cover" }}
                onError={() => setFailed(true)}
                // Next 13: you can add unoptimized if you prefer not to use the image loader:
                // unoptimized
                // you may leave it out if you configured remotePatterns in next.config.js
                referrerPolicy="no-referrer"
            />
        </div>
    );
}

/* ------------------------- */
/* Main Page Component       */
/* ------------------------- */

export default function GuestOrderSuccessClient({
    token,
}: {
    token: string;
}): React.ReactElement {
    const router = useRouter();

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetched, setFetched] = useState(false);

    useEffect(() => {
        if (fetched) return;

        const fetchOrder = async () => {
            try {
                const res = await fetch(
                    `${buildUrl(`/sell_order/order/guest/detail?token=${encodeURIComponent(token)}`)}`
                );

                if (!res.ok) {
                    setOrder(null);
                    return;
                }

                const json = await res.json();
                setOrder(json?.data ?? null);
            } catch (err) {
                setOrder(null);
            } finally {
                setLoading(false);
                setFetched(true);
            }
        };

        fetchOrder();
    }, [token, fetched]);

    useEffect(() => {
        clearCart();
    }, []);

    const handleShare = async (): Promise<void> => {
        const shareText = `Order ${order?.orderNumber ?? order?.orderId ?? ""} • ₹${(
            (order?.orderTotal ?? 0) +
            (order?.quotedDeliveryCharge ?? 0)
        ).toLocaleString("en-IN")}`;
        const url = typeof window !== "undefined" ? window.location.href : "";
        const shareData = { title: "Order details", text: shareText, url };

        try {
            if (typeof navigator !== "undefined" && (navigator as any).share) {
                // @ts-ignore
                await (navigator as any).share(shareData);
            } else if (typeof navigator !== "undefined" && navigator.clipboard) {
                await navigator.clipboard.writeText(url);
            }
        } catch (err) {
            console.warn("Share failed:", err);
        }
    };

    const formattedDate = (iso: string | null | undefined): string => {
        if (!iso) return "—";
        try {
            const dt = new Date(iso);
            return new Intl.DateTimeFormat("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Kolkata",
            }).format(dt);
        } catch {
            return iso;
        }
    };

    const currency = (v: number | string | undefined | null): string => {
        if (v === undefined || v === null || v === "") return "—";
        const num = typeof v === "number" ? v : Number(v);
        if (Number.isNaN(num)) return "—";
        return `₹${num.toLocaleString("en-IN")}`;
    };

    const subtotalAmount = (): number => {
        const items = order?.orderProductsDetails ?? [];
        return items.reduce(
            (s, it) => s + (Number(it.sellPrice ?? 0) * Number(it.quantity ?? 1)),
            0
        );
    };

    const resolveProductImage = (raw?: string | null) => {
        if (!raw) return null;
        const trimmed = String(raw).trim();
        if (!trimmed) return null;
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        return buildUrl(trimmed.startsWith("/") ? trimmed : `/${trimmed}`);
    };

    if (loading) {
        return (
            <div className="p-6 text-sm text-slate-500">
                Loading your order...
            </div>
        );
    }

    if (!order) {
        return (
            <div className="p-6 text-sm text-red-600">
                Order not found or link expired.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-b from-[#fbfeff] to-white flex items-start justify-center py-6 sm:py-10 px-3 sm:px-4">
            <div className="w-full max-w-5xl">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-4 sm:px-6 py-5 bg-[#f7fbfb] border-b border-slate-100">
                        <div className="w-14 h-14 rounded-md bg-white grid place-items-center border border-[#e6f7f6]">
                            <CheckCircle className="w-8 h-8 text-[#065975]" />
                        </div>

                        <div className="flex-1">
                            <h1 className="text-xl font-semibold text-[#065975]">Order placed successfully</h1>
                            <p className="text-xs text-slate-400 mt-1">
                                Estimated delivery: 3–5 working days
                            </p>
                        </div>

                        <div className="sm:ml-auto sm:text-right flex items-start sm:block justify-between w-full sm:w-auto">
                            <div className="text-xs text-slate-400">Order total</div>
                            <div className="text-lg font-semibold text-[#065975]">
                                {currency((order?.orderTotal ?? 0) + (order?.quotedDeliveryCharge ?? 0))}
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
                        <div className="lg:col-span-2 flex flex-col gap-5">
                            {/* Order summary */}
                            <section className="border rounded-lg p-4">
                                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                                    <div className="shrink-0 w-12 h-12 rounded-md bg-[#f0f9f8] grid place-items-center border border-[#e6f7f6]">
                                        <Hash className="w-5 h-5 text-[#065975]" />
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                                            <div className="flex-1">
                                                <div className="text-xs text-slate-400">Order Number</div>
                                                <div className="text-sm font-medium break-all">
                                                    {order?.orderNumber ?? "—"}
                                                </div>
                                            </div>

                                            <div className="sm:text-right">
                                                <div className="text-xs text-slate-400">Placed</div>
                                                <div className="text-sm text-slate-500">{order ? formattedDate(order.purchaseDate) : "—"}</div>
                                            </div>
                                        </div>

                                        <div className="mt-3 text-sm text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <ClipboardList className="w-4 h-4 text-slate-400" />
                                                <span>
                                                    Receipt sent to{" "}
                                                    <strong className="text-slate-700">
                                                        {order?.customerDetails?.customerEmailSnapshot ?? "your email"}
                                                    </strong>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Products list */}
                            <section className="border rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-700">Items in your order</h3>
                                        <p className="text-xs text-slate-400">We will ship these soon.</p>
                                    </div>
                                    <div className="text-xs text-slate-400">{(order?.orderProductsDetails ?? []).length} item(s)</div>
                                </div>

                                <ul className="mt-4 space-y-3">
                                    {(order?.orderProductsDetails ?? []).map((p, idx) => {
                                        const imageSrc = resolveProductImage(p.productImage);
                                        return (
                                            <li key={p.productId ?? idx} className="flex items-start gap-3 p-3 rounded-md border border-slate-100">
                                                <ProductImage src={imageSrc} alt={p.productNameSnapshot} />

                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-slate-800 truncate">{p.productNameSnapshot ?? "Product"}</div>
                                                    <div className="text-xs text-slate-500">Qty: {p.quantity ?? 1}</div>
                                                </div>

                                                <div className="text-sm font-semibold text-slate-700 shrink-0">{currency(p.sellPrice)}</div>
                                            </li>
                                        );
                                    })}

                                    {((order?.orderProductsDetails ?? []).length === 0) && (
                                        <li className="text-sm text-slate-500">No items found for this order.</li>
                                    )}
                                </ul>
                            </section>

                            {/* Delivery address */}
                            <section className="border rounded-lg p-4 flex gap-4 items-start">
                                <div className="shrink-0 w-10 h-10 rounded-md bg-[#f0f9f8] grid place-items-center border border-[#e6f7f6]">
                                    <MapPin className="w-5 h-5 text-[#065975]" />
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-xs text-slate-400">Shipping to</div>
                                            <div className="text-sm font-medium text-slate-800">
                                                {order?.customerDetails?.customerNameSnapshot ?? "—"}
                                            </div>
                                            <div className="text-sm text-slate-600 mt-1 break-words">
                                                {order?.orderCustomerAddressDetails?.deliveryAddress?.addressLine1Snapshot ?? ""}{" "}
                                                {order?.orderCustomerAddressDetails?.deliveryAddress?.addressLine2Snapshot ?? ""}{" "}
                                                {order?.orderCustomerAddressDetails?.deliveryAddress?.landmarkSnapshot ? `, ${order.orderCustomerAddressDetails.deliveryAddress.landmarkSnapshot}` : ""}
                                                <div className="text-xs text-slate-400 mt-1">
                                                    {order?.orderCustomerAddressDetails?.deliveryAddress?.citySnapshot ?? ""} • &nbsp;
                                                    {order?.orderCustomerAddressDetails?.deliveryAddress?.districtSnapshot ?? ""} • &nbsp;
                                                    {order?.orderCustomerAddressDetails?.deliveryAddress?.stateSnapshot ?? ""} • &nbsp;
                                                    {order?.orderCustomerAddressDetails?.deliveryAddress?.countrySnapshot ?? ""} • &nbsp;
                                                    {order?.orderCustomerAddressDetails?.deliveryAddress?.pincodeSnapshot ?? ""}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    Phone: {order?.orderCustomerAddressDetails?.deliveryAddress?.recipientContactSnapshot ?? order?.customerDetails?.customerMobileSnapshot ?? "—"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Right column */}
                        <aside className="space-y-4">
                            <div className="lg:sticky lg:top-6">
                                <div className="flex flex-col gap-3">
                                    <button type="button"
                                        onClick={() => router.push("/products")}
                                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#065975] text-white font-semibold hover:brightness-95 transition"
                                    >
                                        <Home className="w-4 h-4" />
                                        <span className="text-sm">Continue shopping</span>
                                    </button>

                                    {/* <button type="button"
                                        onClick={() => {
                                            if (token) {
                                                router.push(`/guest-order-details?token=${encodeURIComponent(token)}`);
                                            } else {
                                                router.push("/products");
                                            }
                                        }}
                                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#065975] text-white font-semibold hover:brightness-95 transition"
                                        aria-label="Track order"
                                    >
                                        <Truck className="w-4 h-4" />
                                        <span className="text-sm">Track order</span>
                                    </button> */}

                                    <div className="flex gap-2 mt-1">
                                        <button type="button"
                                            onClick={() => typeof window !== "undefined" && window.print()}
                                            className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg border bg-white text-sm hover:shadow-sm transition"
                                        >
                                            <Printer className="w-4 h-4" />
                                            Print
                                        </button>

                                        <button type="button"
                                            onClick={() => handleShare()}
                                            className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg border bg-white text-sm hover:shadow-sm transition"
                                        >
                                            <Share2 className="w-4 h-4" />
                                            Share
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4 border rounded-lg p-4 bg-[#fbffff]">
                                    <div className="text-xs text-slate-400">Order summary</div>

                                    <div className="mt-3 space-y-2">
                                        <div className="flex items-center justify-between text-sm text-slate-600">
                                            <div>Subtotal</div>
                                            <div>{currency(subtotalAmount())}</div>
                                        </div>

                                        <div className="flex items-center justify-between text-sm text-slate-600">
                                            <div>Delivery</div>
                                            <div>{currency(order?.quotedDeliveryCharge ?? 0)}</div>
                                        </div>

                                        <div className="flex items-center justify-between text-sm font-semibold text-[#065975] mt-2 border-t pt-2">
                                            <div>Total</div>
                                            <div>{currency((order?.orderTotal ?? 0) + (order?.quotedDeliveryCharge ?? 0))}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 text-xs text-slate-500">
                                    <div className="flex items-start gap-2">
                                        <Users className="w-4 h-4 text-slate-400" />
                                        <div>Need help? Reply to the order email or visit our Help center.</div>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 bg-white/50 flex items-center justify-between gap-3">
                        <button type="button" onClick={() => router.push("/products")} className="inline-flex items-center gap-2 text-sm text-[#065975] font-medium">
                            Continue shopping
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}