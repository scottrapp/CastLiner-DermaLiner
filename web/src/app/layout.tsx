import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "CastLiner", description: "Cast pressure monitoring" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
