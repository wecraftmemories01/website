"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { plainTextFromHtml } from "@/lib/hamperDisplay";

/** Safely render the HTML saved by the existing rich-text product editor. */
export default function HamperRichDescription({ html }: { html: string }) {
    // Render identical, safe plain text on the server and for first client paint.
    // DOMPurify uses the browser DOM, so sanitize only after hydration.
    const [sanitized, setSanitized] = useState<string | null>(null);
    useEffect(() => {
        setSanitized(
            DOMPurify.sanitize(html, {
                ALLOWED_TAGS: [
                    "p",
                    "br",
                    "strong",
                    "b",
                    "em",
                    "i",
                    "u",
                    "s",
                    "h2",
                    "h3",
                    "h4",
                    "ul",
                    "ol",
                    "li",
                    "blockquote",
                    "a",
                    "span",
                ],
                ALLOWED_ATTR: ["href", "title"],
            }),
        );
    }, [html]);

    if (sanitized === null)
        return (
            <p className="text-slate-600 whitespace-pre-line">
                {plainTextFromHtml(html)}
            </p>
        );
    return (
        <div
            className="prose prose-slate max-w-none text-slate-700 prose-headings:text-slate-900 prose-a:text-[#065975]"
            dangerouslySetInnerHTML={{ __html: sanitized }}
        />
    );
}