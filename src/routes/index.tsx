import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { Uploader } from "@/components/Uploader";
import { SheetExplorer } from "@/components/SheetExplorer";
import { RuleBuilder } from "@/components/RuleBuilder";
import { PreviewPanel } from "@/components/PreviewPanel";
import { useStore } from "@/lib/store";
import { Sparkles, X, Upload as UploadIcon } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { workbook, reset, loadRules, analysisName } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">Excel Intelligence Studio</h1>
              <p className="text-[11px] text-muted-foreground">
                Dynamic, no-code analysis · processed entirely in your browser
              </p>
            </div>
          </div>
          {workbook && (
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {workbook.fileName} · {workbook.sheets.length} sheets
              </span>
              <button
                onClick={() => fileRef.current?.click()}
                className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80"
              >
                Import rules
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const txt = await f.text();
                    loadRules(JSON.parse(txt));
                  } catch {}
                  e.target.value = "";
                }}
              />
              <button
                onClick={reset}
                className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
              >
                <X className="h-3.5 w-3.5" /> Close workbook
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {!workbook ? (
          <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-6">
              <div>
                <span className="chip">Local · Private · Zero-storage</span>
                <h2 className="mt-4 text-4xl font-bold leading-tight tracking-tight">
                  Build Excel analyses
                  <br />
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    without writing formulas.
                  </span>
                </h2>
                <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                  Drop a workbook, chain filters, joins, aggregations, and custom expressions into
                  a visual rule pipeline, preview the result, and export back to Excel — all in
                  your browser.
                </p>
              </div>
              <Uploader />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Filter", "Row conditions"],
                  ["Sum / Group", "Aggregations"],
                  ["Join", "Across sheets"],
                  ["Formula", "Custom expressions"],
                ].map(([t, d]) => (
                  <div key={t} className="glass rounded-lg p-3">
                    <div className="text-sm font-semibold">{t}</div>
                    <div className="text-[11px] text-muted-foreground">{d}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass relative overflow-hidden rounded-2xl p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Rule preview
                </div>
                <span className="chip">JSON</span>
              </div>
              <pre className="overflow-auto rounded-lg bg-background/60 p-4 text-[11px] leading-relaxed text-muted-foreground">
{`{
  "analysis_name": "Policy Analysis",
  "operations": [
    { "type": "filter", "sheet": "PA",
      "column": "AllocationStatusCode",
      "operator": "=", "value": "A" },
    { "type": "sum", "sheet": "BI",
      "column": "OriginalTransactionAmount",
      "output": "Receivable" },
    { "type": "formula",
      "expression": "Receivable - PaymentIS - WriteOff",
      "output": "Outstanding" },
    { "type": "join", "leftSheet": "PT",
      "rightSheet": "PA", "key": "PolicyTermId",
      "output": "PT_PA" }
  ]
}`}
              </pre>
            </div>
          </section>
        ) : (
          <>
            <Section title="Workbook Explorer" subtitle={`${analysisName} · ${workbook.fileName}`}>
              <SheetExplorer />
            </Section>
            <Section title="Rule Builder" subtitle="Compose operations — top to bottom">
              <RuleBuilder />
            </Section>
            <Section title="Analysis Preview" subtitle="Live results from the current rule pipeline">
              <PreviewPanel />
            </Section>
          </>
        )}
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-[11px] text-muted-foreground">
        <UploadIcon className="mr-1 inline h-3 w-3" />
        Your files never leave this device. Refresh to discard the session.
      </footer>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <header className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}
