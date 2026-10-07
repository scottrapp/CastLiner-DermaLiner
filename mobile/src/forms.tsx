import {Text,TextInput,View,StyleSheet,KeyboardAvoidingView,Platform,ScrollView} from 'react-native';
import {c} from './theme';
export function Field({label,value,onChange,number=false,multiline=false}:{label:string;value:string;onChange(v:string):void;number?:boolean;multiline?:boolean}) {
 return <View style={{gap:5,marginBottom:12}}><Text style={{color:c.soft,fontSize:13}}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} keyboardType={number?'decimal-pad':'default'} autoCapitalize={/email|date/i.test(label)?'none':'sentences'} multiline={multiline} style={[styles.input,multiline&&{minHeight:100,textAlignVertical:'top'}]} placeholderTextColor={c.soft}/></View>;
}
export function FormPage({children}:{children:React.ReactNode}) {return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:16,paddingBottom:32}}>{children}</ScrollView></KeyboardAvoidingView>;}
const styles=StyleSheet.create({input:{color:c.text,backgroundColor:c.card,borderWidth:1,borderColor:c.line,borderRadius:10,padding:12,fontSize:16}});
