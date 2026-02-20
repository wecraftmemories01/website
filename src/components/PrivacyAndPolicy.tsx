"use client";

export default function PrivacyPolicy() {
    return (
        <div className="max-w-6xl mx-auto px-4 py-10 text-slate-700">
            <h1 className="text-3xl font-bold mb-6 text-slate-900">
                Privacy Policy
            </h1>

            <p className="mb-6 text-sm text-slate-500">
                Effective Date: [Insert Date]
            </p>

            {/* 1. Introduction */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
                <p>
                    WeCraftMemories (“Company”, “we”, “us”, “our”) is a registered
                    Partnership Firm operating in India. This Privacy Policy explains
                    how we collect, use, disclose, and safeguard your information when
                    you visit https://wecraftmemories.com and purchase our products.
                </p>
                <p className="mt-3">
                    This Policy is framed in accordance with the Information Technology
                    Act, 2000 and applicable Indian data protection regulations.
                </p>
            </section>

            {/* 2. Information We Collect */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">
                    2. Information We Collect
                </h2>

                <h3 className="font-semibold mt-4 mb-2">a) Personal Information</h3>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Name</li>
                    <li>Email address</li>
                    <li>Mobile number</li>
                    <li>Billing and shipping address</li>
                </ul>

                <h3 className="font-semibold mt-4 mb-2">b) Payment Information</h3>
                <p>
                    Payments are processed securely through third-party payment
                    gateways. We do not store your debit/credit card details.
                </p>

                <h3 className="font-semibold mt-4 mb-2">c) Technical Data</h3>
                <ul className="list-disc pl-6 space-y-2">
                    <li>IP address</li>
                    <li>Browser type</li>
                    <li>Device information</li>
                    <li>Cookies and usage data</li>
                </ul>
            </section>

            {/* 3. How We Use Your Information */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">
                    3. How We Use Your Information
                </h2>
                <ul className="list-disc pl-6 space-y-2">
                    <li>To process and fulfill orders</li>
                    <li>To provide customer support</li>
                    <li>To send order confirmations and shipping updates</li>
                    <li>To send password resets and account notifications</li>
                    <li>To improve our website and services</li>
                    <li>To prevent fraud and enhance security</li>
                    <li>To send marketing emails (only if opted-in)</li>
                </ul>
            </section>

            {/* 4. Email Communications */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">
                    4. Email Communications
                </h2>
                <p>
                    We use secure email service providers (such as Amazon SES)
                    to send transactional emails including:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>Order confirmations</li>
                    <li>Shipping notifications</li>
                    <li>Password reset emails</li>
                    <li>Email verification links</li>
                </ul>
                <p className="mt-3">
                    You may opt out of promotional emails at any time using
                    the unsubscribe link.
                </p>
            </section>

            {/* 5. Cookies */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">
                    5. Cookies & Tracking Technologies
                </h2>
                <p>
                    We use cookies and similar technologies to enhance user
                    experience, analyze website traffic, and improve services.
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>Essential cookies for website functionality</li>
                    <li>Analytics cookies</li>
                    <li>Security cookies (via Cloudflare)</li>
                </ul>
                <p className="mt-3">
                    You may disable cookies in your browser settings, though
                    some website features may not function properly.
                </p>
            </section>

            {/* 6. Data Sharing */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">
                    6. Sharing of Information
                </h2>
                <p>We may share your information with:</p>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>Payment gateway providers</li>
                    <li>Courier and logistics partners</li>
                    <li>Cloud hosting providers (AWS)</li>
                    <li>Security & CDN providers (Cloudflare)</li>
                    <li>Email service providers</li>
                </ul>
                <p className="mt-3 font-medium">
                    We do not sell or rent your personal data.
                </p>
            </section>

            {/* 7. Data Security */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">
                    7. Data Security
                </h2>
                <ul className="list-disc pl-6 space-y-2">
                    <li>SSL encryption is used to protect data transmission.</li>
                    <li>Data is stored on secure cloud infrastructure (AWS).</li>
                    <li>Access to personal data is restricted.</li>
                    <li>Security monitoring is implemented.</li>
                </ul>
            </section>

            {/* 8. Data Retention */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">
                    8. Data Retention
                </h2>
                <p>
                    We retain personal data only as long as necessary for:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>Order fulfillment</li>
                    <li>Legal compliance (including tax laws)</li>
                    <li>Dispute resolution</li>
                </ul>
            </section>

            {/* 9. Your Rights */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">
                    9. Your Rights
                </h2>
                <p>Under applicable Indian law, you may have the right to:</p>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>Access your personal information</li>
                    <li>Request correction of inaccurate data</li>
                    <li>Withdraw consent for marketing communications</li>
                </ul>
                <p className="mt-3">
                    To exercise these rights, contact us using the details below.
                </p>
            </section>

            {/* 10. Children's Privacy */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">
                    10. Children's Privacy
                </h2>
                <p>
                    Our website is not intended for children under 13 years of age.
                    We do not knowingly collect personal data from minors.
                </p>
            </section>

            {/* 11. Grievance Officer */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">
                    11. Grievance Officer
                </h2>
                <p>
                    In compliance with the Information Technology Act, 2000:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                    {/* <li>Name: Varun Kotian</li> */}
                    <li>Email: support@wecraftmemories.com</li>
                    {/* <li>Address: [Insert Address]</li> */}
                    <li>Response Time: Within 15 working days</li>
                </ul>
            </section>

            {/* 12. Changes */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">
                    12. Changes to This Policy
                </h2>
                <p>
                    We reserve the right to update this Privacy Policy at any time.
                    Updated versions will be posted on this page with a revised
                    effective date.
                </p>
            </section>

            {/* Contact */}
            <section className="border-t pt-6 mt-8">
                <h2 className="text-xl font-semibold mb-3">
                    Contact Information
                </h2>
                <p>
                    WeCraftMemories<br />
                    Email: support@wecraftmemories.com<br />
                    {/* Registered Address: [Insert Registered Address] */}
                </p>
            </section>
        </div>
    );
}