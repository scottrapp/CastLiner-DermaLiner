CastLiner / Fiomet — Netlify drag-and-drop DEMO

1. Unzip castliner-netlify-demo.zip.
2. Open https://app.netlify.com/drop while signed in.
3. Drag the folder containing index.html and assets into the drop area.
   Alternatively drop the ZIP where supported.
4. Open the generated netlify.app URL.

No build command, account credentials, environment variables or dependencies are required.
For an existing site, drop the extracted folder into its Production deploys area.

Included: updated pediatric bent-arm mesh and leg mesh with broad sleeve zones;
arm Zone 4 above the elbow; leg Zone 4 on the heel; left/right and short/long-leg
views; synthetic readings; demo patient search; four-step patient onboarding;
Details, Live, Historical, Encounters and Notes; Alerts, Devices and Settings.

This is an interactive demo adaptation, not the complete server/native app.
No live API, database, authentication, invitations, Bluetooth connection or
trained AI model is included. Use fictional details only. Demo data is stored
in the current browser's local storage and can be reset from Settings.
Opening the same site from another browser will not share that data.
Historical charts and pressure values are synthetic. Thresholds are illustrative.

The full app requires deploying the Next.js web server and configuring PostgreSQL,
JWT/auth secrets, device protocol and model integration. The native Expo app is
built separately for iOS/TestFlight; Netlify does not create an iOS app.
