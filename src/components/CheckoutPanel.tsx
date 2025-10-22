"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Select from "react-select";
import { Plus, X, CreditCard, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";

const DELIVERY_CHARGE = 70;
const CUSTOMER_KEY = "customerId";
const TOKEN_KEY = "accessToken";

export type Address = {
    id: number;
    serverId?: string | null;
    recipientName: string;
    recipientContact: string;
    addressLine1: string;
    addressLine2?: string;
    addressLine3?: string;
    landmark?: string;
    countryId?: string;
    stateId?: string;
    cityId?: string;
    countryName?: string;
    stateName?: string;
    cityName?: string;
    pincode: string;
    isDefault?: boolean;
};

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

export default function CheckoutPanel({ initialAddresses, initialCart }: Props) {
    const router = useRouter();
    const [checkingAuth, setCheckingAuth] = useState(true);

    const [addresses, setAddresses] = useState<Address[]>(initialAddresses || []);
    const [cart, setCart] = useState<CartItem[]>(initialCart || []);
    const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);

    const blankAddress: Address = {
        id: 0,
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
    const [form, setForm] = useState<Address>(blankAddress);

    const [loadingAddresses, setLoadingAddresses] = useState(false);

    const [countries, setCountries] = useState<Array<{ _id: string; countryName: string }>>([]);
    const [states, setStates] = useState<Array<{ _id: string; stateName: string; country?: { _id: string } }>>(
        []
    );
    const [cities, setCities] = useState<Array<{ _id: string; cityName: string; state?: { _id: string } }>>([]);

    const [geoLoading, setGeoLoading] = useState({ countries: false, states: false, cities: false });

    const [countrySearch, setCountrySearch] = useState("");
    const [stateSearch, setStateSearch] = useState("");
    const [citySearch, setCitySearch] = useState("");

    useEffect(() => {
        try {
            if (typeof window === "undefined") return;
            localStorage.setItem("wcm_addresses", JSON.stringify(addresses));
        } catch {
            // ignore
        }
    }, [addresses]);

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
                    if (mounted) {
                        setLoadingAddresses(false);
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

    function mapServerAddressToLocal(serverRec: any): Address {
        return {
            id: Date.now() + Math.floor(Math.random() * 1000),
            serverId: serverRec._id ? String(serverRec._id) : null,
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

    useEffect(() => {
        let mounted = true;
        try {
            const cust = typeof window !== "undefined" ? localStorage.getItem(CUSTOMER_KEY) : null;
            if (!cust) {
                router.replace("/login");
                return;
            }

            (async () => {
                try {
                    const serverCart = await apiGetCart(cust);
                    if (!mounted) return;
                    setCart(Array.isArray(serverCart) ? serverCart : []);
                } catch (err) {
                    console.warn("Could not load server cart, keeping current cart state", err);
                }
            })().finally(() => {
                if (mounted) setCheckingAuth(false);
            });
        } catch {
            router.replace("/login");
            return;
        }

        return () => {
            mounted = false;
        };
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

    function openAdd() {
        setForm({ ...blankAddress, id: Date.now() });

        (async () => {
            if (!countries.length) {
                try {
                    setGeoLoading((g) => ({ ...g, countries: true }));
                    const list = await apiFetchCountries();
                    setCountries(list);
                } finally {
                    setGeoLoading((g) => ({ ...g, countries: false }));
                }
            }
        })();

        setStates([]);
        setCities([]);
        setCountrySearch("");
        setStateSearch("");
        setCitySearch("");
        setShowModal(true);
    }

    async function saveAddress() {
        if (!form.recipientName?.trim() || !form.addressLine1?.trim() || !(form.cityId?.trim()) || !form.pincode?.trim()) {
            return alert("Please fill at least recipient name, address line 1, city (id) and pincode");
        }

        const id = Date.now();
        const newAddr: Address = { ...form, id };
        setAddresses((prev) => [newAddr, ...prev]);
        setSelectedAddressId(id);
        setShowModal(false);

        try {
            const cust = typeof window !== "undefined" ? localStorage.getItem(CUSTOMER_KEY) : null;
            if (!cust) {
                return;
            }
            await apiCreateAddress(cust, newAddr);
            const fresh = await apiFetchAddresses(cust);
            if (Array.isArray(fresh)) {
                const mapped = fresh.map((s) => mapServerAddressToLocal(s));
                setAddresses(mapped);
                if (mapped.length > 0) setSelectedAddressId(mapped[0].id);
            }
        } catch (err: any) {
            console.warn("Failed to save address to server", err);
            alert(err?.message ?? "Failed to save address to server. Saved locally.");
        }
    }

    async function onCountryChange(value: string) {
        setForm((f) => ({ ...f, countryId: value, stateId: "", cityId: "" }));
        setStateSearch("");
        setCitySearch("");
        setStates([]);
        setCities([]);
        if (!value) return;

        try {
            setGeoLoading((g) => ({ ...g, states: true }));
            const s = await apiFetchStates(value);
            setStates(s);
        } catch (err) {
            console.warn("Failed to load states", err);
            setStates([]);
        } finally {
            setGeoLoading((g) => ({ ...g, states: false }));
        }
    }

    async function onStateChange(value: string) {
        setForm((f) => ({ ...f, stateId: value, cityId: "" }));
        setCitySearch("");
        setCities([]);
        if (!value) return;

        try {
            setGeoLoading((g) => ({ ...g, cities: true }));
            const c = await apiFetchCities(value);
            setCities(c);
        } catch (err) {
            console.warn("Failed to load cities", err);
            setCities([]);
        } finally {
            setGeoLoading((g) => ({ ...g, cities: false }));
        }
    }

    function placeOrder() {
        const cust = typeof window !== "undefined" ? localStorage.getItem(CUSTOMER_KEY) : null;
        if (!cust) {
            router.replace("/login");
            return;
        }
        if (!selectedAddressId) {
            return alert("Please select or add a delivery address");
        }
        alert(`Order placed (demo)\nTotal: ₹${total}\nDeliver to address id: ${selectedAddressId}`);
    }

    function formatINR(n: number) {
        return `₹${n.toLocaleString("en-IN")}`;
    }

    function safeImg(src?: string) {
        const norm = normalizeImageUrl(src);
        return norm ?? "/images/placeholder.png";
    }

    const subtotal = useMemo(() => cart.reduce((s, it) => s + it.price * it.qty, 0), [cart]);
    const total = subtotal + DELIVERY_CHARGE;

    const filteredCountries = countries.filter((c) => c.countryName.toLowerCase().includes(countrySearch.trim().toLowerCase()));
    const filteredStates = states.filter((s) => s.stateName.toLowerCase().includes(stateSearch.trim().toLowerCase()));
    const filteredCities = (cities ?? []).filter((c) => c.cityName.toLowerCase().includes(citySearch.trim().toLowerCase()));

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

                            {addresses.map((a) => (
                                <label
                                    key={a.id}
                                    htmlFor={`addr-${a.id}`}
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
                                                id={`addr-${a.id}`}
                                                type="radio"
                                                name="selectedAddr"
                                                checked={selectedAddressId === a.id}
                                                onChange={() => setSelectedAddressId(a.id)}
                                                className="w-4 h-4 text-[#065975]"
                                                aria-label={`Select address for ${a.recipientName}`}
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
                                </label>
                            ))}
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
                            <div className="flex justify-between">
                                <div>Delivery</div>
                                <div>{formatINR(DELIVERY_CHARGE)}</div>
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
                            <button onClick={placeOrder} className="flex-1 bg-gradient-to-r from-[#065975] to-[#0ea5a0] text-white py-3 rounded-xl font-semibold shadow hover:brightness-95">
                                Place order • {formatINR(total)}
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
                        <button onClick={placeOrder} className="ml-2 inline-flex items-center gap-2 bg-[#065975] text-white px-4 py-3 rounded-lg font-semibold shadow">
                            Place order • {formatINR(total)}
                        </button>
                    </div>
                </div>

                {/* modal for add address only */}
                {showModal && (
                    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 py-6">
                        {/* modal panel: make it limited height and scrollable when content overflows */}
                        <div
                            className="bg-white rounded-2xl shadow w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                            role="dialog"
                            aria-modal="true"
                        >
                            {/* header */}
                            <div className="flex items-start justify-between px-5 py-4 border-b">
                                <div>
                                    <h3 className="text-lg font-semibold">Add address</h3>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-slate-400 p-2 rounded-md hover:bg-slate-50"
                                    aria-label="Close modal"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* body: scrollable area */}
                            <div className="p-5 overflow-auto" style={{ WebkitOverflowScrolling: "touch" }}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Recipient Name */}
                                    <div>
                                        <label className="block text-sm text-slate-600 mb-1">Recipient Name</label>
                                        <input
                                            value={form.recipientName}
                                            onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                                            placeholder="Enter recipient name"
                                            className="border p-3 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-[#065975]/30"
                                        />
                                    </div>

                                    {/* Recipient Contact */}
                                    <div>
                                        <label className="block text-sm text-slate-600 mb-1">Recipient Contact</label>
                                        <input
                                            value={form.recipientContact}
                                            onChange={(e) => setForm({ ...form, recipientContact: e.target.value })}
                                            placeholder="Enter recipient contact"
                                            className="border p-3 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-[#065975]/30"
                                        />
                                    </div>

                                    {/* Address Line 1 */}
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm text-slate-600 mb-1">Address Line 1</label>
                                        <input
                                            value={form.addressLine1}
                                            onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                                            placeholder="House, Building, Street"
                                            className="border p-3 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-[#065975]/30"
                                        />
                                    </div>

                                    {/* Address Line 2 */}
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm text-slate-600 mb-1">Address Line 2</label>
                                        <input
                                            value={form.addressLine2}
                                            onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                                            placeholder="Apartment, Floor, Area (optional)"
                                            className="border p-3 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-[#065975]/30"
                                        />
                                    </div>

                                    {/* Address Line 3 */}
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm text-slate-600 mb-1">Address Line 3</label>
                                        <input
                                            value={form.addressLine3}
                                            onChange={(e) => setForm({ ...form, addressLine3: e.target.value })}
                                            placeholder="Additional directions (optional)"
                                            className="border p-3 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-[#065975]/30"
                                        />
                                    </div>

                                    {/* Landmark */}
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm text-slate-600 mb-1">Landmark</label>
                                        <input
                                            value={form.landmark}
                                            onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                                            placeholder="Nearby place or landmark (optional)"
                                            className="border p-3 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-[#065975]/30"
                                        />
                                    </div>

                                    {/* Country */}
                                    <div>
                                        <label className="block text-sm text-slate-600 mb-1">Country</label>
                                        <Select
                                            isSearchable
                                            isLoading={geoLoading.countries}
                                            options={countries.map((c) => ({ value: c._id, label: c.countryName }))}
                                            value={
                                                form.countryId
                                                    ? {
                                                        value: form.countryId,
                                                        label: countries.find((c) => c._id === form.countryId)?.countryName || "Selected",
                                                    }
                                                    : null
                                            }
                                            onChange={(opt) => onCountryChange(opt?.value || "")}
                                            placeholder={geoLoading.countries ? "Loading countries..." : "Select country"}
                                            styles={{
                                                control: (base) => ({
                                                    ...base,
                                                    borderRadius: "8px",
                                                    borderColor: "#d1d5db",
                                                    boxShadow: "none",
                                                    minHeight: "44px",
                                                }),
                                            }}
                                        />
                                    </div>

                                    {/* State */}
                                    <div>
                                        <label className="block text-sm text-slate-600 mb-1">State</label>
                                        <Select
                                            isSearchable
                                            isDisabled={!form.countryId}
                                            isLoading={geoLoading.states}
                                            options={states.map((s) => ({ value: s._id, label: s.stateName }))}
                                            value={
                                                form.stateId
                                                    ? {
                                                        value: form.stateId,
                                                        label: states.find((s) => s._id === form.stateId)?.stateName || "Selected",
                                                    }
                                                    : null
                                            }
                                            onChange={(opt) => onStateChange(opt?.value || "")}
                                            placeholder={
                                                !form.countryId ? "Select country first" : geoLoading.states ? "Loading states..." : "Select state"
                                            }
                                            styles={{
                                                control: (base) => ({
                                                    ...base,
                                                    borderRadius: "8px",
                                                    borderColor: "#d1d5db",
                                                    boxShadow: "none",
                                                    minHeight: "44px",
                                                }),
                                            }}
                                        />
                                    </div>

                                    {/* City */}
                                    <div>
                                        <label className="block text-sm text-slate-600 mb-1">City</label>
                                        <Select
                                            isSearchable
                                            isDisabled={!form.stateId}
                                            isLoading={geoLoading.cities}
                                            options={(cities ?? []).map((c) => ({ value: c._id, label: c.cityName }))}
                                            value={
                                                form.cityId
                                                    ? {
                                                        value: form.cityId,
                                                        label: cities?.find((c) => c._id === form.cityId)?.cityName || "Selected",
                                                    }
                                                    : null
                                            }
                                            onChange={(opt) => setForm((f) => ({ ...f, cityId: opt?.value || "" }))}
                                            placeholder={!form.stateId ? "Select state first" : geoLoading.cities ? "Loading cities..." : "Select city"}
                                            styles={{
                                                control: (base) => ({
                                                    ...base,
                                                    borderRadius: "8px",
                                                    borderColor: "#d1d5db",
                                                    boxShadow: "none",
                                                    minHeight: "44px",
                                                }),
                                            }}
                                        />
                                    </div>

                                    {/* Pincode */}
                                    <div>
                                        <label className="block text-sm text-slate-600 mb-1">Pincode</label>
                                        <input
                                            value={form.pincode}
                                            onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                                            placeholder="Enter postal code"
                                            className="border p-3 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-[#065975]/30"
                                        />
                                    </div>

                                    {/* Default Address */}
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

                            {/* footer: fixed within modal so save is always visible */}
                            <div className="px-5 py-3 border-t flex justify-end gap-3">
                                <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-md border text-slate-600 hover:bg-slate-50">
                                    Cancel
                                </button>
                                <button onClick={saveAddress} className="px-4 py-2 rounded-md bg-[#065975] text-white hover:brightness-95">
                                    Save address
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}