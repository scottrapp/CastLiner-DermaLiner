import { openAlerts } from "@/lib/repo";
import AlertList from "@/components/AlertList";

export default async function Alerts() {
  const alerts = await openAlerts();
  return (
    <>
      <div className="pagehead"><h1>Open alerts</h1></div>
      <AlertList alerts={JSON.parse(JSON.stringify(alerts))} showPatient />
    </>
  );
}
