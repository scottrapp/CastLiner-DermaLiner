import { readFile } from "node:fs/promises";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL in .env first.");
  process.exit(1);
}
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: sslFor(process.env.DATABASE_URL) });
await client.connect();
await client.query(await readFile(new URL("./schema.sql", import.meta.url), "utf8"));
await client.end();
console.log("Database schema is up to date.");

function sslFor(url) {
  return /localhost|127\.0\.0\.1/.test(url) || /sslmode=disable/.test(url) ? false : { rejectUnauthorized: false };
}
