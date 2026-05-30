"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { APP_NAME } from "@/lib/supabase/config";
import { Button } from "@/components/Button";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/companies", label: "Companies" },
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
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/dashboard" className="text-base font-semibold tracking-tight text-slate-950">
            {APP_NAME}
          </Link>
          <div className="flex items-center gap-3">
            {email ? <span className="hidden text-xs text-slate-500 sm:inline">{email}</span> : null}
            <Button variant="secondary" onClick={logout}>Log out</Button>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto">
          {links.map((link) => {
            const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
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
