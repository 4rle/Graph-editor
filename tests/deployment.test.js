import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat, readdir } from "node:fs/promises";
import path from "node:path";
test("production dist contains a complete self-contained site", async () => {
  const html = await readFile("dist/index.html", "utf8");
  assert.doesNotMatch(html, /\/src\/|\/dist\//);
  const files = [...html.matchAll(/(?:src|href)="\/([^\"]+)"/g)].map(
    (m) => m[1],
  );
  for (const f of files)
    assert.ok((await stat(path.join("dist", f))).size > 0, f);
  const bootstrap = await readFile("dist/bootstrap.js", "utf8");
  assert.doesNotMatch(bootstrap, /__APP_ENTRY__/);
  const entry = bootstrap.match(/import\(['"]\.\/([^'"]+)['"]\)/)?.[1];
  assert.ok(entry);
  assert.ok((await stat("dist/" + entry)).size > 0);
  for (const f of [
    "native.css",
    "assets/NotoSansJP.woff",
    "assets/NotoMonoJP.woff",
    "assets/NotoSerifJP.woff",
    "color/lcms.wasm",
    "color/lcms.js",
  ])
    assert.ok((await stat("dist/" + f)).size > 0);
  async function walk(dir) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else
        assert.ok(
          (await stat(p)).size <= 25 * 1024 * 1024,
          `${p} exceeds Workers asset limit`,
        );
    }
  }
  await walk("dist");
});
