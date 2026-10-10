export function patientRouteAllowed(patientId:number,method:string,path:string):boolean {
 if(!Number.isInteger(patientId)||patientId<1)return false;
 if(method==='GET'&&['/api/auth/me','/api/patients','/api/devices','/api/alerts'].includes(path))return true;
 if(method==='POST'&&['/api/ingest','/api/devices/assign'].includes(path))return true; // Ownership also checked inside handlers.
 if(path===`/api/patients/${patientId}`)return method==='GET'||method==='PATCH'; // PATCH limited to pause flag inside handler.
 return path===`/api/patients/${patientId}/readings`&&method==='GET'||path===`/api/patients/${patientId}/baseline`&&method==='POST';
}
