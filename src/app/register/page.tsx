'use client'

import { useEffect } from 'react';
import { useRouter } from "next/navigation";
import React, { ChangeEvent, FormEvent, useState } from 'react'
import { Eye, EyeOff, Mail, User, Smartphone, Lock } from 'lucide-react'
import { getAuth, isTokenValid } from "@/lib/auth";

type FormState = {
    name: string
    email: string
    mobile: string
    password: string
    confirmPassword: string
}

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState<FormState>({
        name: '',
        email: '',
        mobile: '',
        password: '',
        confirmPassword: '',
    })
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState('')
    const [serverError, setServerError] = useState('')
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    useEffect(() => {
        if (!isMounted) return;

        try {
            const auth = getAuth();
            if (auth?.customerId && isTokenValid()) {
                router.replace("/");
            }
        } catch {
            // ignore
        }
    }, [isMounted, router]);

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

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setForm((s) => ({
            ...s,
            [name]: name === 'mobile' ? value.replace(/[^0-9]/g, '') : value,
        }))
        // Clear server-side error for that field when user types
        setFieldErrors((f) => ({ ...f, [name]: '' }))
        setServerError('')
    }

    const clearForm = () =>
        setForm({ name: '', email: '', mobile: '', password: '', confirmPassword: '' })

    // Map server error codes to fields (based on your customerErrorMessages)
    const codeToField: Record<number, string> = {
        1001: 'name', // MISSING_CUSTOMER_NAME
        1002: 'email', // MISSING_CUSTOMER_EMAIL
        1003: 'password', // MISSING_CUSTOMER_PASSWORD
        1004: 'email', // INVALID_CUSTOMER_EMAIL
        1005: 'mobile', // INVALID_CUSTOMER_MOBILE
        1006: 'password', // MINIMUM_CUSTOMER_PASSWORD_LENGTH
        1007: 'email', // DUPLICATE_CUSTOMER_EMAIL
        1008: 'mobile', // DUPLICATE_CUSTOMER_MOBILE
    }

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setServerError('')
        setFieldErrors({})

        const grecaptcha = (window as any).grecaptcha;

        if (!grecaptcha || !grecaptcha.execute) {
            throw new Error("reCAPTCHA not ready");
        }

        await new Promise<void>((resolve) => {
            grecaptcha.ready(() => resolve());
        });

        const recaptchaToken = await grecaptcha.execute(
            process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!,
            { action: "register" }
        );

        if (!recaptchaToken) {
            throw new Error("Failed to generate reCAPTCHA token");
        }

        // minimal client-side guard: confirm password must match (UX convenience).
        if (form.password !== form.confirmPassword) {
            setFieldErrors({ confirmPassword: "Passwords don't match" })
            return
        }

        setSubmitting(true)
        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_BASE
            const res = await fetch(`${API_BASE}/customer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    mobile: form.mobile,
                    password: form.password,
                    recaptchaToken,
                }),
            })

            const body = await res.json().catch(() => null)

            // If API returned the structured failure you showed earlier:
            if (body && body.ack === 'failure') {
                const err = body.error
                // body.error might be an object {code, message} OR a string
                if (err && typeof err === 'object' && 'code' in err) {
                    const code: number = (err as any).code
                    const message: string = (err as any).message || 'Validation failed'
                    const mappedField = codeToField[code]
                    if (mappedField) {
                        setFieldErrors({ [mappedField]: message })
                    } else {
                        setServerError(message)
                    }
                } else if (typeof err === 'string') {
                    setServerError(err)
                } else {
                    setServerError('Registration failed. Please check your details.')
                }
                return
            }

            // Success path (created)
            if (body && body.ack === 'success') {
                setSuccess(body.message || 'Registration successful!')
                clearForm()
                // keep success visible briefly
                setTimeout(() => setSuccess(''), 3500)
                return
            }

            // Generic fallback for unexpected responses
            setServerError('Unexpected response from server. Please try again.')
        } catch (err) {
            console.error('Registration error', err)
            setServerError('Network error — please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center p-6">
            <div className="max-w-5xl w-full grid md:grid-cols-2 bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* Left promo panel (desktop only) */}
                <div className="hidden md:flex flex-col justify-center p-10 bg-gradient-to-b from-indigo-600 to-violet-500 text-white">
                    <h2 className="text-3xl font-extrabold mb-2">Join We Craft Memories</h2>
                    <p className="mb-6 text-indigo-100/90 leading-relaxed">Create your account and enjoy these benefits:</p>
                    <ul className="space-y-3 text-sm">
                        <li>• Faster, secure checkout</li>
                        <li>• Save multiple addresses & payments</li>
                        <li>• Get early access to special sales</li>
                        <li>• Personalized recommendations</li>
                    </ul>
                </div>

                {/* Right form area */}
                <div className="p-8 md:p-12">
                    <div className="max-w-md mx-auto">
                        <h3 className="text-2xl font-bold mb-1">Create your account</h3>
                        <p className="text-sm text-gray-500 mb-6">Sign up to get started — it only takes a minute.</p>

                        <form onSubmit={onSubmit} noValidate>
                            {/* name */}
                            <label className="block mb-3">
                                <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-400" /> Full name
                                </div>
                                <input
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-200 outline-none text-sm ${fieldErrors.name ? 'border-red-200' : 'border-gray-200'
                                        }`}
                                    placeholder="John Doe"
                                />
                                {fieldErrors.name && <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>}
                            </label>

                            {/* email */}
                            <label className="block mb-3">
                                <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-gray-400" /> Email
                                </div>
                                <input
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-200 outline-none text-sm ${fieldErrors.email ? 'border-red-200' : 'border-gray-200'
                                        }`}
                                    placeholder="you@email.com"
                                />
                                {fieldErrors.email && <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>}
                            </label>

                            {/* mobile */}
                            <label className="block mb-3">
                                <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                                    <Smartphone className="w-4 h-4 text-gray-400" /> Mobile
                                </div>
                                <input
                                    name="mobile"
                                    inputMode="numeric"
                                    value={form.mobile}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-200 outline-none text-sm ${fieldErrors.mobile ? 'border-red-200' : 'border-gray-200'
                                        }`}
                                    placeholder="9876543210"
                                />
                                {fieldErrors.mobile && <p className="text-xs text-red-600 mt-1">{fieldErrors.mobile}</p>}
                            </label>

                            {/* password */}
                            <label className="block mb-3">
                                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                                    <div className="flex items-center gap-2">
                                        <Lock className="w-4 h-4 text-gray-400" /> Password
                                    </div>
                                </div>
                                <div className="relative">
                                    <input
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={form.password}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-200 outline-none text-sm ${fieldErrors.password ? 'border-red-200' : 'border-gray-200'
                                            }`}
                                        placeholder="At least 8 characters"
                                    />
                                    <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-2 p-1">
                                        {showPassword ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
                                    </button>
                                </div>
                                {fieldErrors.password && <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>}
                            </label>

                            {/* confirm password */}
                            <label className="block mb-4">
                                <div className="text-sm text-gray-600 mb-1">Confirm password</div>
                                <div className="relative">
                                    <input
                                        name="confirmPassword"
                                        type={showConfirm ? 'text' : 'password'}
                                        value={form.confirmPassword}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-200 outline-none text-sm ${fieldErrors.confirmPassword ? 'border-red-200' : 'border-gray-200'
                                            }`}
                                        placeholder="Re-type password"
                                    />
                                    <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-2 top-2 p-1">
                                        {showConfirm ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
                                    </button>
                                </div>
                                {fieldErrors.confirmPassword && <p className="text-xs text-red-600 mt-1">{fieldErrors.confirmPassword}</p>}
                            </label>

                            {serverError && <p className="text-sm text-red-600 mb-3">{serverError}</p>}
                            {success && <p className="text-sm text-green-600 mb-3">{success}</p>}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-2 rounded-lg text-white font-medium bg-gradient-to-r from-indigo-600 to-violet-500 shadow-md disabled:opacity-60"
                            >
                                {submitting ? 'Creating...' : 'Create account'}
                            </button>
                        </form>

                        <div className="mt-6 text-center text-xs text-gray-500">
                            By signing up you agree to our <a href="#" className="text-indigo-600 underline">Terms</a> &{' '}
                            <a href="#" className="text-indigo-600 underline">Privacy Policy</a>.
                        </div>

                        <div className="mt-4 text-center text-sm text-gray-600">
                            Already have an account? <a href="/login" className="text-indigo-600 font-medium">Sign in</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}