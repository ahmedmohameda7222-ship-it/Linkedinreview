"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarList } from "@/components/BarList";
import { Card, CardHeader } from "@/components/Card";
import { ClicksChart } from "@/components/ClicksChart";
import { DateFilterBar } from "@/components/DateFilterBar";
import { Loading } from "@/components/Loading";
import { StatCard } from "@/components/StatCard";
import type { Click, Company, CvEvent } from "@/lib/database.types";
import { countBy, isInRange, type DateFilter } from "@/lib/format";
import { createClient } from "@/lib/supabase/browser";

export default function AnalyticsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [cvEvents, setCvEvents] = useState<CvEvent[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.replace("/login");
      return;
    }
    const [companiesResult, clicksResult, cvResult] = await Promise.all([
      supabase.from("companies").select("*").order("created_at", { ascending: false }),
      supabase.from("clicks").select("*").order("clicked_at", { ascending: false }),
      supabase.from("cv_events").select("*").order("created_at", { ascending: false }),
    ]);
    if (companiesResult.error || clicksResult.error || cvResult.error) {
      setError(companiesResult.error?.message ?? clicksResult.error?.message ?? cvResult.error?.message ?? "Could not load analytics.");
    } else {
      setCompanies(companiesResult.data ?? []);
      setClicks(clicksResult.data ?? []);
      setCvEvents(cvResult.data ?? []);
    }
    setLoading(false);
  }

  const filteredClicks = useMemo(() => clicks.filter((click) => isInRange(click.clicked_at, dateFilter, customFrom, customTo)), [clicks, dateFilter, customFrom, customTo]);
  const filteredCv = useMemo(() => cvEvents.filter((event) => isInRange(event.created_at, dateFilter, customFrom, customTo)), [cvEvents, dateFilter, customFrom, customTo]);
  const cvDownloads = filteredCv.filter((event) => event.event_type === "download");
  const cvViews = filteredCv.filter((event) => event.event_type === "view");
  const mostActive = companies
    .map((company) => ({
      label: company.name,
      value: filteredClicks.filter((click) => click.company_id === company.id).length + filteredCv.filter((event) => event.company_id === company.id).length,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  if (loading) return <Loading label="Loading analytics" />;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-soft ring-1 ring-brand-100/60 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Recruiter engagement</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Analytics</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Simple charts and ranking cards for clicks, CV downloads, events over time, and active companies.</p>
      </section>
      {error ? <p className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <DateFilterBar value={dateFilter} onChange={setDateFilter} customFrom={customFrom} customTo={customTo} onCustomFrom={setCustomFrom} onCustomTo={setCustomTo} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="LinkedIn opens" value={filteredClicks.length} />
        <StatCard label="CV views" value={cvViews.length} />
        <StatCard label="CV downloads" value={cvDownloads.length} />
        <StatCard label="Most active company" value={mostActive[0]?.label ?? "None"} />
      </section>

      <Card>
        <CardHeader title="Events over time" description="LinkedIn opens by day, with bot/duplicate clicks visible in amber." />
        <ClicksChart clicks={filteredClicks} />
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Clicks per company" />
          <BarList data={companies.map((company) => ({ label: company.name, value: filteredClicks.filter((click) => click.company_id === company.id).length })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value)} />
        </Card>
        <Card>
          <CardHeader title="CV downloads per company" />
          <BarList data={companies.map((company) => ({ label: company.name, value: cvDownloads.filter((event) => event.company_id === company.id).length })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value)} />
        </Card>
        <Card>
          <CardHeader title="Most active recruiters / companies" />
          <BarList data={mostActive} />
        </Card>
        <Card>
          <CardHeader title="Browser and device mix" />
          <div className="space-y-5">
            <BarList data={countBy(filteredClicks.map((click) => click.browser))} />
            <BarList data={countBy(filteredClicks.map((click) => click.device_type))} />
          </div>
        </Card>
      </section>
    </div>
  );
}
