import {randomBytes,createHash} from 'node:crypto';
import {z} from 'zod';
import {tx,q} from '@/lib/db';
import {json,error} from '@/lib/api';
const message='If an account exists for that email, a password reset link will be sent. If it does not arrive, contact your administrator.';
export async function POST(req:Request){
 const parsed=z.object({email:z.string().trim().email().max(254)}).safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return error('Enter a valid email.');
 const key=process.env.RESEND_API_KEY,from=process.env.EMAIL_FROM,base=process.env.APP_URL;
 if(!key||!from||!base)return error('Password reset email is not configured. Contact your organization administrator.',503);
 let origin:string;try{const u=new URL(base);if(u.protocol!=='https:'&&u.hostname!=='localhost')throw Error();origin=u.origin}catch{return error('Password reset is unavailable. Contact your administrator.',503)}
 const email=parsed.data.email.toLowerCase(),emailHash=createHash('sha256').update(email).digest('hex');
 const token=randomBytes(32).toString('hex'),hash=createHash('sha256').update(token).digest('hex');
 try{
 const reset=await tx(async query=>{
  const allowed=await query(`INSERT INTO password_reset_request(email_hash) VALUES($1) ON CONFLICT(email_hash) DO UPDATE SET requested_at=now() WHERE password_reset_request.requested_at<now()-interval '2 minutes' RETURNING email_hash`,[emailHash]);
  if(!allowed.length)return null;
  const clinicians=await query<{id:number}>(`SELECT id FROM clinician WHERE lower(email)=lower($1) FOR UPDATE`,[email]);
  const accounts=clinicians.length?[]:await query<{id:number}>(`SELECT patient_id AS id FROM patient_account WHERE lower(email)=lower($1) FOR UPDATE`,[email]);
  const c=clinicians[0]?.id??null,p=accounts[0]?.id??null;if(!c&&!p)return null;
  await query(`UPDATE password_reset SET used_at=now() WHERE (clinician_id=$1 OR patient_id=$2) AND used_at IS NULL`,[c,p]);
  const rows=await query<{id:number}>(`INSERT INTO password_reset(clinician_id,patient_id,token_hash,expires_at) VALUES($1,$2,$3,now()+interval '30 minutes') RETURNING id`,[c,p,hash]);
  return rows[0];
 });
 if(reset){
  try{
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[email],subject:'Reset your CastLiner password',text:`Use this link to choose a new password: ${origin}/reset-password#${token}\n\nThis link expires in 30 minutes and can be used once. If you did not request it, ignore this email.`}),signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error('Email rejected');
  }catch{await q(`UPDATE password_reset SET used_at=now() WHERE id=$1`,[reset.id]);console.error('Password reset email delivery failed');}
 }
 return json({message});
 }catch{console.error('Password reset backend unavailable');return error('Password reset is unavailable. Contact your administrator.',503)}
}
