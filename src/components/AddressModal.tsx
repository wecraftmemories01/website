"use client";

import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Address as SharedAddress } from "../types/address";

export type Address = SharedAddress;

type Props = {
    show: boolean;
    onClose: () => void;
    onCreated?: (localAddress: Address) => void;
    onSuccess?: () => void;
};

/* ---------------- Utilities ---------------- */

function getApiBase(): string {
    if (typeof window === "undefined") return "";
    return process.env.NEXT_PUBLIC_API_BASE ? String(process.env.NEXT_PUBLIC_API_BASE) : "";
}

function buildUrl(path: string) {
    const base = getApiBase().replace(/\/$/, "");
    if (!base) return path.startsWith("/") ? path : `/${path}`;
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function getAuth() {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem("auth");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accessToken");
}

function getCustomerId(): string | null {
    const auth = getAuth();
    if (auth?.customerId) return auth.customerId;

    const token = getAuthToken();
    if (!token) return null;

    try {
        const base64 = token.split(".")[1];
        const payload = JSON.parse(atob(base64.replace(/-/g, "+").replace(/_/g, "/")));
        return payload?.customerId || payload?._id || null;
    } catch {
        return null;
    }
}

async function safeJson(res: Response) {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
        try {
            return await res.json();
        } catch {
            return null;
        }
    }
    return null;
}

function isValidIndianPincode(pin: string) {
    return /^[1-9][0-9]{5}$/.test(pin);
}

/* ---------------- Postal API ---------------- */

async function fetchPostalDetails(pincode: string) {
    try {
        const res = await fetch(
            `https://api.postalpincode.in/pincode/${encodeURIComponent(pincode)}`
        );

        if (!res.ok) {
            return { ok: false, message: `HTTP ${res.status}` };
        }

        const data = await res.json();

        if (
            !Array.isArray(data) ||
            data.length === 0 ||
            data[0].Status !== "Success" ||
            !data[0].PostOffice ||
            data[0].PostOffice.length === 0
        ) {
            return { ok: false, message: "Invalid pincode" };
        }

        const po = data[0].PostOffice[0];

        return {
            ok: true,
            state: po.State,
            district: po.District,
            city: po.Block || po.Name,
        };
    } catch (err: any) {
        return { ok: false, message: err?.message || "Failed to fetch pincode data" };
    }
}

/* ---------------- Serviceability ---------------- */

async function fetchPincodeServiceability(pincode: string) {
    const url = buildUrl(
        `/logistic_partner/get_pincode_serviceability/${encodeURIComponent(pincode)}`
    );

    const headers = new Headers({ "Content-Type": "application/json" });
    const token = getAuthToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    try {
        const res = await fetch(url, { method: "GET", headers });

        if (!res.ok) {
            const json = await safeJson(res);
            return {
                ok: false,
                message: json?.error || json?.message || `HTTP ${res.status}`,
            };
        }

        const json = await safeJson(res);
        return {
            ok: true,
            prepaid: json?.data?.prepaid === true,
        };
    } catch (err: any) {
        return { ok: false, message: err?.message ?? String(err) };
    }
}

/* ---------------- Create API ---------------- */

async function apiCreateAddress(customerId: string, addr: Address) {
    const url = buildUrl(`/customer/${encodeURIComponent(customerId)}/address`);
    const headers = new Headers({ "Content-Type": "application/json" });
    const token = getAuthToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const payload = {
        recipientName: addr.recipientName.trim(),
        recipientContact: addr.recipientContact,
        addressLine1: addr.addressLine1.trim(),
        addressLine2: addr.addressLine2 || null,
        addressLine3: addr.addressLine3 || null,
        landmark: addr.landmark || null,
        state: addr.state.trim(),
        district: addr.district.trim(),
        city: addr.city.trim(),
        pincode: addr.pincode,
        isDefault: !!addr.isDefault,
    };

    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });

    const json = await safeJson(res);
    if (!res.ok) {
        throw new Error(json?.error || "Failed to create address");
    }

    return json;
}

/* ---------------- Component ---------------- */

const blankAddress: Address = {
    id: `local_${Date.now()}`,
    serverId: null,
    recipientName: "",
    recipientContact: "",
    addressLine1: "",
    addressLine2: null,
    addressLine3: null,
    landmark: null,
    state: "",
    district: "",
    city: "",
    country: "India",
    pincode: "",
    isDefault: false,
};

export default function AddressModal({ show, onClose, onCreated, onSuccess }: Props) {
    const mountedRef = useRef(true);
    const postalDebounceRef = useRef<NodeJS.Timeout | null>(null);

    const [form, setForm] = useState<Address>({ ...blankAddress });
    const [formSvc, setFormSvc] = useState<{ checking: boolean; prepaid: boolean | null; error?: string }>({
        checking: false,
        prepaid: null,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLocationLocked, setIsLocationLocked] = useState(false);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const firstInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!show) return;

        setForm({ ...blankAddress, id: `local_${Date.now()}` });
        setFormSvc({ checking: false, prepaid: null });

        setTimeout(() => {
            firstInputRef.current?.focus();
        }, 0);
    }, [show]);

    useEffect(() => {
        if (!show) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [show, onClose]);

    async function handlePostalAutoFill(value: string) {
        const clean = value.replace(/\D/g, "");
        setForm((prev) => ({
            ...prev,
            pincode: clean,
            state: clean.length < 6 ? "" : prev.state,
            district: clean.length < 6 ? "" : prev.district,
            city: clean.length < 6 ? "" : prev.city,
        }));

        setIsLocationLocked(false);

        if (postalDebounceRef.current) {
            clearTimeout(postalDebounceRef.current);
        }

        if (clean.length === 6 && isValidIndianPincode(clean)) {
            postalDebounceRef.current = setTimeout(async () => {
                setIsFetchingLocation(true);

                const result = await fetchPostalDetails(clean);

                setIsFetchingLocation(false);

                if (!mountedRef.current) return;

                if (result.ok) {
                    setForm((prev) => ({
                        ...prev,
                        state: result.state,
                        district: result.district,
                        city: result.city,
                    }));

                    setIsLocationLocked(true);
                } else {
                    setIsLocationLocked(false);
                }
            }, 500);
        }
    }

    function validateForm() {
        const newErrors: Record<string, string> = {};

        if (!form.recipientName.trim())
            newErrors.recipientName = "Recipient name is required";

        if (!form.recipientContact.trim())
            newErrors.recipientContact = "Contact is required";

        if (!form.addressLine1.trim())
            newErrors.addressLine1 = "Address Line 1 is required";

        if (!form.pincode.trim())
            newErrors.pincode = "Pincode is required";
        else if (!isValidIndianPincode(form.pincode))
            newErrors.pincode = "Enter valid 6-digit pincode";

        if (!form.state.trim())
            newErrors.state = "State is required";

        if (!form.city.trim())
            newErrors.city = "City is required";

        if (!form.district.trim())
            newErrors.district = "District is required";

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    }

    async function saveAddress() {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            if (!validateForm()) {
                return;
            }

            const svc = await fetchPincodeServiceability(form.pincode);
            if (!svc.ok || !svc.prepaid) {
                alert("This pincode is not serviceable.");
                return;
            }

            const cust = getCustomerId();
            if (!cust) {
                alert("Please login again.");
                return;
            }

            const json = await apiCreateAddress(cust, form);
            const created = json?.address;

            onCreated?.({
                ...form,
                id: `srv_${created._id}`,
                serverId: created._id,
            });

            if (onSuccess) await onSuccess();
            onClose();
        } catch (err: any) {
            alert(err?.message || "Failed to save address");
        } finally {
            setIsSubmitting(false);
        }
    }

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
            <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-3xl shadow-lg max-h-[95vh] flex flex-col animate-slideUp">
                <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
                    <h3 className="text-lg font-semibold text-[#065975]">
                        Add Delivery Address
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 transition"
                    >
                        <X className="w-5 h-5 text-slate-600" />
                    </button>
                </div>

                <div className="p-5 overflow-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                        {/* Recipient Name */}
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Recipient Name</label>
                            <input
                                ref={firstInputRef}
                                value={form.recipientName}
                                onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                                placeholder="Enter recipient name"
                                className={`border border-slate-300 focus:border-[#065975] focus:ring-2 focus:ring-[#065975]/20 p-3 rounded-xl w-full transition text-sm ${errors.recipientName ? "border-red-500" : ""
                                    }`}
                            />
                            {errors.recipientName && (
                                <p className="text-xs text-red-500 mt-1">
                                    {errors.recipientName}
                                </p>
                            )}
                        </div>

                        {/* Recipient Contact */}
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Recipient Contact</label>
                            <input
                                value={form.recipientContact}
                                onChange={(e) => setForm({ ...form, recipientContact: e.target.value })}
                                placeholder="Enter recipient contact"
                                className={`border border-slate-300 focus:border-[#065975] focus:ring-2 focus:ring-[#065975]/20 p-3 rounded-xl w-full transition text-sm ${errors.recipientContact ? "border-red-500" : ""
                                    }`}
                            />
                            {errors.recipientContact && (
                                <p className="text-xs text-red-500 mt-1">
                                    {errors.recipientContact}
                                </p>
                            )}
                        </div>

                        {/* Address Line 1 */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm text-slate-600 mb-1">Address Line 1</label>
                            <input
                                value={form.addressLine1}
                                onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                                placeholder="House, Building, Street"
                                className={`border border-slate-300 focus:border-[#065975] focus:ring-2 focus:ring-[#065975]/20 p-3 rounded-xl w-full transition text-sm ${errors.addressLine1 ? "border-red-500" : ""
                                    }`}
                            />
                            {errors.addressLine1 && (
                                <p className="text-xs text-red-500 mt-1">
                                    {errors.addressLine1}
                                </p>
                            )}
                        </div>

                        {/* Address Line 2 */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm text-slate-600 mb-1">Address Line 2</label>
                            <input
                                value={form.addressLine2 ?? ""}
                                onChange={(e) => setForm({ ...form, addressLine2: e.target.value || null })}
                                placeholder="Apartment, Floor, Area (optional)"
                                className={`border border-slate-300 focus:border-[#065975] focus:ring-2 focus:ring-[#065975]/20 p-3 rounded-xl w-full transition text-sm ${errors.addressLine2 ? "border-red-500" : ""
                                    }`}
                            />
                        </div>

                        {/* Address Line 3 */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm text-slate-600 mb-1">Address Line 3</label>
                            <input
                                value={form.addressLine3 ?? ""}
                                onChange={(e) => setForm({ ...form, addressLine3: e.target.value || null })}
                                placeholder="Additional directions (optional)"
                                className={`border border-slate-300 focus:border-[#065975] focus:ring-2 focus:ring-[#065975]/20 p-3 rounded-xl w-full transition text-sm ${errors.addressLine3 ? "border-red-500" : ""
                                    }`}
                            />
                        </div>

                        {/* Landmark */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm text-slate-600 mb-1">Landmark</label>
                            <input
                                value={form.landmark ?? ""}
                                onChange={(e) => setForm({ ...form, landmark: e.target.value || null })}
                                placeholder="Nearby place or landmark (optional)"
                                className={`border border-slate-300 focus:border-[#065975] focus:ring-2 focus:ring-[#065975]/20 p-3 rounded-xl w-full transition text-sm ${errors.landmark ? "border-red-500" : ""
                                    }`}
                            />
                        </div>

                        {/* Pincode */}
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Pincode</label>

                            <input
                                value={form.pincode}
                                maxLength={6}
                                onChange={(e) => handlePostalAutoFill(e.target.value)}
                                placeholder="Enter 6-digit pincode"
                                className={`border border-slate-300 focus:border-[#065975] focus:ring-2 focus:ring-[#065975]/20 p-3 rounded-xl w-full transition text-sm ${errors.pincode ? "border-red-500" : ""
                                    }`}
                            />

                            {/* Fetching Indicator */}
                            {isFetchingLocation && (
                                <div className="flex items-center gap-2 text-xs text-[#065975] mt-1">
                                    <div className="w-3 h-3 border-2 border-[#065975] border-t-transparent rounded-full animate-spin" />
                                    <span>Fetching location...</span>
                                </div>
                            )}

                            {/* Validation Error */}
                            {errors.pincode && (
                                <p className="text-xs text-red-500 mt-1">
                                    {errors.pincode}
                                </p>
                            )}
                        </div>

                        {/* State */}
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">State</label>
                            <input
                                value={form.state}
                                disabled={isLocationLocked}
                                onChange={(e) =>
                                    setForm({ ...form, state: e.target.value })
                                }
                                className={`border border-slate-300 p-3 rounded-xl w-full text-sm bg-slate-50 ${errors.state ? "border-red-500" : ""
                                    } ${isLocationLocked ? "cursor-not-allowed opacity-80" : ""}`}
                            />

                            {isLocationLocked && (
                                <p className="text-xs text-slate-500 mt-1">
                                    Auto-filled from pincode
                                </p>
                            )}

                            {errors.state && (
                                <p className="text-xs text-red-500 mt-1">
                                    {errors.state}
                                </p>
                            )}
                        </div>

                        {/* District */}
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">District</label>
                            <input
                                value={form.district}
                                disabled={isLocationLocked}
                                onChange={(e) =>
                                    setForm({ ...form, district: e.target.value })
                                }
                                className={`border border-slate-300 p-3 rounded-xl w-full text-sm bg-slate-50 ${errors.district ? "border-red-500" : ""
                                    } ${isLocationLocked ? "cursor-not-allowed opacity-80" : ""}`}
                            />

                            {isLocationLocked && (
                                <p className="text-xs text-slate-500 mt-1">
                                    Auto-filled from pincode
                                </p>
                            )}

                            {errors.district && (
                                <p className="text-xs text-red-500 mt-1">
                                    {errors.district}
                                </p>
                            )}
                        </div>

                        {/* City */}
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">City</label>
                            <input
                                value={form.city}
                                disabled={isLocationLocked}
                                onChange={(e) =>
                                    setForm({ ...form, city: e.target.value })
                                }
                                className={`border border-slate-300 p-3 rounded-xl w-full text-sm bg-slate-50 ${errors.city ? "border-red-500" : ""
                                    } ${isLocationLocked ? "cursor-not-allowed opacity-80" : ""}`}
                            />
                            
                            {isLocationLocked && (
                                <p className="text-xs text-slate-500 mt-1">
                                    Auto-filled from pincode
                                </p>
                            )}

                            {errors.city && (
                                <p className="text-xs text-red-500 mt-1">
                                    {errors.city}
                                </p>
                            )}
                        </div>

                        {/* Default */}
                        <label className="sm:col-span-2 flex items-center gap-3 mt-2">
                            <input
                                type="checkbox"
                                checked={!!form.isDefault}
                                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                            />
                            <span className="text-sm text-slate-700">Set as default address</span>
                        </label>

                    </div>
                </div>

                <div className="px-5 py-4 border-t bg-white sticky bottom-0 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 border border-slate-300 rounded-xl text-slate-600 font-medium"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={saveAddress}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-3 bg-[#065975] text-white rounded-xl font-medium shadow-sm active:scale-[0.98] transition"
                    >
                        {isSubmitting ? "Saving..." : "Save Address"}
                    </button>
                </div>
            </div>
        </div>
    );
}