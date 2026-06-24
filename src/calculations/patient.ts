import formulas from "../config/formulas.json";
import { evaluateFormula, formatValue } from "../lib/formulaEngine";
import type { CalculationValue, FormulaDefinition, PatientInfo } from "../types";

const formulaList = formulas as FormulaDefinition[];

export function calculateAge(patient: PatientInfo): CalculationValue {
  const formula = formulaList.find((item) => item.id === "ageYears");
  if (!formula) throw new Error("ageYears formula is missing");
  const value = evaluateFormula(formula, {
    birthDate: patient.birthDate,
    examDate: patient.examDate
  });
  return {
    id: formula.id,
    label: formula.label,
    value,
    unit: formula.unit,
    formatted: formatValue(value, formula.precision, formula.unit),
    note: formula.note
  };
}
