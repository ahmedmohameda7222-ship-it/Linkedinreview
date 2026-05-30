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

export function parseDevice(userAgent: string | null) {
  if (!userAgent) return null;

  const ua = userAgent.toLowerCase();
  const device = /ipad|tablet/.test(ua) ? "Tablet" : /mobi|android|iphone/.test(ua) ? "Mobile" : "Desktop";

  let browser = "Unknown browser";
  if (/edg\//.test(ua)) browser = "Edge";
  else if (/chrome\//.test(ua) && !/edg\//.test(ua)) browser = "Chrome";
  else if (/firefox\//.test(ua)) browser = "Firefox";
  else if (/safari\//.test(ua) && !/chrome\//.test(ua)) browser = "Safari";

  return `${device} / ${browser}`;
}

export function getCountry(headers: HeaderReader) {
  return headers.get("cf-ipcountry") || headers.get("x-country") || null;
}
