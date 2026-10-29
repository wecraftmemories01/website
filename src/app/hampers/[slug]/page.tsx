"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    CheckCircle2,
    Gift,
    Minus,
    Plus,
    ShoppingBag,
    Truck,
} from "lucide-react";
import HamperMediaImage from "@/components/HamperMediaImage";
import ShareMenu from "@/components/ui/ShareMenu";
import HamperRichDescription from "@/components/HamperRichDescription";
import { addHamperToCart, currencyINR, getHamper, Hamper } from "@/lib/hampers";
import { plainTextFromHtml } from "@/lib/hamperDisplay";

export default function HamperDetailPage() {
    const params = useParams<{ slug: string }>();
    const [hamper, setHamper] = useState<Hamper | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState<string[]>([""]);
    const [saving, setSaving] = useState(false);
    const [added, setAdded] = useState(false);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");
        setAdded(false);
        setQuantity(1);
        setNotes([""]);
        const slug = decodeURIComponent(params.slug);
        getHamper(slug, /^[a-f0-9]{24}$/i.test(slug))
            .then((h) => {
                if (active) setHamper(h);
            })
            .catch((e) => {
                if (active)
                    setError(
                        typeof e?.response?.data?.error === "string"
                            ? e.response.data.error
                            : e?.message || "Hamper not found",
                    );
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [params.slug]);
    async function add() {
        if (!hamper || saving) return;
        setSaving(true);
        setError("");
        setAdded(false);
        try {
            await addHamperToCart(
                hamper,
                quantity,
                notes[0] || "",
                Array.from({ length: quantity }, (_, i) => notes[i] || ""),
            );
            setAdded(true);
        } catch (e: any) {
            setError(
                typeof e?.response?.data?.error === "string"
                    ? e.response.data.error
                    : e?.response?.data?.message ||
                          e?.message ||
                          "Could not add hamper to cart",
            );
        } finally {
            setSaving(false);
        }
    }
    if (loading)
        return (
            <div
                aria-label="Loading hamper"
                className="grid md:grid-cols-2 gap-8 py-8 animate-pulse"
            >
                <div className="aspect-square rounded-3xl bg-slate-100" />
                <div className="space-y-6 py-5">
                    <div className="h-10 bg-slate-100 rounded w-2/3" />
                    <div className="h-6 bg-slate-100 rounded w-1/3" />
                    <div className="h-28 bg-slate-100 rounded" />
                </div>
            </div>
        );
    if (!hamper)
        return (
            <div className="site-card text-center p-12 my-10">
                <Gift size={38} className="mx-auto mb-3 text-[#065975]" />
                <h1 className="text-xl font-bold">
                    We couldn’t find this hamper
                </h1>
                <p className="text-sm text-rose-600 mt-2">{error}</p>
                <Link className="site-button-primary mt-6" href="/hampers">
                    Browse hampers
                </Link>
            </div>
        );
    const available = hamper.isAvailableForSale && hamper.maxOrderQuantity > 0;
    const summary = plainTextFromHtml(hamper.shortDescription);
    return (
        <div className="pb-32 sm:pb-32">
            <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-2 text-sm text-slate-500 pt-4 pb-4 sm:pb-6"
            >
                <Link
                    href="/hampers"
                    className="inline-flex gap-2 items-center font-semibold hover:text-[#065975]"
                >
                    <ArrowLeft size={16} />
                    Gift hampers
                </Link>
                <span>/</span>
                <span className="text-slate-700 truncate">
                    {hamper.hamperName}
                </span>
            </nav>
            <div className="grid lg:grid-cols-[minmax(0,1.07fr)_minmax(340px,.93fr)] gap-5 lg:gap-8 xl:gap-12 items-start">
                <div className="min-w-0 lg:sticky lg:top-28">
                    <div className="rounded-[24px] sm:rounded-[30px] border border-[#e0eadd] bg-white p-3 sm:p-5 lg:p-6 shadow-[0_14px_45px_rgba(23,79,67,.06)] site-reveal">
                        <div className="relative mx-auto h-[clamp(245px,74vw,355px)] sm:h-[430px] lg:h-[min(40vw,510px)] w-full max-w-[650px] overflow-hidden rounded-[18px] sm:rounded-[24px] bg-[radial-gradient(circle_at_50%_35%,#fff_8%,#eaf3e8_100%)]">
                            <HamperMediaImage
                                src={hamper.hamperImage}
                                alt={hamper.hamperName}
                                sizes="(max-width: 640px) 95vw, (max-width: 1024px) 640px, 43vw"
                                iconSize={75}
                                className="object-contain p-3 sm:p-5 transition-transform duration-500 hover:scale-[1.035]"
                            />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-[#607987]">
                            <span>✦ Thoughtfully curated</span>
                            <span aria-hidden="true">·</span>
                            <span>Handmade with care</span>
                        </div>
                    </div>
                    <div className="hidden lg:flex items-center justify-center gap-2 mt-4 text-xs text-slate-500">
                        <Gift size={15} />
                        Made for meaningful moments
                    </div>
                </div>
                <div className="min-w-0">
                    <span className="site-eyebrow">
                        <Gift size={14} /> Curated handmade hamper
                    </span>
                    <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                        <h1 className="min-w-0 flex-1 text-[clamp(1.6rem,3vw,2.65rem)] font-extrabold tracking-[-.04em] leading-tight text-[#065975]">
                            {hamper.hamperName}
                        </h1>
                        <ShareMenu
                            kind="hamper"
                            title={hamper.hamperName}
                            path={`/hampers/${encodeURIComponent(hamper.seo?.slug || hamper.hamperId)}`}
                        />
                    </div>
                    <p className="text-[clamp(1.8rem,3vw,2.5rem)] font-extrabold tracking-tight text-[#065975] mt-3">
                        {currencyINR(Number(hamper.price))}
                    </p>
                    {summary && (
                        <p className="text-slate-600 leading-6 mt-3 text-sm sm:text-[15px]">
                            {summary}
                        </p>
                    )}
                    <p
                        className={`mt-3 flex items-center gap-2 text-sm font-semibold ${available ? "text-[#0a7791]" : "text-rose-600"}`}
                    >
                        <span
                            className={`w-2 h-2 rounded-full ${available ? "bg-[#36a46c]" : "bg-rose-500"}`}
                        />
                        {available
                            ? "Available to order"
                            : "Currently unavailable"}
                    </p>
                    <div
                        className="site-card hamper-purchase-panel p-4 sm:p-6 mt-4 space-y-4 shadow-[0_16px_45px_rgba(23,79,67,.06)]"
                        aria-label="Add hamper to cart"
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <label
                                    className="font-bold text-sm"
                                    htmlFor="hamper-qty"
                                >
                                    Quantity
                                </label>
                                <p className="text-xs text-slate-500 mt-1">
                                    {available
                                        ? `Up to ${hamper.maxOrderQuantity} available`
                                        : "Not available for purchase"}
                                </p>
                            </div>
                            <div className="inline-flex items-center gap-1 rounded-xl border border-[#dce6dd] p-1">
                                <button
                                    type="button"
                                    aria-label="Decrease quantity"
                                    disabled={
                                        !available || quantity <= 1 || saving
                                    }
                                    onClick={() => {
                                        setQuantity((q) => Math.max(1, q - 1));
                                        setAdded(false);
                                    }}
                                    className="site-icon-button !w-9 !h-9 !min-w-9 !min-h-9 disabled:opacity-40"
                                >
                                    <Minus size={17} />
                                </button>
                                <input
                                    id="hamper-qty"
                                    value={quantity}
                                    onChange={(e) => {
                                        setQuantity(
                                            Math.max(
                                                1,
                                                Math.min(
                                                    hamper.maxOrderQuantity ||
                                                        1,
                                                    Math.floor(
                                                        Number(
                                                            e.target.value,
                                                        ) || 1,
                                                    ),
                                                ),
                                            ),
                                        );
                                        setAdded(false);
                                    }}
                                    type="number"
                                    inputMode="numeric"
                                    min={1}
                                    max={Math.max(1, hamper.maxOrderQuantity)}
                                    disabled={!available || saving}
                                    className="w-11 text-center font-bold bg-transparent appearance-none outline-none"
                                />
                                <button
                                    type="button"
                                    aria-label="Increase quantity"
                                    disabled={
                                        !available ||
                                        quantity >= hamper.maxOrderQuantity ||
                                        saving
                                    }
                                    onClick={() => {
                                        setQuantity((q) =>
                                            Math.min(
                                                hamper.maxOrderQuantity,
                                                q + 1,
                                            ),
                                        );
                                        setAdded(false);
                                    }}
                                    className="site-icon-button !w-9 !h-9 !min-w-9 !min-h-9 disabled:opacity-40"
                                >
                                    <Plus size={17} />
                                </button>
                            </div>
                        </div>
                        <div>
                            <p className="font-bold text-sm mb-2">
                                {quantity > 1
                                    ? "Gift messages — one per hamper"
                                    : "Gift message"}
                                <span className="font-normal text-slate-400">
                                    {" "}
                                    (optional)
                                </span>
                            </p>
                            {quantity > 1 && (
                                <p className="text-xs text-slate-500 mb-3">
                                    Buying gifts for different people? Add a
                                    unique message to each hamper.
                                </p>
                            )}
                            <div className="space-y-3">
                                {Array.from(
                                    { length: Math.min(quantity, 12) },
                                    (_, i) => (
                                        <label
                                            key={i}
                                            className="block text-xs font-semibold text-slate-600"
                                        >
                                            {quantity > 1
                                                ? `Hamper ${i + 1} message`
                                                : "Your message"}
                                            <textarea
                                                value={notes[i] || ""}
                                                onChange={(event) => {
                                                    const value =
                                                        event.target.value.slice(
                                                            0,
                                                            5000,
                                                        );
                                                    setNotes((previous) => {
                                                        const next = [
                                                            ...previous,
                                                        ];
                                                        next[i] = value;
                                                        return next;
                                                    });
                                                    setAdded(false);
                                                }}
                                                rows={2}
                                                maxLength={5000}
                                                placeholder="Write something sweet for the recipient…"
                                                className="site-field mt-1 w-full resize-y font-normal"
                                            />
                                        </label>
                                    ),
                                )}
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                                {quantity > 12
                                    ? "For larger quantities, you can personalize the remaining messages in your cart."
                                    : "You can also edit each message in your cart before checkout."}
                            </p>
                        </div>
                        {error && (
                            <p
                                role="alert"
                                className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
                            >
                                {error}
                            </p>
                        )}
                        {added && (
                            <p
                                role="status"
                                className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-800"
                            >
                                <CheckCircle2 size={18} /> Added to your cart!
                            </p>
                        )}
                        <div className="grid sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-3">
                            <button
                                type="button"
                                onClick={add}
                                disabled={saving || !available}
                                className="site-button-primary w-full !min-h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ShoppingBag size={19} />
                                {saving ? "Adding to cart…" : "Add to cart"}
                            </button>
                            <Link
                                href="/cart"
                                className="site-button-outline w-full !min-h-12"
                            >
                                View your cart{" "}
                                <ArrowLeft size={17} className="rotate-180" />
                            </Link>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-2">
                            <Truck size={16} /> Delivery availability and
                            charges confirmed at checkout
                        </p>
                    </div>
                    {Array.isArray(hamper.products) &&
                        hamper.products.length > 0 && (
                            <section className="mt-7">
                                <div className="flex items-center justify-between gap-3 mb-4">
                                    <h2 className="text-lg font-extrabold text-[#173b4a]">
                                        What’s inside
                                    </h2>
                                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full py-1 px-3">
                                        {hamper.products.length} items
                                    </span>
                                </div>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {hamper.products.map((p, i) => (
                                        <li
                                            key={`${p.productId}-${i}`}
                                            className="site-card p-3 flex gap-3 items-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                                        >
                                            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#e6f7f9]">
                                                <HamperMediaImage
                                                    src={p.productImage}
                                                    alt={
                                                        p.productName ||
                                                        "Included handmade gift"
                                                    }
                                                    sizes="64px"
                                                    iconSize={23}
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm text-slate-800 leading-snug">
                                                    {p.productName ||
                                                        "Handmade item"}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Quantity: {p.quantity}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                </div>
            </div>
            {hamper.longDescription && (
                <section className="mt-12 sm:mt-16 max-w-4xl">
                    <div className="border-b border-[#e0e7df] pb-4 mb-5">
                        <h2 className="site-section-title">
                            More about this hamper
                        </h2>
                        <p className="text-slate-500 mt-2 text-sm">
                            The little details that make it special.
                        </p>
                    </div>
                    <HamperRichDescription html={hamper.longDescription} />
                </section>
            )}
            <div className="mt-10">
                <Link href="/hampers" className="site-button-outline">
                    <ArrowLeft size={17} /> Explore more hampers
                </Link>
            </div>
            <div
                className="wcm-buy-dock"
                role="region"
                aria-label="Quick hamper purchase"
            >
                <div className="w-full max-w-[1760px] mx-auto flex items-center gap-2 sm:gap-6 px-3 sm:px-6 lg:px-10 2xl:px-12 py-2.5 sm:py-3">
                    <div className="min-w-0 grow sm:grow-0">
                        <span className="block font-extrabold text-lg sm:text-xl text-[#065975] leading-tight">
                            {currencyINR(Number(hamper.price))}
                        </span>
                        <span
                            className={`block text-xs mt-0.5 ${available ? "text-[#0c7d96]" : "text-rose-600"}`}
                        >
                            {available
                                ? `Handmade hamper · Qty ${quantity}`
                                : "Currently unavailable"}
                        </span>
                    </div>
                    <div className="hidden sm:flex min-w-0 grow items-center gap-3">
                        <Gift size={19} className="text-[#065975]" />
                        <span className="truncate text-sm font-semibold text-[#576f79]">
                            {hamper.hamperName}
                        </span>
                    </div>
                    {added ? (
                        <Link
                            href="/cart"
                            className="site-button-primary !min-h-11 !px-4 sm:!px-6 whitespace-nowrap"
                        >
                            View cart{" "}
                            <ArrowLeft size={16} className="rotate-180" />
                        </Link>
                    ) : (
                        <button
                            type="button"
                            className="site-button-primary !min-h-11 !px-4 sm:!px-6 whitespace-nowrap disabled:opacity-50"
                            onClick={add}
                            disabled={!available || saving}
                        >
                            <ShoppingBag size={17} />
                            {saving
                                ? "Adding…"
                                : available
                                  ? "Add to cart"
                                  : "Out of stock"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}