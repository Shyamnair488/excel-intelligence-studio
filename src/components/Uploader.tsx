import { useCallback, useState } from "react";
import { parseWorkbook } from "@/lib/excel";
import { useStore } from "@/lib/store";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";

export function Uploader() {
  const setWorkbook = useStore((s) => s.setWorkbook);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || !files[0]) return;
      setBusy(true);
      setError(null);
      try {
        const wb = await parseWorkbook(files[0]);
        setWorkbook(wb);
      } catch (e: any) {
        setError(e?.message ?? "Failed to parse workbook");
      } finally {
        setBusy(false);
      }
    },
    [setWorkbook]
  );

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`glass relative flex h-64 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl px-6 text-center transition ${
        drag ? "glow-ring" : "hover:border-primary/60"
      }`}
    >
      <input
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {busy ? (
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      ) : (
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent">
          <Upload className="h-6 w-6 text-primary-foreground" />
        </div>
      )}
      <div>
        <div className="text-lg font-semibold">Drop an Excel workbook</div>
        <div className="text-sm text-muted-foreground">
          .xlsx or .xls — parsed locally in your browser. Nothing is uploaded.
        </div>
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <FileSpreadsheet className="h-3.5 w-3.5" />
        <span>PT · BI · BIS · PA · CA · or any structure</span>
      </div>
      {error && <div className="mt-2 text-sm text-destructive">{error}</div>}
    </label>
  );
}
