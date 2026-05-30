import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Track company-specific LinkedIn profile link clicks with Supabase and Next.js.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
