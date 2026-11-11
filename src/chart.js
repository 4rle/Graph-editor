import { themeEffects } from "./theme-effects.js";
import { extraThemes } from "./extra-themes.js";
import {
  prepareChart,
  contourSVG,
  compositeSVG,
  decorateSVG,
} from "./advanced-chart.js";
import {
  evalCell,
  parseRef,
  evaluateMath,
  derivative,
  integrate,
  regression,
} from "./engine.js";

export const themes = [
  {
    id: "botanical",
    name: "Botanical",
    category: "ナチュラル",
    bg: "#ffffff",
    fg: "#223b34",
    muted: "#7d8984",
    grid: "#e8ede9",
    colors: ["#36856b", "#e5ad52", "#6b94b5", "#bb7b7f", "#9b9c74"],
    font: "sans-serif",
  },
  {
    id: "scientific",
    name: "Scientific Minimal",
    category: "科学・学術",
    bg: "#ffffff",
    fg: "#243041",
    muted: "#7a8595",
    grid: "#e8edf4",
    colors: ["#377fa6", "#df8b4a", "#739d85", "#ac7ca1", "#a4b263"],
    font: "sans-serif",
  },
  {
    id: "academic",
    name: "Academic Journal",
    category: "科学・学術",
    bg: "#ffffff",
    fg: "#1e2530",
    muted: "#7a7f89",
    grid: "#e9e9e9",
    colors: ["#244f72", "#bf5f3c", "#518a72", "#99704c", "#796299"],
    font: "serif",
  },
  {
    id: "minimal",
    name: "Monochrome Minimal",
    category: "ミニマル",
    bg: "#ffffff",
    fg: "#22282c",
    muted: "#868b8e",
    grid: "#ebedee",
    colors: ["#252e34", "#7a858a", "#b2b9bc", "#505c63", "#d3d6d8"],
    font: "sans-serif",
  },
  {
    id: "swiss",
    name: "Swiss Style",
    category: "ミニマル",
    bg: "#fbfaf7",
    fg: "#242628",
    muted: "#7a7b78",
    grid: "#e8e7e2",
    colors: ["#d3523e", "#263f52", "#d4a646", "#6e8370", "#a28f86"],
    font: "sans-serif",
  },
  {
    id: "pastel",
    name: "Pastel Design",
    category: "やわらか",
    bg: "#fffdfb",
    fg: "#4b535e",
    muted: "#8e929b",
    grid: "#edeaf0",
    colors: ["#9eadd6", "#d89caa", "#9abbb3", "#d9bb85", "#b8a2cb"],
    font: "sans-serif",
  },
  {
    id: "japandi",
    name: "Japandi",
    category: "ナチュラル",
    bg: "#f8f5ef",
    fg: "#41463e",
    muted: "#949285",
    grid: "#e7e2d8",
    colors: ["#737f66", "#bd9671", "#757c89", "#ab7970", "#aaa076"],
    font: "serif",
  },
  {
    id: "warm",
    name: "Warm Minimal",
    category: "やわらか",
    bg: "#fcf8f1",
    fg: "#574638",
    muted: "#a09181",
    grid: "#ebe2d5",
    colors: ["#b4744f", "#c7aa73", "#7d9680", "#998497", "#a4a29a"],
    font: "sans-serif",
  },
  {
    id: "dark",
    name: "Dark Modern",
    category: "モダン",
    bg: "#202a30",
    fg: "#eff5f3",
    muted: "#a2b4b3",
    grid: "#35444b",
    colors: ["#79c7af", "#efc17c", "#83b4df", "#e3a3ad", "#b9bc88"],
    font: "sans-serif",
  },
  {
    id: "blueprint",
    name: "Blueprint",
    category: "科学・学術",
    bg: "#23465b",
    fg: "#edf6ff",
    muted: "#a7c1d0",
    grid: "#365c70",
    colors: ["#a5d4eb", "#f1ce8e", "#a8d3bd", "#e3b2bd", "#c7bce3"],
    font: "monospace",
  },
  {
    id: "editorial",
    name: "Editorial Design",
    category: "エディトリアル",
    bg: "#fffefb",
    fg: "#322f2c",
    muted: "#9d958b",
    grid: "#eae5dd",
    colors: ["#b96247", "#55776a", "#bd9a55", "#75889a", "#ae8395"],
    font: "serif",
  },
  {
    id: "bauhaus",
    name: "Bauhaus",
    category: "個性的",
    bg: "#faf7ee",
    fg: "#282b2e",
    muted: "#8d8c80",
    grid: "#e4e1d5",
    colors: ["#d64c3b", "#d8ad39", "#356988", "#3f7563", "#8c5b6b"],
    font: "sans-serif",
  },
];

themes.push(...extraThemes);
const esc = (v) =>
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
const n = (v, fallback = 0) =>
  Number.isFinite(Number(v)) ? Number(v) : fallback;
const fmt = (v) => {
  const a = Math.abs(v);
  return a >= 1e5 || (a > 0 && a < 0.001)
    ? v.toExponential(1)
    : Number(v.toPrecision(5)).toLocaleString("en-US", {
        maximumFractionDigits: 4,
      });
};
const valid = (p) => Number.isFinite(p.x) && Number.isFinite(p.y);
const safe = (f, fallback = NaN) => {
  try {
    const v = f();
    return typeof v === "number" && Number.isFinite(v) ? v : fallback;
  } catch {
    return fallback;
  }
};

export function getChartData(chart, sheets) {
  const sheet = sheets.find((s) => s.id === chart.sheetId) || sheets[0];
  if (!sheet) return { labels: [], series: [] };
  let refs;
  try {
    refs = String(chart.range || "A1:D13")
      .split(":")
      .map((v) => parseRef(v.replace(/\$/g, "")));
  } catch {
    return { labels: [], series: [] };
  }
  const start = refs[0],
    end = refs[1] || start;
  if (!start || !end) return { labels: [], series: [] };
  const r0 = Math.min(start.row, end.row),
    r1 = Math.max(start.row, end.row),
    c0 = Math.min(start.col, end.col),
    c1 = Math.max(start.col, end.col);
  if ((r1 - r0 + 1) * (c1 - c0 + 1) > 100000) return { labels: [], series: [] };
  const read = (r, c) => evalCell(sheets, sheet.id, r, c);
  const labels = [];
  const series = [];
  // The first row holds series names and the first column holds categories / X values.
  const mapped = chart.seriesColumns?.length
    ? chart.seriesColumns.map((col) => parseRef(col + "1").col)
    : Array.from({ length: Math.max(0, c1 - c0) }, (_, i) => c0 + i + 1);
  const xColumn = chart.xColumn ? parseRef(chart.xColumn + "1").col : c0;
  for (const c of mapped)
    series.push({
      name: String(read(r0, c) || `系列 ${c - c0}`),
      column: c,
      points: [],
    });
  if (c1 === c0)
    series.push({
      name: String(read(r0, c0) || "系列 1"),
      column: c0,
      points: [],
    });
  for (let r = r0 + 1; r <= r1; r++) {
    const raw = read(r, xColumn);
    if (raw === "" && series.every((s) => read(r, s.column) === "")) continue;
    const label = String(raw ?? "");
    labels.push(label);
    const x =
      raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : labels.length;
    series.forEach((s) => {
      const value = read(r, s.column);
      if (value !== "" && Number.isFinite(Number(value)))
        s.points.push({
          x,
          y: Number(value),
          label,
          row: r,
          col: s.column,
          categoryIndex: labels.length - 1,
        });
    });
  }
  return { labels, series };
}

function ticks(min, max, count = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1, 2, 3, 4, 5];
  if (max === min) {
    min -= Math.abs(min) * 0.1 || 1;
    max += Math.abs(max) * 0.1 || 1;
  }
  const step0 = (max - min) / count,
    power = 10 ** Math.floor(Math.log10(step0)),
    norm = step0 / power;
  const step =
    (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) *
    power;
  const lo = Math.floor(min / step) * step,
    hi = Math.ceil(max / step) * step;
  const result = [];
  for (let v = lo; v <= hi + step * 0.001 && result.length < 100; v += step)
    result.push(Number(v.toPrecision(12)));
  return result;
}
function quantile(values, q) {
  const a = [...values].sort((a, b) => a - b),
    i = (a.length - 1) * q,
    lo = Math.floor(i);
  return a[lo] + (a[Math.min(lo + 1, a.length - 1)] - a[lo]) * (i - lo);
}
function linePath(points, sx, sy) {
  let d = "",
    started = false;
  for (const p of points) {
    if (!valid(p)) {
      started = false;
      continue;
    }
    d += `${started ? "L" : "M"}${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)} `;
    started = true;
  }
  return d.trim();
}

function baseRenderChart(
  chart,
  sheets,
  { width = 900, height = 520, interactive = true } = {},
) {
  const theme = themes.find((t) => t.id === chart.theme) || themes[0];
  const bg = chart.background || theme.bg,
    fg = chart.textColor || theme.fg,
    muted = theme.muted;
  const colors = chart.colors?.length ? chart.colors : theme.colors;
  const id = String(chart.id || "chart").replace(/[^a-zA-Z0-9_-]/g, "");
  const data = getChartData(chart, sheets);
  const hidden = chart.seriesHidden || [];
  const visible = data.series
    .map((s, i) => ({ ...s, index: i, color: colors[i % colors.length] }))
    .filter((s) => !hidden.includes(s.index) && !hidden.includes(s.name));
  const font = chart.fontFamily || theme.font;
  const fs = n(chart.fontSize, 12),
    lw = n(chart.lineWidth, theme.lineWidth || 3),
    pointSize = n(chart.pointSize, theme.pointSize || 4);
  const left = Number(chart.marginLeft ?? Math.max(62, width * 0.085)),
    right = width - Number(chart.marginRight ?? 38),
    top = Number(chart.marginTop ?? (height < 300 ? 65 : 100)),
    bottom = height - Number(chart.marginBottom ?? (chart.xLabel ? 64 : 45));
  const pw = right - left,
    ph = Math.max(50, bottom - top);
  const text = (x, y, value, attr = "") =>
    `<text x="${x}" y="${y}" ${attr}>${esc(value)}</text>`;
  const title = chart.title || "名称未設定のグラフ";
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${esc(title)}" class="chart-svg" style="font-family:${esc(font)};font-size:${fs}px"><rect width="${width}" height="${height}" fill="${chart.transparent ? "none" : esc(bg)}"/><defs><clipPath id="plot-${id}"><rect x="${left}" y="${top}" width="${pw}" height="${ph}"/></clipPath></defs><g fill="${esc(fg)}">${text(left, 38, title, `font-size="${Math.min(23, width / 30)}" font-weight="600" data-chart-title="true"`)}${chart.subtitle ? text(left, 60, chart.subtitle, `fill="${muted}" font-size="${fs - 1}"`) : ""}</g>`;
  if (chart.showLegend !== false) {
    let lx = left;
    const ly = height < 300 ? 58 : 78;
    visible.forEach((s) => {
      svg += `<g data-series-index="${s.index}" style="cursor:pointer"><rect x="${lx}" y="${ly - 7}" width="15" height="3" rx="1.5" fill="${esc(s.color)}"/>${text(lx + 22, ly - 2, s.name, `fill="${muted}" font-size="${fs - 1}"`)}</g>`;
      lx += Math.max(95, String(s.name).length * (fs - 1) * 0.7 + 43);
    });
  }
  const type = chart.type || "line";
  if (
    !visible.some((s) => s.points.length) &&
    type !== "function" &&
    !(chart.math || []).some(
      (m) => !m.hidden && ["function", "derivative"].includes(m.type),
    )
  )
    return (
      svg +
      text(
        width / 2,
        height / 2,
        "表示するデータがありません",
        `text-anchor="middle" fill="${muted}"`,
      ) +
      `</svg>`
    );
  const tooltip = (s, p) =>
    `<title>${esc(`${s.name} · ${p.label || fmt(p.x)}: ${fmt(p.y)}`)}</title>`;
  const pointAttr = (s, p, i) =>
    interactive
      ? `data-point-index="${Math.max(0, s.points.indexOf(p))}" data-series-index="${s.index}" data-row="${p.row ?? ""}" data-col="${p.col ?? ""}" style="cursor:crosshair" tabindex="0" role="button" aria-label="${esc(s.name + " " + p.label + " " + p.y)}"`
      : "";

  if (type === "pie" || type === "donut") {
    const s = visible[0],
      pts = s.points.filter((p) => p.y > 0),
      total = pts.reduce((a, p) => a + p.y, 0);
    if (!total)
      return (
        svg +
        text(
          width / 2,
          height / 2,
          "円グラフには正の値が必要です",
          `text-anchor="middle" fill="${muted}"`,
        ) +
        `</svg>`
      );
    const cx = width * 0.43,
      cy = (top + bottom) / 2,
      r = Math.min(pw * 0.29, ph * 0.46),
      inner = type === "donut" ? r * 0.68 : 0;
    let angle = -Math.PI / 2;
    pts.forEach((p, i) => {
      const delta = (p.y / total) * Math.PI * 2,
        end = angle + delta;
      const ex = cx + r * Math.cos(end),
        ey = cy + r * Math.sin(end),
        sx = cx + r * Math.cos(angle),
        sy = cy + r * Math.sin(angle);
      const full = delta >= Math.PI * 2 - 0.000001;
      let d = full
        ? `M${cx},${cy - r} A${r},${r} 0 1 1 ${cx - 0.001},${cy - r} Z`
        : `M${cx},${cy} L${sx},${sy} A${r},${r} 0 ${delta > Math.PI ? 1 : 0} 1 ${ex},${ey} Z`;
      svg += `<path d="${d}" fill="${esc(colors[i % colors.length])}" stroke="${esc(bg)}" stroke-width="3" ${pointAttr(s, p, i)}>${tooltip(s, p)}</path>`;
      const ly = top + 15 + i * 25;
      svg += `<rect x="${width * 0.73}" y="${ly - 9}" width="8" height="8" rx="2" fill="${esc(colors[i % colors.length])}"/>${text(width * 0.73 + 16, ly, p.label, `fill="${muted}" font-size="${fs - 1}"`)}${text(width - 35, ly, `${((p.y / total) * 100).toFixed(1)}%`, `text-anchor="end" fill="${fg}" font-size="${fs - 1}"`)}`;
      angle = end;
    });
    if (inner)
      svg += `<circle cx="${cx}" cy="${cy}" r="${inner}" fill="${esc(bg)}"/>${text(cx, cy - 5, fmt(total), `text-anchor="middle" fill="${fg}" font-size="${fs * 2.5}" font-weight="600"`)}${text(cx, cy + 20, "合計", `text-anchor="middle" fill="${muted}" font-size="${fs}"`)}`;
    return svg + "</svg>";
  }
  let plotSeries = visible;
  if (type === "histogram") {
    const vals = visible[0]?.points.map((p) => p.y) || [];
    const lo = Math.min(...vals),
      hi = Math.max(...vals),
      bins = Math.min(20, Math.max(4, Math.ceil(Math.sqrt(vals.length)))),
      step = (hi - lo) / bins || 1;
    const pts = Array.from({ length: bins }, (_, i) => ({
      x: lo + (i + 0.5) * step,
      y: 0,
      label: `${fmt(lo + i * step)}–${fmt(lo + (i + 1) * step)}`,
    }));
    vals.forEach(
      (v) => pts[Math.min(bins - 1, Math.floor((v - lo) / step))].y++,
    );
    plotSeries = [{ ...visible[0], points: pts }];
  }
  let all = plotSeries.flatMap((s) => s.points),
    xMin = Math.min(...all.map((p) => p.x)),
    xMax = Math.max(...all.map((p) => p.x)),
    yMin = Math.min(0, ...all.map((p) => p.y)),
    yMax = Math.max(...all.map((p) => p.y));
  const numericX = all.every(
    (p) => p.label === "" || Number.isFinite(Number(p.label)),
  );
  const categorical =
    ["bar", "stacked", "box", "heatmap"].includes(type) ||
    (!numericX &&
      type !== "scatter" &&
      type !== "function" &&
      type !== "histogram");
  if (categorical && type !== "box" && type !== "heatmap") {
    plotSeries = plotSeries.map((s) => ({
      ...s,
      points: s.points.map((p) => ({ ...p, x: p.categoryIndex + 1 })),
    }));
    all = plotSeries.flatMap((s) => s.points);
    xMin = 1;
    xMax = Math.max(1, data.labels.length);
  }
  if (type === "function" || !all.length) {
    xMin = n(chart.xMin, -5);
    xMax = n(chart.xMax, 5);
    yMin = -1;
    yMax = 1;
  }
  if (type === "stacked") {
    const count = Math.max(0, ...plotSeries.map((s) => s.points.length));
    for (let i = 0; i < count; i++) {
      let pos = 0,
        neg = 0;
      plotSeries.forEach((s) => {
        const y = s.points[i]?.y || 0;
        if (y > 0) pos += y;
        else neg += y;
      });
      yMax = Math.max(yMax, pos);
      yMin = Math.min(yMin, neg);
    }
  }
  if (type === "box") {
    xMin = 0;
    xMax = Math.max(1, visible.length + 1);
    yMin = Math.min(...all.map((p) => p.y));
  }
  if (chart.xMin !== null && chart.xMin !== undefined && chart.xMin !== "")
    xMin = n(chart.xMin, xMin);
  if (chart.xMax !== null && chart.xMax !== undefined && chart.xMax !== "")
    xMax = n(chart.xMax, xMax);
  if (!Number.isFinite(xMin)) xMin = 0;
  if (!Number.isFinite(xMax)) xMax = 10;
  if (xMin === xMax) {
    xMin -= 1;
    xMax += 1;
  }
  const maths = [...(chart.math || [])];
  if (type === "function" && !maths.some((m) => m.type === "function"))
    maths.unshift({
      type: "function",
      expression: chart.expression || "sin(x)",
      color: colors[0],
    });
  if (
    maths.some(
      (m) =>
        !m.hidden &&
        ["origin", "horizontal"].includes(m.type) &&
        m.pointIndex != null,
    )
  ) {
    xMin = Math.min(0, xMin);
    xMax = Math.max(0, xMax);
  }
  const overlays = [];
  for (let k = 0; k < maths.length; k++) {
    const m = maths[k];
    if (m.hidden) continue;
    const color = m.color || colors[(visible.length + k) % colors.length];
    try {
      if (m.type === "sampled") {
        overlays.push({
          type: "line",
          points: m.points,
          color,
          label: m.label,
          dashed: true,
        });
      } else if (m.type === "calculated-point") {
        overlays.push({
          type: "coordinate",
          point: m.point,
          color,
          label: m.label,
        });
      } else if (
        [
          "origin",
          "vertical",
          "horizontal",
          "coordinate",
          "tangent-data",
        ].includes(m.type) &&
        m.pointIndex != null
      ) {
        const source = data.series[n(m.series, 0)]?.points || [],
          index = Math.max(0, Math.min(source.length - 1, n(m.pointIndex, 0))),
          p = source[index];
        if (!p) continue;
        if (m.type === "coordinate") {
          overlays.push({
            type: "coordinate",
            point: p,
            color,
            label: `(${fmt(p.x)}, ${fmt(p.y)})`,
          });
          continue;
        }
        let points,
          label = "";
        if (m.type === "origin") points = [{ x: 0, y: 0 }, p];
        else if (m.type === "vertical") points = [{ x: p.x, y: 0 }, p];
        else if (m.type === "horizontal") points = [{ x: 0, y: p.y }, p];
        else {
          const a = source[Math.max(0, index - 1)],
            b = source[Math.min(source.length - 1, index + 1)];
          if (!a || !b || a.x === b.x) continue;
          const slope = (b.y - a.y) / (b.x - a.x);
          points = [
            { x: xMin, y: p.y + slope * (xMin - p.x) },
            { x: xMax, y: p.y + slope * (xMax - p.x) },
          ];
          label = `接線 · 隣接点差分 · x = ${fmt(p.x)}`;
        }
        overlays.push({ type: "line", points, color, label, dashed: true });
      } else if (m.type === "function" || m.type === "derivative") {
        const points = Array.from({ length: 401 }, (_, i) => {
          const x = xMin + ((xMax - xMin) * i) / 400;
          return {
            x,
            y: safe(() =>
              m.type === "derivative"
                ? derivative(m.expression || "x^2", x)
                : evaluateMath(m.expression || "x^2", x),
            ),
          };
        });
        overlays.push({
          type: "line",
          points,
          color,
          label:
            m.type === "derivative"
              ? `d/dx (${m.expression})`
              : `y = ${m.expression}`,
        });
        const ys = points
          .filter(valid)
          .map((p) => p.y)
          .filter((y) => Math.abs(y) < 1e8);
        if (ys.length) {
          yMin = Math.min(yMin, ...ys);
          yMax = Math.max(yMax, ...ys);
        }
      } else if (m.type === "regression") {
        const pts = data.series[n(m.series, 0)]?.points || [];
        const result = regression(pts, m.method || "linear", n(m.degree, 2));
        const points = Array.from({ length: 201 }, (_, i) => {
          const x = xMin + ((xMax - xMin) * i) / 200;
          return { x, y: safe(() => result.predict(x)) };
        });
        overlays.push({
          type: "line",
          points,
          color,
          label: `${result.equation}   R² = ${Number(result.r2).toFixed(4)}`,
          dashed: true,
        });
      } else if (m.type === "tangent" || m.type === "normal") {
        const x0 = n(m.x0, 1);
        let y0,
          slope,
          anchor = x0;
        if (m.expression) {
          y0 = evaluateMath(m.expression, x0);
          slope = derivative(m.expression, x0);
        } else {
          const pts = data.series[n(m.series, 0)]?.points || [];
          const nearest = pts
            .map((p, i) => ({ p, i, d: Math.abs(p.x - x0) }))
            .sort((a, b) => a.d - b.d)[0];
          if (!nearest) continue;
          const i = nearest.i,
            a = pts[Math.max(0, i - 1)],
            b = pts[Math.min(pts.length - 1, i + 1)];
          y0 = nearest.p.y;
          slope = (b.y - a.y) / (b.x - a.x);
          anchor = nearest.p.x;
        }
        if (m.type === "normal") slope = slope === 0 ? Infinity : -1 / slope;
        const points = Number.isFinite(slope)
          ? [
              { x: xMin, y: y0 + slope * (xMin - anchor) },
              { x: xMax, y: y0 + slope * (xMax - anchor) },
            ]
          : [
              { x: anchor, y: yMin },
              { x: anchor, y: yMax },
            ];
        overlays.push({
          type: "line",
          points,
          color,
          label: `${m.type === "normal" ? "法線" : "接線"} · ${m.expression ? "数値微分" : "隣接点差分"} · x = ${fmt(anchor)}`,
          dashed: true,
        });
      } else if (m.type === "integral") {
        const a = n(m.a, 0),
          b = n(m.b, 1),
          expression = m.expression;
        let points, value, method;
        if (expression) {
          points = Array.from({ length: 201 }, (_, i) => {
            const x = a + ((b - a) * i) / 200;
            return { x, y: evaluateMath(expression, x) };
          });
          value =
            m.method === "analytic"
              ? m.analyticValue
              : integrate(expression, a, b);
          method = m.method === "analytic" ? "解析的積分" : "Simpson法";
        } else {
          const source = [...(data.series[n(m.series, 0)]?.points || [])].sort(
              (a, b) => a.x - b.x,
            ),
            lo = Math.max(Math.min(a, b), source[0]?.x ?? 0),
            hi = Math.min(Math.max(a, b), source.at(-1)?.x ?? 0);
          if (lo > hi) continue;
          points = [];
          const interp = (x) => {
            const i = source.findIndex((p) => p.x >= x);
            if (i === 0) return source[0]?.y;
            if (i < 0) return source.at(-1)?.y;
            const p = source[i - 1],
              q = source[i];
            return p.y + ((q.y - p.y) * (x - p.x)) / (q.x - p.x);
          };
          if (source.length) {
            points = [
              { x: lo, y: interp(lo) },
              ...source.filter((p) => p.x > lo && p.x < hi),
              { x: hi, y: interp(hi) },
            ];
          }
          value = 0;
          for (let i = 1; i < points.length; i++)
            value +=
              ((points[i].x - points[i - 1].x) *
                (points[i].y + points[i - 1].y)) /
              2;
          if (a > b) value = -value;
          method = `台形則 [${fmt(lo)}, ${fmt(hi)}]`;
        }
        overlays.push({
          type: "area",
          points,
          color,
          label: `∫ = ${fmt(value)} · ${method}`,
        });
      } else if (m.type === "vertical" || m.type === "horizontal") {
        overlays.push({
          type: "line",
          points:
            m.type === "vertical"
              ? [
                  { x: n(m.value), y: yMin },
                  { x: n(m.value), y: yMax },
                ]
              : [
                  { x: xMin, y: n(m.value) },
                  { x: xMax, y: n(m.value) },
                ],
          color,
          label: m.label || "",
          dashed: true,
        });
      }
    } catch {
      /* An invalid expression is reported by the inspector; valid data remains visible. */
    }
  }
  if (chart.errorBars || n(chart.errorAmount) > 0 || chart.errorRange)
    for (const series of plotSeries)
      for (const p of series.points) {
        let error = chart.errorRange
          ? Math.abs(
              Number(
                evalCell(
                  sheets,
                  chart.sheetId,
                  p.row,
                  parseRef(chart.errorRange.split(":")[0]).col,
                ),
              ),
            )
          : n(chart.errorAmount) > 0
            ? n(chart.errorAmount)
            : (Math.abs(p.y) * n(chart.errorPercent, 5)) / 100;
        if (Number.isFinite(error)) {
          yMin = Math.min(yMin, p.y - error);
          yMax = Math.max(yMax, p.y + error);
        }
      }
  if (chart.yMin !== null && chart.yMin !== undefined && chart.yMin !== "")
    yMin = n(chart.yMin, yMin);
  if (chart.yMax !== null && chart.yMax !== undefined && chart.yMax !== "")
    yMax = n(chart.yMax, yMax);
  const ys = ticks(yMin, yMax),
    ylo =
      chart.yMin !== null && chart.yMin !== undefined && chart.yMin !== ""
        ? n(chart.yMin)
        : ys[0],
    yhi =
      chart.yMax !== null && chart.yMax !== undefined && chart.yMax !== ""
        ? n(chart.yMax)
        : ys.at(-1);
  const log = chart.yScale === "log" || chart.logY === true,
    positive = [...all, ...overlays.flatMap((o) => o.points || [])]
      .map((p) => p.y)
      .filter((y) => y > 0 && Number.isFinite(y));
  const loglo = Math.max(
      Number.MIN_VALUE,
      chart.yMin > 0 ? chart.yMin : Math.min(...positive, 1),
    ),
    loghi = chart.yMax > 0 ? Number(chart.yMax) : Math.max(...positive, 10);
  const yTicks = log
    ? Array.from(
        {
          length: Math.max(
            0,
            Math.floor(Math.log10(loghi)) - Math.ceil(Math.log10(loglo)) + 1,
          ),
        },
        (_, i) => 10 ** (Math.ceil(Math.log10(loglo)) + i),
      )
    : ys;
  const sy = (y) =>
    log
      ? bottom -
        ((Math.log10(y) - Math.log10(loglo)) /
          (Math.log10(loghi) - Math.log10(loglo) || 1)) *
          ph
      : bottom - ((y - ylo) / (yhi - ylo || 1)) * ph;
  const categoryPad = categorical
    ? (pw / Math.max(1, data.labels.length)) * 0.45
    : 0;
  const positiveX = all.map((p) => p.x).filter((x) => x > 0),
    logX = chart.logX === true,
    logXlo = chart.xMin > 0 ? Number(chart.xMin) : Math.min(...positiveX, 1),
    logXhi = chart.xMax > 0 ? Number(chart.xMax) : Math.max(...positiveX, 10);
  const sx = (x) =>
    left +
    categoryPad +
    (logX
      ? (Math.log10(x) - Math.log10(logXlo)) /
        (Math.log10(logXhi) - Math.log10(logXlo) || 1)
      : (x - xMin) / (xMax - xMin)) *
      (pw - 2 * categoryPad);
  const xt = categorical
    ? []
    : logX
      ? Array.from(
          {
            length: Math.min(
              100,
              Math.max(
                0,
                Math.floor(Math.log10(logXhi)) -
                  Math.ceil(Math.log10(logXlo)) +
                  1,
              ),
            ),
          },
          (_, i) => 10 ** (Math.ceil(Math.log10(logXlo)) + i),
        )
      : ticks(xMin, xMax, 6).filter(
          (v) => v >= xMin - 1e-8 && v <= xMax + 1e-8,
        );
  if (chart.showGrid !== false) {
    for (const y of yTicks) {
      if (log ? y < loglo || y > loghi : y < ylo || y > yhi) continue;
      svg += `<path d="M${left},${sy(y)}H${right}" fill="none" stroke="${theme.grid}" stroke-width="1"/>`;
    }
  }
  for (const y of yTicks) {
    if (log ? y < loglo || y > loghi : y < ylo || y > yhi) continue;
    svg += text(
      left - 13,
      sy(y) + 4,
      fmt(y),
      `fill="${muted}" text-anchor="end" font-size="${fs - 1}"`,
    );
  }
  svg += `<path d="M${left},${bottom}H${right}" stroke="${theme.grid}" fill="none"/>`;
  if (type === "box")
    visible.forEach((s, i) => {
      svg += text(
        sx(i + 1),
        bottom + 22,
        s.name,
        `fill="${muted}" text-anchor="middle" font-size="${fs - 1}"`,
      );
    });
  else if (categorical) {
    const labels = data.labels;
    const stride = Math.max(1, Math.ceil(labels.length / (pw / 60)));
    labels.forEach((label, i) => {
      if (i % stride === 0)
        svg += text(
          sx(i + 1),
          bottom + 22,
          label,
          `fill="${muted}" text-anchor="middle" font-size="${fs - 1}"`,
        );
    });
  } else
    xt.forEach((x) => {
      svg += text(
        sx(x),
        bottom + 22,
        fmt(x),
        `fill="${muted}" text-anchor="middle" font-size="${fs - 1}"`,
      );
    });
  if (chart.xLabel)
    svg += text(
      (left + right) / 2,
      height - 14,
      chart.xLabel,
      `fill="${fg}" text-anchor="middle" font-size="${fs}"`,
    );
  if (chart.yLabel)
    svg += `<text x="19" y="${(top + bottom) / 2}" fill="${fg}" text-anchor="middle" transform="rotate(-90 19 ${(top + bottom) / 2})" font-size="${fs}">${esc(chart.yLabel)}</text>`;
  if (Number(chart.minorTicks) > 0) {
    const count = Math.min(10, Number(chart.minorTicks));
    for (let i = 0; i < 5; i++)
      for (let j = 1; j <= count; j++) {
        const x = left + (pw * (i + j / (count + 1))) / 5,
          y = top + (ph * (i + j / (count + 1))) / 5;
        svg += `<path d="M${x} ${bottom}v4 M${left - 4} ${y}h4" stroke="${esc(muted)}"/>`;
      }
  }
  svg += `<g clip-path="url(#plot-${id})">`;
  if (type === "heatmap") {
    const min = Math.min(...all.map((p) => p.y)),
      max = Math.max(...all.map((p) => p.y)),
      cw = pw / Math.max(1, data.labels.length),
      ch = ph / Math.max(1, visible.length);
    visible.forEach((s, j) =>
      s.points.forEach((p, i) => {
        const opacity = 0.12 + (0.88 * (p.y - min)) / (max - min || 1);
        svg += `<rect x="${left + i * cw + 1}" y="${top + j * ch + 1}" width="${cw - 2}" height="${ch - 2}" rx="3" fill="${esc(s.color)}" opacity="${opacity}" ${pointAttr(s, p, i)}>${tooltip(s, p)}</rect>${text(left + (i + 0.5) * cw, top + (j + 0.5) * ch + 4, fmt(p.y), `text-anchor="middle" fill="${p.y - min > (max - min) * 0.6 ? "white" : fg}" font-size="${fs}"`)}`;
      }),
    );
  } else if (type === "box") {
    visible.forEach((s, i) => {
      const vals = s.points.map((p) => p.y).filter((y) => !log || y > 0);
      if (!vals.length) return;
      const q1 = quantile(vals, 0.25),
        median = quantile(vals, 0.5),
        q3 = quantile(vals, 0.75),
        lo = Math.min(...vals),
        hi = Math.max(...vals),
        x = sx(i + 1),
        w = Math.min(68, (pw / visible.length) * 0.35);
      svg += `<g stroke="${esc(s.color)}" stroke-width="2"><path d="M${x},${sy(lo)}V${sy(hi)} M${x - w * 0.3},${sy(lo)}h${w * 0.6} M${x - w * 0.3},${sy(hi)}h${w * 0.6}"/><rect x="${x - w / 2}" y="${sy(q3)}" width="${w}" height="${sy(q1) - sy(q3)}" fill="${esc(s.color)}" fill-opacity=".13"/><path d="M${x - w / 2},${sy(median)}h${w}"/></g>`;
    });
  } else {
    const stackedPos = new Map(),
      stackedNeg = new Map();
    plotSeries.forEach((s) => {
      const pts = s.points.filter(
        (p) => valid(p) && (!log || p.y > 0) && (!chart.logX || p.x > 0),
      );
      if (["bar", "histogram", "stacked"].includes(type)) {
        const slot = pw / Math.max(1, pts.length),
          count = type === "stacked" ? 1 : plotSeries.length,
          w = (slot * 0.65) / count;
        pts.forEach((p, i) => {
          let base = 0;
          if (type === "stacked") {
            const map = p.y >= 0 ? stackedPos : stackedNeg;
            base = map.get(p.x) || 0;
            map.set(p.x, base + p.y);
          }
          const x =
            sx(p.x) -
            slot * 0.325 +
            (type === "stacked"
              ? 0
              : plotSeries.findIndex((v) => v.index === s.index) * w);
          const yy = sy(base + p.y),
            b = sy(log ? Math.max(loglo, base) : base);
          svg += `<rect x="${x}" y="${Math.min(yy, b)}" width="${Math.max(1, w - 2)}" height="${Math.abs(b - yy)}" rx="${type === "stacked" ? 0 : 2}" fill="${esc(s.color)}" ${pointAttr(s, p, i)}>${tooltip(s, p)}</rect>`;
        });
      } else {
        const d = linePath(pts, sx, sy);
        if (type === "area" && pts.length)
          svg += `<path d="${d} L${sx(pts.at(-1).x)},${sy(log ? loglo : 0)} L${sx(pts[0].x)},${sy(log ? loglo : 0)} Z" fill="${esc(s.color)}" fill-opacity=".11"/>`;
        if (type !== "scatter")
          svg += `<path d="${d}" fill="none" stroke="${esc(s.color)}" stroke-width="${lw}" stroke-linecap="round" stroke-linejoin="round" ${chart.lineStyle === "dashed" ? 'stroke-dasharray="8 5"' : ""}/>`;
        if (chart.showPoints !== false || type === "scatter")
          pts.forEach((p, i) => {
            svg += `<${chart.pointShape === "square" ? "rect" : "circle"} ${chart.pointShape === "square" ? `x="${sx(p.x) - pointSize}" y="${sy(p.y) - pointSize}" width="${pointSize * 2}" height="${pointSize * 2}"` : `cx="${sx(p.x)}" cy="${sy(p.y)}" r="${pointSize}"`} fill="${esc(s.color)}" stroke="${esc(bg)}" stroke-width="2" ${pointAttr(s, p, i)}>${tooltip(s, p)}</${chart.pointShape === "square" ? "rect" : "circle"}>`;
          });
        if (chart.showLabels)
          pts.forEach((p) => {
            svg += text(
              sx(p.x),
              sy(p.y) - 10,
              fmt(p.y),
              `fill="${esc(s.color)}" text-anchor="middle" font-size="${fs - 2}"`,
            );
          });
        if (chart.errorBars || n(chart.errorAmount) > 0 || chart.errorRange)
          pts.forEach((p) => {
            const error = chart.errorRange
                ? Math.abs(
                    Number(
                      evalCell(
                        sheets,
                        chart.sheetId,
                        p.row,
                        parseRef(chart.errorRange.split(":")[0]).col,
                      ),
                    ),
                  )
                : n(chart.errorAmount) > 0
                  ? n(chart.errorAmount)
                  : (Math.abs(p.y) * n(chart.errorPercent, 5)) / 100,
              y1 = sy(log ? Math.max(loglo, p.y - error) : p.y - error),
              y2 = sy(p.y + error),
              x = sx(p.x);
            if (!Number.isFinite(error)) return;
            svg += `<path d="M${x},${y1}V${y2} M${x - 4},${y1}h8 M${x - 4},${y2}h8" stroke="${esc(s.color)}" stroke-width="1.2" fill="none"/>`;
          });
      }
    });
  }
  overlays
    .filter((o) => o.type !== "coordinate")
    .forEach((o) => {
      const pts = o.points.filter(
        (p) => valid(p) && (!log || p.y > 0) && (!chart.logX || p.x > 0),
      );
      if (!pts.length) return;
      const d = linePath(pts, sx, sy);
      if (o.type === "area")
        svg += `<path d="${d} L${sx(pts.at(-1).x)},${sy(log ? loglo : 0)} L${sx(pts[0].x)},${sy(log ? loglo : 0)}Z" fill="${esc(o.color)}" fill-opacity=".18"/>`;
      svg += `<path d="${d}" fill="none" stroke="${esc(o.color)}" stroke-width="${lw}" ${o.dashed ? 'stroke-dasharray="7 5"' : ""}/>`;
    });
  svg += "</g>";
  overlays
    .filter((o) => o.type === "coordinate" && (!log || o.point.y > 0))
    .forEach((o) => {
      svg += `<circle cx="${sx(o.point.x)}" cy="${sy(o.point.y)}" r="4" fill="${esc(o.color)}"/>`;
      svg += text(
        sx(o.point.x) + 9,
        sy(o.point.y) - 12,
        o.label,
        `fill="${esc(o.color)}" font-size="${fs}" paint-order="stroke" stroke="${esc(bg)}" stroke-width="4" stroke-linejoin="round"`,
      );
    });
  overlays
    .filter((o) => o.type !== "coordinate")
    .forEach((o, i) => {
      if (o.label)
        svg += `<rect x="${left + 10}" y="${top + 10 + i * 24}" width="${Math.min(pw - 20, o.label.length * (fs - 1) * 0.65 + 20)}" height="22" fill="${esc(bg)}" opacity=".92" rx="3"/>${text(left + 18, top + 25 + i * 24, o.label, `fill="${esc(o.color)}" font-size="${fs - 1}"`)}`;
    });
  (chart.annotations || [])
    .filter((a) => !a.hidden)
    .forEach((a) => {
      svg += text(
        a.coordinateMode === "percent"
          ? (n(a.x, 55) * width) / 100
          : n(a.x, width * 0.55),
        a.coordinateMode === "percent"
          ? (n(a.y, 35) * height) / 100
          : n(a.y, height * 0.35),
        a.text,
        `fill="${esc(a.color || fg)}" font-size="${n(a.fontSize, fs + 2)}" data-annotation-id="${esc(a.id)}" style="cursor:move"`,
      );
    });
  svg = svg.replace(
    "<svg ",
    `<svg data-plot-left="${left}" data-plot-right="${right}" data-plot-top="${top}" data-plot-bottom="${bottom}" data-x-min="${logX ? logXlo : xMin}" data-x-max="${logX ? logXhi : xMax}" data-y-min="${log ? loglo : ylo}" data-y-max="${log ? loghi : yhi}" data-y-log="${log}" data-x-log="${logX}" `,
  );
  return svg + "</svg>";
}

export function renderChart(original, sheets, options = {}) {
  const width = options.width || 900,
    height = options.height || 520;
  const prepared = prepareChart(original, sheets, getChartData),
    chart = {
      ...prepared.chart,
      id: prepared.chart.id + "-" + width + "x" + height,
    };
  let svg;
  if (chart.type === "contour") svg = contourSVG(chart, width, height);
  else if (["combo", "dual"].includes(chart.type))
    svg = compositeSVG(chart, prepared.sheets, getChartData, width, height);
  else svg = baseRenderChart(chart, prepared.sheets, options);
  return decorateSVG(themeEffects(svg, original), original, width, height);
}
