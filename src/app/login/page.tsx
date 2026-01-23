"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, User } from "lucide-react";

/* ---------------- Types & Helpers ---------------- */

export type AuthShape = {
    ack?: string;
    message?: string;
    customerId?: string;
    token?: {
        accessToken?: string;
        refreshToken?: string;
        tokenType?: string;
        expiresIn?: number; // seconds
        tokenExpiresAt?: string; // ISO
        tokenObtainedAt?: string; // ISO
        [key: string]: any;
    } | null;
    [k: string]: any;
};

/** Canonical storage key for full auth object */
const FULL_AUTH_KEY = "auth";
/** Legacy key some parts of app accidentally used */
const LEGACY_ID_KEY = "customerId";

/** Return parsed auth object saved under 'customerId' (preferred) or fallback to legacy data. */
export function getAuth(): AuthShape | null {
    try {
        const raw = localStorage.getItem("auth");
        if (!raw) return null;
        return JSON.parse(raw) as AuthShape;
    } catch {
        return null;
    }
}

/** Return access token (top-level accessToken or customerId.token.accessToken) */
export function getAccessToken(): string | null {
    try {
        const auth = getAuth();
        return auth?.token?.accessToken ?? null;
    } catch {
        return null;
    }
}

/**
 * Returns true if tokenExpiresAt indicates token is still valid.
 * Falls back to expiresIn + tokenObtainedAt when needed.
 */
export function isTokenValid(): boolean {
    try {
        const auth = getAuth();
        if (!auth || !auth.token) return false;
        const t = auth.token;

        if (t.tokenExpiresAt) {
            const exp = Date.parse(t.tokenExpiresAt);
            if (Number.isNaN(exp)) return false;
            return Date.now() < exp - 2000;
        }

        if (typeof t.expiresIn === "number" && t.tokenObtainedAt) {
            const obt = Date.parse(t.tokenObtainedAt);
            if (Number.isNaN(obt)) return false;
            const exp = obt + t.expiresIn * 1000;
            return Date.now() < exp - 2000;
        }

        if (t.accessToken) return true;
        return false;
    } catch {
        return false;
    }
}

/** Clear stored auth data and notify listeners */
export function logout(redirectTo = "/login") {
    try {
        localStorage.removeItem("auth");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("rememberedUser");
        window.dispatchEvent(new Event("authChanged"));
        window.location.href = redirectTo;
    } catch { }
}

/* ---------------- Component ---------------- */

type BackendError = {
    code?: number;
    message?: string;
    [k: string]: any;
};

export default function LoginPage() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [errorCode, setErrorCode] = useState<number | null>(null);
    const [success, setSuccess] = useState("");
    const [remember, setRemember] = useState(false);

    // client mount guard to avoid hydration mismatch UI
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => setIsMounted(true), []);
    
    useEffect(() => {
        if (!isMounted) return;

        try {
            const auth = getAuth();
            const customerId = auth?.customerId;
            const tokenValid = isTokenValid();

            if (customerId && tokenValid) {
                router.replace("/");
            }
        } catch {
            // ignore
        }
    }, [isMounted, router]);

    useEffect(() => {
        try {
            const r = localStorage.getItem("rememberedUser");
            if (r) setUsername(r);
        } catch { }
    }, []);

    const validate = () => {
        if (!username.trim()) {
            setErrorMsg("Please enter your email or username.");
            return false;
        }
        if (!password) {
            setErrorMsg("Please enter your password.");
            return false;
        }
        setErrorMsg("");
        return true;
    };

    /**
     * Persist full auth object under FULL_AUTH_KEY and also write legacy id key for compatibility.
     * Ensures token expiry normalization.
     */
    const persistAuth = (data: AuthShape | null) => {
        if (!data || !data.token?.accessToken) return;

        try {
            const now = Date.now();
            const expiresIn = data.token.expiresIn ?? 0;

            const tokenObtainedAt = new Date(now).toISOString();
            const tokenExpiresAt = expiresIn
                ? new Date(now + expiresIn * 1000).toISOString()
                : undefined;

            // 1️⃣ store identity / metadata only
            localStorage.setItem(
                "auth",
                JSON.stringify({
                    customerId: data.customerId,
                    ack: data.ack,
                    message: data.message,
                    token: {
                        tokenType: data.token.tokenType ?? "Bearer",
                        expiresIn,
                        tokenObtainedAt,
                        tokenExpiresAt,
                    },
                })
            );

            // 2️⃣ store tokens separately
            localStorage.setItem("accessToken", data.token.accessToken);

            if (data.customerId) {
                localStorage.setItem("customerId", data.customerId);
            }

            if (data.token.refreshToken) {
                localStorage.setItem("refreshToken", data.token.refreshToken);
            }

        } catch (err) {
            console.error("persistAuth failed:", err);
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        setErrorMsg("");
        setErrorCode(null);
        setSuccess("");

        try {
            /** Recaptcha */
            const grecaptcha = (window as any).grecaptcha;

            if (!grecaptcha || !grecaptcha.execute) {
                throw new Error("reCAPTCHA not ready");
            }

            await new Promise<void>((resolve) => {
                grecaptcha.ready(() => resolve());
            });

            const recaptchaToken = await grecaptcha.execute(
                process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!,
                { action: "login" }
            );

            if (!recaptchaToken) {
                throw new Error("Failed to generate reCAPTCHA token");
            }

            const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

            const res = await fetch(`${API_BASE}/customer/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    username: username.trim(),
                    password,
                    recaptchaToken
                }),
            });

            let data: any = null;
            try {
                data = await res.json();
            } catch { }

            if (!res.ok) {
                const be: BackendError | undefined = data?.error;
                setErrorMsg(be?.message || data?.message || "Login failed");
                setLoading(false);
                return;
            }

            persistAuth(data);

            if (remember) {
                localStorage.setItem("rememberedUser", username.trim());
            } else {
                localStorage.removeItem("rememberedUser");
            }

            window.dispatchEvent(new Event("authChanged"));
            setSuccess(data?.message || "Login successful");
            router.push("/");
        } catch {
            setErrorMsg("Unable to reach server. Please check if your API is running.");
        } finally {
            setLoading(false);
        }
    };

    /* reCAPTCHA v3 script loader */
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-50 flex items-center justify-center p-8">
            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                {/* Left hero panel */}
                <div className="hidden md:flex flex-col justify-center gap-8 px-10">
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-3 rounded-full shadow-md">
                            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="24" height="24" rx="8" fill="#0ea5e9" />
                                <path d="M7 12h10" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-3xl font-extrabold leading-tight">Welcome back to WeCraftMemories</h2>
                            <p className="text-sm text-gray-600 mt-1 max-w-xs">
                                Manage orders, track inventory, and create delightful handmade products — all from one cozy dashboard.
                            </p>
                        </div>
                    </div>

                    <div className="bg-white/90 border border-gray-100 rounded-3xl p-6 shadow-inner">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-sky-50 rounded-lg">📦</div>
                            <div>
                                <div className="text-sm font-medium">Fast order lookup</div>
                                <div className="text-xs text-gray-500">Find any order within seconds</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 mt-4">
                            <div className="p-3 bg-sky-50 rounded-lg">🔒</div>
                            <div>
                                <div className="text-sm font-medium">Secure tokens</div>
                                <div className="text-xs text-gray-500">We store only encrypted credentials</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 mt-4">
                            <div className="p-3 bg-sky-50 rounded-lg">🎨</div>
                            <div>
                                <div className="text-sm font-medium">Creative tools</div>
                                <div className="text-xs text-gray-500">Design product cards and galleries</div>
                            </div>
                        </div>
                    </div>

                    <div className="text-sm text-gray-500">
                        Need an account? <a href="/register" className="text-sky-600 underline">Sign up</a>
                    </div>
                </div>

                {/* Right form */}
                <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-3xl shadow-xl p-10 md:p-12">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">Sign in to your account</h1>
                            <p className="text-sm text-gray-500 mt-2">Welcome back — enter your credentials to continue.</p>
                        </div>
                    </div>

                    {!isMounted ? (
                        <div aria-hidden>
                            <div className="h-8 w-2/3 bg-gray-200 rounded mb-6" />
                            <div className="space-y-4">
                                <div className="h-12 bg-gray-100 rounded-2xl" />
                                <div className="h-12 bg-gray-100 rounded-2xl" />
                                <div className="h-12 bg-gray-100 rounded-2xl w-1/2" />
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                <div className="relative">
                                    <input
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        type="text"
                                        placeholder="you@example.com"
                                        className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-200 text-sm"
                                        autoComplete="username"
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        <User size={18} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                                <div className="relative">
                                    <input
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        className="w-full pl-12 pr-14 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-200 text-sm"
                                        autoComplete="current-password"
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        <Lock size={18} />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((s) => !s)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                <div className="mt-3 flex items-center justify-between text-sm">
                                    <label className="inline-flex items-center gap-2 text-gray-600">
                                        <input
                                            type="checkbox"
                                            checked={remember}
                                            onChange={(e) => setRemember(e.target.checked)}
                                            className="form-checkbox"
                                        />
                                        <span>Remember me</span>
                                    </label>

                                    <a href="/forgot-password" className="text-sky-600 hover:underline">Forgot Password?</a>
                                </div>
                            </div>

                            {errorMsg && (
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-3">
                                        {errorMsg}
                                    </div>
                                </div>
                            )}

                            {success && (
                                <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-md p-3">{success}</div>
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
                                    "Sign in"
                                )}
                            </button>

                            <div className="text-center text-sm text-gray-500 mt-4">
                                Don't have an account? <a href="/register" className="text-sky-600 font-medium">Create one</a>
                            </div>

                            <div className="mt-6 text-xs text-center text-gray-400">
                                By signing in you agree to our <a className="underline">Terms</a> and <a className="underline">Privacy</a>.
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}