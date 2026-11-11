import { booleanGeometry } from "./vector-geometry.js";
import { formulaSVG } from "./math-svg.js";
import polygonClipping from "polygon-clipping";
export const escapeXML = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );
export function objectBounds(o) {
  return {
    x: Number(o.x || 0),
    y: Number(o.y || 0),
    width: Number(o.width ?? 20),
    height: Number(o.height ?? 10),
  };
}
export function alignObjects(objects, ids, mode) {
  const selected = objects.filter((o) => ids.includes(o.id));
  if (!selected.length) return;
  const bs = selected.map(objectBounds),
    minX = Math.min(...bs.map((b) => b.x)),
    maxX = Math.max(...bs.map((b) => b.x + b.width)),
    minY = Math.min(...bs.map((b) => b.y)),
    maxY = Math.max(...bs.map((b) => b.y + b.height));
  selected.forEach((o, i) => {
    if (mode === "left") o.x = minX;
    if (mode === "right") o.x = maxX - bs[i].width;
    if (mode === "top") o.y = minY;
    if (mode === "bottom") o.y = maxY - bs[i].height;
    if (mode === "center") o.x = (minX + maxX - bs[i].width) / 2;
    if (mode === "middle") o.y = (minY + maxY - bs[i].height) / 2;
  });
}
function polygon(o) {
  const b = objectBounds(o);
  if (o.type === "ellipse")
    return [
      Array.from({ length: 129 }, (_, i) => {
        const a = (i / 128) * Math.PI * 2;
        return [
          b.x + b.width / 2 + (Math.cos(a) * b.width) / 2,
          b.y + b.height / 2 + (Math.sin(a) * b.height) / 2,
        ];
      }),
    ];
  if (o.type === "polygon")
    return [
      (o.points || []).map(([x, y]) => [
        b.x + (x * b.width) / 100,
        b.y + (y * b.height) / 100,
      ]),
    ];
  return [
    [
      [b.x, b.y],
      [b.x + b.width, b.y],
      [b.x + b.width, b.y + b.height],
      [b.x, b.y + b.height],
      [b.x, b.y],
    ],
  ];
}
export const combineObjects = booleanGeometry;
export function renderObjects(objects, width, height, selected = []) {
  return (objects || [])
    .filter((o) => !o.hidden)
    .map((o) => {
      const e = escapeXML,
        b = objectBounds(o),
        x = (b.x * width) / 100,
        y = (b.y * height) / 100,
        w = (b.width * width) / 100,
        h = (b.height * height) / 100,
        stroke = e(o.stroke || "#555555"),
        fill = o.fill === "none" ? "none" : e(o.fill || "#dddddd"),
        sw = Number(o.lineWidth ?? 2);
      let body = "";
      if (o.type === "latex") {
        const raw = formulaSVG(o.text || "x^2");
        body = raw
          .replace("<svg ", `<svg x="${x}" y="${y}" `)
          .replace(/width="[^"]*"/, `width="${w}"`)
          .replace(/height="[^"]*"/, `height="${h}"`);
      } else if (o.type === "ellipse")
        body = `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}"/>`;
      else if (o.type === "line" || o.type === "arrow")
        body = `<path d="M${x} ${y}L${x + w} ${y + h}" fill="none"/>${o.type === "arrow" ? `<path d="M${x + w - 10} ${y + h - 4} L${x + w} ${y + h} L${x + w - 4} ${y + h - 10}" fill="none"/>` : ""}`;
      else if (o.type === "path")
        body = `<g transform="translate(${x} ${y}) scale(${w / 100} ${h / 100})"><path d="${e(o.pathData)}" vector-effect="non-scaling-stroke"/></g>`;
      else if (o.type === "bezier")
        body = `<path d="M${x} ${y + h} C${x + (w * Number(o.c1x ?? 25)) / 100} ${y + (h * Number(o.c1y ?? 0)) / 100},${x + (w * Number(o.c2x ?? 75)) / 100} ${y + (h * Number(o.c2y ?? 100)) / 100},${x + w} ${y}${o.closed ? " Z" : ""}" fill="${o.closed ? fill : "none"}"/>`;
      else if (o.type === "polygon")
        body = `<polygon points="${(
          o.points || [
            [0, 100],
            [50, 0],
            [100, 100],
          ]
        )
          .map(([a, b]) => `${x + (a * w) / 100},${y + (b * h) / 100}`)
          .join(" ")}"/>`;
      else if (o.type === "compound")
        body = `<path fill-rule="evenodd" d="${(o.rings || []).map((r) => r.map(([a, b], i) => `${i ? "L" : "M"}${x + (a * w) / 100},${y + (b * h) / 100}`).join(" ") + "Z").join(" ")}"/>`;
      else if (o.type === "text")
        body = `${o.textBackground ? `<rect x="${x - 4}" y="${y}" width="${w + 8}" height="${h}" fill="${e(o.background || "#ffffff")}" stroke="none"/>` : ""}<text x="${x}" y="${y + Number(o.fontSize || 20)}" fill="${e(o.color || "#333333")}" stroke="none" font-family="${e(o.fontFamily || "sans-serif")}" font-size="${Number(o.fontSize || 20)}" font-weight="${o.bold ? 700 : 400}" font-style="${o.italic ? "italic" : "normal"}" letter-spacing="${Number(o.letterSpacing || 0)}">${String(
          o.text || "",
        )
          .split("\n")
          .map(
            (line, i) =>
              `<tspan x="${x}" dy="${i ? Number(o.lineHeight || 1.4) * Number(o.fontSize || 20) : 0}">${e(line)}</tspan>`,
          )
          .join("")}</text>`;
      else
        body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Number(o.radius || 0)}"/>`;
      return `<g data-object-id="${e(o.id)}" role="button" tabindex="0" aria-label="${e(o.name || o.type)}" opacity="${Number(o.opacity ?? 1)}" transform="rotate(${Number(o.rotation || 0)} ${x + w / 2} ${y + h / 2})" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${o.dashed ? 'stroke-dasharray="6 4"' : ""} style="cursor:${o.locked ? "not-allowed" : "move"}">${body}${selected.includes(o.id) ? `<rect x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}" fill="none" stroke="#888888" stroke-width="1" stroke-dasharray="4 3"/>` : ""}</g>`;
    })
    .join("");
}
