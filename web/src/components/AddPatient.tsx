"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LOCATIONS } from "@/lib/locations";

export default function AddPatient() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch("/api/patients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setErr(data.error ?? "Couldn't add the patient.");
    router.push(`/patients/${data.patient.id}`);
  }

  if (!open) return <button className="primary" onClick={() => setOpen(true)}>Add patient</button>;
  return (
    <form className="panel" onSubmit={submit} style={{ width: "100%", marginBottom: 0 }}>
      <h2>Add patient</h2>
      <div className="grid2">
        <label>First name<input name="firstName" required /></label>
        <label>Last name<input name="lastName" required /></label>
        <label>MRN<input name="mrn" /></label>
        <label>Date of birth<input name="dob" type="date" /></label>
        <label>Sex<select name="sex" defaultValue=""><option value="">—</option><option>Female</option><option>Male</option><option>Other</option></select></label>
        <label>Sensor location<select name="sensorLocation" defaultValue=""><option value="">—</option>{LOCATIONS.map((l) => <option key={l}>{l}</option>)}</select></label>
      </div>
      {err && <p className="error" role="alert">{err}</p>}
      <div className="row" style={{ marginTop: "1rem" }}>
        <button className="primary" disabled={busy}>{busy ? "Adding…" : "Add patient"}</button>
        <button type="button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
