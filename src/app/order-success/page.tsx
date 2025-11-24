"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
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
    countryNameSnapshot?: string;
    stateNameSnapshot?: string;
    cityNameSnapshot?: string;
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

function getAuthToken(): string | null {
    try {
        if (typeof window === "undefined") return null;
        return localStorage.getItem("accessToken");
    } catch {
        return null;
    }
}

async function safeJson(res: Response) {
    const ct = res.headers.get("content-type") || "";
    const isJson = ct.includes("application/json");
    if (isJson) {
        try {
            return await res.json();
        } catch {
            return null;
        }
    }
    try {
        const text = await res.text();
        return text;
    } catch {
        return null;
    }
}

/* ------------------------- */
/* Small ProductImage helper */
/* ------------------------- */
/* Uses next/image with fill; provides a local fallback if image load errors */
function ProductImage({ src, alt }: { src?: string | null; alt?: string }) {
    const [failed, setFailed] = useState(false);

    if (!src || failed) {
        return (
            <div className="w-16 h-16 bg-[#fbfbfb] border rounded-md grid place-items-center text-slate-300 flex-shrink-0">
                <Box className="w-6 h-6 text-slate-300" />
            </div>
        );
    }

    return (
        <div className="w-16 h-16 rounded-md overflow-hidden relative flex-shrink-0 border bg-white/0">
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

export default function OrderSuccessPage(): React.ReactElement {
    const router = useRouter();
    const params = useSearchParams();

    const customerId = params?.get("customerId") ?? "";
    const orderNumber = params?.get("orderNumber") ?? "";
    const orderIdFromQuery = params?.get("orderId") ?? null;
    const totalRaw = params?.get("total") ?? null;
    const quickTotal = totalRaw ? Number(totalRaw) : null;

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [order, setOrder] = useState<Order | null>(null);

    const TOKEN_KEY = "accessToken";
    function getStoredAccessToken(): string | null {
        if (typeof window === "undefined") return null;
        try {
            return localStorage.getItem(TOKEN_KEY);
        } catch {
            return null;
        }
    }

    /**
     * Centralized fetch that injects Authorization header when token exists.
     */
    async function authFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
        const token = getStoredAccessToken();
        // debug - remove in production
        // eslint-disable-next-line no-console
        console.debug("authFetch token present:", !!token);

        const headers = new Headers(init?.headers ?? {});
        if (token) headers.set("Authorization", `Bearer ${token}`);
        // only set content-type when there's a body and none provided
        if (init?.body && !headers.get("Content-Type")) headers.set("Content-Type", "application/json");

        const res = await fetch(input, { ...init, headers });
        if (res.status === 401) {
            if (typeof window !== "undefined") {
                localStorage.removeItem(TOKEN_KEY);
                window.location.href = "/login";
            }
        }
        return res;
    }

    const fetchPath = useMemo(() => {
        if (customerId && orderNumber) {
            return `/sell_order/order_short_details?customerId=${encodeURIComponent(
                customerId
            )}&orderNumber=${encodeURIComponent(orderNumber)}`;
        }
        if (orderIdFromQuery) {
            return `/sell_order/order_short_details?orderNumber=${encodeURIComponent(
                orderIdFromQuery
            )}`;
        }
        return null;
    }, [customerId, orderNumber, orderIdFromQuery]);

    useEffect(() => {
        let mounted = true;
        async function load() {
            if (!fetchPath) {
                setError("Missing customerId + orderNumber, or orderId in URL.");
                return;
            }

            setLoading(true);
            setError("");

            try {
                const url = buildUrl(fetchPath);
                const headers: Record<string, string> = { "Content-Type": "application/json" };
                const token = getAuthToken();
                if (token) headers["Authorization"] = `Bearer ${token}`;

                const res = await fetch(url, { method: "GET", headers });

                if (res.status === 401) {
                    try {
                        if (typeof window !== "undefined") {
                            localStorage.removeItem("accessToken");
                            localStorage.removeItem("customerId");
                        }
                    } catch { }
                    router.replace("/login");
                    return;
                }

                if (!res.ok) {
                    const body = await safeJson(res);
                    const msg =
                        typeof body === "string"
                            ? body
                            : body?.message || body?.error || JSON.stringify(body || {});
                    throw new Error(`Failed to fetch order: ${res.status} ${msg}`);
                }

                const payload = (await safeJson(res)) as OrderShortDetailResponse | null;

                if (!payload) {
                    throw new Error("Empty response from server.");
                }

                const hasData = !!(payload as any).data;
                if (!hasData) {
                    const alt = (payload as any).order ?? (payload as any).data ?? null;
                    if (!alt) {
                        throw new Error("Unexpected response shape from server.");
                    }
                    if (mounted) setOrder(alt as Order);
                } else {
                    if (mounted) setOrder(payload.data as Order);
                }
            } catch (err: unknown) {
                console.error("[OrderSuccessPage] load error:", err);
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();

        return () => {
            mounted = false;
        };
    }, [fetchPath, router]);

    useEffect(() => {
        if (!order) return;
        try {
            if (typeof window !== "undefined") {
                try {
                    localStorage.setItem("cartCount", "0");
                } catch { }
                window.dispatchEvent(new Event("cartChanged"));
            }
        } catch (err) {
            console.warn("Failed to refresh cart count after order:", err);
        }
    }, [order, customerId]);

    const handleShare = async (): Promise<void> => {
        const shareText = `Order ${order?.orderNumber ?? order?.orderId ?? ""} • ₹${(
            order?.orderTotal ?? quickTotal ?? 0
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

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#fbfeff] to-white flex items-start justify-center py-10 px-4">
            <div className="w-full max-w-5xl">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-4 px-6 py-5 bg-[#f7fbfb] border-b border-slate-100">
                        <div className="w-14 h-14 rounded-md bg-white grid place-items-center border border-[#e6f7f6]">
                            <CheckCircle className="w-8 h-8 text-[#065975]" />
                        </div>

                        <div>
                            <h1 className="text-xl font-semibold text-[#065975]">Order placed successfully</h1>
                            <p className="text-sm text-slate-500">
                                Thank you — your order is confirmed and will be prepared for shipping.
                            </p>
                        </div>

                        <div className="ml-auto text-right">
                            <div className="text-xs text-slate-400">Order total</div>
                            <div className="text-lg font-semibold text-[#065975]">
                                {currency((order?.orderTotal ?? 0) + (order?.quotedDeliveryCharge ?? 0))}
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 flex flex-col gap-5">
                            {/* Order summary */}
                            <section className="border rounded-lg p-4">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-md bg-[#f0f9f8] grid place-items-center border border-[#e6f7f6]">
                                        <Hash className="w-5 h-5 text-[#065975]" />
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-start gap-4">
                                            <div className="flex-1">
                                                <div className="text-xs text-slate-400">Order Number</div>
                                                <div className="text-sm font-medium break-all">
                                                    {order?.orderNumber ?? "—"}
                                                </div>
                                            </div>

                                            <div className="text-right">
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
                                            <li key={p.productId ?? idx} className="flex items-center gap-4 p-3 rounded-md border border-slate-100">
                                                <ProductImage src={imageSrc} alt={p.productNameSnapshot} />

                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-slate-800 truncate">{p.productNameSnapshot ?? "Product"}</div>
                                                    <div className="text-xs text-slate-500">Qty: {p.quantity ?? 1}</div>
                                                </div>

                                                <div className="text-sm font-semibold text-slate-700">{currency(p.sellPrice)}</div>
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
                                <div className="flex-shrink-0 w-10 h-10 rounded-md bg-[#f0f9f8] grid place-items-center border border-[#e6f7f6]">
                                    <MapPin className="w-5 h-5 text-[#065975]" />
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-xs text-slate-400">Shipping to</div>
                                            <div className="text-sm font-medium text-slate-800">
                                                {order?.orderCustomerAddressDetails?.deliveryAddress?.recipientNameSnapshot ?? "—"}
                                            </div>
                                            <div className="text-sm text-slate-600 mt-1">
                                                {order?.orderCustomerAddressDetails?.deliveryAddress?.addressLine1Snapshot ?? ""}{" "}
                                                {order?.orderCustomerAddressDetails?.deliveryAddress?.addressLine2Snapshot ?? ""}{" "}
                                                {order?.orderCustomerAddressDetails?.deliveryAddress?.landmarkSnapshot ? `, ${order.orderCustomerAddressDetails.deliveryAddress.landmarkSnapshot}` : ""}
                                                <div className="text-xs text-slate-400 mt-1">
                                                    {order?.orderCustomerAddressDetails?.deliveryAddress?.cityNameSnapshot ?? ""} • {order?.orderCustomerAddressDetails?.deliveryAddress?.stateNameSnapshot ?? ""} • {order?.orderCustomerAddressDetails?.deliveryAddress?.pincodeSnapshot ?? ""}
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
                            <div className="sticky top-6">
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => router.push("/")}
                                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border bg-white text-[#065975] font-medium hover:shadow-sm transition"
                                        aria-label="Continue shopping"
                                    >
                                        <Home className="w-4 h-4" />
                                        <span className="text-sm">Continue shopping</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (order?.orderId || order?._id) router.push(`/order/${encodeURIComponent(String(order.orderId ?? order._id))}`);
                                            else router.push("/orders");
                                        }}
                                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#065975] text-white font-semibold hover:brightness-95 transition"
                                        aria-label="Track order"
                                    >
                                        <Truck className="w-4 h-4" />
                                        <span className="text-sm">Track order</span>
                                    </button>

                                    <div className="flex gap-2 mt-1">
                                        <button
                                            onClick={() => typeof window !== "undefined" && window.print()}
                                            className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg border bg-white text-sm hover:shadow-sm transition"
                                        >
                                            <Printer className="w-4 h-4" />
                                            Print
                                        </button>

                                        <button
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
                        <button onClick={() => router.push("/")} className="inline-flex items-center gap-2 text-sm text-[#065975] font-medium">
                            Continue shopping
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Loading & Error overlays */}
                {loading && (
                    <div className="fixed inset-0 bg-white/60 backdrop-blur-sm grid place-items-center z-50">
                        <div className="text-sm text-slate-700">Loading order details…</div>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded">
                        <strong>Error:</strong> {error}
                    </div>
                )}
            </div>
        </div>
    );
}