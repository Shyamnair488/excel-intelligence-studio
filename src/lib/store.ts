import { create } from "zustand";
import type { WorkbookData } from "./excel";

export type Operation =
  | { id: string; type: "filter"; sheet: string; column: string; operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "contains"; value: string }
  | { id: string; type: "sum"; sheet: string; column: string; output: string }
  | { id: string; type: "groupby"; sheet: string; groupBy: string; aggColumn: string; agg: "sum" | "avg" | "count" | "min" | "max"; output: string }
  | { id: string; type: "join"; leftSheet: string; rightSheet: string; key: string; output: string }
  | { id: string; type: "formula"; expression: string; output: string };

export type OpType = Operation["type"];

interface Store {
  workbook: WorkbookData | null;
  setWorkbook: (wb: WorkbookData | null) => void;
  activeSheet: string | null;
  setActiveSheet: (name: string) => void;
  analysisName: string;
  setAnalysisName: (s: string) => void;
  operations: Operation[];
  addOp: (op: Operation) => void;
  updateOp: (id: string, patch: Partial<Operation>) => void;
  removeOp: (id: string) => void;
  duplicateOp: (id: string) => void;
  moveOp: (id: string, dir: -1 | 1) => void;
  loadRules: (data: { analysis_name?: string; operations: Operation[] }) => void;
  reset: () => void;
}

export const newId = () => Math.random().toString(36).slice(2, 9);

export const useStore = create<Store>((set) => ({
  workbook: null,
  setWorkbook: (wb) =>
    set({
      workbook: wb,
      activeSheet: wb ? wb.sheets[0]?.name ?? null : null,
      operations: [],
    }),
  activeSheet: null,
  setActiveSheet: (name) => set({ activeSheet: name }),
  analysisName: "Analysis",
  setAnalysisName: (s) => set({ analysisName: s }),
  operations: [],
  addOp: (op) => set((s) => ({ operations: [...s.operations, op] })),
  updateOp: (id, patch) =>
    set((s) => ({
      operations: s.operations.map((o) => (o.id === id ? ({ ...o, ...patch } as Operation) : o)),
    })),
  removeOp: (id) => set((s) => ({ operations: s.operations.filter((o) => o.id !== id) })),
  duplicateOp: (id) =>
    set((s) => {
      const i = s.operations.findIndex((o) => o.id === id);
      if (i < 0) return s;
      const copy = { ...s.operations[i], id: newId() };
      const arr = [...s.operations];
      arr.splice(i + 1, 0, copy);
      return { operations: arr };
    }),
  moveOp: (id, dir) =>
    set((s) => {
      const i = s.operations.findIndex((o) => o.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.operations.length) return s;
      const arr = [...s.operations];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { operations: arr };
    }),
  loadRules: (data) =>
    set({
      analysisName: data.analysis_name ?? "Analysis",
      operations: (data.operations ?? []).map((o) => ({ ...o, id: o.id ?? newId() })),
    }),
  reset: () =>
    set({
      workbook: null,
      activeSheet: null,
      analysisName: "Analysis",
      operations: [],
    }),
}));
