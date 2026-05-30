"use client";

import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { CopyButton } from "@/components/CopyButton";
import type { LinkRow } from "@/lib/format";
import { formatDateTime } from "@/lib/format";

function statusTone(status: string) {
  if (status === "Offer") return "green" as const;
  if (status === "Interview" || status === "Link Opened") return "blue" as const;
  if (status === "Rejected") return "red" as const;
  if (status === "Archived") return "slate" as const;
  return "amber" as const;
}

export type CompanyWithStats = LinkRow;

export function CompanyTable({
  rows,
  baseUrl,
  onToggle,
  onDelete,
}: {
  rows: LinkRow[];
  baseUrl: string;
  onToggle?: (row: LinkRow) => void;
  onDelete?: (row: LinkRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-brand-100 bg-white/90 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-brand-100 text-sm">
          <thead className="bg-brand-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Tracking URL</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Human</th>
              <th className="px-4 py-3">Bot</th>
              <th className="px-4 py-3">Last click</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-50">
            {rows.map((row) => {
              const trackingLink = `${baseUrl}/profile/${row.slug}`;
              return (
                <tr key={row.id} className="align-top transition-colors hover:bg-brand-50/35">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-950">{row.company.name}</div>
                    {row.company.job_title ? <div className="mt-1 text-xs text-slate-500">{row.company.job_title}</div> : null}
                  </td>
                  <td className="px-4 py-4"><Badge tone="blue">{row.source}</Badge></td>
                  <td className="px-4 py-4">
                    <div className="flex min-w-[240px] flex-col gap-2">
                      <code className="break-all rounded-xl bg-brand-50 px-2.5 py-1.5 text-xs text-slate-700 ring-1 ring-brand-100">{trackingLink}</code>
                      <CopyButton value={trackingLink} compact />
                    </div>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-800">{row.totalClicks}</td>
                  <td className="px-4 py-4 font-semibold text-emerald-700">{row.humanClicks}</td>
                  <td className="px-4 py-4 font-semibold text-amber-700">{row.botClicks + row.duplicateClicks}</td>
                  <td className="px-4 py-4 text-slate-600">{formatDateTime(row.lastClickAt)}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <Badge tone={statusTone(row.company.status)}>{row.company.status}</Badge>
                      <Badge tone={row.active ? "green" : "slate"}>{row.active ? "Active" : "Inactive"}</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link className="rounded-xl border border-brand-100 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-brand-50 hover:text-brand-800" href={`/dashboard/companies/${row.company.id}`}>
                        View details
                      </Link>
                      {onToggle ? (
                        <Button type="button" variant="secondary" className="px-3 py-2 text-xs" onClick={() => onToggle(row)}>
                          {row.active ? "Deactivate" : "Activate"}
                        </Button>
                      ) : null}
                      {onDelete ? (
                        <Button type="button" variant="danger" className="px-3 py-2 text-xs" onClick={() => onDelete(row)}>
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
