import { openAlerts } from "@/lib/repo";
import { json, withSession } from "@/lib/api";

export const GET = withSession(async (s, req: Request) => {
  const pid = new URL(req.url).searchParams.get("patientId");
  return json({ alerts: await openAlerts(s.role==="patient"?s.patientId:pid ? Number(pid) : undefined) });
});
