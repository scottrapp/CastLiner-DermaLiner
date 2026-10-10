import * as SecureStore from "expo-secure-store";

export type Threshold = { zone: number; min: number; max: number };
export type PatientSummary = {
  email: string | null;
  id: number; firstName: string; lastName: string; mrn: string | null; dob: string | null;
  sensorLocation: string | null; deviceId: string | null; battery: number | null; openAlerts: number;
};
export type Patient = PatientSummary & {
  heightCm: number | null;
  weightKg: number | null;
  sex: string | null;
  capturePaused: boolean;
  thresholds: Threshold[];
  device: { id: string; battery: number | null } | null;
  baseline: { capturedAt: string; z1: number; z2: number; z3: number; z4: number } | null;
  alerts: { id: number; zone: number; kind: string; message: string; createdAt: string }[];
};

let server = "";
let token = "";

export type Identity={role:'clinician'|'patient';patientId:number|null;email:string;name:string};
export async function restore(): Promise<{ server:string;email:string;signedIn:boolean;role:'clinician'|'patient';patientId:number|null }> {
 server=(await SecureStore.getItemAsync('server'))??'';token=(await SecureStore.getItemAsync('token'))??'';const email=(await SecureStore.getItemAsync('email'))??'';
 if(server&&token){try{const r=await fetch(`${server}/api/auth/me`,{headers:{Authorization:`Bearer ${token}`}});if(r.ok){const me:Identity=await r.json();return {server,email,signedIn:true,role:me.role,patientId:me.patientId}}}catch{}}
 return {server,email,signedIn:false,role:'clinician',patientId:null};
}

export async function signIn(serverUrl: string, email: string, password: string) {
  const base = serverUrl.trim().replace(/\/+$/, "");
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password }),
  }).catch(() => null);
  if (!res) throw new Error(`Couldn't reach ${base}. Check the server address and your connection.`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Sign-in failed.");
  server = base;
  token = data.token;
  await SecureStore.setItemAsync("server", server);
  await SecureStore.setItemAsync("token", token);
  await SecureStore.setItemAsync("email", email.trim());
}

export async function signOut() {
  token = "";
  await SecureStore.deleteItemAsync("token");
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${server}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  }).catch(() => null);
  if (!res) throw new Error("No connection to the server.");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Server returned ${res.status}.`);
  return data as T;
}

export type RecordEntry={id:number;body:string;createdAt:string;author:string;title?:string;occurredAt?:string};
export type Readings={thresholds:Threshold[];chart:{t:number;z:number[]}[];recent:{t:number;z:number[]}[];segments:{start:number;mean:(number|null)[];status:string[];n:number}[]};
export const api = {
  identity:()=>call<Identity>("/api/auth/me"),
  inviteStatus:(id:number)=>call<{account:{email:string}|null;invite:{email:string;expiresAt:string;acceptedAt:string|null;revokedAt:string|null}|null}>(`/api/patients/${id}/invite`),
  invite:(id:number,email:string)=>call<{url:string;email:string;expiresInDays:number}>(`/api/patients/${id}/invite`,{method:"POST",body:JSON.stringify({email})}),
  create:(body:unknown)=>call<{patient:{id:number}}>("/api/patients",{method:"POST",body:JSON.stringify(body)}).then(r=>r.patient),
  save:(id:number,body:unknown)=>call(`/api/patients/${id}`,{method:"PATCH",body:JSON.stringify(body)}),
  readings:(id:number,minutes:number,segment:number)=>call<Readings>(`/api/patients/${id}/readings?minutes=${minutes}&segment=${segment}`),
  records:(id:number,kind:"notes"|"encounters")=>call<{records:RecordEntry[]}>(`/api/patients/${id}/${kind}`).then(r=>r.records),
  addRecord:(id:number,kind:"notes"|"encounters",body:unknown)=>call(`/api/patients/${id}/${kind}`,{method:"POST",body:JSON.stringify(body)}),
  alerts:()=>call<{alerts:{id:number;patientId:number;zone:number;message:string;createdAt:string;patient?:{firstName:string;lastName:string}|null}[]}>("/api/alerts").then(r=>r.alerts),
  resolve:(id:number)=>call(`/api/alerts/${id}/resolve`,{method:"POST"}),
  patients: () => call<{ patients: PatientSummary[] }>("/api/patients").then((d) => d.patients),
  patient: (id: number) => call<{ patient: Patient }>(`/api/patients/${id}`).then((d) => d.patient),
  update: (id: number, body: Partial<{ capturePaused: boolean; sensorLocation: string | null }>) =>
    call(`/api/patients/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  assign: (deviceId: string, patientId: number | null) =>
    call("/api/devices/assign", { method: "POST", body: JSON.stringify({ deviceId, patientId }) }),
  baseline: (id: number, location: string | null) =>
    call(`/api/patients/${id}/baseline`, { method: "POST", body: JSON.stringify({ location }) }),
  ingest: (deviceId: string, battery: number | null, readings: { t: number; z: number[] }[]) =>
    call<{ stored: number; paused: boolean; alerts: { zone: number; message: string }[] }>("/api/ingest", {
      method: "POST",
      body: JSON.stringify({ deviceId, ...(battery != null ? { battery } : {}), readings }),
    }),
};
