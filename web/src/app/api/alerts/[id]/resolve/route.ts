import { resolveAlert } from "@/lib/repo";
import { json, withSession } from "@/lib/api";

export const POST = withSession(async (_s, _req: Request, { params }: { params: { id: string } }) => {
  await resolveAlert(Number(params.id));
  return json({ ok: true });
});
