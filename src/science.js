import {
  parse,
  derivative as symbolicDerivative,
  inv,
  multiply,
  lusolve,
} from "mathjs";
import nerdamer from "nerdamer/all.js";
import katex from "katex";
import { regression, integrate } from "./engine.js";
export function expression(source, scope = {}) {
  const node = parse(String(source));
  node.traverse((n) => {
    if (
      [
        "AssignmentNode",
        "FunctionAssignmentNode",
        "BlockNode",
        "AccessorNode",
        "ObjectNode",
        "IndexNode",
      ].includes(n.type)
    )
      throw new Error("代入・プロパティアクセスは使えません。");
    if (
      n.isFunctionNode &&
      ![
        "sin",
        "cos",
        "tan",
        "asin",
        "acos",
        "atan",
        "sqrt",
        "abs",
        "log",
        "log10",
        "exp",
        "floor",
        "ceil",
        "round",
        "min",
        "max",
        "pow",
        "sign",
        "sinh",
        "cosh",
        "tanh",
      ].includes(n.fn.name)
    )
      throw new Error("未対応の数学関数です。");
  });
  const compiled = node.compile();
  return (vars) => {
    const v = compiled.evaluate({ ...scope, ...vars });
    if (typeof v !== "number" || !Number.isFinite(v))
      throw new Error("定義域の外です。");
    return v;
  };
}
export function symbolic(source) {
  const d = symbolicDerivative(source, "x").toString();
  let integral = null;
  try {
    integral = nerdamer.integrate(source, "x").toString();
    if (/integrate/.test(integral)) integral = null;
  } catch {}
  return { derivative: d, integral };
}
export function analyticIntegral(source, a, b) {
  const F = symbolic(source).integral;
  if (!F)
    throw new Error(
      "この関数の原始関数は求められません。数値積分を選択してください。",
    );
  const fn = expression(F);
  return {
    expression: F,
    value: fn({ x: b }) - fn({ x: a }),
    method: "解析的積分",
  };
}
export function roots(source, a, b, scope = {}) {
  if (!(b > a)) throw new Error("上限は下限より大きくしてください。");
  const f = expression(source, scope),
    found = [];
  let prev = null;
  for (let i = 0; i <= 800; i++) {
    const x = a + ((b - a) * i) / 800;
    let y;
    try {
      y = f({ x });
    } catch {
      prev = null;
      continue;
    }
    if (Math.abs(y) < 1e-8) found.push(x);
    if (prev && y * prev.y < 0) {
      let lo = prev.x,
        hi = x,
        fl = prev.y;
      for (let k = 0; k < 60; k++) {
        let mid = (lo + hi) / 2,
          fm = f({ x: mid });
        if (fl * fm <= 0) hi = mid;
        else {
          lo = mid;
          fl = fm;
        }
      }
      const root = (lo + hi) / 2;
      if (Math.abs(f({ x: root })) < 1e-5) found.push(root);
    }
    prev = { x, y };
  }
  return found
    .sort((x, y) => x - y)
    .filter((x, i, a) => i === 0 || Math.abs(x - a[i - 1]) > 1e-5);
}
export function extrema(source, a, b) {
  const d = symbolic(source).derivative,
    f = expression(source);
  return roots(d, a, b).map((x) => ({ x, y: f({ x }) }));
}
export function intersections(f, g, a, b) {
  const fn = expression(f);
  return roots(`(${f})-(${g})`, a, b).map((x) => ({ x, y: fn({ x }) }));
}
export function movingAverage(points, window = 3) {
  window = Math.max(1, Math.min(99, Math.round(window)));
  const half = Math.floor(window / 2);
  return points.map((p, i) => ({
    ...p,
    y:
      points
        .slice(Math.max(0, i - half), Math.min(points.length, i + half + 1))
        .reduce((a, v) => a + v.y, 0) /
      (Math.min(points.length, i + half + 1) - Math.max(0, i - half)),
  }));
}
export function localTangent(points, index, method = "difference", window = 5) {
  let source = method === "smoothed" ? movingAverage(points, window) : points,
    p = source[index];
  if (!p) throw Error("接点がありません。");
  let slope;
  if (method === "regression") {
    const fit = regression(points, "polynomial", 2);
    const h = 1e-4;
    slope = (fit.predict(p.x + h) - fit.predict(p.x - h)) / (2 * h);
    p = { ...p, y: fit.predict(p.x) };
  } else if (method === "local") {
    const fit = regression(
      points.slice(
        Math.max(0, index - Math.floor(window / 2)),
        index + Math.ceil(window / 2),
      ),
      "linear",
    );
    slope = fit.coefficients[1];
  } else {
    const a = source[Math.max(0, index - 1)],
      b = source[Math.min(source.length - 1, index + 1)];
    if (a.x === b.x) throw Error("同じX値では接線を求められません。");
    slope = (b.y - a.y) / (b.x - a.x);
  }
  return { ...p, slope, predict: (x) => p.y + slope * (x - p.x), method };
}
export function nonlinearFit(points, source, initial) {
  const names = Object.keys(initial);
  if (!names.length || names.length > 8 || points.length <= names.length)
    throw Error("パラメーター数より多い測定点が必要です。");
  const f = expression(source),
    params = { ...initial };
  let lambda = 0.01;
  const predict = (p, x) => f({ ...p, x });
  const loss = (p) =>
    points.reduce((s, q) => s + (q.y - predict(p, q.x)) ** 2, 0);
  let cost = loss(params);
  for (let iteration = 0; iteration < 150; iteration++) {
    const J = points.map((q) =>
      names.map((k) => {
        const h = 1e-5 * Math.max(1, Math.abs(params[k]));
        return (
          (predict({ ...params, [k]: params[k] + h }, q.x) -
            predict({ ...params, [k]: params[k] - h }, q.x)) /
          (2 * h)
        );
      }),
    );
    const A = names.map((_, j) =>
      names.map(
        (_, k) =>
          J.reduce((s, row) => s + row[j] * row[k], 0) + (j === k ? lambda : 0),
      ),
    );
    const B = names.map((_, j) => [
      points.reduce((s, q, i) => s + J[i][j] * (q.y - predict(params, q.x)), 0),
    ]);
    let delta;
    try {
      delta = lusolve(A, B).map((r) => r[0]);
    } catch {
      lambda *= 10;
      continue;
    }
    const trial = Object.fromEntries(
      names.map((k, i) => [k, params[k] + delta[i]]),
    );
    let next;
    try {
      next = loss(trial);
    } catch {
      lambda *= 10;
      continue;
    }
    if (next < cost) {
      Object.assign(params, trial);
      if (Math.abs(cost - next) < 1e-12) {
        cost = next;
        break;
      }
      cost = next;
      lambda /= 3;
    } else lambda *= 10;
    if (lambda > 1e15) break;
  }
  const avg = points.reduce((s, p) => s + p.y, 0) / points.length,
    total = points.reduce((s, p) => s + (p.y - avg) ** 2, 0);
  return {
    params,
    r2: total ? 1 - cost / total : cost < 1e-10 ? 1 : 0,
    residuals: points.map((p) => ({
      x: p.x,
      residual: p.y - predict(params, p.x),
    })),
    predict: (x) => predict(params, x),
    equation:
      source +
      "; " +
      names.map((k) => `${k}=${Number(params[k].toPrecision(8))}`).join(", "),
    method: "Levenberg–Marquardt",
  };
}
export function polygonArea(points) {
  return (
    Math.abs(
      points.reduce((s, p, i) => {
        const q = points[(i + 1) % points.length];
        return s + p.x * q.y - q.x * p.y;
      }, 0),
    ) / 2
  );
}
export function mathMarkup(source, display = false) {
  const input = String(source)
    .replace(/\bDelta\b/g, "\\Delta")
    .replace(/\balpha\b/g, "\\alpha")
    .replace(/\bbeta\b/g, "\\beta")
    .replace(/\btheta\b/g, "\\theta");
  return katex.renderToString(input, {
    throwOnError: false,
    displayMode: display,
    trust: false,
    strict: "ignore",
    output: "htmlAndMathml",
  });
}
export function sampleCurve(chart) {
  const count = 400,
    a = Number(chart.domainMin ?? 0),
    b = Number(chart.domainMax ?? Math.PI * 2),
    params = chart.parameters || {};
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a)
    throw Error("定義域の上限は下限より大きくしてください。");
  const f = expression(chart.expression || "x^2", params),
    fx =
      chart.type === "parametric"
        ? expression(chart.xExpression || "cos(t)", params)
        : null,
    fy =
      chart.type === "parametric"
        ? expression(chart.yExpression || "sin(t)", params)
        : null;
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = a + ((b - a) * i) / count;
    try {
      if (chart.type === "polar") {
        const r = f({ x: t, t, theta: t });
        return { x: r * Math.cos(t), y: r * Math.sin(t) };
      }
      if (fx) return { x: fx({ t, x: t }), y: fy({ t, x: t }) };
      return { x: t, y: f({ x: t }) };
    } catch {
      return { x: t, y: NaN };
    }
  });
}
