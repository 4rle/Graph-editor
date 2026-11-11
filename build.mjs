import { build } from "esbuild";
import { mkdir, cp, writeFile } from "node:fs/promises";
await mkdir("dist", { recursive: true });
await build({
  entryPoints: ["src/app.js"],
  bundle: true,
  format: "esm",
  outfile: "dist/app.js",
  sourcemap: true,
  loader: { ".woff": "file", ".woff2": "file", ".ttf": "file" },
  assetNames: "fonts/[name]-[hash]",
});
await cp("node_modules/katex/dist/katex.min.css", "dist/katex.css");
await cp("node_modules/katex/dist/fonts", "dist/fonts", { recursive: true });
