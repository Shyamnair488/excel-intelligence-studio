import { useEffect, useMemo, useState } from "react";
import { useStore, newId, type Operation } from "@/lib/store";
import { Check, AlertTriangle, RotateCcw, ClipboardCopy } from "lucide-react";

const VALID_TYPES = ["filter", "sum", "groupby", "join", "formula"] as const;

function validate(parsed: unknown): { ok: true; ops: Operation[]; name?: string } | { ok: false; error: string } {
  if (!parsed || typeof parsed !== "object") return { ok: false, error: "Root must be an object" };
  const root = parsed as Record<string, unknown>;
  const opsRaw = root.operations;
  if (!Array.isArray(opsRaw)) return { ok: false, error: "`operations` must be an array" };
  const ops: Operation[] = [];
  for (let i = 0; i < opsRaw.length; i++) {
    const o = opsRaw[i] as Record<string, unknown>;
    if (!o || typeof o !== "object") return { ok: false, error: `op[${i}] must be an object` };
    const type = o.type as string;
    if (!VALID_TYPES.includes(type as any)) {
      return { ok: false, error: `op[${i}].type must be one of ${VALID_TYPES.join(", ")}` };
    }
    const required: Record<string, string[]> = {
      filter: ["sheet", "column", "operator", "value"],
      sum: ["sheet", "column", "output"],
      groupby: ["sheet", "groupBy", "aggColumn", "agg", "output"],
      join: ["leftSheet", "rightSheet", "key", "output"],
      formula: ["expression", "output"],
    };
    for (const k of required[type]) {
      if (!(k in o)) return { ok: false, error: `op[${i}] (${type}) missing field "${k}"` };
    }
    ops.push({ ...(o as any), id: (o.id as string) ?? newId() });
  }
  return { ok: true, ops, name: typeof root.analysis_name === "string" ? root.analysis_name : undefined };
}

export function RulesJsonEditor() {
  const { operations, analysisName, loadRules, setAnalysisName } = useStore();

  const canonical = useMemo(
    () =>
      JSON.stringify(
        {
          analysis_name: analysisName,
          operations: operations.map(({ id: _id, ...rest }) => rest),
        },
        null,
        2
      ),
    [operations, analysisName]
  );

  const [text, setText] = useState(canonical);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  // Sync from store when not actively editing
  useEffect(() => {
    if (!dirty) setText(canonical);
  }, [canonical, dirty]);

  const apply = () => {
    try {
      const parsed = JSON.parse(text);
      const result = validate(parsed);
      if (!result.ok) {
        setStatus({ ok: false, message: result.error });
        return;
      }
      loadRules({ analysis_name: result.name ?? analysisName, operations: result.ops });
      if (result.name) setAnalysisName(result.name);
      setDirty(false);
      setStatus({ ok: true, message: `Applied ${result.ops.length} operation${result.ops.length === 1 ? "" : "s"}` });
    } catch (e: any) {
      setStatus({ ok: false, message: `Invalid JSON: ${e.message}` });
    }
  };

  const reset = () => {
    setText(canonical);
    setDirty(false);
    setStatus(null);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setStatus({ ok: true, message: "Copied to clipboard" });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Edit the rules JSON directly. Click <span className="font-semibold text-foreground">Apply</span> to sync it back to the pipeline.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={copy}
            className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80"
          >
            <ClipboardCopy className="h-3.5 w-3.5" /> Copy
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          <button
            onClick={apply}
            disabled={!dirty}
            className="flex items-center gap-1.5 rounded-md bg-gradient-to-br from-primary to-accent px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-40"
          >
            <Check className="h-3.5 w-3.5" /> Apply
          </button>
        </div>
      </div>

      <textarea
        spellCheck={false}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setDirty(true);
          setStatus(null);
        }}
        className="h-[420px] w-full resize-none rounded-lg border border-border bg-background/60 p-4 font-mono text-xs leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {status && (
        <div
          className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
            status.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {status.ok ? <Check className="mt-0.5 h-3.5 w-3.5" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />}
          <span>{status.message}</span>
        </div>
      )}

      <details className="rounded-md border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-semibold text-foreground">Schema reference</summary>
        <pre className="mt-2 overflow-auto text-[11px] leading-relaxed">
{`filter   { type, sheet, column, operator, value }
sum      { type, sheet, column, output }
groupby  { type, sheet, groupBy, aggColumn, agg: sum|avg|count|min|max, output }
join     { type, leftSheet, rightSheet, key, output }
formula  { type, expression, output }  // expression may use SUM/IF/ABS/ROUND/DATEDIFF and prior outputs`}
        </pre>
      </details>
    </div>
  );
}
