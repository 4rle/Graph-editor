import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, cp, symlink, rm, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// Reproduce Workers Builds without a build cache or pre-generated dist.
const root = process.cwd();
const fixture = await mkdtemp(path.join(tmpdir(), "graph-clean-deploy-"));
try {
  for (const file of [
    "src",
    "assets",
    "index.html",
    "build.mjs",
    "package.json",
    "package-lock.json",
    "wrangler.jsonc",
  ])
    await cp(path.join(root, file), path.join(fixture, file), {
      recursive: true,
    });
  await symlink(
    path.join(root, "node_modules"),
    path.join(fixture, "node_modules"),
    "dir",
  );
  await assert.rejects(stat(path.join(fixture, "dist")), { code: "ENOENT" });
  await new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["--no-install", "wrangler", "deploy", "--dry-run"],
      {
        cwd: fixture,
        env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
        stdio: "inherit",
      },
    );
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(Error("Clean deploy failed: " + code)),
    );
  });
  const manifest = JSON.parse(
    await readFile(path.join(fixture, "dist/build-manifest.json"), "utf8"),
  );
  for (const file of [
    ...manifest.files,
    manifest.entry,
    "native.css",
    "color/lcms.wasm",
    "assets/NotoSansJP.woff",
  ])
    assert.ok((await stat(path.join(fixture, "dist", file))).size > 0, file);
  console.log(
    "PASS clean checkout: wrangler deploy builds and validates all assets without a pre-existing dist",
  );
} finally {
  await rm(fixture, { recursive: true, force: true });
}
