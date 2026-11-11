// Themes own visual properties; source data, scales and mathematical objects
// deliberately stay outside this list.
export const themeVisualKeys = [
  "colors",
  "background",
  "textColor",
  "fontFamily",
  "fontSize",
  "lineWidth",
  "pointSize",
  "pointShape",
  "lineStyle",
  "showGrid",
  "showPoints",
  "showLabels",
  "showLegend",
  "minorTicks",
  "marginLeft",
  "marginRight",
  "marginTop",
  "marginBottom",
  "themeTokens",
];
export const themeStyleOptions = [
  ["flat", "フラット"],
  ["soft", "ソフト"],
  ["cute", "かわいい"],
  ["minimal", "ミニマル"],
  ["scientific", "科学・学術"],
  ["technical", "製図"],
  ["editorial", "エディトリアル"],
  ["outline", "アウトライン"],
  ["geometric", "幾何学"],
  ["glass", "ガラス"],
  ["neon", "ネオン"],
  ["pixel", "ピクセル"],
  ["print", "印刷・手描き"],
];
const common = {
  lineWidth: 3,
  pointSize: 4,
  pointShape: "circle",
  lineCap: "round",
  lineJoin: "round",
  marker: "solid",
  markerStroke: 2,
  barRadius: 0,
  barRatio: 0.7,
  outlineWidth: 0,
  areaOpacity: 0.18,
  fontSize: 13,
  titleSize: 28,
  titleWeight: 700,
  letterSpacing: 0,
  layout: "standard",
  elements: "standard",
  grid: "y",
  gridWidth: 1,
  gridDash: "",
  axisWidth: 1,
  axes: "bottom",
  ticks: false,
  legend: "line",
  surface: "none",
  surfaceRadius: 0,
  shadow: "none",
  backgroundEffect: "none",
  showPoints: true,
  minorTicks: 0,
};
const styles = {
  flat: {},
  soft: {
    lineWidth: 3.5,
    pointSize: 5,
    barRadius: 8,
    surface: "card",
    surfaceRadius: 16,
    shadow: "soft",
    legend: "pill",
    gridDash: "2 5",
  },
  cute: {
    lineWidth: 4.6,
    pointSize: 6,
    marker: "ink",
    markerStroke: 1.8,
    barRadius: 14,
    barRatio: 0.62,
    titleSize: 32,
    titleWeight: 800,
    fontSize: 14,
    fontFamily: "Trebuchet MS, sans-serif",
    gridDash: "1 6",
    gridWidth: 1.6,
    axisWidth: 0,
    legend: "pill",
    surface: "card",
    surfaceRadius: 24,
    layout: "spacious",
    areaOpacity: 0.24,
  },
  minimal: {
    lineWidth: 1.8,
    pointSize: 3,
    marker: "hollow",
    markerStroke: 1.5,
    fontSize: 12,
    titleSize: 24,
    titleWeight: 500,
    grid: "none",
    axisWidth: 0.7,
    layout: "spacious",
    showPoints: false,
  },
  scientific: {
    lineWidth: 1.6,
    pointSize: 3.5,
    pointShape: "series",
    marker: "hollow",
    markerStroke: 1.5,
    outlineWidth: 1,
    fontSize: 12,
    titleSize: 22,
    titleWeight: 600,
    grid: "none",
    axes: "left-bottom",
    ticks: true,
    layout: "compact",
    elements: "scientific",
    areaOpacity: 0.1,
  },
  technical: {
    lineWidth: 1.5,
    pointSize: 3,
    pointShape: "square",
    marker: "hollow",
    markerStroke: 1.2,
    fontSize: 12,
    titleSize: 23,
    titleWeight: 500,
    fontFamily: "monospace",
    grid: "both",
    gridDash: "2 3",
    gridWidth: 0.7,
    axes: "frame",
    ticks: true,
    minorTicks: 3,
    layout: "compact",
    elements: "scientific",
    legend: "square",
  },
  editorial: {
    lineWidth: 2.5,
    pointSize: 3,
    showPoints: false,
    fontFamily: "serif",
    fontSize: 14,
    titleSize: 39,
    titleWeight: 500,
    letterSpacing: -0.5,
    grid: "none",
    axisWidth: 0,
    layout: "spacious",
    legend: "square",
    barRatio: 0.56,
    areaOpacity: 0.2,
  },
  outline: {
    lineWidth: 4,
    pointSize: 5.5,
    marker: "ink",
    markerStroke: 2,
    barRadius: 1,
    outlineWidth: 2,
    titleSize: 30,
    titleWeight: 800,
    gridDash: "4 5",
    axisWidth: 2,
    axes: "left-bottom",
    legend: "square",
    surface: "frame",
  },
  geometric: {
    lineWidth: 5,
    pointSize: 6,
    pointShape: "square",
    marker: "ink",
    markerStroke: 2,
    outlineWidth: 2,
    titleSize: 34,
    titleWeight: 800,
    grid: "none",
    axisWidth: 3,
    axes: "left-bottom",
    lineCap: "butt",
    lineJoin: "miter",
    legend: "square",
    layout: "spacious",
  },
  glass: {
    lineWidth: 3.4,
    pointSize: 5,
    barRadius: 7,
    surface: "glass",
    surfaceRadius: 20,
    shadow: "soft",
    gridDash: "2 5",
    axisWidth: 0,
    legend: "pill",
    backgroundEffect: "gradient",
    layout: "spacious",
  },
  neon: {
    lineWidth: 3.5,
    pointSize: 4,
    marker: "hollow",
    markerStroke: 2,
    barRadius: 2,
    outlineWidth: 1,
    fontFamily: "monospace",
    titleSize: 29,
    grid: "both",
    gridDash: "2 6",
    gridWidth: 0.7,
    axes: "frame",
    shadow: "glow",
    legend: "square",
    backgroundEffect: "dark-gradient",
  },
  pixel: {
    lineWidth: 3.5,
    pointSize: 4,
    pointShape: "square",
    markerStroke: 0,
    fontFamily: "monospace",
    titleSize: 26,
    grid: "both",
    gridDash: "2 4",
    axes: "left-bottom",
    axisWidth: 2,
    lineCap: "butt",
    lineJoin: "miter",
    legend: "square",
    barRatio: 0.8,
  },
  print: {
    lineWidth: 2.8,
    pointSize: 4.5,
    marker: "hollow",
    markerStroke: 2,
    barRadius: 2,
    titleSize: 30,
    gridDash: "3 7",
    axisWidth: 1.4,
    axes: "left-bottom",
    legend: "square",
    backgroundEffect: "paper",
    areaOpacity: 0.26,
  },
};
const families = {
  botanical: "flat",
  scientific: "scientific",
  academic: "scientific",
  minimal: "minimal",
  swiss: "geometric",
  pastel: "soft",
  japandi: "editorial",
  warm: "minimal",
  dark: "flat",
  blueprint: "technical",
  editorial: "editorial",
  bauhaus: "geometric",
  "flat-design": "flat",
  "flat-2-0": "soft",
  minimalism: "minimal",
  "material-design": "flat",
  "soft-ui": "soft",
  "outline-design": "outline",
  "kawaii-minimal": "cute",
  scandinavian: "minimal",
  "organic-design": "soft",
  "rounded-modern": "soft",
  "candy-color": "cute",
  glassmorphism: "glass",
  neumorphism: "soft",
  "gradient-modern": "flat",
  "aurora-design": "glass",
  cyberpunk: "neon",
  "bento-design": "flat",
  "neo-brutalism": "outline",
  "technical-drawing": "technical",
  "mathematical-clean": "scientific",
  "laboratory-modern": "scientific",
  "grayscale-scientific": "scientific",
  "data-centric": "technical",
  "luxury-minimal": "editorial",
  "art-deco": "geometric",
  "modern-classic": "editorial",
  "corporate-modern": "flat",
  "premium-dark": "editorial",
  "typography-first": "editorial",
  "retro-modern": "print",
  "mid-century-modern": "geometric",
  "memphis-design": "geometric",
  risograph: "print",
  "pixel-design": "pixel",
  "hand-drawn": "print",
  "comic-style": "outline",
};
const details = {
  botanical: { lineWidth: 2.8, barRadius: 3 },
  academic: { fontFamily: "serif", titleWeight: 500 },
  swiss: { lineWidth: 3, titleSize: 35, pointSize: 4, showPoints: false },
  pastel: { shadow: "none", titleSize: 30 },
  japandi: { titleSize: 31, lineWidth: 2 },
  warm: { fontSize: 14, lineWidth: 2.4 },
  dark: { lineWidth: 3.4, barRadius: 4 },
  "flat-2-0": { surfaceRadius: 10, barRadius: 4 },
  "material-design": {
    barRadius: 4,
    titleSize: 29,
    surface: "card",
    surfaceRadius: 8,
  },
  "organic-design": { shadow: "none", barRadius: 16, lineWidth: 3.8 },
  "rounded-modern": { barRadius: 18, surfaceRadius: 24, shadow: "none" },
  neumorphism: { surface: "card", surfaceRadius: 22, shadow: "raised" },
  "gradient-modern": {
    backgroundEffect: "gradient",
    barRadius: 5,
    lineWidth: 3.8,
  },
  "aurora-design": { backgroundEffect: "dark-gradient" },
  "bento-design": {
    surface: "card",
    surfaceRadius: 14,
    legend: "pill",
    barRadius: 6,
    lineWidth: 3.5,
  },
  "neo-brutalism": { shadow: "hard", titleSize: 34 },
  "mathematical-clean": { grid: "both", gridDash: "", gridWidth: 0.6 },
  "laboratory-modern": {
    grid: "y",
    gridDash: "3 4",
    lineWidth: 2.2,
    fontFamily: "sans-serif",
  },
  "data-centric": { fontSize: 11, titleSize: 21, minorTicks: 0 },
  "luxury-minimal": { titleSize: 35, lineWidth: 1.6 },
  "art-deco": {
    fontFamily: "serif",
    lineWidth: 2,
    pointShape: "diamond",
    pointSize: 5,
    outlineWidth: 1,
    titleWeight: 500,
    surface: "frame",
  },
  "modern-classic": { titleSize: 33, lineWidth: 2 },
  "corporate-modern": { barRadius: 2 },
  "premium-dark": { titleSize: 35, lineWidth: 2 },
  "typography-first": { titleSize: 44, titleWeight: 700 },
  "retro-modern": { fontFamily: "serif" },
  "mid-century-modern": { lineWidth: 3.5, outlineWidth: 0 },
  "memphis-design": { pointShape: "diamond", lineWidth: 4, barRadius: 5 },
  risograph: { lineWidth: 4, marker: "solid" },
  "hand-drawn": { fontFamily: "Trebuchet MS, sans-serif" },
  "comic-style": {
    titleSize: 34,
    lineWidth: 4.5,
    barRadius: 8,
    shadow: "hard",
    surfaceRadius: 8,
  },
};
const layouts = {
  standard: {
    marginLeft: 80,
    marginRight: 42,
    marginTop: 110,
    marginBottom: 64,
  },
  compact: { marginLeft: 68, marginRight: 38, marginTop: 90, marginBottom: 60 },
  spacious: {
    marginLeft: 100,
    marginRight: 62,
    marginTop: 142,
    marginBottom: 80,
  },
};
export function themeDesign(theme, tokens = {}) {
  const family = families[theme.id] || "flat",
    style = Object.hasOwn(styles, tokens.style) ? tokens.style : family;
  const d = {
    ...common,
    ...styles[style],
    ...(style === family ? details[theme.id] : {}),
    style,
  };
  if (Object.hasOwn(layouts, tokens.layout)) d.layout = tokens.layout;
  if (
    ["standard", "scientific", "minimal"].includes(tokens.elements) &&
    tokens.elements !== d.elements
  ) {
    d.elements = tokens.elements;
    if (tokens.elements === "minimal")
      Object.assign(d, {
        grid: "none",
        axes: "bottom",
        ticks: false,
        minorTicks: 0,
        axisWidth: 0.7,
        showPoints: false,
      });
    if (tokens.elements === "scientific")
      Object.assign(d, {
        axes: "left-bottom",
        axisWidth: 1,
        ticks: true,
        marker: "hollow",
        markerStroke: 1.5,
        pointShape: "series",
        barRadius: 0,
        outlineWidth: 1,
      });
    if (tokens.elements === "standard")
      Object.assign(d, {
        axes: "bottom",
        axisWidth: 1,
        ticks: false,
        minorTicks: 0,
        grid: "y",
        pointShape: "circle",
        marker: "solid",
        markerStroke: 2,
      });
  }
  return d;
}
function defaults(theme, d) {
  return {
    ...layouts[d.layout],
    lineWidth: d.lineWidth,
    pointSize: d.pointSize,
    fontSize: d.fontSize,
    fontFamily: d.fontFamily || theme.font,
    pointShape: d.pointShape,
    lineStyle: "solid",
    showPoints: d.showPoints,
    showGrid: d.grid !== "none",
    showLegend: true,
    showLabels: false,
    minorTicks: d.minorTicks,
    background: theme.bg,
    textColor: theme.fg,
  };
}
export function resolveChartTheme(chart, theme) {
  const d = themeDesign(theme, chart.themeTokens);
  const resolved = {
    ...defaults(theme, d),
    ...Object.fromEntries(
      Object.entries(chart).filter(([, value]) => value !== undefined),
    ),
    _design: d,
  };
  resolved._theme = {
    ...theme,
    muted: readableMuted(theme.muted, resolved.background, resolved.textColor),
  };
  return resolved;
}
function readableMuted(color, background, ink) {
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const lum = (channels) =>
    channels
      .map((v) => v / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
  const base = rgb(color),
    bg = lum(rgb(background)),
    target = rgb(ink);
  for (let step = 0; step <= 10; step++) {
    const mixed = base.map((v, i) =>
        Math.round(v + ((target[i] - v) * step) / 10),
      ),
      l = lum(mixed);
    if (
      (Math.max(l, bg) + 0.05) / (Math.min(l, bg) + 0.05) >= 4.5 ||
      step === 10
    )
      return "#" + mixed.map((v) => v.toString(16).padStart(2, "0")).join("");
  }
}
export function applyChartTheme(chart, theme, tokens = {}) {
  for (const key of themeVisualKeys) delete chart[key];
  const d = themeDesign(theme, tokens);
  return Object.assign(chart, defaults(theme, d), {
    theme: theme.id,
    colors: [...theme.colors],
    themeTokens: {
      style: d.style,
      palette: theme.id,
      typography: d.fontFamily || theme.font,
      layout: d.layout,
      elements: d.elements,
      ...tokens,
    },
  });
}
export function themeSnapshot(chart, theme) {
  const resolved = resolveChartTheme(chart, theme);
  return {
    theme: chart.theme,
    ...Object.fromEntries(
      themeVisualKeys
        .filter((key) => resolved[key] !== undefined)
        .map((key) => [key, structuredClone(resolved[key])]),
    ),
  };
}
const e = (value) =>
  String(value ?? "").replace(
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
export function chartLayout(chart, width, height) {
  const scale = Math.min(1, width / 720, height / 400);
  return {
    left: Number(chart.marginLeft) * scale,
    right: width - Number(chart.marginRight) * scale,
    top: Number(chart.marginTop) * scale,
    bottom: height - Number(chart.marginBottom) * scale,
    scale,
  };
}
export function chartOpening(
  chart,
  width,
  height,
  { left, right, top, bottom, scale },
) {
  const d = chart._design,
    theme = chart._theme,
    titleSize = d.titleSize * scale,
    titleY = Math.max(34 * scale, titleSize * 1.12),
    fg = chart.textColor,
    id = chart.id;
  const surface =
    d.surface !== "none"
      ? `<rect data-chart-surface="true" x="${left - 18 * scale}" y="${top - 8 * scale}" width="${right - left + 36 * scale}" height="${bottom - top + 22 * scale}" rx="${d.surfaceRadius * scale}" fill="${chart.transparent || d.surface === "frame" ? "none" : d.surface === "glass" ? "#ffffff" : theme.bg === "#ffffff" ? "#f7f8fa" : "#ffffff"}" fill-opacity="${d.surface === "glass" ? 0.12 : 0.82}" stroke="${e(d.surface === "frame" ? fg : theme.grid)}" stroke-width="${d.surface === "frame" ? Math.max(1, d.outlineWidth) : 0.8}" ${!chart.transparent && ["soft", "raised", "hard"].includes(d.shadow) ? `filter="url(#theme-shadow-${id})"` : ""}/>`
      : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${e(chart.title || "名称未設定のグラフ")}" class="chart-svg" fill="${e(fg)}" data-theme-style="${d.style}" data-theme-layout="${d.layout}" style="font-family:${e(chart.fontFamily)};font-size:${chart.fontSize * scale}px"><rect data-chart-background="true" width="${width}" height="${height}" fill="${chart.transparent ? "none" : e(chart.background)}"/>${surface}<g fill="${e(fg)}"><text class="chart-title" x="${left}" y="${titleY}" font-family="${e(chart.fontFamily)}" font-size="${titleSize}" font-weight="${d.titleWeight}" letter-spacing="${d.letterSpacing * scale}" data-chart-title="true">${e(chart.title || "名称未設定のグラフ")}</text>${chart.subtitle ? `<text x="${left}" y="${titleY + 23 * scale}" fill="${e(theme.muted)}" font-size="${(chart.fontSize - 1) * scale}">${e(chart.subtitle)}</text>` : ""}</g>${d.style === "editorial" ? `<path class="chart-heading-rule" d="M${left},${top - 44 * scale}H${right}" stroke="${e(fg)}" stroke-width=".7"/>` : ""}`;
}
export function chartLegend(chart, series, { left, top, scale }) {
  if (chart.showLegend === false) return "";
  const d = chart._design,
    fs = (chart.fontSize - 1) * scale,
    y = top - 20 * scale;
  let x = left,
    out = "";
  for (const s of series) {
    const width = Math.max(
      86 * scale,
      Array.from(s.name).reduce(
        (n, c) => n + (/[\u3000-\uffff]/.test(c) ? fs : fs * 0.58),
        0,
      ) +
        42 * scale,
    );
    const marker =
      d.legend === "square"
        ? `<rect x="${x}" y="${y - 8 * scale}" width="${9 * scale}" height="${9 * scale}" fill="${e(s.color)}"/>`
        : `<path d="M${x},${y - 3 * scale}h${17 * scale}" stroke="${e(s.color)}" stroke-width="${chart.lineWidth * scale}" stroke-linecap="${d.lineCap}"/>`;
    out += `<g class="chart-legend" data-series-index="${s.index ?? s.i}" style="cursor:pointer">${d.legend === "pill" ? `<rect x="${x - 9 * scale}" y="${y - 17 * scale}" width="${width - 7 * scale}" height="${27 * scale}" rx="${13.5 * scale}" fill="${e(chart.background)}" stroke="${e(chart._theme.grid)}" stroke-width="1"/>` : ""}${marker}<text x="${x + 25 * scale}" y="${y + scale}" fill="${e(chart.textColor)}" font-size="${fs}" font-weight="${d.legend === "pill" ? 600 : 400}">${e(s.name)}</text></g>`;
    x += width;
  }
  return out;
}
export function markerSVG(
  chart,
  x,
  y,
  color,
  attrs = "",
  content = "",
  index = 0,
  scale = 1,
) {
  const d = chart._design,
    size = chart.pointSize * scale,
    shape =
      chart.pointShape === "series"
        ? ["circle", "square", "diamond"][index % 3]
        : chart.pointShape;
  const stroke =
      d.marker === "ink"
        ? chart.textColor
        : d.marker === "hollow"
          ? color
          : chart.background,
    common = `class="chart-point" fill="${e(d.marker === "hollow" ? chart.background : color)}" stroke="${e(stroke)}" stroke-width="${d.markerStroke * scale}" ${attrs}`;
  if (shape === "square")
    return `<rect x="${x - size}" y="${y - size}" width="${size * 2}" height="${size * 2}" ${common}>${content}</rect>`;
  if (shape === "diamond")
    return `<path d="M${x},${y - size * 1.3}L${x + size * 1.1},${y}L${x},${y + size * 1.3}L${x - size * 1.1},${y}Z" ${common}>${content}</path>`;
  return `<circle cx="${x}" cy="${y}" r="${size}" ${common}>${content}</circle>`;
}
