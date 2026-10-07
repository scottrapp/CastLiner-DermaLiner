// Clinician sessions. The web app uses an httpOnly cookie; the phone app sends the
// same token as "Authorization: Bearer <token>". Tokens last 12 hours.
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";

export const COOKIE = "cl_session";
const TTL_SECONDS = 12 * 60 * 60;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set to at least 32 characters");
  return new TextEncoder().encode(s);
}

export type Session = { clinicianId: number; email: string; name: string; role?: "clinician" | "patient"; patientId?: number };

export async function createToken(s: Session): Promise<string> {
  return new SignJWT({ email: s.email, name: s.name, role:s.role??"clinician", patientId:s.patientId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(s.role==="patient"?`patient:${s.patientId}`:String(s.clinicianId))
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
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
    return {clinicianId:role==="patient"?0:id,patientId:role==="patient"?id:undefined,role,email:String(payload.email),name:String(payload.name)};
  } catch {
    return null;
  }
}

/** Reads the session from the cookie or a Bearer header. */
export async function getSession(): Promise<Session | null> {
  const auth = headers().get("authorization");
  if (auth?.startsWith("Bearer ")) return verifyToken(auth.slice(7));
  return verifyToken(cookies().get(COOKIE)?.value);
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: TTL_SECONDS,
};
