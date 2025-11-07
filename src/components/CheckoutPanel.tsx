"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import Image from "next/image";
import Select from "react-select";
import { Plus, X, CreditCard, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";

// adjust this import to match where you placed AddressModal
import AddressModal, { Address } from "./AddressModal";

const DEFAULT_DELIVERY_CHARGE = 70; // fallback if API fails
const CUSTOMER_KEY = "customerId";
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
    const [checkingAuth, setCheckingAuth] = useState(true);

    const [addresses, setAddresses] = useState<Address[]>(initialAddresses || []);
    const [cart, setCart] = useState<CartItem[]>(initialCart || []);
    const [selectedAddressId, setSelectedAddressId] = useState<string | number | null>(null);
    const [showModal, setShowModal] = useState(false);

    // NEW: creating state to disable UI while order is being created
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
    };

    const [loadingAddresses, setLoadingAddresses] = useState(false);

    const [countries, setCountries] = useState<Array<{ _id: string; countryName: string }>>([]);
    const [states, setStates] = useState<Array<{ _id: string; stateName: string; country?: { _id: string } }>>([]);
    const [cities, setCities] = useState<Array<{ _id: string; cityName: string; state?: { _id: string } }>>([]);

    const [geoLoading, setGeoLoading] = useState({ countries: false, states: false, cities: false });

    const [countrySearch, setCountrySearch] = useState("");
    const [stateSearch, setStateSearch] = useState("");
    const [citySearch, setCitySearch] = useState("");

    // serviceability cache keyed by pincode
    type ServiceEntry = { checking: boolean; prepaid: boolean | null; error?: string };
    const [serviceMap, setServiceMap] = useState<Record<string, ServiceEntry>>({});

    // delivery charge (single value used in UI for selected address)
    type DeliveryEntry = { checking: boolean; value: number | null; error?: string };
    const [deliveryMap, setDeliveryMap] = useState<Record<string, DeliveryEntry>>({});

    // mounted ref to avoid updating state after unmount
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
            localStorage.setItem("wcm_addresses", JSON.stringify(addresses));
        } catch {
            // ignore
        }
    }, [addresses]);

    // --------------- helper API utilities (self-contained) ----------------
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
                localStorage.removeItem(CUSTOMER_KEY);
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
        return null;
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

    // Use stable server id as local id when available
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
            throw new Error(json?.error || json?.message || `Failed to create address (${res.status})`);
        }
        return json;
    }

    /** New: call logistic serviceability and cache result per-pincode
     *  Endpoint: /logistic_partner/get_pincode_serviceability/{pincode}
     *  We treat serviceable if response.json.data?.prepaid === true
     */
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

    // Guarded serviceability checker
    async function checkAndCacheServiceability(pincode: string) {
        const key = String(pincode || "").trim();
        if (!key || !isValidIndianPincode(key)) return;

        const prev = serviceMap[key];
        // if we already have entry and not checking -> skip
        if (prev && prev.checking === false && typeof prev.prepaid === "boolean") return;
        if (prev && prev.checking === true) return; // already in-flight

        // set checking state
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

    // ---------- Delivery charge API call & cache (GET with query param) ----------
    async function apiFetchDeliveryCharge(pincode: string): Promise<{ ok: boolean; charge?: number; message?: string }> {
        try {
            const customerId = typeof window !== "undefined" ? localStorage.getItem(CUSTOMER_KEY) : null;
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

    // Guarded fetch + cache
    async function fetchAndCacheDeliveryCharge(pincode: string) {
        const key = String(pincode || "").trim();
        if (!key || !isValidIndianPincode(key)) return;

        const prev = deliveryMap[key];
        if (prev && prev.checking === false && typeof prev.value === "number") return; // already cached
        if (prev && prev.checking === true) return; // already in-flight

        setDeliveryMap((d) => ({ ...d, [key]: { checking: true, value: null } }));
        try {
            const res = await apiFetchDeliveryCharge(key);
            if (!mountedRef.current) return;
            if (res.ok) {
                setDeliveryMap((d) => ({ ...d, [key]: { checking: false, value: res.charge ?? DEFAULT_DELIVERY_CHARGE } }));
            } else {
                setDeliveryMap((d) => ({ ...d, [key]: { checking: false, value: null, error: res.message || "Failed to fetch" } }));
            }
        } catch (err: any) {
            if (!mountedRef.current) return;
            setDeliveryMap((d) => ({ ...d, [key]: { checking: false, value: null, error: err?.message ?? String(err) } }));
        }
    }
    // ------------------------------------------------------------------------------

    useEffect(() => {
        let mounted = true;
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
                    if (!mounted) return;
                    setCountries(list);
                } catch {
                    // ignore
                } finally {
                    if (mounted) setGeoLoading((g) => ({ ...g, countries: false }));
                }
            })();

            (async () => {
                const cust = localStorage.getItem(CUSTOMER_KEY);
                if (!cust) {
                    router.replace("/login");
                    return;
                }
                setLoadingAddresses(true);
                try {
                    const server = await apiFetchAddresses(cust);
                    if (!mounted) return;
                    if (Array.isArray(server) && server.length > 0) {
                        const mapped = server.map((s) => mapServerAddressToLocal(s));
                        setAddresses(mapped);
                        if (selectedAddressId === null && mapped.length > 0) setSelectedAddressId(mapped[0].id);

                        // fetch geo for the first address
                        const first = mapped[0];
                        if (first?.countryId) {
                            try {
                                setGeoLoading((g) => ({ ...g, states: true }));
                                const st = await apiFetchStates(first.countryId);
                                if (!mounted) return;
                                setStates(st);
                            } finally {
                                if (mounted) setGeoLoading((g) => ({ ...g, states: false }));
                            }

                            if (first?.stateId) {
                                try {
                                    setGeoLoading((g) => ({ ...g, cities: true }));
                                    const ct = await apiFetchCities(first.stateId);
                                    if (!mounted) return;
                                    setCities(ct);
                                } finally {
                                    if (mounted) setGeoLoading((g) => ({ ...g, cities: false }));
                                }
                            }
                        }
                    }
                } catch (err) {
                    // ignore
                } finally {
                    // always clear loading / auth check when effect finishes
                    try {
                        if (mounted) {
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

        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // On mount, proactively check serviceability for each loaded address (to show UI errors quickly)
        addresses.forEach((a) => {
            if (a.pincode && isValidIndianPincode(a.pincode)) {
                checkAndCacheServiceability(a.pincode);
                fetchAndCacheDeliveryCharge(a.pincode).catch(() => { });
            }
        });
        // only depends on addresses length/chg — still a safe prefetch
    }, [addresses.length]);

    async function openAdd() {
        // open modal immediately
        setShowModal(true);

        // ensure countries are prefetched non-blocking
        (async () => {
            try {
                if (!countries.length) {
                    setGeoLoading((g) => ({ ...g, countries: true }));
                    const list = await apiFetchCountries();
                    if (mountedRef.current) setCountries(list);
                }
            } catch {
                // ignore
            } finally {
                if (mountedRef.current) setGeoLoading((g) => ({ ...g, countries: false }));
            }
        })();
    }

    // Optimistic save handled by modal -> parent handler updates state & localStorage
    function handleAddressCreated(localAddr: Address) {
        setAddresses((prev) => {
            const next = [localAddr, ...prev];
            try {
                if (typeof window !== "undefined") {
                    localStorage.setItem("wcm_addresses", JSON.stringify(next));
                }
            } catch {
                // ignore
            }
            return next;
        });
        setSelectedAddressId(localAddr.id);
    }

    useEffect(() => {
        try {
            const cust = typeof window !== "undefined" ? localStorage.getItem(CUSTOMER_KEY) : null;
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
                }
            })().finally(() => {
                setCheckingAuth(false);
            });
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

    function placeOrder() {
        const cust = typeof window !== "undefined" ? localStorage.getItem(CUSTOMER_KEY) : null;
        if (!cust) {
            router.replace("/login");
            return;
        }
        if (!selectedAddressId) {
            return alert("Please select or add a delivery address");
        }

        const addr = addresses.find((a) => a.id === selectedAddressId);
        if (!addr) return alert("Selected address not found");

        const svc = serviceMap[addr.pincode];
        if (svc?.checking) return alert("Checking pincode serviceability — please wait a moment");
        if (svc && svc.prepaid === false) return alert("Selected address is not serviceable for prepaid orders. Choose another address.");

        // final double-check if we have no cached data
        if (!svc || svc.prepaid === null) {
            (async () => {
                try {
                    const res = await fetchPincodeServiceability(addr.pincode);
                    if (!res.ok || !res.prepaid) {
                        setServiceMap((m) => ({ ...m, [addr.pincode]: { checking: false, prepaid: !!res.prepaid } }));
                        return alert("Selected address is not serviceable for prepaid orders.");
                    }
                    setServiceMap((m) => ({ ...m, [addr.pincode]: { checking: false, prepaid: true } }));
                    // proceed to create the order
                    await createOrderAndRedirect(cust, addr);
                } catch (err) {
                    alert("Unable to verify pincode serviceability. Please try again.");
                }
            })();
            return;
        }

        // If we have serviceable flag, proceed to create order
        (async () => {
            await createOrderAndRedirect(cust, addr);
        })();
    }

    // NEW: create order API call and redirect logic
    async function createOrderAndRedirect(customerId: string, addr: Address) {
        if (creating) return;
        setCreating(true);

        try {
            // Build request body: using serverId when available (prefer serverId) else pass whatever id you have
            const deliveryAddressId = addr.serverId ?? String(addr.id);
            const billingAddressId = addr.serverId ?? String(addr.id);

            // IMPORTANT: use /v1 prefix so endpoint becomes /v1/sell_order/create
            const url = buildUrl("/sell_order/create");
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            const token = getAuthToken();
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const body = {
                customerId: String(customerId),
                deliveryAddressId: String(deliveryAddressId),
                billingAddressId: String(billingAddressId),
            };

            console.debug("[createOrder] POST", url, body);
            const res = await fetch(url, {
                method: "POST",
                headers,
                body: JSON.stringify(body),
            });

            // handle unauthorized
            if (res.status === 401) {
                handleUnauthorized();
                return;
            }

            const json = (await safeJson(res)) || {};
            console.debug("[createOrder] response", res.status, json);

            // Expecting { ack: "success", message: "order created successfully", orderId: 1003 }
            if (res.ok && (json?.ack === "success" || json?.ack === "SUCCESS" || json?.orderId)) {
                const orderId = json.orderId ?? json?.data?.orderId ?? null;
                // build total to send to success page (best-effort)
                const subtotalLocal = subtotal;
                const totalLocal = subtotalLocal + (Number(currentDeliveryCharge) || 0);

                // redirect to success page, include order id
                if (orderId) {
                    router.replace(`/order-success?orderId=${encodeURIComponent(String(orderId))}`);
                } else {
                    router.replace(`/order-success?total=${encodeURIComponent(String(totalLocal))}`);
                }
            } else {
                // server returned non-2xx or ack not success
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
            if (mountedRef.current) setCreating(false);
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

    // Determine current delivery charge based on selected address/pincode
    const currentDeliveryCharge = useMemo(() => {
        if (!selectedAddressId) return DEFAULT_DELIVERY_CHARGE;
        const addr = addresses.find((a) => a.id === selectedAddressId);
        if (!addr) return DEFAULT_DELIVERY_CHARGE;

        // If we have a cached delivery charge for this pincode, use it
        const entry = deliveryMap[addr.pincode];
        if (entry && typeof entry.value === "number") return entry.value;

        // If checking or not yet fetched, show fallback
        return DEFAULT_DELIVERY_CHARGE;
    }, [selectedAddressId, addresses, deliveryMap]);

    const total = subtotal + currentDeliveryCharge;

    const filteredCountries = countries.filter((c) => c.countryName.toLowerCase().includes(countrySearch.trim().toLowerCase()));
    const filteredStates = states.filter((s) => s.stateName.toLowerCase().includes(stateSearch.trim().toLowerCase()));
    const filteredCities = (cities ?? []).filter((c) => c.cityName.toLowerCase().includes(citySearch.trim().toLowerCase()));

    // SAFER effect: only depend on selectedAddressId and addresses (not on serviceMap)
    useEffect(() => {
        if (!selectedAddressId) return;

        const current = addresses.find((a) => a.id === selectedAddressId);
        if (!current) {
            // only set if it actually changes
            const fallback = addresses.length ? addresses[0].id : null;
            if (fallback !== selectedAddressId) setSelectedAddressId(fallback);
            return;
        }

        // If the address is explicitly known to be NOT prepaid-serviceable, attempt to pick another
        const svc = serviceMap[current.pincode];
        if (svc && svc.prepaid === false) {
            const firstGood = addresses.find((a) => {
                const s = serviceMap[a.pincode];
                return !(s && s.prepaid === false); // allow unknown or prepaid === true
            }) ?? null;
            if (firstGood && firstGood.id !== selectedAddressId) {
                setSelectedAddressId(firstGood.id);
            } else if (!firstGood && selectedAddressId !== null) {
                setSelectedAddressId(null);
            }
            return;
        }

        // trigger service check and delivery charge fetch for the selected pincode (if needed)
        if (current.pincode && isValidIndianPincode(current.pincode)) {
            checkAndCacheServiceability(current.pincode);
            fetchAndCacheDeliveryCharge(current.pincode).catch(() => { });
        }
    }, [selectedAddressId, addresses]); // intentionally NOT including serviceMap to avoid loops

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
        <div className="min-h-screen from-[#f8fbfb] to-white p-4 md:p-8 font-sans pb-28 md:pb-10">
            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#065975]">Checkout</h1>
                        <p className="text-sm text-slate-500 mt-1">Simple, safe and delightful checkout experience</p>
                    </div>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
                    {/* Left panel */}
                    <section className="bg-white rounded-2xl shadow p-4 md:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-semibold">Delivery address</h2>
                                <p className="text-sm text-slate-500">Select where you'd like us to deliver</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={openAdd} className="inline-flex items-center gap-2 bg-[#065975] text-white text-sm px-3 py-2 rounded-lg shadow-sm hover:brightness-95">
                                    <Plus className="w-4 h-4" /> Add Address
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
                                const isDisabled = prepaid === false; // <-- disable when known not serviceable

                                return (
                                    <label
                                        key={String(a.id)}
                                        htmlFor={`addr-${String(a.id)}`}
                                        onClick={(e) => {
                                            if (isDisabled) {
                                                e.preventDefault();
                                                const el = document.getElementById(`addr-${String(a.id)}`) as HTMLInputElement | null;
                                                el?.blur();
                                                return;
                                            }
                                        }}
                                        className={`flex flex-col gap-2 p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer ${selectedAddressId === a.id ? "border-[#065975] bg-[#f6fbfb]" : "border-slate-100"
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[#065975] text-white grid place-items-center font-medium">
                                                    {a.recipientName
                                                        .split(" ")
                                                        .map((s) => (s && s[0] ? s[0] : ""))
                                                        .slice(0, 2)
                                                        .join("")}
                                                </div>
                                                <div>
                                                    <div className="font-semibold">{a.recipientName}</div>
                                                    <div className="text-sm text-slate-500">{a.recipientContact}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <input
                                                    id={`addr-${String(a.id)}`}
                                                    type="radio"
                                                    name="selectedAddr"
                                                    checked={selectedAddressId === a.id}
                                                    onChange={() => {
                                                        if (isDisabled) return;
                                                        setSelectedAddressId(a.id);
                                                    }}
                                                    disabled={isDisabled || creating}
                                                    className="w-4 h-4 text-[#065975]"
                                                    aria-label={`Select address for ${a.recipientName}`}
                                                    aria-disabled={isDisabled}
                                                    title={isDisabled ? "This address is not serviceable for prepaid orders" : undefined}
                                                />
                                            </div>
                                        </div>

                                        <div className="text-sm text-slate-600 leading-snug">
                                            {a.addressLine1}
                                            {a.addressLine2 ? `, ${a.addressLine2}` : ""}
                                            {a.addressLine3 ? `, ${a.addressLine3}` : ""}
                                            {a.landmark ? `, ${a.landmark}` : ""}
                                            {a.cityName ? `, ${a.cityName}` : ""}
                                            {a.stateName ? `, ${a.stateName}` : ""}
                                            {a.countryName ? `, ${a.countryName}` : ""} — {a.pincode}
                                        </div>

                                        {/* serviceability UI */}
                                        <div className="text-xs mt-1">
                                            {isChecking ? (
                                                <div className="text-slate-500">Checking serviceability…</div>
                                            ) : showError ? (
                                                <div className="text-rose-600">This pincode is not serviceable for prepaid (online) orders.</div>
                                            ) : prepaid === true ? (
                                                <div className="text-green-600">Serviceable for prepaid orders.</div>
                                            ) : svc?.error ? (
                                                <div className="text-rose-600">Service check failed: {svc.error}</div>
                                            ) : (
                                                <div className="text-slate-400">Serviceability unknown</div>
                                            )}
                                        </div>
                                    </label>
                                );
                            })}
                        </div>

                        <hr className="my-6 border-slate-100" />

                        {/* --- CART SECTION: 4 items per row on md+ --- */}
                        <div>
                            <h3 className="text-lg font-semibold">Your cart</h3>
                            <p className="text-sm text-slate-500">Items you are about to purchase</p>

                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                {cart.map((it) => (
                                    <div
                                        key={it.id}
                                        className="flex flex-col p-2 rounded-xl border bg-white hover:shadow-md transition-all h-full"
                                    >
                                        {/* Image (fixed smaller height) */}
                                        <div className="relative w-full h-28 rounded-lg overflow-hidden mb-3 bg-gradient-to-br from-[#fff7f9] to-[#f3fcfb]">
                                            <Image src={safeImg(it.img)} alt={it.title} fill className="object-cover" />
                                        </div>

                                        {/* Details - stretch to keep uniform card height */}
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="font-semibold text-slate-800 line-clamp-2 leading-tight">
                                                    {it.title}
                                                </div>
                                                <div className="text-sm text-slate-400 mt-1">
                                                    {formatINR(it.price)} each
                                                </div>
                                            </div>

                                            {/* Qty + Total */}
                                            <div className="flex items-center justify-between mt-3">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-[#f6fbfb] text-sm font-medium">
                                                    <div className="text-slate-600">Qty</div>
                                                    <div className="px-2 py-0.5 rounded-full bg-white border text-sm font-semibold">
                                                        {it.qty}
                                                    </div>
                                                </div>

                                                <div className="text-base font-bold text-[#065975]">
                                                    {formatINR(it.price * it.qty)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {cart.length === 0 && (
                                    <div className="col-span-full text-center text-slate-500 py-6 border rounded-lg">Your cart is empty</div>
                                )}
                            </div>
                        </div>
                        {/* --- end cart --- */}
                    </section>

                    {/* Right panel / summary */}
                    <aside className="bg-white rounded-2xl shadow p-5 md:p-6 lg:sticky lg:top-6">
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

                            {/* Single Delivery line below subtotal */}
                            <div className="flex justify-between">
                                <div>Delivery</div>
                                <div>
                                    {formatINR(currentDeliveryCharge)}
                                </div>
                            </div>

                            <div className="border-t pt-3 mt-3 flex justify-between items-center">
                                <div className="text-lg font-extrabold">Total</div>
                                <div className="text-lg font-extrabold">{formatINR(total)}</div>
                            </div>
                        </div>

                        <div className="mt-5">
                            <h3 className="text-md font-medium">Payment</h3>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <label className="flex items-center gap-2 p-3 rounded-lg border hover:shadow-sm cursor-pointer">
                                    <input type="radio" name="pay" defaultChecked className="w-4 h-4 text-[#065975]" />
                                    <CreditCard className="w-4 h-4 text-slate-400" />
                                    <div className="text-sm">Card</div>
                                </label>
                                <label className="flex items-center gap-2 p-3 rounded-lg border hover:shadow-sm cursor-pointer">
                                    <input type="radio" name="pay" className="w-4 h-4 text-[#065975]" />
                                    <Wallet className="w-4 h-4 text-slate-400" />
                                    <div className="text-sm">UPI / Wallet</div>
                                </label>
                            </div>
                        </div>

                        <div className="mt-6 hidden md:flex gap-3">
                            <button
                                onClick={placeOrder}
                                className={`flex-1 py-3 rounded-xl font-semibold shadow ${creating ? "opacity-60 cursor-not-allowed" : "bg-gradient-to-r from-[#065975] to-[#0ea5a0] text-white hover:brightness-95"}`}
                                disabled={creating}
                            >
                                {creating ? "Placing order…" : `Place order • ${formatINR(total)}`}
                            </button>
                        </div>

                        <p className="text-xs text-slate-400 mt-3">
                            By placing order you agree to our <span className="text-[#065975]">Terms &amp; Conditions</span>.
                        </p>
                    </aside>
                </main>

                {/* MOBILE FIXED BOTTOM BAR (visible on small screens only) */}
                <div className="fixed left-0 right-0 bottom-0 z-40 md:hidden bg-white border-t px-4 py-3 shadow-lg">
                    <div className="max-w-6xl mx-auto flex items-center gap-3">
                        <div className="flex-1">
                            <div className="text-sm text-slate-500">Total</div>
                            <div className="text-lg font-extrabold">{formatINR(total)}</div>
                        </div>
                        <button
                            onClick={placeOrder}
                            className={`ml-2 inline-flex items-center gap-2 px-4 py-3 rounded-lg font-semibold shadow ${creating ? "opacity-60 cursor-not-allowed bg-gray-200 text-slate-500" : "bg-[#065975] text-white"}`}
                            disabled={creating}
                        >
                            {creating ? "Placing…" : `Place order • ${formatINR(total)}`}
                        </button>
                    </div>
                </div>

                {/* modal for add address (extracted component) */}
                <AddressModal show={showModal} onClose={() => setShowModal(false)} onCreated={handleAddressCreated} />
            </div>
        </div>
    );
}