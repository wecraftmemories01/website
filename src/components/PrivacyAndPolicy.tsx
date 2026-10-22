import Link from "next/link";
import { ArrowUpRight, LockKeyhole, Mail } from "lucide-react";

const sections = [
    {
        title: "Who we are",
        body: (
            <>
                We Craft Memories operates the website wecraftmemories.com. This
                notice explains how information is handled when you browse our
                handmade gifts, contact us, register for an account or make a
                purchase. For privacy requests, reach us through our{" "}
                <Link href="/contact">contact page</Link>.
            </>
        ),
    },
    {
        title: "Information we collect",
        body: (
            <>
                Depending on what you do, we may collect your name, email
                address, phone number, saved addresses, account identifiers,
                order contents, delivery preferences, gift messages and support
                communications. The website may also receive device, browser,
                IP, approximate location derived from IP, cookie and usage
                information. Please avoid putting sensitive personal details in
                a gift message.
            </>
        ),
    },
    {
        title: "Why we use information",
        body: (
            <>
                We use relevant information to create and manage accounts,
                process purchases, confirm orders, arrange delivery, respond to
                your questions, prevent abuse, maintain records and improve the
                website. Where optional marketing is offered, it should be
                governed by the choices made available to you. We do not
                describe essential order messages as marketing.
            </>
        ),
    },
    {
        title: "Payments and service providers",
        body: (
            <>
                Payment information may be submitted to the payment provider
                selected at checkout. We need transaction status and limited
                payment references to reconcile an order, but you should enter
                card credentials only into the provider's secure payment flow.
                Delivery, email, hosting, analytics, security and technical
                service providers may process only the information relevant to
                the service they perform.
            </>
        ),
    },
    {
        title: "Cookies and analytics",
        body: (
            <>
                The website may use essential browser storage and cookies to
                maintain cart state, session and shopping preferences. If
                configured, it also loads Google Analytics for website
                measurement, and account creation may use Google's reCAPTCHA for
                abuse protection. Non-essential measurement or marketing
                technologies should be enabled only in accordance with
                applicable consent requirements. You can control many cookies in
                your browser; disabling essential storage may affect your cart
                or sign-in.
            </>
        ),
    },
    {
        title: "When information is shared",
        body: (
            <>
                We share information where needed to fulfil an order (for
                example with logistics and payment providers), provide technical
                support, meet a legal obligation, investigate fraud, or respond
                to a lawful request. We do not authorise unrelated third parties
                to use order details for their own independent marketing merely
                because they help fulfil a purchase.
            </>
        ),
    },
    {
        title: "Security and retention",
        body: (
            <>
                We take appropriate administrative and technical measures to
                protect information, but no website or transmission method can
                be guaranteed completely secure. We keep records for as long as
                reasonably required for orders, accounts, legitimate operational
                needs and legal obligations, then delete, anonymise or securely
                archive them as appropriate. Specific retention schedules depend
                on the information and applicable law.
            </>
        ),
    },
    {
        title: "Your choices and requests",
        body: (
            <>
                You may ask us to correct inaccurate account details, review or
                erase eligible information, withdraw consent where consent is
                the basis of processing, or raise a privacy grievance by using
                our <Link href="/contact">contact page</Link>. Some records may
                need to be retained to satisfy tax, financial, fraud-prevention
                or other legal duties. We may verify your identity before
                completing a request. Applicable rights depend on the legal
                provisions in force at the time.
            </>
        ),
    },
    {
        title: "Children and gift recipients",
        body: (
            <>
                Our ordering and account experiences are intended for adults.
                Gift recipients' contact and address information should be
                provided only where you have a legitimate reason to arrange
                delivery. Do not submit children's personal information unless
                necessary and permitted by applicable law.
            </>
        ),
    },
    {
        title: "Links and international services",
        body: (
            <>
                Some website services or links may be operated by other
                companies and governed by their own privacy statements. Service
                providers may host or process data in different locations where
                permitted and subject to appropriate safeguards. Review their
                notices when you use external services.
            </>
        ),
    },
    {
        title: "Policy changes and contact",
        body: (
            <>
                We may update this page as our services, providers and legal
                requirements change. The date at the top shows the most recent
                text revision. For questions, access requests, correction,
                deletion or grievances, use{" "}
                <Link href="/contact">Contact us</Link>.
            </>
        ),
    },
];

export default function PrivacyAndPolicy() {
    return (
        <article className="policy-page max-w-5xl mx-auto py-6 sm:py-12">
            <div className="policy-hero site-gradient site-card p-6 sm:p-10">
                <span className="site-eyebrow">
                    <LockKeyhole size={15} /> YOUR INFORMATION MATTERS
                </span>
                <h1 className="site-section-title !text-3xl sm:!text-4xl mt-5">
                    Privacy Policy
                </h1>
                <p className="text-[#576f79] mt-3 max-w-2xl leading-7">
                    How your data helps us take care of your orders, and the
                    choices available to you.
                </p>
                <p className="text-xs text-[#5f7884] mt-5">
                    Last updated: 21 October 2026 · For customers and website
                    visitors
                </p>
            </div>
            <div className="grid md:grid-cols-[215px_minmax(0,1fr)] gap-7 mt-8 sm:mt-10 items-start">
                <aside className="policy-index site-card p-5 md:sticky md:top-28">
                    <p className="font-extrabold text-sm mb-3 text-[#065975]">
                        On this page
                    </p>
                    <nav aria-label="Privacy sections" className="space-y-1">
                        {sections.map((s, i) => (
                            <a
                                href={`#privacy-${i + 1}`}
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
                            id={`privacy-${i + 1}`}
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
                    <Mail className="text-[#065975] shrink-0" />
                    <div>
                        <h2 className="font-bold text-[#065975]">
                            Questions about your data?
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Get in touch to make a request or raise a concern.
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