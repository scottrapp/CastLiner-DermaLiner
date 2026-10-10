// All database access lives here so the SQL is in one place.
import { q, one, tx } from "./db";
import { DEFAULT_MAX, evaluateAlerts, mean, round1, type NewAlert, type Sample, type Threshold, type Zones } from "./analysis";

export type Patient = {
  id: number;
  firstName: string;
  lastName: string;
  mrn: string | null;
  dob: string | null; // YYYY-MM-DD
  sex: string | null;
  email: string | null;
  sensorLocation: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  capturePaused: boolean;
  createdAt: Date;
  updatedAt: Date;
};
export type Device = { id: string; patientId: number | null; battery: number | null; lastSeen: Date | null };
export type Baseline = { id: number; capturedAt: Date; location: string | null; z1: number; z2: number; z3: number; z4: number };
export type Alert = {
  id: number;
  patientId: number;
  zone: number;
  kind: "threshold" | "trend";
  value: number;
  message: string;
  createdAt: Date;
  patient?: { id: number; firstName: string; lastName: string; mrn: string | null } | null;
};

const PATIENT_COLS = `p.id, p.first_name AS "firstName", p.last_name AS "lastName", p.mrn, p.dob::text AS dob, p.sex, p.email,
  p.height_cm AS "heightCm", p.weight_kg AS "weightKg", p.sensor_location AS "sensorLocation", p.capture_paused AS "capturePaused", p.created_at AS "createdAt", p.updated_at AS "updatedAt"`;

// ---------- Clinicians ----------

export function findClinicianByEmail(email: string) {
  return one<{ id: number; email: string; name: string; passwordHash: string }>(
    `SELECT id, email, name, password_hash AS "passwordHash" FROM clinician WHERE email = $1`,
    [email.toLowerCase()],
  );
}

// ---------- Patients ----------

export function listPatients(search?: string) {
  const s = search?.trim();
  return q<Patient & { deviceId: string | null; battery: number | null; openAlerts: number }>(
    `SELECT ${PATIENT_COLS}, d.id AS "deviceId", d.battery,
       (SELECT count(*)::int FROM alert a WHERE a.patient_id = p.id AND a.resolved_at IS NULL) AS "openAlerts"
     FROM patient p LEFT JOIN device d ON d.patient_id = p.id
     WHERE $1::text IS NULL OR p.first_name ILIKE $2 OR p.last_name ILIKE $2 OR p.mrn ILIKE $2 OR p.email ILIKE $2
        OR (p.first_name || ' ' || p.last_name) ILIKE $2
     ORDER BY p.updated_at DESC`,
    [s || null, `%${s ?? ""}%`],
  );
}

export type PatientInput = {
  firstName: string;
  lastName: string;
  mrn: string | null;
  dob: string | null;
  sex: string | null;
  email: string | null;
  sensorLocation: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
};

export async function mrnTaken(mrn: string, exceptId?: number) {
  return !!(await one(`SELECT 1 FROM patient WHERE mrn = $1 AND id <> $2`, [mrn, exceptId ?? -1]));
}

export function createPatient(d: PatientInput, clinicianId: number, thresholds?: Threshold[]) {
  return tx(async (query) => {
    const [p] = await query<{ id: number }>(
      `INSERT INTO patient (first_name, last_name, mrn, dob, sex, email, sensor_location, height_cm, weight_kg)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [d.firstName, d.lastName, d.mrn, d.dob, d.sex, d.email, d.sensorLocation, d.heightCm ?? null, d.weightKg ?? null],
    );
    for (const t of thresholds ?? [1,2,3,4].map(zone=>({zone,min:0,max:DEFAULT_MAX}))) {
      await query(`INSERT INTO zone_threshold (patient_id, zone, min, max) VALUES ($1,$2,$3,$4)`, [p.id,t.zone,t.min,t.max]);
    }
    await query(`INSERT INTO patient_clinician (patient_id, clinician_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [p.id, clinicianId]);
    return p;
  });
}

export async function getPatient(id: number) {
  const p = await one<Patient>(`SELECT ${PATIENT_COLS} FROM patient p WHERE p.id = $1`, [id]);
  if (!p) return null;
  const [thresholds, device, baseline, alerts] = await Promise.all([
    getThresholds(id),
    one<Device>(`SELECT id, patient_id AS "patientId", battery, last_seen AS "lastSeen" FROM device WHERE patient_id = $1`, [id]),
    one<Baseline>(
      `SELECT id, captured_at AS "capturedAt", location, z1, z2, z3, z4 FROM baseline WHERE patient_id = $1 ORDER BY captured_at DESC LIMIT 1`,
      [id],
    ),
    openAlerts(id),
  ]);
  return { ...p, thresholds, device, baseline, alerts };
}

export function getThresholds(patientId: number) {
  return q<Threshold>(`SELECT zone, min, max FROM zone_threshold WHERE patient_id = $1 ORDER BY zone`, [patientId]);
}

export async function updatePatient(id: number, fields: Partial<PatientInput & { capturePaused: boolean }>, thresholds?: Threshold[]) {
  const map: Record<string, string> = {
    firstName: "first_name",
    lastName: "last_name",
    mrn: "mrn",
    dob: "dob",
    sex: "sex",
    email: "email",
    sensorLocation: "sensor_location",
    heightCm: "height_cm",
    weightKg: "weight_kg",
    capturePaused: "capture_paused",
  };
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, col] of Object.entries(map)) {
    const v = (fields as Record<string, unknown>)[k];
    if (v !== undefined) {
      vals.push(v);
      sets.push(`${col} = $${vals.length}`);
    }
  }
  await tx(async (query) => {
    vals.push(id);
    await query(`UPDATE patient SET ${[...sets, "updated_at = now()"].join(", ")} WHERE id = $${vals.length}`, vals);
    for (const t of thresholds ?? []) {
      await query(
        `INSERT INTO zone_threshold (patient_id, zone, min, max) VALUES ($1, $2, $3, $4)
         ON CONFLICT (patient_id, zone) DO UPDATE SET min = EXCLUDED.min, max = EXCLUDED.max`,
        [id, t.zone, t.min, t.max],
      );
    }
  });
}

// ---------- Readings ----------

export async function readingsSince(patientId: number, from: Date): Promise<Sample[]> {
  const rows = await q<{ t: number; z1: number; z2: number; z3: number; z4: number }>(
    `SELECT (extract(epoch FROM taken_at) * 1000)::float8 AS t, z1, z2, z3, z4
     FROM reading WHERE patient_id = $1 AND taken_at >= $2 ORDER BY taken_at`,
    [patientId, from],
  );
  return rows.map((r) => ({ t: Math.round(r.t), z: [r.z1, r.z2, r.z3, r.z4] as Zones }));
}

export type IngestResult =
  | { ok: false; reason: "unassigned" }
  | { ok: true; paused: boolean; stored: number; patientId: number; alerts: NewAlert[] };

/** Stores a batch from the phone app and raises any new alerts. */
export async function ingest(deviceId: string, battery: number | undefined, readings: Sample[], expectedPatientId?: number): Promise<IngestResult> {
  const d = await one<{ patientId: number | null; paused: boolean | null }>(
    `INSERT INTO device (id, battery, last_seen) VALUES ($1, $2, now())
     ON CONFLICT (id) DO UPDATE SET last_seen = now(), battery = COALESCE(EXCLUDED.battery, device.battery)
     WHERE $3::int IS NULL OR device.patient_id = $3
     RETURNING patient_id AS "patientId", (SELECT capture_paused FROM patient WHERE id = device.patient_id) AS paused`,
    [deviceId, battery ?? null, expectedPatientId ?? null],
  );
  if (!d?.patientId) return { ok: false, reason: "unassigned" };
  const patientId = d.patientId;
  if (d.paused) return { ok: true, paused: true, stored: 0, patientId, alerts: [] };

  const now = Date.now();
  const valid = readings.filter((r) => r.t > now - 7 * 86_400_000 && r.t < now + 60_000 && r.z.every(Number.isFinite));
  if (valid.length) {
    await q(
      `INSERT INTO reading (patient_id, device_id, taken_at, z1, z2, z3, z4)
       SELECT $1, $2, to_timestamp(t / 1000.0), z1, z2, z3, z4
       FROM unnest($3::float8[], $4::real[], $5::real[], $6::real[], $7::real[]) AS u(t, z1, z2, z3, z4)`,
      [patientId, deviceId, valid.map((r) => r.t), ...[0, 1, 2, 3].map((k) => valid.map((r) => r.z[k]))],
    );
    await q(`UPDATE patient SET updated_at = now() WHERE id = $1`, [patientId]);
  }

  const [recent, thresholds, open] = await Promise.all([
    readingsSince(patientId, new Date(now - 120_000)),
    getThresholds(patientId),
    q<{ zone: number; kind: string }>(`SELECT zone, kind FROM alert WHERE patient_id = $1 AND resolved_at IS NULL`, [patientId]),
  ]);
  const alerts = evaluateAlerts(recent, thresholds, open);
  for (const a of alerts) {
    await q(`INSERT INTO alert (patient_id, zone, kind, value, message) VALUES ($1, $2, $3, $4, $5)`, [patientId, a.zone, a.kind, a.value, a.message]);
  }
  return { ok: true, paused: false, stored: valid.length, patientId, alerts };
}

/** Saves a baseline from the average of the last 60 seconds. Returns null if there isn't enough data. */
export async function saveBaseline(patientId: number, location: string | null) {
  const samples = await readingsSince(patientId, new Date(Date.now() - 60_000));
  if (samples.length < 10) return null;
  const z = [0, 1, 2, 3].map((k) => round1(mean(samples.map((s) => s.z[k]))));
  const b = await one<Baseline>(
    `INSERT INTO baseline (patient_id, location, z1, z2, z3, z4) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, captured_at AS "capturedAt", location, z1, z2, z3, z4`,
    [patientId, location, ...z],
  );
  if (location) await q(`UPDATE patient SET sensor_location = $2, updated_at = now() WHERE id = $1`, [patientId, location]);
  return b;
}

// ---------- Devices ----------

export function listDevices() {
  return q<Device & { patientName: string | null; mrn: string | null }>(
    `SELECT d.id, d.patient_id AS "patientId", d.battery, d.last_seen AS "lastSeen",
       CASE WHEN p.id IS NULL THEN NULL ELSE p.first_name || ' ' || p.last_name END AS "patientName", p.mrn
     FROM device d LEFT JOIN patient p ON p.id = d.patient_id ORDER BY d.id`,
  );
}

/** Assigns a module to a patient, or unassigns it with null. A patient has at most one module. */
export function assignDevice(deviceId: string, patientId: number | null) {
  return tx(async (query) => {
    if (patientId !== null) await query(`UPDATE device SET patient_id = NULL WHERE patient_id = $1 AND id <> $2`, [patientId, deviceId]);
    await query(
      `INSERT INTO device (id, patient_id) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET patient_id = EXCLUDED.patient_id`,
      [deviceId, patientId],
    );
  });
}

// ---------- Alerts ----------

export function openAlerts(patientId?: number) {
  return q<Alert>(
    `SELECT a.id, a.patient_id AS "patientId", a.zone, a.kind, a.value, a.message, a.created_at AS "createdAt",
       json_build_object('id', p.id, 'firstName', p.first_name, 'lastName', p.last_name, 'mrn', p.mrn) AS patient
     FROM alert a JOIN patient p ON p.id = a.patient_id
     WHERE a.resolved_at IS NULL AND ($1::int IS NULL OR a.patient_id = $1)
     ORDER BY a.created_at DESC LIMIT 200`,
    [patientId ?? null],
  );
}

export async function countOpenAlerts() {
  return (await one<{ n: number }>(`SELECT count(*)::int AS n FROM alert WHERE resolved_at IS NULL`))?.n ?? 0;
}

export function resolveAlert(id: number) {
  return q(`UPDATE alert SET resolved_at = now() WHERE id = $1 AND resolved_at IS NULL`, [id]);
}
