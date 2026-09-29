import type { JobApplication, Stage, WorkMode } from "../types";

const STORAGE_KEY = "passo.applications.v1";
const validStages: Stage[] = ["saved", "applied", "interview", "offer", "rejected"];
const validModes: WorkMode[] = ["remote", "hybrid", "onsite"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(record: Record<string, unknown>, key: string, max = 1200): string {
  return typeof record[key] === "string" ? (record[key] as string).trim().slice(0, max) : "";
}

function toApplication(value: unknown): JobApplication | null {
  if (!isRecord(value)) return null;
  const stage = value.stage;
  const workMode = value.workMode;
  const id = readText(value, "id", 80);
  const position = readText(value, "position", 100);
  const company = readText(value, "company", 100);
  if (!id || !position || !company || typeof stage !== "string" || !validStages.includes(stage as Stage) || typeof workMode !== "string" || !validModes.includes(workMode as WorkMode)) return null;
  return {
    id, position, company, city: readText(value, "city", 80), workMode: workMode as WorkMode, stage: stage as Stage,
    createdAt: readText(value, "createdAt", 40), updatedAt: readText(value, "updatedAt", 40),
    appliedAt: readText(value, "appliedAt", 20), followUpAt: readText(value, "followUpAt", 20),
    link: readText(value, "link", 500), language: readText(value, "language", 60), notes: readText(value, "notes", 1200),
    sample: value.sample === true,
  };
}

export function loadApplications(): { applications: JobApplication[]; available: boolean } {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { applications: [], available: true };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { applications: [], available: true };
    return { applications: parsed.map(toApplication).filter((item): item is JobApplication => item !== null), available: true };
  } catch { return { applications: [], available: false }; }
}

export function saveApplications(applications: JobApplication[]): boolean {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(applications)); return true; }
  catch { return false; }
}

export function exportApplications(applications: JobApplication[]): void {
  const file = new Blob([JSON.stringify(applications, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(file); const link = document.createElement("a");
  link.href = url; link.download = "passo-job-search-backup.json"; link.click(); URL.revokeObjectURL(url);
}

export function importApplications(file: File): Promise<JobApplication[]> {
  return file.text().then((contents) => {
    const parsed: unknown = JSON.parse(contents);
    if (!Array.isArray(parsed)) throw new Error("invalid-file");
    const applications = parsed.map(toApplication).filter((item): item is JobApplication => item !== null);
    if (applications.length !== parsed.length) throw new Error("invalid-records");
    return applications;
  });
}
