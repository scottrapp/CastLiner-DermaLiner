import {one} from "@/lib/db";
import { z } from "zod";
import { assignDevice, getPatient } from "@/lib/repo";
import { json, error, withSession } from "@/lib/api";

const Body = z.object({ deviceId: z.string().min(1).max(64), patientId: z.number().int().nullable() });

export const POST = withSession(async (s, req: Request) => {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Send { deviceId, patientId }.");
  if(s.role==="patient") {const owned=await one(`SELECT id FROM device WHERE id=$1 AND patient_id=$2`,[parsed.data.deviceId,s.patientId]);if(!owned||parsed.data.patientId!==s.patientId)return error("This module is not assigned to your patient account.",403);return json({ok:true});}
  if (parsed.data.patientId !== null && !(await getPatient(parsed.data.patientId))) return error("Patient not found.", 404);
  await assignDevice(parsed.data.deviceId, parsed.data.patientId);
  return json({ ok: true });
});
