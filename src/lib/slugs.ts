const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";

export function randomSlug(length = 6) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function createTrackingSlug() {
  return randomSlug(6);
}

export function isValidPublicSlug(slug: string) {
  return /^[a-z0-9]{6,12}$/.test(slug);
}
