"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Edit2, X } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3000/v1";
const LOCAL_KEY = "deliveryPincode";
const TOKEN_KEY = "accessToken";
const CUSTOMER_KEY = "customerId";

function isValidIndianPincode(pin: string) {
    return /^[1-9][0-9]{5}$/.test(pin);
}
function safeGetItem(key: string) {
    try {
        if (typeof window === "undefined") return null;
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}
function safeSetItem(key: string, value: string) {
    try {
        if (typeof window === "undefined") return;
        localStorage.setItem(key, value);
    } catch { }
}

async function updatePincodeOnServer(customerId: string, token: string, deliveryPincode: string) {
    const url = `${API_BASE}/customer/${encodeURIComponent(customerId)}/delivery_pincode`;
    const res = await fetch(url, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deliveryPincode }),
    });
    let json = null;
    try {
        json = await res.json();
    } catch { }
    return { ok: res.ok, status: res.status, json };
}

async function fetchCustomer(customerId: string, token: string) {
    const url = `${API_BASE}/customer/${encodeURIComponent(customerId)}`;
    const res = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    });
    let json = null;
    try {
        json = await res.json();
    } catch { }
    return { ok: res.ok, status: res.status, json };
}

/** New helper: check logistic serviceability for the pincode */
async function checkPincodeServiceability(pincode: string) {
    const url = `${API_BASE}/logistic_partner/get_pincode_serviceability/${encodeURIComponent(pincode)}`;
    try {
        const res = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
        let json = null;
        try { json = await res.json(); } catch { }
        return { ok: res.ok, status: res.status, json };
    } catch (err) {
        return { ok: false, status: 0, json: null, error: err };
    }
}

export default function DeliveryPincodeInput({ className }: { className?: string }) {
    const [value, setValue] = useState<string>(""); // visible saved PIN in header
    const [editValue, setEditValue] = useState<string>(""); // editor input inside popup
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [popupOpen, setPopupOpen] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

    const popupRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    // Load client-only data after mount
    useEffect(() => {
        const savedLocal = safeGetItem(LOCAL_KEY);
        if (savedLocal) setValue(savedLocal);

        const lsSavedAt = safeGetItem(`${LOCAL_KEY}:savedAt`);
        if (lsSavedAt) {
            const n = Number(lsSavedAt);
            if (!Number.isNaN(n)) setLastSavedAt(n);
        }

        const token = safeGetItem(TOKEN_KEY);
        const customerId = safeGetItem(CUSTOMER_KEY);
        if (token && customerId) {
            (async () => {
                try {
                    const res = await fetchCustomer(customerId, token);
                    if (res.ok && res.json && res.json.customerData) {
                        const serverPin: string | undefined = res.json.customerData?.deliveryPincode;
                        if (serverPin && isValidIndianPincode(serverPin)) {
                            setValue(serverPin);
                            try { safeSetItem(LOCAL_KEY, serverPin); } catch { }
                        }
                    }
                } catch (err) {
                    console.debug("[DeliveryPincodeInput] fetchCustomer error", err);
                }
            })();
        }
    }, []);

    // react to login events
    useEffect(() => {
        function onAuthChanged() {
            const token = safeGetItem(TOKEN_KEY);
            const customerId = safeGetItem(CUSTOMER_KEY);
            if (token && customerId) {
                (async () => {
                    try {
                        const res = await fetchCustomer(customerId, token);
                        if (res.ok && res.json && res.json.customerData) {
                            const serverPin: string | undefined = res.json.customerData?.deliveryPincode;
                            if (serverPin && isValidIndianPincode(serverPin)) {
                                setValue(serverPin);
                                try { safeSetItem(LOCAL_KEY, serverPin); } catch { }
                            }
                        }
                    } catch (err) {
                        console.debug("[DeliveryPincodeInput] fetchCustomer onAuthChanged failed", err);
                    }
                })();
            }
        }
        window.addEventListener("authChanged", onAuthChanged);
        return () => window.removeEventListener("authChanged", onAuthChanged);
    }, []);

    // close popup on outside click or Escape (portal-safe)
    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            const t = e.target as Node | null;
            if (popupOpen && popupRef.current && t && !popupRef.current.contains(t)) {
                setPopupOpen(false);
                setError(null);
            }
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setPopupOpen(false);
                setError(null);
            }
        }
        document.addEventListener("click", onDocClick, true);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("click", onDocClick, true);
            document.removeEventListener("keydown", onKey);
        };
    }, [popupOpen]);

    const openEditor = useCallback((e?: React.MouseEvent) => {
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
        setEditValue(value || "");
        setError(null);
        setStatusMessage(null);
        setPopupOpen(true);
    }, [value]);

    const onEditChange = (raw: string) => {
        const digits = raw.replace(/\D/g, "").slice(0, 6);
        setEditValue(digits);
        if (digits === "" || isValidIndianPincode(digits)) setError(null);
        else setError("PIN must be 6 digits");
    };

    const onSave = useCallback(async () => {
        setError(null);
        setStatusMessage(null);

        const trimmed = (editValue || "").trim();
        if (!trimmed) {
            setError("Please enter a PIN code");
            return;
        }
        if (!isValidIndianPincode(trimmed)) {
            setError("Enter a valid 6-digit Indian PIN code");
            return;
        }

        // 1) Check serviceability first (must support prepaid)
        setLoading(true);
        setStatusMessage("Checking serviceability for the PIN…");
        try {
            const svc = await checkPincodeServiceability(trimmed);
            if (!svc.ok || !svc.json) {
                // API failure -> treat as not serviceable (or network)
                const errMsg = svc.json && (svc.json.error || svc.json.message) ? (svc.json.error || svc.json.message) : `HTTP ${svc.status || "network"}`;
                setError("Unable to verify serviceability. Please try again.");
                setStatusMessage(`Service check failed: ${errMsg}`);
                setLoading(false);
                setTimeout(() => setStatusMessage(null), 2500);
                return;
            }

            // expected shape: { ack: "success", data: { prepaid: true, ... } }
            const svcData = svc.json.data;
            const prepaidAvailable = svcData && svcData.prepaid === true;

            if (!prepaidAvailable) {
                setError("Pincode is not serviceable for prepaid orders.");
                setStatusMessage("Pincode not serviceable for prepaid (online payment).");
                setLoading(false);
                return;
            }
        } catch (err: any) {
            setError("Failed to check pincode serviceability.");
            setStatusMessage(`Network error: ${err?.message ?? String(err)}`);
            setLoading(false);
            setTimeout(() => setStatusMessage(null), 3000);
            return;
        }

        // 2) If serviceable for prepaid, proceed to save locally and (if logged in) on server
        try {
            safeSetItem(LOCAL_KEY, trimmed);
        } catch { }
        const now = Date.now();
        try { safeSetItem(`${LOCAL_KEY}:savedAt`, String(now)); } catch { }
        setValue(trimmed);
        setLastSavedAt(now);
        setStatusMessage("Saved locally.");
        setPopupOpen(false);

        try { window.dispatchEvent(new Event("deliveryPincodeChanged")); } catch { }

        const token = safeGetItem(TOKEN_KEY);
        const customerId = safeGetItem(CUSTOMER_KEY);
        if (token && customerId) {
            setLoading(true);
            setStatusMessage("Saving delivery PIN to account…");
            try {
                const res = await updatePincodeOnServer(customerId, token, trimmed);
                if (res.ok) {
                    const now2 = Date.now();
                    try { safeSetItem(`${LOCAL_KEY}:savedAt`, String(now2)); } catch { }
                    setLastSavedAt(now2);
                    setStatusMessage("Delivery PIN saved to your account.");
                    setTimeout(() => setStatusMessage(null), 2200);
                } else {
                    const msg = (res.json && (res.json.error || res.json.message)) || `HTTP ${res.status}`;
                    setStatusMessage(`Failed to save to account: ${msg}`);
                    setTimeout(() => setStatusMessage(null), 3000);
                }
            } catch (err: any) {
                setStatusMessage(`Network error: ${err?.message ?? String(err)}`);
                setTimeout(() => setStatusMessage(null), 3000);
            } finally {
                setLoading(false);
            }
        } else {
            setStatusMessage("Saved locally (not synced — login required).");
            setLoading(false);
            setTimeout(() => setStatusMessage(null), 2000);
        }
    }, [editValue]);

    const clearLocal = useCallback(() => {
        try { localStorage.removeItem(LOCAL_KEY); localStorage.removeItem(`${LOCAL_KEY}:savedAt`); } catch { }
        setValue("");
        setLastSavedAt(null);
        setStatusMessage("Cleared.");
        setTimeout(() => setStatusMessage(null), 1600);
    }, []);

    // popup content: includes lastSavedAt and statusMessage here
    const Popup = (
        <div
            ref={popupRef}
            className="z-[9999] fixed top-[80px] right-6 w-[320px] rounded-lg bg-white shadow-lg border p-3"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold">Delivery PIN</div>
                <button onClick={() => setPopupOpen(false)} className="p-1 rounded-md hover:bg-slate-50">
                    <X size={14} />
                </button>
            </div>

            <div className="mt-2">
                <label htmlFor="delivery-pincode-popup" className="sr-only">Delivery PIN</label>
                <input
                    id="delivery-pincode-popup"
                    ref={inputRef}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoFocus
                    value={editValue}
                    onChange={(e) => onEditChange(e.target.value)}
                    placeholder="Enter 6-digit PIN code"
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring focus:ring-teal-200"
                    aria-invalid={!!error}
                    aria-describedby={error ? "pincode-error-popup" : undefined}
                />
                {error ? <div id="pincode-error-popup" className="text-rose-600 text-xs mt-1">{error}</div> : null}

                {/* last saved timestamp + status message placed inside popup */}
                <div className="mt-2 text-xs text-slate-500">
                    {statusMessage ? (
                        <div>{statusMessage}</div>
                    ) : lastSavedAt ? (
                        <div>Last saved {new Date(lastSavedAt).toLocaleString()}</div>
                    ) : (
                        <div className="text-slate-400">No saved PIN yet</div>
                    )}
                </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
                <button
                    onClick={onSave}
                    disabled={loading}
                    className="px-3 py-2 bg-teal-600 text-white rounded-md text-sm font-medium hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {loading ? "Saving…" : "Save"}
                </button>
                <button onClick={() => { setEditValue(value || ""); setPopupOpen(false); }} className="px-3 py-2 text-sm rounded-md hover:bg-slate-50">
                    Cancel
                </button>

                <div className="ml-auto">
                    <button onClick={clearLocal} title="Clear local PIN" className="px-2 py-1 text-xs rounded-md hover:bg-slate-50">Clear</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className={className}>
            <div className="relative inline-flex items-center gap-2">
                {value ? (
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-sm">
                        <span className="font-medium">{value}</span>
                        <button
                            onClick={(e) => openEditor(e)}
                            aria-label="Edit delivery PIN"
                            className="p-1 rounded-full hover:bg-slate-200 transition"
                            onMouseDown={(ev) => ev.preventDefault()}
                        >
                            <Edit2 size={14} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={(e) => openEditor(e)}
                        className="px-3 py-1 rounded-full bg-slate-100 text-sm hover:bg-slate-200 transition"
                    >
                        Set Pincode
                    </button>
                )}
            </div>

            {popupOpen && typeof document !== "undefined" ? ReactDOM.createPortal(Popup, document.body) : null}
        </div>
    );
}