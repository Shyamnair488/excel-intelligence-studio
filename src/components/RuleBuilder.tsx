import { useState } from "react";
import { useStore, newId, type Operation, type OpType } from "@/lib/store";
import {
  Filter, Sigma, Layers, GitMerge, FunctionSquare,
  Trash2, Copy, ArrowUp, ArrowDown, Plus, Blocks, Braces,
} from "lucide-react";
import { RulesJsonEditor } from "./RulesJsonEditor";

const OP_META: Record<OpType, { label: string; icon: typeof Filter; accent: string }> = {
  filter: { label: "Filter", icon: Filter, accent: "from-sky-500 to-cyan-400" },
  sum: { label: "Sum", icon: Sigma, accent: "from-violet-500 to-fuchsia-400" },
  groupby: { label: "Group By", icon: Layers, accent: "from-emerald-500 to-teal-400" },
  join: { label: "Join", icon: GitMerge, accent: "from-amber-500 to-orange-400" },
  formula: { label: "Formula", icon: FunctionSquare, accent: "from-pink-500 to-rose-400" },
};

export function RuleBuilder() {
  const {
    workbook, operations, analysisName, setAnalysisName,
    addOp, updateOp, removeOp, duplicateOp, moveOp,
  } = useStore();
  if (!workbook) return null;
  const sheetNames = workbook.sheets.map((s) => s.name);

  function createOp(type: OpType): Operation {
    const firstSheet = sheetNames[0] ?? "";
    const firstCol = workbook!.sheets[0]?.columns[0]?.name ?? "";
    const id = newId();
    switch (type) {
      case "filter":
        return { id, type, sheet: firstSheet, column: firstCol, operator: "=", value: "" };
      case "sum":
        return { id, type, sheet: firstSheet, column: firstCol, output: "Total" };
      case "groupby":
        return { id, type, sheet: firstSheet, groupBy: firstCol, aggColumn: firstCol, agg: "sum", output: "Grouped" };
      case "join":
        return { id, type, leftSheet: sheetNames[0] ?? "", rightSheet: sheetNames[1] ?? sheetNames[0] ?? "", key: firstCol, output: "Joined" };
      case "formula":
        return { id, type, expression: "", output: "Result" };
    }
  }

  const sheetCols = (name: string) =>
    workbook.sheets.find((s) => s.name === name)?.columns.map((c) => c.name) ?? [];

  return (
    <div className="glass rounded-xl p-4">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Rule Pipeline</h2>
          <p className="text-xs text-muted-foreground">
            {operations.length} operation{operations.length === 1 ? "" : "s"} — executed top-to-bottom.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Analysis name</label>
          <input
            value={analysisName}
            onChange={(e) => setAnalysisName(e.target.value)}
            className="rounded-md border border-border bg-input px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(OP_META) as OpType[]).map((t) => {
          const M = OP_META[t];
          return (
            <button
              key={t}
              onClick={() => addOp(createOp(t))}
              className={`group flex items-center gap-1.5 rounded-lg bg-gradient-to-br ${M.accent} px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:scale-[1.03]`}
            >
              <Plus className="h-3.5 w-3.5" />
              <M.icon className="h-3.5 w-3.5" />
              {M.label}
            </button>
          );
        })}
      </div>

      {operations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No operations yet. Add a block above to start building your analysis.
        </div>
      ) : (
        <ol className="space-y-3">
          {operations.map((op, i) => {
            const M = OP_META[op.type];
            return (
              <li key={op.id} className="rounded-xl border border-border bg-card/60 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br ${M.accent}`}>
                      <M.icon className="h-3.5 w-3.5 text-primary-foreground" />
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">#{i + 1}</span>
                    <span className="text-sm font-semibold">{M.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconBtn title="Move up" onClick={() => moveOp(op.id, -1)}><ArrowUp className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn title="Move down" onClick={() => moveOp(op.id, 1)}><ArrowDown className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn title="Duplicate" onClick={() => duplicateOp(op.id)}><Copy className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn title="Remove" onClick={() => removeOp(op.id)} danger><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                  </div>
                </div>
                <OpEditor op={op} sheetNames={sheetNames} sheetCols={sheetCols} update={(p) => updateOp(op.id, p)} />
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function IconBtn({ children, danger, ...rest }: any) {
  return (
    <button
      {...rest}
      className={`rounded-md p-1.5 text-muted-foreground transition hover:bg-secondary ${danger ? "hover:text-destructive" : "hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "rounded-md border border-border bg-input px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function OpEditor({
  op, sheetNames, sheetCols, update,
}: {
  op: Operation;
  sheetNames: string[];
  sheetCols: (name: string) => string[];
  update: (p: Partial<Operation>) => void;
}) {
  if (op.type === "filter") {
    const cols = sheetCols(op.sheet);
    return (
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Sheet">
          <select className={inputCls} value={op.sheet} onChange={(e) => update({ sheet: e.target.value })}>
            {sheetNames.map((n) => <option key={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="Column">
          <select className={inputCls} value={op.column} onChange={(e) => update({ column: e.target.value })}>
            {cols.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Operator">
          <select className={inputCls} value={op.operator} onChange={(e) => update({ operator: e.target.value as any })}>
            {["=", "!=", ">", "<", ">=", "<=", "contains"].map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Value">
          <input className={inputCls} value={op.value} onChange={(e) => update({ value: e.target.value })} />
        </Field>
      </div>
    );
  }
  if (op.type === "sum") {
    const cols = sheetCols(op.sheet);
    return (
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Sheet">
          <select className={inputCls} value={op.sheet} onChange={(e) => update({ sheet: e.target.value })}>
            {sheetNames.map((n) => <option key={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="Column">
          <select className={inputCls} value={op.column} onChange={(e) => update({ column: e.target.value })}>
            {cols.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Output name">
          <input className={inputCls} value={op.output} onChange={(e) => update({ output: e.target.value })} />
        </Field>
      </div>
    );
  }
  if (op.type === "groupby") {
    const cols = sheetCols(op.sheet);
    return (
      <div className="grid gap-3 md:grid-cols-5">
        <Field label="Sheet">
          <select className={inputCls} value={op.sheet} onChange={(e) => update({ sheet: e.target.value })}>
            {sheetNames.map((n) => <option key={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="Group by">
          <select className={inputCls} value={op.groupBy} onChange={(e) => update({ groupBy: e.target.value })}>
            {cols.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Agg">
          <select className={inputCls} value={op.agg} onChange={(e) => update({ agg: e.target.value as any })}>
            {["sum", "avg", "count", "min", "max"].map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Column">
          <select className={inputCls} value={op.aggColumn} onChange={(e) => update({ aggColumn: e.target.value })}>
            {cols.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Output sheet">
          <input className={inputCls} value={op.output} onChange={(e) => update({ output: e.target.value })} />
        </Field>
      </div>
    );
  }
  if (op.type === "join") {
    const leftCols = sheetCols(op.leftSheet);
    return (
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Left sheet">
          <select className={inputCls} value={op.leftSheet} onChange={(e) => update({ leftSheet: e.target.value })}>
            {sheetNames.map((n) => <option key={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="Right sheet">
          <select className={inputCls} value={op.rightSheet} onChange={(e) => update({ rightSheet: e.target.value })}>
            {sheetNames.map((n) => <option key={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="Join key">
          <select className={inputCls} value={op.key} onChange={(e) => update({ key: e.target.value })}>
            {leftCols.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Output sheet">
          <input className={inputCls} value={op.output} onChange={(e) => update({ output: e.target.value })} />
        </Field>
      </div>
    );
  }
  // formula
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_220px]">
      <Field label="Expression (use SUM/IF/ABS/ROUND/DATEDIFF; references = prior output names)">
        <input
          className={`${inputCls} font-mono`}
          placeholder="Receivable - PaymentIS - WriteOff"
          value={op.expression}
          onChange={(e) => update({ expression: e.target.value })}
        />
      </Field>
      <Field label="Output name">
        <input className={inputCls} value={op.output} onChange={(e) => update({ output: e.target.value })} />
      </Field>
    </div>
  );
}
