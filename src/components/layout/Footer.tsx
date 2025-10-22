'use client';

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    Mail as MailIcon,
    Facebook,
    Instagram,
    Send,
    Phone,
    MapPin,
    X,
    ChevronDown,
} from "lucide-react";

interface FooterProps {
    containerClass?: string;
    footerPadding?: string;
}

type InstaPost = {
    _id: string;
    url: string;
    caption?: string;
    thumbnailUrl?: string; // mapped from API's thumbnailImage
    sortNumber?: number;
    createdAt?: string;
    updatedAt?: string;
};

export default function FooterWithInstagram({
    containerClass = "max-w-7xl mx-auto px-6",
    footerPadding = "py-10",
}: FooterProps): React.ReactElement {
    const [modalOpen, setModalOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
    const [legalOpen, setLegalOpen] = useState(false);
    const modalRef = useRef<HTMLDivElement | null>(null);

    const [instaPosts, setInstaPosts] = useState<InstaPost[]>([]);
    const [igLoading, setIgLoading] = useState(false);
    const [igError, setIgError] = useState<string | null>(null);

    // quick dev toggle: set NEXT_PUBLIC_DISABLE_IMAGE_OPTIMIZATION=true in .env.local
    const disableImageOptimization = process.env.NEXT_PUBLIC_DISABLE_IMAGE_OPTIMIZATION === "true";

    const placeholderDataUri =
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect fill="#f3f4f6" width="100%" height="100%"/><text fill="#9ca3af" font-family="Arial,Helvetica,sans-serif" font-size="14" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">No image</text></svg>`
        );

    // Fetch once on mount — compute API strings inside effect so deps array stays stable
    useEffect(() => {
        const controller = new AbortController();
        let mounted = true;

        async function loadIG() {
            setIgLoading(true);
            setIgError(null);

            // compute API base + endpoint here (client or env stable)
            const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");
            const IG_API = API_BASE ? `${API_BASE}/instagram_post` : "/instagram_post";

            try {
                const res = await fetch(IG_API, { signal: controller.signal });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const body = await res.json();

                if (!mounted) return;

                const raw: any[] = Array.isArray(body.instagramPostData) ? body.instagramPostData : [];

                const mapped: InstaPost[] = raw.map((p) => {
                    let thumb = "";
                    if (p.thumbnailImage && typeof p.thumbnailImage === "string") {
                        const rawStr = p.thumbnailImage.trim();
                        if (/^https?:\/\//i.test(rawStr)) {
                            thumb = rawStr;
                        } else {
                            // Prefer API_BASE if provided; else use window.location.origin (client only)
                            if (API_BASE) {
                                thumb = `${API_BASE}/${rawStr.replace(/^\/+/, "")}`;
                            } else if (typeof window !== "undefined") {
                                thumb = `${window.location.origin}/${rawStr.replace(/^\/+/, "")}`;
                            } else {
                                thumb = rawStr;
                            }
                        }
                    }
                    return {
                        _id: String(p._id),
                        url: p.url,
                        caption: p.caption,
                        thumbnailUrl: thumb,
                        sortNumber: typeof p.sortNumber === "number" ? p.sortNumber : undefined,
                        createdAt: p.createdAt,
                        updatedAt: p.updatedAt,
                    };
                });

                // sort by sortNumber desc, fallback updatedAt desc
                mapped.sort((a, b) => {
                    const aSort = typeof a.sortNumber === "number" ? a.sortNumber : Number.MIN_SAFE_INTEGER;
                    const bSort = typeof b.sortNumber === "number" ? b.sortNumber : Number.MIN_SAFE_INTEGER;
                    if (bSort !== aSort) return bSort - aSort;
                    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                    return bTime - aTime;
                });

                setInstaPosts(mapped.slice(0, 6));
            } catch (err: any) {
                if (err.name === "AbortError") return;
                console.warn("[FooterWithInstagram] failed to load instagram posts", err);
                setIgError("Failed to load Instagram posts");
            } finally {
                if (mounted) setIgLoading(false);
            }
        }

        loadIG();

        return () => {
            mounted = false;
            controller.abort();
        };
    }, []); // stable, fixed-size deps array — no more warning

    // modal handlers
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") setModalOpen(false);
        }
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (modalOpen && modalRef.current && !modalRef.current.contains(e.target as Node)) {
                setModalOpen(false);
            }
        }
        document.addEventListener("click", onDocClick);
        return () => document.removeEventListener("click", onDocClick);
    }, [modalOpen]);

    const handleSubscribe = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!email || !/\S+@\S+\.\S+/.test(email)) {
            setStatus("error");
            setTimeout(() => setStatus("idle"), 1800);
            return;
        }
        setStatus("loading");
        try {
            await new Promise((r) => setTimeout(r, 700));
            setStatus("ok");
            setEmail("");
            setTimeout(() => {
                setStatus("idle");
                setModalOpen(false);
            }, 1000);
        } catch {
            setStatus("error");
            setTimeout(() => setStatus("idle"), 1800);
        }
    };

    // Thumbnail helper using next/image
    function Thumbnail({ src, alt }: { src?: string; alt?: string }) {
        const [imgSrc, setImgSrc] = useState<string>(src && src.length > 0 ? src : placeholderDataUri);

        useEffect(() => {
            setImgSrc(src && src.length > 0 ? src : placeholderDataUri);
        }, [src]);

        return (
            <div className="w-24 h-16 overflow-hidden rounded shadow-sm relative">
                <Image
                    src={imgSrc}
                    alt={alt || "Instagram thumbnail"}
                    fill
                    sizes="160px"
                    style={{ objectFit: "cover" }}
                    onError={() => setImgSrc(placeholderDataUri)}
                    unoptimized={disableImageOptimization}
                />
            </div>
        );
    }

    const PlaceholderThumb = ({ caption }: { caption?: string }) => (
        <div className="flex items-center justify-center w-full h-full p-2 text-xs text-slate-500 text-center">
            {caption ? <span>{caption}</span> : <span>View post</span>}
        </div>
    );

    return (
        <>
            <footer className="mt-12 bg-gray-100 text-slate-800">
                {/* top strip */}
                <div className="border-b border-slate-200 bg-white/70">
                    <div className={`${containerClass} px-4 py-3 flex items-center justify-between text-sm`}>
                        <div className="flex items-center gap-6">
                            <div className="hidden sm:flex items-center gap-2 text-slate-600">
                                <span className="px-2 py-1 rounded bg-teal-100 text-teal-700 text-xs">Handmade</span>
                                Sustainable materials & small batches
                            </div>
                        </div>

                        {/* <div className="flex items-center gap-4">
                            <button
                                onClick={() => setModalOpen(true)}
                                className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-md text-sm font-medium shadow"
                            >
                                Get 10% — Join newsletter
                            </button>
                        </div> */}
                    </div>
                </div>

                {/* main footer */}
                <div className={`${containerClass} ${footerPadding} grid grid-cols-1 lg:grid-cols-12 gap-8`}>
                    {/* left */}
                    <div className="lg:col-span-4">
                        <div className="bg-white rounded-xl p-5 ring-1 ring-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="relative h-12 w-12 rounded-md overflow-hidden bg-gray-50 ring-1 ring-slate-200 flex-shrink-0">
                                    <Image src="/logo.png" alt="WeCraftMemories" fill style={{ objectFit: "contain" }} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900">WeCraftMemories</h3>
                                    <p className="text-xs text-slate-500">Handmade gifts & home decor</p>
                                </div>
                            </div>

                            <p className="mt-4 text-sm text-slate-600 max-w-sm">
                                Thoughtfully crafted pieces — made by artisans. Every order supports small makers.
                            </p>

                            <div className="mt-5 flex items-start gap-4">
                                <div className="flex-1 text-sm space-y-2">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Phone size={14} /> <span>+91 98765 43210</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <MapPin size={14} /> <span>Handmade Studio, Mumbai</span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center gap-2">
                                    <a aria-label="Instagram" href="https://www.instagram.com/wecraftmemories01/" target="_blank" rel="noopener noreferrer" className="p-2 rounded-md bg-slate-100 hover:bg-slate-200">
                                        <Instagram size={16} />
                                    </a>
                                    <a aria-label="Facebook" href="https://www.facebook.com/profile.php?id=61554979132861" target="_blank" rel="noopener noreferrer" className="p-2 rounded-md bg-slate-100 hover:bg-slate-200">
                                        <Facebook size={16} />
                                    </a>
                                </div>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-600">
                                <span className="px-2 py-1 rounded bg-slate-100">Quality checked</span>
                                <span className="px-2 py-1 rounded bg-slate-100">Secure checkout</span>
                            </div>
                        </div>
                    </div>

                    {/* center tiles */}
                    <div className="lg:col-span-5 grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg p-3 flex flex-col items-start gap-2 ring-1 ring-slate-200">
                            <div className="w-full h-28 rounded-md overflow-hidden bg-gray-100" />
                            <Link href="/collections/diwali" className="text-sm font-semibold text-slate-800 hover:text-teal-600">Diwali Picks</Link>
                            <p className="text-xs text-slate-500">Seasonal home decor & gift sets</p>
                        </div>

                        <div className="bg-white rounded-lg p-3 flex flex-col items-start gap-2 ring-1 ring-slate-200">
                            <div className="w-full h-28 rounded-md overflow-hidden bg-gray-100" />
                            <Link href="/gifts/for-her" className="text-sm font-semibold text-slate-800 hover:text-teal-600">For Her</Link>
                            <p className="text-xs text-slate-500">Handmade gift ideas</p>
                        </div>

                        <div className="hidden md:flex flex-col items-start gap-2 bg-white rounded-lg p-3 ring-1 ring-slate-200">
                            <div className="w-full h-28 rounded-md overflow-hidden bg-gray-100" />
                            <Link href="/gifts/for-kids" className="text-sm font-semibold text-slate-800 hover:text-teal-600">For Kids</Link>
                            <p className="text-xs text-slate-500">Soft toys & decor</p>
                        </div>

                        <div className="bg-white rounded-lg p-3 flex flex-col items-start gap-2 ring-1 ring-slate-200">
                            <div className="w-full h-28 rounded-md overflow-hidden bg-gray-100" />
                            <Link href="/products/planters" className="text-sm font-semibold text-slate-800 hover:text-teal-600">Planters</Link>
                            <p className="text-xs text-slate-500">Woolen planters & pots</p>
                        </div>

                        <div className="hidden md:flex flex-col items-start gap-2 bg-white rounded-lg p-3 ring-1 ring-slate-200">
                            <div className="w-full h-28 rounded-md overflow-hidden bg-gray-100" />
                            <Link href="/collections/bestsellers" className="text-sm font-semibold text-slate-800 hover:text-teal-600">Best Sellers</Link>
                            <p className="text-xs text-slate-500">Customer favourites</p>
                        </div>
                    </div>

                    {/* right: instagram grid */}
                    <div className="lg:col-span-3 flex flex-col gap-4">
                        <div className="bg-white rounded-lg p-4 ring-1 ring-slate-200">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-slate-800">From our Instagram</h4>
                                <Link href="https://www.instagram.com/wecraftmemories01/" target="_blank" className="text-xs text-teal-600 hover:underline">Follow @wecraftmemories</Link>
                            </div>

                            <div className="mt-3">
                                {igLoading ? (
                                    <div className="py-6 text-center text-sm text-slate-500">Loading Instagram…</div>
                                ) : igError ? (
                                    <div className="py-3 text-sm text-rose-600">Couldn't load posts. <Link href="https://www.instagram.com/wecraftmemories01/">Open Instagram</Link></div>
                                ) : instaPosts.length === 0 ? (
                                    <div className="py-4 text-sm text-slate-500">No posts yet. <Link href="https://www.instagram.com/wecraftmemories01/">Open Instagram</Link></div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2">
                                        {instaPosts.map((p) => (
                                            <a key={p._id} href={p.url} target="_blank" rel="noopener noreferrer" className="rounded overflow-hidden bg-gray-100 h-20 flex items-center justify-center" aria-label={p.caption || "Instagram post"}>
                                                {p.thumbnailUrl ? <Thumbnail src={p.thumbnailUrl} alt={p.caption || "Instagram post"} /> : <PlaceholderThumb caption={p.caption} />}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-teal-600 to-teal-500 rounded-lg p-4 text-white">
                            <h4 className="text-base font-semibold">Need a custom gift?</h4>
                            <p className="text-sm text-white/90 mt-2">We make personalized orders. Message us and we'll craft something special.</p>
                            <div className="mt-3 flex gap-2">
                                <Link href="/contact" className="px-3 py-2 bg-white text-teal-700 rounded-md text-sm font-medium">Contact</Link>
                                {/* <button onClick={() => setModalOpen(true)} className="px-3 py-2 bg-white/20 rounded-md text-sm">Get 10% off</button> */}
                            </div>
                        </div>
                    </div>
                </div>

                {/* bottom bar */}
                <div className="border-t border-slate-200 bg-white/70">
                    <div className={`${containerClass} px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-slate-600`}>
                        <div className="flex items-center gap-4">
                            <span>© {new Date().getFullYear()} WeCraftMemories</span>
                            <span className="hidden sm:inline">Made with ❤️ in India</span>
                        </div>

                        <div className="flex items-center gap-4">
                            <Link href="/terms" className="hover:text-teal-600">Terms</Link>
                            <Link href="/privacy" className="hover:text-teal-600">Privacy</Link>
                        </div>
                    </div>
                </div>
            </footer>

            {/* newsletter modal */}
            {/* {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" />
                    <div ref={modalRef} role="dialog" aria-modal="true" className="relative z-10 max-w-md w-full bg-white rounded-lg shadow-lg p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Join our newsletter</h3>
                                <p className="text-sm text-slate-600 mt-1">Subscribe for 10% off and exclusive drops.</p>
                            </div>
                            <button aria-label="Close" onClick={() => setModalOpen(false)} className="p-2 rounded-md text-slate-600 hover:bg-slate-100">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubscribe} className="mt-4">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input id="modal-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourmail.com" className="w-full rounded-lg border border-slate-200 px-10 py-2 text-sm focus:outline-none" />
                                </div>
                                <button type="submit" className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${status === "loading" ? "bg-slate-400 text-white" : "bg-teal-600 text-white hover:bg-teal-700"}`}>
                                    {status === "loading" ? "Joining..." : <><Send size={14} /> Join</>}
                                </button>
                            </div>
                            <div className="mt-3 text-sm min-h-[1.25rem] text-slate-500" aria-live="polite">
                                {status === "ok" && <span className="text-emerald-600">Subscribed — welcome!</span>}
                                {status === "error" && <span className="text-rose-600">Enter a valid email.</span>}
                            </div>
                        </form>
                        <div className="mt-4 text-xs text-slate-400">We respect your privacy. Unsubscribe anytime.</div>
                    </div>
                </div>
            )} */}
        </>
    );
}