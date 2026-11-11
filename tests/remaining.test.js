import test from "node:test";
import assert from "node:assert/strict";
import { booleanGeometry, vectorArea } from "../src/vector-geometry.js";
import { renderObjects } from "../src/objects.js";
import {
  toNativeWorkbook,
  fromNativeWorkbook,
} from "../src/workbook-adapter.js";
import { inspectICC, applyPDFColor } from "../src/color-management.js";
test("closed cubic boolean operations preserve curves and true area", () => {
  const curve = {
      id: "a",
      type: "bezier",
      x: 0,
      y: 0,
      width: 20,
      height: 20,
      c1x: 0,
      c1y: 0,
      c2x: 100,
      c2y: 100,
      closed: true,
      fill: "#888888",
    },
    rect = { id: "b", type: "rect", x: 10, y: 0, width: 20, height: 20 };
  const result = booleanGeometry([curve, rect], ["a", "b"], "union");
  assert.equal(result[0].type, "path");
  assert.match(result[0].pathData, /[cC]/);
  assert.ok(vectorArea(result[0]) >= 400);
  assert.doesNotMatch(renderObjects(result, 100, 100), /NaN|undefined/);
  assert.throws(() =>
    booleanGeometry([{ ...curve, closed: false }, rect], ["a", "b"], "union"),
  );
});
test("native workbook adapter keeps source formulas and basic formats", () => {
  const sh = {
    id: "s",
    name: "Data",
    cells: {
      A1: { raw: "2", format: { bold: true, color: "#333333" } },
      A2: { raw: "=A1*3" },
    },
  };
  const native = toNativeWorkbook([sh]);
  const roundtrip = fromNativeWorkbook(native, [sh]);
  assert.equal(roundtrip[0].cells.A2.raw, "=A1*3");
  assert.equal(roundtrip[0].cells.A1.format.bold, true);
  assert.equal(roundtrip[0].id, sh.id);
  const formattedBlank = fromNativeWorkbook(
    [
      {
        id: "s",
        name: "Data",
        celldata: [{ r: 2, c: 1, v: { bg: "#abcdef" } }],
      },
    ],
    [sh],
  );
  assert.equal(formattedBlank[0].cells.B3.raw, "");
  assert.equal(formattedBlank[0].cells.B3.format.bg, "#abcdef");
});
test("ICC headers are validated and CMYK intercept transforms all PDF colors", () => {
  const bytes = new Uint8Array(128);
  new DataView(bytes.buffer).setUint32(0, 128);
  bytes.set(new TextEncoder().encode("acsp"), 36);
  bytes.set(new TextEncoder().encode("CMYK"), 16);
  assert.equal(inspectICC(bytes).channels, 4);
  assert.throws(() => inspectICC(new Uint8Array(128)));
  const calls = [],
    pdf = {
      setFillColor: (...args) => calls.push(args),
      setDrawColor: (...args) => calls.push(args),
      setTextColor: (...args) => calls.push(args),
    };
  applyPDFColor(pdf);
  pdf.setFillColor(255, 0, 0);
  pdf.setDrawColor(0);
  assert.deepEqual(calls[0], ["0.000000", "1.000000", "1.000000", "0.000000"]);
  assert.deepEqual(calls[1], ["0.000000", "0.000000", "0.000000", "1.000000"]);
});

import { renderChart } from "../src/chart.js";
test("range-only error bars affect bounds and transparent themes stay transparent", () => {
  const sh = {
      id: "s",
      name: "Data",
      cells: {
        A1: { raw: "X" },
        B1: { raw: "Y" },
        C1: { raw: "Error" },
        A2: { raw: "1" },
        B2: { raw: "5" },
        C2: { raw: "100" },
      },
    },
    ch = {
      id: "c",
      sheetId: "s",
      range: "A1:B2",
      type: "scatter",
      errorRange: "C2:C2",
      theme: "glassmorphism",
      transparent: true,
    };
  const svg = renderChart(ch, [sh]);
  assert.match(svg, /stroke-width="1.2"/);
  assert.doesNotMatch(svg, /fill="url\(#theme-bg/);
  assert.match(svg, /data-y-max="1[0-9][0-9]"/);
});
import { readStyles } from "../src/io.js";
test("Excel theme colors, tints and indexed palette are decoded", () => {
  const xml =
      '<styleSheet><fonts><font><color theme="4"/></font></fonts><fills><fill><patternFill><fgColor indexed="2"/></patternFill></fill></fills><cellXfs><xf fontId="0" fillId="0"/></cellXfs></styleSheet>',
    theme =
      '<a:theme><a:clrScheme><a:accent1><a:srgbClr val="336699"/></a:accent1></a:clrScheme></a:theme>';
  const style = readStyles(xml, theme)[0];
  assert.equal(style.color, "#336699");
  assert.equal(style.bg, "#FF0000");
});
import { parseProject } from "../src/io.js";
test("independent panel graph rejects circular splits", () => {
  const model = {
    version: 1,
    name: "p",
    sheets: [{ id: "s", name: "S", cells: {} }],
    charts: [],
    workspace: {
      extraPanels: [{ id: "pane-test", tool: "math", title: "数学" }],
      layout: {
        tools: "split:pane-test:left",
        "pane-test": "split:tools:right",
      },
    },
  };
  assert.throws(() => parseProject(JSON.stringify(model)), /循環/);
});
