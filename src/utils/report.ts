import type { CalculationValue, ExamRecord } from "../types";

function find(values: CalculationValue[], id: string): string {
  return values.find((item) => item.id === id)?.formatted ?? "未計算";
}

export function buildClinicalText(record: ExamRecord, values: CalculationValue[]): string {
  return [
    `${record.patient.caseId} ${record.patient.species} ${record.patient.breed}`,
    `BW ${record.patient.bodyWeightKg} kg、HR ${record.patient.heartRateBpm}/min、SBP ${record.patient.systolicBpMmHg} mmHg。`,
    `Echo: LVIDDN ${find(values, "lviddn")}、LA/Ao ${find(values, "laAo")}、MV/LVOT VTI ratio ${find(values, "vtiRatio")}、RVol/kg ${find(values, "rVolKg")}、RF ${find(values, "rf")}、TRPG ${find(values, "trpg")}。`,
    "本記載は計算値の転記補助であり、診断・治療推奨ではない。"
  ].join(" ");
}

export function diffFromPrevious(current: CalculationValue[], previous: CalculationValue[]): Record<string, number | null> {
  const prevMap = new Map(previous.map((item) => [item.id, item.value]));
  return Object.fromEntries(
    current.map((item) => {
      const prev = prevMap.get(item.id);
      if (item.value === null || prev === null || prev === undefined) return [item.id, null];
      return [item.id, item.value - prev];
    })
  );
}
