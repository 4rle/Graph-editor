import { evalCell, cellRef, parseRef } from "./engine.js";
import { escapeXML as e } from "./objects.js";
export function conditionalStyle(sheet, ref, value) {
  const rules = sheet.conditionalRules || [];
  let style = "";
  for (const r of rules) {
    const a = parseRef(r.range.split(":")[0]),
      b = parseRef(r.range.split(":")[1] || r.range),
      p = parseRef(ref);
    if (
      p.row < Math.min(a.row, b.row) ||
      p.row > Math.max(a.row, b.row) ||
      p.col < Math.min(a.col, b.col) ||
      p.col > Math.max(a.col, b.col)
    )
      continue;
    const n = Number(value),
      v = Number(r.value);
    const match =
      r.operator === ">"
        ? n > v
        : r.operator === "<"
          ? n < v
          : r.operator === "="
            ? String(value) === String(r.value)
            : r.operator === "contains"
              ? String(value).includes(r.value)
              : r.operator === ">="
                ? n >= v
                : n <= v;
    if (match) style += `background-color:${r.background};color:${r.color};`;
  }
  return style;
}
export function installSheetTools(C) {
  const field = (k, l, value = "", type = "text") =>
    `<label class="field"><span>${l}</span><input name="${k}" type="${type}" value="${e(value)}"></label>`;
  C.actions.conditional = () => {
    C.openModal(
      "条件付き書式",
      `<form id="conditional-rules-form">${field("range", "適用範囲", C.selectedRange())}<label class="field"><span>条件</span><select name="operator"><option value=">=">以上</option><option value=">">より大きい</option><option value="<=">以下</option><option value="<">より小さい</option><option value="=">等しい</option><option value="contains">文字を含む</option></select></label>${field("value", "比較値", "50")}${field("background", "背景色", "#dddddd", "color")}${field("color", "文字色", "#333333", "color")}<button class="primary">ルールを追加</button></form><div class="panel-section">${(C.currentSheet().conditionalRules || []).map((r, i) => `<div class="conditional-rule">${e(r.range)} ${e(r.operator)} ${e(r.value)}<button data-rule-remove="${i}">削除</button></div>`).join("")}</div>`,
    );
    document.querySelector("#conditional-rules-form").onsubmit = (ev) => {
      ev.preventDefault();
      try {
        const d = new FormData(ev.target);
        d.get("range").split(":").forEach(parseRef);
        C.change("条件付き書式を追加", () => {
          C.currentSheet().conditionalRules ??= [];
          C.currentSheet().conditionalRules.push(Object.fromEntries(d));
        });
        C.closeModal();
      } catch (err) {
        C.notify(err.message);
      }
    };
    document.querySelectorAll("[data-rule-remove]").forEach(
      (b) =>
        (b.onclick = () => {
          C.change("条件付き書式を削除", () =>
            C.currentSheet().conditionalRules.splice(+b.dataset.ruleRemove, 1),
          );
          C.closeModal();
        }),
    );
  };
  C.actions.freeze = () => {
    C.openModal(
      "行・列を固定",
      `<form id="freeze-form">${field("rows", "先頭から固定する行数", C.currentSheet().freezeRows || 0, "number")}${field("cols", "先頭から固定する列数", C.currentSheet().freezeCols || 0, "number")}<button class="primary">適用</button></form>`,
    );
    document.querySelector("#freeze-form").onsubmit = (ev) => {
      ev.preventDefault();
      const d = new FormData(ev.target),
        rows = Number(d.get("rows")),
        cols = Number(d.get("cols"));
      if (rows < 0 || cols < 0 || rows > 20 || cols > 5)
        return C.notify("固定行は0〜20、固定列は0〜5で指定してください。");
      C.change("固定領域を設定", () =>
        Object.assign(C.currentSheet(), {
          freezeRows: rows,
          freezeCols: cols,
          frozen: rows > 0 || cols > 0,
        }),
      );
      C.closeModal();
    };
  };
  document.addEventListener(
    "pointerdown",
    (ev) => {
      const th = ev.target.closest(
        ".cell-grid th[data-col],.cell-grid th[data-row]",
      );
      if (!th || ev.button !== 0) return;
      const box = th.getBoundingClientRect(),
        isCol = th.dataset.col !== undefined;
      if (isCol ? box.right - ev.clientX > 7 : box.bottom - ev.clientY > 5)
        return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      const start = isCol ? ev.clientX : ev.clientY,
        initial = isCol ? box.width : box.height;
      let size = initial;
      const move = (v) => {
        size = Math.max(
          isCol ? 45 : 22,
          Math.min(500, initial + (isCol ? v.clientX : v.clientY) - start),
        );
        th.style[isCol ? "width" : "height"] = size + "px";
      };
      const end = () => {
        document.removeEventListener("pointermove", move);
        C.change("行列のサイズを変更", () => {
          const sh = C.currentSheet(),
            key = isCol ? "columnWidths" : "rowHeights";
          sh[key] ??= {};
          sh[key][isCol ? th.dataset.col : th.dataset.row] = Math.round(size);
        });
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", end, { once: true });
    },
    true,
  );
}
