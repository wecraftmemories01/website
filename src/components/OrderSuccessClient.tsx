"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clearCart } from "@/lib/cart";
import OrderConfirmationView, {
    type ConfirmationOrder,
    OrderConfirmationState,
} from "./OrderConfirmationView";

function apiUrl(path: string): string {
    const base = (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/\/+$/, "");
    return `${base}${path}`;
}

export default function OrderSuccessClient() {
    const router = useRouter();
    const params = useSearchParams();
    const customerId = params.get("customerId") ?? "";
    const orderNumber = params.get("orderNumber") ?? "";
    const orderId = params.get("orderId") ?? "";

    const fetchPath = useMemo(() => {
        // Keep the existing order_short_details API contract used by checkout.
        if (customerId && orderNumber) {
            return `/sell_order/order_short_details?customerId=${encodeURIComponent(customerId)}&orderNumber=${encodeURIComponent(orderNumber)}`;
        }
        if (orderNumber || orderId) {
            return `/sell_order/order_short_details?orderNumber=${encodeURIComponent(orderNumber || orderId)}`;
        }
        return null;
    }, [customerId, orderNumber, orderId]);

    const [order, setOrder] = useState<ConfirmationOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!fetchPath) {
            setError(
                "This link doesn't contain an order reference. Please check your confirmation email or your account's orders.",
            );
            setLoading(false);
            return;
        }
        const controller = new AbortController();
        async function load() {
            setLoading(true);
            setError("");
            try {
                const token =
                    typeof window !== "undefined"
                        ? localStorage.getItem("accessToken")
                        : null;
                const headers = new Headers();
                if (token) headers.set("Authorization", `Bearer ${token}`);
                const response = await fetch(apiUrl(fetchPath!), {
                    method: "GET",
                    headers,
                    signal: controller.signal,
                });
                if (response.status === 401) {
                    try {
                        localStorage.removeItem("accessToken");
                        localStorage.removeItem("customerId");
                    } catch {
                        /* storage may be blocked */
                    }
                    router.replace("/login");
                    return;
                }
                if (!response.ok)
                    throw new Error(
                        "We couldn't load the order details. You can check your orders in your account or contact us if you need help.",
                    );
                const json = await response.json();
                const result = (json?.data ?? json?.order) as
                    ConfirmationOrder | undefined;
                if (!result || typeof result !== "object")
                    throw new Error(
                        "Your order details are not available yet. Please check your orders in your account.",
                    );
                if (controller.signal.aborted) return;
                setOrder(result);
                // Clear only after the backend confirms an actual order.
                clearCart();
            } catch (err) {
                if (controller.signal.aborted) return;
                setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to load your order details.",
                );
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }
        void load();
        return () => controller.abort();
    }, [fetchPath, router]);

    if (loading) return <OrderConfirmationState loading />;
    if (!order) return <OrderConfirmationState message={error || undefined} />;
    return <OrderConfirmationView order={order} />;
}