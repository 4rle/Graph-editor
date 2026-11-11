import * as FormulaJS from "@formulajs/formulajs";
import { det, inv, multiply, transpose } from "mathjs";
/** Dependency-free spreadsheet and numerical engine. No dynamic code execution. */
export function colName(index) {
  let n = index + 1,
    result = "";
  if (!Number.isInteger(index) || index < 0) throw new Error("Invalid column");
  while (n > 0) {
    n--;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}
export function colIndex(name) {
  if (!/^[A-Z]+$/i.test(name)) throw new Error("Invalid column");
  return (
    [...name.toUpperCase()].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) -
    1
  );
}
export const cellRef = (row, col) => `${colName(col)}${row + 1}`;
export function parseRef(text) {
  const m = /^\$?([A-Z]+)\$?([1-9]\d*)$/i.exec(text);
  if (!m) throw new Error("#REF!");
  return { row: Number(m[2]) - 1, col: colIndex(m[1]) };
}
export function parseRange(text) {
  const [a, b = a] = text.replace(/\$/g, "").split(":");
  const first = parseRef(a),
    last = parseRef(b);
  return {
    start: {
      row: Math.min(first.row, last.row),
      col: Math.min(first.col, last.col),
    },
    end: {
      row: Math.max(first.row, last.row),
      col: Math.max(first.col, last.col),
    },
  };
}
export function rangeCells(text) {
  const { start, end } = parseRange(text),
    result = [];
  if ((end.row - start.row + 1) * (end.col - start.col + 1) > 100000)
    throw new Error("#REF!");
  for (let r = start.row; r <= end.row; r++)
    for (let c = start.col; c <= end.col; c++) result.push(cellRef(r, c));
  return result;
}
export function shiftFormula(formula, rowDelta, colDelta) {
  if (!formula.startsWith("=")) return formula;
  // Keep references inside string literals untouched.
  return formula
    .split(/("(?:[^"]|"")*"|'(?:[^']|'')*')/g)
    .map((part, i) =>
      i % 2
        ? part
        : part.replace(
            /(?<![\w])(?:(\$?)([A-Z]+)(\$?)([1-9]\d*))(?![\w(!])/gi,
            (whole, ac, col, ar, row) => {
              const c = colIndex(col) + (ac ? 0 : colDelta),
                r = Number(row) - 1 + (ar ? 0 : rowDelta);
              return c < 0 || r < 0
                ? "#REF!"
                : `${ac}${colName(c)}${ar}${r + 1}`;
            },
          ),
    )
    .join("");
}

function tokenize(source) {
  const input = source
    .replace(/^=/, "")
    .replace(/π/g, "PI")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-");
  const tokens = [];
  let i = 0;
  while (i < input.length) {
    const rest = input.slice(i);
    let match;
    if (/^\s/.test(rest)) {
      i++;
      continue;
    }
    if (
      (match = /^#(?:REF!|DIV\/0!|VALUE!|NAME\?|NUM!|CYCLE!|N\/A)/i.exec(rest))
    ) {
      tokens.push({ type: "error", value: match[0].toUpperCase() });
      i += match[0].length;
      continue;
    }
    if ((match = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest))) {
      tokens.push({ type: "number", value: Number(match[0]) });
      i += match[0].length;
      continue;
    }
    if ((match = /^"((?:[^"]|"")*)"/.exec(rest))) {
      tokens.push({ type: "string", value: match[1].replace(/""/g, '"') });
      i += match[0].length;
      continue;
    }
    if ((match = /^'((?:[^']|'')*)'/.exec(rest))) {
      tokens.push({ type: "quoted", value: match[1].replace(/''/g, "'") });
      i += match[0].length;
      continue;
    }
    if (
      (match =
        /^(?:\$?[A-Za-z_][A-Za-z0-9_.$]*|[\u0080-\uffff][\w\u0080-\uffff]*)/.exec(
          rest,
        ))
    ) {
      tokens.push({ type: "name", value: match[0] });
      i += match[0].length;
      continue;
    }
    if ((match = /^(<=|>=|<>|!=|==|[+\-*/^(),;:!<>=&%])/.exec(rest))) {
      tokens.push({ type: match[0] === ";" ? "," : match[0], value: match[0] });
      i += match[0].length;
      continue;
    }
    throw new Error("#VALUE!");
  }
  tokens.push({ type: "end" });
  return tokens;
}
function parse(source, mathMode = false) {
  const tokens = tokenize(source);
  let i = 0;
  const peek = () => tokens[i],
    take = () => tokens[i++];
  const expect = (t) => {
    if (take().type !== t) throw new Error("#VALUE!");
  };
  function primary() {
    const token = take();
    let node;
    if (token.type === "number" || token.type === "string")
      node = { kind: "literal", value: token.value };
    else if (token.type === "error")
      node = { kind: "error", value: token.value };
    else if (token.type === "(") {
      node = comparison();
      expect(")");
    } else if (token.type === "name" || token.type === "quoted") {
      if (peek().type === "!") {
        take();
        const ref = take();
        if (ref.type !== "name") throw new Error("#REF!");
        node = { kind: "ref", value: ref.value, sheet: token.value };
      } else if (peek().type === "(") {
        take();
        const args = [];
        if (peek().type !== ")") {
          do {
            if (peek().type === ",") take();
            args.push(comparison());
          } while (peek().type === ",");
        }
        expect(")");
        node = { kind: "call", name: token.value.toUpperCase(), args };
      } else if (/^\$?[A-Z]+\$?[1-9]\d*$/i.test(token.value))
        node = { kind: "ref", value: token.value };
      else node = { kind: "variable", name: token.value.toUpperCase() };
    } else throw new Error("#VALUE!");
    if (peek().type === ":") {
      take();
      const end = take();
      if (node.kind !== "ref" || end.type !== "name") throw new Error("#REF!");
      node = {
        kind: "range",
        start: node.value,
        end: end.value,
        sheet: node.sheet,
      };
    }
    while (peek().type === "%") {
      take();
      node = {
        kind: "binary",
        op: "/",
        left: node,
        right: { kind: "literal", value: 100 },
      };
    }
    return node;
  }
  function power() {
    let left = primary();
    if (peek().type === "^") {
      take();
      left = { kind: "binary", op: "^", left, right: unary() };
    }
    return left;
  }
  function unary() {
    if (peek().type === "+" || peek().type === "-") {
      const op = take().type;
      return { kind: "unary", op, child: unary() };
    }
    return power();
  }
  function multiply() {
    let left = unary();
    while (
      ["*", "/"].includes(peek().type) ||
      (mathMode && ["name", "(", "number"].includes(peek().type))
    ) {
      const op = ["*", "/"].includes(peek().type) ? take().type : "*";
      left = { kind: "binary", op, left, right: unary() };
    }
    return left;
  }
  function add() {
    let left = multiply();
    while (["+", "-", "&"].includes(peek().type)) {
      const op = take().type;
      left = { kind: "binary", op, left, right: multiply() };
    }
    return left;
  }
  function comparison() {
    let left = add();
    while (
      ["=", "==", "<>", "!=", "<", ">", "<=", ">="].includes(peek().type)
    ) {
      const op = take().type;
      left = { kind: "binary", op, left, right: add() };
    }
    return left;
  }
  const ast = comparison();
  if (peek().type !== "end") throw new Error("#VALUE!");
  return ast;
}
const flatten = (values) => values.flat(Infinity);
const num = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error("#VALUE!");
  return n;
};
const numbers = (values) =>
  flatten(values)
    .filter(
      (v) =>
        v !== "" &&
        v !== null &&
        typeof v !== "boolean" &&
        Number.isFinite(Number(v)),
    )
    .map(Number);
const serialDate = (date) =>
  (date.getTime() - Date.UTC(1899, 11, 30)) / 86400000;
function criterion(value, condition) {
  if (typeof condition !== "string") return value === condition;
  const match = /^(<=|>=|<>|!=|=|<|>)?(.*)$/.exec(condition);
  let rhs = match[2],
    lhs = value;
  if (rhs !== "" && Number.isFinite(Number(rhs))) {
    rhs = Number(rhs);
    lhs = Number(lhs);
  }
  const op = match[1] || "=";
  if (
    (op === "=" || op === "<>") &&
    typeof rhs === "string" &&
    /[?*]/.test(rhs)
  ) {
    const escaped = rhs
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    const matches = new RegExp(`^${escaped}$`, "i").test(String(lhs));
    return op === "=" ? matches : !matches;
  }
  return {
    "=": () => String(lhs).toLowerCase() === String(rhs).toLowerCase(),
    "<>": () => lhs != rhs,
    "!=": () => lhs != rhs,
    "<": () => lhs < rhs,
    ">": () => lhs > rhs,
    "<=": () => lhs <= rhs,
    ">=": () => lhs >= rhs,
  }[op]();
}
function call(name, args) {
  const ns = () => numbers(args),
    first = () => num(args[0] ?? 0);
  const unary = {
    ABS: Math.abs,
    SQRT: Math.sqrt,
    SIN: Math.sin,
    COS: Math.cos,
    TAN: Math.tan,
    ASIN: Math.asin,
    ACOS: Math.acos,
    ATAN: Math.atan,
    EXP: Math.exp,
    LN: Math.log,
    LOG10: Math.log10,
    FLOOR: Math.floor,
    CEIL: Math.ceil,
    INT: Math.floor,
    SIGN: Math.sign,
  };
  if (Object.hasOwn(unary, name)) return unary[name](first());
  switch (name) {
    case "SUM":
      return ns().reduce((a, b) => a + b, 0);
    case "AVERAGE":
    case "MEAN": {
      const n = ns();
      if (!n.length) throw new Error("#DIV/0!");
      return n.reduce((a, b) => a + b, 0) / n.length;
    }
    case "MIN":
      return ns().length ? Math.min(...ns()) : 0;
    case "MAX":
      return ns().length ? Math.max(...ns()) : 0;
    case "COUNT":
      return ns().length;
    case "COUNTA":
      return flatten(args).filter((v) => v !== "" && v != null).length;
    case "MEDIAN": {
      const n = ns().sort((a, b) => a - b);
      return n.length % 2
        ? n[(n.length - 1) / 2]
        : (n[n.length / 2 - 1] + n[n.length / 2]) / 2;
    }
    case "STDEV":
    case "STDEV.S":
    case "VAR":
    case "VAR.S":
    case "STDEV.P":
    case "VAR.P": {
      const n = ns(),
        sample = !name.endsWith(".P"),
        denom = n.length - Number(sample);
      if (denom <= 0) throw new Error("#DIV/0!");
      const mean = n.reduce((a, b) => a + b, 0) / n.length,
        variance = n.reduce((a, b) => a + (b - mean) ** 2, 0) / denom;
      return name.startsWith("STDEV") ? Math.sqrt(variance) : variance;
    }
    case "POWER":
      return first() ** num(args[1]);
    case "MOD":
      if (num(args[1]) === 0) throw new Error("#DIV/0!");
      return ((first() % num(args[1])) + num(args[1])) % num(args[1]);
    case "ROUND":
    case "ROUNDUP":
    case "ROUNDDOWN": {
      const factor = 10 ** num(args[1] ?? 0),
        n = first() * factor;
      return (
        (name === "ROUND"
          ? Math.round(n)
          : Math.sign(n) *
            (name === "ROUNDUP"
              ? Math.ceil(Math.abs(n))
              : Math.floor(Math.abs(n)))) / factor
      );
    }
    case "LOG":
      return Math.log(first()) / Math.log(num(args[1] ?? 10));
    case "PI":
      return Math.PI;
    case "AND":
      return flatten(args).every(Boolean);
    case "OR":
      return flatten(args).some(Boolean);
    case "NOT":
      return !args[0];
    case "CONCAT":
    case "CONCATENATE":
      return flatten(args).join("");
    case "UPPER":
      return String(args[0] ?? "").toUpperCase();
    case "LOWER":
      return String(args[0] ?? "").toLowerCase();
    case "TRIM":
      return String(args[0] ?? "")
        .trim()
        .replace(/\s+/g, " ");
    case "LEN":
      return String(args[0] ?? "").length;
    case "LEFT":
      return String(args[0] ?? "").slice(0, num(args[1] ?? 1));
    case "RIGHT":
      return String(args[0] ?? "").slice(-num(args[1] ?? 1));
    case "MID":
      return String(args[0] ?? "").slice(
        num(args[1]) - 1,
        num(args[1]) - 1 + num(args[2]),
      );
    case "COUNTIF":
      return flatten([args[0]]).filter((v) => criterion(v, args[1])).length;
    case "SUMIF": {
      const vals = flatten([args[0]]),
        sums = flatten([args[2] ?? args[0]]);
      return vals.reduce(
        (s, v, i) => s + (criterion(v, args[1]) ? num(sums[i] ?? 0) : 0),
        0,
      );
    }
    case "AVERAGEIF": {
      const vals = flatten([args[0]]),
        sums = flatten([args[2] ?? args[0]]),
        selected = sums.filter((_, i) => criterion(vals[i], args[1]));
      if (!selected.length) throw new Error("#DIV/0!");
      return selected.reduce((s, v) => s + num(v), 0) / selected.length;
    }
    case "SUMPRODUCT": {
      const arrays = args.map((a) => flatten([a]));
      return arrays[0].reduce(
        (sum, _, i) => sum + arrays.reduce((p, a) => p * num(a[i] ?? 0), 1),
        0,
      );
    }
    case "TODAY": {
      const d = new Date();
      return serialDate(
        new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())),
      );
    }
    case "NOW":
      return serialDate(new Date());
    case "DATE":
      return serialDate(
        new Date(Date.UTC(num(args[0]), num(args[1]) - 1, num(args[2]))),
      );
    case "YEAR":
    case "MONTH":
    case "DAY": {
      const d = new Date(Date.UTC(1899, 11, 30) + first() * 86400000);
      return name === "YEAR"
        ? d.getUTCFullYear()
        : name === "MONTH"
          ? d.getUTCMonth() + 1
          : d.getUTCDate();
    }
    default: {
      const matrix = {
        MDETERM: det,
        MINVERSE: inv,
        MMULT: multiply,
        TRANSPOSE: transpose,
      };
      if (matrix[name]) return matrix[name](...args);
      const fn = name.split(".").reduce((o, k) => o?.[k], FormulaJS);
      if (typeof fn !== "function") throw new Error("#NAME?");
      const value = fn(...args);
      if (value instanceof Error) throw value;
      return value;
    }
  }
}
function execute(ast, context) {
  if (ast.kind === "literal") return ast.value;
  if (ast.kind === "error") throw new Error(ast.value);
  if (ast.kind === "variable") {
    if (ast.name === "TRUE") return true;
    if (ast.name === "FALSE") return false;
    if (ast.name === "PI") return Math.PI;
    if (ast.name === "E") return Math.E;
    if (ast.name === "X" && context.x !== undefined) return context.x;
    throw new Error("#NAME?");
  }
  if (ast.kind === "ref") return context.read(ast.value, ast.sheet);
  if (ast.kind === "range") {
    const range = parseRange(`${ast.start}:${ast.end}`),
      rows = [];
    if (
      (range.end.row - range.start.row + 1) *
        (range.end.col - range.start.col + 1) >
      100000
    )
      throw Error("#REF!");
    for (let r = range.start.row; r <= range.end.row; r++) {
      const row = [];
      for (let c = range.start.col; c <= range.end.col; c++)
        row.push(context.read(cellRef(r, c), ast.sheet));
      rows.push(row);
    }
    return rows;
  }
  if (ast.kind === "unary")
    return ast.op === "-"
      ? -num(execute(ast.child, context))
      : num(execute(ast.child, context));
  if (ast.kind === "binary") {
    const a = execute(ast.left, context),
      b = execute(ast.right, context);
    switch (ast.op) {
      case "+":
        return num(a) + num(b);
      case "-":
        return num(a) - num(b);
      case "*":
        return num(a) * num(b);
      case "/":
        if (num(b) === 0) throw new Error("#DIV/0!");
        return num(a) / num(b);
      case "^":
        return num(a) ** num(b);
      case "&":
        return String(a) + String(b);
      case "=":
      case "==":
        return a == b;
      case "<>":
      case "!=":
        return a != b;
      case ">":
        return a > b;
      case "<":
        return a < b;
      case ">=":
        return a >= b;
      case "<=":
        return a <= b;
    }
  }
  if (ast.kind === "call") {
    if (ast.name === "IF")
      return execute(
        ast.args[execute(ast.args[0], context) ? 1 : 2] ?? {
          kind: "literal",
          value: false,
        },
        context,
      );
    if (ast.name === "IFERROR") {
      try {
        return execute(ast.args[0], context);
      } catch {
        return execute(ast.args[1], context);
      }
    }
    const result = call(
      ast.name,
      ast.args.map((arg) => execute(arg, context)),
    );
    if (typeof result === "number" && !Number.isFinite(result))
      throw new Error("#NUM!");
    return result;
  }
  throw new Error("#VALUE!");
}
function createContext(
  sheets,
  sheetId,
  visiting = new Set(),
  cache = new Map(),
) {
  const sheet =
    sheets.find((s) => s.id === sheetId || s.name === sheetId) ?? sheets[0];
  return {
    read(ref, sheetName) {
      const selected = sheetName
        ? sheets.find((s) => s.name === sheetName || s.id === sheetName)
        : sheet;
      if (!selected) throw new Error("#REF!");
      const normalized = ref.replace(/\$/g, "").toUpperCase();
      parseRef(normalized);
      const key = `${selected.id}:${normalized}`;
      if (cache.has(key)) return cache.get(key);
      if (visiting.has(key)) throw new Error("#CYCLE!");
      const stored = selected.cells?.[normalized],
        raw = stored && typeof stored === "object" ? stored.raw : stored;
      if (raw === undefined || raw === null || raw === "") {
        const at = parseRef(normalized);
        for (const [origin, cell] of Object.entries(selected.cells || {})) {
          if (
            !/^=(?:MMULT|MINVERSE|TRANSPOSE|SEQUENCE)\(/i.test(String(cell.raw))
          )
            continue;
          const p = parseRef(origin);
          if (p.row > at.row || p.col > at.col || origin === normalized)
            continue;
          const value = createContext(
            sheets,
            selected.id,
            visiting,
            cache,
          ).read(origin);
          if (Array.isArray(value)) {
            const result = value[at.row - p.row]?.[at.col - p.col];
            if (result !== undefined) return result;
          }
        }
        return "";
      }
      visiting.add(key);
      let result;
      try {
        result =
          typeof raw === "string" && raw.startsWith("=")
            ? execute(
                parse(raw),
                createContext(sheets, selected.id, visiting, cache),
              )
            : typeof raw === "string" &&
                raw.trim() !== "" &&
                Number.isFinite(Number(raw))
              ? Number(raw)
              : raw;
        if (typeof result === "number" && !Number.isFinite(result))
          throw new Error("#NUM!");
        cache.set(key, result);
      } finally {
        visiting.delete(key);
      }
      return result;
    },
  };
}
export function evalCell(sheets, sheetId, row, col) {
  try {
    const result = createContext(sheets, sheetId).read(cellRef(row, col));
    return Array.isArray(result) ? (result[0]?.[0] ?? result[0]) : result;
  } catch (error) {
    return /^#/.test(error.message) ? error.message : "#VALUE!";
  }
}
export function evaluateFormula(formula, sheets, sheetId) {
  try {
    return execute(parse(formula), createContext(sheets, sheetId));
  } catch (error) {
    return /^#/.test(error.message) ? error.message : "#VALUE!";
  }
}
export function evaluateMath(expression, x = 0) {
  // Math uses exactly the same arithmetic parser without allowing cell access.
  const value = execute(
    parse(expression.replace(/^\s*(?:y|f\(x\))\s*=\s*/i, ""), true),
    {
      x,
      read() {
        throw new Error(
          "Cell references are unavailable in function expressions",
        );
      },
    },
  );
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error("Function is undefined at this x");
  return value;
}
export function derivative(expression, x) {
  const h = Math.cbrt(Number.EPSILON) * Math.max(1, Math.abs(x));
  return (
    (evaluateMath(expression, x + h) - evaluateMath(expression, x - h)) /
    (2 * h)
  );
}
export function integrate(expression, a, b, intervals = 512) {
  if (!Number.isFinite(a) || !Number.isFinite(b))
    throw new Error("Integration bounds must be finite");
  let n = Math.min(100000, Math.max(2, Math.floor(intervals)));
  if (n % 2) n++;
  const h = (b - a) / n;
  let sum = evaluateMath(expression, a) + evaluateMath(expression, b);
  for (let i = 1; i < n; i++)
    sum += (i % 2 ? 4 : 2) * evaluateMath(expression, a + i * h);
  return (h * sum) / 3;
}
const toPoints = (points) =>
  points
    .map((p) =>
      Array.isArray(p)
        ? { x: Number(p[0]), y: Number(p[1]) }
        : { x: Number(p.x), y: Number(p.y) },
    )
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
function solve(matrix, rhs) {
  const rows = matrix.map((row, i) => [...row, rhs[i]]),
    n = rows.length;
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let j = i + 1; j < n; j++)
      if (Math.abs(rows[j][i]) > Math.abs(rows[pivot][i])) pivot = j;
    [rows[i], rows[pivot]] = [rows[pivot], rows[i]];
    if (Math.abs(rows[i][i]) < 1e-12)
      throw new Error("Regression requires distinct x values");
    const d = rows[i][i];
    for (let j = i; j <= n; j++) rows[i][j] /= d;
    for (let k = 0; k < n; k++)
      if (k !== i) {
        const f = rows[k][i];
        for (let j = i; j <= n; j++) rows[k][j] -= f * rows[i][j];
      }
  }
  return rows.map((row) => row[n]);
}
const fmt = (n) => Number(n.toPrecision(5)).toString();
export function regression(input, type = "linear", degree = 2) {
  const points = toPoints(input),
    exponential = type === "exponential",
    polynomial = type === "polynomial" || type === "poly";
  const order = polynomial ? Math.min(8, Math.max(1, Math.floor(degree))) : 1;
  if (points.length <= order)
    throw new Error(`Regression needs at least ${order + 1} data points`);
  if (exponential && points.some((p) => p.y <= 0))
    throw new Error("Exponential regression requires positive y values");
  const data = exponential
    ? points.map((p) => ({ x: p.x, y: Math.log(p.y) }))
    : points;
  const matrix = Array.from({ length: order + 1 }, (_, i) =>
    Array.from({ length: order + 1 }, (_, j) =>
      data.reduce((s, p) => s + p.x ** (i + j), 0),
    ),
  );
  const rhs = Array.from({ length: order + 1 }, (_, i) =>
    data.reduce((s, p) => s + p.y * p.x ** i, 0),
  );
  let coefficients = solve(matrix, rhs);
  if (exponential) coefficients = [Math.exp(coefficients[0]), coefficients[1]];
  const predict = exponential
    ? (x) => coefficients[0] * Math.exp(coefficients[1] * x)
    : (x) =>
        coefficients.reduce(
          (sum, coefficient, i) => sum + coefficient * x ** i,
          0,
        );
  const mean = points.reduce((s, p) => s + p.y, 0) / points.length;
  const residuals = points.map((p) => ({
    x: p.x,
    y: p.y,
    predicted: predict(p.x),
    residual: p.y - predict(p.x),
  }));
  const ssRes = residuals.reduce((s, p) => s + p.residual ** 2, 0),
    ssTot = points.reduce((s, p) => s + (p.y - mean) ** 2, 0);
  const r2 = ssTot < 1e-20 ? (ssRes < 1e-20 ? 1 : 0) : 1 - ssRes / ssTot;
  const terms = coefficients
    .map((c, i) => ({
      c,
      text: `${fmt(Math.abs(c))}${i ? `x${i > 1 ? `^${i}` : ""}` : ""}`,
    }))
    .reverse();
  const equation = exponential
    ? `y = ${fmt(coefficients[0])}e^(${fmt(coefficients[1])}x)`
    : `y = ${terms.map((term, i) => `${term.c < 0 ? (i ? "− " : "−") : i ? "+ " : ""}${term.text}`).join(" ")}`;
  return {
    type,
    coefficients,
    predict,
    r2,
    equation,
    residuals,
    method: exponential ? "Log-transformed least squares" : "Least squares",
  };
}
export function discreteTangent(input, index) {
  const points = toPoints(input);
  if (points.length < 2 || !points[index])
    throw new Error("Select a valid point");
  const a = points[Math.max(0, index - 1)],
    b = points[Math.min(points.length - 1, index + 1)],
    point = points[index];
  if (b.x === a.x)
    throw new Error("Slope is undefined for coincident x values");
  const slope = (b.y - a.y) / (b.x - a.x);
  return {
    slope,
    intercept: point.y - slope * point.x,
    point,
    method:
      index === 0 || index === points.length - 1
        ? "Adjacent-point one-sided difference"
        : "Adjacent-point central difference",
  };
}
export function trapezoidalIntegral(input, a = -Infinity, b = Infinity) {
  const points = toPoints(input).sort((p, q) => p.x - q.x);
  let area = 0;
  if (a > b) return -trapezoidalIntegral(points, b, a);
  for (let i = 1; i < points.length; i++) {
    const p = points[i - 1],
      q = points[i],
      left = Math.max(a, p.x),
      right = Math.min(b, q.x);
    if (right <= left || q.x === p.x) continue;
    const at = (x) => p.y + ((q.y - p.y) * (x - p.x)) / (q.x - p.x);
    area += ((at(left) + at(right)) * (right - left)) / 2;
  }
  return area;
}

/**
 * Update A1 references after structural row/column editing.
 * currentSheet/targetSheet are sheet names; index is zero-based.
 * Structural changes affect absolute references too. Deletion clips ranges to
 * surviving cells, and makes fully removed references #REF!. Text literals and
 * references to other sheets are left intact. Also accepts a plain A1 range.
 */
export function adjustFormulaReferences(formula, options) {
  if (typeof formula !== "string") return formula;
  const {
    currentSheet,
    targetSheet,
    index,
    deleteCount = 0,
    insertCount = 0,
  } = options;
  const axis = options.axis === "column" ? "col" : options.axis;
  if (
    !["row", "col"].includes(axis) ||
    !Number.isInteger(index) ||
    index < 0 ||
    !Number.isInteger(deleteCount) ||
    deleteCount < 0 ||
    !Number.isInteger(insertCount) ||
    insertCount < 0
  )
    throw new Error("Invalid structural reference update");
  if (!deleteCount && !insertCount) return formula;
  const sameSheet = (a, b) =>
    String(a ?? "").toLocaleLowerCase() === String(b ?? "").toLocaleLowerCase();
  const endpoint = (text) => {
    const m = /^(\$?)([A-Z]+)(\$?)([1-9]\d*)$/i.exec(text);
    if (!m) throw new Error("#REF!");
    return {
      colAbsolute: m[1],
      col: colIndex(m[2]),
      rowAbsolute: m[3],
      row: Number(m[4]) - 1,
    };
  };
  const format = (ref) =>
    `${ref.colAbsolute}${colName(ref.col)}${ref.rowAbsolute}${ref.row + 1}`;
  const shift = (position) =>
    position < index ? position : position + insertCount - deleteCount;
  const address = "(\\$?[A-Za-z]+\\$?[1-9]\\d*)";
  // A sheet prefix can be quoted (including doubled apostrophes), or a name
  // without spaces. Boundaries exclude function names such as LOG10(...).
  const reference = new RegExp(
    `(?<![\\w.$])(?:(('(?:[^']|'')*'|[A-Za-z_\\u0080-\\uffff][\\w.\\u0080-\\uffff]*)!))?${address}(?::${address})?(?![\\w.$!(])`,
    "g",
  );
  return formula
    .split(/("(?:[^"]|"")*")/g)
    .map((part, literal) => {
      if (literal % 2) return part;
      return part.replace(reference, (match, prefix, rawSheet, first, last) => {
        const explicitSheet = rawSheet?.startsWith("'")
          ? rawSheet.slice(1, -1).replace(/''/g, "'")
          : rawSheet;
        if (!sameSheet(explicitSheet ?? currentSheet, targetSheet))
          return match;
        const start = endpoint(first),
          end = last ? endpoint(last) : null;
        if (!end) {
          const value = start[axis];
          if (value >= index && value < index + deleteCount) return "#REF!";
          start[axis] = shift(value);
          return (prefix ?? "") + format(start);
        }
        const low = Math.min(start[axis], end[axis]),
          high = Math.max(start[axis], end[axis]);
        // Find the first and last surviving original indices, then map those
        // indices into the updated sheet. This also handles a deleted endpoint.
        const firstSurvivor =
          low < index ? low : Math.max(low, index + deleteCount);
        const lastSurvivor =
          high >= index + deleteCount ? high : Math.min(high, index - 1);
        if (
          firstSurvivor > high ||
          lastSurvivor < low ||
          firstSurvivor > lastSurvivor
        )
          return "#REF!";
        const forward = start[axis] <= end[axis];
        start[axis] = shift(forward ? firstSurvivor : lastSurvivor);
        end[axis] = shift(forward ? lastSurvivor : firstSurvivor);
        return `${prefix ?? ""}${format(start)}:${format(end)}`;
      });
    })
    .join("");
}
export function rewriteReferences(formula, options) {
  return adjustFormulaReferences(formula, {
    ...options,
    currentSheet: options.currentSheet ?? options.sheetName,
    targetSheet: options.targetSheet ?? options.targetSheetName,
  });
}

/** Rename explicit worksheet references without changing text literals. */
export function renameSheetReferences(formula, oldName, newName) {
  if (typeof formula !== "string") return formula;
  if (typeof oldName !== "string" || typeof newName !== "string")
    throw new Error("Sheet names must be strings");
  const replacement = `'${newName.replace(/'/g, "''")}'!`;
  // Match quoted strings before sheet prefixes, so literal examples stay text.
  // Quoted sheet names are consumed as one token, including embedded double
  // quotes and doubled apostrophes. External workbook prefixes are not local.
  const tokens =
    /"(?:[^"]|"")*"|'(?:[^']|'')*'!|[A-Za-z_\u0080-\uffff][\w.\u0080-\uffff]*!/g;
  return formula.replace(tokens, (token, offset) => {
    if (token.startsWith('"')) return token;
    if (offset && /[\w.\]\u0080-\uffff]/.test(formula[offset - 1]))
      return token;
    const name = token.startsWith("'")
      ? token.slice(1, -2).replace(/''/g, "'")
      : token.slice(0, -1);
    return name.toLocaleLowerCase() === oldName.toLocaleLowerCase()
      ? replacement
      : token;
  });
}
