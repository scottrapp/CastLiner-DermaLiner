// Run with: npm test   (uses Node's built-in TypeScript stripping, Node 22.18+)
import { test } from "node:test";
import assert from "node:assert/strict";
import { welch, ibeta, segment, evaluateAlerts, zoneStatus, SUSTAIN_SAMPLES } from "./analysis.ts";

const th = [1, 2, 3, 4].map((zone) => ({ zone, min: 0, max: 30 }));
const t0 = Date.UTC(2026, 8, 26, 12, 0, 0);

test("incomplete beta matches known values", () => {
  assert.ok(Math.abs(ibeta(0.5, 1, 1) - 0.5) < 1e-9);
  assert.ok(Math.abs(ibeta(0.3, 2, 3) - 0.3483) < 1e-4);
});

test("welch p-value matches reference (t=3, df=8, p=0.01707)", () => {
  const r = welch([1, 2, 3, 4, 5], [4, 5, 6, 7, 8]);
  assert.ok(Math.abs(r.t - 3) < 1e-9);
  assert.ok(Math.abs(r.p - 0.01707) < 5e-4, `p=${r.p}`);
});

test("zone status", () => {
  assert.equal(zoneStatus(31, th[0]), "high");
  assert.equal(zoneStatus(20, th[0]), "ok");
  assert.equal(zoneStatus(null, th[0]), "none");
});

test("segments average readings and keep empty windows", () => {
  const samples = Array.from({ length: 60 }, (_, i) => ({ t: t0 + i * 1000, z: [10, 20, 35, 5] }));
  const segs = segment(samples, th, t0, t0 + 180_000);
  assert.equal(segs.length, 3);
  assert.equal(segs[0].n, 60);
  assert.deepEqual(segs[0].status, ["ok", "ok", "high", "ok"]);
  assert.equal(segs[1].n, 0);
  assert.deepEqual(segs[1].status, ["none", "none", "none", "none"]);
});

test("sustained high readings raise one threshold alert", () => {
  const samples = Array.from({ length: SUSTAIN_SAMPLES }, (_, i) => ({ t: t0 + i * 1000, z: [10, 10, 40, 10] }));
  const a = evaluateAlerts(samples, th, []);
  assert.equal(a.length, 1);
  assert.equal(a[0].zone, 3);
  assert.equal(a[0].kind, "threshold");
  assert.equal(evaluateAlerts(samples, th, [{ zone: 3, kind: "threshold" }]).length, 0);
});

test("a significant rise below threshold raises a trend alert; noise does not", () => {
  const noise = (i) => ((i * 7919) % 5) - 2; // deterministic jitter of +/-2
  const prev = Array.from({ length: 60 }, (_, i) => ({ t: t0 + i * 1000, z: [12 + noise(i), 12, 12, 12] }));
  const curr = Array.from({ length: 60 }, (_, i) => ({ t: t0 + 60_000 + i * 1000, z: [22 + noise(i), 12 + noise(i), 12, 12] }));
  const a = evaluateAlerts([...prev, ...curr], th, []);
  assert.equal(a.length, 1);
  assert.equal(a[0].zone, 1);
  assert.equal(a[0].kind, "trend");
});
