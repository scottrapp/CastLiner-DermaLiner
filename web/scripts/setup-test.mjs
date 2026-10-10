// Explicit operator-run setup. Never runs automatically during a build or login.
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import pg from 'pg';
if(!process.env.DATABASE_URL){console.error('Set DATABASE_URL in .env to your test PostgreSQL database first.');process.exit(1)}
const run=(file,args=[],env=process.env)=>{const result=spawnSync(process.execPath,[file,...args],{stdio:'inherit',env,cwd:new URL('..',import.meta.url)});if(result.status!==0)process.exit(result.status??1)};
run('db/migrate.mjs');
const email='demo@castliner.test';
const db=new pg.Client({connectionString:process.env.DATABASE_URL,ssl:/localhost|127\.0\.0\.1|sslmode=disable/.test(process.env.DATABASE_URL)?false:{rejectUnauthorized:false}});
await db.connect();const {rows}=await db.query('SELECT id FROM clinician WHERE lower(email)=lower($1)',[email]);await db.end();
if(rows.length){console.log('The test account already exists: '+email+'\nUse the password printed on the first setup run. No password was changed.');process.exit(0)}
const password=randomBytes(18).toString('base64url');
run('db/seed.mjs',['--demo'],{...process.env,ADMIN_EMAIL:email,ADMIN_NAME:'Demo Clinician',ADMIN_PASSWORD:password});
console.log('\nTEST ACCOUNT CREATED\nEmail: '+email+'\nPassword: '+password+'\nSave this password now. It is not stored in this package.\nUse fictional records only in the test deployment.');
