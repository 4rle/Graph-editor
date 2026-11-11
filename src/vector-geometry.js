import paper from "paper/dist/paper-core.js";
function vectorPath(o, s) {
  const x = Number(o.x ?? 0),
    y = Number(o.y ?? 0),
    w = Number(o.width ?? 20),
    h = Number(o.height ?? 10);
  let p;
  if (o.type === "rect") p = new s.Path.Rectangle(new s.Rectangle(x, y, w, h));
  else if (o.type === "ellipse")
    p = new s.Path.Ellipse(new s.Rectangle(x, y, w, h));
  else if (o.type === "polygon")
    p = new s.Path({
      segments: (o.points || []).map(([a, b]) => [
        x + (a * w) / 100,
        y + (b * h) / 100,
      ]),
      closed: true,
    });
  else if (o.type === "bezier") {
    p = new s.Path();
    p.moveTo([x, y + h]);
    p.cubicCurveTo(
      [x + (w * Number(o.c1x ?? 25)) / 100, y + (h * Number(o.c1y ?? 0)) / 100],
      [
        x + (w * Number(o.c2x ?? 75)) / 100,
        y + (h * Number(o.c2y ?? 100)) / 100,
      ],
      [x + w, y],
    );
    p.closed = !!o.closed;
  } else if (o.type === "path") {
    p = new s.CompoundPath(o.pathData);
    p.scale(w / 100, h / 100, [0, 0]);
    p.translate([x, y]);
  } else if (o.type === "compound") {
    p = new s.CompoundPath({
      children: (o.rings || []).map(
        (r) =>
          new s.Path({
            segments: r.map(([a, b]) => [x + (a * w) / 100, y + (b * h) / 100]),
            closed: true,
          }),
      ),
    });
  } else throw Error("面を持つ図形を選択してください。");
  if (o.rotation)
    p.rotate(Number(o.rotation), new s.Point(x + w / 2, y + h / 2));
  return p;
}
export function booleanGeometry(objects, ids, operation) {
  const selected = objects.filter((o) => ids.includes(o.id));
  if (selected.length < 2) throw Error("2つ以上の図形を選択してください。");
  if (selected.some((o) => o.type === "bezier" && !o.closed))
    throw Error("ベジェ曲線の「閉じたパス」を有効にしてください。");
  const s = new paper.PaperScope();
  s.setup(new s.Size(100, 100));
  try {
    let result = vectorPath(selected[0], s);
    const method = {
      union: "unite",
      intersection: "intersect",
      difference: "subtract",
      xor: "exclude",
    }[operation];
    if (!method) throw Error("図形演算が不正です。");
    for (const o of selected.slice(1)) {
      const next = vectorPath(o, s),
        previous = result;
      result = previous[method](next, { insert: false });
      previous.remove();
      next.remove();
    }
    if (!result.pathData) return [];
    const bounds = result.bounds.clone();
    if (bounds.width < 1e-12 || bounds.height < 1e-12) return [];
    result.translate([-bounds.x, -bounds.y]);
    result.scale(100 / bounds.width, 100 / bounds.height, [0, 0]);
    return [
      {
        id: crypto.randomUUID(),
        type: "path",
        pathData: result.pathData,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        fill: selected[0].fill || "#888888",
        stroke: selected[0].stroke || "#222222",
        lineWidth: selected[0].lineWidth ?? 2,
        name: "ベクター演算",
        geometryMethod: "cubic-bezier-boolean",
      },
    ];
  } finally {
    s.project.remove();
  }
}
export function vectorArea(o) {
  if (o.type === "ellipse")
    return (Math.PI * Number(o.width) * Number(o.height)) / 4;
  if (o.type === "rect") return Number(o.width) * Number(o.height);
  if (
    ["line", "arrow", "text", "latex"].includes(o.type) ||
    (o.type === "bezier" && !o.closed)
  )
    return 0;
  const s = new paper.PaperScope();
  s.setup(new s.Size(100, 100));
  try {
    return Math.abs(vectorPath(o, s).area);
  } finally {
    s.project.remove();
  }
}
