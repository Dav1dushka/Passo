import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";

type Stage = "saved" | "applied" | "interview" | "offer" | "rejected";
type WorkMode = "remote" | "hybrid" | "onsite";
type View = "overview" | "applications" | "insights";

type Application = {
  id: string;
  company: string;
  role: string;
  city: string;
  mode: WorkMode;
  stage: Stage;
  appliedAt: string;
  followUpAt: string;
  link: string;
  notes: string;
  updatedAt: string;
};

const KEY = "passo.applications.v2";

const STAGES: Stage[] = ["saved", "applied", "interview", "offer", "rejected"];
const MODES: WorkMode[] = ["remote", "hybrid", "onsite"];

const stageLabel: Record<Stage, string> = {
  saved: "Da valutare",
  applied: "Inviata",
  interview: "Colloquio",
  offer: "Offerta",
  rejected: "Conclusa",
};

const modeLabel: Record<WorkMode, string> = {
  remote: "Da remoto",
  hybrid: "Ibrido",
  onsite: "In sede",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysFromToday(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function formatDate(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(value + "T12:00:00"),
  );
}

function demoData(): Application[] {
  const now = new Date().toISOString();
  return [
    { id: uid(), company: "Lanterna Studio", role: "Junior Frontend Developer", city: "Firenze", mode: "hybrid", stage: "interview", appliedAt: daysFromToday(-10), followUpAt: daysFromToday(2), link: "", notes: "Preparare portfolio e una domanda sul team.", updatedAt: now },
    { id: uid(), company: "Bottega Digitale", role: "Web Developer Intern", city: "Livorno", mode: "onsite", stage: "applied", appliedAt: daysFromToday(-4), followUpAt: daysFromToday(3), link: "", notes: "Candidatura inviata dal sito aziendale.", updatedAt: now },
    { id: uid(), company: "Northstar Labs", role: "React Developer", city: "Italia", mode: "remote", stage: "saved", appliedAt: "", followUpAt: "", link: "", notes: "Verificare i requisiti e aggiornare il CV.", updatedAt: now },
  ];
}

function readData(): Application[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(Boolean) as Application[];
  } catch {
    return [];
  }
}

function App() {
  const [apps, setApps] = useState<Application[]>(readData);
  const [view, setView] = useState<View>("overview");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");
  const [modeFilter, setModeFilter] = useState<WorkMode | "all">("all");
  const [modal, setModal] = useState<Application | "new" | null>(null);
  const [toast, setToast] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(apps));
  }, [apps]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const counts = useMemo(
    () => Object.fromEntries(STAGES.map((s) => [s, apps.filter((a) => a.stage === s).length])) as Record<Stage, number>,
    [apps],
  );

  const due = useMemo(
    () =>
      apps
        .filter((a) => a.followUpAt && a.stage !== "offer" && a.stage !== "rejected")
        .sort((a, b) => a.followUpAt.localeCompare(b.followUpAt)),
    [apps],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps
      .filter((a) => {
        const hay = [a.company, a.role, a.city, a.notes].join(" ").toLowerCase();
        return (!q || hay.includes(q)) &&
          (stageFilter === "all" || a.stage === stageFilter) &&
          (modeFilter === "all" || a.mode === modeFilter);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [apps, modeFilter, query, stageFilter]);

  const active = apps.filter((a) => a.stage === "applied" || a.stage === "interview").length;
  const interviews = apps.filter((a) => a.stage === "interview").length;
  const submitted = apps.filter((a) => a.stage !== "saved").length;
  const conversion = submitted ? Math.round((interviews + counts.offer) / submitted * 100) : 0;
  const dueToday = due.filter((a) => a.followUpAt <= today()).length;

  function saveApplication(value: Omit<Application, "id" | "updatedAt">, existingId?: string) {
    const stamp = new Date().toISOString();
    setApps((current) => existingId
      ? current.map((a) => a.id === existingId ? { ...value, id: existingId, updatedAt: stamp } : a)
      : [{ ...value, id: uid(), updatedAt: stamp }, ...current],
    );
    setModal(null);
    setToast(existingId ? "Modifiche salvate." : "Candidatura salvata.");
  }

  function removeApplication(id: string) {
    setApps((current) => current.filter((a) => a.id !== id));
    setModal(null);
    setToast("Candidatura eliminata.");
  }

  function moveStage(id: string, stage: Stage) {
    const stamp = new Date().toISOString();
    setApps((current) =>
      current.map((a) => a.id === id ? {
        ...a,
        stage,
        appliedAt: stage !== "saved" && !a.appliedAt ? today() : a.appliedAt,
        updatedAt: stamp,
      } : a),
    );
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(apps, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "passo-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error("bad");
      setApps(parsed as Application[]);
      setToast("Backup importato.");
    } catch {
      setToast("File di backup non valido.");
    }
  }

  function loadDemo() {
    setApps(demoData());
    setToast("Dati di esempio aggiunti.");
  }

  function clearFilters() {
    setQuery("");
    setStageFilter("all");
    setModeFilter("all");
  }

  const editing = modal && modal !== "new" ? modal : undefined;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">p</div><div><strong>passo</strong><span>job tracker</span></div></div>
        <nav>
          {([
            ["overview", "Panoramica"],
            ["applications", "Candidature"],
            ["insights", "Progressi"],
          ] as const).map(([id, label]) => (
            <button key={id} className={view === id ? "nav active" : "nav"} onClick={() => setView(id)}>
              <span>{id === "overview" ? "⌂" : id === "applications" ? "▣" : "◒"}</span>{label}
              {id === "applications" && apps.length > 0 && <b>{apps.length}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy">I tuoi dati restano in questo browser.<small>Nessun account. Nessun server.</small></div>
          <button className="ghost" onClick={() => importRef.current?.click()}>Importa backup</button>
          <button className="ghost" onClick={exportBackup}>Esporta backup</button>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div><span className="muted">Passo</span><span className="slash">/</span><strong>{view === "overview" ? "Panoramica" : view === "applications" ? "Candidature" : "Progressi"}</strong></div>
          <button className="primary compact" onClick={() => setModal("new")}>＋ Aggiungi candidatura</button>
        </header>

        <div className="page">
          {view === "overview" && (
            <>
              <section className="hero">
                <div>
                  <span className="kicker">IL TUO PERCORSO</span>
                  <h1>La ricerca, un passo alla volta.</h1>
                  <p>Tieni insieme candidature, colloqui e ricontatti. Così sai sempre qual è la prossima cosa da fare.</p>
                </div>
                <div className="hero-art">↗</div>
              </section>

              <section className="metrics">
                {[
                  ["Candidature", apps.length],
                  ["In corso", active],
                  ["Colloqui", interviews],
                  ["Da ricontattare", dueToday],
                ].map(([label, value]) => (
                  <div className="metric" key={String(label)}><span>{label}</span><strong>{value}</strong></div>
                ))}
              </section>

              <section className="panel">
                <div className="section-head"><div><h2>Il tuo percorso</h2><p>Ogni candidatura ha il suo ritmo. Tieni traccia del prossimo passo.</p></div></div>
                <div className="pipeline">
                  {STAGES.map((stage) => (
                    <button className="pipeline-item" key={stage} onClick={() => { setView("applications"); setStageFilter(stage); }}>
                      <strong>{counts[stage]}</strong><span>{stageLabel[stage]}</span>
                      <i><em style={{ width: apps.length ? Math.max(8, counts[stage] / apps.length * 100) + "%" : "0%" }} /></i>
                    </button>
                  ))}
                </div>
              </section>

              <div className="two-col">
                <section className="panel">
                  <div className="section-head"><div><h2>Ultime candidature</h2><p>Le attività aggiornate di recente.</p></div><button className="text-btn" onClick={() => setView("applications")}>Vedi tutte →</button></div>
                  {apps.length === 0 ? <Empty onAdd={() => setModal("new")} onDemo={loadDemo} /> :
                    <div className="list">{apps.slice().sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5).map((a) =>
                      <ApplicationRow key={a.id} app={a} onEdit={() => setModal(a)} onStage={moveStage} />
                    )}</div>}
                </section>

                <section className="panel">
                  <div className="section-head"><div><h2>Prossimi passi</h2><p>Piccole azioni, una alla volta.</p></div></div>
                  {due.length === 0 ? <div className="empty-small"><div className="round">✓</div><strong>Nessun ricontatto in scadenza.</strong><p>Aggiungi una data di follow-up quando invii una candidatura.</p></div> :
                    <div className="follow-list">{due.slice(0, 5).map((a) =>
                      <button className="follow" key={a.id} onClick={() => setModal(a)}><span className={a.followUpAt <= today() ? "due" : ""}>{formatDate(a.followUpAt)}</span><b>{a.company}</b><small>{a.role}</small>→</button>
                    )}</div>}
                </section>
              </div>
            </>
          )}

          {view === "applications" && (
            <>
              <div className="page-title"><div><span className="kicker">LE TUE CANDIDATURE</span><h1>Trova il prossimo passo.</h1><p>Cerca per ruolo, azienda o città.</p></div><button className="secondary" onClick={exportBackup}>↓ Esporta</button></div>
              {apps.length === 0 ? <section className="panel"><Empty onAdd={() => setModal("new")} onDemo={loadDemo} /></section> : <>
                <div className="filters">
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Es. React, Firenze, studio..." />
                  <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value as Stage | "all")}><option value="all">Tutte le fasi</option>{STAGES.map((s) => <option key={s} value={s}>{stageLabel[s]}</option>)}</select>
                  <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value as WorkMode | "all")}><option value="all">Tutte le modalità</option>{MODES.map((m) => <option key={m} value={m}>{modeLabel[m]}</option>)}</select>
                  {(query || stageFilter !== "all" || modeFilter !== "all") && <button className="ghost filter-reset" onClick={clearFilters}>Azzera</button>}
                  <span>{filtered.length} risultati</span>
                </div>
                {filtered.length === 0 ? <section className="panel empty-filter"><strong>Nessuna candidatura corrisponde.</strong><button className="secondary" onClick={clearFilters}>Azzera filtri</button></section> :
                  <div className="list">{filtered.map((a) => <ApplicationRow key={a.id} app={a} onEdit={() => setModal(a)} onStage={moveStage} />)}</div>}
              </>}
            </>
          )}

          {view === "insights" && (
            <>
              <div className="page-title"><div><span className="kicker">PROGRESSI</span><h1>Una piccola fotografia.</h1><p>Un indicatore per osservare la ricerca, non per giudicarla.</p></div></div>
              <section className="insight-grid">
                <div className="panel insight-card"><span className="kicker">COLLOQUI PER CANDIDATURA</span><strong>{conversion}%</strong><p>Le candidature che hanno raggiunto colloquio o offerta.</p></div>
                <div className="panel"><div className="section-head"><div><h2>Distribuzione</h2><p>Come si muove il tuo percorso.</p></div></div><div className="bars">
                  {STAGES.map((s) => <div className="bar-row" key={s}><span>{stageLabel[s]}</span><div><i style={{ width: apps.length ? Math.max(4, counts[s] / apps.length * 100) + "%" : "4%" }} /></div><b>{counts[s]}</b></div>)}
                </div></div>
              </section>
              <section className="panel reflection"><span>✦</span><div><h2>Il prossimo passo è già qui.</h2><p>Un portfolio curato, una candidatura pensata bene e un ricontatto puntuale fanno parte dello stesso percorso.</p></div><button className="secondary" onClick={() => setView("applications")}>Apri candidature →</button></section>
            </>
          )}

          <footer>Passo è locale-first: i dati restano sul dispositivo.</footer>
        </div>
      </main>

      <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={importBackup} />
      {modal && <ApplicationModal value={editing} onClose={() => setModal(null)} onDelete={removeApplication} onSave={saveApplication} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Empty({ onAdd, onDemo }: { onAdd: () => void; onDemo: () => void }) {
  return <div className="empty"><div className="empty-mark">✦</div><h3>Ogni ricerca comincia da un primo passo.</h3><p>Aggiungi un annuncio che ti interessa e tieni qui il filo di candidature, colloqui e ricontatti.</p><button className="primary" onClick={onAdd}>＋ Aggiungi candidatura</button><button className="link-btn" onClick={onDemo}>esplora con dati di esempio</button></div>;
}

function ApplicationRow({ app, onEdit, onStage }: { app: Application; onEdit: () => void; onStage: (id: string, stage: Stage) => void }) {
  return <article className="application-row">
    <div className="monogram">{app.company.slice(0,1).toUpperCase()}</div>
    <div className="row-main"><div className="row-head"><div><span className="company">{app.company}</span><h3>{app.role}</h3></div>
      <select className={"stage stage-" + app.stage} value={app.stage} onChange={(e) => onStage(app.id, e.target.value as Stage)}>{STAGES.map((s) => <option key={s} value={s}>{stageLabel[s]}</option>)}</select>
    </div>
    <div className="meta"><span>{app.city || "Italia"}</span><span>{modeLabel[app.mode]}</span>{app.appliedAt && <span>Candidata {formatDate(app.appliedAt)}</span>}</div>
    <div className="row-foot"><span>{app.followUpAt ? "Ricontatto " + formatDate(app.followUpAt) : "Nessun ricontatto"}</span><div>{app.link && <a href={app.link} target="_blank" rel="noreferrer">Apri annuncio ↗</a>}<button className="edit-btn" onClick={onEdit}>Dettagli</button></div></div>
    {app.notes && <p className="note">{app.notes}</p>}
    </div>
  </article>;
}

function ApplicationModal({ value, onClose, onDelete, onSave }: { value?: Application; onClose: () => void; onDelete: (id: string) => void; onSave: (value: Omit<Application, "id" | "updatedAt">, existingId?: string) => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const initial = value;
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <form ref={formRef} className="modal" onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      onSave({
        company: String(fd.get("company") || "").trim(),
        role: String(fd.get("role") || "").trim(),
        city: String(fd.get("city") || "").trim(),
        mode: String(fd.get("mode") || "remote") as WorkMode,
        stage: String(fd.get("stage") || "saved") as Stage,
        appliedAt: String(fd.get("appliedAt") || ""),
        followUpAt: String(fd.get("followUpAt") || ""),
        link: String(fd.get("link") || "").trim(),
        notes: String(fd.get("notes") || "").trim(),
      }, initial?.id);
    }}>
      <div className="modal-head"><div><span className="kicker">{initial ? "MODIFICA" : "NUOVA OPPORTUNITÀ"}</span><h2>{initial ? "Aggiorna candidatura" : "Una nuova opportunità"}</h2></div><button type="button" className="close" onClick={onClose}>×</button></div>
      <div className="form-grid">
        <label>Azienda<input name="company" required defaultValue={initial?.company || ""} /></label>
        <label>Ruolo<input name="role" required defaultValue={initial?.role || ""} /></label>
        <label>Città<input name="city" defaultValue={initial?.city || ""} /></label>
        <label>Modalità<select name="mode" defaultValue={initial?.mode || "remote"}>{MODES.map((m) => <option key={m} value={m}>{modeLabel[m]}</option>)}</select></label>
        <label>Fase<select name="stage" defaultValue={initial?.stage || "saved"}>{STAGES.map((s) => <option key={s} value={s}>{stageLabel[s]}</option>)}</select></label>
        <label>Data candidatura<input name="appliedAt" type="date" defaultValue={initial?.appliedAt || ""} /></label>
        <label>Ricontattare il<input name="followUpAt" type="date" defaultValue={initial?.followUpAt || ""} /></label>
        <label className="wide">Link annuncio<input name="link" type="url" placeholder="https://…" defaultValue={initial?.link || ""} /></label>
        <label className="wide">Note<textarea name="notes" rows={4} defaultValue={initial?.notes || ""} /></label>
      </div>
      <div className="modal-actions">{initial && <button type="button" className="danger" onClick={() => onDelete(initial.id)}>Elimina</button>}<span /><button type="button" className="secondary" onClick={onClose}>Annulla</button><button className="primary" type="submit">Salva candidatura</button></div>
    </form>
  </div>;
}

export default App;
