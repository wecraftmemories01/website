"use client";

export default function TermsAndConditions() {
    return (
        <div className="max-w-6xl mx-auto px-4 py-10 text-slate-700">
            <h1 className="text-3xl font-bold mb-6 text-slate-900">
                Terms & Conditions
            </h1>

            <p className="mb-6 text-sm text-slate-500">
                Effective Date: 21st Feb 2026
            </p>

            {/* 1. Introduction */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
                <p>
                    Welcome to <strong>WeCraftMemories</strong>, a registered
                    Partnership Firm incorporated under the laws of India.
                    These Terms & Conditions govern your use of our website
                    https://wecraftmemories.com and the purchase of our products.
                </p>
                <p className="mt-3">
                    By accessing or using this website, you agree to be legally
                    bound by these Terms in accordance with the Indian Contract
                    Act, 1872 and other applicable laws in India.
                </p>
            </section>

            {/* 2. Eligibility */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">2. Eligibility</h2>
                <ul className="list-disc pl-6 space-y-2">
                    <li>You must be at least 18 years old.</li>
                    <li>You are capable of entering into legally binding contracts.</li>
                    <li>You provide accurate and complete information.</li>
                </ul>
            </section>

            {/* 3. Nature of Products */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">3. Nature of Products</h2>
                <p>
                    We sell handmade crochet products including crochet flowers,
                    flower pots, keychains, hair accessories, pouches, toys,
                    and custom crochet creations.
                </p>
                <p className="mt-3">
                    As all items are handmade:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>Slight variations in size, stitching, and finishing may occur.</li>
                    <li>Colors may vary slightly due to screen settings or yarn batches.</li>
                    <li>Measurements are approximate.</li>
                </ul>
                <p className="mt-3">
                    These variations are natural and not considered defects.
                </p>
            </section>

            {/* 4. Custom Orders */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">4. Custom Orders</h2>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Custom orders cannot be cancelled once production begins.</li>
                    <li>Custom products are non-refundable unless defective.</li>
                    <li>Production timelines will be communicated at confirmation.</li>
                    <li>Minor handmade variations may occur.</li>
                </ul>
            </section>

            {/* 5. Pricing & Payments */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">5. Pricing & Payments</h2>
                <ul className="list-disc pl-6 space-y-2">
                    <li>All prices are listed in INR (Indian Rupees).</li>
                    <li>Applicable GST will be charged as per Indian law.</li>
                    <li>Payments must be completed before order processing.</li>
                    <li>We do not store debit/credit card information.</li>
                    <li>We reserve the right to modify prices at any time.</li>
                </ul>
            </section>

            {/* 6. Shipping & Delivery */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">6. Shipping & Delivery</h2>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Orders are processed within 3–7 business days.</li>
                    <li>Custom orders may require additional processing time.</li>
                    <li>Delivery timelines depend on courier partners.</li>
                    <li>We are not responsible for courier delays beyond our control.</li>
                </ul>
            </section>

            {/* 7. Cancellation Policy */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">7. Cancellation Policy</h2>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Orders may be cancelled before dispatch.</li>
                    <li>Orders cannot be cancelled once shipped.</li>
                    <li>Custom orders cannot be cancelled after production begins.</li>
                </ul>
            </section>

            {/* 8. Returns & Refunds */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">
                    8. Returns, Refunds & Exchanges
                </h2>
                <p>
                    This policy is framed in accordance with the Consumer
                    Protection Act, 2019.
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>Return requests must be raised within 7 days of delivery.</li>
                    <li>Items must be unused and in original condition.</li>
                    <li>Custom and personalized items are non-returnable.</li>
                    <li>Hair accessories are non-returnable for hygiene reasons.</li>
                </ul>
            </section>

            {/* 9. Product Safety */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">
                    9. Product Care & Safety Disclaimer
                </h2>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Crochet products should be handled with care.</li>
                    <li>Items with small parts may pose choking hazards.</li>
                    <li>Not suitable for unsupervised children under 3 years.</li>
                    <li>We are not liable for misuse of products.</li>
                </ul>
            </section>

            {/* 10. Intellectual Property */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">
                    10. Intellectual Property
                </h2>
                <p>
                    All designs, images, logos, text, and content on this website
                    are the intellectual property of WeCraftMemories and may not
                    be copied or reproduced without written permission.
                </p>
            </section>

            {/* 11. Limitation of Liability */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">
                    11. Limitation of Liability
                </h2>
                <p>
                    To the fullest extent permitted under Indian law, our liability
                    shall not exceed the purchase price of the product. We are not
                    liable for indirect or consequential damages.
                </p>
            </section>

            {/* 12. Governing Law */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">
                    12. Governing Law & Jurisdiction
                </h2>
                <p>
                    These Terms shall be governed by the laws of India.
                    All disputes shall be subject to the exclusive jurisdiction
                    of courts located in [Insert City, State].
                </p>
            </section>

            {/* 13. Grievance Officer */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">
                    13. Grievance Officer
                </h2>
                <p>
                    In accordance with the Information Technology Act, 2000:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>Name: [Insert Name]</li>
                    <li>Email: [Insert Email]</li>
                    <li>Address: [Insert Address]</li>
                    <li>Response Time: Within 15 working days</li>
                </ul>
            </section>

            {/* 14. Amendments */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-3">
                    14. Amendments
                </h2>
                <p>
                    We reserve the right to update these Terms at any time.
                    Continued use of the website constitutes acceptance of the
                    updated Terms.
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
                    {/* Registered Address: [Insert Address] */}
                </p>
            </section>
        </div>
    );
}