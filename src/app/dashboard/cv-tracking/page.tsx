"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
import { CopyButton } from "@/components/CopyButton";
import { EmptyState } from "@/components/EmptyState";
import { Loading } from "@/components/Loading";
import type { Company, CvEvent, CvFile, TrackingLink } from "@/lib/database.types";
import { formatDateTime, formatFileSize, getBaseUrl } from "@/lib/format";
import { createClient } from "@/lib/supabase/browser";

export default function CvTrackingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [cvFiles, setCvFiles] = useState<CvFile[]>([]);
  const [cvEvents, setCvEvents] = useState<CvEvent[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [slug, setSlug] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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
    const [companiesResult, linksResult, filesResult, eventsResult] = await Promise.all([
      supabase.from("companies").select("*").order("created_at", { ascending: false }),
      supabase.from("tracking_links").select("*").order("created_at", { ascending: false }),
      supabase.from("cv_files").select("*").order("created_at", { ascending: false }),
      supabase.from("cv_events").select("*").order("created_at", { ascending: false }),
    ]);
    if (companiesResult.error || linksResult.error || filesResult.error || eventsResult.error) {
      setError(companiesResult.error?.message ?? linksResult.error?.message ?? filesResult.error?.message ?? eventsResult.error?.message ?? "Could not load CV tracking.");
    } else {
      setCompanies(companiesResult.data ?? []);
      setLinks(linksResult.data ?? []);
      setCvFiles(filesResult.data ?? []);
      setCvEvents(eventsResult.data ?? []);
      setCompanyId(companiesResult.data?.[0]?.id ?? "");
    }
    setLoading(false);
  }

  async function uploadCv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const input = event.currentTarget.elements.namedItem("cv") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      setError("Choose a PDF CV first.");
      return;
    }
    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("PDF must be 10 MB or smaller.");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/cv/upload", { method: "POST", body: formData });
    const payload = await response.json();
    setUploading(false);
    if (!response.ok) {
      setError(payload.error ?? "Could not upload CV.");
      return;
    }
    setMessage("CV uploaded and set as active.");
    event.currentTarget.reset();
    await load();
  }

  async function generateCvLink() {
    setError("");
    setMessage("");
    if (!companyId) {
      setError("Choose a company first.");
      return;
    }
    setSaving(true);
    const response = await fetch("/api/cv/generate-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ companyId, slug: slug.trim() || undefined }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(payload.error ?? "Could not generate CV link.");
      return;
    }
    setSlug("");
    setMessage("Company-specific CV tracking link created.");
    await load();
  }

  const activeFile = cvFiles.find((file) => file.active) ?? cvFiles[0];
  const cvLinks = useMemo(() => links.filter((link) => link.source === "CV" || link.target_type.startsWith("cv")), [links]);

  if (loading) return <Loading label="Loading CV tracking" />;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-soft ring-1 ring-brand-100/60 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">PDF tracking workflow</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">CV Tracking</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Upload a PDF, generate company-specific CV links, track download opens, online views, and download clicks separately.</p>
      </section>

      <p className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
        Direct offline PDF opens cannot be reliably tracked. Use the tracked CV link or online CV viewer for reliable tracking.
      </p>
      {error ? <p className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Active CV PDF" description="Replace the active CV any time. Only PDFs up to 10 MB are accepted." />
          {activeFile ? (
            <div className="space-y-3">
              <p className="font-semibold text-slate-950">{activeFile.original_file_name}</p>
              <p className="text-sm text-slate-500">{formatFileSize(activeFile.file_size)} - uploaded {formatDateTime(activeFile.created_at)}</p>
              {activeFile.public_url ? <a className="text-sm font-semibold text-brand-700 hover:underline" href={activeFile.public_url} target="_blank">Open original PDF</a> : null}
            </div>
          ) : (
            <EmptyState title="No CV uploaded" description="Upload a PDF to enable tracked CV downloads." />
          )}
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Upload / replace CV" />
          <form onSubmit={uploadCv} className="space-y-4">
            <input name="cv" type="file" accept="application/pdf" className="block w-full rounded-2xl border border-brand-100 bg-white px-3.5 py-3 text-sm" />
            <Button type="submit" disabled={uploading}>{uploading ? "Uploading" : "Upload PDF"}</Button>
          </form>
        </Card>
      </section>

      <Card>
        <CardHeader title="Generate tracked CV link" description="Use /cv/[slug] for tracked download and /cv/[slug]/view for tracked online viewing." />
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <select value={companyId} onChange={(event) => setCompanyId(event.target.value)} className="rounded-2xl border border-brand-100 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100">
            {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
          </select>
          <input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="optional slug, e.g. bmw" className="rounded-2xl border border-brand-100 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
          <Button type="button" disabled={saving || !activeFile} onClick={generateCvLink}>{saving ? "Creating" : "Generate"}</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Company CV links" />
        {cvLinks.length === 0 ? <EmptyState title="No CV links" description="Generate a company-specific CV link above." /> : (
          <div className="grid gap-3">
            {cvLinks.map((link) => {
              const company = companies.find((item) => item.id === link.company_id);
              const events = cvEvents.filter((event) => event.tracking_link_id === link.id);
              return (
                <div key={link.id} className="rounded-2xl border border-brand-100 bg-white p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">{company?.name ?? "Unknown company"}</p>
                      <p className="mt-1 text-xs text-slate-500">{events.length} CV events - last {formatDateTime(events[0]?.created_at)}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <code className="block break-all rounded-xl bg-brand-50 px-2.5 py-1.5 text-xs text-slate-700">{baseUrl}/cv/{link.slug}</code>
                        <CopyButton value={`${baseUrl}/cv/${link.slug}`} compact />
                      </div>
                      <div>
                        <code className="block break-all rounded-xl bg-brand-50 px-2.5 py-1.5 text-xs text-slate-700">{baseUrl}/cv/{link.slug}/view</code>
                        <CopyButton value={`${baseUrl}/cv/${link.slug}/view`} compact />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link href={`/cv/${link.slug}`} target="_blank"><Button variant="secondary">Test download</Button></Link>
                    <Link href={`/cv/${link.slug}/view`} target="_blank"><Button variant="secondary">Test view</Button></Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
