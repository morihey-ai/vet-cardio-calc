import formulas from "../config/formulas.json";
import { evaluateFormula, formatValue } from "../lib/formulaEngine";
import type { CalculationValue, FormulaDefinition, NutritionInput, PatientInfo } from "../types";

const formulaList = formulas as FormulaDefinition[];

function getFormula(id: string): FormulaDefinition {
  const formula = formulaList.find((item) => item.id === id);
  if (!formula) throw new Error(`${id} formula is missing`);
  return formula;
}

export function validateNutritionUnits(input: NutritionInput): string[] {
  const messages: string[] = [];
  if (input.derFactor <= 0) messages.push("DER係数は0より大きい値で入力してください。");
  if (input.kcalPerGram <= 0) messages.push("フード密度はkcal/gで入力してください。");
  if (input.kcalPerGram > 10) {
    messages.push("kcal/gとしては大きい値です。kcal/100gとの混同がないか確認してください。");
  }
  return messages;
}

export function calculateNutrition(
  patient: PatientInfo,
  input: NutritionInput
): CalculationValue[] {
  const rerFormula = getFormula("rer");
  const rer = evaluateFormula(rerFormula, { bodyWeightKg: patient.bodyWeightKg });
  const derFormula = getFormula("der");
  const der = evaluateFormula(derFormula, {
    rer,
    derFactor: input.derFactor
  });
  const shared = {
    bodyWeightKg: patient.bodyWeightKg,
    derFactor: input.derFactor,
    kcalPerGram: input.kcalPerGram,
    rer,
    der
  };
  return ["rer", "der", "foodAmountG"].map((id) => {
    const formula = getFormula(id);
    const value = id === "rer" ? rer : id === "der" ? der : evaluateFormula(formula, shared);
    return {
      id,
      label: formula.label,
      value,
      unit: formula.unit,
      formatted: formatValue(value, formula.precision, formula.unit),
      note: formula.note
    };
  });
}
