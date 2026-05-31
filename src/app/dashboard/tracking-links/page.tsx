"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
import { CompanyTable } from "@/components/CompanyTable";
import { EmptyState } from "@/components/EmptyState";
import { Loading } from "@/components/Loading";
import type { Click, Company, CvEvent, TrackingLink } from "@/lib/database.types";
import { enrichTrackingLinks, getBaseUrl } from "@/lib/format";
import { createClient } from "@/lib/supabase/browser";

export default function TrackingLinksPage() {
  const router = useRouter();
  const supabase = createClient();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [cvEvents, setCvEvents] = useState<CvEvent[]>([]);
  const [search, setSearch] = useState("");
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
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.replace("/login");
      return;
    }
    const [companiesResult, linksResult, clicksResult, cvResult] = await Promise.all([
      supabase.from("companies").select("*").order("created_at", { ascending: false }),
      supabase.from("tracking_links").select("*").order("created_at", { ascending: false }),
      supabase.from("clicks").select("*").order("clicked_at", { ascending: false }),
      supabase.from("cv_events").select("*").order("created_at", { ascending: false }),
    ]);
    if (companiesResult.error || linksResult.error || clicksResult.error || cvResult.error) {
      setError(companiesResult.error?.message ?? linksResult.error?.message ?? clicksResult.error?.message ?? cvResult.error?.message ?? "Could not load tracking links.");
    } else {
      setCompanies(companiesResult.data ?? []);
      setLinks(linksResult.data ?? []);
      setClicks(clicksResult.data ?? []);
      setCvEvents(cvResult.data ?? []);
    }
    setLoading(false);
  }

  async function toggle(row: ReturnType<typeof enrichTrackingLinks>[number]) {
    const { error: updateError } = await supabase.from("tracking_links").update({ active: !row.active }).eq("id", row.id);
    if (updateError) setError(updateError.message);
    await load();
  }

  async function remove(row: ReturnType<typeof enrichTrackingLinks>[number]) {
    if (!window.confirm(`Delete tracking link /${row.slug}?`)) return;
    const { error: deleteError } = await supabase.from("tracking_links").delete().eq("id", row.id);
    if (deleteError) setError(deleteError.message);
    await load();
  }

  const rows = useMemo(() => enrichTrackingLinks(companies, links, clicks, cvEvents), [companies, links, clicks, cvEvents]);
  const visibleRows = rows.filter((row) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [row.company.name, row.company.recruiter_name, row.source, row.slug, row.target_type].some((value) => value?.toLowerCase().includes(q));
  });

  if (loading) return <Loading label="Loading tracking links" />;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-soft ring-1 ring-brand-100/60 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Generated recruiter links</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Tracking Links</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Create, copy, test, activate, and deactivate LinkedIn and CV tracking links per company.</p>
      </section>

      {error ? <p className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

      <Card>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardHeader title="All links" description="LinkedIn links use /profile/[slug]. CV download links use /cv/[slug] and online viewer links use /cv/[slug]/view." />
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search links..." className="rounded-2xl border border-brand-100 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
            <Link href="/dashboard/companies"><Button>Create link</Button></Link>
          </div>
        </div>
        {visibleRows.length === 0 ? <EmptyState title="No links yet" description="Add a company and create your first tracking link." /> : <CompanyTable rows={visibleRows} baseUrl={baseUrl} onToggle={toggle} onDelete={remove} />}
      </Card>
    </div>
  );
}
