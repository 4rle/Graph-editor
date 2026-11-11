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
    width: Number(o.width || 20),
    height: Number(o.height || 10),
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
export function combineObjects(objects, ids, operation) {
  const selected = objects.filter((o) => ids.includes(o.id));
  if (selected.length < 2) throw Error("2つ以上の図形を選択してください。");
  if (selected.some((o) => !["rect", "polygon", "ellipse"].includes(o.type)))
    throw Error("図形演算には長方形・楕円・多角形を選んでください。");
  const fn = {
    union: polygonClipping.union,
    intersection: polygonClipping.intersection,
    difference: polygonClipping.difference,
    xor: polygonClipping.xor,
  }[operation];
  if (!fn) throw Error("図形演算が不正です。");
  const result = fn(...selected.map(polygon));
  return result.map((rings, i) => ({
    id: crypto.randomUUID(),
    type: "compound",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rings,
    fill: selected[0].fill || "#888888",
    stroke: selected[0].stroke || "#222222",
    name: "図形演算 " + (i + 1),
  }));
}
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
      else if (o.type === "bezier")
        body = `<path d="M${x} ${y + h} C${x + (w * Number(o.c1x ?? 25)) / 100} ${y + (h * Number(o.c1y ?? 0)) / 100},${x + (w * Number(o.c2x ?? 75)) / 100} ${y + (h * Number(o.c2y ?? 100)) / 100},${x + w} ${y}" fill="none"/>`;
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
        body = `<path fill-rule="evenodd" d="${(o.rings || []).map((r) => r.map(([a, b], i) => `${i ? "L" : "M"}${(a * width) / 100},${(b * height) / 100}`).join(" ") + "Z").join(" ")}"/>`;
      else if (o.type === "text")
        body = `<text x="${x}" y="${y + Number(o.fontSize || 20)}" fill="${e(o.color || "#333333")}" stroke="none" font-family="${e(o.fontFamily || "sans-serif")}" font-size="${Number(o.fontSize || 20)}" font-weight="${o.bold ? 700 : 400}" letter-spacing="${Number(o.letterSpacing || 0)}">${String(
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
