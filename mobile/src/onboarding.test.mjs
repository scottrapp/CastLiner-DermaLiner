import {test} from 'node:test';import assert from 'node:assert/strict';
import {emptyDraft,validateDetails,validateRanges,payload} from './onboarding.ts';
import {openPatient,pushRoute,popRoute,PATIENT_TABS} from './navigation.ts';
const draft={...emptyDraft,firstName:' Ada ',lastName:' Lovelace ',dob:'2016-02-29',heightCm:'140',weightKg:'35'};
const ranges=[1,2,3,4].map(zone=>({zone,min:'10',max:'30'}));
test('onboarding validates real dates, email and measurements',()=>{assert.equal(validateDetails(draft),'');for(const d of [{...draft,dob:'2026-02-30'},{...draft,dob:'2099-01-01'},{...draft,email:'invalid'},{...draft,weightKg:'NaN'},{...draft,firstName:' '}])assert.notEqual(validateDetails(d),'');});
test('all four ranges must be unique, finite and ordered',()=>{assert.equal(validateRanges(ranges),'');for(const r of [ranges.slice(1),[ranges[0],ranges[0],ranges[2],ranges[3]],ranges.map(t=>({...t,max:'10'})),ranges.map(t=>({...t,max:'Infinity'}))])assert.notEqual(validateRanges(r),'');});
test('save payload normalizes empty optional fields and numeric values',()=>{const p=payload(draft,ranges);assert.equal(p.firstName,'Ada');assert.equal(p.mrn,null);assert.equal(p.heightCm,140);assert.equal(p.weightKg,35);assert.deepEqual(p.thresholds[0],{zone:1,min:10,max:30});});
test('patient tabs keep one stack entry; device and invite return to patient',()=>{let stack=[{name:'patients'}];stack=pushRoute(stack,openPatient(7));for(const tab of PATIENT_TABS)stack=pushRoute(stack,openPatient(7,tab));assert.equal(stack.length,2);stack=pushRoute(stack,{name:'modules',id:7});assert.equal(popRoute(stack).at(-1).id,7);assert.equal(popRoute([{name:'patients'}]).length,1);});
