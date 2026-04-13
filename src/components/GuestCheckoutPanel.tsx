"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

// adjust this import to match where you placed AddressModal
import type { Address } from "./AddressModal";

const TOKEN_KEY = "accessToken";

const STORAGE_KEYS = {
    guest: "wcm_checkout_guest_v1",
    delivery: "wcm_checkout_delivery_v1",
    billing: "wcm_checkout_billing_v1",
    billingSame: "wcm_checkout_billing_same_v1",
};

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

    const deliveryFetchIdRef = useRef(0);
    const placeOrderLockRef = useRef(false);
    const deliveryTimeoutRef = useRef<any>(null);
    const orderPlacedRef = useRef(false);

    const addressIdRef = useRef(`local_${Date.now()}`);
    const deliveryPincodeTimeoutRef = useRef<any>(null);
    const billingPincodeTimeoutRef = useRef<any>(null);

    const [checkingAuth, setCheckingAuth] = useState(true);

    const [addresses, setAddresses] = useState<Address[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartLoaded, setCartLoaded] = useState<boolean>(false);
    const [selectedAddressId, setSelectedAddressId] = useState<string | number | null>(null);
    const [showForm, setShowForm] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [creating, setCreating] = useState(false);
    const [paymentInProgress, setPaymentInProgress] = useState(false);

    const [form, setForm] = useState<Address>({
        id: addressIdRef.current,
        serverId: null,
        recipientName: "",
        recipientContact: "",
        addressLine1: "",
        addressLine2: "",
        addressLine3: "",
        landmark: "",
        state: "",
        district: "",
        city: "",
        country: "India",
        pincode: "",
        isDefault: false,
    });

    const [guestInfo, setGuestInfo] = useState({
        name: "",
        email: "",
        mobile: "",
    });

    const [billingSame, setBillingSame] = useState(true);

    const [billingForm, setBillingForm] = useState<Address>({
        id: `billing_${Date.now()}`,
        serverId: null,
        recipientName: "",
        recipientContact: "",
        addressLine1: "",
        addressLine2: "",
        addressLine3: "",
        landmark: "",
        state: "",
        district: "",
        city: "",
        country: "India",
        pincode: "",
        isDefault: false,
    });

    const [loadingAddresses, setLoadingAddresses] = useState(false);

    type ServiceEntry = { checking: boolean; prepaid: boolean | null; error?: string };
    const [serviceMap, setServiceMap] = useState<Record<string, ServiceEntry>>({});

    type DeliveryEntry = { checking: boolean; value: number | null; error?: string };
    const [deliveryMap, setDeliveryMap] = useState<Record<string, DeliveryEntry>>({});
    const [backendTotal, setBackendTotal] = useState<number | null>(null);

    const mountedRef = useRef(true);
    const hydratedRef = useRef(false);

    useEffect(() => {
        if (!hydratedRef.current) return;

        if (billingSame && form) {
            setBillingForm((prev) => ({
                ...form,
                id: prev.id,
            }));
        }
    }, [billingSame, form]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        return () => {
            if (deliveryTimeoutRef.current) clearTimeout(deliveryTimeoutRef.current);
            if (deliveryPincodeTimeoutRef.current) clearTimeout(deliveryPincodeTimeoutRef.current);
            if (billingPincodeTimeoutRef.current) clearTimeout(billingPincodeTimeoutRef.current);
        };
    }, []);

    // --- Validations ---
    function validateForm() {
        const newErrors: Record<string, string> = {};

        // Contact
        if (!guestInfo.name.trim()) {
            newErrors.name = "Please enter your full name";
        }

        if (guestInfo.email && !/^\S+@\S+\.\S+$/.test(guestInfo.email)) {
            newErrors.email = "Enter a valid email address";
        }

        if (!guestInfo.mobile.trim()) {
            newErrors.mobile = "Mobile number is required";
        } else if (!/^[6-9]\d{9}$/.test(guestInfo.mobile)) {
            newErrors.mobile = "Enter a valid 10-digit mobile number";
        }

        // Address
        if (!form.addressLine1.trim()) {
            newErrors.addressLine1 = "Address Line 1 is required";
        }

        if (!form.pincode) {
            newErrors.pincode = "Pincode is required";
        } else if (!isValidIndianPincode(form.pincode)) {
            newErrors.pincode = "Enter valid 6-digit pincode";
        }

        if (!form.city) {
            newErrors.city = "City not detected. Enter valid pincode";
        }

        if (!form.state) {
            newErrors.state = "State not detected. Enter valid pincode";
        }

        if (!form.district) {
            newErrors.district = "District not detected";
        }

        // Billing
        if (!billingSame) {
            if (!billingForm.addressLine1.trim()) {
                newErrors.billing_addressLine1 = "Billing address required";
            }

            if (!billingForm.pincode || !isValidIndianPincode(billingForm.pincode)) {
                newErrors.billing_pincode = "Enter valid billing pincode";
            }
        }

        setErrors(newErrors);

        return newErrors;
    }

    function scrollToError(errors: Record<string, string>) {
        const firstKey = Object.keys(errors)[0];
        if (!firstKey) return;

        const el = document.querySelector(`[data-error="${firstKey}"]`);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });

            const input = el.querySelector("input");
            if (input) (input as HTMLInputElement).focus();
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

        // IMPORTANT: STOP if already fetched OR in progress
        if (prev && (prev.checking || prev.prepaid !== null || prev.error)) {
            return;
        }

        setServiceMap((m) => ({
            ...m,
            [key]: { checking: true, prepaid: null }
        }));

        try {
            const result = await fetchPincodeServiceability(key);

            if (!mountedRef.current) return;

            if (result.ok) {
                setServiceMap((m) => ({
                    ...m,
                    [key]: { checking: false, prepaid: !!result.prepaid }
                }));
            } else {
                setServiceMap((m) => ({
                    ...m,
                    [key]: {
                        checking: false,
                        prepaid: null,
                        error: result.message || "Service check failed"
                    }
                }));
            }
        } catch (err: any) {
            if (!mountedRef.current) return;

            setServiceMap((m) => ({
                ...m,
                [key]: {
                    checking: false,
                    prepaid: null,
                    error: err?.message ?? String(err)
                }
            }));
        }
    }

    async function apiFetchDeliveryCharge(
        pincode: string,
        items: { productId: string; quantity: number }[]
    ): Promise<{ ok: boolean; charge?: number; message?: string }> {
        try {
            const url = buildUrl(
                `/logistic_partner/get_delivery_charge_for_guest/${encodeURIComponent(pincode)}`
            );

            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ items }),
            });

            if (!res.ok) {
                const payload = await safeJson(res);
                return {
                    ok: false,
                    message: payload?.message || payload?.error || `HTTP ${res.status}`,
                };
            }

            const json = (await safeJson(res)) || {};

            let charge = json?.data?.totalCharge;

            if (typeof charge !== "number" && Array.isArray(json?.data?.boxes)) {
                charge = json.data.boxes.reduce((sum: number, box: any) => {
                    return sum + (box.charge || 0);
                }, 0);
            }

            if (typeof charge === "number") {
                return { ok: true, charge };
            }

            return { ok: false, message: "Delivery charge not found" };
        } catch (err: any) {
            return { ok: false, message: err?.message ?? String(err) };
        }
    }

    async function fetchAndCacheDeliveryCharge(pincode: string) {
        const fetchId = ++deliveryFetchIdRef.current;

        const key = String(pincode || "").trim();
        if (!key || !isValidIndianPincode(key)) return;

        const prev = deliveryMap[key];
        if (prev && prev.checking) return;

        setDeliveryMap((d) => ({
            ...d,
            [key]: { checking: true, value: null },
        }));

        try {
            const items = cart.map((it) => ({
                productId: it.id,
                quantity: it.qty,
            }));

            const res = await apiFetchDeliveryCharge(key, items);

            // ❗ ignore stale response
            if (fetchId !== deliveryFetchIdRef.current) return;

            if (!mountedRef.current) return;

            if (res.ok) {
                setDeliveryMap((d) => ({
                    ...d,
                    [key]: { checking: false, value: res.charge ?? null },
                }));
            } else {
                setDeliveryMap((d) => ({
                    ...d,
                    [key]: {
                        checking: false,
                        value: null,
                        error: res.message || "Failed to fetch",
                    },
                }));
            }
        } catch (err: any) {
            if (fetchId !== deliveryFetchIdRef.current) return;

            if (!mountedRef.current) return;
            setDeliveryMap((d) => ({
                ...d,
                [key]: {
                    checking: false,
                    value: null,
                    error: err?.message ?? String(err),
                },
            }));
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
                    const verifyUrl = buildUrl("/sell_order/verify_payment_for_guest");

                    const payload = {
                        razorpayOrderId: response.razorpay_order_id,
                        razorpayPaymentId: response.razorpay_payment_id,
                        razorpaySignature: response.razorpay_signature,
                    };

                    const headers: Record<string, string> = {
                        "Content-Type": "application/json"
                    };

                    const res = await fetch(verifyUrl, {
                        method: "POST",
                        headers,
                        body: JSON.stringify(payload)
                    });

                    const body = await safeJson(res);
                    console.log("VERIFY RESPONSE:", body);

                    if (res.ok && (body?.ack === "success" || body?.status === "success")) {
                        // Prefer explicit numeric orderNumber field, otherwise try numeric orderId.
                        const numericOrderNumber =
                            body?.orderNumber ?? (typeof body?.orderId === "number" || (/^\d+$/).test(String(body?.orderId)) ? body.orderId : null);

                        // Prefer _id / object id, then fallback to payload's orderId (if it was objectId)
                        const objectOrderId =
                            body?._id && looksLikeObjectId(body._id)
                                ? String(body._id)
                                : (body?.orderId && looksLikeObjectId(body.orderId)
                                    ? String(body.orderId)
                                    : (orderId && looksLikeObjectId(orderId)
                                        ? String(orderId)
                                        : null));

                        const qp: string[] = [];
                        if (numericOrderNumber !== null && numericOrderNumber !== undefined) qp.push(`orderNumber=${encodeURIComponent(String(numericOrderNumber))}`);
                        if (objectOrderId) qp.push(`orderId=${encodeURIComponent(String(objectOrderId))}`);

                        const guestToken = body?.guestToken || body?.token;

                        if (guestToken) {
                            orderPlacedRef.current = true;

                            // CLEAR EVERYTHING
                            localStorage.removeItem("wcm_guest_cart_v1");
                            localStorage.removeItem(STORAGE_KEYS.guest);
                            localStorage.removeItem(STORAGE_KEYS.delivery);
                            localStorage.removeItem(STORAGE_KEYS.billing);
                            localStorage.removeItem(STORAGE_KEYS.billingSame);

                            setCart([]);
                            window.dispatchEvent(new Event("cartChanged"));

                            const query = [
                                `token=${encodeURIComponent(guestToken)}`,
                                ...qp
                            ].join("&");

                            router.replace(`/guest-order-success?${query}`);
                        } else {
                            // fallback (rare case)
                            router.replace("/guest-order-failed?reason=Missing guest token");
                        }
                        return;
                    } else {
                        const reason = body?.message || body?.error || "Payment verification failed";
                        const serverOrderId = body?.orderId ?? orderId ?? "";
                        router.replace(
                            `/guest-order-failed?reason=${encodeURIComponent(String(reason))}${serverOrderId ? `&orderId=${encodeURIComponent(String(serverOrderId))}` : ""}`
                        );
                        return;
                    }

                    // non-ok HTTP
                    const finalReason = body?.message || body?.error || `Verification HTTP ${res.status}`;
                    const finalOrderId = body?.orderId ?? orderId ?? "";
                    console.warn("Payment verification failed:", res.status, body);
                    router.replace(
                        `/guest-order-failed?reason=${encodeURIComponent(String(finalReason))}${finalOrderId ? `&orderId=${encodeURIComponent(String(finalOrderId))}` : ""}`
                    );
                    return;
                } catch (err: any) {
                    console.error("Verify request threw:", err);
                    const reason = err?.message || "Verification request failed";
                    router.replace(`/guest-order-failed?reason=${encodeURIComponent(String(reason))}${orderId ? `&orderId=${encodeURIComponent(String(orderId))}` : ""}`);
                    return;
                }
            },
            modal: {
                ondismiss: () => {
                    setPaymentInProgress(false);
                    placeOrderLockRef.current = false;
                }
            },
            prefill: prefillCustomer,
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

    useEffect(() => {
        try {
            const guestRaw = localStorage.getItem(STORAGE_KEYS.guest);
            const deliveryRaw = localStorage.getItem(STORAGE_KEYS.delivery);
            const billingRaw = localStorage.getItem(STORAGE_KEYS.billing);
            const billingSameRaw = localStorage.getItem(STORAGE_KEYS.billingSame);

            if (guestRaw) setGuestInfo(JSON.parse(guestRaw));

            if (deliveryRaw) {
                const parsed = JSON.parse(deliveryRaw);
                if (parsed?.id) addressIdRef.current = parsed.id;
                setForm(parsed);
            }

            if (billingRaw) setBillingForm(JSON.parse(billingRaw));

            if (billingSameRaw !== null) {
                setBillingSame(JSON.parse(billingSameRaw));
            }

        } catch (err) {
            console.warn("Failed to restore checkout state", err);
        } finally {
            hydratedRef.current = true;
        }
    }, []);

    useEffect(() => {
        if (!hydratedRef.current) return;

        try {
            localStorage.setItem(STORAGE_KEYS.guest, JSON.stringify(guestInfo));
        } catch { }
    }, [guestInfo]);

    useEffect(() => {
        if (!hydratedRef.current) return;

        try {
            localStorage.setItem(STORAGE_KEYS.delivery, JSON.stringify(form));
        } catch { }
    }, [form]);

    useEffect(() => {
        if (!hydratedRef.current) return;

        try {
            localStorage.setItem(STORAGE_KEYS.billing, JSON.stringify(billingForm));
        } catch { }
    }, [billingForm]);

    useEffect(() => {
        if (!hydratedRef.current) return;

        try {
            localStorage.setItem(STORAGE_KEYS.billingSame, JSON.stringify(billingSame));
        } catch { }
    }, [billingSame]);

    // --- End Razorpay helpers ---
    useEffect(() => {
        async function loadGuestCart() {
            try {
                const raw = localStorage.getItem("wcm_guest_cart_v1");
                if (!raw) {
                    setCart([]);
                    setCartLoaded(true);
                    setCheckingAuth(false);
                    return;
                }

                let items: any[] = [];
                try {
                    items = JSON.parse(raw);
                } catch {
                    localStorage.removeItem("wcm_guest_cart_v1");
                    setCart([]);
                    setCartLoaded(true);
                    setCheckingAuth(false);
                    return;
                }

                if (!items.length) {
                    setCart([]);
                    setCartLoaded(true);
                    setCheckingAuth(false);
                    return;
                }

                // 👉 FETCH REAL PRODUCTS FROM API
                const ids = [...new Set(items.map(i => i.productId))].join(",");

                const res = await fetch(buildUrl(`/product/sell?ids=${ids}`));
                const json = await safeJson(res);

                if (!res.ok || !json) {
                    throw new Error("Failed to fetch products");
                }

                const products = Array.isArray(json?.productData) ? json.productData : [];

                const mapped = products.map((p: any) => {
                    const cartItem = items.find(i => String(i.productId) === String(p._id));

                    return {
                        id: p._id,
                        title: p.productName,
                        price: p.latestSalePrice?.discountedPrice ?? p.latestSalePrice?.actualPrice ?? 0,
                        qty: cartItem?.quantity ?? 1,
                        img: p.productImage,
                    };
                });

                if (mapped.length === 0) {
                    localStorage.removeItem("wcm_guest_cart_v1");
                    setCart([]);
                    router.replace("/cart");
                    return;
                }

                setCart(mapped);
                setCartLoaded(true);
                setCheckingAuth(false);

            } catch (err) {
                console.warn("Failed to load guest cart", err);
                setCart([]);
                setCartLoaded(true);
                setCheckingAuth(false);
            }
        }

        loadGuestCart();
    }, []);

    useEffect(() => {
        if (
            form.city &&
            form.state &&
            isValidIndianPincode(form.pincode)
        ) {
            setAddresses([form]);
            setSelectedAddressId(form.id);

            if (deliveryPincodeTimeoutRef.current) {
                clearTimeout(deliveryPincodeTimeoutRef.current);
            }

            deliveryPincodeTimeoutRef.current = setTimeout(() => {
                checkAndCacheServiceability(form.pincode);
            }, 400);
        } else {
            setAddresses([]);
            setSelectedAddressId(null);
        }
    }, [form.pincode, form.city, form.state]);

    useEffect(() => {
        if (!cartLoaded) return;
        if (cart.length === 0) return;

        if (
            form.city &&
            form.state &&
            isValidIndianPincode(form.pincode)
        ) {
            const key = form.pincode;

            const prev = deliveryMap[key];

            // avoid duplicate calls
            if (prev?.checking) return;

            if (deliveryTimeoutRef.current) {
                clearTimeout(deliveryTimeoutRef.current);
            }

            deliveryTimeoutRef.current = setTimeout(() => {
                fetchAndCacheDeliveryCharge(key);
            }, 300);
        }
    }, [
        form.pincode,
        form.city,
        form.state,
        form.addressLine1,
        cart,
        cartLoaded
    ]);

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
        if (!Array.isArray(cart)) return;

        if (!orderPlacedRef.current && cartLoaded && cart.length === 0) {
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
        if (placeOrderLockRef.current || paymentInProgress) return;

        placeOrderLockRef.current = true;
        setPaymentInProgress(true);

        const unlock = () => {
            placeOrderLockRef.current = false;
            setPaymentInProgress(false);
        };

        if (currentDeliveryCharge === null) {
            alert("Delivery charge not calculated yet. Please wait.");
            unlock();
            return;
        }

        if (!hasAddress) {
            alert("Please fill delivery address");
            unlock();
            return;
        }

        if (!selectedAddressId) {
            unlock();
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        // (use form)
        if (!form.pincode || !isValidIndianPincode(form.pincode)) {
            unlock();
            alert("Invalid delivery pincode");
            return;
        }

        const svc = serviceMap[form.pincode];

        if (svc?.checking) {
            unlock();
            alert("Checking pincode serviceability — please wait");
            return;
        }

        if (svc && svc.prepaid === false) {
            unlock();
            alert("Selected address is not serviceable for prepaid orders.");
            return;
        }

        const validationErrors = validateForm();

        if (Object.keys(validationErrors).length > 0) {
            scrollToError(validationErrors);
            unlock();
            return;
        }

        if (!billingSame) {
            if (
                !billingForm.addressLine1 ||
                !billingForm.city ||
                !billingForm.state ||
                !billingForm.district ||
                !isValidIndianPincode(billingForm.pincode)
            ) {
                alert("Please fill valid billing details");
                unlock();
                return;
            }
        }

        (async () => {
            try {
                await createGuestOrder(form);
            } catch {
                unlock();
            }
        })();
    }

    async function createGuestOrder(addr: Address) {
        if (creating) return;
        setCreating(true);

        try {
            const url = buildUrl("/sell_order/guest_order");

            const body = {
                name: guestInfo.name,
                email: guestInfo.email,
                mobile: guestInfo.mobile,

                // DELIVERY
                recipientName: guestInfo.name,
                recipientContact: guestInfo.mobile,
                addressLine1: addr.addressLine1,
                addressLine2: addr.addressLine2,
                addressLine3: addr.addressLine3,
                landmark: addr.landmark,
                state: addr.state,
                district: addr.district,
                city: addr.city,
                pincode: addr.pincode,

                // BILLING
                billingSame,
                billingAddress: billingSame
                    ? null
                    : {
                        recipientName: guestInfo.name,
                        recipientContact: guestInfo.mobile,
                        addressLine1: billingForm.addressLine1,
                        addressLine2: billingForm.addressLine2,
                        addressLine3: billingForm.addressLine3,
                        landmark: billingForm.landmark,
                        state: billingForm.state,
                        district: billingForm.district,
                        city: billingForm.city,
                        pincode: billingForm.pincode,
                    },

                cartItems: cart.map((it) => ({
                    productId: it.id,
                    quantity: it.qty,
                })),
            };

            console.debug("[guestOrder] POST", body);

            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const json = await safeJson(res);

            if (res.ok && (json?.ack === "success" || json?.orderId)) {
                const razorpayOrder = json.razorpayOrder ?? null;
                const key = json.key ?? null;

                if (razorpayOrder && key) {

                    // USE BACKEND TOTAL (NOT LOCAL)
                    const finalAmount = json.finalPayableAmount;

                    // IMPORTANT: SAVE IT
                    setBackendTotal(finalAmount);

                    console.log("BACKEND TOTAL:", finalAmount);

                    await openRazorpayCheckout({
                        key,
                        razorpayOrder,
                        orderId: json._id ?? null,
                    });

                    return;
                }

                localStorage.removeItem("wcm_guest_cart_v1");
                localStorage.removeItem(STORAGE_KEYS.guest);
                localStorage.removeItem(STORAGE_KEYS.delivery);
                localStorage.removeItem(STORAGE_KEYS.billing);
                localStorage.removeItem(STORAGE_KEYS.billingSame);

                // IMPORTANT
                setCart([]);
                window.dispatchEvent(new Event("cartChanged"));

                router.replace(`/guest-order-success`);
            } else {
                const msg = json?.message || json?.error || "Guest order failed";
                router.replace(`/guest-order-failed?reason=${encodeURIComponent(msg)}`);
            }
        } catch (err: any) {
            router.replace(`/guest-order-failed?reason=${encodeURIComponent(err?.message || "Network error")}`);
        } finally {
            setCreating(false);
            placeOrderLockRef.current = false;
            setPaymentInProgress(false);
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
    const hasAddress = addresses.length > 0;

    const selectedAddress = useMemo(
        () => addresses.find(a => a.id === selectedAddressId) || null,
        [addresses, selectedAddressId]
    );

    const selectedPincode = selectedAddress?.pincode ?? null;

    const currentDeliveryCharge = useMemo(() => {
        if (!selectedPincode) return null;

        const entry = deliveryMap[selectedPincode];

        if (!entry) return null;
        if (entry.checking) return null;
        if (typeof entry.value === "number") return entry.value;

        return null;
    }, [selectedPincode, deliveryMap]);

    const total = backendTotal ?? (subtotal + (Number(currentDeliveryCharge) || 0));

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
        }
    }, [selectedAddressId, addresses, deliveryMap, serviceMap]);

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

    async function handlePincodeChange(pin: string) {
        setForm((prev) => ({
            ...prev,
            pincode: pin,
            city: "",
            state: "",
            district: "",
        }));

        if (!isValidIndianPincode(pin)) return;

        if (deliveryPincodeTimeoutRef.current) {
            clearTimeout(deliveryPincodeTimeoutRef.current);
        }

        deliveryPincodeTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
                const data = await res.json();

                if (data?.[0]?.Status === "Success") {
                    const postOffice = data[0].PostOffice?.[0];

                    setForm((prev) => ({
                        ...prev,
                        city: postOffice?.District || "",
                        state: postOffice?.State || "",
                        district: postOffice?.District || "",
                    }));
                }
            } catch (err) {
                console.warn("Pincode lookup failed", err);
            }
        }, 400);
    }

    async function handleBillingPincodeChange(pin: string) {
        setBillingForm((prev) => ({
            ...prev,
            pincode: pin,
            city: "",
            state: "",
            district: "",
        }));

        if (!isValidIndianPincode(pin)) return;

        if (billingPincodeTimeoutRef.current) {
            clearTimeout(billingPincodeTimeoutRef.current);
        }

        billingPincodeTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
                const data = await res.json();

                if (data?.[0]?.Status === "Success") {
                    const postOffice = data[0].PostOffice?.[0];

                    setBillingForm((prev) => ({
                        ...prev,
                        city: postOffice?.District || "",
                        state: postOffice?.State || "",
                        district: postOffice?.District || "",
                    }));
                }
            } catch (err) {
                console.warn("Billing pincode lookup failed", err);
            }
        }, 400);
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
                        <div className="mb-6 space-y-6">
                            <div className="space-y-4">
                                <h2 className="text-lg font-semibold">Contact details</h2>

                                <div data-error="name">
                                    <input
                                        placeholder="Full Name"
                                        value={guestInfo.name}
                                        onChange={(e) => {
                                            setGuestInfo({ ...guestInfo, name: e.target.value });
                                            setErrors(prev => ({ ...prev, name: "" }));
                                        }}
                                        className={`w-full border rounded-lg px-3 py-2 ${errors.name ? "border-red-500" : ""}`}
                                    />
                                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                                </div>

                                <div data-error="email">
                                    <input
                                        placeholder="Email (optional)"
                                        value={guestInfo.email}
                                        onChange={(e) => {
                                            setGuestInfo({ ...guestInfo, email: e.target.value });
                                            setErrors(prev => ({ ...prev, email: "" }));
                                        }}
                                        className={`w-full border rounded-lg px-3 py-2 ${errors.email ? "border-red-500" : ""}`}
                                    />
                                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                                </div>

                                <div data-error="mobile">
                                    <input
                                        placeholder="Mobile"
                                        value={guestInfo.mobile}
                                        onChange={(e) => {
                                            setGuestInfo({ ...guestInfo, mobile: e.target.value });
                                            setErrors(prev => ({ ...prev, mobile: "" }));
                                        }}
                                        className={`w-full border rounded-lg px-3 py-2 ${errors.mobile ? "border-red-500" : ""}`}
                                    />
                                    {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile}</p>}
                                </div>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">Delivery address</h2>
                                <p className="text-sm text-slate-500">Select where you'd like us to deliver</p>
                                <p className="text-xs text-slate-500">
                                    Fields marked with <span className="text-red-500">*</span> are required
                                </p>
                            </div>

                            {showForm && (
                                <div className="border rounded-xl p-4 bg-slate-50 space-y-3 mt-4">

                                    {/* Address Line 1 */}
                                    <div>
                                        <label className="text-sm font-medium">
                                            Address Line 1 <span className="text-red-500">*</span>
                                        </label>
                                        <div data-error="addressLine1">
                                            <input
                                                placeholder="House / Flat / Building"
                                                value={form.addressLine1}
                                                onChange={(e) => {
                                                    setForm({ ...form, addressLine1: e.target.value });
                                                    setErrors(prev => ({ ...prev, addressLine1: "" }));
                                                }}
                                                className={`w-full border p-2 rounded mt-1 ${errors.addressLine1 ? "border-red-500" : ""}`}
                                            />
                                            {errors.addressLine1 && <p className="text-xs text-red-500 mt-1">{errors.addressLine1}</p>}
                                        </div>
                                    </div>

                                    {/* Address Line 2 */}
                                    <div>
                                        <label className="text-sm font-medium text-slate-600">
                                            Address Line 2 (optional)
                                        </label>
                                        <input
                                            placeholder="Street / Area"
                                            value={form.addressLine2 || ""}
                                            onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                                            className="w-full border p-2 rounded mt-1"
                                        />
                                    </div>

                                    {/* Address Line 3 */}
                                    <div>
                                        <label className="text-sm font-medium text-slate-600">
                                            Address Line 3 (optional)
                                        </label>
                                        <input
                                            placeholder="Apartment / Floor / Wing"
                                            value={form.addressLine3 || ""}
                                            onChange={(e) => setForm({ ...form, addressLine3: e.target.value })}
                                            className="w-full border p-2 rounded mt-1"
                                        />
                                    </div>

                                    {/* Landmark */}
                                    <div>
                                        <label className="text-sm font-medium text-slate-600">
                                            Landmark (optional)
                                        </label>
                                        <input
                                            placeholder="Nearby landmark"
                                            value={form.landmark || ""}
                                            onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                                            className="w-full border p-2 rounded mt-1"
                                        />
                                    </div>

                                    {/* Pincode */}
                                    <div>
                                        <label className="text-sm font-medium">
                                            Pincode <span className="text-red-500">*</span>
                                        </label>
                                        <div data-error="pincode">
                                            <input
                                                placeholder="6-digit pincode"
                                                value={form.pincode}
                                                onChange={(e) => {
                                                    handlePincodeChange(e.target.value.replace(/\D/g, "").slice(0, 6));
                                                    setErrors(prev => ({ ...prev, pincode: "" }));
                                                }}
                                                className={`w-full border p-2 rounded mt-1 ${errors.pincode ? "border-red-500" : ""}`}
                                            />
                                            {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode}</p>}
                                        </div>
                                    </div>

                                    {/* City */}
                                    <div>
                                        <label className="text-sm font-medium">
                                            City <span className="text-red-500">*</span>
                                        </label>
                                        <div data-error="city">
                                            <input
                                                value={form.city || ""}
                                                readOnly
                                                className={`w-full border p-2 rounded mt-1 bg-gray-100 ${errors.city ? "border-red-500" : ""}`}
                                            />
                                            {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                                        </div>
                                    </div>

                                    {/* District */}
                                    <div>
                                        <label className="text-sm font-medium">
                                            District <span className="text-red-500">*</span>
                                        </label>
                                        <div data-error="district">
                                            <input
                                                value={form.district || ""}
                                                readOnly
                                                className={`w-full border p-2 rounded mt-1 bg-gray-100 ${errors.district ? "border-red-500" : ""}`}
                                            />
                                            {errors.district && <p className="text-xs text-red-500 mt-1">{errors.district}</p>}
                                        </div>
                                    </div>

                                    {/* State */}
                                    <div>
                                        <label className="text-sm font-medium">
                                            State <span className="text-red-500">*</span>
                                        </label>
                                        <div data-error="state">
                                            <input
                                                value={form.state || ""}
                                                readOnly
                                                className={`w-full border p-2 rounded mt-1 bg-gray-100 ${errors.state ? "border-red-500" : ""}`}
                                            />
                                            {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
                                        </div>
                                    </div>

                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
                            {loadingAddresses && addresses.length === 0 && (
                                <div className="col-span-full text-center text-slate-500 p-6 border rounded-lg">
                                    Loading addresses…
                                </div>
                            )}
                        </div>

                        <div className="mt-6 space-y-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={billingSame}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setBillingSame(checked);

                                        // when user UNCHECKS → copy delivery into billing
                                        if (!checked && addresses.length > 0) {
                                            const addr = addresses[0];
                                            setBillingForm({
                                                ...addr,
                                                id: `billing_${Date.now()}`
                                            });
                                        }
                                    }}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm font-medium">
                                    Billing address same as delivery
                                </span>
                            </label>

                            {!billingSame && (
                                <div className="border rounded-xl p-4 bg-slate-50 space-y-3">

                                    <div>
                                        <label className="text-sm font-medium">
                                            Address Line 1 <span className="text-red-500">*</span>
                                        </label>
                                        <div data-error="billing_addressLine1">
                                            <input
                                                value={billingForm.addressLine1}
                                                onChange={(e) => {
                                                    setBillingForm({ ...billingForm, addressLine1: e.target.value });
                                                    setErrors(prev => ({ ...prev, billing_addressLine1: "" }));
                                                }}
                                                className={`w-full border p-2 rounded mt-1 ${errors.billing_addressLine1 ? "border-red-500" : ""}`}
                                            />
                                            {errors.billing_addressLine1 && <p className="text-xs text-red-500 mt-1">{errors.billing_addressLine1}</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-slate-600">
                                            Address Line 2 (optional)
                                        </label>
                                        <input
                                            value={billingForm.addressLine2 || ""}
                                            onChange={(e) => setBillingForm({ ...billingForm, addressLine2: e.target.value })}
                                            className="w-full border p-2 rounded mt-1"
                                        />
                                    </div>

                                    {/* Address Line 3 */}
                                    <div>
                                        <label className="text-sm font-medium text-slate-600">
                                            Address Line 3 (optional)
                                        </label>
                                        <input
                                            value={billingForm.addressLine3 || ""}
                                            onChange={(e) =>
                                                setBillingForm({ ...billingForm, addressLine3: e.target.value })
                                            }
                                            className="w-full border p-2 rounded mt-1"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-slate-600">
                                            Landmark (optional)
                                        </label>
                                        <input
                                            value={billingForm.landmark || ""}
                                            onChange={(e) => setBillingForm({ ...billingForm, landmark: e.target.value })}
                                            className="w-full border p-2 rounded mt-1"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium">
                                            Pincode <span className="text-red-500">*</span>
                                        </label>
                                        <div data-error="billing_pincode">
                                            <input
                                                value={billingForm.pincode}
                                                onChange={(e) => {
                                                    handleBillingPincodeChange(e.target.value.replace(/\D/g, "").slice(0, 6));
                                                    setErrors(prev => ({ ...prev, billing_pincode: "" }));
                                                }}
                                                className={`w-full border p-2 rounded mt-1 ${errors.billing_pincode ? "border-red-500" : ""}`}
                                            />
                                            {errors.billing_pincode && <p className="text-xs text-red-500 mt-1">{errors.billing_pincode}</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium">
                                            City <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            value={billingForm.city || ""}
                                            readOnly
                                            className="w-full border p-2 rounded mt-1 bg-gray-100"
                                        />
                                    </div>

                                    {/* District */}
                                    <div>
                                        <label className="text-sm font-medium">
                                            District <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            value={billingForm.district || ""}
                                            readOnly
                                            className="w-full border p-2 rounded mt-1 bg-gray-100"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium">
                                            State <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            value={billingForm.state || ""}
                                            readOnly
                                            className="w-full border p-2 rounded mt-1 bg-gray-100"
                                        />
                                    </div>

                                </div>
                            )}
                        </div>

                        <hr className="my-6 border-slate-100" />
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

                            <div className="flex justify-between items-center">
                                <div>Delivery</div>

                                {!hasAddress ? (
                                    <div className="text-xs text-amber-600 font-medium">
                                        Add address to calculate delivery
                                    </div>
                                ) : selectedPincode && deliveryMap[selectedPincode]?.checking ? (
                                    <div className="text-xs text-gray-400">Calculating...</div>
                                ) : selectedPincode && deliveryMap[selectedPincode]?.error ? (
                                    <div className="text-xs text-red-500">Delivery unavailable</div>
                                ) : currentDeliveryCharge === null ? (
                                    <div className="text-xs text-gray-400">—</div>
                                ) : (
                                    <div>{formatINR(currentDeliveryCharge)}</div>
                                )}
                            </div>

                            <div className="border-t pt-3 mt-3 flex justify-between items-center">
                                <div className="text-lg font-extrabold">Total</div>
                                {!hasAddress ? (
                                    <div className="text-xs text-amber-600">
                                        Add address to see final total
                                    </div>
                                ) : (
                                    <div className="text-xl font-extrabold text-[#065975]">
                                        {backendTotal !== null
                                            ? formatINR(backendTotal)
                                            : formatINR(total)}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Delivery preview */}
                        {form.city && form.state && form.pincode && (
                            <p className="text-xs text-slate-500 mb-2">
                                Delivering to {form.city}, {form.state} — {form.pincode}
                            </p>
                        )}

                        {/* Desktop place order button */}
                        <div className="mt-2 flex gap-3">
                            <button
                                onClick={placeOrder}
                                className={`flex-1 py-3 rounded-xl font-semibold shadow transition-transform duration-150 active:scale-[0.98] ${creating || !hasAddress ? "opacity-60 cursor-not-allowed bg-gray-200 text-gray-500" : "bg-linear-to-r from-[#065975] via-[#0c7c89] to-[#0ea5a0] text-white hover:brightness-95"}`}
                                disabled={creating || paymentInProgress}
                                aria-disabled={creating || paymentInProgress}
                            >
                                {creating ? "Placing order…" : `Place order • ${formatINR(backendTotal ?? total)}`}
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
                                            onClick={() => router.push("/products")}
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
                            <div className="text-lg font-extrabold">
                                {!hasAddress || currentDeliveryCharge === null
                                    ? formatINR(subtotal)
                                    : formatINR(backendTotal ?? total)}
                            </div>
                        </div>
                        <button
                            onClick={placeOrder}
                            className={`ml-2 inline-flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]
                                ${creating || paymentInProgress
                                    ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                                    : "bg-linear-to-r from-[#065975] via-[#0c7c89] to-[#0ea5a0] text-white shadow-lg hover:brightness-95"
                                }`}
                            disabled={creating || paymentInProgress}
                        >
                            {creating ? "Placing…" : `Place order • ${formatINR(backendTotal ?? total)}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}