import {randomBytes,createHash} from 'node:crypto';
import {z} from 'zod';
import {one,tx} from '@/lib/db';
import {getPatient} from '@/lib/repo';
import {json,error,withSession} from '@/lib/api';
type Ctx={params:{id:string}};
export const GET=withSession(async (_s,_req:Request,{params}:Ctx)=>{
 const id=Number(params.id);const account=await one(`SELECT email,created_at AS "createdAt" FROM patient_account WHERE patient_id=$1`,[id]);
 const invite=await one(`SELECT email,expires_at AS "expiresAt",accepted_at AS "acceptedAt",revoked_at AS "revokedAt" FROM patient_invite WHERE patient_id=$1 ORDER BY created_at DESC LIMIT 1`,[id]);
 return json({account,invite});
});
export const POST=withSession(async (s,req:Request,{params}:Ctx)=>{
 const id=Number(params.id);if(!Number.isInteger(id)||id<1||!await getPatient(id))return error('Patient not found.',404);
 const parsed=z.object({email:z.string().trim().email()}).safeParse(await req.json().catch(()=>null));if(!parsed.success)return error('Enter a valid invitation email.');
 const email=parsed.data.email.toLowerCase();
 if(await one(`SELECT patient_id FROM patient_account WHERE patient_id=$1 OR email=$2`,[id,email]))return error('A patient account already exists for this patient or email.',409);
 if(await one(`SELECT id FROM clinician WHERE lower(email)=lower($1)`,[email]))return error('Use a patient email different from a clinician account.',409);
 const token=randomBytes(32).toString('hex');const hash=createHash('sha256').update(token).digest('hex');
 await tx(async q=>{await q(`SELECT id FROM patient WHERE id=$1 FOR UPDATE`,[id]);await q(`UPDATE patient_invite SET revoked_at=now() WHERE patient_id=$1 AND accepted_at IS NULL AND revoked_at IS NULL`,[id]);await q(`INSERT INTO patient_invite(patient_id,clinician_id,email,token_hash,expires_at) VALUES($1,$2,$3,$4,now()+interval '7 days')`,[id,s.clinicianId,email,hash]);});
 return json({url:`${new URL(req.url).origin}/activate#${token}`,expiresInDays:7,email},201);
});
