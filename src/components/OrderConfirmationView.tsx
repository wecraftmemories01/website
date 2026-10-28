"use client";

import { useState } from "react";
import Link from "next/link";
import HamperMediaImage from "@/components/HamperMediaImage";
import {
    ArrowRight,
    Check,
    CheckCircle2,
    Copy,
    Gift,
    Heart,
    Mail,
    MapPin,
    Package,
    PackageCheck,
    Printer,
    ReceiptText,
    Share2,
    ShieldCheck,
    ShoppingBag,
    Sparkles,
    Truck,
} from "lucide-react";

export type ConfirmationProduct = {
    productId?: string;
    productNameSnapshot?: string;
    quantity?: number;
    sellPrice?: number;
    totalPrice?: number;
    productImage?: string | null;
};

export type ConfirmationHamper = {
    hamperId?: string;
    hamperNameSnapshot?: string;
    hamperImage?: string | null;
    quantity?: number;
    sellPrice?: number;
    totalPrice?: number;
    itemNotes?: string;
    giftMessages?: string[];
};

type AddressSnapshot = {
    recipientNameSnapshot?: string;
    recipientContactSnapshot?: string;
    addressLine1Snapshot?: string;
    addressLine2Snapshot?: string;
    addressLine3Snapshot?: string;
    landmarkSnapshot?: string;
    countrySnapshot?: string;
    stateSnapshot?: string;
    districtSnapshot?: string;
    citySnapshot?: string;
    pincodeSnapshot?: string;
    countryNameSnapshot?: string;
    stateNameSnapshot?: string;
    cityNameSnapshot?: string;
};

export type ConfirmationOrder = {
    _id?: string;
    orderId?: string;
    orderNumber?: string | number;
    purchaseDate?: string;
    orderTotal?: number;
    finalPayableAmount?: number;
    quotedDeliveryCharge?: number;
    effectiveSubtotalAfterCoupon?: number;
    couponAmount?: number;
    coupon?: {
        code?: string;
        name?: string;
        type?: "PERCENTAGE" | "FLAT" | "FREE_SHIPPING";
        value?: number;
        discountAmount?: number;
        isFreeShipping?: boolean;
    };
    customerDetails?: {
        customerNameSnapshot?: string;
        customerMobileSnapshot?: string;
        customerEmailSnapshot?: string;
    };
    orderCustomerAddressDetails?: {
        deliveryAddress?: AddressSnapshot;
        billingAddress?: AddressSnapshot;
    };
    orderProductsDetails?: ConfirmationProduct[];
    orderHampersDetails?: ConfirmationHamper[];
};

function money(value: number | null | undefined): string {
    const n = Number(value);
    return Number.isFinite(n)
        ? `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
        : "—";
}

function orderDate(value?: string): string {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
    }).format(date);
}

function ItemImage({ src, alt }: { src?: string | null; alt: string }) {
    return (
        <div className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-2xl border border-[#edf0e8] bg-[#f5f7f0] sm:h-20 sm:w-20">
            {/* Reuse the working storefront image renderer. Its URL resolution
                supports API upload URLs and Next's image proxy avoids browser
                cross-origin resource policy failures on localhost. */}
            <HamperMediaImage
                src={src}
                alt={alt}
                sizes="(max-width: 640px) 68px, 80px"
                className="object-contain p-1"
                iconSize={28}
            />
        </div>
    );
}

const card =
    "rounded-[24px] border border-[#e1eff1] bg-white shadow-[0_8px_34px_rgba(29,65,48,0.045)]";

function SectionTitle({
    icon: Icon,
    title,
    subtitle,
}: {
    icon: typeof Gift;
    title: string;
    subtitle?: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#e6f7f9] text-[#245a48]">
                <Icon
                    aria-hidden="true"
                    className="h-[19px] w-[19px]"
                    strokeWidth={1.9}
                />
            </span>
            <div className="min-w-0 pt-0.5">
                <h2 className="text-[17px] font-bold tracking-[-0.025em] text-[#203f34] sm:text-[19px]">
                    {title}
                </h2>
                {subtitle && (
                    <p className="mt-0.5 text-xs leading-5 text-[#75877c] sm:text-[13px]">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}

export function OrderConfirmationState({
    message,
    loading = false,
    guest = false,
}: {
    message?: string;
    loading?: boolean;
    guest?: boolean;
}) {
    return (
        <div
            className="mx-auto flex min-h-[54vh] max-w-xl items-center justify-center px-3 py-12"
            role="status"
            aria-live="polite"
        >
            <div className={`${card} w-full px-6 py-12 text-center sm:px-10`}>
                <div className="mx-auto grid h-18 w-18 place-items-center rounded-[24px] bg-[#e6f7f9] text-[#065975]">
                    {loading ? (
                        <Package
                            className="h-9 w-9 animate-pulse"
                            strokeWidth={1.6}
                        />
                    ) : (
                        <ReceiptText className="h-9 w-9" strokeWidth={1.6} />
                    )}
                </div>
                <h1 className="mt-6 text-2xl font-bold tracking-tight text-[#1f4537]">
                    {loading
                        ? "Finding your order details"
                        : "We couldn't display your order"}
                </h1>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#607987]">
                    {loading
                        ? "Getting everything ready so you can review your order."
                        : (message ??
                          "The order link may be incomplete or expired. Please check your order email for confirmation.")}
                </p>
                {!loading && (
                    <div className="mt-7 flex flex-wrap justify-center gap-3">
                        <Link
                            href={guest ? "/products" : "/profile"}
                            className="site-button-primary"
                        >
                            {guest ? "Continue shopping" : "My account"}{" "}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link href="/contact" className="site-button-outline">
                            Contact us
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

/** Pure presentation shared by signed-in and guest orders. Never displays guest access tokens. */
export default function OrderConfirmationView({
    order,
    guest = false,
}: {
    order: ConfirmationOrder;
    guest?: boolean;
}) {
    const [feedback, setFeedback] = useState("");
    const reference = String(
        order.orderNumber ?? order.orderId ?? order._id ?? "—",
    );
    const products = order.orderProductsDetails ?? [];
    const hampers = order.orderHampersDetails ?? [];
    const count = [...products, ...hampers].reduce(
        (sum, item) => sum + (Number(item.quantity) || 1),
        0,
    );
    const itemSubtotal =
        products.reduce(
            (total, item) =>
                total +
                Number(
                    item.totalPrice ??
                        Number(item.sellPrice ?? 0) *
                            Number(item.quantity ?? 1),
                ),
            0,
        ) +
        hampers.reduce(
            (total, item) =>
                total +
                Number(
                    item.totalPrice ??
                        Number(item.sellPrice ?? 0) *
                            Number(item.quantity ?? 1),
                ),
            0,
        );
    const subtotal = Number(order.orderTotal ?? itemSubtotal);
    const discount = Math.max(
        0,
        Number(order.coupon?.discountAmount ?? order.couponAmount ?? 0),
    );
    const deliveryFree =
        Boolean(order.coupon?.isFreeShipping) ||
        Number(order.quotedDeliveryCharge ?? 0) === 0;
    const payable = Number(
        order.finalPayableAmount ??
            subtotal -
                discount +
                (deliveryFree ? 0 : Number(order.quotedDeliveryCharge ?? 0)),
    );
    const address = order.orderCustomerAddressDetails?.deliveryAddress;
    const addressLines = [
        address?.addressLine1Snapshot,
        address?.addressLine2Snapshot,
        address?.addressLine3Snapshot,
        address?.landmarkSnapshot,
    ].filter(Boolean);
    const cityLines = [
        address?.cityNameSnapshot ?? address?.citySnapshot,
        address?.districtSnapshot,
        address?.stateNameSnapshot ?? address?.stateSnapshot,
        address?.pincodeSnapshot,
    ].filter(Boolean);
    const trackId = order._id ?? order.orderId;
    const email = order.customerDetails?.customerEmailSnapshot;
    const shareText = `We Craft Memories order #${reference} · Total ${money(payable)}`;

    async function copyValue(value: string, successMessage: string) {
        try {
            if (!navigator.clipboard?.writeText)
                throw new Error("Clipboard unavailable");
            await navigator.clipboard.writeText(value);
            setFeedback(successMessage);
        } catch {
            setFeedback(
                "Copy is unavailable in this browser. You can select the order number above.",
            );
        }
    }

    async function shareOrder() {
        try {
            if (typeof navigator.share === "function") {
                await navigator.share({
                    title: "We Craft Memories order",
                    text: shareText,
                });
                return;
            }
            await copyValue(shareText, "Order summary copied!");
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") return;
            setFeedback("Sharing isn't available right now.");
        }
    }

    return (
        <div className="mx-auto w-full max-w-[1160px] pb-8 pt-1 sm:pb-12 sm:pt-4">
            <div className="mb-4 flex flex-wrap items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#6c8977] sm:mb-6">
                <span>We Craft Memories</span>
                <span className="text-[#aec6b5]">/</span>
                <span className="text-[#355c4b]">Order confirmation</span>
            </div>

            <section className="relative isolate overflow-hidden rounded-[27px] bg-[#104b65] px-5 py-9 text-white shadow-[0_22px_50px_rgba(24,76,61,0.12)] sm:rounded-[34px] sm:px-10 sm:py-12 lg:px-14 lg:py-14">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-24 -top-44 h-[400px] w-[400px] rounded-full border-[65px] border-white/5 sm:right-4 sm:-top-56 sm:h-[560px] sm:w-[560px] sm:border-[90px]"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-28 right-[23%] h-56 w-56 rounded-full bg-[#87b99b]/10 blur-3xl"
                />
                <div className="relative z-10 max-w-[675px]">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#e1f5e5] sm:text-[11px]">
                        <CheckCircle2 aria-hidden="true" className="h-4 w-4" />{" "}
                        Order received
                    </div>
                    <h1 className="mt-5 max-w-[660px] text-[31px] font-semibold leading-[1.13] tracking-[-0.055em] sm:text-[43px] lg:text-[52px]">
                        Hooray! A little joy is in the making
                        <span className="text-[#c8dea2]">.</span>
                    </h1>
                    <p className="mt-4 max-w-[520px] text-[13px] leading-6 text-[#d8ebe0] sm:mt-5 sm:text-[15px] sm:leading-7">
                        Thank you for choosing handmade. Your order is
                        confirmed, and we're excited to make your moments even
                        more special.
                    </p>
                    <div className="mt-6 flex items-center gap-2 text-xs font-medium text-[#e6f1df] sm:mt-8 sm:text-[13px]">
                        <Heart
                            aria-hidden="true"
                            className="h-4 w-4 fill-[#e6af8f] text-[#e6af8f]"
                        />{" "}
                        Crafted with care, just for you
                    </div>
                </div>
                <div
                    aria-hidden="true"
                    className="absolute bottom-8 right-9 hidden h-52 w-52 items-center justify-center rounded-[46px] border border-white/15 bg-white/10 shadow-2xl backdrop-blur-sm lg:flex"
                >
                    <Gift
                        className="h-28 w-28 text-[#e7f4e7]"
                        strokeWidth={1.05}
                    />
                    <Sparkles
                        className="absolute -right-5 top-1 h-12 w-12 text-[#e7d99c]"
                        strokeWidth={1.3}
                    />
                    <span className="absolute -bottom-4 -left-6 grid h-14 w-14 place-items-center rounded-full border-[5px] border-[#104b65] bg-[#dbeac4] text-[#104b65]">
                        <Check className="h-7 w-7" strokeWidth={3} />
                    </span>
                </div>
            </section>

            <div className="relative z-10 mx-2 -mt-4 grid grid-cols-1 gap-0 overflow-hidden rounded-[22px] border border-[#e1eff1] bg-white shadow-[0_14px_42px_rgba(29,65,48,0.08)] sm:mx-5 sm:-mt-7 sm:grid-cols-3 sm:rounded-[25px]">
                <div className="min-w-0 border-b border-[#f2f8f9] px-5 py-4 sm:border-b-0 sm:border-r sm:px-6 sm:py-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-[#6d828b]">
                        Order number
                    </p>
                    <div className="mt-1 flex min-w-0 items-center gap-2">
                        <span className="min-w-0 break-all text-[15px] font-extrabold text-[#214c39] sm:text-[17px]">
                            #{reference}
                        </span>
                        {reference !== "—" && (
                            <button
                                type="button"
                                onClick={() =>
                                    void copyValue(
                                        reference,
                                        "Order number copied!",
                                    )
                                }
                                aria-label="Copy order number"
                                title="Copy order number"
                                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#527b62] transition hover:bg-[#e6f7f9]"
                            >
                                <Copy className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
                <div className="border-b border-[#f2f8f9] px-5 py-4 sm:border-b-0 sm:border-r sm:px-6 sm:py-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-[#6d828b]">
                        Placed on
                    </p>
                    <p className="mt-1 text-[15px] font-bold text-[#173b4a] sm:text-[17px]">
                        {orderDate(order.purchaseDate)}
                    </p>
                </div>
                <div className="px-5 py-4 sm:px-6 sm:py-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-[#6d828b]">
                        Order total
                    </p>
                    <p className="mt-1 text-[19px] font-extrabold tracking-tight text-[#065975] sm:text-[22px]">
                        {money(payable)}
                    </p>
                </div>
            </div>

            <div className="mt-5 grid min-w-0 gap-5 sm:mt-8 sm:gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(310px,1fr)] lg:items-start">
                <div className="flex min-w-0 flex-col gap-5 sm:gap-6">
                    <section className={`${card} px-5 py-6 sm:p-7`}>
                        <SectionTitle
                            icon={Sparkles}
                            title="What happens next?"
                            subtitle="Here's a little peek at your order journey."
                        />
                        <div className="mt-7 grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 sm:grid-cols-[36px_minmax(0,1fr)] sm:gap-x-4">
                            {[
                                {
                                    icon: Check,
                                    title: "Order received",
                                    description:
                                        "We've got your order details.",
                                    current: true,
                                },
                                {
                                    icon: Gift,
                                    title: "Prepared with care",
                                    description:
                                        "Your lovely picks are getting ready.",
                                    current: false,
                                },
                                {
                                    icon: Truck,
                                    title: "Out for delivery",
                                    description:
                                        "We'll share updates as your order moves along.",
                                    current: false,
                                },
                            ].map((step, index) => {
                                const StepIcon = step.icon;
                                return (
                                    <div key={step.title} className="contents">
                                        <div className="relative flex justify-center">
                                            {index < 2 && (
                                                <span
                                                    aria-hidden="true"
                                                    className="absolute top-8 bottom-0 w-px bg-[#dce7df]"
                                                />
                                            )}
                                            <span
                                                className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border ${step.current ? "border-[#065975] bg-[#065975] text-white" : "border-[#e1eff1] bg-[#f6f8f4] text-[#8aa794]"}`}
                                            >
                                                <StepIcon
                                                    aria-hidden="true"
                                                    className="h-4 w-4"
                                                />
                                            </span>
                                        </div>
                                        <div
                                            className={`min-w-0 ${index < 2 ? "pb-7" : ""}`}
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-bold text-[#173b4a]">
                                                    {step.title}
                                                </p>
                                                {step.current && (
                                                    <span className="rounded-full bg-[#ecf6eb] px-2 py-0.5 text-[10px] font-bold text-[#27704c]">
                                                        Confirmed
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-0.5 text-xs leading-5 text-[#607987]">
                                                {step.description}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {email && (
                            <div className="mt-1 flex min-w-0 items-start gap-2 rounded-2xl bg-[#f2f7ef] px-4 py-3 text-xs leading-5 text-[#557263]">
                                <Mail
                                    aria-hidden="true"
                                    className="mt-0.5 h-4 w-4 shrink-0"
                                />
                                <span>
                                    Order updates can be sent to{" "}
                                    <strong className="break-all font-semibold text-[#23533c]">
                                        {email}
                                    </strong>
                                </span>
                            </div>
                        )}
                    </section>

                    <section className={`${card} px-5 py-6 sm:p-7`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <SectionTitle
                                icon={ShoppingBag}
                                title="Your lovely picks"
                                subtitle="A quick look at everything you ordered."
                            />
                            <span className="rounded-full bg-[#f3f7f0] px-3 py-1.5 text-[11px] font-bold text-[#537361]">
                                {count} {count === 1 ? "item" : "items"}
                            </span>
                        </div>
                        <ul className="mt-5 divide-y divide-[#f2f8f9]">
                            {products.map((item, index) => (
                                <li
                                    key={`${item.productId ?? "product"}-${index}`}
                                    className="flex min-w-0 gap-3 py-4 first:pt-1 last:pb-0 sm:gap-4"
                                >
                                    <ItemImage
                                        src={item.productImage}
                                        alt={
                                            item.productNameSnapshot ??
                                            "Handmade product"
                                        }
                                    />
                                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                        <div className="min-w-0">
                                            <p className="break-words text-[13px] font-bold leading-5 text-[#173b4a] sm:text-sm">
                                                {item.productNameSnapshot ??
                                                    "Handmade product"}
                                            </p>
                                            <p className="mt-1 text-xs text-[#6d828b]">
                                                Qty: {item.quantity ?? 1}
                                            </p>
                                        </div>
                                        <p className="shrink-0 text-sm font-extrabold text-[#173b4a]">
                                            {money(
                                                Number(
                                                    item.totalPrice ??
                                                        Number(
                                                            item.sellPrice ?? 0,
                                                        ) *
                                                            Number(
                                                                item.quantity ??
                                                                    1,
                                                            ),
                                                ),
                                            )}
                                        </p>
                                    </div>
                                </li>
                            ))}
                            {hampers.map((item, index) => (
                                <li
                                    key={`${item.hamperId ?? "hamper"}-${index}`}
                                    className="flex min-w-0 gap-3 py-4 first:pt-1 last:pb-0 sm:gap-4"
                                >
                                    <ItemImage
                                        src={item.hamperImage}
                                        alt={
                                            item.hamperNameSnapshot ??
                                            "Gift hamper"
                                        }
                                    />
                                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                        <div className="min-w-0">
                                            <p className="break-words text-[13px] font-bold leading-5 text-[#173b4a] sm:text-sm">
                                                {item.hamperNameSnapshot ??
                                                    "Gift hamper"}
                                            </p>
                                            <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-[#6d828b]">
                                                <Gift className="h-3.5 w-3.5" />{" "}
                                                Gift hamper · Qty:{" "}
                                                {item.quantity ?? 1}
                                            </p>
                                            {(item.giftMessages?.length ? item.giftMessages : item.itemNotes ? [item.itemNotes] : []).map((message, index) => message ? (
                                                <p key={index} className="mt-1 break-words text-xs leading-5 text-[#657c6c]">
                                                    Gift {item.quantity && item.quantity > 1 ? index + 1 : ""} message: {message}
                                                </p>
                                            ) : null)}
                                        </div>
                                        <p className="shrink-0 text-sm font-extrabold text-[#173b4a]">
                                            {money(
                                                Number(
                                                    item.totalPrice ??
                                                        Number(
                                                            item.sellPrice ?? 0,
                                                        ) *
                                                            Number(
                                                                item.quantity ??
                                                                    1,
                                                            ),
                                                ),
                                            )}
                                        </p>
                                    </div>
                                </li>
                            ))}
                            {count === 0 && (
                                <li className="py-6 text-sm text-[#607987]">
                                    Your order items aren't available in the
                                    summary yet.
                                </li>
                            )}
                        </ul>
                    </section>

                    <section className={`${card} px-5 py-6 sm:p-7`}>
                        <SectionTitle
                            icon={MapPin}
                            title="Delivery details"
                            subtitle="Where we'll send your order."
                        />
                        <div className="mt-5 rounded-2xl bg-[#f7f9f5] p-4 sm:p-5">
                            {address ? (
                                <div className="space-y-1 text-[13px] leading-6 text-[#62776a]">
                                    <p className="text-[14px] font-bold text-[#173b4a]">
                                        {address.recipientNameSnapshot ??
                                            order.customerDetails
                                                ?.customerNameSnapshot ??
                                            "Recipient"}
                                    </p>
                                    {addressLines.length > 0 && (
                                        <p className="break-words">
                                            {addressLines.join(", ")}
                                        </p>
                                    )}
                                    {cityLines.length > 0 && (
                                        <p className="break-words">
                                            {cityLines.join(", ")}
                                        </p>
                                    )}
                                    {(address.countryNameSnapshot ??
                                        address.countrySnapshot) && (
                                        <p>
                                            {address.countryNameSnapshot ??
                                                address.countrySnapshot}
                                        </p>
                                    )}
                                    {(address.recipientContactSnapshot ??
                                        order.customerDetails
                                            ?.customerMobileSnapshot) && (
                                        <p className="pt-1 text-xs text-[#496b58]">
                                            Phone:{" "}
                                            {address.recipientContactSnapshot ??
                                                order.customerDetails
                                                    ?.customerMobileSnapshot}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm leading-6 text-[#607987]">
                                    Delivery address details aren't available in
                                    this summary.
                                </p>
                            )}
                        </div>
                    </section>
                </div>

                <aside className="flex min-w-0 flex-col gap-5 sm:gap-6 lg:sticky lg:top-24">
                    <section className={`${card} overflow-hidden`}>
                        <div className="border-b border-[#f2f8f9] px-5 py-5 sm:px-6">
                            <SectionTitle
                                icon={ReceiptText}
                                title="Order summary"
                            />
                        </div>
                        <div className="px-5 py-6 sm:px-6">
                            <div className="space-y-4 text-[13px] sm:text-sm">
                                <div className="flex justify-between gap-4 text-[#607987]">
                                    <span>Subtotal</span>
                                    <span className="shrink-0 font-semibold text-[#173b4a]">
                                        {money(subtotal)}
                                    </span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between gap-3 text-[#0c7d96]">
                                        <span className="min-w-0">
                                            Discount
                                            {order.coupon?.code
                                                ? ` (${order.coupon.code})`
                                                : ""}
                                        </span>
                                        <span className="shrink-0 font-bold">
                                            −{money(discount)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between gap-4 text-[#607987]">
                                    <span>Delivery</span>
                                    <span
                                        className={`shrink-0 font-semibold ${deliveryFree ? "text-[#0c7d96]" : "text-[#173b4a]"}`}
                                    >
                                        {deliveryFree
                                            ? "Free"
                                            : money(order.quotedDeliveryCharge)}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-6 flex items-end justify-between gap-3 border-t border-dashed border-[#cbdad0] pt-5">
                                <span className="pb-1 text-sm font-bold text-[#284938]">
                                    Total
                                </span>
                                <span className="text-[27px] font-extrabold leading-none tracking-[-0.05em] text-[#065975] sm:text-[30px]">
                                    {money(payable)}
                                </span>
                            </div>
                            {discount > 0 && (
                                <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#ecf7eb] px-3 py-3 text-[12px] font-bold text-[#0c7d96]">
                                    <Sparkles
                                        aria-hidden="true"
                                        className="h-4 w-4 shrink-0"
                                    />
                                    You saved {money(discount)} on this order!
                                </div>
                            )}
                        </div>
                    </section>

                    <section className={`${card} p-5 sm:p-6 print:hidden`}>
                        <p className="mb-4 text-[13px] font-bold text-[#254735]">
                            Where would you like to go?
                        </p>
                        {!guest && (
                            <Link
                                href={
                                    trackId
                                        ? `/profile/order/${encodeURIComponent(String(trackId))}`
                                        : "/profile"
                                }
                                className="site-button-primary flex w-full justify-center"
                            >
                                <PackageCheck className="h-[18px] w-[18px]" />{" "}
                                View your order{" "}
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        )}
                        <Link
                            href="/products"
                            className={`${guest ? "site-button-primary" : "site-button-outline mt-3"} flex w-full justify-center`}
                        >
                            <ShoppingBag className="h-[18px] w-[18px]" />{" "}
                            Continue shopping <ArrowRight className="h-4 w-4" />
                        </Link>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="flex min-h-11 items-center justify-center gap-2 rounded-[12px] border border-[#dcebf0] text-[12px] font-semibold text-[#5f7884] transition hover:bg-[#f2fbfc]"
                            >
                                <Printer
                                    aria-hidden="true"
                                    className="h-4 w-4"
                                />{" "}
                                Print
                            </button>
                            <button
                                type="button"
                                onClick={() => void shareOrder()}
                                className="flex min-h-11 items-center justify-center gap-2 rounded-[12px] border border-[#dcebf0] text-[12px] font-semibold text-[#5f7884] transition hover:bg-[#f2fbfc]"
                            >
                                <Share2
                                    aria-hidden="true"
                                    className="h-4 w-4"
                                />{" "}
                                Share
                            </button>
                        </div>
                        {feedback && (
                            <p
                                role="status"
                                className="mt-3 text-center text-xs leading-5 text-[#0c7d96]"
                            >
                                {feedback}
                            </p>
                        )}
                    </section>

                    <div className="flex items-start gap-3 rounded-[20px] bg-[#eef5ec] px-5 py-5 text-[#426650]">
                        <ShieldCheck
                            aria-hidden="true"
                            className="mt-0.5 h-5 w-5 shrink-0"
                        />
                        <div>
                            <p className="text-[13px] font-bold text-[#28513d]">
                                Here to help, always
                            </p>
                            <p className="mt-1 text-xs leading-6">
                                Have a question about your order?{" "}
                                <Link
                                    href="/contact"
                                    className="font-bold underline underline-offset-2 hover:text-[#065975]"
                                >
                                    Get in touch
                                </Link>{" "}
                                with us.
                            </p>
                        </div>
                    </div>
                </aside>
            </div>
            <div className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-[#7b9180] sm:mt-10">
                <Heart aria-hidden="true" className="h-4 w-4 text-[#c58c70]" />{" "}
                Thank you for supporting handmade creations.
            </div>
        </div>
    );
}