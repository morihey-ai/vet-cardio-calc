import type { CalculationValue, ExamRecord } from "../types";

function escapeCsv(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function buildCsv(record: ExamRecord, values: CalculationValue[]): string {
  const rows = [
    ["caseId", "examDate", "item", "value", "unit"],
    ...values.map((value) => [
      record.patient.caseId,
      record.patient.examDate,
      value.label,
      value.value ?? "",
      value.unit
    ])
  ];
  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
