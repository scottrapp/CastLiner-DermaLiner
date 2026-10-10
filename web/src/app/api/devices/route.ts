import { listDevices } from "@/lib/repo";
import { json, withSession } from "@/lib/api";

export const GET = withSession(async (s) => json({ devices: (await listDevices()).filter(d=>s.role!=="patient"||d.patientId===s.patientId) }));
