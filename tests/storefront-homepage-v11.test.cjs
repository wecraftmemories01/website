const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('desktop filters are an independently toggled left sidebar with clear next to toggle', () => {
    const src = read('src/components/ProductsClient.tsx');
    const clearPos = src.indexOf('aria-label="Clear all product filters"');
    const togglePos = src.indexOf('aria-controls="desktop-product-filters"');
    const sortPos = src.indexOf('aria-label="Sort products on this page"');
    assert.ok(togglePos > -1 && clearPos > togglePos && clearPos < sortPos);
    assert.match(src, /lg:grid-cols-\[276px_minmax\(0,1fr\)\]/);
    assert.match(src, /variant="sidebar"/);
    assert.match(src, /setDrawerOpen\(true\)/);
    assert.doesNotMatch(src, /max-h-\[calc\(100dvh/);
    assert.match(read('src/components/ProductGrid.tsx'), /sidebarOpen/);
});

test('homepage shows public API hampers and dynamic-ready photo gallery', () => {
    const homepage = read('src/app/page.tsx');
    const hampers = read('src/components/HomeHamperGrid.tsx');
    const gallery = read('src/components/HomeGallery.tsx');
    assert.match(homepage, /<HomeHamperGrid \/>/);
    assert.match(hampers, /listHampers\(1, 8\)/);
    assert.match(hampers, /hamperPath\(hamper\)/);
    assert.match(hampers, /HamperMediaImage/);
    assert.match(gallery, /items = DEFAULT_PHOTOS/);
    assert.match(gallery, /expanded \? photos : photos\.slice/);
    assert.match(gallery, /role="dialog"/);
    assert.match(gallery, /ArrowRight/);
    assert.match(read('src/components/HomeCollections.tsx'), /theme\/top_themes/);
});

test('all replacement TSX sources parse', () => {
    const files = [
        'src/components/ProductsClient.tsx','src/components/SidebarFilters.tsx',
        'src/components/ProductGrid.tsx','src/components/ProductCardClient.tsx',
        'src/components/HomeCollections.tsx','src/components/HomeHamperGrid.tsx',
        'src/components/HomeGallery.tsx','src/components/HomeProductGrid.tsx',
        'src/app/page.tsx',
    ];
    for (const file of files) {
        const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
        assert.equal(source.parseDiagnostics.length, 0, `${file}: ${source.parseDiagnostics.map(x => x.messageText).join(', ')}`);
    }
});
