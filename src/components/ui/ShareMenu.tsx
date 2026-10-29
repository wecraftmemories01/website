"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
    Check, Copy, ExternalLink, Facebook, Instagram, Link2, Mail,
    MessageCircle, Send, Share2, Smartphone, Twitter, X,
} from "lucide-react";

type ShareMenuProps = {
    kind: "product" | "hamper" | "stall";
    title: string;
    /** An absolute path to the SEO-friendly public page (without tracking query strings). */
    path: string;
    description?: string;
    className?: string;
};

const SITE_ORIGIN = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://wecraftmemories.com"
).replace(/\/+$/, "");

const optionClass =
    "flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border border-[#e0e9e6] bg-white px-2 py-3 text-center text-xs font-bold text-[#284c51] transition hover:-translate-y-0.5 hover:border-[#93cac5] hover:bg-[#f1faf8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087b86]";

/** Native sharing + explicit social destinations, reused on all detail pages. */
export default function ShareMenu({ kind, title, path, description, className = "" }: ShareMenuProps) {
    const [open, setOpen] = useState(false);
    const [canNativeShare, setCanNativeShare] = useState(false);
    const [copied, setCopied] = useState(false);
    const [notice, setNotice] = useState("");
    const headingId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    const openerRef = useRef<HTMLButtonElement>(null);
    const linkRef = useRef<HTMLInputElement>(null);

    // Always share the public, canonical path — never checkout state or tracking params.
    const safePath = path.startsWith("/") && !path.startsWith("//") ? path : "/";
    const shareUrl = new URL(safePath, SITE_ORIGIN).toString();
    const shareTitle = kind === "stall" ? `Visit us at ${title} | We Craft Memories` : `${title} | We Craft Memories`;
    const shareText = kind === "stall"
        ? `Come visit We Craft Memories at ${title}!${description ? ` ${description}` : ""}`
        : `Check out ${title} at We Craft Memories!`;
    const textWithLink = `${shareText}\n${shareUrl}`;

    useEffect(() => {
        setCanNativeShare(typeof navigator.share === "function");
    }, []);

    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        dialogRef.current?.focus();

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
            }
            if (event.key !== "Tab" || !dialogRef.current) return;
            const focusables = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), a[href], input:not([disabled])'
            ));
            if (!focusables.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", onKeyDown);
            openerRef.current?.focus();
        };
    }, [open]);

    function openDialog() {
        setCopied(false);
        setNotice("");
        setOpen(true);
    }

    async function copyLink(): Promise<boolean> {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareUrl);
            } else {
                // Support browsers without Clipboard API (typically older/insecure contexts).
                const temporary = document.createElement("textarea");
                temporary.value = shareUrl;
                temporary.style.position = "fixed";
                temporary.style.opacity = "0";
                document.body.appendChild(temporary);
                temporary.select();
                const copiedOk = document.execCommand("copy");
                temporary.remove();
                if (!copiedOk) throw new Error("Copy failed");
            }
            setCopied(true);
            setNotice("Link copied to clipboard.");
            return true;
        } catch {
            linkRef.current?.focus();
            linkRef.current?.select();
            setNotice("Select and copy the link shown below.");
            return false;
        }
    }

    function openSocial(url: string) {
        window.open(url, "_blank", "noopener,noreferrer");
    }

    async function shareNatively() {
        if (typeof navigator.share !== "function") return;
        try {
            await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
            setOpen(false);
        } catch (error) {
            // Closing the system share sheet is normal, not an error.
            if ((error as Error)?.name !== "AbortError") {
                setNotice("Sharing isn't available right now. Choose an app or copy the link instead.");
            }
        }
    }

    async function shareOnInstagram() {
        // Instagram has no supported browser URL for pre-filling a post or DM with a link.
        // Open the Instagram inbox on the click (before awaiting clipboard permissions).
        // The link can then be pasted into a DM; browsers cannot pre-fill an Instagram DM.
        window.open("https://www.instagram.com/direct/inbox/", "_blank", "noopener,noreferrer");
        const didCopy = await copyLink();
        if (didCopy) {
            setNotice("Link copied! Paste it into an Instagram message. Instagram doesn't support direct link sharing from websites.");
        }
    }

    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);

    return (
        <>
            <button
                ref={openerRef}
                type="button"
                onClick={openDialog}
                className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#cce2dd] bg-white px-4 py-2 text-[13px] font-extrabold text-[#086b75] shadow-sm transition hover:border-[#7ebdb7] hover:bg-[#eff9f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087b86] ${className}`}
                aria-label={`Share ${kind}: ${title}`}
                aria-haspopup="dialog"
            >
                <Share2 size={17} aria-hidden="true" /> Share
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-[200] flex items-end justify-center bg-[#092e35]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
                    onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
                >
                    <div
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={headingId}
                        tabIndex={-1}
                        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-[28px] border border-[#dceae5] bg-[#f8fbf9] p-5 shadow-[0_30px_90px_rgba(0,0,0,.24)] outline-none sm:max-w-[465px] sm:rounded-[28px] sm:p-6"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-[#9a6c4f]">Spread the joy</p>
                                <h2 id={headingId} className="mt-1 text-xl font-extrabold tracking-tight text-[#17444a]">
                                    Share this {kind}
                                </h2>
                                <p className="mt-1 truncate text-sm text-[#61777a]" title={title}>{title}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                aria-label="Close share options"
                                className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-[#43666c] hover:bg-[#e8f2ef] focus-visible:outline-2 focus-visible:outline-[#087b86]"
                            >
                                <X size={19} />
                            </button>
                        </div>

                        {canNativeShare && (
                            <button
                                type="button"
                                onClick={() => void shareNatively()}
                                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#087b86] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#06656e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087b86]"
                            >
                                <Smartphone size={18} /> Share via your apps
                            </button>
                        )}

                        <div className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-3" aria-label="Social sharing options">
                            <button type="button" className={optionClass} onClick={() => openSocial(`https://wa.me/?text=${encodeURIComponent(textWithLink)}`)}>
                                <span className="grid size-10 place-items-center rounded-full bg-[#e7f8ed] text-[#168649]"><MessageCircle size={23} /></span>
                                WhatsApp
                            </button>
                            <button type="button" className={optionClass} onClick={() => openSocial(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)}>
                                <span className="grid size-10 place-items-center rounded-full bg-[#e9f0ff] text-[#2363b1]"><Facebook size={23} /></span>
                                Facebook
                            </button>
                            <button type="button" className={optionClass} onClick={() => void shareOnInstagram()}>
                                <span className="grid size-10 place-items-center rounded-full bg-[#fceaf3] text-[#bd3976]"><Instagram size={23} /></span>
                                Instagram <span className="-mt-1 text-[10px] font-medium text-[#74888b]">Copy &amp; open</span>
                            </button>
                            <button type="button" className={optionClass} onClick={() => openSocial(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`)}>
                                <span className="grid size-10 place-items-center rounded-full bg-[#e7f6fc] text-[#2784b6]"><Send size={22} /></span>
                                Telegram
                            </button>
                            <button type="button" className={optionClass} onClick={() => openSocial(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`)}>
                                <span className="grid size-10 place-items-center rounded-full bg-[#edf0f2] text-[#30444c]"><Twitter size={21} /></span>
                                X / Twitter
                            </button>
                            <a className={optionClass} href={`mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(textWithLink)}`}>
                                <span className="grid size-10 place-items-center rounded-full bg-[#fff0e7] text-[#a76339]"><Mail size={22} /></span>
                                Email
                            </a>
                        </div>

                        <div className="mt-5 rounded-2xl border border-[#e0eae5] bg-white p-3">
                            <label htmlFor={`${headingId}-link`} className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-[#355b5e]">
                                <Link2 size={14} /> Shareable link
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    ref={linkRef}
                                    id={`${headingId}-link`}
                                    type="text"
                                    readOnly
                                    value={shareUrl}
                                    onFocus={(event) => event.currentTarget.select()}
                                    className="min-w-0 flex-1 rounded-lg bg-[#f5f8f6] px-3 py-2.5 text-xs text-[#547176] outline-none focus:ring-2 focus:ring-[#087b86]"
                                />
                                <button
                                    type="button"
                                    onClick={() => void copyLink()}
                                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#e5f4f1] px-3 text-xs font-extrabold text-[#087b86] hover:bg-[#d0eae5] focus-visible:outline-2 focus-visible:outline-[#087b86]"
                                >
                                    {copied ? <Check size={15} /> : <Copy size={15} />}
                                    {copied ? "Copied" : "Copy"}
                                </button>
                            </div>
                            {notice && <p aria-live="polite" className="mt-2 text-xs leading-5 text-[#28727a]">{notice}</p>}
                        </div>
                        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-4 text-[#829397]">
                            <ExternalLink size={12} className="mt-0.5 shrink-0" />
                            Instagram links can be pasted into DMs; other apps open their sharing screen.
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
