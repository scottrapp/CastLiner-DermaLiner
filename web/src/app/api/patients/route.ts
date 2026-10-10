import { CreatePatient } from "@/lib/schemas";
import { createPatient, listPatients, mrnTaken, getPatient } from "@/lib/repo";
import { json, error, withSession } from "@/lib/api";

export const GET = withSession(async (s, req: Request) => {
  if(s.role==="patient"){const patient=await getPatient(s.patientId!);return json({patients:patient?[{...patient,deviceId:patient.device?.id??null,openAlerts:patient.alerts.length}]:[]});}
  const patients = await listPatients(new URL(req.url).searchParams.get("q") ?? undefined);
  return json({ patients });
});

export const POST = withSession(async (s, req: Request) => {
  const parsed = CreatePatient.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Check the patient details.");
  if (parsed.data.mrn && (await mrnTaken(parsed.data.mrn))) return error(`A patient with MRN ${parsed.data.mrn} already exists.`, 409);
  const {thresholds, ...fields} = parsed.data;
  const patient = await createPatient(fields, s.clinicianId, thresholds);
  return json({ patient }, 201);
});
