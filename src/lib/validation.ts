import { LINKEDIN_URL_PREFIX } from "@/lib/supabase/config";

export function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function validateCompanyName(value: string) {
  const name = normalizeText(value);

  if (!name) {
    return { valid: false, message: "Name is required." };
  }

  if (name.length < 2) {
    return { valid: false, message: "Company name must contain at least 2 characters." };
  }

  if (name.length > 80) {
    return { valid: false, message: "Company name must be 80 characters or fewer." };
  }

  if (/[<>]/.test(name)) {
    return { valid: false, message: "Company name cannot contain angle brackets." };
  }

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
  if (!value.trim()) {
    return { valid: false, message: "LinkedIn URL is required." };
  }

  if (!value.trim().startsWith(LINKEDIN_URL_PREFIX)) {
    return {
      valid: false,
      message: `LinkedIn URL must start with ${LINKEDIN_URL_PREFIX}`,
    };
  }

  if (!isValidLinkedInUrl(value)) {
    return {
      valid: false,
      message: "Complete the URL with your own LinkedIn profile name after /in/.",
    };
  }

  return { valid: true, message: "", value: normalizeLinkedInUrl(value) };
}

export function validateEmail(value: string) {
  const email = value.trim().toLowerCase();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return valid ? { valid: true, value: email, message: "" } : { valid: false, message: "Enter a valid email address." };
}

export function validatePassword(value: string) {
  if (value.length < 8) {
    return { valid: false, message: "Password must contain at least 8 characters." };
  }
  return { valid: true, message: "" };
}
