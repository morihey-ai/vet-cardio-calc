import formulas from "../config/formulas.json";
import { evaluateFormula, formatValue } from "../lib/formulaEngine";
import type { ActualDoseInput, CalculationValue, DosageInput, FormulaDefinition, PatientInfo } from "../types";

const formulaList = formulas as FormulaDefinition[];

function getFormula(id: string): FormulaDefinition {
  const formula = formulaList.find((item) => item.id === id);
  if (!formula) throw new Error(`${id} formula is missing`);
  return formula;
}

export function validateDosageUnits(input: DosageInput): string[] {
  const messages: string[] = [];
  if (input.doseMgPerKg <= 0) messages.push("mg/kgは0より大きい値で入力してください。");
  if (!Number.isInteger(input.dosesPerDay) || input.dosesPerDay <= 0) {
    messages.push("投与回数は1以上の整数で入力してください。");
  }
  if (input.tabletStrengthMg <= 0) messages.push("錠剤規格はmg/錠で入力してください。");
  if (input.concentrationMgPerMl <= 0) {
    messages.push("液剤濃度はmg/mLで入力してください。");
  }
  return messages;
}

export function calculateDosage(patient: PatientInfo, input: DosageInput): CalculationValue[] {
  const singleFormula = getFormula("singleDoseMg");
  const singleDoseMg = evaluateFormula(singleFormula, {
    bodyWeightKg: patient.bodyWeightKg,
    doseMgPerKg: input.doseMgPerKg
  });
  const shared = {
    bodyWeightKg: patient.bodyWeightKg,
    doseMgPerKg: input.doseMgPerKg,
    dosesPerDay: input.dosesPerDay,
    tabletStrengthMg: input.tabletStrengthMg,
    concentrationMgPerMl: input.concentrationMgPerMl,
    singleDoseMg
  };
  return ["singleDoseMg", "dailyDoseMg", "tabletCount", "liquidVolumeMl"].map((id) => {
    const formula = getFormula(id);
    const value = id === "singleDoseMg" ? singleDoseMg : evaluateFormula(formula, shared);
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

export function calculateActualDose(patient: PatientInfo, input: ActualDoseInput): CalculationValue[] {
  const singleDoseMg = input.tabletStrengthMg * input.tabletFraction;
  const dailyDoseMg = singleDoseMg * input.dosesPerDay;
  const singleDoseMgKg = patient.bodyWeightKg > 0 ? singleDoseMg / patient.bodyWeightKg : null;
  const dailyDoseMgKg = patient.bodyWeightKg > 0 ? dailyDoseMg / patient.bodyWeightKg : null;
  return [
    {
      id: "actualSingleDoseMg",
      label: "実投与 1回量",
      value: singleDoseMg,
      unit: "mg",
      formatted: formatValue(singleDoseMg, 3, "mg"),
      note: "錠剤規格 x 錠数/分割数"
    },
    {
      id: "actualDailyDoseMg",
      label: "実投与 1日量",
      value: dailyDoseMg,
      unit: "mg/day",
      formatted: formatValue(dailyDoseMg, 3, "mg/day"),
      note: "1回量 x 投与回数"
    },
    {
      id: "actualSingleDoseMgKg",
      label: "実投与 mg/kg/回",
      value: singleDoseMgKg,
      unit: "mg/kg/dose",
      formatted: formatValue(singleDoseMgKg, 4, "mg/kg/dose"),
      note: "1回量を体重で除算"
    },
    {
      id: "actualDailyDoseMgKg",
      label: "実投与 mg/kg/day",
      value: dailyDoseMgKg,
      unit: "mg/kg/day",
      formatted: formatValue(dailyDoseMgKg, 4, "mg/kg/day"),
      note: "1日量を体重で除算"
    }
  ];
}
