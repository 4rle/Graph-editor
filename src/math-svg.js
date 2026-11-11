import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const doc = mathjax.document("", {
  InputJax: new TeX({
    packages: AllPackages.filter(
      (p) => !["html", "require", "autoload", "configmacros"].includes(p),
    ),
  }),
  OutputJax: new SVG({ fontCache: "none" }),
});
const cache = new Map();
export function formulaSVG(input) {
  if (cache.has(input)) return cache.get(input);
  const source = String(input)
    .replace(/\bDelta\b/g, "\\Delta")
    .replace(/\balpha\b/g, "\\alpha")
    .replace(/\bbeta\b/g, "\\beta");
  if (source.length > 4000) throw Error("数式が長すぎます。");
  const node = doc.convert(source, { display: true });
  const result = adaptor.innerHTML(node);
  if (cache.size > 100) cache.clear();
  cache.set(input, result);
  return result;
}
