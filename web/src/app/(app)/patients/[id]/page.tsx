import { notFound } from "next/navigation";
import { getPatient } from "@/lib/repo";
import { patientName } from "@/lib/format";
import PatientView from "@/components/PatientView";

export default async function PatientPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const p = await getPatient(id);
  if (!p) notFound();
  return (
    <>
      <div className="pagehead">
        <div>
          <h1>{patientName(p)}</h1>
          <div className="chips" style={{ marginTop: "0.4rem" }}>
            {p.mrn && <span className="chip">MRN {p.mrn}</span>}
            {p.sensorLocation && <span className="chip">{p.sensorLocation}</span>}
            <span className="chip">{p.device ? `Module ${p.device.id}${p.device.battery != null ? ` (${p.device.battery}%)` : ""}` : "No module assigned"}</span>
            {p.capturePaused && <span className="chip warn">Capture paused</span>}
            {p.alerts.length > 0 && <span className="chip warn">{p.alerts.length} open alert{p.alerts.length > 1 ? "s" : ""}</span>}
          </div>
        </div>
      </div>
      {/* Serialize dates for the client components. */}
      <PatientView patient={JSON.parse(JSON.stringify(p))} />
    </>
  );
}
