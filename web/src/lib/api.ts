import {patientRouteAllowed} from "./access";
import { NextResponse } from "next/server";
import { getSession, type Session } from "./auth";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Wraps a route handler so it only runs for a signed-in clinician. */
export function withSession<A extends unknown[]>(fn: (s: Session, ...args: A) => Promise<Response>) {
  return async (...args: A) => {
    const s = await getSession();
    if (!s) return error("Sign in to continue.", 401);
    const req=args[0] as Request;
    if(s.role==="patient"&&!patientRouteAllowed(s.patientId!,req.method,new URL(req.url).pathname))return error("You do not have access to this resource.",403);
    try {
      return await fn(s, ...args);
    } catch (e) {
      console.error(e);
      return error("Something went wrong on the server. Check the server logs.", 500);
    }
  };
}
