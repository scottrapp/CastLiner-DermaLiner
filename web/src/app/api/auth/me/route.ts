import {json,withSession} from '@/lib/api';
export const GET=withSession(async s=>json({role:s.role??'clinician',patientId:s.patientId??null,email:s.email,name:s.name}));
