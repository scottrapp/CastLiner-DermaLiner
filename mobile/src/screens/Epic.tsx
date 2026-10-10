import {ScrollView} from 'react-native';
import {Card,H,Soft,Button} from '../ui';
export default function Epic({onManual}:{onManual():void}) {
 return <ScrollView contentContainerStyle={{padding:16}}><H>Epic patient import</H><Card><H>Connection not configured</H><Soft>The video shows a connected Epic environment. This app does not yet have an authorized hospital connection.</Soft><Soft>Epic sign-in, patient search, access consent, import, and the EHR pressure view require hospital-approved authentication and endpoints.</Soft><Soft>No Epic credentials are requested or stored by this screen.</Soft></Card><Card><H>Onboard without Epic</H><Soft>Create the patient manually and enter an MRN. This will not link or write to an Epic chart.</Soft><Button title="Manual patient onboarding" onPress={onManual}/></Card></ScrollView>;
}
