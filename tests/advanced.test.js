import test from "node:test";
import assert from "node:assert/strict";
import {
  symbolic,
  analyticIntegral,
  extrema,
  intersections,
  movingAverage,
  localTangent,
  nonlinearFit,
  expression,
} from "../src/science.js";
import { evalCell, evaluateFormula } from "../src/engine.js";
import { renderChart, themes } from "../src/chart.js";
import { alignObjects, combineObjects } from "../src/objects.js";
import {
  parseProject,
  stringifyProject,
  writeXlsx,
  readXlsx,
} from "../src/io.js";
const sheet = {
  id: "s",
  name: "Data",
  cells: {
    A1: { raw: "X" },
    B1: { raw: "Y" },
    A2: { raw: "1" },
    B2: { raw: "2" },
    A3: { raw: "2" },
    B3: { raw: "4" },
    A4: { raw: "3" },
    B4: { raw: "6" },
  },
};
const base = {
  id: "c",
  sheetId: "s",
  type: "line",
  range: "A1:B4",
  title: "Test",
  theme: "scientific",
  math: [],
  annotations: [],
};
test("symbolic differentiation, analytic integral, extrema and intersections", () => {
  assert.equal(symbolic("x^3").derivative, "3 * x ^ 2");
  assert.ok(Math.abs(analyticIntegral("x^2", 0, 3).value - 9) < 1e-10);
  assert.ok(Math.abs(extrema("x^2", -2, 2)[0].x) < 1e-5);
  assert.equal(intersections("x^2", "x", -1, 2).length, 2);
  assert.throws(() => expression('import("fs")'));
});
test("nonlinear regression solves parameters and reports true residuals", () => {
  const points = Array.from({ length: 12 }, (_, x) => ({
      x,
      y: 2 * Math.exp(0.2 * x),
    })),
    fit = nonlinearFit(points, "a*exp(b*x)", { a: 1, b: 0.1 });
  assert.ok(Math.abs(fit.params.a - 2) < 1e-5);
  assert.ok(Math.abs(fit.params.b - 0.2) < 1e-6);
  assert.ok(fit.r2 > 0.999999);
  assert.ok(fit.residuals.every((p) => Math.abs(p.residual) < 1e-5));
});
test("smoothing and distinct tangent methods", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 1, y: 2 },
    { x: 2, y: 4 },
    { x: 3, y: 6 },
    { x: 4, y: 8 },
  ];
  assert.equal(localTangent(points, 2, "local", 3).slope, 2);
  assert.equal(localTangent(points, 2, "smoothed", 3).slope, 2);
  assert.equal(movingAverage(points, 3)[2].y, 4);
});
test("existing formula library and matrix spill work through cell references", () => {
  const s = structuredClone(sheet);
  s.cells.C1 = { raw: "1" };
  s.cells.D1 = { raw: "2" };
  s.cells.C2 = { raw: "3" };
  s.cells.D2 = { raw: "4" };
  assert.equal(evaluateFormula("=MDETERM(C1:D2)", [s], "s"), -2);
  s.cells.F1 = { raw: "=MINVERSE(C1:D2)" };
  assert.ok(Math.abs(evalCell([s], "s", 0, 5) + 2) < 1e-8);
  assert.ok(Math.abs(evalCell([s], "s", 1, 6) + 0.5) < 1e-8);
  assert.equal(evaluateFormula("=FACT(5)", [s], "s"), 120);
});
test("new graph types and advanced math produce real finite SVG", () => {
  for (const type of ["parametric", "polar", "contour", "combo", "dual"]) {
    const svg = renderChart(
      {
        ...base,
        type,
        expression: type === "contour" ? "x^2+y^2" : "2*sin(x)",
        domainMin: 0,
        domainMax: 6.28,
        xMin: -4,
        xMax: 4,
        yMin: -4,
        yMax: 4,
      },
      [sheet],
    );
    assert.ok(svg.includes("<path") || svg.includes("<rect"));
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/);
  }
});
test("vector selection alignment, boolean operations and LaTeX SVG paths", () => {
  const objects = [
    { id: "a", type: "rect", x: 0, y: 0, width: 10, height: 10 },
    { id: "b", type: "rect", x: 5, y: 5, width: 10, height: 10 },
  ];
  const combined = combineObjects(objects, ["a", "b"], "intersection");
  assert.equal(combined.length, 1);
  alignObjects(objects, ["a", "b"], "left");
  assert.equal(objects[1].x, 0);
  const svg = renderChart(
    {
      ...base,
      objects: [
        {
          id: "formula",
          type: "latex",
          x: 40,
          y: 20,
          width: 25,
          height: 10,
          text: "\\frac{x^2}{2}",
        },
      ],
    },
    [sheet],
  );
  assert.match(svg, /data-object-id="formula"/);
  assert.match(svg, /data-c="/);
});
test("all specification themes are available and tokens never change source data", () => {
  assert.equal(themes.length, 48);
  assert.ok(themes.find((t) => t.name === "Glassmorphism"));
  assert.ok(themes.find((t) => t.name === "Comic Style"));
  const before = JSON.stringify(sheet);
  renderChart({ ...base, theme: "cyberpunk" }, [sheet]);
  assert.equal(JSON.stringify(sheet), before);
});
test("extended project, layout, undo snapshots and Excel chart roundtrip", async () => {
  const chart = {
    ...base,
    type: "polar",
    expression: "2*sin(x)",
    objects: [
      {
        id: "a",
        type: "ellipse",
        x: 10,
        y: 10,
        width: 20,
        height: 10,
        fill: "#aaaaaa",
      },
    ],
  };
  const p = {
    version: 1,
    name: "Advanced",
    sheets: [structuredClone(sheet)],
    charts: [chart],
    workspace: { layout: { tools: "tab", properties: "float" } },
    undoState: { history: [], future: [], labels: [] },
  };
  assert.equal(parseProject(stringifyProject(p)).charts[0].type, "polar");
  const bytes = await writeXlsx([sheet], [base]);
  const out = await readXlsx(bytes);
  assert.equal(out.charts.length, 1);
  assert.equal(out.charts[0].range, base.range);
  assert.match(new TextDecoder().decode(bytes), /drawingml\/2006\/chart/);
});
