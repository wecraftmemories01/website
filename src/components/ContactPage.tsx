"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/* ---------------- Types ---------------- */
type FormState = {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    reachUsType?: string; // stores publicName (e.g., "Order Support")
    orderNumber?: string;
    _gotcha?: string;
};

type Status = { type: "success" | "error" | null; text?: string };

type ReachUsOption = {
    _id: string;
    name: string;
    publicName: string;
    description?: string;
    showOnWeb?: boolean;
    sortNumber?: number;
};

/* ---------------- Component ---------------- */
export default function ContactPage(): React.ReactElement {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

    const [form, setForm] = useState<FormState>({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
        reachUsType: "",
        orderNumber: "",
        _gotcha: "",
    });

    const [errors, setErrors] = useState<Partial<FormState>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<Status>({ type: null });

    // reach us data
    const [reachOptions, setReachOptions] = useState<ReachUsOption[]>([]);
    const [reachLoading, setReachLoading] = useState(false);
    const [reachError, setReachError] = useState<string | null>(null);

    // categories that require order number (publicName)
    const orderNumberRequiredFor = useMemo(
        () => [
            "Order Support",
            "Returns / Exchange Support",
            "Shipping & Delivery Support",
            "Payment Support",
            "Refund Support",
            "Feedback / Complaint",
        ],
        []
    );

    // validators (generic ones)
    const validators: { [K in keyof FormState]?: (v: string) => string | undefined } = {
        name: (v) => (!v.trim() ? "Please enter your name" : undefined),
        email: (v) =>
            !v.trim()
                ? "Please enter your email"
                : /^\S+@\S+\.\S+$/.test(v)
                    ? undefined
                    : "Please enter a valid email",
        subject: (v) => (!v.trim() ? "Please enter a subject" : undefined),
        message: (v) =>
            !v.trim() ? "Please enter a message" : v.trim().length < 10 ? "Message must be at least 10 characters" : undefined,
        // orderNumber handled conditionally in validateAll()
    };

    // derived validity
    const isFormValid = useMemo(() => {
        // run the same checks as validateAll but without setting errors
        const basicValid =
            !validators.name?.(form.name) &&
            !validators.email?.(form.email) &&
            !validators.subject?.(form.subject) &&
            !validators.message?.(form.message);

        // check conditional order number requirement
        const needsOrderNumber = orderNumberRequiredFor.includes(form.reachUsType ?? "");
        const orderValid = needsOrderNumber ? !!(form.orderNumber && form.orderNumber.trim()) : true;

        return basicValid && orderValid;
    }, [form, validators, orderNumberRequiredFor]);

    function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((s) => ({ ...s, [key]: value }));
        // validate single field if it has validator
        if (validators[key]) {
            const err = validators[key]!(String(value ?? ""));
            setErrors((prev) => ({ ...prev, [key]: err }));
        }

        // if reachUsType changed, clear orderNumber error if not required anymore
        if (key === "reachUsType") {
            const needsOrderNumber = orderNumberRequiredFor.includes(String(value ?? ""));
            if (!needsOrderNumber) {
                setErrors((prev) => {
                    const copy = { ...prev };
                    delete copy.orderNumber;
                    return copy;
                });
            }
        }
    }

    function validateAll(): boolean {
        const e: Partial<FormState> = {};

        (Object.keys(validators) as (keyof FormState)[]).forEach((k) => {
            const err = validators[k]!(String(form[k] ?? ""));
            if (err) e[k] = err;
        });

        // conditional: orderNumber required for certain categories
        const needsOrderNumber = orderNumberRequiredFor.includes(form.reachUsType ?? "");
        if (needsOrderNumber && !(form.orderNumber && form.orderNumber.trim())) {
            e.orderNumber = "Please enter the order number";
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    }

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

    // auto-clear status after 5s
    useEffect(() => {
        if (!status.type) return;
        const t = setTimeout(() => setStatus({ type: null }), 5000);
        return () => clearTimeout(t);
    }, [status]);

    // fetch reach_us types
    useEffect(() => {
        let mounted = true;
        async function load() {
            setReachLoading(true);
            setReachError(null);
            try {
                const url = `${API_BASE}/reach_us/types`;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Failed to load (${res.status})`);
                const json = await res.json();
                const data: ReachUsOption[] = json?.reachUsTypeData ?? [];
                if (mounted) setReachOptions(data);
            } catch (err) {
                console.error("Could not fetch reach_us types:", err);
                if (mounted) setReachError("Unable to load contact categories");
            } finally {
                if (mounted) setReachLoading(false);
            }
        }

        // If API_BASE missing, avoid calling and show message
        if (!API_BASE) {
            setReachError("API base not configured (NEXT_PUBLIC_API_BASE)");
            setReachOptions([]);
            setReachLoading(false);
            return;
        }

        load();
        return () => {
            mounted = false;
        };
    }, [API_BASE]);

    // default to "Others" publicName if available and user hasn't chosen anything
    useEffect(() => {
        if (reachOptions.length === 0) return;
        // If user already set something, don't override
        if (form.reachUsType && form.reachUsType.trim() !== "") return;

        const byPublic = reachOptions.find((o) => o.publicName.toLowerCase() === "others");
        const byName = reachOptions.find((o) => o.name === "OTHERS");
        const pick = byPublic ?? byName ?? null;
        if (pick) {
            setForm((s) => ({ ...s, reachUsType: pick.publicName }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reachOptions]);

    /* ---------------- UPDATED handleSubmit ----------------
       - Posts to /v1/reach_us (falls back to http://localhost:3000 when NEXT_PUBLIC_API_BASE missing)
       - Sends mobile (mapped from phone), reachUsTypeId (the _id), orderNumber (if present)
    */
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (form._gotcha) return; // honeypot

        if (!validateAll()) return;
        setIsSubmitting(true);
        setStatus({ type: null });

        const grecaptcha = (window as any).grecaptcha;
        if (!grecaptcha || !grecaptcha.execute) {
            throw new Error("reCAPTCHA not ready");
        }

        await new Promise<void>((resolve) => {
            grecaptcha.ready(() => resolve());
        });

        const recaptchaToken = await grecaptcha.execute(
            process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!,
            { action: "reach_us" }
        );

        if (!recaptchaToken) {
            throw new Error("Failed to generate reCAPTCHA token");
        }

        try {
            // fallback to localhost if NEXT_PUBLIC_API_BASE is not set (useful for local dev)
            const base = API_BASE?.trim() ? API_BASE.replace(/\/+$/, "") : "http://localhost:3000";

            // find the selected reachUs option and grab its _id
            const selected = reachOptions.find((o) => o.publicName === form.reachUsType);
            const reachUsTypeId = selected ? selected._id : undefined;

            // Build payload per your API expectations
            const payload: any = {
                name: form.name,
                email: form.email,
                mobile: form.phone || "", // maps form phone to server 'mobile'
                subject: form.subject,
                message: form.message,
            };

            if (reachUsTypeId) payload.reachUsTypeId = reachUsTypeId;
            if (form.orderNumber && form.orderNumber.trim()) payload.orderNumber = form.orderNumber.trim();
            payload.recaptchaToken = recaptchaToken;

            const res = await fetch(`${base}/reach_us`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                // try to get JSON error, else text
                let errText = "";
                try {
                    const json = await res.json();
                    // stringify in case server returns structured error
                    errText = JSON.stringify(json);
                } catch {
                    errText = await res.text().catch(() => "");
                }
                throw new Error(errText || `Network error (${res.status})`);
            }

            setStatus({ type: "success", text: "Message sent — we’ll get back to you soon!" });
            setForm({ name: "", email: "", phone: "", subject: "", message: "", reachUsType: "", orderNumber: "", _gotcha: "" });
            setErrors({});
        } catch (err) {
            setStatus({
                type: "error",
                text: err instanceof Error ? `Oops — ${err.message}` : "Oops — something went wrong. Please try again later.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-[#EAF7FA] via-white to-[#FFF6E8] py-16 px-4 sm:px-6 lg:px-12">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#0B5C73]">Let's build something great together</h2>
                    <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">Questions, feedback, customization or bulk order in mind? Drop us a message — we respond within one business day.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left - Visual / Quick contact */}
                    <aside className="lg:col-span-5 flex flex-col gap-6">
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B5C73] to-[#1FA6B8] text-white p-8 shadow-2xl transform-gpu transition-transform hover:-translate-y-1">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-2xl font-bold">✨</div>
                                <div>
                                    <h3 className="text-2xl font-semibold">Reach out anytime</h3>
                                    <p className="mt-1 text-sm text-white/90">Friendly help, proposals, collaboration — we reply fast.</p>
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-1 gap-3">
                                <a href="mailto:support@wecraftmemories.com" className="inline-flex items-center gap-3 bg-white/20 hover:bg-white/25 transition-colors px-4 py-3 rounded-lg">
                                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                                        <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.5 5L18 8" />
                                        <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M21 8v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8" />
                                    </svg>
                                    <span className="text-sm font-medium">support@wecraftmemories.com</span>
                                </a>

                                <a href="tel:+919876543210" className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors px-4 py-3 rounded-lg">
                                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                                        <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 0 1 2-2h2.1a1 1 0 0 1 .9.56l1.2 2.4a1 1 0 0 1-.2 1.06L8.2 8.9a11 11 0 0 0 5.9 5.9l1.88-1.78a1 1 0 0 1 1.06-.2l2.4 1.2a1 1 0 0 1 .56.9V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z" />
                                    </svg>
                                    <span className="text-sm font-medium">+91 8097987769</span>
                                </a>
                            </div>

                            <div className="mt-6 text-sm text-white/80">
                                <strong>Support hours:</strong> Mon–Fri, 10:00 AM — 06:00 PM IST
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
                            <h4 className="text-lg font-semibold text-[#0B5C73]">Why contact us?</h4>
                            <ul className="mt-3 space-y-2 text-sm text-gray-600">
                                <li>• Fast replies & tailored quotes</li>
                                <li>• Clear timelines & transparent pricing</li>
                                <li>• Privacy-first — we don’t share your info</li>
                            </ul>
                            {/* <div className="mt-4">
                                <a href="/faq" className="inline-flex items-center gap-2 text-indigo-600 font-medium hover:underline">Browse FAQs</a>
                            </div> */}
                        </div>
                    </aside>

                    {/* Right - Form */}
                    <section className="lg:col-span-7">
                        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-gray-100">
                            <div className="mb-4">
                                <h3 className="text-2xl font-semibold text-[#0B5C73]">Send us a message</h3>
                                <p className="mt-1 text-sm text-gray-600">Tell us a little about your project or question.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5" noValidate>
                                {/* honeypot */}
                                <input
                                    value={form._gotcha}
                                    onChange={(e) => setField("_gotcha", e.target.value)}
                                    name="_gotcha"
                                    tabIndex={-1}
                                    autoComplete="off"
                                    className="hidden"
                                />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Input label="Full name" value={form.name} onChange={(v) => setField("name", v)} error={errors.name} placeholder="Full Name" autoComplete="name" />

                                    <Input label="Email" value={form.email} onChange={(v) => setField("email", v)} error={errors.email} placeholder="Email" type="email" autoComplete="email" />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Input label="Phone" value={form.phone} onChange={(v) => setField("phone", v)} placeholder="Contact Number" autoComplete="tel" />

                                    {/* Category select */}
                                    <label className="block">
                                        <span className="text-sm font-medium text-gray-700">Category</span>
                                        <ReachUsSelect
                                            options={reachOptions}
                                            loading={reachLoading}
                                            error={reachError}
                                            selectedValue={form.reachUsType}
                                            onSelect={(value) => setField("reachUsType", value)}
                                        />
                                    </label>
                                </div>

                                {/* Order Number - shown conditionally */}
                                {orderNumberRequiredFor.includes(form.reachUsType ?? "") && (
                                    <Input label="Order Number" value={form.orderNumber ?? ""} onChange={(v) => setField("orderNumber", v)} error={errors.orderNumber} placeholder="Enter your order number" />
                                )}

                                <label className="block">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">Subject</span>
                                        <span className="text-xs text-gray-400">{Math.min(100, form.subject.length)}/100</span>
                                    </div>
                                    <input
                                        value={form.subject}
                                        onChange={(e) => setField("subject", e.target.value)}
                                        className={`mt-1 block w-full rounded-xl px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-[#1FA6B8]/30 transition ${errors.subject ? "border-[#E24B5B]" : "border-gray-200"}`}
                                        placeholder="Quick summary (e.g., Need pricing)"
                                        aria-invalid={!!errors.subject}
                                        aria-describedby={errors.subject ? "subject-error" : undefined}
                                    />
                                    {errors.subject && <p id="subject-error" className="mt-1 text-xs text-[#E24B5B]">{errors.subject}</p>}
                                </label>

                                <label className="block">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">Message</span>
                                        <span className="text-xs text-gray-400">{Math.min(1000, form.message.length)}/1000</span>
                                    </div>
                                    <textarea
                                        rows={6}
                                        value={form.message}
                                        onChange={(e) => {
                                            if (e.target.value.length <= 1000) setField("message", e.target.value);
                                        }}
                                        className={`mt-1 block w-full rounded-xl px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-[#1FA6B8]/30 transition ${errors.message ? "border-[#E24B5B]" : "border-gray-200"}`}
                                        placeholder="Share details, timelines, links — we'll follow up."
                                        aria-invalid={!!errors.message}
                                        aria-describedby={errors.message ? "message-error" : undefined}
                                    />
                                    {errors.message && <p id="message-error" className="mt-1 text-xs text-[#E24B5B]">{errors.message}</p>}
                                </label>

                                <div className="flex items-center justify-between gap-4">
                                    <div className="text-sm text-gray-500">We respond in 1 business day. Your info is private.</div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !isFormValid}
                                        className={`inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#0B5C73] to-[#1FA6B8] text-white font-semibold px-5 py-3 shadow-lg transform transition ${isSubmitting ? "opacity-80" : "hover:scale-[1.01]"} disabled:opacity-60`}
                                        aria-live="polite"
                                        aria-disabled={isSubmitting || !isFormValid}
                                    >
                                        <svg className={`w-4 h-4 ${isSubmitting ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" aria-hidden>
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
                                            <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                        </svg>
                                        <span>{isSubmitting ? "Sending…" : isFormValid ? "Send message" : "Fill required fields"}</span>
                                    </button>
                                </div>

                                {/* status */}
                                <div aria-live="assertive" className="min-h-[1.5rem]">
                                    {status.type && (
                                        <div
                                            role="status"
                                            className={`mt-2 rounded-md px-4 py-3 text-sm font-medium border ${status.type === "success"
                                                    ? "bg-[#EAF7F0] text-[#2F9E5A] border-[#CDEBDD]"
                                                    : "bg-[#FFF0F2] text-[#E24B5B] border-[#F5C2C7]"
                                                }`}
                                        >
                                            {status.text}
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>

                        {/* features */}
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                                <div className="text-2xl">⚡</div>
                                <p className="mt-2 text-sm font-medium text-[#0B5C73]">Quick responses</p>
                                <p className="text-xs text-gray-500 mt-1">We value your time</p>
                            </div>

                            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                                <div className="text-2xl">🔒</div>
                                <p className="mt-2 text-sm font-medium text-[#0B5C73]">Secure</p>
                                <p className="text-xs text-gray-500 mt-1">Privacy-first handling</p>
                            </div>

                            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                                <div className="text-2xl">🤝</div>
                                <p className="mt-2 text-sm font-medium text-[#0B5C73]">Partner-first</p>
                                <p className="text-xs text-gray-500 mt-1">Collaborative approach</p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}

/* ---------------- Small reusable Input ---------------- */
function Input({
    label,
    value,
    onChange,
    placeholder,
    error,
    type = "text",
    autoComplete,
}: {
    label: string;
    value?: string;
    onChange: (v: string) => void;
    placeholder?: string;
    error?: string | undefined;
    type?: string;
    autoComplete?: string;
}) {
    return (
        <label className="block">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{label}</span>
            </div>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoComplete={autoComplete}
                className={`mt-1 block w-full rounded-xl px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-[#1FA6B8]/30 transition ${error ? "border-[#E24B5B]" : "border-gray-200"}`}
                aria-invalid={!!error}
            />
            {error && <p className="mt-1 text-xs text-[#E24B5B]">{error}</p>}
        </label>
    );
}

/* ---------------- ReachUsSelect ----------------
   - Shows publicName only
   - Closes on outside click & on Escape
   - Keyboard navigation (Arrow keys, Enter)
*/
function ReachUsSelect({
    options,
    loading,
    error,
    selectedValue,
    onSelect,
}: {
    options: ReachUsOption[];
    loading: boolean;
    error: string | null;
    selectedValue?: string; // publicName
    onSelect: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [highlightIndex, setHighlightIndex] = useState(0);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const listRef = useRef<HTMLUListElement | null>(null);

    // filter by publicName or description
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter((o) => o.publicName.toLowerCase().includes(q) || (o.description ?? "").toLowerCase().includes(q));
    }, [options, query]);

    const selectedOption = options.find((o) => o.publicName === selectedValue);

    useEffect(() => {
        if (!open) {
            setQuery("");
            setHighlightIndex(0);
        }
    }, [open]);

    // close on outside click (works for mouse & touch) + Escape
    useEffect(() => {
        function onDocClick(ev: Event) {
            if (!rootRef.current) return;
            const target = ev.target as Node | null;
            if (!target) return;
            if (!rootRef.current.contains(target)) {
                setOpen(false);
            }
        }
        function onKey(ev: KeyboardEvent) {
            if (ev.key === "Escape") setOpen(false);
        }

        // cast to EventListener to satisfy TS for touchstart listener overloads
        document.addEventListener("mousedown", onDocClick);
        document.addEventListener("touchstart", onDocClick as EventListener);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDocClick);
            document.removeEventListener("touchstart", onDocClick as EventListener);
            document.removeEventListener("keydown", onKey);
        };
    }, []);

    function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHighlightIndex((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
            scrollToHighlighted(highlightIndex + 1);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            setHighlightIndex((i) => Math.max(i - 1, 0));
            scrollToHighlighted(highlightIndex - 1);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (filtered[highlightIndex]) choose(filtered[highlightIndex]);
            else setOpen(false);
        } else if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
        }
    }

    function choose(opt: ReachUsOption) {
        onSelect(opt.publicName);
        setOpen(false);
    }

    function clearSelection() {
        onSelect("");
        inputRef.current?.focus();
    }

    function scrollToHighlighted(index: number) {
        const ul = listRef.current;
        if (!ul) return;
        const item = ul.children[index] as HTMLElement | undefined;
        if (item) {
            const itemTop = item.offsetTop;
            const itemBottom = itemTop + item.offsetHeight;
            if (itemTop < ul.scrollTop) ul.scrollTop = itemTop;
            else if (itemBottom > ul.scrollTop + ul.clientHeight) ul.scrollTop = itemBottom - ul.clientHeight;
        }
    }

    return (
        <div ref={rootRef} className="relative">
            <div className="flex items-center gap-2">
                <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls="reachus-listbox"
                    aria-autocomplete="list"
                    placeholder={loading ? "Loading categories..." : error ? "Failed to load" : selectedOption ? selectedOption.publicName : "Search category (e.g. Order Support)"}
                    value={open ? query : selectedOption ? selectedOption.publicName : query}
                    onFocus={() => setOpen(true)}
                    onClick={() => setOpen(true)}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                        setHighlightIndex(0);
                    }}
                    onKeyDown={onKeyDown}
                    className="mt-1 block w-full rounded-xl px-4 py-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1FA6B8]/30 transition"
                    disabled={loading || !!error}
                />
                {selectedOption && (
                    <button type="button" onClick={clearSelection} aria-label="Clear category" className="ml-2 inline-flex items-center justify-center rounded-md px-2 py-2 border border-gray-200 bg-white hover:bg-gray-50">
                        ✕
                    </button>
                )}
            </div>

            {open && !loading && !error && (
                <ul id="reachus-listbox" ref={listRef} role="listbox" className="absolute z-40 mt-2 w-full max-h-48 overflow-auto rounded-lg bg-white border border-gray-200 shadow-lg">
                    {filtered.length === 0 && <li className="px-4 py-2 text-sm text-gray-500">No categories match “{query}”</li>}

                    {filtered.map((opt, idx) => {
                        const isHighlighted = idx === highlightIndex;
                        return (
                            <li
                                key={opt._id}
                                role="option"
                                aria-selected={selectedValue === opt.publicName}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    choose(opt);
                                }}
                                onMouseEnter={() => setHighlightIndex(idx)}
                                className={`cursor-pointer px-4 py-2 text-sm ${isHighlighted ? "bg-[#EAF7FA]" : "hover:bg-gray-50"} ${selectedValue === opt.publicName ? "font-semibold" : ""}`}
                            >
                                <div className="truncate">
                                    <div className="text-[#0B5C73]">{opt.publicName}</div>
                                    {opt.description && <div className="text-xs text-gray-500 truncate">{opt.description}</div>}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {loading && <div className="mt-1 text-xs text-gray-500">Loading categories…</div>}
            {error && <div className="mt-1 text-xs text-red-500">{error}</div>}
        </div>
    );
}