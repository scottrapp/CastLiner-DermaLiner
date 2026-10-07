import { z } from "zod";
import { getPatient, mrnTaken, updatePatient } from "@/lib/repo";
import { json, error, withSession } from "@/lib/api";
import { PatientFields } from "@/lib/schemas";

type Ctx = { params: { id: string } };

export const GET = withSession(async (_s, _req: Request, { params }: Ctx) => {
  const patient = await getPatient(Number(params.id));
  if (!patient) return error("Patient not found.", 404);
  return json({ patient });
});

const Patch = PatientFields.partial().extend({
  capturePaused: z.boolean().optional(),
  thresholds: z
    .array(z.object({ zone: z.number().int().min(1).max(4), min: z.number().min(0), max: z.number().positive() }))
    .optional(),
});

export const PATCH = withSession(async (s, req: Request, { params }: Ctx) => {
  const id = Number(params.id);
  const body=await req.json().catch(()=>null);
  if(s.role==="patient"&&(!body||Object.keys(body).some(k=>k!=="capturePaused")))return error("Patients can only pause or resume capture.",403);
  const parsed = Patch.safeParse(body);
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Some fields are invalid.");
  const { thresholds, ...fields } = parsed.data;
  if (thresholds?.some((t) => t.min >= t.max)) return error("Each zone's minimum must be below its maximum.");
  if (fields.mrn && (await mrnTaken(fields.mrn, id))) return error(`Another patient already has MRN ${fields.mrn}.`, 409);
  if (!(await getPatient(id))) return error("Patient not found.", 404);
  await updatePatient(id, fields, thresholds);
  return json({ ok: true });
});
