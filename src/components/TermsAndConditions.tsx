import Link from "next/link";
import { ArrowUpRight, FileText, HelpCircle } from "lucide-react";

const sections = [
    {
        title: "About these terms",
        body: (
            <>
                These terms describe shopping with{" "}
                <strong>We Craft Memories</strong> at wecraftmemories.com. By
                placing an order, you agree to the terms applicable at checkout.
                Nothing in these terms limits rights available to you under
                applicable Indian consumer law.
            </>
        ),
    },
    {
        title: "Accounts and orders",
        body: (
            <>
                Please provide correct contact, delivery and billing details.
                You are responsible for keeping your account access secure. An
                order is subject to product availability, payment confirmation
                and our acceptance. We may contact you about a missing detail or
                an unavailable item; where an order cannot be fulfilled, we will
                arrange an appropriate resolution or refund.
            </>
        ),
    },
    {
        title: "The nature of handmade goods",
        body: (
            <>
                Our crochet products and curated gift hampers are handmade or
                hand-assembled. Small differences in stitching, texture, yarn
                shade, dimensions and arrangement are natural. These do not
                excuse material defects, damage, incorrect items or a product
                substantially different from the description. Please read each
                product's details and care guidance before ordering.
            </>
        ),
    },
    {
        title: "Pricing and payment",
        body: (
            <>
                Prices are displayed in Indian rupees (INR). Applicable taxes,
                delivery charges and the payable total should be shown before
                you confirm payment. Prices and promotions may change for future
                orders. Payments are handled by the payment methods shown at
                checkout; do not send payment details over unsolicited messages.
            </>
        ),
    },
    {
        title: "Delivery and fulfilment",
        body: (
            <>
                Delivery eligibility, charges and any estimated timelines depend
                on the destination, available stock, processing requirements and
                courier service. Estimates are not guaranteed delivery dates. If
                an order is significantly delayed, missing or arrives damaged,
                please <Link href="/contact">contact us</Link> with your order
                details so we can investigate and provide an appropriate remedy.
            </>
        ),
    },
    {
        title: "Changes and cancellations",
        body: (
            <>
                If you need to change an address or cancel an order, contact us
                promptly. Whether a change is possible depends on whether
                packing, handcrafting or dispatch has started. Personalised
                orders may have additional limitations explained before
                purchase. Any lawful cancellation or refund rights remain
                unaffected.
            </>
        ),
    },
    {
        title: "Returns, issues and refunds",
        body: (
            <>
                Because handmade and personalised items differ, eligibility may
                depend on the item and reason for the request. Please report
                damaged, defective, incorrect or missing goods as soon as
                practical and include clear photographs where helpful. We will
                review the issue and explain the available return, replacement
                or refund process and any collection costs before proceeding. A
                blanket “no returns” rule does not override statutory consumer
                remedies.
            </>
        ),
    },
    {
        title: "Product suitability and safety",
        body: (
            <>
                Some items may contain small parts, embellishments or loose
                fibres and are not suitable for unsupervised use by young
                children. Follow the product's specific suitability and care
                information. Handmade decor and gift items should not be treated
                as safety-certified toys unless expressly identified as such.
            </>
        ),
    },
    {
        title: "Website content and acceptable use",
        body: (
            <>
                Product imagery, writing and original creative work on this site
                are protected where applicable. You may browse and shop for
                personal use, but must not misuse the website, interfere with
                its security or reuse our materials commercially without
                permission.
            </>
        ),
    },
    {
        title: "Service interruptions and errors",
        body: (
            <>
                We try to keep descriptions, stock and prices accurate. If we
                discover an obvious error, we may correct it and contact you
                about an affected order. Features may occasionally be
                unavailable for maintenance or technical reasons. Nothing in
                this section excludes liability that cannot lawfully be
                excluded.
            </>
        ),
    },
    {
        title: "Privacy and communications",
        body: (
            <>
                Your information is handled as described in our{" "}
                <Link href="/privacy">Privacy Policy</Link>. We may use the
                contact details associated with an order for relevant service
                and fulfilment messages. Promotional communications, where
                offered, are handled separately from essential order
                notifications.
            </>
        ),
    },
    {
        title: "Contact and updates",
        body: (
            <>
                For product concerns, order disputes, privacy questions or
                requests for assistance, use our{" "}
                <Link href="/contact">contact page</Link>. These terms may be
                revised as the website evolves. Updated terms will show a new
                revision date, and material changes will not retroactively
                remove rights you already have.
            </>
        ),
    },
];

export default function TermsAndConditions() {
    return (
        <article className="policy-page max-w-5xl mx-auto py-6 sm:py-12">
            <div className="policy-hero site-gradient site-card p-6 sm:p-10">
                <span className="site-eyebrow">
                    <FileText size={15} /> SHOPPING GUIDELINES
                </span>
                <h1 className="site-section-title !text-3xl sm:!text-4xl mt-5">
                    Terms &amp; Conditions
                </h1>
                <p className="text-[#576f79] mt-3 max-w-2xl leading-7">
                    A clear guide to orders, handmade products, delivery and
                    your shopping rights.
                </p>
                <p className="text-xs text-[#5f7884] mt-5">
                    Last updated: 21 October 2026 · Applies to We Craft Memories
                    online shopping
                </p>
            </div>
            <div className="grid md:grid-cols-[215px_minmax(0,1fr)] gap-7 mt-8 sm:mt-10 items-start">
                <aside className="policy-index site-card p-5 md:sticky md:top-28">
                    <p className="font-extrabold text-sm mb-3 text-[#065975]">
                        On this page
                    </p>
                    <nav aria-label="Terms sections" className="space-y-1">
                        {sections.map((s, i) => (
                            <a
                                href={`#terms-${i + 1}`}
                                key={s.title}
                                className="block py-1.5 text-sm text-slate-600 hover:text-[#065975]"
                            >
                                {i + 1}. {s.title}
                            </a>
                        ))}
                    </nav>
                </aside>
                <div className="site-card p-6 sm:p-9 divide-y divide-[#e3ecef]">
                    {sections.map((s, i) => (
                        <section
                            key={s.title}
                            id={`terms-${i + 1}`}
                            className="scroll-mt-32 py-6 first:pt-0 last:pb-0"
                        >
                            <h2 className="text-lg sm:text-xl font-extrabold text-[#065975] mb-3">
                                {i + 1}. {s.title}
                            </h2>
                            <div className="text-sm sm:text-[15px] leading-7 text-slate-600">
                                {s.body}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
            <div className="mt-7 site-card p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-start gap-3">
                    <HelpCircle className="text-[#065975] shrink-0" />
                    <div>
                        <h2 className="font-bold text-[#065975]">
                            Need help with an order?
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            We're happy to help you find the right next step.
                        </p>
                    </div>
                </div>
                <Link href="/contact" className="site-button-outline shrink-0">
                    Contact us <ArrowUpRight size={16} />
                </Link>
            </div>
        </article>
    );
}