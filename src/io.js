// Browser-native workbook I/O. No network or external parser is required.
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_CELLS = 500000;
const escapeXml = (value) =>
  String(value).replace(
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
const unescapeXml = (value) =>
  String(value).replace(
    /&#x([\da-f]+);|&#(\d+);|&(amp|lt|gt|quot|apos);/gi,
    (_, hex, dec, entity) =>
      hex
        ? String.fromCodePoint(parseInt(hex, 16))
        : dec
          ? String.fromCodePoint(+dec)
          : { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[
              entity.toLowerCase()
            ],
  );
const attrs = (text) =>
  Object.fromEntries(
    [...text.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((m) => [
      m[1],
      unescapeXml(m[2] ?? m[3]),
    ]),
  );
const tagText = (xml, tag) => {
  const m = xml.match(
    new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`),
  );
  return m ? unescapeXml(m[1].replace(/<[^>]*>/g, "")) : "";
};

export function parseDelimited(text, delimiter) {
  text = String(text).replace(/^\uFEFF/, "");
  if (text.length > MAX_FILE_SIZE)
    throw new Error("テキストファイルは50MB以下にしてください。");
  if (!delimiter) {
    const lineEnd = text.search(/[\r\n]/),
      firstLine = lineEnd < 0 ? text : text.slice(0, lineEnd);
    const outsideQuotes = firstLine.replace(/"(?:[^"]|"")*"/g, "");
    delimiter = outsideQuotes.includes("\t") ? "\t" : ",";
  }
  if (delimiter.length !== 1)
    throw new Error("区切り文字は1文字で指定してください。");
  const rows = [];
  let row = [],
    value = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else if (!quoted && value !== "") value += c;
      else quoted = !quoted;
    } else if (c === delimiter && !quoted) {
      row.push(value);
      value = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else value += c;
  }
  if (quoted) throw new Error("CSVの引用符が閉じられていません。");
  if (value !== "" || row.length || !rows.length) {
    row.push(value);
    rows.push(row);
  }
  if (rows.reduce((n, r) => n + r.length, 0) > MAX_CELLS)
    throw new Error("読み込めるセル数を超えています。");
  return rows;
}

export function stringifyDelimited(rows, delimiter = ",") {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = value == null ? "" : String(value);
          return text.includes(delimiter) || /["\r\n]/.test(text)
            ? `"${text.replace(/"/g, '""')}"`
            : text;
        })
        .join(delimiter),
    )
    .join("\r\n");
}

const colName = (index) => {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26))
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
};
const parseRef = (ref) => {
  const match = String(ref).match(/^\$?([A-Z]+)\$?(\d+)$/i);
  if (!match) return null;
  return {
    col:
      [...match[1].toUpperCase()].reduce(
        (n, c) => n * 26 + c.charCodeAt(0) - 64,
        0,
      ) - 1,
    row: +match[2] - 1,
  };
};

export function rowsToSheet(rows, name = "Sheet1") {
  const cells = {};
  rows.forEach((row, r) =>
    row.forEach((raw, c) => {
      if (raw !== "") cells[`${colName(c)}${r + 1}`] = { raw: String(raw) };
    }),
  );
  const sheet = {
    id:
      globalThis.crypto?.randomUUID?.() ||
      `sheet-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    cells,
  };
  validateSheets([sheet]);
  return sheet;
}

export function sheetToRows(sheet) {
  let maxRow = -1,
    maxCol = -1;
  for (const ref of Object.keys(sheet.cells || {})) {
    const pos = parseRef(ref);
    if (pos) {
      maxRow = Math.max(maxRow, pos.row);
      maxCol = Math.max(maxCol, pos.col);
    }
  }
  if ((maxRow + 1) * (maxCol + 1) > MAX_CELLS)
    throw new Error("書き出し範囲が大きすぎます。");
  return Array.from({ length: maxRow + 1 }, (_, r) =>
    Array.from({ length: maxCol + 1 }, (_, c) =>
      String(sheet.cells[`${colName(c)}${r + 1}`]?.raw ?? ""),
    ),
  );
}

const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const safeId = (value) =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,120}$/.test(value);
const safeFont = (value) =>
  typeof value === "string" &&
  value.length <= 160 &&
  /^[\p{L}\p{N}\s,_-]+$/u.test(value);
const safeColor = (value) =>
  typeof value === "string" && /^#[\da-f]{6}$/i.test(value);
const finiteNumber = (value, min = -1e15, max = 1e15) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max;
function optionalNumber(object, key, min, max) {
  if (
    object[key] !== undefined &&
    object[key] !== null &&
    object[key] !== "" &&
    !finiteNumber(object[key], min, max)
  )
    throw new Error(`${key} の数値が不正です。`);
}
function optionalText(object, key, limit = 32767) {
  if (
    object[key] !== undefined &&
    (typeof object[key] !== "string" || object[key].length > limit)
  )
    throw new Error(`${key} の文字列が不正です。`);
}
function assertSafeStructure(root) {
  const stack = [[root, 0, false]],
    seen = new WeakSet();
  while (stack.length) {
    const [value, depth, leaving] = stack.pop();
    if (value === null || typeof value !== "object") continue;
    if (leaving) {
      seen.delete(value);
      continue;
    }
    if (seen.has(value) || depth > 30)
      throw new Error("プロジェクトの入れ子構造が不正です。");
    seen.add(value);
    stack.push([value, depth, true]);
    for (const [key, child] of Object.entries(value)) {
      if (["__proto__", "prototype", "constructor"].includes(key))
        throw new Error("プロジェクトに使用できない属性があります。");
      if (child && typeof child === "object")
        stack.push([child, depth + 1, false]);
    }
  }
}
function validateFormat(format) {
  if (!isRecord(format)) throw new Error("セル書式が不正です。");
  for (const key of ["bold", "italic"])
    if (format[key] !== undefined && typeof format[key] !== "boolean")
      throw new Error("セル書式が不正です。");
  for (const key of ["color", "bg"])
    if (format[key] !== undefined && !safeColor(format[key]))
      throw new Error("セルの色は6桁のHEX色で指定してください。");
  if (
    format.align !== undefined &&
    !["left", "center", "right"].includes(format.align)
  )
    throw new Error("セルの配置が不正です。");
  if (format.fontFamily !== undefined && !safeFont(format.fontFamily))
    throw new Error("フォント名が不正です。");
  if (
    format.fontSize !== undefined &&
    !finiteNumber(Number(format.fontSize), 6, 120)
  )
    throw new Error("文字サイズが不正です。");
  optionalText(format, "numberFormat", 200);
}
function validateSheets(sheets) {
  if (!Array.isArray(sheets) || !sheets.length || sheets.length > 100)
    throw new Error("シート情報が不正です（1〜100シート）。");
  let count = 0;
  const ids = new Set();
  for (const sheet of sheets) {
    if (
      !isRecord(sheet) ||
      !safeId(sheet.id) ||
      ids.has(sheet.id) ||
      typeof sheet.name !== "string" ||
      sheet.name.length > 200 ||
      !isRecord(sheet.cells)
    )
      throw new Error("シート形式が不正です。");
    ids.add(sheet.id);
    for (const [ref, cell] of Object.entries(sheet.cells)) {
      const pos = parseRef(ref);
      if (
        !pos ||
        pos.row < 0 ||
        pos.row >= 1048576 ||
        pos.col >= 16384 ||
        !cell ||
        typeof cell !== "object" ||
        !["string", "number", "boolean"].includes(typeof cell.raw)
      )
        throw new Error(`セル ${ref} の形式が不正です。`);
      if (
        (typeof cell.raw === "string" && cell.raw.length > 32767) ||
        (typeof cell.raw === "number" && !Number.isFinite(cell.raw))
      )
        throw new Error(`セル ${ref} の値が不正です。`);
      if (cell.format !== undefined) validateFormat(cell.format);
      if (++count > MAX_CELLS)
        throw new Error("読み込めるセル数を超えています。");
    }
    if (sheet.merges !== undefined) {
      if (!Array.isArray(sheet.merges) || sheet.merges.length > 10000)
        throw new Error("結合セル情報が不正です。");
      for (const m of sheet.merges)
        if (
          !isRecord(m) ||
          !["r1", "r2", "c1", "c2"].every(
            (k) =>
              Number.isInteger(m[k]) &&
              m[k] >= 0 &&
              m[k] < (k.startsWith("r") ? 1048576 : 16384),
          ) ||
          m.r1 > m.r2 ||
          m.c1 > m.c2
        )
          throw new Error("結合セル範囲が不正です。");
    }
    if (
      sheet.conditional !== undefined &&
      (!isRecord(sheet.conditional) ||
        !finiteNumber(sheet.conditional.threshold))
    )
      throw new Error("条件付き書式が不正です。");
  }
}

function validateVisual(object) {
  for (const key of ["background", "textColor", "color"])
    if (
      object[key] !== undefined &&
      object[key] !== null &&
      !safeColor(object[key])
    )
      throw new Error("グラフの色が不正です。");
  if (
    object.colors !== undefined &&
    (!Array.isArray(object.colors) ||
      object.colors.length > 100 ||
      !object.colors.every(safeColor))
  )
    throw new Error("系列の色が不正です。");
  if (object.fontFamily !== undefined && !safeFont(object.fontFamily))
    throw new Error("グラフのフォントが不正です。");
  optionalNumber(object, "fontSize", 6, 120);
  optionalNumber(object, "lineWidth", 0, 50);
  optionalNumber(object, "pointSize", 0, 100);
  for (const key of [
    "showGrid",
    "showPoints",
    "showLegend",
    "showLabels",
    "logY",
    "transparent",
    "hidden",
  ])
    if (object[key] !== undefined && typeof object[key] !== "boolean")
      throw new Error("グラフの表示設定が不正です。");
  optionalText(object, "theme", 120);
}

function validateWorkspace(workspace) {
  if (!isRecord(workspace)) throw new Error("ワークスペース情報が不正です。");
  const keys = [
    "tool",
    "preset",
    "pro",
    "showData",
    "inspector",
    "floatPanel",
    "panelPos",
    "panelWidth",
    "zoom",
  ];
  if (Object.keys(workspace).some((key) => !keys.includes(key)))
    throw new Error("ワークスペースに不明な設定があります。");
  if (
    workspace.tool !== undefined &&
    ![
      "chart",
      "data",
      "math",
      "geometry",
      "appearance",
      "typography",
      "layers",
      "axes",
      "analysis",
      "history",
      "settings",
    ].includes(workspace.tool)
  )
    throw new Error("ワークスペースのツールが不正です。");
  if (
    workspace.preset !== undefined &&
    ![
      "Simple",
      "Data",
      "Mathematics",
      "Analysis",
      "Design",
      "Presentation",
      "Custom",
    ].includes(workspace.preset)
  )
    throw new Error("ワークスペースのプリセットが不正です。");
  for (const key of ["pro", "showData", "inspector", "floatPanel"])
    if (workspace[key] !== undefined && typeof workspace[key] !== "boolean")
      throw new Error("ワークスペースの表示設定が不正です。");
  optionalNumber(workspace, "panelWidth", 150, 1000);
  optionalNumber(workspace, "zoom", 10, 500);
  if (
    workspace.panelPos !== undefined &&
    (!isRecord(workspace.panelPos) ||
      !finiteNumber(workspace.panelPos.x, 0, 100000) ||
      !finiteNumber(workspace.panelPos.y, 0, 100000))
  )
    throw new Error("パネル位置が不正です。");
}

export function validateProject(project) {
  if (
    !isRecord(project) ||
    project.version !== 1 ||
    typeof project.name !== "string" ||
    project.name.length > 500
  )
    throw new Error("対応するGraph Studioプロジェクトではありません。");
  assertSafeStructure(project);
  validateSheets(project.sheets);
  if (
    project.charts !== undefined &&
    (!Array.isArray(project.charts) || project.charts.length > 1000)
  )
    throw new Error("グラフ情報が不正です。");
  project.charts ??= [];
  const ids = new Set();
  for (const chart of project.charts) {
    if (
      !isRecord(chart) ||
      !safeId(chart.id) ||
      ids.has(chart.id) ||
      !project.sheets.some((s) => s.id === chart.sheetId)
    )
      throw new Error("グラフの識別情報が不正です。");
    ids.add(chart.id);
    chart.type ??= "line";
    chart.range ??= "A1:B10";
    chart.math ??= [];
    chart.annotations ??= [];
    if (
      ![
        "line",
        "bar",
        "stacked",
        "area",
        "scatter",
        "pie",
        "donut",
        "histogram",
        "box",
        "heatmap",
        "function",
      ].includes(chart.type)
    )
      throw new Error("グラフの種類が不正です。");
    const refs =
      typeof chart.range === "string"
        ? chart.range.split(":").map(parseRef)
        : [];
    if (
      !refs.length ||
      refs.length > 2 ||
      refs.some((r) => !r || r.row < 0 || r.row >= 1048576 || r.col >= 16384) ||
      (refs.length === 2 &&
        (Math.abs(refs[1].row - refs[0].row) + 1) *
          (Math.abs(refs[1].col - refs[0].col) + 1) >
          100000)
    )
      throw new Error("グラフのデータ範囲が不正です。");
    validateVisual(chart);
    for (const key of ["title", "subtitle", "xLabel", "yLabel", "expression"])
      optionalText(chart, key);
    for (const key of ["sheetX", "sheetY"])
      optionalNumber(chart, key, 0, 100000);
    for (const key of ["xMin", "xMax", "yMin", "yMax"])
      optionalNumber(chart, key);
    for (const axis of ["x", "y"])
      if (
        typeof chart[axis + "Min"] === "number" &&
        typeof chart[axis + "Max"] === "number" &&
        chart[axis + "Min"] >= chart[axis + "Max"]
      )
        throw new Error("軸の最大値は最小値より大きくしてください。");
    optionalNumber(chart, "errorAmount", 0, 1e15);
    if (
      chart.seriesHidden !== undefined &&
      (!Array.isArray(chart.seriesHidden) ||
        chart.seriesHidden.length > 1000 ||
        chart.seriesHidden.some((v) => !Number.isInteger(v) || v < 0))
    )
      throw new Error("系列の表示設定が不正です。");
    if (
      !Array.isArray(chart.math) ||
      chart.math.length > 200 ||
      !Array.isArray(chart.annotations) ||
      chart.annotations.length > 1000
    )
      throw new Error("グラフオブジェクトが不正です。");
    for (const m of chart.math) {
      if (
        !isRecord(m) ||
        ![
          "function",
          "derivative",
          "tangent",
          "normal",
          "integral",
          "regression",
          "origin",
          "vertical",
          "horizontal",
          "coordinate",
          "tangent-data",
        ].includes(m.type)
      )
        throw new Error("数学オブジェクトの種類が不正です。");
      validateVisual(m);
      for (const key of ["expression", "method", "label", "result"])
        optionalText(m, key);
      for (const key of ["x0", "a", "b", "value"]) optionalNumber(m, key);
      for (const key of ["pointIndex", "series"])
        optionalNumber(m, key, 0, MAX_CELLS);
      optionalNumber(m, "degree", 1, 12);
    }
    for (const a of chart.annotations) {
      if (!isRecord(a) || typeof a.text !== "string" || a.text.length > 32767)
        throw new Error("注釈が不正です。");
      validateVisual(a);
      optionalNumber(a, "x");
      optionalNumber(a, "y");
    }
  }
  project.customThemes ??= [];
  project.workspace ??= {};
  if (!Array.isArray(project.customThemes) || project.customThemes.length > 500)
    throw new Error("カスタムテーマが不正です。");
  for (const theme of project.customThemes) {
    const keys = [
      "id",
      "name",
      "theme",
      "colors",
      "fontSize",
      "fontFamily",
      "lineWidth",
      "background",
      "textColor",
      "showGrid",
      "showPoints",
      "showLegend",
    ];
    if (
      !isRecord(theme) ||
      !safeId(theme.id) ||
      typeof theme.name !== "string" ||
      theme.name.length > 500 ||
      Object.keys(theme).some((k) => !keys.includes(k))
    )
      throw new Error("カスタムテーマが不正です。");
    validateVisual(theme);
  }
  validateWorkspace(project.workspace);
  if (
    project.editHistory !== undefined &&
    (!Array.isArray(project.editHistory) ||
      project.editHistory.length > 10000 ||
      project.editHistory.some(
        (h) =>
          !isRecord(h) ||
          typeof h.label !== "string" ||
          h.label.length > 1000 ||
          typeof h.time !== "string" ||
          h.time.length > 100 ||
          /[<>"'&]/.test(h.time),
      ))
  )
    throw new Error("編集履歴が不正です。");
  return project;
}

export function parseProject(text) {
  if (text.length > MAX_FILE_SIZE)
    throw new Error("プロジェクトファイルが大きすぎます。");
  let project;
  try {
    project = JSON.parse(text);
  } catch {
    throw new Error("JSONプロジェクトを読み込めません。");
  }
  return validateProject(project);
}

export function stringifyProject(project) {
  return JSON.stringify(validateProject(project), null, 2);
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function joinBytes(arrays) {
  const bytes = new Uint8Array(arrays.reduce((sum, a) => sum + a.length, 0));
  let offset = 0;
  for (const a of arrays) {
    bytes.set(a, offset);
    offset += a.length;
  }
  return bytes;
}

// Store-only ZIP produces a standards-compliant XLSX without a compression dependency.
function zip(entries) {
  const locals = [],
    centrals = [];
  let offset = 0;
  for (const [path, text] of entries) {
    const name = encoder.encode(path),
      data = encoder.encode(text),
      crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x800, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x800, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);
    locals.push(local, data);
    centrals.push(central);
    offset += local.length + data.length;
  }
  const directory = joinBytes(centrals),
    end = new Uint8Array(22),
    ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, directory.length, true);
  ev.setUint32(16, offset, true);
  return joinBytes([...locals, directory, end]);
}

async function unzip(input) {
  const data = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (data.length > MAX_FILE_SIZE)
    throw new Error("XLSXファイルは50MB以下にしてください。");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let end = data.length - 22;
  while (
    end >= Math.max(0, data.length - 65557) &&
    view.getUint32(end, true) !== 0x06054b50
  )
    end--;
  if (end < Math.max(0, data.length - 65557))
    throw new Error("有効なXLSX（ZIP）ではありません。");
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true),
    total = 0;
  const files = new Map();
  if (count > 2000) throw new Error("XLSX内のファイル数が多すぎます。");
  for (let i = 0; i < count; i++) {
    if (
      offset + 46 > data.length ||
      view.getUint32(offset, true) !== 0x02014b50
    )
      throw new Error("XLSXの構造が壊れています。");
    const flags = view.getUint16(offset + 8, true),
      method = view.getUint16(offset + 10, true),
      crc = view.getUint32(offset + 16, true),
      compressedSize = view.getUint32(offset + 20, true),
      size = view.getUint32(offset + 24, true),
      nameLength = view.getUint16(offset + 28, true),
      extraLength = view.getUint16(offset + 30, true),
      commentLength = view.getUint16(offset + 32, true),
      localOffset = view.getUint32(offset + 42, true);
    total += size;
    if (total > MAX_FILE_SIZE * 4)
      throw new Error("展開後のXLSXが大きすぎます。");
    if (flags & 1) throw new Error("暗号化されたXLSXには対応していません。");
    const name = decoder.decode(
      data.subarray(offset + 46, offset + 46 + nameLength),
    );
    if (
      localOffset + 30 > data.length ||
      view.getUint32(localOffset, true) !== 0x04034b50
    )
      throw new Error("XLSXデータが壊れています。");
    const start =
      localOffset +
      30 +
      view.getUint16(localOffset + 26, true) +
      view.getUint16(localOffset + 28, true);
    if (start + compressedSize > data.length)
      throw new Error("XLSXデータが不足しています。");
    let bytes = data.subarray(start, start + compressedSize);
    if (method === 8) {
      if (typeof DecompressionStream === "undefined")
        throw new Error("このブラウザーは圧縮XLSXの読込に対応していません。");
      try {
        const reader = new Blob([bytes])
          .stream()
          .pipeThrough(new DecompressionStream("deflate-raw"))
          .getReader();
        const chunks = [];
        let expanded = 0;
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          expanded += part.value.length;
          if (expanded > size || expanded > MAX_FILE_SIZE * 4) {
            await reader.cancel();
            throw new Error("展開サイズが不正です。");
          }
          chunks.push(part.value);
        }
        bytes = joinBytes(chunks);
      } catch {
        throw new Error(
          "圧縮XLSXの展開に失敗しました。最新版のブラウザーでお試しください。",
        );
      }
    } else if (method !== 0) throw new Error("未対応のXLSX圧縮方式です。");
    if (bytes.length !== size || crc32(bytes) !== crc)
      throw new Error("XLSXの整合性検証に失敗しました。");
    files.set(name.replace(/^\//, ""), decoder.decode(bytes));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function textRuns(xml) {
  return [...xml.matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)]
    .map((m) => unescapeXml(m[1]))
    .join("");
}
function normalizePath(base, path) {
  const parts = (
      path.startsWith("/") ? path.slice(1) : `${base}/${path}`
    ).split("/"),
    output = [];
  for (const part of parts) {
    if (part === "..") output.pop();
    else if (part && part !== ".") output.push(part);
  }
  return output.join("/");
}

function shiftSharedFormula(formula, dr, dc) {
  // Keep strings and absolute references intact when expanding Excel shared formulas.
  return formula.replace(
    /"(?:[^"]|"")*"|(\$?)([A-Z]{1,3})(\$?)([1-9]\d*)/g,
    (whole, absCol, col, absRow, row) => {
      if (absCol === undefined) return whole;
      const pos = parseRef(`${col}${row}`),
        nextRow = pos.row + (absRow ? 0 : dr),
        nextCol = pos.col + (absCol ? 0 : dc);
      return nextRow < 0 || nextCol < 0
        ? "#REF!"
        : `${absCol}${colName(nextCol)}${absRow}${nextRow + 1}`;
    },
  );
}

function readStyles(xml) {
  if (!xml) return [];
  const section = (name) =>
    xml.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`))?.[1] ||
    "";
  const fonts = [
    ...section("fonts").matchAll(/<font\b[^>]*>([\s\S]*?)<\/font>/g),
  ].map((m) => {
    const color = attrs(m[1].match(/<color\b([^>]*)\/?\s*>/)?.[1] || "").rgb;
    return {
      ...(/<b(?:\s|\/>|>)/.test(m[1])
        ? { bold: !/<b\s+val="0"/.test(m[1]) }
        : {}),
      ...(color ? { color: `#${color.slice(-6)}` } : {}),
    };
  });
  const fills = [
    ...section("fills").matchAll(/<fill\b[^>]*>([\s\S]*?)<\/fill>/g),
  ].map((m) => {
    const color = attrs(m[1].match(/<fgColor\b([^>]*)\/?\s*>/)?.[1] || "").rgb;
    return color ? { bg: `#${color.slice(-6)}` } : {};
  });
  const builtin = {
    1: "0",
    2: "0.00",
    3: "#,##0",
    4: "#,##0.00",
    9: "0%",
    10: "0.00%",
    11: "0.00E+00",
    14: "mm-dd-yy",
  };
  for (const m of section("numFmts").matchAll(/<numFmt\b([^>]*)\/?\s*>/g)) {
    const a = attrs(m[1]);
    builtin[a.numFmtId] = a.formatCode;
  }
  return [
    ...section("cellXfs").matchAll(/<xf\b([^>]*?)(?:\/>|>([\s\S]*?)<\/xf>)/g),
  ].map((m) => {
    const a = attrs(m[1]),
      alignment = attrs(
        (m[2] || "").match(/<alignment\b([^>]*)\/?\s*>/)?.[1] || "",
      );
    const formatCode = builtin[a.numFmtId],
      numberFormat =
        { "0.00": "number", "0.0%": "percent" }[formatCode] || formatCode;
    return {
      ...(fonts[+a.fontId] || {}),
      ...(fills[+a.fillId] || {}),
      ...(["left", "center", "right"].includes(alignment.horizontal)
        ? { align: alignment.horizontal }
        : {}),
      ...(numberFormat && numberFormat !== "General" ? { numberFormat } : {}),
    };
  });
}

function normalizedFormat(cell) {
  const f = cell.format || cell.style || cell;
  const format = {};
  if (f.bold) format.bold = true;
  if (/^#[\da-f]{6}$/i.test(f.color || ""))
    format.color = f.color.toUpperCase();
  if (/^#[\da-f]{6}$/i.test(f.bg || "")) format.bg = f.bg.toUpperCase();
  if (["left", "center", "right"].includes(f.align)) format.align = f.align;
  if (typeof f.numberFormat === "string" && f.numberFormat.length < 200)
    format.numberFormat =
      { general: "General", number: "0.00", percent: "0.0%" }[f.numberFormat] ||
      f.numberFormat;
  return format;
}

function writeStyles(formats) {
  const color = (value) => value.replace("#", "FF");
  return `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="${formats.length}">${formats.map((f, i) => `<numFmt numFmtId="${164 + i}" formatCode="${escapeXml(f.numberFormat || "General")}"/>`).join("")}</numFmts><fonts count="${formats.length}">${formats.map((f) => `<font><sz val="11"/><name val="Arial"/>${f.bold ? "<b/>" : ""}${f.color ? `<color rgb="${color(f.color)}"/>` : ""}</font>`).join("")}</fonts><fills count="${formats.length + 2}"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${formats.map((f) => `<fill><patternFill patternType="${f.bg ? "solid" : "none"}">${f.bg ? `<fgColor rgb="${color(f.bg)}"/><bgColor indexed="64"/>` : ""}</patternFill></fill>`).join("")}</fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${formats.length}">${formats.map((f, i) => `<xf numFmtId="${164 + i}" fontId="${i}" fillId="${f.bg ? i + 2 : 0}" borderId="0" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1"${f.align ? ' applyAlignment="1"' : ""}>${f.align ? `<alignment horizontal="${f.align}"/>` : ""}</xf>`).join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
}

export async function readXlsx(input) {
  const files = await unzip(input),
    workbook = files.get("xl/workbook.xml");
  if (!workbook) throw new Error("XLSXワークブックが見つかりません。");
  const relationships = new Map(
    [
      ...String(files.get("xl/_rels/workbook.xml.rels") || "").matchAll(
        /<(?:\w+:)?Relationship\b([^>]*?)\/?\s*>/g,
      ),
    ].map((m) => {
      const a = attrs(m[1]);
      return [a.Id, a];
    }),
  );
  const strings = [
    ...String(files.get("xl/sharedStrings.xml") || "").matchAll(
      /<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>/g,
    ),
  ].map((m) => textRuns(m[1]));
  const styles = readStyles(files.get("xl/styles.xml"));
  const sheets = [];
  let count = 0;
  for (const match of workbook.matchAll(/<(?:\w+:)?sheet\b([^>]*?)\/?\s*>/g)) {
    const a = attrs(match[1]),
      rel = relationships.get(a["r:id"]);
    if (!rel || rel.TargetMode === "External") continue;
    const xml = files.get(normalizePath("xl", rel.Target));
    if (!xml) throw new Error(`シート「${a.name}」を読み込めません。`);
    const cells = {},
      sharedFormulas = new Map(),
      pendingShared = [];
    for (const cm of xml.matchAll(
      /<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g,
    )) {
      const ca = attrs(cm[1]),
        body = cm[2] || "",
        ref = ca.r?.toUpperCase();
      if (!parseRef(ref)) continue;
      if (++count > MAX_CELLS)
        throw new Error("読み込めるセル数を超えています。");
      const formula = tagText(body, "f");
      const value = tagText(body, "v");
      const fm = body.match(/<(?:\w+:)?f\b([^>]*?)(?:\/>|>)/),
        fa = fm ? attrs(fm[1]) : {};
      if (fa.t === "shared" && formula)
        sharedFormulas.set(fa.si, { formula, pos: parseRef(ref) });
      if (fa.t === "shared" && !formula) pendingShared.push({ ref, si: fa.si });
      let raw = formula
        ? `=${formula}`
        : ca.t === "s"
          ? (strings[+value] ?? "")
          : ca.t === "inlineStr"
            ? textRuns(body)
            : ca.t === "b"
              ? value === "1"
                ? "TRUE"
                : "FALSE"
              : value;
      const format = styles[+ca.s] || {};
      if (raw !== "" || Object.keys(format).length)
        cells[ref] = { raw, ...(Object.keys(format).length ? { format } : {}) };
    }
    for (const { ref, si } of pendingShared) {
      const shared = sharedFormulas.get(si),
        pos = parseRef(ref);
      if (!shared) throw new Error(`共有数式 ${ref} の参照元がありません。`);
      cells[ref] = {
        ...cells[ref],
        raw: `=${shiftSharedFormula(shared.formula, pos.row - shared.pos.row, pos.col - shared.pos.col)}`,
      };
    }
    sheets.push({
      id: `xlsx-${sheets.length + 1}`,
      name: a.name || `Sheet${sheets.length + 1}`,
      cells,
    });
  }
  if (!sheets.length) throw new Error("読み込めるシートがありません。");
  validateSheets(sheets);
  return sheets;
}

export async function writeXlsx(sheets) {
  validateSheets(sheets);
  const mainNs = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const relNs =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const entries = [];
  const formats = [{}],
    formatIds = new Map([["{}", 0]]);
  for (const sheet of sheets)
    for (const cell of Object.values(sheet.cells)) {
      const format = normalizedFormat(cell),
        key = JSON.stringify(format);
      if (!formatIds.has(key)) {
        formatIds.set(key, formats.length);
        formats.push(format);
      }
    }
  entries.push([
    "[Content_Types].xml",
    `${xmlHeader}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
  ]);
  entries.push([
    "_rels/.rels",
    `${xmlHeader}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${relNs}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  ]);
  const usedNames = new Set();
  entries.push([
    "xl/workbook.xml",
    `${xmlHeader}<workbook xmlns="${mainNs}" xmlns:r="${relNs}"><sheets>${sheets
      .map((sheet, i) => {
        let name =
          sheet.name.replace(/[\\/*?:\[\]]/g, "_").slice(0, 31) ||
          `Sheet${i + 1}`;
        const base = name;
        let n = 2;
        while (usedNames.has(name.toLowerCase())) {
          const suffix = ` (${n++})`;
          name = base.slice(0, 31 - suffix.length) + suffix;
        }
        usedNames.add(name.toLowerCase());
        return `<sheet name="${escapeXml(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`;
      })
      .join("")}</sheets><calcPr fullCalcOnLoad="1"/></workbook>`,
  ]);
  entries.push([
    "xl/_rels/workbook.xml.rels",
    `${xmlHeader}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${relNs}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rIdStyles" Type="${relNs}/styles" Target="styles.xml"/></Relationships>`,
  ]);
  entries.push(["xl/styles.xml", `${xmlHeader}${writeStyles(formats)}`]);
  sheets.forEach((sheet, index) => {
    const rows = new Map();
    for (const [ref, cell] of Object.entries(sheet.cells)) {
      const raw = String(cell.raw ?? ""),
        pos = parseRef(ref),
        styleId = formatIds.get(JSON.stringify(normalizedFormat(cell))) || 0;
      if (!pos || (raw === "" && styleId === 0)) continue;
      if (!rows.has(pos.row)) rows.set(pos.row, []);
      let content;
      if (raw.startsWith("="))
        content = `<c r="${ref}" s="${styleId}"><f>${escapeXml(raw.slice(1))}</f></c>`;
      else if (
        /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(raw) &&
        Number.isFinite(+raw)
      )
        content = `<c r="${ref}" s="${styleId}"><v>${raw}</v></c>`;
      else
        content = `<c r="${ref}" s="${styleId}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(raw)}</t></is></c>`;
      rows.get(pos.row).push({ col: pos.col, content });
    }
    entries.push([
      `xl/worksheets/sheet${index + 1}.xml`,
      `${xmlHeader}<worksheet xmlns="${mainNs}"><sheetData>${[...rows]
        .sort((a, b) => a[0] - b[0])
        .map(
          ([r, cells]) =>
            `<row r="${r + 1}">${cells
              .sort((a, b) => a.col - b.col)
              .map((c) => c.content)
              .join("")}</row>`,
        )
        .join("")}</sheetData></worksheet>`,
    ]);
  });
  return zip(entries);
}
