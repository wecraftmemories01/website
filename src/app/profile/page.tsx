"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { User, Edit2, Lock, MapPin, Box } from "lucide-react";
import type { Address as SharedAddress } from "../../types/address";

import ProfileOrders from "../../components/ProfileOrders";
import ProfileAddresses from "../../components/ProfileAddresses";
import ProfilePasswordUpdate from "../../components/ProfilePasswordUpdate";
import ProfileSection, { UserProfile } from "../../components/ProfileSection";

// Create modal (used for adding)
import AddressModal, { Address as ModalAddress } from "../../components/AddressModal";
// Edit modal (used for editing) - re-exports shared Address type from AddressModalEdit
import AddressModalEdit, { Address as EditAddressType } from "../../components/AddressModalEdit";

/* LocalAddress used internally by the page (nullable where server may return null) */
type LocalAddress = {
    id: string;
    serverId?: string | null;
    recipientName: string;
    recipientContact: string;
    addressLine1: string;
    addressLine2?: string | null;
    addressLine3?: string | null;
    landmark?: string | null;
    countryId?: string | null;
    stateId?: string | null;
    cityId?: string | null;
    countryName?: string | null;
    stateName?: string | null;
    cityName?: string | null;
    pincode: string;
    isDefault?: boolean;
};

const TOKEN_KEY = "accessToken";
function getStoredAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

/**
 * Centralized fetch that injects Authorization header when token exists.
 */
async function authFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    const token = getStoredAccessToken();
    // debug - remove in production
    // eslint-disable-next-line no-console
    console.debug("authFetch token present:", !!token);

    const headers = new Headers(init?.headers ?? {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    // only set content-type when there's a body and none provided
    if (init?.body && !headers.get("Content-Type")) headers.set("Content-Type", "application/json");

    const res = await fetch(input, { ...init, headers });
    if (res.status === 401) {
        if (typeof window !== "undefined") {
            localStorage.removeItem(TOKEN_KEY);
            window.location.href = "/login";
        }
    }
    return res;
}

export default function ProfilePageAlt(): React.ReactElement {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [addresses, setAddresses] = useState<LocalAddress[]>([]);
    const [activeTab, setActiveTab] = useState<
        "overview" | "profile" | "security" | "addresses" | "orders"
    >("overview");

    const [editingProfile, setEditingProfile] = useState(false);
    const [profileDraft, setProfileDraft] = useState<Partial<UserProfile> | null>(null);

    const [addrModalOpen, setAddrModalOpen] = useState(false);
    const [addrDraft, setAddrDraft] = useState<LocalAddress | null>(null);
    const [addrEditing, setAddrEditing] = useState(false);

    const [pwMsg, setPwMsg] = useState<string | null>(null);
    const [loadingUser, setLoadingUser] = useState(false);
    const [userError, setUserError] = useState<string | null>(null);

    const [ordersCount, setOrdersCount] = useState<number | null>(null);
    const [loadingOrders, setLoadingOrders] = useState(false);

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
    // fallback default customer id for dev/testing - replace as needed
    const defaultCustomerId = "68d98d10d8e1d8ae4744079c";

    const modalContentRef = useRef<HTMLDivElement | null>(null);
    const overlayRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        const apiUrl = `${API_BASE.replace(/\/$/, "")}/customer/${defaultCustomerId}`;

        async function fetchCustomer() {
            setLoadingUser(true);
            setUserError(null);
            try {
                const res = await authFetch(apiUrl, { method: "GET", signal: controller.signal });
                if (!res.ok) throw new Error(`Failed to fetch customer (${res.status})`);
                const payload = await res.json();
                if (payload?.ack === "success" && payload?.customerData?._id) {
                    const cd = payload.customerData;
                    const mapped: UserProfile = {
                        id: cd._id,
                        name: cd.name ?? "",
                        email: cd.email ?? "",
                        mobile: cd.mobile ?? "",
                        isEmailVerified: cd.isEmailVerified ?? false,
                    };
                    setUser(mapped);
                    setProfileDraft(mapped);
                } else {
                    throw new Error("Unexpected response shape from customer API");
                }
            } catch (err: any) {
                if (err.name !== "AbortError") {
                    // eslint-disable-next-line no-console
                    console.error("Error fetching customer", err);
                    setUserError(err.message || "Failed to load customer");
                }
            } finally {
                setLoadingUser(false);
            }
        }

        fetchCustomer();
        return () => controller.abort();
    }, [API_BASE]);

    // Parent fetches addresses on load (single source of truth)
    useEffect(() => {
        const custId = user?.id ?? defaultCustomerId;
        if (!custId) return;

        let mounted = true;
        async function fetchAddresses() {
            try {
                const apiBase = API_BASE.replace(/\/$/, "");
                const url = `${apiBase}/customer/${encodeURIComponent(custId)}/address`;
                const res = await authFetch(url, { method: "GET" });
                if (!res.ok) throw new Error(`Failed to fetch addresses (${res.status})`);
                const json = await res.json();

                if (!mounted) return;
                const data: LocalAddress[] = Array.isArray(json.addressData)
                    ? json.addressData.map((s: any) => ({
                        id: s._id ? String(s._id) : `a_${Date.now()}_${Math.random()}`,
                        serverId: s._id ? String(s._id) : null,
                        recipientName: s.recipientName ?? "",
                        recipientContact: s.recipientContact ?? "",
                        addressLine1: s.addressLine1 ?? "",
                        addressLine2: s.addressLine2 ?? null,
                        addressLine3: s.addressLine3 ?? null,
                        landmark: s.landmark ?? null,
                        countryId: s.countryId ? String(s.countryId) : (s.country ? (typeof s.country === "object" ? String(s.country._id) : String(s.country)) : null),
                        stateId: s.stateId ? String(s.stateId) : (s.state ? (s.state._id ? String(s.state._id) : String(s.state)) : null),
                        cityId: s.cityId ? String(s.cityId) : (s.city ? (s.city._id ? String(s.city._id) : String(s.city)) : null),
                        countryName: s.countryName ?? (s.country?.countryName ?? null),
                        stateName: s.stateName ?? (s.state?.stateName ?? null),
                        cityName: s.cityName ?? (s.city?.cityName ?? null),
                        pincode: s.pincode ?? "",
                        isDefault: !!s.isDefault,
                    }))
                    : [];
                setAddresses(data);
            } catch (err: any) {
                // eslint-disable-next-line no-console
                console.error("addresses fetch error", err);
            }
        }

        fetchAddresses();
        return () => {
            mounted = false;
        };
    }, [user?.id, API_BASE]);

    // fetch orders count (totalRecords) for "Active & recent"
    useEffect(() => {
        const custId = user?.id ?? defaultCustomerId;
        if (!custId) return;

        const controller = new AbortController();
        async function fetchOrdersCount() {
            setLoadingOrders(true);
            try {
                const apiBase = API_BASE.replace(/\/$/, "");
                // debug token just before calling orders - remove in prod
                // eslint-disable-next-line no-console
                console.debug("orders effect token present:", !!getStoredAccessToken());

                const url = `${apiBase}/sell_order/orders?customerId=${encodeURIComponent(
                    custId
                )}&page=1&limit=1`;

                const res = await authFetch(url, { method: "GET", signal: controller.signal });
                if (!res.ok) throw new Error(`Failed to fetch orders (${res.status})`);
                const payload = await res.json();

                if (typeof payload.totalRecords === "number") {
                    setOrdersCount(payload.totalRecords);
                } else if (Array.isArray(payload.data)) {
                    setOrdersCount(payload.data.length ?? 0);
                } else {
                    setOrdersCount(0);
                }
            } catch (err: any) {
                if (err.name !== "AbortError") {
                    // eslint-disable-next-line no-console
                    console.error("orders fetch error", err);
                    setOrdersCount(null);
                }
            } finally {
                setLoadingOrders(false);
            }
        }

        fetchOrdersCount();
        return () => controller.abort();
    }, [user?.id, API_BASE]);

    const defaultAddress = useMemo(() => addresses.find((a) => a.isDefault) ?? null, [addresses]);

    function openAddAddress() {
        setAddrDraft({
            id: `a_${Date.now()}`,
            serverId: null,
            recipientName: user?.name ?? "",
            recipientContact: user?.mobile ?? "",
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
            isDefault: addresses.length === 0,
        });
        setAddrEditing(false);
        setAddrModalOpen(true);
    }

    function handleAddressCreated(local: ModalAddress) {
        const normalized: LocalAddress = {
            id: String(local.id),
            serverId: local.serverId ?? null,
            recipientName: local.recipientName ?? "",
            recipientContact: local.recipientContact ?? "",
            addressLine1: local.addressLine1 ?? "",
            addressLine2: local.addressLine2 ?? null,
            addressLine3: local.addressLine3 ?? null,
            landmark: local.landmark ?? null,
            countryId: local.countryId ?? null,
            stateId: local.stateId ?? null,
            cityId: local.cityId ?? null,
            countryName: local.countryName ?? null,
            stateName: local.stateName ?? null,
            cityName: local.cityName ?? null,
            pincode: local.pincode ?? "",
            isDefault: !!local.isDefault,
        };

        setAddresses((prev) => {
            if (normalized.isDefault) {
                const cleared = prev.map((p) => ({ ...p, isDefault: false }));
                return [...cleared, normalized];
            }
            return [...prev, normalized];
        });
    }

    // handle update from edit modal and merge into parent addresses
    function handleAddressUpdated(local: EditAddressType) {
        const normalized: LocalAddress = {
            id: String(local.id),
            serverId: local.serverId ?? null,
            recipientName: local.recipientName ?? "",
            recipientContact: local.recipientContact ?? "",
            addressLine1: local.addressLine1 ?? "",
            addressLine2: local.addressLine2 ?? null,
            addressLine3: local.addressLine3 ?? null,
            landmark: local.landmark ?? null,
            countryId: local.countryId ?? null,
            stateId: local.stateId ?? null,
            cityId: local.cityId ?? null,
            countryName: local.countryName ?? null,
            stateName: local.stateName ?? null,
            cityName: local.cityName ?? null,
            pincode: local.pincode ?? "",
            isDefault: !!local.isDefault,
        };

        setAddresses((prev) =>
            prev.map((a) => {
                const matches =
                    (normalized.serverId && a.serverId && a.serverId === normalized.serverId) ||
                    a.id === normalized.id;
                return matches ? { ...a, ...normalized } : a;
            })
        );

        if (normalized.isDefault) {
            setAddresses((prev) =>
                prev.map((a) => {
                    const matches =
                        (normalized.serverId && a.serverId && a.serverId === normalized.serverId) ||
                        a.id === normalized.id;
                    return matches ? { ...a, isDefault: true } : { ...a, isDefault: false };
                })
            );
        }
    }

    // helper to close any address modal and clear edit state
    function closeAddrModal() {
        setAddrModalOpen(false);
        setAddrEditing(false);
        setAddrDraft(null);
    }

    function handleChangePassword(payload: { current: string; next: string }) {
        // eslint-disable-next-line no-console
        console.log("change pwd", payload);
        setPwMsg("Password changed (mock)");
        setTimeout(() => setPwMsg(null), 3000);
    }

    const PasswordComp = ProfilePasswordUpdate as unknown as React.ComponentType<{
        onSubmit: (payload: { current: string; next: string }) => void;
        statusMessage?: string | null;
    }>;

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#fbfdff] to-white p-6 md:p-8 font-sans text-slate-900">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                <aside className="lg:col-span-4 col-span-1">
                    <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-xl border border-slate-100 sticky top-8">
                        <div className="flex items-center gap-4">
                            <div
                                style={{ width: 84, height: 84 }}
                                className="rounded-3xl bg-gradient-to-br from-[#065975] to-[#0ea5a0] text-white grid place-items-center font-extrabold text-xl shadow-2xl"
                            >
                                {(user?.name ?? "?")
                                    .split(" ")
                                    .map((s) => s[0] ?? "")
                                    .slice(0, 2)
                                    .join("")
                                    .toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-2xl font-semibold">{user?.name}</h2>
                                <p className="text-sm text-slate-500">{user?.email}</p>
                                <p className="text-base text-slate-700 mt-1">{user?.mobile}</p>
                            </div>
                        </div>

                        <div className="mt-4">
                            {loadingUser && <div className="text-xs text-slate-500">Loading account...</div>}
                            {userError && <div className="text-xs text-rose-600">Failed to load account</div>}
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-4 text-center">
                            <div className="p-4 rounded-2xl border bg-[#f0f9ff]">
                                <div className="text-xs text-slate-500">Orders</div>
                                <div className="font-semibold text-2xl mt-1">{loadingOrders ? "Loading…" : ordersCount ?? "—"}</div>
                                <div className="text-xs text-slate-400">Active & recent</div>
                            </div>
                            <div className="p-4 rounded-2xl border bg-[#fffaf0]">
                                <div className="text-xs text-slate-500">Default Pincode</div>
                                <div className="font-semibold text-sm truncate mt-1">{defaultAddress ? defaultAddress.pincode : "Not set"}</div>
                                <div className="text-xs text-slate-400 mt-1">{defaultAddress ? defaultAddress.cityName : "—"}</div>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-3">
                            {[ 
                                { key: "overview", icon: <User />, label: "Overview" },
                                { key: "profile", icon: <Edit2 />, label: "Edit profile" },
                                { key: "security", icon: <Lock />, label: "Security" },
                                { key: "addresses", icon: <MapPin />, label: "Addresses" },
                                { key: "orders", icon: <Box />, label: "Orders" },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key as any)}
                                    className={`flex items-center gap-3 px-5 py-3 rounded-lg text-sm font-medium border transition ${activeTab === tab.key ? "bg-[#065975] text-white" : "bg-white hover:bg-slate-50"
                                        }`}
                                >
                                    {React.cloneElement(tab.icon, { className: "w-5 h-5" })}
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>

                <main className="lg:col-span-8 col-span-1 space-y-8">
                    {activeTab === "overview" && (
                        <section className="bg-gradient-to-r from-[#e8fbfa] to-white rounded-3xl p-6 lg:p-8 shadow-lg border">
                            <h3 className="text-2xl font-bold">Welcome back, {user?.name?.split(" ")[0] ?? "there"} 👋</h3>
                            <p className="text-sm text-slate-600 mt-2">Here's a snapshot of your account — quick actions you might want to check.</p>
                            <div className="mt-5 flex flex-wrap gap-3">
                                <button onClick={() => setActiveTab("profile")} className="px-4 py-2 rounded-md bg-white border shadow-sm hover:shadow-md transition">
                                    Edit profile
                                </button>
                                <button onClick={openAddAddress} className="px-4 py-2 rounded-md bg-[#065975] text-white shadow-md hover:scale-[1.01] transition">
                                    Add address
                                </button>
                                <button onClick={() => setActiveTab("orders")} className="px-4 py-2 rounded-md bg-white border shadow-sm hover:shadow-md transition">
                                    View orders
                                </button>
                            </div>
                        </section>
                    )}

                    {activeTab === "profile" && user && (
                        <ProfileSection
                            user={user}
                            editing={editingProfile}
                            draft={profileDraft || user}
                            onEdit={() => setEditingProfile((p) => !p)}
                            onChangeDraft={(field, value) => setProfileDraft((prev) => ({ ...(prev || {}), [field]: value }) as Partial<UserProfile>)}
                            onSave={(updated) => {
                                const merged: UserProfile = { ...(user ?? ({} as UserProfile)), ...(updated as UserProfile) };
                                setUser(merged);
                                setEditingProfile(false);
                                setProfileDraft(merged);
                            }}
                        />
                    )}

                    {activeTab === "security" && <PasswordComp onSubmit={handleChangePassword} statusMessage={pwMsg} />}

                    {activeTab === "addresses" && (
                        <ProfileAddresses
                            addresses={addresses.map((a) => ({
                                id: a.id,
                                serverId: a.serverId ?? null,
                                recipientName: a.recipientName,
                                recipientContact: a.recipientContact,
                                addressLine1: a.addressLine1,
                                addressLine2: a.addressLine2 ?? null,
                                addressLine3: a.addressLine3 ?? null,
                                landmark: a.landmark ?? null,
                                cityName: a.cityName ?? null,
                                stateName: a.stateName ?? null,
                                countryName: a.countryName ?? null,
                                pincode: a.pincode,
                                isDefault: !!a.isDefault,
                                countryId: a.countryId ?? null,
                                stateId: a.stateId ?? null,
                                cityId: a.cityId ?? null,
                            }))}
                            onAdd={openAddAddress}
                            onEdit={(a) => {
                                setAddrEditing(true);
                                setAddrDraft({
                                    id: a.id,
                                    serverId: a.serverId ?? null,
                                    recipientName: a.recipientName,
                                    recipientContact: a.recipientContact,
                                    addressLine1: a.addressLine1 ?? "",
                                    addressLine2: a.addressLine2 ?? null,
                                    addressLine3: a.addressLine3 ?? null,
                                    landmark: a.landmark ?? null,
                                    countryId: a.countryId ?? null,
                                    stateId: a.stateId ?? null,
                                    cityId: a.cityId ?? null,
                                    countryName: a.countryName ?? null,
                                    stateName: a.stateName ?? null,
                                    cityName: a.cityName ?? null,
                                    pincode: a.pincode ?? "",
                                    isDefault: !!a.isDefault,
                                });
                                setAddrModalOpen(true);
                            }}
                            /* NOTE: do NOT pass onDelete here — let the child call the DELETE API itself */
                            onSetDefault={(id) => setAddresses((prev) => prev.map((p) => ({ ...p, isDefault: p.id === String(id) })))}
                        />
                    )}

                    {activeTab === "orders" && <ProfileOrders customerId={user?.id ?? defaultCustomerId} apiBase={API_BASE} />}
                </main>
            </div>

            {/* Render edit modal when editing, otherwise render create modal */}
            {addrEditing && addrDraft ? (
                <AddressModalEdit
                    show={addrModalOpen}
                    onClose={() => closeAddrModal()}
                    editAddress={{
                        id: addrDraft.id,
                        serverId: addrDraft.serverId ?? null,
                        recipientName: addrDraft.recipientName,
                        recipientContact: addrDraft.recipientContact,
                        addressLine1: addrDraft.addressLine1,
                        addressLine2: addrDraft.addressLine2 ?? null,
                        addressLine3: addrDraft.addressLine3 ?? null,
                        landmark: addrDraft.landmark ?? null,
                        countryId: addrDraft.countryId ?? null,
                        stateId: addrDraft.stateId ?? null,
                        cityId: addrDraft.cityId ?? null,
                        countryName: addrDraft.countryName ?? null,
                        stateName: addrDraft.stateName ?? null,
                        cityName: addrDraft.cityName ?? null,
                        pincode: addrDraft.pincode ?? "",
                        isDefault: !!addrDraft.isDefault,
                    }}
                    onUpdated={(updated) => {
                        handleAddressUpdated(updated);
                        closeAddrModal();
                    }}
                    onCreated={(created) => {
                        // fallback: AddressModalEdit may call onCreated when creating local-only addresses
                        handleAddressCreated(created);
                        closeAddrModal();
                    }}
                />
            ) : (
                <AddressModal
                    show={addrModalOpen}
                    onClose={() => closeAddrModal()}
                    onCreated={(local) => {
                        handleAddressCreated(local);
                        closeAddrModal();
                    }}
                />
            )}
        </div>
    );
}