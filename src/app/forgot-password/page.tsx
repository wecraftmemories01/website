"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft, CheckCircle, XCircle } from "lucide-react";

export default function ForgotPasswordPage() {
    const router = useRouter();

    // mount guard — prevents SSR vs client mismatch
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    const [email, setEmail] = useState("");
    const [errorMsg, setErrorMsg] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string>("");
    const [countdown, setCountdown] = useState<number | null>(null);

    // simple email regex for client validation
    const emailIsValid = (e: string) =>
        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@(([^<>()[\]\\.,;:\s@"]+\.)+[^<>()[\]\\.,;:\s@"]{2,})$/i.test(
            e.trim()
        );

    useEffect(() => {
        if (countdown === null) return;
        if (countdown <= 0) {
            router.push("/login");
            return;
        }
        const t = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : c)), 1000);
        return () => clearTimeout(t);
    }, [countdown, router]);

    useEffect(() => {
        const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

        if (!siteKey) return;

        if ((window as any).grecaptcha) return;

        const scriptId = "recaptcha-v3";
        if (document.getElementById(scriptId)) return;

        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    }, []);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMsg("");
        setSuccessMsg("");

        const trimmed = email.trim();
        if (!trimmed) {
            setErrorMsg("Please enter your email.");
            return;
        }
        if (!emailIsValid(trimmed)) {
            setErrorMsg("Please enter a valid email address.");
            return;
        }

        setLoading(true);

        try {
            // read API base at submit time (client-only) — avoids SSR/client differences
            const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";

            const grecaptcha = (window as any).grecaptcha;

            if (!grecaptcha || !grecaptcha.execute) {
                throw new Error("reCAPTCHA not ready");
            }

            await new Promise<void>((resolve) => {
                grecaptcha.ready(() => resolve());
            });

            const recaptchaToken = await grecaptcha.execute(
                process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!,
                { action: "forgot_password" }
            );

            if (!recaptchaToken) {
                throw new Error("Failed to generate reCAPTCHA token");
            }

            const res = await fetch(`${API_BASE}/customer/forgot_password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: trimmed,
                    recaptchaToken
                }),
            });

            let data: any = null;
            try {
                data = await res.json();
            } catch {
                data = null;
            }

            if (!res.ok) {
                // handle variety of shapes
                if (data && data.error) {
                    setErrorMsg(typeof data.error === "string" ? data.error : data.error.message || "Failed to send reset email");
                } else if (data && data.message) {
                    setErrorMsg(data.message);
                } else {
                    setErrorMsg("Unable to process request. Try again later.");
                }
                setLoading(false);
                return;
            }

            const message =
                (data && (data.message || (typeof data === "string" ? data : null))) ||
                "If that email exists we will send a reset link.";

            setSuccessMsg(message);
            setErrorMsg("");
            // start countdown to redirect (10 seconds)
            setCountdown(10);
        } catch (err) {
            setErrorMsg("Unable to reach server. Please check if your API is running.");
        } finally {
            setLoading(false);
        }
    };

    // while mounting, return a stable skeleton (prevents hydration mismatch)
    if (!isMounted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-sky-50 flex items-center justify-center p-6">
                <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                    <div className="hidden md:block p-8">
                        <div className="h-6 bg-gray-200 rounded w-2/3 mb-4" />
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                        <div className="h-48 bg-gray-100 rounded-2xl" />
                    </div>

                    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-3xl shadow-xl p-8 md:p-10">
                        <div className="h-8 bg-gray-100 rounded mb-6" />
                        <div className="space-y-4">
                            <div className="h-12 bg-gray-100 rounded-2xl" />
                            <div className="h-12 bg-gray-100 rounded-2xl" />
                            <div className="h-12 bg-gray-100 rounded-2xl w-1/2" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // mounted — render interactive UI
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-sky-50 flex items-center justify-center p-6">
            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                {/* Left hero */}
                <div className="hidden md:flex flex-col gap-6 px-8">
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-3 rounded-full shadow-md">
                            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="24" height="24" rx="8" fill="#0ea5e9" />
                                <path d="M7 12h10" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-3xl font-extrabold leading-tight">Forgot your password?</h2>
                            <p className="text-sm text-gray-600 mt-1 max-w-xs">
                                No worries — enter your registered email and we'll send you a secure reset link.
                            </p>
                        </div>
                    </div>

                    <div className="bg-white/95 border border-gray-100 rounded-3xl p-6 shadow-inner">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-sky-50 rounded-lg">📧</div>
                            <div>
                                <div className="text-sm font-medium">Secure reset</div>
                                <div className="text-xs text-gray-500">Reset links expire quickly for safety</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 mt-4">
                            <div className="p-3 bg-sky-50 rounded-lg">🔐</div>
                            <div>
                                <div className="text-sm font-medium">Privacy first</div>
                                <div className="text-xs text-gray-500">We won't reveal whether an email exists publicly</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 mt-4">
                            <div className="p-3 bg-sky-50 rounded-lg">🕒</div>
                            <div>
                                <div className="text-sm font-medium">Quick process</div>
                                <div className="text-xs text-gray-500">Most emails arrive within a minute</div>
                            </div>
                        </div>
                    </div>

                    <div className="text-sm text-gray-500">
                        Remembered your password?{" "}
                        <button onClick={() => router.push("/login")} className="text-sky-600 underline" type="button">
                            Sign in
                        </button>
                    </div>
                </div>

                {/* Right form */}
                <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-3xl shadow-xl p-8 md:p-10">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">Reset your password</h1>
                            <p className="text-sm text-gray-500 mt-1">We'll email a secure link to set a new password.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <div className="relative">
                                <input
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    type="email"
                                    placeholder="you@example.com"
                                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-200 text-sm"
                                    autoComplete="email"
                                    aria-label="Email"
                                    aria-required
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <Mail size={18} />
                                </div>
                            </div>
                            <p className="mt-2 text-xs text-gray-400">We'll never share your email. The reset link will be sent if the email exists in our system.</p>
                        </div>

                        {errorMsg && (
                            <div className="flex items-start gap-3">
                                <div className="p-3 bg-red-50 border border-red-100 rounded-md flex items-center gap-3">
                                    <XCircle size={18} className="text-red-600" />
                                </div>
                                <div className="flex-1 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-3">{errorMsg}</div>
                            </div>
                        )}

                        {successMsg && (
                            <div className="flex items-start gap-3">
                                <div className="p-3 bg-green-50 border border-green-100 rounded-md flex items-center gap-3">
                                    <CheckCircle size={18} className="text-green-700" />
                                </div>
                                <div className="flex-1 text-sm text-green-700 bg-green-50 border border-green-100 rounded-md p-3">
                                    <div className="font-medium">{successMsg}</div>
                                    {countdown !== null && (
                                        <div className="mt-1 text-xs text-gray-600">
                                            Redirecting to{" "}
                                            <button onClick={() => router.push("/login")} className="underline" type="button">
                                                login
                                            </button>{" "}
                                            in {countdown} second{countdown === 1 ? "" : "s"}...
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full inline-flex items-center justify-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold shadow-lg hover:scale-[1.01] transition-transform disabled:opacity-60"
                        >
                            {loading ? (
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                                </svg>
                            ) : (
                                "Send reset link"
                            )}
                        </button>

                        <div className="mt-4 text-xs text-center text-gray-400">
                            By requesting a reset you agree to our <a className="underline">Terms</a> and <a className="underline">Privacy</a>.
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}