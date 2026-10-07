export type PatientDraft = {firstName:string;lastName:string;mrn:string;dob:string;sex:string;email:string;sensorLocation:string;heightCm:string;weightKg:string};
export type RangeDraft = {zone:number;min:string;max:string};
export const emptyDraft:PatientDraft={firstName:'',lastName:'',mrn:'',dob:'',sex:'',email:'',sensorLocation:'',heightCm:'',weightKg:''};
export function validateDetails(d:PatientDraft):string {
 if(!d.firstName.trim()||!d.lastName.trim())return 'Enter a first and last name.';
 if(d.dob){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d.dob))return 'Use YYYY-MM-DD for date of birth.';
  const date=new Date(d.dob+'T00:00:00Z');
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==d.dob||date.getTime()>Date.now())return 'Enter a valid date of birth that is not in the future.';
 }
 if(d.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()))return 'Enter a valid email address.';
 for (const [label,v,max] of [['height',d.heightCm,300],['weight',d.weightKg,700]] as const) if(v.trim()&&(!Number.isFinite(Number(v))||Number(v)<=0||Number(v)>max))return `Enter a valid ${label}.`;
 return '';
}
export function validateRanges(r:RangeDraft[]):string {
 if(r.length!==4||new Set(r.map(t=>t.zone)).size!==4||r.some(t=>!Number.isInteger(t.zone)||t.zone<1||t.zone>4))return 'Configure all four zones.';
 if(r.some(t=>!t.min.trim()||!t.max.trim()||!Number.isFinite(Number(t.min))||!Number.isFinite(Number(t.max))||Number(t.min)<0||Number(t.min)>=Number(t.max)))return 'Each zone needs a nonnegative minimum below its maximum.';
 return '';
}
export function payload(d:PatientDraft,r:RangeDraft[]) {
 return {...Object.fromEntries(Object.entries(d).map(([k,v])=>[k,v.trim()||null])),firstName:d.firstName.trim(),lastName:d.lastName.trim(),heightCm:d.heightCm.trim()?Number(d.heightCm):null,weightKg:d.weightKg.trim()?Number(d.weightKg):null,thresholds:r.map(t=>({zone:t.zone,min:Number(t.min),max:Number(t.max)}))};
}
