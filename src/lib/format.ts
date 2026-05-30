import type { Click, Company, CvEvent, Reminder, TrackingLink } from "@/lib/database.types";

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(value);
}

export function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function startOfCurrentWeek() {
  const date = startOfToday();
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  return date;
}

export function startOfThisMonth() {
  const date = startOfToday();
  date.setDate(1);
  return date;
}

export type DateFilter = "today" | "7d" | "30d" | "month" | "all" | "custom";

export function getDateRange(filter: DateFilter, customFrom?: string, customTo?: string) {
  const now = new Date();
  let from: Date | null = null;
  let to: Date | null = null;

  if (filter === "today") from = startOfToday();
  if (filter === "7d") {
    from = startOfToday();
    from.setDate(from.getDate() - 6);
  }
  if (filter === "30d") {
    from = startOfToday();
    from.setDate(from.getDate() - 29);
  }
  if (filter === "month") from = startOfThisMonth();
  if (filter === "custom") {
    from = customFrom ? new Date(`${customFrom}T00:00:00`) : null;
    to = customTo ? new Date(`${customTo}T23:59:59`) : null;
  }

  return { from, to: to ?? now };
}

export function isInRange(value: string, filter: DateFilter, customFrom?: string, customTo?: string) {
  if (filter === "all") return true;
  const date = new Date(value);
  const { from, to } = getDateRange(filter, customFrom, customTo);
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export function buildDailyClickSeries(clicks: Click[], days = 14) {
  const result: { label: string; dateKey: string; count: number; human: number; bot: number }[] = [];
  const today = startOfToday();

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    const dateKey = date.toISOString().slice(0, 10);
    result.push({ label: formatShortDate(date), dateKey, count: 0, human: 0, bot: 0 });
  }

  for (const click of clicks) {
    const key = new Date(click.clicked_at).toISOString().slice(0, 10);
    const day = result.find((item) => item.dateKey === key);
    if (day) {
      day.count += 1;
      if (click.click_type === "human") day.human += 1;
      if (click.click_type === "bot" || click.click_type === "duplicate") day.bot += 1;
    }
  }

  return result;
}

export function getBaseUrl() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export type LinkRow = TrackingLink & {
  company: Company;
  totalClicks: number;
  humanClicks: number;
  botClicks: number;
  duplicateClicks: number;
  cvViews: number;
  cvDownloads: number;
  lastClickAt: string | null;
};

export function enrichTrackingLinks(companies: Company[], links: TrackingLink[], clicks: Click[], cvEvents: CvEvent[] = []): LinkRow[] {
  const rows: LinkRow[] = [];

  for (const link of links) {
    const company = companies.find((item) => item.id === link.company_id);
    if (!company) continue;

    const linkClicks = clicks.filter((click) => click.tracking_link_id === link.id);
    const linkCvEvents = cvEvents.filter((event) => event.tracking_link_id === link.id);
    const lastClickAt = linkClicks
      .map((click) => click.clicked_at)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

    rows.push({
      ...link,
      company,
      totalClicks: linkClicks.length,
      humanClicks: linkClicks.filter((click) => click.click_type === "human").length,
      botClicks: linkClicks.filter((click) => click.click_type === "bot").length,
      duplicateClicks: linkClicks.filter((click) => click.click_type === "duplicate").length,
      cvViews: linkCvEvents.filter((event) => event.event_type === "view").length,
      cvDownloads: linkCvEvents.filter((event) => event.event_type === "download").length,
      lastClickAt,
    });
  }

  return rows;
}

export function countBy<T extends string | null | undefined>(values: T[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    const key = value || "Unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function upcomingReminders(reminders: Reminder[]) {
  const now = new Date();
  return reminders
    .filter((reminder) => !reminder.follow_up_done && new Date(reminder.follow_up_at) >= now)
    .sort((a, b) => new Date(a.follow_up_at).getTime() - new Date(b.follow_up_at).getTime());
}

export function toCsv(rows: Record<string, string | number | boolean | null | undefined>[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number | boolean | null | undefined) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
