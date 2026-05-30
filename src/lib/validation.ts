import { LINKEDIN_URL_PREFIX } from "@/lib/supabase/config";

export function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function nullableClean(value: string) {
  const clean = value.trim();
  return clean.length > 0 ? clean : null;
}

export function validateCompanyName(value: string) {
  const name = normalizeText(value);

  if (!name) return { valid: false, message: "Company name is required." };
  if (name.length < 2) return { valid: false, message: "Company name must contain at least 2 characters." };
  if (name.length > 120) return { valid: false, message: "Company name must be 120 characters or fewer." };
  if (/[<>]/.test(name)) return { valid: false, message: "Company name cannot contain angle brackets." };

  return { valid: true, message: "", value: name };
}

export function normalizeLinkedInUrl(value: string) {
  const trimmed = value.trim();
  const url = new URL(trimmed);
  url.hash = "";
  url.search = "";
  const cleanPath = url.pathname.replace(/\/+$/, "");
  return `${url.protocol}//${url.hostname}${cleanPath}/`;
}

export function isValidLinkedInUrl(value: string) {
  try {
    const trimmed = value.trim();
    if (!trimmed.startsWith(LINKEDIN_URL_PREFIX)) return false;

    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    const pathname = url.pathname.replace(/\/+$/, "");
    const profileHandle = pathname.slice("/in/".length).trim();

    return url.protocol === "https:" && host === "www.linkedin.com" && pathname.startsWith("/in/") && profileHandle.length > 0;
  } catch {
    return false;
  }
}

export function validateLinkedInUrl(value: string) {
  if (!value.trim()) return { valid: false, message: "LinkedIn URL is required." };
  if (!value.trim().startsWith(LINKEDIN_URL_PREFIX)) {
    return { valid: false, message: `LinkedIn URL must start with ${LINKEDIN_URL_PREFIX}` };
  }
  if (!isValidLinkedInUrl(value)) {
    return { valid: false, message: "Complete the URL with your own LinkedIn profile name after /in/." };
  }
  return { valid: true, message: "", value: normalizeLinkedInUrl(value) };
}

export function validateOptionalUrl(value: string, label: string) {
  const clean = value.trim();
  if (!clean) return { valid: true, value: null, message: "" };
  try {
    const url = new URL(clean);
    if (!["https:", "http:"].includes(url.protocol)) return { valid: false, message: `${label} must start with http:// or https://` };
    url.hash = "";
    return { valid: true, value: url.toString(), message: "" };
  } catch {
    return { valid: false, message: `Enter a valid ${label}.` };
  }
}

export function validateOptionalEmail(value: string) {
  const clean = value.trim().toLowerCase();
  if (!clean) return { valid: true, value: null, message: "" };
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
  return valid ? { valid: true, value: clean, message: "" } : { valid: false, message: "Enter a valid recruiter email address." };
}

export function validateEmail(value: string) {
  const email = value.trim().toLowerCase();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return valid ? { valid: true, value: email, message: "" } : { valid: false, message: "Enter a valid email address." };
}

export function validatePassword(value: string) {
  if (value.length < 8) return { valid: false, message: "Password must contain at least 8 characters." };
  return { valid: true, message: "" };
}
