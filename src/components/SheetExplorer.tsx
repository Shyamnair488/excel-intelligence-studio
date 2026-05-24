import { useStore } from "@/lib/store";
import { Table2, Hash, Calendar, ToggleLeft, Type } from "lucide-react";
import type { ColumnType } from "@/lib/excel";

const TypeIcon = ({ t }: { t: ColumnType }) => {
  const cls = "h-3.5 w-3.5";
  if (t === "number") return <Hash className={cls} />;
  if (t === "date") return <Calendar className={cls} />;
  if (t === "boolean") return <ToggleLeft className={cls} />;
  return <Type className={cls} />;
};

export function SheetExplorer() {
  const { workbook, activeSheet, setActiveSheet } = useStore();
  if (!workbook) return null;
  const sheet = workbook.sheets.find((s) => s.name === activeSheet);

  return (
    <div className="grid grid-cols-[220px_1fr] gap-4">
      <aside className="glass rounded-xl p-2">
        <div className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Sheets · {workbook.sheets.length}
        </div>
        <ul className="space-y-1">
          {workbook.sheets.map((s) => (
            <li key={s.name}>
              <button
                onClick={() => setActiveSheet(s.name)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                  s.name === activeSheet
                    ? "bg-primary/20 text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <Table2 className="h-3.5 w-3.5" />
                  <span className="truncate font-medium">{s.name}</span>
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{s.rows.length}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="glass overflow-hidden rounded-xl">
        {!sheet ? (
          <div className="p-6 text-sm text-muted-foreground">Select a sheet</div>
        ) : (
          <>
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h2 className="text-base font-semibold">{sheet.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {sheet.rows.length.toLocaleString()} rows · {sheet.columns.length} columns
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sheet.columns.slice(0, 6).map((c) => (
                  <span key={c.name} className="chip">
                    <TypeIcon t={c.type} />
                    {c.name}
                  </span>
                ))}
                {sheet.columns.length > 6 && (
                  <span className="chip">+{sheet.columns.length - 6}</span>
                )}
              </div>
            </header>
            <div className="max-h-[400px] overflow-auto">
              <table className="data-grid w-full text-sm">
                <thead>
                  <tr>
                    {sheet.columns.map((c) => (
                      <th key={c.name}>
                        <div className="flex items-center gap-1.5">
                          <TypeIcon t={c.type} />
                          {c.name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sheet.rows.slice(0, 50).map((r, i) => (
                    <tr key={i}>
                      {sheet.columns.map((c) => (
                        <td key={c.name}>{formatCell(r[c.name])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") return v.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return String(v);
}
