"use client";
import { useState } from "react";
import LiveView from "./LiveView";
import DetailsForm from "./DetailsForm";
import AlertList from "./AlertList";

export type PatientDTO = {
  id: number;
  firstName: string;
  lastName: string;
  mrn: string | null;
  dob: string | null;
  sex: string | null;
  email: string | null;
  sensorLocation: string | null;
  capturePaused: boolean;
  thresholds: { zone: number; min: number; max: number }[];
  device: { id: string; battery: number | null; lastSeen: string | null } | null;
  baseline: { capturedAt: string; z1: number; z2: number; z3: number; z4: number } | null;
  alerts: { id: number; zone: number; kind: string; message: string; createdAt: string }[];
};

const TABS = ["Live", "Details", "Alerts"] as const;

export default function PatientView({ patient }: { patient: PatientDTO }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Live");
  return (
    <>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t}{t === "Alerts" && patient.alerts.length ? ` (${patient.alerts.length})` : ""}
          </button>
        ))}
      </div>
      {tab === "Live" && <LiveView patient={patient} />}
      {tab === "Details" && <DetailsForm patient={patient} />}
      {tab === "Alerts" && <AlertList alerts={patient.alerts} />}
    </>
  );
}
