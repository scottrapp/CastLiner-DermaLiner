import {Text,View} from 'react-native';
import Svg,{Image as SvgImage,G,Path,Rect,Circle,Text as SvgText,TSpan} from 'react-native-svg';
import {mapLayout,COLORS,STATE_NAMES,status} from './limb';
const assets={arm:require('../assets/anatomy/arm-mesh.png'),leg:require('../assets/anatomy/leg-mesh.png')};
export default function WireframeLimb({values,thresholds,location}:{values:(number|null)[];thresholds:{zone:number;min:number;max:number}[];location:string|null}){
 const m=mapLayout(location);
 return <View style={{backgroundColor:'#0b1728',borderRadius:16,padding:12,marginVertical:12,borderWidth:1,borderColor:'#243a51'}}><Text style={{color:'#93b2c7',fontSize:10,letterSpacing:2}}>FIOMET / SENSOR MAP</Text>
 <Svg viewBox={`0 0 ${m.width} ${m.height}`} width="100%" height={m.leg?420:280} accessibilityLabel={`Illustrative anatomy. ${values.map((v,i)=>`Zone ${i+1}: ${v==null?'no data':Math.round(v)+' mmHg'}, ${STATE_NAMES[status(v,thresholds.find(t=>t.zone===i+1))]}`).join('. ')}. ${m.supported?(m.leg?'Zone 4 on heel.':'Zone 4 above elbow; zones 1 to 3 on forearm.'):''}`}>
 {m.supported?<G transform={m.left?`translate(${m.imageWidth} 0) scale(-1 1)`:undefined}><SvgImage href={m.leg?assets.leg:assets.arm} x={0} y={0} width={m.imageWidth} height={m.imageHeight} preserveAspectRatio="xMidYMid meet"/></G>:<SvgText x={m.width/2} y={90} fill="#b2c9df" textAnchor="middle">Sensor strip schematic</SvgText>}
 {m.sensors.map((s,i)=>{const v=values[i];const color=COLORS[status(v,thresholds.find(t=>t.zone===i+1))];const cx=s.labelX+m.labelWidth/2;const cy=s.labelY+18;return <G key={i}>
 {m.supported&&<G transform={m.left?`translate(${m.imageWidth} 0) scale(-1 1)`:undefined}><Path d={s.path} fill={color} fillOpacity={.22} stroke={color} strokeOpacity={.8} strokeWidth={1.3} strokeLinejoin="round"/></G>}
 <Circle cx={s.x} cy={s.y} r={4} fill="#0b1728" stroke={color} strokeWidth={1.5}/><Path d={`M${s.x} ${s.y} L${cx} ${cy}`} stroke={color} strokeWidth={.8} strokeOpacity={.8}/>
 <Rect x={s.labelX} y={s.labelY} width={m.labelWidth} height={36} rx={7} fill="#0b1728" fillOpacity={.94} stroke={color} strokeOpacity={.35}/>
 <SvgText x={s.labelX+9} y={s.labelY+14} fill={color} fontSize={10} letterSpacing={1}>ZONE {i+1}</SvgText><SvgText x={s.labelX+m.labelWidth-8} y={s.labelY+28} fill="#eef7ff" fontSize={14} textAnchor="end">{v==null||!Number.isFinite(v)?'–':Math.round(v)}<TSpan fontSize={8} fill="#a9bdd0"> mmHg</TSpan></SvgText>
 </G>})}</Svg><Text style={{color:'#afc3d8',fontSize:11}}>{m.supported?(m.leg?'Z1–Z3: leg sleeve · Z4: heel.':'Z1–Z3: forearm · Z4: above elbow.'):'Illustrative anatomy.'} Confirm sensor placement.</Text></View>;
}
