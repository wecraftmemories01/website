// components/InstagramWidgetRobust.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * InstagramWidgetRobust
 * - lazy loads iframe when it enters viewport
 * - times out if iframe never loads
 * - renders fallback: Follow button + optional official post embeds
 *
 * Props:
 * - widgetSrc: iframe URL from LightWidget/SnapWidget/etc (optional)
 * - postUrls: optional array of specific Instagram post URLs (official embed fallback)
 * - aspectRatio: percent for container (default 66.66 => 3:2 visual)
 * - timeoutMs: time to wait for iframe load before fallback (default 6000ms)
 */
export default function InstagramWidgetRobust({
    widgetSrc,
    postUrls = [],
    aspectRatio = 66.66,
    timeoutMs = 6000,
}: {
    widgetSrc?: string;
    postUrls?: string[];
    aspectRatio?: number;
    timeoutMs?: number;
}) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    const [isVisible, setIsVisible] = useState(false); // for lazy-loading
    const [loading, setLoading] = useState(Boolean(widgetSrc));
    const [failed, setFailed] = useState(false);
    const timerRef = useRef<number | null>(null);

    // IntersectionObserver to lazy-load when container visible
    useEffect(() => {
        if (!containerRef.current) return;
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsVisible(true);
                        io.disconnect();
                    }
                });
            },
            { rootMargin: "200px" } // pre-load slightly before visible
        );
        io.observe(containerRef.current);
        return () => io.disconnect();
    }, []);

    // start load timeout if widgetSrc and isVisible
    useEffect(() => {
        if (!widgetSrc || !isVisible) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setFailed(false);

        // set a timeout — if iframe onLoad doesn't fire in time, mark failed
        timerRef.current = window.setTimeout(() => {
            if (!iframeRef.current || !iframeRef.current.contentWindow) {
                console.warn("[InstagramWidgetRobust] iframe load timed out");
                setFailed(true);
                setLoading(false);
            }
        }, timeoutMs);

        return () => {
            if (timerRef.current) {
                window.clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [widgetSrc, isVisible, timeoutMs]);

    const onIFrameLoad = () => {
        // iframe fired load — success
        setLoading(false);
        setFailed(false);
        if (timerRef.current) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        console.info("[InstagramWidgetRobust] iframe loaded successfully");
    };

    // Fallback renderer: official Instagram post embed blockquote
    const InstagramPostEmbed: React.FC<{ url: string }> = ({ url }) => {
        useEffect(() => {
            // inject or run instagram embed processor
            try {
                if (!(window as any).instgrm) {
                    const s = document.createElement("script");
                    s.src = "//www.instagram.com/embed.js";
                    s.async = true;
                    document.body.appendChild(s);
                    s.onload = () => {
                        try { (window as any).instgrm?.Embeds?.process(); } catch { }
                    };
                } else {
                    try { (window as any).instgrm?.Embeds?.process(); } catch { }
                }
            } catch (err) {
                // ignore script injection errors
                console.warn("[InstagramPostEmbed] embed script error", err);
            }
        }, [url]);

        return (
            <blockquote
                className="instagram-media"
                data-instgrm-permalink={url}
                data-instgrm-version="14"
                style={{ background: "transparent" }}
            />
        );
    };

    // if widgetSrc present and not failed, show the iframe (but only after visible)
    const showIframe = widgetSrc && !failed && isVisible;

    return (
        <div ref={containerRef} className="w-full">
            {showIframe && (
                <div className="relative w-full" style={{ paddingTop: `${aspectRatio}%` }}>
                    {loading && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70">
                            <div className="text-sm text-slate-600">Loading Instagram…</div>
                        </div>
                    )}
                    <iframe
                        ref={iframeRef}
                        src={widgetSrc}
                        title="Instagram feed"
                        scrolling="no"
                        onLoad={onIFrameLoad}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            border: "0",
                        }}
                    />
                </div>
            )}

            {/* If no widgetSrc yet, or iframe failed, show fallback */}
            {(failed || !widgetSrc) && (
                <div className="bg-white rounded-md p-3 ring-1 ring-slate-200 text-slate-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-semibold">Follow us on Instagram</h4>
                            <p className="text-xs text-slate-500 mt-1">See our latest product photos and behind-the-scenes.</p>
                        </div>

                        <a
                            href="https://www.instagram.com/wecraftmemories01/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-400 text-white px-3 py-2 rounded-md text-sm"
                        >
                            Open Instagram
                        </a>
                    </div>

                    {postUrls && postUrls.length > 0 ? (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            {postUrls.slice(0, 4).map((u) => <InstagramPostEmbed key={u} url={u} />)}
                        </div>
                    ) : (
                        <div className="mt-3 text-xs text-slate-500">
                            Widget failed to load. Try regenerating your widget URL from the provider or use official post embeds as a fallback.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}