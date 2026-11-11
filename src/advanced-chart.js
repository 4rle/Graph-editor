import {
  sampleCurve,
  expression,
  symbolic,
  extrema,
  intersections,
  movingAverage,
  localTangent,
  nonlinearFit,
  polygonArea,
  analyticIntegral,
} from "./science.js";
import { renderObjects, escapeXML as e } from "./objects.js";
import { contours } from "d3-contour";
import { evalCell, cellRef } from "./engine.js";
export function prepareChart(original, sheets, getData) {
  let chart = { ...original, math: [...(original.math || [])] },
    data = getData(original, sheets);
  if (
    ["parametric", "polar"].includes(chart.type) ||
    chart.type === "function"
  ) {
    const pts = sampleCurve(chart).filter((p) => Number.isFinite(p.y)),
      cells = { A1: { raw: "X" }, B1: { raw: "Y" } };
    pts.forEach((p, i) => {
      cells["A" + (i + 2)] = { raw: String(p.x) };
      cells["B" + (i + 2)] = { raw: String(p.y) };
    });
    const sheet = { id: "generated", name: "関数", cells };
    sheets = [...sheets, sheet];
    chart = {
      ...chart,
      type: "line",
      sheetId: sheet.id,
      range: `A1:B${pts.length + 1}`,
      showPoints: false,
    };
  }
  const source = data.series[0]?.points || [];
  chart.math = chart.math.flatMap((m) => {
    try {
      const points = data.series[m.series || 0]?.points || source,
        a = Number(m.a ?? chart.xMin ?? 0),
        b = Number(m.b ?? chart.xMax ?? 10);
      if (
        ["normal", "tangent"].includes(m.type) &&
        !m.expression &&
        m.pointIndex != null
      )
        return [{ ...m, x0: points[m.pointIndex]?.x ?? m.x0 }];
      if (m.type === "integral" && m.method === "analytic") {
        return [
          {
            ...m,
            analyticValue: analyticIntegral(m.expression, m.a, m.b).value,
          },
        ];
      }
      if (m.type === "smoothed")
        return [
          {
            ...m,
            type: "sampled",
            points: movingAverage(points, m.window),
            label: `移動平均 · 窓幅 ${m.window || 3}`,
          },
        ];
      if (m.type === "fitted-tangent") {
        const t = localTangent(points, m.pointIndex || 0, m.method, m.window);
        return [
          {
            ...m,
            type: "sampled",
            points: [
              { x: Math.min(...points.map((p) => p.x)), y: 0 },
              { x: Math.max(...points.map((p) => p.x)), y: 0 },
            ].map((p) => ({ x: p.x, y: t.predict(p.x) })),
            label: `接線 · ${m.method} · 傾き ${t.slope.toPrecision(6)}`,
          },
        ];
      }
      if (m.type === "nonlinear") {
        const fit = nonlinearFit(points, m.expression, m.initial);
        const min = Math.min(...points.map((p) => p.x)),
          max = Math.max(...points.map((p) => p.x));
        return [
          {
            ...m,
            type: "sampled",
            points: Array.from({ length: 200 }, (_, i) => ({
              x: min + ((max - min) * i) / 199,
              y: fit.predict(min + ((max - min) * i) / 199),
            })),
            label: `${fit.equation} · R²=${fit.r2.toFixed(6)}`,
          },
        ];
      }
      if (m.type === "extrema" || m.type === "intersection") {
        const pts =
          m.type === "extrema"
            ? extrema(m.expression, a, b)
            : intersections(m.expression, m.secondExpression, a, b);
        return pts.map((p) => ({
          ...m,
          type: "calculated-point",
          point: p,
          label: `${m.type === "extrema" ? "極値" : "交点"} (${p.x.toPrecision(5)}, ${p.y.toPrecision(5)})`,
        }));
      }
      if (m.type === "distance" || m.type === "slope") {
        const p = points[m.pointIndex || 0],
          q = points[m.secondPoint || 1];
        if (!p || !q) return [];
        const value =
          m.type === "distance"
            ? Math.hypot(q.x - p.x, q.y - p.y)
            : (q.y - p.y) / (q.x - p.x);
        return [
          {
            ...m,
            type: "sampled",
            points: [p, q],
            label: `${m.type === "distance" ? "点間距離" : "傾き"} = ${Number(value.toPrecision(7))}`,
          },
        ];
      }
      if (m.type === "transform")
        return [
          {
            ...m,
            type: "function",
            expression: `${m.scaleY ?? 1}*(${m.expression.replace(/\bx\b/g, `(${m.scaleX ?? 1}*(x-${m.shiftX ?? 0}))`)})+${m.shiftY ?? 0}`,
          },
        ];
      if (m.type === "derivative-symbolic")
        return [
          {
            ...m,
            type: "function",
            expression: symbolic(m.expression).derivative,
            label: "記号微分",
          },
        ];
      return [m];
    } catch {
      return [];
    }
  });
  return { chart, sheets };
}
export function contourSVG(chart, width, height) {
  const n = 60,
    x0 = Number(chart.xMin ?? -5),
    x1 = Number(chart.xMax ?? 5),
    y0 = Number(chart.yMin ?? -5),
    y1 = Number(chart.yMax ?? 5),
    f = expression(chart.expression || "x^2+y^2", chart.parameters || {}),
    values = [];
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      try {
        values.push(
          f({
            x: x0 + ((x1 - x0) * i) / (n - 1),
            y: y0 + ((y1 - y0) * j) / (n - 1),
          }),
        );
      } catch {
        values.push(NaN);
      }
    }
  const cs = contours()
      .size([n, n])
      .thresholds(Number(chart.contourLevels || 10))(values),
    left = 65,
    top = 80,
    w = width - 110,
    h = height - 135;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${e(chart.title)}"><rect width="100%" height="100%" fill="${e(chart.background || "#ffffff")}"/><text x="${left}" y="35" fill="#333333" font-size="22">${e(chart.title)}</text>`;
  cs.forEach((c, i) => {
    const d = c.coordinates
      .flatMap((p) =>
        p.map(
          (r) =>
            r
              .map(
                ([x, y], k) =>
                  `${k ? "L" : "M"}${left + (x * w) / n},${top + h - (y * h) / n}`,
              )
              .join(" ") + "Z",
        ),
      )
      .join(" ");
    out += `<path d="${d}" fill="${chart.filledContour ? "#777777" : "none"}" fill-opacity="${(i + 1) / (cs.length + 2)}" stroke="${e(chart.colors?.[i % chart.colors.length] || "#555555")}" stroke-width="1.2"><title>${c.value}</title></path>`;
  });
  for (let i = 0; i <= 5; i++)
    out += `<text x="${left + (w * i) / 5}" y="${top + h + 22}" text-anchor="middle" font-size="12">${Number((x0 + ((x1 - x0) * i) / 5).toPrecision(4))}</text><text x="${left - 10}" y="${top + h - (h * i) / 5}" text-anchor="end" font-size="12">${Number((y0 + ((y1 - y0) * i) / 5).toPrecision(4))}</text>`;
  return (
    out +
    `<rect x="${left}" y="${top}" width="${w}" height="${h}" fill="none" stroke="#888888"/></svg>`
  );
}
export function compositeSVG(chart, sheets, getData, width, height) {
  const data = getData(chart, sheets),
    visible = data.series
      .map((s, i) => ({ ...s, i }))
      .filter((s) => !chart.seriesHidden?.includes(s.i)),
    colors = chart.colors?.length
      ? chart.colors
      : ["#587da5", "#b27a48", "#76956e"],
    left = 70,
    right = width - 75,
    top = 85,
    bottom = height - 65,
    pw = right - left,
    ph = bottom - top;
  const xs = visible.flatMap((s) => s.points.map((p) => p.x)),
    xmin = Number(chart.xMin ?? Math.min(...xs)),
    xmax = Number(chart.xMax ?? Math.max(...xs)),
    rightSeries = chart.secondarySeries || [1],
    groups = [
      visible.filter((s) => !rightSeries.includes(s.i)),
      visible.filter((s) => rightSeries.includes(s.i)),
    ],
    ranges = groups.map((ss) => {
      const ys = ss.flatMap((s) => s.points.map((p) => p.y));
      return [Math.min(0, ...ys), Math.max(1, ...ys)];
    });
  const sx = (x) => left + ((x - xmin) / (xmax - xmin || 1)) * pw,
    sy = (y, g) =>
      bottom - ((y - ranges[g][0]) / (ranges[g][1] - ranges[g][0] || 1)) * ph;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-label="${e(chart.title)}"><rect width="100%" height="100%" fill="${e(chart.background || "#ffffff")}"/><text x="${left}" y="34" font-size="22" fill="#333333">${e(chart.title)}</text>`;
  for (let i = 0; i <= 5; i++) {
    const y = top + (ph * i) / 5;
    svg += `<path d="M${left} ${y}H${right}" stroke="#dddddd"/><text x="${left - 10}" y="${y + 4}" text-anchor="end" font-size="12">${Number((ranges[0][1] - ((ranges[0][1] - ranges[0][0]) * i) / 5).toPrecision(4))}</text><text x="${right + 10}" y="${y + 4}" font-size="12">${Number((ranges[1][1] - ((ranges[1][1] - ranges[1][0]) * i) / 5).toPrecision(4))}</text>`;
  }
  visible.forEach((s) => {
    const g = rightSeries.includes(s.i) ? 1 : 0,
      color = colors[s.i % colors.length],
      type =
        chart.seriesTypes?.[s.i] ||
        (s.i === 0 && chart.type === "combo" ? "bar" : "line");
    if (type === "bar") {
      const w = (pw / Math.max(1, s.points.length)) * 0.6;
      s.points.forEach(
        (p) =>
          (svg += `<rect x="${sx(p.x) - w / 2}" y="${Math.min(sy(p.y, g), sy(0, g))}" width="${w}" height="${Math.abs(sy(p.y, g) - sy(0, g))}" fill="${e(color)}"/>`),
      );
    } else {
      svg += `<path d="${s.points.map((p, i) => `${i ? "L" : "M"}${sx(p.x)} ${sy(p.y, g)}`).join(" ")}" stroke="${e(color)}" stroke-width="${chart.lineWidth || 3}" fill="none"/>`;
    }
    svg += `<text x="${left + s.i * 130}" y="58" font-size="12" fill="${e(color)}">${e(s.name)}${g ? " (右軸)" : ""}</text>`;
  });
  for (let i = 0; i <= 5; i++)
    svg += `<text x="${left + (pw * i) / 5}" y="${bottom + 25}" text-anchor="middle" font-size="12">${Number((xmin + ((xmax - xmin) * i) / 5).toPrecision(4))}</text>`;
  return svg + "</svg>";
}
export function decorateSVG(svg, chart, width, height) {
  let art = renderObjects(
    chart.objects,
    width,
    height,
    chart._selectedObjects || [],
  );
  if (chart.animation) {
    art = `<g>${art}<animate attributeName="opacity" values="0;1" dur="${Number(chart.animationDuration || 1)}s" fill="freeze"/></g>`;
  }
  let result = svg.replace("</svg>", art + "</svg>");
  if (chart.animation)
    result = result
      .replace('class="chart-svg"', 'class="chart-svg"')
      .replace(
        "</svg>",
        `<animate attributeName="opacity" values="0;1" dur="${Number(chart.animationDuration || 1)}s" fill="freeze"/></svg>`,
      );
  return result;
}
