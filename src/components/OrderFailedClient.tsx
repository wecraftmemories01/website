"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { XCircle, Home, ClipboardList } from "lucide-react";

export default function OrderFailedClient() {
    const router = useRouter();
    const params = useSearchParams();

    const reason = params?.get("reason") ?? null;
    const orderId = params?.get("orderId") ?? null;

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
                router.replace("/login");
            }
        }
        return res;
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#fff7f7] to-white flex items-center justify-center p-6">
            <div className="min-w-4xl w-full bg-white rounded-3xl shadow-xl p-12 md:p-12 flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-shrink-0 flex flex-col items-center gap-4">
                    <div className="w-36 h-36 rounded-full bg-rose-50 grid place-items-center border border-rose-100">
                        <XCircle className="w-20 h-20 text-rose-600" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl md:text-3xl font-extrabold text-rose-600">We couldn't place your order</h2>
                        <p className="text-sm text-slate-500 mt-1">Something went wrong — don't worry, we'll help you fix it.</p>
                    </div>
                </div>

                <div className="flex-1 w-full">
                    <div className="bg-[#fff5f6] border border-[#fdecea] rounded-2xl p-5 md:p-6 mb-6">
                        <div className="text-sm text-slate-500">What happened</div>
                        <div className="mt-2 text-sm text-slate-700">{reason ?? "Payment failed or server error."}</div>
                        {orderId && (
                            <div className="mt-3 text-sm">
                                <div className="text-sm text-slate-500">Order reference</div>
                                <div className="font-semibold">{orderId}</div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            onClick={() => router.push("/")}
                            className="w-full inline-flex items-center justify-center gap-3 py-3 rounded-xl border hover:shadow-sm transition bg-white"
                        >
                            <Home className="w-5 h-5 text-rose-600" />
                            <span className="font-medium">Continue shopping</span>
                        </button>

                        <button
                            onClick={() => router.push(orderId ? `/order/${encodeURIComponent(String(orderId))}` : "/contact-support")}
                            className="w-full inline-flex items-center justify-center gap-3 py-3 rounded-xl bg-rose-600 text-white font-semibold hover:brightness-95 transition"
                        >
                            <ClipboardList className="w-5 h-5" />
                            <span>{orderId ? "View order" : "Contact support"}</span>
                        </button>
                    </div>

                    <div className="mt-5 text-xs text-slate-400">
                        <div className="flex items-start gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-200 mt-2" />
                            <div>
                                <div className="font-medium text-slate-700">Quick fixes</div>
                                <ul className="list-disc pl-4 mt-1 text-sm text-slate-600">
                                    <li>Check your card or UPI app for transaction status.</li>
                                    <li>Try using a different payment method.</li>
                                    <li>If the amount was deducted, contact support with the reference id above.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}