"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
import { ClicksChart } from "@/components/ClicksChart";
import { CopyButton } from "@/components/CopyButton";
import { EmptyState } from "@/components/EmptyState";
import { Loading } from "@/components/Loading";
import type { Click, Company } from "@/lib/database.types";
import { formatDateTime, getBaseUrl } from "@/lib/format";
import { createClient } from "@/lib/supabase/browser";

export default function CompanyDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [company, setCompany] = useState<Company | null>(null);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [baseUrl, setBaseUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setBaseUrl(getBaseUrl());
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

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

      const [{ data: companyData, error: companyError }, { data: clicksData, error: clicksError }] = await Promise.all([
        supabase.from("companies").select("*").eq("id", params.id).maybeSingle(),
        supabase.from("clicks").select("*").eq("company_id", params.id).order("clicked_at", { ascending: false }),
      ]);

      if (companyError) throw companyError;
      if (clicksError) throw clicksError;

      setCompany(companyData);
      setClicks(clicksData ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load company details.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Loading label="Loading company" />;

  if (!company) {
    return (
      <EmptyState
        title="Company not found"
        description="This company either does not exist or you do not have access to it."
        action={<Link href="/dashboard/companies"><Button>Back to companies</Button></Link>}
      />
    );
  }

  const trackingLink = `${baseUrl}/r/${company.slug}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/dashboard/companies" className="text-sm font-semibold text-slate-500 hover:text-slate-950">← Companies</Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{company.name}</h1>
          <p className="mt-2 text-sm text-slate-500">Detailed click history for this tracking link.</p>
        </div>
        <CopyButton value={trackingLink} />
      </div>

      {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <Card><p className="text-sm text-slate-500">Total clicks</p><p className="mt-2 text-3xl font-semibold">{clicks.length}</p></Card>
        <Card><p className="text-sm text-slate-500">Status</p><p className="mt-2 text-3xl font-semibold">{company.active ? "Active" : "Inactive"}</p></Card>
        <Card><p className="text-sm text-slate-500">Last click</p><p className="mt-2 text-lg font-semibold">{formatDateTime(clicks[0]?.clicked_at)}</p></Card>
      </section>

      <Card>
        <CardHeader title="Tracking link" description="Use this URL in the CV or application for this company." />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <code className="flex-1 break-all rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{trackingLink}</code>
          <CopyButton value={trackingLink} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Clicks over time" description="Daily click volume for the last 14 days." />
        <ClicksChart clicks={clicks} />
      </Card>

      <Card>
        <CardHeader title="Click history" description="Latest click events recorded for this company." />
        {clicks.length === 0 ? (
          <EmptyState title="No clicks yet" description="When someone opens this tracking link, click events will appear here." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Clicked at</th>
                    <th className="px-4 py-3">Country</th>
                    <th className="px-4 py-3">Device/browser</th>
                    <th className="px-4 py-3">Referrer</th>
                    <th className="px-4 py-3">IP hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {clicks.map((click) => (
                    <tr key={click.id}>
                      <td className="px-4 py-3 text-slate-900">{formatDateTime(click.clicked_at)}</td>
                      <td className="px-4 py-3 text-slate-600">{click.country ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{click.device ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600"><span className="line-clamp-2 max-w-md break-all">{click.referrer ?? "—"}</span></td>
                      <td className="px-4 py-3 text-slate-600"><code className="text-xs">{click.ip_hash ? `${click.ip_hash.slice(0, 12)}…` : "—"}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
