"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { BrandLogo } from "@/components/BrandLogo";
import { createClient } from "@/lib/supabase/browser";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/companies", label: "Companies" },
  { href: "/dashboard/tracking-links", label: "Tracking Links" },
  { href: "/dashboard/cv-tracking", label: "CV Tracking" },
  { href: "/dashboard/activity", label: "Activity" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/settings", label: "Settings" },
  { href: "/privacy", label: "Privacy" },
];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
    });
  }, [supabase]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/70 bg-white/85 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/dashboard" className="inline-flex w-fit items-center rounded-2xl transition-opacity hover:opacity-90">
            <BrandLogo compact />
          </Link>
          <div className="flex items-center gap-3">
            {email ? <span className="hidden rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-slate-600 sm:inline">{email}</span> : null}
            <Button variant="secondary" onClick={logout}>Log out</Button>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto rounded-2xl bg-brand-50/70 p-1">
          {links.map((link) => {
            const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                  active ? "bg-white text-brand-800 shadow-sm" : "text-slate-600 hover:bg-white/80 hover:text-brand-800"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
