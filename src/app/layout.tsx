import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Create company-specific recruiter links and redirect clicks to each user's own LinkedIn profile.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/favicon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
