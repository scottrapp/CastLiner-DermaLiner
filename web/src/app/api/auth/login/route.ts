import {one} from "@/lib/db";
import bcrypt from "bcryptjs";
import {z} from "zod";
import {createToken,COOKIE,cookieOptions,REMEMBER_SECONDS} from "@/lib/auth";
import {json,error} from "@/lib/api";
const Body=z.object({email:z.string().trim().email(),password:z.string().min(1).max(72),remember:z.boolean().optional().default(false)});
export async function POST(req:Request){
 const parsed=Body.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return error("Enter your email and password.");
 try{
 const c=await one<{id:number;email:string;name:string;passwordHash:string;version:number}>(`SELECT id,email,name,password_hash AS "passwordHash",session_version AS version FROM clinician WHERE lower(email)=lower($1)`,[parsed.data.email]);
 const a=c?null:await one<{patientId:number;email:string;name:string;passwordHash:string;version:number}>(`SELECT a.patient_id AS "patientId",a.email,a.password_hash AS "passwordHash",a.session_version AS version,p.first_name||' '||p.last_name AS name FROM patient_account a JOIN patient p ON p.id=a.patient_id WHERE lower(a.email)=lower($1)`,[parsed.data.email]);
 const account=c??a;
 if(!account||!await bcrypt.compare(parsed.data.password,account.passwordHash))return error("That email and password don't match an account.",401);
 const token=await createToken({clinicianId:c?.id??0,role:c?"clinician":"patient",patientId:a?.patientId,email:account.email,name:account.name,sessionVersion:account.version},parsed.data.remember);
 const res=json({token,role:c?"clinician":"patient",...(c?{clinician:{id:c.id,email:c.email,name:c.name}}:{patientId:a!.patientId})});
 res.cookies.set(COOKIE,token,{...cookieOptions,...(parsed.data.remember?{maxAge:REMEMBER_SECONDS}:{maxAge:undefined})});
 return res;
 }catch{console.error("Sign-in backend unavailable");return error("Sign-in is unavailable. Ask your administrator to check the database and account setup.",503);}
}
