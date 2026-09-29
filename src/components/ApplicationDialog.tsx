import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { JobApplication, Locale, Stage, WorkMode } from "../types";
import { Icon } from "./Icon";
import { text } from "../i18n";

const stages: Stage[] = ["saved", "applied", "interview", "offer", "rejected"];
const modes: WorkMode[] = ["remote", "hybrid", "onsite"];

type Props = {
  open: boolean;
  application?: JobApplication;
  locale: Locale;
  onSave: (application: JobApplication) => void;
  onDelete?: (id: string) => void;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function ApplicationDialog({ open, application, locale, onSave, onDelete }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    if (!dialog.open) dialog.showModal();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const close = () => setError("");
    dialog.addEventListener("close", close);
    return () => dialog.removeEventListener("close", close);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const position = String(form.get("position") || "").trim();
    const company = String(form.get("company") || "").trim();
    if (!position || !company) {
      setError(text(locale, "required"));
      return;
    }

    const now = new Date().toISOString();
    const value: JobApplication = {
      id: application?.id ?? crypto.randomUUID(),
      position,
      company,
      city: String(form.get("city") || "").trim(),
      workMode: String(form.get("workMode") || "remote") as WorkMode,
      stage: String(form.get("stage") || "saved") as Stage,
      createdAt: application?.createdAt ?? now,
      updatedAt: now,
      appliedAt: String(form.get("appliedAt") || ""),
      followUpAt: String(form.get("followUpAt") || ""),
      link: String(form.get("link") || "").trim(),
      language: String(form.get("language") || "").trim(),
      notes: String(form.get("notes") || "").trim(),
      sample: application?.sample ?? false,
    };
    onSave(value);
    dialogRef.current?.close();
  }

  function handleDelete() {
    if (application && onDelete) {
      onDelete(application.id);
      dialogRef.current?.close();
    }
  }

  const isEditing = Boolean(application);

  return (
    <dialog ref={dialogRef} className="dialog-shell">
      <form method="dialog" className="dialog-card" onSubmit={handleSubmit}>
        <div className="dialog-head">
          <div>
            <p className="eyebrow">{text(locale, isEditing ? "editApplication" : "newApplication")}</p>
            <h2>{text(locale, isEditing ? "editTitle" : "newTitle")}</h2>
          </div>
          <button className="icon-button" type="button" onClick={() => dialogRef.current?.close()} aria-label={text(locale, "close")}>
            <Icon name="close" />
          </button>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>{text(locale, "position")}</span>
            <input name="position" maxLength={100} defaultValue={application?.position ?? ""} autoFocus />
          </label>
          <label className="field">
            <span>{text(locale, "company")}</span>
            <input name="company" maxLength={100} defaultValue={application?.company ?? ""} />
          </label>
          <label className="field">
            <span>{text(locale, "city")}</span>
            <input name="city" maxLength={80} defaultValue={application?.city ?? ""} />
          </label>
          <label className="field">
            <span>{text(locale, "workMode")}</span>
            <select name="workMode" defaultValue={application?.workMode ?? "remote"}>
              {modes.map((mode) => <option key={mode} value={mode}>{text(locale, mode)}</option>)}
            </select>
          </label>
          <label className="field">
            <span>{text(locale, "stage")}</span>
            <select name="stage" defaultValue={application?.stage ?? "saved"}>
              {stages.map((stage) => <option key={stage} value={stage}>{text(locale, stage)}</option>)}
            </select>
          </label>
          <label className="field">
            <span>{text(locale, "applicationDate")}</span>
            <input name="appliedAt" type="date" defaultValue={application?.appliedAt ?? ""} />
          </label>
          <label className="field">
            <span>{text(locale, "followUpDate")}</span>
            <input name="followUpAt" type="date" defaultValue={application?.followUpAt ?? ""} min={!application?.followUpAt ? todayKey() : undefined} />
          </label>
          <label className="field field-wide">
            <span>{text(locale, "jobLink")}</span>
            <input name="link" type="url" maxLength={500} defaultValue={application?.link ?? ""} placeholder="https://…" />
          </label>
          <label className="field field-wide">
            <span>{text(locale, "language")}</span>
            <input name="language" maxLength={60} defaultValue={application?.language ?? ""} />
          </label>
          <label className="field field-wide">
            <span>{text(locale, "notes")}</span>
            <textarea name="notes" rows={3} maxLength={1200} defaultValue={application?.notes ?? ""} />
          </label>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          {isEditing && onDelete && (
            <button className="button button-danger-quiet" type="button" onClick={handleDelete}><Icon name="trash" />{text(locale, "delete")}</button>
          )}
          <span className="dialog-spacer" />
          <button className="button button-quiet" type="button" onClick={() => dialogRef.current?.close()}>{text(locale, "cancel")}</button>
          <button className="button button-primary" type="submit">{text(locale, isEditing ? "update" : "save")}</button>
        </div>
      </form>
    </dialog>
  );
}
