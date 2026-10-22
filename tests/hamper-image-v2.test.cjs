const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript");

const base = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(base, file), "utf8");
const helperSource = read("src/lib/hamperDisplay.ts");
const output = ts.transpileModule(helperSource, {
    compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
    },
}).outputText;
function resolve(image, env = {}) {
    const exports = {};
    vm.runInNewContext(output, { exports, URL, process: { env } });
    return exports.resolveHamperImageUrl(image);
}
test("matches customer API payload: localhost:3000 hamper photo", () => {
    assert.equal(
        resolve(
            "http://localhost:3000/uploads/hampers2/027bf7ef-f755-445e-97ab-e2d8fdbe6755.jpg",
            { NEXT_PUBLIC_API_BASE: "http://localhost:3000/v1" },
        ),
        "http://localhost:3000/uploads/hampers2/027bf7ef-f755-445e-97ab-e2d8fdbe6755.jpg",
    );
});
test("matches customer API payload: included product photos", () => {
    assert.equal(
        resolve(
            "http://localhost:3000/uploads/products1/7e50b4a7-531b-494c-98d3-f3d6f184ffde.jpg",
            { NEXT_PUBLIC_API_BASE: "http://localhost:3000/v1" },
        ),
        "http://localhost:3000/uploads/products1/7e50b4a7-531b-494c-98d3-f3d6f184ffde.jpg",
    );
});
test("do not accidentally remap a correct localhost:3000 API image to localhost:3002", () => {
    assert.equal(
        resolve("http://localhost:3000/uploads/products5/photo.jpg", {
            NEXT_PUBLIC_API_BASE: "http://localhost:3002/v1",
        }),
        "http://localhost:3000/uploads/products5/photo.jpg",
    );
});
test("preserve absolute API image when API base is a relative proxy", () => {
    assert.equal(
        resolve("http://localhost:3000/uploads/hampers2/photo.jpg", {
            NEXT_PUBLIC_API_BASE: "/v1",
        }),
        "http://localhost:3000/uploads/hampers2/photo.jpg",
    );
});
test("private localhost URLs are rewritten when configured API points to production", () => {
    assert.equal(
        resolve("http://localhost:3000/uploads/products5/photo.jpg", {
            NEXT_PUBLIC_API_BASE: "https://api.wecraftmemories.com/v1",
        }),
        "https://api.wecraftmemories.com/uploads/products5/photo.jpg",
    );
});
test("configured public API fixes HTTP mixed-content URL from a proxy", () => {
    assert.equal(
        resolve("http://api.wecraftmemories.com/uploads/hampers2/a.jpg?size=2", {
            NEXT_PUBLIC_API_BASE: "https://api.wecraftmemories.com/v1",
        }),
        "https://api.wecraftmemories.com/uploads/hampers2/a.jpg?size=2",
    );
});
test("relative upload paths use the API origin without /v1", () => {
    assert.equal(
        resolve("uploads/products2/photo.jpg", {
            NEXT_PUBLIC_API_BASE: "http://localhost:3000/v1",
        }),
        "http://localhost:3000/uploads/products2/photo.jpg",
    );
});
test("optional dedicated image origin overrides bad URL from API", () => {
    assert.equal(
        resolve("http://localhost:3000/uploads/hampers2/photo.jpg", {
            NEXT_PUBLIC_API_BASE: "https://api.wecraftmemories.com/v1",
            NEXT_PUBLIC_HAMPER_IMAGE_ORIGIN: "https://static.wecraftmemories.com",
        }),
        "https://static.wecraftmemories.com/uploads/hampers2/photo.jpg",
    );
});
test("reject unsafe URI schemes", () => {
    assert.equal(resolve("javascript:alert(1)"), null);
    assert.equal(resolve("data:image/svg+xml,test"), null);
});
test("Next image optimization is enabled for hamper and included-product photos", () => {
    const component = read("src/components/HamperMediaImage.tsx");
    assert.match(component, /import Image from ['\"]next\/image['\"]/);
    assert.match(component, /<Image\s/);
    assert.doesNotMatch(component, /^\s+unoptimized\b/m);
    assert.match(component, /onError=\{\(\) => setFailedUrl\(imageUrl\)\}/);
});
test("Next config permits localhost API photo paths and configured API host", () => {
    const config = read("next.config.ts");
    assert.match(config, /hostname:\s*'localhost',\s*port:\s*'3000'/);
    assert.match(config, /NEXT_PUBLIC_API_BASE/);
    assert.match(config, /pathname:\s*'\/uploads\/\*\*'/);
    assert.match(
        config,
        /dangerouslyAllowLocalIP:\s*process\.env\.NODE_ENV\s*!==\s*'production'/,
    );
});
test("all revised sources parse as TS/TSX", () => {
    for (const file of [
        "src/components/HamperMediaImage.tsx",
        "src/lib/hamperDisplay.ts",
        "next.config.ts",
    ]) {
        const parsed = ts.createSourceFile(
            file,
            read(file),
            ts.ScriptTarget.Latest,
            true,
            file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
        );
        assert.equal(
            parsed.parseDiagnostics.length,
            0,
            `${file}: ${parsed.parseDiagnostics.map((d) => d.messageText).join(", ")}`,
        );
    }
});