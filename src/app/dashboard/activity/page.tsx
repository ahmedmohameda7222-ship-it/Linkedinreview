"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Card, CardHeader } from "@/components/Card";
import { DateFilterBar } from "@/components/DateFilterBar";
import { EmptyState } from "@/components/EmptyState";
import { Loading } from "@/components/Loading";
import type { Click, Company, CvEvent } from "@/lib/database.types";
import { formatDateTime, isInRange, type DateFilter } from "@/lib/format";
import { createClient } from "@/lib/supabase/browser";

type ActivityRow = {
  id: string;
  companyId: string | null;
  type: "LINKEDIN_OPENED" | "CV_LINK_OPENED" | "CV_VIEWED_ONLINE" | "CV_DOWNLOADED";
  createdAt: string;
  browser: string | null;
  device: string | null;
  userAgent: string | null;
};

export default function ActivityPage() {
  const router = useRouter();
  const supabase = createClient();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [cvEvents, setCvEvents] = useState<CvEvent[]>([]);
  const [companyFilter, setCompanyFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
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
      supabase.from("companies").select("*").order("name"),
      supabase.from("clicks").select("*").order("clicked_at", { ascending: false }),
      supabase.from("cv_events").select("*").order("created_at", { ascending: false }),
    ]);
    if (companiesResult.error || clicksResult.error || cvResult.error) {
      setError(companiesResult.error?.message ?? clicksResult.error?.message ?? cvResult.error?.message ?? "Could not load activity.");
    } else {
      setCompanies(companiesResult.data ?? []);
      setClicks(clicksResult.data ?? []);
      setCvEvents(cvResult.data ?? []);
    }
    setLoading(false);
  }

  const rows = useMemo<ActivityRow[]>(() => {
    const linkedinRows = clicks.map((click) => ({
      id: click.id,
      companyId: click.company_id,
      type: "LINKEDIN_OPENED" as const,
      createdAt: click.clicked_at,
      browser: click.browser,
      device: click.device_type,
      userAgent: click.user_agent,
    }));
    const cvRows = cvEvents.map((event) => ({
      id: event.id,
      companyId: event.company_id,
      type: event.event_type === "link_opened" ? "CV_LINK_OPENED" as const : event.event_type === "view" ? "CV_VIEWED_ONLINE" as const : "CV_DOWNLOADED" as const,
      createdAt: event.created_at,
      browser: event.browser,
      device: event.device_type,
      userAgent: event.user_agent,
    }));
    return [...linkedinRows, ...cvRows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [clicks, cvEvents]);

  const filteredRows = rows.filter((row) => {
    if (!isInRange(row.createdAt, dateFilter, customFrom, customTo)) return false;
    if (companyFilter !== "all" && row.companyId !== companyFilter) return false;
    if (eventFilter !== "all" && row.type !== eventFilter) return false;
    return true;
  });

  if (loading) return <Loading label="Loading activity" />;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-soft ring-1 ring-brand-100/60 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Newest first</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Activity Timeline</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Filter LinkedIn opens, CV link opens, online CV views, and CV downloads.</p>
      </section>
      {error ? <p className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <DateFilterBar value={dateFilter} onChange={setDateFilter} customFrom={customFrom} customTo={customTo} onCustomFrom={setCustomFrom} onCustomTo={setCustomTo} />
      <Card>
        <div className="mb-5 grid gap-3 md:grid-cols-2">
          <select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)} className="rounded-2xl border border-brand-100 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100">
            <option value="all">All companies</option>
            {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
          </select>
          <select value={eventFilter} onChange={(event) => setEventFilter(event.target.value)} className="rounded-2xl border border-brand-100 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100">
            <option value="all">All event types</option>
            <option value="LINKEDIN_OPENED">LinkedIn link opened</option>
            <option value="CV_LINK_OPENED">CV link opened</option>
            <option value="CV_VIEWED_ONLINE">CV viewed online</option>
            <option value="CV_DOWNLOADED">CV downloaded</option>
          </select>
        </div>
        <CardHeader title="Events" />
        {filteredRows.length === 0 ? <EmptyState title="No events found" description="Change the filters or share a tracking link." /> : (
          <ol className="relative space-y-3 border-l border-brand-100 pl-5">
            {filteredRows.map((row) => {
              const company = companies.find((item) => item.id === row.companyId);
              return (
                <li key={`${row.type}-${row.id}`} className="relative rounded-2xl border border-brand-100 bg-white p-4">
                  <span className="absolute -left-[29px] top-5 h-3 w-3 rounded-full bg-brand-600 ring-4 ring-brand-50" />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">{company?.name ?? "Unknown company"}</p>
                      <p className="mt-1 text-sm text-slate-500">{formatDateTime(row.createdAt)} - {row.browser ?? "Unknown browser"} - {row.device ?? "Unknown device"}</p>
                    </div>
                    <Badge tone={row.type.includes("CV") ? "blue" : "green"}>{row.type.replaceAll("_", " ")}</Badge>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
