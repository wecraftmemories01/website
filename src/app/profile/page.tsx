"use client";

import React, { useEffect, useMemo, useState } from "react";
import { User, Edit2, Lock, MapPin, Box } from "lucide-react";
import type { Address as SharedAddress } from "../../types/address";
import api from "@/services/api";

import ProfileOrders from "../../components/ProfileOrders";
import ProfileAddresses from "../../components/ProfileAddresses";
import ProfilePasswordUpdate from "../../components/ProfilePasswordUpdate";
import ProfileSection, { UserProfile } from "../../components/ProfileSection";

import AddressModal, { Address as ModalAddress } from "../../components/AddressModal";
import AddressModalEdit, { Address as EditAddressType } from "../../components/AddressModalEdit";

/* LocalAddress local type */
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

function getStoredCustomerId(): string | null {
    if (typeof window === "undefined") return null;

    try {
        const raw = localStorage.getItem("auth");
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        return parsed?.customerId ?? null;
    } catch (err) {
        console.error("Failed to read customerId from localStorage", err);
        return null;
    }
}

/* ---------- MAIN PAGE ---------- */
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

    /* SAFE CUSTOMER ID RESOLVER */
    const resolveCustomerId = () => getStoredCustomerId() ?? user?.id ?? null;

    /* ---------- FETCH USER ---------- */
    useEffect(() => {
        const controller = new AbortController();
        const custId = getStoredCustomerId();
        if (!custId) {
            window.location.href = "/login";
            return;
        }

        async function fetchCustomer() {
            setLoadingUser(true);
            setUserError(null);

            try {
                const res = await api.get(`/customer/${custId}`);
                const payload = res.data;

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
                console.error("Error fetching customer", err);
                setUserError(err?.message ?? "Failed to load customer");
            } finally {
                setLoadingUser(false);
            }
        }

        fetchCustomer();
        return () => controller.abort();
    }, [API_BASE]);

    /* ---------- FETCH ADDRESSES ---------- */
    useEffect(() => {
        const custId = resolveCustomerId();
        if (!custId) return;

        let mounted = true;

        async function fetchAddresses() {
            try {
                const res = await api.get(`/customer/${custId}/address`);
                const json = res.data;

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
                        countryId: s.countryId ? String(s.countryId) : null,
                        stateId: s.stateId ? String(s.stateId) : null,
                        cityId: s.cityId ? String(s.cityId) : null,
                        countryName: s.countryName ?? "",
                        stateName: s.stateName ?? "",
                        cityName: s.cityName ?? "",
                        pincode: s.pincode ?? "",
                        isDefault: !!s.isDefault,
                    }))
                    : [];

                setAddresses(data);
            } catch (err) {
                console.error("addresses fetch error", err);
            }
        }

        fetchAddresses();
        return () => {
            mounted = false;
        };
    }, [user?.id, API_BASE]);

    /* ---------- FETCH ORDERS COUNT ---------- */
    useEffect(() => {
        const custId = resolveCustomerId();
        if (!custId) return;

        const controller = new AbortController();

        async function fetchOrdersCount() {
            setLoadingOrders(true);
            try {
                const apiBase = API_BASE.replace(/\/$/, "");

                const res = await api.get(`/sell_order/orders`, {
                    params: { page: 1, limit: 1 }
                });

                const payload = res.data;

                if (typeof payload.totalRecords === "number") {
                    setOrdersCount(payload.totalRecords);
                } else {
                    setOrdersCount(0);
                }
            } catch (err) {
                if ((err as any).name !== "AbortError") {
                    console.error("orders fetch error", err);
                }
            } finally {
                setLoadingOrders(false);
            }
        }

        fetchOrdersCount();
        return () => controller.abort();
    }, [user?.id, API_BASE]);

    const defaultAddress = useMemo(() => addresses.find((a) => a.isDefault) ?? null, [addresses]);

    /* ---------- ADDRESS MODAL HANDLERS ---------- */
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
                return [...prev.map((p) => ({ ...p, isDefault: false })), normalized];
            }
            return [...prev, normalized];
        });
    }

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
                const match =
                    (normalized.serverId && a.serverId === normalized.serverId) || a.id === normalized.id;
                return match ? { ...a, ...normalized } : a;
            })
        );

        if (normalized.isDefault) {
            setAddresses((prev) =>
                prev.map((a) =>
                    a.id === normalized.id ? { ...a, isDefault: true } : { ...a, isDefault: false }
                )
            );
        }
    }

    function closeAddrModal() {
        setAddrModalOpen(false);
        setAddrEditing(false);
        setAddrDraft(null);
    }

    function handleChangePassword(payload: { current: string; next: string }) {
        console.log("change pwd", payload);
        setPwMsg("Password changed (mock)");
        setTimeout(() => setPwMsg(null), 3000);
    }

    const PasswordComp = ProfilePasswordUpdate as any;

    /* ---------- RENDER ---------- */
    return (
        <div className="min-h-screen bg-linear-to-b from-[#fbfdff] to-white p-6 md:p-8 font-sans text-slate-900">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT SIDEBAR */}
                <aside className="lg:col-span-4 col-span-1">
                    <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-xl border border-slate-100 sticky top-8">
                        <div className="flex items-center gap-4">
                            <div
                                style={{ width: 84, height: 84 }}
                                className="rounded-3xl bg-linear-to-br from-[#065975] to-[#0ea5a0] text-white grid place-items-center font-extrabold text-xl shadow-2xl"
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
                            {loadingUser && (
                                <div className="text-xs text-slate-500">Loading account...</div>
                            )}
                            {userError && (
                                <div className="text-xs text-rose-600">Failed to load account</div>
                            )}
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-4 text-center">
                            <div className="p-4 rounded-2xl border bg-[#f0f9ff]">
                                <div className="text-xs text-slate-500">Orders</div>
                                <div className="font-semibold text-2xl mt-1">
                                    {loadingOrders ? "Loading…" : ordersCount ?? "—"}
                                </div>
                                <div className="text-xs text-slate-400">Active & recent</div>
                            </div>
                            <div className="p-4 rounded-2xl border bg-[#fffaf0]">
                                <div className="text-xs text-slate-500">Default Pincode</div>
                                <div className="font-semibold text-sm truncate mt-1">
                                    {defaultAddress ? defaultAddress.pincode : "Not set"}
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                    {defaultAddress ? defaultAddress.cityName : "—"}
                                </div>
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
                                    className={`flex items-center gap-3 px-5 py-3 rounded-lg text-sm font-medium border transition ${activeTab === tab.key
                                        ? "bg-[#065975] text-white"
                                        : "bg-white hover:bg-slate-50"
                                        }`}
                                >
                                    {React.cloneElement(tab.icon, { className: "w-5 h-5" })}
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* MAIN CONTENT */}
                <main className="lg:col-span-8 col-span-1 space-y-8">
                    {activeTab === "overview" && (
                        <section className="bg-linear-to-r from-[#e8fbfa] to-white rounded-3xl p-6 lg:p-8 shadow-lg border">
                            <h3 className="text-2xl font-bold">
                                Welcome back, {user?.name?.split(" ")[0] ?? "there"} 👋
                            </h3>
                            <p className="text-sm text-slate-600 mt-2">
                                Here's a snapshot of your account — quick actions you might want to
                                check.
                            </p>

                            <div className="mt-5 flex flex-wrap gap-3">
                                <button
                                    onClick={() => setActiveTab("profile")}
                                    className="px-4 py-2 rounded-md bg-white border shadow-sm hover:shadow-md transition"
                                >
                                    Edit profile
                                </button>

                                <button
                                    onClick={openAddAddress}
                                    className="px-4 py-2 rounded-md bg-[#065975] text-white shadow-md hover:scale-[1.01] transition"
                                >
                                    Add address
                                </button>

                                <button
                                    onClick={() => setActiveTab("orders")}
                                    className="px-4 py-2 rounded-md bg-white border shadow-sm hover:shadow-md transition"
                                >
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
                            onEdit={() => setEditingProfile((prev) => !prev)}
                            onChangeDraft={(field, value) =>
                                setProfileDraft((prev) => ({
                                    ...(prev || {}),
                                    [field]: value,
                                }))
                            }
                            onSave={(updated) => {
                                const merged: UserProfile = {
                                    ...(user ?? ({} as UserProfile)),
                                    ...(updated as UserProfile),
                                };
                                setUser(merged);
                                setEditingProfile(false);
                                setProfileDraft(merged);
                            }}
                        />
                    )}

                    {activeTab === "security" && (
                        <PasswordComp onSubmit={handleChangePassword} statusMessage={pwMsg} />
                    )}

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
                            onSetDefault={(id) =>
                                setAddresses((prev) =>
                                    prev.map((p) => ({
                                        ...p,
                                        isDefault: p.id === String(id),
                                    }))
                                )
                            }
                        />
                    )}

                    {activeTab === "orders" && (
                        <ProfileOrders apiBase={API_BASE} />
                    )}
                </main>
            </div>

            {/* ADDRESS MODALS */}
            {addrEditing && addrDraft ? (
                <AddressModalEdit
                    show={addrModalOpen}
                    onClose={closeAddrModal}
                    editAddress={{ ...addrDraft }}
                    onUpdated={(updated) => {
                        handleAddressUpdated(updated);
                        closeAddrModal();
                    }}
                    onCreated={(created) => {
                        handleAddressCreated(created);
                        closeAddrModal();
                    }}
                />
            ) : (
                <AddressModal
                    show={addrModalOpen}
                    onClose={closeAddrModal}
                    onCreated={(local) => {
                        handleAddressCreated(local);
                        closeAddrModal();
                    }}
                />
            )}
        </div>
    );
}