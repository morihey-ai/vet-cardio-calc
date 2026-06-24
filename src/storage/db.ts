import { sampleRecords } from "../data/sampleData";
import type { ExamRecord } from "../types";

const DB_NAME = "vet-cardio-calc";
const STORE_NAME = "examRecords";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getRecords(): Promise<ExamRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result as ExamRecord[]).sort((a, b) => a.patient.examDate.localeCompare(b.patient.examDate)));
    request.onerror = () => reject(request.error);
  });
}

export async function saveRecord(record: ExamRecord): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function seedIfEmpty(): Promise<void> {
  const records = await getRecords();
  if (records.length > 0) return;
  await Promise.all(sampleRecords.map((record) => saveRecord(record)));
}
