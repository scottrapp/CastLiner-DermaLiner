"use client";
import { useEffect, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import WireframeLimb from "./WireframeLimb";
import type { PatientDTO } from "./PatientView";

type Sample = { t: number; z: [number, number, number, number] };
type Segment = { start: number; n: number; mean: (number | null)[]; status: string[] };
type Data = {
  thresholds: { zone: number; min: number; max: number }[];
  latest: Sample | null;
  chart: Sample[];
  recent: Sample[];
  segments: Segment[];
};

const WINDOWS = [
  { label: "5m", minutes: 5, segment: 30 },
  { label: "10m", minutes: 10, segment: 30 },
  { label: "30m", minutes: 30, segment: 60 },
  { label: "1h", minutes: 60, segment: 60 },
  { label: "3h", minutes: 180, segment: 300 },
  { label: "12h", minutes: 720, segment: 900 },
  { label: "1d", minutes: 1440, segment: 1800 },
];
// Distinguishable without relying on red/green, which are reserved for status.
const LINE_COLORS = ["#6f42c1", "#1f6fb2", "#0f8b8d", "#c26a00"];
const STALE_MS = 15_000;
const GAP_MS = 15_000;

function time(t: number, withSeconds = false) {
  return new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", ...(withSeconds ? { second: "2-digit" } : {}) });
}

export default function LiveView({ patient }: { patient: PatientDTO }) {
  const [win, setWin] = useState(WINDOWS[1]);
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(`/api/patients/${patient.id}/readings?minutes=${win.minutes}&segment=${win.segment}`, { cache: "no-store" });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Server returned ${res.status}`);
        const d = await res.json();
        if (alive) { setData(d); setErr(""); }
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "Couldn't load readings.");
      }
    }
    load();
    const id = setInterval(load, 2000);
    return () => { alive = false; clearInterval(id); };
  }, [patient.id, win]);

  const th = (zone: number) => data?.thresholds.find((t) => t.zone === zone) ?? { zone, min: 0, max: 30 };
  const stale = !data?.latest || Date.now() - data.latest.t > STALE_MS;
  // Break the lines where the module was disconnected instead of drawing straight across the gap.
  const chartData: Record<string, number | null>[] = [];
  for (const [i, s] of (data?.chart ?? []).entries()) {
    const prev = data!.chart[i - 1];
    if (prev && s.t - prev.t > GAP_MS) chartData.push({ t: prev.t + 1, "Zone 1": null, "Zone 2": null, "Zone 3": null, "Zone 4": null });
    chartData.push({ t: s.t, "Zone 1": s.z[0], "Zone 2": s.z[1], "Zone 3": s.z[2], "Zone 4": s.z[3] });
  }
  const maxLine = Math.max(...[1, 2, 3, 4].map((z) => th(z).max));

  return (
    <>
      {err && <p className="error" role="alert">{err}</p>}
      <WireframeLimb values={stale ? [null,null,null,null] : data!.latest!.z} thresholds={data?.thresholds ?? patient.thresholds} location={patient.sensorLocation} />
      <div className="zones" aria-live="polite">
        {[1, 2, 3, 4].map((zone) => {
          const v = stale ? null : data!.latest!.z[zone - 1];
          const t = th(zone);
          const status = v == null ? "none" : v > t.max ? "high" : v < t.min ? "low" : "ok";
          return (
            <div key={zone} className={`zone ${status}`}>
              <span className="name">Zone {zone}</span>
              <span className="value">{v == null ? "–" : Math.round(v)}<small>mmHg</small></span>
              <span className="range">Target {t.min}–{t.max}</span>
            </div>
          );
        })}
      </div>
      <p className="muted" style={{ marginTop: "-0.4rem" }}>
        {data?.latest
          ? stale
            ? `No readings for ${Math.round((Date.now() - data.latest.t) / 1000)} s. Last reading ${time(data.latest.t, true)}. Check the module is on and the phone app is connected.`
            : `Live · updated ${time(data.latest.t, true)}`
          : "No readings yet. Connect the module from the phone app to start."}
      </p>

      <div className="panel">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <h2 style={{ margin: 0 }}>Pressure</h2>
          <div className="row" role="group" aria-label="Time window">
            {WINDOWS.map((w) => (
              <button key={w.label} className={w === win ? "primary" : ""} onClick={() => setWin(w)} aria-pressed={w === win}>{w.label}</button>
            ))}
          </div>
        </div>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#e6ebef" />
              <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(t) => time(t, win.minutes <= 10)} minTickGap={40} stroke="#52606d" fontSize={12} />
              <YAxis stroke="#52606d" fontSize={12} width={40} label={{ value: "mmHg", angle: -90, position: "insideLeft", fontSize: 12 }} />
              <Tooltip labelFormatter={(t) => time(Number(t), true)} formatter={(v: number) => `${Math.round(v * 10) / 10} mmHg`} />
              <Legend />
              <ReferenceLine y={maxLine} stroke="#c8213a" strokeDasharray="4 4" label={{ value: `Max ${maxLine}`, fontSize: 11, fill: "#c8213a", position: "insideTopRight" }} />
              {[1, 2, 3, 4].map((z) => (
                <Line key={z} type="monotone" dataKey={`Zone ${z}`} stroke={LINE_COLORS[z - 1]} dot={false} strokeWidth={1.8} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel">
        <h2>History by {win.segment >= 60 ? `${win.segment / 60}-minute` : `${win.segment}-second`} segment</h2>
        {data && data.segments.length > 0 ? (
          <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
            <div className="striplabels">{[1, 2, 3, 4].map((z) => <span key={z}>Z{z}</span>)}</div>
            <div className="strip" style={{ flex: 1 }}>
              {data.segments.map((s) => (
                <div className="col" key={s.start} title={`${time(s.start)} · ${s.n} readings · ${s.mean.map((m, i) => `Z${i + 1} ${m == null ? "–" : Math.round(m)}`).join(", ")}`}>
                  {s.status.map((st, i) => <div key={i} className={`cell ${st}`} />)}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="muted">No segments in this window.</p>
        )}
        <p className="muted" style={{ marginBottom: 0, fontSize: "0.85rem" }}>Green is within target, red is above the maximum, blue is below target, grey is no data. Hover a column for averages.</p>
      </div>

      <div className="tablewrap" style={{ maxHeight: 420, overflowY: "auto" }}>
        <table>
          <thead>
            <tr><th>Time</th>{[1, 2, 3, 4].map((z) => <th key={z} className="num">Zone {z}</th>)}</tr>
          </thead>
          <tbody>
            {(data?.recent ?? []).map((s) => (
              <tr key={s.t}>
                <td>{new Date(s.t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" })}</td>
                {s.z.map((v, i) => <td key={i} className="num">{v > th(i + 1).max ? <span className="hi">{Math.round(v)}</span> : Math.round(v)}</td>)}
              </tr>
            ))}
            {!data?.recent.length && <tr><td colSpan={5} className="muted">No readings in this window.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
