import test from "node:test";
import assert from "node:assert/strict";
import { themes, renderChart, getChartData } from "../src/chart.js";
import { applyChartTheme, themeSnapshot } from "../src/theme-design.js";
import { parseProject, stringifyProject } from "../src/io.js";
const sheets = [
  {
    id: "s",
    name: "Data",
    cells: {
      A1: { raw: "X" },
      B1: { raw: "測定" },
      C1: { raw: "比較" },
      A2: { raw: "1" },
      B2: { raw: "2" },
      C2: { raw: "3" },
      A3: { raw: "2" },
      B3: { raw: "=B2*2" },
      C3: { raw: "6" },
      A4: { raw: "3" },
      B4: { raw: "8" },
      C4: { raw: "9" },
    },
  },
];
const base = {
  id: "c",
  sheetId: "s",
  range: "A1:C4",
  type: "line",
  title: "測定の結果",
  math: [{ id: "m", type: "tangent", pointIndex: 1, series: 0 }],
  annotations: [],
  xMin: 0,
  xMax: 4,
  yMin: 0,
  yMax: 10,
};
const preset = (id) => themes.find((t) => t.id === id);
test("switching theme replaces manual appearance but preserves data and math", () => {
  const chart = {
    ...structuredClone(base),
    lineWidth: 49,
    pointSize: 24,
    marginTop: 280,
    fontFamily: "monospace",
    themeTokens: { style: "outline", layout: "compact" },
  };
  const before = JSON.stringify(sheets),
    source = getChartData(chart, sheets);
  applyChartTheme(chart, preset("kawaii-minimal"));
  assert.equal(chart.lineWidth, 4.6);
  assert.equal(chart.marginTop, 142);
  assert.equal(chart.themeTokens.style, "cute");
  applyChartTheme(chart, preset("scientific"));
  assert.equal(chart.lineWidth, 1.6);
  assert.equal(chart.pointShape, "series");
  assert.equal(chart.marginTop, 90);
  assert.deepEqual(chart.math, base.math);
  assert.equal(chart.xMax, base.xMax);
  assert.deepEqual(getChartData(chart, sheets), source);
  assert.equal(JSON.stringify(sheets), before);
});
test("themes differ in geometry and typography even with an identical palette", () => {
  const svgs = ["flat-design", "kawaii-minimal", "scientific", "editorial"].map(
    (id) => {
      const chart = applyChartTheme(structuredClone(base), preset(id));
      chart.colors = ["#555555"];
      chart.background = "#ffffff";
      chart.textColor = "#222222";
      return renderChart(chart, sheets);
    },
  );
  assert.match(svgs[0], /class="chart-series-line"[^>]+stroke-width="3"/);
  assert.match(svgs[1], /class="chart-series-line"[^>]+stroke-width="4.6"/);
  assert.match(svgs[1], /data-chart-surface="true"[^>]+rx="24"/);
  assert.match(svgs[2], /class="chart-tick"/);
  assert.match(svgs[2], /class="chart-point" fill="#ffffff"/);
  assert.match(svgs[3], /class="chart-title"[^>]+font-size="39"/);
  assert.match(svgs[3], /class="chart-heading-rule"/);
  assert.doesNotMatch(svgs[0], /feDropShadow|data-chart-surface/);
  assert.equal(new Set(svgs).size, 4);
  const flat = renderChart(
    {
      ...applyChartTheme(structuredClone(base), preset("flat-design")),
      type: "bar",
    },
    sheets,
  );
  const cute = renderChart(
    {
      ...applyChartTheme(structuredClone(base), preset("kawaii-minimal")),
      type: "bar",
    },
    sheets,
  );
  assert.match(flat, /class="chart-bar"[^>]+rx="0"/);
  assert.match(cute, /class="chart-bar"[^>]+rx="14"/);
});
test("all theme presets render themed charts and previews without mutating the model", () => {
  const before = JSON.stringify(sheets);
  for (const theme of themes)
    for (const type of [
      "line",
      "bar",
      "pie",
      "scatter",
      "heatmap",
      "dual",
      "contour",
    ]) {
      const chart = applyChartTheme(
        { ...structuredClone(base), type, expression: "x^2+y^2" },
        theme,
      );
      const model = JSON.stringify(chart);
      for (const size of [
        { width: 900, height: 520 },
        { width: 320, height: 190 },
      ]) {
        const svg = renderChart(chart, sheets, size);
        assert.match(svg, /data-theme-style=/, theme.id);
        assert.doesNotMatch(
          svg,
          /NaN|Infinity|undefined/,
          theme.id + " " + type,
        );
      }
      assert.equal(JSON.stringify(chart), model);
    }
  assert.equal(JSON.stringify(sheets), before);
});
test("style composition replaces the entire style and custom themes roundtrip", () => {
  const chart = applyChartTheme(
    structuredClone(base),
    preset("kawaii-minimal"),
    { style: "flat", layout: "compact" },
  );
  assert.equal(chart.lineWidth, 3);
  assert.doesNotMatch(renderChart(chart, sheets), /data-chart-surface/);
  chart.pointSize = 7;
  chart.marginLeft = 125;
  const custom = {
    id: "custom",
    name: "My style",
    ...themeSnapshot(chart, preset(chart.theme)),
  };
  const project = {
    version: 1,
    name: "Theme",
    sheets,
    charts: [chart],
    customThemes: [custom],
  };
  const loaded = parseProject(stringifyProject(project)).customThemes[0];
  const restored = applyChartTheme(
    structuredClone(base),
    preset(loaded.theme),
    loaded.themeTokens,
  );
  const { id, name, ...visual } = loaded;
  Object.assign(restored, visual);
  assert.equal(restored.pointSize, 7);
  assert.equal(restored.marginLeft, 125);
  assert.equal(renderChart(restored, sheets), renderChart(chart, sheets));
  const mixed = applyChartTheme(
    structuredClone(base),
    preset("kawaii-minimal"),
    { style: "cute", elements: "scientific" },
  );
  const mixedSVG = renderChart(mixed, sheets);
  assert.match(mixedSVG, /class="chart-tick"/);
  assert.match(mixedSVG, /class="chart-point" fill="#fff5f8"/);
  assert.equal(mixed.lineWidth, 4.6);
});
