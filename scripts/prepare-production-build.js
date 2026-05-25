const fs = require("fs");
const path = require("path");

const buildArtifacts = [".next", "tsconfig.tsbuildinfo"];

for (const artifact of buildArtifacts) {
  const targetPath = path.join(process.cwd(), artifact);
  fs.rmSync(targetPath, { force: true, recursive: true });
}

console.log("[build] Cleared cached Next.js artifacts before production build.");
