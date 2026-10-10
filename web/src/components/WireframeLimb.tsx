"use client";
import {mapLayout,COLORS,STATE_NAMES,status} from '../lib/limb';
export default function WireframeLimb({values,thresholds,location}:{values:(number|null)[];thresholds:{zone:number;min:number;max:number}[];location:string|null}){
 const m=mapLayout(location);
 return <section className="limb-panel"><div className="limb-heading"><div><span className="eyebrow">FIOMET / SENSOR MAP</span><h2>{location??'Select a sensor location'}</h2></div><span className="map-badge">4 SENSORS</span></div>
 <svg viewBox={`0 0 ${m.width} ${m.height}`} className={`anatomy-map ${m.leg?'leg':'arm'}`} role="img" aria-label={`Illustrative anatomy. ${values.map((v,i)=>`Zone ${i+1}: ${v==null?'no data':v+' mmHg'}, ${STATE_NAMES[status(v,thresholds.find(t=>t.zone===i+1))]}`).join('. ')}`}>
 {m.supported?<g transform={m.left?`translate(${m.imageWidth} 0) scale(-1 1)`:undefined}><image href={`/anatomy/${m.leg?'leg':'arm'}-mesh.png`} x="0" y="0" width={m.imageWidth} height={m.imageHeight} preserveAspectRatio="xMidYMid meet"/></g>:<text x={m.width/2} y="90" fill="#b2c9df" textAnchor="middle">Sensor strip schematic</text>}
 {m.sensors.map((s,i)=>{const v=values[i];const color=COLORS[status(v,thresholds.find(t=>t.zone===i+1))];const cx=s.labelX+m.labelWidth/2;const cy=s.labelY+18;return <g key={i}>
 {m.supported&&<g transform={m.left?`translate(${m.imageWidth} 0) scale(-1 1)`:undefined}><path d={s.path} fill={color} fillOpacity=".22" stroke={color} strokeOpacity=".8" strokeWidth="1.3" strokeLinejoin="round"/></g>}
 <circle cx={s.x} cy={s.y} r="4" fill="#0b1728" stroke={color} strokeWidth="1.5"/><path d={`M${s.x} ${s.y} L${cx} ${cy}`} stroke={color} strokeWidth=".8" strokeOpacity=".8"/>
 <rect x={s.labelX} y={s.labelY} width={m.labelWidth} height="36" rx="7" fill="#0b1728" fillOpacity=".94" stroke={color} strokeOpacity=".35"/>
 <text x={s.labelX+9} y={s.labelY+14} fill={color} fontSize="10" letterSpacing="1">ZONE {i+1}</text><text x={s.labelX+m.labelWidth-8} y={s.labelY+28} fill="#eef7ff" fontSize="14" textAnchor="end">{v==null||!Number.isFinite(v)?'–':Math.round(v)}<tspan fontSize="8" fill="#a9bdd0"> mmHg</tspan></text>
 </g>})}</svg><p className="limb-note">{m.supported?(m.leg?'Z1–Z3: leg sleeve · Z4: heel.':'Z1–Z3: forearm · Z4: above elbow.'):'Illustrative anatomy.'} Confirm sensor placement during setup.</p><div className="limb-legend">{Object.entries(COLORS).map(([key,color])=><span key={key}><i style={{background:color}}/>{STATE_NAMES[key as keyof typeof STATE_NAMES]}</span>)}</div></section>;
}
