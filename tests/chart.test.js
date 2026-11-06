import test from "node:test";
import assert from "node:assert/strict";
import { renderChart, getChartData, themes } from "../src/chart.js";
const sheets = () => [
  {
    id: "s1",
    name: "Data",
    cells: {
      A1: { raw: "X" },
      B1: { raw: "測定値" },
      C1: { raw: "試料B" },
      A2: { raw: "1" },
      B2: { raw: "1" },
      C2: { raw: "2" },
      A3: { raw: "2" },
      B3: { raw: "4" },
      C3: { raw: "6" },
      A4: { raw: "3" },
      B4: { raw: "9" },
      C4: { raw: "12" },
      A5: { raw: "4" },
      B5: { raw: "=B4+7" },
      C5: { raw: "20" },
    },
  },
];
const base = {
  id: "chart1",
  sheetId: "s1",
  range: "A1:C5",
  title: "測定 <データ>",
  theme: "botanical",
};
function finiteSvg(svg) {
  assert.ok(svg.startsWith("<svg"));
  assert.ok(svg.endsWith("</svg>"));
  assert.doesNotMatch(svg, /NaN|Infinity|undefined/);
  assert.ok(svg.includes("測定 &lt;データ&gt;"));
}

test("chart data evaluates formulas and retains live cell locations", () => {
  const data = getChartData(base, sheets());
  assert.deepEqual(data.labels, ["1", "2", "3", "4"]);
  assert.equal(data.series[0].name, "測定値");
  assert.deepEqual(data.series[0].points.at(-1), {
    x: 4,
    y: 16,
    label: "4",
    row: 4,
    col: 1,
    categoryIndex: 3,
  });
});
test("all chart forms produce finite, named SVG", () => {
  for (const type of [
    "line",
    "bar",
    "stacked",
    "area",
    "pie",
    "donut",
    "scatter",
    "histogram",
    "box",
    "heatmap",
    "function",
  ])
    finiteSvg(renderChart({ ...base, type }, sheets()));
});
test("distinct chart forms emit their intended primitives", () => {
  assert.match(renderChart({ ...base, type: "scatter" }, sheets()), /<circle/);
  assert.match(renderChart({ ...base, type: "bar" }, sheets()), /<rect x=/);
  assert.match(
    renderChart({ ...base, type: "pie" }, sheets()),
    / A[\d.]+,[\d.]+ 0 /,
  );
  assert.match(
    renderChart({ ...base, type: "donut" }, sheets()),
    />合計<\/text>/,
  );
  assert.match(
    renderChart({ ...base, type: "box" }, sheets()),
    /fill-opacity=".13"/,
  );
  assert.match(
    renderChart({ ...base, type: "heatmap" }, sheets()),
    /opacity="0.12"/,
  );
});
test("geometry refers to data points and recalculates after a sheet edit", () => {
  const data = sheets(),
    math = [
      "origin",
      "vertical",
      "horizontal",
      "coordinate",
      "tangent-data",
    ].map((type) => ({ type, pointIndex: 1, series: 0 }));
  const svg = renderChart({ ...base, math }, data);
  finiteSvg(svg);
  assert.match(svg, /\(2, 4\)/);
  assert.match(svg, /隣接点差分/);
  data[0].cells.B3.raw = "8";
  const changed = renderChart({ ...base, math }, data);
  assert.match(changed, /\(2, 8\)/);
  assert.notEqual(svg, changed);
  assert.ok(
    math.every((m) => Object.keys(m).length === 3),
    "render does not mutate model",
  );
});
test("math overlays use explicit numerical methods and data-dependent regression", () => {
  const math = [
    { type: "function", expression: "x^2" },
    { type: "derivative", expression: "x^2" },
    { type: "tangent", expression: "x^2", x0: 2 },
    { type: "normal", expression: "x^2", x0: 2 },
    { type: "integral", expression: "x^2", a: 0, b: 2 },
    { type: "regression", method: "polynomial", degree: 2 },
  ];
  const svg = renderChart({ ...base, math }, sheets());
  finiteSvg(svg);
  assert.match(svg, /Simpson法/);
  assert.match(svg, /R² = 1.0000/);
  assert.match(svg, /数値微分/);
  assert.match(svg, /∫ = 2.6667/);
  const data = sheets();
  data[0].cells.B3.raw = "12";
  assert.notEqual(
    renderChart({ ...base, math: [math.at(-1)] }, data),
    renderChart({ ...base, math: [math.at(-1)] }, sheets()),
  );
});
test("data integral labels bounded domain and trapezoidal method", () => {
  const svg = renderChart(
    { ...base, math: [{ type: "integral", a: -10, b: 30 }] },
    sheets(),
  );
  assert.match(svg, /台形則 \[1, 4\]/);
  assert.match(svg, /∫ = 21.5/);
});
test("logY alias and fixed error bars avoid invalid coordinates even crossing zero", () => {
  for (const type of [
    "line",
    "area",
    "bar",
    "stacked",
    "scatter",
    "histogram",
    "box",
    "heatmap",
  ])
    finiteSvg(
      renderChart({ ...base, type, logY: true, errorAmount: 5 }, sheets()),
    );
  const data = sheets();
  data[0].cells.B2.raw = "-2";
  finiteSvg(
    renderChart(
      {
        ...base,
        type: "line",
        logY: true,
        errorAmount: 5,
        math: [
          { type: "integral", expression: "x^2", a: 0, b: 2 },
          { type: "coordinate", pointIndex: 0 },
        ],
      },
      data,
    ),
  );
  const plain = renderChart(base, sheets()),
    errors = renderChart({ ...base, errorAmount: 1 }, sheets());
  assert.notEqual(plain, errors);
  assert.match(errors, /stroke-width="1.2"/);
});
test("annotations can use percentage coordinates and escape input", () => {
  const svg = renderChart(
    {
      ...base,
      annotations: [
        {
          id: "a1",
          text: "<script>alert(1)</script>",
          x: 50,
          y: 25,
          coordinateMode: "percent",
        },
      ],
    },
    sheets(),
    { width: 800, height: 500 },
  );
  assert.match(svg, /<text x="400" y="125"/);
  assert.doesNotMatch(svg, /<script>/);
  assert.match(svg, /&lt;script&gt;/);
});
test("empty, invalid and excessively large ranges render safely", () => {
  for (const range of ["A1:C1", "bogus", "A1:ZZ99999999"]) {
    const svg = renderChart({ ...base, range }, sheets());
    finiteSvg(svg);
    assert.match(svg, /表示するデータがありません/);
  }
  finiteSvg(
    renderChart({ ...base, type: "function", range: "A1:C1" }, sheets()),
  );
});
test("themes change display only and hidden series preserve source data", () => {
  const data = sheets(),
    before = JSON.stringify(data);
  for (const theme of themes)
    finiteSvg(
      renderChart({ ...base, theme: theme.id, seriesHidden: [0] }, data),
    );
  assert.equal(JSON.stringify(data), before);
  const hidden = renderChart({ ...base, seriesHidden: [0] }, data);
  assert.doesNotMatch(hidden, /data-series-index="0"/);
  assert.match(hidden, /data-series-index="1"/);
});
