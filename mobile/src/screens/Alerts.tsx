import {useCallback,useEffect,useState} from 'react';
import {Alert,ScrollView} from 'react-native';
import {api} from '../api';
import {Card,H,Soft,Button,ErrorText} from '../ui';
export default function Alerts({onPatient,readOnly=false}:{onPatient(id:number):void;readOnly?:boolean}) {
 const [list,setList]=useState<Awaited<ReturnType<typeof api.alerts>>>([]);const [error,setError]=useState('');const [busy,setBusy]=useState<number|null>(null);
 const load=useCallback(async()=>{try{setList(await api.alerts());setError('')}catch(e){setError(e instanceof Error?e.message:'Could not load alerts')}},[]);useEffect(()=>{load()},[load]);
 async function resolve(id:number){setBusy(id);try{await api.resolve(id);await load()}catch(e){setError(e instanceof Error?e.message:'Could not resolve alert')}finally{setBusy(null)}}
 return <ScrollView contentContainerStyle={{padding:16}}><H>Alerts</H><ErrorText>{error}</ErrorText>{list.map(a=><Card key={a.id}><H>{a.patient?`${a.patient.firstName} ${a.patient.lastName}`:`Patient ${a.patientId}`} · Zone {a.zone}</H><Soft>{a.message}</Soft><Soft>{new Date(a.createdAt).toLocaleString()}</Soft><Button title="Open patient" onPress={()=>onPatient(a.patientId)}/>{!readOnly&&<Button title="Mark resolved" kind="plain" busy={busy===a.id} disabled={busy!==null} onPress={()=>Alert.alert('Resolve alert?','This records acknowledgment; it does not confirm pressure has normalized.',[{text:'Cancel',style:'cancel'},{text:'Resolve',onPress:()=>resolve(a.id)}])}/> }</Card>)}{!list.length&&!error&&<Soft>No open alerts.</Soft>}<Button title="Refresh" kind="plain" onPress={load}/></ScrollView>;
}
