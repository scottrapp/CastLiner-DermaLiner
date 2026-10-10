// Broad sleeve sections. Arm Z4 above elbow; leg Z4 on heel.
export const ARM_SENSORS = [
 {x:195,y:302,labelX:155,labelY:394,path:'M155 257 Q166 259 178 259 L237 264 L237 344 Q189 355 149 352 Q107 353 85 331 Q72 310 77 280 Z'},
 {x:282,y:301,labelX:246,labelY:394,path:'M237 264 Q282 267 328 269 L328 332 Q284 337 237 344 Z'},
 {x:375,y:299,labelX:350,labelY:394,path:'M328 269 Q373 270 423 268 L423 326 Q381 328 328 332 Z'},
 {x:109,y:180,labelX:207,labelY:157,path:'M46 61 Q92 75 137 38 L155 257 Q113 262 77 280 Q63 244 55 190 Z'},
];
const LEG_PROFILE=[{y:60,l:122,r:231},{y:180,l:135,r:242},{y:220,l:151,r:240},{y:280,l:169,r:236},{y:320,l:151,r:225},{y:360,l:141,r:232},{y:410,l:154,r:230},{y:445,l:171,r:225},{y:485,l:177,r:223},{y:523,l:176,r:225}];
function contour(y:number){const i=LEG_PROFILE.findIndex(p=>p.y>=y);if(i<=0)return {...LEG_PROFILE[0],y};const a=LEG_PROFILE[i-1],b=LEG_PROFILE[i];const t=(y-a.y)/(b.y-a.y);return {y,l:a.l+t*(b.l-a.l),r:a.r+t*(b.r-a.r)};}
function legSection(from:number,to:number){const points=[contour(from),...LEG_PROFILE.filter(p=>p.y>from&&p.y<to),contour(to)];return 'M'+points.map(p=>`${p.l.toFixed(1)} ${p.y}`).join(' L')+' L'+points.slice().reverse().map(p=>`${p.r.toFixed(1)} ${p.y}`).join(' L')+' Z';}
export function legSensors(long:boolean){const cuts=long?[60,214,369,523]:[280,361,442,523];return [0,1,2].map(i=>({x:190,y:(cuts[i]+cuts[i+1])/2,labelX:302,labelY:(cuts[i]+cuts[i+1])/2-18,path:legSection(cuts[i],cuts[i+1])})).concat([{x:184,y:550,labelX:302,labelY:532,path:'M176 523 L225 523 Q219 538 224 550 L235 575 Q210 578 191 578 Q168 575 165 563 Q162 545 176 523 Z'}]);}
export const COLORS={ok:'#39d69a',high:'#ff6079',low:'#53b9ff',none:'#687b92'};
export const STATE_NAMES={ok:'Within target',high:'Above target',low:'Below target',none:'No data'};
export type Status=keyof typeof COLORS;
export function status(v:number|null,th?:{min:number;max:number}):Status {if(v==null||!Number.isFinite(v))return 'none';const t=th??{min:0,max:30};return v>t.max?'high':v<t.min?'low':'ok';}
export function mapLayout(location:string|null){
 const leg=/leg|heel/i.test(location??'');const longLeg=/long leg/i.test(location??'');const supported=/arm|leg|heel/i.test(location??'');const left=/left/i.test(location??'');
 const width=leg?440:640;const imageWidth=leg?390:640;const height=supported?(leg?640:460):300;
 const sensors=supported?(leg?legSensors(longLeg):ARM_SENSORS):[0,1,2,3].map(i=>({x:80+i*160,y:150,labelX:35+i*160,labelY:192,path:''}));
 return {leg,supported,left,width,height,imageWidth,imageHeight:leg?640:427,labelWidth:leg?118:90,sensors:sensors.map(s=>({...s,x:left?imageWidth-s.x:s.x,labelX:left?width-s.labelX-(leg?118:90):s.labelX}))};
}
