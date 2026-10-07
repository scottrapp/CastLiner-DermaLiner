import Link from "next/link";
import { listPatients } from "@/lib/repo";
import { ageFrom, fmtDate, fmtDateTime, patientName } from "@/lib/format";
import AddPatient from "@/components/AddPatient";

export default async function Patients({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim() ?? "";
  const patients = await listPatients(q);

  return (
    <>
      <div className="pagehead">
        <h1>Patients</h1>
        <AddPatient />
      </div>
      <form className="row" style={{ marginBottom: "1rem", maxWidth: 480 }}>
        <input name="q" defaultValue={q} placeholder="Search by name, MRN, or email" aria-label="Search patients" />
        <button>Search</button>
      </form>
      {patients.length === 0 ? (
        <div className="panel">
          <p style={{ margin: 0 }}>{q ? `No patients match "${q}".` : "No patients yet. Add one to start monitoring."}</p>
        </div>
      ) : (
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>MRN</th><th className="num">Age</th><th>Date of birth</th>
                <th>Location</th><th>Module</th><th className="num">Open alerts</th><th>Last updated</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/patients/${p.id}`}>{patientName(p)}</Link></td>
                  <td>{p.mrn ?? "—"}</td>
                  <td className="num">{ageFrom(p.dob) ?? "—"}</td>
                  <td>{fmtDate(p.dob)}</td>
                  <td>{p.sensorLocation ?? "—"}</td>
                  <td>{p.deviceId ? `${p.deviceId}${p.battery != null ? ` (${p.battery}%)` : ""}` : "—"}</td>
                  <td className="num">{p.openAlerts ? <span className="hi">{p.openAlerts}</span> : 0}</td>
                  <td>{fmtDateTime(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
