"use client";

import React, { useEffect, useState } from "react";
import {
    Edit2,
    CheckCircle,
    Loader2,
    Mail,
    RotateCcw,
    XCircle,
} from "lucide-react";

export type UserProfile = {
    id: string;
    name: string;
    email: string;
    mobile?: string;
    isEmailVerified?: boolean;
};

type Props = {
    user: UserProfile;
    editing: boolean;
    draft: Partial<UserProfile> | null;
    onEdit: () => void; // toggle edit in parent
    onChangeDraft: (field: keyof UserProfile, value: string) => void;
    onSave: (updated: Partial<UserProfile>) => void | Promise<void>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3000/v1";

const isValidEmail = (s: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

export default function ProfileSection({
    user,
    editing,
    draft,
    onEdit,
    onChangeDraft,
    onSave,
}: Props) {
    const [localUser, setLocalUser] = useState<UserProfile>(user);
    const [emailEditing, setEmailEditing] = useState(false);
    const [newEmail, setNewEmail] = useState(user.email);
    const [loading, setLoading] = useState(false);
    const [emailMessage, setEmailMessage] = useState<string | null>(null);
    const [pendingEmail, setPendingEmail] = useState<string | null>(null);
    const [pendingSince, setPendingSince] = useState<string | null>(null);
    const [profileMessage, setProfileMessage] = useState<string | null>(null);

    // Sync local user when parent user changes
    useEffect(() => {
        setLocalUser(user);
    }, [user]);

    useEffect(() => {
        setNewEmail(localUser.email);
    }, [localUser.email]);

    // Fetch pending email (if any)
    // useEffect(() => {
    //     const token = localStorage.getItem("accessToken");
    //     if (!token) return;

    //     (async () => {
    //         try {
    //             const res = await fetch(`${API_BASE}/customer/email-pending`, {
    //                 headers: {
    //                     "Content-Type": "application/json",
    //                     Authorization: `Bearer ${token}`,
    //                 },
    //             });
    //             if (!res.ok) return;
    //             const contentType = res.headers.get("content-type") || "";
    //             const j = contentType.includes("application/json")
    //                 ? await res.json().catch(() => ({}))
    //                 : {};
    //             setPendingEmail(j.pendingEmail ?? null);
    //             setPendingSince(j.since ?? null);
    //         } catch {
    //             // ignore
    //         }
    //     })();
    // }, []);

    // Helper: fetch latest customer
    const fetchCustomer = async (customerId: string, token: string) => {
        try {
            const res = await fetch(`${API_BASE}/customer/${customerId}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!res.ok) return null;
            const contentType = res.headers.get("content-type") || "";
            const j = contentType.includes("application/json")
                ? await res.json().catch(() => null)
                : null;
            const data = j?.customerData ?? null;
            if (!data) return null;
            const mapped: UserProfile = {
                id: data._id ?? data.id ?? customerId,
                name: data.name ?? "",
                email: data.email ?? "",
                mobile: data.mobile ?? "",
                isEmailVerified: !!data.isEmailVerified,
            };
            return mapped;
        } catch {
            return null;
        }
    };

    // --- Update profile details ---
    const saveProfileFields = async () => {
        const payload: Partial<UserProfile> = {};
        const nameDraft = (draft?.name ?? localUser.name) as string;
        const mobileDraft = (draft?.mobile ?? localUser.mobile ?? "") as string;

        const nameChanged = nameDraft !== localUser.name;
        const mobileChanged = mobileDraft !== (localUser.mobile ?? "");

        if (nameChanged) payload.name = nameDraft;
        if (mobileChanged) payload.mobile = mobileDraft;
        if (Object.keys(payload).length === 0) return;

        const token = localStorage.getItem("accessToken");
        const customerId = localStorage.getItem("customerId");
        if (!token || !customerId) {
            setProfileMessage("Missing authentication or user details.");
            return;
        }

        setLoading(true);
        setProfileMessage(null);
        try {
            const res = await fetch(`${API_BASE}/customer/${customerId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
                body: JSON.stringify(payload),
            });

            const contentType = res.headers.get("content-type") || "";
            const body = contentType.includes("application/json")
                ? await res.json().catch(() => null)
                : null;

            if (!res.ok) {
                throw new Error(body?.message ?? `Failed to update profile (${res.status})`);
            }

            // Let parent handle global state & toggling edit mode
            await Promise.resolve(onSave(payload));

            // Update local copy with latest from server (best-effort)
            const fresh = await fetchCustomer(customerId, token);
            if (fresh) {
                setLocalUser(fresh);
                onChangeDraft("name", fresh.name);
                onChangeDraft("mobile", fresh.mobile ?? "");
            }

            setProfileMessage("✅ Profile updated successfully!");
        } catch (err: any) {
            setProfileMessage(err?.message ?? "❌ Failed to update profile.");
        } finally {
            setLoading(false);
        }
    };

    const cancelProfileFields = () => {
        onChangeDraft("name", localUser.name);
        onChangeDraft("mobile", localUser.mobile ?? "");
        setProfileMessage(null);
        setEmailEditing(false);
        setEmailMessage(null);
        // toggle edit mode back to view
        if (editing) onEdit();
    };

    // --- Email-related actions ---
    const sendVerification = async (emailToSend: string) => {
        const email = (emailToSend || "").trim();
        if (!email || !isValidEmail(email)) {
            setEmailMessage("Please enter a valid email address.");
            return;
        }

        const token = localStorage.getItem("accessToken");
        const customerId = localStorage.getItem("customerId");
        if (!token || !customerId) {
            setEmailMessage("Missing authentication. Please login again.");
            return;
        }

        setLoading(true);
        setEmailMessage(null);
        try {
            const res = await fetch(`${API_BASE}/customer/${customerId}/update_email`, {
                method: "PUT", // keep PUT if your backend expects PUT
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
                body: JSON.stringify({ email: email }),
            });

            const contentType = res.headers.get("content-type") || "";
            const body = contentType.includes("application/json")
                ? await res.json().catch(() => null)
                : null;

            if (!res.ok) {
                throw new Error(body?.message ?? `Failed to send verification (${res.status})`);
            }

            // Prefer server-provided timestamp if available
            const serverSince = body?.since ?? body?.requestedAt ?? null;
            setPendingEmail(email);
            setPendingSince(serverSince ?? new Date().toISOString());
            setEmailMessage("Verification link sent — please check your email.");
            setEmailEditing(false);
        } catch (e: any) {
            setEmailMessage(e?.message ?? "Failed to send verification email.");
        } finally {
            setLoading(false);
        }
    };

    const cancelEmailEdit = () => {
        setEmailEditing(false);
        setEmailMessage(null);
        setNewEmail(pendingEmail ?? localUser.email);
    };

    const onClickSend = async () => {
        if (!newEmail || newEmail.trim() === "") {
            setEmailMessage("Enter a valid email.");
            return;
        }
        if (newEmail.trim() === (pendingEmail ?? localUser.email)) {
            setEmailMessage("Enter a different email to update.");
            return;
        }
        await sendVerification(newEmail.trim());
    };

    const nameDraft = (draft?.name ?? localUser.name) as string;
    const mobileDraft = (draft?.mobile ?? localUser.mobile ?? "") as string;
    const nameChanged = nameDraft !== localUser.name;
    const mobileChanged = mobileDraft !== (localUser.mobile ?? "");
    const canSaveProfileFields = nameChanged || mobileChanged;

    const emailChanged =
        newEmail.trim() !== "" && newEmail.trim() !== (pendingEmail ?? localUser.email);

    return (
        <div className="border p-4 rounded-2xl bg-white">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    Profile Information
                </h2>
                {!editing && (
                    <button
                        onClick={onEdit}
                        className="text-sm flex items-center gap-1 text-blue-600 hover:underline"
                    >
                        <Edit2 size={14} /> Edit
                    </button>
                )}
            </div>

            {/* Name */}
            <div className="mb-3">
                <label className="text-sm text-slate-500">Name</label>
                {editing ? (
                    <input
                        type="text"
                        value={nameDraft}
                        onChange={(e) => onChangeDraft("name", e.target.value)}
                        className="border rounded-lg p-2 w-full text-sm mt-1"
                    />
                ) : (
                    <p className="font-medium">{localUser.name}</p>
                )}
            </div>

            {/* Mobile */}
            <div className="mb-3">
                <label className="text-sm text-slate-500">Mobile (optional)</label>
                {editing ? (
                    <input
                        type="tel"
                        value={mobileDraft}
                        onChange={(e) => onChangeDraft("mobile", e.target.value)}
                        className="border rounded-lg p-2 w-full text-sm mt-1"
                    />
                ) : (
                    <p className="font-medium">{localUser.mobile || "—"}</p>
                )}
            </div>

            {/* Save / Cancel */}
            {editing && (
                <div className="flex gap-3 mt-3 items-center">
                    <button
                        onClick={saveProfileFields}
                        disabled={!canSaveProfileFields || loading}
                        className="bg-blue-600 text-white px-4 py-1 rounded-lg text-sm disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading && <Loader2 className="animate-spin" size={14} />}
                        Save
                    </button>
                    <button
                        onClick={cancelProfileFields}
                        className="border px-4 py-1 rounded-lg text-sm"
                    >
                        Cancel
                    </button>
                    {profileMessage && (
                        <div className="text-sm text-slate-600">{profileMessage}</div>
                    )}
                </div>
            )}

            {/* Email Section */}
            <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                        <Mail size={16} /> Email Address
                    </h3>

                    {!emailEditing && (
                        <button
                            onClick={() => {
                                setEmailEditing(true);
                                setEmailMessage(null);
                                setNewEmail(pendingEmail ?? localUser.email);
                            }}
                            className="text-sm flex items-center gap-1 text-blue-600 hover:underline"
                        >
                            <Edit2 size={14} /> Change
                        </button>
                    )}
                </div>

                {!emailEditing ? (
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="font-medium">{localUser.email || "—"}</span>

                            {localUser.isEmailVerified ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 bg-green-100 text-green-800">
                                    <CheckCircle size={14} /> Verified
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 bg-orange-100 text-orange-800">
                                    <XCircle size={14} /> Not verified
                                </span>
                            )}
                        </div>

                        {pendingEmail && pendingEmail !== localUser.email && (
                            <div className="mt-2 text-sm text-slate-600 bg-slate-50 border rounded-lg p-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        Pending verification for <strong>{pendingEmail}</strong>
                                        {pendingSince && (
                                            <div className="text-xs text-slate-500">
                                                Requested on {new Date(pendingSince).toLocaleString()}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() =>
                                                pendingEmail && sendVerification(pendingEmail)
                                            }
                                            className="text-xs px-2 py-1 border rounded-md flex items-center gap-1"
                                            disabled={loading}
                                        >
                                            <RotateCcw size={14} /> Resend
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {emailMessage && (
                            <p className="text-sm text-slate-600 mt-2">{emailMessage}</p>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {/* current email line */}
                        <div className="flex items-center gap-3">
                            <span className="font-medium">{localUser.email || "—"}</span>
                            {localUser.isEmailVerified ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 bg-green-100 text-green-800">
                                    <CheckCircle size={14} /> Verified
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 bg-orange-100 text-orange-800">
                                    <XCircle size={14} /> Not verified
                                </span>
                            )}
                        </div>

                        {/* Input area for new email */}
                        <div className="flex flex-col gap-2">
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="Enter new email"
                                className="border rounded-lg p-2 w-full text-sm"
                            />
                            {emailChanged ? (
                                <div className="flex gap-2">
                                    <button
                                        onClick={onClickSend}
                                        disabled={loading}
                                        className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
                                    >
                                        {loading && <Loader2 className="animate-spin" size={14} />}
                                        Send Verification Email
                                    </button>
                                </div>
                            ) : (
                                <div className="text-xs text-slate-500">
                                    Enter a different email to enable sending a verification link.
                                </div>
                            )}
                        </div>

                        {/* Cancel button placed below the email address (cancels edit mode) */}
                        <div>
                            <button
                                onClick={cancelEmailEdit}
                                className="text-sm px-3 py-1 border rounded-lg"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                        </div>

                        {emailMessage && (
                            <p className="text-sm text-slate-600">{emailMessage}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}