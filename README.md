# CastLiner / DermaLiner software

Fiomet-owned replacement for the Rapptr-built app and dashboard. Written from scratch; no Rapptr code.

```
web/      Dashboard + server API (Next.js 14, Postgres). Deploy to Vercel or AWS.
mobile/   iPhone/Android app (Expo / React Native). Talks to the module over Bluetooth.
```

How data flows: **module → phone app (Bluetooth) → server `/api/ingest` → Postgres → dashboard**.
The phone uploads every 5 seconds and holds readings if the connection drops.

---

## 1. Database

Any Postgres 14+ works. Fiomet's AWS account already has an RDS Postgres instance used by the old system.
Create a **new database** on it (for example `castliner`) so nothing old is overwritten.

## 2. Web dashboard and server

Requires Node 22.9 or newer.

```bash
cd web
cp .env.example .env        # then fill in DATABASE_URL, AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npm run db:migrate          # creates the tables (safe to re-run)
npm run db:seed             # creates your clinician login from .env
npm run db:seed -- --demo   # optional: adds "Demo Patient" with module FIO-DEMO01
npm run dev                 # http://localhost:3000
```

Try it without hardware (in a second terminal, with the demo patient created):

```bash
npm run simulate -- --device FIO-DEMO01 --spike 3
```

This streams fake readings. After 30 seconds zone 3 goes above target and two alerts fire.

**Deploy to Vercel:** import the `web` folder as a project, add the same four environment variables
(`DATABASE_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`), deploy, then run `npm run db:migrate`
and `npm run db:seed` once from your computer against the production `DATABASE_URL`.
The RDS security group must allow connections from Vercel (or use AWS App Runner in the same VPC instead).

Tests for the alert logic: `npm test`.

## 3. Phone app (TestFlight)

No Mac or Xcode needed: Expo's cloud service (EAS) builds the app and uploads it to TestFlight.
You need a free Expo account (expo.dev) and Fiomet's Apple Developer login.

```bash
cd mobile
npm install
npm install -g eas-cli
eas login                              # Expo account
eas init                               # links this folder to an Expo project (one time)
eas build --platform ios --profile production
                                       # asks for the Apple login; creates certificates automatically
eas submit --platform ios --latest     # uploads the build to App Store Connect
```

About 10-15 minutes after the upload, the build appears in App Store Connect under TestFlight.
Add internal testers there (up to 100 people on the Fiomet team, no Apple review needed).
Each later update is the same two commands; build numbers increase automatically.

The app's bundle ID is `com.fiomet.castliner`, so it is a new app in App Store Connect, separate from
the Rapptr-built app. Their builds and yours won't collide.

In the app, sign in with the dashboard's address (e.g. `https://castliner.vercel.app`) and your
clinician login. Under **Connect a module**, choose **FIO-SIM001** to test with a simulated module.

## 4. The one open item: the module's Bluetooth format

`mobile/src/protocol.ts` holds the service UUID, characteristic UUID, packet layout and calibration.
**The values there are placeholders.** Everything else is finished. To fill them in, either:

- read the firmware source (`DATechnologies/fiomet-firmware`) or the old app repo, or
- open the free **nRF Connect** app on a phone, connect to the `FIO-xxxxxx` module, and record the
  service UUIDs, which characteristic sends notifications, and several raw hex packets while pressing
  each zone.

## What the software does

- **Dashboard:** clinician login; patient list with search; add/edit patients; per-patient live view
  (four zone tiles, pressure chart with 5 min–1 day windows, segment history, readings table);
  per-zone min/max targets; pause capture; 60-second baseline; alerts page with resolve.
- **Alerts** (`web/src/lib/analysis.ts`):
  - *Above target:* a zone stays above its maximum for 10 consecutive readings.
  - *Rising:* the last minute's average is at least 5 mmHg above the minute before and the difference
    is statistically significant (Welch's t-test, p < 0.01). Same consecutive-segment idea as
    ClaraData's original anomaly detector.
- **Phone app:** sign-in; patient list; module search and assignment; sensor location; 60-second initial
  capture; live zone tiles; pause/resume; pop-up alerts; offline buffering; built-in simulated module.

## Not included yet

Epic integration, automatic invitation emails, account recovery, audit logging, clinician-specific access restrictions (all clinicians
currently see all patients), and FDA design-control documentation (requirements, verification records,
traceability). Add these before clinical use.

## Security notes

- Passwords are hashed with bcrypt; sessions are signed tokens that expire after 12 hours.
- Use HTTPS in production (Vercel does this automatically) and a long random `AUTH_SECRET`
  (`openssl rand -hex 32`).
- Patient data is PHI. Sign BAAs with AWS and Vercel before storing real patient data.


## October 2026 graphics and AI prototype

See [UPDATE_NOTES.md](UPDATE_NOTES.md) for graphics changes, raw recording review, model training/export, verification, and remaining firmware/model integration. Open `preview/index.html` for the design and `ai/recording-review/index.html` for the traces. No validated model is included.


## Patient onboarding and navigation

See [ONBOARDING_AND_NAVIGATION.md](ONBOARDING_AND_NAVIGATION.md). This update adds clinician onboarding, invitations, patient-only accounts, device assignment, Historical, Encounters, Notes, Alerts and Settings screens. Run the updated server database migration before testing.
