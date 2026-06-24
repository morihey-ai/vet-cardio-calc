import formulas from "../config/formulas.json";
import { evaluateFormula, formatValue } from "../lib/formulaEngine";
import type { CalculationValue, EchoInput, FormulaDefinition, PatientInfo } from "../types";

const formulaList = formulas as FormulaDefinition[];

function getFormula(id: string): FormulaDefinition {
  const formula = formulaList.find((item) => item.id === id);
  if (!formula) throw new Error(`${id} formula is missing`);
  return formula;
}

function valueItem(id: string, value: number | null): CalculationValue {
  const formula = getFormula(id);
  return {
    id,
    label: formula.label,
    value,
    unit: formula.unit,
    formatted: formatValue(value, formula.precision, formula.unit),
    note: formula.note
  };
}

export function calculateEcho(patient: PatientInfo, input: EchoInput): CalculationValue[] {
  const lviddn = evaluateFormula(getFormula("lviddn"), {
    species: patient.species,
    lviddCm: input.lviddCm,
    bodyWeightKg: patient.bodyWeightKg
  });
  const laAo = evaluateFormula(getFormula("laAo"), {
    laDiameterCm: input.laDiameterCm,
    aoDiameterCm: input.aoDiameterCm
  });
  const fsPercent = evaluateFormula(getFormula("fsPercent"), {
    lviddCm: input.lviddCm,
    lvidsCm: input.lvidsCm
  });
  const laFs = evaluateFormula(getFormula("laFs"), {
    laMaxCm: input.laMaxCm,
    laMinCm: input.laMinCm
  });
  const vtiRatio = evaluateFormula(getFormula("vtiRatio"), {
    mvVtiCm: input.mvVtiCm,
    lvotVtiCm: input.lvotVtiCm
  });
  const mvStrokeVolumeMl = evaluateFormula(getFormula("strokeVolume"), {
    diameterCm: input.mvDiameterCm,
    vtiCm: input.mvVtiCm
  });
  const lvotStrokeVolumeMl = evaluateFormula(getFormula("strokeVolume"), {
    diameterCm: input.lvotDiameterCm,
    vtiCm: input.lvotVtiCm
  });
  const rVolMl = evaluateFormula(getFormula("rVol"), {
    mvStrokeVolumeMl,
    lvotStrokeVolumeMl
  });
  const trpg = evaluateFormula(getFormula("trpg"), {
    trVelocityMps: input.trVelocityMps
  });
  const atEt = evaluateFormula(getFormula("atEt"), {
    atMs: input.atMs,
    etMs: input.etMs
  });
  const pvSd = evaluateFormula(getFormula("pulmonaryVeinSd"), {
    sWaveCmS: input.sWaveCmS,
    dWaveCmS: input.dWaveCmS
  });
  const mvRrVti = evaluateFormula(getFormula("rrCorrectedVti"), {
    vtiCm: input.mvVtiCm,
    rrIntervalSec: input.rrIntervalSec
  });
  const lvotRrVti = evaluateFormula(getFormula("rrCorrectedVti"), {
    vtiCm: input.lvotVtiCm,
    rrIntervalSec: input.rrIntervalSec
  });

  return [
    valueItem("lviddn", lviddn),
    valueItem("laAo", laAo),
    valueItem("fsPercent", fsPercent),
    {
      id: "eVelMps",
      label: "E-vel",
      value: input.eVelMps,
      unit: "m/s",
      formatted: formatValue(input.eVelMps, 2, "m/s"),
      note: "E-wave transmitral peak velocity."
    },
    valueItem("laFs", laFs),
    valueItem("vtiRatio", vtiRatio),
    {
      ...valueItem("strokeVolume", mvStrokeVolumeMl),
      id: "mvStrokeVolume",
      label: "MV stroke volume"
    },
    {
      ...valueItem("strokeVolume", lvotStrokeVolumeMl),
      id: "lvotStrokeVolume",
      label: "LVOT stroke volume"
    },
    valueItem("rVol", rVolMl),
    valueItem("rVolKg", evaluateFormula(getFormula("rVolKg"), { rVolMl, bodyWeightKg: patient.bodyWeightKg })),
    valueItem("rf", evaluateFormula(getFormula("rf"), { rVolMl, mvStrokeVolumeMl })),
    valueItem("trpg", trpg),
    valueItem("atEt", atEt),
    valueItem("pulmonaryVeinSd", pvSd),
    {
      ...valueItem("rrCorrectedVti", mvRrVti),
      id: "mvRrCorrectedVti",
      label: "MV R-R補正VTI"
    },
    {
      ...valueItem("rrCorrectedVti", lvotRrVti),
      id: "lvotRrCorrectedVti",
      label: "LVOT R-R補正VTI"
    },
    valueItem("pvRecho", evaluateFormula(getFormula("pvRecho"), {
      trVelocityMps: input.trVelocityMps,
      pvVtiCm: input.pvVtiCm
    })),
    valueItem("pvRecho2", evaluateFormula(getFormula("pvRecho2"), {
      trVelocityMps: input.trVelocityMps,
      pvVtiCm: input.pvVtiCm,
      trpgMmHg: trpg
    }))
  ];
}
