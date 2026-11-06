import {
  colName,
  colIndex,
  cellRef,
  parseRef,
  rangeCells,
  evalCell,
  shiftFormula,
  evaluateMath,
  derivative,
  integrate,
  regression,
  discreteTangent,
  adjustFormulaReferences,
  renameSheetReferences,
} from "./engine.js";
import { renderChart, themes, getChartData } from "./chart.js";
import {
  parseDelimited,
  stringifyDelimited,
  rowsToSheet,
  sheetToRows,
  readXlsx,
  writeXlsx,
  parseProject,
  stringifyProject,
} from "./io.js";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const uid = () => crypto.randomUUID();
const icons = {
  grid: "M3 3h18v18H3z M3 9h18 M3 15h18 M9 3v18 M15 3v18",
  chart: "M4 3v17h17 M8 15l4-6 4 3 5-8",
  plus: "M12 5v14 M5 12h14",
  down: "m8 10 4 4 4-4",
  back: "m14 6-6 6 6 6",
  undo: "M8 5 3 10l5 5 M3 10h11a6 6 0 0 1 6 6",
  redo: "m16 5 5 5-5 5 M21 10H10a6 6 0 0 0-6 6",
  download: "M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5",
  upload: "M12 16V4 m-5 5 5-5 5 5 M4 16v5h16v-5",
  check: "m5 12 4 4 10-10",
  file: "M6 3h8l5 5v13H6z M14 3v6h5",
  save: "M4 3h14l3 3v15H3V3z M7 3v6h10V3 M7 21v-8h10v8",
  search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6",
  more: "M5 12h.01 M12 12h.01 M19 12h.01",
  close: "m6 6 12 12 M6 18 18 6",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2",
  palette:
    "M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-4 2 2 0 0 1 1-4h3a3 3 0 0 0 3-3 9 9 0 0 0-9-7 M7 9h.01 M10 6h.01 M16 7h.01 M6 14h.01",
  layers: "m3 8 9-5 9 5-9 5z M3 12l9 5 9-5 M3 16l9 5 9-5",
  math: "M4 5h16 M7 5l5 7-5 7h13",
  type: "M4 5h16 M12 5v16 M8 21h8",
  axes: "M12 3v18 M3 12h18 m-3-3 3 3-3 3 m-7-9 3-3 3 3",
  analysis: "M4 20V9h4v11 M10 20V4h4v16 M16 20v-8h4v8",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2",
  move: "M12 3v18 M3 12h18 m-12-6 3-3 3 3 m-6 12 3 3 3-3 M6 9l-3 3 3 3 M18 9l3 3-3 3",
  pointer: "m5 3 14 9-7 1-3 7z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  lock: "M6 10h12v11H6z M8 10V7a4 4 0 0 1 8 0v3",
  sort: "M7 4v16 m-3-3 3 3 3-3 M13 5h8 M13 10h6 M13 15h4",
  filter: "M3 4h18l-7 8v8l-4-2v-6z",
  bold: "M7 3h6a5 5 0 0 1 0 9H7 M7 12h7a5 5 0 0 1 0 9H7z",
  italic: "M10 3h9 M5 21h9 M15 3 9 21",
  align: "M4 5h16 M4 10h11 M4 15h16 M4 20h11",
  merge:
    "M3 4h18v16H3z M9 4v5 M15 4v5 M9 15v5 M15 15v5 M7 12h10 m-8-2-2 2 2 2 m6-4 2 2-2 2",
  expand: "M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5",
  geometry: "M4 19 12 4l8 15z M4 19h16",
  help: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5 M12 17h.01",
};
const icon = (n, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(icons[n] || icons.chart).split(" ").length ? `<path d="${icons[n] || icons.chart}"/>` : ""}</svg>`;
const btn = (action, label, i, cls = "", extra = "") =>
  `<button type="button" class="${cls}" data-action="${action}" ${extra}>${i ? icon(i) : ""}<span>${label}</span></button>`;
function makeDemo() {
  let rows = [
    ["温度 (°C)", "試料 A", "試料 B", "試料 C"],
    [10, 12.4, 8.2, 6.1],
    [15, 18.6, 13.5, 9.8],
    [20, 27.1, 20.8, 15.2],
    [25, 38.5, 29.4, 22.7],
    [30, 51.2, 40.1, 32.6],
    [35, 67.8, 53.6, 44.5],
    [40, 85.3, 69.2, 58.8],
    [45, 106.7, 87.5, 75.1],
    [50, 129.4, 108.3, 94.6],
    [55, 156.8, 132.1, 116.3],
    [60, 186.5, 158.7, 141.9],
    [65, 219.1, 189.4, 170.2],
  ];
  let sheet = rowsToSheet(rows, "実験データ");
  Object.entries(sheet.cells).forEach(([ref, c]) => {
    if (ref.endsWith("1") && ref.length === 2)
      c.format = { bold: true, bg: "#e8f2ee", color: "#22604f" };
  });
  sheet.cells.F1 = { raw: "実験ノート", format: { bold: true } };
  sheet.cells.F2 = { raw: "温度と反応速度の測定" };
  sheet.cells.F3 = { raw: "測定条件：標準大気圧" };
  sheet.cells.F4 = { raw: "単位：μmol / min" };
  return {
    version: 1,
    name: "温度と反応速度の関係",
    sheets: [
      sheet,
      rowsToSheet(
        [
          ["項目", "値"],
          ["平均反応速度", "=AVERAGE(実験データ!B2:B13)"],
          ["測定点数", 12],
        ],
        "解析メモ",
      ),
    ],
    charts: [
      {
        id: uid(),
        sheetId: sheet.id,
        range: "A1:D13",
        type: "line",
        title: "温度と反応速度の関係",
        subtitle: "温度条件による3試料の反応速度を比較",
        xLabel: "温度 (°C)",
        yLabel: "反応速度 (μmol / min)",
        theme: "botanical",
        showGrid: true,
        showLegend: true,
        showPoints: true,
        lineWidth: 2.8,
        fontSize: 12,
        math: [],
        annotations: [],
      },
    ],
    customThemes: [],
    workspace: {},
  };
}
let storageOK = true,
  restored = false,
  project;
try {
  let saved = localStorage.getItem("plot-project-v1");
  project = saved ? parseProject(saved) : makeDemo();
  restored = !!saved;
} catch {
  project = makeDemo();
}
const ui = {
  view: "sheet",
  sheetId: project.sheets[0].id,
  chartId: project.charts[0]?.id,
  selected: { r: 0, c: 0 },
  anchor: { r: 0, c: 0 },
  editing: false,
  tool: "chart",
  preset: "Data",
  pro: true,
  zoom: 90,
  panX: 0,
  panY: 0,
  showData: true,
  inspector: true,
  filter: "",
  find: "",
  history: [],
  future: [],
  menu: null,
  saveState: "保存済み",
  themeCategory: "すべて",
  themeSearch: "",
  selectedPoint: 0,
  floatPanel: false,
  panelPos: { x: 100, y: 110 },
  panelWidth: 230,
  historyLabels: [],
  exportFormat: "svg",
  exportScale: 2,
  exportTransparent: false,
};
const currentSheet = () =>
  project.sheets.find((s) => s.id === ui.sheetId) || project.sheets[0];
const currentChart = () =>
  project.charts.find((c) => c.id === ui.chartId) || project.charts[0];
const rawAt = (r, c) => currentSheet().cells[cellRef(r, c)]?.raw ?? "";
const bounds = () => ({
  r1: Math.min(ui.anchor.r, ui.selected.r),
  r2: Math.max(ui.anchor.r, ui.selected.r),
  c1: Math.min(ui.anchor.c, ui.selected.c),
  c2: Math.max(ui.anchor.c, ui.selected.c),
});
const selectedRange = () => {
  let b = bounds();
  return `${cellRef(b.r1, b.c1)}:${cellRef(b.r2, b.c2)}`;
};
function notify(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(
    () => $("#toast").classList.remove("visible"),
    3200,
  );
}
function persist() {
  try {
    localStorage.setItem("plot-project-v1", stringifyProject(project));
    ui.saveState = "保存済み";
  } catch {
    storageOK = false;
    ui.saveState = "保存できません";
    notify(
      "ブラウザー保存ができません。プロジェクトをダウンロードしてください。",
    );
  }
}
function change(label, fn) {
  ui.history.push(JSON.stringify(project));
  if (ui.history.length > 60) ui.history.shift();
  ui.future = [];
  fn();
  ui.historyLabels.push({
    label,
    time: new Date().toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });
  persist();
  render();
}
function undo() {
  if (!ui.history.length) return;
  ui.future.push(JSON.stringify(project));
  project = JSON.parse(ui.history.pop());
  ui.historyLabels.pop();
  persist();
  render();
}
function redo() {
  if (!ui.future.length) return;
  ui.history.push(JSON.stringify(project));
  project = JSON.parse(ui.future.pop());
  ui.historyLabels.push({
    label: "やり直し",
    time: new Date().toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });
  persist();
  render();
}
function chartChange(key, value) {
  if (!currentChart()) return;
  change("グラフの設定を変更", () => (currentChart()[key] = value));
}
function setCells(value) {
  let sheet = currentSheet(),
    ref = cellRef(ui.selected.r, ui.selected.c);
  if (String(rawAt(ui.selected.r, ui.selected.c)) === String(value)) return;
  change(`${ref} を編集`, () => {
    sheet.cells[ref] = { ...sheet.cells[ref], raw: String(value) };
  });
}
function formatSelection(key, value) {
  change("セルの書式を変更", () => {
    let b = bounds();
    for (let r = b.r1; r <= b.r2; r++)
      for (let c = b.c1; c <= b.c2; c++) {
        let ref = cellRef(r, c),
          cell = currentSheet().cells[ref] || { raw: "" };
        cell.format = { ...cell.format, [key]: value };
        currentSheet().cells[ref] = cell;
      }
  });
}
function header() {
  return `<header class="app-header"><a class="brand" href="#" aria-label="Plot ホーム"><span class="brand-mark">${icon("chart", 24)}</span><strong>plot<span class="brand-dot">.</span></strong></a><div class="file-identity"><button class="file-name" data-action="rename-project">${esc(project.name)}${icon("down", 13)}</button><span class="save-state">${icon(storageOK ? "check" : "file", 12)} ${ui.saveState}<span class="local-label"> · このブラウザーに保存</span></span></div><nav class="workspace-switch" aria-label="ワークスペース">${btn("view-sheet", "スプレッドシート", "grid", ui.view === "sheet" ? "active" : "")}${btn("view-studio", "Graph Studio", "chart", ui.view === "studio" ? "active" : "")}</nav><div class="header-actions">${btn("import", "読み込む", "upload", "quiet import-button")}${btn("export", "エクスポート", "download", "primary")}</div></header>`;
}
function menus() {
  return `<div class="menu-row"><div class="menu-links">${["ファイル", "編集", "表示", "挿入", "書式", "データ", "ヘルプ"].map((v, i) => `<button data-action="menu" data-menu="${i}" class="${ui.menu === i ? "active" : ""}">${v}</button>`).join("")}</div><span class="document-tag"><i></i> ${ui.view === "sheet" ? "SPREADSHEET WORKSPACE" : "GRAPH STUDIO"} <span class="version-tag">BETA</span></span></div>${ui.menu !== null ? menuDropdown() : ""}`;
}
function menuDropdown() {
  let lists = [
    [
      ["new-project", "新しいプロジェクト", "file"],
      ["import", "ファイルを読み込む", "upload"],
      ["save-project", "プロジェクトを保存", "save"],
      ["export", "エクスポート", "download"],
    ],
    [
      ["undo", "元に戻す", "undo"],
      ["redo", "やり直す", "redo"],
      ["find", "検索と置換", "search"],
      ["clear", "選択セルをクリア", "close"],
    ],
    [
      ["view-sheet", "スプレッドシート", "grid"],
      ["view-studio", "Graph Studio", "chart"],
      ["toggle-inspector", "インスペクター切替", "settings"],
      ["fullscreen", "全画面表示", "expand"],
    ],
    [
      ["insert-chart", "選択範囲からグラフ", "chart"],
      ["insert-row", "行を挿入", "plus"],
      ["insert-col", "列を挿入", "plus"],
      ["add-sheet", "シートを追加", "grid"],
    ],
    [
      ["bold", "太字", "bold"],
      ["merge", "セル結合 / 解除", "merge"],
      ["conditional", "条件付き書式", "palette"],
    ],
    [
      ["sort-asc", "昇順に並べ替え", "sort"],
      ["sort-desc", "降順に並べ替え", "sort"],
      ["filter", "フィルター", "filter"],
      ["freeze", "先頭行・列の固定", "lock"],
      ["delete-row", "選択行を削除", "close"],
      ["delete-col", "選択列を削除", "close"],
    ],
    [
      ["help", "使い方とショートカット", "help"],
      ["about", "対応機能について", "file"],
    ],
  ];
  return `<div class="dropdown menu-dropdown" style="left:${20 + ui.menu * 52}px">${lists[ui.menu].map(([a, l, i]) => btn(a, l, i)).join("")}</div>`;
}
function sheetToolbar() {
  let f =
    currentSheet().cells[cellRef(ui.selected.r, ui.selected.c)]?.format || {};
  return `<div class="format-toolbar"><div class="tool-group">${btn("undo", "", "undo", "icon-button", 'aria-label="元に戻す" title="元に戻す (Ctrl+Z)" ' + (!ui.history.length ? "disabled" : ""))}${btn("redo", "", "redo", "icon-button", 'aria-label="やり直す" ' + (!ui.future.length ? "disabled" : ""))}</div><div class="tool-group"><select aria-label="表示倍率" data-ui="sheetZoom"><option>100%</option><option>125%</option><option>150%</option></select><select aria-label="数値の表示形式" data-cell-format="numberFormat"><option value="general" ${f.numberFormat === "general" ? "selected" : ""}>標準</option><option value="number" ${f.numberFormat === "number" ? "selected" : ""}>数値 (0.00)</option><option value="percent" ${f.numberFormat === "percent" ? "selected" : ""}>パーセント</option></select></div><div class="tool-group font-tools"><select aria-label="フォント" data-cell-format="fontFamily"><option>システムフォント</option><option>serif</option><option>monospace</option></select><select aria-label="文字サイズ" data-cell-format="fontSize">${[10, 11, 12, 14, 16, 18, 24].map((n) => `<option value="${n}" ${Number(f.fontSize || 12) === n ? "selected" : ""}>${n}</option>`).join("")}</select></div><div class="tool-group">${btn("bold", "", "bold", "icon-button " + (f.bold ? "pressed" : ""), 'aria-label="太字" title="太字"')}${btn("italic", "", "italic", "icon-button " + (f.italic ? "pressed" : ""), 'aria-label="斜体" title="斜体"')}<label class="color-button" title="文字色">A<input type="color" aria-label="セルの文字色" data-cell-format="color" value="${f.color || "#263b33"}"></label><label class="color-button fill-button" title="背景色">${icon("palette")}<input type="color" aria-label="セルの背景色" data-cell-format="bg" value="${f.bg || "#ffffff"}"></label>${btn("align", "", "align", "icon-button", 'aria-label="配置を切り替え" title="配置"')}${btn("merge", "", "merge", "icon-button", 'aria-label="セル結合" title="セル結合"')}</div><div class="tool-group data-tools">${btn("sort-asc", "", "sort", "icon-button", 'aria-label="昇順に並べ替え" title="昇順に並べ替え"')}${btn("filter", "", "filter", "icon-button", 'aria-label="フィルター" title="フィルター"')}</div><div class="toolbar-spacer"></div>${btn("insert-chart", "グラフを挿入", "chart", "insert-chart-button")}</div>`;
}
function formulaBar() {
  return `<div class="formula-bar"><input id="name-box" aria-label="セルまたは範囲" value="${selectedRange().replace(/:(.*)/, (m, v) => (v === cellRef(ui.selected.r, ui.selected.c) && ui.anchor.r === ui.selected.r && ui.anchor.c === ui.selected.c ? "" : m))}"><span class="formula-symbol">ƒx</span><input id="formula-input" aria-label="数式バー" value="${esc(rawAt(ui.selected.r, ui.selected.c))}" placeholder="値または数式を入力"><span class="formula-hint">Enter で確定</span></div>`;
}
function displayed(cell, value) {
  if (typeof value === "number") {
    if (cell?.format?.numberFormat === "percent")
      return (value * 100).toFixed(1) + "%";
    if (cell?.format?.numberFormat === "number") return value.toFixed(2);
    return Number(value.toPrecision(10)).toLocaleString("en-US", {
      maximumFractionDigits: 6,
    });
  }
  return String(value ?? "");
}
function gridMarkup(compact = false) {
  const sheet = currentSheet(),
    b = bounds(),
    rows = compact ? 14 : 60,
    cols = compact ? 8 : 20,
    merges = sheet.merges || [],
    rowOffset = ui.rowOffset || 0,
    colOffset = ui.colOffset || 0;
  let html = `<table class="cell-grid ${sheet.frozen ? "frozen" : ""}" role="grid" aria-label="${esc(sheet.name)}" style="--sheet-scale:${ui.sheetZoom || 1};width:${44 + 145 + (cols - 1) * 115}px"><colgroup><col class="row-number-col">${Array.from({ length: cols }, (_, c) => `<col style="width:${c === 0 ? 145 : 115}px">`).join("")}</colgroup><thead><tr><th class="corner"></th>${Array.from({ length: cols }, (_, c) => `<th scope="col" class="${c >= b.c1 && c <= b.c2 ? "selected-header" : ""}" data-col="${c + colOffset}">${colName(c + colOffset)}</th>`).join("")}</tr></thead><tbody>`;
  for (let r = rowOffset; r < rowOffset + rows; r++) {
    if (
      ui.filter.trim() &&
      r > 0 &&
      !Array.from({ length: cols }, (_, c) =>
        String(evalCell(project.sheets, sheet.id, r, c)),
      ).some((v) => v.toLowerCase().includes(ui.filter.trim().toLowerCase()))
    )
      continue;
    html += `<tr><th scope="row" class="${r >= b.r1 && r <= b.r2 ? "selected-header" : ""}" data-row="${r}">${r + 1}</th>`;
    for (let c = colOffset; c < colOffset + cols; c++) {
      let merge = merges.find(
        (m) => r >= m.r1 && r <= m.r2 && c >= m.c1 && c <= m.c2,
      );
      if (merge && (r !== merge.r1 || c !== merge.c1)) continue;
      let ref = cellRef(r, c),
        cell = sheet.cells[ref],
        value = evalCell(project.sheets, sheet.id, r, c),
        f = cell?.format || {},
        sel = r >= b.r1 && r <= b.r2 && c >= b.c1 && c <= b.c2,
        active = r === ui.selected.r && c === ui.selected.c;
      let styles = [
        f.bold ? "font-weight:600" : "",
        f.italic ? "font-style:italic" : "",
        f.bg ? `background-color:${f.bg}` : "",
        f.color ? `color:${f.color}` : "",
        f.fontSize ? `font-size:${Number(f.fontSize)}px` : "",
        f.fontFamily && f.fontFamily !== "システムフォント"
          ? `font-family:${f.fontFamily}`
          : "",
        f.align ? `text-align:${f.align}` : "",
        sheet.conditional &&
        typeof value === "number" &&
        value >= sheet.conditional.threshold
          ? "background-color:#d6eddf;color:#16634d"
          : "",
      ]
        .filter(Boolean)
        .join(";");
      html += `<td data-r="${r}" data-c="${c}" data-ref="${ref}" role="gridcell" aria-selected="${sel}" class="${sel ? "in-selection " : ""}${active ? "active-cell " : ""}${typeof value === "number" ? "numeric " : ""}${String(value).startsWith("#") ? "cell-error" : ""}" style="${styles}" ${merge ? `rowspan="${merge.r2 - merge.r1 + 1}" colspan="${merge.c2 - merge.c1 + 1}"` : ""}>${active && ui.editing ? `<input id="cell-editor" aria-label="${ref} を編集" value="${esc(cell?.raw || "")}">` : `<span>${esc(displayed(cell, value))}</span>`}${active ? '<i class="fill-handle" title="選択範囲にオートフィル" data-action="autofill"></i>' : ""}</td>`;
    }
    html += "</tr>";
  }
  return html + "</tbody></table>";
}
function sheetView() {
  let chart = currentChart(),
    onSheet =
      chart && chart.sheetId === ui.sheetId && !(ui.rowOffset || ui.colOffset);
  return `${sheetToolbar()}${formulaBar()}${ui.filter !== "" ? `<div class="filter-strip">${icon("filter", 14)} フィルター<input id="filter-input" aria-label="絞り込み" value="${esc(ui.filter === " " ? "" : ui.filter)}" placeholder="含む文字で絞り込む">${btn("clear-filter", "解除", "close", "quiet")}</div>` : ""}<main class="sheet-workspace"><div class="grid-scroll" id="grid-scroll" tabindex="0">${gridMarkup()}${onSheet ? `<section class="sheet-chart" style="left:${chart.sheetX ?? 530}px;top:${chart.sheetY ?? 68}px" aria-label="シート上のグラフ" data-chart-object><div class="chart-object-toolbar"><span>${icon("chart", 14)} グラフ 01</span><div>${btn("view-studio", "Studio で編集", "expand", "quiet")}${btn("remove-chart", "", "close", "icon-button", 'aria-label="グラフを削除"')}</div></div><div class="embedded-chart" data-action="chart-select">${renderChart(chart, project.sheets, { width: 760, height: 450, interactive: true })}</div><div class="chart-object-footer"><span><i class="live-dot"></i> ${esc(chart.range)} と連動</span><span>ダブルクリックで Graph Studio を開く ${icon("expand", 12)}</span></div></section>` : ""}</div>${ui.inspector ? sheetInspector() : ""}</main>${sheetTabs()}${statusBar()}`;
}
function chartTypeOptions(value) {
  return [
    ["line", "折れ線"],
    ["bar", "棒グラフ"],
    ["stacked", "積み上げ棒"],
    ["area", "面グラフ"],
    ["scatter", "散布図"],
    ["pie", "円グラフ"],
    ["donut", "ドーナツ"],
    ["histogram", "ヒストグラム"],
    ["box", "箱ひげ図"],
    ["heatmap", "ヒートマップ"],
    ["function", "関数グラフ"],
  ]
    .map(
      ([v, l]) =>
        `<option value="${v}" ${value === v ? "selected" : ""}>${l}</option>`,
    )
    .join("");
}
function field(label, html, cls = "") {
  return `<label class="field ${cls}"><span>${label}</span>${html}</label>`;
}
const chartInput = (key, label, type = "text", placeholder = "") =>
  field(
    label,
    `<input type="${type}" data-chart="${key}" value="${esc(currentChart()?.[key] ?? "")}" placeholder="${placeholder}">`,
  );
function sheetInspector() {
  let chart = currentChart();
  return `<aside class="sheet-inspector"><div class="panel-heading"><h2>グラフの設定</h2>${btn("toggle-inspector", "", "close", "icon-button", 'aria-label="設定を閉じる"')}</div>${
    chart
      ? `<div class="inspector-body"><span class="eyebrow">CHART OVERVIEW</span><div class="chart-mini">${renderChart(chart, project.sheets, { width: 520, height: 300, interactive: false })}</div>${field("グラフの種類", `<select data-chart="type">${chartTypeOptions(chart.type)}</select>`)}${field("データ範囲", `<div class="range-field">${icon("grid", 14)}<input data-chart="range" aria-label="データ範囲" value="${esc(chart.range)}"></div>`)}<div class="section-label">デザインテーマ <button data-action="themes">すべて見る ${icon("back", 12)}</button></div><div class="quick-themes">${themes
          .slice(0, 4)
          .map((t) => themeCard(t, true))
          .join(
            "",
          )}</div><div class="studio-invite"><span class="invite-symbol">${icon("chart", 23)}</span><h3>データの、その先へ。</h3><p>数学的な作図から細かなデザインまで。<br>専用の制作環境で仕上げましょう。</p>${btn("view-studio", "Graph Studio を開く", "expand", "primary")}</div></div>`
      : `<div class="empty-panel">${icon("chart", 36)}<h3>データをグラフに</h3><p>セル範囲を選んで、グラフを挿入してください。</p>${btn("insert-chart", "グラフを挿入", "plus", "primary")}</div>`
  }<div class="inspector-foot">${icon("help", 14)} 表とグラフは、いつでも連動します</div></aside>`;
}
function themeCard(t, small = false) {
  return `<button class="theme-card ${currentChart()?.theme === t.id ? "selected" : ""} ${small ? "small" : ""}" data-action="theme" data-theme="${t.id}" title="${esc(t.name)}"><div class="theme-preview" style="background:${t.bg};color:${t.fg}"><svg viewBox="0 0 130 55" aria-hidden="true"><path d="M12 45H120 M12 10v35" fill="none" stroke="${t.grid}"/><path d="m15 38 22-8 22 2 22-18 28-4" stroke="${t.colors[0]}" stroke-width="3" fill="none"/><path d="m15 43 22-3 22-9 22-3 28-9" stroke="${t.colors[1]}" stroke-width="3" fill="none"/></svg>${currentChart()?.theme === t.id ? `<i>${icon("check", 11)}</i>` : ""}</div><span>${esc(t.name)}</span></button>`;
}
function sheetTabs() {
  return `<div class="sheet-tabs"><div class="sheet-tab-controls">${btn("add-sheet", "", "plus", "icon-button", 'aria-label="シートを追加"')}${btn("sheet-menu", "", "grid", "icon-button", 'aria-label="シートの管理"')}</div>${project.sheets.map((s) => `<button class="sheet-tab ${s.id === ui.sheetId ? "active" : ""}" data-action="select-sheet" data-sheet="${s.id}">${icon("grid", 13)}${esc(s.name)}${s.id === ui.sheetId ? icon("down", 11) : ""}</button>`).join("")}<div class="toolbar-spacer"></div><div class="grid-pages">${btn("page-left", "‹", "", "icon-button", 'aria-label="前の列"')}${btn("page-up", "↑", "", "icon-button", 'aria-label="前の60行"')}<span>${cellRef(ui.rowOffset || 0, ui.colOffset || 0)}–${cellRef((ui.rowOffset || 0) + 59, (ui.colOffset || 0) + 19)}</span>${btn("page-down", "↓", "", "icon-button", 'aria-label="次の60行"')}${btn("page-right", "›", "", "icon-button", 'aria-label="次の列"')}</div><span class="sheet-count">${project.sheets.length} シート</span></div>`;
}
function statusBar() {
  let b = bounds(),
    nums = [];
  for (let r = b.r1; r <= b.r2; r++)
    for (let c = b.c1; c <= b.c2; c++) {
      let v = evalCell(project.sheets, ui.sheetId, r, c);
      if (typeof v === "number") nums.push(v);
    }
  return `<footer class="status-bar"><span><i class="live-dot"></i> ${ui.view === "sheet" ? "準備完了" : "リアルタイムプレビュー"}</span><span class="status-middle">${ui.view === "sheet" ? `${selectedRange()}${nums.length ? ` <b>合計: ${Number(nums.reduce((a, v) => a + v, 0).toFixed(3))}</b> <b>平均: ${Number((nums.reduce((a, v) => a + v, 0) / nums.length).toFixed(3))}</b>` : ""}` : `SVG キャンバス <b>1600 × 1000 px</b>`}</span><span>${ui.view === "sheet" ? "数式・グラフを自動更新" : "編集は自動保存されます"} ${icon("lock", 11)}</span></footer>`;
}
const toolItems = [
  ["chart", "chart", "グラフ"],
  ["data", "grid", "データ"],
  ["math", "math", "数学"],
  ["geometry", "geometry", "図形"],
  ["appearance", "palette", "テーマ"],
  ["typography", "type", "文字"],
  ["layers", "layers", "レイヤー"],
  ["axes", "axes", "座標軸"],
  ["analysis", "analysis", "解析"],
  ["history", "clock", "履歴"],
  ["settings", "settings", "設定"],
];
function studioView() {
  const chart = currentChart();
  if (!chart)
    return `<main class="no-chart"><div>${icon("chart", 44)}<h2>最初のグラフを作りましょう</h2><p>表のデータを選んで、制作を始められます。</p>${btn("view-sheet", "表計算に戻る", "grid", "primary")}${btn("insert-chart", "グラフを作成", "plus", "primary")}</div></main>${statusBar()}`;
  return `<div class="studio-toolbar"><div class="studio-title">${icon("chart", 16)}<select aria-label="編集中のグラフ" data-ui="chartId">${project.charts.map((c, i) => `<option value="${c.id}" ${c.id === chart.id ? "selected" : ""}>グラフ ${String(i + 1).padStart(2, "0")} · ${esc(c.title)}</option>`).join("")}</select><span class="divider"></span><span class="studio-label">ワークスペース</span><select aria-label="ワークスペースプリセット" data-ui="preset">${["Simple", "Data", "Mathematics", "Analysis", "Design", "Presentation", "Custom"].map((p) => `<option ${p === ui.preset ? "selected" : ""}>${p}</option>`).join("")}</select></div><div class="studio-toolbar-right"><div class="mode-switch">${btn("simple", "簡単", "", "" + (!ui.pro ? "active" : ""))}${btn("pro", "プロ", "", "" + (ui.pro ? "active" : ""))}</div>${btn("toggle-data", "データ", "grid", "quiet " + (ui.showData ? "pressed" : ""))}${btn("reset-layout", "", "expand", "icon-button", 'aria-label="レイアウトをリセット" title="レイアウトをリセット"')}</div></div><main class="studio-workspace ${ui.pro ? "pro-mode" : "simple-mode"} ${ui.inspector ? "" : "no-inspector"} ${ui.floatPanel ? "has-float" : ""} ${ui.mobilePanel ? "mobile-panel-open" : ""}"><nav class="studio-rail" aria-label="編集ツール">${toolItems
    .filter(
      ([id]) =>
        ui.pro ||
        [
          "chart",
          "data",
          "appearance",
          "typography",
          "axes",
          "settings",
        ].includes(id),
    )
    .map(
      ([id, i, l]) =>
        `<button data-action="tool" data-tool="${id}" title="${l}" aria-label="${l}" class="${ui.tool === id ? "active" : ""}">${icon(i, 21)}<span>${l}</span></button>`,
    )
    .join(
      "",
    )}</nav><aside class="studio-panel ${ui.floatPanel ? "floating-panel" : ""}" style="${ui.floatPanel ? `left:${ui.panelPos.x}px;top:${ui.panelPos.y}px;` : ""}width:${ui.panelWidth}px"><div class="panel-heading panel-drag-handle"><h2>${toolItems.find((t) => t[0] === ui.tool)?.[2] || "グラフ"}</h2><div>${btn("close-panel", "", "close", "icon-button mobile-panel-close", 'aria-label="パネルを閉じる"')}${ui.pro ? btn("float-panel", "", "expand", "icon-button", 'aria-label="パネルをフロート・ドック" title="パネルをフロート・ドック"') : ""}</div></div><div class="studio-panel-content">${studioToolContent()}</div><div class="panel-resize-handle" title="パネル幅を変更"></div></aside><section class="studio-center"><div class="canvas-toolbar"><div>${btn("select-tool", "", "pointer", "icon-button active", 'aria-label="選択ツール"')}${btn("pan-tool", "", "move", "icon-button " + (ui.pan ? "pressed" : ""), 'aria-label="パンツール"')}${btn("undo", "", "undo", "icon-button", 'aria-label="元に戻す"')}${btn("redo", "", "redo", "icon-button", 'aria-label="やり直す"')}</div><span>グラフ ${String(project.charts.indexOf(chart) + 1).padStart(2, "0")} <i> / </i> ${themes.find((t) => t.id === chart.theme)?.name || "Custom"}</span><div>${btn("zoom-out", "−", "", "icon-button", 'aria-label="縮小"')}<button data-action="zoom-reset" class="zoom-value">${ui.zoom}%</button>${btn("zoom-in", "+", "", "icon-button", 'aria-label="拡大"')}${btn("toggle-inspector", "", "settings", "icon-button", 'aria-label="インスペクター切替"')}</div></div><div class="studio-canvas ${ui.pan ? "pan-mode" : ""}" id="studio-canvas"><div class="canvas-ruler horizontal">0 <span>200</span><span>400</span><span>600</span><span>800</span><span>1000</span><span>1200</span></div><div class="canvas-stage" style="transform:translate(${ui.panX}px,${ui.panY}px) scale(${ui.zoom / 100})"><div class="artboard-label"><span>ARTBOARD 01</span><span>1600 × 1000</span></div><div class="graph-artboard" id="graph-artboard">${renderChart(chart, project.sheets, { width: 960, height: 600, interactive: true })}</div></div><span class="canvas-hint">${ui.pan ? "ドラッグでキャンバスを移動" : "点を選択して解析 · ダブルクリックでタイトルを編集"}</span></div>${ui.showData && (window.innerHeight >= 550 || ui.dataExplicit) ? studioData() : ""}</section>${ui.inspector ? studioInspector() : ""}</main>${statusBar()}`;
}
function studioData() {
  let data = getChartData(currentChart(), project.sheets);
  return `<section class="studio-data"><div class="data-panel-top"><h3>${icon("grid", 14)} 元データ <span>${esc(currentSheet().name)}!${esc(currentChart().range)}</span></h3>${btn("view-sheet", "表計算で編集", "expand", "quiet")}${btn("toggle-data", "", "close", "icon-button", 'aria-label="データパネルを閉じる"')}</div><div class="data-mini-scroll"><table><thead><tr><th>#</th><th>${esc(currentChart().xLabel || "X")}</th>${data.series.map((s) => `<th>${esc(s.name)}</th>`).join("")}</tr></thead><tbody>${data.labels
    .map(
      (l, i) =>
        `<tr><th>${i + 1}</th><td>${esc(l)}</td>${data.series
          .map((s) => {
            let p = s.points.find((p) => p.categoryIndex === i);
            return `<td>${p ? `<input aria-label="${esc(s.name)} データ ${i + 1}" data-data-ref="${cellRef(p.row, p.col)}" value="${esc(p.y)}">` : ""}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("")}</tbody></table></div></section>`;
}
function toggle(key, label) {
  return `<label class="toggle-row"><span>${label}</span><input type="checkbox" data-chart="${key}" ${currentChart()?.[key] ? "checked" : ""}><i></i></label>`;
}
function studioToolContent() {
  let chart = currentChart();
  switch (ui.tool) {
    case "chart":
      return `<div class="section-intro"><span class="eyebrow">CHART TYPE</span><h3>データに、最適なかたちを。</h3></div><div class="chart-type-grid">${[
        ["line", "折れ線", "M5 31 18 21 30 25 45 9"],
        ["bar", "棒グラフ", "M8 32V20h8v12 M23 32V8h8v24 M38 32V15h8v17"],
        [
          "scatter",
          "散布図",
          "M9 29h.1 M17 18h.1 M29 24h.1 M34 11h.1 M44 8h.1",
        ],
        ["area", "面グラフ", "M5 32V27l12-9 13 5 15-16v25z"],
        ["donut", "ドーナツ", "M25 8a12 12 0 1 0 0 24 12 12 0 0 0 0-24"],
        ["pie", "円グラフ", "M25 8a12 12 0 1 0 12 12H25z M28 5v12h12"],
      ]
        .map(
          ([t, l, d]) =>
            `<button class="chart-type ${chart.type === t ? "active" : ""}" data-action="chart-type" data-type="${t}"><svg viewBox="0 0 50 40" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="${d}"/></svg><span>${l}</span></button>`,
        )
        .join(
          "",
        )}</div>${field("すべてのグラフ", `<select data-chart="type">${chartTypeOptions(chart.type)}</select>`)}<div class="panel-section"><h3>表示オプション</h3>${toggle("showLegend", "凡例を表示")}${toggle("showGrid", "グリッド線")}${toggle("showPoints", "データ点")}${toggle("showLabels", "データラベル")}</div><div class="panel-section"><h3>系列</h3>${seriesControls()}</div>`;
    case "data":
      return `<span class="eyebrow">SOURCE DATA</span>${field("元のシート", `<select data-chart="sheetId">${project.sheets.map((s) => `<option value="${s.id}" ${s.id === chart.sheetId ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select>`)}${chartInput("range", "データ範囲")}<p class="panel-note">1行目を系列名、1列目をX軸として使用します。元のセルを変更するとグラフも更新されます。</p>${btn("use-selection", "選択中のセル範囲を使用", "grid", "secondary full-width")}<div class="panel-section"><h3>系列とデータ</h3>${seriesControls()}</div>${btn("view-sheet", "スプレッドシートに戻る", "back", "quiet full-width")}`;
    case "appearance":
      return `<div class="theme-search">${icon("search", 15)}<input aria-label="テーマを検索" id="theme-search" value="${esc(ui.themeSearch)}" placeholder="テーマを検索"></div><div class="theme-categories">${["すべて", ...new Set(themes.map((t) => t.category))].map((c) => `<button class="${ui.themeCategory === c ? "active" : ""}" data-action="theme-category" data-category="${c}">${c}</button>`).join("")}</div><div class="theme-library">${themes
        .filter(
          (t) =>
            (ui.themeCategory === "すべて" ||
              t.category === ui.themeCategory) &&
            t.name.toLowerCase().includes(ui.themeSearch.toLowerCase()),
        )
        .map((t) => themeCard(t))
        .join(
          "",
        )}</div><div class="panel-section"><h3>カスタムテーマ</h3>${project.customThemes?.map((t) => `<button class="custom-theme" data-action="apply-custom-theme" data-theme="${t.id}"><i style="background:${t.colors?.[0] || "#147d66"}"></i>${esc(t.name)}</button>`).join("") || ""}${btn("save-theme", "現在のデザインを保存", "plus", "secondary full-width")}</div>`;
    case "math":
      return `<span class="eyebrow">MATHEMATICS</span><h3 class="tool-subtitle">数式から、描く。</h3><form id="math-form">${field("関数 f(x)", `<input name="expression" placeholder="例: 0.05*x^2 + 2*x" value="0.05*x^2" required>`)}${field("作図", `<select name="type"><option value="function">関数曲線</option><option value="tangent">接線（数値微分）</option><option value="normal">法線（数値微分）</option><option value="integral">積分領域（Simpson法）</option></select>`)}${field("接点 x₀", `<input name="x0" type="number" value="30" step="any">`)}<div class="field-pair">${field("積分下限 a", `<input name="a" type="number" value="10" step="any">`)}${field("積分上限 b", `<input name="b" type="number" value="40" step="any">`)}</div><button class="primary full-width" type="submit">${icon("plus")}キャンバスに追加</button></form><div class="panel-section"><h3>数学オブジェクト</h3>${mathList()}</div>`;
    case "geometry":
      return `<span class="eyebrow">GEOMETRY</span><h3 class="tool-subtitle">点と図形のつながり</h3><p class="panel-note">グラフ上のデータ点を選び、補助線を作成します。表の変更にも連動します。</p>${pointSummary()}${[
        ["origin", "原点と結ぶ"],
        ["vertical", "X軸に垂線"],
        ["horizontal", "Y軸に垂線"],
        ["coordinate", "座標ラベル"],
        ["tangent-data", "差分近似の接線"],
      ]
        .map(([t, l]) =>
          btn(
            "geometry",
            l,
            "plus",
            "secondary full-width",
            `data-geometry="${t}"`,
          ),
        )
        .join(
          "",
        )}<div class="panel-section"><h3>自由な注釈</h3><form id="annotation-form">${field("テキスト", `<input name="text" required placeholder="注釈を入力">`)}${field("位置 X / Y (%)", `<div class="field-pair"><input name="x" type="number" min="0" max="100" value="65" aria-label="注釈のX位置"><input name="y" type="number" min="0" max="100" value="25" aria-label="注釈のY位置"></div>`)}<button class="secondary full-width">注釈を追加</button></form></div>`;
    case "typography":
      return `<span class="eyebrow">TYPOGRAPHY</span>${chartInput("title", "タイトル")}${chartInput("subtitle", "サブタイトル")}${chartInput("xLabel", "X軸ラベル")}${chartInput("yLabel", "Y軸ラベル")}${field("フォント", `<select data-chart="fontFamily"><option value="system-ui">ゴシック / Sans Serif</option><option value="serif" ${chart.fontFamily === "serif" ? "selected" : ""}>明朝 / Serif</option><option value="monospace" ${chart.fontFamily === "monospace" ? "selected" : ""}>等幅 / Monospace</option></select>`)}${field("基準文字サイズ", `<input type="range" min="10" max="20" data-chart="fontSize" value="${chart.fontSize || 12}">`)}<p class="panel-note">タイトル、軸、凡例のサイズが連動します。数式ラベルは現在プレーンテキストで表示します。</p>`;
    case "layers":
      return `<span class="eyebrow">LAYERS</span><p class="panel-note">系列と数学オブジェクトは独立して管理されます。</p>${getChartData(
        chart,
        project.sheets,
      )
        .series.map(
          (s, i) =>
            `<div class="layer-row"><i style="background:${chart.colors?.[i] || themes.find((t) => t.id === chart.theme)?.colors[i % 3]}"></i><span>${esc(s.name)}</span>${btn("toggle-series", "", "eye", "icon-button " + (chart.seriesHidden?.includes(i) ? "muted" : ""), `aria-label="${esc(s.name)} の表示切替" data-series="${i}"`)}</div>`,
        )
        .join(
          "",
        )}<div class="panel-section"><h3>数学・注釈</h3>${mathList()}${(chart.annotations || []).map((a, i) => `<div class="layer-row">${icon("type", 15)}<span>${esc(a.text)}</span>${btn("delete-annotation", "", "close", "icon-button", `aria-label="注釈を削除" data-index="${i}"`)}</div>`).join("")}</div>`;
    case "axes":
      return `<span class="eyebrow">AXES & GRID</span>${chartInput("xLabel", "X軸ラベル")}<div class="field-pair">${chartInput("xMin", "最小値", "number", "自動")}${chartInput("xMax", "最大値", "number", "自動")}</div>${chartInput("yLabel", "Y軸ラベル")}<div class="field-pair">${chartInput("yMin", "最小値", "number", "自動")}${chartInput("yMax", "最大値", "number", "自動")}</div>${toggle("showGrid", "グリッド線を表示")}${toggle("logY", "Y軸を対数スケールにする")}<p class="panel-note">軸の値を空にすると、自動で範囲を調整します。対数軸では正の値を使用してください。</p>`;
    case "analysis":
      return analysisPanel();
    case "history":
      return `<span class="eyebrow">EDIT HISTORY</span><div class="history-actions">${btn("undo", "元に戻す", "undo", "secondary")}${btn("redo", "やり直す", "redo", "secondary")}</div><ol class="history-list">${
        ui.historyLabels.length
          ? ui.historyLabels
              .slice()
              .reverse()
              .map(
                (h) =>
                  `<li><i></i><span>${esc(h.label)}<small>${esc(h.time)}</small></span></li>`,
              )
              .join("")
          : "<li><span>ここから、制作の記録が始まります。</span></li>"
      }</ol><p class="panel-note">Undo は直近60操作まで。プロジェクト保存には現在のセッションの履歴も含まれます。</p>`;
    case "settings":
      return `<span class="eyebrow">WORKSPACE</span><p class="panel-note">簡単・プロモードの切り替えで編集内容は失われません。</p>${btn("save-workspace", "ワークスペースを保存", "save", "secondary full-width")}${btn("load-workspace", "保存した配置を復元", "clock", "secondary full-width")}${btn("reset-layout", "初期レイアウトに戻す", "expand", "secondary full-width")}<div class="panel-section"><h3>ファイル</h3>${btn("save-project", "プロジェクトをダウンロード", "download", "quiet full-width")}${btn("import", "プロジェクトを読み込む", "upload", "quiet full-width")}${btn("about", "対応機能と今後の拡張", "help", "quiet full-width")}</div>`;
    default:
      return "";
  }
}
function pointSummary() {
  const points =
      getChartData(currentChart(), project.sheets).series[0]?.points || [],
    p = points[ui.selectedPoint] || points[0];
  return p
    ? `<div class="point-summary"><span>選択した点 <b>#${ui.selectedPoint + 1}</b></span><strong>(${p.x}, ${p.y})</strong></div>`
    : '<p class="panel-note">データ点がありません。</p>';
}
function seriesControls() {
  let chart = currentChart();
  return getChartData(chart, project.sheets)
    .series.map(
      (s, i) =>
        `<div class="series-control"><label><input type="color" aria-label="${esc(s.name)} の色" data-series-color="${i}" value="${chart.colors?.[i] || themes.find((t) => t.id === chart.theme)?.colors[i % 3] || "#147d66"}"><span>${esc(s.name)}</span></label>${btn("toggle-series", "", "eye", "icon-button " + (chart.seriesHidden?.includes(i) ? "muted" : ""), `data-series="${i}" aria-label="${esc(s.name)} の表示切替"`)}</div>`,
    )
    .join("");
}
function mathResult(m) {
  try {
    if (m.type === "regression") {
      let points =
          getChartData(currentChart(), project.sheets).series[m.series || 0]
            ?.points || [],
        fit = regression(points, m.method, m.degree);
      return `${fit.equation} · R² = ${fit.r2.toFixed(6)}`;
    }
    if (m.type === "integral" && m.expression)
      return `∫ = ${integrate(m.expression, m.a, m.b).toPrecision(7)} (Simpson法)`;
    if (m.type === "tangent" && m.expression)
      return `傾き = ${derivative(m.expression, m.x0).toPrecision(6)} (数値微分)`;
    if (m.type === "tangent-data") {
      let points =
        getChartData(currentChart(), project.sheets).series[m.series || 0]
          ?.points || [];
      let result = discreteTangent(points, m.pointIndex);
      return `傾き = ${result.slope.toPrecision(6)} (隣接点差分)`;
    }
  } catch {
    return "計算できません。データと定義域を確認してください。";
  }
  return m.result;
}
function mathList() {
  let names = {
    function: "関数",
    tangent: "接線",
    normal: "法線",
    integral: "積分",
    regression: "回帰",
    origin: "原点線分",
    vertical: "X軸への垂線",
    horizontal: "Y軸への垂線",
    coordinate: "座標ラベル",
    "tangent-data": "差分接線",
  };
  return (
    (currentChart().math || [])
      .map(
        (m, i) =>
          `<div class="math-object"><div><span>${esc(names[m.type] || m.type)}</span><code>${esc(m.expression || m.method || "データ連動")}</code>${mathResult(m) != null ? `<small>${esc(mathResult(m))}</small>` : ""}</div>${btn("delete-math", "", "close", "icon-button", `data-index="${i}" aria-label="数学オブジェクトを削除"`)}</div>`,
      )
      .join("") || '<p class="panel-note">まだオブジェクトはありません。</p>'
  );
}
function analysisPanel() {
  const points =
      getChartData(currentChart(), project.sheets).series[0]?.points || [],
    ys = points.map((p) => p.y),
    mean = ys.reduce((a, b) => a + b, 0) / ys.length;
  return `<span class="eyebrow">SCIENTIFIC ANALYSIS</span><h3 class="tool-subtitle">データの関係を、知る。</h3><div class="stats-grid"><div><span>測定点数</span><strong>${ys.length}</strong></div><div><span>平均</span><strong>${Number.isFinite(mean) ? mean.toFixed(2) : "—"}</strong></div><div><span>標準偏差 (標本)</span><strong>${ys.length > 1 ? Math.sqrt(ys.reduce((a, y) => a + (y - mean) ** 2, 0) / (ys.length - 1)).toFixed(2) : "—"}</strong></div><div><span>数値積分 (台形則)</span><strong>${
    points.length > 1
      ? points
          .slice(1)
          .reduce(
            (a, p, i) => a + ((p.x - points[i].x) * (p.y + points[i].y)) / 2,
            0,
          )
          .toFixed(2)
      : "—"
  }</strong></div></div><form id="regression-form">${field("回帰モデル（第1系列）", `<select name="method"><option value="linear">線形回帰</option><option value="polynomial">多項式回帰</option><option value="exponential">指数関数近似</option></select>`)}${field("多項式の次数", `<input name="degree" type="number" min="1" max="6" value="2">`)}<button class="primary full-width">${icon("analysis")}回帰曲線を追加</button></form><div class="panel-section"><h3>解析結果</h3>${mathList()}</div><p class="panel-note">元データと回帰曲線は別々に保持します。セルの変更に合わせて再計算されます。積分値の単位は X単位 × Y単位です。</p>`;
}
function studioInspector() {
  let chart = currentChart();
  return `<aside class="studio-inspector"><div class="panel-heading"><h2>プロパティ</h2><span class="tiny-tag">GRAPH</span></div><div class="studio-panel-content"><div class="property-selected">${icon("chart", 20)}<div><strong>グラフ ${String(project.charts.indexOf(chart) + 1).padStart(2, "0")}</strong><span>シートにリンク済み</span></div>${icon("lock", 13)}</div><div class="panel-section"><h3>基本設定</h3>${chartInput("title", "タイトル")}${chartInput("subtitle", "サブタイトル")}</div><div class="panel-section"><h3>座標軸</h3>${chartInput("xLabel", "X軸ラベル")}${chartInput("yLabel", "Y軸ラベル")}</div><div class="panel-section"><h3>線とマーカー</h3>${field("線の太さ", `<div class="range-value"><input aria-label="線の太さ" type="range" min="1" max="6" step="0.2" value="${chart.lineWidth || 3}" data-chart="lineWidth"><span>${chart.lineWidth || 3} px</span></div>`)}${toggle("showPoints", "マーカーを表示")}${field("誤差棒 (± 固定値)", `<input type="number" min="0" step="any" data-chart="errorAmount" value="${chart.errorAmount || 0}">`)}</div><div class="panel-section"><h3>配色</h3>${seriesControls()}</div><div class="panel-section"><h3>出力</h3><div class="dimension-display"><span>W <b>1600</b></span><i>×</i><span>H <b>1000</b></span></div>${btn("export", "エクスポート", "download", "primary full-width")}</div></div></aside>`;
}
function render() {
  const oldScroll = $("#grid-scroll"),
    scroll = oldScroll
      ? { x: oldScroll.scrollLeft, y: oldScroll.scrollTop }
      : null;
  $("#app").className =
    "app-shell " + (ui.view === "studio" ? "studio-shell" : "");
  $("#app").innerHTML =
    header() + menus() + (ui.view === "sheet" ? sheetView() : studioView());
  if (scroll && $("#grid-scroll")) {
    $("#grid-scroll").scrollLeft = scroll.x;
    $("#grid-scroll").scrollTop = scroll.y;
  }
  fitCanvas();
  if (ui.editing) {
    let input = $("#cell-editor");
    input?.focus();
    input?.select();
  }
}
function refreshSelection() {
  const b = bounds();
  $$(".cell-grid td[data-r]").forEach((td) => {
    let r = +td.dataset.r,
      c = +td.dataset.c,
      sel = r >= b.r1 && r <= b.r2 && c >= b.c1 && c <= b.c2,
      active = r === ui.selected.r && c === ui.selected.c;
    td.classList.toggle("in-selection", sel);
    td.classList.toggle("active-cell", active);
    td.setAttribute("aria-selected", sel);
    td.querySelector(".fill-handle")?.remove();
    if (active)
      td.insertAdjacentHTML(
        "beforeend",
        '<i class="fill-handle" title="選択範囲にオートフィル" data-action="autofill"></i>',
      );
  });
  $$("[data-col]").forEach((t) =>
    t.classList.toggle(
      "selected-header",
      +t.dataset.col >= b.c1 && +t.dataset.col <= b.c2,
    ),
  );
  $$("[data-row]").forEach((t) =>
    t.classList.toggle(
      "selected-header",
      +t.dataset.row >= b.r1 && +t.dataset.row <= b.r2,
    ),
  );
  if ($("#name-box"))
    $("#name-box").value =
      b.r1 === b.r2 && b.c1 === b.c2 ? cellRef(b.r1, b.c1) : selectedRange();
  if ($("#formula-input"))
    $("#formula-input").value = rawAt(ui.selected.r, ui.selected.c);
  if ($(".format-toolbar")) $(".format-toolbar").outerHTML = sheetToolbar();
  if ($(".status-bar")) $(".status-bar").outerHTML = statusBar();
}
function selectCell(r, c, extend = false) {
  const wasEditing = ui.editing;
  ui.selected = {
    r: Math.max(0, Math.min(1048575, r)),
    c: Math.max(0, Math.min(16383, c)),
  };
  if (!extend) ui.anchor = { ...ui.selected };
  ui.editing = false;
  let outside =
    ui.selected.r < (ui.rowOffset || 0) ||
    ui.selected.r >= (ui.rowOffset || 0) + 60 ||
    ui.selected.c < (ui.colOffset || 0) ||
    ui.selected.c >= (ui.colOffset || 0) + 20;
  if (outside) {
    ui.rowOffset = Math.floor(ui.selected.r / 60) * 60;
    ui.colOffset = Math.floor(ui.selected.c / 20) * 20;
  }
  if (wasEditing || outside) render();
  else refreshSelection();
  $("#grid-scroll")?.focus({ preventScroll: true });
}
function openModal(title, body, wide = false) {
  const root = $("#modal-root");
  root.innerHTML = `<div class="modal-overlay"><section class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-header"><div><span class="eyebrow">PLOT WORKSPACE</span><h2 id="modal-title">${title}</h2></div>${btn("close-modal", "", "close", "icon-button", 'aria-label="閉じる"')}</div><div class="modal-content">${body}</div></section></div>`;
  ui.modalFocus = document.activeElement;
  root.querySelector("input,select,button")?.focus();
}
function closeModal() {
  $("#modal-root").innerHTML = "";
  ui.modalFocus?.focus();
}
function exportModal() {
  openModal(
    "作品を、次の場所へ。",
    `<p class="modal-description">グラフは高品質な画像で、データは再編集できる形式で。</p><form id="export-form"><div class="export-format-grid">${[
      ["svg", "SVG", "ベクター画像"],
      ["png", "PNG", "高解像度画像"],
      ["pdf", "PDF", "印刷ダイアログ"],
      ["csv", "CSV", "現在のシート"],
      ["tsv", "TSV", "現在のシート"],
      ["xlsx", "Excel", "複数シート・数式"],
      ["plot", "Plot", "プロジェクト全体"],
    ]
      .map(
        ([v, l, d]) =>
          `<label class="export-format"><input type="radio" name="format" value="${v}" ${ui.exportFormat === v ? "checked" : ""}><strong>${l}</strong><span>${d}</span></label>`,
      )
      .join(
        "",
      )}</div><div class="export-options"><div class="field-pair">${field("画像の解像度", `<select name="scale"><option value="1">1× 標準</option><option value="2" selected>2× 高解像度</option><option value="3">3× 最高解像度</option></select>`)}${field("出力プリセット", `<select name="preset"><option value="Presentation">Presentation · 1600 × 1000</option><option value="Scientific Paper">Scientific Paper · 1800 × 1200</option><option value="Poster">Poster · 2400 × 3000</option><option value="Social Media">Social Media · 1200 × 1200</option><option value="Print">Print · 2480 × 3508</option></select>`)}</div><label class="checkbox-row"><input type="checkbox" name="transparent">背景を透明にする（SVG / PNG）</label></div><p class="panel-note">PDF はブラウザーの「PDF に保存」を使用します。Excel 出力ではグラフと一部書式を保持しません。完全な復元には Plot 形式を使用してください。</p><div class="modal-footer">${btn("close-modal", "キャンセル", "", "secondary")}<button class="primary" type="submit">${icon("download")}ダウンロード</button></div></form>`,
    true,
  );
}
function download(data, name, type = "application/octet-stream") {
  const a = document.createElement("a"),
    url = URL.createObjectURL(
      data instanceof Blob ? data : new Blob([data], { type }),
    );
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
async function doExport(form) {
  const data = new FormData(form),
    format = data.get("format"),
    chart = currentChart();
  ui.exportFormat = format;
  let name = project.name.replace(/[\\/:*?"<>|]/g, "_");
  if (["svg", "png", "pdf"].includes(format) && !chart) {
    notify("先にグラフを作成してください。");
    return;
  }
  try {
    if (format === "plot") {
      download(
        stringifyProject({ ...project, editHistory: ui.historyLabels }),
        name + ".plot.json",
        "application/json",
      );
    } else if (format === "csv" || format === "tsv") {
      download(
        "\ufeff" +
          stringifyDelimited(
            sheetToRows(currentSheet()),
            format === "csv" ? "," : "\t",
          ),
        name + "." + format,
        "text/plain;charset=utf-8",
      );
    } else if (format === "xlsx") {
      download(
        await writeXlsx(project.sheets),
        name + ".xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
    } else {
      let [outWidth, outHeight] = {
        Presentation: [1600, 1000],
        "Scientific Paper": [1800, 1200],
        Poster: [2400, 3000],
        "Social Media": [1200, 1200],
        Print: [2480, 3508],
      }[data.get("preset")] || [1600, 1000];
      let svg = renderChart(
        { ...chart, transparent: data.has("transparent") },
        project.sheets,
        { width: outWidth, height: outHeight, interactive: false },
      );
      if (format === "svg") download(svg, name + ".svg", "image/svg+xml");
      if (format === "png") {
        let scale = Number(data.get("scale")),
          img = new Image(),
          url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });
        let canvas = document.createElement("canvas");
        canvas.width = outWidth * scale;
        canvas.height = outHeight * scale;
        canvas
          .getContext("2d")
          .drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        await new Promise((resolve) =>
          canvas.toBlob((blob) => {
            download(blob, name + ".png");
            resolve();
          }, "image/png"),
        );
      }
      if (format === "pdf") {
        $("#print-root").innerHTML = svg;
        window.print();
      }
    }
    closeModal();
    notify(
      format === "pdf"
        ? "印刷ダイアログを開きました。"
        : "ファイルを書き出しました。",
    );
  } catch (e) {
    notify("書き出しに失敗しました: " + e.message);
  }
}
function importDialog() {
  openModal(
    "ファイルを読み込む",
    `<label class="import-drop" for="import-file">${icon("upload", 36)}<strong>データから、新しい発見を。</strong><span>CSV / TSV / XLSX / Plot プロジェクト</span><input id="import-file" type="file" accept=".csv,.tsv,.xlsx,.json,.plot"></label><p class="panel-note">CSV・Excel は新しいシートとして追加します。Plot プロジェクトは現在の作業を置き換えます。先にダウンロードして保存できます。</p>${btn("save-project", "現在のプロジェクトを保存", "save", "secondary full-width")}`,
  );
}
async function importFile(file) {
  try {
    ui.rowOffset = ui.colOffset = 0;
    if (file.size > 50 * 1024 * 1024)
      throw new Error("ファイルの上限は50MBです。");
    const ext = file.name.split(".").pop().toLowerCase();
    if (["json", "plot"].includes(ext)) {
      const imported = parseProject(await file.text());
      change("プロジェクトを読み込み", () => {
        project = imported;
        ui.sheetId = project.sheets[0].id;
        ui.chartId = project.charts[0]?.id;
        ui.selected = ui.anchor = { r: 0, c: 0 };
        ui.historyLabels = imported.editHistory || [];
      });
    } else {
      const sheets =
        ext === "xlsx"
          ? await readXlsx(await file.arrayBuffer())
          : [
              rowsToSheet(
                parseDelimited(
                  await file.text(),
                  ext === "tsv" ? "\t" : undefined,
                ),
                file.name.replace(/\.[^.]+$/, ""),
              ),
            ];
      if (project.sheets.length + sheets.length > 100)
        throw new Error("シート数の上限は100です。");
      change("ファイルを読み込み", () => {
        const used = new Set(project.sheets.map((s) => s.name.toLowerCase()));
        const renames = [];
        for (const sheet of sheets) {
          const old = sheet.name;
          const base =
            old.replace(/[\\/?*\[\]:]/g, "_").slice(0, 31) || "Sheet";
          let name = base,
            n = 2;
          while (used.has(name.toLowerCase())) {
            const suffix = ` (${n++})`;
            name = base.slice(0, 31 - suffix.length) + suffix;
          }
          used.add(name.toLowerCase());
          sheet.name = name;
          sheet.id = uid();
          if (name !== old)
            renames.push({
              old,
              name,
              temp: `_import_${uid().replaceAll("-", "")}`,
            });
        }
        for (const sheet of sheets)
          for (const cell of Object.values(sheet.cells)) {
            if (!String(cell.raw).startsWith("=")) continue;
            for (const r of renames)
              cell.raw = renameSheetReferences(cell.raw, r.old, r.temp);
            for (const r of renames)
              cell.raw = renameSheetReferences(cell.raw, r.temp, r.name);
          }
        project.sheets.push(...sheets);
        ui.sheetId = sheets[0].id;
        ui.view = "sheet";
        ui.selected = ui.anchor = { r: 0, c: 0 };
      });
    }
    closeModal();
    notify(file.name + " を読み込みました。");
  } catch (e) {
    notify("読み込めませんでした: " + e.message);
  }
}
function createChart() {
  let b = bounds(),
    range = selectedRange();
  if (b.r1 === b.r2 && b.c1 === b.c2) {
    const refs = Object.keys(currentSheet().cells)
      .map(parseRef)
      .filter(Boolean);
    let maxR = Math.max(1, ...refs.filter((p) => p.col < 4).map((p) => p.row)),
      maxC = Math.min(3, Math.max(1, ...refs.map((p) => p.col)));
    range = `A1:${cellRef(Math.min(maxR, 200), maxC)}`;
  }
  change("グラフを挿入", () => {
    let c = {
      id: uid(),
      sheetId: ui.sheetId,
      range,
      type: "line",
      title: "新しいグラフ",
      subtitle: "",
      xLabel: "",
      yLabel: "",
      theme: "botanical",
      showGrid: true,
      showLegend: true,
      showPoints: true,
      lineWidth: 2.8,
      fontSize: 12,
      math: [],
      annotations: [],
    };
    project.charts.push(c);
    ui.chartId = c.id;
    ui.inspector = true;
  });
  notify("グラフを作成しました。表の変更が自動で反映されます。");
}
function structuralEdit(axis, remove = false) {
  let b = bounds(),
    start = axis === "row" ? b.r1 : b.c1,
    count = remove ? (axis === "row" ? b.r2 - b.r1 + 1 : b.c2 - b.c1 + 1) : 1;
  change(`${axis === "row" ? "行" : "列"}を${remove ? "削除" : "挿入"}`, () => {
    const sheet = currentSheet(),
      cells = {};
    for (const [ref, cell] of Object.entries(sheet.cells)) {
      let p = parseRef(ref),
        v = axis === "row" ? p.row : p.col;
      if (remove && v >= start && v < start + count) continue;
      if (v >= start) {
        if (axis === "row") p.row += remove ? -count : count;
        else p.col += remove ? -count : count;
      }
      cells[cellRef(p.row, p.col)] = cell;
    }
    sheet.cells = cells;
    sheet.merges = [];
    for (let sh of project.sheets)
      for (let cell of Object.values(sh.cells))
        if (String(cell.raw).startsWith("="))
          cell.raw = adjustFormulaReferences(cell.raw, {
            currentSheet: sh.name,
            targetSheet: sheet.name,
            axis,
            index: start,
            deleteCount: remove ? count : 0,
            insertCount: remove ? 0 : count,
          });
    for (let chart of project.charts.filter((c) => c.sheetId === sheet.id))
      chart.range = adjustFormulaReferences(chart.range, {
        currentSheet: sheet.name,
        targetSheet: sheet.name,
        axis,
        index: start,
        deleteCount: remove ? count : 0,
        insertCount: remove ? 0 : count,
      });
  });
  notify("行・列と参照範囲を更新しました。");
}
function sortSheet(desc = false) {
  const sheet = currentSheet(),
    b = bounds();
  let refs = Object.keys(sheet.cells).map(parseRef),
    maxR = Math.max(0, ...refs.map((p) => p.row)),
    maxC = Math.max(0, ...refs.map((p) => p.col));
  let start = b.r1 === b.r2 ? 1 : b.r1,
    end = b.r1 === b.r2 ? maxR : b.r2;
  change("データを並べ替え", () => {
    let rows = [];
    for (let r = start; r <= end; r++)
      rows.push({
        r,
        value: evalCell(project.sheets, sheet.id, r, ui.selected.c),
        cells: Array.from({ length: maxC + 1 }, (_, c) =>
          structuredClone(sheet.cells[cellRef(r, c)] || { raw: "" }),
        ),
      });
    rows.sort((a, b) => {
      let v =
        typeof a.value === "number" && typeof b.value === "number"
          ? a.value - b.value
          : String(a.value).localeCompare(String(b.value), "ja", {
              numeric: true,
            });
      return desc ? -v : v;
    });
    rows.forEach((row, i) =>
      row.cells.forEach(
        (cell, c) => (sheet.cells[cellRef(start + i, c)] = cell),
      ),
    );
  });
}
function showInput(title, label, value, onSave) {
  openModal(
    title,
    `<form id="generic-form">${field(label, `<input id="generic-value" value="${esc(value)}" required>`)}<div class="modal-footer">${btn("close-modal", "キャンセル", "", "secondary")}<button class="primary">保存</button></div></form>`,
  );
  $("#generic-form").onsubmit = (e) => {
    e.preventDefault();
    let v = $("#generic-value").value.trim();
    if (v) {
      if (onSave(v) !== false) closeModal();
    }
  };
  $("#generic-value").select();
}
function findDialog() {
  openModal(
    "検索と置換",
    `<form id="find-form">${field("検索する文字列", `<input name="find" value="${esc(ui.find)}" required autofocus>`)}${field("置換後の文字列", `<input name="replace">`)}<p id="find-result" class="panel-note">現在のシートの入力値・数式から検索します。</p><div class="modal-footer"><button class="secondary" type="submit" name="mode" value="find">次を検索</button><button class="primary" type="submit" name="mode" value="replace">すべて置換</button></div></form>`,
  );
}
function helpDialog() {
  openModal(
    "作業を、もっと軽やかに。",
    `<div class="help-list">${[
      ["セルを編集", "ダブルクリック / F2 / 文字入力"],
      ["入力を確定", "Enter · Tab で次のセルへ"],
      ["範囲を選択", "ドラッグ / Shift + クリック"],
      ["コピー・貼り付け", "Ctrl / ⌘ + C・V"],
      ["元に戻す・やり直す", "Ctrl / ⌘ + Z・Shift + Z"],
      ["検索と置換", "Ctrl / ⌘ + F"],
      ["プロジェクト保存", "Ctrl / ⌘ + S"],
      ["オートフィル", "範囲を選び、右下のハンドルを押す"],
    ]
      .map(([l, k]) => `<div><span>${l}</span><kbd>${k}</kbd></div>`)
      .join(
        "",
      )}</div><p class="panel-note">数式は =SUM(B2:B13)、=AVERAGE(B2:B13)、=IF(B2&gt;50,"高","低") などに対応します。Studio の「数学」では x^2、sin(x)、sqrt(x) を使えます。</p>`,
  );
}
const actions = {
  "view-sheet": () => {
    ui.view = "sheet";
    ui.menu = null;
    render();
  },
  "view-studio": () => {
    ui.view = "studio";
    ui.menu = null;
    if (currentChart()) ui.sheetId = currentChart().sheetId;
    render();
  },
  undo: undo,
  redo: redo,
  export: exportModal,
  import: importDialog,
  "close-modal": closeModal,
  menu: (el) => {
    ui.menu =
      ui.menu === Number(el.dataset.menu) ? null : Number(el.dataset.menu);
    render();
  },
  "rename-project": () =>
    showInput("プロジェクト名", "ファイル名", project.name, (v) =>
      change("ファイル名を変更", () => (project.name = v)),
    ),
  "save-project": () => {
    persist();
    download(
      stringifyProject({ ...project, editHistory: ui.historyLabels }),
      project.name + ".plot.json",
      "application/json",
    );
    notify("プロジェクトを保存しました。");
  },
  "new-project": () => {
    openModal(
      "新しいプロジェクト",
      `<p>現在の作業を置き換えます。必要な場合は先にダウンロードしてください。</p><div class="modal-footer">${btn("save-project", "現在の作業を保存", "save", "secondary")}${btn("confirm-new", "新規作成", "plus", "primary")}</div>`,
    );
  },
  "confirm-new": () => {
    change("新規プロジェクト", () => {
      let s = rowsToSheet(
        [
          ["項目", "系列 1"],
          ["A", 10],
          ["B", 20],
          ["C", 15],
        ],
        "Sheet1",
      );
      project = {
        version: 1,
        name: "無題のプロジェクト",
        sheets: [s],
        charts: [],
        customThemes: [],
        workspace: {},
      };
      ui.sheetId = s.id;
      ui.chartId = null;
      ui.view = "sheet";
      ui.selected = ui.anchor = { r: 0, c: 0 };
    });
    closeModal();
  },
  "page-down": () => selectCell((ui.rowOffset || 0) + 60, ui.colOffset || 0),
  "page-up": () =>
    selectCell(Math.max(0, (ui.rowOffset || 0) - 60), ui.colOffset || 0),
  "page-right": () => selectCell(ui.rowOffset || 0, (ui.colOffset || 0) + 20),
  "page-left": () =>
    selectCell(ui.rowOffset || 0, Math.max(0, (ui.colOffset || 0) - 20)),
  "insert-chart": createChart,
  "chart-select": () => {},
  "remove-chart": () =>
    change("グラフを削除", () => {
      project.charts = project.charts.filter((c) => c.id !== ui.chartId);
      ui.chartId = project.charts[0]?.id;
    }),
  "add-sheet": () => {
    let n = project.sheets.length + 1;
    showInput("シートを追加", "シート名", "Sheet" + n, (v) => {
      if (!validSheetName(v)) return false;
      change("シートを追加", () => {
        const sheet = rowsToSheet([], v);
        project.sheets.push(sheet);
        ui.sheetId = sheet.id;
        ui.selected = ui.anchor = { r: 0, c: 0 };
        ui.rowOffset = ui.colOffset = 0;
      });
    });
  },
  "select-sheet": (el) => {
    ui.rowOffset = ui.colOffset = 0;
    ui.sheetId = el.dataset.sheet;
    ui.selected = ui.anchor = { r: 0, c: 0 };
    ui.filter = "";
    const c = project.charts.find((c) => c.sheetId === ui.sheetId);
    if (c) ui.chartId = c.id;
    render();
  },
  "sheet-menu": () =>
    openModal(
      "シートの管理",
      `<div class="manage-sheets">${project.sheets.map((s) => `<div>${icon("grid", 18)}<strong>${esc(s.name)}</strong>${btn("rename-sheet", "名前を変更", "", "secondary", `data-sheet="${s.id}"`)}${btn("delete-sheet", "削除", "", "quiet", `data-sheet="${s.id}" ${project.sheets.length <= 1 ? "disabled" : ""}`)}</div>`).join("")}</div>`,
    ),
  "rename-sheet": (el) => {
    let s = project.sheets.find((s) => s.id === el.dataset.sheet);
    showInput("シート名を変更", "シート名", s.name, (v) => {
      if (!validSheetName(v, s.id)) return false;
      change("シート名を変更", () => {
        const old = s.name;
        s.name = v;
        for (let sh of project.sheets)
          for (let cell of Object.values(sh.cells))
            if (String(cell.raw).startsWith("="))
              cell.raw = renameSheetReferences(cell.raw, old, v);
      });
    });
  },
  "delete-sheet": (el) => {
    if (project.sheets.length < 2) return;
    change("シートを削除", () => {
      project.sheets = project.sheets.filter((s) => s.id !== el.dataset.sheet);
      project.charts = project.charts.filter(
        (c) => c.sheetId !== el.dataset.sheet,
      );
      if (ui.sheetId === el.dataset.sheet) ui.sheetId = project.sheets[0].id;
    });
    closeModal();
  },
  bold: () =>
    formatSelection(
      "bold",
      !currentSheet().cells[cellRef(ui.selected.r, ui.selected.c)]?.format
        ?.bold,
    ),
  italic: () =>
    formatSelection(
      "italic",
      !currentSheet().cells[cellRef(ui.selected.r, ui.selected.c)]?.format
        ?.italic,
    ),
  align: () => {
    let old =
      currentSheet().cells[cellRef(ui.selected.r, ui.selected.c)]?.format
        ?.align;
    formatSelection(
      "align",
      old === "center" ? "right" : old === "right" ? "left" : "center",
    );
  },
  merge: () => {
    let b = bounds();
    change("セル結合を変更", () => {
      let s = currentSheet();
      s.merges ||= [];
      let i = s.merges.findIndex(
        (m) => b.r1 >= m.r1 && b.r1 <= m.r2 && b.c1 >= m.c1 && b.c1 <= m.c2,
      );
      if (i >= 0) s.merges.splice(i, 1);
      else if (b.r2 > b.r1 || b.c2 > b.c1) s.merges.push(b);
    });
  },
  clear: () =>
    change("セルをクリア", () => {
      let b = bounds();
      for (let r = b.r1; r <= b.r2; r++)
        for (let c = b.c1; c <= b.c2; c++) {
          let ref = cellRef(r, c);
          if (currentSheet().cells[ref]) currentSheet().cells[ref].raw = "";
        }
    }),
  conditional: () =>
    showInput(
      "条件付き書式",
      "指定値以上の数値を緑色で表示",
      currentSheet().conditional?.threshold ?? "50",
      (v) => {
        if (!Number.isFinite(Number(v)))
          return notify("数値を入力してください。");
        change(
          "条件付き書式を設定",
          () => (currentSheet().conditional = { threshold: Number(v) }),
        );
      },
    ),
  "insert-row": () => structuralEdit("row"),
  "insert-col": () => structuralEdit("col"),
  "delete-row": () => structuralEdit("row", true),
  "delete-col": () => structuralEdit("col", true),
  "sort-asc": () => sortSheet(false),
  "sort-desc": () => sortSheet(true),
  filter: () => {
    ui.filter = ui.filter ? "" : " ";
    render();
    $("#filter-input")?.focus();
  },
  "clear-filter": () => {
    ui.filter = "";
    render();
  },
  freeze: () =>
    change(
      "先頭行・列の固定を変更",
      () => (currentSheet().frozen = !currentSheet().frozen),
    ),
  find: findDialog,
  help: helpDialog,
  about: () =>
    openModal(
      "Plot について",
      `<h3>表からはじまる、グラフの制作環境。</h3><p>仕様書 v1.0 を基にした初期実装です。表計算・11種類のグラフ・12テーマ・数学／回帰解析・ファイル入出力をひとつにまとめています。</p><p class="panel-note">現在の制約：既存の表計算エンジンの導入、任意のパネルのタブ化・ドック配置、LaTeX組版、媒介変数・極座標・等高線・複合軸、高度なベクター編集・アニメーション、Excelグラフ互換には未対応です。巨大なブック向けの仮想スクロールは未実装です。</p><p class="panel-note">データはブラウザー内に保存されます。共有や他端末への移動には Plot プロジェクトをダウンロードしてください。</p>`,
    ),
  fullscreen: async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      notify("このブラウザーでは全画面表示を利用できません。");
    }
  },
  autofill: () => {
    const b = bounds(),
      source = currentSheet().cells[cellRef(b.r1, b.c1)];
    if (!source) return;
    if (b.r1 === b.r2 && b.c1 === b.c2) {
      notify("先頭セルを含む範囲を選択してから、ハンドルを押してください。");
      return;
    }
    change("オートフィル", () => {
      for (let r = b.r1; r <= b.r2; r++)
        for (let c = b.c1; c <= b.c2; c++) {
          if (r === b.r1 && c === b.c1) continue;
          let raw = String(source.raw);
          if (raw.startsWith("=")) raw = shiftFormula(raw, r - b.r1, c - b.c1);
          else if (raw.trim() !== "" && Number.isFinite(Number(raw)))
            raw = String(Number(raw) + (r - b.r1) + (c - b.c1));
          currentSheet().cells[cellRef(r, c)] = {
            ...structuredClone(source),
            raw,
          };
        }
    });
  },
  "toggle-inspector": () => {
    ui.inspector = !ui.inspector;
    render();
  },
  themes: () => {
    ui.view = "studio";
    ui.tool = "appearance";
    render();
  },
  theme: (el) =>
    change("テーマを変更", () => {
      currentChart().theme = el.dataset.theme;
      currentChart().colors = [];
      delete currentChart().background;
      delete currentChart().textColor;
    }),
  "chart-type": (el) => chartChange("type", el.dataset.type),
  "use-selection": () => chartChange("range", selectedRange()),
  simple: () => {
    ui.pro = false;
    if (
      ![
        "chart",
        "data",
        "appearance",
        "typography",
        "axes",
        "settings",
      ].includes(ui.tool)
    )
      ui.tool = "chart";
    render();
  },
  pro: () => {
    ui.pro = true;
    render();
  },
  "zoom-out": () => {
    ui.zoom = Math.max(30, ui.zoom - 10);
    render();
  },
  "zoom-in": () => {
    ui.zoom = Math.min(180, ui.zoom + 10);
    render();
  },
  "zoom-reset": () => {
    ui.zoom = 90;
    ui.panX = ui.panY = 0;
    render();
  },
  "select-tool": () => {
    ui.pan = false;
    render();
  },
  "pan-tool": () => {
    ui.pan = !ui.pan;
    render();
  },
  "float-panel": () => {
    ui.floatPanel = !ui.floatPanel;
    render();
  },
  "reset-layout": () => {
    Object.assign(ui, {
      floatPanel: false,
      inspector: true,
      panelWidth: 230,
      showData: true,
      zoom: 90,
      panX: 0,
      panY: 0,
    });
    render();
  },
  "save-workspace": () =>
    change("ワークスペースを保存", () => {
      project.workspace = {
        tool: ui.tool,
        preset: ui.preset,
        pro: ui.pro,
        showData: ui.showData,
        inspector: ui.inspector,
        floatPanel: ui.floatPanel,
        panelPos: ui.panelPos,
        panelWidth: ui.panelWidth,
        zoom: ui.zoom,
      };
    }),
  "load-workspace": () => {
    if (!Object.keys(project.workspace || {}).length)
      return notify("保存された配置はありません。");
    Object.assign(ui, project.workspace);
    render();
    notify("ワークスペースを復元しました。");
  },
  "save-theme": () =>
    showInput("デザインを保存", "テーマ名", "My Theme", (v) =>
      change("カスタムテーマを保存", () => {
        project.customThemes ||= [];
        let c = currentChart(),
          t = themes.find((t) => t.id === c.theme) || themes[0];
        project.customThemes.push({
          id: uid(),
          name: v,
          theme: c.theme,
          colors: c.colors?.length ? c.colors : t.colors,
          fontSize: c.fontSize,
          fontFamily: c.fontFamily,
          lineWidth: c.lineWidth,
          background: c.background,
          textColor: c.textColor,
          showGrid: c.showGrid,
          showPoints: c.showPoints,
        });
      }),
    ),
  "apply-custom-theme": (el) =>
    change("カスタムテーマを適用", () => {
      let t = project.customThemes.find((t) => t.id === el.dataset.theme);
      const { id, name, ...properties } = t;
      Object.assign(currentChart(), properties);
    }),
  geometry: (el) => {
    const type = el.dataset.geometry,
      p = getChartData(currentChart(), project.sheets).series[0]?.points[
        ui.selectedPoint
      ];
    if (!p) return notify("データ点を選択してください。");
    change("数学オブジェクトを追加", () => {
      currentChart().math ||= [];
      currentChart().math.push({
        id: uid(),
        type,
        pointIndex: ui.selectedPoint,
        series: 0,
        x0: p.x,
        method: type === "tangent-data" ? "隣接点差分" : undefined,
      });
    });
  },
  "delete-math": (el) =>
    change("数学オブジェクトを削除", () =>
      currentChart().math.splice(Number(el.dataset.index), 1),
    ),
  "delete-annotation": (el) =>
    change("注釈を削除", () =>
      currentChart().annotations.splice(Number(el.dataset.index), 1),
    ),
  unused: () => {},
  "toggle-series": (el) =>
    change("系列の表示を変更", () => {
      let a = (currentChart().seriesHidden ||= []),
        i = Number(el.dataset.series);
      currentChart().seriesHidden = a.includes(i)
        ? a.filter((v) => v !== i)
        : [...a, i];
    }),
  tool: (el) => {
    ui.tool = el.dataset.tool;
    ui.mobilePanel = true;
    render();
  },
  "close-panel": () => {
    ui.mobilePanel = false;
    render();
  },
  "toggle-data": () => {
    if (window.innerHeight < 550 && !ui.dataExplicit) {
      ui.dataExplicit = true;
      ui.showData = true;
    } else ui.showData = !ui.showData;
    render();
  },
  "theme-category": (el) => {
    ui.themeCategory = el.dataset.category;
    render();
  },
};
document.addEventListener("click", (e) => {
  if (ui.suppressClick) {
    ui.suppressClick = false;
    return;
  }
  let action = e.target.closest("[data-action]");
  if (action) {
    e.preventDefault();
    const a = action.dataset.action;
    try {
      actions[a]?.(action);
    } catch (err) {
      notify(err.message);
    }
    if (a !== "menu" && ui.menu !== null) {
      ui.menu = null;
      render();
    }
    return;
  }
  if (ui.menu !== null && !e.target.closest(".dropdown")) {
    ui.menu = null;
    render();
  }
  let cell = e.target.closest("td[data-r]");
  if (cell && !e.target.closest("input"))
    selectCell(Number(cell.dataset.r), Number(cell.dataset.c), e.shiftKey);
  let point = e.target.closest("[data-point-index]");
  if (point) {
    ui.selectedPoint = Number(point.dataset.pointIndex);
    if (ui.view === "studio") {
      ui.tool = "geometry";
      render();
    }
  }
  let th = e.target.closest("[data-col],[data-row]");
  if (th) {
    if (th.dataset.col != null) {
      ui.anchor = { r: 0, c: Number(th.dataset.col) };
      ui.selected = { r: 59, c: Number(th.dataset.col) };
    } else {
      ui.anchor = { r: Number(th.dataset.row), c: 0 };
      ui.selected = { r: Number(th.dataset.row), c: 19 };
    }
    render();
  }
});
document.addEventListener("dblclick", (e) => {
  if (e.target.closest(".sheet-chart")) {
    ui.view = "studio";
    render();
    return;
  }
  if (e.target.closest("#graph-artboard")) {
    ui.tool = "typography";
    render();
    return;
  }
  let cell = e.target.closest("td[data-r]");
  if (cell) {
    ui.selected = ui.anchor = {
      r: Number(cell.dataset.r),
      c: Number(cell.dataset.c),
    };
    ui.editing = true;
    render();
  }
  let tab = e.target.closest(".sheet-tab");
  if (tab) actions["rename-sheet"](tab);
});
document.addEventListener("change", (e) => {
  const el = e.target;
  try {
    if (el.dataset.chart) {
      let key = el.dataset.chart,
        v =
          el.type === "checkbox"
            ? el.checked
            : el.type === "range" || el.type === "number"
              ? el.value === ""
                ? null
                : Number(el.value)
              : el.value;
      if (key === "range") {
        rangeCells(v);
        if (rangeCells(v).length > 50000)
          throw new Error("範囲が大きすぎます。");
      }
      if (
        key === "xMin" ||
        key === "xMax" ||
        key === "yMin" ||
        key === "yMax"
      ) {
        const min = key.endsWith("Min")
            ? v
            : currentChart()[key.replace("Max", "Min")],
          max = key.endsWith("Max")
            ? v
            : currentChart()[key.replace("Min", "Max")];
        if (
          min != null &&
          min !== "" &&
          max != null &&
          max !== "" &&
          Number(min) >= Number(max)
        )
          throw new Error("最小値は最大値より小さくしてください。");
      }
      chartChange(key, v);
      if (key === "sheetId") {
        ui.sheetId = v;
        render();
      }
    }
    if (el.dataset.cellFormat) formatSelection(el.dataset.cellFormat, el.value);
    if (el.dataset.seriesColor != null) {
      let i = Number(el.dataset.seriesColor);
      change("系列色を変更", () => {
        let c = currentChart(),
          t = themes.find((t) => t.id === c.theme) || themes[0];
        if (!c.colors?.length) c.colors = [...t.colors];
        c.colors[i] = el.value;
      });
    }
    if (el.dataset.ui) {
      let key = el.dataset.ui;
      if (key === "sheetZoom") {
        ui.sheetZoom = Number(el.value.replace("%", "")) / 100;
        render();
      } else {
        ui[key] = el.value;
        if (key === "chartId" && currentChart()) ui.sheetId = currentChart().sheetId;
        if (key === "preset") {
          const presets = {
            Simple: {
              pro: false,
              tool: "chart",
              showData: false,
              inspector: false,
            },
            Data: { pro: true, tool: "data", showData: true, inspector: true },
            Mathematics: {
              pro: true,
              tool: "math",
              showData: false,
              inspector: true,
            },
            Analysis: {
              pro: true,
              tool: "analysis",
              showData: true,
              inspector: true,
            },
            Design: {
              pro: true,
              tool: "appearance",
              showData: false,
              inspector: true,
            },
            Presentation: {
              pro: false,
              tool: "appearance",
              showData: false,
              inspector: false,
            },
          };
          Object.assign(ui, presets[el.value] || {});
        }
        render();
      }
    }
    if (el.id === "import-file" && el.files[0]) importFile(el.files[0]);
    if (el.dataset.dataRef) {
      let ref = el.dataset.dataRef;
      change("元データを編集", () => {
        let sheet = project.sheets.find((s) => s.id === currentChart().sheetId);
        sheet.cells[ref] = { ...sheet.cells[ref], raw: el.value };
      });
    }
  } catch (err) {
    notify(err.message);
    render();
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "theme-search") {
    let p = e.target.selectionStart;
    ui.themeSearch = e.target.value;
    render();
    $("#theme-search").focus();
    $("#theme-search").setSelectionRange(p, p);
  }
  if (e.target.id === "filter-input") {
    let p = e.target.selectionStart;
    ui.filter = e.target.value || " ";
    render();
    $("#filter-input").focus();
    $("#filter-input").setSelectionRange(p, p);
  }
});
document.addEventListener("submit", (e) => {
  if (
    ![
      "export-form",
      "math-form",
      "regression-form",
      "annotation-form",
      "find-form",
    ].includes(e.target.id)
  )
    return;
  e.preventDefault();
  let data = new FormData(e.target);
  try {
    if (e.target.id === "export-form") doExport(e.target);
    if (e.target.id === "math-form") {
      let expression = data.get("expression");
      evaluateMath(expression, Number(data.get("x0")));
      let type = data.get("type"),
        x0 = Number(data.get("x0")),
        a = Number(data.get("a")),
        b = Number(data.get("b"));
      let result =
        type === "integral"
          ? `∫ = ${integrate(expression, a, b).toPrecision(7)} (Simpson法)`
          : type === "tangent"
            ? `傾き = ${derivative(expression, x0).toPrecision(6)} (数値微分)`
            : undefined;
      change("数学オブジェクトを追加", () =>
        currentChart().math.push({
          id: uid(),
          type,
          expression,
          x0,
          a,
          b,
          result,
        }),
      );
    }
    if (e.target.id === "regression-form") {
      let method = data.get("method"),
        degree = Number(data.get("degree")),
        points =
          getChartData(currentChart(), project.sheets).series[0]?.points || [],
        fit = regression(points, method, degree);
      change("回帰分析を追加", () =>
        currentChart().math.push({
          id: uid(),
          type: "regression",
          method,
          degree,
          result: `${fit.equation} · R² = ${fit.r2.toFixed(6)}`,
        }),
      );
    }
    if (e.target.id === "annotation-form")
      change("注釈を追加", () =>
        currentChart().annotations.push({
          id: uid(),
          text: data.get("text"),
          x: Number(data.get("x")),
          y: Number(data.get("y")),
          coordinateMode: "percent",
        }),
      );
    if (e.target.id === "find-form") {
      let term = data.get("find"),
        replacement = data.get("replace");
      ui.find = term;
      let refs = Object.keys(currentSheet().cells).filter((ref) =>
        String(currentSheet().cells[ref].raw).includes(term),
      );
      if (e.submitter?.value === "replace") {
        if (!refs.length) {
          $("#find-result").textContent = "一致するセルがありません。";
          return;
        }
        change("文字列を置換", () =>
          refs.forEach(
            (ref) =>
              (currentSheet().cells[ref].raw = String(
                currentSheet().cells[ref].raw,
              ).replaceAll(term, replacement)),
          ),
        );
        $("#find-result").textContent = refs.length + " セルを置換しました。";
      } else if (refs.length) {
        ui.findIndex = (ui.findIndex ?? -1) + 1;
        let p = parseRef(refs[ui.findIndex % refs.length]);
        selectCell(p.row, p.col);
        $("#find-result").textContent =
          `${refs.length} 件見つかりました · ${refs[ui.findIndex % refs.length]}`;
      } else $("#find-result").textContent = "一致するセルがありません。";
    }
  } catch (err) {
    notify("入力を確認してください: " + err.message);
  }
});
document.addEventListener("focusout", (e) => {
  if (e.target.id === "cell-editor" && ui.editing) {
    ui.editing = false;
    setCells(e.target.value);
  }
  if (e.target.id === "formula-input") setCells(e.target.value);
});
document.addEventListener("keydown", (e) => {
  let modal = $(".modal");
  if (modal) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
    }
    if (e.key === "Tab") {
      const nodes = [
          ...modal.querySelectorAll(
            "button:not([disabled]),input,select,a[href]",
          ),
        ],
        first = nodes[0],
        last = nodes.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
    return;
  }
  if (
    e.target.matches("[data-point-index]") &&
    ["Enter", " "].includes(e.key)
  ) {
    e.preventDefault();
    e.target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return;
  }
  const input = e.target.matches("input,textarea,select"),
    cmd = e.ctrlKey || e.metaKey;
  if (cmd && !input) {
    if (e.key.toLowerCase() === "z") {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
      return;
    }
    if (e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
      return;
    }
    if (e.key.toLowerCase() === "s") {
      e.preventDefault();
      actions["save-project"]();
      return;
    }
    if (e.key.toLowerCase() === "f") {
      e.preventDefault();
      findDialog();
      return;
    }
  }
  if (e.target.id === "name-box" && e.key === "Enter") {
    e.preventDefault();
    try {
      let refs = e.target.value.toUpperCase().split(":"),
        a = parseRef(refs[0]),
        b = parseRef(refs[1] || refs[0]);
      if (Math.max(a.row, b.row) >= 1048576 || Math.max(a.col, b.col) >= 16384)
        throw Error("セルの範囲外です。");
      ui.rowOffset = Math.floor(b.row / 60) * 60;
      ui.colOffset = Math.floor(b.col / 20) * 20;
      ui.anchor = { r: a.row, c: a.col };
      ui.selected = { r: b.row, c: b.col };
      render();
      $(`[data-ref="${cellRef(b.row, b.col)}"]`)?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    } catch (err) {
      notify(err.message);
    }
    return;
  }
  if (["cell-editor", "formula-input"].includes(e.target.id)) {
    if (["Enter", "Tab"].includes(e.key)) {
      e.preventDefault();
      ui.editing = false;
      setCells(e.target.value);
      selectCell(
        ui.selected.r + (e.key === "Enter" ? (e.shiftKey ? -1 : 1) : 0),
        ui.selected.c + (e.key === "Tab" ? (e.shiftKey ? -1 : 1) : 0),
      );
    } else if (e.key === "Escape") {
      e.preventDefault();
      ui.editing = false;
      render();
      $("#grid-scroll")?.focus();
    }
    return;
  }
  if (input || ui.view !== "sheet" || cmd) return;
  let moves = {
    ArrowDown: [1, 0],
    ArrowUp: [-1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
    Enter: [1, 0],
    Tab: [0, e.shiftKey ? -1 : 1],
  };
  if (moves[e.key]) {
    e.preventDefault();
    const [r, c] = moves[e.key];
    selectCell(
      ui.selected.r + r,
      ui.selected.c + c,
      e.shiftKey && e.key !== "Tab",
    );
    $(`[data-ref="${cellRef(ui.selected.r, ui.selected.c)}"]`)?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  } else if (["Delete", "Backspace"].includes(e.key)) {
    e.preventDefault();
    actions.clear();
  } else if (e.key === "F2") {
    e.preventDefault();
    ui.editing = true;
    render();
  } else if (e.key.length === 1 && !e.altKey) {
    e.preventDefault();
    ui.editing = true;
    render();
    const editor = $("#cell-editor");
    if (editor) {
      editor.value = e.key;
      editor.setSelectionRange(1, 1);
    }
  }
});
let clipboard = null;
document.addEventListener("copy", (e) => {
  if (ui.view !== "sheet" || e.target.matches("input,textarea") || $(".modal"))
    return;
  let b = bounds(),
    rows = [];
  for (let r = b.r1; r <= b.r2; r++) {
    let row = [];
    for (let c = b.c1; c <= b.c2; c++) row.push(String(rawAt(r, c)));
    rows.push(row);
  }
  clipboard = { rows, r: b.r1, c: b.c1 };
  e.clipboardData.setData("text/plain", stringifyDelimited(rows, "\t"));
  e.preventDefault();
  notify("セルをコピーしました。");
});
document.addEventListener("paste", (e) => {
  if (ui.view !== "sheet" || e.target.matches("input,textarea") || $(".modal"))
    return;
  let text = e.clipboardData.getData("text/plain");
  if (!text) return;
  e.preventDefault();
  let rows = parseDelimited(text, "\t");
  if (rows.length * (rows[0]?.length || 0) > 50000)
    return notify("一度に貼り付けるセルは50,000以下にしてください。");
  change("セルを貼り付け", () => {
    rows.forEach((row, r) =>
      row.forEach((raw, c) => {
        const rr = ui.selected.r + r,
          cc = ui.selected.c + c;
        if (
          clipboard &&
          stringifyDelimited(clipboard.rows, "\t") === text &&
          String(raw).startsWith("=")
        )
          raw = shiftFormula(
            raw,
            ui.selected.r - clipboard.r,
            ui.selected.c - clipboard.c,
          );
        currentSheet().cells[cellRef(rr, cc)] = {
          ...currentSheet().cells[cellRef(rr, cc)],
          raw: String(raw),
        };
      }),
    );
  });
});
let drag = null;
document.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || e.target.closest("button,input,select,.fill-handle"))
    return;
  const cell = e.target.closest("td[data-r]");
  if (cell) {
    drag = {
      type: "selection",
      anchor: { r: Number(cell.dataset.r), c: Number(cell.dataset.c) },
    };
    return;
  }
  if (e.target.closest(".panel-resize-handle")) {
    drag = { type: "resize", x: e.clientX, width: ui.panelWidth };
    e.preventDefault();
    return;
  }
  if (e.target.closest(".panel-drag-handle") && ui.floatPanel) {
    drag = {
      type: "float",
      x: e.clientX,
      y: e.clientY,
      start: { ...ui.panelPos },
    };
    e.preventDefault();
    return;
  }
  if (e.target.closest(".chart-object-toolbar")) {
    let c = currentChart();
    drag = {
      type: "chart",
      x: e.clientX,
      y: e.clientY,
      start: { x: c.sheetX ?? 530, y: c.sheetY ?? 68 },
    };
    return;
  }
  if (e.target.closest("#studio-canvas") && ui.pan) {
    drag = {
      type: "pan",
      x: e.clientX,
      y: e.clientY,
      start: { x: ui.panX, y: ui.panY },
    };
    e.preventDefault();
  }
});
document.addEventListener("pointermove", (e) => {
  if (!drag) return;
  if (drag.type === "selection") {
    let cell = e.target.closest("td[data-r]");
    if (cell) {
      let r = Number(cell.dataset.r),
        c = Number(cell.dataset.c);
      if (r !== drag.anchor.r || c !== drag.anchor.c) {
        drag.moved = true;
        ui.anchor = drag.anchor;
        ui.selected = { r, c };
        refreshSelection();
      }
    }
  }
  if (drag.type === "resize") {
    ui.panelWidth = Math.max(
      185,
      Math.min(420, drag.width + e.clientX - drag.x),
    );
    $(".studio-panel").style.width = ui.panelWidth + "px";
  }
  if (drag.type === "float") {
    ui.panelPos = {
      x: Math.max(0, drag.start.x + e.clientX - drag.x),
      y: Math.max(0, drag.start.y + e.clientY - drag.y),
    };
    $(".studio-panel").style.left = ui.panelPos.x + "px";
    $(".studio-panel").style.top = ui.panelPos.y + "px";
  }
  if (drag.type === "pan") {
    ui.panX = drag.start.x + e.clientX - drag.x;
    ui.panY = drag.start.y + e.clientY - drag.y;
    $(".canvas-stage").style.transform =
      `translate(${ui.panX}px,${ui.panY}px) scale(${ui.zoom / 100})`;
  }
  if (drag.type === "chart") {
    let el = $("[data-chart-object]");
    el.style.left = Math.max(0, drag.start.x + e.clientX - drag.x) + "px";
    el.style.top = Math.max(0, drag.start.y + e.clientY - drag.y) + "px";
  }
});
document.addEventListener("pointerup", () => {
  if (drag?.type === "selection" && drag.moved) ui.suppressClick = true;
  if (drag?.type === "chart") {
    let el = $("[data-chart-object]");
    let x = parseInt(el.style.left),
      y = parseInt(el.style.top);
    if (x !== drag.start.x || y !== drag.start.y)
      change("グラフを移動", () =>
        Object.assign(currentChart(), { sheetX: x, sheetY: y }),
      );
  }
  drag = null;
});
window.addEventListener("beforeunload", persist);
render();

function fitCanvas() {
  const canvas = $("#studio-canvas"),
    stage = $(".canvas-stage");
  if (canvas && stage) {
    const w = Math.max(
      60,
      Math.min(canvas.clientWidth - 34, (canvas.clientHeight - 54) * 1.6, 960),
    );
    stage.style.width = w + "px";
    stage.style.minWidth = "0";
  }
}
const canvasObserver = new ResizeObserver(fitCanvas);
canvasObserver.observe($("#app"));
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!$(".modal") && !ui.editing) {
      ui.mobilePanel = false;
      render();
    }
  }, 150);
});

function validSheetName(name, exceptId) {
  if (name.length > 31 || /[\\/?*\[\]:]/.test(name)) {
    notify(
      "シート名は31文字以内で、 : / \\ ? * [ ] を含めずに入力してください。",
    );
    return false;
  }
  if (
    project.sheets.some(
      (s) => s.id !== exceptId && s.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    notify("同じ名前のシートがあります。");
    return false;
  }
  if (project.sheets.length >= 100 && !exceptId) {
    notify("シート数の上限は100です。");
    return false;
  }
  return true;
}
