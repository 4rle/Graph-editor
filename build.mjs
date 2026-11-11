import { build } from "esbuild";
import { mkdir, cp, writeFile, readFile, rm, readdir } from "node:fs/promises";
import path from "node:path";
const output = path.resolve("dist");
await mkdir(output, { recursive: true });
await Promise.all(
  (await readdir(output)).map((file) =>
    rm(path.join(output, file), { recursive: true, force: true }),
  ),
);
const result = await build({
  entryPoints: { app: "src/app.js" },
  bundle: true,
  format: "esm",
  outdir: output,
  entryNames: "[name]-[hash]",
  chunkNames: "chunks/[name]-[hash]",
  splitting: true,
  metafile: true,
  target: ["es2022"],
  sourcemap: true,
  loader: { ".woff": "file", ".woff2": "file", ".ttf": "file" },
  assetNames: "fonts/[name]-[hash]",
});
const entry = Object.entries(result.metafile.outputs).find(
  ([, v]) => v.entryPoint === "src/app.js",
)[0];
const entryName = path
  .relative(output, path.resolve(entry))
  .replaceAll("\\", "/");
await Promise.all([
  cp("src/styles.css", path.join(output, "styles.css")),
  cp("src/advanced.css", path.join(output, "advanced.css")),
  cp("node_modules/katex/dist/katex.min.css", path.join(output, "katex.css")),
  cp("node_modules/katex/dist/fonts", path.join(output, "fonts"), {
    recursive: true,
  }),
  cp("assets", path.join(output, "assets"), { recursive: true }),
]);
const bootstrap = (await readFile("src/bootstrap.js", "utf8")).replace(
  "__APP_ENTRY__",
  "./" + entryName,
);
await writeFile(path.join(output, "bootstrap.js"), bootstrap);
await cp("index.html", path.join(output, "index.html"));
let nativeCSS = await readFile(
  "node_modules/@fortune-sheet/react/dist/index.css",
  "utf8",
);
nativeCSS = nativeCSS.replace(/url\("EwaAnt[HV]\.gif"\)/g, "none");
await writeFile(path.join(output, "native.css"), nativeCSS);
await writeFile(
  path.join(output, "_headers"),
  `/\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n/bootstrap.js\n  Cache-Control: no-cache\n/*.js\n  X-Content-Type-Options: nosniff\n/assets/*\n  Cache-Control: public, max-age=3600\n`,
);
await writeFile(
  path.join(output, "build-manifest.json"),
  JSON.stringify(
    {
      version: JSON.parse(await readFile("package.json", "utf8")).version,
      entry: entryName,
      files: [
        "index.html",
        "bootstrap.js",
        "styles.css",
        "advanced.css",
        "katex.css",
      ],
      builtAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log(
  "Cloudflare static build: dist/index.html → bootstrap.js → " + entryName,
);

await mkdir(path.join(output, "color"), { recursive: true });
await cp(
  "node_modules/lcms-wasm/dist/lcms.js",
  path.join(output, "color/lcms.js"),
);
await cp(
  "node_modules/lcms-wasm/dist/lcms.wasm",
  path.join(output, "color/lcms.wasm"),
);
