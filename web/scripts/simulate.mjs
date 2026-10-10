// Sends fake module readings to the server, exactly as the phone app would.
// Useful for testing the dashboard without hardware.
//
//   node scripts/simulate.mjs --url http://localhost:3000 --email you@x.com --password ... --device FIO-DEMO01
//   Add --spike 3 to push zone 3 above its target after 30 seconds.

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const url = args.url ?? "http://localhost:3000";
const device = args.device ?? "FIO-DEMO01";
const spikeZone = args.spike ? Number(args.spike) : null;
const seconds = args.seconds ? Number(args.seconds) : Infinity;

const login = await fetch(`${url}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: args.email ?? process.env.ADMIN_EMAIL, password: args.password ?? process.env.ADMIN_PASSWORD }),
});
if (!login.ok) {
  console.error("Login failed:", await login.text());
  process.exit(1);
}
const { token } = await login.json();

const start = Date.now();
const base = [14, 18, 16, 12];
let buffer = [];
let tick = 0;

const timer = setInterval(async () => {
  tick++;
  const now = Date.now();
  const z = base.map((b, i) => {
    const spike = spikeZone === i + 1 && now - start > 30_000 ? 20 : 0;
    return Math.round((b + spike + Math.sin(now / 9000 + i) * 3 + (Math.random() - 0.5) * 3) * 10) / 10;
  });
  buffer.push({ t: now, z });

  if (tick % 5 === 0) {
    const batch = buffer;
    buffer = [];
    const res = await fetch(`${url}/api/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ deviceId: device, battery: 87, readings: batch }),
    });
    const out = await res.json();
    if (!res.ok) console.error("Upload failed:", out.error);
    else console.log(`${new Date().toLocaleTimeString()} stored ${out.stored}${out.alerts.length ? ` · ALERT: ${out.alerts.map((a) => a.message).join("; ")}` : ""}`);
  }
  if (now - start > seconds * 1000) {
    clearInterval(timer);
  }
}, 1000);
