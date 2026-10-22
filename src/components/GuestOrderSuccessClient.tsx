"use client";

import { useEffect, useState } from "react";
import { clearCart } from "@/lib/cart";
import OrderConfirmationView, {
    type ConfirmationOrder,
    OrderConfirmationState,
} from "./OrderConfirmationView";

export default function GuestOrderSuccessClient({ token }: { token: string }) {
    const [order, setOrder] = useState<ConfirmationOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            setLoading(true);
            setError("");
            try {
                const base = (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(
                    /\/+$/,
                    "",
                );
                const url = `${base}/sell_order/order/guest/detail?token=${encodeURIComponent(token)}`;
                const response = await fetch(url, {
                    signal: controller.signal,
                });
                if (!response.ok)
                    throw new Error(
                        "This guest order link may have expired. Please check your confirmation email or contact us for help.",
                    );
                const json = await response.json();
                const result = json?.data as ConfirmationOrder | undefined;
                if (!result || typeof result !== "object")
                    throw new Error(
                        "We couldn't find details for this guest order.",
                    );
                if (controller.signal.aborted) return;
                setOrder(result);
                clearCart();
            } catch (err) {
                if (controller.signal.aborted) return;
                setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to load this guest order.",
                );
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }
        void load();
        return () => controller.abort();
    }, [token]);

    if (loading) return <OrderConfirmationState loading guest />;
    if (!order)
        return <OrderConfirmationState message={error || undefined} guest />;
    return <OrderConfirmationView order={order} guest />;
}