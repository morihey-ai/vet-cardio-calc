import scoreRules from "../config/scoreRules.json";
import type { ManualScoreOption, ScoreConfig, ScoreConfigItem, ScoreRule } from "../types";

export interface ScoreItemResult {
  key: string;
  label: string;
  value: unknown;
  points: number | null;
  maxPoints: number;
  reason: string;
  missing: boolean;
}

export interface ScoreResult {
  id: string;
  label: string;
  total: number | null;
  maxTotal: number;
  classLabel: string;
  source: string;
  items: ScoreItemResult[];
  note: string;
}

function matchRule(value: unknown, rule: ScoreRule): boolean {
  if (rule.equals !== undefined) return value === rule.equals;
  if (typeof value !== "number" || Number.isNaN(value)) return false;
  if (rule.minExclusive !== undefined && value <= rule.minExclusive) return false;
  if (rule.min !== undefined && value < rule.min) return false;
  if (rule.maxExclusive !== undefined && value >= rule.maxExclusive) return false;
  if (rule.max !== undefined && value > rule.max) return false;
  return true;
}

function classify(score: ScoreConfig, total: number | null): string {
  if (total === null) return "未集計";
  return score.classes.find((item) => total >= item.min && total <= item.max)?.label ?? "分類外";
}

function maxPointsForItem(item: ScoreConfigItem): number {
  const numericPoints = item.rules?.map((rule) => rule.points) ?? [];
  const manualPoints = item.options?.map((option: ManualScoreOption) => option.points) ?? [];
  return Math.max(0, ...numericPoints, ...manualPoints);
}

export function calculateScores(values: Record<string, unknown>): ScoreResult[] {
  return (scoreRules as ScoreConfig[]).map((score) => {
    const items = score.items.map((item) => {
      const value = values[item.key];
      const maxPoints = maxPointsForItem(item);
      if (value === null || value === undefined || value === "") {
        return {
          key: item.key,
          label: item.label,
          value,
          points: null,
          maxPoints,
          reason: "未入力",
          missing: true
        };
      }
      if (score.type === "manual") {
        const option = item.options?.find((candidate) => candidate.value === value);
        return {
          key: item.key,
          label: item.label,
          value,
          points: option ? option.points : null,
          maxPoints,
          reason: option ? option.reason : "選択肢未設定",
          missing: !option
        };
      }
      if (!item.rules || item.rules.length === 0) {
        return {
          key: item.key,
          label: item.label,
          value,
          points: null,
          maxPoints,
          reason: "カットオフ未設定",
          missing: false
        };
      }
      const rule = item.rules.find((candidate) => matchRule(value, candidate));
      return {
        key: item.key,
        label: item.label,
        value,
        points: rule ? rule.points : null,
        maxPoints,
        reason: rule ? rule.reason : "該当ルールなし",
        missing: false
      };
    });
    const scored = items.filter((item) => item.points !== null);
    const maxTotal = items.reduce((sum, item) => sum + item.maxPoints, 0);
    const total =
      scored.length === items.length ? scored.reduce((sum, item) => sum + (item.points ?? 0), 0) : null;
    return {
      id: score.id,
      label: score.label,
      total,
      maxTotal,
      classLabel: classify(score, total),
      source: score.source,
      items,
      note: score.note
    };
  });
}
