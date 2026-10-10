import {createHash} from 'node:crypto';
import bcrypt from 'bcryptjs';
import {z} from 'zod';
import {tx} from '@/lib/db';
import {json,error} from '@/lib/api';
const Body=z.object({token:z.string().regex(/^[a-f0-9]{64}$/),email:z.string().trim().email(),password:z.string().min(12).max(72).refine(v=>Buffer.byteLength(v,'utf8')<=72)});
export async function POST(req:Request){
 const parsed=Body.safeParse(await req.json().catch(()=>null));if(!parsed.success)return error('Use a valid invitation, email and a password of 12–72 characters.');
 const hash=createHash('sha256').update(parsed.data.token).digest('hex');const passwordHash=await bcrypt.hash(parsed.data.password,12);
 try{
 const accepted=await tx(async q=>{const invites=await q<{id:number;patientId:number;email:string}>(`SELECT id,patient_id AS "patientId",email FROM patient_invite WHERE token_hash=$1 AND expires_at>now() AND accepted_at IS NULL AND revoked_at IS NULL FOR UPDATE`,[hash]);const invite=invites[0];if(!invite||invite.email.toLowerCase()!==parsed.data.email.toLowerCase())return false;await q(`INSERT INTO patient_account(patient_id,email,password_hash) VALUES($1,$2,$3)`,[invite.patientId,invite.email,passwordHash]);await q(`UPDATE patient_invite SET accepted_at=now() WHERE id=$1`,[invite.id]);return true;});
 return accepted?json({ok:true}):error('Invitation is invalid, expired, or already used.',400);
 }catch{return error('This invitation cannot be accepted. Ask your clinician for help.',409);}
}
