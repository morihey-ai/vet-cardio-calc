export type Species = "犬" | "猫";

export type Sex = "オス" | "メス" | "不明";

export interface PatientInfo {
  caseId: string;
  species: Species;
  breed: string;
  sex: Sex;
  neutered: boolean;
  birthDate: string;
  examDate: string;
  bodyWeightKg: number;
  bcs: number;
  heartRateBpm: number;
  systolicBpMmHg: number;
}

export interface DosageInput {
  doseMgPerKg: number;
  dosesPerDay: number;
  tabletStrengthMg: number;
  concentrationMgPerMl: number;
}

export interface ActualDoseInput {
  drugId: string;
  customDrugName: string;
  tabletStrengthMg: number;
  tabletFraction: number;
  dosesPerDay: number;
}

export interface NutritionInput {
  derFactor: number;
  kcalPerGram: number;
}

export interface EchoInput {
  lviddCm: number;
  lvidsCm: number;
  eVelMps: number;
  laDiameterCm: number;
  aoDiameterCm: number;
  laMaxCm: number;
  laMinCm: number;
  mvVtiCm: number;
  lvotVtiCm: number;
  mvDiameterCm: number;
  lvotDiameterCm: number;
  rrIntervalSec: number;
  trVelocityMps: number;
  pvVtiCm: number;
  atMs: number;
  etMs: number;
  sWaveCmS: number;
  dWaveCmS: number;
}

export type LaFsViewKey = "rp4c" | "plax" | "sax" | "a4c";

export interface LaFsViewInput {
  laMaxCm: number;
  laMinCm: number;
}

export type LaFsViewsInput = Record<LaFsViewKey, LaFsViewInput>;

export interface PhScoreInput {
  phRvWall: string;
  phRvDilatation: string;
  phRaEnlargement: string;
  phIvsFlattening: string;
  phPaEnlargement: string;
  phRvotNotching: string;
}

export interface DirectMetricInput {
  laAo: number | null;
  lviddn: number | null;
  fsPercent: number | null;
  eVelMps: number | null;
  laFs: number | null;
}

export interface ExamRecord {
  id: string;
  patient: PatientInfo;
  dosage: DosageInput;
  actualDose: ActualDoseInput;
  nutrition: NutritionInput;
  echo: EchoInput;
  laFsViews: LaFsViewsInput;
  phScore: PhScoreInput;
  directMetrics: DirectMetricInput;
  createdAt: string;
}

export interface FormulaDefinition {
  id: string;
  label: string;
  category: string;
  expression: string | null;
  variables: string[];
  unit: string;
  precision: number;
  note: string;
}

export interface CalculationValue {
  id: string;
  label: string;
  value: number | null;
  unit: string;
  formatted: string;
  note?: string;
}

export interface ScoreRule {
  min?: number;
  minExclusive?: number;
  max?: number;
  maxExclusive?: number;
  equals?: string | number | boolean;
  points: number;
  reason: string;
}

export interface ManualScoreOption {
  value: string;
  points: number;
  reason: string;
}

export interface ScoreConfigItem {
  key: string;
  label: string;
  rules?: ScoreRule[];
  options?: ManualScoreOption[];
}

export interface ScoreClass {
  min: number;
  max: number;
  label: string;
}

export interface ScoreConfig {
  id: string;
  label: string;
  type: "numeric" | "manual";
  source: string;
  items: ScoreConfigItem[];
  classes: ScoreClass[];
  note: string;
}
