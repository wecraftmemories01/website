"use client";

import AuthStoryPanel from "@/components/AuthStoryPanel";
import React, { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import favouritesClient from "@/lib/favouritesClient";
import { getAuth, isTokenValid, persistAuth, type AuthShape } from "@/lib/auth";

/** Only accept on-site paths as post-login destinations. */
function getPostLoginRedirect(fallback: string): string {
    if (typeof window === "undefined") return fallback;
    const target = new URLSearchParams(window.location.search).get("redirect");
    if (
        !target ||
        !target.startsWith("/") ||
        target.startsWith("//") ||
        target.includes("\\")
    ) {
        return fallback;
    }
    return target;
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
                router.replace(getPostLoginRedirect("/"));
            }
        } catch {
            // ignore
        }
    }, [isMounted, router]);

    useEffect(() => {
        try {
            const r = localStorage.getItem("rememberedUser");
            if (r) setUsername(r);
        } catch {}
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
                { action: "login" },
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
                    recaptchaToken,
                }),
            });

            let data: any = null;
            try {
                data = await res.json();
            } catch {}

            if (!res.ok) {
                const be: BackendError | undefined = data?.error;
                setErrorMsg(be?.message || data?.message || "Login failed");
                setLoading(false);
                return;
            }

            persistAuth({
                customerId: data.customerId,
                token: {
                    accessToken: data.token?.accessToken ?? data.accessToken,
                    refreshToken: data.token?.refreshToken ?? data.refreshToken,
                    expiresIn: data.token?.expiresIn ?? data.expiresIn,
                },
            });

            // SYNC GUEST FAVOURITES → SERVER
            try {
                await favouritesClient.syncGuestToServer();

                // notify UI
                window.dispatchEvent(new Event("favouritesChanged"));
            } catch (err) {
                console.error("Favourites sync failed", err);
            }

            // Transfer guest hamper/product lines before using the signed-in cart.
            let cartSyncFailed = false;
            try {
                const { syncGuestCartToServer } = await import("@/lib/hampers");
                await syncGuestCartToServer();
            } catch (err) {
                cartSyncFailed = true;
                console.error(
                    "Guest cart transfer failed; items remain stored for retry",
                    err,
                );
            }

            // WAIT FOR CART SYNC BEFORE REDIRECT
            try {
                const { fetchCartFromApi } = await import("@/lib/cart");
                await fetchCartFromApi();

                // notify UI AFTER cart is ready
                window.dispatchEvent(new Event("cartChanged"));
            } catch (err) {
                console.error("Cart sync after login failed", err);
            }

            // optional: auth event
            window.dispatchEvent(new Event("authChanged"));

            setSuccess(data?.message || "Login successful");

            // NOW redirect (after everything is ready)
            router.push(
                cartSyncFailed ? "/cart" : getPostLoginRedirect("/cart"),
            );
        } catch {
            setErrorMsg(
                "Unable to reach server. Please check if your API is running.",
            );
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
        <div className="wcm-auth py-5 sm:py-10">
            <div className="auth-shell mx-auto grid grid-cols-1 md:grid-cols-2 items-stretch max-w-5xl overflow-hidden">
                {/* Shared brand panel */}
                <AuthStoryPanel kind="login" />

                {/* Right form */}
                <div className="auth-form bg-white w-full px-6 py-8 sm:p-9 lg:p-12">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">
                                Sign in to your account
                            </h1>
                            <p className="text-sm text-gray-500 mt-2">
                                Welcome back — enter your credentials to
                                continue.
                            </p>
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
                        <form
                            onSubmit={handleSubmit}
                            className="space-y-6"
                            noValidate
                        >
                            <div>
                                <label
                                    htmlFor="wecraft-login-email"
                                    className="block text-sm font-medium text-gray-700 mb-2"
                                >
                                    Email or username
                                </label>
                                <div className="relative">
                                    <input
                                        id="wecraft-login-email"
                                        value={username}
                                        onChange={(e) =>
                                            setUsername(e.target.value)
                                        }
                                        type="text"
                                        placeholder="you@example.com"
                                        className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#b6e7f0] text-sm"
                                        autoComplete="username"
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        <User size={18} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="wecraft-login-password"
                                    className="block text-sm font-medium text-gray-700 mb-2"
                                >
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="wecraft-login-password"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        placeholder="Enter your password"
                                        className="w-full pl-12 pr-14 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#b6e7f0] text-sm"
                                        autoComplete="current-password"
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        <Lock size={18} />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword((s) => !s)
                                        }
                                        aria-label={
                                            showPassword
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md"
                                    >
                                        {showPassword ? (
                                            <EyeOff size={18} />
                                        ) : (
                                            <Eye size={18} />
                                        )}
                                    </button>
                                </div>

                                <div className="mt-3 flex items-center justify-between text-sm">
                                    <label className="inline-flex items-center gap-2 text-gray-600">
                                        <input
                                            type="checkbox"
                                            checked={remember}
                                            onChange={(e) =>
                                                setRemember(e.target.checked)
                                            }
                                            className="form-checkbox"
                                        />
                                        <span>Remember me</span>
                                    </label>

                                    <Link
                                        href="/forgot-password"
                                        className="text-[#065975] hover:underline"
                                    >
                                        Forgot Password?
                                    </Link>
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
                                <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-md p-3">
                                    {success}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full inline-flex items-center justify-center gap-3 px-6 py-3 rounded-2xl bg-[#065975] hover:bg-[#03465e] text-white font-semibold shadow-lg hover:scale-[1.01] transition-transform disabled:opacity-60"
                            >
                                {loading ? (
                                    <svg
                                        className="animate-spin h-5 w-5"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8v8z"
                                        ></path>
                                    </svg>
                                ) : (
                                    "Sign in"
                                )}
                            </button>

                            <div className="text-center text-sm text-gray-500 mt-2">
                                Don't have an account?{" "}
                                <a
                                    href="/register"
                                    className="text-[#065975] font-medium"
                                >
                                    Create one
                                </a>
                            </div>

                            <div className="mt-3 text-xs text-center text-gray-400">
                                By signing in you agree to our{" "}
                                <a href="/terms" className="underline">
                                    Terms
                                </a>{" "}
                                and{" "}
                                <a href="/privacy" className="underline">
                                    Privacy
                                </a>
                                .
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}