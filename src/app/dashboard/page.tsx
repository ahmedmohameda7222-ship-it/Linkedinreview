"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
import { ClicksChart } from "@/components/ClicksChart";
import { CompanyTable, type CompanyWithStats } from "@/components/CompanyTable";
import { EmptyState } from "@/components/EmptyState";
import { Loading } from "@/components/Loading";
import { StatCard } from "@/components/StatCard";
import { ensureProfile } from "@/lib/auth";
import type { Click, Company } from "@/lib/database.types";
import { enrichCompanies, getBaseUrl, startOfCurrentWeek, startOfToday } from "@/lib/format";
import { createClient } from "@/lib/supabase/browser";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [baseUrl, setBaseUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setBaseUrl(getBaseUrl());
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) {
        router.replace("/login");
        return;
      }

      await ensureProfile(supabase, userData.user);

      const [{ data: companiesData, error: companiesError }, { data: clicksData, error: clicksError }] = await Promise.all([
        supabase.from("companies").select("*").order("created_at", { ascending: false }),
        supabase.from("clicks").select("*").order("clicked_at", { ascending: false }),
      ]);

      if (companiesError) throw companiesError;
      if (clicksError) throw clicksError;

      setCompanies(companiesData ?? []);
      setClicks(clicksData ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  const enrichedCompanies = useMemo(() => enrichCompanies(companies, clicks), [companies, clicks]);
  const previewCompanies: CompanyWithStats[] = enrichedCompanies.slice(0, 5);

  const today = startOfToday();
  const week = startOfCurrentWeek();
  const clicksToday = clicks.filter((click) => new Date(click.clicked_at) >= today).length;
  const clicksThisWeek = clicks.filter((click) => new Date(click.clicked_at) >= week).length;

  if (loading) return <Loading label="Loading dashboard" />;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-glow ring-1 ring-brand-100/60 backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Recruiter link analytics</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Dashboard</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">Create company-specific recruiter links, record valid opens, and redirect visitors to the LinkedIn profile saved in your account.</p>
          </div>
          <Link href="/dashboard/companies">
            <Button>Add company</Button>
          </Link>
        </div>
      </section>

      {error ? <p className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total clicks" value={clicks.length} />
        <StatCard label="Companies" value={companies.length} />
        <StatCard label="Clicks today" value={clicksToday} />
        <StatCard label="Clicks this week" value={clicksThisWeek} detail="Week starts Monday." />
      </section>

      <Card>
        <CardHeader title="Clicks over time" description="Daily click volume for the last 14 days." />
        <ClicksChart clicks={clicks} />
      </Card>

      <Card>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardHeader title="Companies" description="Latest tracking links and their click counts." />
          <Link className="text-sm font-semibold text-brand-700 transition hover:text-brand-900 hover:underline" href="/dashboard/companies">Manage all</Link>
        </div>
        {previewCompanies.length === 0 ? (
          <EmptyState
            title="No tracking links yet"
            description="Create your first company link, place it in your CV or application, and track future opens here."
            action={<Link href="/dashboard/companies"><Button>Add company</Button></Link>}
          />
        ) : (
          <CompanyTable companies={previewCompanies} baseUrl={baseUrl} />
        )}
      </Card>
    </div>
  );
}
