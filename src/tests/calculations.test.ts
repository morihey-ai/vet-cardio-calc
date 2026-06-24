import { describe, expect, it } from "vitest";
import { calculateActualDose, calculateDosage } from "../calculations/dosage";
import { calculateEcho } from "../calculations/echo";
import { calculateNutrition } from "../calculations/nutrition";
import { calculateAge } from "../calculations/patient";
import { calculateScores } from "../calculations/scores";
import { sampleRecords } from "../data/sampleData";

const record = sampleRecords[1];

function value(id: string, items: { id: string; value: number | null }[]): number {
  const found = items.find((item) => item.id === id)?.value;
  if (found === null || found === undefined) throw new Error(`${id} was not calculated`);
  return found;
}

describe("patient calculations", () => {
  it("calculates age from birth date and exam date", () => {
    expect(calculateAge(record.patient).value).toBeCloseTo(8.2, 1);
  });
});

describe("dosage calculations", () => {
  it("calculates single dose, daily dose, tablets, and liquid volume", () => {
    const results = calculateDosage(record.patient, record.dosage);
    expect(value("singleDoseMg", results)).toBeCloseTo(7.6, 2);
    expect(value("dailyDoseMg", results)).toBeCloseTo(15.2, 2);
    expect(value("tabletCount", results)).toBeCloseTo(1.52, 2);
    expect(value("liquidVolumeMl", results)).toBeCloseTo(3.8, 2);
  });

  it("calculates actual mg/kg from tablet fraction and frequency", () => {
    const results = calculateActualDose({ ...record.patient, bodyWeightKg: 4 }, {
      drugId: "pimobendan-tablet",
      customDrugName: "",
      tabletStrengthMg: 5,
      tabletFraction: 0.25,
      dosesPerDay: 2
    });
    expect(value("actualSingleDoseMg", results)).toBeCloseTo(1.25, 3);
    expect(value("actualSingleDoseMgKg", results)).toBeCloseTo(0.3125, 4);
    expect(value("actualDailyDoseMgKg", results)).toBeCloseTo(0.625, 4);
  });
});

describe("nutrition calculations", () => {
  it("calculates RER, DER, and daily food amount", () => {
    const results = calculateNutrition(record.patient, record.nutrition);
    expect(value("rer", results)).toBeCloseTo(320.41, 2);
    expect(value("der", results)).toBeCloseTo(448.58, 2);
    expect(value("foodAmountG", results)).toBeCloseTo(125, 0);
  });
});

describe("echo calculations", () => {
  it("calculates core echo indices", () => {
    const results = calculateEcho(record.patient, record.echo);
    expect(value("lviddn", results)).toBeCloseTo(1.956, 3);
    expect(value("laAo", results)).toBeCloseTo(2.06, 2);
    expect(value("fsPercent", results)).toBeCloseTo(52.1, 1);
    expect(value("laFs", results)).toBeCloseTo(32.5, 1);
    expect(value("vtiRatio", results)).toBeCloseTo(1.53, 2);
    expect(value("trpg", results)).toBeCloseTo(33.6, 1);
    expect(value("atEt", results)).toBeCloseTo(0.29, 2);
  });

  it("uses the feline 0.33 exponent for LVIDDN", () => {
    const results = calculateEcho({ ...record.patient, species: "猫" }, record.echo);
    expect(value("lviddn", results)).toBeCloseTo(1.82, 2);
  });

  it("calculates PVRecho and PVRecho2 from TR velocity and PV VTI", () => {
    const results = calculateEcho(record.patient, record.echo);
    expect(value("pvRecho", results)).toBeCloseTo(0.296, 3);
    expect(value("pvRecho2", results)).toBeCloseTo(0.858, 3);
  });
});

describe("score calculations", () => {
  it("calculates MINE score 1 and 2 from numeric cutoffs", () => {
    const scores = calculateScores({ lviddn: 2.1, laAo: 2.0, fsPercent: 52, eVelMps: 1.6 });
    expect(scores.find((score) => score.id === "mine1")?.total).toBe(12);
    expect(scores.find((score) => score.id === "mine1")?.maxTotal).toBe(14);
    expect(scores.find((score) => score.id === "mine1")?.classLabel).toBe("重度（Severe）");
    expect(scores.find((score) => score.id === "mine1")?.items.find((item) => item.key === "laAo")?.maxPoints).toBe(4);
    expect(scores.find((score) => score.id === "mine2")?.total).toBe(9);
    expect(scores.find((score) => score.id === "mine2")?.maxTotal).toBe(11);
    expect(scores.find((score) => score.id === "mine2")?.classLabel).toBe("重度（Severe）");
  });

  it("calculates PH score from visual categories", () => {
    const scores = calculateScores({
      phRvWall: "mild",
      phRvDilatation: "mild",
      phRaEnlargement: "moderate",
      phIvsFlattening: "subtleMild",
      phPaEnlargement: "moderate",
      phRvotNotching: "abnormal"
    });
    const ph = scores.find((score) => score.id === "ph");
    expect(ph?.total).toBe(14);
    expect(ph?.maxTotal).toBe(25);
    expect(ph?.classLabel).toBe("pTRV >= 4.3 m/s相当");
  });
});
