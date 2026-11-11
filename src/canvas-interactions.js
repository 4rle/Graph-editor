import { evalCell, parseRef, cellRef } from "./engine.js";
export function initializeCanvasEditing(C) {
  document.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target.closest(
        "#graph-artboard [data-row][data-col]",
      );
      if (
        !target ||
        event.button !== 0 ||
        !["line", "area", "scatter", "bar", "stacked"].includes(
          C.currentChart()?.type,
        )
      )
        return;
      const svg = target.closest("svg"),
        meta = svg?.dataset;
      if (!meta?.plotLeft) return;
      const row = Number(target.dataset.row),
        col = Number(target.dataset.col),
        key = cellRef(row, col),
        chart = C.currentChart(),
        sheet = C.getProject().sheets.find((s) => s.id === chart.sheetId);
      if (!sheet) return;
      const value = evalCell(C.getProject().sheets, sheet.id, row, col);
      if (typeof value !== "number") return;
      event.stopImmediatePropagation();
      event.preventDefault();
      let keys = C.ui.selectedPointCells || [];
      if (event.shiftKey)
        keys = keys.includes(key)
          ? keys.filter((k) => k !== key)
          : [...keys, key];
      else if (!keys.includes(key)) keys = [key];
      C.ui.selectedPointCells = keys;
      C.ui.selectedPoint = Number(target.dataset.pointIndex || 0);
      C.ui.selectedSeries = Number(target.dataset.seriesIndex || 0);
      target.classList.add("selected-data-point");
      const start = { x: event.clientX, y: event.clientY },
        selected = (keys.length ? keys : [key])
          .map((ref) => {
            const p = parseRef(ref);
            return {
              ref,
              ...p,
              y: evalCell(C.getProject().sheets, sheet.id, p.row, p.col),
            };
          })
          .filter((p) => typeof p.y === "number");
      const xCol = chart.xColumn
          ? parseRef(chart.xColumn + "1").col
          : parseRef(chart.range.split(":")[0]).col,
        anchorX = evalCell(C.getProject().sheets, sheet.id, row, xCol),
        domain = {
          left: +meta.plotLeft,
          right: +meta.plotRight,
          top: +meta.plotTop,
          bottom: +meta.plotBottom,
          xMin: +meta.xMin,
          xMax: +meta.xMax,
          yMin: +meta.yMin,
          yMax: +meta.yMax,
        };
      const origin = svg.createSVGPoint();
      origin.x = event.clientX;
      origin.y = event.clientY;
      const originalSVG = origin.matrixTransform(svg.getScreenCTM().inverse());
      let moved = false,
        newY = value,
        newX = anchorX;
      const inv = (p, axis, log) => {
        const f =
            axis === "y"
              ? (domain.bottom - p) / (domain.bottom - domain.top)
              : (p - domain.left) / (domain.right - domain.left),
          a = domain[axis + "Min"],
          b = domain[axis + "Max"];
        return log
          ? 10 ** (Math.log10(a) + f * (Math.log10(b) - Math.log10(a)))
          : a + f * (b - a);
      };
      const move = (e) => {
        if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < 4) return;
        moved = true;
        const p = svg.createSVGPoint();
        p.x = e.clientX;
        p.y = e.clientY;
        const pos = p.matrixTransform(svg.getScreenCTM().inverse());
        const startY = inv(originalSVG.y, "y", meta.yLog === "true"),
          cursorY = inv(pos.y, "y", meta.yLog === "true");
        newY =
          meta.yLog === "true"
            ? (value * cursorY) / startY
            : value + cursorY - startY;
        if (event.altKey && typeof anchorX === "number") {
          const startX = inv(originalSVG.x, "x", meta.xLog === "true"),
            cursorX = inv(pos.x, "x", meta.xLog === "true");
          newX =
            meta.xLog === "true"
              ? (anchorX * cursorX) / startX
              : anchorX + cursorX - startX;
        }
        target.style.opacity = ".5";
      };
      const end = () => {
        document.removeEventListener("pointermove", move);
        if (!moved) return;
        if (
          !Number.isFinite(newY) ||
          (event.altKey &&
            typeof anchorX === "number" &&
            !Number.isFinite(newX))
        )
          return;
        C.change("データ点を移動", () => {
          const changedX = new Set();
          for (const p of selected) {
            const y =
              meta.yLog === "true" ? (p.y * newY) / value : p.y + newY - value;
            sheet.cells[p.ref] = {
              ...sheet.cells[p.ref],
              raw: String(Number(y.toPrecision(10))),
            };
            if (event.altKey && typeof anchorX === "number") {
              const ref = cellRef(p.row, xCol);
              if (!changedX.has(ref)) {
                const old = evalCell(
                  C.getProject().sheets,
                  sheet.id,
                  p.row,
                  xCol,
                );
                if (typeof old === "number") {
                  const x =
                    meta.xLog === "true"
                      ? (old * newX) / anchorX
                      : old + newX - anchorX;
                  sheet.cells[ref] = {
                    ...sheet.cells[ref],
                    raw: String(Number(x.toPrecision(10))),
                  };
                }
                changedX.add(ref);
              }
            }
          }
        });
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", end, { once: true });
    },
    true,
  );
}
export function highlightSelectedData(ui) {
  for (const node of document.querySelectorAll(
    "#graph-artboard [data-row][data-col]",
  )) {
    const ref = cellRef(Number(node.dataset.row), Number(node.dataset.col));
    node.classList.toggle(
      "selected-data-point",
      !!ui.selectedPointCells?.includes(ref),
    );
  }
}
