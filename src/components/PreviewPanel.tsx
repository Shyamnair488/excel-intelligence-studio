import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { executeOperations, buildAnalysisRows } from "@/lib/engine";
import { exportWorkbookWithAnalysis } from "@/lib/excel";
import { CheckCircle2, AlertTriangle, Download, FileJson, Search } from "lucide-react";

export function PreviewPanel() {
  const { workbook, operations, analysisName } = useStore();
  const [query, setQuery] = useState("");

  const ctx = useMemo(
    () => (workbook ? executeOperations(workbook, operations) : null),
    [workbook, operations]
  );
  const rows = useMemo(() => (ctx ? buildAnalysisRows(ctx) : []), [ctx]);
  const cols = rows[0] ? Object.keys(rows[0]) : [];

  const filteredRows = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q)));
  }, [rows, query]);

  if (!workbook) return null;

  const downloadJson = () => {
    const data = {
      analysis_name: analysisName,
      operations,
    };
    triggerDownload(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      `${analysisName || "rules"}.json`
    );
  };

  const downloadXlsx = () => {
    const blob = exportWorkbookWithAnalysis(workbook, rows, analysisName || "Analysis");
    triggerDownload(blob, `${workbook.fileName.replace(/\.xlsx?$/i, "")}__${analysisName || "Analysis"}.xlsx`);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <section className="glass overflow-hidden rounded-xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">Preview</h2>
            <p className="text-xs text-muted-foreground">
              {rows.length.toLocaleString()} rows · {cols.length} columns
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-44 rounded-md border border-border bg-input py-1.5 pl-7 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={downloadJson}
              className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80"
            >
              <FileJson className="h-3.5 w-3.5" /> Rules JSON
            </button>
            <button
              onClick={downloadXlsx}
              className="flex items-center gap-1.5 rounded-md bg-gradient-to-br from-primary to-accent px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-95"
            >
              <Download className="h-3.5 w-3.5" /> Export Excel
            </button>
          </div>
        </header>
        <div className="max-h-[420px] overflow-auto">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Add operations to see analysis results here.
            </div>
          ) : (
            <table className="data-grid w-full text-sm">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  {cols.map((c) => <th key={c}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, 200).map((r, i) => (
                  <tr key={i}>
                    <td className="text-muted-foreground font-mono text-xs">{i + 1}</td>
                    {cols.map((c) => <td key={c}>{format(r[c])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="glass rounded-xl p-4">
        <h2 className="mb-3 text-base font-semibold">Execution Log</h2>
        {ctx && ctx.log.length === 0 ? (
          <p className="text-sm text-muted-foreground">No operations executed yet.</p>
        ) : (
          <ol className="space-y-2">
            {ctx?.log.map((l, i) => (
              <li
                key={i}
                className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
                  l.ok ? "border-border bg-secondary/40" : "border-destructive/40 bg-destructive/10"
                }`}
              >
                {l.ok ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-destructive" />
                )}
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {l.type}
                  </div>
                  <div>{l.message}</div>
                </div>
              </li>
            ))}
          </ol>
        )}

        {ctx && Object.keys(ctx.scalars).length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Scalars
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(ctx.scalars).map(([k, v]) => (
                <span key={k} className="chip">
                  {k} = {format(v)}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function format(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") return v.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return String(v);
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
