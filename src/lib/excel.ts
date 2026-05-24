import * as XLSX from "xlsx";

export type CellValue = string | number | boolean | Date | null;
export type Row = Record<string, CellValue>;

export type ColumnType = "number" | "date" | "boolean" | "string";

export interface SheetData {
  name: string;
  columns: { name: string; type: ColumnType }[];
  rows: Row[];
}

export interface WorkbookData {
  fileName: string;
  sheets: SheetData[];
}

function detectType(values: CellValue[]): ColumnType {
  let n = 0, d = 0, b = 0, total = 0;
  for (const v of values) {
    if (v === null || v === undefined || v === "") continue;
    total++;
    if (typeof v === "number") n++;
    else if (typeof v === "boolean") b++;
    else if (v instanceof Date) d++;
    else if (typeof v === "string") {
      if (!isNaN(Number(v)) && v.trim() !== "") n++;
      else if (!isNaN(Date.parse(v))) d++;
    }
  }
  if (!total) return "string";
  if (n / total > 0.8) return "number";
  if (d / total > 0.8) return "date";
  if (b / total > 0.8) return "boolean";
  return "string";
}

export async function parseWorkbook(file: File): Promise<WorkbookData> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheets: SheetData[] = wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: null, raw: true });
    const colNames = rows.length ? Object.keys(rows[0]) : [];
    const columns = colNames.map((c) => ({
      name: c,
      type: detectType(rows.map((r) => r[c])),
    }));
    return { name, columns, rows };
  });
  return { fileName: file.name, sheets };
}

export function exportWorkbookWithAnalysis(
  wb: WorkbookData,
  analysisRows: Row[],
  analysisSheetName = "Analysis"
): Blob {
  const out = XLSX.utils.book_new();
  for (const sh of wb.sheets) {
    if (sh.name === analysisSheetName) continue;
    const ws = XLSX.utils.json_to_sheet(sh.rows);
    XLSX.utils.book_append_sheet(out, ws, sh.name);
  }
  const aws = XLSX.utils.json_to_sheet(analysisRows);
  XLSX.utils.book_append_sheet(out, aws, analysisSheetName);
  const data = XLSX.write(out, { bookType: "xlsx", type: "array" });
  return new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
