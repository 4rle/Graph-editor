import test from "node:test";
import assert from "node:assert/strict";
import {
  colName,
  colIndex,
  cellRef,
  parseRef,
  rangeCells,
  shiftFormula,
  evalCell,
  evaluateFormula,
  evaluateMath,
  derivative,
  integrate,
  regression,
  discreteTangent,
  trapezoidalIntegral,
} from "../src/engine.js";
const near = (a, b, tol = 1e-7) =>
  assert.ok(Math.abs(a - b) < tol, `${a} should be near ${b}`);
const sheets = [
  {
    id: "one",
    name: "実験 データ",
    cells: {
      A1: { raw: "2" },
      A2: { raw: "4" },
      A3: { raw: "6" },
      B1: { raw: "=A1*3" },
      B2: { raw: "=SUM(A1:A3)" },
      B3: { raw: "text" },
      C1: { raw: "=C2" },
      C2: { raw: "=C1" },
      D1: { raw: "=1/0" },
    },
  },
  {
    id: "two",
    name: "Results",
    cells: {
      A1: { raw: "='実験 データ'!B2+1" },
      A2: { raw: "=SUM('実験 データ'!A1:A3)" },
    },
  },
];
const f = (expression) => evaluateFormula(expression, sheets, "one");
test("A1 references, ranges and relative/absolute autofill", () => {
  assert.equal(colName(0), "A");
  assert.equal(colName(26), "AA");
  assert.equal(colIndex("AZ"), 51);
  assert.equal(cellRef(4, 2), "C5");
  assert.deepEqual(parseRef("$BC$12"), { row: 11, col: 54 });
  assert.deepEqual(rangeCells("B2:A1"), ["A1", "B1", "A2", "B2"]);
  assert.equal(
    shiftFormula('=A1+$B1+C$1+$D$1+"A1"', 2, 1),
    '=B3+$B3+D$1+$D$1+"A1"',
  );
  assert.equal(shiftFormula("=A1", -1, 0), "=#REF!");
  assert.equal(
    shiftFormula("='Sheet1'!A1+Sheet2!B2", 1, 1),
    "='Sheet1'!B2+Sheet2!C3",
  );
});
test("cell evaluation, dependency tracking and cross sheet references", () => {
  assert.equal(evalCell(sheets, "one", 0, 1), 6);
  assert.equal(evalCell(sheets, "one", 1, 1), 12);
  assert.equal(evalCell(sheets, "two", 0, 0), 13);
  assert.equal(evalCell(sheets, "two", 1, 0), 12);
  assert.equal(evalCell(sheets, "one", 0, 2), "#CYCLE!");
  assert.equal(evalCell(sheets, "one", 0, 3), "#DIV/0!");
  assert.equal(f("='Unknown'!A1"), "#REF!");
  const changed = structuredClone(sheets);
  changed[0].cells.A1.raw = "5";
  assert.equal(evalCell(changed, "one", 0, 1), 15);
});
test("arithmetic precedence, booleans, percentages and safe names", () => {
  assert.equal(f("=2+3*4^2"), 50);
  assert.equal(f("=-2^2"), -4);
  assert.equal(f("=2^3^2"), 512);
  assert.equal(f("=200*15%"), 30);
  assert.equal(f("=AND(2>1,NOT(FALSE))"), true);
  assert.equal(f("=constructor(1)"), "#NAME?");
  assert.equal(f("=globalThis.process.exit()"), "#NAME?");
  assert.equal(f("=1/0"), "#DIV/0!");
  assert.equal(f("=SQRT(-1)"), "#NUM!");
});
test("lazy conditionals and error handling", () => {
  assert.equal(f('=IF(A1>1,"yes",1/0)'), "yes");
  assert.equal(f("=IF(FALSE,1/0,3)"), 3);
  assert.equal(f("=IFERROR(D1,99)"), 99);
  assert.equal(f("=IFERROR(1/0,0)"), 0);
  assert.equal(f("=SUM(#REF!)"), "#REF!");
  assert.equal(f("=IFERROR(#REF!,0)"), 0);
});
test("statistical and conditional aggregation", () => {
  assert.equal(f("=AVERAGE(A1:A3)"), 4);
  assert.equal(f("=COUNT(A1:B3)"), 5);
  assert.equal(f("=COUNTA(A1:B3)"), 6);
  assert.equal(f('=SUMIF(A1:A3,">2")'), 10);
  assert.equal(f('=COUNTIF(A1:A3,">=4")'), 2);
  assert.equal(f("=MEDIAN(A1:A3)"), 4);
  assert.equal(f("=STDEV(A1:A3)"), 2);
  assert.equal(f('=COUNTIF(B1:B3,"t*")'), 1);
  assert.equal(f("=SUMPRODUCT(A1:A3,A1:A3)"), 56);
});
test("string, date and mathematical functions", () => {
  assert.equal(f('=UPPER("hello")&" world"'), "HELLO world");
  assert.equal(f('=CONCAT("a","b",1)'), "ab1");
  assert.equal(f("=ROUND(1.235,2)"), 1.24);
  assert.equal(f("=POWER(3,2)"), 9);
  assert.equal(f("=YEAR(DATE(2026,11,5))"), 2026);
  assert.equal(f("=MONTH(DATE(2026,11,5))"), 11);
  assert.equal(f("=DAY(DATE(2026,11,5))"), 5);
  near(f("=SIN(PI()/2)"), 1);
});
test("safe mathematical function sampling and calculus", () => {
  assert.equal(evaluateMath("x^2+2x+1", 3), 16);
  near(evaluateMath("sin(π/2)", 0), 1);
  assert.equal(evaluateMath("f(x) = 2(x+1)", 3), 8);
  near(derivative("x^3", 2), 12, 1e-5);
  near(integrate("x^2", 0, 3), 9);
  near(integrate("sin(x)", 0, Math.PI), 2, 1e-8);
  near(integrate("x", 3, 0), -4.5);
  assert.throws(() => evaluateMath("alert(1)", 0));
  assert.throws(() => evaluateMath("sqrt(-1)", 0));
});
test("least squares regression, residuals and R squared", () => {
  const linear = regression([
    [0, 1],
    [1, 3],
    [2, 5],
    [3, 7],
  ]);
  near(linear.predict(4), 9);
  near(linear.r2, 1);
  assert.equal(linear.residuals.length, 4);
  assert.equal(linear.equation, "y = 2x + 1");
  const poly = regression(
    [
      [0, 1],
      [1, 2],
      [2, 5],
      [3, 10],
    ],
    "polynomial",
    2,
  );
  near(poly.predict(4), 17);
  near(poly.r2, 1);
  const exp = regression(
    [
      [0, 2],
      [1, 2 * Math.E],
      [2, 2 * Math.E ** 2],
    ],
    "exponential",
  );
  near(exp.predict(3), 2 * Math.E ** 3);
  assert.throws(() =>
    regression([
      [1, 1],
      [1, 2],
    ]),
  );
  assert.throws(() =>
    regression(
      [
        [0, -1],
        [1, 2],
      ],
      "exponential",
    ),
  );
});
test("discrete tangent and clipped trapezoidal area", () => {
  const points = [
      [0, 0],
      [1, 1],
      [2, 4],
      [3, 9],
    ],
    t = discreteTangent(points, 1);
  assert.equal(t.slope, 2);
  assert.equal(t.intercept, -1);
  assert.match(t.method, /central/);
  near(trapezoidalIntegral(points), 9.5);
  near(
    trapezoidalIntegral(
      [
        [0, 0],
        [2, 4],
      ],
      0.5,
      1.5,
    ),
    2,
  );
});

test("structural insert shifts local and cross-sheet references including absolute addresses", async () => {
  const { adjustFormulaReferences: adjust } = await import("../src/engine.js");
  const opt = {
    currentSheet: "Data",
    targetSheet: "Data",
    axis: "row",
    index: 1,
    insertCount: 2,
  };
  assert.equal(
    adjust("=A1+A2+$B$3+C$2+$D1+SUM(A1:A5)", opt),
    "=A1+A4+$B$5+C$4+$D1+SUM(A1:A7)",
  );
  assert.equal(adjust("=A2+Other!A2+Data!B2", opt), "=A4+Other!A2+Data!B4");
  assert.equal(
    adjust("=A2+Data!A2", { ...opt, currentSheet: "Other" }),
    "=A2+Data!A4",
  );
  assert.equal(
    adjust('=Data!A2+"Data!A2"', { ...opt, currentSheet: "Other" }),
    '=Data!A4+"Data!A2"',
  );
  assert.equal(
    adjust("='Q''s measurements'!$B$2+Data!C2", {
      ...opt,
      targetSheet: "Q's measurements",
    }),
    "='Q''s measurements'!$B$4+Data!C2",
  );
  assert.equal(
    adjust("=AVERAGE(実験データ!B2:B13)", {
      ...opt,
      currentSheet: "解析メモ",
      targetSheet: "実験データ",
    }),
    "=AVERAGE(実験データ!B4:B15)",
  );
});
test("structural deletion removes cells and clips partially deleted ranges", async () => {
  const { adjustFormulaReferences: adjust } = await import("../src/engine.js");
  const opt = {
    currentSheet: "Data",
    targetSheet: "Data",
    axis: "row",
    index: 1,
    deleteCount: 2,
  };
  assert.equal(adjust("=A1+A2+A3+A4+$B$5", opt), "=A1+#REF!+#REF!+A2+$B$3");
  assert.equal(
    adjust("=SUM(A1:A5)+SUM(B2:B5)+SUM(C1:C2)+SUM(D2:D3)", opt),
    "=SUM(A1:A3)+SUM(B2:B3)+SUM(C1:C1)+SUM(#REF!)",
  );
  assert.equal(adjust("=SUM(A5:A1)", opt), "=SUM(A3:A1)");
  assert.equal(
    adjust("A1:D13", { ...opt, index: 0, deleteCount: 1 }),
    "A1:D12",
  );
  assert.equal(
    adjust("A1:D13", { ...opt, axis: "col", index: 0, deleteCount: 1 }),
    "A1:C13",
  );
  assert.equal(
    adjust("=$B$2:$D$4", { ...opt, axis: "column", index: 1, deleteCount: 1 }),
    "=$B$2:$C$4",
  );
  assert.equal(
    adjust("=SUM(A1:A5)", { ...opt, index: 0, deleteCount: 5 }),
    "=SUM(#REF!)",
  );
});
test("structural changes preserve function names and use case-insensitive sheet matching", async () => {
  const { adjustFormulaReferences: adjust, rewriteReferences } = await import(
    "../src/engine.js"
  );
  const opt = {
    currentSheet: "data",
    targetSheet: "Data",
    axis: "col",
    index: 0,
    insertCount: 1,
  };
  assert.equal(
    adjust("=LOG10(A1)+ATAN2(B2,C2)", opt),
    "=LOG10(B1)+ATAN2(C2,D2)",
  );
  assert.equal(
    adjust("='Data'!A1+DATA!B2+Other!A1", opt),
    "='Data'!B1+DATA!C2+Other!A1",
  );
  assert.equal(
    rewriteReferences("=A1", {
      sheetName: "Data",
      targetSheetName: "Data",
      axis: "row",
      index: 0,
      insertCount: 1,
    }),
    "=A2",
  );
  assert.throws(() => adjust("=A1", { ...opt, index: -1 }));
});

test("sheet rename updates explicit references and preserves formulas and text", async () => {
  const { renameSheetReferences: rename } = await import("../src/engine.js");
  assert.equal(
    rename(
      '=SUM(Data!$A$1:B3)+data!C2+A1+Other!A1+"Data!A1"',
      "Data",
      "Measurements",
    ),
    "=SUM('Measurements'!$A$1:B3)+'Measurements'!C2+A1+Other!A1+\"Data!A1\"",
  );
  assert.equal(
    rename("=AVERAGE(実験データ!B2:B13)", "実験データ", "測定結果 (読込)"),
    "=AVERAGE('測定結果 (読込)'!B2:B13)",
  );
  assert.equal(
    rename("='Q''s data'!A1+'Q''s data'!#REF!", "Q's data", "R's result"),
    "='R''s result'!A1+'R''s result'!#REF!",
  );
  assert.equal(
    rename("='Data'!A1+DATA!A2", "data", "data"),
    "='data'!A1+'data'!A2",
  );
});
test("sheet rename handles embedded quotes and excludes external workbook references", async () => {
  const { renameSheetReferences: rename } = await import("../src/engine.js");
  assert.equal(
    rename(
      '=\'A "quoted" sheet\'!A1+"A ""quoted"" sheet!A1"',
      'A "quoted" sheet',
      "New",
    ),
    '=\'New\'!A1+"A ""quoted"" sheet!A1"',
  );
  assert.equal(
    rename(
      "=[Book.xlsx]Data!A1+'[Book.xlsx]Data'!A2+Data!A3+MetaData!A4",
      "Data",
      "New",
    ),
    "=[Book.xlsx]Data!A1+'[Book.xlsx]Data'!A2+'New'!A3+MetaData!A4",
  );
  assert.equal(rename("A1:B2", "Data", "New"), "A1:B2");
});
