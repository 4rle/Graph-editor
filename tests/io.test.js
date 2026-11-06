import test from "node:test";
import assert from "node:assert/strict";
import {
  parseDelimited,
  stringifyDelimited,
  rowsToSheet,
  sheetToRows,
  parseProject,
  stringifyProject,
  writeXlsx,
  readXlsx,
} from "../src/io.js";

test("CSV roundtrip handles BOM, Unicode, multiline values and escaped quotes", () => {
  const rows = [
    ["実験名", "値"],
    ["水, 温度", '"測定"\n2回目'],
    ["", ""],
  ];
  assert.deepEqual(parseDelimited("\uFEFF" + stringifyDelimited(rows)), rows);
  assert.deepEqual(parseDelimited("a\tb\r\n1\t2\r\n"), [
    ["a", "b"],
    ["1", "2"],
  ]);
  assert.throws(() => parseDelimited('"unclosed'), /引用符/);
});

test("sheet row conversion includes gaps and columns beyond Z", () => {
  const sheet = rowsToSheet([["1", "", "=A1*2"], [], ["日本語"]], "データ");
  sheet.cells.AA2 = { raw: "hello" };
  const rows = sheetToRows(sheet);
  assert.equal(rows[0][2], "=A1*2");
  assert.equal(rows[1][26], "hello");
  assert.equal(rows[2][0], "日本語");
});

test("project roundtrip preserves data and rejects invalid project", () => {
  const sheet = rowsToSheet([["1", "=A1+2"]]);
  const project = {
    version: 1,
    name: "実験",
    sheets: [sheet],
    charts: [{ id: "a", sheetId: sheet.id }],
    history: [],
  };
  assert.deepEqual(parseProject(stringifyProject(project)), project);
  assert.throws(() => parseProject('{"version":2}'), /プロジェクト/);
  assert.throws(
    () => parseProject('{"version":1,"name":"x","sheets":[]}'),
    /シート/,
  );
});

test("XLSX roundtrip preserves multiple sheets, Unicode, formulas, text escapes and sparse cells", async () => {
  const sheets = [
    rowsToSheet(
      [
        ["実測値", "温度 & <条件>"],
        ["1.5", "=A2*2"],
        ['"\n文章', ""],
      ],
      "実験 <A>",
    ),
    rowsToSheet([["別シート", "3e-4"]], "結果"),
  ];
  sheets[1].cells.AA100 = { raw: "=SUM(A1:A99)" };
  const bytes = await writeXlsx(sheets);
  assert.equal(new DataView(bytes.buffer).getUint32(0, true), 0x04034b50);
  const restored = await readXlsx(bytes);
  assert.equal(restored.length, 2);
  assert.equal(restored[0].name, "実験 <A>");
  assert.deepEqual(
    restored.map((s) => s.cells),
    sheets.map((s) => s.cells),
  );
  const damaged = bytes.slice();
  damaged[100] ^= 1;
  await assert.rejects(readXlsx(damaged), /整合性/);
});

test("XLSX rejects arbitrary bytes and invalid cell coordinates", async () => {
  await assert.rejects(readXlsx(new Uint8Array(100)), /XLSX/);
  await assert.rejects(
    writeXlsx([{ id: "s", name: "s", cells: { A0: { raw: "1" } } }]),
    /形式/,
  );
});

test("XLSX preserves basic font, fill, alignment and numeric formatting", async () => {
  const sheets = [rowsToSheet([["12.5", "Header"]])];
  sheets[0].cells.A1.format = {
    bold: true,
    color: "#AD1234",
    bg: "#FFEEDD",
    align: "right",
    numberFormat: "number",
  };
  const restored = await readXlsx(await writeXlsx(sheets));
  assert.deepEqual(restored[0].cells.A1.format, sheets[0].cells.A1.format);
});

test("XLSX maps application percentage formatting to real Excel formatting", async () => {
  const sheets = [rowsToSheet([["0.25", "12.5"]])];
  sheets[0].cells.A1.format = { numberFormat: "percent" };
  sheets[0].cells.B1.format = { numberFormat: "number" };
  const restored = await readXlsx(await writeXlsx(sheets));
  assert.equal(restored[0].cells.A1.format.numberFormat, "percent");
  assert.equal(restored[0].cells.B1.format.numberFormat, "number");
});

test("project import rejects CSS/attribute injection and malformed render data", () => {
  const base = () => ({
    version: 1,
    name: "x",
    sheets: [{ id: "s", name: "Data", cells: { A1: { raw: "ok" } } }],
    charts: [{ id: "c", sheetId: "s", range: "A1:B2" }],
  });
  for (const mutate of [
    (p) => {
      p.sheets[0].id = 'x" onmouseover="alert(1)';
    },
    (p) => {
      p.sheets[0].cells.A1.format = { bg: "red;position:fixed;inset:0" };
    },
    (p) => {
      p.sheets[0].cells.A1.format = {
        fontFamily: 'serif" onmouseover="alert(1)',
      };
    },
    (p) => {
      p.charts[0].sheetX = '0" onclick="alert(1)';
    },
    (p) => {
      p.charts[0].math = {};
    },
    (p) => {
      p.charts[0].math = [{ type: "<img src=x onerror=alert(1)>" }];
    },
    (p) => {
      p.charts[0].annotations = [null];
    },
    (p) => {
      p.sheets[0].merges = {};
    },
    (p) => {
      p.workspace = { history: {} };
    },
    (p) => {
      p.customThemes = [
        { id: "t", name: "t", colors: ['red" onmouseover="alert(1)'] },
      ];
    },
    (p) => {
      p.editHistory = [{ label: "test", time: "<img src=x onerror=alert(1)>" }];
    },
  ]) {
    const project = base();
    mutate(project);
    assert.throws(() => parseProject(JSON.stringify(project)));
  }
  assert.throws(() =>
    parseProject('{"version":1,"name":"x","sheets":[],"__proto__":{}}'),
  );
  const normalized = parseProject(JSON.stringify(base()));
  assert.deepEqual(normalized.charts[0].math, []);
  assert.deepEqual(normalized.charts[0].annotations, []);
  assert.deepEqual(normalized.customThemes, []);
  assert.deepEqual(normalized.workspace, {});
});

test("project serialization allows shared color arrays without mistaking them for cycles", () => {
  const colors = ["#123456"];
  const project = {
    version: 1,
    name: "shared",
    sheets: [{ id: "s", name: "Data", cells: {} }],
    charts: [{ id: "c", sheetId: "s", colors }],
    customThemes: [{ id: "theme", name: "Theme", colors }],
  };
  assert.doesNotThrow(() => stringifyProject(project));
});
