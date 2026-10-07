"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Nav({ name, openAlerts }: { name: string; openAlerts: number }) {
  const path = usePathname();
  const router = useRouter();
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }
  return (
    <nav className="nav" aria-label="Main">
      <div className="brand">CastLiner</div>
      <div className="who">{name}</div>
      <Link href="/patients" className={path.startsWith("/patients") ? "active" : ""}>Patients</Link>
      <Link href="/alerts" className={path.startsWith("/alerts") ? "active" : ""}>
        Alerts {openAlerts > 0 && <span className="count" aria-label={`${openAlerts} open`}>{openAlerts}</span>}
      </Link>
      <div className="spacer" />
      <button className="link" onClick={signOut}>Sign out</button>
    </nav>
  );
}
