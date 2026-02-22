"use client";

import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Address as SharedAddress } from "../types/address";
import { authFetch } from "@/lib/auth";

const API_BASE = (
    process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000/v1"
).replace(/\/$/, "");

export type Address = SharedAddress;

type Props = {
    show: boolean;
    onClose: () => void;
    onCreated?: (localAddress: Address) => void;
    onUpdated?: (updatedAddress: Address) => void;
    editAddress?: Address | null;
};

/* ---------------- Utilities ---------------- */

function getStoredCustomerId(): string | null {
    if (typeof window === "undefined") return null;

    try {
        const raw = localStorage.getItem("auth");
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.customerId) return parsed.customerId;
        }

        const token = localStorage.getItem("accessToken");
        if (!token) return null;

        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload?.customerId || payload?._id || null;
    } catch {
        return null;
    }
}

function isValidIndianPincode(pin: string) {
    return /^[1-9][0-9]{5}$/.test(pin);
}

async function fetchPostalDetails(pincode: string) {
    try {
        const res = await fetch(
            `https://api.postalpincode.in/pincode/${encodeURIComponent(pincode)}`
        );

        if (!res.ok) return { ok: false };

        const data = await res.json();

        if (
            !Array.isArray(data) ||
            data[0]?.Status !== "Success" ||
            !data[0]?.PostOffice?.length
        ) {
            return { ok: false };
        }

        const po = data[0].PostOffice[0];

        return {
            ok: true,
            state: po.State,
            district: po.District,
            city: po.Block || po.Name,
        };
    } catch {
        return { ok: false };
    }
}

async function fetchPincodeServiceability(pincode: string) {
    try {
        const res = await authFetch(
            `${API_BASE}/logistic_partner/get_pincode_serviceability/${encodeURIComponent(pincode)}`,
            { method: "GET" }
        );

        const json = await res.json();
        if (!res.ok) return { ok: false };

        return { ok: true, prepaid: json?.data?.prepaid === true };
    } catch {
        return { ok: false };
    }
}

/* ---------------- Blank Template ---------------- */

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

export default function AddressModal({
    show,
    onClose,
    onCreated,
    onUpdated,
    editAddress,
}: Props) {

    const mountedRef = useRef(true);
    const postalDebounceRef = useRef<NodeJS.Timeout | null>(null);

    const [form, setForm] = useState<Address>({ ...blankAddress });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [isLocationLocked, setIsLocationLocked] = useState(false);

    const [formSvc, setFormSvc] = useState<{
        checking: boolean;
        prepaid: boolean | null;
    }>({ checking: false, prepaid: null });

    const firstInputRef = useRef<HTMLInputElement | null>(null);

    /* ------------ Mount Guard ------------ */

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    /* ------------ Open Modal ------------ */

    useEffect(() => {
        if (!show) return;

        if (editAddress) {
            setForm({ ...blankAddress, ...editAddress });
        } else {
            setForm({ ...blankAddress, id: `local_${Date.now()}` });
        }

        setErrors({});
        setIsLocationLocked(false);
        setFormSvc({ checking: false, prepaid: null });

        setTimeout(() => firstInputRef.current?.focus(), 0);
    }, [show, editAddress]);

    /* ------------ Escape Close ------------ */

    useEffect(() => {
        if (!show) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [show, onClose]);

    /* ------------ Pincode AutoFill ------------ */

    async function handlePostalAutoFill(value: string) {
        const clean = value.replace(/\D/g, "").slice(0, 6);

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

            // Serviceability Check
            setFormSvc({ checking: true, prepaid: null });
            const svc = await fetchPincodeServiceability(clean);
            if (mountedRef.current) {
                setFormSvc({
                    checking: false,
                    prepaid: svc.ok ? !!svc.prepaid : null
                });
            }

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
                }
            }, 400);
        }
    }

    /* ------------ Validation ------------ */

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

        if (!form.district.trim())
            newErrors.district = "District is required";

        if (!form.city.trim())
            newErrors.city = "City is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    /* ------------ Save ------------ */

    async function saveAddress() {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            if (!validateForm()) return;

            if (formSvc.prepaid === false) {
                setErrors(e => ({ ...e, pincode: "This pincode is not serviceable" }));
                return;
            }

            const cust = getStoredCustomerId();
            if (!cust) {
                alert("Please login again.");
                return;
            }

            const payload = {
                recipientName: form.recipientName.trim(),
                recipientContact: form.recipientContact.trim(),
                addressLine1: form.addressLine1.trim(),
                addressLine2: form.addressLine2 || null,
                addressLine3: form.addressLine3 || null,
                landmark: form.landmark || null,
                state: form.state.trim(),
                district: form.district.trim(),
                city: form.city.trim(),
                pincode: form.pincode,
                isDefault: !!form.isDefault,
            };

            if (form.serverId) {
                await authFetch(`${API_BASE}/customer/${cust}/address/${form.serverId}`, {
                    method: "PUT",
                    body: JSON.stringify(payload),
                });
                onUpdated?.(form);
            } else {
                const res = await authFetch(`${API_BASE}/customer/${cust}/address`, {
                    method: "POST",
                    body: JSON.stringify(payload),
                });
                const json = await res.json();
                onCreated?.({ ...form, serverId: json?.address?._id });
            }

            onClose();
        } catch (err: any) {
            alert(err?.message || "Failed to save address");
        } finally {
            setIsSubmitting(false);
        }
    }

    if (!show) return null;

    return (
        <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 py-6"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="bg-white rounded-2xl shadow w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between px-5 py-4 border-b">
                    <h3 className="text-lg font-semibold">
                        {form.serverId ? "Edit address" : "Add address"}
                    </h3>
                    <button onClick={onClose} className="p-2">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 overflow-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                        {/* All fields preserved here — full layout intact */}
                        {/* (Recipient, Contact, Address1, Address2, Address3, Landmark, State, District, City, Pincode, Default checkbox) */}

                        {/* Recipient Name */}
                        <div>
                            <label className="block text-sm mb-1">Recipient Name</label>
                            <input
                                ref={firstInputRef}
                                value={form.recipientName}
                                onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                                className={`border p-3 rounded-md w-full text-sm ${errors.recipientName ? "border-red-500" : "border-slate-300"}`}
                            />
                            {errors.recipientName && <p className="text-xs text-red-500 mt-1">{errors.recipientName}</p>}
                        </div>

                        {/* Contact */}
                        <div>
                            <label className="block text-sm mb-1">Recipient Contact</label>
                            <input
                                value={form.recipientContact}
                                onChange={(e) => setForm({ ...form, recipientContact: e.target.value })}
                                className={`border p-3 rounded-md w-full text-sm ${errors.recipientContact ? "border-red-500" : "border-slate-300"}`}
                            />
                            {errors.recipientContact && <p className="text-xs text-red-500 mt-1">{errors.recipientContact}</p>}
                        </div>

                        {/* Address Line 1 */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm mb-1">Address Line 1</label>
                            <input
                                value={form.addressLine1}
                                onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                                className={`border p-3 rounded-md w-full text-sm ${errors.addressLine1 ? "border-red-500" : "border-slate-300"}`}
                            />
                        </div>

                        {/* Address Line 2 */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm mb-1">Address Line 2</label>
                            <input
                                value={form.addressLine2 ?? ""}
                                onChange={(e) => setForm({ ...form, addressLine2: e.target.value || null })}
                                className="border p-3 rounded-md w-full text-sm"
                            />
                        </div>

                        {/* Address Line 3 */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm mb-1">Address Line 3</label>
                            <input
                                value={form.addressLine3 ?? ""}
                                onChange={(e) => setForm({ ...form, addressLine3: e.target.value || null })}
                                className="border p-3 rounded-md w-full text-sm"
                            />
                        </div>

                        {/* Landmark */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm mb-1">Landmark</label>
                            <input
                                value={form.landmark ?? ""}
                                onChange={(e) => setForm({ ...form, landmark: e.target.value || null })}
                                className="border p-3 rounded-md w-full text-sm"
                            />
                        </div>

                        {/* Pincode */}
                        <div>
                            <label className="block text-sm mb-1">Pincode</label>
                            <input
                                value={form.pincode}
                                maxLength={6}
                                onChange={(e) => handlePostalAutoFill(e.target.value)}
                                className="border p-3 rounded-md w-full text-sm"
                            />
                            {isFetchingLocation && (
                                <div className="text-xs text-slate-500 mt-1">Fetching location…</div>
                            )}
                            {formSvc.checking && (
                                <div className="text-xs text-slate-500 mt-1">Checking serviceability…</div>
                            )}
                            {formSvc.prepaid === false && (
                                <div className="text-xs text-rose-600 mt-1">This pincode is not serviceable.</div>
                            )}
                            {formSvc.prepaid === true && (
                                <div className="text-xs text-green-600 mt-1">Serviceable.</div>
                            )}
                            {errors.pincode && (
                                <p className="text-xs text-red-500 mt-1">{errors.pincode}</p>
                            )}
                        </div>

                        {/* State */}
                        <div>
                            <label className="block text-sm mb-1">State</label>
                            <input
                                value={form.state}
                                disabled={isLocationLocked}
                                onChange={(e) => setForm({ ...form, state: e.target.value })}
                                className="border p-3 rounded-md w-full text-sm"
                            />
                            {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
                        </div>

                        {/* District */}
                        <div>
                            <label className="block text-sm mb-1">District</label>
                            <input
                                value={form.district}
                                disabled={isLocationLocked}
                                onChange={(e) => setForm({ ...form, district: e.target.value })}
                                className="border p-3 rounded-md w-full text-sm"
                            />
                            {errors.district && <p className="text-xs text-red-500 mt-1">{errors.district}</p>}
                        </div>

                        {/* City */}
                        <div>
                            <label className="block text-sm mb-1">City</label>
                            <input
                                value={form.city}
                                disabled={isLocationLocked}
                                onChange={(e) => setForm({ ...form, city: e.target.value })}
                                className="border p-3 rounded-md w-full text-sm"
                            />
                            {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                        </div>

                        {/* Default */}
                        <label className="sm:col-span-2 flex items-center gap-2 mt-2">
                            <input
                                type="checkbox"
                                checked={!!form.isDefault}
                                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                            />
                            <span className="text-sm">Set as default address</span>
                        </label>
                    </div>
                </div>

                <div className="px-5 py-3 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 border rounded-md">
                        Cancel
                    </button>
                    <button
                        onClick={saveAddress}
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-md bg-[#065975] text-white"
                    >
                        {isSubmitting ? "Saving..." : form.serverId ? "Update address" : "Save address"}
                    </button>
                </div>
            </div>
        </div>
    );
}