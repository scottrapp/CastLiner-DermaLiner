"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type A = {
  id: number;
  zone: number;
  kind: string;
  message: string;
  createdAt: string;
  patient?: { id: number; firstName: string; lastName: string; mrn: string | null } | null;
};

export default function AlertList({ alerts, showPatient = false }: { alerts: A[]; showPatient?: boolean }) {
  const router = useRouter();
  const [done, setDone] = useState<number[]>([]);
  const list = alerts.filter((a) => !done.includes(a.id));

  async function resolve(id: number) {
    const res = await fetch(`/api/alerts/${id}/resolve`, { method: "POST" });
    if (res.ok) { setDone([...done, id]); router.refresh(); }
  }

  if (!list.length) return <div className="panel"><p style={{ margin: 0 }}>No open alerts.</p></div>;
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr><th>Raised</th>{showPatient && <th>Patient</th>}<th>Zone</th><th>Type</th><th>Detail</th><th /></tr>
        </thead>
        <tbody>
          {list.map((a) => (
            <tr key={a.id}>
              <td>{new Date(a.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
              {showPatient && a.patient && <td><Link href={`/patients/${a.patient.id}`}>{a.patient.firstName} {a.patient.lastName}</Link></td>}
              <td>{a.zone}</td>
              <td>{a.kind === "threshold" ? "Above target" : "Rising"}</td>
              <td style={{ whiteSpace: "normal" }}>{a.message}</td>
              <td><button onClick={() => resolve(a.id)}>Resolve</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
