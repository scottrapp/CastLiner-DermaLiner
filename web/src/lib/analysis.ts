// Pressure analysis for CastLiner / DermaLiner.
//
// Three layers, simplest first:
//  1. Threshold: each zone has a max (mmHg). A reading above it is "high" (red).
//  2. Segments: readings are grouped into fixed windows (default 60 s) and averaged,
//     which is what the history view and chart summaries show.
//  3. Trend: the latest window is compared with the one before it using Welch's
//     t-test. A statistically significant rise of at least MIN_RISE mmHg is flagged,
//     even if the zone is still under its threshold. This mirrors the approach in
//     ClaraData's original anomaly detector (consecutive-segment comparison).

export type Zones = [number, number, number, number];
export type Sample = { t: number; z: Zones }; // t = epoch ms
export type Threshold = { zone: number; min: number; max: number };
export type ZoneStatus = "ok" | "high" | "low" | "none";

export const ZONES = [1, 2, 3, 4] as const;
export const DEFAULT_MAX = 30;
export const SUSTAIN_SAMPLES = 10; // consecutive high readings before a threshold alert
export const TREND_P = 0.01;
export const MIN_RISE = 5; // mmHg

export function thresholdFor(thresholds: Threshold[], zone: number): Threshold {
  return thresholds.find((t) => t.zone === zone) ?? { zone, min: 0, max: DEFAULT_MAX };
}

export function zoneStatus(value: number | null | undefined, th: Threshold): ZoneStatus {
  if (value === null || value === undefined || Number.isNaN(value)) return "none";
  if (value > th.max) return "high";
  if (value < th.min) return "low";
  return "ok";
}

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
}

export function variance(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
}

export type Segment = {
  start: number;
  end: number;
  n: number;
  mean: (number | null)[];
  status: ZoneStatus[];
};

/** Groups samples into fixed windows between `from` and `to` (epoch ms). Empty windows are kept. */
export function segment(samples: Sample[], thresholds: Threshold[], from: number, to: number, windowMs = 60_000): Segment[] {
  const out: Segment[] = [];
  const sorted = [...samples].sort((a, b) => a.t - b.t);
  let i = 0;
  for (let start = from; start < to; start += windowMs) {
    const end = Math.min(start + windowMs, to);
    const bucket: Sample[] = [];
    while (i < sorted.length && sorted[i].t < start) i++;
    let j = i;
    while (j < sorted.length && sorted[j].t < end) bucket.push(sorted[j++]);
    const means = ZONES.map((_, k) => (bucket.length ? mean(bucket.map((s) => s.z[k])) : null));
    out.push({
      start,
      end,
      n: bucket.length,
      mean: means,
      status: means.map((m, k) => zoneStatus(m, thresholdFor(thresholds, k + 1))),
    });
  }
  return out;
}

// ---------- Welch's t-test ----------

function logGamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (const ci of c) ser += ci / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200, EPS = 3e-14, FPMIN = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Regularized incomplete beta function I_x(a, b). */
export function ibeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** Two-sided Welch's t-test. Returns p = 1 when there is not enough data. */
export function welch(a: number[], b: number[]): { t: number; df: number; p: number } {
  if (a.length < 3 || b.length < 3) return { t: 0, df: 0, p: 1 };
  const va = variance(a) / a.length;
  const vb = variance(b) / b.length;
  const se = Math.sqrt(va + vb);
  const diff = mean(b) - mean(a);
  if (se === 0) return { t: diff === 0 ? 0 : Infinity * Math.sign(diff), df: a.length + b.length - 2, p: diff === 0 ? 1 : 0 };
  const t = diff / se;
  const df = (va + vb) ** 2 / (va ** 2 / (a.length - 1) + vb ** 2 / (b.length - 1));
  const p = ibeta(df / (df + t * t), df / 2, 0.5);
  return { t, df, p };
}

// ---------- Alerts ----------

export type NewAlert = { zone: number; kind: "threshold" | "trend"; value: number; message: string };

/**
 * Decides which alerts to raise from recent samples (ideally the last ~2 windows).
 * `openZones` lists zones that already have an unresolved alert of that kind, so they are not repeated.
 */
export function evaluateAlerts(
  samples: Sample[],
  thresholds: Threshold[],
  open: { zone: number; kind: string }[],
  windowMs = 60_000,
): NewAlert[] {
  if (!samples.length) return [];
  const sorted = [...samples].sort((a, b) => a.t - b.t);
  const latest = sorted[sorted.length - 1].t;
  const alerts: NewAlert[] = [];
  const isOpen = (zone: number, kind: string) => open.some((o) => o.zone === zone && o.kind === kind);

  ZONES.forEach((zone, k) => {
    const th = thresholdFor(thresholds, zone);

    const tail = sorted.slice(-SUSTAIN_SAMPLES);
    if (tail.length === SUSTAIN_SAMPLES && tail.every((s) => s.z[k] > th.max) && !isOpen(zone, "threshold")) {
      const v = mean(tail.map((s) => s.z[k]));
      alerts.push({
        zone,
        kind: "threshold",
        value: round1(v),
        message: `Zone ${zone} above ${th.max} mmHg for ${SUSTAIN_SAMPLES} readings (avg ${round1(v)} mmHg)`,
      });
    }

    const current = sorted.filter((s) => s.t > latest - windowMs).map((s) => s.z[k]);
    const previous = sorted.filter((s) => s.t > latest - 2 * windowMs && s.t <= latest - windowMs).map((s) => s.z[k]);
    const rise = mean(current) - mean(previous);
    if (current.length >= 10 && previous.length >= 10 && rise >= MIN_RISE && !isOpen(zone, "trend")) {
      const { p } = welch(previous, current);
      if (p < TREND_P) {
        alerts.push({
          zone,
          kind: "trend",
          value: round1(mean(current)),
          message: `Zone ${zone} rose ${round1(rise)} mmHg over the last minute (now ${round1(mean(current))} mmHg)`,
        });
      }
    }
  });
  return alerts;
}

export function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
