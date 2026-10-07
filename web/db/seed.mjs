// Creates the first clinician login from .env. Add --demo for a demo patient and module FIO-DEMO01.
import pg from "pg";
import bcrypt from "bcryptjs";

const { DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
if (!DATABASE_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Set DATABASE_URL, ADMIN_EMAIL and ADMIN_PASSWORD in .env first.");
  process.exit(1);
}
const ssl = /localhost|127\.0\.0\.1/.test(DATABASE_URL) || /sslmode=disable/.test(DATABASE_URL) ? false : { rejectUnauthorized: false };
const db = new pg.Client({ connectionString: DATABASE_URL, ssl });
await db.connect();

const email = ADMIN_EMAIL.toLowerCase();
await db.query(
  `INSERT INTO clinician (email, name, password_hash) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`,
  [email, ADMIN_NAME || email, await bcrypt.hash(ADMIN_PASSWORD, 12)],
);
const { rows: [c] } = await db.query(`SELECT id FROM clinician WHERE email = $1`, [email]);
console.log(`Clinician ready: ${email}`);

if (process.argv.includes("--demo")) {
  let { rows: [p] } = await db.query(`SELECT id FROM patient WHERE mrn = 'DEMO-0001'`);
  if (!p) {
    ({ rows: [p] } = await db.query(
      `INSERT INTO patient (first_name, last_name, mrn, sex, dob, sensor_location)
       VALUES ('Demo', 'Patient', 'DEMO-0001', 'Male', '2015-06-01', 'Short arm cast - left') RETURNING id`,
    ));
    await db.query(`INSERT INTO zone_threshold (patient_id, zone) SELECT $1, z FROM generate_series(1, 4) z`, [p.id]);
    await db.query(`INSERT INTO patient_clinician VALUES ($1, $2)`, [p.id, c.id]);
  }
  await db.query(
    `INSERT INTO device (id, patient_id, battery) VALUES ('FIO-DEMO01', $1, 88)
     ON CONFLICT (id) DO UPDATE SET patient_id = EXCLUDED.patient_id`,
    [p.id],
  );
  console.log(`Demo patient #${p.id} with module FIO-DEMO01`);
}
await db.end();
