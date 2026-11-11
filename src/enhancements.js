import { colorTransform, applyPDFColor } from "./color-management.js";
import { vectorArea } from "./vector-geometry.js";
import {
  expression,
  symbolic,
  analyticIntegral,
  extrema,
  intersections,
  localTangent,
  movingAverage,
  nonlinearFit,
  mathMarkup,
  polygonArea,
} from "./science.js";
import {
  alignObjects,
  combineObjects,
  escapeXML as esc,
  objectBounds,
} from "./objects.js";
import { getChartData, themes } from "./chart.js";
import {
  regression,
  evalCell,
  parseRef,
  cellRef,
  rangeCells,
} from "./engine.js";
import { jsPDF } from "jspdf";
import "svg2pdf.js";
const panelTitles = {
  chart: "グラフ",
  data: "データ",
  math: "数学",
  geometry: "図形",
  appearance: "テーマ",
  typography: "文字",
  layers: "レイヤー",
  axes: "座標軸",
  analysis: "解析",
  history: "履歴",
  settings: "設定",
};
let C;
let panelObservers = [];
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const button = (action, text, extra = "") =>
  `<button type="button" data-adv="${action}" class="secondary" ${extra}>${text}</button>`;
const input = (name, label, value = "", type = "text", extra = "") =>
  `<label class="field"><span>${label}</span><input type="${type}" name="${name}" value="${esc(value)}" ${extra}></label>`;
const select = (name, label, items, value) =>
  `<label class="field"><span>${label}</span><select name="${name}">${[...items, ...(String(value).startsWith("split:") ? [[value, "分割配置"]] : [])].map(([v, t]) => `<option value="${v}" ${v === String(value) ? "selected" : ""}>${t}</option>`).join("")}</select></label>`;
const section = (name, body) =>
  `<section class="panel-section advanced-section"><h3>${name}</h3>${body}</section>`;
const form = (id, body, label = "追加") =>
  `<form data-adv-form="${id}">${body}<button class="primary full-width">${label}</button></form>`;
const chart = () => C.currentChart();
const project = () => C.getProject();
const pts = () =>
  getChartData(chart(), project().sheets).series[C.ui.selectedSeries || 0]
    ?.points || [];
const ids = () => C.ui.objectIds || [];
const num = (d, k, f = 0) => (d.get(k) === "" ? f : Number(d.get(k) ?? f));
function addMath(model) {
  C.change("数学・解析オブジェクトを追加", () => {
    chart().math.push({ id: crypto.randomUUID(), ...model });
  });
}
function addObject(model) {
  C.change("オブジェクトを追加", () => {
    chart().objects ??= [];
    const o = {
      id: crypto.randomUUID(),
      name: model.type,
      x: 20,
      y: 20,
      width: 25,
      height: 15,
      fill: "#dddddd",
      stroke: "#555555",
      lineWidth: 2,
      ...model,
    };
    chart().objects.push(o);
    C.ui.objectIds = [o.id];
  });
}
export function advancedPanel(tool) {
  if (!C || !chart()) return "";
  const ch = chart();
  switch (tool) {
    case "chart":
      return (
        section(
          "関数・特殊グラフ",
          form(
            "curve",
            select(
              "type",
              "形式",
              [
                ["function", "関数"],
                ["parametric", "媒介変数"],
                ["polar", "極座標"],
                ["contour", "等高線"],
              ],
              ch.type,
            ) +
              input(
                "expression",
                "f(x) / r(θ) / f(x,y)",
                ch.expression || "x^2",
              ) +
              input(
                "xExpression",
                "媒介変数 X(t)",
                ch.xExpression || "cos(t)",
              ) +
              input(
                "yExpression",
                "媒介変数 Y(t)",
                ch.yExpression || "sin(t)",
              ) +
              `<div class="field-pair">${input("a", "定義域の下限", ch.domainMin ?? 0, "number", 'step="any"')}${input("b", "定義域の上限", ch.domainMax ?? 6.283185, "number", 'step="any"')}</div>`,
            "適用",
          ),
        ) +
        section(
          "複合・複数軸",
          form(
            "composite",
            select(
              "type",
              "形式",
              [
                ["combo", "複合グラフ"],
                ["dual", "左右2軸"],
              ],
              ch.type,
            ) +
              getChartData(ch, project().sheets)
                .series.map(
                  (s, i) =>
                    `<div class="series-mapping"><span>${esc(s.name)}</span>${select(
                      "type" + i,
                      "描画",
                      [
                        ["line", "折れ線"],
                        ["bar", "棒"],
                      ],
                      ch.seriesTypes?.[i] || "line",
                    )}<label><input type="checkbox" name="right${i}" ${ch.secondarySeries?.includes(i) ? "checked" : ""}>右軸</label></div>`,
                )
                .join(""),
            "適用",
          ),
        )
      );
    case "data":
      return section(
        "データマッピング",
        form(
          "mapping",
          input("xColumn", "X列", ch.xColumn || "A") +
            input(
              "seriesColumns",
              "系列の列（カンマ区切り）",
              (ch.seriesColumns || []).join(","),
            ) +
            input(
              "errorRange",
              "誤差のセル範囲（±、行ごと）",
              ch.errorRange || "",
            ),
          "適用",
        ),
      );
    case "math":
      return (
        section(
          "記号計算・作図",
          form(
            "science",
            input("expression", "関数 f(x)", "x^2") +
              select(
                "operation",
                "操作",
                [
                  ["derivative-symbolic", "記号微分"],
                  ["analytic-integral", "解析的積分"],
                  ["extrema", "極値"],
                  ["intersection", "交点"],
                  ["transform", "関数の変換"],
                ],
                "derivative-symbolic",
              ) +
              input("secondExpression", "交点を求める g(x)", "2*x") +
              `<div class="field-pair">${input("a", "範囲の下限", -5, "number", 'step="any"')}${input("b", "範囲の上限", 5, "number", 'step="any"')}</div>` +
              `<div class="field-pair">${input("scaleX", "X倍率", 1, "number", 'step="any"')}${input("scaleY", "Y倍率", 1, "number", 'step="any"')}${input("shiftX", "X移動", 0, "number", 'step="any"')}${input("shiftY", "Y移動", 0, "number", 'step="any"')}</div>`,
            "実行",
          ),
        ) +
        section(
          "パラメーター",
          form(
            "parameter",
            input("name", "変数名", "a") +
              input("value", "値", 1, "number", 'step="any"') +
              input("min", "最小", -10, "number", 'step="any"') +
              input("max", "最大", 10, "number", 'step="any"'),
            "スライダーを追加",
          ) +
            Object.entries(ch.parameters || {})
              .map(
                ([k, v]) =>
                  `<label class="field"><span>${esc(k)} = ${v}</span><input type="range" data-parameter="${esc(k)}" min="${ch.parameterLimits?.[k]?.min ?? -10}" max="${ch.parameterLimits?.[k]?.max ?? 10}" step="0.01" value="${v}"></label>`,
              )
              .join(""),
        )
      );
    case "geometry":
      return (
        section(
          "2点間の計算",
          form(
            "two-points",
            select(
              "operation",
              "操作",
              [
                ["distance", "点間距離"],
                ["slope", "傾き"],
              ],
              "distance",
            ) +
              input("first", "点1の番号", 1, "number", 'min="1"') +
              input("second", "点2の番号", 2, "number", 'min="1"'),
          ),
        ) + objectTools()
      );
    case "appearance":
      return (
        section(
          "テーマ管理",
          `<div class="advanced-buttons">${button("theme-favorites", "お気に入り")}${button("theme-recent", "最近使った")}${button("themes-all", "全テーマ")}${button("theme-export", "テーマを書き出す")}${button("theme-import", "テーマを読み込む")}</div>${select(
            "themeUsage",
            "用途",
            [
              ["all", "すべて"],
              ["論文", "論文"],
              ["教育", "教育"],
              ["発表", "発表"],
              ["一般", "一般"],
            ],
            C.ui.themeUsage || "all",
          )}`,
        ) +
        section(
          "テーマの構成要素",
          form(
            "tokens",
            select(
              "style",
              "Style",
              [
                ["flat", "Flat"],
                ["outline", "Outline"],
                ["soft", "Soft"],
              ],
              ch.themeTokens?.style,
            ) +
              select(
                "palette",
                "Palette",
                themes.map((t) => [t.id, t.name]),
                ch.themeTokens?.palette || ch.theme,
              ) +
              select(
                "typography",
                "Typography",
                [
                  ["sans-serif", "Sans Serif"],
                  ["serif", "Serif"],
                  ["monospace", "Monospace"],
                ],
                ch.fontFamily,
              ) +
              select(
                "layout",
                "Layout",
                [
                  ["standard", "標準"],
                  ["spacious", "余白を広く"],
                  ["compact", "コンパクト"],
                ],
                ch.themeTokens?.layout,
              ) +
              select(
                "elements",
                "Chart Elements",
                [
                  ["standard", "標準"],
                  ["scientific", "科学"],
                  ["minimal", "最小限"],
                ],
                ch.themeTokens?.elements,
              ) +
              input(
                "background",
                "Background",
                ch.background || "#ffffff",
                "color",
              ),
            "適用",
          ),
        )
      );
    case "typography":
      return (
        section(
          "数式ラベル",
          form(
            "latex",
            input("text", "LaTeX / 簡易数式", "\\int_0^1 x^2\\,dx") +
              `<div class="field-pair">${input("x", "X (%)", 45, "number")}${input("y", "Y (%)", 20, "number")}</div>`,
          ),
        ) + section("選択オブジェクト", objectProperties())
      );
    case "layers":
      return objectTools(true);
    case "axes":
      return section(
        "目盛り・背景・余白",
        form(
          "appearance",
          input(
            "pointSize",
            "点のサイズ",
            ch.pointSize || 4,
            "number",
            'min="0" max="30"',
          ) +
            select(
              "pointShape",
              "点の形",
              [
                ["circle", "円"],
                ["square", "四角"],
              ],
              ch.pointShape,
            ) +
            select(
              "lineStyle",
              "線種",
              [
                ["solid", "実線"],
                ["dashed", "破線"],
              ],
              ch.lineStyle,
            ) +
            `<label class="checkbox-row"><input type="checkbox" name="logX" ${ch.logX ? "checked" : ""}>X軸を対数スケールにする</label>` +
            input(
              "minorTicks",
              "補助目盛りの分割数",
              ch.minorTicks || 0,
              "number",
              'min="0" max="10"',
            ) +
            input("background", "背景", ch.background || "#ffffff", "color") +
            input("textColor", "文字色", ch.textColor || "#333333", "color") +
            ["Left", "Right", "Top", "Bottom"]
              .map((k) =>
                input(
                  "margin" + k,
                  "余白 " + k,
                  ch["margin" + k] ??
                    { Left: 80, Right: 38, Top: 100, Bottom: 64 }[k],
                  "number",
                  'min="0" max="300"',
                ),
              )
              .join(""),
          "適用",
        ),
      );
    case "analysis":
      return (
        section(
          "非線形回帰",
          form(
            "nonlinear",
            input("expression", "モデル", "a*exp(b*x)") +
              input(
                "initial",
                "初期値（名前=数値、カンマ区切り）",
                "a=1,b=0.01",
              ),
            "回帰を追加",
          ),
        ) +
        section(
          "実測値の処理",
          form(
            "smoothing",
            select(
              "operation",
              "操作",
              [
                ["smoothed", "移動平均"],
                ["difference", "隣接点差分の接線"],
                ["local", "局所線形近似の接線"],
                ["smoothed-tangent", "平滑化後の接線"],
                ["regression", "回帰関数の接線"],
              ],
              "smoothed",
            ) +
              input(
                "point",
                "接点の番号",
                (C.ui.selectedPoint || 0) + 1,
                "number",
                'min="1"',
              ) +
              input("window", "窓幅", 5, "number", 'min="3" max="99"'),
          ),
        ) +
        section("残差", button("residuals", "残差表・残差プロットを開く"))
      );
    case "history":
      return section(
        "保存済み履歴",
        `<p class="panel-note">プロジェクトに Undo / Redo の状態を保存します。</p>${button("history-clear", "履歴を消去")}`,
      );
    case "settings":
      return (
        section("パネル配置", panelSettings()) +
        section(
          "アニメーション",
          form(
            "animation",
            select(
              "enabled",
              "有効",
              [
                ["off", "なし"],
                ["on", "フェードイン"],
              ],
              ch.animation ? "on" : "off",
            ) +
              input(
                "duration",
                "再生時間 (秒)",
                ch.animationDuration || 1,
                "number",
                'min="0.1" max="30" step="0.1"',
              ),
            "適用",
          ) + button("play", "再生"),
        )
      );
    default:
      return "";
  }
}
function panelSettings() {
  return (
    [
      "tools",
      "properties",
      "data",
      ...(C.ui.extraPanels || []).map((p) => p.id),
    ]
      .map((k) =>
        select(
          "layout-" + k,
          { tools: "編集パネル", properties: "プロパティ", data: "データ" }[
            k
          ] || C.ui.extraPanels?.find((p) => p.id === k)?.title,
          [
            ["left", "左にドック"],
            ["right", "右にドック"],
            ["top", "上にドック"],
            ["bottom", "下にドック"],
            ["float", "フロート"],
            ["tab", "タブ化"],
            ["hidden", "非表示"],
            ["max", "最大化"],
          ],
          C.ui.layout?.[k] ||
            { tools: "left", properties: "right", data: "bottom" }[k] ||
            "float",
        ),
      )
      .join("") +
    form(
      "panel-add",
      select("tool", "追加するパネル", Object.entries(panelTitles), "math"),
      "独立パネルを追加",
    ) +
    button("layout-save", "配置を保存") +
    button("layout-restore", "配置を復元")
  );
}
function objectTools(layers = false) {
  const ch = chart();
  return section(
    layers ? "オブジェクト一覧" : "図形・ベクター",
    `<div class="advanced-buttons">${["rect", "ellipse", "line", "arrow", "polygon", "bezier", "text"].map((t) => button("new-object", { rect: "長方形", ellipse: "楕円", line: "線分", arrow: "矢印", polygon: "多角形", bezier: "ベジェ曲線", text: "テキスト" }[t], `data-kind="${t}"`)).join("")}</div>${(ch.objects || []).map((o, i) => `<div class="object-layer ${ids().includes(o.id) ? "selected" : ""}">${button("select-object", esc(o.name || o.type), `data-id="${o.id}"`)}${button("object-hide", o.hidden ? "表示" : "隠す", `data-id="${o.id}"`)}${button("object-lock", o.locked ? "解除" : "固定", `data-id="${o.id}"`)}</div>`).join("")}<div class="advanced-buttons">${["front", "back", "up", "down", "group", "ungroup", "delete", "duplicate"].map((a) => button("object-" + a, { front: "最前面", back: "最背面", up: "前へ", down: "後ろへ", group: "グループ化", ungroup: "解除", delete: "削除", duplicate: "複製" }[a])).join("")}</div>${select(
      "align",
      "整列",
      [
        ["", "選択"],
        ["left", "左"],
        ["center", "水平中央"],
        ["right", "右"],
        ["top", "上"],
        ["middle", "垂直中央"],
        ["bottom", "下"],
      ],
      "",
    )}<div class="advanced-buttons">${["union", "intersection", "difference", "xor"].map((op) => button("combine", { union: "結合", intersection: "交差", difference: "差分", xor: "排他" }[op], `data-operation="${op}"`)).join("")}${button("area", "面積を計算")}</div><label class="checkbox-row"><input type="checkbox" data-adv-snap ${C.ui.snap ? "checked" : ""}>スナップ・ガイド</label>${objectProperties()}`,
  );
}
function objectProperties() {
  const o = chart().objects?.find((o) => ids().includes(o.id));
  if (!o)
    return '<p class="panel-note">オブジェクトを選択してください。Shift で複数選択できます。</p>';
  return form(
    "object-props",
    input("name", "名前", o.name || o.type) +
      input("text", "文字・数式", o.text || "") +
      `<div class="field-pair">${["x", "y", "width", "height", "rotation", "opacity", "lineWidth", "fontSize", "letterSpacing", "lineHeight", "c1x", "c1y", "c2x", "c2y"].map((k) => input(k, k, o[k] ?? { width: 25, height: 15, opacity: 1, lineWidth: 2, fontSize: 20, lineHeight: 1.4, c1x: 25, c2x: 75, c2y: 100 }[k] ?? 0, "number", 'step="any"')).join("")}</div>` +
      input(
        "fill",
        "塗り",
        o.fill === "none" ? "#ffffff" : o.fill || "#dddddd",
        "color",
      ) +
      input("stroke", "線", o.stroke || "#555555", "color") +
      input("color", "文字色", o.color || "#333333", "color") +
      input("background", "文字の背景", o.background || "#ffffff", "color") +
      `<label class="checkbox-row"><input type="checkbox" name="textBackground" ${o.textBackground ? "checked" : ""}>文字の背景を表示</label><label class="checkbox-row"><input type="checkbox" name="bold" ${o.bold ? "checked" : ""}>太字</label><label class="checkbox-row"><input type="checkbox" name="italic" ${o.italic ? "checked" : ""}>斜体</label>` +
      select(
        "fontFamily",
        "フォント",
        [
          ["sans-serif", "Sans Serif"],
          ["serif", "Serif"],
          ["monospace", "Monospace"],
        ],
        o.fontFamily,
      ) +
      `<label class="checkbox-row"><input type="checkbox" name="closed" ${o.closed ? "checked" : ""}>閉じたパス</label>` +
      input("pathData", "SVG パス", o.pathData || "") +
      input(
        "points",
        "多角形の頂点 (x,y; …)",
        (
          o.points || [
            [0, 100],
            [50, 0],
            [100, 100],
          ]
        )
          .map((p) => p.join(","))
          .join(";"),
      ),
    "更新",
  );
}
export async function exportPDF(svg, width, height, name, colorOptions = {}) {
  const node = new DOMParser().parseFromString(
    svg,
    "image/svg+xml",
  ).documentElement;
  document.body.append(node);
  node.style.position = "fixed";
  node.style.left = "-100000px";
  try {
    const pdf = new jsPDF({
      orientation: width >= height ? "landscape" : "portrait",
      unit: "px",
      format: [width, height],
      hotfixes: ["px_scaling"],
    });
    let transform;
    if (colorOptions.icc) transform = await colorTransform(colorOptions.icc);
    try {
      if (transform || colorOptions.cmyk) applyPDFColor(pdf, transform);
      await pdf.svg(node, { x: 0, y: 0, width, height });
      pdf.save(name + ".pdf");
    } finally {
      transform?.close();
    }
  } finally {
    node.remove();
  }
}
export function initializeAdvanced(context) {
  C = context;
  C.ui.layout = project().workspace?.layout || {};
  C.ui.extraPanels = project().workspace?.extraPanels || [];
  C.ui.objectIds = [];
  C.ui.snap = true;
  document.addEventListener("click", onClick, true);
  document.addEventListener("submit", onSubmit, true);
  document.addEventListener("change", onChange, true);
  document.addEventListener("input", onInput, true);
  document.addEventListener("pointerdown", objectPointerDown, true);
  document.addEventListener("contextmenu", (e) => {
    if (!e.target.closest("#graph-artboard")) return;
    e.preventDefault();
    const o = e.target.closest("[data-object-id]");
    if (o) C.ui.objectIds = [o.dataset.objectId];
    const root = document.createElement("div");
    root.className = "object-context dropdown";
    root.style.cssText = `position:fixed;left:${Math.min(e.clientX, window.innerWidth - 220)}px;top:${Math.min(e.clientY, window.innerHeight - 240)}px;z-index:75`;
    root.innerHTML = [
      "duplicate",
      "front",
      "back",
      "group",
      "ungroup",
      "delete",
    ]
      .map((a) =>
        button(
          "object-" + a,
          {
            duplicate: "複製",
            front: "最前面へ",
            back: "最背面へ",
            group: "グループ化",
            ungroup: "グループ解除",
            delete: "削除",
          }[a],
        ),
      )
      .join("");
    $(".object-context")?.remove();
    document.body.append(root);
  });
  document.addEventListener(
    "dblclick",
    (e) => {
      const target = e.target.closest("[data-object-id]");
      if (target) {
        e.stopImmediatePropagation();
        C.ui.objectIds = [target.dataset.objectId];
        C.ui.tool = "typography";
        C.ui.mobilePanel = true;
        C.render();
      }
    },
    true,
  );
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input,select,textarea") || $(".modal")) return;
    if (C.ui.view === "studio" && ids().length) {
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        modifyObjects("delete");
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "g") {
        e.preventDefault();
        modifyObjects(e.shiftKey ? "ungroup" : "group");
      }
    }
  });
}
function onClick(e) {
  const el = e.target.closest("[data-adv]");
  if (!el) {
    if (!e.target.closest(".object-context")) $(".object-context")?.remove();
    return;
  }
  e.preventDefault();
  e.stopImmediatePropagation();
  $(".object-context")?.remove();
  const a = el.dataset.adv;
  try {
    if (a === "new-object") {
      addObject({
        type: el.dataset.kind,
        text: el.dataset.kind === "text" ? "テキスト" : "",
        points: [
          [0, 100],
          [50, 0],
          [100, 100],
        ],
      });
      return;
    }
    if (a === "select-object") {
      selectObject(el.dataset.id, e.shiftKey);
      return;
    }
    if (a.startsWith("object-")) {
      if (el.dataset.id) C.ui.objectIds = [el.dataset.id];
      modifyObjects(a.slice(7));
      return;
    }
    if (a === "combine") {
      const results = combineObjects(
        chart().objects || [],
        ids(),
        el.dataset.operation,
      );
      C.change("図形を演算", () => {
        chart().objects = chart()
          .objects.filter((o) => !ids().includes(o.id))
          .concat(results);
        C.ui.objectIds = results.map((o) => o.id);
      });
      return;
    }
    if (a === "area") {
      const chosen = chart().objects?.filter((o) => ids().includes(o.id)) || [],
        area = chosen.reduce((sum, o) => sum + vectorArea(o), 0);
      C.openModal(
        "幾何学的面積",
        `<p>${area.toPrecision(8)} %²（キャンバス座標）</p><p>楕円: πab、長方形: 幅×高さ、多角形: 靴紐公式、閉じたベジェ: 曲線積分。</p>`,
      );
      return;
    }
    if (a === "residuals") {
      showResiduals();
      return;
    }
    if (a === "close-extra-panel") {
      C.ui.layout[el.dataset.panel] = "hidden";
      C.render();
      return;
    }
    if (a === "layout-save") {
      C.change(
        "パネル配置を保存",
        () =>
          (project().workspace = {
            ...project().workspace,
            layout: structuredClone(C.ui.layout),
            extraPanels: structuredClone(C.ui.extraPanels || []),
          }),
      );
      return;
    }
    if (a === "layout-restore") {
      C.ui.layout = structuredClone(project().workspace?.layout || {});
      C.ui.extraPanels = structuredClone(
        project().workspace?.extraPanels || [],
      );
      C.render();
      return;
    }
    if (a === "play") {
      const svg = $("#graph-artboard svg");
      svg?.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: (chart().animationDuration || 1) * 1000,
      });
      return;
    }
    if (a === "history-clear") {
      C.ui.history = [];
      C.ui.future = [];
      C.ui.historyLabels = [];
      C.persist();
      C.render();
      return;
    }
    if (a === "theme-export") {
      C.download(
        JSON.stringify(
          {
            version: 1,
            theme: {
              id: crypto.randomUUID(),
              name: chart().customThemeName || "Custom Theme",
              theme: chart().theme,
              colors: chart().colors?.length
                ? chart().colors
                : themes.find((t) => t.id === chart().theme)?.colors,
              fontFamily: chart().fontFamily || "sans-serif",
              fontSize: chart().fontSize || 12,
              lineWidth: chart().lineWidth || 3,
              background: chart().background || "#ffffff",
              textColor: chart().textColor || "#333333",
              themeTokens: chart().themeTokens || {},
            },
          },
          null,
          2,
        ),
        "theme.plot-theme.json",
        "application/json",
      );
      return;
    }
    if (a === "theme-import") {
      C.openModal(
        "テーマを読み込む",
        '<input type="file" id="theme-file" accept=".json">',
      );
      $("#theme-file").onchange = async (ev) => {
        try {
          const file = ev.target.files[0];
          if (file.size > 100000) throw Error("テーマの上限は100KBです。");
          const imported = JSON.parse(await file.text());
          C.change("テーマを読み込み", () => {
            const id = crypto.randomUUID();
            project().customThemes.push({ ...imported.theme, id });
            C.validate(project());
          });
          C.closeModal();
        } catch (err) {
          C.notify(err.message);
        }
      };
      return;
    }
    if (["theme-favorites", "theme-recent", "themes-all"].includes(a)) {
      C.ui.themeSubset = a;
      C.render();
      return;
    }
    if (a === "favorite-theme") {
      C.change("テーマのお気に入りを変更", () => {
        project().favoriteThemes ??= [];
        const key = el.dataset.favorite,
          at = project().favoriteThemes.indexOf(key);
        if (at < 0) project().favoriteThemes.push(key);
        else project().favoriteThemes.splice(at, 1);
      });
      return;
    }
  } catch (err) {
    C.notify(err.message);
  }
}
function selectObject(id, extend) {
  const o = chart().objects?.find((o) => o.id === id);
  let set = extend ? [...ids()] : [];
  const group = o?.groupId
    ? chart()
        .objects.filter((x) => x.groupId === o.groupId)
        .map((x) => x.id)
    : [id];
  if (extend && set.includes(id)) set = set.filter((x) => !group.includes(x));
  else set = [...new Set([...set, ...group])];
  C.ui.objectIds = set;
  C.render();
}
function modifyObjects(action) {
  const selected = chart().objects?.filter((o) => ids().includes(o.id)) || [];
  if (!selected.length) return;
  C.change("オブジェクトを" + action, () => {
    const objects = chart().objects;
    if (action === "delete") {
      chart().objects = objects.filter((o) => !ids().includes(o.id));
      C.ui.objectIds = [];
    } else if (action === "duplicate") {
      const copies = selected.map((o) => ({
        ...structuredClone(o),
        id: crypto.randomUUID(),
        x: o.x + 2,
        y: o.y + 2,
      }));
      objects.push(...copies);
      C.ui.objectIds = copies.map((o) => o.id);
    } else if (action === "hide" || action === "lock") {
      selected.forEach(
        (o) =>
          (o[action === "hide" ? "hidden" : "locked"] =
            !o[action === "hide" ? "hidden" : "locked"]),
      );
    } else if (action === "group") {
      const group = crypto.randomUUID();
      selected.forEach((o) => (o.groupId = group));
    } else if (action === "ungroup") selected.forEach((o) => delete o.groupId);
    else {
      const rest = objects.filter((o) => !ids().includes(o.id));
      if (action === "front") chart().objects = rest.concat(selected);
      if (action === "back") chart().objects = selected.concat(rest);
      if (action === "up" || action === "down") {
        const dir = action === "up" ? 1 : -1;
        for (const o of action === "up" ? [...selected].reverse() : selected) {
          const i = objects.indexOf(o),
            j = Math.max(0, Math.min(objects.length - 1, i + dir));
          [objects[i], objects[j]] = [objects[j], objects[i]];
        }
      }
    }
  });
}
function onSubmit(e) {
  const f = e.target;
  if (!f.matches("[data-adv-form]")) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  const d = new FormData(f),
    kind = f.dataset.advForm;
  try {
    if (kind === "panel-add") {
      const tool = d.get("tool");
      if (!panelTitles[tool]) throw Error("パネルが不正です。");
      if ((C.ui.extraPanels || []).length >= 24)
        throw Error("独立パネルは24個までです。");
      const id = "pane-" + crypto.randomUUID();
      C.ui.extraPanels ??= [];
      C.ui.extraPanels.push({ id, tool, title: panelTitles[tool] });
      C.ui.layout[id] = "float";
      C.ui.layout[id + "Position"] = {
        x: 100 + C.ui.extraPanels.length * 20,
        y: 100,
        width: 290,
        height: 400,
      };
      C.render();
    }
    if (kind === "curve") {
      const type = d.get("type"),
        model = {
          type,
          expression: d.get("expression"),
          xExpression: d.get("xExpression"),
          yExpression: d.get("yExpression"),
          domainMin: num(d, "a"),
          domainMax: num(d, "b"),
        };
      if (model.domainMax <= model.domainMin) throw Error("定義域が不正です。");
      if (type === "contour") expression(model.expression)({ x: 1, y: 1 });
      else if (type === "parametric") {
        expression(model.xExpression)({ t: 1 });
        expression(model.yExpression)({ t: 1 });
      } else
        expression(model.expression, chart().parameters)({ x: 1, theta: 1 });
      C.change("関数グラフを設定", () => Object.assign(chart(), model));
    }
    if (kind === "composite") {
      const count = getChartData(chart(), project().sheets).series.length;
      C.change("複合グラフを設定", () =>
        Object.assign(chart(), {
          type: d.get("type"),
          seriesTypes: Array.from({ length: count }, (_, i) =>
            d.get("type" + i),
          ),
          secondarySeries: Array.from({ length: count }, (_, i) => i).filter(
            (i) => d.has("right" + i),
          ),
        }),
      );
    }
    if (kind === "mapping") {
      if (d.get("errorRange")) rangeCells(d.get("errorRange"));
      if (!/^[A-Z]+$/i.test(d.get("xColumn")))
        throw Error("X列は A、B 等の列名で入力してください。");
      const columns = d
        .get("seriesColumns")
        .split(",")
        .map((v) => v.trim().toUpperCase())
        .filter(Boolean);
      if (columns.some((c) => !/^[A-Z]+$/.test(c)))
        throw Error("系列の列が不正です。");
      C.change("データマッピング", () =>
        Object.assign(chart(), {
          xColumn: d.get("xColumn").toUpperCase(),
          seriesColumns: columns,
          errorRange: d.get("errorRange"),
        }),
      );
    }
    if (kind === "science") {
      const operation = d.get("operation"),
        source = d.get("expression"),
        a = num(d, "a"),
        b = num(d, "b");
      expression(source)({ x: a });
      if (operation === "analytic-integral") {
        const result = analyticIntegral(source, a, b);
        addMath({
          type: "integral",
          expression: source,
          a,
          b,
          method: "analytic",
          result: `${result.expression} · ${result.value}`,
        });
        C.openModal(
          "解析的積分",
          mathMarkup(
            `\\int_{${a}}^{${b}} ${source}\\,dx = ${Number(result.value.toPrecision(8))}`,
            true,
          ) + `<p>原始関数: ${esc(result.expression)}</p>`,
        );
      } else if (operation === "extrema" || operation === "intersection") {
        const results =
          operation === "extrema"
            ? extrema(source, a, b)
            : intersections(source, d.get("secondExpression"), a, b);
        addMath({
          type: operation,
          expression: source,
          secondExpression: d.get("secondExpression"),
          a,
          b,
        });
        C.openModal(
          operation === "extrema" ? "極値" : "交点",
          `<table class="result-table"><tr><th>X</th><th>Y</th></tr>${results.map((p) => `<tr><td>${p.x.toPrecision(8)}</td><td>${p.y.toPrecision(8)}</td></tr>`).join("")}</table>${!results.length ? "<p>指定範囲には見つかりませんでした。</p>" : ""}`,
        );
      } else {
        if (operation === "derivative-symbolic") symbolic(source);
        addMath({
          type: operation,
          expression: source,
          a,
          b,
          scaleX: num(d, "scaleX", 1),
          scaleY: num(d, "scaleY", 1),
          shiftX: num(d, "shiftX"),
          shiftY: num(d, "shiftY"),
        });
      }
    }
    if (kind === "parameter") {
      const name = d.get("name");
      if (
        !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name) ||
        ["x", "t", "theta", "constructor", "prototype", "__proto__"].includes(
          name,
        )
      )
        throw Error("変数名を変更してください。");
      const value = num(d, "value"),
        min = num(d, "min"),
        max = num(d, "max");
      if (min >= max || value < min || value > max)
        throw Error("値とスライダーの範囲を確認してください。");
      C.change("パラメーターを追加", () => {
        chart().parameters ??= {};
        chart().parameterLimits ??= {};
        chart().parameters[name] = value;
        chart().parameterLimits[name] = { min, max };
      });
    }
    if (kind === "two-points") {
      const a = num(d, "first") - 1,
        b = num(d, "second") - 1;
      if (!pts()[a] || !pts()[b]) throw Error("点の番号を確認してください。");
      addMath({
        type: d.get("operation"),
        pointIndex: a,
        secondPoint: b,
        series: C.ui.selectedSeries || 0,
      });
    }
    if (kind === "nonlinear") {
      const initial = {};
      for (const part of d.get("initial").split(",")) {
        const [k, v] = part.trim().split("=");
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(k) || !Number.isFinite(Number(v)))
          throw Error("初期値を確認してください。");
        initial[k] = Number(v);
      }
      nonlinearFit(pts(), d.get("expression"), initial);
      addMath({
        type: "nonlinear",
        expression: d.get("expression"),
        initial,
        series: C.ui.selectedSeries || 0,
      });
    }
    if (kind === "smoothing") {
      const operation = d.get("operation"),
        pointIndex = num(d, "point") - 1,
        window = num(d, "window");
      if (operation !== "smoothed")
        localTangent(
          pts(),
          pointIndex,
          operation === "smoothed-tangent" ? "smoothed" : operation,
          window,
        );
      addMath({
        type: operation === "smoothed" ? "smoothed" : "fitted-tangent",
        method: operation === "smoothed-tangent" ? "smoothed" : operation,
        window,
        pointIndex,
        series: C.ui.selectedSeries || 0,
      });
    }
    if (kind === "latex") {
      addObject({
        type: "latex",
        text: d.get("text"),
        x: num(d, "x"),
        y: num(d, "y"),
        width: 30,
        height: 12,
        fill: "none",
        stroke: "#333333",
      });
    }
    if (kind === "object-props") {
      C.change("オブジェクトの属性を変更", () => {
        for (const o of chart().objects.filter((o) => ids().includes(o.id))) {
          for (const k of [
            "name",
            "text",
            "fill",
            "stroke",
            "color",
            "fontFamily",
          ])
            o[k] = d.get(k);
          for (const k of [
            "x",
            "y",
            "width",
            "height",
            "rotation",
            "opacity",
            "lineWidth",
            "fontSize",
            "letterSpacing",
            "lineHeight",
            "c1x",
            "c1y",
            "c2x",
            "c2y",
          ])
            o[k] = num(d, k);
          o.bold = d.has("bold");
          o.italic = d.has("italic");
          o.textBackground = d.has("textBackground");
          o.background = d.get("background");
          o.closed = d.has("closed");
          if (o.type === "path") o.pathData = d.get("pathData");
          o.points = d
            .get("points")
            .split(";")
            .map((p) => p.split(",").map(Number));
        }
      });
    }
    if (kind === "appearance") {
      C.change("外観の詳細設定", () => {
        chart().logX = d.has("logX");
        for (const k of [
          "pointSize",
          "minorTicks",
          "marginLeft",
          "marginRight",
          "marginTop",
          "marginBottom",
        ])
          chart()[k] = num(d, k);
        for (const k of ["pointShape", "lineStyle", "background", "textColor"])
          chart()[k] = d.get(k);
      });
    }
    if (kind === "tokens") {
      const palette = themes.find((t) => t.id === d.get("palette")),
        layout = d.get("layout");
      C.change("デザイントークンを適用", () =>
        Object.assign(chart(), {
          themeTokens: Object.fromEntries(d),
          theme: palette.id,
          colors: [...palette.colors],
          background: d.get("background"),
          fontFamily: d.get("typography"),
          lineWidth: d.get("style") === "outline" ? 3 : 2,
          pointShape: d.get("style") === "outline" ? "square" : "circle",
          showGrid: d.get("elements") !== "minimal",
          marginLeft:
            layout === "spacious" ? 110 : layout === "compact" ? 60 : 80,
          marginTop: layout === "spacious" ? 125 : 85,
        }),
      );
    }
    if (kind === "animation") {
      C.change("アニメーションを設定", () => {
        chart().animation = d.get("enabled") === "on";
        chart().animationDuration = num(d, "duration", 1);
      });
    }
  } catch (err) {
    C.notify(err.message);
  }
}
function onChange(e) {
  const el = e.target;
  try {
    if (el.name?.startsWith("layout-")) {
      C.ui.layout ??= {};
      const key = el.name.slice(7);
      C.ui.layout[key] = el.value;
      if (key === "data" && el.value !== "hidden") {
        C.ui.showData = true;
        C.ui.dataExplicit = true;
      }
      if (key === "properties" && el.value !== "hidden") C.ui.inspector = true;
      if (el.value === "tab") C.ui.panelTab = key;
      C.render();
    }
    if (el.name === "align" && el.value) {
      C.change("オブジェクトを整列", () =>
        alignObjects(chart().objects || [], ids(), el.value),
      );
    }
    if (el.matches("[data-adv-snap]")) C.ui.snap = el.checked;
    if (el.name === "themeUsage") {
      C.ui.themeUsage = el.value;
      C.render();
    }
  } catch (err) {
    C.notify(err.message);
  }
}
function onInput(e) {
  if (e.target.dataset.parameter) {
    const name = e.target.dataset.parameter,
      value = Number(e.target.value);
    C.change("パラメーターを変更", () => (chart().parameters[name] = value));
  }
}
function showResiduals() {
  const points = pts(),
    model = [...(chart().math || [])]
      .reverse()
      .find((m) => ["regression", "nonlinear"].includes(m.type));
  if (!model) throw Error("先に回帰曲線を追加してください。");
  const fit =
      model.type === "nonlinear"
        ? nonlinearFit(points, model.expression, model.initial)
        : regression(points, model.method, model.degree),
    residuals = points.map((p) => ({ x: p.x, y: p.y - fit.predict(p.x) })),
    max = Math.max(1e-9, ...residuals.map((p) => Math.abs(p.y))),
    xmin = Math.min(...points.map((p) => p.x)),
    xmax = Math.max(...points.map((p) => p.x));
  C.openModal(
    "残差",
    `<p>${esc(fit.equation)} · R² = ${fit.r2.toFixed(8)}</p><svg viewBox="0 0 480 220" width="100%" role="img" aria-label="残差プロット"><path d="M35 110H460" stroke="#999"/>${residuals.map((p) => `<circle cx="${35 + ((p.x - xmin) / (xmax - xmin || 1)) * 420}" cy="${110 - (p.y / max) * 90}" r="3" fill="#999"><title>${p.x}: ${p.y}</title></circle>`).join("")}</svg><table class="result-table"><tr><th>X</th><th>測定値</th><th>予測値</th><th>残差</th></tr>${points.map((p, i) => `<tr><td>${p.x}</td><td>${p.y}</td><td>${fit.predict(p.x).toPrecision(7)}</td><td>${residuals[i].y.toPrecision(7)}</td></tr>`).join("")}</table>`,
    true,
  );
}
function objectPointerDown(e) {
  const annotation = e.target.closest("#graph-artboard [data-annotation-id]");
  if (annotation && e.button === 0) {
    e.preventDefault();
    e.stopImmediatePropagation();
    const model = chart().annotations.find(
        (a) => a.id === annotation.dataset.annotationId,
      ),
      svg = annotation.closest("svg"),
      start = svg.createSVGPoint();
    start.x = e.clientX;
    start.y = e.clientY;
    const at = start.matrixTransform(svg.getScreenCTM().inverse());
    let dx = 0,
      dy = 0;
    const move = (ev) => {
      const p = svg.createSVGPoint();
      p.x = ev.clientX;
      p.y = ev.clientY;
      const next = p.matrixTransform(svg.getScreenCTM().inverse());
      dx = next.x - at.x;
      dy = next.y - at.y;
      annotation.style.transform = `translate(${dx}px,${dy}px)`;
    };
    const up = () => {
      document.removeEventListener("pointermove", move);
      if (Math.abs(dx) + Math.abs(dy) > 1)
        C.change("注釈を移動", () => {
          const pct = model.coordinateMode === "percent";
          model.x += pct ? (dx / svg.viewBox.baseVal.width) * 100 : dx;
          model.y += pct ? (dy / svg.viewBox.baseVal.height) * 100 : dy;
        });
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up, { once: true });
    return;
  }

  const el = e.target.closest("#graph-artboard [data-object-id]");
  if (!el || e.button !== 0) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  const id = el.dataset.objectId,
    o = chart().objects?.find((o) => o.id === id);
  if (!o || o.locked) return;
  if (!ids().includes(id) || e.shiftKey) {
    const group = o.groupId
      ? chart()
          .objects.filter((x) => x.groupId === o.groupId)
          .map((x) => x.id)
      : [id];
    C.ui.objectIds = e.shiftKey ? [...new Set([...ids(), ...group])] : group;
  }
  const start = { x: e.clientX, y: e.clientY },
    bounds = $("#graph-artboard").getBoundingClientRect(),
    selected = chart()
      .objects.filter((o) => ids().includes(o.id) && !o.locked)
      .map((o) => ({ id: o.id, x: o.x, y: o.y }));
  let dx = 0,
    dy = 0;
  const move = (ev) => {
    dx = ((ev.clientX - start.x) / bounds.width) * 100;
    dy = ((ev.clientY - start.y) / bounds.height) * 100;
    for (const p of selected) {
      const node = $(`[data-object-id="${p.id}"]`);
      if (node)
        node.style.transform = `translate(${(dx * bounds.width) / 100}px,${(dy * bounds.height) / 100}px)`;
    }
    if (C.ui.snap) {
      $("#graph-artboard").classList.add("snap-guides");
    }
  };
  const end = () => {
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", end);
    if (Math.abs(dx) + Math.abs(dy) > 0.1)
      C.change("オブジェクトを移動", () => {
        for (const p of selected) {
          const o = chart().objects.find((o) => o.id === p.id);
          o.x = C.ui.snap ? Math.round((p.x + dx) / 1) * 1 : p.x + dx;
          o.y = C.ui.snap ? Math.round((p.y + dy) / 1) * 1 : p.y + dy;
        }
      });
    else C.render();
  };
  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", end, { once: true });
}
export function afterAdvancedRender() {
  panelObservers.forEach((o) => o.disconnect());
  panelObservers = [];
  if (!C) return;
  document.body.classList.toggle("studio-active", C.ui.view === "studio");
  if (C.ui.view !== "studio") return;
  for (const id of ids())
    $(`#graph-artboard [data-object-id="${id}"]`)?.classList.add(
      "object-selected",
    );
  const allThemes = $$(".theme-library>.theme-card");
  for (const card of allThemes) {
    const t = themes.find((t) => t.id === card.dataset.theme);
    if (
      C.ui.themeSubset === "theme-favorites" &&
      !project().favoriteThemes?.includes(t?.id)
    )
      card.hidden = true;
    if (
      C.ui.themeSubset === "theme-recent" &&
      !project().recentThemes?.includes(t?.id)
    )
      card.hidden = true;
    if (
      C.ui.themeUsage &&
      C.ui.themeUsage !== "all" &&
      (t?.usage || "一般") !== C.ui.themeUsage
    )
      card.hidden = true;
    const fav = document.createElement("button");
    fav.type = "button";
    fav.dataset.adv = "favorite-theme";
    fav.dataset.favorite = t?.id;
    fav.className = "theme-favorite";
    fav.setAttribute("aria-label", `${t?.name} をお気に入りに追加`);
    fav.textContent = project().favoriteThemes?.includes(t?.id) ? "★" : "☆";
    const tile = document.createElement("div");
    tile.className = "theme-tile";
    card.parentElement.insertBefore(tile, card);
    tile.append(card, fav);
  }
  const work = $(".studio-workspace"),
    center = $(".studio-center");
  if (!work || !center) return;
  center.style.order = "2";
  const panels = {
    tools: $(".studio-panel"),
    properties: $(".studio-inspector"),
    data: $(".studio-data"),
  };
  if (C.ui.pro)
    for (const p of C.ui.extraPanels || []) {
      const node = document.createElement("aside");
      node.className = "auxiliary-panel";
      node.innerHTML = `<div class="panel-heading"><h2>${esc(p.title)}</h2>${button("close-extra-panel", "×", `data-panel="${p.id}" aria-label="パネルを隠す"`)}</div><div class="studio-panel-content">${C.renderTool(p.tool)}</div>`;
      work.append(node);
      panels[p.id] = node;
    }
  let tabButtons = "";
  for (const [k, node] of Object.entries(panels)) {
    if (!node) continue;
    const mode =
      C.ui.layout?.[k] ||
      { tools: "left", properties: "right", data: "bottom" }[k] ||
      "float";
    node.dataset.panelKey = k;
    node.classList.add("managed-panel");
    let title = node.querySelector(".panel-heading,.data-panel-top");
    if (title) {
      title.draggable = true;
      title.ondragstart = (ev) => {
        ev.dataTransfer.setData("text/plot-panel", k);
      };
      title.ondblclick = () => {
        C.ui.layout[k] =
          mode === "max"
            ? { tools: "left", properties: "right", data: "bottom" }[k] ||
              "float"
            : "max";
        C.render();
      };
    }
    if (mode === "hidden") {
      node.style.display = "none";
      continue;
    }
    if (mode === "float") {
      node.classList.add("managed-float");
      const p = C.ui.layout?.[k + "Position"];
      node.style.cssText += `;left:${p?.x ?? (k === "tools" ? 80 : k === "properties" ? 400 : 270)}px;top:${p?.y ?? 120}px;width:${p?.width ?? 300}px;height:${p?.height ?? 360}px;resize:both;overflow:auto`;
      if (title) {
        title.draggable = false;
        title.onpointerdown = (ev) => {
          if (ev.target.closest("button,input,select")) return;
          ev.stopPropagation();
          const b = node.getBoundingClientRect(),
            start = { x: ev.clientX, y: ev.clientY };
          const move = (v) => {
            node.style.left = Math.max(0, b.left + v.clientX - start.x) + "px";
            node.style.top = Math.max(40, b.top + v.clientY - start.y) + "px";
          };
          const up = () => {
            document.removeEventListener("pointermove", move);
            C.ui.layout[k + "Position"] = {
              x: parseInt(node.style.left),
              y: parseInt(node.style.top),
              width: node.offsetWidth,
              height: node.offsetHeight,
            };
          };
          document.addEventListener("pointermove", move);
          document.addEventListener("pointerup", up, { once: true });
        };
      }
      continue;
    }
    if (mode === "max") {
      node.classList.add("managed-max");
      continue;
    }
    if (mode === "top" || mode === "bottom") {
      node.classList.add("dock-horizontal");
      if (mode === "top") center.prepend(node);
      else center.append(node);
      node.style.height = (C.ui.layout?.[k + "Position"]?.height || 180) + "px";
      node.style.width = "100%";
      continue;
    }
    if (mode === "tab") {
      node.classList.add("dock-tab");
      work.append(node);
      node.style.width = "260px";
      const active = C.ui.panelTab || "tools";
      node.style.display = active === k ? "flex" : "none";
      tabButtons += button(
        "panel-tab",
        { tools: "編集", properties: "属性", data: "データ" }[k] ||
          C.ui.extraPanels?.find((p) => p.id === k)?.title,
        `data-panel="${k}"`,
      );
      continue;
    }
    if (mode === "right") {
      work.append(node);
      node.style.order = "5";
    }
    if (mode === "left") {
      work.insertBefore(node, center);
      node.style.order = "1";
    }
    if (k === "data" && ["left", "right"].includes(mode)) {
      node.style.width = "300px";
      node.style.height = "auto";
    }
  }
  for (const [k, node] of Object.entries(panels)) {
    if (!node || !["float", "top", "bottom"].includes(C.ui.layout?.[k]))
      continue;
    const observer = new ResizeObserver(() => {
      if (!node.isConnected) return;
      C.ui.layout[k + "Position"] = {
        x: Math.max(0, parseInt(node.style.left) || 80),
        y: Math.max(0, parseInt(node.style.top) || 120),
        width: node.offsetWidth,
        height: node.offsetHeight,
      };
      C.fitCanvas?.();
    });
    observer.observe(node);
    panelObservers.push(observer);
  }
  for (const [k, node] of Object.entries(panels)) {
    const mode = C.ui.layout?.[k];
    if (!node || !mode?.startsWith("split:")) continue;
    const [, target, side] = mode.split(":"),
      other = panels[target];
    if (!other || other === node || node.contains(other)) continue;
    const wrapper = document.createElement("div");
    wrapper.className =
      "panel-split " +
      (["top", "bottom"].includes(side) ? "vertical" : "horizontal");
    other.parentElement.insertBefore(wrapper, other);
    const first = ["left", "top"].includes(side) ? node : other,
      second = first === node ? other : node;
    wrapper.style.order = "1";
    wrapper.append(first, second);
  }
  if (tabButtons) {
    const tabs = document.createElement("div");
    tabs.className = "panel-tabs";
    tabs.innerHTML = tabButtons;
    work.append(tabs);
    tabs.onclick = (e) => {
      const b = e.target.closest("button");
      if (b) {
        C.ui.panelTab = b.dataset.panel;
        C.render();
      }
    };
  }
  work.ondragover = (e) => {
    if (e.dataTransfer.types.includes("text/plot-panel")) e.preventDefault();
  };
  work.ondrop = (e) => {
    const key = e.dataTransfer.getData("text/plot-panel");
    const previousLayout = structuredClone(C.ui.layout);
    if (!key) return;
    e.preventDefault();
    const b = work.getBoundingClientRect(),
      rx = (e.clientX - b.left) / b.width,
      ry = (e.clientY - b.top) / b.height;
    const target = e.target.closest(".managed-panel");
    if (
      target &&
      target.dataset.panelKey !== key &&
      !C.ui.layout?.[target.dataset.panelKey]?.includes(":" + key + ":")
    ) {
      const box = target.getBoundingClientRect(),
        x = (e.clientX - box.left) / box.width,
        y = (e.clientY - box.top) / box.height,
        edge = Math.min(x, 1 - x, y, 1 - y),
        side =
          edge === x
            ? "left"
            : edge === 1 - x
              ? "right"
              : edge === y
                ? "top"
                : "bottom";
      if (C.ui.layout[target.dataset.panelKey] === "float")
        C.ui.layout[target.dataset.panelKey] = "right";
      C.ui.layout[key] = "split:" + target.dataset.panelKey + ":" + side;
    } else
      C.ui.layout[key] =
        rx < 0.23
          ? "left"
          : rx > 0.77
            ? "right"
            : ry < 0.25
              ? "top"
              : ry > 0.75
                ? "bottom"
                : "tab";
    try {
      C.validate({
        ...project(),
        workspace: {
          ...project().workspace,
          layout: C.ui.layout,
          extraPanels: C.ui.extraPanels || [],
        },
      });
    } catch (error) {
      C.ui.layout = previousLayout;
      C.notify(error.message);
      return;
    }
    C.render();
  };
}
