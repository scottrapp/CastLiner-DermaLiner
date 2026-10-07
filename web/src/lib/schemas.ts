import { z } from "zod";

const opt = z.string().trim().optional().nullable().transform((v) => v || null);

export const PatientFields = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  mrn: opt,
  dob: opt.refine((v) => v === null || (/^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v && Date.parse(v)<=Date.now()), "Date of birth must be YYYY-MM-DD."),
  sex: opt,
  email: opt,
  sensorLocation: opt,
  heightCm: z.number().positive().max(300).nullable().optional(),
  weightKg: z.number().positive().max(700).nullable().optional(),
});

export const Thresholds = z.array(z.object({zone:z.number().int().min(1).max(4),min:z.number().finite().min(0),max:z.number().finite().positive()}).refine(t=>t.min<t.max,{message:"Each minimum must be below its maximum."})).length(4).refine(t=>new Set(t.map(r=>r.zone)).size===4,{message:"Each zone must be configured once."});
export const CreatePatient = PatientFields.extend({thresholds:Thresholds.optional()});
