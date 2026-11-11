import { create } from "fontkit";
const fonts = new Map();
const loadFont = async (family) => {
  const name = family.includes("monospace")
    ? "NotoMonoJP"
    : family.includes("serif") && !family.includes("sans")
      ? "NotoSerifJP"
      : "NotoSansJP";
  if (!fonts.has(name))
    fonts.set(
      name,
      fetch(`/assets/${name}.woff`).then(async (r) => {
        if (!r.ok) throw Error("出力用フォントを読み込めません。");
        return create(new Uint8Array(await r.arrayBuffer()));
      }),
    );
  return fonts.get(name);
};
export async function outlineText(svg) {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  for (const text of [...doc.querySelectorAll("text")]) {
    const font = await loadFont(
        text.getAttribute("font-family") ||
          text.closest("svg")?.style.fontFamily ||
          "sans-serif",
      ),
      ns = "http://www.w3.org/2000/svg",
      group = doc.createElementNS(ns, "g");
    for (const key of [
      "fill",
      "stroke",
      "stroke-width",
      "paint-order",
      "transform",
      "opacity",
    ])
      if (text.hasAttribute(key))
        group.setAttribute(key, text.getAttribute(key));
    if (
      Number(text.getAttribute("font-weight")) >= 600 &&
      !group.hasAttribute("stroke")
    ) {
      group.setAttribute(
        "stroke",
        text.getAttribute("fill") ||
          text.parentElement.closest("[fill]")?.getAttribute("fill") ||
          "#333333",
      );
      group.setAttribute("stroke-width", "0.3");
    }
    const size = Number(
        text.getAttribute("font-size") ||
          text.closest("svg")?.style.fontSize?.replace("px", "") ||
          12,
      ),
      scale = size / font.unitsPerEm,
      anchor = text.getAttribute("text-anchor");
    let y = Number(text.getAttribute("y") || 0),
      x = Number(text.getAttribute("x") || 0);
    const spans = text.querySelectorAll("tspan"),
      lines = spans.length ? [...spans] : [text];
    for (const line of lines) {
      if (line !== text) {
        x = Number(line.getAttribute("x") || x);
        y += Number(line.getAttribute("dy") || 0);
      }
      const run = font.layout(line.textContent),
        width = run.positions.reduce((a, p) => a + p.xAdvance, 0) * scale;
      let cursor =
        x - (anchor === "middle" ? width / 2 : anchor === "end" ? width : 0);
      for (let i = 0; i < run.glyphs.length; i++) {
        const glyph = run.glyphs[i],
          pos = run.positions[i],
          path = doc.createElementNS(ns, "path");
        path.setAttribute("d", glyph.path.toSVG());
        path.setAttribute(
          "transform",
          `translate(${cursor + pos.xOffset * scale} ${y - pos.yOffset * scale}) scale(${scale} ${-scale})`,
        );
        group.append(path);
        cursor += pos.xAdvance * scale;
      }
    }
    text.replaceWith(group);
  }
  return new XMLSerializer().serializeToString(doc);
}
