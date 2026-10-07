import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { countOpenAlerts } from "@/lib/repo";
import Nav from "@/components/Nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role === "patient") redirect("/login");
  return (
    <div className="shell">
      <Nav name={session.name} openAlerts={await countOpenAlerts()} />
      <main className="main">{children}</main>
    </div>
  );
}
