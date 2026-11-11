import { parseRef, cellRef, evalCell } from "./engine.js";
const nativeFonts = [
  "Times New Roman",
  "Arial",
  "Tahoma",
  "Verdana",
  "Microsoft YaHei",
  "SimSun",
  "SimHei",
];
const fontName = (v) =>
  typeof v === "number" ? nativeFonts[v] || "sans-serif" : v || "sans-serif";
const safeColor = (v) => {
  if (typeof v !== "string") return undefined;
  if (/^#[a-f0-9]{6}$/i.test(v)) return v;
  if (/^#[a-f0-9]{3}$/i.test(v))
    return "#" + [...v.slice(1)].map((c) => c + c).join("");
  const m = v.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const a = m[1].split(",").map(Number),
      alpha = a.length > 3 ? a[3] : 1;
    if (a.slice(0, 3).some((x) => !Number.isFinite(x)) || alpha === 0)
      return undefined;
    return (
      "#" +
      a
        .slice(0, 3)
        .map((x) =>
          Math.round(Math.max(0, Math.min(255, x * alpha + 255 * (1 - alpha))))
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")
    );
  }
  return undefined;
};
const formats = { general: "General", number: "0.00", percent: "0.0%" };
export function toNativeWorkbook(sheets) {
  return sheets.map((sheet, i) => {
    const celldata = Object.entries(sheet.cells).map(([ref, cell]) => {
      const p = parseRef(ref),
        f = cell.format || {},
        raw = String(cell.raw ?? ""),
        value = {
          ...(cell.native || {}),
          m: undefined,
          v: raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : raw,
          ...(raw.startsWith("=")
            ? { f: raw, v: evalCell(sheets, sheet.id, p.row, p.col) }
            : { f: undefined }),
          bl: f.bold ? 1 : 0,
          it: f.italic ? 1 : 0,
          fc: f.color || "#333333",
          bg: f.bg || undefined,
          fs: Number(f.fontSize || 12),
          ff: f.fontFamily || "sans-serif",
          ht: f.align === "center" ? 0 : f.align === "right" ? 2 : 1,
          ct: {
            fa: formats[f.numberFormat] || f.numberFormat || "General",
            t: raw.startsWith("=")
              ? "n"
              : Number.isFinite(Number(raw)) && raw !== ""
                ? "n"
                : "g",
          },
        };
      return { r: p.row, c: p.col, v: value };
    });
    const merge = Object.fromEntries(
      (sheet.merges || []).map((m) => [
        `${m.r1}_${m.c1}`,
        { r: m.r1, c: m.c1, rs: m.r2 - m.r1 + 1, cs: m.c2 - m.c1 + 1 },
      ]),
    );
    return {
      ...(sheet.nativeState || {}),
      id: sheet.id,
      name: sheet.name,
      order: i,
      status: i === 0 ? 1 : 0,
      row: celldata.reduce((n, c) => Math.max(n, c.r + 25), 100),
      column: celldata.reduce((n, c) => Math.max(n, c.c + 5), 26),
      celldata,
      config: {
        ...(sheet.nativeConfig || {}),
        merge,
        columnlen: sheet.columnWidths || {},
        rowlen: sheet.rowHeights || {},
      },
      ...(sheet.freezeRows || sheet.freezeCols
        ? {
            frozen: {
              type:
                sheet.freezeRows && sheet.freezeCols
                  ? "rangeBoth"
                  : sheet.freezeRows
                    ? "rangeRow"
                    : "rangeColumn",
              range: {
                row_focus: (sheet.freezeRows || 0) - 1,
                column_focus: (sheet.freezeCols || 0) - 1,
              },
            },
          }
        : {}),
    };
  });
}
export function fromNativeWorkbook(workbook, original = []) {
  return workbook.map((sheet, i) => {
    const before = original.find((s) => s.id === sheet.id),
      cells = {};
    const read = (r, c, v) => {
      if (
        !v ||
        (v.v == null &&
          !v.f &&
          !Object.keys(v).some((key) =>
            [
              "bl",
              "it",
              "fc",
              "bg",
              "fs",
              "ff",
              "ht",
              "ct",
              "bd",
              "un",
              "cl",
            ].includes(key),
          ))
      )
        return;
      const raw = v.f || String(v.v ?? ""),
        fa = v.ct?.fa,
        format = {
          bold: !!v.bl,
          italic: !!v.it,
          ...(safeColor(v.fc) ? { color: safeColor(v.fc) } : {}),
          ...(safeColor(v.bg) ? { bg: safeColor(v.bg) } : {}),
          fontSize: Number(v.fs || 12),
          fontFamily: fontName(v.ff),
          align: v.ht === 0 ? "center" : v.ht === 2 ? "right" : "left",
          numberFormat:
            { "0.00": "number", "0.0%": "percent", General: "general" }[fa] ||
            fa ||
            "general",
        };
      cells[cellRef(r, c)] = {
        raw,
        format,
        native: JSON.parse(JSON.stringify(v)),
      };
    };
    if (sheet.data)
      sheet.data.forEach((row, r) => row?.forEach((v, c) => read(r, c, v)));
    else (sheet.celldata || []).forEach((v) => read(v.r, v.c, v.v));
    const { data, celldata, id, name, ...nativeState } = sheet;
    return {
      ...before,
      nativeState: JSON.parse(JSON.stringify(nativeState)),
      id: sheet.id || crypto.randomUUID(),
      name: sheet.name || "Sheet" + (i + 1),
      cells,
      nativeConfig: JSON.parse(JSON.stringify(sheet.config || {})),
      freezeRows:
        sheet.frozen && /row|both/i.test(sheet.frozen.type)
          ? Math.min(20, (sheet.frozen.range?.row_focus ?? 0) + 1)
          : 0,
      freezeCols:
        sheet.frozen && /column|both/i.test(sheet.frozen.type)
          ? Math.min(5, (sheet.frozen.range?.column_focus ?? 0) + 1)
          : 0,
      frozen: !!sheet.frozen,
      columnWidths: Object.fromEntries(
        Object.entries(sheet.config?.columnlen || {}).map(([k, v]) => [
          k,
          Math.max(20, Math.min(2000, Number(v))),
        ]),
      ),
      rowHeights: Object.fromEntries(
        Object.entries(sheet.config?.rowlen || {}).map(([k, v]) => [
          k,
          Math.max(20, Math.min(2000, Number(v))),
        ]),
      ),
      merges: Object.values(sheet.config?.merge || {}).map((m) => ({
        r1: m.r,
        c1: m.c,
        r2: m.r + m.rs - 1,
        c2: m.c + m.cs - 1,
      })),
    };
  });
}
