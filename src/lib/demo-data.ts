import type { JobApplication } from "../types";

function daysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function makeDemoApplications(): JobApplication[] {
  const now = new Date().toISOString();
  return [
    { id: crypto.randomUUID(), position: "Junior Frontend Developer", company: "Lanterna Studio", city: "Firenze", workMode: "hybrid", stage: "interview", createdAt: now, updatedAt: now, appliedAt: daysFromToday(-11), followUpAt: daysFromToday(2), link: "", language: "Italiano · Inglese", notes: "Demo: preparare due progetti e una domanda sul team.", sample: true },
    { id: crypto.randomUUID(), position: "Web Developer Intern", company: "Bottega Digitale", city: "Livorno", workMode: "onsite", stage: "applied", createdAt: now, updatedAt: now, appliedAt: daysFromToday(-5), followUpAt: daysFromToday(3), link: "", language: "Italiano", notes: "Demo: candidatura inviata tramite il sito aziendale.", sample: true },
    { id: crypto.randomUUID(), position: "React Developer", company: "Northstar Labs", city: "Italia", workMode: "remote", stage: "saved", createdAt: now, updatedAt: now, appliedAt: "", followUpAt: "", link: "", language: "Inglese", notes: "Demo: verificare la corrispondenza dei requisiti.", sample: true },
  ];
}
