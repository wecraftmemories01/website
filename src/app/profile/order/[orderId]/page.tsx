"use client";

import React, { useEffect, useState } from "react";
import OrderDetails from "../../../../components/OrderDetails";

function getStoredCustomerId(): string | null {
    if (typeof window === "undefined") return null;

    try {
        const raw = localStorage.getItem("auth");
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        return parsed?.customerId ?? null;
    } catch (err) {
        console.error("Failed to read customerId from localStorage", err);
        return null;
    }
}

type Props = {
    // params might be a plain object or a Promise that resolves to an object
    params: any;
};

export default function ProfileOrderPage({ params }: Props) {
    // React.use will unwrap a Promise-like params in Next.js newer versions.
    // Guard with (React as any).use so this still runs if React.use isn't present.
    const resolvedParams = (React as any).use ? (React as any).use(params) : params;
    const orderId = resolvedParams?.orderId ?? "";

    const [customerId, setCustomerId] = useState<string | null>(null);

    useEffect(() => {
        const id = getStoredCustomerId();
        if (!id) {
            window.location.href = "/login";
            return;
        }
        setCustomerId(id);
    }, []);

    if (!customerId) return null; // or show loader

    return (
        <div className="min-h-screen md:p-8 bg-linear-to-b from-[#fbfdff] to-white">
            <div className="max-w-6xl mx-auto">
                <OrderDetails customerId={customerId} orderId={orderId} />
            </div>
        </div>
    );
}