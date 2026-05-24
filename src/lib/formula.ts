// Safe-ish formula evaluator. Supports numeric arithmetic, comparisons,
// and a small set of functions: SUM, AVG, MIN, MAX, COUNT, IF, ABS, ROUND, DATEDIFF.
// Identifiers resolve from a provided scope (column/scalar values).

type Scope = Record<string, unknown>;

const FUNCS: Record<string, (...a: any[]) => any> = {
  SUM: (...a) => flat(a).reduce((s, v) => s + num(v), 0),
  AVG: (...a) => {
    const xs = flat(a).map(num);
    return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0;
  },
  MIN: (...a) => Math.min(...flat(a).map(num)),
  MAX: (...a) => Math.max(...flat(a).map(num)),
  COUNT: (...a) => flat(a).filter((v) => v !== null && v !== undefined && v !== "").length,
  ABS: (x) => Math.abs(num(x)),
  ROUND: (x, d = 0) => {
    const p = 10 ** num(d);
    return Math.round(num(x) * p) / p;
  },
  IF: (c, a, b) => (c ? a : b),
  DATEDIFF: (a, b) => {
    const da = a instanceof Date ? a : new Date(String(a));
    const db = b instanceof Date ? b : new Date(String(b));
    return Math.round((db.getTime() - da.getTime()) / 86400000);
  },
};

function flat(a: any[]): any[] {
  const out: any[] = [];
  for (const x of a) Array.isArray(x) ? out.push(...x) : out.push(x);
  return out;
}
function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

// Compile a formula. Returns a function evaluating against a scope.
export function compileFormula(expr: string): (scope: Scope) => unknown {
  // Allow only safe chars + identifiers
  if (!/^[\w\s+\-*/().,<>=!&|"'?:%[\]]+$/.test(expr)) {
    throw new Error("Formula contains unsupported characters");
  }
  // Translate Excel-ish single = comparisons: a==b stays; user wrote a=b -> a==b (but not <=,>=,!=)
  const normalized = expr.replace(/([^<>=!])=(?!=)/g, "$1==");
  // Build function with FUNCS + scope as args
  const body = `with(__funcs){ with(__scope){ return (${normalized}); } }`;
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  const fn = new Function("__funcs", "__scope", body);
  return (scope: Scope) => {
    try {
      return fn(FUNCS, scope);
    } catch (e) {
      return null;
    }
  };
}

export function extractIdentifiers(expr: string): string[] {
  const ids = new Set<string>();
  const re = /[A-Za-z_][\w.]*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(expr))) {
    const id = m[0];
    if (id in FUNCS) continue;
    if (["true", "false", "null"].includes(id)) continue;
    ids.add(id);
  }
  return [...ids];
}
