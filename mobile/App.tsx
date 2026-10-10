import {useEffect,useState} from 'react';
import {ActivityIndicator,BackHandler,Pressable,ScrollView,Text,View,Alert} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {api,restore,signOut,type Identity} from './src/api';
import {LiveProvider,useLive} from './src/store';
import Login from './src/screens/Login';
import Patients from './src/screens/Patients';
import Patient from './src/screens/Patient';
import PatientDetails from './src/screens/PatientDetails';
import Onboarding from './src/screens/Onboarding';
import Modules from './src/screens/Modules';
import History from './src/screens/History';
import Records from './src/screens/Records';
import Alerts from './src/screens/Alerts';
import Settings from './src/screens/Settings';
import Invite from './src/screens/Invite';
import Epic from './src/screens/Epic';
import {c} from './src/theme';
import {PATIENT_TABS,pushRoute,popRoute,openPatient,type Route} from './src/navigation';
function Screens(){
 const live=useLive();const [identity,setIdentity]=useState<Identity>({role:'clinician',patientId:null,email:'',name:''});const readOnly=identity.role==='patient';const [auth,setAuth]=useState<'loading'|'login'|'signedIn'>('loading');const [saved,setSaved]=useState({server:'',email:''});const [stack,setStack]=useState<Route[]>([{name:'patients'}]);const route=stack[stack.length-1];
 const go=(r:Route)=>setStack(s=>pushRoute(s,r));const back=()=>setStack(popRoute);const root=(r:Route)=>setStack([r]);
 useEffect(()=>{restore().then(r=>{setSaved(r);setIdentity({role:r.role,patientId:r.patientId,email:r.email,name:''});if(r.signedIn&&r.role==='patient'&&r.patientId)root(openPatient(r.patientId,'Live'));setAuth(r.signedIn?'signedIn':'login')}).catch(()=>setAuth('login'))},[]);
 useEffect(()=>{const sub=BackHandler.addEventListener('hardwareBackPress',()=>{if(auth!=='signedIn'||stack.length===1)return false;if(route.name==='onboarding'){Alert.alert('Leave onboarding?','Unsaved changes will be discarded.',[{text:'Keep editing',style:'cancel'},{text:'Leave',onPress:back}]);}else back();return true});return()=>sub.remove()},[stack,auth]);
 async function logout(){await live.disconnect();await signOut();root({name:'patients'});setAuth('login')}
 if(auth==='loading')return <View style={{flex:1,justifyContent:'center'}}><ActivityIndicator color={c.soft}/></View>;
 if(auth==='login')return <Login initialServer={saved.server} initialEmail={saved.email} onDone={async()=>{const me=await api.identity();setIdentity(me);root(me.role==='patient'&&me.patientId?openPatient(me.patientId,'Live'):{name:'patients'});setAuth('signedIn')}}/>;
 const connect=(id:number,name:string)=>go({name:'modules',id,patientName:name});
 let body:React.ReactNode;
 switch(route.name){
 case 'patients':body=<Patients onOpen={id=>go(openPatient(id))} onAdd={()=>go({name:'onboarding'})} onEpic={()=>go({name:'epic'})} onSignOut={logout}/>;break;
 case 'onboarding':body=<Onboarding id={route.id} onCancel={back} onInvite={id=>setStack([openPatient(id),{name:'invite',id}])} onDone={id=>root(openPatient(id))} onConnect={(id,name)=>setStack([openPatient(id),{name:'modules',id,patientName:name}])}/>;break;
 case 'modules':body=<Modules patientId={route.id} patientName={route.patientName} onBack={back} readOnly={readOnly} onPatient={id=>root(openPatient(id,'Live'))}/>;break;
 case 'patient':body=<View style={{flex:1}}><ScrollView horizontal style={{flexGrow:0}} contentContainerStyle={{padding:10,gap:6}}>{PATIENT_TABS.filter(tab=>!readOnly||['Details','Live','Historical'].includes(tab)).map(tab=><Pressable key={tab} accessibilityRole="tab" accessibilityState={{selected:tab===route.tab}} onPress={()=>go(openPatient(route.id,tab))} style={{padding:12,borderRadius:8,backgroundColor:tab===route.tab?'#23465e':c.card}}><Text style={{color:tab===route.tab?c.accent:c.soft,fontWeight:'600'}}>{tab}</Text></Pressable>)}</ScrollView><View style={{flex:1}}>{route.tab==='Details'?<PatientDetails id={route.id} readOnly={readOnly} onInvite={()=>go({name:'invite',id:route.id})} onEdit={()=>go({name:'onboarding',id:route.id})} onConnect={name=>connect(route.id,name)} onLive={()=>go(openPatient(route.id,'Live'))}/>:route.tab==='Live'?<Patient readOnly={readOnly} id={route.id} onBack={()=>root(readOnly?openPatient(route.id,'Details'):{name:'patients'})} onConnect={name=>connect(route.id,name)}/>:route.tab==='Historical'?<History id={route.id}/>:<Records key={`${route.id}-${route.tab}`} id={route.id} kind={route.tab==='Notes'?'notes':'encounters'}/>}</View></View>;break;
 case 'alerts':body=<Alerts readOnly={readOnly} onPatient={id=>go(openPatient(id,'Live'))}/>;break;
 case 'settings':body=<Settings onPatients={()=>root({name:"patients"})} readOnly={readOnly} onEpic={()=>go({name:'epic'})} onSignOut={logout}/>;break;
 case 'invite':body=<Invite id={route.id}/>;break;
 case 'epic':body=<Epic onManual={()=>go({name:'onboarding'})}/>;break;
 }
 return <View style={{flex:1}}>{stack.length>1&&route.name!=='onboarding'&&<Pressable onPress={back} accessibilityRole="button" style={{paddingHorizontal:16,paddingVertical:10}}><Text style={{color:c.accent}}>‹ Back</Text></Pressable>}<View style={{flex:1}}>{body}</View>{route.name!=='onboarding'&&<View style={{flexDirection:'row',borderTopWidth:1,borderColor:c.line,backgroundColor:c.card}}>{(['patients','alerts','modules','settings'] as const).map((name,i)=>{const active=route.name===name||name==='patients'&&route.name==='patient';return <Pressable key={name} accessibilityRole="tab" accessibilityState={{selected:active}} onPress={()=>root(name==='patients'&&readOnly&&identity.patientId?openPatient(identity.patientId,'Live'):{name})} style={{flex:1,paddingVertical:16,alignItems:'center'}}><Text style={{color:active?c.accent:c.soft,fontSize:13,fontWeight:active?'700':'400'}}>{[readOnly?'My record':'Patients','Alerts','Devices','Settings'][i]}</Text></Pressable>})}</View>}</View>;
}
export default function App(){return <SafeAreaProvider><LiveProvider><SafeAreaView style={{flex:1,backgroundColor:c.bg}}><StatusBar style="light"/><Screens/></SafeAreaView></LiveProvider></SafeAreaProvider>;}
