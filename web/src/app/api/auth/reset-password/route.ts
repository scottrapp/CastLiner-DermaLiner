import {createHash} from 'node:crypto';
import bcrypt from 'bcryptjs';
import {z} from 'zod';
import {tx} from '@/lib/db';
import {json,error} from '@/lib/api';
import {COOKIE,cookieOptions} from '@/lib/auth';
const Body=z.object({token:z.string().regex(/^[a-f0-9]{64}$/),password:z.string().min(12).max(72).refine(v=>Buffer.byteLength(v,'utf8')<=72)});
export async function POST(req:Request){
 const parsed=Body.safeParse(await req.json().catch(()=>null));if(!parsed.success)return error('Use a valid reset link and a password of 12–72 characters.');
 const hash=createHash('sha256').update(parsed.data.token).digest('hex');const passwordHash=await bcrypt.hash(parsed.data.password,12);
 try{
 const ok=await tx(async query=>{
  const rows=await query<{id:number;clinician_id:number|null;patient_id:number|null}>(`SELECT id,clinician_id,patient_id FROM password_reset WHERE token_hash=$1 AND expires_at>now() AND used_at IS NULL FOR UPDATE`,[hash]);const r=rows[0];if(!r)return false;
  if(r.clinician_id)await query(`UPDATE clinician SET password_hash=$1,session_version=session_version+1 WHERE id=$2`,[passwordHash,r.clinician_id]);
  else await query(`UPDATE patient_account SET password_hash=$1,session_version=session_version+1 WHERE patient_id=$2`,[passwordHash,r.patient_id]);
  await query(`UPDATE password_reset SET used_at=now() WHERE (clinician_id=$1 OR patient_id=$2) AND used_at IS NULL`,[r.clinician_id,r.patient_id]);return true;
 });
 if(!ok)return error('This reset link is invalid, expired or already used. Request a new link.');
 const response=json({ok:true});response.cookies.set(COOKIE,'',{...cookieOptions,maxAge:0});return response;
 }catch{return error('Password reset is unavailable. Contact your administrator.',503)}
}
