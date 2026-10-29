import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "API Doctor AI — Error-to-Test Agent",
  description: "Turn failed API requests into evidence-backed diagnoses, corrected requests, and deterministic tests.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="dark"><body>{children}</body></html>;
}
