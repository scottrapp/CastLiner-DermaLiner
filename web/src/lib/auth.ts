// Clinician sessions. The web app uses an httpOnly cookie; the phone app sends the
// same token as "Authorization: Bearer <token>". Remembered sessions last seven days.
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import {one} from "./db";

export const COOKIE = "cl_session";
export const TTL_SECONDS = 12 * 60 * 60;
export const REMEMBER_SECONDS = 7 * 24 * 60 * 60;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set to at least 32 characters");
  return new TextEncoder().encode(s);
}

export type Session = { clinicianId: number; email: string; name: string; role?: "clinician" | "patient"; patientId?: number; sessionVersion?: number };

export async function createToken(s: Session, remember = false): Promise<string> {
  return new SignJWT({ email: s.email, name: s.name, role:s.role??"clinician", patientId:s.patientId, sessionVersion:s.sessionVersion??0 })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(s.role==="patient"?`patient:${s.patientId}`:String(s.clinicianId))
    .setIssuedAt()
    .setExpirationTime(`${remember?REMEMBER_SECONDS:TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifyToken(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const role=payload.role??"clinician";
    if(role!=="patient"&&role!=="clinician")return null;
    const id=role==="patient"?Number(payload.patientId):Number(payload.sub);
    if(!Number.isInteger(id)||id<1)return null;
    return {clinicianId:role==="patient"?0:id,patientId:role==="patient"?id:undefined,role,sessionVersion:Number(payload.sessionVersion??0),email:String(payload.email),name:String(payload.name)};
  } catch {
    return null;
  }
}

/** Reads the session from the cookie or a Bearer header. */
export async function getSession(): Promise<Session | null> {
  const auth = headers().get("authorization");
  const s = await verifyToken(auth?.startsWith("Bearer ") ? auth.slice(7) : cookies().get(COOKIE)?.value);
  if (!s) return null;
  const account = s.role === "patient"
    ? await one<{version:number}>(`SELECT session_version AS version FROM patient_account WHERE patient_id=$1`, [s.patientId])
    : await one<{version:number}>(`SELECT session_version AS version FROM clinician WHERE id=$1`, [s.clinicianId]);
  return account && account.version === (s.sessionVersion??0) ? s : null;
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: TTL_SECONDS,
};
