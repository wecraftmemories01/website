// Remove only Next.js-generated route type declarations, never application source.
// This prevents stale references to deleted or renamed routes from breaking tsc.
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

for (const relativePath of [".next/types", ".next/dev/types"]) {
  const generatedDirectory = path.join(projectRoot, relativePath);
  fs.rmSync(generatedDirectory, { recursive: true, force: true });
}

console.log("Cleared stale generated Next.js route types.");
