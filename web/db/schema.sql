-- CastLiner database schema. Safe to run repeatedly (npm run db:migrate).

CREATE TABLE IF NOT EXISTS clinician (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patient (
  id              SERIAL PRIMARY KEY,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  mrn             TEXT UNIQUE,
  dob             DATE,
  sex             TEXT,
  email           TEXT,
  sensor_location TEXT,
  capture_paused  BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patient_clinician (
  patient_id   INT NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  clinician_id INT NOT NULL REFERENCES clinician(id) ON DELETE CASCADE,
  PRIMARY KEY (patient_id, clinician_id)
);

-- Acceptable pressure range per zone, in mmHg.
CREATE TABLE IF NOT EXISTS zone_threshold (
  patient_id INT NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  zone       SMALLINT NOT NULL CHECK (zone BETWEEN 1 AND 4),
  min        REAL NOT NULL DEFAULT 0,
  max        REAL NOT NULL DEFAULT 30,
  PRIMARY KEY (patient_id, zone)
);

-- A module, identified by its Bluetooth name (e.g. FIO-E4BC95). One module per patient.
CREATE TABLE IF NOT EXISTS device (
  id         TEXT PRIMARY KEY,
  patient_id INT UNIQUE REFERENCES patient(id) ON DELETE SET NULL,
  battery    SMALLINT,
  last_seen  TIMESTAMPTZ
);

-- One sample of all four zones, in mmHg.
CREATE TABLE IF NOT EXISTS reading (
  id         BIGSERIAL PRIMARY KEY,
  patient_id INT NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  device_id  TEXT,
  taken_at   TIMESTAMPTZ NOT NULL,
  z1 REAL NOT NULL, z2 REAL NOT NULL, z3 REAL NOT NULL, z4 REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS reading_patient_time ON reading (patient_id, taken_at);

-- Average pressure per zone over the first ~60 seconds after application.
CREATE TABLE IF NOT EXISTS baseline (
  id          SERIAL PRIMARY KEY,
  patient_id  INT NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  location    TEXT,
  z1 REAL NOT NULL, z2 REAL NOT NULL, z3 REAL NOT NULL, z4 REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS baseline_patient_time ON baseline (patient_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS alert (
  id          SERIAL PRIMARY KEY,
  patient_id  INT NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  zone        SMALLINT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('threshold', 'trend')),
  value       REAL NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS alert_open ON alert (patient_id) WHERE resolved_at IS NULL;

-- October 2026 mobile onboarding and patient record screens
ALTER TABLE patient ADD COLUMN IF NOT EXISTS height_cm REAL;
ALTER TABLE patient ADD COLUMN IF NOT EXISTS weight_kg REAL;
CREATE TABLE IF NOT EXISTS patient_note (
 id SERIAL PRIMARY KEY, patient_id INT NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
 clinician_id INT NOT NULL REFERENCES clinician(id), body TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS patient_note_time ON patient_note(patient_id, created_at DESC);
CREATE TABLE IF NOT EXISTS patient_encounter (
 id SERIAL PRIMARY KEY, patient_id INT NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
 clinician_id INT NOT NULL REFERENCES clinician(id), title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
 occurred_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS patient_encounter_time ON patient_encounter(patient_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS patient_account (
 patient_id INT PRIMARY KEY REFERENCES patient(id) ON DELETE CASCADE,
 email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS patient_invite (
 id SERIAL PRIMARY KEY, patient_id INT NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
 clinician_id INT NOT NULL REFERENCES clinician(id), email TEXT NOT NULL,
 token_hash TEXT UNIQUE NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
 accepted_at TIMESTAMPTZ, revoked_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
