export type Tab = 'Details' | 'Live' | 'Historical' | 'Encounters' | 'Notes';
export const PATIENT_TABS: Tab[] = ['Details','Live','Historical','Encounters','Notes'];
export type Route = {name:'patients'} | {name:'onboarding';id?:number} | {name:'patient';id:number;tab:Tab} | {name:'modules';id?:number;patientName?:string} | {name:'alerts'} | {name:'settings'} | {name:'epic'} | {name:'invite';id:number};
export function pushRoute(stack:Route[],next:Route):Route[] {
 const current=stack[stack.length-1];
 if(current?.name==='patient' && next.name==='patient' && current.id===next.id) return [...stack.slice(0,-1),next];
 return [...stack,next];
}
export function popRoute(stack:Route[]):Route[] {return stack.length>1?stack.slice(0,-1):stack;}
export function openPatient(id:number,tab:Tab='Details'):Route {return {name:'patient',id,tab};}
