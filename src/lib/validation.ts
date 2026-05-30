export function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function validateCompanyName(value: string) {
  const name = normalizeText(value);

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
  return url.toString();
}

export function isValidLinkedInUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    const pathname = url.pathname.replace(/\/+$/, "");

    return (
      url.protocol === "https:" &&
      (host === "linkedin.com" || host === "www.linkedin.com") &&
      pathname.toLowerCase().startsWith("/in/") &&
      pathname.length > 4
    );
  } catch {
    return false;
  }
}

export function validateLinkedInUrl(value: string) {
  if (!value.trim()) {
    return { valid: false, message: "LinkedIn URL is required." };
  }

  if (!isValidLinkedInUrl(value)) {
    return {
      valid: false,
      message: "Use a valid LinkedIn profile URL, for example https://www.linkedin.com/in/example-user/.",
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
