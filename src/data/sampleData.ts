import type { ExamRecord } from "../types";

export const sampleRecords: ExamRecord[] = [
  {
    id: "sample-2026-05-20",
    createdAt: "2026-05-20T09:00:00.000Z",
    patient: {
      caseId: "DEMO-001",
      species: "犬",
      breed: "Cavalier King Charles Spaniel",
      sex: "オス",
      neutered: true,
      birthDate: "2018-04-12",
      examDate: "2026-05-20",
      bodyWeightKg: 7.8,
      bcs: 5,
      heartRateBpm: 128,
      systolicBpMmHg: 142
    },
    dosage: {
      doseMgPerKg: 1,
      dosesPerDay: 2,
      tabletStrengthMg: 5,
      concentrationMgPerMl: 2
    },
    actualDose: {
      drugId: "pimobendan-tablet",
      customDrugName: "",
      tabletStrengthMg: 5,
      tabletFraction: 0.25,
      dosesPerDay: 2
    },
    nutrition: {
      derFactor: 1.4,
      kcalPerGram: 3.6
    },
    echo: {
      lviddCm: 3.4,
      lvidsCm: 1.75,
      eVelMps: 1.15,
      laDiameterCm: 2.1,
      aoDiameterCm: 1.1,
      laMaxCm: 2.3,
      laMinCm: 1.6,
      mvVtiCm: 17,
      lvotVtiCm: 12,
      mvDiameterCm: 1.9,
      lvotDiameterCm: 1.1,
      rrIntervalSec: 0.47,
      trVelocityMps: 2.7,
      pvVtiCm: 10,
      atMs: 55,
      etMs: 180,
      sWaveCmS: 35,
      dWaveCmS: 48
    },
    phScore: {
      phRvWall: "normal",
      phRvDilatation: "normal",
      phRaEnlargement: "normal",
      phIvsFlattening: "normal",
      phPaEnlargement: "mild",
      phRvotNotching: "normal"
    },
    directMetrics: {
      laAo: null,
      lviddn: null,
      fsPercent: null,
      eVelMps: null,
      laFs: null
    }
  },
  {
    id: "sample-2026-06-24",
    createdAt: "2026-06-24T09:00:00.000Z",
    patient: {
      caseId: "DEMO-001",
      species: "犬",
      breed: "Cavalier King Charles Spaniel",
      sex: "オス",
      neutered: true,
      birthDate: "2018-04-12",
      examDate: "2026-06-24",
      bodyWeightKg: 7.6,
      bcs: 5,
      heartRateBpm: 136,
      systolicBpMmHg: 146
    },
    dosage: {
      doseMgPerKg: 1,
      dosesPerDay: 2,
      tabletStrengthMg: 5,
      concentrationMgPerMl: 2
    },
    actualDose: {
      drugId: "pimobendan-tablet",
      customDrugName: "",
      tabletStrengthMg: 5,
      tabletFraction: 0.25,
      dosesPerDay: 2
    },
    nutrition: {
      derFactor: 1.4,
      kcalPerGram: 3.6
    },
    echo: {
      lviddCm: 3.55,
      lvidsCm: 1.7,
      eVelMps: 1.32,
      laDiameterCm: 2.22,
      aoDiameterCm: 1.08,
      laMaxCm: 2.4,
      laMinCm: 1.62,
      mvVtiCm: 18,
      lvotVtiCm: 11.8,
      mvDiameterCm: 1.9,
      lvotDiameterCm: 1.1,
      rrIntervalSec: 0.44,
      trVelocityMps: 2.9,
      pvVtiCm: 9.8,
      atMs: 52,
      etMs: 178,
      sWaveCmS: 32,
      dWaveCmS: 50
    },
    phScore: {
      phRvWall: "mild",
      phRvDilatation: "mild",
      phRaEnlargement: "normal",
      phIvsFlattening: "subtleMild",
      phPaEnlargement: "mild",
      phRvotNotching: "normal"
    },
    directMetrics: {
      laAo: null,
      lviddn: null,
      fsPercent: null,
      eVelMps: null,
      laFs: null
    }
  }
];
