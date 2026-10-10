import { getThresholds, readingsSince } from "@/lib/repo";
import { json, withSession } from "@/lib/api";
import { segment } from "@/lib/analysis";

type Ctx = { params: { id: string } };
const MAX_POINTS = 2000;

export const GET = withSession(async (_s, req: Request, { params }: Ctx) => {
  const id = Number(params.id);
  const url = new URL(req.url);
  const minutes = Math.min(Math.max(Number(url.searchParams.get("minutes")) || 10, 1), 60 * 24 * 7);
  const segSeconds = Math.min(Math.max(Number(url.searchParams.get("segment")) || 60, 10), 3600);
  const to = Date.now();
  const from = to - minutes * 60_000;

  const [samples, thresholds] = await Promise.all([readingsSince(id, new Date(from)), getThresholds(id)]);
  // Thin long ranges for the chart; segments always use every sample.
  const step = Math.max(1, Math.ceil(samples.length / MAX_POINTS));
  const chart = samples.filter((_, i) => i % step === 0 || i === samples.length - 1);
  const segMs = segSeconds * 1000;
  const alignedFrom = Math.floor(from / segMs) * segMs;

  return json({
    from,
    to,
    thresholds,
    latest: samples.at(-1) ?? null,
    chart,
    recent: samples.slice(-30).reverse(),
    segments: segment(samples, thresholds, alignedFrom, to, segMs),
  });
});
