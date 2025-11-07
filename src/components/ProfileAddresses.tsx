"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Pagination from "../components/ui/Pagination";
import ConfirmModal from "./ui/ConfirmModal";
import AddressModalEdit, { Address as EditAddressType } from "./AddressModalEdit";

const TOKEN_KEY = "accessToken";
const CUSTOMER_KEY = "customerId";

/* ---- Types ---- */
export type Address = {
    id: string;
    serverId?: string | null;
    recipientName: string;
    recipientContact: string;
    addressLine1?: string;
    addressLine2?: string | null;
    addressLine3?: string | null;
    landmark?: string | null;
    cityName?: string | null;
    stateName?: string | null;
    countryName?: string | null;
    pincode?: string;
    isDefault?: boolean;
    countryId?: string | null;
    stateId?: string | null;
    cityId?: string | null;
};

export interface ProfileAddressesProps {
    addresses?: Address[] | null;
    onAdd?: () => void;
    onEdit?: (a: Address) => void;
    onDelete?: (id: string | number) => void; // if parent passes this, it will be called instead of internal delete
    onSetDefault?: (id: string | number) => void;
}

/* Helper to get token safely */
function getStoredAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

/* Auth fetch with Bearer token */
async function authFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    const token = getStoredAccessToken();
    const headers = new Headers(init?.headers ?? {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (!headers.get("Content-Type") && init?.body) headers.set("Content-Type", "application/json");
    return fetch(input, { ...init, headers });
}

/* Map server response to local model
   NOTE: include countryId/stateId/cityId so the edit modal can pre-fill selects */
function mapServerAddressToLocal(serverRec: any): Address {
    const serverId = serverRec._id ? String(serverRec._id) : null;
    return {
        id: serverId ? `srv_${serverId}` : `local_${Date.now()}`,
        serverId,
        recipientName: serverRec.recipientName ?? "",
        recipientContact: serverRec.recipientContact ?? "",
        addressLine1: serverRec.addressLine1 ?? "",
        addressLine2: serverRec.addressLine2 ?? null,
        addressLine3: serverRec.addressLine3 ?? null,
        landmark: serverRec.landmark ?? null,
        cityName: serverRec.cityName ?? (serverRec.city?.cityName ?? null),
        stateName: serverRec.stateName ?? (serverRec.state?.stateName ?? null),
        countryName: serverRec.countryName ?? (serverRec.country?.countryName ?? null),
        pincode: serverRec.pincode ?? "",
        isDefault: !!serverRec.isDefault,
        countryId: serverRec.countryId ? String(serverRec.countryId) : (serverRec.country ? String(serverRec.country) : null),
        stateId: serverRec.stateId ? String(serverRec.stateId) : (serverRec.state ? (serverRec.state._id ? String(serverRec.state._id) : String(serverRec.state)) : null),
        cityId: serverRec.cityId ? String(serverRec.cityId) : (serverRec.city ? (serverRec.city._id ? String(serverRec.city._id) : String(serverRec.city)) : null),
    };
}

export default function ProfileAddresses(props: ProfileAddressesProps) {
    const { addresses: externalAddresses, onAdd, onEdit, onDelete, onSetDefault } = props;

    const [addresses, setAddresses] = useState<Address[]>(externalAddresses ?? []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // confirmation modal state
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'delete' | 'setDefault' | null>(null);
    const [confirmTargetId, setConfirmTargetId] = useState<string | null>(null);
    const [confirmLoading, setConfirmLoading] = useState(false);

    // address edit/add modal
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editAddress, setEditAddress] = useState<EditAddressType | null>(null);

    const [page, setPage] = useState(1);
    const perPage = 10;
    const total = addresses.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    useEffect(() => {
        if (Array.isArray(externalAddresses)) {
            setAddresses(externalAddresses);
        }
    }, [externalAddresses]);

    /* ---- Fetch Addresses from server if parent didn't provide them ---- */
    useEffect(() => {
        if (Array.isArray(externalAddresses)) return;

        let mounted = true;
        async function fetchAddresses() {
            setLoading(true);
            setError(null);
            try {
                const cust = localStorage.getItem(CUSTOMER_KEY);
                if (!cust) {
                    setError("Customer not logged in");
                    return;
                }

                const apiBase = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000/v1").replace(/\/$/, "");
                const url = `${apiBase}/customer/${encodeURIComponent(cust)}/address`;

                const res = await authFetch(url, { method: "GET" });
                if (!res.ok) {
                    const text = await res.text().catch(() => "");
                    throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
                }
                const json = await res.json();

                if (!mounted) return;
                const data = Array.isArray(json.addressData) ? json.addressData.map(mapServerAddressToLocal) : [];
                setAddresses(data);
            } catch (err: any) {
                console.error("[ProfileAddresses] fetchAddresses error:", err);
                setError(err?.message ?? "Failed to fetch addresses");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchAddresses();
        return () => {
            mounted = false;
        };
    }, [externalAddresses]);

    const pageItems = useMemo(() => {
        const start = (page - 1) * perPage;
        return addresses.slice(start, start + perPage);
    }, [addresses, page, perPage]);

    /* ---- Internal Handlers ---- */
    const internalAdd = () => {
        setEditAddress(null);
        setEditModalOpen(true);
    };

    const internalEdit = (a: Address) => {
        const edit: EditAddressType = {
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
        };
        setEditAddress(edit);
        setEditModalOpen(true);
    };

    /* ---- DELETE address (calls backend) ---- */
    const internalDelete = async (id: string | number) => {
        const rawIdStr = String(id);

        // utility to strip optional srv_ prefix
        const unwrapSrvPrefix = (s: string) => s.replace(/^srv_/, "");

        // We'll try candidate normalized id (server id without prefix)
        const normalizedCandidate = unwrapSrvPrefix(rawIdStr);

        // find the address record by any likely id form
        const addr = addresses.find(
            (a) =>
                a.id === rawIdStr ||
                a.id === `srv_${normalizedCandidate}` ||
                a.serverId === normalizedCandidate ||
                a.serverId === rawIdStr
        );

        // prefer serverId from record if available; otherwise use normalizedCandidate
        const useId = (addr?.serverId ?? normalizedCandidate) as string | null;

        if (!useId) {
            alert("Cannot determine server address id to delete.");
            return;
        }

        const cust = localStorage.getItem(CUSTOMER_KEY);
        if (!cust) {
            alert("Customer not logged in");
            return;
        }

        try {
            setDeletingId(String(id));
            const apiBase = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000/v1").replace(/\/$/, "");
            const url = `${apiBase}/customer/${encodeURIComponent(cust)}/address/${encodeURIComponent(useId)}`;

            console.debug("[ProfileAddresses] DELETE ->", { url, useId, originalId: id, addr });
            const res = await authFetch(url, { method: "DELETE" });

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
            }

            // success: remove from UI
            setAddresses((prev) => prev.filter((a) => !(a.serverId === useId || a.id === String(id) || a.id === `srv_${useId}`)));

            // call parent callback if provided
            if (typeof onDelete === "function") {
                try {
                    onDelete(useId);
                } catch (err) {
                    console.warn("parent onDelete threw", err);
                }
            }

            console.debug("[ProfileAddresses] delete successful", useId);
        } catch (err: any) {
            console.error("[ProfileAddresses] delete error:", err);
            alert(err?.message ?? "Failed to delete address");
        } finally {
            setDeletingId(null);
        }
    };

    /* ---- Set Default implementation that calls the API ---- */
    const internalSetDefault = async (id: string | number) => {
        const rawIdStr = String(id);
        const unwrapSrvPrefix = (s: string) => s.replace(/^srv_/, "");
        const normalizedCandidate = unwrapSrvPrefix(rawIdStr);

        const addr = addresses.find(
            (a) =>
                a.id === rawIdStr ||
                a.id === `srv_${normalizedCandidate}` ||
                a.serverId === normalizedCandidate ||
                a.serverId === rawIdStr
        );

        const useId = (addr?.serverId ?? normalizedCandidate) as string | null;
        if (!useId) {
            alert("Cannot determine server address id to set default.");
            return;
        }

        const cust = localStorage.getItem(CUSTOMER_KEY);
        if (!cust) {
            alert("Customer not logged in");
            return;
        }

        try {
            setSettingDefaultId(String(id));
            const apiBase = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000/v1").replace(/\/$/, "");
            const url = `${apiBase}/customer/${encodeURIComponent(cust)}/address/${encodeURIComponent(useId)}/default`;

            console.debug("[ProfileAddresses] PUT", url);
            const res = await authFetch(url, { method: "PUT" });

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
            }

            // Update UI (only after success)
            setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.serverId === useId || a.id === String(id) })));

            // If parent provided onSetDefault, call it too (pass serverId)
            if (typeof onSetDefault === "function") {
                try {
                    onSetDefault(useId);
                } catch (err) {
                    console.warn("parent onSetDefault threw", err);
                }
            }
        } catch (err: any) {
            console.error("[ProfileAddresses] setDefault error:", err);
            alert(err?.message ?? "Failed to set default address");
        } finally {
            setSettingDefaultId(null);
        }
    };

    const handleAdd = onAdd ?? internalAdd;
    const handleEdit = onEdit ?? internalEdit;
    // IMPORTANT: prefer internalDelete (so the child actually calls the DELETE endpoint).
    // If parent passed an onDelete prop, we'll call it after a successful internal delete (see internalDelete).
    const handleDelete = onDelete ?? internalDelete;
    const handleSetDefault = onSetDefault ?? internalSetDefault;

    /* ---- Confirmation modal helpers ---- */
    function openConfirm(action: 'delete' | 'setDefault', id: string | number) {
        setConfirmAction(action);
        setConfirmTargetId(String(id));
        setConfirmOpen(true);
    }

    async function onConfirmModal() {
        if (!confirmAction || !confirmTargetId) return;
        setConfirmLoading(true);

        try {
            if (confirmAction === 'delete') {
                // call internal delete (which talks to server). If parent wanted to own network calls,
                // they could have passed their own onDelete prop and we'd call that instead.
                await Promise.resolve(internalDelete(confirmTargetId));
            } else if (confirmAction === 'setDefault') {
                await Promise.resolve(internalSetDefault(confirmTargetId));
            }
        } catch (err: any) {
            console.error("[ProfileAddresses] confirm action error:", err);
            alert(err?.message ?? "Operation failed");
        } finally {
            setConfirmLoading(false);
            setConfirmOpen(false);
            setConfirmAction(null);
            setConfirmTargetId(null);
        }
    }

    function onCancelModal() {
        setConfirmOpen(false);
        setConfirmAction(null);
        setConfirmTargetId(null);
    }

    /* ---- AddressModal callbacks (create/update) ---- */
    function onAddressCreated(localAddr: EditAddressType) {
        const newAddr: Address = {
            id: localAddr.id as string,
            serverId: localAddr.serverId ?? null,
            recipientName: localAddr.recipientName,
            recipientContact: localAddr.recipientContact,
            addressLine1: localAddr.addressLine1,
            addressLine2: localAddr.addressLine2,
            addressLine3: localAddr.addressLine3,
            landmark: localAddr.landmark,
            cityName: localAddr.cityName ?? "",
            stateName: localAddr.stateName ?? "",
            pincode: localAddr.pincode,
            countryId: localAddr.countryId ?? null,
            stateId: localAddr.stateId ?? null,
            cityId: localAddr.cityId ?? null,
            isDefault: !!localAddr.isDefault,
        };
        setAddresses((prev) => [...prev, newAddr]);
    }

    function onAddressUpdated(updated: EditAddressType) {
        setAddresses((prev) =>
            prev.map((a) => {
                const matches = (a.serverId && updated.serverId && a.serverId === updated.serverId) || a.id === updated.id;
                if (!matches) return a;
                return {
                    ...a,
                    recipientName: updated.recipientName,
                    recipientContact: updated.recipientContact,
                    addressLine1: updated.addressLine1,
                    addressLine2: updated.addressLine2,
                    addressLine3: updated.addressLine3,
                    landmark: updated.landmark,
                    cityName: updated.cityName,
                    stateName: updated.stateName,
                    pincode: updated.pincode,
                    isDefault: !!updated.isDefault,
                    serverId: updated.serverId ?? a.serverId,
                    countryId: updated.countryId ?? a.countryId,
                    stateId: updated.stateId ?? a.stateId,
                    cityId: updated.cityId ?? a.cityId,
                };
            })
        );

        if (updated.isDefault) {
            setAddresses((prev) =>
                prev.map((a) => {
                    const matches = (a.serverId && updated.serverId && a.serverId === updated.serverId) || a.id === updated.id;
                    return matches ? { ...a, isDefault: true } : { ...a, isDefault: false };
                })
            );
        }
    }

    /* ---- UI ---- */
    return (
        <section id="addresses-area" className="bg-white rounded-3xl p-6 lg:p-8 shadow-lg border">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold">Addresses</h3>
                    <p className="text-sm text-slate-500">Manage your delivery addresses.</p>
                </div>
                <div>
                    <button onClick={() => handleAdd()} className="px-4 py-2 rounded-lg bg-[#065975] text-white shadow inline-flex items-center">
                        <Plus className="w-4 h-4 inline-block mr-2" /> Add address
                    </button>
                </div>
            </div>

            {loading && <div className="mt-6 text-sm text-slate-500 p-4 border rounded-xl">Loading addresses...</div>}
            {error && !loading && <div className="mt-6 text-sm text-rose-600 p-4 border rounded-xl">{error}</div>}
            {!loading && !error && addresses.length === 0 && <div className="mt-6 text-sm text-slate-500 p-4 border rounded-xl">No addresses yet.</div>}

            {!loading && !error && pageItems.length > 0 && (
                <div className="mt-6 grid gap-4">
                    {pageItems.map((a) => (
                        <div key={a.id} className="flex items-start justify-between p-5 border rounded-2xl hover:shadow-md transition bg-white">
                            <div>
                                <div className="flex items-center gap-3">
                                    <div className="font-semibold text-lg">{a.recipientName} {a.recipientContact ? `- ${a.recipientContact}` : ""}</div>
                                    {a.isDefault && <div className="text-xs bg-[#ecfdf5] text-[#065975] px-3 py-0.5 rounded-full">Default</div>}
                                </div>

                                <div className="text-sm text-slate-600 mt-2">
                                    {a.addressLine1}
                                    {a.addressLine2 ? `, ${a.addressLine2}` : ""}
                                    {a.addressLine3 ? `, ${a.addressLine3}` : ""}
                                </div>

                                {a.landmark ? (
                                    <div className="text-sm text-slate-500 mt-1">Landmark: {a.landmark}</div>
                                ) : null}

                                <div className="text-xs text-slate-400 mt-2">
                                    {a.cityName ? `${a.cityName} ` : ""}{a.stateName ? `${a.stateName} ` : ""}• {a.pincode}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-3">
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(a)} className="px-4 py-2 rounded-md border shadow-sm">
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => openConfirm('delete', a.id)}           // pass local id
                                        className="px-4 py-2 rounded-md border text-rose-600 flex items-center gap-2 shadow-sm"
                                        disabled={deletingId === String(a.id) || deletingId === String(a.serverId)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        {deletingId === String(a.id) || deletingId === String(a.serverId) ? "Removing..." : "Remove"}
                                    </button>
                                </div>
                                {!a.isDefault && (
                                    <button
                                        onClick={() => openConfirm('setDefault', a.id)}       // pass local id
                                        className="text-sm text-slate-500 underline"
                                        disabled={settingDefaultId === String(a.id) || settingDefaultId === String(a.serverId)}
                                    >
                                        {settingDefaultId === String(a.id) || settingDefaultId === String(a.serverId) ? "Setting..." : "Set default"}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && !error && total > perPage && (
                <div className="mt-6 flex items-center justify-center">
                    <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
                </div>
            )}

            {/* Confirmation modal */}
            <ConfirmModal
                open={confirmOpen}
                title={
                    confirmAction === 'delete'
                        ? 'Remove address?'
                        : confirmAction === 'setDefault'
                            ? 'Set default address?'
                            : 'Confirm'
                }
                description={
                    confirmAction === 'delete'
                        ? 'Are you sure you want to remove this address? This action cannot be undone.'
                        : confirmAction === 'setDefault'
                            ? 'Make this address your default shipping address?'
                            : ''
                }
                confirmLabel={confirmAction === 'delete' ? 'Yes, remove' : 'Yes, set default'}
                cancelLabel="Cancel"
                loading={confirmLoading}
                onConfirm={onConfirmModal}
                onCancel={onCancelModal}
            />

            {/* Add / Edit modal */}
            <AddressModalEdit
                show={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                onCreated={onAddressCreated}
                onUpdated={onAddressUpdated}
                editAddress={editAddress}
            />
        </section>
    );
}