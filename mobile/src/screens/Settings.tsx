import {useEffect,useState} from 'react';
import {ScrollView} from 'react-native';
import {restore} from '../api';
import {Card,H,Soft,Button,ErrorText} from '../ui';
import {useLive} from '../store';
export default function Settings({onEpic,onSignOut,onPatients,readOnly=false}:{onEpic():void;onSignOut():void;onPatients():void;readOnly?:boolean}) {
 const live=useLive();const [account,setAccount]=useState({server:'',email:''});const [error,setError]=useState('');
 useEffect(()=>{restore().then(setAccount).catch(e=>setError(e.message))},[]);
 return <ScrollView contentContainerStyle={{padding:16}}><H>Settings</H><ErrorText>{error}</ErrorText><Card><H>{readOnly?"Patient account":"Clinician account"}</H><Soft>{account.email}</Soft><Soft>Server: {account.server}</Soft><Button title="Sign out / change server" kind="plain" onPress={onSignOut}/></Card><Card><H>Pressure configuration</H><Soft>Your clinician sets the four pressure ranges.</Soft>{!readOnly&&<Button title="Choose a patient to configure" kind="plain" onPress={onPatients}/>}</Card>{!readOnly&&<Card><H>Epic connection</H><Soft>Not configured</Soft><Button title="Epic import and connection" kind="plain" onPress={onEpic}/></Card>}<Card><H>On-device signal model</H><Soft>{live.ai.reason}</Soft></Card><Card><H>App</H><Soft>CastLiner / DermaLiner · Prototype</Soft><Soft>Bluetooth packet format and calibration require hardware verification.</Soft></Card></ScrollView>;
}
