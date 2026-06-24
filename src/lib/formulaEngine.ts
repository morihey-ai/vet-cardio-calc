import type { FormulaDefinition } from "../types";

type FormulaVars = Record<string, number | string | boolean | null | undefined>;

const allowedIdentifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function roundTo(value: number, precision: number): number {
  const scale = 10 ** precision;
  return Math.round((value + Number.EPSILON) * scale) / scale;
}

export function formatValue(value: number | null, precision: number, unit = ""): string {
  if (value === null || Number.isNaN(value)) return "未計算";
  const text = roundTo(value, precision).toLocaleString("ja-JP", {
    maximumFractionDigits: precision,
    minimumFractionDigits: precision > 0 ? Math.min(precision, 1) : 0
  });
  return unit ? `${text} ${unit}` : text;
}

export function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  return (end.getTime() - start.getTime()) / 86_400_000;
}

export function evaluateFormula(
  formula: FormulaDefinition,
  vars: FormulaVars
): number | null {
  if (!formula.expression) return null;
  for (const variable of formula.variables) {
    if (!allowedIdentifier.test(variable)) {
      throw new Error(`Invalid variable name: ${variable}`);
    }
    if (vars[variable] === null || vars[variable] === undefined || vars[variable] === "") {
      return null;
    }
  }

  const names = [...formula.variables, "pi", "sqrt", "daysBetween"];
  const values = [
    ...formula.variables.map((name) => vars[name]),
    Math.PI,
    Math.sqrt,
    daysBetween
  ];
  const fn = new Function(...names, `"use strict"; return (${formula.expression});`);
  const value = fn(...values);
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}
