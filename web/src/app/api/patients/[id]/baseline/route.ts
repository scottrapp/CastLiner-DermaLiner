import { saveBaseline } from "@/lib/repo";
import { json, error, withSession } from "@/lib/api";

type Ctx = { params: { id: string } };

/** Saves the initial-capture baseline from the last 60 seconds of readings. */
export const POST = withSession(async (_s, req: Request, { params }: Ctx) => {
  const body = (await req.json().catch(() => ({}))) as { location?: string };
  const baseline = await saveBaseline(Number(params.id), body.location || null);
  if (!baseline) return error("Not enough readings yet. Keep the module connected for a full minute.", 409);
  return json({ baseline }, 201);
});
