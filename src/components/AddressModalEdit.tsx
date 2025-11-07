'use client';

import React, { useEffect, useRef, useState } from "react";
import Select from "react-select";
import { X } from "lucide-react";
import type { Address as SharedAddress } from "../types/address";

/**
 * Re-export the shared Address type so existing imports that do:
 *   import AddressModalEdit, { Address as EditAddressType } from "./AddressModalEdit"
 * continue to work.
 */
export type Address = SharedAddress;

/** Props */
type Props = {
    show: boolean;
    onClose: () => void;
    onCreated?: (localAddress: Address) => void; // called after optimistic local save (and/or after server refresh)
    onUpdated?: (updatedAddress: Address) => void; // called after successful update
    editAddress?: Address | null; // optional: if provided, modal works in edit mode
};

const CUSTOMER_KEY = "customerId";
const TOKEN_KEY = "accessToken";

/** Utilities (self-contained so this component is portable) */
function getApiBase(): string {
    if (typeof window === "undefined") return "";
    return process.env.NEXT_PUBLIC_API_BASE ? String(process.env.NEXT_PUBLIC_API_BASE) : "http://localhost:3000";
}
function buildUrl(path: string) {
    const base = getApiBase().replace(/\/$/, "");
    if (!base) return path.startsWith("/") ? path : `/${path}`;
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
function getAuthToken(): string | null {
    try {
        if (typeof window === "undefined") return null;
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}
async function safeJson(res: Response) {
    const ct = res.headers.get("content-type") || "";
    const isJson = ct.includes("application/json");
    if (isJson) {
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

/** API helpers used by the modal */
async function apiFetchCountries(): Promise<Array<{ _id: string; countryName: string }>> {
    try {
        const url = buildUrl(`/master/countries`);
        const res = await fetch(url);
        if (!res.ok) return [];
        const json = await safeJson(res);
        const arr = Array.isArray((json as any)?.countryData) ? (json as any).countryData : [];
        return arr.map((c: any) => ({ _id: String(c._id), countryName: c.countryName ?? c.countryCode ?? "" }));
    } catch {
        return [];
    }
}
async function apiFetchStates(countryId?: string) {
    try {
        const url = countryId ? buildUrl(`/master/states?countryId=${encodeURIComponent(countryId)}`) : buildUrl(`/master/states`);
        const res = await fetch(url);
        if (!res.ok) return [];
        const json = await safeJson(res);
        const arr = Array.isArray((json as any)?.stateData) ? (json as any).stateData : [];
        return arr.map((s: any) => ({
            _id: String(s._id),
            stateName: s.stateName ?? s.name ?? "",
            country: s.country ? (typeof s.country === "object" ? { _id: String(s.country._id) } : { _id: String(s.country) }) : undefined,
        }));
    } catch {
        return [];
    }
}
async function apiFetchCities(stateId?: string) {
    try {
        const url = stateId ? buildUrl(`/master/cities?stateId=${encodeURIComponent(stateId)}`) : buildUrl(`/master/cities`);
        const res = await fetch(url);
        if (!res.ok) return [];
        const json = await safeJson(res);
        const arr = Array.isArray((json as any)?.cityData) ? (json as any).cityData : [];
        return arr.map((c: any) => ({
            _id: String(c._id),
            cityName: c.cityName ?? c.name ?? "",
            state: c.state ? (typeof c.state === "object" ? { _id: String(c.state._id) } : { _id: String(c.state) }) : undefined,
        }));
    } catch {
        return [];
    }
}

/** serviceability endpoint used by the modal */
async function fetchPincodeServiceability(pincode: string) {
    const url = buildUrl(`/logistic_partner/get_pincode_serviceability/${encodeURIComponent(pincode)}`);
    try {
        const res = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
        if (!res.ok) {
            const json = await safeJson(res);
            return { ok: false, message: json?.error || json?.message || `HTTP ${res.status}` };
        }
        const json = await safeJson(res);
        const data = json?.data ?? null;
        const prepaid = data && data.prepaid === true;
        return { ok: true, prepaid, raw: json };
    } catch (err: any) {
        return { ok: false, message: err?.message ?? String(err) };
    }
}

/** create address on server */
async function apiCreateAddress(customerId: string, addr: Address): Promise<any> {
    const url = buildUrl(`/customer/${encodeURIComponent(customerId)}/address`);
    const headers = new Headers({ "Content-Type": "application/json" });
    const token = getAuthToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const payload: any = {
        recipientName: addr.recipientName,
        recipientContact: addr.recipientContact,
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2 ?? "",
        addressLine3: addr.addressLine3 ?? "",
        landmark: addr.landmark ?? "",
        countryId: addr.countryId,
        stateId: addr.stateId,
        cityId: addr.cityId,
        pincode: addr.pincode,
        isDefault: !!addr.isDefault,
    };

    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
    if (res.status === 401) {
        const json = await safeJson(res);
        throw new Error(json?.message || json?.error || "Unauthorized");
    }
    const json = await safeJson(res);
    if (!res.ok) {
        throw new Error(json?.error || json?.message || `Failed to create address (${res.status})`);
    }
    return json;
}

/** update address on server (PUT) */
async function apiUpdateAddress(customerId: string, addressId: string, addr: Address): Promise<any> {
    const url = buildUrl(`/customer/${encodeURIComponent(customerId)}/address/${encodeURIComponent(addressId)}`);
    const headers = new Headers({ "Content-Type": "application/json" });
    const token = getAuthToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const payload: any = {
        recipientName: addr.recipientName,
        recipientContact: addr.recipientContact,
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2 ?? "",
        addressLine3: addr.addressLine3 ?? "",
        landmark: addr.landmark ?? "",
        countryId: addr.countryId,
        stateId: addr.stateId,
        cityId: addr.cityId,
        pincode: addr.pincode,
        isDefault: !!addr.isDefault,
    };

    const res = await fetch(url, { method: "PUT", headers, body: JSON.stringify(payload) });
    if (res.status === 401) {
        const json = await safeJson(res);
        throw new Error(json?.message || json?.error || "Unauthorized");
    }
    const json = await safeJson(res);
    if (!res.ok) {
        throw new Error(json?.error || json?.message || `Failed to update address (${res.status})`);
    }
    return json;
}

/** Map server record to local Address */
function mapServerAddressToLocal(serverRec: any): Address {
    const serverId = serverRec._id ? String(serverRec._id) : null;
    const localId = serverId ? `srv_${serverId}` : `local_${Date.now() + Math.floor(Math.random() * 1000)}`;

    return {
        id: localId,
        serverId: serverId,
        recipientName: serverRec.recipientName ?? "",
        recipientContact: serverRec.recipientContact ?? "",
        addressLine1: serverRec.addressLine1 ?? "",
        addressLine2: serverRec.addressLine2 ?? null,
        addressLine3: serverRec.addressLine3 ?? null,
        landmark: serverRec.landmark ?? null,
        countryId:
            serverRec.countryId ??
            (serverRec.country ? (typeof serverRec.country === "object" ? String(serverRec.country._id) : String(serverRec.country)) : null),
        stateId:
            serverRec.stateId ?? (serverRec.state ? (typeof serverRec.state === "object" ? String(serverRec.state._1d) : String(serverRec.state)) : null),
        cityId:
            serverRec.cityId ?? (serverRec.city ? (typeof serverRec.city === "object" ? String(serverRec.city._id) : String(serverRec.city)) : null),
        countryName: serverRec.countryName ?? (serverRec.country?.countryName ?? null),
        stateName: serverRec.stateName ?? (serverRec.state?.stateName ?? null),
        cityName: serverRec.cityName ?? (serverRec.city?.cityName ?? null),
        pincode: serverRec.pincode ?? "",
        isDefault: !!serverRec.isDefault,
    };
}

/** Blank template — use nulls for optional fields to match ../types/address */
const blankAddress: Address = {
    id: `local_${Date.now()}`,
    serverId: null,
    recipientName: "",
    recipientContact: "",
    addressLine1: "",
    addressLine2: null,
    addressLine3: null,
    landmark: null,
    countryId: null,
    stateId: null,
    cityId: null,
    countryName: null,
    stateName: null,
    cityName: null,
    pincode: "",
    isDefault: false,
};

export default function AddressModal({ show, onClose, onCreated, onUpdated, editAddress }: Props) {
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const [form, setForm] = useState<Address>({ ...blankAddress });

    const [countries, setCountries] = useState<Array<{ _id: string; countryName: string }>>([]);
    const [states, setStates] = useState<Array<{ _id: string; stateName: string }>>([]);
    const [cities, setCities] = useState<Array<{ _id: string; cityName: string }>>([]);
    const [geoLoading, setGeoLoading] = useState({ countries: false, states: false, cities: false });

    // local pincode serviceability indicator for form
    const [formSvc, setFormSvc] = useState<{ checking: boolean; prepaid: boolean | null; error?: string }>({
        checking: false,
        prepaid: null,
    });

    // refs for backdrop + dialog + first input
    const backdropRef = useRef<HTMLDivElement | null>(null);
    const dialogRef = useRef<HTMLDivElement | null>(null);
    const firstInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!show) return;

        if (editAddress) {
            // populate form with provided editAddress (allow nulls)
            setForm({
                ...blankAddress,
                ...editAddress,
                id: editAddress.id ?? `local_${Date.now()}`,
                serverId: editAddress.serverId ?? null,
                pincode: editAddress.pincode ?? "",
                addressLine2: editAddress.addressLine2 ?? null,
                addressLine3: editAddress.addressLine3 ?? null,
                landmark: editAddress.landmark ?? null,
            });

            // always load countries so select can show label for the selected country
            (async () => {
                try {
                    setGeoLoading((g) => ({ ...g, countries: true }));
                    const list = await apiFetchCountries();
                    if (!mountedRef.current) return;
                    setCountries(list);
                } finally {
                    if (mountedRef.current) setGeoLoading((g) => ({ ...g, countries: false }));
                }
            })();

            // fetch states only if we actually have a countryId
            if (editAddress.countryId) {
                (async () => {
                    try {
                        setGeoLoading((g) => ({ ...g, states: true }));
                        const s = await apiFetchStates(String(editAddress.countryId));
                        if (!mountedRef.current) return;
                        setStates(s);
                    } finally {
                        if (mountedRef.current) setGeoLoading((g) => ({ ...g, states: false }));
                    }
                })();
            } else {
                setStates([]);
            }

            // fetch cities only if we actually have a stateId
            if (editAddress.stateId) {
                (async () => {
                    try {
                        setGeoLoading((g) => ({ ...g, cities: true }));
                        const c = await apiFetchCities(String(editAddress.stateId));
                        if (!mountedRef.current) return;
                        setCities(c);
                    } finally {
                        if (mountedRef.current) setGeoLoading((g) => ({ ...g, cities: false }));
                    }
                })();
            } else {
                setCities([]);
            }
        } else {
            // create mode
            setForm({ ...blankAddress, id: `local_${Date.now()}` });

            (async () => {
                try {
                    setGeoLoading((g) => ({ ...g, countries: true }));
                    const list = await apiFetchCountries();
                    if (!mountedRef.current) return;
                    setCountries(list);
                } finally {
                    if (mountedRef.current) setGeoLoading((g) => ({ ...g, countries: false }));
                }
            })();
            setStates([]);
            setCities([]);
            setFormSvc({ checking: false, prepaid: null });
        }

        // focus the first input when modal opens
        setTimeout(() => {
            firstInputRef.current?.focus();
        }, 0);
    }, [show, editAddress]);

    // close on Escape
    useEffect(() => {
        if (!show) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") {
                e.stopPropagation();
                onClose();
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [show, onClose]);

    async function onCountryChange(value: string) {
        setForm((f) => ({ ...f, countryId: value || null, stateId: null, cityId: null }));
        setStates([]);
        setCities([]);
        if (!value) return;
        try {
            setGeoLoading((g) => ({ ...g, states: true }));
            const s = await apiFetchStates(value);
            if (!mountedRef.current) return;
            setStates(s);
        } finally {
            if (mountedRef.current) setGeoLoading((g) => ({ ...g, states: false }));
        }
    }

    async function onStateChange(value: string) {
        setForm((f) => ({ ...f, stateId: value || null, cityId: null }));
        setCities([]);
        if (!value) return;
        try {
            setGeoLoading((g) => ({ ...g, cities: true }));
            const c = await apiFetchCities(value);
            if (!mountedRef.current) return;
            setCities(c);
        } finally {
            if (mountedRef.current) setGeoLoading((g) => ({ ...g, cities: false }));
        }
    }

    async function checkFormPincode(pincode: string) {
        const key = String(pincode || "").trim();
        if (!key || !isValidIndianPincode(key)) return;
        setFormSvc({ checking: true, prepaid: null });
        const svc = await fetchPincodeServiceability(key);
        if (!mountedRef.current) return;
        if (!svc.ok) {
            setFormSvc({ checking: false, prepaid: null, error: svc.message || "Service check failed" });
        } else {
            setFormSvc({ checking: false, prepaid: !!svc.prepaid });
        }
    }

    async function saveAddress() {
        if (!form.recipientName?.trim() || !form.addressLine1?.trim() || !(String(form.cityId || form.cityName || "").trim()) || !form.pincode?.trim()) {
            return alert("Please fill at least recipient name, address line 1, city and pincode");
        }
        if (!isValidIndianPincode(form.pincode)) {
            return alert("Enter a valid 6-digit PIN code");
        }

        // check serviceability
        setFormSvc({ checking: true, prepaid: null });
        const svc = await fetchPincodeServiceability(form.pincode);
        if (!svc.ok) {
            setFormSvc({ checking: false, prepaid: null, error: svc.message || "Service check failed" });
            return alert("Unable to verify pincode serviceability right now. Please try again.");
        }
        if (!svc.prepaid) {
            setFormSvc({ checking: false, prepaid: false });
            return alert("This pincode is not serviceable for prepaid (online) orders. Please use a different address or contact support.");
        }

        // Decide create vs update based on presence of serverId (edit mode)
        const cust = typeof window !== "undefined" ? localStorage.getItem(CUSTOMER_KEY) : null;
        if (!cust) {
            alert("Customer not logged in");
            return;
        }

        // If serverId exists -> update path
        if (form.serverId) {
            try {
                // call update API
                await apiUpdateAddress(cust, String(form.serverId), form);

                // notify parent of updated address (use local form copy)
                const updatedLocal = { ...form };
                onUpdated?.(updatedLocal);

                onClose();
            } catch (err: any) {
                console.error("Failed to update address", err);
                alert(err?.message ?? "Failed to update address");
            } finally {
                if (mountedRef.current) setFormSvc({ checking: false, prepaid: true });
            }
            return;
        }

        // Otherwise create new address (optimistic)
        const id = `local_${Date.now()}`;
        const newAddr: Address = { ...form, id };
        try {
            // optimistic local add
            onCreated?.(newAddr);
            onClose();

            // attempt server save
            await apiCreateAddress(cust, newAddr);
            // parent can refetch addresses if desired
        } catch (err: any) {
            console.warn("Failed to save address to server", err);
            alert(err?.message ?? "Failed to save address to server. Saved locally.");
        } finally {
            if (mountedRef.current) setFormSvc({ checking: false, prepaid: true });
        }
    }

    if (!show) return null;

    return (
        <div
            ref={backdropRef}
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 py-6"
            onClick={() => onClose()} // clicking backdrop -> close
            aria-hidden={false}
        >
            <div
                ref={dialogRef}
                className="bg-white rounded-2xl shadow w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()} // prevent backdrop click when clicking inside dialog
            >
                <div className="flex items-start justify-between px-5 py-4 border-b">
                    <div>
                        <h3 className="text-lg font-semibold">{form.serverId ? "Edit address" : "Add address"}</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 p-2 rounded-md hover:bg-slate-50" aria-label="Close modal">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 overflow-auto" style={{ WebkitOverflowScrolling: "touch" }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Recipient Name</label>
                            <input
                                ref={firstInputRef}
                                value={form.recipientName}
                                onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                                placeholder="Enter recipient name"
                                className="border p-3 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-[#065975]/30"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Recipient Contact</label>
                            <input
                                value={form.recipientContact}
                                onChange={(e) => setForm({ ...form, recipientContact: e.target.value })}
                                placeholder="Enter recipient contact"
                                className="border p-3 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-[#065975]/30"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm text-slate-600 mb-1">Address Line 1</label>
                            <input
                                value={form.addressLine1}
                                onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                                placeholder="House, Building, Street"
                                className="border p-3 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-[#065975]/30"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm text-slate-600 mb-1">Address Line 2</label>
                            <input
                                value={form.addressLine2 ?? ""}
                                onChange={(e) => setForm({ ...form, addressLine2: e.target.value || null })}
                                placeholder="Apartment, Floor, Area (optional)"
                                className="border p-3 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-[#065975]/30"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm text-slate-600 mb-1">Address Line 3</label>
                            <input
                                value={form.addressLine3 ?? ""}
                                onChange={(e) => setForm({ ...form, addressLine3: e.target.value || null })}
                                placeholder="Additional directions (optional)"
                                className="border p-3 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-[#065975]/30"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm text-slate-600 mb-1">Landmark</label>
                            <input
                                value={form.landmark ?? ""}
                                onChange={(e) => setForm({ ...form, landmark: e.target.value || null })}
                                placeholder="Nearby place or landmark (optional)"
                                className="border p-3 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-[#065975]/30"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Country</label>
                            <Select
                                isSearchable
                                isLoading={geoLoading.countries}
                                options={countries.map((c) => ({ value: c._id, label: c.countryName }))}
                                value={
                                    form.countryId
                                        ? { value: form.countryId, label: countries.find((c) => c._id === form.countryId)?.countryName || form.countryName || "Selected" }
                                        : null
                                }
                                onChange={(opt) => onCountryChange(opt?.value || "")}
                                placeholder={geoLoading.countries ? "Loading countries..." : "Select country"}
                                styles={{
                                    control: (base) => ({ ...base, borderRadius: "8px", borderColor: "#d1d5db", boxShadow: "none", minHeight: "44px" }),
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-600 mb-1">State</label>
                            <Select
                                isSearchable
                                isDisabled={!form.countryId}
                                isLoading={geoLoading.states}
                                options={states.map((s) => ({ value: s._id, label: s.stateName }))}
                                value={form.stateId ? { value: form.stateId, label: states.find((s) => s._id === form.stateId)?.stateName || form.stateName || "Selected" } : null}
                                onChange={(opt) => onStateChange(opt?.value || "")}
                                placeholder={!form.countryId ? "Select country first" : geoLoading.states ? "Loading states..." : "Select state"}
                                styles={{
                                    control: (base) => ({ ...base, borderRadius: "8px", borderColor: "#d1d5db", boxShadow: "none", minHeight: "44px" }),
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-600 mb-1">City</label>
                            <Select
                                isSearchable
                                isDisabled={!form.stateId}
                                isLoading={geoLoading.cities}
                                options={(cities ?? []).map((c) => ({ value: c._id, label: c.cityName }))}
                                value={form.cityId ? { value: form.cityId, label: cities?.find((c) => c._id === form.cityId)?.cityName || form.cityName || "Selected" } : null}
                                onChange={(opt) => setForm((f) => ({ ...f, cityId: opt?.value || null }))}
                                placeholder={!form.stateId ? "Select state first" : geoLoading.cities ? "Loading cities..." : "Select city"}
                                styles={{
                                    control: (base) => ({ ...base, borderRadius: "8px", borderColor: "#d1d5db", boxShadow: "none", minHeight: "44px" }),
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Pincode</label>
                            <input
                                value={form.pincode}
                                onChange={(e) => {
                                    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                                    setForm({ ...form, pincode: v });
                                    if (v.length === 6 && isValidIndianPincode(v)) {
                                        checkFormPincode(v).catch(() => { });
                                    }
                                }}
                                placeholder="Enter postal code"
                                className="border p-3 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-[#065975]/30"
                            />
                            <div className="text-xs mt-1">
                                {form.pincode && formSvc.checking ? (
                                    <div className="text-slate-500">Checking serviceability…</div>
                                ) : form.pincode && formSvc.prepaid === false ? (
                                    <div className="text-rose-600">This pincode is not serviceable for prepaid orders.</div>
                                ) : form.pincode && formSvc.prepaid === true ? (
                                    <div className="text-green-600">Serviceable for prepaid orders.</div>
                                ) : null}
                            </div>
                        </div>

                        <label className="sm:col-span-2 flex items-center gap-3 mt-1">
                            <input
                                type="checkbox"
                                checked={!!form.isDefault}
                                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                                className="w-4 h-4 text-[#065975]"
                            />
                            <span className="text-sm text-slate-700">Set as default address</span>
                        </label>
                    </div>
                </div>

                <div className="px-5 py-3 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-md border text-slate-600 hover:bg-slate-50">
                        Cancel
                    </button>
                    <button onClick={saveAddress} className="px-4 py-2 rounded-md bg-[#065975] text-white hover:brightness-95">
                        {form.serverId ? "Update address" : "Save address"}
                    </button>
                </div>
            </div>
        </div>
    );
}