"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PatientDTO } from "./PatientView";
import { LOCATIONS } from "@/lib/locations";

export default function DetailsForm({ patient }: { patient: PatientDTO }) {
  const router = useRouter();
  const [f, setF] = useState({
    firstName: patient.firstName,
    lastName: patient.lastName,
    mrn: patient.mrn ?? "",
    dob: patient.dob ? patient.dob.slice(0, 10) : "",
    sex: patient.sex ?? "",
    email: patient.email ?? "",
    sensorLocation: patient.sensorLocation ?? "",
  });
  const [th, setTh] = useState(
    [1, 2, 3, 4].map((zone) => patient.thresholds.find((t) => t.zone === zone) ?? { zone, min: 0, max: 30 }),
  );
  const [paused, setPaused] = useState(patient.capturePaused);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const baseline = patient.baseline;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(""); setMsg("");
    const res = await fetch(`/api/patients/${patient.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...f,
        mrn: f.mrn || null, dob: f.dob || null, sex: f.sex || null, email: f.email || null, sensorLocation: f.sensorLocation || null,
        capturePaused: paused,
        thresholds: th.map((t) => ({ zone: t.zone, min: Number(t.min), max: Number(t.max) })),
      }),
    });
    setBusy(false);
    if (!res.ok) return setErr((await res.json().catch(() => ({}))).error ?? "Couldn't save changes.");
    setMsg("Changes saved.");
    router.refresh();
  }

  async function captureBaseline() {
    setErr(""); setMsg("");
    const res = await fetch(`/api/patients/${patient.id}/baseline`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: f.sensorLocation || undefined }),
    });
    if (!res.ok) return setErr((await res.json().catch(() => ({}))).error ?? "Couldn't save the baseline.");
    setMsg("Baseline saved from the last 60 seconds.");
    router.refresh();
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <form onSubmit={save}>
      <div className="panel">
        <h2>Patient</h2>
        <div className="grid2">
          <label>First name<input value={f.firstName} onChange={set("firstName")} required /></label>
          <label>Last name<input value={f.lastName} onChange={set("lastName")} required /></label>
          <label>MRN<input value={f.mrn} onChange={set("mrn")} /></label>
          <label>Date of birth<input type="date" value={f.dob} onChange={set("dob")} /></label>
          <label>Sex<select value={f.sex} onChange={set("sex")}><option value="">—</option><option>Female</option><option>Male</option><option>Other</option></select></label>
          <label>Email<input type="email" value={f.email} onChange={set("email")} /></label>
          <label>Sensor location<select value={f.sensorLocation} onChange={set("sensorLocation")}><option value="">—</option>{LOCATIONS.map((l) => <option key={l}>{l}</option>)}</select></label>
        </div>
      </div>

      <div className="panel">
        <h2>Zone targets (mmHg)</h2>
        <p className="muted" style={{ marginTop: 0 }}>A zone turns red and raises an alert when it stays above its maximum.</p>
        <div className="grid2">
          {th.map((t, i) => (
            <fieldset key={t.zone} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "0.6rem 0.8rem" }}>
              <legend>Zone {t.zone}</legend>
              <div className="row" style={{ flexWrap: "nowrap" }}>
                <label>Min<input type="number" min={0} step="0.5" value={t.min} onChange={(e) => setTh(th.map((x, j) => (j === i ? { ...x, min: Number(e.target.value) } : x)))} /></label>
                <label>Max<input type="number" min={1} step="0.5" value={t.max} onChange={(e) => setTh(th.map((x, j) => (j === i ? { ...x, max: Number(e.target.value) } : x)))} /></label>
              </div>
            </fieldset>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>Capture</h2>
        <label className="row" style={{ color: "var(--ink)" }}>
          <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} style={{ width: "auto" }} />
          Pause capture (readings from the module are ignored while paused)
        </label>
        <p className="muted">
          {baseline
            ? `Baseline from ${new Date(baseline.capturedAt).toLocaleString()}: ${[baseline.z1, baseline.z2, baseline.z3, baseline.z4].map((v, i) => `Z${i + 1} ${v}`).join(", ")} mmHg`
            : "No baseline yet. Capture one after the cast is applied and the module has run for a minute."}
        </p>
        <button type="button" onClick={captureBaseline}>Capture baseline from last 60 s</button>
      </div>

      {err && <p className="error" role="alert">{err}</p>}
      {msg && <p role="status">{msg}</p>}
      <button className="primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
    </form>
  );
}
