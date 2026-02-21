"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import Image from "next/image";
import { Plus, CreditCard, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";

// adjust this import to match where you placed AddressModal
import AddressModal, { Address } from "./AddressModal";

const TOKEN_KEY = "accessToken";

/** Cart item type */
export type CartItem = {
    id: string;
    title: string;
    price: number;
    qty: number;
    img?: string;
};

type Props = {
    initialAddresses?: Address[];
    initialCart?: CartItem[];
};

/** Helper: check Indian pincode rough validation */
function isValidIndianPincode(pin: string) {
    return /^[1-9][0-9]{5}$/.test(pin);
}

export default function CheckoutPanel({ initialAddresses, initialCart }: Props) {
    const router = useRouter();
    const isRefreshingRef = useRef(false);
    const placeOrderLockRef = useRef(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    const [addresses, setAddresses] = useState<Address[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartLoaded, setCartLoaded] = useState<boolean>(false);
    const [selectedAddressId, setSelectedAddressId] = useState<string | number | null>(null);
    const [showModal, setShowModal] = useState(false);

    // NEW: billing state
    const [billingSame, setBillingSame] = useState<boolean>(true);
    const [billingAddressId, setBillingAddressId] = useState<string | number | null>(null);

    const [creating, setCreating] = useState(false);

    const blankAddress: Address = {
        id: `local_${Date.now()}`,
        serverId: null,
        recipientName: "",
        recipientContact: "",
        addressLine1: "",
        addressLine2: "",
        addressLine3: "",
        landmark: "",
        countryId: "",
        stateId: "",
        cityId: "",
        pincode: "",
        isDefault: false,
        countryName: undefined,
        stateName: undefined,
        cityName: undefined,
    };

    const [loadingAddresses, setLoadingAddresses] = useState(false);

    const [countries, setCountries] = useState<Array<{ _id: string; countryName: string }>>([]);
    const [states, setStates] = useState<Array<{ _id: string; stateName: string; country?: { _id: string } }>>([]);
    const [cities, setCities] = useState<Array<{ _id: string; cityName: string; state?: { _id: string } }>>([]);

    const [geoLoading, setGeoLoading] = useState({ countries: false, states: false, cities: false });
    const [countrySearch, setCountrySearch] = useState("");
    const [stateSearch, setStateSearch] = useState("");
    const [citySearch, setCitySearch] = useState("");

    type ServiceEntry = { checking: boolean; prepaid: boolean | null; error?: string };
    const [serviceMap, setServiceMap] = useState<Record<string, ServiceEntry>>({});

    type DeliveryEntry = { checking: boolean; value: number | null; error?: string };
    const [deliveryMap, setDeliveryMap] = useState<Record<string, DeliveryEntry>>({});

    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        try {
            if (typeof window === "undefined") return;
            const serverOnly = addresses.filter(a => a.serverId);
            localStorage.setItem("wcm_addresses", JSON.stringify(serverOnly));
        } catch { }
    }, [addresses]);

    function getStoredCustomerId(): string | null {
        if (typeof window === "undefined") return null;
        try {
            const raw = localStorage.getItem("auth");
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed?.customerId ?? null;
        } catch {
            return null;
        }
    }

    // --- API helpers ---
    function getApiBase(): string {
        if (typeof window === "undefined") return "";
        return process.env.NEXT_PUBLIC_API_BASE ? String(process.env.NEXT_PUBLIC_API_BASE) : "";
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

    function handleUnauthorized() {
        try {
            if (typeof window !== "undefined") {
                localStorage.removeItem(TOKEN_KEY);
                const raw = localStorage.getItem("auth");
                if (raw) {
                    const parsed = JSON.parse(raw);
                    delete parsed.customerId;
                    localStorage.setItem("auth", JSON.stringify(parsed));
                }
            }
        } catch {
            // ignore
        }
        router.replace("/login");
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
        try {
            return await res.text();
        } catch {
            return null;
        }
    }

    async function apiGetCart(customerId: string): Promise<CartItem[]> {
        const url = buildUrl(`/cart?customerId=${encodeURIComponent(customerId)}`);
        const headers = new Headers();
        const token = getAuthToken();
        if (token) headers.set("Authorization", `Bearer ${token}`);

        const res = await fetch(url, { method: "GET", headers });
        if (res.status === 401) {
            handleUnauthorized();
            throw new Error("Unauthorized");
        }
        if (!res.ok) {
            const payload = await safeJson(res);
            throw new Error(payload?.message || payload?.error || `Failed to fetch cart (${res.status})`);
        }
        const json = (await safeJson(res)) || {};

        const cartData = Array.isArray((json as any).cartData) ? (json as any).cartData : [];
        if (cartData.length === 0) return [];

        const entry = cartData[0];
        const sellItems = Array.isArray(entry.sellItems) ? entry.sellItems : [];
        const mapped: CartItem[] = sellItems.map((si: any) => {
            const product = si.product || {};
            const priceObj = product.price || {};
            const price = priceObj.discountedPrice ?? priceObj.actualPrice ?? priceObj.price ?? 0;
            const rawImg = product.productImage ?? product.productImg ?? "";
            const img = normalizeImageUrl(rawImg);

            return {
                id: String(product.productId ?? si.productId ?? si.product_id ?? si._id ?? ""),
                title: String(product.productName ?? product.name ?? "Untitled"),
                price: Number(price),
                qty: Number(si.quantity ?? si.qty ?? 1),
                img: img ?? undefined,
            };
        });

        return mapped;
    }

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

    async function apiFetchStates(
        countryId?: string
    ): Promise<Array<{ _id: string; stateName: string; country?: { _id: string } }>> {
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

    async function apiFetchCities(stateId?: string): Promise<Array<{ _id: string; cityName: string; state?: { _id: string } }>> {
        try {
            const url = stateId ? buildUrl(`/master/cities?stateId=${encodeURIComponent(stateId)}`) : buildUrl(`/master/cities`);
            const res = await fetch(url);
            if (!res.ok) return [];
            const json = await safeJson(res);
            const arr = Array.isArray((json as any).cityData) ? (json as any).cityData : [];
            return arr.map((c: any) => ({
                _id: String(c._id),
                cityName: c.cityName ?? c.name ?? "",
                state: c.state ? (typeof c.state === "object" ? { _id: String(c.state._id) } : { _id: String(c.state) }) : undefined,
            }));
        } catch {
            return [];
        }
    }

    function mapServerAddressToLocal(serverRec: any): Address {
        const serverId = serverRec._id ? String(serverRec._id) : null;
        const localId = serverId ? `srv_${serverId}` : `local_${Date.now() + Math.floor(Math.random() * 1000)}`;

        return {
            id: localId,
            serverId: serverId,
            recipientName: serverRec.recipientName ?? "",
            recipientContact: serverRec.recipientContact ?? "",
            addressLine1: serverRec.addressLine1 ?? "",
            addressLine2: serverRec.addressLine2 ?? "",
            addressLine3: serverRec.addressLine3 ?? "",
            landmark: serverRec.landmark ?? "",
            countryId: serverRec.countryId ?? "",
            stateId: serverRec.stateId ?? "",
            cityId: serverRec.cityId ?? "",
            countryName: serverRec.countryName ?? "",
            stateName: serverRec.stateName ?? "",
            cityName: serverRec.cityName ?? "",
            pincode: serverRec.pincode ?? "",
            isDefault: !!serverRec.isDefault,
        };
    }

    async function apiFetchAddresses(customerId: string): Promise<any[]> {
        const url = buildUrl(`/customer/${encodeURIComponent(customerId)}/address`);
        const headers = new Headers();
        const token = getAuthToken();
        if (token) headers.set("Authorization", `Bearer ${token}`);

        const res = await fetch(url, { method: "GET", headers });
        if (res.status === 401) {
            handleUnauthorized();
            throw new Error("Unauthorized");
        }
        if (!res.ok) {
            const payload = await safeJson(res);
            throw new Error(payload?.message || payload?.error || `Failed to fetch addresses (${res.status})`);
        }
        const json = (await safeJson(res)) || {};
        const addressData = Array.isArray((json as any).addressData) ? (json as any).addressData : [];
        return addressData;
    }

    async function refreshAddresses() {
        try {
            const cust = getStoredCustomerId();
            if (!cust) return;

            setLoadingAddresses(true);
            const server = await apiFetchAddresses(cust);
            if (!mountedRef.current) return;

            const mapped = server.map(mapServerAddressToLocal);

            setAddresses(mapped);

            // ✅ persist once, after server truth
            localStorage.setItem("wcm_addresses", JSON.stringify(mapped));

            // select latest/default
            const def = mapped.find(a => a.isDefault) || mapped[0];
            if (def) setSelectedAddressId(def.id);
        } catch (err) {
            console.warn("Failed to refresh addresses", err);
        } finally {
            if (mountedRef.current) setLoadingAddresses(false);
        }
    }

    async function apiCreateAddress(customerId: string, addr: Address): Promise<any> {
        const url = buildUrl(`/customer/${encodeURIComponent(customerId)}/address`);
        const headers = new Headers({ "Content-Type": "application/json" });
        const token = getAuthToken();
        if (token) headers.set("Authorization", `Bearer ${token}`);

        const payload = {
            recipientName: addr.recipientName,
            recipientContact: addr.recipientContact,
            addressLine1: addr.addressLine1,
            addressLine2: addr.addressLine2,
            addressLine3: addr.addressLine3,
            landmark: addr.landmark,
            countryId: addr.countryId,
            stateId: addr.stateId,
            cityId: addr.cityId,
            pincode: addr.pincode,
            isDefault: !!addr.isDefault,
        };

        const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
        if (res.status === 401) {
            handleUnauthorized();
            throw new Error("Unauthorized");
        }
        const json = await safeJson(res);
        if (!res.ok) {
            if (!res.ok) {
                const msg =
                    typeof json?.error === "string"
                        ? json.error
                        : json?.error?.message
                        || json?.message
                        || `Failed to create address (${res.status})`;

                throw new Error(msg);
            }
        }
        return json;
    }

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

    async function checkAndCacheServiceability(pincode: string) {
        const key = String(pincode || "").trim();
        if (!key || !isValidIndianPincode(key)) return;

        const prev = serviceMap[key];
        if (prev && prev.checking === false && typeof prev.prepaid === "boolean") return;
        if (prev && prev.checking === true) return;

        setServiceMap((m) => ({ ...m, [key]: { checking: true, prepaid: null } }));
        try {
            const result = await fetchPincodeServiceability(key);
            if (!mountedRef.current) return;
            if (result.ok) {
                setServiceMap((m) => ({ ...m, [key]: { checking: false, prepaid: !!result.prepaid } }));
            } else {
                setServiceMap((m) => ({ ...m, [key]: { checking: false, prepaid: null, error: result.message || "Service check failed" } }));
            }
        } catch (err: any) {
            if (!mountedRef.current) return;
            setServiceMap((m) => ({ ...m, [key]: { checking: false, prepaid: null, error: (err?.message ?? String(err)) } }));
        }
    }

    async function apiFetchDeliveryCharge(pincode: string): Promise<{ ok: boolean; charge?: number; message?: string }> {
        try {
            const customerId = typeof window !== "undefined" ? getStoredCustomerId() : null;
            const token = getAuthToken();
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const path = `/logistic_partner/get_delivery_charge/${encodeURIComponent(pincode)}${customerId ? `?customerId=${encodeURIComponent(customerId)}` : ""}`;
            const url = buildUrl(path);

            const res = await fetch(url, {
                method: "GET",
                headers,
            });

            if (!res.ok) {
                const payload = await safeJson(res);
                const msg = payload?.message || payload?.error || `HTTP ${res.status}`;
                return { ok: false, message: msg };
            }

            const json = (await safeJson(res)) || {};
            const charge = json?.data?.computed?.totalDeliveryCharge;
            if (typeof charge === "number") {
                return { ok: true, charge };
            }

            const alt = json?.data?.totalDeliveryCharge ?? json?.totalDeliveryCharge;
            if (typeof alt === "number") return { ok: true, charge: alt };

            return { ok: false, message: "Delivery charge not found in response" };
        } catch (err: any) {
            return { ok: false, message: err?.message ?? String(err) };
        }
    }

    async function fetchAndCacheDeliveryCharge(pincode: string) {
        const key = String(pincode || "").trim();
        if (!key || !isValidIndianPincode(key)) return;

        const prev = deliveryMap[key];
        if (prev && prev.checking === false && typeof prev.value === "number") return;
        if (prev && prev.checking === true) return;

        setDeliveryMap((d) => ({ ...d, [key]: { checking: true, value: null } }));
        try {
            const res = await apiFetchDeliveryCharge(key);
            if (!mountedRef.current) return;
            if (res.ok) {
                setDeliveryMap((d) => ({ ...d, [key]: { checking: false, value: res.charge ?? null } }));
            } else {
                setDeliveryMap((d) => ({ ...d, [key]: { checking: false, value: null, error: res.message || "Failed to fetch" } }));
            }
        } catch (err: any) {
            if (!mountedRef.current) return;
            setDeliveryMap((d) => ({ ...d, [key]: { checking: false, value: null, error: err?.message ?? String(err) } }));
        }
    }

    // ---------- RAZORPAY HELPERS ----------
    function loadRazorpayScript(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (typeof window === "undefined") return reject(new Error("window is undefined"));
            if ((window as any).Razorpay) return resolve();
            const id = "razorpay-js";
            if (document.getElementById(id)) {
                const checkTimer = setInterval(() => {
                    if ((window as any).Razorpay) {
                        clearInterval(checkTimer);
                        resolve();
                    }
                }, 100);
                const to = setTimeout(() => {
                    clearInterval(checkTimer);
                    if ((window as any).Razorpay) resolve();
                    else reject(new Error("Razorpay script load timeout"));
                }, 10000);
                return;
            }
            const s = document.createElement("script");
            s.id = id;
            s.src = "https://checkout.razorpay.com/v1/checkout.js";
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
            document.head.appendChild(s);
        });
    }

    // helper to detect objectId (24 hex)
    function looksLikeObjectId(v: any) {
        return typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);
    }

    async function openRazorpayCheckout({
        key,
        razorpayOrder,
        orderId,
    }: {
        key: string;
        razorpayOrder: any;
        orderId?: string | null;
    }) {
        await loadRazorpayScript();
        const rp = (window as any).Razorpay;
        if (!rp) throw new Error("Razorpay SDK not available");

        const prefillCustomer = (() => {
            try {
                const json = localStorage.getItem("customerProfile");
                if (!json) return {};
                const c = JSON.parse(json);
                return {
                    name: c.name || "",
                    email: c.email || "",
                    contact: c.contact || c.phone || "",
                };
            } catch {
                return {};
            }
        })();

        type RazorpayHandlerResponse = {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
        };

        const options: any = {
            key,
            amount: Number(razorpayOrder.amount) || 0,
            currency: razorpayOrder.currency ?? "INR",
            name: "We Craft Memories",
            description: `Order ${orderId ?? razorpayOrder.receipt ?? ""}`,
            order_id: razorpayOrder.id,
            handler: async function (response: RazorpayHandlerResponse) {
                try {
                    const verifyUrl = buildUrl("/sell_order/verify_payment");

                    const basePayload: any = {
                        razorpayOrderId: response.razorpay_order_id,
                        razorpayPaymentId: response.razorpay_payment_id,
                        razorpaySignature: response.razorpay_signature,
                    };

                    const payloadWithOrder =
                        orderId && String(orderId).trim() ? { ...basePayload, orderId: String(orderId).trim() } : basePayload;

                    const headers: Record<string, string> = { "Content-Type": "application/json" };
                    const token = getAuthToken();
                    if (token) headers["Authorization"] = `Bearer ${token}`;

                    let res = await fetch(verifyUrl, { method: "POST", headers, body: JSON.stringify(payloadWithOrder) });
                    let body = await safeJson(res);

                    // retry without orderId if server couldn't find it
                    if (!res.ok && payloadWithOrder.orderId) {
                        const msg = body?.message || body?.error || "";
                        if (msg === "order_not_found" || msg === "order_not_found_from_notes") {
                            console.warn("verify_payment returned order_not_found; retrying without orderId");
                            res = await fetch(verifyUrl, { method: "POST", headers, body: JSON.stringify(basePayload) });
                            body = await safeJson(res);
                        }
                    }

                    if (res.ok) {
                        if (body?.ack === "success" || body?.status === "success") {
                            // Prefer explicit numeric orderNumber field, otherwise try numeric orderId.
                            const numericOrderNumber =
                                body?.orderNumber ?? (typeof body?.orderId === "number" || (/^\d+$/).test(String(body?.orderId)) ? body.orderId : null);

                            // Prefer _id / object id, then fallback to payload's orderId (if it was objectId)
                            const objectOrderId = body?._id && looksLikeObjectId(body._id)
                                ? String(body._id)
                                : (body?.orderId && looksLikeObjectId(body.orderId) ? String(body.orderId) : (payloadWithOrder.orderId && looksLikeObjectId(payloadWithOrder.orderId) ? String(payloadWithOrder.orderId) : null));

                            const qp: string[] = [];
                            if (numericOrderNumber !== null && numericOrderNumber !== undefined) qp.push(`orderNumber=${encodeURIComponent(String(numericOrderNumber))}`);
                            if (objectOrderId) qp.push(`orderId=${encodeURIComponent(String(objectOrderId))}`);

                            if (qp.length > 0) {
                                router.replace(`/order-success?${qp.join("&")}`);
                            } else {
                                const fallback = payloadWithOrder.orderId ? `?orderId=${encodeURIComponent(String(payloadWithOrder.orderId))}` : "";
                                router.replace(`/order-success${fallback}`);
                            }
                            return;
                        } else {
                            const reason = body?.message || body?.error || "Payment verification failed";
                            const serverOrderId = body?.orderId ?? payloadWithOrder.orderId ?? "";
                            router.replace(
                                `/order-failed?reason=${encodeURIComponent(String(reason))}${serverOrderId ? `&orderId=${encodeURIComponent(String(serverOrderId))}` : ""}`
                            );
                            return;
                        }
                    }

                    // non-ok HTTP
                    const finalReason = body?.message || body?.error || `Verification HTTP ${res.status}`;
                    const finalOrderId = body?.orderId ?? payloadWithOrder.orderId ?? "";
                    console.warn("Payment verification failed:", res.status, body);
                    router.replace(
                        `/order-failed?reason=${encodeURIComponent(String(finalReason))}${finalOrderId ? `&orderId=${encodeURIComponent(String(finalOrderId))}` : ""}`
                    );
                    return;
                } catch (err: any) {
                    console.error("Verify request threw:", err);
                    const reason = err?.message || "Verification request failed";
                    router.replace(`/order-failed?reason=${encodeURIComponent(String(reason))}${orderId ? `&orderId=${encodeURIComponent(String(orderId))}` : ""}`);
                    return;
                }
            },
            modal: { ondismiss: () => console.info("Razorpay modal dismissed") },
            prefill: prefillCustomer,
            notes: orderId ? { orderId: String(orderId) } : undefined,
            display: {
                hide: [{ method: "paylater" }, { method: "emi" }, { method: "cardless_emi" }],
                preferences: { show_default_blocks: false },
                sequence: [],
            },
            method: {
                upi: true,
                card: true,
                netbanking: true,
                wallet: true,
                emi: false,
                paylater: false,
            },
            emi: false,
            cardlessEmi: false,
            paylater: false,
        };

        console.info("Razorpay checkout options:", options);

        const rzpInstance = new rp(options);
        rzpInstance.open();
    }

    // --- End Razorpay helpers ---

    // openAdd (restored)
    async function openAdd() {
        setShowModal(true);

        (async () => {
            try {
                if (!countries.length) {
                    setGeoLoading((g) => ({ ...g, countries: true }));
                    const list = await apiFetchCountries();
                    if (!mountedRef.current) return;
                    setCountries(list);
                }
            } catch {
                // ignore
            } finally {
                if (mountedRef.current) setGeoLoading((g) => ({ ...g, countries: false }));
            }
        })();
    }

    useEffect(() => {
        try {
            if (typeof window === "undefined") return;

            const raw = localStorage.getItem("wcm_addresses");
            if (raw) {
                try {
                    const parsed: Address[] = JSON.parse(raw);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setAddresses(parsed);
                        if (selectedAddressId === null) setSelectedAddressId(parsed[0].id);
                    }
                } catch {
                    // ignore parse err
                }
            } else if (initialAddresses && initialAddresses.length && selectedAddressId === null) {
                setAddresses(initialAddresses);
                setSelectedAddressId(initialAddresses[0].id);
            }

            (async () => {
                try {
                    setGeoLoading((g) => ({ ...g, countries: true }));
                    const list = await apiFetchCountries();
                    if (!mountedRef.current) return;
                    setCountries(list);
                } catch {
                    // ignore
                } finally {
                    if (mountedRef.current) setGeoLoading((g) => ({ ...g, countries: false }));
                }
            })();

            (async () => {
                const cust = getStoredCustomerId();
                if (!cust) {
                    router.replace("/login");
                    return;
                }
                setLoadingAddresses(true);
                try {
                    const server = await apiFetchAddresses(cust);
                    if (!mountedRef.current) return;
                    if (Array.isArray(server) && server.length > 0) {
                        const mapped = server.map((s) => mapServerAddressToLocal(s));
                        setAddresses(mapped);
                        if (selectedAddressId === null && mapped.length > 0) setSelectedAddressId(mapped[0].id);

                        const first = mapped[0];
                        if (first?.countryId) {
                            try {
                                setGeoLoading((g) => ({ ...g, states: true }));
                                const st = await apiFetchStates(first.countryId);
                                if (!mountedRef.current) return;
                                setStates(st);
                            } finally {
                                if (mountedRef.current) setGeoLoading((g) => ({ ...g, states: false }));
                            }

                            if (first?.stateId) {
                                try {
                                    setGeoLoading((g) => ({ ...g, cities: true }));
                                    const ct = await apiFetchCities(first.stateId);
                                    if (!mountedRef.current) return;
                                    setCities(ct);
                                } finally {
                                    if (mountedRef.current) setGeoLoading((g) => ({ ...g, cities: false }));
                                }
                            }
                        }
                    }
                } catch (err) {
                    // ignore
                } finally {
                    try {
                        if (mountedRef.current) {
                            setLoadingAddresses(false);
                        }
                    } finally {
                        setCheckingAuth(false);
                    }
                }
            })();
        } catch {
            if (initialAddresses && initialAddresses.length && selectedAddressId === null) {
                setAddresses(initialAddresses);
                setSelectedAddressId(initialAddresses[0].id);
            }
            setCheckingAuth(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Ensure billing state defaults when addresses load or change
    useEffect(() => {
        if (!addresses || addresses.length === 0) {
            setBillingSame(true);
            setBillingAddressId(null);
            return;
        }

        if (addresses.length === 1) {
            const single = addresses[0];
            setBillingSame(true);
            setBillingAddressId(single.id);
            if (!selectedAddressId) setSelectedAddressId(single.id);
            return;
        }

        if (billingSame) {
            setBillingAddressId(selectedAddressId);
        } else {
            const found = addresses.find((a) => a.id === billingAddressId);
            if (!found) setBillingAddressId(selectedAddressId ?? (addresses.length ? addresses[0].id : null));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [addresses]);

    // Keep billingAddressId in sync with selectedAddressId while billingSame === true
    useEffect(() => {
        if (billingSame) {
            setBillingAddressId(selectedAddressId);
        }
    }, [selectedAddressId, billingSame]);

    function handleAddressCreated(incoming: Address) {
        setAddresses((prev) => {
            // if incoming contains serverId, prefer to match/replace by serverId
            if (incoming.serverId) {
                const idxByServer = prev.findIndex((a) => a.serverId === incoming.serverId || a.id === `srv_${incoming.serverId}`);
                if (idxByServer >= 0) {
                    const next = [...prev];
                    next[idxByServer] = { ...next[idxByServer], ...incoming };
                    try {
                        if (typeof window !== "undefined") localStorage.setItem("wcm_addresses", JSON.stringify(next));
                    } catch { }
                    return next;
                }
            }

            // match optimistic id (local_...)
            const isLocalId = typeof incoming.id === "string" && incoming.id.startsWith("local_");
            const idxByLocal = isLocalId ? prev.findIndex((a) => a.id === incoming.id) : -1;
            if (idxByLocal >= 0) {
                const next = [...prev];
                next[idxByLocal] = { ...next[idxByLocal], ...incoming };
                try {
                    if (typeof window !== "undefined") localStorage.setItem("wcm_addresses", JSON.stringify(next));
                } catch { }
                return next;
            }

            const next = [incoming, ...prev];
            try {
                if (typeof window !== "undefined") localStorage.setItem("wcm_addresses", JSON.stringify(next));
            } catch { }
            return next;
        });

        setSelectedAddressId(incoming.id);
    }

    useEffect(() => {
        try {
            const cust = typeof window !== "undefined" ? getStoredCustomerId() : null;
            if (!cust) {
                router.replace("/login");
                return;
            }

            (async () => {
                try {
                    const serverCart = await apiGetCart(cust);
                    setCart(Array.isArray(serverCart) ? serverCart : []);
                } catch (err) {
                    console.warn("Could not load server cart, keeping current cart state", err);
                } finally {
                    setCartLoaded(true);
                    setCheckingAuth(false);
                }
            })();
        } catch {
            router.replace("/login");
            return;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        try {
            const count = cart.reduce((s, it) => s + (Number(it.qty) || 1), 0);
            try {
                if (typeof window !== "undefined") localStorage.setItem("cartCount", String(count));
            } catch {
                /* ignore */
            }
            if (typeof window !== "undefined") window.dispatchEvent(new Event("cartChanged"));
        } catch (err) {
            console.error("[CheckoutPanel] update cartCount error", err);
        }
    }, [cart]);

    useEffect(() => {
        if (!cartLoaded) return;
        if (checkingAuth) return;
        if (creating) return;

        if (typeof total === "number" && total <= 0) {
            try {
                if (typeof window !== "undefined" && !window.location.pathname.startsWith("/cart")) {
                    router.replace("/cart");
                }
            } catch (err) {
                console.warn("Redirect to cart failed", err);
            }
        }
    }, [cartLoaded, checkingAuth, creating, cart.length]);

    function placeOrder() {
        // 🔒 HARD LOCK (instant)
        if (placeOrderLockRef.current) return;
        placeOrderLockRef.current = true;

        const cust = typeof window !== "undefined"
            ? getStoredCustomerId()
            : null;

        if (!cust) {
            placeOrderLockRef.current = false;
            router.replace("/login");
            return;
        }

        if (!selectedAddressId) {
            placeOrderLockRef.current = false;
            return window.scrollTo({ top: 0, behavior: "smooth" });
        }

        const addr = addresses.find((a) => a.id === selectedAddressId);
        if (!addr) {
            placeOrderLockRef.current = false;
            return alert("Selected address not found");
        }

        const svc = serviceMap[addr.pincode];
        if (svc?.checking) {
            placeOrderLockRef.current = false;
            return alert("Checking pincode serviceability — please wait");
        }

        if (svc && svc.prepaid === false) {
            placeOrderLockRef.current = false;
            return alert("Selected address is not serviceable for prepaid orders.");
        }

        (async () => {
            try {
                await createOrderAndRedirect(cust, addr);
            } catch {
                placeOrderLockRef.current = false;
            }
        })();
    }

    function ensureServerAddress(addr: Address): Address {
        if (!addr.serverId) {
            throw new Error("Address is not saved on server");
        }
        return addr;
    }

    async function createOrderAndRedirect(customerId: string, addr: Address) {
        if (creating) return;
        setCreating(true);

        try {
            let usedAddr: Address;

            try {
                usedAddr = ensureServerAddress(addr);
            } catch {
                alert("Please save the address before placing order.");
                setCreating(false);
                return;
            }

            if (!usedAddr.serverId || !looksLikeObjectId(usedAddr.serverId)) {
                alert("Failed to save address. Please try again.");
                setCreating(false);
                return;
            }

            const deliveryAddressId = usedAddr.serverId;

            let billingAddressIdToSend: string | null = null;

            if (billingSame || !billingAddressId) {
                billingAddressIdToSend = usedAddr.serverId;
            } else {
                const localBilling = addresses.find(
                    (a) => a.id === billingAddressId || a.serverId === billingAddressId
                );

                const usedBillingAddr = localBilling
                    ? ensureServerAddress(localBilling)
                    : null;

                if (!usedBillingAddr?.serverId || !looksLikeObjectId(usedBillingAddr.serverId)) {
                    alert("Failed to save billing address. Please try again.");
                    setCreating(false);
                    return;
                }

                billingAddressIdToSend = usedBillingAddr.serverId;
            }

            const url = buildUrl("/sell_order/create");
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            const token = getAuthToken();
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const body = {
                customerId: String(customerId),
                deliveryAddressId,
                billingAddressId: billingAddressIdToSend,
                cart: cart.map(it => ({
                    productId: it.id,
                    qty: it.qty,
                    price: it.price,
                })),
            };

            console.debug("[createOrder] POST", url, body);
            const res = await fetch(url, {
                method: "POST",
                headers,
                body: JSON.stringify(body),
            });

            if (res.status === 401) {
                handleUnauthorized();
                return;
            }

            const json = (await safeJson(res)) || {};
            console.debug("[createOrder] response", res.status, json);

            if (res.ok && (json?.ack === "success" || json?.ack === "SUCCESS" || json?.orderId || json?.data)) {
                const numericOrderNumber =
                    (typeof json.orderId === "number" ? json.orderId : (typeof json.orderId === "string" && /^\d+$/.test(json.orderId) ? Number(json.orderId) : null))
                    ?? (json?.data && (typeof json.data.orderNumber === "number" ? json.data.orderNumber : (typeof json.data.orderNumber === "string" && /^\d+$/.test(json.data.orderNumber) ? Number(json.data.orderNumber) : null)))
                    ?? null;

                const maybeObjectId =
                    (json && json._id && typeof json._id === "string" && /^[0-9a-fA-F]{24}$/.test(json._id) ? String(json._id)
                        : (json?.data && json.data._id && typeof json.data._id === "string" && /^[0-9a-fA-F]{24}$/.test(json.data._id) ? String(json.data._id)
                            : null));

                const serverObjectIdForCheckout =
                    maybeObjectId
                    ?? (json?.data && json.data.orderId && typeof json.data.orderId === "string" && /^[0-9a-fA-F]{24}$/.test(json.data.orderId) ? String(json.data.orderId) : null)
                    ?? (json && json.orderId && typeof json.orderId === "string" && /^[0-9a-fA-F]{24}$/.test(json.orderId) ? String(json.orderId) : null);

                const razorpayOrder = json.razorpayOrder ?? json?.data?.razorpayOrder ?? null;
                const rzpKey = json.key ?? json?.data?.key ?? null;

                if (razorpayOrder && rzpKey) {
                    try {
                        await openRazorpayCheckout({ key: rzpKey, razorpayOrder, orderId: serverObjectIdForCheckout ?? null });
                        return;
                    } catch (err: any) {
                        console.error("Failed to open Razorpay", err);
                        router.replace(`/order-failed?reason=${encodeURIComponent("Failed to open Razorpay checkout")}`);
                        return;
                    }
                }

                const subtotalLocal = subtotal;
                const deliveryChargeVal = Number(currentDeliveryCharge || 0);
                const totalLocal = subtotalLocal + deliveryChargeVal;

                const qp: string[] = [];
                if (numericOrderNumber !== null && numericOrderNumber !== undefined) qp.push(`orderNumber=${encodeURIComponent(String(numericOrderNumber))}`);
                if (serverObjectIdForCheckout) qp.push(`orderId=${encodeURIComponent(String(serverObjectIdForCheckout))}`);

                if (qp.length > 0) {
                    router.replace(`/order-success?${qp.join("&")}`);
                } else {
                    router.replace(`/order-success?total=${encodeURIComponent(String(totalLocal))}`);
                }
            } else {
                const msg = json?.message || json?.error || `Order creation failed (${res.status})`;
                console.warn("[createOrder] failed", msg, json);

                const orderId = json?.orderId ?? json?.data?.orderId ?? null;
                const reason = String(msg || "Unknown error");

                router.replace(`/order-failed?reason=${encodeURIComponent(reason)}${orderId ? `&orderId=${encodeURIComponent(String(orderId))}` : ""}`);
            }
        } catch (err: any) {
            console.error("[createOrder] network error", err);
            router.replace(`/order-failed?reason=${encodeURIComponent(String(err?.message ?? err ?? "Network error"))}`);
        } finally {
            if (!mountedRef.current) return;

            // Stop loading spinner
            setCreating(false);
        }
    }

    function formatINR(n: number) {
        return `₹${n.toLocaleString("en-IN")}`;
    }

    function normalizeImageUrl(raw?: string | null | undefined) {
        if (!raw) return null;
        const str = String(raw).trim();
        if (str === "") return null;

        try {
            const u = new URL(str, typeof window !== "undefined" ? window.location.origin : undefined);

            if (typeof window !== "undefined" && u.hostname === window.location.hostname && u.port === window.location.port) {
                return u.pathname + u.search + u.hash;
            }
            return u.toString();
        } catch {
            const apiBase = getApiBase().replace(/\/$/, "");
            if (str.startsWith("/")) return apiBase ? `${apiBase}${str}` : str;
            return apiBase ? `${apiBase}/${str.replace(/^\/+/, "")}` : `/${str.replace(/^\/+/, "")}`;
        }
    }

    function safeImg(src?: string) {
        const norm = normalizeImageUrl(src);
        return norm ?? "/images/placeholder.png";
    }

    const subtotal = useMemo(() => cart.reduce((s, it) => s + it.price * it.qty, 0), [cart]);

    const currentDeliveryCharge = useMemo(() => {
        if (!selectedAddressId) return 0;
        const addr = addresses.find((a) => a.id === selectedAddressId);
        if (!addr) return 0;

        const entry = deliveryMap[addr.pincode];
        if (entry && typeof entry.value === "number") return entry.value;

        return 0;
    }, [selectedAddressId, addresses, deliveryMap]);

    const total = subtotal + (Number(currentDeliveryCharge) || 0);

    const filteredCountries = countries.filter((c) => c.countryName.toLowerCase().includes(countrySearch.trim().toLowerCase()));
    const filteredStates = states.filter((s) => s.stateName.toLowerCase().includes(stateSearch.trim().toLowerCase()));
    const filteredCities = (cities ?? []).filter((c) => c.cityName.toLowerCase().includes(citySearch.trim().toLowerCase()));

    useEffect(() => {
        if (!selectedAddressId) return;

        const current = addresses.find((a) => a.id === selectedAddressId);
        if (!current) {
            const fallback = addresses.length ? addresses[0].id : null;
            if (fallback !== selectedAddressId) setSelectedAddressId(fallback);
            return;
        }

        const svc = serviceMap[current.pincode];
        if (svc && svc.prepaid === false) {
            const firstGood = addresses.find((a) => {
                const s = serviceMap[a.pincode];
                return !(s && s.prepaid === false);
            }) ?? null;
            if (firstGood && firstGood.id !== selectedAddressId) {
                setSelectedAddressId(firstGood.id);
            } else if (!firstGood && selectedAddressId !== null) {
                setSelectedAddressId(null);
            }
            return;
        }

        if (current.pincode && isValidIndianPincode(current.pincode)) {
            checkAndCacheServiceability(current.pincode);
            fetchAndCacheDeliveryCharge(current.pincode).catch(() => { });
        }
    }, [selectedAddressId, addresses]);

    if (checkingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="w-full max-w-3xl">
                    <div className="h-8 w-48 bg-gray-200 rounded mb-4 animate-pulse" />
                    <div className="h-4 w-60 bg-gray-200 rounded mb-6 animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen from-[#f8fbfb] to-white p-4 md:p-8 font-sans pb-32 md:pb-10">
            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#065975]">Checkout</h1>
                        <p className="text-sm text-slate-500 mt-1">Simple, safe and delightful checkout experience</p>
                    </div>
                </header>

                <main className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
                    {/* Left panel: addresses + billing checkbox (cart removed from here) */}
                    <section className="bg-white rounded-2xl shadow-sm p-5 md:p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                            <div>
                                <h2 className="text-lg font-semibold">Delivery address</h2>
                                <p className="text-sm text-slate-500">Select where you'd like us to deliver</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={openAdd}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl 
                                        bg-linear-to-r from-[#065975] to-[#0ea5a0] 
                                        text-white text-sm font-medium
                                        shadow-md hover:shadow-lg hover:brightness-105
                                        transition-all duration-200 active:scale-[0.97]"
                                    >
                                    <Plus className="w-4 h-4" />
                                    Add address
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
                            {loadingAddresses && addresses.length === 0 && (
                                <div className="col-span-full text-center text-slate-500 p-6 border rounded-lg">Loading addresses…</div>
                            )}

                            {addresses.length === 0 && !loadingAddresses && (
                                <div className="col-span-full text-center text-slate-500 p-6 border rounded-lg">No saved addresses. Add one to continue.</div>
                            )}

                            {addresses.map((a) => {
                                const svc = serviceMap[a.pincode];
                                const isChecking = svc?.checking === true;
                                const prepaid = svc?.prepaid;
                                const showError = prepaid === false;
                                const isDisabled = prepaid === false;

                                return (
                                    <label
                                        key={String(a.id)}
                                        className={`relative flex flex-col gap-4 p-5 rounded-2xl border transition-all duration-200 cursor-pointer
                                            ${selectedAddressId === a.id
                                                ? "border-[#065975] bg-[#f8fcfc] shadow-md"
                                                : "border-slate-200 bg-white hover:shadow-sm"}
                                            ${isDisabled ? "opacity-60 cursor-not-allowed" : ""}
                                        `}
                                    >
                                        {/* Top Row */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-[#065975]/90 text-white text-sm grid place-items-center font-semibold">
                                                    {a.recipientName
                                                        .split(" ")
                                                        .map((s) => s?.[0] ?? "")
                                                        .slice(0, 2)
                                                        .join("")}
                                                </div>

                                                <div>
                                                    <div className="font-semibold text-slate-800">
                                                        {a.recipientName}
                                                    </div>
                                                    <div className="text-sm text-slate-500">
                                                        {a.recipientContact}
                                                    </div>
                                                </div>
                                            </div>

                                            <input
                                                type="radio"
                                                checked={selectedAddressId === a.id}
                                                onChange={() => !isDisabled && setSelectedAddressId(a.id)}
                                                className="w-5 h-5 accent-[#065975]"
                                            />
                                        </div>

                                        {/* Address Text */}
                                        <div className="text-sm text-slate-600 leading-relaxed">
                                            {a.addressLine1}
                                            {a.addressLine2 && `, ${a.addressLine2}`}
                                            {a.cityName && `, ${a.cityName}`}
                                            {a.stateName && `, ${a.stateName}`}
                                            {a.countryName && `, ${a.countryName}`} — {a.pincode}
                                        </div>

                                        {/* Badge */}
                                        {prepaid === true && (
                                            <span className="inline-flex items-center px-3 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700 font-medium w-fit">
                                                ✓ Prepaid available
                                            </span>
                                        )}
                                    </label>
                                );
                            })}
                        </div>

                        {/* --- BILLING SAME CHECKBOX + optional billing address selector --- */}
                        <div className="mt-6">
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={billingSame}
                                    onChange={(e) => {
                                        if (addresses.length <= 1) {
                                            setBillingSame(true);
                                            return;
                                        }
                                        setBillingSame(Boolean(e.target.checked));
                                        if (e.target.checked) {
                                            setBillingAddressId(selectedAddressId);
                                        } else {
                                            setBillingAddressId(selectedAddressId ?? (addresses.length ? addresses[0].id : null));
                                        }
                                    }}
                                    disabled={addresses.length <= 1 || creating}
                                    className="w-4 h-4"
                                    title={addresses.length <= 1 ? "Only one saved address — billing will be same as delivery" : undefined}
                                />
                                <div>
                                    <div className="text-sm font-medium">Billing address same as delivery</div>
                                    <div className="text-xs text-slate-500">{addresses.length <= 1 ? "Only one saved address" : "Uncheck to choose a different billing address"}</div>
                                </div>
                            </label>

                            {!billingSame && addresses.length > 1 && (
                                <div className="mt-3 grid grid-cols-1 gap-2">
                                    {addresses.map((b) => {
                                        return (
                                            <label
                                                key={`billing-${String(b.id)}`}
                                                htmlFor={`billing-${String(b.id)}`}
                                                className={`flex items-start gap-3 p-3 rounded-lg border ${billingAddressId === b.id ? "border-[#065975] bg-[#f6fbfb]" : "border-slate-100"} cursor-pointer`}
                                            >
                                                <div className="flex-1">
                                                    <div className="font-medium">{b.recipientName} <span className="text-xs text-slate-500">({b.recipientContact})</span></div>
                                                    <div className="text-sm text-slate-600 leading-snug mt-1">
                                                        {b.addressLine1}
                                                        {b.addressLine2 ? `, ${b.addressLine2}` : ""}
                                                        {b.addressLine3 ? `, ${b.addressLine3}` : ""}
                                                        {b.landmark ? `, ${b.landmark}` : ""}
                                                        {b.cityName ? `, ${b.cityName}` : ""}
                                                        {b.stateName ? `, ${b.stateName}` : ""}
                                                        {b.countryName ? `, ${b.countryName}` : ""} — {b.pincode}
                                                    </div>
                                                </div>

                                                <div className="flex items-center mt-1">
                                                    <input
                                                        id={`billing-${String(b.id)}`}
                                                        type="radio"
                                                        name="billingAddr"
                                                        checked={billingAddressId === b.id}
                                                        onChange={() => {
                                                            setBillingAddressId(b.id);
                                                        }}
                                                        disabled={creating}
                                                        className="w-4 h-4"
                                                        aria-label={`Select billing address for ${b.recipientName}`}
                                                    />
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <hr className="my-6 border-slate-100" />

                        {/* removed cart from left panel per your request */}
                    </section>

                    {/* Right panel / summary */}
                    <aside className="bg-linear-to-b from-white to-[#f7fbfb] rounded-2xl shadow-lg p-5 md:p-6 xl:sticky xl:top-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Order summary</h2>
                            <span className="text-sm text-slate-500">{cart.length} item{cart.length !== 1 ? "s" : ""}</span>
                        </div>

                        <p className="text-sm text-slate-500 mt-1">Secure payment — we never store your card details</p>

                        <div className="mt-4 space-y-3 text-sm">
                            <div className="flex justify-between">
                                <div>Subtotal</div>
                                <div>{formatINR(subtotal)}</div>
                            </div>

                            <div className="flex justify-between">
                                <div>Delivery</div>
                                <div>{formatINR(Number(currentDeliveryCharge || 0))}</div>
                            </div>

                            <div className="border-t pt-3 mt-3 flex justify-between items-center">
                                <div className="text-lg font-extrabold">Total</div>
                                <div className="text-xl font-extrabold text-[#065975]">
                                    {formatINR(total)}
                                </div>
                            </div>
                        </div>

                        {/* Payment radio block REMOVED per your request */}

                        {/* Desktop place order button */}
                        <div className="mt-6 hidden md:flex gap-3">
                            <button
                                onClick={placeOrder}
                                className={`flex-1 py-3 rounded-xl font-semibold shadow transition-transform duration-150 active:scale-[0.98] ${creating ? "opacity-60 cursor-not-allowed" : "bg-linear-to-r from-[#065975] via-[#0c7c89] to-[#0ea5a0] text-white hover:brightness-95"}`}
                                disabled={creating || cart.length === 0}
                                aria-disabled={creating || cart.length === 0}
                            >
                                {creating ? "Placing order…" : `Place order • ${formatINR(total)}`}
                            </button>
                        </div>

                        <p className="text-xs text-slate-400 mt-3">
                            By placing order you agree to our <span className="text-[#065975]">Terms &amp; Conditions</span>.
                        </p>

                        {/* --- Your cart section --- */}
                        <div className="mt-6">
                            <h3 className="text-md font-medium mb-3">Your cart</h3>

                            {/* grid with 2 items per row */}
                            <div className="flex flex-col gap-4">
                                {cart.map((it) => (
                                    <div
                                        key={it.id}
                                        className="flex gap-4 p-4 rounded-2xl border border-slate-200 bg-white hover:shadow-md transition-all"
                                    >
                                        {/* Image */}
                                        <div className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-slate-100">
                                            <Image
                                                src={safeImg(it.img)}
                                                alt={it.title}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>

                                        {/* Content */}
                                        <div className="flex flex-col flex-1 justify-between">
                                            <div>
                                                <div className="font-semibold text-slate-800 leading-snug">
                                                    {it.title}
                                                </div>

                                                <div className="text-sm text-slate-500 mt-1">
                                                    {formatINR(it.price)} each
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-3">
                                                <div className="text-sm text-slate-600">
                                                    Qty <span className="font-semibold">{it.qty}</span>
                                                </div>

                                                <div className="text-base font-bold text-[#065975]">
                                                    {formatINR(it.price * it.qty)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {cart.length === 0 && (
                                    <div className="col-span-full text-center py-8 border rounded-xl">
                                        <p className="text-slate-500 mb-3">Your cart is empty</p>
                                        <button
                                            onClick={() => router.push("/shop")}
                                            className="px-4 py-2 bg-[#065975] text-white rounded-lg text-sm hover:brightness-95 transition"
                                        >
                                            Continue shopping
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>
                </main>

                {/* MOBILE FIXED BOTTOM BAR */}
                <div className="fixed left-0 right-0 bottom-0 z-50 md:hidden bg-white/95 backdrop-blur border-t px-4 py-3 shadow-2xl">
                    <div className="max-w-6xl mx-auto flex items-center gap-3">
                        <div className="flex-1">
                            <div className="text-sm text-slate-500">Total</div>
                            <div className="text-lg font-extrabold">{formatINR(total)}</div>
                        </div>
                        <button
                            onClick={placeOrder}
                            className={`ml-2 inline-flex items-center gap-2 px-4 py-3 rounded-lg font-semibold shadow ${creating ? "opacity-60 cursor-not-allowed bg-gray-200 text-slate-500" : "bg-[#065975] text-white"}`}
                            disabled={creating || cart.length === 0}
                            aria-disabled={creating || cart.length === 0}
                        >
                            {creating ? "Placing…" : `Place order • ${formatINR(total)}`}
                        </button>
                    </div>
                </div>

                <AddressModal
                    show={showModal}
                    onClose={() => setShowModal(false)}
                    onCreated={handleAddressCreated}
                    onSuccess={refreshAddresses}
                />
            </div>
        </div>
    );
}