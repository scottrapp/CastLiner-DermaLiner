import {one} from "@/lib/db";
// The phone app posts batches of readings here while it is connected to a module.
import { z } from "zod";
import { ingest } from "@/lib/repo";
import { json, error, withSession } from "@/lib/api";
import type { Zones } from "@/lib/analysis";

const Body = z.object({
  deviceId: z.string().min(1).max(64),
  battery: z.number().int().min(0).max(100).optional(),
  readings: z.array(z.object({ t: z.number(), z: z.tuple([z.number(), z.number(), z.number(), z.number()]) })).max(5000),
});

export const POST = withSession(async (s, req: Request) => {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Readings must be { deviceId, readings: [{ t, z: [z1, z2, z3, z4] }] }.");
  if(s.role==="patient") {const owned=await one(`SELECT id FROM device WHERE id=$1 AND patient_id=$2`,[parsed.data.deviceId,s.patientId]);if(!owned)return error("This module is not assigned to your patient account.",403);}
  const { deviceId, battery, readings } = parsed.data;
  const r = await ingest(deviceId, battery, readings.map((x) => ({ t: x.t, z: x.z as Zones })), s.role === "patient" ? s.patientId : undefined);
  if (!r.ok) return error(`Module ${deviceId} isn't assigned to a patient. Assign it in the phone app first.`, 409);
  return json({ stored: r.stored, paused: r.paused, patientId: r.patientId, alerts: r.alerts });
});
