// Advisory evaluation of the 2023 segment rules. Does not replace existing alerts.
// Thresholds are supplied by the clinician; no three-zone presets are extrapolated.
import type { Frame } from './pressureAI';
export type Range = { zone:number; min:number; max:number };
export type SegmentState = 'none'|'ok'|'high'|'low'|'warning';
export function medicalHistory(frames: Frame[], ranges: Range[], now: number, windowMs=30*60*1000, minimumSamples=10) {
 if (!Number.isFinite(windowMs) || windowMs<=0 || !Number.isInteger(minimumSamples) || minimumSamples<1) throw new Error('Invalid segment configuration');
 const end=Math.floor(now/windowMs)*windowMs;
 const result: {start:number; states:SegmentState[]; means:(number|null)[]}[]=[];
 const high=[0,0,0,0]; const low=[0,0,0,0];
 // Four completed segments; incomplete current segment cannot establish duration.
 for(let start=end-4*windowMs;start<end;start+=windowMs) {
  const bucket=frames.filter(f=>f.t>=start&&f.t<start+windowMs).sort((a,b)=>a.t-b.t);
  const means:(number|null)[]=[]; const states:SegmentState[]=[];
  for(let k=0;k<4;k++) {
   const range=ranges.find(r=>r.zone===k+1);
   // Require coverage across segment and across the interior, not ten clustered values.
   const maxGap=windowMs/minimumSamples*1.5;
   const covered=bucket.length>=minimumSamples && bucket[0].t-start<=maxGap && start+windowMs-bucket[bucket.length-1].t<=maxGap && bucket.every((f,i)=>!i||f.t-bucket[i-1].t<=maxGap);
   const valid=covered && range && Number.isFinite(range.min) && Number.isFinite(range.max) && range.min<=range.max && bucket.every(f=>Number.isFinite(f.z[k])&&f.z[k]>=0);
   const mean=valid?bucket.reduce((s,f)=>s+f.z[k],0)/bucket.length:null; means.push(mean);
   if(mean===null||!range){high[k]=low[k]=0;states.push('none');continue;}
   if(mean>range.max){high[k]++;low[k]=0;states.push(high[k]>=4?'high':high[k]>=2?'warning':'ok');}
   else if(mean<range.min){low[k]++;high[k]=0;states.push('low');}
   else {high[k]=low[k]=0;states.push('ok');}
  }
  result.push({start,states,means});
 }
 return {segments:result, alertZones:high.map((v,i)=>v>=4||low[i]>=4?i+1:0).filter(Boolean)};
}
