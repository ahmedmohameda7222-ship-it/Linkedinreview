import type { Click, Company } from "@/lib/database.types";

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(value);
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

export function enrichCompanies(companies: Company[], clicks: Click[]) {
  return companies.map((company) => {
    const companyClicks = clicks.filter((click) => click.company_id === company.id);
    const lastClick = companyClicks
      .map((click) => click.clicked_at)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    return {
      ...company,
      clickCount: companyClicks.length,
      lastClick: lastClick ?? null,
    };
  });
}

export function buildDailyClickSeries(clicks: Click[], days = 14) {
  const result: { label: string; dateKey: string; count: number }[] = [];
  const today = startOfToday();

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    const dateKey = date.toISOString().slice(0, 10);
    result.push({ label: formatShortDate(date), dateKey, count: 0 });
  }

  for (const click of clicks) {
    const key = new Date(click.clicked_at).toISOString().slice(0, 10);
    const day = result.find((item) => item.dateKey === key);
    if (day) day.count += 1;
  }

  return result;
}

export function getBaseUrl() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}
