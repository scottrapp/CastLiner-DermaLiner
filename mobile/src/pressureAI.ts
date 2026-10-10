// Shadow inference only. Never filters readings, alters thresholds, or suppresses alerts.
export type Frame = { t: number; z: [number, number, number, number] };
export type Assessment = { state: 'unavailable' | 'warming' | 'uncertain' | 'stable' | 'positional' | 'sustained'; confidence: number | null; reason: string };
export const WINDOW = 64;
export const PERIOD_MS = 1000;
export const LABELS = ['stable', 'positional', 'sustained', 'uncertain'] as const;
export type FrozenModel = { version: string; validated: boolean; run(input: Float32Array): number[] };
// Native LiteRT bridge can implement run(). No model is installed by default.
let model: FrozenModel | null = null;
export function installModel(next: FrozenModel | null) { model = next; }
export function modelInput(frames: Frame[]): Float32Array | null {
 const tail = frames.slice(-WINDOW);
 if (tail.length !== WINDOW) return null;
 const out = new Float32Array(WINDOW * 8);
 for (let i = 0; i < WINDOW; i++) {
  if (!Number.isFinite(tail[i].t) || tail[i].z.length !== 4 || tail[i].z.some(v => !Number.isFinite(v) || v < 0 || v > 200)) return null;
  if (i && Math.abs(tail[i].t - tail[i-1].t - PERIOD_MS) > 200) return null;
  tail[i].z.forEach((v,k) => { out[i*8+k]=v/100; out[i*8+4+k]=i ? (v-tail[i-1].z[k])/100 : 0; });
 }
 return out;
}
export function assess(frames: Frame[]): Assessment {
 if (!model?.validated) return {state:'unavailable',confidence:null,reason:'Validated model not installed. Pressure rules remain active.'};
 if (frames.length < WINDOW) return {state:'warming',confidence:null,reason:'Collecting a 64-second window.'};
 const input = modelInput(frames);
 if (!input) return {state:'uncertain',confidence:null,reason:'Invalid calibration, sample timing, or missing data.'};
 try {
  const scores = model.run(input);
  if (scores.length !== 4 || scores.some(v=>!Number.isFinite(v)||v<0||v>1) || Math.abs(scores.reduce((a,b)=>a+b,0)-1)>.01) throw new Error('Invalid model output');
  const confidence = Math.max(...scores); const label=LABELS[scores.indexOf(confidence)];
  return {state: confidence < .85 ? 'uncertain' : label, confidence, reason:`Shadow model ${model.version}; pressure alerts remain independent.`};
 } catch { return {state:'uncertain',confidence:null,reason:'Model execution failed. Pressure rules remain active.'}; }
}
