import { Activity, Download, FileText, HeartPulse, Save, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { calculateActualDose, calculateDosage, validateDosageUnits } from "./calculations/dosage";
import { calculateEcho } from "./calculations/echo";
import { calculateNutrition, validateNutritionUnits } from "./calculations/nutrition";
import { calculateAge } from "./calculations/patient";
import { calculateScores } from "./calculations/scores";
import { appNotice } from "./config/appNotice";
import breeds from "./config/breeds.json";
import drugPresets from "./config/drugPresets.json";
import formulas from "./config/formulas.json";
import scoreRules from "./config/scoreRules.json";
import { sampleRecords } from "./data/sampleData";
import { seedIfEmpty, getRecords, saveRecord } from "./storage/db";
import type { CalculationValue, DirectMetricInput, EchoInput, ExamRecord, FormulaDefinition, LaFsViewKey, LaFsViewsInput, ManualScoreOption, PhScoreInput, ScoreConfig, Species } from "./types";
import { buildCsv, downloadCsv } from "./utils/csv";
import { buildClinicalText, diffFromPrevious } from "./utils/report";

const defaultRecord = sampleRecords.at(-1)!;
const scoreConfigList = scoreRules as ScoreConfig[];
type FocusView = "all" | "direct" | "mine" | "ph" | "lafs";

const quickViews: Array<{ id: FocusView; label: string }> = [
  { id: "all", label: "全体" },
  { id: "direct", label: "直接入力" },
  { id: "mine", label: "MINE" },
  { id: "ph", label: "PH" },
  { id: "lafs", label: "LA-FS" }
];

const laFsViewLabels: Record<LaFsViewKey, string> = {
  rp4c: "RP4C",
  plax: "PLAX",
  sax: "SAx",
  a4c: "A4C"
};

function normalizeRecord(record: ExamRecord): ExamRecord {
  return {
    ...defaultRecord,
    ...record,
    patient: { ...defaultRecord.patient, ...record.patient },
    dosage: { ...defaultRecord.dosage, ...record.dosage },
    actualDose: { ...defaultRecord.actualDose, ...record.actualDose },
    nutrition: { ...defaultRecord.nutrition, ...record.nutrition },
    echo: { ...defaultRecord.echo, ...record.echo },
    laFsViews: { ...defaultRecord.laFsViews, ...record.laFsViews },
    phScore: { ...defaultRecord.phScore, ...record.phScore },
    directMetrics: { ...defaultRecord.directMetrics, ...record.directMetrics }
  };
}

function NumberInput({
  label,
  value,
  unit,
  onChange
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="unit-input">
        <input type="number" value={value} step="any" onChange={(event) => onChange(Number(event.target.value))} />
        <b>{unit}</b>
      </div>
    </label>
  );
}

function OptionalNumberInput({
  label,
  value,
  unit,
  onChange
}: {
  label: string;
  value: number | null;
  unit: string;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="unit-input">
        <input
          type="number"
          value={value ?? ""}
          step="any"
          placeholder="未入力"
          onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
        />
        <b>{unit}</b>
      </div>
    </label>
  );
}

function ValueGrid({
  title,
  values,
  diffs
}: {
  title: string;
  values: CalculationValue[];
  diffs?: Record<string, number | null>;
}) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className="value-grid">
        {values.map((item) => (
          <div className="metric" key={item.id} title={item.note}>
            <span>{item.label}</span>
            <strong>{item.formatted}</strong>
            {diffs && diffs[item.id] !== undefined && (
              <small>{diffs[item.id] === null ? "前回差なし" : `前回差 ${diffs[item.id]!.toFixed(2)}`}</small>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ScoreCards({ scores }: { scores: ReturnType<typeof calculateScores> }) {
  function formatScoreValue(value: unknown): string {
    if (typeof value === "number") return Number.isInteger(value) ? value.toString() : value.toFixed(2);
    if (typeof value === "string" && value.length > 0) return value;
    return "未入力";
  }

  return (
    <div className="score-grid">
      {scores.map((score) => (
        <div className="score-card" key={score.id}>
          <strong>{score.label}</strong>
          <span>{score.total === null ? `未集計 / ${score.maxTotal}点満点` : `${score.total}点/${score.maxTotal}点 ${score.classLabel}`}</span>
          {score.items.map((item) => (
            <small key={item.key}>
              {item.label}: {formatScoreValue(item.value)} → {item.points ?? "-"}
              /{item.maxPoints}点 / {item.reason}
            </small>
          ))}
          <em>{score.source}</em>
          <em>{score.note}</em>
        </div>
      ))}
    </div>
  );
}

function FormulaLibrary() {
  const items = formulas as FormulaDefinition[];
  return (
    <section className="panel formula-panel">
      <h2>式ライブラリ</h2>
      <div className="formula-list">
        {items.map((item) => (
          <details key={item.id}>
            <summary>
              <span>{item.label}</span>
              <code>{item.id}</code>
            </summary>
            <p>{item.expression ?? "未設定"}</p>
            <small>{item.note}</small>
          </details>
        ))}
      </div>
    </section>
  );
}

function buildValues(record: ExamRecord): CalculationValue[] {
  return [
    calculateAge(record.patient),
    ...calculateDosage(record.patient, record.dosage),
    ...calculateActualDose(record.patient, record.actualDose),
    ...calculateNutrition(record.patient, record.nutrition),
    ...calculateEcho(record.patient, record.echo, record.laFsViews)
  ];
}

function patchEcho(record: ExamRecord, key: keyof EchoInput, value: number): ExamRecord {
  return { ...record, echo: { ...record.echo, [key]: value } };
}

function patchDirectMetric(record: ExamRecord, key: keyof DirectMetricInput, value: number | null): ExamRecord {
  return { ...record, directMetrics: { ...record.directMetrics, [key]: value } };
}

function patchLaFsView(record: ExamRecord, viewKey: LaFsViewKey, key: keyof LaFsViewsInput[LaFsViewKey], value: number): ExamRecord {
  return {
    ...record,
    laFsViews: {
      ...record.laFsViews,
      [viewKey]: {
        ...record.laFsViews[viewKey],
        [key]: value
      }
    }
  };
}

function phOptionsFor(key: keyof PhScoreInput) {
  const ph = scoreConfigList.find((score) => score.id === "ph");
  return ph?.items.find((item) => item.key === key)?.options ?? [];
}

export default function App() {
  const [records, setRecords] = useState<ExamRecord[]>(sampleRecords.map(normalizeRecord));
  const [currentId, setCurrentId] = useState(defaultRecord.id);
  const [view, setView] = useState<FocusView>("all");
  const current = normalizeRecord(records.find((record) => record.id === currentId) ?? records.at(-1) ?? defaultRecord);
  const previous = records
    .map(normalizeRecord)
    .filter((record) => record.patient.caseId === current.patient.caseId && record.patient.examDate < current.patient.examDate)
    .at(-1);
  const selectedDrug = drugPresets.find((drug) => drug.id === current.actualDose.drugId) ?? drugPresets[0];
  const breedOptions = (breeds as Record<Species, string[]>)[current.patient.species] ?? [];

  useEffect(() => {
    seedIfEmpty()
      .then(getRecords)
      .then((loaded) => {
        const normalized = loaded.map(normalizeRecord);
        setRecords(normalized);
        setCurrentId(normalized.at(-1)?.id ?? defaultRecord.id);
      })
      .catch(() => setRecords(sampleRecords.map(normalizeRecord)));
  }, []);

  const values = useMemo(() => buildValues(current), [current]);
  const previousValues = useMemo(() => (previous ? buildValues(previous) : []), [previous]);
  const diffs = useMemo(() => diffFromPrevious(values, previousValues), [values, previousValues]);
  const dosageWarnings = validateDosageUnits(current.dosage);
  const nutritionWarnings = validateNutritionUnits(current.nutrition);
  const valueMap = Object.fromEntries(values.map((item) => [item.id, item.value]));
  const scoringValues = {
    ...valueMap,
    laAo: current.directMetrics.laAo ?? valueMap.laAo,
    lviddn: current.directMetrics.lviddn ?? valueMap.lviddn,
    fsPercent: current.directMetrics.fsPercent ?? valueMap.fsPercent,
    eVelMps: current.directMetrics.eVelMps ?? valueMap.eVelMps,
    laFs: current.directMetrics.laFs ?? valueMap.laFs
  };
  const scoreResults = calculateScores({
    ...scoringValues,
    trVelocityMps: current.echo.trVelocityMps,
    ...current.phScore
  });
  const directValues: CalculationValue[] = [
    { id: "directLaAo", label: "直接入力 LA/Ao", value: current.directMetrics.laAo, unit: "", formatted: current.directMetrics.laAo === null ? "未入力" : current.directMetrics.laAo.toFixed(2), note: "機械表示値をそのまま入力" },
    { id: "directLviddn", label: "直接入力 LVIDDN", value: current.directMetrics.lviddn, unit: "", formatted: current.directMetrics.lviddn === null ? "未入力" : current.directMetrics.lviddn.toFixed(2), note: "機械表示値をそのまま入力" },
    { id: "directFsPercent", label: "直接入力 FS%", value: current.directMetrics.fsPercent, unit: "%", formatted: current.directMetrics.fsPercent === null ? "未入力" : `${current.directMetrics.fsPercent.toFixed(1)} %`, note: "機械表示値をそのまま入力" },
    { id: "directEVel", label: "直接入力 E-vel", value: current.directMetrics.eVelMps, unit: "m/s", formatted: current.directMetrics.eVelMps === null ? "未入力" : `${current.directMetrics.eVelMps.toFixed(2)} m/s`, note: "機械表示値をそのまま入力" },
    { id: "directLaFs", label: "直接入力 LA-FS", value: current.directMetrics.laFs, unit: "%", formatted: current.directMetrics.laFs === null ? "未入力" : `${current.directMetrics.laFs.toFixed(1)} %`, note: "機械表示値をそのまま入力" }
  ];
  const mineValues = [
    { ...values.find((item) => item.id === "laAo")!, value: scoringValues.laAo as number | null, formatted: current.directMetrics.laAo === null ? values.find((item) => item.id === "laAo")!.formatted : `${current.directMetrics.laAo.toFixed(2)}（直接）` },
    { ...values.find((item) => item.id === "lviddn")!, value: scoringValues.lviddn as number | null, formatted: current.directMetrics.lviddn === null ? values.find((item) => item.id === "lviddn")!.formatted : `${current.directMetrics.lviddn.toFixed(2)}（直接）` },
    { ...values.find((item) => item.id === "fsPercent")!, value: scoringValues.fsPercent as number | null, formatted: current.directMetrics.fsPercent === null ? values.find((item) => item.id === "fsPercent")!.formatted : `${current.directMetrics.fsPercent.toFixed(1)} %（直接）` },
    { ...values.find((item) => item.id === "eVelMps")!, value: scoringValues.eVelMps as number | null, formatted: current.directMetrics.eVelMps === null ? values.find((item) => item.id === "eVelMps")!.formatted : `${current.directMetrics.eVelMps.toFixed(2)} m/s（直接）` }
  ];
  const laFsValues = [
    { ...values.find((item) => item.id === "laFs")!, value: scoringValues.laFs as number | null, formatted: current.directMetrics.laFs === null ? values.find((item) => item.id === "laFs")!.formatted : `${current.directMetrics.laFs.toFixed(1)} %（直接）` }
  ];
  const laFsViewValues = values.filter((item) => item.id.startsWith("laFs-"));
  const phValues = values.filter((item) => ["trpg", "atEt", "pvRecho", "pvRecho2"].includes(item.id));
  const mineScores = scoreResults.filter((score) => ["mine1", "mine2"].includes(score.id));
  const phScores = scoreResults.filter((score) => score.id === "ph");
  const clinicalText = buildClinicalText(current, values);

  function updateCurrent(next: ExamRecord) {
    setRecords((items) => items.map((item) => (item.id === next.id ? normalizeRecord(next) : item)));
  }

  async function handleSave() {
    await saveRecord(current);
    setRecords((await getRecords()).map(normalizeRecord));
  }

  function handleCsv() {
    downloadCsv(`${current.patient.caseId}-${current.patient.examDate}.csv`, buildCsv(current, values));
  }

  return (
    <main>
      <header className="app-header">
        <div>
          <p className="eyebrow">Local PWA / IndexedDB</p>
          <h1>Vet Cardio Calc</h1>
          <p>{appNotice}</p>
        </div>
        <div className="header-actions">
          <button onClick={handleSave} title="この検査をブラウザ内に保存">
            <Save size={18} /> 保存
          </button>
          <button onClick={handleCsv} title="CSVを書き出し">
            <Download size={18} /> CSV
          </button>
        </div>
      </header>

      <nav className="record-tabs" aria-label="検査日">
        {records.map((record) => (
          <button className={record.id === current.id ? "active" : ""} key={record.id} onClick={() => setCurrentId(record.id)}>
            {record.patient.examDate}
          </button>
        ))}
      </nav>

      <nav className="quick-tabs" aria-label="表示切り替え">
        {quickViews.map((item) => (
          <button className={view === item.id ? "active" : ""} key={item.id} onClick={() => setView(item.id)}>
            {item.label}
          </button>
        ))}
      </nav>

      {view === "direct" && (
        <>
          <section className="panel focus-panel">
            <p className="eyebrow">Quick View</p>
            <h2>機械出力値の直接入力</h2>
            <p>エコー機械やレポートに出ているLA/Ao、LVIDDN、FS%、E-vel、LA-FSをそのまま入力します。入力した項目はMINEやLA-FS表示で計算値より優先されます。</p>
          </section>
          <section className="panel">
            <h2>直接入力</h2>
            <div className="patient-grid compact">
              <OptionalNumberInput label="LA/Ao" value={current.directMetrics.laAo} unit="" onChange={(value) => updateCurrent(patchDirectMetric(current, "laAo", value))} />
              <OptionalNumberInput label="LVIDDN" value={current.directMetrics.lviddn} unit="" onChange={(value) => updateCurrent(patchDirectMetric(current, "lviddn", value))} />
              <OptionalNumberInput label="FS%" value={current.directMetrics.fsPercent} unit="%" onChange={(value) => updateCurrent(patchDirectMetric(current, "fsPercent", value))} />
              <OptionalNumberInput label="E-vel" value={current.directMetrics.eVelMps} unit="m/s" onChange={(value) => updateCurrent(patchDirectMetric(current, "eVelMps", value))} />
              <OptionalNumberInput label="LA-FS" value={current.directMetrics.laFs} unit="%" onChange={(value) => updateCurrent(patchDirectMetric(current, "laFs", value))} />
            </div>
            <p className="notice">空欄の項目は、従来どおり測定値から計算した値を使います。</p>
          </section>
          <ValueGrid title="直接入力値" values={directValues} />
          <section className="panel">
            <h2>MINE結果</h2>
            <ScoreCards scores={mineScores} />
          </section>
          <ValueGrid title="LA-FS結果" values={laFsValues} />
        </>
      )}

      {view === "mine" && (
        <>
          <section className="panel focus-panel">
            <p className="eyebrow">Quick View</p>
            <h2>MINE score 1 / 2</h2>
            <p>LA/Ao、LVIDDN、FS%、E-velを入力・確認して、MINE score 1/2をすぐ見ます。</p>
          </section>
          <section className="panel">
            <h2>MINE用入力</h2>
            <div className="patient-grid compact">
              <NumberInput label="LA" value={current.echo.laDiameterCm} unit="cm" onChange={(value) => updateCurrent(patchEcho(current, "laDiameterCm", value))} />
              <NumberInput label="Ao" value={current.echo.aoDiameterCm} unit="cm" onChange={(value) => updateCurrent(patchEcho(current, "aoDiameterCm", value))} />
              <NumberInput label="LVIDd" value={current.echo.lviddCm} unit="cm" onChange={(value) => updateCurrent(patchEcho(current, "lviddCm", value))} />
              <NumberInput label="LVIDs" value={current.echo.lvidsCm} unit="cm" onChange={(value) => updateCurrent(patchEcho(current, "lvidsCm", value))} />
              <NumberInput label="E-vel" value={current.echo.eVelMps} unit="m/s" onChange={(value) => updateCurrent(patchEcho(current, "eVelMps", value))} />
              <NumberInput label="体重" value={current.patient.bodyWeightKg} unit="kg" onChange={(value) => updateCurrent({ ...current, patient: { ...current.patient, bodyWeightKg: value } })} />
            </div>
          </section>
          <ValueGrid title="MINE関連計算値" values={mineValues} />
          <section className="panel">
            <h2>MINE結果</h2>
            <ScoreCards scores={mineScores} />
          </section>
        </>
      )}

      {view === "ph" && (
        <>
          <section className="panel focus-panel">
            <p className="eyebrow">Quick View</p>
            <h2>PH score</h2>
            <p>視覚評価6項目と関連するTRPG、AT/ETをまとめて確認します。</p>
          </section>
          <section className="panel">
            <h2>PH関連入力</h2>
            <div className="patient-grid compact">
              <NumberInput label="TR velocity" value={current.echo.trVelocityMps} unit="m/s" onChange={(value) => updateCurrent(patchEcho(current, "trVelocityMps", value))} />
              <NumberInput label="PV VTI" value={current.echo.pvVtiCm} unit="cm" onChange={(value) => updateCurrent(patchEcho(current, "pvVtiCm", value))} />
              <NumberInput label="AT" value={current.echo.atMs} unit="ms" onChange={(value) => updateCurrent(patchEcho(current, "atMs", value))} />
              <NumberInput label="ET" value={current.echo.etMs} unit="ms" onChange={(value) => updateCurrent(patchEcho(current, "etMs", value))} />
            </div>
          </section>
          <section className="panel">
            <h2>PH score 視覚評価</h2>
            <div className="patient-grid compact">
              {(Object.keys(current.phScore) as Array<keyof PhScoreInput>).map((key) => (
                <label className="field" key={key}>
                  <span>{scoreConfigList.find((score) => score.id === "ph")?.items.find((item) => item.key === key)?.label ?? key}</span>
                  <select value={current.phScore[key]} onChange={(event) => updateCurrent({ ...current, phScore: { ...current.phScore, [key]: event.target.value } })}>
                    {phOptionsFor(key).map((option: ManualScoreOption) => (
                      <option value={option.value} key={option.value}>{option.points}点 - {option.reason}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>
          <ValueGrid title="PH関連計算値" values={phValues} />
          <section className="panel">
            <h2>PH score結果</h2>
            <ScoreCards scores={phScores} />
          </section>
        </>
      )}

      {view === "lafs" && (
        <>
          <section className="panel focus-panel">
            <p className="eyebrow">Quick View</p>
            <h2>LA-FS</h2>
            <p>LA max / LA minからLA-FSをすぐ確認します。RP4C、PLAX、SAx、A4Cを別々に入力・保存できます。</p>
          </section>
          <section className="panel">
            <h2>代表LA-FS入力</h2>
            <div className="patient-grid compact">
              <NumberInput label="LA max" value={current.echo.laMaxCm} unit="cm" onChange={(value) => updateCurrent(patchEcho(current, "laMaxCm", value))} />
              <NumberInput label="LA min" value={current.echo.laMinCm} unit="cm" onChange={(value) => updateCurrent(patchEcho(current, "laMinCm", value))} />
            </div>
          </section>
          <ValueGrid title="代表LA-FS結果" values={laFsValues} />
          <section className="panel">
            <h2>ビュー別LA-FS入力</h2>
            <div className="view-input-grid">
              {(Object.keys(laFsViewLabels) as LaFsViewKey[]).map((viewKey) => (
                <div className="subpanel" key={viewKey}>
                  <h3>{laFsViewLabels[viewKey]}</h3>
                  <NumberInput label="LA max" value={current.laFsViews[viewKey].laMaxCm} unit="cm" onChange={(value) => updateCurrent(patchLaFsView(current, viewKey, "laMaxCm", value))} />
                  <NumberInput label="LA min" value={current.laFsViews[viewKey].laMinCm} unit="cm" onChange={(value) => updateCurrent(patchLaFsView(current, viewKey, "laMinCm", value))} />
                </div>
              ))}
            </div>
          </section>
          <ValueGrid title="ビュー別LA-FS結果" values={laFsViewValues} />
        </>
      )}

      {view === "all" && (
        <>
      <section className="panel patient-panel">
        <div className="section-title">
          <HeartPulse size={20} />
          <h2>患者共通情報</h2>
        </div>
        <div className="patient-grid">
          <label className="field">
            <span>症例番号</span>
            <input value={current.patient.caseId} onChange={(event) => updateCurrent({ ...current, patient: { ...current.patient, caseId: event.target.value } })} />
          </label>
          <label className="field">
            <span>種</span>
            <select value={current.patient.species} onChange={(event) => updateCurrent({ ...current, patient: { ...current.patient, species: event.target.value as Species, breed: "MIX" } })}>
              <option>犬</option>
              <option>猫</option>
            </select>
          </label>
          <label className="field">
            <span>品種候補</span>
            <select value={breedOptions.includes(current.patient.breed) ? current.patient.breed : "custom"} onChange={(event) => updateCurrent({ ...current, patient: { ...current.patient, breed: event.target.value === "custom" ? "" : event.target.value } })}>
              {breedOptions.map((breed) => (
                <option key={breed}>{breed}</option>
              ))}
              <option value="custom">手入力</option>
            </select>
          </label>
          <label className="field">
            <span>品種手入力</span>
            <input value={current.patient.breed} onChange={(event) => updateCurrent({ ...current, patient: { ...current.patient, breed: event.target.value } })} />
          </label>
          <label className="field">
            <span>性別</span>
            <select value={current.patient.sex} onChange={(event) => updateCurrent({ ...current, patient: { ...current.patient, sex: event.target.value as "オス" | "メス" | "不明" } })}>
              <option>オス</option>
              <option>メス</option>
              <option>不明</option>
            </select>
          </label>
          <label className="check-field">
            <input type="checkbox" checked={current.patient.neutered} onChange={(event) => updateCurrent({ ...current, patient: { ...current.patient, neutered: event.target.checked } })} />
            避妊去勢済み
          </label>
          <label className="field">
            <span>生年月日</span>
            <input type="date" value={current.patient.birthDate} onChange={(event) => updateCurrent({ ...current, patient: { ...current.patient, birthDate: event.target.value } })} />
          </label>
          <label className="field">
            <span>検査日</span>
            <input type="date" value={current.patient.examDate} onChange={(event) => updateCurrent({ ...current, patient: { ...current.patient, examDate: event.target.value } })} />
          </label>
          <NumberInput label="体重" value={current.patient.bodyWeightKg} unit="kg" onChange={(value) => updateCurrent({ ...current, patient: { ...current.patient, bodyWeightKg: value } })} />
          <NumberInput label="BCS" value={current.patient.bcs} unit="/9" onChange={(value) => updateCurrent({ ...current, patient: { ...current.patient, bcs: value } })} />
          <NumberInput label="心拍数" value={current.patient.heartRateBpm} unit="/min" onChange={(value) => updateCurrent({ ...current, patient: { ...current.patient, heartRateBpm: value } })} />
          <NumberInput label="収縮期血圧" value={current.patient.systolicBpMmHg} unit="mmHg" onChange={(value) => updateCurrent({ ...current, patient: { ...current.patient, systolicBpMmHg: value } })} />
        </div>
      </section>

      <div className="two-column">
        <section className="panel">
          <h2>薬用量・栄養</h2>
          <div className="patient-grid compact">
            <NumberInput label="投与量" value={current.dosage.doseMgPerKg} unit="mg/kg" onChange={(value) => updateCurrent({ ...current, dosage: { ...current.dosage, doseMgPerKg: value } })} />
            <NumberInput label="投与回数" value={current.dosage.dosesPerDay} unit="回/日" onChange={(value) => updateCurrent({ ...current, dosage: { ...current.dosage, dosesPerDay: value } })} />
            <NumberInput label="錠剤規格" value={current.dosage.tabletStrengthMg} unit="mg/錠" onChange={(value) => updateCurrent({ ...current, dosage: { ...current.dosage, tabletStrengthMg: value } })} />
            <NumberInput label="液剤濃度" value={current.dosage.concentrationMgPerMl} unit="mg/mL" onChange={(value) => updateCurrent({ ...current, dosage: { ...current.dosage, concentrationMgPerMl: value } })} />
            <NumberInput label="DER係数" value={current.nutrition.derFactor} unit="x" onChange={(value) => updateCurrent({ ...current, nutrition: { ...current.nutrition, derFactor: value } })} />
            <NumberInput label="フード密度" value={current.nutrition.kcalPerGram} unit="kcal/g" onChange={(value) => updateCurrent({ ...current, nutrition: { ...current.nutrition, kcalPerGram: value } })} />
          </div>
          {[...dosageWarnings, ...nutritionWarnings].map((warning) => (
            <p className="warning" key={warning}>{warning}</p>
          ))}
        </section>

        <section className="panel">
          <h2>実投薬逆算</h2>
          <div className="patient-grid compact">
            <label className="field">
              <span>薬剤プリセット</span>
              <select value={current.actualDose.drugId} onChange={(event) => updateCurrent({ ...current, actualDose: { ...current.actualDose, drugId: event.target.value } })}>
                {drugPresets.map((drug) => (
                  <option key={drug.id} value={drug.id}>{drug.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>手入力薬剤名</span>
              <input value={current.actualDose.customDrugName} placeholder={selectedDrug.name} onChange={(event) => updateCurrent({ ...current, actualDose: { ...current.actualDose, customDrugName: event.target.value } })} />
            </label>
            <label className="field">
              <span>規格候補</span>
              <select value={current.actualDose.tabletStrengthMg} onChange={(event) => updateCurrent({ ...current, actualDose: { ...current.actualDose, tabletStrengthMg: Number(event.target.value) } })}>
                {selectedDrug.strengthsMg.map((strength) => (
                  <option key={strength} value={strength}>{strength} mg</option>
                ))}
              </select>
            </label>
            <NumberInput label="錠剤規格" value={current.actualDose.tabletStrengthMg} unit="mg/錠" onChange={(value) => updateCurrent({ ...current, actualDose: { ...current.actualDose, tabletStrengthMg: value } })} />
            <NumberInput label="服用錠数" value={current.actualDose.tabletFraction} unit="錠/回" onChange={(value) => updateCurrent({ ...current, actualDose: { ...current.actualDose, tabletFraction: value } })} />
            <NumberInput label="投与回数" value={current.actualDose.dosesPerDay} unit="回/日" onChange={(value) => updateCurrent({ ...current, actualDose: { ...current.actualDose, dosesPerDay: value } })} />
          </div>
          <p className="notice">{selectedDrug.note}</p>
        </section>
      </div>

      <section className="panel">
        <h2>心エコー入力</h2>
        <div className="patient-grid compact">
          <NumberInput label="LVIDd" value={current.echo.lviddCm} unit="cm" onChange={(value) => updateCurrent(patchEcho(current, "lviddCm", value))} />
          <NumberInput label="LVIDs" value={current.echo.lvidsCm} unit="cm" onChange={(value) => updateCurrent(patchEcho(current, "lvidsCm", value))} />
          <NumberInput label="E-vel" value={current.echo.eVelMps} unit="m/s" onChange={(value) => updateCurrent(patchEcho(current, "eVelMps", value))} />
          <NumberInput label="LA" value={current.echo.laDiameterCm} unit="cm" onChange={(value) => updateCurrent(patchEcho(current, "laDiameterCm", value))} />
          <NumberInput label="Ao" value={current.echo.aoDiameterCm} unit="cm" onChange={(value) => updateCurrent(patchEcho(current, "aoDiameterCm", value))} />
          <NumberInput label="LA max" value={current.echo.laMaxCm} unit="cm" onChange={(value) => updateCurrent(patchEcho(current, "laMaxCm", value))} />
          <NumberInput label="LA min" value={current.echo.laMinCm} unit="cm" onChange={(value) => updateCurrent(patchEcho(current, "laMinCm", value))} />
          <NumberInput label="MV VTI" value={current.echo.mvVtiCm} unit="cm" onChange={(value) => updateCurrent(patchEcho(current, "mvVtiCm", value))} />
          <NumberInput label="LVOT VTI" value={current.echo.lvotVtiCm} unit="cm" onChange={(value) => updateCurrent(patchEcho(current, "lvotVtiCm", value))} />
          <NumberInput label="MV径" value={current.echo.mvDiameterCm} unit="cm" onChange={(value) => updateCurrent(patchEcho(current, "mvDiameterCm", value))} />
          <NumberInput label="LVOT径" value={current.echo.lvotDiameterCm} unit="cm" onChange={(value) => updateCurrent(patchEcho(current, "lvotDiameterCm", value))} />
          <NumberInput label="R-R" value={current.echo.rrIntervalSec} unit="sec" onChange={(value) => updateCurrent(patchEcho(current, "rrIntervalSec", value))} />
          <NumberInput label="TR velocity" value={current.echo.trVelocityMps} unit="m/s" onChange={(value) => updateCurrent(patchEcho(current, "trVelocityMps", value))} />
          <NumberInput label="PV VTI" value={current.echo.pvVtiCm} unit="cm" onChange={(value) => updateCurrent(patchEcho(current, "pvVtiCm", value))} />
          <NumberInput label="AT" value={current.echo.atMs} unit="ms" onChange={(value) => updateCurrent(patchEcho(current, "atMs", value))} />
          <NumberInput label="ET" value={current.echo.etMs} unit="ms" onChange={(value) => updateCurrent(patchEcho(current, "etMs", value))} />
          <NumberInput label="PV S" value={current.echo.sWaveCmS} unit="cm/s" onChange={(value) => updateCurrent(patchEcho(current, "sWaveCmS", value))} />
          <NumberInput label="PV D" value={current.echo.dWaveCmS} unit="cm/s" onChange={(value) => updateCurrent(patchEcho(current, "dWaveCmS", value))} />
        </div>
      </section>

      <section className="panel">
        <h2>PH score 視覚評価</h2>
        <div className="patient-grid compact">
          {(Object.keys(current.phScore) as Array<keyof PhScoreInput>).map((key) => (
            <label className="field" key={key}>
              <span>{scoreConfigList.find((score) => score.id === "ph")?.items.find((item) => item.key === key)?.label ?? key}</span>
              <select value={current.phScore[key]} onChange={(event) => updateCurrent({ ...current, phScore: { ...current.phScore, [key]: event.target.value } })}>
                {phOptionsFor(key).map((option: ManualScoreOption) => (
                  <option value={option.value} key={option.value}>{option.points}点 - {option.reason}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      <ValueGrid title="計算結果" values={values} diffs={diffs} />

      <section className="panel">
        <div className="section-title">
          <Activity size={20} />
          <h2>スコア</h2>
        </div>
        <ScoreCards scores={scoreResults} />
      </section>

      <section className="panel output-panel">
        <div className="section-title">
          <FileText size={20} />
          <h2>診療録貼り付け文</h2>
        </div>
        <textarea readOnly value={clinicalText} />
      </section>

      <FormulaLibrary />

      <footer>
        <ShieldCheck size={18} />
        <span>保存先: このブラウザのIndexedDB。外部送信なし。</span>
      </footer>
        </>
      )}
    </main>
  );
}
