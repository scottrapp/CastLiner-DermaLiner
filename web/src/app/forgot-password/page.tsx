'use client';
import {useState} from 'react';
import Link from 'next/link';
export default function Forgot(){const [email,setEmail]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false);
async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage('');try{const r=await fetch('/api/auth/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});const d=await r.json();if(!r.ok)throw Error(d.error);setDone(true);setMessage(d.message)}catch(e){setMessage(e instanceof Error?e.message:'Could not connect. Try again.')}finally{setBusy(false)}}
return <main className="loginwrap auth-background"><form className="login" onSubmit={submit}><h1>Reset your password</h1><p className="muted">Enter the email used for your account.</p>{!done&&<><label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="primary" disabled={busy}>{busy?'Requesting link…':'Send reset link'}</button></>}<p role="status">{message}</p><Link href="/login">Back to sign in</Link></form></main>}
