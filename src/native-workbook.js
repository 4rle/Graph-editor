import React from "react";
import { createRoot } from "react-dom/client";
import { Workbook } from "@fortune-sheet/react";
import { toNativeWorkbook, fromNativeWorkbook } from "./workbook-adapter.js";
let mounted;
export function closeNativeWorkbook() {
  if (mounted) {
    mounted.unmount();
    mounted = null;
  }
}
export async function openNativeWorkbook(C) {
  closeNativeWorkbook();
  if (!document.querySelector("[data-native-css]")) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/native.css";
    link.dataset.nativeCss = "true";
    document.head.append(link);
    await new Promise((resolve, reject) => {
      link.onload = resolve;
      link.onerror = () =>
        reject(Error("表計算エンジンのCSSを取得できません。"));
    });
  }
  C.openModal(
    "表の編集",
    `<div id="native-workbook" class="native-workbook"></div><div class="modal-footer"><button type="button" class="primary" id="native-done">閉じる</button></div>`,
    true,
  );
  document.querySelector(".modal").classList.add("native-modal");
  const el = document.getElementById("native-workbook"),
    ref = React.createRef(),
    start = JSON.parse(
      JSON.stringify(
        toNativeWorkbook(C.getProject().sheets).map((s) => ({
          ...s,
          status: s.id === C.ui.sheetId ? 1 : 0,
        })),
      ),
    );
  let last = JSON.stringify(start);
  const onChange = (book) => {
    try {
      const serialized = JSON.stringify(book);
      if (serialized === last) return;
      last = serialized;
      const converted = fromNativeWorkbook(book, C.getProject().sheets);
      C.change("表計算エンジンで編集", () => {
        const next = new Set(converted.map((s) => s.id));
        C.getProject().sheets = converted;
        C.getProject().charts = C.getProject().charts.filter((c) =>
          next.has(c.sheetId),
        );
        if (!next.has(C.ui.sheetId)) C.ui.sheetId = converted[0].id;
      });
    } catch (err) {
      C.notify(err.message);
    }
  };
  mounted = createRoot(el);
  mounted.render(
    React.createElement(Workbook, {
      data: start,
      onChange,
      ref,
      lang: "en",
      showToolbar: true,
      showFormulaBar: true,
      showSheetTabs: true,
      row: 100,
      column: 26,
      forceCalculation: true,
    }),
  );
  el.parentElement.addEventListener("keydown", (e) => {
    if (e.target.closest("#native-workbook")) e.stopPropagation();
  });
  document.getElementById("native-done").onclick = C.closeModal;
  // Expose the library's supported APIs on this editor element for integration/keyboard helpers.
  el.workbookAPI = () => ref.current;
}
