"use client";
import AuthStoryPanel from "@/components/AuthStoryPanel";

import React, { useEffect, useMemo, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
    Eye,
    EyeOff,
    Lock,
    ArrowLeft,
    CheckCircle,
    XCircle,
    ShieldCheck,
    Key,
} from "lucide-react";

type Props = { code: string };

// compact strength estimator (4 checks)
function pwStrength(pw: string) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const pct = (score / 4) * 100;
    const label =
        score <= 1
            ? "Weak"
            : score === 2
              ? "Okay"
              : score === 3
                ? "Good"
                : "Strong";
    return { score, pct, label };
}

export default function ResetPasswordClient({ code }: Props) {
    const router = useRouter();

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState<string>("");
    const [countdown, setCountdown] = useState<number | null>(null);

    const strength = useMemo(() => pwStrength(password), [password]);

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

    useEffect(() => {
        if (countdown === null) return;
        if (countdown <= 0) {
            router.push("/login");
            return;
        }
        const t = setTimeout(
            () => setCountdown((c) => (c !== null ? c - 1 : c)),
            1000,
        );
        return () => clearTimeout(t);
    }, [countdown, router]);

    const validate = () => {
        if (!password) {
            setError("Enter a new password.");
            return false;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return false;
        }
        if (!confirm) {
            setError("Confirm your new password.");
            return false;
        }
        if (password !== confirm) {
            setError("Passwords do not match.");
            return false;
        }
        setError("");
        return true;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        if (!validate()) return;

        setLoading(true);
        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

            if (!API_BASE) {
                throw new Error("NEXT_PUBLIC_API_BASE is not defined");
            }

            const grecaptcha = (window as any).grecaptcha;

            if (!grecaptcha || !grecaptcha.execute) {
                throw new Error("reCAPTCHA not ready");
            }

            await new Promise<void>((resolve) => {
                grecaptcha.ready(() => resolve());
            });

            const recaptchaToken = await grecaptcha.execute(
                process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!,
                { action: "reset_password" },
            );

            if (!recaptchaToken) {
                throw new Error("Failed to generate reCAPTCHA token");
            }

            const res = await fetch(
                `${API_BASE}/customer/reset_password/${encodeURIComponent(code)}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        newPassword: password,
                        confirmPassword: confirm,
                        recaptchaToken,
                    }),
                },
            );

            let data: any = null;
            try {
                data = await res.json();
            } catch {
                data = null;
            }

            if (!res.ok) {
                const msg =
                    data?.error ?? data?.message ?? "Unable to reset password.";
                setError(
                    typeof msg === "string" ? msg : "Unable to reset password.",
                );
                setLoading(false);
                return;
            }

            setSuccess(data?.message ?? "Password updated successfully.");
            setCountdown(4);
        } catch {
            setError("Could not contact server. Check your API.");
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) {
        return (
            <div className="min-h-screen flex items-center justify-center site-gradient p-6">
                <div className="w-full max-w-lg bg-white rounded-2xl shadow p-6">
                    <div className="h-6 bg-gray-100 rounded mb-4" />
                    <div className="h-12 bg-gray-100 rounded mb-3" />
                    <div className="h-12 bg-gray-100 rounded mb-3" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center site-gradient p-6">
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Info / brand panel (minimal, visible on md+) */}
                <AuthStoryPanel kind="reset" />

                {/* Form */}
                <main className="bg-white rounded-2xl p-6 md:p-8 shadow-lg border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-semibold">
                                Create a new password
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Secure your account with a strong, memorable
                                password.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => router.push("/login")}
                            className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2"
                            aria-label="Back to login"
                        >
                            <ArrowLeft size={16} /> Back
                        </button>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="space-y-5"
                        noValidate
                    >
                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-700 mb-2"
                            >
                                New password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Minimum 8 characters"
                                    autoComplete="new-password"
                                    className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-100 text-sm"
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <Lock size={18} />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((s) => !s)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                                    aria-label={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOff size={16} />
                                    ) : (
                                        <Eye size={16} />
                                    )}
                                </button>
                            </div>

                            {/* strength: compact, with soft gradient */}
                            <div className="mt-3">
                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-2 rounded-full transition-all duration-300"
                                        style={{
                                            width: `${strength.pct}%`,
                                            background:
                                                strength.pct >= 75
                                                    ? "linear-gradient(90deg,#06b6d4,#7c3aed)"
                                                    : strength.pct >= 50
                                                      ? "linear-gradient(90deg,#f59e0b,#f97316)"
                                                      : "linear-gradient(90deg,#ef4444,#f43f5e)",
                                        }}
                                    />
                                </div>
                                <div className="mt-2 text-xs text-gray-500">
                                    {password
                                        ? `${strength.label} • ${password.length} chars`
                                        : " "}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="confirm"
                                className="block text-sm font-medium text-gray-700 mb-2"
                            >
                                Confirm password
                            </label>
                            <div className="relative">
                                <input
                                    id="confirm"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    type={showConfirm ? "text" : "password"}
                                    placeholder="Re-enter password"
                                    autoComplete="new-password"
                                    className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-100 text-sm"
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <Lock size={18} />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm((s) => !s)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                                    aria-label={
                                        showConfirm
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >
                                    {showConfirm ? (
                                        <EyeOff size={16} />
                                    ) : (
                                        <Eye size={16} />
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-start gap-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded p-3">
                                <XCircle size={18} />
                                <div>{error}</div>
                            </div>
                        )}

                        {success && (
                            <div className="flex items-start gap-3 text-sm text-green-800 bg-green-50 border border-green-100 rounded p-3">
                                <CheckCircle size={18} />
                                <div>
                                    <div className="font-medium">{success}</div>
                                    {countdown !== null && (
                                        <div className="text-xs text-gray-600 mt-1">
                                            Redirecting to login in {countdown}
                                            s…
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full inline-flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-[#065975] hover:bg-[#03465e] text-white font-semibold shadow hover:scale-[1.01] transition-transform disabled:opacity-60"
                        >
                            <span className="sr-only">Set new password</span>
                            {loading ? (
                                "Saving..."
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Key size={16} /> Set new password
                                </span>
                            )}
                        </button>

                        <div className="text-center text-xs text-gray-400">
                            By setting a new password you agree to our{" "}
                            <span className="underline">Terms</span> and{" "}
                            <span className="underline">Privacy</span>.
                        </div>
                    </form>
                </main>
            </div>
        </div>
    );
}