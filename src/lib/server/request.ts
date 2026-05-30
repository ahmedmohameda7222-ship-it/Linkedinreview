import crypto from "crypto";
import { IP_HASH_SALT } from "@/lib/supabase/config";

type HeaderReader = { get(name: string): string | null };

export function firstHeaderValue(value: string | null) {
  if (!value) return null;
  return value.split(",")[0]?.trim() || null;
}

export function getClientIp(headers: HeaderReader) {
  return (
    firstHeaderValue(headers.get("x-forwarded-for")) ||
    firstHeaderValue(headers.get("x-real-ip")) ||
    firstHeaderValue(headers.get("cf-connecting-ip")) ||
    null
  );
}

export function hashIp(ip: string | null) {
  if (!ip) return null;
  return crypto.createHash("sha256").update(`${IP_HASH_SALT}:${ip}`).digest("hex");
}

export function getCountry(headers: HeaderReader) {
  return firstHeaderValue(headers.get("x-vercel-ip-country")) || firstHeaderValue(headers.get("cf-ipcountry")) || firstHeaderValue(headers.get("x-country"));
}

export function parseUserAgent(userAgent: string | null) {
  if (!userAgent) {
    return { browser: "Unknown", device_type: "Unknown", os: "Unknown" };
  }

  const ua = userAgent.toLowerCase();
  const device_type = /ipad|tablet/.test(ua) ? "Tablet" : /mobi|android|iphone|ipod/.test(ua) ? "Mobile" : "Desktop";

  let browser = "Unknown";
  if (/edg\//.test(ua)) browser = "Edge";
  else if (/opr\//.test(ua) || /opera/.test(ua)) browser = "Opera";
  else if (/chrome\//.test(ua) && !/edg\//.test(ua)) browser = "Chrome";
  else if (/firefox\//.test(ua)) browser = "Firefox";
  else if (/safari\//.test(ua) && !/chrome\//.test(ua)) browser = "Safari";

  let os = "Unknown";
  if (/windows nt/.test(ua)) os = "Windows";
  else if (/android/.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/.test(ua)) os = "iOS";
  else if (/mac os x|macintosh/.test(ua)) os = "macOS";
  else if (/linux/.test(ua)) os = "Linux";

  return { browser, device_type, os };
}

export function isLikelyBotUserAgent(userAgent: string | null) {
  if (!userAgent || userAgent.trim().length < 8) return true;
  const ua = userAgent.toLowerCase();
  return /bot|crawler|spider|preview|headless|phantom|scanner|scan|curl|wget|python-requests|go-http-client|java\/|okhttp|axios|urlscan|virustotal|slackbot|discordbot|telegrambot|whatsapp|facebookexternalhit|twitterbot|linkedinbot|skypeuripreview|teams|microsoft office|outlook|safelinks|safe links|proofpoint|mimecast|barracuda|forcepoint|symantec|mcafee|trendmicro|zscaler/.test(ua);
}
