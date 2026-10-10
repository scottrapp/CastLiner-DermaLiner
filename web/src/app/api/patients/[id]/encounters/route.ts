import {z} from 'zod';
import {q} from '@/lib/db';
import {getPatient} from '@/lib/repo';
import {json,error,withSession} from '@/lib/api';
type Ctx={params:{id:string}};
const Fields=z.object({title:z.string().trim().min(1).max(200),body:z.string().trim().max(10000).default(''),occurredAt:z.string().datetime({offset:true})});
export const GET=withSession(async (_s,_req:Request,{params}:Ctx)=>{
 const id=Number(params.id); if(!Number.isInteger(id)||id<1)return error('Invalid patient.');
 if(!await getPatient(id))return error('Patient not found.',404);
 const records=await q(`SELECT n.id,n.title,n.body,n.occurred_at AS "occurredAt",n.created_at AS "createdAt",c.name AS author FROM patient_encounter n JOIN clinician c ON c.id=n.clinician_id WHERE n.patient_id=$1 ORDER BY n.occurred_at DESC LIMIT 200`,[id]);
 return json({records});
});
export const POST=withSession(async (s,req:Request,{params}:Ctx)=>{
 const id=Number(params.id);if(!Number.isInteger(id)||id<1)return error('Invalid patient.');
 if(!await getPatient(id))return error('Patient not found.',404);
 const parsed=Fields.safeParse(await req.json().catch(()=>null));if(!parsed.success)return error(parsed.error.issues[0]?.message??'Check the entry.');
 const records=await q(`INSERT INTO patient_encounter (patient_id,clinician_id,title,body,occurred_at) VALUES ($1,$2,$3,$4,$5) RETURNING id`,[id,s.clinicianId,parsed.data.title,parsed.data.body,parsed.data.occurredAt]);
 return json({record:records[0]},201);
});
