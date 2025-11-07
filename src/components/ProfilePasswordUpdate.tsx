"use client";

import React from "react";
import { Lock, CheckCircle, Loader2, XCircle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3000/v1";

/** Map API error codes to user-friendly messages */
const ERROR_MESSAGES: Record<number, string> = {
    1018: "Please enter your current password.",
    1019: "Please enter a new password.",
    1020: "Please confirm your new password.",
    1021: "Old password and new password cannot be the same.",
    1022: "The old password you entered is incorrect.",
};

export default function SecuritySection() {
    const [current, setCurrent] = React.useState("");
    const [next, setNext] = React.useState("");
    const [confirm, setConfirm] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
    const [isError, setIsError] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatusMessage(null);
        setIsError(false);

        if (!next || next !== confirm) {
            setIsError(true);
            setStatusMessage("New and confirm passwords do not match.");
            return;
        }

        const token = localStorage.getItem("accessToken");
        const customerId = localStorage.getItem("customerId");

        if (!token || !customerId) {
            setIsError(true);
            setStatusMessage("Missing authentication. Please log in again.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/customer/${customerId}/update_password`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    oldPassword: current,
                    newPassword: next,
                    confirmPassword: confirm,
                }),
            });

            const contentType = res.headers.get("content-type") || "";
            const data = contentType.includes("application/json")
                ? await res.json().catch(() => ({}))
                : {};

            if (!res.ok || data.ack === "failure") {
                const errorCode = data?.error?.code;
                const backendMessage =
                    (errorCode && ERROR_MESSAGES[errorCode]) ||
                    data?.error?.message ||
                    "Failed to update password.";
                throw new Error(backendMessage);
            }

            setStatusMessage("Password updated successfully!");
            setIsError(false);
            setCurrent("");
            setNext("");
            setConfirm("");
        } catch (err: any) {
            setStatusMessage(err?.message || "Failed to update password.");
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="bg-white rounded-3xl p-6 lg:p-8 shadow-lg border">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Lock className="w-5 h-5 text-[#065975]" />
                        Security
                    </h3>
                    <p className="text-sm text-slate-500">
                        Change password and manage security settings.
                    </p>
                </div>
            </div>

            <form
                onSubmit={handleSubmit}
                className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4"
            >
                <input
                    placeholder="Current password"
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    type="password"
                    className="p-3 border rounded-xl shadow-sm"
                    required
                />
                <input
                    placeholder="New password"
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                    type="password"
                    className="p-3 border rounded-xl shadow-sm"
                    required
                />
                <input
                    placeholder="Confirm new"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    type="password"
                    className="p-3 border rounded-xl shadow-sm"
                    required
                />

                <div className="md:col-span-3 mt-3 flex items-center gap-3">
                    <button
                        disabled={loading}
                        className="px-5 py-3 rounded-lg bg-[#065975] text-white shadow flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Update password
                    </button>

                    {statusMessage && (
                        <div
                            className={`text-sm flex items-center gap-2 ${isError ? "text-red-600" : "text-green-600"
                                }`}
                        >
                            {isError ? (
                                <XCircle className="w-4 h-4" />
                            ) : (
                                <CheckCircle className="w-4 h-4" />
                            )}
                            {statusMessage}
                        </div>
                    )}
                </div>
            </form>
        </section>
    );
}