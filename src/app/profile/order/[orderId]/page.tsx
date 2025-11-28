"use client";

import React, { useEffect, useState } from "react";
import OrderDetails from "../../../../components/OrderDetails";

const CUST_KEY = "customerId";

function getStoredCustomerId(): string | null {
    if (typeof window === "undefined") return null;
    try {
        return localStorage.getItem(CUST_KEY);
    } catch {
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

    const defaultCustomerId = "68d98d10d8e1d8ae4744079c";

    const [customerId, setCustomerId] = useState<string | null>(null);

    useEffect(() => {
        const id = getStoredCustomerId() ?? defaultCustomerId;
        setCustomerId(id);
    }, []);

    if (!customerId) return null; // or show loader

    return (
        <div className="min-h-screen p-6 md:p-8 bg-gradient-to-b from-[#fbfdff] to-white">
            <div className="max-w-4xl mx-auto">
                <OrderDetails customerId={customerId} orderId={orderId} />
            </div>
        </div>
    );
}