"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/Badge";
import { BarList } from "@/components/BarList";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
import { ClicksChart } from "@/components/ClicksChart";
import { CompanyTable } from "@/components/CompanyTable";
import { DateFilterBar } from "@/components/DateFilterBar";
import { EmptyState } from "@/components/EmptyState";
import { Loading } from "@/components/Loading";
import { StatCard } from "@/components/StatCard";
import { ensureProfile } from "@/lib/auth";
import type { Click, Company, CvEvent, Profile, Reminder, TrackingLink } from "@/lib/database.types";
import { countBy, downloadCsv, enrichTrackingLinks, formatDateTime, getBaseUrl, isInRange, toCsv, upcomingReminders, type DateFilter } from "@/lib/format";
import { createClient } from "@/lib/supabase/browser";
import { isValidLinkedInUrl } from "@/lib/validation";

const statuses = ["Not applied", "Applied", "Viewed LinkedIn", "Opened CV", "Downloaded CV", "Interview", "Rejected", "Offer"] as const;

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [trackingLinks, setTrackingLinks] = useState<TrackingLink[]>([]);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [cvEvents, setCvEvents] = useState<CvEvent[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [baseUrl, setBaseUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [includeBots, setIncludeBots] = useState(true);

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

      const profileRecord = await ensureProfile(supabase, userData.user);
      setProfile(profileRecord);

      const [companiesResult, linksResult, clicksResult, cvResult, remindersResult] = await Promise.all([
        supabase.from("companies").select("*").order("created_at", { ascending: false }),
        supabase.from("tracking_links").select("*").order("created_at", { ascending: false }),
        supabase.from("clicks").select("*").order("clicked_at", { ascending: false }),
        supabase.from("cv_events").select("*").order("created_at", { ascending: false }),
        supabase.from("reminders").select("*").order("follow_up_at", { ascending: true }),
      ]);

      if (companiesResult.error) throw companiesResult.error;
      if (linksResult.error) throw linksResult.error;
      if (clicksResult.error) throw clicksResult.error;
      if (cvResult.error) throw cvResult.error;
      if (remindersResult.error) throw remindersResult.error;

      setCompanies(companiesResult.data ?? []);
      setTrackingLinks(linksResult.data ?? []);
      setClicks(clicksResult.data ?? []);
      setCvEvents(cvResult.data ?? []);
      setReminders(remindersResult.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  const filteredClicks = useMemo(() => clicks.filter((click) => isInRange(click.clicked_at, dateFilter, customFrom, customTo)), [clicks, dateFilter, customFrom, customTo]);
  const analyticsClicks = useMemo(() => (includeBots ? filteredClicks : filteredClicks.filter((click) => click.click_type === "human")), [filteredClicks, includeBots]);
  const filteredCvEvents = useMemo(() => cvEvents.filter((event) => isInRange(event.created_at, dateFilter, customFrom, customTo)), [cvEvents, dateFilter, customFrom, customTo]);
  const linkRows = useMemo(() => enrichTrackingLinks(companies, trackingLinks, filteredClicks, filteredCvEvents), [companies, trackingLinks, filteredClicks, filteredCvEvents]);
  const previewRows = linkRows.slice(0, 7);

  const humanClicks = filteredClicks.filter((click) => click.click_type === "human").length;
  const botClicks = filteredClicks.filter((click) => click.click_type === "bot").length;
  const duplicateClicks = filteredClicks.filter((click) => click.click_type === "duplicate").length;
  const cvLinkOpens = filteredCvEvents.filter((event) => event.event_type === "link_opened").length;
  const cvViews = filteredCvEvents.filter((event) => event.event_type === "view").length;
  const cvDownloads = filteredCvEvents.filter((event) => event.event_type === "download").length;
  const openedCompanyIds = new Set(filteredClicks.filter((click) => click.click_type === "human").map((click) => click.company_id));
  const upcoming = upcomingReminders(reminders).slice(0, 6);

  const warnings = [
    !profile?.linkedin_url ? "Missing LinkedIn URL" : null,
    profile?.linkedin_url && !isValidLinkedInUrl(profile.linkedin_url) ? "Invalid LinkedIn URL" : null,
    trackingLinks.some((link) => !link.active) ? "Inactive tracking link" : null,
    !profile?.cv_file_url ? "Missing CV file URL" : null,
  ].filter(Boolean) as string[];
  const healthyLinks = trackingLinks.filter((link) => link.active && profile?.linkedin_url && isValidLinkedInUrl(profile.linkedin_url)).length;

  function exportClicksCsv() {
    downloadCsv(
      "clicks.csv",
      toCsv(
        filteredClicks.map((click) => {
          const link = trackingLinks.find((item) => item.id === click.tracking_link_id);
          const company = companies.find((item) => item.id === click.company_id);
          return {
            company: company?.name,
            source: link?.source,
            status: company?.status,
            slug: link?.slug,
            clicked_at: click.clicked_at,
            click_type: click.click_type,
            browser: click.browser,
            device_type: click.device_type,
            os: click.os,
            country: click.country,
            referrer: click.referrer,
          };
        }),
      ),
    );
  }

  function exportCompaniesCsv() {
    downloadCsv(
      "companies.csv",
      toCsv(
        companies.map((company) => ({
          company: company.name,
          job_title: company.job_title,
          recruiter_name: company.recruiter_name,
          recruiter_email: company.recruiter_email,
          application_url: company.application_url,
          status: company.status,
          applied_at: company.applied_at,
          notes: company.notes,
          updated_at: company.updated_at,
        })),
      ),
    );
  }

  function exportFullReportCsv() {
    downloadCsv(
      "full-report.csv",
      toCsv(
        linkRows.map((row) => ({
          company: row.company.name,
          source: row.source,
          status: row.company.status,
          slug: row.slug,
          total_clicks: row.totalClicks,
          human_clicks: row.humanClicks,
          bot_clicks: row.botClicks,
          duplicate_clicks: row.duplicateClicks,
          cv_views: row.cvViews,
          cv_downloads: row.cvDownloads,
          last_click_at: row.lastClickAt,
          applied_at: row.company.applied_at,
          notes: row.company.notes,
        })),
      ),
    );
  }

  if (loading) return <Loading label="Loading dashboard" />;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-glow ring-1 ring-brand-100/60 backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Job application tracker + analytics</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Dashboard</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">Track applications, clean profile links, CV views/downloads, bot-filtered opens, and follow-up reminders from one SaaS-style workspace.</p>
          </div>
          <Link href="/dashboard/companies"><Button>Add application</Button></Link>
        </div>
      </section>

      {error ? <p className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

      <DateFilterBar value={dateFilter} onChange={setDateFilter} customFrom={customFrom} customTo={customTo} onCustomFrom={setCustomFrom} onCustomTo={setCustomTo} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total applications" value={companies.length} />
        <StatCard label="Tracking links" value={trackingLinks.length} />
        <StatCard label="Total clicks" value={filteredClicks.length} />
        <StatCard label="Likely human clicks" value={humanClicks} />
        <StatCard label="Possible bot clicks" value={botClicks + duplicateClicks} />
        <StatCard label="CV views" value={cvViews} />
        <StatCard label="CV downloads" value={cvDownloads} />
        <StatCard label="Companies opened" value={openedCompanyIds.size} />
        <StatCard label="Upcoming follow-ups" value={upcoming.length} />
        <StatCard label="Healthy links" value={healthyLinks} detail={warnings.length ? `${warnings.length} warning(s)` : "No warnings detected."} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statuses.map((status) => (
          <Card key={status} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{status}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{companies.filter((company) => company.status === status).length}</p>
          </Card>
        ))}
      </section>

      <Card>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardHeader title="Clicks over time" description="Toggle bot/duplicate filtering for cleaner analytics." />
          <Button type="button" variant="secondary" onClick={() => setIncludeBots((value) => !value)}>{includeBots ? "Exclude bots/duplicates" : "Include all clicks"}</Button>
        </div>
        <ClicksChart clicks={analyticsClicks} />
      </Card>

      <section className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader title="Human vs bot" />
          <BarList data={[{ label: "Likely human", value: humanClicks }, { label: "Possible bot", value: botClicks }, { label: "Duplicate", value: duplicateClicks }]} />
        </Card>
        <Card>
          <CardHeader title="Clicks by source" />
          <BarList data={countBy(filteredClicks.map((click) => trackingLinks.find((link) => link.id === click.tracking_link_id)?.source))} />
        </Card>
        <Card>
          <CardHeader title="Browser statistics" />
          <BarList data={countBy(filteredClicks.map((click) => click.browser))} />
        </Card>
        <Card>
          <CardHeader title="Device / OS / country" />
          <div className="space-y-5">
            <BarList data={countBy(filteredClicks.map((click) => click.device_type))} />
            <BarList data={countBy(filteredClicks.map((click) => click.os))} />
            <BarList data={countBy(filteredClicks.map((click) => click.country))} />
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="CV views vs LinkedIn clicks" />
          <BarList data={[{ label: "Link opened", value: filteredClicks.length }, { label: "CV link opened", value: cvLinkOpens }, { label: "CV viewed online", value: cvViews }, { label: "CV downloaded", value: cvDownloads }]} />
        </Card>
        <Card>
          <CardHeader title="Link health checker" description="Missing targets are warnings; active redirects still never expose private dashboard data." />
          <div className="space-y-3">
            {warnings.length === 0 ? <Badge tone="green">All configured links look healthy</Badge> : warnings.map((warning) => <div key={warning}><Badge tone="amber">{warning}</Badge></div>)}
          </div>
        </Card>
      </section>

      <Card>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardHeader title="Application tracking links" description="Clean public URLs use /profile/[random-slug]. Company names stay private in the database." />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={exportClicksCsv}>Export clicks CSV</Button>
            <Button type="button" variant="secondary" onClick={exportCompaniesCsv}>Export companies CSV</Button>
            <Button type="button" variant="secondary" onClick={exportFullReportCsv}>Export full report CSV</Button>
          </div>
        </div>
        {previewRows.length === 0 ? (
          <EmptyState title="No tracking links yet" description="Create a company/application and add a source-specific link." action={<Link href="/dashboard/companies"><Button>Add application</Button></Link>} />
        ) : (
          <CompanyTable rows={previewRows} baseUrl={baseUrl} />
        )}
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent clicks" />
          <div className="space-y-3">
            {filteredClicks.slice(0, 8).map((click) => {
              const company = companies.find((item) => item.id === click.company_id);
              const link = trackingLinks.find((item) => item.id === click.tracking_link_id);
              return (
                <div key={click.id} className="rounded-2xl border border-brand-100 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{company?.name ?? "Unknown company"}</p>
                    <Badge tone={click.click_type === "human" ? "green" : click.click_type === "duplicate" ? "amber" : "slate"}>{click.click_type}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(click.clicked_at)} · {link?.source ?? "Unknown source"} · {click.browser ?? "Unknown browser"}</p>
                </div>
              );
            })}
            {filteredClicks.length === 0 ? <p className="text-sm text-slate-500">No clicks in this date range.</p> : null}
          </div>
        </Card>

        <Card>
          <CardHeader title="Upcoming follow-ups" />
          <div className="space-y-3">
            {upcoming.map((reminder) => {
              const company = companies.find((item) => item.id === reminder.company_id);
              return (
                <div key={reminder.id} className="rounded-2xl border border-brand-100 bg-white p-3">
                  <p className="font-semibold text-slate-950">{company?.name ?? "Unknown company"}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(reminder.follow_up_at)}{reminder.follow_up_note ? ` · ${reminder.follow_up_note}` : ""}</p>
                </div>
              );
            })}
            {upcoming.length === 0 ? <p className="text-sm text-slate-500">No upcoming reminders.</p> : null}
          </div>
        </Card>
      </section>

      <Card>
        <CardHeader title="Top companies by human clicks" />
        <BarList data={companies.map((company) => ({ label: company.name, value: filteredClicks.filter((click) => click.company_id === company.id && click.click_type === "human").length })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value)} />
      </Card>
    </div>
  );
}
