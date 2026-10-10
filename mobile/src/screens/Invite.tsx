import {useEffect,useState} from 'react';
import {Share} from 'react-native';
import {api} from '../api';
import {FormPage,Field} from '../forms';
import {Card,H,Soft,Button,ErrorText} from '../ui';
export default function Invite({id}:{id:number}){
 const [email,setEmail]=useState('');const [status,setStatus]=useState<Awaited<ReturnType<typeof api.inviteStatus>>|null>(null);const [link,setLink]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{Promise.all([api.patient(id),api.inviteStatus(id)]).then(([p,s])=>{setEmail(p.email??'');setStatus(s)}).catch(e=>setError(e.message))},[id]);
 async function generate(){setBusy(true);setError('');try{const r=await api.invite(id,email);setLink(r.url);setStatus(await api.inviteStatus(id))}catch(e){setError(e instanceof Error?e.message:'Could not create invitation')}finally{setBusy(false)}}
 return <FormPage><H>Patient invitation</H><ErrorText>{error}</ErrorText><Card>{status?.account?<><H>Account active</H><Soft>{status.account.email}</Soft></>:<><Soft>Invite the patient to create a password and sign in to their own monitoring view.</Soft><Field label="Patient invitation email" value={email} onChange={v=>{setEmail(v);setLink('')}}/>{status?.invite&&<Soft>Last invitation: {status.invite.acceptedAt?'Accepted':status.invite.revokedAt?'Replaced':Date.parse(status.invite.expiresAt)<Date.now()?'Expired':'Awaiting acceptance'}</Soft>}<Button title={status?.invite?'Generate replacement invitation':'Generate invitation'} onPress={generate} busy={busy} disabled={!email}/>{link&&<><Soft>The link expires in seven days and can be used once. A replacement invalidates the previous link.</Soft><Button title="Share invitation link" onPress={()=>Share.share({message:`You are invited to CastLiner. Set up your patient account using ${email}: ${link}`}).catch(e=>setError(e.message))}/></>}<Soft>Invitations are shared from your device. Automatic email delivery is not configured.</Soft></>}</Card></FormPage>;
}
