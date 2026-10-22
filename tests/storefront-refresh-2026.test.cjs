const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (name) =>
    fs.readFileSync(path.join(__dirname, "..", name), "utf8");

test("product filters preserve empty matches, URL selections and responsive drawer scroll lock", () => {
    const src = read("src/components/ProductsClient.tsx");
    const filters = read("src/components/SidebarFilters.tsx");
    assert.match(src, /readyFilters\.filtered && !readyFilters\.ids\.length/);
    assert.match(src, /setProducts\(\[\]\)/);
    for (const param of ["master", "super", "category", "sub", "age", "theme"])
        assert.ok(src.includes(`toggleSelection("${param}", id)`), param);
    assert.match(src, /style\.position = "fixed"/);
    assert.match(src, /style\.overflow = "hidden"/);
    assert.match(src, /overscrollBehavior: "contain"/);
    assert.match(src, /setFiltersOpen\(\(open\) => !open\)/);
    assert.match(src, /id="desktop-product-filters"/);
    assert.match(src, /id="mobile-product-filters"/);
    assert.match(src, /aria-label="Clear all product filters"/);
    assert.doesNotMatch(src, /max-h-\[calc\(100dvh/);
    assert.match(filters, /Search gifts/);
    assert.match(filters, /Price range/);
    assert.match(read("src/app/layout.tsx"), /max-w-\[1760px\]/);
});

test("products and hampers retain visible cart call to actions on smaller displays", () => {
    const product = read("src/components/ProductDetails.tsx");
    const hamper = read("src/app/hampers/[slug]/page.tsx");
    assert.match(product, /product-mobile-dock/);
    assert.match(product, /wcm-buy-dock/);
    assert.match(hamper, /wcm-buy-dock/);
    assert.match(hamper, /onClick=\{add\}/);
    assert.ok(
        hamper.indexOf("hamper-purchase-panel") < hamper.indexOf("What’s inside"),
    );
});

test("account pages share brand panel and support a single coherent palette", () => {
    for (const file of [
        "LoginClient",
        "RegisterClient",
        "ForgotPasswordClient",
        "ResetPasswordClient",
    ]) {
        assert.match(read(`src/components/${file}.tsx`), /<AuthStoryPanel kind=/);
    }
    assert.match(read("src/app/globals.css"), /\.auth-shell/);
});

test("legal copy, footer and optional analytics are connected", () => {
    assert.match(
        read("src/components/TermsAndConditions.tsx"),
        /21 October 2026/,
    );
    assert.match(read("src/components/PrivacyAndPolicy.tsx"), /21 October 2026/);
    assert.match(
        read("src/components/layout/Footer.tsx"),
        /CookieSettingsButton/,
    );
    const consent = read("src/components/AnalyticsConsent.tsx");
    assert.match(consent, /choice === "yes" && <GoogleAnalytics/);
    assert.match(consent, /Allow analytics/);
    assert.match(consent, /Essential only/);
});