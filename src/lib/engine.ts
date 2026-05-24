import type { Row, SheetData, WorkbookData, CellValue } from "./excel";
import type { Operation } from "./store";
import { compileFormula } from "./formula";

export interface ExecutionContext {
  // Sheets are mutable views — operations like filter replace them.
  sheets: Record<string, SheetData>;
  // Scalar outputs from sum/aggregate ops, available to formula scope.
  scalars: Record<string, CellValue>;
  // Group/joined results, exposed as if they were sheets.
  derived: Record<string, SheetData>;
  log: { id: string; type: string; message: string; ok: boolean }[];
}

function cloneSheet(s: SheetData): SheetData {
  return { ...s, rows: s.rows.map((r) => ({ ...r })), columns: [...s.columns] };
}

function compareVal(a: CellValue, op: string, b: string): boolean {
  if (a === null || a === undefined) return false;
  const an = typeof a === "number" ? a : Number(a);
  const bn = Number(b);
  const numericMode = !isNaN(an) && !isNaN(bn);
  switch (op) {
    case "=": return numericMode ? an === bn : String(a) === b;
    case "!=": return numericMode ? an !== bn : String(a) !== b;
    case ">": return numericMode ? an > bn : String(a) > b;
    case "<": return numericMode ? an < bn : String(a) < b;
    case ">=": return numericMode ? an >= bn : String(a) >= b;
    case "<=": return numericMode ? an <= bn : String(a) <= b;
    case "contains": return String(a).toLowerCase().includes(b.toLowerCase());
  }
  return false;
}

export function executeOperations(wb: WorkbookData, ops: Operation[]): ExecutionContext {
  const ctx: ExecutionContext = {
    sheets: Object.fromEntries(wb.sheets.map((s) => [s.name, cloneSheet(s)])),
    scalars: {},
    derived: {},
    log: [],
  };
  const getSheet = (name: string): SheetData | undefined =>
    ctx.sheets[name] || ctx.derived[name];

  for (const op of ops) {
    try {
      if (op.type === "filter") {
        const s = getSheet(op.sheet);
        if (!s) throw new Error(`Sheet ${op.sheet} not found`);
        const before = s.rows.length;
        s.rows = s.rows.filter((r) => compareVal(r[op.column], op.operator, op.value));
        ctx.log.push({ id: op.id, type: op.type, ok: true, message: `Filter ${op.sheet}.${op.column} ${op.operator} ${op.value} → ${s.rows.length}/${before}` });
      } else if (op.type === "sum") {
        const s = getSheet(op.sheet);
        if (!s) throw new Error(`Sheet ${op.sheet} not found`);
        const total = s.rows.reduce((acc, r) => acc + (Number(r[op.column]) || 0), 0);
        ctx.scalars[op.output] = total;
        ctx.log.push({ id: op.id, type: op.type, ok: true, message: `Sum ${op.sheet}.${op.column} → ${op.output} = ${total}` });
      } else if (op.type === "groupby") {
        const s = getSheet(op.sheet);
        if (!s) throw new Error(`Sheet ${op.sheet} not found`);
        const map = new Map<string, number[]>();
        for (const r of s.rows) {
          const k = String(r[op.groupBy] ?? "");
          const v = Number(r[op.aggColumn]);
          if (!map.has(k)) map.set(k, []);
          if (!isNaN(v)) map.get(k)!.push(v);
        }
        const rows: Row[] = [...map.entries()].map(([k, vs]) => {
          let v = 0;
          if (op.agg === "sum") v = vs.reduce((a, b) => a + b, 0);
          else if (op.agg === "avg") v = vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : 0;
          else if (op.agg === "min") v = vs.length ? Math.min(...vs) : 0;
          else if (op.agg === "max") v = vs.length ? Math.max(...vs) : 0;
          else v = vs.length;
          return { [op.groupBy]: k, [op.agg.toUpperCase() + "_" + op.aggColumn]: v };
        });
        ctx.derived[op.output] = {
          name: op.output,
          columns: [
            { name: op.groupBy, type: "string" },
            { name: op.agg.toUpperCase() + "_" + op.aggColumn, type: "number" },
          ],
          rows,
        };
        ctx.log.push({ id: op.id, type: op.type, ok: true, message: `GroupBy ${op.sheet} by ${op.groupBy} → ${op.output} (${rows.length} groups)` });
      } else if (op.type === "join") {
        const L = getSheet(op.leftSheet);
        const R = getSheet(op.rightSheet);
        if (!L || !R) throw new Error("Join sheet missing");
        const idx = new Map<string, Row>();
        for (const r of R.rows) idx.set(String(r[op.key]), r);
        const rows: Row[] = L.rows.map((l) => {
          const r = idx.get(String(l[op.key])) ?? {};
          const merged: Row = { ...l };
          for (const k of Object.keys(r)) {
            merged[k in merged && k !== op.key ? `${op.rightSheet}_${k}` : k] = r[k];
          }
          return merged;
        });
        const colNames = rows.length ? Object.keys(rows[0]) : [];
        ctx.derived[op.output] = {
          name: op.output,
          columns: colNames.map((n) => ({ name: n, type: "string" })),
          rows,
        };
        ctx.log.push({ id: op.id, type: op.type, ok: true, message: `Join ${op.leftSheet} ⋈ ${op.rightSheet} on ${op.key} → ${op.output} (${rows.length} rows)` });
      } else if (op.type === "formula") {
        const fn = compileFormula(op.expression);
        const val = fn(ctx.scalars);
        ctx.scalars[op.output] = val as CellValue;
        ctx.log.push({ id: op.id, type: op.type, ok: true, message: `${op.output} = ${op.expression} → ${String(val)}` });
      }
    } catch (e: any) {
      ctx.log.push({ id: op.id, type: op.type, ok: false, message: e?.message ?? "error" });
    }
  }
  return ctx;
}

export function buildAnalysisRows(ctx: ExecutionContext): Row[] {
  // Prefer the last derived sheet (richest output), else scalars table.
  const derivedKeys = Object.keys(ctx.derived);
  if (derivedKeys.length) {
    const last = ctx.derived[derivedKeys[derivedKeys.length - 1]];
    return last.rows;
  }
  const entries = Object.entries(ctx.scalars);
  return entries.length ? [Object.fromEntries(entries) as Row] : [];
}
