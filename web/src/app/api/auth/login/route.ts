import {one} from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { findClinicianByEmail } from "@/lib/repo";
import { createToken, COOKIE, cookieOptions } from "@/lib/auth";
import { json, error } from "@/lib/api";

const Body = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error("Enter your email and password.");
  const c = await findClinicianByEmail(parsed.data.email);
  if(!c){
    const a=await one<{patientId:number;email:string;passwordHash:string;name:string}>(`SELECT a.patient_id AS "patientId",a.email,a.password_hash AS "passwordHash",p.first_name||' '||p.last_name AS name FROM patient_account a JOIN patient p ON p.id=a.patient_id WHERE lower(a.email)=lower($1)`,[parsed.data.email]);
    if(!a||!await bcrypt.compare(parsed.data.password,a.passwordHash))return error("That email and password don't match an account.",401);
    const token=await createToken({clinicianId:0,role:"patient",patientId:a.patientId,email:a.email,name:a.name});
    return json({token,role:"patient",patientId:a.patientId});
  }
  if (!(await bcrypt.compare(parsed.data.password, c.passwordHash))) {
    return error("That email and password don't match an account.", 401);
  }
  const token = await createToken({ clinicianId: c.id, email: c.email, name: c.name });
  const res = json({ token, role:"clinician", clinician: { id: c.id, email: c.email, name: c.name } });
  res.cookies.set(COOKIE, token, cookieOptions);
  return res;
}
