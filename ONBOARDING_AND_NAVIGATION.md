# Patient onboarding and app navigation

The phone app now supports clinician onboarding and invited patient accounts, with mobile navigation based on the August 10 demo video. Existing wireframe limbs and the AI shadow adapter remain included.

## Screen map

| Video screen or workflow | Mobile navigation | Behavior |
| --- | --- | --- |
| Sign in | Login | Clinician or invited patient credentials against your server |
| Patient list and search | Patients | Search name, MRN, email; open an existing record |
| Create patient | Patients → Onboard patient | Demographics → sensor location and four ranges → review → save |
| Patient invitation and account status | Onboarding completion or Details → Invite patient | Generate and share a single-use, seven-day activation link |
| Patient account activation | Shared link → browser setup page | Patient sets password, then signs in to the phone app |
| Patient demographics / MRN | Patient → Details | View name, DOB, MRN, height, weight, email, setup; clinician can edit |
| Connect/manage devices | Devices or Patient → Details → Connect | Search modules, select one, select patient, assign and connect |
| Module detail / assignment | Devices → selected module | Explicit patient selection; connected module shows battery and four readings |
| Baseline capture and live zones | Patient → Live | Wireframe limb, readings, capture baseline, pause/resume |
| Pressure chart and measurement table | Patient → Historical | Four-zone chart and recent readings from server |
| History dots and segment duration | Patient → Historical | Configurable segment duration and time window |
| Encounters | Patient → Encounters | Clinician records encounters manually; not imported from Epic |
| Notes | Patient → Notes | Clinician notes saved with author and time |
| Alerts | Alerts | Open patient; clinician can mark alert resolved |
| Settings | Settings | Account/server, patient configuration entry, Epic status, AI status |
| Epic login, search, access consent and patient import | Patients → Epic import or Settings → Epic | Reachable connection-status screen with manual onboarding fallback; hospital integration not configured |
| EHR live/historical pressure view | Existing patient Live/Historical views | App/server data only; actual Epic embedding/synchronization not implemented |

Epic's own login and consent screens are controlled by the hospital's authentication system. The app does not impersonate those screens or request Epic credentials.

## Patient access

A clinician creates the patient, opens Invite patient, confirms the patient's email, and generates a link. Sharing uses the phone's share sheet; no email provider is connected. Generating a replacement revokes prior unused links. Tokens are generated with 32 random bytes and stored as SHA-256 hashes. Acceptance verifies the invited email and token, enforces expiry and single use, and stores a bcrypt password hash.

After activation, the patient signs in with the invitation email, chosen password, and your server URL. The patient sees only their own Details, Live, Historical, and Alerts views. Devices are limited to the module already assigned by a clinician. Patients cannot create records, edit demographics or pressure ranges, invite accounts, access clinician notes/encounters, or resolve alerts. The API enforces these restrictions in addition to the app UI. Patient reconnection does not change device assignment. All clinicians retain the original app's shared visibility; clinician-to-patient organization restrictions remain outside this update.

## Setup before testing

Deploy the updated `web` server and run its migration against the intended test database:

```bash
cd web
npm ci
npm run db:migrate
```

The migration preserves existing rows and adds optional height/weight fields, notes, encounters, patient accounts, and invitations. Configure DATABASE_URL and AUTH_SECRET as in `.env.example`. Use a hosted HTTPS URL reachable from tester phones. Invitation URLs point to this server's `/activate` page.

Then build the updated `mobile` app. Sign in as a clinician and create a test patient. Configure ranges explicitly, connect the simulated module, and capture a baseline. Share a test invitation, activate it in a browser, then sign in as that patient on another device. Confirm the patient sees their own record and assigned module, and the clinician can still see notes and encounters.

## Verification and limits

Embedded PostgreSQL integration checks also passed: the migration ran twice, patient creation saved four thresholds, notes/encounters persisted, invitation tokens were hashed, activation succeeded once, replay was rejected, and patient-only route restrictions held. Authentication fixtures were used for API integration tests; token signing/verification was checked separately. Run `npm run test:onboarding` from `web` to repeat these checks against an isolated in-memory database. A hosted PostgreSQL deployment still needs environment verification.

The mobile TypeScript check, Expo iOS JavaScript export, web production build, and 19 tests passed during implementation. Tests cover onboarding date/range validation, navigation stack behavior, patient route restrictions, pressure analysis, model inputs, and segment rules. An exported JavaScript bundle is not a signed iOS app or a TestFlight upload. Native screen interaction, real Bluetooth, deployment database behavior, email delivery, and live hospital integration require device/environment testing.

The package still uses the inherited Expo SDK 52 setup. Review/upgrade compatibility with Apple's current upload requirements before making a signed TestFlight build. This update does not train the AI model or implement firmware inference.

For production patient accounts, add password recovery, account revocation, login/activation rate limits, audit records, and appropriate clinician access controls. Existing security and regulatory differences listed in UPDATE_NOTES.md also remain open.
